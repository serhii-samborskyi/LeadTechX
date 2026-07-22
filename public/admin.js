const el = {
  auth: document.querySelector("#adminAuth"),
  app: document.querySelector("#adminApp"),
  loginForm: document.querySelector("#adminLoginForm"),
  email: document.querySelector("#adminEmail"),
  password: document.querySelector("#adminPassword"),
  loginError: document.querySelector("#adminLoginError"),
  logout: document.querySelector("#adminLogout"),
  tabs: document.querySelectorAll("[data-admin-tab]"),
  views: document.querySelectorAll("[data-admin-view]"),
  systemTabs: document.querySelectorAll("[data-system-tab]"),
  systemPanels: document.querySelectorAll("[data-system-panel]"),
  systemForm: document.querySelector("#systemForm"),
  systemStatus: document.querySelector("#systemStatus"),
  researchModel: document.querySelector("#systemResearchModel"),
  liveModel: document.querySelector("#systemLiveModel"),
  platformBusinessRules: document.querySelector("#platformBusinessRules"),
  geminiApiKey: document.querySelector("#geminiApiKey"),
  placesApiKey: document.querySelector("#placesApiKey"),
  telnyxApiKey: document.querySelector("#telnyxApiKey"),
  telnyxPublicKey: document.querySelector("#telnyxPublicKey"),
  telnyxConnectionId: document.querySelector("#telnyxConnectionId"),
  publicBaseUrl: document.querySelector("#publicBaseUrl"),
  trialDays: document.querySelector("#trialDays"),
  claimLinkDays: document.querySelector("#claimLinkDays"),
  trialCredits: document.querySelector("#trialCredits"),
  tokenUsd: document.querySelector("#tokenUsd"),
  lowBalanceTokens: document.querySelector("#lowBalanceTokens"),
  voiceMinuteCredits: document.querySelector("#voiceMinuteCredits"),
  geminiMinuteCredits: document.querySelector("#geminiMinuteCredits"),
  outboundCallCredits: document.querySelector("#outboundCallCredits"),
  messageCredits: document.querySelector("#messageCredits"),
  stripeSecretKey: document.querySelector("#stripeSecretKey"),
  stripeWebhookSecret: document.querySelector("#stripeWebhookSecret"),
  stripeCreditPackCredits: document.querySelector("#stripeCreditPackCredits"),
  stripeWebhookUrl: document.querySelector("#stripeWebhookUrl"),
  copyStripeWebhookUrl: document.querySelector("#copyStripeWebhookUrl"),
  blueBubblesWebhookUrl: document.querySelector("#blueBubblesWebhookUrl"),
  copyBlueBubblesWebhookUrl: document.querySelector("#copyBlueBubblesWebhookUrl"),
  planForm: document.querySelector("#planForm"),
  planId: document.querySelector("#planId"),
  planName: document.querySelector("#planName"),
  planSlug: document.querySelector("#planSlug"),
  planMonthlyPrice: document.querySelector("#planMonthlyPrice"),
  planMonthlyCredits: document.querySelector("#planMonthlyCredits"),
  planMaxPhoneNumbers: document.querySelector("#planMaxPhoneNumbers"),
  planMaxTransferTargets: document.querySelector("#planMaxTransferTargets"),
  planMaxUsers: document.querySelector("#planMaxUsers"),
  planSupportLevel: document.querySelector("#planSupportLevel"),
  planStripePriceId: document.querySelector("#planStripePriceId"),
  planSortOrder: document.querySelector("#planSortOrder"),
  planDescription: document.querySelector("#planDescription"),
  planOutboundQualificationEnabled: document.querySelector("#planOutboundQualificationEnabled"),
  planSmartReviewsEnabled: document.querySelector("#planSmartReviewsEnabled"),
  planCallTransfersEnabled: document.querySelector("#planCallTransfersEnabled"),
  planLeadWebhookEnabled: document.querySelector("#planLeadWebhookEnabled"),
  planMessageInboxEnabled: document.querySelector("#planMessageInboxEnabled"),
  planAppointmentRemindersEnabled: document.querySelector("#planAppointmentRemindersEnabled"),
  planPrioritySupport: document.querySelector("#planPrioritySupport"),
  planAllowCreditTopups: document.querySelector("#planAllowCreditTopups"),
  planActive: document.querySelector("#planActive"),
  resetPlanButton: document.querySelector("#resetPlanButton"),
  planMessage: document.querySelector("#planMessage"),
  planList: document.querySelector("#planList"),
  recordingRetentionDays: document.querySelector("#recordingRetentionDays"),
  demoNumberCapacity: document.querySelector("#demoNumberCapacity"),
  demoCallerLimit: document.querySelector("#demoCallerLimit"),
  smtpHost: document.querySelector("#smtpHost"),
  smtpPort: document.querySelector("#smtpPort"),
  smtpSecure: document.querySelector("#smtpSecure"),
  smtpUsername: document.querySelector("#smtpUsername"),
  smtpPassword: document.querySelector("#smtpPassword"),
  smtpFromEmail: document.querySelector("#smtpFromEmail"),
  smtpFromName: document.querySelector("#smtpFromName"),
  emailTestRecipient: document.querySelector("#emailTestRecipient"),
  checkSmtpConnection: document.querySelector("#checkSmtpConnection"),
  sendTestEmail: document.querySelector("#sendTestEmail"),
  emailDiagnostics: document.querySelector("#emailDiagnostics"),
  createAccountForm: document.querySelector("#createAccountForm"),
  createAccountButton: document.querySelector("#createAccountButton"),
  accountMessage: document.querySelector("#accountMessage"),
  accountList: document.querySelector("#accountList"),
  businessList: document.querySelector("#businessList"),
  numberSearchForm: document.querySelector("#numberSearchForm"),
  numberCountry: document.querySelector("#numberCountry"),
  numberAreaCode: document.querySelector("#numberAreaCode"),
  numberLocality: document.querySelector("#numberLocality"),
  numberError: document.querySelector("#numberError"),
  numberResults: document.querySelector("#numberResults"),
  ownedNumbers: document.querySelector("#ownedNumbers"),
  syncNumbers: document.querySelector("#syncNumbers"),
  refreshCalls: document.querySelector("#refreshCalls"),
  callLogList: document.querySelector("#callLogList"),
  refreshAdminHealth: document.querySelector("#refreshAdminHealth"),
  adminHealthList: document.querySelector("#adminHealthList"),
  onboardingForm: document.querySelector("#onboardingForm"),
  onboardingStatus: document.querySelector("#onboardingStatus"),
  onboardingLookupUrl: document.querySelector("#onboardingLookupUrl"),
  onboardingVoiceName: document.querySelector("#onboardingVoiceName"),
  onboardingInstructions: document.querySelector("#onboardingInstructions"),
  onboardingRecordCalls: document.querySelector("#onboardingRecordCalls"),
  onboardingTranscription: document.querySelector("#onboardingTranscription"),
  messagePrimaryProvider: document.querySelector("#messagePrimaryProvider"),
  messageFailoverProvider: document.querySelector("#messageFailoverProvider"),
  blueBubblesBaseUrl: document.querySelector("#blueBubblesBaseUrl"),
  blueBubblesSendPath: document.querySelector("#blueBubblesSendPath"),
  blueBubblesPassword: document.querySelector("#blueBubblesPassword"),
  blueBubblesTestPhone: document.querySelector("#blueBubblesTestPhone"),
  blueBubblesTestMessage: document.querySelector("#blueBubblesTestMessage"),
  sendBlueBubblesTest: document.querySelector("#sendBlueBubblesTest"),
  refreshBlueBubblesReplies: document.querySelector("#refreshBlueBubblesReplies"),
  blueBubblesDiagnostics: document.querySelector("#blueBubblesDiagnostics"),
  blueBubblesReplies: document.querySelector("#blueBubblesReplies"),
  sentDmApiKey: document.querySelector("#sentDmApiKey"),
  sentDmTemplateId: document.querySelector("#sentDmTemplateId"),
  sentDmTemplateName: document.querySelector("#sentDmTemplateName"),
  sentDmProfileId: document.querySelector("#sentDmProfileId"),
  checkSentDm: document.querySelector("#checkSentDm"),
  sentDmDiagnostics: document.querySelector("#sentDmDiagnostics"),
  refreshOnboarding: document.querySelector("#refreshOnboarding"),
  onboardingList: document.querySelector("#onboardingList"),
};

