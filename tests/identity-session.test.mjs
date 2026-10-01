import assert from 'node:assert/strict';
import test from 'node:test';
import { persistIdentityCookies, restoreIdentitySession } from '../src/identity-session.mjs';

function cookieJar() {
  const jar = new Map();
  const cookieDocument = {
    get cookie() { return [...jar].map(([name, value]) => `${name}=${value}`).join('; '); },
    set cookie(value) {
      const [pair] = value.split(';');
      const separator = pair.indexOf('=');
      jar.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  };
  return { jar, cookieDocument };
}

test('la sesión de Identity conserva las cookies del SDK al cerrar la PWA', () => {
  const jar = new Map([['nf_jwt', 'jwt%2Evalue'], ['nf_refresh', 'refresh%2Bvalue']]);
  const writes = [];
  const cookieDocument = {
    get cookie() { return [...jar].map(([name, value]) => `${name}=${value}`).join('; '); },
    set cookie(value) {
      writes.push(value);
      const [pair] = value.split(';');
      const separator = pair.indexOf('=');
      jar.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  };

  persistIdentityCookies(cookieDocument);
  assert.equal(writes.length, 2);
  assert.deepEqual([...jar], [['nf_jwt', 'jwt%2Evalue'], ['nf_refresh', 'refresh%2Bvalue']]);
  for (const write of writes) {
    assert.match(write, /Max-Age=34560000; Path=\/; Secure; SameSite=Lax$/);
  }

  // Tras un cierre de sesión, el SDK elimina ambas cookies; no se recrean.
  jar.clear();
  persistIdentityCookies(cookieDocument);
  assert.equal(writes.length, 2);
});

test('restaura las cookies desde GoTrue antes de que getUser borre la sesión local', async () => {
  const { jar, cookieDocument } = cookieJar();
  const now = Date.now();
  const storage = { getItem: () => JSON.stringify({ token: {
    access_token: 'fixture.jwt.value', refresh_token: 'fixture+refresh', expires_at: Math.floor(now / 1000) + 3600
  } }) };
  let refreshed = false;
  assert.equal(await restoreIdentitySession(() => { refreshed = true; }, cookieDocument, storage, now), true);
  assert.equal(refreshed, false);
  assert.equal(jar.get('nf_jwt'), 'fixture.jwt.value');
  assert.equal(jar.get('nf_refresh'), 'fixture%2Brefresh');
});

test('renueva el token caducado antes de restaurar cookies; no reutiliza uno vencido si falla', async () => {
  const { jar, cookieDocument } = cookieJar();
  const now = Date.now();
  const storage = { getItem: () => JSON.stringify({ token: {
    access_token: 'expired', refresh_token: 'fixture-refresh', expires_at: Math.floor(now / 1000) - 10
  } }) };
  assert.equal(await restoreIdentitySession(async () => null, cookieDocument, storage, now), false);
  assert.equal(jar.size, 0);
  assert.equal(await restoreIdentitySession(async () => {
    cookieDocument.cookie = 'nf_jwt=renewed; Path=/';
    cookieDocument.cookie = 'nf_refresh=renewed-refresh; Path=/';
    return 'renewed';
  }, cookieDocument, storage, now), true);
  assert.equal(jar.get('nf_jwt'), 'renewed');
});
