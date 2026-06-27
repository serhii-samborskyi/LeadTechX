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
  nextPlayTime: 0,
  canSendMic: false,
  micChunks: 0,
  geminiAudioChunks: 0,
  geminiAudioSeconds: 0,
  micLevel: 0,
  agentLevel: 0,
  visualizerLevel: 0,
  agentSpeakingUntil: 0,
  visualizerFrame: null,
  admin: null,
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
  researchModel: document.querySelector("#researchModel"),
  liveModel: document.querySelector("#liveModel"),
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
  saveInstructionsButton: document.querySelector("#saveInstructionsButton"),
  appointmentMode: document.querySelector("#appointmentMode"),
  slotDuration: document.querySelector("#slotDuration"),
  bufferMinutes: document.querySelector("#bufferMinutes"),
  calendarTimezone: document.querySelector("#calendarTimezone"),
  availabilityRules: document.querySelector("#availabilityRules"),
  saveCalendarButton: document.querySelector("#saveCalendarButton"),
  refreshCalendarButton: document.querySelector("#refreshCalendarButton"),
  availableSlots: document.querySelector("#availableSlots"),
  bookedAppointments: document.querySelector("#bookedAppointments"),
  refreshCrmButton: document.querySelector("#refreshCrmButton"),
  crmWebhookUrl: document.querySelector("#crmWebhookUrl"),
  copyCrmWebhookButton: document.querySelector("#copyCrmWebhookButton"),
  rotateCrmWebhookButton: document.querySelector("#rotateCrmWebhookButton"),
  crmWebhookHelp: document.querySelector("#crmWebhookHelp"),
  crmName: document.querySelector("#crmName"),
  crmPhone: document.querySelector("#crmPhone"),
  crmEmail: document.querySelector("#crmEmail"),
  crmNeed: document.querySelector("#crmNeed"),
  crmStatus: document.querySelector("#crmStatus"),
  addCrmLeadButton: document.querySelector("#addCrmLeadButton"),
  crmList: document.querySelector("#crmList"),
  mobileNavItems: document.querySelectorAll(".mobile-nav-item"),
};

function setStatus(text, mode = "") {
  el.status.textContent = text;
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
  bubble.querySelector(".text").textContent = text;
  el.transcript.appendChild(bubble);
  el.transcript.scrollTop = el.transcript.scrollHeight;
}

function updateDiagnostics() {
  el.diagnostics.textContent = `Mic chunks: ${state.micChunks} | Gemini audio chunks: ${state.geminiAudioChunks} | Audio seconds: ${state.geminiAudioSeconds.toFixed(1)}`;
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
  state.nextPlayTime = Math.max(state.nextPlayTime, state.outputContext.currentTime + 0.02);
  source.start(state.nextPlayTime);
  state.nextPlayTime += audioBuffer.duration;
  state.agentSpeakingUntil = Date.now() + Math.max(0, state.nextPlayTime - state.outputContext.currentTime) * 1000;
  state.geminiAudioChunks += 1;
  state.geminiAudioSeconds += audioBuffer.duration;
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
    ? "Using cached business research."
    : "Business research cached for future calls.";
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
    el.numberStatusDetail.textContent = "Assign a Telnyx number before phone calls and outbound qualification.";
  }
}

async function loadSettings() {
  const response = await fetch("/api/settings");
  const settings = await response.json();
  el.researchModel.value = settings.researchModel;
  el.liveModel.value = settings.liveModel;
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
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function setAdminStatus(text, isError = false) {
  el.adminStatus.textContent = text;
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
      if (square instanceof HTMLButtonElement) square.type = "button";
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
  el.appointmentMode.value = data.config.appointmentMode;
  el.slotDuration.value = data.config.slotDurationMinutes;
  el.bufferMinutes.value = data.config.bufferMinutes;
  el.calendarTimezone.value = data.config.timezone;
  renderIntakeFields(data.config.intakeFields);
  renderKnowledge(data.config.knowledgeEntries);
  renderPrices(data.config.priceEntries);
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
    row.append(summary, details);
    el.bookedAppointments.appendChild(row);
  }
  if (!data.appointments.length) el.bookedAppointments.textContent = "No booked appointments in this range.";
}

