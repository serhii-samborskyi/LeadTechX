import { receiveLandingEmail } from "./landing-email.js";
import {
  FAST_AGENT_DRAFT_KEY,
  FAST_AGENT_SENSITIVE_URL_KEYS,
  createFastAgentDraft,
  fastAgentBuildPayload,
  fastAgentSessionPath,
  fastAgentStorageKey,
  firstFastAgentStep,
  normalizeBillingPeriodInput,
  normalizeWebsiteInput,
  parseFastAgentEntry,
  shouldAskServiceArea,
  validateFastAgentDraft,
  validBusinessUrl,
} from "./wizard-state.js";

const rawLandingUrl = window.location.href;
const FAST_AGENT_PENDING_SESSION_KEY = "ringport:fastagent:pending-session:v1";
const emailParam = receiveLandingEmail({
  location: window.location,
  history: window.history,
  sessionStorage: {
    getItem: (key) => window.sessionStorage.getItem(key),
    setItem: (key, value) => window.sessionStorage.setItem(key, value),
    removeItem: (key) => window.sessionStorage.removeItem(key),
  },
});
const entry = parseFastAgentEntry({ search: window.location.search, pathname: window.location.pathname });

function sanitizedLandingUrl(value) {
  if (!String(value || "").trim()) return "";
  try {
    const url = new URL(value, window.location.origin);
    for (const key of FAST_AGENT_SENSITIVE_URL_KEYS) {
      url.searchParams.delete(key);
    }
    url.hash = "";
    return url.toString();
  } catch {
    return window.location.origin + window.location.pathname;
  }
}

function restoredDraft() {
  try {
    const value = JSON.parse(sessionStorage.getItem(FAST_AGENT_DRAFT_KEY) || "null");
    if (!value || Date.now() - Number(value.updatedAt || 0) > 2 * 60 * 60 * 1000) return null;
    return value;
  } catch {
    return null;
  }
}

let businessName = entry.businessName;
let website = entry.website;
let placeId = entry.placeId;
const serviceAreaFromUrl = entry.serviceArea;
const accessTokenFromUrl = entry.accessToken;
const mobileDeviceIdFromUrl = entry.mobileDeviceId;
const shortCodeFromPath = entry.shortCode;
const claimToken = entry.claimToken;
const requestedPlan = entry.requestedPlan;
const requestedPeriod = entry.requestedPeriod;
const urlHasEntryPrefill = Boolean(businessName || website || placeId || serviceAreaFromUrl);
const entryDraft = createFastAgentDraft(
  { businessName, website, placeId, serviceArea: serviceAreaFromUrl },
  urlHasEntryPrefill ? null : restoredDraft(),
);
let storageKey = fastAgentStorageKey(entryDraft);
const flowId = entryDraft.flowId || crypto.randomUUID();
entryDraft.flowId = flowId;

const state = {
  accessToken:
    accessTokenFromUrl ||
    (shortCodeFromPath ? `short:${shortCodeFromPath}` : "") ||
    claimToken ||
    (storageKey ? localStorage.getItem(storageKey) || "" : ""),
  shortUrl: "",
  claimToken,
  profile: null,
  profileDirty: false,
  renderingProfile: false,
  ws: null,
  micStream: null,
  inputContext: null,
  outputContext: null,
  processor: null,
  source: null,
  silentGain: null,
  outputSources: new Set(),
  nextPlayTime: 0,
  canSendMic: false,
  micLevel: 0,
  agentLevel: 0,
  visualizerLevel: 0,
  agentSpeakingUntil: 0,
  adTracking: null,
  adTrackedEvents: new Set(),
  subscriptionPlans: [],
  selectedPlanId: null,
  requestedPlan,
  billingPeriodMonths: requestedPeriod,
  annualDiscountPercent: 25,
  aiCallMinuteCredits: 20,
  trialDays: 0,
  trialCredits: 0,
  billingReady: false,
  entryDraft,
  entryStep:
    !urlHasEntryPrefill && ["business", "website", "review"].includes(entryDraft.step)
      ? entryDraft.step
      : firstFastAgentStep(entryDraft),
  entryVariant: "wizard",
  experimentVersion: "fastagent-wizard-v1",
  flowId,
  originalLandingUrl: sanitizedLandingUrl(rawLandingUrl),
  initialReferrer: sanitizedLandingUrl(document.referrer || ""),
  buildInProgress: false,
  lastBuildPayload: null,
  placesSessionToken: "",
  placeLookupInProgress: false,
  activeSuggestionIndex: -1,
  renderedSuggestions: [],
  controlActiveSuggestionIndex: -1,
  controlPlacesSessionToken: "",
  controlPlaceLookupInProgress: false,
  controlSelectedPlace: null,
  visualizerFrame: null,
  entryHistoryDepth: Number(history.state?.fastAgentDepth || 0),
  pendingSessionPath: "",
  sessionPath: "",
};

const el = Object.fromEntries(
  [
    "loadingScreen",
    "loadingTitle",
    "loadingMessage",
    "entryScreen",
    "fastEntryForm",
    "wizardProgress",
    "businessStep",
    "businessStepTitle",
    "businessContinueButton",
    "businessNameInput",
    "websiteInput",
    "websiteStep",
    "websiteStepTitle",
    "websiteStepHelp",
    "websiteBackButton",
    "websiteError",
    "noWebsiteButton",
    "buildAgentButton",
    "serviceAreaField",
    "serviceAreaInput",
    "placeIdInput",
    "planInput",
    "periodInput",
    "placesSuggestions",
    "placesAutocompleteStatus",
    "selectedBusiness",
    "selectedBusinessName",
    "selectedBusinessAddress",
    "changeBusinessButton",
    "addressResolution",
    "addressResolutionTitle",
    "addressBusinessChoices",
    "reviewStep",
    "reviewStepTitle",
    "reviewBusiness",
    "reviewWebsite",
    "editReviewBusiness",
    "editReviewWebsite",
    "reviewBuildButton",
    "controlStep",
    "controlStepTitle",
    "controlBusinessNameInput",
    "controlWebsiteInput",
    "controlPlaceIdInput",
    "controlPlacesSuggestions",
    "controlPlacesStatus",
    "controlBuildButton",
    "agentScreen",
    "errorScreen",
    "errorTitle",
    "errorMessage",
    "retryBuildButton",
    "backToDetailsButton",
    "orb",
    "voiceVisualizer",
    "callStatus",
    "agentTitle",
    "agentSummary",
    "talkButton",
    "stopButton",
    "credits",
    "profileForm",
    "profileSaveButton",
    "copyAgentLinkButton",
    "profileMessage",
    "profileBusinessName",
    "profileWebsite",
    "profileSummary",
    "profilePhone",
    "profileAddress",
    "profileHours",
    "profileArea",
    "profileServices",
    "profileLanguage",
    "profileVoiceName",
    "profileCalendarProvider",
    "profileCalendarHelp",
    "profileVagaroField",
    "profileVagaroUrl",
    "profileCustomBookingField",
    "profileCustomBookingUrl",
    "phoneSection",
    "phoneLimit",
    "demoPhone",
    "callerForm",
    "callerPhone",
    "callerPhones",
    "callerMessage",
    "claimIntro",
    "continueTitle",
    "claimEmailField",
    "finishSetupLink",
    "claimForm",
    "claimEmail",
    "paidPlanSection",
    "billingPeriodToggle",
    "annualDiscountLabel",
    "paidPlanList",
    "paidCheckoutButton",
    "trialOption",
    "trialOptionCopy",
    "claimMessage",
    "transcript",
  ].map((id) => [id, document.querySelector(`#${id}`)]),
);

if (el.planInput) el.planInput.value = requestedPlan;
if (el.periodInput) el.periodInput.value = String(state.billingPeriodMonths);
if (el.claimEmail && emailParam) el.claimEmail.value = emailParam;

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function randomEventSuffix() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function adEventId(eventKey) {
  return `rp_${eventKey}_${Date.now().toString(36)}_${randomEventSuffix()}`;
}