let businesses = [];
let subscriptionPlans = [];
let savedBlueBubblesWebhookPassword = "";

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function secretState(id, state) {
  const node = document.querySelector(`#${id}State`);
  node.textContent = state.configured
    ? `Configured from ${state.source}${state.hint ? `, ending in ${state.hint}` : ""}`
    : "Not configured";
  node.className = state.configured ? "configured" : "missing";
}

async function loadSystem() {
  const [data] = await Promise.all([api("/api/admin/settings"), loadPlans()]);
  el.researchModel.value = data.settings.researchModel;
  el.liveModel.value = data.settings.liveModel;
  el.platformBusinessRules.value = data.settings.platformBusinessRules || "";
  el.publicBaseUrl.value = data.publicBaseUrl;
  setSavedBlueBubblesWebhookPassword(data.webhooks?.blueBubblesReplies || "");
  for (const key of [
    "trialDays",
    "claimLinkDays",
    "trialCredits",
    "tokenUsd",
    "lowBalanceTokens",
    "voiceMinuteCredits",
    "geminiMinuteCredits",
    "outboundCallCredits",
    "messageCredits",
    "stripeCreditPackCredits",
    "recordingRetentionDays",
    "demoNumberCapacity",
    "demoCallerLimit",
    "smtpHost",
    "smtpPort",
    "smtpFromEmail",
    "smtpFromName",
    "messagePrimaryProvider",
    "messageFailoverProvider",
    "blueBubblesBaseUrl",
    "blueBubblesSendPath",
    "sentDmTemplateId",
    "sentDmTemplateName",
    "sentDmProfileId",
  ]) {
    el[key].value = data.settings[key] ?? "";
  }
  el.smtpSecure.checked = Boolean(data.settings.smtpSecure);
  secretState("geminiApiKey", data.secrets.geminiApiKey);
  secretState("placesApiKey", data.secrets.placesApiKey);
  secretState("telnyxApiKey", data.secrets.telnyxApiKey);
  secretState("telnyxPublicKey", data.secrets.telnyxPublicKey);
  secretState("telnyxConnectionId", data.secrets.telnyxConnectionId);
  secretState("smtpUsername", data.secrets.smtpUsername);
  secretState("smtpPassword", data.secrets.smtpPassword);
  secretState("stripeSecretKey", data.secrets.stripeSecretKey);
  secretState("stripeWebhookSecret", data.secrets.stripeWebhookSecret);
  secretState("blueBubblesPassword", data.secrets.blueBubblesPassword);
  secretState("sentDmApiKey", data.secrets.sentDmApiKey);
  if (!el.emailTestRecipient.value && el.smtpFromEmail.value) el.emailTestRecipient.value = el.smtpFromEmail.value;
  if (data.secrets.sentDmApiKey.configured) {
    loadSentDmDiagnostics().catch((error) => {
      el.sentDmDiagnostics.textContent = error.message;
    });
  } else {
    el.sentDmDiagnostics.textContent = "Sent.dm API key is not configured.";
  }
  loadBlueBubblesReplies().catch((error) => {
    el.blueBubblesReplies.textContent = error.message;
  });
  refreshSystemWebhookUrls();
}

function stripeWebhookEndpoint(baseUrl = el.publicBaseUrl.value) {
  const cleanBaseUrl = String(baseUrl || "").trim().replace(/\/+$/, "");
  return cleanBaseUrl ? `${cleanBaseUrl}/webhooks/stripe` : "";
}

function setSavedBlueBubblesWebhookPassword(webhookUrl) {
  savedBlueBubblesWebhookPassword = "";
  try {
    savedBlueBubblesWebhookPassword = new URL(String(webhookUrl || "")).searchParams.get("password") || "";
  } catch {
    savedBlueBubblesWebhookPassword = "";
  }
}

function blueBubblesWebhookEndpoint(baseUrl = el.publicBaseUrl.value) {
  const cleanBaseUrl = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!cleanBaseUrl) return "";
  const password = el.blueBubblesPassword.value.trim() || savedBlueBubblesWebhookPassword;
  return `${cleanBaseUrl}/webhooks/bluebubbles${password ? `?password=${encodeURIComponent(password)}` : ""}`;
}

function refreshStripeWebhookUrl() {
  const webhookUrl = stripeWebhookEndpoint();
  el.stripeWebhookUrl.value = webhookUrl;
  el.copyStripeWebhookUrl.disabled = !webhookUrl;
}

function refreshBlueBubblesWebhookUrl() {
  const hasPassword = Boolean(el.blueBubblesPassword.value.trim() || savedBlueBubblesWebhookPassword);
  const webhookUrl = hasPassword ? blueBubblesWebhookEndpoint() : "";
  el.blueBubblesWebhookUrl.value = webhookUrl;
  el.copyBlueBubblesWebhookUrl.disabled = !webhookUrl;
}

function refreshSystemWebhookUrls() {
  refreshStripeWebhookUrl();
  refreshBlueBubblesWebhookUrl();
}

async function copyWebhookUrl(input, button, emptyMessage) {
  const webhookUrl = input.value.trim();
  if (!webhookUrl) {
    el.systemStatus.textContent = emptyMessage;
    return;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(webhookUrl);
  } else {
    input.select();
    document.execCommand("copy");
    input.setSelectionRange(0, 0);
  }
  const original = button.innerHTML;
  button.innerHTML = `<i data-lucide="check"></i> Copied`;
  window.lucide?.createIcons();
  setTimeout(() => {
    button.innerHTML = original;
    window.lucide?.createIcons();
  }, 1400);
}

async function copyStripeWebhookUrl() {
  await copyWebhookUrl(el.stripeWebhookUrl, el.copyStripeWebhookUrl, "Set Public base URL first.");
}

async function copyBlueBubblesWebhookUrl() {
  await copyWebhookUrl(el.blueBubblesWebhookUrl, el.copyBlueBubblesWebhookUrl, "Set Public base URL first.");
}

function blueBubblesDiagnosticPayload() {
  return {
    blueBubblesBaseUrl: el.blueBubblesBaseUrl.value,
    blueBubblesSendPath: el.blueBubblesSendPath.value,
    blueBubblesPassword: el.blueBubblesPassword.value,
    toPhone: el.blueBubblesTestPhone.value,
    message: el.blueBubblesTestMessage.value,
  };
}

