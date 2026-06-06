'use client';

import { FormEvent, useState } from 'react';

export function LoginForm() {
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.get('username'),
        password: form.get('password'),
      }),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error || 'Login failed');
      return;
    }
    window.location.reload();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <form className="w-full max-w-sm rounded-md border border-[var(--border)] bg-[var(--panel)] p-6" onSubmit={onSubmit}>
        <p className="text-sm text-[var(--muted)]">SooryasWeb</p>
        <h1 className="mb-2 mt-1 text-2xl font-semibold">Continue with Google</h1>
        <p className="mb-5 text-sm text-[var(--muted)]">Use your invited Google email. Prototype password login is for local fallback only.</p>
        <label className="mb-3 block text-sm">
          Username
          <input
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2"
            name="username"
            required
          />
        </label>
        <label className="mb-4 block text-sm">
          Password
          <input
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2"
            name="password"
            type="password"
            required
          />
        </label>
        {error ? <p className="mb-3 rounded-md bg-red-950 px-3 py-2 text-sm text-red-100">{error}</p> : null}
        <button className="w-full rounded-md bg-[var(--brand)] px-4 py-2 font-semibold text-white" type="submit">
          Sign in
        </button>
      </form>
    </main>
  );
}