function initMetaPixel(pixelId) {
  if (!pixelId) return;
  if (!window.fbq) {
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  window.fbq("init", pixelId);
}

function initTikTokPixel(pixelId) {
  if (!pixelId) return;
  if (!window.ttq) {
    const ttq = (window.ttq = []);
    ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
    ttq.setAndDefer = function (target, method) {
      target[method] = function () {
        target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (const method of ttq.methods) ttq.setAndDefer(ttq, method);
    ttq.instance = function (name) {
      const instance = ttq._i[name] || [];
      for (const method of ttq.methods) ttq.setAndDefer(instance, method);
      return instance;
    };
    ttq.load = function (id) {
      ttq._i = ttq._i || {};
      ttq._i[id] = [];
      ttq._i[id]._u = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._t = ttq._t || {};
      ttq._t[id] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[id] = {};
      const script = document.createElement("script");
      script.async = true;
      script.src = `${ttq._i[id]._u}?sdkid=${id}&lib=ttq`;
      document.head.appendChild(script);
    };
  }
  window.ttq.load(pixelId);
}

function persistRedditClickId() {
  const clickId = new URLSearchParams(location.search).get("rdt_cid");
  if (!clickId) return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `_rdt_cid=${encodeURIComponent(clickId)}; Path=/; Max-Age=${90 * 24 * 60 * 60}; SameSite=Lax${secure}`;
}

function initRedditPixel(pixelId) {
  if (!pixelId) return;
  if (!window.rdt) {
    const rdt = function () {
      rdt.sendEvent ? rdt.sendEvent.apply(rdt, arguments) : rdt.callQueue.push(arguments);
    };
    rdt.callQueue = [];
    window.rdt = rdt;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.redditstatic.com/ads/pixel.js";
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(script, firstScript);
  }
  window.rdt("init", pixelId);
}

function initOpenAiAdsPixel(pixelId) {
  if (!pixelId) return;
  if (!window.oaiq) {
    window.oaiq = function () {
      window.oaiq.callMethod ? window.oaiq.callMethod.apply(window.oaiq, arguments) : window.oaiq.queue.push(arguments);
    };
    window.oaiq.queue = [];
    window.oaiq.version = "1.0.0";
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://bzrcdn.openai.com/sdk/oaiq.min.js";
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(script, firstScript);
  }
  window.oaiq("init", { pixelId });
}

async function loadAdTracking() {
  try {
    persistRedditClickId();
    state.adTracking = await api("/api/ad-platforms/config");
    initMetaPixel(state.adTracking.meta?.pixelId);
    initTikTokPixel(state.adTracking.tiktok?.pixelId);
    initRedditPixel(state.adTracking.reddit?.pixelId);
    initOpenAiAdsPixel(state.adTracking.openai?.pixelId);
  } catch {
    state.adTracking = null;
  }
}

function platformEventConfig(platform, eventKey) {
  return state.adTracking?.[platform]?.events?.[eventKey] || null;
}

function adPixelCustomData(eventConfig, customData = {}) {
  const data = {};
  if (eventConfig?.value !== null && eventConfig?.value !== undefined && eventConfig?.value !== "") {
    const value = Number(eventConfig.value);
    if (Number.isFinite(value) && value >= 0) data.value = value;
  }
  if (eventConfig?.currency) data.currency = String(eventConfig.currency).trim().toUpperCase();
  for (const [key, value] of Object.entries(customData || {})) {
    if (value !== undefined && value !== null && value !== "") data[key] = value;
  }
  if (data.currency) data.currency = String(data.currency).trim().toUpperCase();
  return data;
}

const OPENAI_ADS_CONTENT_EVENTS = new Set(["checkout_started", "contents_viewed", "items_added", "order_created", "page_viewed"]);
const OPENAI_ADS_PLAN_EVENTS = new Set(["trial_started", "subscription_created"]);
const OPENAI_ADS_CUSTOMER_ACTION_EVENTS = new Set(["lead_created", "registration_completed", "appointment_scheduled"]);

function openAiAdsAmount(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return undefined;
  return Math.round(number * 100);
}

function openAiAdsMeasurePayload(eventConfig, customData = {}) {
  const eventName = String(eventConfig?.eventName || "custom").trim() || "custom";
  const amount = openAiAdsAmount(customData.value);
  const currency = String(customData.currency || "USD").trim().toUpperCase();
  const baseValue = amount === undefined ? {} : { amount, currency: /^[A-Z]{3}$/.test(currency) ? currency : "USD" };

  if (OPENAI_ADS_PLAN_EVENTS.has(eventName)) {
    return {
      eventName,
      data: {
        type: "plan_enrollment",
        ...baseValue,
        plan_id: String(customData.plan_id || customData.planId || customData.content_id || eventName).slice(0, 128),
      },
    };
  }
  if (OPENAI_ADS_CONTENT_EVENTS.has(eventName)) return { eventName, data: { type: "contents", ...baseValue } };
  if (OPENAI_ADS_CUSTOMER_ACTION_EVENTS.has(eventName)) return { eventName, data: { type: "customer_action" } };
  return { eventName: "custom", data: { type: "custom", ...baseValue }, options: { custom_event_name: eventName } };
}

async function trackAdEvent(eventKey, customData = {}, userData = {}) {
  if (!state.adTracking || state.adTrackedEvents.has(eventKey)) return;
  const eventId = adEventId(eventKey);
  const meta = platformEventConfig("meta", eventKey);
  const tiktok = platformEventConfig("tiktok", eventKey);
  const reddit = platformEventConfig("reddit", eventKey);
  const openai = platformEventConfig("openai", eventKey);
  const metaCustomData = adPixelCustomData(meta, customData);
  const tiktokCustomData = adPixelCustomData(tiktok, customData);
  const redditCustomData = { ...adPixelCustomData(reddit, customData), conversionId: eventId };
  const openAiPayload = openAiAdsMeasurePayload(openai, adPixelCustomData(openai, customData));
  if (meta?.enabled && meta.browser && state.adTracking.meta?.pixelId && window.fbq) {
    window.fbq("track", meta.eventName, metaCustomData, { eventID: eventId });
  }
  if (tiktok?.enabled && tiktok.browser && state.adTracking.tiktok?.pixelId && window.ttq) {
    window.ttq.track(tiktok.eventName, tiktokCustomData, { event_id: eventId });
  }
  if (reddit?.enabled && reddit.browser && state.adTracking.reddit?.pixelId && window.rdt) {
    window.rdt("track", reddit.eventName, redditCustomData);
  }
  if (openai?.enabled && openai.browser && state.adTracking.openai?.pixelId && window.oaiq) {
    window.oaiq("measure", openAiPayload.eventName, openAiPayload.data, { ...(openAiPayload.options || {}), event_id: eventId });
  }
  state.adTrackedEvents.add(eventKey);
  try {
    await fetch("/api/ad-platforms/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventKey,
        eventId,
        sourceUrl: state.originalLandingUrl,
        referrer: state.initialReferrer,
        rdt_cid: new URL(state.originalLandingUrl).searchParams.get("rdt_cid") || "",
        customData: adPixelCustomData(meta || tiktok || reddit || openai, customData),
        userData,
      }),
    });
  } catch {
    // Tracking should never block the demo.
  }
}

function showError(message) {
  el.loadingScreen.hidden = true;
  el.entryScreen.hidden = true;
  el.agentScreen.hidden = true;
  el.errorScreen.hidden = false;
  el.errorMessage.textContent = message;
  el.retryBuildButton.hidden = !state.lastBuildPayload;
  el.backToDetailsButton.hidden = !state.lastBuildPayload;
  requestAnimationFrame(() => el.errorTitle?.focus());
}

function setCallStatus(text, live = false) {
  el.callStatus.textContent = text;
  el.callStatus.classList.toggle("live", live);
}

function moneyFromCents(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(cents || 0) / 100);
}

function annualDiscountPercent() {
  const parsed = Number(state.annualDiscountPercent ?? 25);
  return Math.min(95, Math.max(0, Number.isFinite(parsed) ? parsed : 25));
}

function planBillingForCurrentPeriod(plan) {
  const months = state.billingPeriodMonths === 12 ? 12 : 1;
  const monthlyPriceCents = Math.max(0, Math.round(Number(plan?.monthlyPriceCents || 0)));
  const monthlyCredits = Math.max(0, Math.round(Number(plan?.monthlyCredits || 0)));
  const discount = months === 12 ? annualDiscountPercent() : 0;
  return {
    months,
    discount,
    priceCents: Math.max(0, Math.round(monthlyPriceCents * months * (1 - discount / 100))),
    credits: monthlyCredits * months,
  };
}

function updateBillingPeriodUi() {
  if (el.periodInput) el.periodInput.value = String(state.billingPeriodMonths);
  if (el.annualDiscountLabel) el.annualDiscountLabel.textContent = `${annualDiscountPercent()}% off`;
  const checkoutLabel = el.paidCheckoutButton?.querySelector("span");
  if (checkoutLabel) checkoutLabel.textContent = state.billingPeriodMonths === 12 ? "Start annual plan" : "Start paid plan";
  if (!el.billingPeriodToggle) return;
  for (const button of el.billingPeriodToggle.querySelectorAll("button[data-period]")) {
    const active = normalizeBillingPeriodInput(button.dataset.period) === state.billingPeriodMonths;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function appendTranscript(speaker, text) {
  if (!text) return;
  const last = el.transcript.lastElementChild;
  if (last?.dataset.speaker === speaker) {
    last.querySelector(".text").textContent += text.startsWith(" ") ? text : ` ${text}`;
    return;
  }
  const bubble = document.createElement("div");
  bubble.className = `bubble ${speaker}`;
  bubble.dataset.speaker = speaker;
  const label = speaker === "caller" ? "Caller" : speaker === "agent" ? "Agent" : "System";
  bubble.innerHTML = '<span class="speaker"></span><span class="text"></span>';
  bubble.querySelector(".speaker").textContent = label;
  bubble.querySelector(".text").textContent = text;
  el.transcript.appendChild(bubble);
  el.transcript.scrollTop = el.transcript.scrollHeight;
}

let placesSearchTimer = null;
let placesSearchController = null;
let controlPlacesSearchTimer = null;
let controlPlacesSearchController = null;

function persistEntryDraft() {
  state.entryDraft.updatedAt = Date.now();
  state.entryDraft.flowId = state.flowId;
  try {
    sessionStorage.setItem(FAST_AGENT_DRAFT_KEY, JSON.stringify(state.entryDraft));
  } catch {
    // The wizard still works when storage is unavailable.
  }
}

async function trackFunnelEvent(eventKey, customData = {}) {
  if (urlHasEntryPrefill) return;
  try {
    await fetch("/api/onboarding/fast-agent/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        eventKey,
        eventId: `${state.flowId}_${eventKey}`,
        sourceUrl: state.originalLandingUrl,
        referrer: state.initialReferrer,
        customData: {
          fastagent_variant: state.entryVariant,
          experiment_version: state.experimentVersion,
          fastagent_flow_id: state.flowId,
          ...customData,
        },
      }),
    });
  } catch {
    // Funnel measurement never blocks the builder.
  }
}

function freshPlacesSessionToken() {
  state.placesSessionToken = crypto.randomUUID();
  return state.placesSessionToken;
}

function placesSessionToken() {
  return state.placesSessionToken || freshPlacesSessionToken();
}

function setPlacesStatus(message, isError = false) {
  if (!el.placesAutocompleteStatus) return;
  el.placesAutocompleteStatus.textContent = message || "";
  el.placesAutocompleteStatus.classList.toggle("error", Boolean(isError));
}

function hidePlacesSuggestions() {
  if (!el.placesSuggestions) return;
  el.placesSuggestions.hidden = true;
  el.placesSuggestions.innerHTML = "";
  el.businessNameInput?.setAttribute("aria-expanded", "false");
  el.businessNameInput?.removeAttribute("aria-activedescendant");
  state.activeSuggestionIndex = -1;
  state.renderedSuggestions = [];
}

function placeSuggestionIcon(types = []) {
  const typeSet = new Set(types);
  if (typeSet.has("lodging") || typeSet.has("hotel")) return "bed";
  if (typeSet.has("restaurant") || typeSet.has("food") || typeSet.has("bar") || typeSet.has("cafe")) return "utensils";
  if (typeSet.has("dentist") || typeSet.has("doctor") || typeSet.has("hospital") || typeSet.has("health")) return "stethoscope";
  if (typeSet.has("school") || typeSet.has("university") || typeSet.has("educational_institution")) return "graduation-cap";
  if (typeSet.has("store") || typeSet.has("shopping_mall") || typeSet.has("clothing_store")) return "shopping-bag";
  if (typeSet.has("moving_company") || typeSet.has("storage")) return "truck";
  if (typeSet.has("locksmith")) return "key-round";
  if (typeSet.has("car_repair") || typeSet.has("car_dealer") || typeSet.has("car_rental")) return "car";
  if (typeSet.has("real_estate_agency") || typeSet.has("home_goods_store")) return "house";
  if (typeSet.has("gym") || typeSet.has("fitness_center")) return "dumbbell";
  if (typeSet.has("bank") || typeSet.has("finance") || typeSet.has("accounting")) return "landmark";
  if (typeSet.has("beauty_salon") || typeSet.has("hair_care") || typeSet.has("spa")) return "scissors";
  if (types.some((type) => ["street_address", "premise", "subpremise", "street_number", "route"].includes(type))) return "map-pin";
  return "building-2";
}

function setActiveSuggestion(index) {
  const buttons = [...el.placesSuggestions.querySelectorAll('[role="option"]')];
  if (!buttons.length) return;
  state.activeSuggestionIndex = (index + buttons.length) % buttons.length;
  buttons.forEach((button, buttonIndex) => button.setAttribute("aria-selected", buttonIndex === state.activeSuggestionIndex ? "true" : "false"));
  const active = buttons[state.activeSuggestionIndex];
  el.businessNameInput.setAttribute("aria-activedescendant", active.id);
  active.scrollIntoView({ block: "nearest" });
}

