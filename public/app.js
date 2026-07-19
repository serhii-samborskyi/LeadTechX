const params = new URLSearchParams(window.location.search);
const languageParam = params.get("language");
const agentNameParam = params.get("agent_name");
const state = {
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
  micChunks: 0,
  agentAudioChunks: 0,
  agentAudioSeconds: 0,
  micLevel: 0,
  agentLevel: 0,
  visualizerLevel: 0,
  agentSpeakingUntil: 0,
  visualizerFrame: null,
  admin: null,
  crmSearchTimer: null,
  selectedMessageThreadKey: "",
  messageData: { messages: [], inboundMessages: [] },
  businessName: params.get("business_name") || "Business Name",
  website: params.get("website") || "",
};

const el = {
  authScreen: document.querySelector("#authScreen"),
  appShell: document.querySelector("#appShell"),
  loginForm: document.querySelector("#loginForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  loginError: document.querySelector("#loginError"),
  logoutButton: document.querySelector("#logoutButton"),
  title: document.querySelector("#title"),
  status: document.querySelector("#status"),
  businessName: document.querySelector("#businessName"),
  website: document.querySelector("#website"),
  numberStatus: document.querySelector("#numberStatus"),
  numberStatusTitle: document.querySelector("#numberStatusTitle"),
  numberStatusDetail: document.querySelector("#numberStatusDetail"),
  talkButton: document.querySelector("#talkButton"),
  stopButton: document.querySelector("#stopButton"),
  testSpeakerButton: document.querySelector("#testSpeakerButton"),
  refreshButton: document.querySelector("#refreshButton"),
  openAdminButton: document.querySelector("#openAdminButton"),
  voiceName: document.querySelector("#voiceName"),
  language: document.querySelector("#language"),
  agentName: document.querySelector("#agentName"),
  saveSettingsButton: document.querySelector("#saveSettingsButton"),
  callHeading: document.querySelector("#callHeading"),
  callSubheading: document.querySelector("#callSubheading"),
  transcript: document.querySelector("#transcript"),
  textForm: document.querySelector("#textForm"),
  textInput: document.querySelector("#textInput"),
  profileName: document.querySelector("#profileName"),
  profileHours: document.querySelector("#profileHours"),
  profileServices: document.querySelector("#profileServices"),
  profileArea: document.querySelector("#profileArea"),
  records: document.querySelector("#records"),
  orb: document.querySelector("#orb"),
  voiceVisualizer: document.querySelector("#voiceVisualizer"),
  diagnostics: document.querySelector("#diagnostics"),
  businessAdmin: document.querySelector("#businessAdmin"),
  adminStatus: document.querySelector("#adminStatus"),
  adminTabs: document.querySelectorAll(".admin-tab"),
  adminViews: document.querySelectorAll(".admin-view"),
  automationMenuButtons: document.querySelectorAll(".automation-menu-button"),
  automationSections: document.querySelectorAll(".automation-section"),
  profileBusinessName: document.querySelector("#profileBusinessName"),
  profileWebsite: document.querySelector("#profileWebsite"),
  profileSummary: document.querySelector("#profileSummary"),
  profileHoursInput: document.querySelector("#profileHoursInput"),
  profileServiceArea: document.querySelector("#profileServiceArea"),
  profileServicesInput: document.querySelector("#profileServicesInput"),
  profilePhone: document.querySelector("#profilePhone"),
  profileEmail: document.querySelector("#profileEmail"),
  profileAddress: document.querySelector("#profileAddress"),
  profilePricing: document.querySelector("#profilePricing"),
  profileBookingPolicy: document.querySelector("#profileBookingPolicy"),
  profileFaq: document.querySelector("#profileFaq"),
  saveBusinessProfileButton: document.querySelector("#saveBusinessProfileButton"),
  intakeLabel: document.querySelector("#intakeLabel"),
  intakeKey: document.querySelector("#intakeKey"),
  intakeType: document.querySelector("#intakeType"),
  intakeOptions: document.querySelector("#intakeOptions"),
  intakeRequired: document.querySelector("#intakeRequired"),
  addIntakeButton: document.querySelector("#addIntakeButton"),
  intakeList: document.querySelector("#intakeList"),
  knowledgeFile: document.querySelector("#knowledgeFile"),
  importKnowledgeButton: document.querySelector("#importKnowledgeButton"),
  knowledgeQuestion: document.querySelector("#knowledgeQuestion"),
  knowledgeAnswer: document.querySelector("#knowledgeAnswer"),
  knowledgeCategory: document.querySelector("#knowledgeCategory"),
  addKnowledgeButton: document.querySelector("#addKnowledgeButton"),
  knowledgeList: document.querySelector("#knowledgeList"),
  pricesFile: document.querySelector("#pricesFile"),
  importPricesButton: document.querySelector("#importPricesButton"),
  priceItem: document.querySelector("#priceItem"),
  priceDescription: document.querySelector("#priceDescription"),
  priceType: document.querySelector("#priceType"),
  priceMin: document.querySelector("#priceMin"),
  priceMax: document.querySelector("#priceMax"),
  priceCurrency: document.querySelector("#priceCurrency"),
  priceCategory: document.querySelector("#priceCategory"),
  addPriceButton: document.querySelector("#addPriceButton"),
  pricesList: document.querySelector("#pricesList"),
  extraInstructions: document.querySelector("#extraInstructions"),
  qualificationEnabled: document.querySelector("#qualificationEnabled"),
  qualificationLaunchMode: document.querySelector("#qualificationLaunchMode"),
  qualificationInstructions: document.querySelector("#qualificationInstructions"),
  qualificationDelayMinSeconds: document.querySelector("#qualificationDelayMinSeconds"),
  qualificationDelayMaxSeconds: document.querySelector("#qualificationDelayMaxSeconds"),
  qualificationMaxAttempts: document.querySelector("#qualificationMaxAttempts"),
  qualificationRetryDelayMinutes: document.querySelector("#qualificationRetryDelayMinutes"),
  leadWebhookDedupeWindowHours: document.querySelector("#leadWebhookDedupeWindowHours"),
  reviewRequestsEnabled: document.querySelector("#reviewRequestsEnabled"),
  reviewLink: document.querySelector("#reviewLink"),
  managerNotificationPhone: document.querySelector("#managerNotificationPhone"),
  reviewPromptInstructions: document.querySelector("#reviewPromptInstructions"),
  reviewRequestTemplate: document.querySelector("#reviewRequestTemplate"),
  reviewDirectoryLink: document.querySelector("#reviewDirectoryLink"),
  reviewServiceName: document.querySelector("#reviewServiceName"),
  reviewServiceUrl: document.querySelector("#reviewServiceUrl"),
  reviewServiceSort: document.querySelector("#reviewServiceSort"),
  addReviewLinkButton: document.querySelector("#addReviewLinkButton"),
  reviewLinkList: document.querySelector("#reviewLinkList"),
  complaintRecoveryInstructions: document.querySelector("#complaintRecoveryInstructions"),
  complaintEscalationTemplate: document.querySelector("#complaintEscalationTemplate"),
  missedCallFollowupTemplate: document.querySelector("#missedCallFollowupTemplate"),
  appointmentReminderTemplate: document.querySelector("#appointmentReminderTemplate"),
  saveInstructionsButton: document.querySelector("#saveInstructionsButton"),
  transferLabel: document.querySelector("#transferLabel"),
  transferPhone: document.querySelector("#transferPhone"),
  transferDescription: document.querySelector("#transferDescription"),
  transferSortOrder: document.querySelector("#transferSortOrder"),
  transferActive: document.querySelector("#transferActive"),
  addTransferTargetButton: document.querySelector("#addTransferTargetButton"),
  transferTargetList: document.querySelector("#transferTargetList"),
  appointmentMode: document.querySelector("#appointmentMode"),
  slotDuration: document.querySelector("#slotDuration"),
  bufferMinutes: document.querySelector("#bufferMinutes"),
  calendarTimezone: document.querySelector("#calendarTimezone"),
  availabilityRules: document.querySelector("#availabilityRules"),
  saveCalendarButton: document.querySelector("#saveCalendarButton"),
  refreshCalendarButton: document.querySelector("#refreshCalendarButton"),
  availableSlots: document.querySelector("#availableSlots"),
  bookedAppointments: document.querySelector("#bookedAppointments"),
  appointmentId: document.querySelector("#appointmentId"),
  appointmentCustomerName: document.querySelector("#appointmentCustomerName"),
  appointmentPhone: document.querySelector("#appointmentPhone"),
  appointmentEmail: document.querySelector("#appointmentEmail"),
  appointmentStart: document.querySelector("#appointmentStart"),
  appointmentReason: document.querySelector("#appointmentReason"),
  appointmentStatus: document.querySelector("#appointmentStatus"),
  appointmentSendSummary: document.querySelector("#appointmentSendSummary"),
  saveAppointmentButton: document.querySelector("#saveAppointmentButton"),
  resetAppointmentButton: document.querySelector("#resetAppointmentButton"),
  refreshCrmButton: document.querySelector("#refreshCrmButton"),
  crmWebhookUrl: document.querySelector("#crmWebhookUrl"),
  crmWebhookDocsLink: document.querySelector("#crmWebhookDocsLink"),
  copyCrmWebhookButton: document.querySelector("#copyCrmWebhookButton"),
  rotateCrmWebhookButton: document.querySelector("#rotateCrmWebhookButton"),
  crmWebhookHelp: document.querySelector("#crmWebhookHelp"),
  crmStatusCounts: document.querySelector("#crmStatusCounts"),
  crmWebhookEvents: document.querySelector("#crmWebhookEvents"),
  crmWebhookTestPayload: document.querySelector("#crmWebhookTestPayload"),
  sendCrmWebhookTestButton: document.querySelector("#sendCrmWebhookTestButton"),
  resetCrmWebhookTestButton: document.querySelector("#resetCrmWebhookTestButton"),
  crmWebhookTestStatus: document.querySelector("#crmWebhookTestStatus"),
  crmSearch: document.querySelector("#crmSearch"),
  crmStatusFilter: document.querySelector("#crmStatusFilter"),
  crmName: document.querySelector("#crmName"),
  crmPhone: document.querySelector("#crmPhone"),
  crmEmail: document.querySelector("#crmEmail"),
  crmNeed: document.querySelector("#crmNeed"),
  crmStatus: document.querySelector("#crmStatus"),
  addCrmLeadButton: document.querySelector("#addCrmLeadButton"),
  crmList: document.querySelector("#crmList"),
  refreshMessagesButton: document.querySelector("#refreshMessagesButton"),
  testMessageProvider: document.querySelector("#testMessageProvider"),
  testMessagePhone: document.querySelector("#testMessagePhone"),
  testMessageBody: document.querySelector("#testMessageBody"),
  sendTestMessageButton: document.querySelector("#sendTestMessageButton"),
  messageList: document.querySelector("#messageList"),
  refreshUsageButton: document.querySelector("#refreshUsageButton"),
  usageSummary: document.querySelector("#usageSummary"),
  billingStatus: document.querySelector("#billingStatus"),
  creditPackCredits: document.querySelector("#creditPackCredits"),
  billingPlanSelect: document.querySelector("#billingPlanSelect"),
  billingPlanList: document.querySelector("#billingPlanList"),
  buyCreditsButton: document.querySelector("#buyCreditsButton"),
  startSubscriptionButton: document.querySelector("#startSubscriptionButton"),
  billingHistory: document.querySelector("#billingHistory"),
  usageList: document.querySelector("#usageList"),
  mobileNavItems: document.querySelectorAll(".mobile-nav-item"),
};

function businessDisplayText(text) {
  const providerName = ["Ge", "mini"].join("");
  return String(text || "")
    .replace(new RegExp(`${providerName}\\s+Live`, "gi"), "AI voice")
    .replace(new RegExp(providerName, "gi"), "AI");
}

function setStatus(text, mode = "") {
  el.status.textContent = businessDisplayText(text);
  el.status.className = `status ${mode}`.trim();
}

function setTitle() {
  const name = el.businessName.value.trim() || "Business Name";
  el.title.textContent = `Virtual assistant for "${name}"`;
}

function appendTranscript(speaker, text) {
  if (!text) return;
  const bubble = document.createElement("div");
  bubble.className = `bubble ${speaker}`;
  const label = speaker === "caller" ? "Caller" : speaker === "agent" ? "Agent" : "System";
  bubble.innerHTML = `<span class="speaker"></span><span class="text"></span>`;
  bubble.querySelector(".speaker").textContent = label;
  bubble.querySelector(".text").textContent = businessDisplayText(text);
  el.transcript.appendChild(bubble);
  el.transcript.scrollTop = el.transcript.scrollHeight;
}

function speakBrowserNotice(text) {
  if (!text || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.volume = 0.85;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Browser speech synthesis is best-effort for local tool wait notices.
  }
}

function updateDiagnostics() {
  el.diagnostics.textContent = `Mic chunks: ${state.micChunks} | Agent audio chunks: ${state.agentAudioChunks} | Audio seconds: ${state.agentAudioSeconds.toFixed(1)}`;
}

function floatRms(samples) {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
  return Math.min(1, Math.sqrt(sum / samples.length) * 4);
}

function int16Rms(samples) {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const value = samples[i] / 32768;
    sum += value * value;
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 4);
}

