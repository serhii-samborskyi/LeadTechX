import { useCallback, useRef, useState } from "react";
import { requestRecordingPermissionsAsync, setAudioModeAsync, setIsAudioActiveAsync, useAudioStream } from "expo-audio";
import { decode, encode } from "base-64";
import { TurboModuleRegistry } from "react-native";
import type { TurboModule } from "react-native";

import { LIVE_WS_URL } from "./api";
import type { VoiceQuota } from "./types";

declare const require: (moduleName: string) => unknown;

type CallStatus = "idle" | "connecting" | "listening" | "agent_speaking" | "ended" | "error";

type TranscriptItem = {
  id: string;
  speaker: "caller" | "agent" | "system";
  text: string;
};

type UseLiveAgentCallInput = {
  accessToken?: string;
  sessionToken?: string;
  deviceId: string;
};

type OutputAudioContext = import("react-native-audio-api/lib/typescript/core/AudioContext").default;
type OutputAudioBufferSource = import("react-native-audio-api/lib/typescript/core/AudioBufferSourceNode").default;
type AudioContextConstructor = new (options?: { sampleRate?: number }) => OutputAudioContext;
type AudioManagerModule = {
  default?: {
    setAudioSessionOptions?: (options: {
      iosCategory?: "playAndRecord";
      iosMode?: "voiceChat" | "default";
      iosOptions?: Array<"defaultToSpeaker" | "allowBluetoothHFP" | "allowBluetoothA2DP">;
      iosNotifyOthersOnDeactivation?: boolean;
    }) => void;
  };
};
type NativeAudioApiModule = TurboModule & {
  install?: () => boolean;
};

type WebSocketWithHeaders = new (
  uri: string,
  protocols?: string | string[] | null,
  options?: { headers: Record<string, string> } | null,
) => WebSocket;

type ScheduleAudioOptions = {
  allowsRecording?: boolean;
  updatesCallStatus?: boolean;
  label?: string;
};

const OUTPUT_SAMPLE_RATE = 24000;
const OUTPUT_START_DELAY_SECONDS = 0.02;
const AGENT_AUDIO_MIC_SUPPRESSION_TAIL_MS = 450;
const AGENT_AUDIO_STATUS_TAIL_MS = 120;
const NATIVE_AUDIO_UNAVAILABLE_MESSAGE =
  "Native audio playback is not available in this build. Rebuild and reinstall the iOS development app.";

let audioContextConstructor: AudioContextConstructor | null = null;
let audioApiSessionConfigured = false;

function loadAudioContextConstructor() {
  if (!audioContextConstructor) {
    const nativeAudioModule = TurboModuleRegistry.get<NativeAudioApiModule>("AudioAPIModule");
    if (!nativeAudioModule?.install) throw new Error(NATIVE_AUDIO_UNAVAILABLE_MESSAGE);
    try {
      const audioContextModule = require("react-native-audio-api/lib/module/core/AudioContext") as {
        default?: AudioContextConstructor;
      };
      if (!audioContextModule.default) throw new Error("AudioContext export was not found.");
      audioContextConstructor = audioContextModule.default;
      if (!audioApiSessionConfigured) {
        const audioManagerModule = require("react-native-audio-api/lib/module/system/AudioManager") as AudioManagerModule;
        audioManagerModule.default?.setAudioSessionOptions?.({
          iosCategory: "playAndRecord",
          iosMode: "voiceChat",
          iosOptions: ["defaultToSpeaker", "allowBluetoothHFP", "allowBluetoothA2DP"],
          iosNotifyOthersOnDeactivation: false,
        });
        audioApiSessionConfigured = true;
      }
    } catch {
      throw new Error(NATIVE_AUDIO_UNAVAILABLE_MESSAGE);
    }
  }
  return audioContextConstructor;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return encode(binary);
}

function base64ToBytes(base64: string) {
  const binary = decode(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function int16ToBase64(samples: Int16Array) {
  return bytesToBase64(new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength));
}

function parseSampleRate(mimeType?: string) {
  const rate = String(mimeType || "").match(/rate=(\d+)/i)?.[1];
  const parsed = rate ? Number(rate) : OUTPUT_SAMPLE_RATE;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : OUTPUT_SAMPLE_RATE;
}

function pcm16Base64ToFloat32(base64: string) {
  const bytes = base64ToBytes(base64);
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const samples = new Float32Array(sampleCount);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let index = 0; index < sampleCount; index += 1) {
    samples[index] = Math.max(-1, Math.min(1, view.getInt16(index * 2, true) / 32768));
  }
  return samples;
}