function renderPlacesSuggestions(suggestions = [], typedValue = "") {
  if (!el.placesSuggestions) return;
  el.placesSuggestions.innerHTML = "";
  const entries = [...suggestions];
  if (typedValue.trim()) {
    entries.push({ kind: "manual", mainText: `Use “${typedValue.trim()}”`, secondaryText: "Enter this business manually", text: typedValue.trim() });
  }
  if (!entries.length) {
    hidePlacesSuggestions();
    return;
  }
  state.renderedSuggestions = entries;
  entries.forEach((suggestion, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "places-suggestion";
    button.id = `placesSuggestion${index}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");
    button.innerHTML =
      `<span class="places-suggestion-icon"><i data-lucide="${placeSuggestionIcon(suggestion.types)}"></i></span>` +
      '<span class="places-suggestion-copy"><strong></strong><span></span></span><span class="places-suggestion-kind"></span>';
    button.querySelector("strong").textContent = suggestion.mainText || suggestion.text;
    button.querySelector(".places-suggestion-copy > span").textContent = suggestion.secondaryText || suggestion.text;
    button.querySelector(".places-suggestion-kind").textContent = suggestion.kind === "address" ? "Address" : suggestion.kind === "manual" ? "Manual" : "Business";
    button.addEventListener("click", () => selectPlaceSuggestion(suggestion));
    el.placesSuggestions.appendChild(button);
  });
  const attribution = document.createElement("div");
  attribution.className = "places-attribution";
  attribution.textContent = "Google Maps";
  attribution.setAttribute("translate", "no");
  el.placesSuggestions.appendChild(attribution);
  el.placesSuggestions.hidden = false;
  el.businessNameInput.setAttribute("aria-expanded", "true");
  window.lucide?.createIcons();
}

function websiteWasAutoDiscovered() {
  return ["google", "prefilled_google"].includes(state.entryDraft.websiteSource);
}

function applySelectedBusiness(place, selectionKind = "business") {
  state.entryDraft.businessName = String(place.businessName || "").trim();
  state.entryDraft.placeId = String(place.placeId || "").trim();
  state.entryDraft.selectionKind = selectionKind;
  state.entryDraft.selectedPlace = place;
  state.entryDraft.addressBusinesses = [];
  if (place.address) state.entryDraft.serviceArea = place.address;
  if (place.website && (!state.entryDraft.website || websiteWasAutoDiscovered())) {
    state.entryDraft.website = normalizeWebsiteInput(place.website);
    state.entryDraft.websiteSource = "google";
    state.entryDraft.noWebsite = false;
  }
  el.businessNameInput.value = state.entryDraft.businessName;
  el.placeIdInput.value = state.entryDraft.placeId;
  el.selectedBusinessName.textContent = state.entryDraft.businessName;
  el.selectedBusinessAddress.textContent = place.address || state.entryDraft.selectedAddress || "Google business profile";
  el.selectedBusiness.hidden = false;
  el.addressResolution.hidden = true;
  el.businessNameInput.closest(".places-autocomplete-field").hidden = true;
  setPlacesStatus("");
  persistEntryDraft();
}

function chooseManualBusiness(value) {
  state.entryDraft.businessName = String(value || el.businessNameInput.value || "").trim();
  state.entryDraft.placeId = "";
  state.entryDraft.selectionKind = "manual";
  state.entryDraft.selectedPlace = null;
  el.placeIdInput.value = "";
  el.businessNameInput.value = state.entryDraft.businessName;
  hidePlacesSuggestions();
  setPlacesStatus(state.entryDraft.selectedAddress ? `Using ${state.entryDraft.selectedAddress}` : "We’ll research this business by name.");
  persistEntryDraft();
}

function renderAddressBusinessChoices(businesses = []) {
  el.addressBusinessChoices.innerHTML = "";
  for (const place of businesses) {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = "<strong></strong><span></span>";
    button.querySelector("strong").textContent = place.businessName;
    button.querySelector("span").textContent = place.address || state.entryDraft.selectedAddress;
    button.addEventListener("click", () => applySelectedBusiness(place, "address_resolved"));
    el.addressBusinessChoices.appendChild(button);
  }
  el.addressResolution.hidden = false;
}

async function selectPlaceSuggestion(suggestion) {
  if (suggestion.kind === "manual") {
    chooseManualBusiness(suggestion.text);
    return;
  }
  const selectedSessionToken = placesSessionToken();
  state.placesSessionToken = "";
  state.placeLookupInProgress = true;
  el.businessContinueButton.disabled = true;
  el.businessNameInput.readOnly = true;
  el.businessNameInput.setAttribute("aria-disabled", "true");
  el.businessStep.setAttribute("aria-busy", "true");
  el.businessNameInput.value = suggestion.mainText || suggestion.text;
  hidePlacesSuggestions();
  setPlacesStatus(suggestion.kind === "address" ? "Looking for businesses at this address" : "Loading business details");
  try {
    const query = new URLSearchParams({ place_id: suggestion.placeId, kind: suggestion.kind, session_token: selectedSessionToken });
    const data = await api(`/api/places/details?${query}`);
    if (data.kind === "address") {
      state.entryDraft.selectedAddress = data.address?.formattedAddress || suggestion.text;
      state.entryDraft.addressPlaceId = data.address?.placeId || suggestion.placeId;
      state.entryDraft.placeId = "";
      state.entryDraft.businessName = "";
      state.entryDraft.selectionKind = "address";
      state.entryDraft.addressBusinesses = data.businesses || [];
      el.placeIdInput.value = "";
      const businesses = data.businesses || [];
      if (businesses.length === 1) {
        applySelectedBusiness(businesses[0], "address_resolved");
        return;
      }
      el.addressResolutionTitle.textContent = businesses.length
        ? "Which business is yours?"
        : "What is the business name at this address?";
      renderAddressBusinessChoices(businesses);
      el.businessNameInput.value = "";
      el.businessNameInput.placeholder = "Business name at this address";
      if (!businesses.length) {
        setPlacesStatus(`Address selected: ${state.entryDraft.selectedAddress}`);
        el.businessNameInput.focus();
      } else {
        setPlacesStatus("Choose the matching business.");
      }
      persistEntryDraft();
      return;
    }
    applySelectedBusiness(data.place || {}, "business");
  } catch (error) {
    state.entryDraft.placeId = "";
    el.placeIdInput.value = "";
    if (suggestion.kind === "address") {
      state.entryDraft.selectedAddress = suggestion.text;
      state.entryDraft.addressPlaceId = suggestion.placeId;
      state.entryDraft.addressBusinesses = [];
      state.entryDraft.businessName = "";
      state.entryDraft.selectedPlace = null;
      state.entryDraft.selectionKind = "address";
      el.businessNameInput.value = "";
      el.businessNameInput.placeholder = "Business name at this address";
      el.addressResolutionTitle.textContent = "What is the business name at this address?";
      renderAddressBusinessChoices([]);
      setPlacesStatus(`Address selected: ${suggestion.text}. Enter the business name.`, true);
      persistEntryDraft();
      el.businessNameInput.focus();
    } else {
      setPlacesStatus("We couldn’t load that match. Enter the business name manually.", true);
    }
  } finally {
    state.placeLookupInProgress = false;
    el.businessContinueButton.disabled = false;
    el.businessNameInput.readOnly = false;
    el.businessNameInput.removeAttribute("aria-disabled");
    el.businessStep.removeAttribute("aria-busy");
  }
}

function setupPlacesAutocomplete() {
  if (!el.businessNameInput || !el.placesSuggestions) return;
  el.businessNameInput.addEventListener("input", () => {
    const input = el.businessNameInput.value.trim();
    if (input !== state.entryDraft.businessName && (state.entryDraft.selectedPlace || state.entryDraft.placeId)) {
      state.entryDraft.placeId = "";
      state.entryDraft.selectedPlace = null;
      state.entryDraft.selectionKind = state.entryDraft.selectedAddress ? "address" : "manual";
      el.placeIdInput.value = "";
      if (websiteWasAutoDiscovered()) {
        state.entryDraft.website = "";
        state.entryDraft.websiteSource = "";
      }
    }
    state.entryDraft.businessName = input;
    persistEntryDraft();
    clearTimeout(placesSearchTimer);
    if (placesSearchController) placesSearchController.abort();
    if (input.length < 2) {
      setPlacesStatus("");
      hidePlacesSuggestions();
      return;
    }
    placesSearchTimer = setTimeout(async () => {
      try {
        placesSearchController = new AbortController();
        const searchText = state.entryDraft.selectedAddress ? `${input}, ${state.entryDraft.selectedAddress}` : input;
        const query = new URLSearchParams({ input: searchText, session_token: placesSessionToken() });
        const data = await api(`/api/places/autocomplete?${query}`, {
          signal: placesSearchController.signal,
        });
        const suggestions = data.suggestions || [];
        renderPlacesSuggestions(suggestions, input);
        setPlacesStatus(suggestions.length ? "Choose a match or use the name you typed." : "No matches found. You can use the name you typed.");
      } catch (error) {
        if (error.name === "AbortError") return;
        hidePlacesSuggestions();
        const message = error.message.includes("API key not valid")
          ? "Business lookup key was rejected. You can enter it manually."
          : error.message.includes("Places API key")
          ? "Business lookup is not configured yet. You can enter it manually."
          : "Business lookup unavailable. You can enter it manually.";
        setPlacesStatus(message, true);
      }
    }, 220);
  });
  el.businessNameInput.addEventListener("focus", () => {
    if (el.placesSuggestions.querySelector('[role="option"]')) {
      el.placesSuggestions.hidden = false;
      el.businessNameInput.setAttribute("aria-expanded", "true");
    }
  });
  el.businessNameInput.addEventListener("keydown", (event) => {
    const options = [...el.placesSuggestions.querySelectorAll('[role="option"]')];
    if (!options.length || el.placesSuggestions.hidden) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion(state.activeSuggestionIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion(state.activeSuggestionIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveSuggestion(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveSuggestion(options.length - 1);
    } else if (event.key === "Enter" && state.activeSuggestionIndex >= 0) {
      event.preventDefault();
      options[state.activeSuggestionIndex].click();
    } else if (event.key === "Escape") {
      event.preventDefault();
      hidePlacesSuggestions();
    }
  });
  document.addEventListener("click", (event) => {
    if (el.placesSuggestions.hidden) return;
    if (event.target === el.businessNameInput || el.placesSuggestions.contains(event.target)) return;
    hidePlacesSuggestions();
  });
}

function setControlPlacesStatus(message, isError = false) {
  el.controlPlacesStatus.textContent = message || "";
  el.controlPlacesStatus.classList.toggle("error", Boolean(isError));
}

function hideControlPlacesSuggestions() {
  el.controlPlacesSuggestions.hidden = true;
  el.controlPlacesSuggestions.innerHTML = "";
  el.controlBusinessNameInput.setAttribute("aria-expanded", "false");
  el.controlBusinessNameInput.removeAttribute("aria-activedescendant");
  state.controlActiveSuggestionIndex = -1;
}

function setActiveControlSuggestion(index) {
  const buttons = [...el.controlPlacesSuggestions.querySelectorAll('[role="option"]')];
  if (!buttons.length) return;
  state.controlActiveSuggestionIndex = (index + buttons.length) % buttons.length;
  for (const [buttonIndex, button] of buttons.entries()) {
    button.setAttribute("aria-selected", buttonIndex === state.controlActiveSuggestionIndex ? "true" : "false");
  }
  const active = buttons[state.controlActiveSuggestionIndex];
  el.controlBusinessNameInput.setAttribute("aria-activedescendant", active.id);
  active.scrollIntoView({ block: "nearest" });
}

function renderControlPlacesSuggestions(suggestions = []) {
  el.controlPlacesSuggestions.innerHTML = "";
  const businessSuggestions = suggestions.filter((suggestion) => suggestion.kind === "business");
  if (!businessSuggestions.length) {
    hideControlPlacesSuggestions();
    return;
  }
  businessSuggestions.forEach((suggestion, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "places-suggestion";
    button.id = `controlPlacesSuggestion${index}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");
    button.innerHTML =
      `<span class="places-suggestion-icon"><i data-lucide="${placeSuggestionIcon(suggestion.types)}"></i></span>` +
      '<span class="places-suggestion-copy"><strong></strong><span></span></span><span class="places-suggestion-kind">Business</span>';
    button.querySelector("strong").textContent = suggestion.mainText || suggestion.text;
    button.querySelector(".places-suggestion-copy > span").textContent = suggestion.secondaryText || suggestion.text;
    button.addEventListener("click", () => selectControlPlaceSuggestion(suggestion));
    el.controlPlacesSuggestions.appendChild(button);
  });
  const attribution = document.createElement("div");
  attribution.className = "places-attribution";
  attribution.textContent = "Google Maps";
  attribution.setAttribute("translate", "no");
  el.controlPlacesSuggestions.appendChild(attribution);
  el.controlPlacesSuggestions.hidden = false;
  el.controlBusinessNameInput.setAttribute("aria-expanded", "true");
  window.lucide?.createIcons();
}