function renderBlueBubblesDiagnostic(data) {
  el.blueBubblesDiagnostics.innerHTML = "";
  const summary = document.createElement("p");
  summary.className = data.ok ? "form-message success" : "form-message error";
  summary.textContent = data.message || (data.ok ? "BlueBubbles diagnostic passed." : "BlueBubbles diagnostic failed.");
  el.blueBubblesDiagnostics.appendChild(summary);
  const details = [];
  if (data.toPhone) details.push(`To: ${data.toPhone}`);
  if (data.blueBubblesAttempt) details.push(`Send mode: ${data.blueBubblesAttempt}`);
  if (data.providerMessageId) details.push(`Message ID: ${data.providerMessageId}`);
  if (data.httpStatus) details.push(`HTTP: ${data.httpStatus}`);
  for (const detail of details) {
    const row = document.createElement("p");
    row.textContent = detail;
    el.blueBubblesDiagnostics.appendChild(row);
  }
}

async function sendBlueBubblesTestMessage() {
  const original = el.sendBlueBubblesTest.innerHTML;
  el.sendBlueBubblesTest.disabled = true;
  el.sendBlueBubblesTest.textContent = "Sending...";
  el.blueBubblesDiagnostics.textContent = "Sending BlueBubbles test message...";
  try {
    const data = await api("/api/admin/bluebubbles/send-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blueBubblesDiagnosticPayload()),
    });
    renderBlueBubblesDiagnostic(data);
  } catch (error) {
    renderBlueBubblesDiagnostic({ ok: false, message: error.message });
  } finally {
    el.sendBlueBubblesTest.disabled = false;
    el.sendBlueBubblesTest.innerHTML = original;
    window.lucide?.createIcons();
  }
}

function renderBlueBubblesReplies(replies = []) {
  el.blueBubblesReplies.innerHTML = "";
  if (!replies.length) {
    el.blueBubblesReplies.textContent = "No BlueBubbles replies received yet.";
    return;
  }
  for (const reply of replies) {
    const row = document.createElement("div");
    row.className = "inbound-reply-row";
    const title = document.createElement("strong");
    title.textContent = `${reply.fromPhone || "Unknown sender"}${reply.businessProfile?.businessName ? ` · ${reply.businessProfile.businessName}` : ""}`;
    const body = document.createElement("p");
    body.textContent = reply.text || "(no text)";
    const meta = document.createElement("small");
    meta.textContent = [
      reply.status,
      reply.purpose,
      reply.createdAt ? new Date(reply.createdAt).toLocaleString() : "",
      reply.chatGuid,
    ].filter(Boolean).join(" · ");
    row.append(title, body, meta);
    el.blueBubblesReplies.appendChild(row);
  }
}

async function loadBlueBubblesReplies() {
  el.blueBubblesReplies.textContent = "Loading replies...";
  const data = await api("/api/admin/bluebubbles/replies?limit=10");
  renderBlueBubblesReplies(data.replies || []);
}

function planPriceDisplay(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(cents || 0) / 100);
}

function resetPlanForm() {
  el.planId.value = "";
  el.planName.value = "";
  el.planSlug.value = "";
  el.planMonthlyPrice.value = "";
  el.planMonthlyCredits.value = "";
  el.planMaxPhoneNumbers.value = "1";
  el.planMaxTransferTargets.value = "1";
  el.planMaxUsers.value = "1";
  el.planSupportLevel.value = "standard";
  el.planStripePriceId.value = "";
  el.planSortOrder.value = "0";
  el.planDescription.value = "";
  el.planOutboundQualificationEnabled.checked = false;
  el.planSmartReviewsEnabled.checked = false;
  el.planCallTransfersEnabled.checked = false;
  el.planLeadWebhookEnabled.checked = true;
  el.planMessageInboxEnabled.checked = true;
  el.planAppointmentRemindersEnabled.checked = false;
  el.planPrioritySupport.checked = false;
  el.planAllowCreditTopups.checked = true;
  el.planActive.checked = true;
  el.planMessage.textContent = "";
}

function fillPlanForm(plan) {
  el.planId.value = plan.id;
  el.planName.value = plan.name || "";
  el.planSlug.value = plan.slug || "";
  el.planMonthlyPrice.value = ((Number(plan.monthlyPriceCents || 0) / 100).toFixed(2));
  el.planMonthlyCredits.value = plan.monthlyCredits || 0;
  el.planMaxPhoneNumbers.value = plan.maxPhoneNumbers || 1;
  el.planMaxTransferTargets.value = plan.maxTransferTargets ?? 1;
  el.planMaxUsers.value = plan.maxUsers || 1;
  el.planSupportLevel.value = plan.supportLevel || "standard";
  el.planStripePriceId.value = plan.stripePriceId || "";
  el.planSortOrder.value = plan.sortOrder || 0;
  el.planDescription.value = plan.description || "";
  el.planOutboundQualificationEnabled.checked = Boolean(plan.outboundQualificationEnabled);
  el.planSmartReviewsEnabled.checked = Boolean(plan.smartReviewsEnabled);
  el.planCallTransfersEnabled.checked = Boolean(plan.callTransfersEnabled);
  el.planLeadWebhookEnabled.checked = plan.leadWebhookEnabled !== false;
  el.planMessageInboxEnabled.checked = plan.messageInboxEnabled !== false;
  el.planAppointmentRemindersEnabled.checked = Boolean(plan.appointmentRemindersEnabled);
  el.planPrioritySupport.checked = Boolean(plan.prioritySupport);
  el.planAllowCreditTopups.checked = plan.allowCreditTopups !== false;
  el.planActive.checked = Boolean(plan.active);
  el.planMessage.textContent = `Editing ${plan.name}`;
}

function planPayload() {
  return {
    name: el.planName.value,
    slug: el.planSlug.value,
    description: el.planDescription.value,
    monthlyPriceDollars: el.planMonthlyPrice.value,
    monthlyCredits: Number(el.planMonthlyCredits.value || 0),
    maxPhoneNumbers: Number(el.planMaxPhoneNumbers.value || 1),
    maxTransferTargets: Number(el.planMaxTransferTargets.value || 0),
    maxUsers: Number(el.planMaxUsers.value || 1),
    supportLevel: el.planSupportLevel.value,
    outboundQualificationEnabled: el.planOutboundQualificationEnabled.checked,
    smartReviewsEnabled: el.planSmartReviewsEnabled.checked,
    callTransfersEnabled: el.planCallTransfersEnabled.checked,
    leadWebhookEnabled: el.planLeadWebhookEnabled.checked,
    messageInboxEnabled: el.planMessageInboxEnabled.checked,
    appointmentRemindersEnabled: el.planAppointmentRemindersEnabled.checked,
    prioritySupport: el.planPrioritySupport.checked,
    allowCreditTopups: el.planAllowCreditTopups.checked,
    stripePriceId: el.planStripePriceId.value,
    sortOrder: Number(el.planSortOrder.value || 0),
    active: el.planActive.checked,
  };
}

function planMetric(label, value) {
  const item = document.createElement("div");
  item.className = "plan-metric";
  const title = document.createElement("span");
  title.textContent = label;
  const detail = document.createElement("strong");
  detail.textContent = value;
  item.append(title, detail);
  return item;
}