function downmixToMono(samples: Int16Array, channels: number) {
  if (channels <= 1) return samples;
  const frameCount = Math.floor(samples.length / channels);
  const mono = new Int16Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      sum += samples[frame * channels + channel] || 0;
    }
    mono[frame] = Math.max(-32768, Math.min(32767, Math.round(sum / channels)));
  }
  return mono;
}

function resampleInt16(samples: Int16Array, sourceRate: number, targetRate: number) {
  if (!sourceRate || Math.round(sourceRate) === targetRate) return samples;
  const ratio = sourceRate / targetRate;
  const length = Math.max(1, Math.floor(samples.length / ratio));
  const output = new Int16Array(length);
  for (let index = 0; index < length; index += 1) {
    const sourceIndex = index * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(samples.length - 1, left + 1);
    const fraction = sourceIndex - left;
    output[index] = Math.round((samples[left] || 0) * (1 - fraction) + (samples[right] || 0) * fraction);
  }
  return output;
}

function createToneSamples(sampleRate = OUTPUT_SAMPLE_RATE, durationMs = 650, frequency = 440) {
  const sampleCount = Math.floor((sampleRate * durationMs) / 1000);
  const samples = new Float32Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    const envelope = Math.min(1, index / 800, (sampleCount - index) / 800);
    samples[index] = Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 0.36 * envelope;
  }
  return samples;
}

async function configureAudioSession(allowsRecording: boolean) {
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: "doNotMix",
    allowsRecording,
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  });
  await setIsAudioActiveAsync(true);
}