function drawVoiceVisualizer() {
  const canvas = el.voiceVisualizer;
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;

  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  context.clearRect(0, 0, width, height);
  context.save();
  context.scale(ratio, ratio);

  const size = Math.min(rect.width, rect.height);
  const center = size / 2;
  const now = performance.now();
  const agentSpeaking = Date.now() < state.agentSpeakingUntil;
  const connected = state.ws?.readyState === WebSocket.OPEN;
  const audioLevel = agentSpeaking ? Math.max(0.18, state.agentLevel) : connected ? state.micLevel : 0.02;
  state.visualizerLevel += (audioLevel - state.visualizerLevel) * (agentSpeaking ? 0.22 : 0.12);
  state.micLevel *= 0.92;
  state.agentLevel *= 0.96;

  const colors = agentSpeaking
    ? ["#f47c59", "#e2aa45", "#776fd2", "#4cab83"]
    : ["#4cab83", "#72c79d", "#246a55", "#e2aa45"];
  const bars = 28;
  const baseRadius = size * 0.34;
  for (let index = 0; index < bars; index += 1) {
    const angle = (Math.PI * 2 * index) / bars - Math.PI / 2;
    const wave = 0.55 + 0.45 * Math.sin(now * (agentSpeaking ? 0.009 : 0.004) + index * 0.82);
    const length = 2 + state.visualizerLevel * (agentSpeaking ? 12 : 9) * wave;
    const startX = center + Math.cos(angle) * baseRadius;
    const startY = center + Math.sin(angle) * baseRadius;
    const endX = center + Math.cos(angle) * (baseRadius + length);
    const endY = center + Math.sin(angle) * (baseRadius + length);
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.strokeStyle = colors[index % colors.length];
    context.lineWidth = agentSpeaking ? 2.4 : 2;
    context.lineCap = "round";
    context.stroke();
  }

  context.beginPath();
  context.arc(center, center, size * 0.27, now * 0.0015, now * 0.0015 + Math.PI * 1.25);
  context.strokeStyle = agentSpeaking ? "#f47c59" : "#4cab83";
  context.lineWidth = 2;
  context.lineCap = "round";
  context.stroke();
  context.restore();

  state.visualizerFrame = requestAnimationFrame(drawVoiceVisualizer);
}

function isLocalhostHost() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function microphoneSecurityError() {
  if (window.isSecureContext || isLocalhostHost()) return "";
  return [
    `Microphone is blocked on ${window.location.origin}.`,
    "Browsers only allow microphone on localhost or trusted HTTPS.",
    "Use https://10.0.0.211:3000 with a trusted certificate, or enable a temporary Chrome dev override for this origin.",
  ].join(" ");
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function resampleTo16k(float32, inputRate) {
  if (inputRate === 16000) return float32;
  const ratio = inputRate / 16000;
  const outputLength = Math.floor(float32.length / ratio);
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i += 1) {
    const index = i * ratio;
    const before = Math.floor(index);
    const after = Math.min(before + 1, float32.length - 1);
    const weight = index - before;
    output[i] = float32[before] * (1 - weight) + float32[after] * weight;
  }
  return output;
}

function floatTo16BitPcm(float32) {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return buffer;
}

function parseSampleRate(mimeType, fallback) {
  const match = String(mimeType || "").match(/rate=(\d+)/);
  return match ? Number(match[1]) : fallback;
}

async function initOutputAudio() {
  if (!state.outputContext) {
    state.outputContext = new AudioContext({ sampleRate: 24000 });
    state.nextPlayTime = state.outputContext.currentTime;
  }
  if (state.outputContext.state === "suspended") {
    await state.outputContext.resume();
  }
}

async function playSpeakerTest() {
  await initOutputAudio();
  const sampleRate = state.outputContext.sampleRate;
  const duration = 0.18;
  const audioBuffer = state.outputContext.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
  const channel = audioBuffer.getChannelData(0);
  for (let i = 0; i < channel.length; i += 1) {
    const fade = Math.min(i / 400, (channel.length - i) / 400, 1);
    channel[i] = Math.sin((2 * Math.PI * 660 * i) / sampleRate) * 0.18 * fade;
  }
  const source = state.outputContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(state.outputContext.destination);
  source.start();
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
  if (state.outputContext) {
    state.nextPlayTime = state.outputContext.currentTime;
  }
  state.agentSpeakingUntil = 0;
  state.agentLevel = 0;
  updateDiagnostics();
}

async function playPcmAudio(base64, mimeType) {
  await initOutputAudio();

  const sampleRate = parseSampleRate(mimeType, 24000);
  const pcm = base64ToArrayBuffer(base64);
  const samples = new Int16Array(pcm);
  if (!samples.length) return;
  state.agentLevel = Math.max(state.agentLevel, int16Rms(samples));
  const audioBuffer = state.outputContext.createBuffer(1, samples.length, sampleRate);
  const channel = audioBuffer.getChannelData(0);
  for (let i = 0; i < samples.length; i += 1) {
    channel[i] = samples[i] / 32768;
  }

  const source = state.outputContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(state.outputContext.destination);
  source.onended = () => state.outputSources.delete(source);
  state.outputSources.add(source);
  state.nextPlayTime = Math.max(state.nextPlayTime, state.outputContext.currentTime + 0.02);
  source.start(state.nextPlayTime);
  state.nextPlayTime += audioBuffer.duration;
  state.agentSpeakingUntil = Date.now() + Math.max(0, state.nextPlayTime - state.outputContext.currentTime) * 1000;
  state.agentAudioChunks += 1;
  state.agentAudioSeconds += audioBuffer.duration;
  updateDiagnostics();
}

function sendAudio(float32) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
  if (!state.canSendMic) return;
  state.micLevel = Math.max(state.micLevel, floatRms(float32));
  const resampled = resampleTo16k(float32, state.inputContext.sampleRate);
  const pcm = floatTo16BitPcm(resampled);
  state.ws.send(JSON.stringify({ type: "audio", data: arrayBufferToBase64(pcm) }));
  state.micChunks += 1;
  if (state.micChunks % 10 === 0) updateDiagnostics();
}

async function startMicrophone() {
  const securityError = microphoneSecurityError();
  if (securityError) {
    throw new Error(securityError);
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access is not available in this browser.");
  }
  state.micStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  state.inputContext = new AudioContext();
  state.source = state.inputContext.createMediaStreamSource(state.micStream);
  state.processor = state.inputContext.createScriptProcessor(4096, 1, 1);
  state.silentGain = state.inputContext.createGain();
  state.silentGain.gain.value = 0;
  state.processor.onaudioprocess = (event) => {
    sendAudio(event.inputBuffer.getChannelData(0));
  };
  state.source.connect(state.processor);
  state.processor.connect(state.silentGain);
  state.silentGain.connect(state.inputContext.destination);
}

function stopMicrophone() {
  if (state.processor) state.processor.disconnect();
  if (state.source) state.source.disconnect();
  if (state.silentGain) state.silentGain.disconnect();
  if (state.inputContext) state.inputContext.close();
  if (state.micStream) {
    for (const track of state.micStream.getTracks()) track.stop();
  }
  state.processor = null;
  state.source = null;
  state.silentGain = null;
  state.inputContext = null;
  state.micStream = null;
}

function updateProfile(profile, cached) {
  el.profileName.textContent = `${profile.businessName}${cached ? " (cached)" : ""}`;
  el.profileHours.textContent = profile.hours || "unknown";
  el.profileServices.textContent = profile.services || "unknown";
  el.profileArea.textContent = profile.serviceArea || "unknown";
  el.callHeading.textContent = `Live receptionist for ${profile.businessName}`;
  el.callSubheading.textContent = cached
    ? "Using the saved business profile."
    : "Business profile refreshed for future calls.";
}

function renderNumberStatus(phoneNumbers = []) {
  const activeNumbers = phoneNumbers.filter((number) => number.status === "active");
  el.numberStatus.classList.toggle("assigned", activeNumbers.length > 0);
  el.numberStatus.classList.toggle("missing", activeNumbers.length === 0);
  if (activeNumbers.length) {
    el.numberStatusTitle.textContent = activeNumbers.length === 1 ? "Phone number assigned" : `${activeNumbers.length} phone numbers assigned`;
    el.numberStatusDetail.textContent = activeNumbers
      .map((number) => [number.phoneNumber, number.numberType && number.numberType !== "regular" ? number.numberType : null].filter(Boolean).join(" · "))
      .join(", ");
  } else {
    el.numberStatusTitle.textContent = "No phone number assigned";
    el.numberStatusDetail.textContent = "Assign a phone number before live calls and outbound qualification.";
  }
}

async function loadSettings() {
  const response = await fetch("/api/settings");
  const settings = await response.json();
  el.voiceName.value = settings.voiceName;
  el.language.value = languageParam || settings.language || "English";
  el.agentName.value = agentNameParam || settings.agentName || "Alex";
}

async function loadPhoneStatus() {
  if (!el.businessName.value.trim() || el.businessName.value.trim() === "Business Name") return;
  const query = new URLSearchParams({ business_name: el.businessName.value.trim() });
  if (el.website.value.trim()) query.set("website", el.website.value.trim());
  const data = await apiJson(`/api/business-phone-status?${query}`);
  renderNumberStatus(data.phoneNumbers || []);
}

async function saveSettings() {
  await saveBusinessConfig();
  setStatus("Settings saved");
}

function adminIdentity() {
  return {
    businessName: el.businessName.value.trim(),
    website: el.website.value.trim(),
  };
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(businessDisplayText(data.error || "Request failed"));
  return data;
}

function setAdminStatus(text, isError = false) {
  el.adminStatus.textContent = businessDisplayText(text);
  el.adminStatus.style.color = isError ? "var(--danger)" : "";
}

function input(className, value = "", type = "text") {
  const node = document.createElement("input");
  node.className = className;
  node.type = type;
  node.value = value ?? "";
  return node;
}

function select(className, options, value) {
  const node = document.createElement("select");
  node.className = className;
  for (const [optionValue, label] of options) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = label;
    node.appendChild(option);
  }
  node.value = value;
  return node;
}

function rowButton(action, label, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;
  button.textContent = label;
  if (danger) button.className = "danger-button";
  return button;
}

function appointmentCode(id) {
  return `APT-${String(id).padStart(6, "0")}`;
}

function appointmentField(label, value, href) {
  if (value === null || value === undefined || value === "") return null;
  const field = document.createElement("div");
  field.className = "appointment-field";
  const fieldLabel = document.createElement("span");
  fieldLabel.className = "appointment-field-label";
  fieldLabel.textContent = label;
  const fieldValue = href ? document.createElement("a") : document.createElement("span");
  fieldValue.className = "appointment-field-value";
  fieldValue.textContent = String(value);
  if (href) fieldValue.href = href;
  field.append(fieldLabel, fieldValue);
  return field;
}