const crmStatusOptions = ["new", "qualified", "unqualified", "callback", "appointment", "transferred", "unreachable"];

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
    grid.append(
      ...[
        crmField("Source", lead.source),
        crmField("Created", new Date(lead.createdAt).toLocaleString()),
        crmField("Updated", new Date(lead.updatedAt).toLocaleString()),
        crmField("Call", call ? `${call.status}${call.hangupCause ? ` · ${call.hangupCause}` : ""}` : null),
        crmField("Call time", started),
        crmField("From", call?.fromNumber || lead.phone, call?.fromNumber || lead.phone ? `tel:${call?.fromNumber || lead.phone}` : null),
        crmField("To", call?.toNumber),
        crmField("Recording", call?.recordingUrl ? "Open recording" : null, call?.recordingUrl || null),
      ].filter(Boolean),
    );
    const qualificationCalls = lead.qualificationCalls || [];
    const latestQualification = qualificationCalls[0] || null;
    if (latestQualification) {
      grid.append(
        ...[
          crmField("Qualification", `${latestQualification.status}${latestQualification.resultStatus ? ` · ${latestQualification.resultStatus}` : ""}`),
          crmField("Qualified from", latestQualification.fromNumber),
          crmField("Qualified to", latestQualification.toNumber),
          crmField("Attempt", String(latestQualification.attemptNumber || 1)),
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
      <label class="wide-field">Extracted fields JSON<textarea class="crm-row-fields" rows="4"></textarea></label>
      <button data-action="save-crm" type="button">Save lead</button>
      <button data-action="qualify-crm" type="button">Call and qualify</button>
    `;
    editor.querySelector(".crm-row-name").value = lead.name || "";
    editor.querySelector(".crm-row-phone").value = lead.phone || "";
    editor.querySelector(".crm-row-email").value = lead.email || "";
    editor.querySelector(".crm-row-need").value = lead.need || "";
    editor.querySelector(".crm-row-notes").value = lead.notes || "";
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
          attempt.status,
          attempt.resultStatus,
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
    card.append(summary, body);
    el.crmList.appendChild(card);
  }
  if (!leads.length) el.crmList.textContent = "No CRM leads yet.";
}

async function loadLeadWebhook() {
  if (!state.admin) return;
  const query = new URLSearchParams({ business_name: el.businessName.value.trim() });
  if (el.website.value.trim()) query.set("website", el.website.value.trim());
  const data = await apiJson(`/api/business-admin/lead-webhook?${query}`);
  el.crmWebhookUrl.value = data.webhookUrl || "";
  const accepted = data.acceptedFields?.join(", ") || "name, phone, email, service, source, notes";
  el.crmWebhookHelp.textContent = `Accepted fields: ${accepted}. POST JSON or form data.`;
}

async function loadCrm() {
  if (!state.admin) return;
  setAdminStatus("Loading CRM");
  const query = new URLSearchParams({ business_name: el.businessName.value.trim() });
  if (el.website.value.trim()) query.set("website", el.website.value.trim());
  const [data] = await Promise.all([apiJson(`/api/business-admin/crm?${query}`), loadLeadWebhook()]);
  renderCrm(data.leads || []);
  setAdminStatus("CRM loaded");
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
  el.crmWebhookUrl.value = data.webhookUrl || "";
  setAdminStatus("Webhook URL rotated");
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

async function refreshResearch() {
  const query = new URLSearchParams({
    business_name: el.businessName.value.trim(),
    research_model: el.researchModel.value.trim(),
    refresh: "1",
  });
  if (el.website.value.trim()) query.set("website", el.website.value.trim());
  setStatus("Researching");
  const response = await fetch(`/api/business?${query}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Research failed");
  updateProfile(data.profile, data.cached);
  await loadPhoneStatus().catch(() => {});
  setStatus("Research cached");
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
  appendTranscript("system", "Building or loading cached business research.");
  state.micChunks = 0;
  state.geminiAudioChunks = 0;
  state.geminiAudioSeconds = 0;
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
        researchModel: el.researchModel.value.trim(),
        liveModel: el.liveModel.value.trim(),
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
    if (message.type === "transcript") appendTranscript(message.speaker, message.text);
    if (message.type === "audio") {
      try {
        await playPcmAudio(message.data, message.mimeType);
      } catch (error) {
        appendTranscript("system", `Browser audio playback error: ${error.message}`);
      }
    }
    if (message.type === "debug") appendTranscript("system", message.message);
    if (message.type === "end_call") {
      appendTranscript("system", `Agent ended the call. ${message.reason || ""}`.trim());
      setStatus("Ended");
      stopCall();
    }
    if (message.type === "tool_call") {
      loadDemoData();
      loadCalendar();
    }
    if (message.type === "status" && message.status === "gemini_closed") {
      const reason = message.reason ? ` Reason: ${message.reason}` : "";
      setStatus("Closed");
      appendTranscript("system", `Gemini Live closed. Code: ${message.code || "unknown"}.${reason}`);
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
    el.researchModel.readOnly = true;
    el.liveModel.readOnly = true;
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
    if (tab.dataset.tab === "appointments") runAdmin(loadCalendar);
    if (tab.dataset.tab === "crm") runAdmin(loadCrm);
  });
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
      if (target === "calendar") {
        const appointmentsTab = Array.from(el.adminTabs).find((tab) => tab.dataset.tab === "appointments");
        appointmentsTab?.click();
      }
      el.businessAdmin.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

el.openAdminButton.addEventListener("click", () => {
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
el.saveBusinessProfileButton.addEventListener("click", () => runAdmin(saveBusinessProfile));
el.saveCalendarButton.addEventListener("click", () => runAdmin(saveBusinessConfig));
el.refreshCalendarButton.addEventListener("click", () => runAdmin(loadCalendar));
el.refreshCrmButton.addEventListener("click", () => runAdmin(loadCrm));
el.copyCrmWebhookButton.addEventListener("click", () => runAdmin(copyLeadWebhook));
el.rotateCrmWebhookButton.addEventListener("click", () => runAdmin(rotateLeadWebhook));
el.addCrmLeadButton.addEventListener("click", () => runAdmin(addCrmLead));
el.crmList.addEventListener("click", (event) => {
  const saveButton = event.target.closest("button[data-action='save-crm']");
  if (saveButton) {
    runAdmin(() => saveCrmLead(saveButton.closest(".crm-card")));
    return;
  }
  const qualifyButton = event.target.closest("button[data-action='qualify-crm']");
  if (qualifyButton) runAdmin(() => startQualificationCall(qualifyButton.closest(".crm-card")));
});

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
    setStatus("Research error", "error");
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
