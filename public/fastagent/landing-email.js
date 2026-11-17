// Landing contact details prefill an editable field; they never authorize an account.
const STORAGE_KEY = "ringport:landing-email";
const MAX_AGE_MS = 30 * 60 * 1000;
const EMAIL_KEYS = ["email", "owner_email", "ownerEmail"];

export function receiveLandingEmail({ location, history, sessionStorage, now = Date.now() }) {
  const url = new URL(location.href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const explicit = EMAIL_KEYS.some((key) => fragment.has(key) || url.searchParams.has(key));
  const value = EMAIL_KEYS.map((key) => fragment.get(key) || url.searchParams.get(key)).find(Boolean) || "";
  const email = value.trim().toLowerCase();
  const valid = email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const clickId = url.searchParams.get("click_id") || "";

  // Remove contact details before tracking initializes or another page is opened.
  if (explicit) {
    const hasFragmentEmail = EMAIL_KEYS.some((key) => fragment.has(key));
    EMAIL_KEYS.forEach((key) => { url.searchParams.delete(key); fragment.delete(key); });
    if (hasFragmentEmail) url.hash = fragment.toString();
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  }
  try {
    if (explicit) {
      if (valid) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ email, clickId, expiresAt: now + MAX_AGE_MS }));
      else sessionStorage.removeItem(STORAGE_KEY);
      return valid ? email : "";
    }
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || saved.expiresAt <= now || (clickId && clickId !== saved.clickId)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return "";
    }
    return typeof saved.email === "string" ? saved.email : "";
  } catch {
    // Storage restrictions must not block the demo or its account form.
    return valid ? email : "";
  }
}
