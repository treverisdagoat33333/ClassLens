import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

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
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

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

      {/* Roll-call strip: signature element, one dot per device like a physical attendance sheet */}
      {devices.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8 p-4 bg-white border border-line rounded-lg">
          {devices.map((d) => (
            <Link
              key={d.id}
              to={`/devices/${d.id}`}
              title={`${d.label} â€” ${d.online ? 'online' : timeAgo(d.last_seen)}`}
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

      {loading && <p className="text-ink/50 text-sm">Loading rosterâ€¦</p>}
      {error && <p className="text-clay text-sm">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {devices.map((d) => (
          <Link
            to={`/devices/${d.id}`}
            key={d.id}
            className="block bg-white border border-line rounded-lg p-4 hover:border-moss transition-colors focus-ring"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{d.student_name || d.label}</span>
              <span
                className={`text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded ${
                  d.online ? 'bg-moss/10 text-moss' : 'bg-ink/5 text-ink/40'
                }`}
              >
                {d.online ? 'online' : 'offline'}
              </span>
            </div>
            <p className="text-xs text-ink/50 font-mono">{d.classroom || 'No classroom set'}</p>
            <p className="text-xs text-ink/40 mt-2">Last seen {timeAgo(d.last_seen)}</p>
          </Link>
        ))}
      </div>

      {!loading && devices.length === 0 && (
        <div className="text-center py-16 border border-dashed border-line rounded-lg">
          <p className="text-ink/50 text-sm">No devices enrolled yet.</p>
          <p className="text-ink/35 text-xs mt-1">
            Devices appear here once the ClassLens extension registers with this server.
          </p>
        </div>
      )}
    </div>
  );
}