async function selectControlPlaceSuggestion(suggestion) {
  state.controlPlaceLookupInProgress = true;
  el.controlBuildButton.disabled = true;
  el.controlBusinessNameInput.readOnly = true;
  el.controlBusinessNameInput.setAttribute("aria-disabled", "true");
  el.controlStep.setAttribute("aria-busy", "true");
  el.controlBusinessNameInput.value = suggestion.mainText || suggestion.text;
  el.controlPlaceIdInput.value = suggestion.placeId;
  hideControlPlacesSuggestions();
  setControlPlacesStatus("Loading business details");
  const sessionToken = state.controlPlacesSessionToken;
  state.controlPlacesSessionToken = "";
  try {
    const query = new URLSearchParams({ place_id: suggestion.placeId, kind: "business" });
    if (sessionToken) query.set("session_token", sessionToken);
    const data = await api(`/api/places/details?${query}`);
    const place = data.place || {};
    state.controlSelectedPlace = place;
    if (place.businessName) el.controlBusinessNameInput.value = place.businessName;
    if (place.website) {
      el.controlWebsiteInput.value = place.website;
      el.controlWebsiteInput.dataset.autoWebsite = normalizeWebsiteInput(place.website);
    } else {
      delete el.controlWebsiteInput.dataset.autoWebsite;
    }
    setControlPlacesStatus("Business selected");
  } catch {
    state.controlSelectedPlace = null;
    setControlPlacesStatus("Business selected. Details will load when you test the agent.");
  } finally {
    state.controlPlaceLookupInProgress = false;
    el.controlBuildButton.disabled = false;
    el.controlBusinessNameInput.readOnly = false;
    el.controlBusinessNameInput.removeAttribute("aria-disabled");
    el.controlStep.removeAttribute("aria-busy");
  }
}

function setupControlPlacesAutocomplete() {
  el.controlBusinessNameInput.addEventListener("input", () => {
    const autoWebsite = normalizeWebsiteInput(el.controlWebsiteInput.dataset.autoWebsite);
    if (autoWebsite && normalizeWebsiteInput(el.controlWebsiteInput.value) === autoWebsite) {
      el.controlWebsiteInput.value = "";
    }
    delete el.controlWebsiteInput.dataset.autoWebsite;
    el.controlPlaceIdInput.value = "";
    state.controlSelectedPlace = null;
    const input = el.controlBusinessNameInput.value.trim();
    clearTimeout(controlPlacesSearchTimer);
    controlPlacesSearchController?.abort();
    if (input.length < 2) {
      hideControlPlacesSuggestions();
      setControlPlacesStatus("");
      return;
    }
    controlPlacesSearchTimer = setTimeout(async () => {
      try {
        controlPlacesSearchController = new AbortController();
        state.controlPlacesSessionToken ||= crypto.randomUUID();
        const query = new URLSearchParams({ input, session_token: state.controlPlacesSessionToken });
        const data = await api(`/api/places/autocomplete?${query}`, { signal: controlPlacesSearchController.signal });
        const suggestions = (data.suggestions || []).filter((suggestion) => suggestion.kind === "business");
        renderControlPlacesSuggestions(suggestions);
        setControlPlacesStatus(suggestions.length ? "Select a matching business or continue typing." : "No matches found. You can enter it manually.");
      } catch (error) {
        if (error.name === "AbortError") return;
        hideControlPlacesSuggestions();
        setControlPlacesStatus("Business lookup unavailable. You can enter it manually.", true);
      }
    }, 220);
  });
  el.controlBusinessNameInput.addEventListener("keydown", (event) => {
    const options = [...el.controlPlacesSuggestions.querySelectorAll('[role="option"]')];
    if (!options.length || el.controlPlacesSuggestions.hidden) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveControlSuggestion(state.controlActiveSuggestionIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveControlSuggestion(state.controlActiveSuggestionIndex - 1);
    } else if (event.key === "Enter" && state.controlActiveSuggestionIndex >= 0) {
      event.preventDefault();
      options[state.controlActiveSuggestionIndex].click();
    } else if (event.key === "Escape") {
      event.preventDefault();
      hideControlPlacesSuggestions();
    }
  });
  el.controlWebsiteInput.addEventListener("input", () => {
    delete el.controlWebsiteInput.dataset.autoWebsite;
    el.controlWebsiteInput.setCustomValidity("");
  });
  el.controlBusinessNameInput.addEventListener("focus", () => {
    if (el.controlPlacesSuggestions.querySelector('[role="option"]')) {
      el.controlPlacesSuggestions.hidden = false;
      el.controlBusinessNameInput.setAttribute("aria-expanded", "true");
    }
  });
  document.addEventListener("click", (event) => {
    if (el.controlPlacesSuggestions.hidden) return;
    if (event.target === el.controlBusinessNameInput || el.controlPlacesSuggestions.contains(event.target)) return;
    hideControlPlacesSuggestions();
  });
}

function entryInputSource() {
  if (state.entryDraft.selectionKind === "address_resolved") return "address_resolved";
  if (state.entryDraft.selectionKind === "business") return "google_business";
  if (urlHasEntryPrefill) return "prefilled";
  return "manual";
}

function entryWebsiteSource() {
  if (state.entryDraft.noWebsite) return "none";
  if (state.entryDraft.websiteSource === "google") return "google";
  if (/\b(facebook\.com|instagram\.com)\b/i.test(state.entryDraft.website || "")) return "social";
  if (state.entryDraft.websiteSource === "prefilled") return "prefilled";
  return state.entryDraft.website ? "entered" : "none";
}

function updateEntryProgress(step) {
  if (!el.wizardProgress) return;
  el.wizardProgress.hidden = step === "control";
  for (const item of el.wizardProgress.querySelectorAll("li[data-stage]")) {
    const stage = item.dataset.stage;
    item.classList.toggle("complete", step === "review" || (stage === "business" && step === "website"));
    if ((stage === "business" && step === "business") || (stage === "website" && ["website", "review"].includes(step))) {
      item.setAttribute("aria-current", "step");
    } else {
      item.removeAttribute("aria-current");
    }
  }
}

function renderEntryStep(step, { focus = false, pushHistory = false, replaceHistory = false, track = true } = {}) {
  const previousStep = state.entryStep;
  state.entryStep = step;
  state.entryDraft.step = step;
  persistEntryDraft();
  for (const section of [el.businessStep, el.websiteStep, el.reviewStep, el.controlStep]) {
    if (section) section.hidden = true;
  }
  const activeSection = step === "website" ? el.websiteStep : step === "review" ? el.reviewStep : step === "control" ? el.controlStep : el.businessStep;
  if (activeSection) activeSection.hidden = false;
  updateEntryProgress(step);

  if (step === "business") {
    el.businessNameInput.value = state.entryDraft.businessName || "";
    el.placeIdInput.value = state.entryDraft.placeId || "";
    const hasSelectedBusiness = Boolean(state.entryDraft.selectedPlace && state.entryDraft.businessName);
    el.selectedBusiness.hidden = !hasSelectedBusiness;
    el.addressResolution.hidden = true;
    el.businessNameInput.closest(".places-autocomplete-field").hidden = hasSelectedBusiness;
    if (hasSelectedBusiness) {
      el.selectedBusinessName.textContent = state.entryDraft.businessName;
      el.selectedBusinessAddress.textContent = state.entryDraft.selectedPlace.address || state.entryDraft.selectedAddress || "Google business profile";
    } else if (state.entryDraft.selectedAddress) {
      const addressBusinesses = Array.isArray(state.entryDraft.addressBusinesses) ? state.entryDraft.addressBusinesses : [];
      el.addressResolutionTitle.textContent = addressBusinesses.length ? "Which business is yours?" : "What is the business name at this address?";
      renderAddressBusinessChoices(addressBusinesses);
      setPlacesStatus(addressBusinesses.length ? "Choose the matching business." : `Address selected: ${state.entryDraft.selectedAddress}`);
    }
  }
  if (step === "website") {
    el.websiteInput.value = state.entryDraft.noWebsite ? "" : state.entryDraft.website || "";
    el.websiteInput.disabled = state.entryDraft.noWebsite;
    el.noWebsiteButton.textContent = state.entryDraft.noWebsite ? "Use a website instead" : "I don’t have a website";
    el.websiteStepHelp.textContent = state.entryDraft.websiteSource === "google" && state.entryDraft.website
      ? "We found this website on the selected Google business profile. You can edit it."
      : "Confirm the website or public social page that belongs to this business.";
    const showServiceArea = shouldAskServiceArea(state.entryDraft);
    el.serviceAreaField.hidden = !showServiceArea;
    el.serviceAreaInput.value = state.entryDraft.serviceArea || "";
    if (track) trackFunnelEvent("fastagent_website_step_viewed", { input_source: entryInputSource() });
  }
  if (step === "review") {
    el.reviewBusiness.textContent = state.entryDraft.businessName || "Not provided";
    el.reviewWebsite.textContent = state.entryDraft.noWebsite ? "No website" : state.entryDraft.website || "Not provided";
  }
  if (step === "control") {
    el.controlBusinessNameInput.value = state.entryDraft.businessName || "";
    el.controlWebsiteInput.value = state.entryDraft.website || "";
    el.controlPlaceIdInput.value = state.entryDraft.placeId || "";
    state.controlSelectedPlace = state.entryDraft.selectedPlace || null;
    if (
      state.controlSelectedPlace?.website &&
      normalizeWebsiteInput(state.entryDraft.website) === normalizeWebsiteInput(state.controlSelectedPlace.website)
    ) {
      el.controlWebsiteInput.dataset.autoWebsite = normalizeWebsiteInput(state.controlSelectedPlace.website);
    } else {
      delete el.controlWebsiteInput.dataset.autoWebsite;
    }
  }

  if (pushHistory) {
    state.entryHistoryDepth += 1;
    history.pushState(
      { ...(history.state || {}), fastAgentStep: step, fastAgentBackStep: previousStep, fastAgentDepth: state.entryHistoryDepth },
      "",
      location.href,
    );
  }
  if (replaceHistory) {
    history.replaceState(
      { ...(history.state || {}), fastAgentStep: step, fastAgentBackStep: null, fastAgentDepth: state.entryHistoryDepth },
      "",
      location.href,
    );
  }
  if (focus) requestAnimationFrame(() => activeSection?.querySelector('h1[tabindex="-1"]')?.focus());
  window.lucide?.createIcons();
}

