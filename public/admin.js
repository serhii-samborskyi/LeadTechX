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
  systemForm: document.querySelector("#systemForm"),
  systemStatus: document.querySelector("#systemStatus"),
  researchModel: document.querySelector("#systemResearchModel"),
  liveModel: document.querySelector("#systemLiveModel"),
  geminiApiKey: document.querySelector("#geminiApiKey"),
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
  stripeSubscriptionCredits: document.querySelector("#stripeSubscriptionCredits"),
  stripeSubscriptionPriceId: document.querySelector("#stripeSubscriptionPriceId"),
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
  diagnosticPhrase: document.querySelector("#diagnosticPhrase"),
  diagnosticVoice: document.querySelector("#diagnosticVoice"),
  diagnosticTargetLegs: document.querySelector("#diagnosticTargetLegs"),
  diagnosticStopStream: document.querySelector("#diagnosticStopStream"),
  diagnosticStatus: document.querySelector("#diagnosticStatus"),
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
  const data = await api("/api/admin/settings");
  el.researchModel.value = data.settings.researchModel;
  el.liveModel.value = data.settings.liveModel;
  el.publicBaseUrl.value = data.publicBaseUrl;
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
    "stripeSubscriptionCredits",
    "stripeSubscriptionPriceId",
    "recordingRetentionDays",
    "demoNumberCapacity",
    "demoCallerLimit",
    "smtpHost",
    "smtpPort",
    "smtpFromEmail",
    "smtpFromName",
  ]) {
    el[key].value = data.settings[key] ?? "";
  }
  el.smtpSecure.checked = Boolean(data.settings.smtpSecure);
  secretState("geminiApiKey", data.secrets.geminiApiKey);
  secretState("telnyxApiKey", data.secrets.telnyxApiKey);
  secretState("telnyxPublicKey", data.secrets.telnyxPublicKey);
  secretState("telnyxConnectionId", data.secrets.telnyxConnectionId);
  secretState("smtpUsername", data.secrets.smtpUsername);
  secretState("smtpPassword", data.secrets.smtpPassword);
  secretState("stripeSecretKey", data.secrets.stripeSecretKey);
  secretState("stripeWebhookSecret", data.secrets.stripeWebhookSecret);
}

async function loadOnboarding() {
  const [settingsData, sessionData] = await Promise.all([api("/api/admin/settings"), api("/api/admin/onboarding")]);
  const settings = settingsData.settings;
  for (const key of [
    "onboardingLookupUrl",
    "onboardingVoiceName",
    "onboardingInstructions",
    "messagePrimaryProvider",
    "messageFailoverProvider",
    "blueBubblesBaseUrl",
    "blueBubblesSendPath",
    "sentDmTemplateId",
    "sentDmTemplateName",
    "sentDmProfileId",
  ]) {
    el[key].value = settings[key] ?? "";
  }
  el.onboardingRecordCalls.checked = Boolean(settings.onboardingRecordCalls);
  el.onboardingTranscription.checked = Boolean(settings.onboardingTranscription);
  secretState("blueBubblesPassword", settingsData.secrets.blueBubblesPassword);
  secretState("sentDmApiKey", settingsData.secrets.sentDmApiKey);
  if (settingsData.secrets.sentDmApiKey.configured) {
    loadSentDmDiagnostics().catch((error) => {
      el.sentDmDiagnostics.textContent = error.message;
    });
  } else {
    el.sentDmDiagnostics.textContent = "Sent.dm API key is not configured.";
  }
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
      row.querySelector("span").textContent = value;
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
    row.append(heading, access, lifecycle, phone, agent, content);
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
    const actions = document.createElement("div");
    actions.className = "call-log-actions";
    const canDiagnose = call.status !== "ended" && !call.endedAt;
    const speak = document.createElement("button");
    speak.type = "button";
    speak.innerHTML = '<i data-lucide="volume-2"></i> Telnyx speak test';
    speak.disabled = !canDiagnose;
    speak.title = canDiagnose ? "Play Telnyx native TTS on this live call" : "This call has ended";
    speak.addEventListener("click", async () => runTelnyxSpeakDiagnostic(call.id, speak));
    actions.appendChild(speak);
    body.appendChild(actions);
    if (call.lastError) {
      const error = document.createElement("p");
      error.className = "call-log-error";
      error.textContent = call.lastError;
      body.appendChild(error);
    }
    const activeFlags = call.healthFlags
      ? Object.entries(call.healthFlags)
          .filter(([, active]) => active)
          .map(([key]) => key)
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
      type.textContent = event.eventType;
      const detail = document.createElement("code");
      detail.textContent = event.detail && Object.keys(event.detail).length ? JSON.stringify(event.detail) : "";
      row.append(time, type, detail);
      body.appendChild(row);
    }
    item.append(summary, body);
    el.callLogList.appendChild(item);
  }
  if (!calls.length) el.callLogList.textContent = "No Telnyx calls recorded yet.";
  window.lucide?.createIcons();
}