function intakeLabel(fieldKey) {
  const configuredField = state.admin?.intakeFields?.find((field) => field.fieldKey === fieldKey);
  if (configuredField?.label) return configuredField.label;
  return String(fieldKey)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function calendarDateKey(value, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function calendarDayLabel(value, timezone) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function calendarTimeLabel(value, timezone) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function calendarDateTimeLocal(value, timezone) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || el.calendarTimezone.value || "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const data = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${data.year}-${data.month}-${data.day}T${data.hour}:${data.minute}`;
}

function resetAppointmentForm() {
  el.appointmentId.value = "";
  el.appointmentCustomerName.value = "";
  el.appointmentPhone.value = "";
  el.appointmentEmail.value = "";
  el.appointmentStart.value = "";
  el.appointmentReason.value = "";
  el.appointmentStatus.value = "confirmed";
  el.appointmentSendSummary.checked = true;
  el.saveAppointmentButton.textContent = "Save appointment";
}

function fillAppointmentForm(appointment, timezone) {
  el.appointmentId.value = appointment.id || "";
  el.appointmentCustomerName.value = appointment.customerName || "";
  el.appointmentPhone.value = appointment.phone || "";
  el.appointmentEmail.value = appointment.email || "";
  el.appointmentStart.value = calendarDateTimeLocal(appointment.scheduledStart || appointment.requestedAt, timezone);
  el.appointmentReason.value = appointment.reason || "";
  el.appointmentStatus.value = appointment.status === "requested" ? "requested" : "confirmed";
  el.appointmentSendSummary.checked = false;
  el.saveAppointmentButton.textContent = "Update appointment";
}

function appointmentPayload() {
  return {
    ...adminIdentity(),
    customerName: el.appointmentCustomerName.value.trim(),
    phone: el.appointmentPhone.value.trim(),
    email: el.appointmentEmail.value.trim(),
    start: el.appointmentStart.value,
    reason: el.appointmentReason.value.trim(),
    status: el.appointmentStatus.value,
    durationMinutes: Number(el.slotDuration.value || 30),
    sendSummary: el.appointmentSendSummary.checked,
  };
}

function renderSchedule(data) {
  const days = new Map();
  const addItem = (dateKey, item) => {
    if (!days.has(dateKey)) days.set(dateKey, []);
    days.get(dateKey).push(item);
  };

  for (const slot of data.slots) {
    addItem(slot.date || calendarDateKey(slot.start, data.timezone), {
      type: "available",
      start: slot.start,
      label: calendarTimeLabel(slot.start, data.timezone),
    });
  }
  for (const appointment of data.appointments) {
    if (!appointment.scheduledStart) continue;
    addItem(calendarDateKey(appointment.scheduledStart, data.timezone), {
      type: appointment.status === "confirmed" ? "booked" : "requested",
      start: appointment.scheduledStart,
      label: calendarTimeLabel(appointment.scheduledStart, data.timezone),
      appointment,
    });
  }

  el.availableSlots.innerHTML = "";
  for (const [dateKey, items] of [...days.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const day = document.createElement("section");
    day.className = "slot-day";
    const heading = document.createElement("h4");
    heading.textContent = calendarDayLabel(items[0].start, data.timezone);
    const grid = document.createElement("div");
    grid.className = "slot-day-grid";

    for (const item of items.sort((left, right) => new Date(left.start) - new Date(right.start))) {
      const square = document.createElement(item.type === "available" ? "button" : "div");
      square.className = `slot ${item.type}`;
      if (square instanceof HTMLButtonElement) {
        square.type = "button";
        square.dataset.action = "select-slot";
        square.dataset.start = item.start;
      }
      const time = document.createElement("strong");
      time.textContent = item.label;
      const detail = document.createElement("span");
      detail.textContent = item.appointment
        ? `${item.type === "booked" ? "Booked" : "Requested"} · ${item.appointment.customerName}`
        : "Available";
      square.append(time, detail);
      if (item.appointment) {
        square.title = `${appointmentCode(item.appointment.id)} - ${item.appointment.customerName}`;
      } else {
        square.title = item.start;
      }
      grid.appendChild(square);
    }
    day.append(heading, grid);
    el.availableSlots.appendChild(day);
  }
  if (!days.size) el.availableSlots.textContent = "No schedule entries in this range.";
}

function renderIntakeFields(fields) {
  el.intakeList.innerHTML = "";
  for (const field of fields) {
    const row = document.createElement("div");
    row.className = "data-row intake-row";
    row.dataset.id = field.id;
    row.append(
      input("row-label", field.label),
      input("row-key", field.fieldKey),
      select(
        "row-type",
        [
          ["text", "Text"],
          ["phone", "Phone"],
          ["email", "Email"],
          ["date", "Date"],
          ["time", "Time"],
          ["select", "Dropdown"],
        ],
        field.fieldType,
      ),
      input("row-options", (field.options || []).join(", ")),
    );
    const required = document.createElement("label");
    required.className = "check-label";
    const checkbox = input("row-required", "", "checkbox");
    checkbox.checked = field.required;
    required.append(checkbox, "Required");
    row.append(required, rowButton("save-intake", "Save"), rowButton("delete-intake", "Delete", true));
    el.intakeList.appendChild(row);
  }
}

function renderKnowledge(entries) {
  el.knowledgeList.innerHTML = "";
  for (const entry of entries) {
    const row = document.createElement("div");
    row.className = "data-row knowledge-row";
    row.dataset.id = entry.id;
    row.append(
      input("row-question", entry.question),
      input("row-answer", entry.answer),
      input("row-category", entry.category || ""),
      rowButton("save-knowledge", "Save"),
      rowButton("delete-knowledge", "Delete", true),
    );
    el.knowledgeList.appendChild(row);
  }
}

function renderPrices(entries) {
  el.pricesList.innerHTML = "";
  for (const entry of entries) {
    const row = document.createElement("div");
    row.className = "data-row price-row";
    row.dataset.id = entry.id;
    row.append(
      input("row-item", entry.item),
      input("row-description", entry.description || ""),
      select(
        "row-price-type",
        [
          ["fixed", "Fixed"],
          ["range", "Range"],
          ["starting_at", "Starting at"],
          ["call_for_quote", "Call for quote"],
        ],
        entry.priceType,
      ),
      input("row-min", entry.amountMin ?? "", "number"),
      input("row-max", entry.amountMax ?? "", "number"),
      input("row-currency", entry.currency || "USD"),
      input("row-category", entry.category || ""),
      rowButton("save-price", "Save"),
      rowButton("delete-price", "Delete", true),
    );
    el.pricesList.appendChild(row);
  }
}

function renderReviewLinks(entries = [], profile = null) {
  el.reviewLinkList.innerHTML = "";
  if (profile?.cacheKey) {
    el.reviewDirectoryLink.hidden = false;
    el.reviewDirectoryLink.href = `/reviews/${encodeURIComponent(profile.cacheKey)}/`;
  } else {
    el.reviewDirectoryLink.hidden = true;
  }
  for (const entry of entries) {
    const row = document.createElement("div");
    row.className = "data-row review-link-row";
    row.dataset.id = entry.id;
    const active = document.createElement("label");
    active.className = "check-label";
    const activeInput = input("row-active", "", "checkbox");
    activeInput.checked = entry.active !== false;
    active.append(activeInput, "Active");
    row.append(
      input("row-service-name", entry.serviceName),
      input("row-review-url", entry.reviewUrl, "url"),
      input("row-sort-order", entry.sortOrder ?? 0, "number"),
      active,
      rowButton("save-review-link", "Save"),
      rowButton("delete-review-link", "Delete", true),
    );
    el.reviewLinkList.appendChild(row);
  }
  if (!entries.length) el.reviewLinkList.textContent = "No review services yet. Add Google, Yelp, Facebook, or another review page.";
}

function renderTransferTargets(entries = []) {
  el.transferTargetList.innerHTML = "";
  for (const entry of entries) {
    const row = document.createElement("div");
    row.className = "data-row transfer-target-row";
    row.dataset.id = entry.id;
    const active = document.createElement("label");
    active.className = "check-label";
    const activeInput = input("row-active", "", "checkbox");
    activeInput.checked = entry.active !== false;
    active.append(activeInput, "Active");
    row.append(
      input("row-label", entry.label),
      input("row-phone", entry.phone, "tel"),
      input("row-description", entry.description || ""),
      input("row-sort-order", entry.sortOrder ?? 0, "number"),
      active,
      rowButton("save-transfer-target", "Save"),
      rowButton("delete-transfer-target", "Delete", true),
    );
    el.transferTargetList.appendChild(row);
  }
  if (!entries.length) {
    el.transferTargetList.textContent = "No transfer destinations yet. Add a manager, dispatch line, sales team, or other human contact.";
  }
}

function renderAvailability(rules) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  el.availabilityRules.innerHTML = "";
  for (const rule of rules) {
    const day = document.createElement("div");
    day.className = "availability-day";
    day.dataset.day = rule.dayOfWeek;
    const enabledLabel = document.createElement("label");
    const enabled = input("rule-enabled", "", "checkbox");
    enabled.checked = rule.enabled;
    enabledLabel.append(enabled, dayNames[rule.dayOfWeek]);
    const times = document.createElement("div");
    times.className = "availability-times";
    times.append(input("rule-start", rule.startTime, "time"), input("rule-end", rule.endTime, "time"));
    day.append(enabledLabel, times);
    el.availabilityRules.appendChild(day);
  }
}

function applyAdminData(data) {
  state.admin = data.config;
  renderNumberStatus(data.phoneNumbers || data.profile.voiceNumbers || []);
  const raw = data.profile.rawData || {};
  el.profileBusinessName.value = data.profile.businessName || "";
  el.profileWebsite.value = data.profile.website || "";
  el.profileSummary.value = data.profile.summary || "";
  el.profileHoursInput.value = data.profile.hours || "";
  el.profileServiceArea.value = data.profile.serviceArea || "";
  el.profileServicesInput.value = data.profile.services || "";
  el.profilePhone.value = raw.phone === "unknown" ? "" : raw.phone || "";
  el.profileEmail.value = raw.email === "unknown" ? "" : raw.email || "";
  el.profileAddress.value = raw.address === "unknown" ? "" : raw.address || "";
  el.profilePricing.value = raw.pricing === "unknown" ? "" : raw.pricing || "";
  el.profileBookingPolicy.value = raw.bookingPolicy === "unknown" ? "" : raw.bookingPolicy || "";
  el.profileFaq.value = JSON.stringify(raw.faq || [], null, 2);
  el.voiceName.value = data.config.voiceName || el.voiceName.value || "Puck";
  el.language.value = languageParam || data.config.language || el.language.value || "English";
  el.agentName.value = agentNameParam || data.config.agentName || el.agentName.value || "Alex";
  el.extraInstructions.value = data.config.extraInstructions || "";
  el.qualificationEnabled.checked = data.config.qualificationEnabled !== false;
  el.qualificationLaunchMode.value = data.config.qualificationLaunchMode || "approval";
  el.qualificationInstructions.value = data.config.qualificationInstructions || "";
  el.qualificationDelayMinSeconds.value = data.config.qualificationDelayMinSeconds ?? 30;
  el.qualificationDelayMaxSeconds.value = data.config.qualificationDelayMaxSeconds ?? 100;
  el.qualificationMaxAttempts.value = data.config.qualificationMaxAttempts || 3;
  el.qualificationRetryDelayMinutes.value = data.config.qualificationRetryDelayMinutes || 120;
  el.leadWebhookDedupeWindowHours.value = data.config.leadWebhookDedupeWindowHours ?? 24;
  el.reviewRequestsEnabled.checked = Boolean(data.config.reviewRequestsEnabled);
  el.reviewLink.value = data.config.reviewLink || "";
  el.managerNotificationPhone.value = data.config.managerNotificationPhone || "";
  el.reviewPromptInstructions.value = data.config.reviewPromptInstructions || "";
  el.reviewRequestTemplate.value = data.config.reviewRequestTemplate || "";
  el.complaintRecoveryInstructions.value = data.config.complaintRecoveryInstructions || "";
  el.complaintEscalationTemplate.value = data.config.complaintEscalationTemplate || "";
  el.missedCallFollowupTemplate.value = data.config.missedCallFollowupTemplate || "";
  el.appointmentReminderTemplate.value = data.config.appointmentReminderTemplate || "";
  el.appointmentMode.value = data.config.appointmentMode;
  el.slotDuration.value = data.config.slotDurationMinutes;
  el.bufferMinutes.value = data.config.bufferMinutes;
  el.calendarTimezone.value = data.config.timezone;
  renderIntakeFields(data.config.intakeFields);
  renderKnowledge(data.config.knowledgeEntries);
  renderPrices(data.config.priceEntries);
  renderReviewLinks(data.reviewLinks || [], data.profile);
  renderTransferTargets(data.config.transferTargets || []);
  renderAvailability(data.config.availabilityRules);
  setAdminStatus(`Loaded for ${data.profile.businessName}`);
}

async function saveBusinessProfile() {
  setAdminStatus("Saving");
  const data = await apiJson("/api/business-admin/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...adminIdentity(),
      profileBusinessName: el.profileBusinessName.value,
      profileWebsite: el.profileWebsite.value,
      summary: el.profileSummary.value,
      hours: el.profileHoursInput.value,
      serviceArea: el.profileServiceArea.value,
      services: el.profileServicesInput.value,
      phone: el.profilePhone.value,
      email: el.profileEmail.value,
      address: el.profileAddress.value,
      pricing: el.profilePricing.value,
      bookingPolicy: el.profileBookingPolicy.value,
      faq: el.profileFaq.value,
    }),
  });
  state.businessName = data.profile.businessName;
  state.website = data.profile.website || "";
  el.businessName.value = state.businessName;
  el.website.value = state.website;
  setTitle();
  updateProfile(data.profile, true);
  applyAdminData(data);
  setAdminStatus("Saved");
}

async function loadBusinessAdmin() {
  if (!el.businessName.value.trim() || el.businessName.value.trim() === "Business Name") {
    setAdminStatus("Enter a business name");
    return;
  }
  setAdminStatus("Loading");
  const query = new URLSearchParams({ business_name: el.businessName.value.trim() });
  if (el.website.value.trim()) query.set("website", el.website.value.trim());
  const data = await apiJson(`/api/business-admin?${query}`);
  applyAdminData(data);
  await loadCalendar();
}

function availabilityPayload() {
  return Array.from(el.availabilityRules.querySelectorAll(".availability-day")).map((day) => ({
    dayOfWeek: Number(day.dataset.day),
    enabled: day.querySelector(".rule-enabled").checked,
    startTime: day.querySelector(".rule-start").value,
    endTime: day.querySelector(".rule-end").value,
  }));
}

async function saveBusinessConfig() {
  const payload = {
    ...adminIdentity(),
    extraInstructions: el.extraInstructions.value,
    qualificationEnabled: el.qualificationEnabled.checked,
    qualificationLaunchMode: el.qualificationLaunchMode.value,
    qualificationInstructions: el.qualificationInstructions.value,
    qualificationDelayMinSeconds: Number(el.qualificationDelayMinSeconds.value || 0),
    qualificationDelayMaxSeconds: Number(el.qualificationDelayMaxSeconds.value || 0),
    qualificationMaxAttempts: Number(el.qualificationMaxAttempts.value || 3),
    qualificationRetryDelayMinutes: Number(el.qualificationRetryDelayMinutes.value || 120),
    leadWebhookDedupeWindowHours: Number(el.leadWebhookDedupeWindowHours.value || 0),
    reviewRequestsEnabled: el.reviewRequestsEnabled.checked,
    reviewLink: el.reviewLink.value,
    managerNotificationPhone: el.managerNotificationPhone.value,
    reviewPromptInstructions: el.reviewPromptInstructions.value,
    reviewRequestTemplate: el.reviewRequestTemplate.value,
    complaintRecoveryInstructions: el.complaintRecoveryInstructions.value,
    complaintEscalationTemplate: el.complaintEscalationTemplate.value,
    missedCallFollowupTemplate: el.missedCallFollowupTemplate.value,
    appointmentReminderTemplate: el.appointmentReminderTemplate.value,
    appointmentMode: el.appointmentMode.value,
    slotDurationMinutes: Number(el.slotDuration.value || 30),
    bufferMinutes: Number(el.bufferMinutes.value || 0),
    timezone: el.calendarTimezone.value.trim() || "America/Chicago",
    voiceName: el.voiceName.value,
    language: el.language.value,
    agentName: el.agentName.value.trim() || "Alex",
    availabilityRules: availabilityPayload(),
  };
  const data = await apiJson("/api/business-admin/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  applyAdminData(data);
  await loadCalendar();
  setAdminStatus("Saved");
}

async function mutateAdmin(url, method, payload) {
  setAdminStatus("Saving");
  const data = await apiJson(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...adminIdentity(), ...payload }),
  });
  applyAdminData(data);
  return data;
}