function showEntryScreen(step = state.entryStep, options = {}) {
  el.loadingScreen.hidden = true;
  el.agentScreen.hidden = true;
  el.errorScreen.hidden = true;
  el.entryScreen.hidden = false;
  renderEntryStep(step, options);
}

function resetSelectedBusiness() {
  const typedWebsite = !websiteWasAutoDiscovered() ? state.entryDraft.website : "";
  const typedWebsiteSource = !websiteWasAutoDiscovered() ? state.entryDraft.websiteSource : "";
  state.entryDraft.businessName = "";
  state.entryDraft.placeId = "";
  state.entryDraft.selectionKind = "";
  state.entryDraft.selectedPlace = null;
  state.entryDraft.selectedAddress = "";
  state.entryDraft.addressPlaceId = "";
  state.entryDraft.addressBusinesses = [];
  state.entryDraft.serviceArea = "";
  state.entryDraft.website = typedWebsite;
  state.entryDraft.websiteSource = typedWebsiteSource;
  state.entryDraft.noWebsite = false;
  el.businessNameInput.value = "";
  el.businessNameInput.placeholder = "Business name or address";
  el.selectedBusiness.hidden = true;
  el.addressResolution.hidden = true;
  el.businessNameInput.closest(".places-autocomplete-field").hidden = false;
  freshPlacesSessionToken();
  persistEntryDraft();
  el.businessNameInput.focus();
}

function completeBusinessStep() {
  if (state.placeLookupInProgress) return;
  if (!state.entryDraft.selectedPlace) chooseManualBusiness(el.businessNameInput.value);
  if (!state.entryDraft.businessName) {
    setPlacesStatus("Enter your business name or choose a match.", true);
    el.businessNameInput.focus();
    return;
  }
  trackFunnelEvent("fastagent_business_confirmed", { input_source: entryInputSource() });
  const nextStep = state.entryDraft.websiteSource === "prefilled" && state.entryDraft.website ? "review" : "website";
  renderEntryStep(nextStep, { focus: true, pushHistory: true });
}

function updateWebsiteDraft() {
  const validation = validBusinessUrl(el.websiteInput.value);
  if (!validation.valid) {
    el.websiteError.textContent = "Enter a complete website or public Facebook or Instagram business page.";
    el.websiteError.hidden = false;
    el.websiteInput.focus();
    return false;
  }
  el.websiteError.hidden = true;
  const discoveredWebsite = validBusinessUrl(state.entryDraft.selectedPlace?.website).value;
  state.entryDraft.website = validation.value;
  state.entryDraft.websiteSource = state.entryDraft.websiteSource === "google" && validation.value === discoveredWebsite
    ? "google"
    : "typed";
  state.entryDraft.noWebsite = false;
  persistEntryDraft();
  return true;
}

function completeWebsiteStep() {
  if (state.entryDraft.noWebsite) {
    if (shouldAskServiceArea(state.entryDraft)) {
      state.entryDraft.serviceArea = el.serviceAreaInput.value.trim();
      if (!state.entryDraft.serviceArea) {
        el.serviceAreaInput.setCustomValidity("Enter the city or service area for this business.");
        el.serviceAreaInput.reportValidity();
        el.serviceAreaInput.focus();
        return false;
      }
      el.serviceAreaInput.setCustomValidity("");
    }
  } else if (!updateWebsiteDraft()) {
    return false;
  }
  trackFunnelEvent("fastagent_website_completed", {
    input_source: entryInputSource(),
    website_source: entryWebsiteSource(),
  });
  persistEntryDraft();
  return true;
}

function validateWizardDraftForBuild() {
  const validation = validateFastAgentDraft(state.entryDraft);
  if (validation.valid) {
    state.entryDraft.businessName = validation.businessName;
    state.entryDraft.website = validation.website;
    persistEntryDraft();
    return true;
  }
  if (validation.step === "business") {
    renderEntryStep("business", { focus: true, pushHistory: true, track: false });
    setPlacesStatus("Enter your business name or choose a match.", true);
    el.businessNameInput.focus();
    return false;
  }
  renderEntryStep("website", { focus: true, pushHistory: true, track: false });
  if (validation.field === "serviceArea") {
    el.serviceAreaInput.setCustomValidity("Enter the city or service area for this business.");
    el.serviceAreaInput.reportValidity();
    el.serviceAreaInput.focus();
  } else {
    el.websiteError.textContent = "Enter a complete website or public Facebook or Instagram business page.";
    el.websiteError.hidden = false;
    el.websiteInput.focus();
  }
  return false;
}

function setupEntryWizard() {
  el.businessContinueButton.addEventListener("click", completeBusinessStep);
  el.changeBusinessButton.addEventListener("click", resetSelectedBusiness);
  el.websiteBackButton.addEventListener("click", () => {
    if (history.state?.fastAgentBackStep) history.back();
    else renderEntryStep("business", { focus: true, replaceHistory: true, track: false });
  });
  el.noWebsiteButton.addEventListener("click", () => {
    state.entryDraft.noWebsite = !state.entryDraft.noWebsite;
    if (!state.entryDraft.noWebsite && !state.entryDraft.website && state.entryDraft.selectedPlace?.website) {
      state.entryDraft.website = normalizeWebsiteInput(state.entryDraft.selectedPlace.website);
      state.entryDraft.websiteSource = "google";
    }
    renderEntryStep("website", { track: false });
    if (shouldAskServiceArea(state.entryDraft)) el.serviceAreaInput.focus();
    else el.buildAgentButton.focus();
  });
  el.websiteInput.addEventListener("input", () => {
    state.entryDraft.noWebsite = false;
    state.entryDraft.website = el.websiteInput.value.trim();
    if (state.entryDraft.websiteSource === "google" && normalizeWebsiteInput(el.websiteInput.value) !== normalizeWebsiteInput(state.entryDraft.selectedPlace?.website)) {
      state.entryDraft.websiteSource = "typed";
    }
    el.websiteError.hidden = true;
    persistEntryDraft();
  });
  el.serviceAreaInput.addEventListener("input", () => {
    state.entryDraft.serviceArea = el.serviceAreaInput.value.trim();
    el.serviceAreaInput.setCustomValidity("");
    persistEntryDraft();
  });
  el.editReviewBusiness.addEventListener("click", () => renderEntryStep("business", { focus: true, pushHistory: true, track: false }));
  el.editReviewWebsite.addEventListener("click", () => renderEntryStep("website", { focus: true, pushHistory: true, track: false }));
  window.addEventListener("popstate", (event) => {
    state.entryHistoryDepth = Math.max(0, Number(event.state?.fastAgentDepth || 0));
    if (state.pendingSessionPath) {
      const sessionPath = state.pendingSessionPath;
      state.pendingSessionPath = "";
      window.location.replace(sessionPath);
      return;
    }
    const step = event.state?.fastAgentStep;
    if (el.entryScreen.hidden || !["business", "website", "review", "control"].includes(step)) return;
    renderEntryStep(step, { focus: true, track: false });
  });
}

function renderCallers(phones = []) {
  el.callerPhones.innerHTML = "";
  for (const phone of phones) {
    const chip = document.createElement("span");
    chip.textContent = phone;
    el.callerPhones.appendChild(chip);
  }
}

function editableProfileValue(value) {
  const text = String(value || "").trim();
  return text.toLowerCase() === "unknown" ? "" : text;
}

function setProfileLanguage(value) {
  const language = String(value || "English").trim() || "English";
  if (![...el.profileLanguage.options].some((option) => option.value === language)) {
    el.profileLanguage.appendChild(new Option(language, language));
  }
  el.profileLanguage.value = language;
}

function setProfileVoice(value) {
  const voiceName = String(value || "Puck").trim() || "Puck";
  if (![...el.profileVoiceName.options].some((option) => option.value === voiceName)) {
    el.profileVoiceName.appendChild(new Option(voiceName, voiceName));
  }
  el.profileVoiceName.value = voiceName;
}

const fastCalendarProviderHelp = {
  internal: "Book directly in RingPort's built-in calendar.",
  vagaro: "Add the public Vagaro business link below to import services and send customers to book.",
  google_calendar: "Connect Google Calendar after account setup. RingPort calendar stays active for this demo.",
  calendly: "Connect Calendly after account setup. RingPort calendar stays active for this demo.",
  custom: "Send customers a tracked link to your existing booking page.",
};

function setProfileCalendarProvider(value) {
  const requested = String(value || "internal").trim().toLowerCase();
  const provider = [...el.profileCalendarProvider.options].some((option) => option.value === requested)
    ? requested
    : "internal";
  el.profileCalendarProvider.value = provider;
  el.profileCalendarHelp.textContent = fastCalendarProviderHelp[provider];
  const usesVagaro = provider === "vagaro";
  const usesCustomBooking = provider === "custom";
  el.profileVagaroField.hidden = !usesVagaro;
  el.profileVagaroUrl.required = usesVagaro;
  el.profileCustomBookingField.hidden = !usesCustomBooking;
  el.profileCustomBookingUrl.required = usesCustomBooking;
  return provider;
}

function profilePayload() {
  const calendarProvider = setProfileCalendarProvider(el.profileCalendarProvider.value);
  return {
    accessToken: state.accessToken,
    businessName: el.profileBusinessName.value,
    website: el.profileWebsite.value,
    summary: el.profileSummary.value,
    phone: el.profilePhone.value,
    address: el.profileAddress.value,
    hours: el.profileHours.value,
    serviceArea: el.profileArea.value,
    services: el.profileServices.value,
    language: el.profileLanguage.value,
    voiceName: el.profileVoiceName.value,
    calendarProvider,
    vagaroBusinessUrl: calendarProvider === "vagaro" ? el.profileVagaroUrl.value : "",
    customBookingUrl: calendarProvider === "custom" ? el.profileCustomBookingUrl.value : "",
    customBookingLabel: "Book online",
  };
}

function numberLabel(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, Number(value || 0)));
}

function estimatedMonthlyAiMinutes(plan) {
  const creditsPerMinute = Math.max(0, Number(state.aiCallMinuteCredits || 0));
  if (!creditsPerMinute) return null;
  return Math.floor(Math.max(0, Number(plan?.monthlyCredits || 0)) / creditsPerMinute);
}

function fastPlanFeatures(plan) {
  return [
    `${plan.maxPhoneNumbers || 1} phone number${Number(plan.maxPhoneNumbers || 1) === 1 ? "" : "s"}`,
    plan.outboundQualificationEnabled ? "Outbound lead calling" : null,
    plan.smartReviewsEnabled ? "Review links and recovery" : null,
    plan.callTransfersEnabled ? "Call transfers" : null,
    plan.appointmentRemindersEnabled ? "Appointment reminders" : null,
    plan.prioritySupport ? "Priority support" : null,
  ].filter(Boolean);
}