function planFeatureLabels(plan) {
  return [
    plan.outboundQualificationEnabled ? "Outbound agent" : null,
    plan.smartReviewsEnabled ? "Smart reviews" : null,
    plan.callTransfersEnabled ? "Call transfers" : null,
    plan.leadWebhookEnabled !== false ? "Lead webhook" : null,
    plan.messageInboxEnabled !== false ? "Message inbox" : null,
    plan.appointmentRemindersEnabled ? "Reminders" : null,
    plan.allowCreditTopups !== false ? "Top-ups" : "No top-ups",
    plan.prioritySupport ? "Priority support" : null,
  ].filter(Boolean);
}

function renderPlans(plans = []) {
  subscriptionPlans = plans;
  el.planList.innerHTML = "";
  for (const plan of plans) {
    const row = document.createElement("div");
    row.className = `plan-card ${plan.active ? "active" : "inactive"}`;
    const body = document.createElement("div");
    body.className = "plan-card-body";
    const heading = document.createElement("div");
    heading.className = "plan-card-heading";
    const title = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = plan.name || "Untitled plan";
    const slug = document.createElement("span");
    slug.textContent = plan.slug || "no slug";
    title.append(name, slug);
    const status = document.createElement("span");
    status.className = `status-pill ${plan.active ? "active" : "warning"}`;
    status.textContent = plan.active ? "Active" : "Inactive";
    heading.append(title, status);
    const price = document.createElement("div");
    price.className = "plan-price";
    price.textContent = `${planPriceDisplay(plan.monthlyPriceCents)}/mo`;
    const description = document.createElement("p");
    description.className = "plan-description";
    description.textContent = plan.description || "No description added.";
    const metrics = document.createElement("div");
    metrics.className = "plan-metrics";
    metrics.append(
      planMetric("Monthly credits", `${plan.monthlyCredits || 0}`),
      planMetric("Stripe price", plan.stripePriceId ? "Linked" : "Dynamic"),
      planMetric("Phone numbers", `${plan.maxPhoneNumbers || 1}`),
      planMetric("Transfers", `${plan.maxTransferTargets ?? 0}`),
      planMetric("Users", `${plan.maxUsers || 1}`),
      planMetric("Support", plan.supportLevel || "standard"),
      planMetric("Businesses", `${plan.businessCount ?? 0}`),
      planMetric("Sort order", `${plan.sortOrder ?? 0}`),
    );
    const features = document.createElement("div");
    features.className = "plan-feature-list";
    for (const label of planFeatureLabels(plan)) {
      const pill = document.createElement("span");
      pill.className = "status-pill";
      pill.textContent = label;
      features.appendChild(pill);
    }
    body.append(heading, price, description, metrics, features);
    const actions = document.createElement("div");
    actions.className = "plan-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.innerHTML = `<i data-lucide="pencil"></i> Edit`;
    edit.addEventListener("click", () => fillPlanForm(plan));
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.innerHTML = plan.active ? `<i data-lucide="pause-circle"></i> Deactivate` : `<i data-lucide="play-circle"></i> Activate`;
    toggle.addEventListener("click", async () => {
      await api(`/api/admin/subscription-plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...plan, active: !plan.active }),
      });
      await loadPlans();
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger-button";
    remove.innerHTML = `<i data-lucide="trash-2"></i> Delete`;
    remove.addEventListener("click", async () => {
      await api(`/api/admin/subscription-plans/${plan.id}`, { method: "DELETE" });
      await loadPlans();
      resetPlanForm();
    });
    actions.append(edit, toggle, remove);
    row.append(body, actions);
    el.planList.appendChild(row);
  }
  if (!plans.length) el.planList.textContent = "No subscription plans yet.";
  window.lucide?.createIcons();
}

async function loadPlans() {
  const data = await api("/api/admin/subscription-plans");
  renderPlans(data.plans || []);
  return data;
}

function adminMiniRow(parts) {
  const row = document.createElement("div");
  row.className = "mini-row";
  row.textContent = parts.filter(Boolean).map((part) => hideProviderBrandText(part)).join(" · ");
  return row;
}

function healthCheckDetail(check) {
  return [
    check?.status,
    check?.detail,
    check?.latencyMs !== undefined ? `${check.latencyMs}ms` : null,
    check?.missing?.length ? `missing ${check.missing.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function hideProviderBrandText(value) {
  if (value === null || value === undefined) return value;
  return String(value)
    .replace(/models\/gemini[^\s",}]*/gi, "live voice engine")
    .replace(/Gemini\s+Live/gi, "live voice")
    .replace(/\bgemini\b/gi, "AI provider")
    .replace(/Gemini/gi, "AI provider");
}

function hideProviderBrandKey(key) {
  return String(key || "")
    .replace(/Gemini/g, "LiveAgent")
    .replace(/gemini/g, "liveAgent");
}

function hideProviderBrandPayload(value) {
  if (Array.isArray(value)) return value.map((item) => hideProviderBrandPayload(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        hideProviderBrandKey(key),
        hideProviderBrandPayload(nested),
      ]),
    );
  }
  return typeof value === "string" ? hideProviderBrandText(value) : value;
}

function displayEventType(eventType) {
  return String(eventType || "").replace(/gemini/gi, "live_agent");
}

function displayHealthFlag(flag) {
  return hideProviderBrandKey(flag);
}

function renderAdminHealth(data) {
  el.adminHealthList.innerHTML = "";
  const checks = data.checks || {};
  const readiness = checks.sellableMvp || data.sellableMvp;
  const rows = [
    [
      "Sellable MVP",
      readiness
        ? `${readiness.status} · blockers ${readiness.blockers?.length || 0} · warnings ${readiness.warnings?.length || 0}`
        : "",
    ],
    ["Database", healthCheckDetail(checks.database) || data.db],
    ["AI provider", healthCheckDetail(checks.gemini) || (data.geminiConfigured ? "configured" : "missing")],
    ["Telnyx", healthCheckDetail(checks.telnyx) || (data.telnyxConfigured ? "configured" : "missing")],
    ["Public URL", healthCheckDetail(checks.publicUrl) || data.publicBaseUrl || "missing"],
    ["Telnyx webhook", healthCheckDetail(checks.webhooks?.telnyx)],
    ["BlueBubbles replies", healthCheckDetail(checks.webhooks?.bluebubbles)],
    ["Lead webhook", healthCheckDetail(checks.webhooks?.lead)],
    ["BlueBubbles", healthCheckDetail(checks.messaging?.bluebubbles)],
    ["Sent.dm", healthCheckDetail(checks.messaging?.sentdm)],
    ["Stripe", healthCheckDetail(checks.billing?.stripe)],
    [
      "Recent call issues",
      checks.callIssues
        ? `${checks.callIssues.status} · flagged ${checks.callIssues.counts?.flagged || 0}/${checks.callIssues.counts?.total || 0}`
        : "",
    ],
    [
      "Business profiles",
      checks.businessProfiles
        ? Object.entries(checks.businessProfiles)
            .map(([status, count]) => `${status}: ${count}`)
            .join(", ")
        : "",
    ],
  ];
  for (const [label, value] of rows) {
    if (!value) continue;
    const row = document.createElement("div");
    row.className = "data-row compact-row";
    row.append(adminMiniRow([label, value]));
    el.adminHealthList.appendChild(row);
  }
  for (const item of readiness?.items || []) {
    const row = document.createElement("div");
    row.className = "data-row compact-row";
    row.append(adminMiniRow(["Readiness", item.ok ? "ok" : item.required ? "blocked" : "warning", item.label, item.detail]));
    el.adminHealthList.appendChild(row);
  }
  if (!el.adminHealthList.childElementCount) el.adminHealthList.textContent = "No health data returned.";
}

async function loadAdminHealth() {
  el.adminHealthList.textContent = "Checking health...";
  const data = await api("/api/admin/health");
  renderAdminHealth(data);
}

function setSystemTab(tabName) {
  for (const tab of el.systemTabs) {
    const selected = tab.dataset.systemTab === tabName;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  }
  for (const panel of el.systemPanels) {
    panel.classList.toggle("active", panel.dataset.systemPanel === tabName);
  }
  el.systemForm.hidden = tabName === "plans";
}

async function loadOnboarding() {
  const [settingsData, sessionData] = await Promise.all([api("/api/admin/settings"), api("/api/admin/onboarding")]);
  const settings = settingsData.settings;
  for (const key of [
    "onboardingLookupUrl",
    "onboardingVoiceName",
    "onboardingInstructions",
  ]) {
    el[key].value = settings[key] ?? "";
  }
  el.onboardingRecordCalls.checked = Boolean(settings.onboardingRecordCalls);
  el.onboardingTranscription.checked = Boolean(settings.onboardingTranscription);
  el.onboardingList.innerHTML = "";
  for (const session of sessionData.sessions) {
    const item = document.createElement("details");
    item.className = `call-log ${session.lastError ? "has-error" : ""}`;
    const summary = document.createElement("summary");
    const main = document.createElement("span");
    main.textContent = `${session.callerPhone} · ${session.campaignLabel || "Unlabeled"}`;
    const meta = document.createElement("span");
    meta.textContent = `${session.status} · ${session.businessProfile?.businessName || session.businessName || "Business not identified"} · ${new Date(session.createdAt).toLocaleString()}`;
    summary.append(main, meta);
    const body = document.createElement("div");
    body.className = "onboarding-call-detail";
    const fields = [
      ["Website", session.businessProfile?.website || session.website],
      ["Email", session.email],
      ["Message provider", session.messageProvider],
      ["Persona tested", session.personaSwitchedAt ? new Date(session.personaSwitchedAt).toLocaleString() : null],
      ["Setup link sent", session.claimLinkSentAt ? new Date(session.claimLinkSentAt).toLocaleString() : null],
      ["Recording", session.voiceCall.recordingUrl],
      ["Error", session.lastError],
    ];
    for (const [label, value] of fields) {
      if (!value) continue;
      const row = document.createElement("p");
      row.innerHTML = "<strong></strong><span></span>";
      row.querySelector("strong").textContent = label;
      row.querySelector("span").textContent = hideProviderBrandText(value);
      body.appendChild(row);
    }
    if (session.transcript) {
      const transcript = document.createElement("pre");
      transcript.textContent = session.transcript;
      body.appendChild(transcript);
    }
    item.append(summary, body);
    el.onboardingList.appendChild(item);
  }
  if (!sessionData.sessions.length) el.onboardingList.textContent = "No phone onboarding calls yet.";
}

async function loadAccounts() {
  const [{ users }, businessData] = await Promise.all([api("/api/admin/users"), api("/api/admin/businesses")]);
  businesses = businessData.businesses;
  el.accountList.innerHTML = "";
  for (const user of users) {
    const row = document.createElement("div");
    row.className = "account-row";
    const identity = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = user.businessProfile?.businessName || user.name || "System administrator";
    const email = document.createElement("span");
    email.textContent = `${user.email} · ${user.role}`;
    identity.append(name, email);
    const state = document.createElement("span");
    state.className = `account-state ${user.active ? "active" : "disabled"}`;
    state.textContent = user.active ? "Active" : "Disabled";
    row.append(identity, state);
    if (user.role !== "admin") {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = user.active ? "Disable" : "Enable";
      button.addEventListener("click", async () => {
        await api(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: !user.active }),
        });
        await loadAccounts();
      });
      row.appendChild(button);
    }
    el.accountList.appendChild(row);
  }
  el.businessList.innerHTML = "";
  for (const business of businesses) {
    const row = document.createElement("div");
    row.className = "business-row";
    const heading = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = business.businessName;
    const website = document.createElement("span");
    website.textContent = business.website || "No website";
    heading.append(name, website);
    const access = document.createElement("div");
    access.innerHTML = `<b>Login</b><span></span>`;
    access.querySelector("span").textContent = business.users.length
      ? business.users.map((user) => `${user.email}${user.active ? "" : " (disabled)"}`).join(", ")
      : "No account";
    const phone = document.createElement("div");
    phone.innerHTML = `<b>Phone</b><span></span>`;
    phone.querySelector("span").textContent = business.voiceNumbers.map((number) => number.phoneNumber).join(", ") || "Unassigned";
    const lifecycle = document.createElement("div");
    lifecycle.innerHTML = `<b>Status</b><span></span>`;
    const lifecycleLabel =
      business.accountStatus === "trial" && !business.users.length
        ? "Unclaimed trial"
        : business.accountStatus === "trial"
          ? "Trial account"
          : business.accountStatus;
    lifecycle.querySelector("span").textContent = `${lifecycleLabel} · ${business.creditBalance} credits${
      business.trialEndsAt ? ` · ends ${new Date(business.trialEndsAt).toLocaleDateString()}` : ""
    }`;
    const plan = document.createElement("div");
    plan.innerHTML = `<b>Plan</b><span></span>`;
    plan.querySelector("span").textContent = business.subscriptionPlan
      ? `${business.subscriptionPlan.name} · ${planPriceDisplay(business.subscriptionPlan.monthlyPriceCents)}/mo · ${business.subscriptionPlan.monthlyCredits} credits`
      : business.stripeSubscriptionStatus
        ? `Subscription · ${business.stripeSubscriptionStatus}`
        : "No subscription";
    const agent = document.createElement("div");
    agent.innerHTML = `<b>Agent</b><span></span>`;
    agent.querySelector("span").textContent = business.config
      ? `${business.config.agentName} · ${business.config.language} · ${business.config.voiceName}`
      : "Not configured";
    const content = document.createElement("div");
    content.innerHTML = `<b>Content</b><span></span>`;
    content.querySelector("span").textContent = business.config
      ? `${business.config._count.knowledgeEntries} answers · ${business.config._count.priceEntries} prices · ${business.config._count.intakeFields} intake fields`
      : "No configuration";
    row.append(heading, access, lifecycle, plan, phone, agent, content);
    el.businessList.appendChild(row);
  }
}

function renderSentDmDiagnostics(data) {
  el.sentDmDiagnostics.innerHTML = "";
  const summary = document.createElement("p");
  summary.className = data.configured ? "form-message success" : "form-message error";
  summary.textContent = data.configured
    ? `Template saved${data.saved?.templateFound ? "" : ", but not found in the first 20 templates"}.`
    : data.message || "Save an approved Sent.dm template ID or name before sending.";
  el.sentDmDiagnostics.appendChild(summary);

  if (data.account) {
    const account = document.createElement("p");
    const configuredChannels = Object.entries(data.account.channels || {})
      .filter(([, value]) => value?.configured)
      .map(([name]) => name)
      .join(", ");
    account.textContent = data.account.ok
      ? `Account ${data.account.type || "unknown"} connected${configuredChannels ? `; channels: ${configuredChannels}` : ""}.`
      : `Account check failed: ${data.account.error?.message || data.account.httpStatus}`;
    el.sentDmDiagnostics.appendChild(account);
  }

  if (data.profiles?.items?.length) {
    const profile = document.createElement("p");
    const saved = data.saved?.profileId;
    const selected = data.profiles.items.find((item) => item.id === saved);
    profile.textContent = selected
      ? `Profile: ${selected.name || selected.id} (${selected.status || "unknown"}).`
      : `Profiles available: ${data.profiles.items.length}.`;
    el.sentDmDiagnostics.appendChild(profile);
  }

  const templates = data.templates?.items || [];
  if (!templates.length) {
    const empty = document.createElement("p");
    empty.textContent = data.templates?.error?.message || "No templates returned.";
    el.sentDmDiagnostics.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "sentdm-template-list";
  for (const template of templates) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "sentdm-template-row";
    if (template.status !== "APPROVED") row.classList.add("muted-row");
    row.innerHTML = "<strong></strong><span></span>";
    row.querySelector("strong").textContent = `${template.status || "UNKNOWN"} · ${template.name || template.id}`;
    row.querySelector("span").textContent = `${template.id} · ${(template.channels || []).join(", ") || "no channels"} · vars: ${(template.variables || []).join(", ") || "none"}`;
    row.addEventListener("click", () => {
      el.sentDmTemplateId.value = template.id || "";
      el.sentDmTemplateName.value = template.name || "";
      summary.className = template.status === "APPROVED" ? "form-message success" : "form-message error";
      summary.textContent = `${template.status || "UNKNOWN"} template selected. Save settings before sending.`;
    });
    list.appendChild(row);
  }
  el.sentDmDiagnostics.appendChild(list);
  window.lucide?.createIcons();
}

async function loadSentDmDiagnostics() {
  el.sentDmDiagnostics.textContent = "Checking Sent.dm...";
  const data = await api("/api/admin/sentdm/diagnostics");
  renderSentDmDiagnostics(data);
}

function emailDiagnosticPayload() {
  return {
    smtpHost: el.smtpHost.value,
    smtpPort: Number(el.smtpPort.value),
    smtpSecure: el.smtpSecure.checked,
    smtpUsername: el.smtpUsername.value,
    smtpPassword: el.smtpPassword.value,
    smtpFromEmail: el.smtpFromEmail.value,
    smtpFromName: el.smtpFromName.value,
    toEmail: el.emailTestRecipient.value,
  };
}

function renderEmailDiagnostic(data) {
  el.emailDiagnostics.innerHTML = "";
  const summary = document.createElement("p");
  summary.className = data.ok ? "form-message success" : "form-message error";
  summary.textContent = data.message || (data.ok ? "Email diagnostic passed." : "Email diagnostic failed.");
  el.emailDiagnostics.appendChild(summary);
  const details = [];
  if (data.host) details.push(`Server: ${data.host}:${data.port}${data.secure ? " TLS" : ""}`);
  if (data.authenticated !== undefined) details.push(`Auth: ${data.authenticated ? "enabled" : "not used"}`);
  if (data.toEmail) details.push(`Recipient: ${data.toEmail}`);
  if (data.messageId) details.push(`Message ID: ${data.messageId}`);
  if (Array.isArray(data.accepted) && data.accepted.length) details.push(`Accepted: ${data.accepted.join(", ")}`);
  if (Array.isArray(data.rejected) && data.rejected.length) details.push(`Rejected: ${data.rejected.join(", ")}`);
  for (const detail of details) {
    const row = document.createElement("p");
    row.textContent = detail;
    el.emailDiagnostics.appendChild(row);
  }
}

async function runEmailDiagnostic(kind) {
  const isSend = kind === "send";
  const button = isSend ? el.sendTestEmail : el.checkSmtpConnection;
  const otherButton = isSend ? el.checkSmtpConnection : el.sendTestEmail;
  const original = button.innerHTML;
  button.disabled = true;
  otherButton.disabled = true;
  button.textContent = isSend ? "Sending..." : "Testing...";
  el.emailDiagnostics.textContent = isSend ? "Sending test email..." : "Testing SMTP connection...";
  try {
    const data = await api(isSend ? "/api/admin/email/send-test" : "/api/admin/email/test-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailDiagnosticPayload()),
    });
    renderEmailDiagnostic(data);
  } catch (error) {
    renderEmailDiagnostic({ ok: false, message: error.message });
  } finally {
    button.disabled = false;
    otherButton.disabled = false;
    button.innerHTML = original;
    window.lucide?.createIcons();
  }
}

async function loadCalls() {
  const { calls } = await api("/api/admin/calls");
  el.callLogList.innerHTML = "";
  for (const call of calls) {
    const item = document.createElement("details");
    item.className = `call-log ${call.lastError ? "has-error" : ""}`;
    const summary = document.createElement("summary");
    const main = document.createElement("span");
    main.textContent = `${call.fromNumber || "Unknown"} → ${call.toNumber || "Unknown"}`;
    const meta = document.createElement("span");
    meta.textContent = `${call.status} · ${call.businessProfile?.businessName || "Unassigned"} · ${new Date(call.startedAt).toLocaleString()}`;
    summary.append(main, meta);
    const body = document.createElement("div");
    body.className = "call-log-events";
    if (call.lastError) {
      const error = document.createElement("p");
      error.className = "call-log-error";
      error.textContent = hideProviderBrandText(call.lastError);
      body.appendChild(error);
    }
    const activeFlags = call.healthFlags
      ? Object.entries(call.healthFlags)
          .filter(([, active]) => active)
          .map(([key]) => displayHealthFlag(key))
      : [];
    if (activeFlags.length) {
      const flags = document.createElement("p");
      flags.className = "call-log-error";
      flags.textContent = `Health flags: ${activeFlags.join(", ")}`;
      body.appendChild(flags);
    }
    for (const event of call.events) {
      const row = document.createElement("div");
      const time = document.createElement("time");
      time.textContent = new Date(event.createdAt).toLocaleTimeString();
      const type = document.createElement("strong");
      type.textContent = displayEventType(event.eventType);
      const detail = document.createElement("code");
      detail.textContent = event.detail && Object.keys(event.detail).length
        ? JSON.stringify(hideProviderBrandPayload(event.detail))
        : "";
      row.append(time, type, detail);
      body.appendChild(row);
    }
    item.append(summary, body);
    el.callLogList.appendChild(item);
  }
  if (!calls.length) el.callLogList.textContent = "No Telnyx calls recorded yet.";
  window.lucide?.createIcons();
}

function priceText(number) {
  const cost = number.cost_information || {};
  const currency = cost.currency || "USD";
  return `${currency} ${cost.upfront_cost || "0"} now · ${currency} ${cost.monthly_cost || "?"}/month`;
}

function assignmentSelect(number) {
  const select = document.createElement("select");
  select.setAttribute("aria-label", `Business for ${number.phoneNumber}`);
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Select business";
  select.appendChild(empty);
  for (const business of businesses) {
    const option = document.createElement("option");
    option.value = business.id;
    option.textContent = business.businessName;
    option.selected = number.businessProfileId === business.id;
    select.appendChild(option);
  }
  return select;
}

function renderOwnedNumberRow(number) {
  const numberType = number.numberType || "regular";
  const demoAssignmentCount = number.demoAssignments?.length || 0;
  const row = document.createElement("div");
  row.className = "number-row";
  const identity = document.createElement("div");
  const phone = document.createElement("strong");
  phone.textContent = number.phoneNumber;
  const state = document.createElement("span");
  const assignmentText =
    numberType === "demo"
      ? `${demoAssignmentCount} active trials`
      : numberType === "onboarding"
        ? "System onboarding"
        : number.businessProfile?.businessName || "Unassigned";
  state.textContent = `${number.status} · ${numberType} · ${assignmentText}${number.label ? ` · ${number.label}` : ""}`;
  identity.append(phone, state);
  const type = document.createElement("select");
  type.setAttribute("aria-label", `Number type for ${number.phoneNumber}`);
  for (const value of ["regular", "demo", "onboarding"]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value[0].toUpperCase() + value.slice(1);
    option.selected = numberType === value;
    type.appendChild(option);
  }
  const label = document.createElement("input");
  label.value = number.label || "";
  label.placeholder = type.value === "onboarding" ? "Campaign label" : "Number label";
  label.setAttribute("aria-label", `Label for ${number.phoneNumber}`);
  const saveNumberMetadata = async () => {
    await api(`/api/admin/telnyx/numbers/${number.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numberType: type.value, label: label.value }),
    });
    await loadNumbers();
  };
  const saveNumber = document.createElement("button");
  saveNumber.type = "button";
  saveNumber.textContent = "Save label";
  saveNumber.addEventListener("click", saveNumberMetadata);
  const numberConfig = document.createElement("div");
  numberConfig.className = "number-config";
  const select = assignmentSelect(number);
  const assign = document.createElement("button");
  assign.type = "button";
  const assignment = document.createElement("div");
  assignment.className = "number-assignment";
  const syncAssignmentControls = () => {
    const isRegular = type.value === "regular";
    label.placeholder = type.value === "onboarding" ? "Campaign label" : "Number label";
    assign.textContent = isRegular ? "Assign business" : "Save settings";
    assign.disabled = isRegular ? !businesses.length : false;
    numberConfig.replaceChildren(type, label);
    if (isRegular) numberConfig.append(saveNumber);
    assignment.replaceChildren();
    if (isRegular) {
      assignment.append(select, assign);
    } else {
      assignment.append(assign);
    }
  };
  type.addEventListener("change", syncAssignmentControls);
  assign.addEventListener("click", async () => {
    if (type.value !== "regular") {
      await saveNumberMetadata();
      return;
    }
    if (!select.value) return;
    await api(`/api/admin/telnyx/numbers/${number.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessProfileId: Number(select.value) }),
    });
    await loadNumbers();
  });
  syncAssignmentControls();
  row.append(identity, numberConfig, assignment);
  return row;
}