async function runTelnyxSpeakDiagnostic(callId, button) {
  const original = button.innerHTML;
  button.disabled = true;
  button.textContent = "Sending test...";
  el.diagnosticStatus.className = "form-message";
  el.diagnosticStatus.textContent = "Sending Telnyx native speak command to the live call.";
  try {
    const data = await api(`/api/admin/calls/${callId}/diagnostics/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: el.diagnosticPhrase.value,
        voice: el.diagnosticVoice.value,
        targetLegs: el.diagnosticTargetLegs.value,
        stopStreaming: el.diagnosticStopStream.checked,
      }),
    });
    el.diagnosticStatus.className = "form-message success";
    el.diagnosticStatus.textContent = `Diagnostic sent. ${data.results?.join(" · ") || "Watch the call log for call.speak events."}`;
    setTimeout(loadCalls, 1200);
  } catch (error) {
    el.diagnosticStatus.className = "form-message error";
    el.diagnosticStatus.textContent = error.message;
    button.disabled = false;
    button.innerHTML = original;
    window.lucide?.createIcons();
  }
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

async function loadNumbers() {
  const [businessData, numberData] = await Promise.all([api("/api/admin/businesses"), api("/api/admin/telnyx/numbers")]);
  businesses = businessData.businesses;
  el.ownedNumbers.innerHTML = "";
  for (const number of numberData.numbers) {
    const row = document.createElement("div");
    row.className = "number-row";
    const identity = document.createElement("div");
    const phone = document.createElement("strong");
    phone.textContent = number.phoneNumber;
    const state = document.createElement("span");
    state.textContent = `${number.status} · ${number.numberType} · ${
      number.numberType === "demo"
        ? `${number.demoAssignments.length} active trials`
        : number.businessProfile?.businessName || "Unassigned"
    }${number.label ? ` · ${number.label}` : ""}`;
    identity.append(phone, state);
    const type = document.createElement("select");
    type.setAttribute("aria-label", `Number type for ${number.phoneNumber}`);
    for (const value of ["regular", "demo", "onboarding"]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value[0].toUpperCase() + value.slice(1);
      option.selected = number.numberType === value;
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
    saveNumber.textContent = "Save";
    saveNumber.addEventListener("click", saveNumberMetadata);
    const numberConfig = document.createElement("div");
    numberConfig.className = "number-config";
    numberConfig.append(type, label, saveNumber);
    const select = assignmentSelect(number);
    const assign = document.createElement("button");
    assign.type = "button";
    const syncAssignmentControls = () => {
      const isRegular = type.value === "regular";
      label.placeholder = type.value === "onboarding" ? "Campaign label" : "Number label";
      select.disabled = !isRegular;
      assign.textContent = isRegular ? "Assign business" : "Save number type";
      assign.disabled = isRegular ? !businesses.length : false;
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
    const assignment = document.createElement("div");
    assignment.className = "number-assignment";
    assignment.append(select, assign);
    row.append(identity, numberConfig, assignment);
    el.ownedNumbers.appendChild(row);
  }
  if (!numberData.numbers.length) el.ownedNumbers.textContent = "No purchased numbers found.";
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
        publicBaseUrl: el.publicBaseUrl.value,
        geminiApiKey: el.geminiApiKey.value,
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
        stripeSubscriptionCredits: Number(el.stripeSubscriptionCredits.value),
        stripeSubscriptionPriceId: el.stripeSubscriptionPriceId.value,
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
      }),
    });
    for (const input of [
      el.geminiApiKey,
      el.telnyxApiKey,
      el.telnyxPublicKey,
      el.telnyxConnectionId,
      el.smtpUsername,
      el.smtpPassword,
      el.stripeSecretKey,
      el.stripeWebhookSecret,
    ]) input.value = "";
    await loadSystem();
    el.systemStatus.textContent = "Saved";
  } catch (error) {
    el.systemStatus.textContent = error.message;
  }
});

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
    el.blueBubblesPassword.value = "";
    el.sentDmApiKey.value = "";
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
el.refreshOnboarding.addEventListener("click", () => loadOnboarding().catch((error) => (el.onboardingStatus.textContent = error.message)));
el.checkSentDm.addEventListener("click", () => loadSentDmDiagnostics().catch((error) => (el.sentDmDiagnostics.textContent = error.message)));

for (const tab of el.tabs) {
  tab.addEventListener("click", () => {
    for (const item of el.tabs) item.classList.toggle("active", item === tab);
    for (const view of el.views) view.classList.toggle("active", view.dataset.adminView === tab.dataset.adminTab);
    if (tab.dataset.adminTab === "numbers") loadNumbers().catch((error) => (el.numberError.textContent = error.message));
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
