import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, fetchImageBlob } from '../api';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function ScreenshotThumb({ shot }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let revoke;
    fetchImageBlob(shot.filename).then((url) => {
      setSrc(url);
      revoke = url;
    });
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [shot.filename]);

  return (
    <a href={src || '#'} target="_blank" rel="noreferrer" className="block group">
      <div className="aspect-video bg-ink/5 rounded-md overflow-hidden border border-line group-hover:border-moss transition-colors">
        {src ? (
          <img src={src} alt={shot.url || 'screenshot'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full animate-pulse bg-ink/10" />
        )}
      </div>
      <p className="text-[11px] font-mono text-ink/45 mt-1 truncate">{formatTime(shot.ts)} Â· {shot.url}</p>
    </a>
  );
}

export default function DeviceDetail() {
  const { id } = useParams();
  const [device, setDevice] = useState(null);
  const [activity, setActivity] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [tab, setTab] = useState('screens');
  const [error, setError] = useState('');

  async function load() {
    try {
      const [d, a, s] = await Promise.all([
        api.getDevice(id),
        api.getActivity(id),
        api.getScreenshots(id),
      ]);
      setDevice(d.device);
      setActivity(a.activity);
      setScreenshots(s.screenshots);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <div className="p-8 text-clay text-sm">{error}</div>;
  if (!device) return <div className="p-8 text-ink/50 text-sm">Loadingâ€¦</div>;

  return (
    <div className="px-8 py-7 max-w-5xl">
      <Link to="/" className="text-xs font-mono text-ink/45 hover:text-moss">&larr; Roster</Link>

      <div className="flex items-center gap-3 mt-2 mb-1">
        <h1 className="font-display text-2xl font-semibold">{device.student_name || device.label}</h1>
        <span
          className={`text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded ${
            device.online ? 'bg-moss/10 text-moss' : 'bg-ink/5 text-ink/40'
          }`}
        >
          {device.online ? 'online' : 'offline'}
        </span>
      </div>
      <p className="text-sm text-ink/50 mb-6 font-mono">
        {device.id} Â· {device.classroom || 'no classroom'}
      </p>

      <div className="flex gap-1 mb-5 border-b border-line">
        {['screens', 'activity'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium capitalize -mb-px border-b-2 transition-colors focus-ring ${
              tab === t ? 'border-moss text-ink' : 'border-transparent text-ink/40 hover:text-ink/70'
            }`}
          >
            {t === 'screens' ? 'Screenshots' : 'Activity log'}
          </button>
        ))}
      </div>

      {tab === 'screens' && (
        <>
          {screenshots.length === 0 && (
            <p className="text-sm text-ink/40">No screenshots captured yet.</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {screenshots.map((s) => (
              <ScreenshotThumb key={s.id} shot={s} />
            ))}
          </div>
        </>
      )}

      {tab === 'activity' && (
        <div className="bg-white border border-line rounded-lg divide-y divide-line">
          {activity.length === 0 && <p className="p-4 text-sm text-ink/40">No activity recorded yet.</p>}
          {activity.map((a) => (
            <div key={a.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
              <span className="font-mono text-xs text-ink/40 w-20 shrink-0">{formatTime(a.ts)}</span>
              <span
                className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 ${
                  a.event_type === 'blocked' ? 'bg-clay/10 text-clay' : 'bg-ink/5 text-ink/40'
                }`}
              >
                {a.event_type}
              </span>
              <span className="truncate text-ink/80">{a.title || a.url}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
