// ClassLens Monitor - background service worker
//
// What this does, plainly (so it's auditable at a glance):
//   1. Registers this device with the school's ClassLens server.
//   2. Reports which tab/site is active (URL + title), not keystrokes or content typed.
//   3. Takes a periodic screenshot of the active tab (default every 45s) - NOT a live stream.
//   4. Blocks sites on the school's blocklist using Chrome's declarativeNetRequest.
//   5. Always shows a visible "ON" badge on the extension icon while monitoring is active.
//
// Nothing here runs silently without the badge, and nothing here captures audio/mic/webcam
// or keystrokes. It is meant to run only on school-owned, managed devices with users notified.

const DEFAULTS = {
  serverUrl: 'http://localhost:4000',
  enrollmentKey: '',
  classroom: '',
  studentName: '',
  screenshotIntervalSec: 45,
  heartbeatIntervalSec: 60,
  blocklistPollIntervalSec: 300,
};

let cachedConfig = null;

async function getConfig() {
  if (cachedConfig) return cachedConfig;
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  cachedConfig = { ...DEFAULTS, ...stored };
  return cachedConfig;
}

async function getDeviceId() {
  const { deviceId } = await chrome.storage.local.get('deviceId');
  if (deviceId) return deviceId;
  const newId = 'cl-' + crypto.randomUUID();
  await chrome.storage.local.set({ deviceId: newId });
  return newId;
}

function setBadgeOn() {
  chrome.action.setBadgeText({ text: 'ON' });
  chrome.action.setBadgeBackgroundColor({ color: '#1E7A46' });
  chrome.action.setTitle({ title: 'ClassLens - monitoring active on this device' });
}

function setBadgeError() {
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#B3261E' });
  chrome.action.setTitle({ title: 'ClassLens - not connected to school server' });
}

async function apiFetch(path, options = {}) {
  const cfg = await getConfig();
  const res = await fetch(`${cfg.serverUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-enrollment-key': cfg.enrollmentKey,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

// --- Registration & heartbeat ---

async function registerDevice() {
  const cfg = await getConfig();
  if (!cfg.enrollmentKey) {
    setBadgeError();
    return;
  }
  const deviceId = await getDeviceId();
  try {
    await apiFetch('/api/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        deviceId,
        label: `Chromebook ${deviceId.slice(-6)}`,
        studentName: cfg.studentName || null,
        classroom: cfg.classroom || null,
      }),
    });
    setBadgeOn();
  } catch (e) {
    console.warn('[ClassLens] registration failed', e);
    setBadgeError();
  }
}

async function heartbeat() {
  const deviceId = await getDeviceId();
  try {
    await apiFetch('/api/devices/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    });
    setBadgeOn();
  } catch (e) {
    setBadgeError();
  }
}

// --- Activity reporting ---

async function reportActivity(eventType, tab) {
  if (!tab || !tab.url || !tab.url.startsWith('http')) return;
  const deviceId = await getDeviceId();
  try {
    await apiFetch('/api/activity', {
      method: 'POST',
      body: JSON.stringify({
        deviceId,
        url: tab.url,
        title: tab.title || '',
        eventType,
      }),
    });
  } catch (e) {
    console.warn('[ClassLens] activity report failed', e);
  }
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    reportActivity('tab_active', tab);
  } catch (e) {
    /* tab may have closed already */
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    reportActivity('tab_active', tab);
  }
});

// --- Periodic screenshots of the active tab ---

async function captureActiveTabScreenshot() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.url || !tab.url.startsWith('http')) return;

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 50 });
    const deviceId = await getDeviceId();

    await apiFetch('/api/screenshots', {
      method: 'POST',
      body: JSON.stringify({ deviceId, imageDataUrl: dataUrl, url: tab.url }),
    });
  } catch (e) {
    // Common benign causes: no active tab, tab is a chrome:// page (capture not allowed), offline.
    console.warn('[ClassLens] screenshot capture skipped', e.message);
  }
}

// --- Blocklist enforcement via declarativeNetRequest dynamic rules ---

async function syncBlocklist() {
  try {
    const cfg = await getConfig();
    const { blocklist } = await apiFetch('/api/blocklist', { method: 'GET' });

    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existing.map((r) => r.id);

    const newRules = blocklist.map((entry, idx) => ({
      id: idx + 1,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: `||${entry.pattern}`,
        resourceTypes: ['main_frame'],
      },
    }));

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: newRules,
    });
  } catch (e) {
    console.warn('[ClassLens] blocklist sync failed', e);
  }
}

// Log blocked-navigation attempts so they show up as alerts on the dashboard.
chrome.webNavigation.onErrorOccurred.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (details.error !== 'net::ERR_BLOCKED_BY_CLIENT') return;
  const deviceId = await getDeviceId();
  try {
    await apiFetch('/api/activity', {
      method: 'POST',
      body: JSON.stringify({ deviceId, url: details.url, title: '', eventType: 'blocked' }),
    });
  } catch (e) {
    /* best-effort */
  }
});

// --- Alarms drive all periodic work (service workers can't rely on setInterval) ---

chrome.runtime.onInstalled.addListener(async () => {
  const cfg = await getConfig();
  chrome.alarms.create('heartbeat', { periodInMinutes: Math.max(cfg.heartbeatIntervalSec / 60, 0.5) });
  chrome.alarms.create('screenshot', { periodInMinutes: Math.max(cfg.screenshotIntervalSec / 60, 0.5) });
  chrome.alarms.create('blocklistSync', { periodInMinutes: Math.max(cfg.blocklistPollIntervalSec / 60, 1) });
  await registerDevice();
  await syncBlocklist();
});

chrome.runtime.onStartup.addListener(async () => {
  await registerDevice();
  await syncBlocklist();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'heartbeat') heartbeat();
  if (alarm.name === 'screenshot') captureActiveTabScreenshot();
  if (alarm.name === 'blocklistSync') syncBlocklist();
});

// React immediately if an admin changes settings via the options page.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    cachedConfig = null; // force re-read next call
    registerDevice();
  }
});