async function importAdmin(type, file) {
  if (!file) throw new Error("Choose a CSV or XLSX file first");
  const formData = new FormData();
  const identity = adminIdentity();
  formData.append("businessName", identity.businessName);
  formData.append("website", identity.website);
  formData.append("file", file);
  setAdminStatus("Importing");
  const data = await apiJson(`/api/business-admin/import/${type}`, { method: "POST", body: formData });
  applyAdminData(data);
  setAdminStatus(`Imported ${data.imported} rows`);
}

async function loadCalendar() {
  if (!state.admin) return;
  const query = new URLSearchParams({ business_name: el.businessName.value.trim(), days: "14" });
  if (el.website.value.trim()) query.set("website", el.website.value.trim());
  const data = await apiJson(`/api/business-admin/calendar?${query}`);
  renderSchedule(data);

  el.bookedAppointments.innerHTML = "";
  for (const appointment of data.appointments) {
    const row = document.createElement("div");
    row.className = "data-row appointment-row";
    const start = appointment.scheduledStart ? new Date(appointment.scheduledStart).toLocaleString() : appointment.requestedAt;

    const summary = document.createElement("div");
    summary.className = "appointment-summary";
    const code = document.createElement("strong");
    code.textContent = appointmentCode(appointment.id);
    const status = document.createElement("span");
    status.className = `appointment-status ${appointment.status || "requested"}`;
    status.textContent = appointment.status || "requested";
    summary.append(code, status);

    const details = document.createElement("div");
    details.className = "appointment-details";
    const fields = [
      appointmentField("Date and time", start),
      appointmentField("Customer", appointment.customerName),
      appointmentField("Phone", appointment.phone, appointment.phone ? `tel:${appointment.phone}` : null),
      appointmentField("Email", appointment.email, appointment.email ? `mailto:${appointment.email}` : null),
      appointmentField("Reason", appointment.reason),
    ];

    const builtInKeys = new Set(["name", "customer_name", "phone", "email", "reason"]);
    for (const [key, value] of Object.entries(appointment.intakeData || {})) {
      if (!builtInKeys.has(key.toLowerCase())) fields.push(appointmentField(intakeLabel(key), value));
    }
    details.append(...fields.filter(Boolean));
    const actions = document.createElement("div");
    actions.className = "appointment-actions";
    const reminder = document.createElement("button");
    reminder.type = "button";
    reminder.dataset.action = "send-appointment-reminder";
    reminder.dataset.id = appointment.id;
    reminder.disabled = !appointment.phone;
    reminder.textContent = "Send reminder";
    const summaryButton = document.createElement("button");
    summaryButton.type = "button";
    summaryButton.dataset.action = "send-appointment-summary";
    summaryButton.dataset.id = appointment.id;
    summaryButton.disabled = !appointment.phone && !appointment.email;
    summaryButton.textContent = "Send summary";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.dataset.action = "edit-appointment";
    editButton.dataset.appointment = JSON.stringify(appointment);
    editButton.textContent = "Edit";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.dataset.action = "cancel-appointment";
    cancelButton.dataset.id = appointment.id;
    cancelButton.className = "danger-button";
    cancelButton.disabled = appointment.status === "cancelled";
    cancelButton.textContent = "Cancel";
    actions.append(reminder, summaryButton, editButton, cancelButton);
    row.append(summary, details, actions);
    el.bookedAppointments.appendChild(row);
  }
  if (!data.appointments.length) el.bookedAppointments.textContent = "No booked appointments in this range.";
}

async function sendAppointmentReminder(button) {
  const appointmentId = button.dataset.id;
  if (!appointmentId) throw new Error("Appointment was not found");
  setAdminStatus("Sending appointment reminder");
  await apiJson(`/api/business-admin/appointments/${appointmentId}/reminder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminIdentity()),
  });
  await Promise.all([loadMessages(), loadUsage()]);
  setAdminStatus("Appointment reminder sent");
}

async function saveManualAppointment() {
  const payload = appointmentPayload();
  const id = el.appointmentId.value;
  if (!payload.customerName || !payload.start) throw new Error("Customer name and appointment time are required");
  setAdminStatus(id ? "Updating appointment" : "Booking appointment");
  await apiJson(id ? `/api/business-admin/appointments/${id}` : "/api/business-admin/appointments", {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  resetAppointmentForm();
  await Promise.all([loadCalendar(), loadMessages(), loadUsage()]);
  setAdminStatus(id ? "Appointment updated" : "Appointment booked");
}

async function cancelAppointment(button) {
  const appointmentId = button.dataset.id;
  if (!appointmentId) throw new Error("Appointment was not found");
  setAdminStatus("Cancelling appointment");
  await apiJson(`/api/business-admin/appointments/${appointmentId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...adminIdentity(), sendSummary: true }),
  });
  await Promise.all([loadCalendar(), loadMessages(), loadUsage()]);
  setAdminStatus("Appointment cancelled");
}

async function sendAppointmentSummary(button) {
  const appointmentId = button.dataset.id;
  if (!appointmentId) throw new Error("Appointment was not found");
  setAdminStatus("Sending appointment summary");
  await apiJson(`/api/business-admin/appointments/${appointmentId}/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminIdentity()),
  });
  await Promise.all([loadMessages(), loadUsage()]);
  setAdminStatus("Appointment summary sent");
}

async function addReviewLink() {
  const payload = {
    ...adminIdentity(),
    serviceName: el.reviewServiceName.value.trim(),
    reviewUrl: el.reviewServiceUrl.value.trim(),
    sortOrder: Number(el.reviewServiceSort.value || 0),
    active: true,
  };
  setAdminStatus("Saving review service");
  const data = await apiJson("/api/business-admin/review-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  applyAdminData(data);
  el.reviewServiceName.value = "";
  el.reviewServiceUrl.value = "";
  el.reviewServiceSort.value = "";
  setAdminStatus("Review service added");
}

async function saveReviewLink(row) {
  const data = await apiJson(`/api/business-admin/review-links/${row.dataset.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...adminIdentity(),
      serviceName: row.querySelector(".row-service-name").value,
      reviewUrl: row.querySelector(".row-review-url").value,
      sortOrder: Number(row.querySelector(".row-sort-order").value || 0),
      active: row.querySelector(".row-active").checked,
    }),
  });
  applyAdminData(data);
  setAdminStatus("Review service saved");
}

async function deleteReviewLink(row) {
  const data = await apiJson(`/api/business-admin/review-links/${row.dataset.id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminIdentity()),
  });
  applyAdminData(data);
  setAdminStatus("Review service deleted");
}

async function addTransferTarget() {
  const payload = {
    ...adminIdentity(),
    label: el.transferLabel.value.trim(),
    phone: el.transferPhone.value.trim(),
    description: el.transferDescription.value.trim(),
    sortOrder: Number(el.transferSortOrder.value || 0),
    active: el.transferActive.checked,
  };
  setAdminStatus("Saving transfer destination");
  const data = await apiJson("/api/business-admin/transfer-targets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  applyAdminData(data);
  el.transferLabel.value = "";
  el.transferPhone.value = "";
  el.transferDescription.value = "";
  el.transferSortOrder.value = "";
  el.transferActive.checked = true;
  setAdminStatus("Transfer destination added");
}

async function saveTransferTarget(row) {
  const data = await apiJson(`/api/business-admin/transfer-targets/${row.dataset.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...adminIdentity(),
      label: row.querySelector(".row-label").value,
      phone: row.querySelector(".row-phone").value,
      description: row.querySelector(".row-description").value,
      sortOrder: Number(row.querySelector(".row-sort-order").value || 0),
      active: row.querySelector(".row-active").checked,
    }),
  });
  applyAdminData(data);
  setAdminStatus("Transfer destination saved");
}