function selectPaidPlan(planId) {
  const nextPlan = (state.subscriptionPlans || []).find((plan) => Number(plan.id) === Number(planId));
  state.selectedPlanId = nextPlan && !planWaitlistedForCurrent(nextPlan) ? Number(nextPlan.id) : null;
  for (const card of el.paidPlanList.querySelectorAll(".fast-plan-option")) {
    const active = Number(card.dataset.planId) === state.selectedPlanId;
    card.classList.toggle("active", active);
    card.setAttribute("aria-pressed", active ? "true" : "false");
  }
  el.paidCheckoutButton.disabled = !canCheckoutSelectedPlan();
}

function normalizePlanLookup(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function planMatchesParam(plan, value) {
  const lookup = normalizePlanLookup(value);
  if (!lookup) return false;
  return [plan.id, plan.slug, plan.name].some((candidate) => normalizePlanLookup(candidate) === lookup);
}

function planHasReservedSlot(plan) {
  return Number(state.profile?.subscriptionPlanId || 0) === Number(plan?.id || 0);
}

function planWaitlistedForCurrent(plan) {
  return Boolean((plan?.signupUnavailable || plan?.signupWaitlist) && !planHasReservedSlot(plan));
}

function selectedPaidPlan() {
  return (state.subscriptionPlans || []).find((plan) => Number(plan.id) === Number(state.selectedPlanId)) || null;
}

function canCheckoutSelectedPlan() {
  const plan = selectedPaidPlan();
  return Boolean(plan && !planWaitlistedForCurrent(plan));
}

function renderPaidPlans() {
  if (!el.paidPlanSection || !el.paidPlanList) return;
  const plans = state.subscriptionPlans || [];
  el.paidPlanList.innerHTML = "";
  el.paidPlanSection.hidden = !state.billingReady || !plans.length;
  if (el.paidPlanSection.hidden) return;
  updateBillingPeriodUi();

  if (!state.selectedPlanId && state.requestedPlan) {
    const requested = plans.find((plan) => planMatchesParam(plan, state.requestedPlan) && !planWaitlistedForCurrent(plan));
    if (requested) state.selectedPlanId = requested.id;
  }

  if (!state.selectedPlanId || !plans.some((plan) => plan.id === state.selectedPlanId && !planWaitlistedForCurrent(plan))) {
    state.selectedPlanId = plans.find((plan) => !planWaitlistedForCurrent(plan))?.id || null;
  }

  for (const plan of plans) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "fast-plan-option";
    if (planWaitlistedForCurrent(plan)) card.classList.add("waitlisted");
    card.disabled = planWaitlistedForCurrent(plan);
    card.dataset.planId = String(plan.id);
    card.innerHTML = [
      '<span class="fast-plan-top"><strong></strong><b></b></span>',
      '<span class="fast-plan-minutes"><strong></strong><span>AI call minutes / month</span></span>',
      '<span class="fast-plan-credits"></span>',
      '<span class="fast-plan-slot"></span>',
      '<small class="fast-plan-features"></small>',
    ].join("");
    const billing = planBillingForCurrentPeriod(plan);
    card.querySelector("strong").textContent = plan.name || "Plan";
    card.querySelector("b").textContent = `${moneyFromCents(billing.priceCents)}${billing.months === 12 ? "/yr" : "/mo"}`;
    const minutes = estimatedMonthlyAiMinutes(plan);
    const minutesRow = card.querySelector(".fast-plan-minutes");
    if (minutes === null) {
      minutesRow.remove();
    } else {
      minutesRow.querySelector("strong").textContent = `About ${numberLabel(minutes)}`;
    }
    card.querySelector(".fast-plan-credits").textContent =
      billing.months === 12
        ? `${numberLabel(billing.credits)} credits included for 12 months`
        : `${numberLabel(plan.monthlyCredits)} credits included monthly`;
    const slot = card.querySelector(".fast-plan-slot");
    if (plan.signupLimit) {
      slot.textContent = planWaitlistedForCurrent(plan)
        ? plan.signupUnavailableReason === "window_ended"
          ? "Limited signup window ended"
          : "All signup spots taken"
        : `${Math.max(0, Number(plan.signupSlotsRemaining ?? 0))} signup slots left${
            plan.signupWindowEndsAt ? ` until ${new Date(plan.signupWindowEndsAt).toLocaleDateString()}` : ""
          }`;
    } else {
      slot.remove();
    }
    card.querySelector(".fast-plan-features").textContent = fastPlanFeatures(plan).join(" • ");
    card.addEventListener("click", () => selectPaidPlan(plan.id));
    el.paidPlanList.appendChild(card);
  }
  selectPaidPlan(state.selectedPlanId);
  window.lucide?.createIcons();
}

async function loadSubscriptionPlans() {
  try {
    const data = await api("/api/onboarding/subscription-plans");
    state.subscriptionPlans = data.plans || [];
    state.annualDiscountPercent = Number(data.billing?.annualPrepayDiscountPercent ?? 25);
    state.aiCallMinuteCredits = Number(data.billing?.aiCallMinuteCredits ?? 20);
    state.trialDays = Number(data.trial?.days || 0);
    state.trialCredits = Number(data.trial?.credits || 0);
    state.billingReady = Boolean(data.stripe?.ready);
    if (el.trialOptionCopy && state.trialDays > 0) {
      const trialMinutes = state.aiCallMinuteCredits > 0 ? Math.floor(state.trialCredits / state.aiCallMinuteCredits) : null;
      el.trialOptionCopy.textContent = `Start a ${state.trialDays}-day free trial${
        trialMinutes !== null ? ` with about ${numberLabel(trialMinutes)} AI call minutes` : ""
      }. No credit card required.`;
    }
  } catch {
    state.subscriptionPlans = [];
    state.billingReady = false;
  }
  renderPaidPlans();
}

function renderProfileFields(profile) {
  state.renderingProfile = true;
  if (el.claimEmail && !el.claimEmail.value.trim() && profile.email) el.claimEmail.value = profile.email;
  el.profileBusinessName.value = profile.businessName || "";
  el.profileWebsite.value = profile.website || "";
  el.agentTitle.textContent = `RingPort for ${profile.businessName || "your business"}`;
  el.agentSummary.textContent = profile.summary || "Your receptionist is ready.";
  el.profileSummary.value = editableProfileValue(profile.summary);
  el.profilePhone.value = editableProfileValue(profile.phone);
  el.profileAddress.value = editableProfileValue(profile.address);
  el.profileHours.value = editableProfileValue(profile.hours);
  el.profileArea.value = editableProfileValue(profile.serviceArea);
  el.profileServices.value = editableProfileValue(profile.services);
  setProfileLanguage(profile.language);
  setProfileVoice(profile.voiceName);
  el.profileVagaroUrl.value = profile.vagaroBusinessUrl || "";
  el.profileCustomBookingUrl.value = profile.customBookingUrl || "";
  setProfileCalendarProvider(
    profile.calendarProviderPreference || (profile.vagaroBusinessUrl ? "vagaro" : profile.activeCalendarProvider),
  );
  state.renderingProfile = false;
  state.profileDirty = false;
  el.profileSaveButton.disabled = false;
  el.profileMessage.textContent = "";
}

async function saveProfile({ silent = false } = {}) {
  if (!state.accessToken || !state.profileDirty) return state.profile;
  if (el.profileCalendarProvider.value === "vagaro" && !el.profileVagaroUrl.value.trim()) {
    el.profileMessage.textContent = "Enter the Vagaro business link";
    el.profileVagaroUrl.focus();
    throw new Error("Enter the Vagaro business link");
  }
  if (el.profileCalendarProvider.value === "custom" && !el.profileCustomBookingUrl.value.trim()) {
    el.profileMessage.textContent = "Enter the customer booking link";
    el.profileCustomBookingUrl.focus();
    throw new Error("Enter the customer booking link");
  }
  el.profileSaveButton.disabled = true;
  if (!silent) el.profileMessage.textContent = "Saving profile";
  try {
    const data = await api("/api/onboarding/fast-agent/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profilePayload()),
    });
    state.profile = data.profile;
    renderProfileFields(data.profile);
    if (!silent) {
      const vagaroCatalogLabel = data.vagaroSync?.catalogType === "classes"
        ? `${data.vagaroSync.classesImported || data.vagaroSync.servicesImported || 0} Vagaro classes synced`
        : `${data.vagaroSync?.servicesImported || 0} Vagaro services synced`;
      el.profileMessage.textContent = data.vagaroSync
        ? `Profile saved · ${vagaroCatalogLabel}${data.vagaroSync.policyEntriesExcluded ? ` · ${data.vagaroSync.policyEntriesExcluded} policy entries excluded` : ""}`
        : data.calendarConnectionRequired
          ? `Profile saved. Connect ${data.calendarConnectionRequired === "google_calendar" ? "Google Calendar" : "Calendly"} after account setup.`
          : data.vagaroDisconnected
            ? "Profile saved · Vagaro disconnected"
            : "Profile saved";
    }
    return data.profile;
  } catch (error) {
    el.profileMessage.textContent = error.message;
    throw error;
  } finally {
    el.profileSaveButton.disabled = false;
    window.lucide?.createIcons();
  }
}

function renderTrialState(profile) {
  const isTrial = profile?.accountStatus === "trial" && profile.trialEndsAt;
  if (isTrial) {
    el.credits.textContent = `${profile.creditBalance || 0} credits`;
    return;
  }
  el.credits.textContent = "Trial starts after email";
}

