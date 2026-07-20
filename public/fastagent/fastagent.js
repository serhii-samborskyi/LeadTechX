const params = new URLSearchParams(window.location.search);
function normalizeWebsiteInput(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const businessName = (params.get("business_name") || "").trim();
const website = normalizeWebsiteInput(params.get("website"));
const accessTokenFromUrl = (params.get("token") || params.get("access_token") || "").trim();
const claimToken = (params.get("claim_token") || "").trim();
const storageKey = businessName || website ? `fastagent:${businessName.toLowerCase()}|${website.toLowerCase()}` : "";

const state = {
  accessToken: accessTokenFromUrl || (storageKey ? localStorage.getItem(storageKey) || "" : ""),
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
};

const el = Object.fromEntries(
  [
    "loadingScreen",
    "loadingTitle",
    "loadingMessage",
    "entryScreen",
    "agentScreen",
    "errorScreen",
    "errorMessage",
    "trialBadge",
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
    "profileMessage",
    "profileSummary",
    "profilePhone",
    "profileAddress",
    "profileHours",
    "profileArea",
    "profileServices",
    "phoneSection",
    "phoneLimit",
    "demoPhone",
    "callerForm",
    "callerPhone",
    "callerPhones",
    "callerMessage",
    "claimIntro",
    "finishSetupLink",
    "claimForm",
    "claimEmail",
    "claimMessage",
    "transcript",
  ].map((id) => [id, document.querySelector(`#${id}`)]),
);

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function showError(message) {
  el.loadingScreen.hidden = true;
  el.agentScreen.hidden = true;
  el.errorScreen.hidden = false;
  el.errorMessage.textContent = message;
}

function setCallStatus(text, live = false) {
  el.callStatus.textContent = text;
  el.callStatus.classList.toggle("live", live);
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

function profilePayload() {
  return {
    accessToken: state.accessToken,
    summary: el.profileSummary.value,
    phone: el.profilePhone.value,
    address: el.profileAddress.value,
    hours: el.profileHours.value,
    serviceArea: el.profileArea.value,
    services: el.profileServices.value,
  };
}

function renderProfileFields(profile) {
  state.renderingProfile = true;
  el.agentSummary.textContent = profile.summary || "Your receptionist is ready.";
  el.profileSummary.value = editableProfileValue(profile.summary);
  el.profilePhone.value = editableProfileValue(profile.phone);
  el.profileAddress.value = editableProfileValue(profile.address);
  el.profileHours.value = editableProfileValue(profile.hours);
  el.profileArea.value = editableProfileValue(profile.serviceArea);
  el.profileServices.value = editableProfileValue(profile.services);
  state.renderingProfile = false;
  state.profileDirty = false;
  el.profileSaveButton.disabled = false;
  el.profileMessage.textContent = "";
}

async function saveProfile({ silent = false } = {}) {
  if (!state.accessToken || !state.profileDirty) return state.profile;
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
    if (!silent) el.profileMessage.textContent = "Profile saved";
    return data.profile;
  } catch (error) {
    el.profileMessage.textContent = error.message;
    throw error;
  } finally {
    el.profileSaveButton.disabled = false;
    window.lucide?.createIcons();
  }
}

function renderAgent(data) {
  state.profile = data.profile;
  el.loadingScreen.hidden = true;
  el.errorScreen.hidden = true;
  el.agentScreen.hidden = false;
  el.agentTitle.textContent = `RingPort for ${data.profile.businessName}`;
  renderProfileFields(data.profile);
  el.credits.textContent = `${data.profile.creditBalance} credits`;
  const endsAt = new Date(data.profile.trialEndsAt);
  el.trialBadge.textContent = `Trial until ${endsAt.toLocaleDateString()}`;
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
    el.claimIntro.textContent = "Review the details, test the receptionist, then finish account setup.";
    el.claimForm.hidden = true;
    el.finishSetupLink.hidden = false;
    el.finishSetupLink.href = `/set-password/?token=${encodeURIComponent(state.claimToken)}`;
    el.claimMessage.textContent = "Save any edits before finishing setup.";
  } else {
    el.claimIntro.textContent = "Set your password from the secure link sent to your email.";
    el.claimForm.hidden = false;
    el.finishSetupLink.hidden = true;
    el.claimMessage.textContent = "";
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
      state.ws.send(JSON.stringify({ type: "start", demoToken: state.accessToken }));
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
  requestAnimationFrame(drawVisualizer);
}

async function initialize() {
  if (!businessName && !state.accessToken) {
    el.loadingScreen.hidden = true;
    el.entryScreen.hidden = false;
    el.trialBadge.textContent = "Live demo";
    window.lucide?.createIcons();
    return;
  }
  try {
    let data;
    if (state.accessToken) {
      try {
        data = await api(`/api/onboarding/fast-agent?token=${encodeURIComponent(state.accessToken)}`);
      } catch (error) {
        if (accessTokenFromUrl || !businessName) throw error;
        if (storageKey) localStorage.removeItem(storageKey);
        state.accessToken = "";
      }
    }
    if (!data) {
      if (!businessName) throw new Error("This setup link is invalid or expired");
      data = await api("/api/onboarding/fast-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, website }),
      });
      state.accessToken = data.accessToken;
    }
    if (storageKey && state.accessToken) {
      localStorage.setItem(storageKey, state.accessToken);
    }
    renderAgent(data);
  } catch (error) {
    showError(error.message);
  }
}

el.talkButton.addEventListener("click", startCall);
el.stopButton.addEventListener("click", () => stopCall());
el.profileForm.addEventListener("input", () => {
  if (state.renderingProfile) return;
  state.profileDirty = true;
  el.profileMessage.textContent = "Unsaved changes";
});
el.profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await saveProfile();
  } catch {
    // The message is already shown beside the profile form.
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
drawVisualizer();
initialize();