async function deleteTransferTarget(row) {
  const data = await apiJson(`/api/business-admin/transfer-targets/${row.dataset.id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminIdentity()),
  });
  applyAdminData(data);
  setAdminStatus("Transfer destination deleted");
}

const crmStatusOptions = ["new", "qualified", "unqualified", "callback", "appointment", "transferred", "unreachable"];

function qualificationStatusLabel(status) {
  const value = String(status || "");
  if (value === "dispatching") return "queued";
  return value || "unknown";
}

function crmField(label, value, href = null) {
  if (!value) return null;
  const wrap = document.createElement("div");
  wrap.className = "crm-field";
  const key = document.createElement("span");
  key.textContent = label;
  const val = href ? document.createElement("a") : document.createElement("strong");
  val.textContent = value;
  if (href) val.href = href;
  wrap.append(key, val);
  return wrap;
}

function miniRow(parts) {
  const row = document.createElement("div");
  row.className = "mini-row";
  row.textContent = parts.filter(Boolean).join(" · ");
  return row;
}

function crmEventDetail(detail) {
  if (!detail || typeof detail !== "object") return "";
  return [
    detail.stage,
    detail.message,
    detail.reason,
    detail.cause,
    detail.status,
    detail.sipCode ? `sip ${detail.sipCode}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function crmInsight(lead) {
  const fields = lead.extractedFields && typeof lead.extractedFields === "object" ? lead.extractedFields : {};
  return fields.postCallAi || fields.callSummary?.fallbackInsight || fields.callSummary || fields.callTranscript || {};
}

function renderCrm(leads) {
  el.crmList.innerHTML = "";
  for (const lead of leads) {
    const card = document.createElement("details");
    card.className = `crm-card status-${lead.status || "new"}`;
    card.dataset.id = lead.id;

    const summary = document.createElement("summary");
    const title = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = lead.name || lead.phone || "Unknown lead";
    const sub = document.createElement("span");
    sub.textContent = [lead.need, lead.phone, lead.email].filter(Boolean).join(" · ") || lead.source || "No details yet";
    title.append(name, sub);
    const badge = document.createElement("span");
    badge.className = "crm-status-badge";
    badge.textContent = lead.status || "new";
    summary.append(title, badge);

    const body = document.createElement("div");
    body.className = "crm-body";
    const grid = document.createElement("div");
    grid.className = "crm-detail-grid";
    const call = lead.voiceCall;
    const started = call?.startedAt ? new Date(call.startedAt).toLocaleString() : null;
    const insight = crmInsight(lead);
    const duration = call?.metrics?.durationSeconds ? `${call.metrics.durationSeconds}s` : null;
    const latestFeedback = lead.feedback?.[0] || null;
    grid.append(
      ...[
        crmField("Source", lead.source),
        crmField("Created", new Date(lead.createdAt).toLocaleString()),
        crmField("Updated", new Date(lead.updatedAt).toLocaleString()),
        crmField("Call", call ? `${call.status}${call.hangupCause ? ` · ${call.hangupCause}` : ""}` : null),
        crmField("Call time", started),
        crmField("Duration", duration),
        crmField("From", call?.fromNumber || lead.phone, call?.fromNumber || lead.phone ? `tel:${call?.fromNumber || lead.phone}` : null),
        crmField("To", call?.toNumber),
        crmField("Recording", call?.recordingUrl ? "Open recording" : null, call?.recordingUrl || null),
        crmField("Outcome", insight.outcome),
        crmField("Urgency", insight.urgency),
        crmField("Satisfaction", insight.satisfaction),
        crmField("Next step", insight.nextStep),
        crmField("Feedback", latestFeedback ? `${latestFeedback.sentiment} · ${latestFeedback.status}` : null),
        crmField("Review sent", latestFeedback?.reviewRequestedAt ? new Date(latestFeedback.reviewRequestedAt).toLocaleString() : null),
        crmField("Complaint escalated", latestFeedback?.complaintEscalatedAt ? new Date(latestFeedback.complaintEscalatedAt).toLocaleString() : null),
      ].filter(Boolean),
    );
    const qualificationCalls = lead.qualificationCalls || [];
    const latestQualification = qualificationCalls[0] || null;
    if (latestQualification) {
      grid.append(
        ...[
          crmField(
            "Qualification",
            `${qualificationStatusLabel(latestQualification.status)}${latestQualification.resultStatus ? ` · ${latestQualification.resultStatus}` : ""}`,
          ),
          crmField("Qualified from", latestQualification.fromNumber),
          crmField("Qualified to", latestQualification.toNumber),
          crmField("Attempt", String(latestQualification.attemptNumber || 1)),
          latestQualification.scheduledFor ? crmField("Next qualification", new Date(latestQualification.scheduledFor).toLocaleString()) : null,
          latestQualification.lastError ? crmField("Qualification note", latestQualification.lastError) : null,
        ].filter(Boolean),
      );
    }

    const editor = document.createElement("div");
    editor.className = "crm-lead-editor";
    editor.innerHTML = `
      <label>Name<input class="crm-row-name" /></label>
      <label>Phone<input class="crm-row-phone" /></label>
      <label>Email<input class="crm-row-email" /></label>
      <label>Need<input class="crm-row-need" /></label>
      <label>Status<select class="crm-row-status"></select></label>
      <label class="wide-field">Notes<textarea class="crm-row-notes" rows="3"></textarea></label>
      <label>Feedback<select class="crm-row-feedback-sentiment"><option value="happy">Happy</option><option value="neutral">Neutral</option><option value="unhappy">Unhappy</option><option value="unknown">Unknown</option></select></label>
      <label>Rating<input class="crm-row-feedback-rating" type="number" min="1" max="5" step="1" /></label>
      <label class="wide-field">Feedback / complaint<textarea class="crm-row-feedback-text" rows="3"></textarea></label>
      <label class="wide-field">Extracted fields JSON<textarea class="crm-row-fields" rows="4"></textarea></label>
      <button data-action="save-crm" type="button">Save lead</button>
      <button data-action="record-feedback" type="button">Record feedback</button>
      <button data-action="qualify-crm" type="button">Call and qualify</button>
      <button data-action="retry-qualification" type="button">Retry queue</button>
      <button data-action="pause-qualification" type="button">Pause qualification</button>
      <button data-action="cancel-qualification" type="button">Cancel queue</button>
      <button data-action="send-review" type="button">Send review</button>
      <button data-action="send-missed-followup" type="button">Send follow-up</button>
      <button data-action="escalate-complaint" type="button">Escalate complaint</button>
    `;
    editor.querySelector(".crm-row-name").value = lead.name || "";
    editor.querySelector(".crm-row-phone").value = lead.phone || "";
    editor.querySelector(".crm-row-email").value = lead.email || "";
    editor.querySelector(".crm-row-need").value = lead.need || "";
    editor.querySelector(".crm-row-notes").value = lead.notes || "";
    editor.querySelector(".crm-row-feedback-sentiment").value = latestFeedback?.sentiment || insight.satisfaction || "happy";
    editor.querySelector(".crm-row-feedback-rating").value = latestFeedback?.rating || "";
    editor.querySelector(".crm-row-feedback-text").value = latestFeedback?.feedbackText || "";
    editor.querySelector(".crm-row-fields").value = JSON.stringify(lead.extractedFields || {}, null, 2);
    const statusSelect = editor.querySelector(".crm-row-status");
    for (const status of crmStatusOptions) {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status[0].toUpperCase() + status.slice(1);
      option.selected = status === (lead.status || "new");
      statusSelect.appendChild(option);
    }

    const summaryText = lead.summary || call?.transcript?.split("\n").slice(0, 3).join("\n") || "No summary yet.";
    const summaryBlock = document.createElement("p");
    summaryBlock.className = "crm-summary";
    summaryBlock.textContent = summaryText;

    const transcriptText = lead.transcript || call?.transcript || "";
    if (transcriptText) {
      const transcript = document.createElement("pre");
      transcript.className = "transcript crm-transcript";
      transcript.textContent = transcriptText;
      body.append(grid, summaryBlock, editor, transcript);
    } else {
      body.append(grid, summaryBlock, editor);
    }
    if (qualificationCalls.length) {
      const attempts = document.createElement("div");
      attempts.className = "qualification-attempts";
      const heading = document.createElement("strong");
      heading.textContent = "Qualification attempts";
      attempts.appendChild(heading);
      for (const attempt of qualificationCalls) {
        const row = document.createElement("div");
        row.className = "qualification-attempt";
        row.textContent = [
          `#${attempt.attemptNumber || 1}`,
          qualificationStatusLabel(attempt.status),
          attempt.resultStatus,
          attempt.startedAt ? `started ${new Date(attempt.startedAt).toLocaleString()}` : null,
          attempt.answeredAt ? `answered ${new Date(attempt.answeredAt).toLocaleString()}` : null,
          attempt.endedAt ? `ended ${new Date(attempt.endedAt).toLocaleString()}` : null,
          attempt.scheduledFor ? `scheduled ${new Date(attempt.scheduledFor).toLocaleString()}` : null,
          attempt.createdAt ? new Date(attempt.createdAt).toLocaleString() : null,
          attempt.lastError,
        ]
          .filter(Boolean)
          .join(" · ");
        attempts.appendChild(row);
      }
      body.appendChild(attempts);
    }
    if (lead.feedback?.length) {
      const feedback = document.createElement("div");
      feedback.className = "qualification-attempts";
      const heading = document.createElement("strong");
      heading.textContent = "Feedback and recovery";
      feedback.appendChild(heading);
      for (const item of lead.feedback) {
        feedback.appendChild(
          miniRow([
            item.sentiment,
            item.status,
            item.feedbackText,
            item.reviewRequestedAt ? `review ${new Date(item.reviewRequestedAt).toLocaleString()}` : null,
            item.complaintEscalatedAt ? `escalated ${new Date(item.complaintEscalatedAt).toLocaleString()}` : null,
            item.messageDeliveries?.length ? `${item.messageDeliveries[0].provider} ${item.messageDeliveries[0].status}` : null,
          ]),
        );
      }
      body.appendChild(feedback);
    }
    if (lead.leadWebhookEvents?.length || lead.messageDeliveries?.length || lead.inboundMessages?.length || call?.events?.length) {
      const timeline = document.createElement("div");
      timeline.className = "qualification-attempts";
      const heading = document.createElement("strong");
      heading.textContent = "Timeline";
      timeline.appendChild(heading);
      for (const event of call?.events || []) {
        timeline.appendChild(
          miniRow([
            "Call",
            event.eventType,
            crmEventDetail(event.detail),
            event.createdAt ? new Date(event.createdAt).toLocaleString() : null,
          ]),
        );
      }
      for (const event of lead.leadWebhookEvents || []) {
        timeline.appendChild(miniRow(["Webhook", event.status, event.createdAt ? new Date(event.createdAt).toLocaleString() : null]));
      }
      for (const message of lead.messageDeliveries || []) {
        timeline.appendChild(miniRow(["Message", message.purpose, message.provider, message.status, message.error]));
      }
      for (const message of lead.inboundMessages || []) {
        timeline.appendChild(
          miniRow([
            "Reply",
            message.provider,
            message.status,
            message.fromPhone,
            message.text ? String(message.text).slice(0, 120) : null,
            message.createdAt ? new Date(message.createdAt).toLocaleString() : null,
          ]),
        );
      }
      body.appendChild(timeline);
    }
    card.append(summary, body);
    el.crmList.appendChild(card);
  }
  if (!leads.length) el.crmList.textContent = "No leads yet.";
}

function renderCrmStatusCounts(counts = {}) {
  el.crmStatusCounts.innerHTML = "";
  const total = crmStatusOptions.reduce((sum, status) => sum + Number(counts[status] || 0), 0);
  const all = document.createElement("button");
  all.type = "button";
  all.className = `status-pill ${el.crmStatusFilter.value ? "" : "active"}`;
  all.textContent = `all: ${total}`;
  all.addEventListener("click", () => {
    el.crmStatusFilter.value = "";
    runAdmin(loadCrm);
  });
  el.crmStatusCounts.appendChild(all);
  for (const status of crmStatusOptions) {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = `status-pill ${el.crmStatusFilter.value === status ? "active" : ""}`;
    pill.textContent = `${status}: ${counts[status] || 0}`;
    pill.addEventListener("click", () => {
      el.crmStatusFilter.value = status;
      runAdmin(loadCrm);
    });
    el.crmStatusCounts.appendChild(pill);
  }
}

function renderWebhookEvents(events = []) {
  el.crmWebhookEvents.innerHTML = "";
  for (const event of events) {
    el.crmWebhookEvents.appendChild(
      miniRow([
        event.status,
        event.lead ? `lead #${event.lead.id} ${event.lead.name}` : null,
        event.qualification?.started ? "qualification started" : event.qualification?.scheduled ? "qualification scheduled" : null,
        event.qualification?.error ? `qualification error: ${event.qualification.error}` : null,
        event.error,
        event.createdAt ? new Date(event.createdAt).toLocaleString() : null,
      ]),
    );
  }
  if (!events.length) el.crmWebhookEvents.textContent = "No webhook activity yet.";
}

function webhookSamplePayload() {
  return {
    name: "Jane Customer",
    phone: "+15551234567",
    email: "jane@example.com",
    service: "Lock replacement",
    source: "website-form-test",
    notes: "Needs service tomorrow morning",
  };
}

function resetWebhookTestPayload() {
  el.crmWebhookTestPayload.value = JSON.stringify(webhookSamplePayload(), null, 2);
  el.crmWebhookTestStatus.textContent = "";
}

async function loadLeadWebhook() {
  if (!state.admin) return;
  const query = new URLSearchParams({ business_name: el.businessName.value.trim() });
  if (el.website.value.trim()) query.set("website", el.website.value.trim());
  const data = await apiJson(`/api/business-admin/lead-webhook?${query}`);
  setLeadWebhookDocsUrl(data.webhookUrl || "");
  const accepted = data.acceptedFields?.join(", ") || "name, phone, email, service, source, notes";
  el.crmWebhookHelp.textContent = `Accepted fields: ${accepted}. POST JSON or form data.`;
  if (!el.crmWebhookTestPayload.value.trim()) {
    el.crmWebhookTestPayload.value = JSON.stringify(data.examplePayload || webhookSamplePayload(), null, 2);
  }
}

function setLeadWebhookDocsUrl(webhookUrl) {
  el.crmWebhookUrl.value = webhookUrl;
  el.crmWebhookDocsLink.href = `/lead-webhook-api.html?webhook_url=${encodeURIComponent(webhookUrl)}`;
}

async function loadWebhookEvents() {
  if (!state.admin) return;
  const query = new URLSearchParams({ business_name: el.businessName.value.trim() });
  if (el.website.value.trim()) query.set("website", el.website.value.trim());
  const data = await apiJson(`/api/business-admin/lead-webhook/events?${query}`);
  renderWebhookEvents(data.events || []);
}

async function loadCrm() {
  if (!state.admin) return;
  setAdminStatus("Loading leads");
  const query = new URLSearchParams({ business_name: el.businessName.value.trim() });
  if (el.website.value.trim()) query.set("website", el.website.value.trim());
  if (el.crmSearch.value.trim()) query.set("search", el.crmSearch.value.trim());
  if (el.crmStatusFilter.value) query.set("status", el.crmStatusFilter.value);
  const [data] = await Promise.all([apiJson(`/api/business-admin/crm?${query}`), loadLeadWebhook(), loadWebhookEvents()]);
  renderCrm(data.leads || []);
  renderCrmStatusCounts(data.statusCounts || {});
  setAdminStatus("Leads loaded");
}

async function copyLeadWebhook() {
  const value = el.crmWebhookUrl.value;
  if (!value) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
  } else {
    el.crmWebhookUrl.select();
    document.execCommand("copy");
  }
  setAdminStatus("Webhook URL copied");
}

async function rotateLeadWebhook() {
  const confirmed = window.confirm("Rotate this webhook URL? The old URL will stop accepting leads.");
  if (!confirmed) return;
  setAdminStatus("Rotating webhook URL");
  const data = await apiJson("/api/business-admin/lead-webhook/rotate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminIdentity()),
  });
  setLeadWebhookDocsUrl(data.webhookUrl || "");
  setAdminStatus("Webhook URL rotated");
}

async function sendWebhookTest() {
  setAdminStatus("Sending webhook test");
  el.crmWebhookTestStatus.textContent = "Sending";
  let payload;
  try {
    payload = JSON.parse(el.crmWebhookTestPayload.value || "{}");
  } catch (_error) {
    throw new Error("Webhook test payload must be valid JSON");
  }
  const data = await apiJson("/api/business-admin/lead-webhook/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...adminIdentity(), payload }),
  });
  el.crmWebhookTestStatus.textContent = data.duplicate
    ? `Duplicate lead #${data.leadId}`
    : data.leadId
      ? `Created lead #${data.leadId}`
      : data.status || "Done";
  await Promise.all([loadCrm(), loadWebhookEvents()]);
  setAdminStatus(data.duplicate ? "Webhook test detected duplicate" : "Webhook test accepted");
}

async function addCrmLead() {
  setAdminStatus("Saving lead");
  const data = await apiJson("/api/business-admin/crm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...adminIdentity(),
      name: el.crmName.value,
      phone: el.crmPhone.value,
      email: el.crmEmail.value,
      need: el.crmNeed.value,
      status: el.crmStatus.value,
    }),
  });
  el.crmName.value = "";
  el.crmPhone.value = "";
  el.crmEmail.value = "";
  el.crmNeed.value = "";
  await loadCrm();
  if (data.qualification?.started) {
    setAdminStatus("Lead saved and qualification call started");
  } else if (data.qualification?.scheduled) {
    setAdminStatus(`Lead saved. Qualification call scheduled in ${data.qualification.delaySeconds || "a few"} seconds`);
  } else if (data.qualification?.error) {
    setAdminStatus(`Lead saved. Qualification did not start: ${data.qualification.error}`, true);
  }
}

async function saveCrmLead(card) {
  setAdminStatus("Saving lead");
  await apiJson(`/api/business-admin/crm/${card.dataset.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...adminIdentity(),
      name: card.querySelector(".crm-row-name").value,
      phone: card.querySelector(".crm-row-phone").value,
      email: card.querySelector(".crm-row-email").value,
      need: card.querySelector(".crm-row-need").value,
      status: card.querySelector(".crm-row-status").value,
      notes: card.querySelector(".crm-row-notes").value,
      extractedFieldsJson: card.querySelector(".crm-row-fields").value,
    }),
  });
  await loadCrm();
}

async function startQualificationCall(card) {
  const phone = card.querySelector(".crm-row-phone").value.trim();
  if (!phone) throw new Error("Add a lead phone number before starting qualification");
  setAdminStatus("Starting qualification call");
  await apiJson(`/api/business-admin/crm/${card.dataset.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...adminIdentity(),
      name: card.querySelector(".crm-row-name").value,
      phone,
      email: card.querySelector(".crm-row-email").value,
      need: card.querySelector(".crm-row-need").value,
      status: card.querySelector(".crm-row-status").value,
      notes: card.querySelector(".crm-row-notes").value,
      extractedFieldsJson: card.querySelector(".crm-row-fields").value,
    }),
  });
  await apiJson(`/api/business-admin/crm/${card.dataset.id}/qualify-call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminIdentity()),
  });
  await loadCrm();
  setAdminStatus("Qualification call started");
}

async function retryQualification(card) {
  setAdminStatus("Queueing qualification retry");
  await apiJson(`/api/business-admin/crm/${card.dataset.id}/qualify-retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminIdentity()),
  });
  await loadCrm();
  setAdminStatus("Qualification retry queued");
}