export function useLiveAgentCall({ accessToken, sessionToken, deviceId }: UseLiveAgentCallInput) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState("");
  const [previewQuota, setPreviewQuota] = useState<VoiceQuota | null>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const canSendMicRef = useRef(false);
  const playbackGenerationRef = useRef(0);
  const playbackQueueRef = useRef(Promise.resolve());
  const outputContextRef = useRef<OutputAudioContext | null>(null);
  const outputSourcesRef = useRef<Set<OutputAudioBufferSource>>(new Set());
  const nextPlayTimeRef = useRef(0);
  const scheduledUntilRef = useRef(0);
  const playedAudioSegmentsRef = useRef(0);
  const suppressMicUntilRef = useRef(0);
  const audioSessionAllowsRecordingRef = useRef<boolean | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStatusTimer = useCallback(() => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
  }, []);

  const addTranscript = useCallback((speaker: TranscriptItem["speaker"], text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    setTranscript((current) => [...current, { id: `${Date.now()}-${current.length}`, speaker, text: cleanText }]);
  }, []);

  const ensureAudioSession = useCallback(async (allowsRecording: boolean) => {
    if (audioSessionAllowsRecordingRef.current !== allowsRecording) {
      await configureAudioSession(allowsRecording);
      audioSessionAllowsRecordingRef.current = allowsRecording;
      return;
    }
    await setIsAudioActiveAsync(true);
  }, []);

  const ensureOutputContext = useCallback(async () => {
    let context = outputContextRef.current;
    if (!context || context.state === "closed") {
      const AudioContext = loadAudioContextConstructor();
      context = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      outputContextRef.current = context;
      nextPlayTimeRef.current = context.currentTime;
      scheduledUntilRef.current = context.currentTime;
    }
    return context;
  }, []);

  const clearPlayback = useCallback(() => {
    playbackGenerationRef.current += 1;
    clearStatusTimer();
    for (const source of outputSourcesRef.current) {
      try {
        source.stop(0);
      } catch {
        // Source may already have ended or may belong to a closed context.
      }
      try {
        source.disconnect();
      } catch {
        // Disconnect is best-effort during teardown.
      }
    }
    outputSourcesRef.current.clear();
    const context = outputContextRef.current;
    if (context && context.state !== "closed") {
      nextPlayTimeRef.current = context.currentTime;
      scheduledUntilRef.current = context.currentTime;
    } else {
      nextPlayTimeRef.current = 0;
      scheduledUntilRef.current = 0;
    }
    playedAudioSegmentsRef.current = 0;
    suppressMicUntilRef.current = 0;
    playbackQueueRef.current = Promise.resolve();
  }, [clearStatusTimer]);

  const scheduleListeningAfterPlayback = useCallback(
    (generation: number, context: OutputAudioContext) => {
      clearStatusTimer();
      const scheduleRestore = (delayMs: number) => {
        statusTimerRef.current = setTimeout(async () => {
          statusTimerRef.current = null;
          if (generation !== playbackGenerationRef.current) return;

          const activeContext = outputContextRef.current;
          const remainingMs = activeContext
            ? Math.max(0, Math.ceil((scheduledUntilRef.current - activeContext.currentTime) * 1000))
            : 0;
          if (remainingMs > 40) {
            scheduleRestore(remainingMs + AGENT_AUDIO_STATUS_TAIL_MS);
            return;
          }

          if (wsRef.current?.readyState !== WebSocket.OPEN) return;
          try {
            await ensureAudioSession(true);
          } catch (sessionError) {
            addTranscript(
              "system",
              `Audio session issue: ${sessionError instanceof Error ? sessionError.message : "could not restore microphone"}`,
            );
          }
          setStatus(canSendMicRef.current ? "listening" : "connecting");
        }, delayMs);
      };

      scheduleRestore(Math.max(0, Math.ceil((scheduledUntilRef.current - context.currentTime) * 1000)) + AGENT_AUDIO_STATUS_TAIL_MS);
    },
    [addTranscript, clearStatusTimer, ensureAudioSession],
  );

  const scheduleAudioSamples = useCallback(
    (samples: Float32Array, sampleRate: number, options: ScheduleAudioOptions = {}) => {
      if (!samples.length) return;
      const { allowsRecording = true, updatesCallStatus = true, label = "agent audio" } = options;
      const generation = playbackGenerationRef.current;

      playbackQueueRef.current = playbackQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (generation !== playbackGenerationRef.current) return;
          await ensureAudioSession(allowsRecording);
          const context = await ensureOutputContext();
          if (generation !== playbackGenerationRef.current) return;

          const buffer = context.createBuffer(1, samples.length, sampleRate);
          const channel = buffer.getChannelData(0);
          for (let index = 0; index < samples.length; index += 1) channel[index] = samples[index] || 0;

          const source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(context.destination);
          source.onEnded = () => {
            outputSourcesRef.current.delete(source);
            try {
              source.disconnect();
            } catch {
              // The source can already be disconnected after stop.
            }
          };
          outputSourcesRef.current.add(source);

          const startAt = Math.max(nextPlayTimeRef.current, context.currentTime + OUTPUT_START_DELAY_SECONDS);
          source.start(startAt);
          nextPlayTimeRef.current = startAt + buffer.duration;
          scheduledUntilRef.current = nextPlayTimeRef.current;

          const remainingPlaybackMs = Math.max(0, Math.ceil((scheduledUntilRef.current - context.currentTime) * 1000));
          suppressMicUntilRef.current = Math.max(
            suppressMicUntilRef.current,
            Date.now() + remainingPlaybackMs + AGENT_AUDIO_MIC_SUPPRESSION_TAIL_MS,
          );

          playedAudioSegmentsRef.current += 1;
          if (playedAudioSegmentsRef.current === 1 || playedAudioSegmentsRef.current % 10 === 0) {
            console.log(`[voice] scheduled ${label} segment ${playedAudioSegmentsRef.current}: ${samples.length} samples`);
          }

          if (updatesCallStatus) {
            setStatus("agent_speaking");
            scheduleListeningAfterPlayback(generation, context);
          }
        })
        .catch((playbackError) => {
          addTranscript("system", `Audio playback issue: ${playbackError instanceof Error ? playbackError.message : "unknown"}`);
        });
    },
    [addTranscript, ensureAudioSession, ensureOutputContext, scheduleListeningAfterPlayback],
  );

  const playPcmAudio = useCallback(
    (base64: string, mimeType?: string) => {
      const sampleRate = parseSampleRate(mimeType);
      scheduleAudioSamples(pcm16Base64ToFloat32(base64), sampleRate, {
        allowsRecording: true,
        updatesCallStatus: true,
        label: "agent audio",
      });
    },
    [scheduleAudioSamples],
  );

  const playDiagnosticTone = useCallback(() => {
    clearPlayback();
    scheduleAudioSamples(createToneSamples(), OUTPUT_SAMPLE_RATE, {
      allowsRecording: false,
      updatesCallStatus: false,
      label: "test tone",
    });
  }, [clearPlayback, scheduleAudioSamples]);

  const onMicBuffer = useCallback((buffer: { data: ArrayBuffer; sampleRate: number; channels: number }) => {
    const ws = wsRef.current;
    if (!canSendMicRef.current || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (Date.now() < suppressMicUntilRef.current) return;
    const mono = downmixToMono(new Int16Array(buffer.data), buffer.channels || 1);
    const samples = resampleInt16(mono, buffer.sampleRate || 16000, 16000);
    ws.send(JSON.stringify({ type: "audio", data: int16ToBase64(samples) }));
  }, []);

  const { stream, isStreaming } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: "int16",
    onBuffer: onMicBuffer,
  });

  const stop = useCallback(() => {
    canSendMicRef.current = false;
    try {
      stream.stop();
    } catch {
      // Stream may already be stopped.
    }
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    clearPlayback();
    setStatus((current) => (current === "error" ? current : "ended"));
  }, [clearPlayback, stream]);

  const start = useCallback(async () => {
    try {
      if (!accessToken && !sessionToken) {
        setError("Build an agent before starting the voice test.");
        setStatus("error");
        return;
      }
      stop();
      setError("");
      setTranscript([]);
      clearPlayback();
      setStatus("connecting");
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setStatus("error");
        setError("Microphone permission is required for the voice test.");
        return;
      }
      await ensureAudioSession(true);
      await ensureOutputContext();
      const WebSocketCtor = WebSocket as unknown as WebSocketWithHeaders;
      const ws = new WebSocketCtor(
        LIVE_WS_URL,
        null,
        sessionToken ? { headers: { Authorization: `Bearer ${sessionToken}` } } : null,
      );
      wsRef.current = ws;
      ws.onopen = async () => {
        try {
          ws.send(JSON.stringify({ type: "start", demoToken: accessToken, mobileDeviceId: deviceId }));
          await stream.start();
        } catch (startError) {
          const message = startError instanceof Error ? startError.message : "Could not start microphone stream.";
          setError(message);
          setStatus("error");
          addTranscript("system", message);
          stop();
        }
      };
      ws.onmessage = (event) => {
        const message = JSON.parse(String(event.data));
        if (message.type === "preview_quota") {
          setPreviewQuota({
            limitSeconds: Number(message.limitSeconds || 0),
            usedSeconds: Number(message.usedSeconds || 0),
            remainingSeconds: Number(message.remainingSeconds || 0),
          });
        }
        if (message.type === "ready") setStatus("agent_speaking");
        if (message.type === "mic_ready") {
          canSendMicRef.current = true;
          setStatus(Date.now() < suppressMicUntilRef.current ? "agent_speaking" : "listening");
        }
        if (message.type === "transcript") addTranscript(message.speaker || "agent", message.text || "");
        if (message.type === "interrupted" && Date.now() >= suppressMicUntilRef.current) clearPlayback();
        if (message.type === "audio") playPcmAudio(message.data, message.mimeType);
        if (message.type === "end_call") {
          addTranscript("system", message.reason || "Call ended.");
          stop();
        }
        if (message.type === "error") {
          setError(message.error || "Live agent connection failed.");
          setStatus("error");
          addTranscript("system", message.error || "Live agent connection failed.");
          stop();
        }
        if (message.type === "status" && ["agent_closed", "gemini_closed"].includes(message.status)) {
          stop();
        }
      };
      ws.onerror = () => {
        setError("The live connection could not be opened.");
        setStatus("error");
        stop();
      };
      ws.onclose = () => {
        canSendMicRef.current = false;
        try {
          stream.stop();
        } catch {
          // Stream may already be stopped.
        }
        setStatus((current) => (current === "error" ? current : "ended"));
      };
    } catch (startError) {
      const message = startError instanceof Error ? startError.message : "Could not start the voice test.";
      stop();
      setError(message);
      setStatus("error");
      addTranscript("system", message);
    }
  }, [accessToken, addTranscript, clearPlayback, deviceId, ensureAudioSession, ensureOutputContext, playPcmAudio, sessionToken, stop, stream]);

  return {
    status,
    error,
    transcript,
    previewQuota,
    isStreaming,
    start,
    stop,
    playDiagnosticTone,
  };
}
