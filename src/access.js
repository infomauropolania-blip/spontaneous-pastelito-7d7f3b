import { AUTH_EVENTS, getUser, handleAuthCallback, login, logout, onAuthChange, refreshSession, requestPasswordRecovery, signup, updateUser } from '@netlify/identity';
import { persistIdentityCookies, restoreIdentitySession } from './identity-session.mjs';

const gate = document.querySelector('#academyAccessGate');
const shell = document.querySelector('.app-shell');
const message = document.querySelector('#academyAccessMessage');
const forms = ['academyLoginForm', 'academySignupForm', 'academyRequestForm', 'academyRecoveryForm', 'academyResetForm'].map((id) => document.getElementById(id));
const signOut = document.querySelector('#academySignOut');
const loginFeedback = document.querySelector('#academyLoginFeedback');
const recoveryFeedback = document.querySelector('#academyRecoveryFeedback');
const resendConfirmation = document.querySelector('#resendAcademyConfirmation');
const resendSignedInConfirmation = document.querySelector('#resendSignedInConfirmation');
const resetForm = document.querySelector('#academyResetForm');
const resetFeedback = document.querySelector('#academyResetFeedback');
const toggleResetPasswords = document.querySelector('#toggleAcademyResetPasswords');
const recoveryPendingKey = 'academy-password-recovery';
let approved = false;
let permissions = { allowed: false, canSave: false, canHistory: false, plan: null };

onAuthChange((event) => {
  if ([AUTH_EVENTS.LOGIN, AUTH_EVENTS.RECOVERY, AUTH_EVENTS.TOKEN_REFRESH, AUTH_EVENTS.USER_UPDATED].includes(event)) {
    persistIdentityCookies();
  }
});

function view(formId = '') {
  gate.hidden = false;
  shell.hidden = true;
  for (const form of forms) form.hidden = form.id !== formId;
}

function notice(text) { message.textContent = text; }
function loginNotice(text, unconfirmed = false) {
  loginFeedback.textContent = text;
  loginFeedback.hidden = !text;
  resendConfirmation.hidden = !unconfirmed;
  notice(text);
}
function isUnconfirmed(error) { return /email not confirmed|correo no confirmado/i.test(error?.message || ''); }
function friendlyError(error) {
  if (isUnconfirmed(error)) return 'Tu correo aún no está confirmado. Abre el enlace que te envió Academy o pulsa «Reenviar correo de confirmación».';
  if (/invalid.grant|invalid login|invalid credentials/i.test(error?.message || '')) return 'No se pudo entrar. Comprueba el correo y la contraseña.';
  if (/rate.limit|too.many.requests/i.test(error?.message || '')) return 'Se ha solicitado un enlace hace poco. Espera unos minutos antes de intentarlo de nuevo y revisa tu correo.';
  return error?.message || 'No se pudo completar la operación.';
}