async function loadNumbers() {
  const [businessData, numberData] = await Promise.all([api("/api/admin/businesses"), api("/api/admin/telnyx/numbers")]);
  businesses = businessData.businesses;
  el.ownedNumbers.innerHTML = "";
  if (!numberData.numbers.length) {
    el.ownedNumbers.textContent = "No purchased numbers found.";
    return;
  }

  const numberGroups = [
    {
      type: "onboarding",
      title: "Onboarding numbers",
      description: "Used by the phone onboarding agent and setup campaigns.",
      empty: "No onboarding numbers yet.",
    },
    {
      type: "regular",
      title: "Business numbers",
      description: "Assigned to individual business accounts.",
      empty: "No business numbers yet.",
    },
    {
      type: "demo",
      title: "Demo numbers",
      description: "Shared demo and trial numbers.",
      empty: "No demo numbers yet.",
    },
  ];

  for (const group of numberGroups) {
    const numbers = numberData.numbers.filter((number) => (number.numberType || "regular") === group.type);
    const section = document.createElement("section");
    section.className = "number-group";
    const header = document.createElement("div");
    header.className = "number-group-header";
    const heading = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = group.title;
    const description = document.createElement("p");
    description.textContent = group.description;
    heading.append(title, description);
    const count = document.createElement("span");
    count.className = "number-group-count";
    count.textContent = `${numbers.length} number${numbers.length === 1 ? "" : "s"}`;
    header.append(heading, count);
    const list = document.createElement("div");
    list.className = "number-group-list";
    if (numbers.length) {
      for (const number of numbers) list.appendChild(renderOwnedNumberRow(number));
    } else {
      const empty = document.createElement("p");
      empty.className = "number-group-empty";
      empty.textContent = group.empty;
      list.appendChild(empty);
    }
    section.append(header, list);
    el.ownedNumbers.appendChild(section);
  }
}

