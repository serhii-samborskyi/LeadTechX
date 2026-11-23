export const FAST_AGENT_DRAFT_VERSION = 1;
export const FAST_AGENT_DRAFT_KEY = `ringport:fastagent:draft:v${FAST_AGENT_DRAFT_VERSION}`;
export const FAST_AGENT_VISITOR_KEY = "ringport:fastagent:visitor:v1";
export const FAST_AGENT_SENSITIVE_URL_KEYS = Object.freeze([
  "email",
  "owner_email",
  "ownerEmail",
  "token",
  "access_token",
  "claim_token",
  "mobile_device_id",
  "mobileDeviceId",
]);

export function normalizeWebsiteInput(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function validBusinessUrl(value) {
  const normalized = normalizeWebsiteInput(value);
  if (!normalized) return { valid: false, value: "" };
  try {
    const url = new URL(normalized);
    const hostname = url.hostname.replace(/^www\./i, "");
    const valid = ["http:", "https:"].includes(url.protocol) && hostname.includes(".") && !hostname.endsWith(".");
    return { valid, value: valid ? url.href : normalized };
  } catch {
    return { valid: false, value: normalized };
  }
}

export function normalizeBillingPeriodInput(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
  return ["12", "12-month", "12-months", "annual", "annually", "year", "yearly"].includes(normalized) ? 12 : 1;
}

export function clampRolloutPercent(value, fallback = 50) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Math.min(100, Math.max(0, Math.round(Number(fallback) || 0)));
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

export function stableExperimentBucket(visitorId) {
  const input = String(visitorId || "anonymous");
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

export function fastAgentVariant(visitorId, rolloutPercent) {
  const bucket = stableExperimentBucket(visitorId);
  return {
    bucket,
    variant: bucket < clampRolloutPercent(rolloutPercent) ? "wizard" : "control",
  };
}

const BUSINESS_TYPES = new Set(["establishment", "point_of_interest"]);
const ADDRESS_TYPES = new Set(["street_address", "premise", "subpremise", "street_number", "route"]);

export function classifyPlacePrediction(types = []) {
  const cleanTypes = Array.isArray(types) ? types.map((type) => String(type || "").trim()).filter(Boolean) : [];
  if (cleanTypes.some((type) => BUSINESS_TYPES.has(type))) return "business";
  if (cleanTypes.some((type) => ADDRESS_TYPES.has(type))) return "address";
  return "place";
}

export function parseFastAgentEntry({ search = "", pathname = "/fastagent/" } = {}) {
  const params = new URLSearchParams(search);
  const shortCode = /^\/(\d{8})\/?$/.exec(pathname)?.[1] || "";
  const accessToken = String(params.get("token") || params.get("access_token") || "").trim();
  const claimToken = String(params.get("claim_token") || "").trim();
  return {
    businessName: String(params.get("business_name") || "").trim(),
    website: normalizeWebsiteInput(params.get("website")),
    placeId: String(params.get("place_id") || "").trim(),
    serviceArea: String(params.get("service_area") || "").trim(),
    accessToken,
    claimToken,
    shortCode,
    mobileDeviceId: String(params.get("mobile_device_id") || params.get("mobileDeviceId") || "").trim(),
    requestedPlan: String(params.get("plan") || params.get("plan_slug") || params.get("subscription_plan") || "").trim(),
    requestedPeriod: normalizeBillingPeriodInput(params.get("period") || params.get("billing_period") || params.get("billingPeriod")),
    bypassWizard: Boolean(accessToken || claimToken || shortCode),
  };
}

export function fastAgentSessionPath(shortUrl, { requestedPlan = "", requestedPeriod = 1 } = {}) {
  try {
    const parsed = new URL(String(shortUrl || ""), "https://ringport.invalid");
    if (!/^\/\d{8}\/?$/.test(parsed.pathname)) return "";
    const params = new URLSearchParams();
    const plan = String(requestedPlan || "").trim();
    if (plan) params.set("plan", plan);
    if (normalizeBillingPeriodInput(requestedPeriod) === 12) params.set("period", "12");
    return `${parsed.pathname.replace(/\/$/, "")}${params.size ? `?${params}` : ""}`;
  } catch {
    return "";
  }
}

export function createFastAgentDraft(entry = {}, saved = null) {
  const restored = saved && Number(saved.version) === FAST_AGENT_DRAFT_VERSION ? saved : {};
  const fromUrl = {
    businessName: String(entry.businessName || "").trim(),
    website: normalizeWebsiteInput(entry.website),
    placeId: String(entry.placeId || "").trim(),
    serviceArea: String(entry.serviceArea || "").trim(),
  };
  return {
    version: FAST_AGENT_DRAFT_VERSION,
    step: String(restored.step || "business"),
    flowId: String(restored.flowId || ""),
    updatedAt: Number(restored.updatedAt || 0),
    businessName: fromUrl.businessName || String(restored.businessName || "").trim(),
    placeId: fromUrl.placeId || String(restored.placeId || "").trim(),
    selectionKind: fromUrl.placeId ? "business" : String(restored.selectionKind || (fromUrl.businessName ? "manual" : "")),
    selectedPlace: fromUrl.placeId ? null : restored.selectedPlace || null,
    selectedAddress: fromUrl.placeId ? "" : String(restored.selectedAddress || "").trim(),
    addressPlaceId: fromUrl.placeId ? "" : String(restored.addressPlaceId || "").trim(),
    addressBusinesses: fromUrl.placeId || !Array.isArray(restored.addressBusinesses) ? [] : restored.addressBusinesses.slice(0, 6),
    website: fromUrl.website || normalizeWebsiteInput(restored.website),
    websiteSource: fromUrl.website ? "prefilled" : String(restored.websiteSource || ""),
    serviceArea: fromUrl.serviceArea || String(restored.serviceArea || "").trim(),
    noWebsite: fromUrl.website ? false : Boolean(restored.noWebsite),
  };
}

export function firstFastAgentStep(draft = {}) {
  if (!String(draft.businessName || "").trim()) return "business";
  if (draft.website || draft.noWebsite) return "review";
  return "website";
}

export function shouldAskServiceArea(draft = {}) {
  return Boolean(draft.noWebsite && draft.selectionKind === "manual" && !draft.placeId && !draft.selectedAddress);
}

export function validateFastAgentDraft(draft = {}) {
  const businessName = String(draft.businessName || "").trim();
  if (!businessName) return { valid: false, step: "business", field: "businessName" };
  if (draft.noWebsite) {
    if (shouldAskServiceArea(draft) && !String(draft.serviceArea || "").trim()) {
      return { valid: false, step: "website", field: "serviceArea" };
    }
    return { valid: true, businessName, website: "" };
  }
  const website = validBusinessUrl(draft.website);
  if (!website.valid) return { valid: false, step: "website", field: "website" };
  return { valid: true, businessName, website: website.value };
}

export function fastAgentBuildPayload(draft = {}, requestedPlan = "", { includeWebsiteDecision = true } = {}) {
  const payload = {
    businessName: String(draft.businessName || "").trim(),
    website: draft.noWebsite ? "" : normalizeWebsiteInput(draft.website),
    placeId: String(draft.placeId || "").trim(),
    serviceArea: String(draft.serviceArea || draft.selectedAddress || "").trim(),
    plan: String(requestedPlan || "").trim(),
  };
  if (includeWebsiteDecision) payload.noWebsite = Boolean(draft.noWebsite);
  return payload;
}

export function fastAgentStorageKey(payload = {}) {
  const placeId = String(payload.placeId || "").trim();
  if (placeId) return `fastagent:place:${placeId}`;
  const businessName = String(payload.businessName || "").trim();
  const website = normalizeWebsiteInput(payload.website);
  return businessName || website ? `fastagent:${businessName.toLowerCase()}|${website.toLowerCase()}` : "";
}