async function cancelQualification(card) {
  setAdminStatus("Cancelling queued qualification");
  await apiJson(`/api/business-admin/crm/${card.dataset.id}/qualify-cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminIdentity()),
  });
  await loadCrm();
  setAdminStatus("Queued qualification cancelled");
}

async function pauseQualification(card) {
  setAdminStatus("Pausing qualification");
  await apiJson(`/api/business-admin/crm/${card.dataset.id}/qualify-pause`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminIdentity()),
  });
  await loadCrm();
  setAdminStatus("Qualification paused");
}

async function recordCustomerFeedback(card) {
  setAdminStatus("Recording feedback");
  await apiJson(`/api/business-admin/crm/${card.dataset.id}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...adminIdentity(),
      sentiment: card.querySelector(".crm-row-feedback-sentiment").value,
      rating: card.querySelector(".crm-row-feedback-rating").value,
      feedback: card.querySelector(".crm-row-feedback-text").value,
      phone: card.querySelector(".crm-row-phone").value,
      email: card.querySelector(".crm-row-email").value,
    }),
  });
  await loadCrm();
  setAdminStatus("Feedback recorded");
}

async function sendReviewRequest(card) {
  setAdminStatus("Sending review request");
  await apiJson(`/api/business-admin/crm/${card.dataset.id}/review-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...adminIdentity(),
      phone: card.querySelector(".crm-row-phone").value,
      rating: card.querySelector(".crm-row-feedback-rating").value,
      feedback: card.querySelector(".crm-row-feedback-text").value,
    }),
  });
  await Promise.all([loadCrm(), loadMessages(), loadUsage()]);
  setAdminStatus("Review request sent");
}

async function sendMissedFollowup(card) {
  setAdminStatus("Sending follow-up");
  await apiJson(`/api/business-admin/crm/${card.dataset.id}/missed-call-followup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...adminIdentity(),
      toPhone: card.querySelector(".crm-row-phone").value,
    }),
  });
  await Promise.all([loadCrm(), loadMessages(), loadUsage()]);
  setAdminStatus("Follow-up sent");
}

async function escalateComplaint(card) {
  const notes = card.querySelector(".crm-row-notes").value.trim();
  const need = card.querySelector(".crm-row-need").value.trim();
  const feedback = card.querySelector(".crm-row-feedback-text").value.trim();
  const complaint = feedback || notes || need || "Customer complaint requires management follow-up.";
  setAdminStatus("Escalating complaint");
  await apiJson(`/api/business-admin/crm/${card.dataset.id}/escalate-complaint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...adminIdentity(), complaint }),
  });
  await Promise.all([loadCrm(), loadMessages(), loadUsage()]);
  setAdminStatus("Complaint escalated");
}

function usefulContactName(value) {
  const text = String(value || "").trim();
  if (!text || /^unknown/i.test(text) || /^caller\s+\+?\d+/i.test(text)) return "";
  return text;
}

function messageContactName(message) {
  return (
    usefulContactName(message.lead?.name) ||
    usefulContactName(message.appointment?.customerName) ||
    usefulContactName(message.customerFeedback?.customerName) ||
    ""
  );
}

function messageTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function messageBodyPreview(value, max = 120) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function normalizeMessageThreads(messages = [], inboundMessages = []) {
  const items = [];
  for (const message of messages) {
    const contact = String(message.toPhone || "").trim();
    if (!contact) continue;
    const channel = message.provider === "smtp" || contact.includes("@") ? "email" : "text";
    const body = message.detail?.message || message.detail?.metadata?.message || message.error || "";
    items.push({
      id: `out-${message.id}`,
      direction: "outbound",
      channel,
      contact,
      threadKey: `${channel}:${contact.toLowerCase()}`,
      displayName: messageContactName(message) || contact,
      body,
      status: message.status,
      purpose: message.purpose,
      provider: message.provider,
      error: message.error,
      createdAt: message.createdAt,
      appointment: message.appointment,
      lead: message.lead,
    });
  }
  for (const message of inboundMessages) {
    const contact = String(message.fromPhone || message.chatGuid || "").trim();
    if (!contact) continue;
    items.push({
      id: `in-${message.id}`,
      direction: "inbound",
      channel: "text",
      contact,
      threadKey: `text:${contact.toLowerCase()}`,
      displayName: messageContactName(message) || contact,
      body: message.text || message.error || "",
      status: message.status,
      purpose: message.purpose || message.eventType,
      provider: message.provider,
      error: message.error,
      createdAt: message.createdAt,
      appointment: message.appointment,
      lead: message.lead,
      voiceCall: message.voiceCall,
    });
  }

  const threadMap = new Map();
  for (const item of items) {
    if (!threadMap.has(item.threadKey)) {
      threadMap.set(item.threadKey, {
        key: item.threadKey,
        contact: item.contact,
        channel: item.channel,
        displayName: item.displayName,
        messages: [],
        latestAt: item.createdAt,
      });
    }
    const thread = threadMap.get(item.threadKey);
    if (!thread.displayName || thread.displayName === thread.contact) thread.displayName = item.displayName;
    thread.messages.push(item);
    if (new Date(item.createdAt) > new Date(thread.latestAt || 0)) thread.latestAt = item.createdAt;
  }

  const threads = [...threadMap.values()].map((thread) => {
    thread.messages.sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
    thread.latest = thread.messages.at(-1);
    return thread;
  });
  threads.sort((left, right) => new Date(right.latestAt) - new Date(left.latestAt));
  return threads;
}

function renderMessages(messages = [], inboundMessages = []) {
  state.messageData = { messages, inboundMessages };
  const threads = normalizeMessageThreads(messages, inboundMessages);
  el.messageList.innerHTML = "";
  if (!threads.length) {
    el.messageList.className = "message-inbox empty";
    el.messageList.textContent = "No messages yet.";
    state.selectedMessageThreadKey = "";
    return;
  }

  el.messageList.className = "message-inbox";
  if (!threads.some((thread) => thread.key === state.selectedMessageThreadKey)) {
    state.selectedMessageThreadKey = threads[0].key;
  }
  const selected = threads.find((thread) => thread.key === state.selectedMessageThreadKey) || threads[0];

  const threadList = document.createElement("div");
  threadList.className = "message-thread-list";
  for (const thread of threads) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `message-thread ${thread.key === selected.key ? "active" : ""}`;
    button.dataset.threadKey = thread.key;
    const avatar = document.createElement("span");
    avatar.className = "message-avatar";
    avatar.textContent = (thread.displayName || thread.contact).slice(0, 1).toUpperCase();
    const main = document.createElement("span");
    main.className = "message-thread-main";
    const title = document.createElement("strong");
    title.textContent = thread.displayName || thread.contact;
    const preview = document.createElement("span");
    preview.textContent = messageBodyPreview(thread.latest?.body || thread.latest?.error || thread.latest?.purpose || "", 76);
    main.append(title, preview);
    const meta = document.createElement("span");
    meta.className = "message-thread-meta";
    meta.textContent = messageTime(thread.latestAt);
    button.append(avatar, main, meta);
    threadList.appendChild(button);
  }

  const conversation = document.createElement("section");
  conversation.className = "message-conversation";
  const header = document.createElement("div");
  header.className = "message-conversation-header";
  const title = document.createElement("strong");
  title.textContent = selected.displayName || selected.contact;
  const detail = document.createElement("span");
  detail.textContent = [selected.contact, selected.channel === "email" ? "Email" : "Text/iMessage"].filter(Boolean).join(" - ");
  header.append(title, detail);

  const chain = document.createElement("div");
  chain.className = "message-chain";
  for (const message of selected.messages) {
    const bubble = document.createElement("article");
    bubble.className = `message-bubble ${message.direction}`;
    const text = document.createElement("p");
    text.textContent = message.body || message.error || "(No message body)";
    const meta = document.createElement("span");
    meta.textContent = [
      message.direction === "inbound" ? "Received" : message.status || "sent",
      message.purpose,
      message.appointment ? appointmentCode(message.appointment.id) : null,
      message.error ? "failed" : null,
      message.createdAt ? new Date(message.createdAt).toLocaleString() : null,
    ]
      .filter(Boolean)
      .join(" - ");
    bubble.append(text, meta);
    chain.appendChild(bubble);
  }
  conversation.append(header, chain);
  if (selected.channel === "text" && selected.contact.startsWith("+")) {
    const composer = document.createElement("form");
    composer.className = "message-composer";
    composer.dataset.contact = selected.contact;
    const inputNode = document.createElement("input");
    inputNode.placeholder = `Text ${selected.displayName || selected.contact}`;
    inputNode.autocomplete = "off";
    inputNode.required = true;
    const button = document.createElement("button");
    button.className = "primary";
    button.type = "submit";
    button.textContent = "Send";
    composer.append(inputNode, button);
    conversation.appendChild(composer);
  }
  el.messageList.append(threadList, conversation);
}

async function loadMessages() {
  if (!state.admin) return;
  const query = new URLSearchParams({ business_name: el.businessName.value.trim() });
  if (el.website.value.trim()) query.set("website", el.website.value.trim());
  const data = await apiJson(`/api/business-admin/messages?${query}`);
  renderMessages(data.messages || [], data.inboundMessages || []);
}

async function sendManualMessage({ toPhone, message }) {
  setAdminStatus("Sending message");
  await apiJson("/api/business-admin/messages/manual", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...adminIdentity(),
      provider: el.testMessageProvider.value,
      toPhone,
      message,
    }),
  });
  await Promise.all([loadMessages(), loadUsage()]);
  setAdminStatus("Message sent");
}

async function sendManualMessageFromBar() {
  const toPhone = el.testMessagePhone.value.trim();
  const message = el.testMessageBody.value.trim();
  await sendManualMessage({ toPhone, message });
  el.testMessageBody.value = "";
}

function businessUsageCategoryLabel(category) {
  const providerKey = ["ge", "mini"].join("");
  const labels = {
    telnyx_call_seconds: "Phone call",
    telnyx_voice_minutes: "Phone call",
    [`${providerKey}_live_seconds`]: "AI voice session",
    [`${providerKey}_browser_live_seconds`]: "Browser AI session",
    outbound_qualification_call: "Outbound qualification",
    message_send: "Message",
  };
  return labels[category] || String(category || "Usage").replace(/_/g, " ");
}

function businessUsageProviderLabel(provider) {
  if (!provider) return "";
  const value = String(provider).toLowerCase();
  if (value === ["ge", "mini"].join("")) return "AI";
  if (value === "telnyx") return "Phone";
  if (value === "bluebubbles" || value === "sentdm") return "Message";
  return provider;
}

function businessUsageText(text) {
  return businessDisplayText(text);
}

function renderUsage(data) {
  el.usageSummary.innerHTML = "";
  const balance = document.createElement("span");
  balance.className = `status-pill ${data.lowBalance ? "warning" : ""}`;
  balance.textContent = `${data.creditBalance ?? 0} credits`;
  el.usageSummary.appendChild(balance);
  renderCreditBucketSummary(el.usageSummary, data.creditBuckets);
  if (data.lowBalance) {
    const warning = document.createElement("span");
    warning.className = "status-pill warning";
    warning.textContent = `low credit warning <= ${data.lowBalanceTokens ?? 0}`;
    el.usageSummary.appendChild(warning);
  }
  const rates = data.rates || {};
  for (const [label, value] of [
    ["Phone/min", rates.telnyxMinuteCredits],
    ["AI/min", rates.aiMinuteCredits],
    ["Outbound", rates.outboundCallCredits],
    ["Message", rates.messageCredits],
  ]) {
    const pill = document.createElement("span");
    pill.className = "status-pill";
    pill.textContent = `${label}: ${value ?? 0}`;
    el.usageSummary.appendChild(pill);
  }
  for (const [category, total] of Object.entries(data.totals || {})) {
    const pill = document.createElement("span");
    pill.className = "status-pill";
    pill.textContent = `${businessUsageCategoryLabel(category)}: ${total.credits || 0} credits`;
    el.usageSummary.appendChild(pill);
  }
  el.usageList.innerHTML = "";
  for (const tx of data.transactions || []) {
    const row = document.createElement("div");
    row.className = "data-row compact-row";
    row.append(
      miniRow([
        "Credit",
        tx.type,
        `${tx.amount} credits`,
        `balance ${tx.balanceAfter}`,
        businessUsageText(tx.note),
        tx.createdAt ? new Date(tx.createdAt).toLocaleString() : null,
      ]),
    );
    el.usageList.appendChild(row);
  }
  for (const event of data.events || []) {
    const row = document.createElement("div");
    row.className = "data-row compact-row";
    row.append(
      miniRow([
        businessUsageCategoryLabel(event.category),
        `${event.quantity} ${event.unit}`,
        `${event.credits} credits`,
        businessUsageProviderLabel(event.provider),
        event.lead ? `lead #${event.lead.id}` : null,
        event.messageDelivery ? `${event.messageDelivery.purpose} ${event.messageDelivery.status}` : null,
        event.metadata?.billedMinutes ? `${event.metadata.billedMinutes} billed min` : null,
        event.createdAt ? new Date(event.createdAt).toLocaleString() : null,
      ]),
    );
    el.usageList.appendChild(row);
  }
  if (!(data.events || []).length) el.usageList.textContent = "No usage events yet.";
}

