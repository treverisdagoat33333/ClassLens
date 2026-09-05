const FIELDS = ['serverUrl', 'enrollmentKey', 'classroom', 'studentName'];

async function load() {
  const data = await chrome.storage.local.get(FIELDS);
  FIELDS.forEach((f) => {
    if (data[f]) document.getElementById(f).value = data[f];
  });
}

document.getElementById('save').addEventListener('click', async () => {
  const values = {};
  FIELDS.forEach((f) => {
    values[f] = document.getElementById(f).value.trim();
  });
  await chrome.storage.local.set(values);
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Saved. Reconnecting to serverâ€¦';
  statusEl.style.color = '#1E7A46';
});

load();
