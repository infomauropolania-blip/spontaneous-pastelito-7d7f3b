export const PLANS = Object.freeze({
  home: { name: 'Barista en casa', price: 2.9, saveRecipes: false, history: false },
  professional: { name: 'Barista profesional', price: 4.9, saveRecipes: true, history: true }
});

// Only server-owned grants confer access. A user's choice is not a grant.
export function resolveAccess(profile, grants = [], now = new Date()) {
  const time = new Date(now).getTime();
  if (!Number.isFinite(time)) throw new Error('Fecha inválida.');
  const active = grants.filter((grant) => profile?.status !== 'revoked' && PLANS[grant.plan] && !grant.revokedAt
    && ['paid', 'gift'].includes(grant.source)
    && Number.isFinite(Date.parse(grant.startsAt)) && Date.parse(grant.startsAt) <= time
    && (grant.source === 'gift' && grant.expiresAt === null
      || Number.isFinite(Date.parse(grant.expiresAt)) && Date.parse(grant.expiresAt) > time));
  let plan = active.some((g) => g.plan === 'professional') ? 'professional' : active.length ? 'home' : null;
  // Preserve accounts approved before commercial enrollment was introduced.
  const legacy = profile?.status === 'approved' && !profile.commercial;
  if (legacy) plan = 'professional';
  return { allowed: Boolean(plan), plan, name: plan ? PLANS[plan].name : null,
    canSave: plan === 'professional', canHistory: plan === 'professional', legacy,
    source: legacy ? 'existing-client' : active.some((g) => g.plan === plan && g.source === 'gift') ? 'gift' : plan ? 'paid' : null };
}

export function calendarBillingNotice(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(p => [p.type, p.value]));
  const month = Number(parts.month) === 12 ? 1 : Number(parts.month) + 1;
  const year = Number(parts.year) + (month === 1 ? 1 : 0);
  return { nextRenewalDay: `${year}-${String(month).padStart(2,'0')}-01`, retryThroughDay: 5,
    initialCharge: 'full', timeZone: 'Europe/Madrid' };
}
