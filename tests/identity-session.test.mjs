import assert from 'node:assert/strict';
import test from 'node:test';
import { persistIdentityCookies } from '../src/identity-session.mjs';

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