function renderAgent(data) {
  state.profile = data.profile;
  state.shortUrl = data.shortUrl || state.shortUrl;
  el.copyAgentLinkButton.hidden = !state.shortUrl;
  if (data.profile?.subscriptionPlanId) {
    state.selectedPlanId = Number(data.profile.subscriptionPlanId);
  } else if (data.selectedPlan?.id) {
    state.selectedPlanId = Number(data.selectedPlan.id);
  }
  el.loadingScreen.hidden = true;
  el.entryScreen.hidden = true;
  el.errorScreen.hidden = true;
  el.agentScreen.hidden = false;
  if (state.visualizerFrame === null) drawVisualizer();
  el.agentTitle.textContent = `RingPort for ${data.profile.businessName}`;
  renderProfileFields(data.profile);
  renderTrialState(data.profile);
  el.demoPhone.textContent = data.demoPhoneNumber || "Browser call only";
  if (data.demoPhoneNumber) {
    el.demoPhone.href = `tel:${data.demoPhoneNumber}`;
    el.phoneSection.hidden = false;
  } else {
    el.demoPhone.removeAttribute("href");
    el.callerForm.hidden = true;
  }
  el.phoneLimit.textContent = data.demoCallerLimit ? `Up to ${data.demoCallerLimit} callers` : "";
  renderCallers(data.callerPhones);
  if (state.claimToken) {
    el.continueTitle.textContent = "Finish setting up your agent";
    el.claimIntro.textContent = "Complete account setup, or activate a paid plan now.";
    el.claimEmailField.hidden = true;
    el.trialOption.hidden = true;
    el.claimForm.hidden = true;
    el.finishSetupLink.hidden = false;
    el.finishSetupLink.href = `/set-password/?token=${encodeURIComponent(state.claimToken)}`;
    el.claimMessage.textContent = "Save any edits before finishing setup.";
  } else {
    el.continueTitle.textContent = "Choose how to continue";
    el.claimIntro.textContent = "Activate a plan now, or start with a free trial.";
    el.claimEmailField.hidden = false;
    el.trialOption.hidden = false;
    el.claimForm.hidden = false;
    el.finishSetupLink.hidden = true;
    el.claimMessage.textContent = "";
  }
  if (data.planUnavailable) {
    el.claimMessage.textContent = data.planUnavailable;
  }
  window.lucide?.createIcons();
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function resampleTo16k(samples, inputRate) {
  if (inputRate === 16000) return samples;
  const ratio = inputRate / 16000;
  const output = new Float32Array(Math.floor(samples.length / ratio));
  for (let index = 0; index < output.length; index += 1) {
    const sourceIndex = index * ratio;
    const before = Math.floor(sourceIndex);
    const after = Math.min(before + 1, samples.length - 1);
    const weight = sourceIndex - before;
    output[index] = samples[before] * (1 - weight) + samples[after] * weight;
  }
  return output;
}

function floatToPcm(samples) {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return buffer;
}

function rms(samples, scale = 1) {
  if (!samples.length) return 0;
  let sum = 0;
  for (const sample of samples) sum += (sample / scale) ** 2;
  return Math.min(1, Math.sqrt(sum / samples.length) * 4);
}

async function initOutputAudio() {
  if (!state.outputContext) {
    state.outputContext = new AudioContext({ sampleRate: 24000 });
    state.nextPlayTime = state.outputContext.currentTime;
  }
  if (state.outputContext.state === "suspended") await state.outputContext.resume();
}

function clearAgentAudio() {
  for (const source of state.outputSources) {
    try {
      source.stop();
    } catch {
      // Source may have already ended.
    }
  }
  state.outputSources.clear();
  if (state.outputContext) state.nextPlayTime = state.outputContext.currentTime;
  state.agentSpeakingUntil = 0;
  state.agentLevel = 0;
}

async function playPcmAudio(base64, mimeType) {
  await initOutputAudio();
  const rate = Number(String(mimeType || "").match(/rate=(\d+)/)?.[1] || 24000);
  const samples = new Int16Array(base64ToArrayBuffer(base64));
  if (!samples.length) return;
  state.agentLevel = Math.max(state.agentLevel, rms(samples, 32768));
  const buffer = state.outputContext.createBuffer(1, samples.length, rate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) channel[index] = samples[index] / 32768;
  const source = state.outputContext.createBufferSource();
  source.buffer = buffer;
  source.connect(state.outputContext.destination);
  source.onended = () => state.outputSources.delete(source);
  state.outputSources.add(source);
  state.nextPlayTime = Math.max(state.nextPlayTime, state.outputContext.currentTime + 0.02);
  source.start(state.nextPlayTime);
  state.nextPlayTime += buffer.duration;
  state.agentSpeakingUntil = Date.now() + (state.nextPlayTime - state.outputContext.currentTime) * 1000;
}

async function startMicrophone() {
  if (!window.isSecureContext && !["localhost", "127.0.0.1", "::1"].includes(location.hostname)) {
    throw new Error("Microphone access requires HTTPS.");
  }
  state.micStream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  state.inputContext = new AudioContext();
  state.source = state.inputContext.createMediaStreamSource(state.micStream);
  state.processor = state.inputContext.createScriptProcessor(4096, 1, 1);
  state.silentGain = state.inputContext.createGain();
  state.silentGain.gain.value = 0;
  state.processor.onaudioprocess = (event) => {
    if (!state.canSendMic || state.ws?.readyState !== WebSocket.OPEN) return;
    const samples = event.inputBuffer.getChannelData(0);
    state.micLevel = Math.max(state.micLevel, rms(samples));
    const pcm = floatToPcm(resampleTo16k(samples, state.inputContext.sampleRate));
    state.ws.send(JSON.stringify({ type: "audio", data: arrayBufferToBase64(pcm) }));
  };
  state.source.connect(state.processor);
  state.processor.connect(state.silentGain);
  state.silentGain.connect(state.inputContext.destination);
}

function stopMicrophone() {
  state.processor?.disconnect();
  state.source?.disconnect();
  state.silentGain?.disconnect();
  state.inputContext?.close();
  for (const track of state.micStream?.getTracks() || []) track.stop();
  state.processor = null;
  state.source = null;
  state.silentGain = null;
  state.inputContext = null;
  state.micStream = null;
}

function stopCall(closeSocket = true) {
  if (closeSocket && state.ws) state.ws.close();
  stopMicrophone();
  clearAgentAudio();
  state.outputContext?.close();
  state.outputContext = null;
  state.ws = null;
  state.canSendMic = false;
  el.talkButton.disabled = false;
  el.stopButton.disabled = true;
  el.orb.classList.remove("live");
  setCallStatus("Ready");
}

async function startCall() {
  try {
    el.talkButton.disabled = true;
    el.stopButton.disabled = false;
    el.orb.classList.add("live");
    setCallStatus(state.profileDirty ? "Saving profile" : "Connecting", true);
    await saveProfile({ silent: true });
    setCallStatus("Connecting", true);
    await initOutputAudio();
    await startMicrophone();
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    state.ws = new WebSocket(`${protocol}//${location.host}/live`);
    state.ws.addEventListener("open", () => {
      state.ws.send(JSON.stringify({ type: "start", demoToken: state.accessToken, mobileDeviceId: mobileDeviceIdFromUrl }));
    });
    state.ws.addEventListener("message", async (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "ready") setCallStatus("Agent speaking", true);
      if (message.type === "mic_ready") {
        state.canSendMic = true;
        setCallStatus("Listening", true);
      }
      if (message.type === "transcript") appendTranscript(message.speaker, message.text);
      if (message.type === "interrupted") clearAgentAudio();
      if (message.type === "audio") await playPcmAudio(message.data, message.mimeType);
      if (message.type === "error") {
        appendTranscript("system", message.error);
        stopCall();
      }
      if (message.type === "end_call") stopCall();
      if (message.type === "status" && (message.status === "agent_closed" || message.status === "gemini_closed")) stopCall(false);
    });
    state.ws.addEventListener("close", () => stopCall(false));
    state.ws.addEventListener("error", () => {
      appendTranscript("system", "The live connection could not be opened.");
      stopCall(false);
    });
  } catch (error) {
    appendTranscript("system", error.message);
    stopCall();
  }
}

function drawVisualizer() {
  if (el.agentScreen.hidden) {
    state.visualizerFrame = null;
    return;
  }
  const canvas = el.voiceVisualizer;
  const context = canvas.getContext("2d");
  const size = Math.min(canvas.clientWidth, canvas.clientHeight);
  const ratio = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.max(1, size * ratio);
  canvas.height = Math.max(1, size * ratio);
  context.scale(ratio, ratio);
  context.clearRect(0, 0, size, size);
  const speaking = Date.now() < state.agentSpeakingUntil;
  const target = speaking ? Math.max(0.2, state.agentLevel) : state.micLevel;
  state.visualizerLevel += (target - state.visualizerLevel) * 0.18;
  state.micLevel *= 0.9;
  state.agentLevel *= 0.94;
  const colors = speaking ? ["#f47c59", "#e2aa45", "#776fd2", "#4cab83"] : ["#4cab83", "#72c79d", "#246a55", "#e2aa45"];
  for (let index = 0; index < 36; index += 1) {
    const angle = (Math.PI * 2 * index) / 36 - Math.PI / 2;
    const wave = 0.5 + 0.5 * Math.sin(performance.now() * 0.006 + index * 0.75);
    const inner = size * 0.32;
    const length = 4 + state.visualizerLevel * 18 * wave;
    context.beginPath();
    context.moveTo(size / 2 + Math.cos(angle) * inner, size / 2 + Math.sin(angle) * inner);
    context.lineTo(size / 2 + Math.cos(angle) * (inner + length), size / 2 + Math.sin(angle) * (inner + length));
    context.strokeStyle = colors[index % colors.length];
    context.lineWidth = 3;
    context.lineCap = "round";
    context.stroke();
  }
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    state.visualizerFrame = null;
    return;
  }
  state.visualizerFrame = requestAnimationFrame(drawVisualizer);
}

async function openExistingAgent() {
  const sessionUrl = new URL("/api/onboarding/fast-agent", window.location.origin);
  sessionUrl.searchParams.set("token", state.accessToken);
  if (state.requestedPlan) sessionUrl.searchParams.set("plan", state.requestedPlan);
  const data = await api(`${sessionUrl.pathname}${sessionUrl.search}`);
  renderAgent(data);
  loadSubscriptionPlans();
}

async function buildAgent(payload = fastAgentBuildPayload(state.entryDraft, state.requestedPlan)) {
  if (state.buildInProgress) return;
  state.buildInProgress = true;
  state.lastBuildPayload = payload;
  businessName = payload.businessName;
  website = payload.website;
  placeId = payload.placeId;
  storageKey = fastAgentStorageKey(payload);
  el.entryScreen.hidden = true;
  el.errorScreen.hidden = true;
  el.agentScreen.hidden = true;
  el.loadingScreen.hidden = false;
  el.loadingTitle.textContent = "Building your agent";
  el.loadingMessage.textContent = "Finding business details and preparing your live receptionist.";
  requestAnimationFrame(() => el.loadingTitle.focus());
  void trackFunnelEvent("fastagent_build_started", {
    input_source: entryInputSource(),
    website_source: entryWebsiteSource(),
  });
  try {
    const data = await api("/api/onboarding/fast-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        ...(!urlHasEntryPrefill
          ? {
              fastAgentFlowId: state.flowId,
              fastAgentSourceUrl: state.originalLandingUrl,
              fastAgentReferrer: state.initialReferrer,
            }
          : {}),
        inputSource: entryInputSource(),
        websiteSource: entryWebsiteSource(),
      }),
    });
    state.accessToken = data.accessToken;
    if (storageKey && state.accessToken) localStorage.setItem(storageKey, state.accessToken);
    const sessionPath = fastAgentSessionPath(data.shortUrl, {
      requestedPlan: state.requestedPlan,
      requestedPeriod: state.billingPeriodMonths,
    });
    if (sessionPath) {
      state.sessionPath = sessionPath;
      sessionStorage.setItem(FAST_AGENT_PENDING_SESSION_KEY, sessionPath);
      if (state.entryHistoryDepth > 0) {
        state.pendingSessionPath = sessionPath;
        history.go(-state.entryHistoryDepth);
      } else {
        window.location.replace(sessionPath);
      }
    }
    sessionStorage.removeItem(FAST_AGENT_DRAFT_KEY);
    renderAgent(data);
    loadSubscriptionPlans();
    const customData = {
      content_name: data.profile?.businessName || payload.businessName,
      business_profile_id: data.profile?.id,
      website: data.profile?.website || payload.website || undefined,
      plan: state.requestedPlan || undefined,
      plan_id: data.profile?.subscriptionPlanId || data.selectedPlan?.id || undefined,
      billing_period_months: state.billingPeriodMonths,
      fastagent_variant: state.entryVariant,
      experiment_version: state.experimentVersion,
      fastagent_flow_id: state.flowId,
      input_source: entryInputSource(),
      website_source: entryWebsiteSource(),
    };
    const userData = data.profile?.id ? { externalId: `business:${data.profile.id}` } : {};
    trackAdEvent("fastagent_agent_built", customData, userData);
  } catch (error) {
    void trackFunnelEvent("fastagent_build_failed", {
      input_source: entryInputSource(),
      website_source: entryWebsiteSource(),
      error_code: String(error.message || "build_failed").slice(0, 120),
    });
    showError(error.message);
  } finally {
    state.buildInProgress = false;
  }
}