function renderSearchResults(numbers) {
  el.numberResults.innerHTML = "";
  for (const number of numbers) {
    const row = document.createElement("div");
    row.className = "number-row search-result";
    const identity = document.createElement("div");
    const phone = document.createElement("strong");
    phone.textContent = number.phone_number;
    const price = document.createElement("span");
    price.textContent = priceText(number);
    identity.append(phone, price);
    const reserve = document.createElement("button");
    reserve.type = "button";
    reserve.textContent = "Reserve 30 min";
    reserve.disabled = number.reservable === false;
    reserve.addEventListener("click", async () => {
      await api("/api/admin/telnyx/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: number.phone_number }),
      });
      reserve.textContent = "Reserved";
      reserve.disabled = true;
    });
    const purchase = document.createElement("button");
    purchase.type = "button";
    purchase.className = "primary";
    purchase.textContent = "Purchase";
    purchase.addEventListener("click", async () => {
      const confirmed = window.confirm(`Purchase ${number.phone_number} for ${priceText(number)}?`);
      if (!confirmed) return;
      await api("/api/admin/telnyx/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: number.phone_number, confirmPurchase: true }),
      });
      purchase.textContent = "Order placed";
      purchase.disabled = true;
    });
    row.append(identity, reserve, purchase);
    el.numberResults.appendChild(row);
  }
  if (!numbers.length) el.numberResults.textContent = "No matching reservable numbers found.";
}

