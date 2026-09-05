chrome.storage.local.get(['deviceId', 'classroom'], (data) => {
  const el = document.getElementById('deviceInfo');
  const parts = [];
  if (data.classroom) parts.push(`Classroom: ${data.classroom}`);
  if (data.deviceId) parts.push(`Device: ${data.deviceId.slice(0, 12)}…`);
  el.textContent = parts.join(' · ');
});
