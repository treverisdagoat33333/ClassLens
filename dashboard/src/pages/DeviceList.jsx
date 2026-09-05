import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

function timeAgo(ts) {
  if (!ts) return 'never';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function DeviceList() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [urlInputs, setUrlInputs] = useState({});

  async function load() {
    try {
      const { devices } = await api.getDevices();
      setDevices(devices);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

  async function handleCloseTab(e, id) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.sendCommand(id, 'close');
      alert('Close active tab command queued.');
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleOpenUrl(e, id) {
    e.preventDefault();
    e.stopPropagation();
    const targetUrl = urlInputs[id] || '';
    if (!targetUrl.trim()) return;
    try {
      await api.sendCommand(id, 'open', targetUrl.trim());
      setUrlInputs(prev => ({ ...prev, [id]: '' }));
      alert('Open tab command queued.');
    } catch (err) {
      alert(err.message);
    }
  }

  const onlineCount = devices.filter((d) => d.online).length;

  return (
    <div className="px-8 py-7 max-w-5xl">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="font-display text-2xl font-semibold">Roster</h1>
        <span className="text-sm font-mono text-ink/50">
          {onlineCount} / {devices.length} online
        </span>
      </div>
      <p className="text-sm text-ink/50 mb-6">Every managed Chromebook currently enrolled.</p>

      {devices.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8 p-4 bg-white border border-line rounded-lg">
          {devices.map((d) => (
            <Link
              key={d.id}
              to={`/devices/${d.id}`}
              title={`${d.label} — ${d.online ? 'online' : timeAgo(d.last_seen)}`}
              className="flex flex-col items-center gap-1 w-14 group"
            >
              <span
                className={`w-3.5 h-3.5 rounded-full border-2 transition-transform group-hover:scale-125 ${
                  d.online ? 'bg-moss border-moss' : 'bg-transparent border-ink/25'
                }`}
              />
              <span className="text-[10px] font-mono text-ink/50 truncate w-full text-center">
                {(d.student_name || d.label).split(' ')[0]}
              </span>
            </Link>
          ))}
        </div>
      )}

      {loading && <p className="text-ink/50 text-sm">Loading roster…</p>}
      {error && <p className="text-clay text-sm">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((d) => (
          <div
            key={d.id}
            className="block bg-white border border-line rounded-lg p-4 hover:border-moss transition-colors"
          >
            <Link to={`/devices/${d.id}`} className="block">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm hover:text-moss transition-colors">{d.student_name || d.label}</span>
                <span
                  className={`text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    d.online ? 'bg-moss/10 text-moss' : 'bg-ink/5 text-ink/40'
                  }`}
                >
                  {d.online ? 'online' : 'offline'}
                </span>
              </div>
              <p className="text-xs text-ink/50 font-mono mb-2">{d.classroom || 'No classroom set'}</p>
            </Link>

            {d.online && (
              <div className="mt-3 pt-3 border-t border-line space-y-2">
                <button
                  onClick={(e) => handleCloseTab(e, d.id)}
                  className="w-full text-center px-2 py-1 bg-clay/10 text-clay hover:bg-clay hover:text-white rounded text-[11px] font-medium transition-colors focus-ring"
                >
                  ✕ Close Active Tab
                </button>
                <form onSubmit={(e) => handleOpenUrl(e, d.id)} className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Push URL (e.g. google.com)"
                    value={urlInputs[d.id] || ''}
                    onChange={(e) => setUrlInputs(prev => ({ ...prev, [d.id]: e.target.value }))}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 px-2 py-1 bg-paper text-[11px] rounded border border-line focus-ring"
                  />
                  <button
                    type="submit"
                    onClick={(e) => e.stopPropagation()}
                    className="px-2 py-1 bg-moss text-paper hover:bg-mossDark rounded text-[11px] font-medium transition-colors"
                  >
                    Open
                  </button>
                </form>
              </div>
            )}
            
            <p className="text-[10px] text-ink/40 mt-3 font-mono">Last seen {timeAgo(d.last_seen)}</p>
          </div>
        ))}
      </div>

      {!loading && devices.length === 0 && (
        <div className="text-center py-16 border border-dashed border-line rounded-lg">
          <p className="text-ink/50 text-sm">No devices enrolled yet.</p>
        </div>
      )}
    </div>
  );
}
