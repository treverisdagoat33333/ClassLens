import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

function formatTime(ts) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const { alerts } = await api.getAlerts();
      setAlerts(alerts);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="px-8 py-7 max-w-4xl">
      <h1 className="font-display text-2xl font-semibold mb-1">Alerts</h1>
      <p className="text-sm text-ink/50 mb-6">Blocked-site attempts across every enrolled device.</p>

      {error && <p className="text-clay text-sm mb-4">{error}</p>}

      {alerts.length === 0 && !error && (
        <div className="text-center py-16 border border-dashed border-line rounded-lg">
          <p className="text-ink/50 text-sm">No blocked attempts recorded.</p>
        </div>
      )}

      <div className="bg-white border border-line rounded-lg divide-y divide-line">
        {alerts.map((a) => (
          <div key={a.id} className="px-4 py-3 flex items-center gap-3 text-sm">
            <span className="font-mono text-xs text-ink/40 w-32 shrink-0">{formatTime(a.ts)}</span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-clay/10 text-clay shrink-0">
              blocked
            </span>
            <Link to={`/devices/${a.device_id}`} className="text-ink/70 hover:text-moss shrink-0">
              {a.device_label}
            </Link>
            <span className="truncate text-ink/50 font-mono text-xs">{a.url}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