async function loadEntryExperience() {
  if (urlHasEntryPrefill) return { variant: "wizard", experimentVersion: state.experimentVersion };
  try {
    return await api("/api/onboarding/fast-agent/experience");
  } catch {
    return { variant: "control", experimentVersion: state.experimentVersion };
  }
}

async function hydratePrefilledPlace() {
  if (!state.entryDraft.placeId || state.entryDraft.selectedPlace) return;
  try {
    const data = await api(`/api/places/details?${new URLSearchParams({ place_id: state.entryDraft.placeId, kind: "business" })}`);
    if (data.kind === "business" && data.place?.businessName) {
      applySelectedBusiness(data.place, "business");
      state.entryStep = firstFastAgentStep(state.entryDraft);
      return;
    }
    if (data.kind === "address") {
      const businesses = data.businesses || [];
      state.entryDraft.selectedAddress = data.address?.formattedAddress || state.entryDraft.businessName;
      state.entryDraft.addressPlaceId = data.address?.placeId || state.entryDraft.placeId;
      state.entryDraft.placeId = "";
      state.entryDraft.businessName = "";
      state.entryDraft.selectedPlace = null;
      state.entryDraft.selectionKind = "address";
      state.entryDraft.addressBusinesses = businesses;
      el.placeIdInput.value = "";
      if (businesses.length === 1) {
        applySelectedBusiness(businesses[0], "address_resolved");
        state.entryStep = firstFastAgentStep(state.entryDraft);
      } else {
        state.entryStep = "business";
      }
      persistEntryDraft();
    }
  } catch {
    // The visitor can still confirm or edit the supplied business details manually.
  }
}

async function initialize() {
  const pendingSessionPath = fastAgentSessionPath(sessionStorage.getItem(FAST_AGENT_PENDING_SESSION_KEY));
  if (shortCodeFromPath) {
    sessionStorage.removeItem(FAST_AGENT_PENDING_SESSION_KEY);
  } else if (pendingSessionPath) {
    window.location.replace(pendingSessionPath);
    return;
  }
  await loadAdTracking();
  if (state.accessToken) {
    trackAdEvent("fastagent_page_visit", {
      page_type: "fastagent",
      session_link: true,
      plan: state.requestedPlan || undefined,
      billing_period_months: state.billingPeriodMonths,
    });
    try {
      await openExistingAgent();
      return;
    } catch (error) {
      const explicitSessionLink = Boolean(accessTokenFromUrl || claimToken || shortCodeFromPath);
      if (explicitSessionLink) {
        showError(error.message);
        return;
      }
      if (storageKey) localStorage.removeItem(storageKey);
      state.accessToken = "";
    }
  }

  await hydratePrefilledPlace();
  const experience = await loadEntryExperience();
  state.entryVariant = experience.variant === "control" ? "control" : "wizard";
  state.experimentVersion = experience.experimentVersion || state.experimentVersion;
  trackAdEvent("fastagent_page_visit", {
    page_type: "fastagent",
    fastagent_variant: state.entryVariant,
    experiment_version: state.experimentVersion,
    fastagent_flow_id: state.flowId,
    plan: state.requestedPlan || undefined,
    billing_period_months: state.billingPeriodMonths,
  });
  if (!urlHasEntryPrefill) trackFunnelEvent("fastagent_experiment_exposed", { rollout_percent: experience.percentage });
  const initialStep = state.entryVariant === "control" && !urlHasEntryPrefill ? "control" : state.entryStep;
  showEntryScreen(initialStep, { focus: true, replaceHistory: true, track: true });
}

el.fastEntryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.entryStep === "business") {
    completeBusinessStep();
    return;
  }
  if (state.entryStep === "control") {
    if (state.controlPlaceLookupInProgress) return;
    const controlName = el.controlBusinessNameInput.value.trim();
    if (!controlName) {
      el.controlBusinessNameInput.setCustomValidity("Enter your business name.");
      el.controlBusinessNameInput.reportValidity();
      el.controlBusinessNameInput.focus();
      return;
    }
    el.controlBusinessNameInput.setCustomValidity("");
    state.entryDraft.businessName = controlName;
    const enteredWebsite = el.controlWebsiteInput.value.trim();
    const websiteValidation = enteredWebsite ? validBusinessUrl(enteredWebsite) : { valid: true, value: "" };
    if (!websiteValidation.valid) {
      el.controlWebsiteInput.setCustomValidity("Enter a complete website address.");
      el.controlWebsiteInput.reportValidity();
      el.controlWebsiteInput.focus();
      return;
    }
    el.controlWebsiteInput.setCustomValidity("");
    state.entryDraft.placeId = el.controlPlaceIdInput.value.trim();
    state.entryDraft.selectionKind = state.entryDraft.placeId ? "business" : "manual";
    state.entryDraft.selectedPlace = state.controlSelectedPlace || null;
    state.entryDraft.website = websiteValidation.value;
    state.entryDraft.websiteSource = state.entryDraft.website ? "typed" : "";
    state.entryDraft.noWebsite = false;
    persistEntryDraft();
  } else if (state.entryStep === "website") {
    if (!completeWebsiteStep() || !validateWizardDraftForBuild()) return;
  } else if (state.entryStep === "review" && !validateWizardDraftForBuild()) {
    return;
  }
  buildAgent(fastAgentBuildPayload(state.entryDraft, state.requestedPlan, {
    includeWebsiteDecision: state.entryVariant !== "control" || Boolean(state.entryDraft.website),
  }));
});
el.retryBuildButton.addEventListener("click", () => buildAgent(state.lastBuildPayload));
el.backToDetailsButton.addEventListener("click", () => {
  const step = state.entryVariant === "control" ? "control" : state.entryDraft.website || state.entryDraft.noWebsite ? "review" : "website";
  showEntryScreen(step, { focus: true, pushHistory: true, track: false });
});

el.talkButton.addEventListener("click", startCall);
el.stopButton.addEventListener("click", () => stopCall());
el.profileCalendarProvider.addEventListener("change", () => {
  const provider = setProfileCalendarProvider(el.profileCalendarProvider.value);
  if (provider === "vagaro") el.profileVagaroUrl.focus();
  if (provider === "custom") el.profileCustomBookingUrl.focus();
});
function markProfileDirty() {
  if (state.renderingProfile) return;
  state.profileDirty = true;
  el.profileMessage.textContent = "Unsaved changes";
}

el.profileForm.addEventListener("input", markProfileDirty);
el.profileForm.addEventListener("change", markProfileDirty);
el.profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await saveProfile();
  } catch {
    // The message is already shown beside the profile form.
  }
});
el.copyAgentLinkButton.addEventListener("click", async () => {
  if (!state.shortUrl) return;
  const label = el.copyAgentLinkButton.querySelector("span");
  const originalLabel = label.textContent;
  el.copyAgentLinkButton.disabled = true;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(state.shortUrl);
    } else {
      const copyField = document.createElement("textarea");
      copyField.value = state.shortUrl;
      copyField.setAttribute("readonly", "");
      copyField.style.position = "fixed";
      copyField.style.opacity = "0";
      document.body.appendChild(copyField);
      copyField.select();
      const copied = document.execCommand("copy");
      copyField.remove();
      if (!copied) throw new Error("Copy failed");
    }
    label.textContent = "Copied";
    el.copyAgentLinkButton.classList.add("copied");
  } catch {
    label.textContent = "Copy failed";
  } finally {
    window.setTimeout(() => {
      label.textContent = originalLabel;
      el.copyAgentLinkButton.classList.remove("copied");
      el.copyAgentLinkButton.disabled = false;
    }, 1800);
  }
});
el.callerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  el.callerMessage.textContent = "Saving";
  try {
    const data = await api("/api/onboarding/demo-callers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: state.accessToken, phone: el.callerPhone.value }),
    });
    renderCallers(data.callerPhones);
    el.callerPhone.value = "";
    el.callerMessage.textContent = "Caller number allowed";
  } catch (error) {
    el.callerMessage.textContent = error.message;
  }
});
el.claimForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = el.claimForm.querySelector("button");
  button.disabled = true;
  el.claimMessage.textContent = "Sending secure link";
  try {
    await saveProfile({ silent: true });
    const data = await api("/api/onboarding/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: state.accessToken, email: el.claimEmail.value }),
    });
    if (data.profile) {
      state.profile = data.profile;
      renderTrialState(data.profile);
    }
    if (data.trial?.started) {
      trackAdEvent(
        "trial_started",
        data.trackingCustomData || {
          content_name: data.profile?.businessName || state.profile?.businessName || businessName,
          business_profile_id: data.profile?.id || state.profile?.id,
          website: data.profile?.website || state.profile?.website || website || undefined,
          plan: state.requestedPlan || undefined,
          plan_id: data.profile?.subscriptionPlanId || state.profile?.subscriptionPlanId || undefined,
          billing_period_months: state.billingPeriodMonths,
          trial_credits: data.profile?.creditBalance || state.profile?.creditBalance,
          value: 0,
          currency: "USD",
        },
        {
          email: el.claimEmail.value,
          ...(data.profile?.id || state.profile?.id ? { externalId: `business:${data.profile?.id || state.profile?.id}` } : {}),
        },
      );
    }
    el.claimMessage.textContent = data.message;
    if (data.setupUrl) {
      const link = document.createElement("a");
      link.href = data.setupUrl;
      link.textContent = "Open local setup link";
      el.claimMessage.append(" ", link);
    }
  } catch (error) {
    el.claimMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

el.paidCheckoutButton.addEventListener("click", async () => {
  el.paidCheckoutButton.disabled = true;
  el.claimMessage.textContent = "Opening secure checkout";
  try {
    await saveProfile({ silent: true });
    const email = state.claimToken ? "" : el.claimEmail.value.trim();
    if (!state.claimToken && !el.claimEmail.checkValidity()) {
      el.claimEmail.reportValidity();
      el.claimEmail.focus();
      throw new Error(email ? "Enter a valid email before checkout." : "Enter your email before checkout.");
    }
    const data = await api("/api/onboarding/fast-agent/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: state.accessToken,
        claimToken: state.claimToken,
        email,
        subscriptionPlanId: state.selectedPlanId,
        period: state.billingPeriodMonths,
      }),
    });
    location.assign(data.url);
  } catch (error) {
    el.claimMessage.textContent = error.message;
    el.paidCheckoutButton.disabled = !canCheckoutSelectedPlan();
  }
});

el.billingPeriodToggle?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-period]");
  if (!button) return;
  state.billingPeriodMonths = normalizeBillingPeriodInput(button.dataset.period);
  renderPaidPlans();
});

el.finishSetupLink.addEventListener("click", async (event) => {
  if (!state.profileDirty) return;
  event.preventDefault();
  el.claimMessage.textContent = "Saving profile";
  try {
    await saveProfile({ silent: true });
    location.assign(el.finishSetupLink.href);
  } catch (error) {
    el.claimMessage.textContent = error.message;
  }
});

window.lucide?.createIcons();
setupPlacesAutocomplete();
setupControlPlacesAutocomplete();
setupEntryWizard();
initialize();