async function api(action, options = {}) {
  const result = await fetch(`/api/academy/${action}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}

async function refreshAccess() {
  approved = false;
  publishAccess({ allowed: false, canSave: false, canHistory: false, plan: null });
  view();
  notice('Comprobando tu acceso…');
  try {
    const restored = await restoreIdentitySession(refreshSession);
    if (!restored && !document.cookie.split(';').some((part) => part.trim().startsWith('nf_jwt='))) {
      signOut.hidden = true;
      notice('Entra con el mismo correo y contraseña de tu cuenta. Perder la sesión no cambia tu contraseña.');
      view('academyLoginForm');
      return;
    }
    await refreshSession();
    persistIdentityCookies();
    const user = await getUser();
    signOut.hidden = !user;
    resendSignedInConfirmation.hidden = !user || Boolean(user.confirmedAt) || !user.confirmationSentAt;
    if (!user) {
      notice('Entra con el mismo correo y contraseña de tu cuenta. Perder la sesión no cambia tu contraseña.');
      view('academyLoginForm');
      return;
    }
    if (!user.confirmedAt) {
      notice(user.confirmationSentAt
        ? 'Confirma tu correo mediante el enlace que recibiste. Si no lo encuentras, puedes reenviarlo aquí.'
        : 'No se pudo comprobar si tu correo está confirmado. Vuelve a abrir Academy con conexión; si continúa, consulta con el administrador de Peppos.');
      return;
    }
    const { profile, access } = await api('me');
    publishAccess(access);
    if (!access?.allowed) {
      if (!profile) {
        document.getElementById('academyRequestForm').elements.name.value = user.userMetadata?.full_name || user.name || '';
        view('academyRequestForm');
        notice('Completa tu perfil de barista. La suscripción y los códigos de premio estarán disponibles próximamente.');
      } else {
        notice('Tu cuenta está creada. El acceso se activará al verificar tu suscripción o invitación. Todavía no se realizan cobros.');
      }
      return;
    }
    approved = true;
    gate.hidden = true;
    shell.hidden = false;
  } catch (error) {
    notice(error.message || 'No se pudo comprobar el acceso.');
  }
}

document.getElementById('showAcademySignup').addEventListener('click', () => {
  loginNotice('Elige tu modalidad y crea tu cuenta. No se realiza ningún cobro.');
  view('academySignupForm');
});
document.getElementById('showAcademyLogin').addEventListener('click', () => {
  loginNotice('Entra con el correo y la contraseña de una cuenta existente.');
  view('academyLoginForm');
});
document.getElementById('showAcademyRecovery').addEventListener('click', () => {
  document.querySelector('#academyRecoveryForm').elements.email.value = document.querySelector('#academyLoginForm').elements.email.value.trim();
  recoveryFeedback.hidden = true;
  recoveryFeedback.textContent = '';
  notice('Indica el correo de tu cuenta. Recibirás un enlace para cambiar la contraseña.');
  view('academyRecoveryForm');
});
document.getElementById('backToAcademyLogin').addEventListener('click', () => {
  loginNotice('Entra con el correo y la contraseña de tu cuenta.');
  view('academyLoginForm');
});
document.getElementById('academyRecoveryForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  button.textContent = 'Enviando…';
  recoveryFeedback.textContent = 'Solicitando el enlace de recuperación…';
  recoveryFeedback.hidden = false;
  try {
    await requestPasswordRecovery(form.elements.email.value.trim());
    recoveryFeedback.textContent = 'Si ese correo tiene una cuenta de Academy, recibirás un enlace para crear una contraseña nueva. Revisa también el correo no deseado.';
  } catch (error) { recoveryFeedback.textContent = friendlyError(error); }
  finally { button.disabled = false; button.textContent = 'Enviar enlace'; }
});
function resetPasswordFeedback(text = '', invalid = false) {
  resetFeedback.textContent = text;
  resetFeedback.hidden = !text;
  if (invalid) resetForm.elements.confirmPassword.setAttribute('aria-invalid', 'true');
  else resetForm.elements.confirmPassword.removeAttribute('aria-invalid');
}

for (const field of [resetForm.elements.password, resetForm.elements.confirmPassword]) {
  field.addEventListener('input', () => {
    const { password, confirmPassword } = resetForm.elements;
    resetPasswordFeedback(password.value && confirmPassword.value && password.value === confirmPassword.value
      ? 'Las contraseñas coinciden.' : '');
  });
}
toggleResetPasswords.addEventListener('click', () => {
  const visible = toggleResetPasswords.getAttribute('aria-pressed') !== 'true';
  for (const field of [resetForm.elements.password, resetForm.elements.confirmPassword]) field.type = visible ? 'text' : 'password';
  toggleResetPasswords.setAttribute('aria-pressed', String(visible));
  toggleResetPasswords.textContent = visible ? 'Ocultar contraseñas' : 'Mostrar contraseñas';
});
resetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  if (form.elements.password.value !== form.elements.confirmPassword.value) {
    resetPasswordFeedback('Las contraseñas no coinciden. Revísalas antes de guardar.', true);
    form.elements.confirmPassword.focus();
    return;
  }
  button.disabled = true;
  button.textContent = 'Guardando…';
  resetPasswordFeedback('Guardando la contraseña…');
  try {
    await updateUser({ password: form.elements.password.value });
    sessionStorage.removeItem(recoveryPendingKey);
    form.reset();
    resetPasswordFeedback();
    for (const field of [form.elements.password, form.elements.confirmPassword]) field.type = 'password';
    toggleResetPasswords.setAttribute('aria-pressed', 'false');
    toggleResetPasswords.textContent = 'Mostrar contraseñas';
    await refreshAccess();
    if (!gate.hidden) notice(`Contraseña guardada. ${message.textContent}`);
  } catch (error) { resetPasswordFeedback(`No se pudo guardar la contraseña. ${friendlyError(error)}`, true); }
  finally { button.disabled = false; button.textContent = 'Guardar contraseña'; }
});
document.getElementById('academyLoginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  button.textContent = 'Entrando…';
  loginNotice('Comprobando el correo y la contraseña…');
  try {
    await login(form.elements.email.value.trim(), form.elements.password.value);
    await refreshAccess();
  } catch (error) { loginNotice(friendlyError(error), isUnconfirmed(error)); }
  finally { button.disabled = false; button.textContent = 'Entrar'; }
});
resendConfirmation.addEventListener('click', async () => {
  const form = document.getElementById('academyLoginForm');
  if (!form.reportValidity()) return;
  resendConfirmation.disabled = true;
  loginNotice('Enviando de nuevo el correo de confirmación…', true);
  try {
    await signup(form.elements.email.value.trim(), form.elements.password.value);
    loginNotice('Correo enviado. Revisa la bandeja de entrada y correo no deseado; abre el enlace y vuelve a Academy.');
  } catch (error) { loginNotice(friendlyError(error), true); }
  finally { resendConfirmation.disabled = false; }
});
resendSignedInConfirmation.addEventListener('click', async () => {
  resendSignedInConfirmation.disabled = true;
  notice('Enviando de nuevo el correo de confirmación…');
  try {
    const user = await getUser();
    if (!user) throw new Error('La sesión ha caducado. Vuelve a entrar.');
    if (user.confirmedAt) { await refreshAccess(); return; }
    if (!user.id || !user.email || !user.confirmationSentAt) {
      throw new Error('No se pudo verificar la cuenta existente. Vuelve a abrir Academy con conexión o consulta con el administrador.');
    }
    // GoTrue reenvía la confirmación de una cuenta existente aún sin verificar.
    // La contraseña temporal solo satisface la validación del endpoint; no reemplaza la actual.
    const temporaryPassword = Array.from(crypto.getRandomValues(new Uint8Array(24)),
      (byte) => byte.toString(16).padStart(2, '0')).join('');
    const result = await signup(user.email, temporaryPassword);
    if (result.id !== user.id) throw new Error('No se pudo confirmar que la solicitud pertenezca a tu cuenta. Consulta con el administrador.');
    notice('Reenvío solicitado. Revisa también el correo no deseado; si no llega, espera unos minutos antes de repetirlo.');
  } catch (error) { notice(`No se pudo reenviar el correo. ${friendlyError(error)}`); }
  finally { resendSignedInConfirmation.disabled = false; }
});
document.getElementById('academySignupForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const name = form.elements.name.value.trim();
    const local = form.elements.local.value.trim();
    const plan = form.elements.plan.value;
    if (name.length < 2 || plan === 'professional' && local.length < 2) throw new Error('Indica tu nombre y, para profesional, el local.');
    sessionStorage.setItem('academy-request-draft', JSON.stringify({ name, local, plan }));
    const user = await signup(form.elements.email.value.trim(), form.elements.password.value, { full_name: name, academy_local: local, academy_requested_plan: plan });
    if (user.confirmedAt) await refreshAccess();
    else {
      view();
      notice('Te hemos enviado un enlace para confirmar el correo. Después podrás completar tu perfil de barista. Revisa también el correo no deseado.');
    }
  } catch (error) { notice(friendlyError(error)); }
  finally { button.disabled = false; }
});
document.getElementById('academyRequestForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const name = form.elements.name.value.trim();
    const local = form.elements.local.value.trim();
    const plan = form.elements.plan.value;
    if (name.length < 2 || plan === 'professional' && local.length < 2) throw new Error('Indica tu nombre y, para profesional, el local.');
    await api('request', { method: 'POST', body: { name, local, plan } });
    sessionStorage.removeItem('academy-request-draft');
    view();
    notice('Perfil enviado. Todavía no se realizan cobros; el acceso se activará al verificar tu suscripción o invitación.');
  } catch (error) { notice(friendlyError(error)); }
  finally { button.disabled = false; }
});
signOut.addEventListener('click', async () => {
  await logout();
  await refreshAccess();
});

window.PepposAcademyAccess = {
  get approved() { return approved; },
  get permissions() { return permissions; },
  async history(day) { if (!permissions.canHistory) return []; return (await api(`history?day=${encodeURIComponent(day)}`)).records; },
  async saveRecord(record) {
    if (!approved || !permissions.canSave) throw new Error('Guardar recetas requiere Barista profesional activo.');
    try { return (await api('record', { method: 'POST', body: { record } })).record; }
    catch (error) {
      if (/pendiente|retirado|Confirma tu correo/i.test(error.message)) await refreshAccess();
      throw error;
    }
  }
};

function publishAccess(access) {
  permissions = access || { allowed: false, plan: null, canSave: false, canHistory: false };
  document.body.dataset.plan = permissions.plan || 'none';
  document.getElementById('membershipBadge').textContent = permissions.name || 'Barista';
  window.dispatchEvent(new CustomEvent('academy-access-change', { detail: permissions }));
}
function updateLocalField(form) {
  const professional = form.elements.plan.value === 'professional';
  form.querySelector('[data-local-field]').hidden = !professional;
  form.elements.local.required = professional;
}
for (const id of ['academySignupForm','academyRequestForm']) {
  const form = document.getElementById(id);
  form.elements.plan.addEventListener('change', () => updateLocalField(form));
  updateLocalField(form);
}

handleAuthCallback().then((result) => {
  if (result?.type === 'recovery') sessionStorage.setItem(recoveryPendingKey, '1');
}).catch((error) => notice(friendlyError(error)))
  .finally(async () => {
    if (sessionStorage.getItem(recoveryPendingKey) === '1' && (await restoreIdentitySession(refreshSession) || document.cookie.includes('nf_jwt=')) && await getUser()) {
      notice('Enlace verificado. Crea ahora tu contraseña nueva.');
      view('academyResetForm');
      return;
    }
    sessionStorage.removeItem(recoveryPendingKey);
    const draft = sessionStorage.getItem('academy-request-draft');
    await refreshAccess();
    if (draft && !document.getElementById('academyRequestForm').hidden) {
      try {
        const values = JSON.parse(draft);
        const form = document.getElementById('academyRequestForm');
        form.elements.name.value = values.name || '';
        form.elements.local.value = values.local || '';
        form.elements.plan.value = values.plan === 'professional' ? 'professional' : 'home';
        updateLocalField(form);
      } catch { /* La persona puede rellenar los campos manualmente. */ }
    }
  });

// Re-check server permissions while the app is in use; do not trust a stale client flag.
let checkingMembership = false;
async function recheckMembership() {
  if (!approved || checkingMembership || document.visibilityState === 'hidden') return;
  checkingMembership = true;
  try {
    const { access } = await api('me');
    if (JSON.stringify(access) !== JSON.stringify(permissions)) publishAccess(access);
    if (!access?.allowed) { approved = false; view(); notice('Tu acceso ha terminado o ha sido retirado. Tus recetas permanecen guardadas.'); }
  } catch {
    approved = false;
    publishAccess({ allowed: false, plan: null, canSave: false, canHistory: false });
    view(); notice('Conéctate y vuelve a entrar para comprobar tu acceso. Tus recetas permanecen guardadas.');
  } finally { checkingMembership = false; }
}
setInterval(recheckMembership, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') recheckMembership(); });
