function boundedSeconds(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  const resolved = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(resolved)));
}

export function normalizedCallSilenceWarningSeconds(value) {
  return boundedSeconds(value, 20, 0, 300);
}

export function normalizedCallSilenceHangupSeconds(value) {
  return boundedSeconds(value, 15, 5, 120);
}

function muLawDecode(value) {
  const encoded = (~value) & 0xff;
  const sign = encoded & 0x80;
  const exponent = (encoded >> 4) & 0x07;
  const mantissa = encoded & 0x0f;
  const sample = ((mantissa << 3) + 0x84) << exponent;
  return sign ? 0x84 - sample : sample - 0x84;
}

export function telephonyAudioLevel(payload, encoding, l16Endian = "LE") {
  const buffer = Buffer.from(String(payload || ""), "base64");
  const normalizedEncoding = String(encoding || "").toUpperCase();
  const sampleCount = normalizedEncoding === "L16" ? Math.floor(buffer.length / 2) : buffer.length;
  if (!sampleCount || !["PCMU", "L16"].includes(normalizedEncoding)) {
    return { sampleCount: 0, peak: 0, rms: 0 };
  }
  let peak = 0;
  let sumSquares = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const sample =
      normalizedEncoding === "PCMU"
        ? muLawDecode(buffer[index])
        : String(l16Endian).toUpperCase() === "BE"
          ? buffer.readInt16BE(index * 2)
          : buffer.readInt16LE(index * 2);
    const absolute = Math.abs(sample);
    peak = Math.max(peak, absolute);
    sumSquares += sample * sample;
  }
  return {
    sampleCount,
    peak,
    rms: Math.round(Math.sqrt(sumSquares / sampleCount)),
  };
}

export function createCallSilenceGuard(options = {}) {
  const warningSeconds = normalizedCallSilenceWarningSeconds(options.warningSeconds);
  const hangupSeconds = normalizedCallSilenceHangupSeconds(options.hangupSeconds);
  const warningMs = warningSeconds * 1000;
  const hangupMs = hangupSeconds * 1000;
  const tickMs = Math.max(100, Number(options.tickMs || 1000));
  const now = typeof options.now === "function" ? options.now : Date.now;
  const canAct = typeof options.canAct === "function" ? options.canAct : () => true;
  const onWarning = typeof options.onWarning === "function" ? options.onWarning : async () => {};
  const onHangup = typeof options.onHangup === "function" ? options.onHangup : async () => {};
  const onResume = typeof options.onResume === "function" ? options.onResume : async () => {};
  const onError = typeof options.onError === "function" ? options.onError : () => {};
  const schedule = options.schedule !== false;

  let startedAt = 0;
  let lastCallerActivityAt = 0;
  let lastAgentPlaybackEndedAt = 0;
  let warningRequestedAt = 0;
  let warningPlaybackEndedAt = 0;
  let callerEverSpoke = false;
  let stopped = false;
  let timer = null;
  let checkRunning = false;

  const snapshot = (currentTime = now()) => {
    const baselineAt = warningRequestedAt
      ? warningPlaybackEndedAt || warningRequestedAt
      : Math.max(startedAt, lastCallerActivityAt, lastAgentPlaybackEndedAt);
    return {
      enabled: warningSeconds > 0,
      startedAt,
      lastCallerActivityAt,
      lastAgentPlaybackEndedAt,
      warningRequestedAt,
      warningPlaybackEndedAt,
      callerEverSpoke,
      silentForMs: baselineAt ? Math.max(0, currentTime - baselineAt) : 0,
      warningSeconds,
      hangupSeconds,
      stopped,
    };
  };

  const stop = () => {
    stopped = true;
    if (timer) clearInterval(timer);
    timer = null;
  };

  const check = async () => {
    if (checkRunning || stopped || !startedAt || warningSeconds <= 0 || !canAct()) return snapshot();
    checkRunning = true;
    try {
      const currentTime = now();
      if (warningRequestedAt) {
        const warningBaseline = warningPlaybackEndedAt || warningRequestedAt;
        if (currentTime - warningBaseline >= hangupMs) {
          const detail = snapshot(currentTime);
          stop();
          await onHangup(detail);
        }
        return snapshot(currentTime);
      }
      const activityBaseline = Math.max(startedAt, lastCallerActivityAt, lastAgentPlaybackEndedAt);
      if (currentTime - activityBaseline >= warningMs) {
        warningRequestedAt = currentTime;
        await onWarning(snapshot(currentTime));
      }
      return snapshot(currentTime);
    } finally {
      checkRunning = false;
    }
  };

  const start = () => {
    if (stopped || warningSeconds <= 0) return false;
    if (!startedAt) startedAt = now();
    if (schedule && !timer) {
      timer = setInterval(() => {
        check().catch(onError);
      }, tickMs);
      if (typeof timer.unref === "function") timer.unref();
    }
    return true;
  };

  const noteCallerActivity = (source = "audio") => {
    if (stopped) return;
    const currentTime = now();
    const resumedAfterWarning = Boolean(warningRequestedAt);
    const previous = snapshot(currentTime);
    callerEverSpoke = true;
    lastCallerActivityAt = currentTime;
    warningRequestedAt = 0;
    warningPlaybackEndedAt = 0;
    if (resumedAfterWarning) {
      Promise.resolve(onResume({ ...previous, source })).catch(onError);
    }
  };

  const noteAgentPlaybackEnded = () => {
    if (stopped || !startedAt) return;
    if (warningRequestedAt) {
      warningPlaybackEndedAt = now();
    } else {
      lastAgentPlaybackEndedAt = now();
    }
  };

  const notePauseEnded = () => {
    if (stopped || !startedAt || warningRequestedAt) return;
    lastAgentPlaybackEndedAt = now();
  };

  return {
    start,
    stop,
    check,
    noteCallerActivity,
    noteAgentPlaybackEnded,
    notePauseEnded,
    snapshot,
  };
}
