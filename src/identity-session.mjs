// @netlify/identity 2.0 stores a persistent GoTrue session, but writes its
// matching auth cookies as browser-session cookies. iOS can discard those
// cookies when a Home Screen web app closes, and getUser() then clears GoTrue.
// A long, rolling browser lifetime avoids imposing an Academy timeout. The
// refresh token's server-side validity still determines whether login works.
const COOKIE_LIFETIME_SECONDS = 400 * 24 * 60 * 60;
const IDENTITY_COOKIE_NAMES = ['nf_jwt', 'nf_refresh'];

export function persistIdentityCookies(cookieDocument = document) {
  const cookies = cookieDocument.cookie.split(';').map((part) => part.trim());
  for (const name of IDENTITY_COOKIE_NAMES) {
    const cookie = cookies.find((part) => part.startsWith(`${name}=`));
    if (!cookie) continue;
    // Preserve the SDK's encoded value. This changes only browser persistence;
    // token validity and revocation are still enforced by Netlify Identity.
    cookieDocument.cookie = `${cookie}; Max-Age=${COOKIE_LIFETIME_SECONDS}; Path=/; Secure; SameSite=Lax`;
  }
}
