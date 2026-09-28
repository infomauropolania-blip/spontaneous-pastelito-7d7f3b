import assert from 'node:assert/strict';
import test from 'node:test';
import { persistIdentityCookies } from '../src/identity-session.mjs';

test('getUser pierde una cookie de sesión al cerrar iOS y conserva una persistente', async () => {
  const storage = new Map();
  globalThis.window = { location: { origin: 'https://academy.example.test' }, addEventListener() {} };
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key)
  };
  const cookies = new Map();
  globalThis.document = {
    get cookie() { return [...cookies].map(([key, entry]) => `${key}=${entry.value}`).join('; '); },
    set cookie(raw) {
      const [pair, ...attributes] = raw.split(';').map((part) => part.trim());
      const split = pair.indexOf('=');
      const name = pair.slice(0, split);
      if (/expires=Thu, 01 Jan 1970/i.test(raw)) cookies.delete(name);
      else cookies.set(name, { value: pair.slice(split + 1), persistent: attributes.some((part) => /^max-age=/i.test(part)) });
    }
  };
  const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/token')) return Response.json({ access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600 });
    if (String(url).endsWith('/user')) return Response.json({ id: 'test-user', email: 'test@example.invalid', confirmed_at: '2026-01-01T00:00:00Z' });
    if (String(url).endsWith('/logout')) return Response.json({});
    throw new Error(`Petición inesperada: ${url}`);
  };

  const { getUser, login, logout, onAuthChange, AUTH_EVENTS } = await import('@netlify/identity');
  await login('test@example.invalid', 'test-only');
  assert.ok(await getUser());
  assert.ok(storage.has('gotrue.user'));
  for (const [key, entry] of cookies) if (!entry.persistent) cookies.delete(key);
  assert.equal(await getUser(), null, 'el SDK descarta la sesión local cuando falta nf_jwt');

  onAuthChange((event) => {
    if ([AUTH_EVENTS.LOGIN, AUTH_EVENTS.TOKEN_REFRESH].includes(event)) persistIdentityCookies();
  });
  await login('test@example.invalid', 'test-only');
  assert.equal(cookies.get('nf_jwt')?.persistent, true);
  assert.equal(cookies.get('nf_refresh')?.persistent, true);
  for (const [key, entry] of cookies) if (!entry.persistent) cookies.delete(key);
  assert.ok(await getUser(), 'la cookie sigue disponible tras cerrar la PWA simulada');
  await logout();
  assert.equal(await getUser(), null, 'el cierre manual elimina la sesión');
});
