import { useCallback, useRef, useState } from "react";
import {
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
} from "expo-audio";
import { decode, encode } from "base-64";

import { LIVE_WS_URL } from "./api";
import type { VoiceQuota } from "./types";

type CallStatus = "idle" | "connecting" | "listening" | "agent_speaking" | "ended" | "error";

type TranscriptItem = {
  id: string;
  speaker: "caller" | "agent" | "system";
  text: string;
};

type UseLiveAgentCallInput = {
  accessToken?: string;
  deviceId: string;
};

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
  const parsed = rate ? Number(rate) : 24000;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24000;
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

function writeString(target: Uint8Array, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    target[offset + index] = value.charCodeAt(index);
  }
}

function writeUint16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >> 8) & 0xff;
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >> 8) & 0xff;
  target[offset + 2] = (value >> 16) & 0xff;
  target[offset + 3] = (value >> 24) & 0xff;
}

function wavDataUriFromPcm16(base64: string, sampleRate: number) {
  const pcm = base64ToBytes(base64);
  const wav = new Uint8Array(44 + pcm.length);
  writeString(wav, 0, "RIFF");
  writeUint32(wav, 4, 36 + pcm.length);
  writeString(wav, 8, "WAVE");
  writeString(wav, 12, "fmt ");
  writeUint32(wav, 16, 16);
  writeUint16(wav, 20, 1);
  writeUint16(wav, 22, 1);
  writeUint32(wav, 24, sampleRate);
  writeUint32(wav, 28, sampleRate * 2);
  writeUint16(wav, 32, 2);
  writeUint16(wav, 34, 16);
  writeString(wav, 36, "data");
  writeUint32(wav, 40, pcm.length);
  wav.set(pcm, 44);
  return {
    uri: `data:audio/wav;base64,${bytesToBase64(wav)}`,
    durationMs: Math.ceil((pcm.length / 2 / sampleRate) * 1000),
  };
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function useLiveAgentCall({ accessToken, deviceId }: UseLiveAgentCallInput) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState("");
  const [previewQuota, setPreviewQuota] = useState<VoiceQuota | null>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const canSendMicRef = useRef(false);
  const playbackGenerationRef = useRef(0);
  const playbackQueueRef = useRef(Promise.resolve());
  const playersRef = useRef<Array<ReturnType<typeof createAudioPlayer>>>([]);

  const clearPlayback = useCallback(() => {
    playbackGenerationRef.current += 1;
    for (const player of playersRef.current) {
      try {
        player.pause();
        player.remove();
      } catch {
        // Player may already be released.
      }
    }
    playersRef.current = [];
    playbackQueueRef.current = Promise.resolve();
  }, []);

  const addTranscript = useCallback((speaker: TranscriptItem["speaker"], text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    setTranscript((current) => [...current, { id: `${Date.now()}-${current.length}`, speaker, text: cleanText }]);
  }, []);

  const playAgentAudio = useCallback((base64: string, mimeType?: string) => {
    const generation = playbackGenerationRef.current;
    const sampleRate = parseSampleRate(mimeType);
    playbackQueueRef.current = playbackQueueRef.current
      .then(async () => {
        if (generation !== playbackGenerationRef.current) return;
        const audio = wavDataUriFromPcm16(base64, sampleRate);
        const player = createAudioPlayer({ uri: audio.uri }, { updateInterval: 100, keepAudioSessionActive: true });
        playersRef.current.push(player);
        setStatus("agent_speaking");
        player.play();
        await wait(audio.durationMs + 40);
        player.remove();
        playersRef.current = playersRef.current.filter((candidate) => candidate !== player);
      })
      .catch((playbackError) => {
        addTranscript("system", `Audio playback issue: ${playbackError instanceof Error ? playbackError.message : "unknown"}`);
      });
  }, [addTranscript]);

  const onMicBuffer = useCallback((buffer: { data: ArrayBuffer; sampleRate: number; channels: number }) => {
    const ws = wsRef.current;
    if (!canSendMicRef.current || !ws || ws.readyState !== WebSocket.OPEN) return;
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
    if (!accessToken) {
      setError("Build an agent before starting the voice test.");
      setStatus("error");
      return;
    }
    setError("");
    setTranscript([]);
    setStatus("connecting");
    clearPlayback();
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setStatus("error");
      setError("Microphone permission is required for the voice test.");
      return;
    }
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      allowsRecording: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
    const ws = new WebSocket(LIVE_WS_URL);
    wsRef.current = ws;
    ws.onopen = async () => {
      ws.send(JSON.stringify({ type: "start", demoToken: accessToken, mobileDeviceId: deviceId }));
      await stream.start();
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
        setStatus("listening");
      }
      if (message.type === "transcript") addTranscript(message.speaker || "agent", message.text || "");
      if (message.type === "interrupted") clearPlayback();
      if (message.type === "audio") playAgentAudio(message.data, message.mimeType);
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
  }, [accessToken, addTranscript, clearPlayback, deviceId, playAgentAudio, stop, stream]);

  return {
    status,
    error,
    transcript,
    previewQuota,
    isStreaming,
    start,
    stop,
  };
}
