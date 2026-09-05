import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Blocklist() {
  const [entries, setEntries] = useState([]);
  const [pattern, setPattern] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const { blocklist } = await api.getBlocklist();
      setEntries(blocklist);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!pattern.trim()) return;
    try {
      await api.addBlocklistEntry(pattern.trim(), reason.trim());
      setPattern('');
      setReason('');
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleRemove(id) {
    await api.removeBlocklistEntry(id);
    load();
  }

  return (
    <div className="px-8 py-7 max-w-2xl">
      <h1 className="font-display text-2xl font-semibold mb-1">Blocklist</h1>
      <p className="text-sm text-ink/50 mb-6">
        Domains listed here are blocked on all enrolled devices. Changes sync to devices within a few minutes.
      </p>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="example.com"
          className="flex-1 px-3 py-2 rounded-md border border-line bg-white text-sm focus-ring"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="flex-1 px-3 py-2 rounded-md border border-line bg-white text-sm focus-ring"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-moss text-white text-sm font-medium rounded-md hover:bg-mossDark transition-colors focus-ring"
        >
          Add
        </button>
      </form>

      {error && <p className="text-clay text-sm mb-4">{error}</p>}

      <div className="bg-white border border-line rounded-lg divide-y divide-line">
        {entries.length === 0 && <p className="p-4 text-sm text-ink/40">No blocked domains yet.</p>}
        {entries.map((e) => (
          <div key={e.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
            <div>
              <span className="font-mono">{e.pattern}</span>
              {e.reason && <span className="text-ink/40 ml-2 text-xs">â€” {e.reason}</span>}
            </div>
            <button
              onClick={() => handleRemove(e.id)}
              className="text-xs text-ink/40 hover:text-clay transition-colors focus-ring"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