function creditBucketPill(container, text, className = "") {
  if (!text) return;
  const pill = document.createElement("span");
  pill.className = `status-pill ${className}`.trim();
  pill.textContent = text;
  container.appendChild(pill);
}

function renderCreditBucketSummary(container, creditBuckets = {}) {
  const summary = creditBuckets.summary || {};
  const monthly = summary.monthlyIncluded || {};
  if ((monthly.total || monthly.remaining) > 0) {
    const expiry = monthly.expiresAt ? `, expires ${new Date(monthly.expiresAt).toLocaleDateString()}` : "";
    creditBucketPill(container, `monthly included: ${monthly.remaining || 0}/${monthly.total || 0}${expiry}`, "active");
  }
  if (summary.topUpCredits) creditBucketPill(container, `top-up credits: ${summary.topUpCredits}`);
  if (summary.trialCredits) creditBucketPill(container, `trial credits: ${summary.trialCredits}`);
  if (summary.legacyCredits) creditBucketPill(container, `legacy credits: ${summary.legacyCredits}`);
  if (summary.overageCredits < 0) creditBucketPill(container, `overage: ${summary.overageCredits}`, "warning");
}

function moneyFromCents(amount, currency = "usd") {
  if (amount === null || amount === undefined) return "";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: String(currency || "usd").toUpperCase() }).format(
    Number(amount) / 100,
  );
}

function planFeatureLabels(plan) {
  return [
    `${plan.monthlyCredits || 0} monthly credits`,
    `${plan.maxPhoneNumbers || 1} phone number${Number(plan.maxPhoneNumbers || 1) === 1 ? "" : "s"}`,
    `${plan.maxTransferTargets ?? 0} transfer contact${Number(plan.maxTransferTargets ?? 0) === 1 ? "" : "s"}`,
    `${plan.maxUsers || 1} user${Number(plan.maxUsers || 1) === 1 ? "" : "s"}`,
    plan.outboundQualificationEnabled ? "Outbound qualification" : null,
    plan.smartReviewsEnabled ? "Smart reviews" : null,
    plan.callTransfersEnabled ? "Call transfers" : null,
    plan.leadWebhookEnabled !== false ? "Lead webhook" : null,
    plan.messageInboxEnabled !== false ? "Message inbox" : null,
    plan.appointmentRemindersEnabled ? "Appointment reminders" : null,
    plan.allowCreditTopups !== false ? "Credit top-ups" : null,
    plan.prioritySupport ? "Priority support" : null,
  ].filter(Boolean);
}

function renderBilling(data) {
  const stripe = data.stripe || {};
  const settings = data.settings || {};
  const plans = data.availablePlans || [];
  const currentPlan = data.currentPlan || null;
  const ready = Boolean(stripe.ready);
  const subscriptionReady = ready && Boolean(plans.length);
  const statusParts = [
    ready ? "Stripe ready" : "Stripe not ready",
    stripe.webhookConfigured ? "webhook configured" : "webhook missing",
    currentPlan ? `plan ${currentPlan.name}` : "no active plan",
    currentPlan ? `${currentPlan.monthlyCredits} monthly credits` : null,
    stripe.subscriptionStatus ? `subscription ${stripe.subscriptionStatus}` : null,
    stripe.subscriptionCurrentPeriodEnd ? `renews ${new Date(stripe.subscriptionCurrentPeriodEnd).toLocaleDateString()}` : null,
  ].filter(Boolean);
  el.billingStatus.textContent = statusParts.join(" · ");
  el.creditPackCredits.value = settings.stripeCreditPackCredits || 1000;
  el.buyCreditsButton.disabled = !ready || currentPlan?.allowCreditTopups === false;
  const previousPlanId = el.billingPlanSelect.value;
  el.billingPlanSelect.innerHTML = "";
  for (const plan of plans) {
    const option = document.createElement("option");
    option.value = String(plan.id);
    option.textContent = `${plan.name} · ${moneyFromCents(plan.monthlyPriceCents)} / month · ${plan.monthlyCredits} credits`;
    option.selected = String(plan.id) === (previousPlanId || String(currentPlan?.id || plans[0]?.id || ""));
    el.billingPlanSelect.appendChild(option);
  }
  if (!plans.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No plans available";
    el.billingPlanSelect.appendChild(option);
  }
  el.billingPlanList.innerHTML = "";
  renderCreditBucketSummary(el.billingPlanList, data.creditBuckets);
  for (const plan of plans) {
    const card = document.createElement("div");
    card.className = `billing-plan-card ${currentPlan?.id === plan.id ? "active" : ""}`;
    const title = document.createElement("strong");
    title.textContent = `${plan.name} · ${moneyFromCents(plan.monthlyPriceCents)}/mo`;
    const detail = document.createElement("span");
    detail.textContent = planFeatureLabels(plan).join(" · ");
    card.append(title, detail);
    el.billingPlanList.appendChild(card);
  }
  if (!plans.length) el.billingPlanList.textContent = "No subscription plans are published yet.";
  el.startSubscriptionButton.disabled = !subscriptionReady;
  el.billingHistory.innerHTML = "";
  for (const session of data.checkoutSessions || []) {
    const row = document.createElement("div");
    row.className = "data-row compact-row";
    row.append(
      miniRow([
        "Stripe checkout",
        session.mode,
        session.status,
        session.subscriptionPlan ? session.subscriptionPlan.name : null,
        session.creditAmount ? `${session.creditAmount} credits` : null,
        session.amountTotal !== null && session.amountTotal !== undefined ? moneyFromCents(session.amountTotal, session.currency) : null,
        session.createdAt ? new Date(session.createdAt).toLocaleString() : null,
      ]),
    );
    el.billingHistory.appendChild(row);
  }
  if (!(data.checkoutSessions || []).length) el.billingHistory.textContent = "No Stripe checkouts yet.";
}

async function loadBilling() {
  if (!state.admin) return;
  const query = new URLSearchParams({ business_name: el.businessName.value.trim() });
  if (el.website.value.trim()) query.set("website", el.website.value.trim());
  const data = await apiJson(`/api/business-admin/billing?${query}`);
  renderBilling(data);
}

async function loadUsage() {
  if (!state.admin) return;
  const query = new URLSearchParams({ business_name: el.businessName.value.trim() });
  if (el.website.value.trim()) query.set("website", el.website.value.trim());
  const data = await apiJson(`/api/business-admin/usage?${query}`);
  renderUsage(data);
  await loadBilling();
}

async function startBillingCheckout(checkoutType) {
  setAdminStatus(checkoutType === "subscription" ? "Opening subscription checkout" : "Opening credit checkout");
  const data = await apiJson("/api/business-admin/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...adminIdentity(),
      checkoutType,
      credits: Number(el.creditPackCredits.value || 0),
      subscriptionPlanId: checkoutType === "subscription" ? Number(el.billingPlanSelect.value || 0) : undefined,
    }),
  });
  if (!data.url) throw new Error("Stripe did not return a checkout URL");
  window.location.href = data.url;
}

async function refreshResearch() {
  const query = new URLSearchParams({
    business_name: el.businessName.value.trim(),
    refresh: "1",
  });
  if (el.website.value.trim()) query.set("website", el.website.value.trim());
  setStatus("Refreshing profile");
  const response = await fetch(`/api/business?${query}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Profile refresh failed");
  updateProfile(data.profile, data.cached);
  await loadPhoneStatus().catch(() => {});
  setStatus("Profile refreshed");
}

async function loadDemoData() {
  const response = await fetch("/api/demo-data");
  const data = await response.json();
  const records = [
    ...data.appointments.map((item) => ({
      type: "Appointment",
      title: `${appointmentCode(item.id)} - ${item.customerName}`,
      detail: [
        `${item.status}: ${item.requestedAt}`,
        item.phone ? `Phone: ${item.phone}` : null,
        item.email ? `Email: ${item.email}` : null,
        item.reason ? `Reason: ${item.reason}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    })),
    ...data.leads.map((item) => ({
      type: "Lead",
      title: item.name,
      detail: item.need || item.phone || item.email || "No detail",
    })),
    ...data.transferMessages.map((item) => ({
      type: "Transfer",
      title: item.name || "Caller",
      detail: item.message,
    })),
  ].slice(0, 8);

  if (!records.length) {
    el.records.textContent = "No records yet";
    return;
  }

  el.records.innerHTML = "";
  for (const item of records) {
    const node = document.createElement("div");
    node.className = "record";
    node.innerHTML = `<strong></strong><span></span>`;
    node.querySelector("strong").textContent = `${item.type}: ${item.title}`;
    node.querySelector("span").textContent = item.detail;
    el.records.appendChild(node);
  }
}

async function startCall() {
  if (!el.businessName.value.trim()) {
    setStatus("Business missing", "error");
    return;
  }

  el.talkButton.disabled = true;
  el.stopButton.disabled = false;
  el.orb.classList.add("live");
  setStatus("Connecting", "live");
  appendTranscript("system", "Loading the business profile.");
  state.micChunks = 0;
  state.agentAudioChunks = 0;
  state.agentAudioSeconds = 0;
  state.canSendMic = false;
  updateDiagnostics();

  await initOutputAudio();
  await playSpeakerTest();

  await startMicrophone();

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  state.ws = new WebSocket(`${protocol}//${window.location.host}/live`);

  state.ws.addEventListener("open", () => {
    state.ws.send(
      JSON.stringify({
        type: "start",
        businessName: el.businessName.value.trim(),
        website: el.website.value.trim(),
        voiceName: el.voiceName.value,
        language: el.language.value,
        agentName: el.agentName.value.trim() || "Alex",
      }),
    );
  });

  state.ws.addEventListener("message", async (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "business") updateProfile(message.profile, message.cached);
    if (message.type === "ready") {
      setStatus("Live", "live");
      appendTranscript("system", "Connected. Waiting for the agent greeting before enabling the microphone.");
    }
    if (message.type === "mic_ready") {
      state.canSendMic = true;
      appendTranscript("system", "Microphone is now live. Speak into your microphone.");
    }
    if (message.type === "interrupted") {
      clearAgentAudio();
    }
    if (message.type === "transcript") appendTranscript(message.speaker, message.text);
    if (message.type === "audio") {
      try {
        await playPcmAudio(message.data, message.mimeType);
      } catch (error) {
        appendTranscript("system", `Browser audio playback error: ${error.message}`);
      }
    }
    if (message.type === "debug") appendTranscript("system", message.message);
    if (message.type === "tool_wait_notice") {
      appendTranscript("agent", message.message);
      speakBrowserNotice(message.message);
    }
    if (message.type === "end_call") {
      appendTranscript("system", `Agent ended the call. ${message.reason || ""}`.trim());
      setStatus("Ended");
      stopCall();
    }
    if (message.type === "tool_call") {
      loadDemoData();
      loadCalendar();
      loadCrm().catch(() => {});
      loadMessages().catch(() => {});
      loadUsage().catch(() => {});
    }
    if (message.type === "status" && message.status === "agent_closed") {
      const reason = message.reason ? ` Reason: ${message.reason}` : "";
      setStatus("Closed");
      appendTranscript("system", `Live agent closed. Code: ${message.code || "unknown"}.${reason}`);
    }
    if (message.type === "error") {
      setStatus("Error", "error");
      appendTranscript("system", message.error);
    }
  });

  state.ws.addEventListener("close", () => {
    setStatus("Closed");
    stopCall(false);
  });
}

function stopCall(closeSocket = true) {
  if (closeSocket && state.ws) state.ws.close();
  stopMicrophone();
  clearAgentAudio();
  if (state.outputContext) state.outputContext.close();
  state.outputContext = null;
  state.nextPlayTime = 0;
  state.micLevel = 0;
  state.agentLevel = 0;
  state.agentSpeakingUntil = 0;
  state.ws = null;
  state.canSendMic = false;
  el.talkButton.disabled = false;
  el.stopButton.disabled = true;
  el.orb.classList.remove("live");
}

async function initializePortal(user) {
  if (user.business) {
    state.businessName = user.business.businessName;
    state.website = user.business.website || "";
  }
  el.businessName.value = state.businessName;
  el.website.value = state.website;
  if (user.role === "business") {
    el.businessName.readOnly = true;
    el.website.readOnly = true;
  }
  setTitle();
  el.authScreen.hidden = true;
  el.appShell.hidden = false;
  await loadSettings();
  await loadBusinessAdmin();
  await loadDemoData();
}

async function checkSession() {
  const response = await fetch("/api/auth/me");
  if (!response.ok) return;
  const data = await response.json();
  await initializePortal(data.user);
}

const initialMicError = microphoneSecurityError();
if (initialMicError) {
  setStatus("Mic blocked", "error");
  appendTranscript("system", initialMicError);
}
el.businessName.value = state.businessName;
el.website.value = state.website;
setTitle();
loadSettings()
  .then(() => loadPhoneStatus())
  .catch(() => {});
checkSession().catch((error) => {
    setStatus("Settings error", "error");
    setAdminStatus(error.message, true);
    appendTranscript("system", error.message);
  });