async function enterAdmin(user) {
  if (user.role !== "admin") throw new Error("This account is not an administrator");
  el.auth.hidden = true;
  el.app.hidden = false;
  await Promise.all([loadSystem(), loadAccounts()]);
}

el.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  el.loginError.textContent = "";
  try {
    const { user } = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: el.email.value, password: el.password.value }),
    });
    await enterAdmin(user);
  } catch (error) {
    el.loginError.textContent = error.message;
  }
});

el.systemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  el.systemStatus.textContent = "Saving";
  try {
    await api("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        researchModel: el.researchModel.value,
        liveModel: el.liveModel.value,
        platformBusinessRules: el.platformBusinessRules.value,
        publicBaseUrl: el.publicBaseUrl.value,
        geminiApiKey: el.geminiApiKey.value,
        placesApiKey: el.placesApiKey.value,
        telnyxApiKey: el.telnyxApiKey.value,
        telnyxPublicKey: el.telnyxPublicKey.value,
        telnyxConnectionId: el.telnyxConnectionId.value,
        trialDays: Number(el.trialDays.value),
        claimLinkDays: Number(el.claimLinkDays.value),
        trialCredits: Number(el.trialCredits.value),
        tokenUsd: Number(el.tokenUsd.value),
        lowBalanceTokens: Number(el.lowBalanceTokens.value),
        voiceMinuteCredits: Number(el.voiceMinuteCredits.value),
        geminiMinuteCredits: Number(el.geminiMinuteCredits.value),
        outboundCallCredits: Number(el.outboundCallCredits.value),
        messageCredits: Number(el.messageCredits.value),
        stripeSecretKey: el.stripeSecretKey.value,
        stripeWebhookSecret: el.stripeWebhookSecret.value,
        stripeCreditPackCredits: Number(el.stripeCreditPackCredits.value),
        recordingRetentionDays: Number(el.recordingRetentionDays.value),
        demoNumberCapacity: Number(el.demoNumberCapacity.value),
        demoCallerLimit: Number(el.demoCallerLimit.value),
        smtpHost: el.smtpHost.value,
        smtpPort: Number(el.smtpPort.value),
        smtpSecure: el.smtpSecure.checked,
        smtpUsername: el.smtpUsername.value,
        smtpPassword: el.smtpPassword.value,
        smtpFromEmail: el.smtpFromEmail.value,
        smtpFromName: el.smtpFromName.value,
        messagePrimaryProvider: el.messagePrimaryProvider.value,
        messageFailoverProvider: el.messageFailoverProvider.value,
        blueBubblesBaseUrl: el.blueBubblesBaseUrl.value,
        blueBubblesSendPath: el.blueBubblesSendPath.value,
        blueBubblesPassword: el.blueBubblesPassword.value,
        sentDmApiKey: el.sentDmApiKey.value,
        sentDmTemplateId: el.sentDmTemplateId.value,
        sentDmTemplateName: el.sentDmTemplateName.value,
        sentDmProfileId: el.sentDmProfileId.value,
      }),
    });
    for (const input of [
      el.geminiApiKey,
      el.placesApiKey,
      el.telnyxApiKey,
      el.telnyxPublicKey,
      el.telnyxConnectionId,
      el.smtpUsername,
      el.smtpPassword,
      el.stripeSecretKey,
      el.stripeWebhookSecret,
      el.blueBubblesPassword,
      el.sentDmApiKey,
    ]) input.value = "";
    await loadSystem();
    el.systemStatus.textContent = "Saved";
  } catch (error) {
    el.systemStatus.textContent = error.message;
  }
});

