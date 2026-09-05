import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.login(email, password);
      localStorage.setItem('classlens_token', token);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-moss" />
          <span className="font-display text-2xl font-semibold text-paper tracking-tight">ClassLens</span>
        </div>
        <form onSubmit={handleSubmit} className="bg-paper rounded-xl p-7 shadow-2xl">
          <h1 className="font-display text-lg font-semibold mb-1">Staff sign in</h1>
          <p className="text-sm text-ink/50 mb-5">Classroom monitoring console</p>

          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/60 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 px-3 py-2 rounded-md border border-line bg-white focus-ring text-sm"
            placeholder="admin@example.edu"
          />

          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/60 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-5 px-3 py-2 rounded-md border border-line bg-white focus-ring text-sm"
            placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
          />

          {error && <p className="text-clay text-sm mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-moss text-white font-medium py-2.5 rounded-md hover:bg-mossDark transition-colors disabled:opacity-60 focus-ring"
          >
            {loading ? 'Signing inâ€¦' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
