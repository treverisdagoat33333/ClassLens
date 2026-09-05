// ClassLens Monitor - background service worker
const DEFAULTS = {
  serverUrl: 'http://localhost:4000',
  enrollmentKey: '',
  classroom: '',
  studentName: '',
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

function setBadgeOn() { chrome.action.setBadgeText({ text: 'ON' }); chrome.action.setBadgeBackgroundColor({ color: '#1E7A46' }); }
function setBadgeError() { chrome.action.setBadgeText({ text: '!' }); chrome.action.setBadgeBackgroundColor({ color: '#B3261E' }); }

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
  if (!res.ok) throw new Error(`API ${path} failed`);
  return res.json();
}

function handleAdminAction(action) {
  if (!action) return;
  
  if (action.type === 'open') {
    let url = action.url;
    if (!url.startsWith('http')) url = 'https://' + url;
    chrome.tabs.create({ url });
  }
  
  if (action.type === 'close') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) chrome.tabs.remove(tabs[0].id);
    });
  }
}

// Chained loop checking for actions and capturing tabs every 2 seconds
async function runLiveStreamingLoop() {
  const cfg = await getConfig();
  if (!cfg.enrollmentKey) {
    setTimeout(runLiveStreamingLoop, 2000);
    return;
  }
  const deviceId = await getDeviceId();

  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    
    if (tab && tab.url && tab.url.startsWith('http')) {
      // Compress to 30% quality for rapid web uploads
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 30 });
      
      await fetch(`${cfg.serverUrl}/api/screenshots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-enrollment-key': cfg.enrollmentKey,
        },
        body: JSON.stringify({ deviceId, imageDataUrl: dataUrl, url: tab.url }),
      });
    }

    // Hit the heartbeat path to check if an admin left open/close actions in queue
    const res = await apiFetch('/api/devices/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    });
    
    setBadgeOn();
    if (res.action) handleAdminAction(res.action);

  } catch (e) {
    console.warn('[ClassLens Loop Error]', e);
    setBadgeError();
  }

  // Schedule next iteration
  setTimeout(runLiveStreamingLoop, 2000);
}

// Activity logging triggers
async function reportActivity(eventType, tab) {
  if (!tab || !tab.url || !tab.url.startsWith('http')) return;
  const deviceId = await getDeviceId();
  try {
    await apiFetch('/api/activity', {
      method: 'POST',
      body: JSON.stringify({ deviceId, url: tab.url, title: tab.title || '', eventType }),
    });
  } catch (e) {}
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try { const tab = await chrome.tabs.get(tabId); reportActivity('tab_active', tab); } catch (e) {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) reportActivity('tab_active', tab);
});

async function syncBlocklist() {
  try {
    const { blocklist } = await apiFetch('/api/blocklist', { method: 'GET' });
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existing.map((r) => r.id);
    const newRules = (blocklist || []).map((entry, idx) => ({
      id: idx + 1, priority: 1, action: { type: 'block' },
      condition: { urlFilter: `||${entry.pattern}`, resourceTypes: ['main_frame'] },
    }));
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: newRules });
  } catch (e) {}
}

chrome.webNavigation.onErrorOccurred.addListener(async (details) => {
  if (details.frameId !== 0 || details.error !== 'net::ERR_BLOCKED_BY_CLIENT') return;
  const deviceId = await getDeviceId();
  try {
    await apiFetch('/api/activity', { method: 'POST', body: JSON.stringify({ deviceId, url: details.url, title: '', eventType: 'blocked' }) });
  } catch (e) {}
});

chrome.runtime.onInstalled.addListener(async () => {
  chrome.alarms.create('blocklistSync', { periodInMinutes: 5 });
  await syncBlocklist();
  runLiveStreamingLoop();
});

chrome.runtime.onStartup.addListener(async () => {
  await syncBlocklist();
  runLiveStreamingLoop();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'blocklistSync') syncBlocklist();
});

chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local') { cachedConfig = null; } });