el.planForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  el.planMessage.className = "form-message";
  el.planMessage.textContent = "Saving";
  try {
    const id = el.planId.value;
    await api(id ? `/api/admin/subscription-plans/${id}` : "/api/admin/subscription-plans", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(planPayload()),
    });
    await loadPlans();
    resetPlanForm();
    el.planMessage.className = "form-message success";
    el.planMessage.textContent = "Plan saved";
  } catch (error) {
    el.planMessage.className = "form-message error";
    el.planMessage.textContent = error.message;
  }
});

el.resetPlanButton.addEventListener("click", resetPlanForm);
el.publicBaseUrl.addEventListener("input", refreshSystemWebhookUrls);
el.blueBubblesPassword.addEventListener("input", refreshBlueBubblesWebhookUrl);
el.copyStripeWebhookUrl.addEventListener("click", () => copyStripeWebhookUrl().catch((error) => (el.systemStatus.textContent = error.message)));
el.copyBlueBubblesWebhookUrl.addEventListener("click", () =>
  copyBlueBubblesWebhookUrl().catch((error) => (el.systemStatus.textContent = error.message)),
);
el.sendBlueBubblesTest.addEventListener("click", sendBlueBubblesTestMessage);
el.refreshBlueBubblesReplies.addEventListener("click", () =>
  loadBlueBubblesReplies().catch((error) => {
    el.blueBubblesReplies.textContent = error.message;
  }),
);
el.checkSmtpConnection.addEventListener("click", () => runEmailDiagnostic("connection"));
el.sendTestEmail.addEventListener("click", () => runEmailDiagnostic("send"));

el.onboardingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  el.onboardingStatus.textContent = "Saving";
  try {
    await api("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        onboardingLookupUrl: el.onboardingLookupUrl.value,
        onboardingVoiceName: el.onboardingVoiceName.value,
        onboardingInstructions: el.onboardingInstructions.value,
        onboardingRecordCalls: el.onboardingRecordCalls.checked,
        onboardingTranscription: el.onboardingTranscription.checked,
      }),
    });
    await loadOnboarding();
    el.onboardingStatus.textContent = "Saved";
  } catch (error) {
    el.onboardingStatus.textContent = error.message;
  }
});

el.createAccountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const businessName = document.querySelector("#accountBusinessName").value.trim();
  const email = document.querySelector("#accountEmail").value.trim();
  const password = document.querySelector("#accountPassword").value;
  el.accountMessage.className = "form-message";
  if (!businessName || !email || password.length < 10) {
    el.accountMessage.className = "form-message error";
    el.accountMessage.textContent = "Business name, valid login email, and a password of at least 10 characters are required.";
    return;
  }
  el.createAccountButton.disabled = true;
  el.createAccountButton.textContent = "Creating and researching…";
  el.accountMessage.textContent = "Researching the business and creating its login. This can take several seconds.";
  try {
    await api("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName,
        website: document.querySelector("#accountWebsite").value,
        name: document.querySelector("#accountName").value,
        email,
        password,
      }),
    });
    el.createAccountForm.reset();
    await loadAccounts();
    el.accountMessage.className = "form-message success";
    el.accountMessage.textContent = `Account created for ${email}.`;
  } catch (error) {
    el.accountMessage.className = "form-message error";
    el.accountMessage.textContent = error.message;
  } finally {
    el.createAccountButton.disabled = false;
    el.createAccountButton.innerHTML = '<i data-lucide="user-plus"></i> Create account';
    window.lucide?.createIcons();
  }
});

el.numberSearchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  el.numberError.textContent = "";
  try {
    const query = new URLSearchParams({ country: el.numberCountry.value || "US" });
    if (el.numberAreaCode.value) query.set("areaCode", el.numberAreaCode.value);
    if (el.numberLocality.value) query.set("locality", el.numberLocality.value);
    const data = await api(`/api/admin/telnyx/search?${query}`);
    renderSearchResults(data.numbers);
  } catch (error) {
    el.numberError.textContent = error.message;
  }
});

el.syncNumbers.addEventListener("click", () => loadNumbers().catch((error) => (el.numberError.textContent = error.message)));
el.refreshCalls.addEventListener("click", () => loadCalls());
el.refreshAdminHealth.addEventListener("click", () => loadAdminHealth().catch((error) => (el.adminHealthList.textContent = error.message)));
el.refreshOnboarding.addEventListener("click", () => loadOnboarding().catch((error) => (el.onboardingStatus.textContent = error.message)));
el.checkSentDm.addEventListener("click", () => loadSentDmDiagnostics().catch((error) => (el.sentDmDiagnostics.textContent = error.message)));

for (const tab of el.systemTabs) {
  tab.addEventListener("click", () => setSystemTab(tab.dataset.systemTab));
}

for (const tab of el.tabs) {
  tab.addEventListener("click", () => {
    for (const item of el.tabs) item.classList.toggle("active", item === tab);
    for (const view of el.views) view.classList.toggle("active", view.dataset.adminView === tab.dataset.adminTab);
    if (tab.dataset.adminTab === "numbers") loadNumbers().catch((error) => (el.numberError.textContent = error.message));
    if (tab.dataset.adminTab === "health") loadAdminHealth().catch((error) => (el.adminHealthList.textContent = error.message));
    if (tab.dataset.adminTab === "onboarding") {
      loadOnboarding().catch((error) => (el.onboardingStatus.textContent = error.message));
    }
    if (tab.dataset.adminTab === "calls") loadCalls();
  });
}

el.logout.addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.reload();
});

api("/api/auth/me").then(({ user }) => enterAdmin(user)).catch(() => {});
window.lucide?.createIcons();