el.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  el.loginError.textContent = "";
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: el.loginEmail.value, password: el.loginPassword.value }),
  });
  const data = await response.json();
  if (!response.ok) {
    el.loginError.textContent = data.error || "Unable to sign in";
    return;
  }
  await initializePortal(data.user);
});

el.logoutButton.addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.reload();
});

function runAdmin(action) {
  action().catch((error) => setAdminStatus(error.message, true));
}

for (const tab of el.adminTabs) {
  tab.addEventListener("click", () => {
    for (const item of el.adminTabs) {
      const selected = item === tab;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-selected", String(selected));
    }
    for (const view of el.adminViews) view.classList.toggle("active", view.dataset.view === tab.dataset.tab);
    if (tab.dataset.tab === "calendar") runAdmin(loadCalendar);
    if (tab.dataset.tab === "leads") runAdmin(loadCrm);
    if (tab.dataset.tab === "messages") runAdmin(loadMessages);
    if (tab.dataset.tab === "billing") runAdmin(loadUsage);
  });
}

function selectAutomationSection(sectionName) {
  for (const button of el.automationMenuButtons) {
    const selected = button.dataset.automationTarget === sectionName;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  }
  for (const section of el.automationSections) {
    section.classList.toggle("active", section.dataset.automationSection === sectionName);
  }
}

for (const button of el.automationMenuButtons) {
  button.addEventListener("click", () => selectAutomationSection(button.dataset.automationTarget));
}

function openBusinessTool(tabName) {
  const tab = Array.from(el.adminTabs).find((item) => item.dataset.tab === tabName);
  tab?.click();
}

for (const navItem of el.mobileNavItems) {
  navItem.addEventListener("click", () => {
    for (const item of el.mobileNavItems) item.classList.toggle("active", item === navItem);
    const target = navItem.dataset.mobileTarget;
    if (target === "call") {
      document.querySelector("#callScreen").scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (target === "business") {
      document.querySelector("#profileScreen").scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      if (target === "calendar") openBusinessTool("calendar");
      if (target === "setup") openBusinessTool("setup");
      el.businessAdmin.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

el.openAdminButton.addEventListener("click", () => {
  openBusinessTool("setup");
  el.businessAdmin.scrollIntoView({ behavior: "smooth", block: "start" });
  runAdmin(loadBusinessAdmin);
});

el.addIntakeButton.addEventListener("click", () => {
  runAdmin(async () => {
    await mutateAdmin("/api/business-admin/intake", "POST", {
      label: el.intakeLabel.value.trim(),
      fieldKey: el.intakeKey.value.trim(),
      fieldType: el.intakeType.value,
      required: el.intakeRequired.checked,
      options: el.intakeOptions.value.split(",").map((value) => value.trim()).filter(Boolean),
    });
    el.intakeLabel.value = "";
    el.intakeKey.value = "";
    el.intakeOptions.value = "";
    el.intakeRequired.checked = false;
  });
});

el.intakeList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest(".data-row");
  runAdmin(async () => {
    if (button.dataset.action === "delete-intake") {
      await mutateAdmin(`/api/business-admin/intake/${row.dataset.id}`, "DELETE", {});
      return;
    }
    await mutateAdmin(`/api/business-admin/intake/${row.dataset.id}`, "PUT", {
      label: row.querySelector(".row-label").value,
      fieldKey: row.querySelector(".row-key").value,
      fieldType: row.querySelector(".row-type").value,
      required: row.querySelector(".row-required").checked,
      options: row.querySelector(".row-options").value.split(",").map((value) => value.trim()).filter(Boolean),
      sortOrder: Array.from(el.intakeList.children).indexOf(row),
    });
  });
});

el.addKnowledgeButton.addEventListener("click", () => {
  runAdmin(async () => {
    await mutateAdmin("/api/business-admin/knowledge", "POST", {
      question: el.knowledgeQuestion.value.trim(),
      answer: el.knowledgeAnswer.value.trim(),
      category: el.knowledgeCategory.value.trim(),
    });
    el.knowledgeQuestion.value = "";
    el.knowledgeAnswer.value = "";
    el.knowledgeCategory.value = "";
  });
});

el.knowledgeList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest(".data-row");
  runAdmin(() =>
    button.dataset.action === "delete-knowledge"
      ? mutateAdmin(`/api/business-admin/knowledge/${row.dataset.id}`, "DELETE", {})
      : mutateAdmin(`/api/business-admin/knowledge/${row.dataset.id}`, "PUT", {
          question: row.querySelector(".row-question").value,
          answer: row.querySelector(".row-answer").value,
          category: row.querySelector(".row-category").value,
        }),
  );
});

el.importKnowledgeButton.addEventListener("click", () => {
  runAdmin(() => importAdmin("knowledge", el.knowledgeFile.files[0]));
});

el.addPriceButton.addEventListener("click", () => {
  runAdmin(async () => {
    await mutateAdmin("/api/business-admin/prices", "POST", {
      item: el.priceItem.value.trim(),
      description: el.priceDescription.value.trim(),
      priceType: el.priceType.value,
      amountMin: el.priceMin.value,
      amountMax: el.priceMax.value,
      currency: el.priceCurrency.value.trim(),
      category: el.priceCategory.value.trim(),
    });
    el.priceItem.value = "";
    el.priceDescription.value = "";
    el.priceMin.value = "";
    el.priceMax.value = "";
    el.priceCategory.value = "";
  });
});

el.pricesList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest(".data-row");
  runAdmin(() =>
    button.dataset.action === "delete-price"
      ? mutateAdmin(`/api/business-admin/prices/${row.dataset.id}`, "DELETE", {})
      : mutateAdmin(`/api/business-admin/prices/${row.dataset.id}`, "PUT", {
          item: row.querySelector(".row-item").value,
          description: row.querySelector(".row-description").value,
          priceType: row.querySelector(".row-price-type").value,
          amountMin: row.querySelector(".row-min").value,
          amountMax: row.querySelector(".row-max").value,
          currency: row.querySelector(".row-currency").value,
          category: row.querySelector(".row-category").value,
        }),
  );
});

el.importPricesButton.addEventListener("click", () => {
  runAdmin(() => importAdmin("prices", el.pricesFile.files[0]));
});

el.saveInstructionsButton.addEventListener("click", () => runAdmin(saveBusinessConfig));
el.addReviewLinkButton.addEventListener("click", () => runAdmin(addReviewLink));
el.reviewLinkList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest(".data-row");
  if (button.dataset.action === "save-review-link") runAdmin(() => saveReviewLink(row));
  if (button.dataset.action === "delete-review-link") runAdmin(() => deleteReviewLink(row));
});
el.addTransferTargetButton.addEventListener("click", () => runAdmin(addTransferTarget));
el.transferTargetList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest(".data-row");
  if (button.dataset.action === "save-transfer-target") runAdmin(() => saveTransferTarget(row));
  if (button.dataset.action === "delete-transfer-target") runAdmin(() => deleteTransferTarget(row));
});
el.saveBusinessProfileButton.addEventListener("click", () => runAdmin(saveBusinessProfile));
el.saveCalendarButton.addEventListener("click", () => runAdmin(saveBusinessConfig));
el.refreshCalendarButton.addEventListener("click", () => runAdmin(loadCalendar));
el.saveAppointmentButton.addEventListener("click", () => runAdmin(saveManualAppointment));
el.resetAppointmentButton.addEventListener("click", resetAppointmentForm);
el.availableSlots.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='select-slot']");
  if (!button) return;
  el.appointmentStart.value = calendarDateTimeLocal(button.dataset.start, el.calendarTimezone.value);
  el.appointmentCustomerName.focus();
});
el.bookedAppointments.addEventListener("click", (event) => {
  const reminderButton = event.target.closest("button[data-action='send-appointment-reminder']");
  if (reminderButton) runAdmin(() => sendAppointmentReminder(reminderButton));
  const summaryButton = event.target.closest("button[data-action='send-appointment-summary']");
  if (summaryButton) runAdmin(() => sendAppointmentSummary(summaryButton));
  const editButton = event.target.closest("button[data-action='edit-appointment']");
  if (editButton) fillAppointmentForm(JSON.parse(editButton.dataset.appointment), el.calendarTimezone.value);
  const cancelButton = event.target.closest("button[data-action='cancel-appointment']");
  if (cancelButton) runAdmin(() => cancelAppointment(cancelButton));
});
el.refreshCrmButton.addEventListener("click", () => runAdmin(loadCrm));
el.copyCrmWebhookButton.addEventListener("click", () => runAdmin(copyLeadWebhook));
el.rotateCrmWebhookButton.addEventListener("click", () => runAdmin(rotateLeadWebhook));
el.sendCrmWebhookTestButton.addEventListener("click", () => runAdmin(sendWebhookTest));
el.resetCrmWebhookTestButton.addEventListener("click", resetWebhookTestPayload);
el.addCrmLeadButton.addEventListener("click", () => runAdmin(addCrmLead));
el.crmSearch.addEventListener("input", () => {
  clearTimeout(state.crmSearchTimer);
  state.crmSearchTimer = setTimeout(() => runAdmin(loadCrm), 250);
});
el.crmStatusFilter.addEventListener("change", () => runAdmin(loadCrm));
el.crmList.addEventListener("click", (event) => {
  const saveButton = event.target.closest("button[data-action='save-crm']");
  if (saveButton) {
    runAdmin(() => saveCrmLead(saveButton.closest(".crm-card")));
    return;
  }
  const qualifyButton = event.target.closest("button[data-action='qualify-crm']");
  if (qualifyButton) {
    runAdmin(() => startQualificationCall(qualifyButton.closest(".crm-card")));
    return;
  }
  const retryButton = event.target.closest("button[data-action='retry-qualification']");
  if (retryButton) {
    runAdmin(() => retryQualification(retryButton.closest(".crm-card")));
    return;
  }
  const pauseButton = event.target.closest("button[data-action='pause-qualification']");
  if (pauseButton) {
    runAdmin(() => pauseQualification(pauseButton.closest(".crm-card")));
    return;
  }
  const cancelButton = event.target.closest("button[data-action='cancel-qualification']");
  if (cancelButton) {
    runAdmin(() => cancelQualification(cancelButton.closest(".crm-card")));
    return;
  }
  const feedbackButton = event.target.closest("button[data-action='record-feedback']");
  if (feedbackButton) {
    runAdmin(() => recordCustomerFeedback(feedbackButton.closest(".crm-card")));
    return;
  }
  const reviewButton = event.target.closest("button[data-action='send-review']");
  if (reviewButton) {
    runAdmin(() => sendReviewRequest(reviewButton.closest(".crm-card")));
    return;
  }
  const missedFollowupButton = event.target.closest("button[data-action='send-missed-followup']");
  if (missedFollowupButton) {
    runAdmin(() => sendMissedFollowup(missedFollowupButton.closest(".crm-card")));
    return;
  }
  const complaintButton = event.target.closest("button[data-action='escalate-complaint']");
  if (complaintButton) runAdmin(() => escalateComplaint(complaintButton.closest(".crm-card")));
});
el.refreshMessagesButton.addEventListener("click", () => runAdmin(loadMessages));
el.messageList.addEventListener("click", (event) => {
  const threadButton = event.target.closest(".message-thread");
  if (!threadButton) return;
  state.selectedMessageThreadKey = threadButton.dataset.threadKey;
  renderMessages(state.messageData.messages, state.messageData.inboundMessages);
});
el.messageList.addEventListener("submit", (event) => {
  const form = event.target.closest(".message-composer");
  if (!form) return;
  event.preventDefault();
  const inputNode = form.querySelector("input");
  runAdmin(async () => {
    await sendManualMessage({ toPhone: form.dataset.contact, message: inputNode.value.trim() });
    inputNode.value = "";
  });
});
el.sendTestMessageButton.addEventListener("click", () => runAdmin(sendManualMessageFromBar));
el.refreshUsageButton.addEventListener("click", () => runAdmin(loadUsage));
el.buyCreditsButton.addEventListener("click", () => runAdmin(() => startBillingCheckout("credits")));
el.startSubscriptionButton.addEventListener("click", () => runAdmin(() => startBillingCheckout("subscription")));

el.businessName.addEventListener("input", setTitle);
el.website.addEventListener("input", () => {
  const query = new URLSearchParams(window.location.search);
  query.set("business_name", el.businessName.value.trim() || "Business Name");
  if (el.website.value.trim()) query.set("website", el.website.value.trim());
});

el.saveSettingsButton.addEventListener("click", () => {
  saveSettings().catch((error) => {
    setStatus("Settings error", "error");
    appendTranscript("system", error.message);
  });
});

el.refreshButton.addEventListener("click", () => {
  refreshResearch().catch((error) => {
    setStatus("Profile refresh error", "error");
    appendTranscript("system", error.message);
  });
});

el.talkButton.addEventListener("click", () => {
  startCall().catch((error) => {
    stopCall();
    setStatus("Error", "error");
    appendTranscript("system", error.message);
  });
});

el.stopButton.addEventListener("click", () => stopCall());

el.testSpeakerButton.addEventListener("click", () => {
  playSpeakerTest()
    .then(() => setStatus("Speaker tested"))
    .catch((error) => {
      setStatus("Speaker error", "error");
      appendTranscript("system", error.message);
    });
});

el.textForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = el.textInput.value.trim();
  if (!text || !state.ws || state.ws.readyState !== WebSocket.OPEN) return;
  state.ws.send(JSON.stringify({ type: "text", text }));
  appendTranscript("caller", text);
  el.textInput.value = "";
});

window.lucide?.createIcons();
drawVoiceVisualizer();
