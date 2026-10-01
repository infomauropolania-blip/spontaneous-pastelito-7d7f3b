// @netlify/identity 2.0 stores a persistent GoTrue session, but writes its
// matching auth cookies as browser-session cookies. iOS can discard those
// cookies when a Home Screen web app closes, and getUser() then clears GoTrue.
// A long, rolling browser lifetime avoids imposing an Academy timeout. The
// refresh token's server-side validity still determines whether login works.
const COOKIE_LIFETIME_SECONDS = 400 * 24 * 60 * 60;
const IDENTITY_COOKIE_NAMES = ['nf_jwt', 'nf_refresh'];

function cookieValue(cookieDocument, name) {
  return cookieDocument.cookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function writeIdentityCookie(cookieDocument, name, value) {
  cookieDocument.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${COOKIE_LIFETIME_SECONDS}; Path=/; Secure; SameSite=Lax`;
}

export function persistIdentityCookies(cookieDocument = document) {
  for (const name of IDENTITY_COOKIE_NAMES) {
    const value = cookieValue(cookieDocument, name);
    if (value === undefined) continue;
    // Preserve the SDK's encoded value. This changes only browser persistence;
    // token validity and revocation are still enforced by Netlify Identity.
    cookieDocument.cookie = `${name}=${value}; Max-Age=${COOKIE_LIFETIME_SECONDS}; Path=/; Secure; SameSite=Lax`;
  }
}

// The SDK clears gotrue.user if getUser() runs while nf_jwt is missing.
// Restore the matching cookies, or refresh an expired token, before calling it.
export async function restoreIdentitySession(refresh, cookieDocument = document, storage = localStorage, now = Date.now()) {
  let token;
  try { token = JSON.parse(storage.getItem('gotrue.user') || 'null')?.token; }
  catch { token = null; }
  if (!token?.access_token || !token?.refresh_token) return false;

  const expiresAt = Number(token.expires_at);
  if (!Number.isFinite(expiresAt)) return false;
  if (expiresAt - Math.floor(now / 1000) <= 60) {
    const renewed = await refresh();
    if (!renewed) return false;
    persistIdentityCookies(cookieDocument);
    return true;
  }

  writeIdentityCookie(cookieDocument, 'nf_jwt', token.access_token);
  writeIdentityCookie(cookieDocument, 'nf_refresh', token.refresh_token);
  return true;
}
