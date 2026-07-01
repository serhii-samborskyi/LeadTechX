import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import { parse as parseCsv } from "csv-parse/sync";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";
import readXlsxFile from "read-excel-file/node";
import { WebSocket, WebSocketServer } from "ws";

import { bookCalendarAppointment, listCalendarSlots } from "./calendar/index.js";
import {
  appointmentConfirmationCode,
  backfillAppointmentBookingKeys,
  verifyCalendarAppointment,
} from "./calendar/verification.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const USE_HTTPS = process.env.HTTPS === "true";
const SSL_CERT = process.env.SSL_CERT || path.join(__dirname, "certs/local-cert.pem");
const SSL_KEY = process.env.SSL_KEY || path.join(__dirname, "certs/local-key.pem");
const GEMINI_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

const prisma = new PrismaClient();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});
const app = express();
app.set("trust proxy", 1);
const server = USE_HTTPS
  ? https.createServer(
      {
        cert: fs.readFileSync(SSL_CERT),
        key: fs.readFileSync(SSL_KEY),
      },
      app,
    )
  : http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const telnyxWss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "/", "http://localhost").pathname;
  const target = pathname === "/live" ? wss : pathname === "/telnyx-media" ? telnyxWss : null;
  if (!target) {
    socket.destroy();
    return;
  }
  target.handleUpgrade(request, socket, head, (websocket) => target.emit("connection", websocket, request));
});

app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buffer) => {
      req.rawBody = buffer;
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use("/vendor/lucide", express.static(path.join(__dirname, "node_modules/lucide/dist/umd")));
app.use(express.static(path.join(__dirname, "public")));

const SESSION_COOKIE = "receptionist_session";
const SESSION_DAYS = 14;
const onboardingAttempts = new Map();
let prismaReconnectPromise = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientPrismaConnectionError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  return (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1017" ||
    message.includes("Engine is not yet connected") ||
    message.includes("Response from the Engine was empty") ||
    message.includes("Can't reach database server") ||
    message.includes("Server has closed the connection")
  );
}

async function ensurePrismaConnected() {
  if (!prismaReconnectPromise) {
    prismaReconnectPromise = prisma
      .$connect()
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        prismaReconnectPromise = null;
      });
  }
  return prismaReconnectPromise;
}

async function withPrismaRetry(label, operation, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientPrismaConnectionError(error) || attempt === attempts) break;
      console.warn(`[db] ${label} failed on attempt ${attempt}/${attempts}: ${error.message}`);
      await sleep(250 * attempt);
      await ensurePrismaConnected().catch(() => {});
    }
  }
  throw lastError;
}

function passwordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function passwordMatches(password, stored) {
  const [, salt, expectedHex] = String(stored || "").split("$");
  if (!salt || !expectedHex) return false;
  const actual = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function cookieValue(req, name) {
  const cookies = String(req.headers.cookie || "").split(";");
  for (const cookie of cookies) {
    const [key, ...value] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function sessionTokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function issueToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: sessionTokenHash(token) };
}

function setSessionCookie(req, res, token) {
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? "; Secure" : ""}`,
  );
}

function publicBusinessProfile(profile) {
  return {
    id: profile.id,
    businessName: profile.businessName,
    website: profile.website,
    summary: profile.summary,
    hours: profile.hours,
    services: profile.services,
    serviceArea: profile.serviceArea,
    contact: profile.contact,
    accountStatus: profile.accountStatus,
    trialEndsAt: profile.trialEndsAt,
    creditBalance: profile.creditBalance,
  };
}

async function currentUser(req) {
  const token = cookieValue(req, SESSION_COOKIE);
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sessionTokenHash(token) },
    include: { user: { include: { businessProfile: true } } },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.active) return null;
  return session.user;
}

async function requireAuth(req, res, next) {
  try {
    req.user = await currentUser(req);
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Administrator access required" });
  next();
}

function encryptionKey() {
  const source = process.env.APP_ENCRYPTION_KEY || process.env.GEMINI_API_KEY;
  if (!source) throw new Error("APP_ENCRYPTION_KEY must be configured before saving API keys");
  return crypto.createHash("sha256").update(source).digest();
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

function decryptSecret(value) {
  const [iv, tag, encrypted] = String(value).split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

async function systemSecret(secretKey, envKey) {
  const stored = await withPrismaRetry(
    `systemSecret:${secretKey}`,
    () => prisma.systemSecret.findUnique({ where: { secretKey } }),
    3,
  );
  return stored ? decryptSecret(stored.encrypted) : process.env[envKey] || "";
}

async function saveSystemSecret(secretKey, value) {
  if (!String(value || "").trim()) return;
  const normalized = String(value).trim();
  await prisma.systemSecret.upsert({
    where: { secretKey },
    create: { secretKey, encrypted: encryptSecret(normalized), hint: normalized.slice(-4) },
    update: { encrypted: encryptSecret(normalized), hint: normalized.slice(-4) },
  });
}

async function publicBaseUrl() {
  const settings = await getSettings();
  const value = String(settings.publicBaseUrl || process.env.PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
  if (!/^https:\/\//i.test(value)) throw new Error("A public HTTPS base URL is required for Telnyx");
  return value;
}

async function telnyxRequest(apiPath, options = {}) {
  const apiKey = await systemSecret("telnyx_api_key", "TELNYX_API_KEY");
  if (!apiKey) throw new Error("Telnyx API key is not configured");
  const response = await fetch(`https://api.telnyx.com/v2${apiPath}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.errors?.map((error) => error.detail || error.title).filter(Boolean).join("; ");
    throw new Error(detail || `Telnyx request failed with status ${response.status}`);
  }
  return data;
}

async function verifyTelnyxWebhook(req) {
  const signature = req.get("telnyx-signature-ed25519");
  const timestamp = req.get("telnyx-timestamp");
  if (!signature || !timestamp || !req.rawBody) return false;
  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return false;
  const publicKey = await systemSecret("telnyx_public_key", "TELNYX_PUBLIC_KEY");
  if (!publicKey) throw new Error("Telnyx public key is not configured");
  const rawKey = Buffer.from(publicKey, "base64");
  if (rawKey.length !== 32) throw new Error("Telnyx public key is invalid");
  const spkiPrefix = Buffer.from("302a300506032b6570032100", "hex");
  const key = crypto.createPublicKey({ key: Buffer.concat([spkiPrefix, rawKey]), format: "der", type: "spki" });
  return crypto.verify(
    null,
    Buffer.concat([Buffer.from(`${timestamp}|`), req.rawBody]),
    key,
    Buffer.from(signature, "base64"),
  );
}

function telnyxMediaToken(callControlId) {
  return crypto.createHmac("sha256", encryptionKey()).update(String(callControlId)).digest("base64url");
}

const TELNYX_STREAM_CODEC = "L16";
const TELNYX_STREAM_SAMPLE_RATE = 16000;
const TELNYX_OUTBOUND_CODEC = TELNYX_STREAM_CODEC;
const TELNYX_OUTBOUND_SAMPLE_RATE = TELNYX_STREAM_SAMPLE_RATE;
const TELNYX_OUTBOUND_FRAME_MS = 20;
const TELNYX_L16_ENDIAN = String(process.env.TELNYX_L16_ENDIAN || "LE").toUpperCase() === "BE" ? "BE" : "LE";
const TELNYX_PHONE_OUTPUT_MODE = "media_stream";
const TELNYX_LIVE_MODEL = String(process.env.TELNYX_LIVE_MODEL || "").trim();
const TELNYX_SPEAK_VOICE = "female";
const TELNYX_SPEAK_LANGUAGE = "en-US";
const BRIDGE_AUDIO_CAPTURE_ENABLED = process.env.BRIDGE_AUDIO_CAPTURE !== "0";
const BRIDGE_AUDIO_CAPTURE_MS = Number(process.env.BRIDGE_AUDIO_CAPTURE_MS || 30000);
const BRIDGE_AUDIO_CAPTURE_DIR = path.join(__dirname, "logs/audio-dumps");

async function telnyxMediaUrl(callControlId) {
  const baseUrl = await publicBaseUrl();
  const mediaUrl = new URL(baseUrl.replace(/^https:/, "wss:") + "/telnyx-media");
  mediaUrl.searchParams.set("call_control_id", callControlId);
  mediaUrl.searchParams.set("token", telnyxMediaToken(callControlId));
  return mediaUrl.toString();
}

async function telnyxStreamOptions(callControlId) {
  return {
    stream_url: await telnyxMediaUrl(callControlId),
    stream_track: "inbound_track",
    stream_codec: TELNYX_STREAM_CODEC,
    stream_sampling_rate: TELNYX_STREAM_SAMPLE_RATE,
    stream_bidirectional_mode: "rtp",
    stream_bidirectional_codec: TELNYX_OUTBOUND_CODEC,
    stream_bidirectional_sampling_rate: TELNYX_OUTBOUND_SAMPLE_RATE,
    stream_bidirectional_target_legs: "self",
  };
}

function decodeClientState(value) {
  if (!value) return {};
  try {
    return JSON.parse(Buffer.from(String(value), "base64").toString("utf8"));
  } catch {
    return {};
  }
}

function safeTokenMatches(actual, expected) {
  const left = Buffer.from(String(actual || ""));
  const right = Buffer.from(String(expected || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function interpolatedSample(readSample, sampleCount, position) {
  const lower = Math.min(sampleCount - 1, Math.floor(position));
  const upper = Math.min(sampleCount - 1, lower + 1);
  const fraction = position - lower;
  return Math.round(readSample(lower) * (1 - fraction) + readSample(upper) * fraction);
}

function l16ToPcm16Base64(payload, inputRate) {
  const input = Buffer.from(String(payload || ""), "base64");
  const sampleCount = Math.floor(input.length / 2);
  const outputCount = Math.floor(sampleCount * (16000 / inputRate));
  const output = Buffer.allocUnsafe(outputCount * 2);
  for (let index = 0; index < outputCount; index += 1) {
    const position = index * (inputRate / 16000);
    const sample = interpolatedSample(
      (sourceIndex) =>
        TELNYX_L16_ENDIAN === "BE" ? input.readInt16BE(sourceIndex * 2) : input.readInt16LE(sourceIndex * 2),
      sampleCount,
      position,
    );
    output.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), index * 2);
  }
  return output.toString("base64");
}

function pcm24kToL16Base64(payload, outputRate) {
  const input = Buffer.from(String(payload || ""), "base64");
  const sampleCount = Math.floor(input.length / 2);
  const outputCount = Math.floor(sampleCount * (outputRate / 24000));
  const output = Buffer.allocUnsafe(outputCount * 2);
  for (let index = 0; index < outputCount; index += 1) {
    const position = index * (24000 / outputRate);
    const sample = interpolatedSample((sourceIndex) => input.readInt16LE(sourceIndex * 2), sampleCount, position);
    const clamped = Math.max(-32768, Math.min(32767, sample));
    if (TELNYX_L16_ENDIAN === "BE") {
      output.writeInt16BE(clamped, index * 2);
    } else {
      output.writeInt16LE(clamped, index * 2);
    }
  }
  return output.toString("base64");
}

function createPcm24kToL16Converter(outputRate = 16000) {
  let pending = Buffer.alloc(0);
  let nextOutputPosition = 0;
  const inputSamplesPerOutputSample = 24000 / outputRate;

  return (payload) => {
    const input = Buffer.concat([pending, Buffer.from(String(payload || ""), "base64")]);
    const sampleCount = Math.floor(input.length / 2);
    if (sampleCount < 2) {
      pending = input;
      return "";
    }

    const maxOutputCount = Math.ceil(sampleCount / inputSamplesPerOutputSample);
    const output = Buffer.allocUnsafe(maxOutputCount * 2);
    let outputOffset = 0;

    while (nextOutputPosition < sampleCount - 1) {
      const lower = Math.floor(nextOutputPosition);
      const upper = lower + 1;
      const fraction = nextOutputPosition - lower;
      const lowerSample = input.readInt16LE(lower * 2);
      const upperSample = input.readInt16LE(upper * 2);
      const sample = Math.round(lowerSample * (1 - fraction) + upperSample * fraction);
      const clamped = Math.max(-32768, Math.min(32767, sample));
      if (TELNYX_L16_ENDIAN === "BE") {
        output.writeInt16BE(clamped, outputOffset);
      } else {
        output.writeInt16LE(clamped, outputOffset);
      }
      outputOffset += 2;
      nextOutputPosition += inputSamplesPerOutputSample;
    }

    const dropSamples = Math.max(0, Math.floor(nextOutputPosition) - 1);
    if (dropSamples > 0) {
      pending = input.subarray(dropSamples * 2);
      nextOutputPosition -= dropSamples;
    } else {
      pending = input;
    }

    return output.subarray(0, outputOffset).toString("base64");
  };
}

function summarizePcm16(buffer, endian = "LE", sampleLimit = 12) {
  const sampleCount = Math.floor(buffer.length / 2);
  if (!sampleCount) {
    return { sampleCount: 0, peak: 0, rms: 0, avgAbs: 0, firstSamples: [] };
  }
  let sumSquares = 0;
  let sumAbs = 0;
  let peak = 0;
  const firstSamples = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = endian === "BE" ? buffer.readInt16BE(index * 2) : buffer.readInt16LE(index * 2);
    const abs = Math.abs(sample);
    if (index < sampleLimit) firstSamples.push(sample);
    if (abs > peak) peak = abs;
    sumAbs += abs;
    sumSquares += sample * sample;
  }
  return {
    sampleCount,
    peak,
    rms: Math.round(Math.sqrt(sumSquares / sampleCount)),
    avgAbs: Math.round(sumAbs / sampleCount),
    firstSamples,
  };
}

function summarizeAudioPayload(payload, encoding, sampleRate) {
  const buffer = Buffer.from(String(payload || ""), "base64");
  const base = {
    bytes: buffer.length,
    sampleRate,
    encoding,
    hexPreview: buffer.subarray(0, 16).toString("hex"),
  };
  if (encoding === "L16") {
    return {
      ...base,
      be: summarizePcm16(buffer, "BE"),
      le: summarizePcm16(buffer, "LE"),
    };
  }
  if (encoding === "PCM16LE") {
    return {
      ...base,
      le: summarizePcm16(buffer, "LE"),
    };
  }
  if (encoding === "PCMU") {
    const decoded = Buffer.allocUnsafe(buffer.length * 2);
    for (let index = 0; index < buffer.length; index += 1) {
      decoded.writeInt16LE(muLawDecode(buffer[index]), index * 2);
    }
    return {
      ...base,
      decoded: summarizePcm16(decoded, "LE"),
    };
  }
  return base;
}

function safeFileSegment(value) {
  return String(value || "unknown")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 80);
}

function pcm16BigEndianToLittleEndian(buffer) {
  const output = Buffer.allocUnsafe(buffer.length - (buffer.length % 2));
  for (let offset = 0; offset < output.length; offset += 2) {
    output.writeInt16LE(buffer.readInt16BE(offset), offset);
  }
  return output;
}

function writePcm16Wav(filePath, pcmLittleEndian, sampleRate) {
  const data = Buffer.from(pcmLittleEndian);
  const header = Buffer.alloc(44);
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(filePath, Buffer.concat([header, data]));
}

function muLawDecode(value) {
  const encoded = (~value) & 0xff;
  const sign = encoded & 0x80;
  const exponent = (encoded >> 4) & 0x07;
  const mantissa = encoded & 0x0f;
  let sample = ((mantissa << 3) + 0x84) << exponent;
  sample -= 0x84;
  return sign ? -sample : sample;
}

function muLawEncode(value) {
  let sample = Math.max(-32635, Math.min(32635, Math.round(value)));
  const sign = sample < 0 ? 0x80 : 0;
  if (sample < 0) sample = -sample;
  sample += 0x84;
  let exponent = 7;
  for (let mask = 0x4000; exponent > 0 && (sample & mask) === 0; exponent -= 1, mask >>= 1) {
    // Find the segment containing this sample.
  }
  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  return (~(sign | (exponent << 4) | mantissa)) & 0xff;
}

function averagedPcmSample(readSample, sampleCount, startPosition, endPosition) {
  const start = Math.max(0, Math.floor(startPosition));
  const end = Math.min(sampleCount, Math.ceil(endPosition));
  if (end <= start) return interpolatedSample(readSample, sampleCount, startPosition);
  let total = 0;
  let count = 0;
  for (let sourceIndex = start; sourceIndex < end; sourceIndex += 1) {
    total += readSample(sourceIndex);
    count += 1;
  }
  return Math.round(total / Math.max(1, count));
}

function telephonySpeechSample(sample) {
  const boosted = sample * 1.18;
  return Math.max(-32635, Math.min(32635, boosted));
}

function pcmuToPcm16Base64(payload, inputRate = 8000) {
  const input = Buffer.from(String(payload || ""), "base64");
  const sampleCount = input.length;
  const outputCount = Math.floor(sampleCount * (16000 / inputRate));
  const output = Buffer.allocUnsafe(outputCount * 2);
  for (let index = 0; index < outputCount; index += 1) {
    const position = index * (inputRate / 16000);
    const sample = interpolatedSample((sourceIndex) => muLawDecode(input[sourceIndex]), sampleCount, position);
    output.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), index * 2);
  }
  return output.toString("base64");
}

function pcm24kToPcmuBase64(payload, outputRate = 8000) {
  const input = Buffer.from(String(payload || ""), "base64");
  const sampleCount = Math.floor(input.length / 2);
  const outputCount = Math.floor(sampleCount * (outputRate / 24000));
  const output = Buffer.allocUnsafe(outputCount);
  const inputSamplesPerOutputSample = 24000 / outputRate;
  for (let index = 0; index < outputCount; index += 1) {
    const startPosition = index * inputSamplesPerOutputSample;
    const endPosition = (index + 1) * inputSamplesPerOutputSample;
    const sample = averagedPcmSample(
      (sourceIndex) => input.readInt16LE(sourceIndex * 2),
      sampleCount,
      startPosition,
      endPosition,
    );
    output[index] = muLawEncode(telephonySpeechSample(sample));
  }
  return output.toString("base64");
}

function createPcm24kToPcmuConverter(outputRate = 8000) {
  let pending = Buffer.alloc(0);
  const inputSamplesPerOutputSample = 24000 / outputRate;
  const inputBytesPerOutputSample = inputSamplesPerOutputSample * 2;
  return (payload) => {
    const input = Buffer.concat([pending, Buffer.from(String(payload || ""), "base64")]);
    const outputCount = Math.floor(input.length / inputBytesPerOutputSample);
    const output = Buffer.allocUnsafe(outputCount);
    for (let index = 0; index < outputCount; index += 1) {
      const offset = Math.floor(index * inputBytesPerOutputSample);
      const sampleA = input.readInt16LE(offset);
      const sampleB = input.readInt16LE(offset + 2);
      const sampleC = input.readInt16LE(offset + 4);
      output[index] = muLawEncode(telephonySpeechSample(Math.round((sampleA + sampleB + sampleC) / 3)));
    }
    pending = input.subarray(outputCount * inputBytesPerOutputSample);
    return output.toString("base64");
  };
}

async function logVoiceCallEvent(callControlId, eventType, detail = {}) {
  try {
    const call = await withPrismaRetry(
      `logVoiceCallEvent.findUnique:${eventType}`,
      () => prisma.voiceCall.findUnique({ where: { callControlId }, select: { id: true } }),
      3,
    );
    if (!call) return;
    await withPrismaRetry(
      `logVoiceCallEvent.create:${eventType}`,
      () =>
        prisma.voiceCallEvent.create({
          data: { voiceCallId: call.id, eventType, detail },
        }),
      3,
    );
    if (eventType === "error") {
      await withPrismaRetry(
        "logVoiceCallEvent.updateLastError",
        () =>
          prisma.voiceCall.update({
            where: { id: call.id },
            data: { lastError: String(detail.message || "Unknown voice call error").slice(0, 1000) },
          }),
        3,
      );
    }
  } catch (error) {
    console.warn(`[db] voice call event skipped (${eventType}): ${error.message}`);
  }
}

function shortCallSummary({ fromNumber, toNumber, status, transcript }) {
  const firstLines = String(transcript || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(" ");
  if (firstLines) return firstLines.slice(0, 700);
  return `Incoming call from ${fromNumber || "unknown caller"} to ${toNumber || "business number"}${status ? ` (${status})` : ""}.`;
}

function extractLeadFieldsFromTranscript(transcript, fallback = {}) {
  const text = String(transcript || "");
  const phone = fallback.phone || text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0] || null;
  const email = fallback.email || text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
  return {
    phone,
    email,
    transcriptCharacters: text.length,
    lastUpdatedAt: new Date().toISOString(),
  };
}

async function ensureCallLead({ voiceCall, profile, source = "incoming_call" }) {
  if (!voiceCall || !profile) return null;
  const existing = await prisma.lead.findUnique({ where: { voiceCallId: voiceCall.id } }).catch(() => null);
  const data = {
    businessName: profile.businessName,
    website: profile.website,
    businessProfileId: profile.id,
    name: existing?.name || (voiceCall.fromNumber ? `Caller ${voiceCall.fromNumber}` : "Unknown caller"),
    phone: existing?.phone || voiceCall.fromNumber || null,
    source,
    status: existing?.status || "new",
    summary: shortCallSummary(voiceCall),
    transcript: voiceCall.transcript || existing?.transcript || null,
    extractedFields: extractLeadFieldsFromTranscript(voiceCall.transcript, { phone: voiceCall.fromNumber || existing?.phone }),
  };
  return prisma.lead.upsert({
    where: { voiceCallId: voiceCall.id },
    create: { ...data, voiceCallId: voiceCall.id },
    update: data,
  });
}

async function appendVoiceCallTranscript({ callId, callControlId, speaker, text, profile }) {
  const clean = String(text || "").trim();
  if (!clean) return;
  try {
    const current = await withPrismaRetry(
      "appendVoiceCallTranscript.findUnique",
      () =>
        prisma.voiceCall.findUnique({
          where: callId ? { id: callId } : { callControlId },
          include: { lead: true, businessProfile: true, outboundQualificationCall: { include: { lead: true } } },
        }),
      3,
    );
    if (!current) return;
    const transcript = `${current.transcript ? `${current.transcript}\n` : ""}[${speaker}] ${clean}`;
    const updated = await withPrismaRetry(
      "appendVoiceCallTranscript.updateVoiceCall",
      () =>
        prisma.voiceCall.update({
          where: { id: current.id },
          data: { transcript },
          include: { lead: true, businessProfile: true },
        }),
      3,
    );
    if (current.outboundQualificationCall?.lead) {
      const lead = current.outboundQualificationCall.lead;
      await withPrismaRetry(
        "appendVoiceCallTranscript.updateLead",
        () =>
          prisma.lead.update({
            where: { id: lead.id },
            data: {
              transcript,
              summary: shortCallSummary({ ...updated, transcript }),
              extractedFields: {
                ...(lead.extractedFields && typeof lead.extractedFields === "object" ? lead.extractedFields : {}),
                callTranscript: extractLeadFieldsFromTranscript(transcript, {
                  phone: lead.phone || current.toNumber,
                  email: lead.email,
                }),
              },
            },
          }),
        3,
      );
    }
    const leadProfile = profile || updated.businessProfile;
    if (leadProfile && updated.callMode === "business") {
      await ensureCallLead({ voiceCall: updated, profile: leadProfile });
    }
  } catch (error) {
    console.warn(`[db] transcript persistence skipped: ${error.message}`);
  }
}

async function bootstrapAdmin() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");
  if (!email || !password) {
    console.warn("[auth] Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first administrator.");
    return;
  }
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash: passwordHash(password), role: "admin", name: "Administrator" },
    update: { passwordHash: passwordHash(password), role: "admin", active: true },
  });
}

async function bootstrapBusinessLifecycle() {
  const claimed = await prisma.businessProfile.findMany({
    where: { users: { some: { active: true } }, accountStatus: "unclaimed" },
    select: { id: true },
  });
  if (claimed.length) {
    await prisma.businessProfile.updateMany({
      where: { id: { in: claimed.map((profile) => profile.id) } },
      data: { accountStatus: "paid" },
    });
  }
  await prisma.businessProfile.updateMany({
    where: { accountStatus: "trial", trialEndsAt: { lte: new Date() } },
    data: { accountStatus: "expired" },
  });
}

function normalizeBusinessName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeWebsite(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function normalizeE164Phone(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const cleaned = trimmed.replace(/[^\d+]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) return cleaned;
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return cleaned;
}

function businessCacheKey(businessName, website) {
  const base = `${businessName.toLowerCase()}|${website || ""}`;
  return crypto.createHash("sha256").update(base).digest("hex");
}

function stripJsonFence(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) return raw.slice(first, last + 1);
  return raw;
}

function asText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return value ? String(value) : "";
}

async function getSettings() {
  return prisma.appSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      researchModel: "gemini-3.1-pro-preview",
      liveModel: "models/gemini-3.1-flash-live-preview",
      voiceName: "Puck",
      language: "English",
      agentName: "Alex",
    },
    update: {},
  });
}

function buildResearchPrompt(businessName, website) {
  return `
Research this business for an AI receptionist demo.

Business name: ${businessName}
Website: ${website || "unknown"}

Use current public web information. If a website is supplied, inspect it with URL context and use Google Search for corroboration. Return only valid JSON with this exact shape:
{
  "businessName": "official or best-known name",
  "website": "official website if found",
  "summary": "2-4 sentence factual overview",
  "hours": "known business hours or unknown",
  "services": ["service 1", "service 2"],
  "serviceArea": "cities, neighborhoods, or region served",
  "address": "physical address or unknown",
  "phone": "phone or unknown",
  "email": "email or unknown",
  "pricing": "pricing details or unknown",
  "bookingPolicy": "appointment, reservation, walk-in, or unknown",
  "faq": [{"question": "question", "answer": "answer"}],
  "sourceUrls": ["https://..."]
}

Be conservative. If a detail is uncertain, write "unknown" instead of inventing it.
`.trim();
}

function buildSystemPrompt(profile) {
  const data = profile.rawData || {};
  return `
You are the real-time voice receptionist for ${profile.businessName}.

Business profile:
- Name: ${profile.businessName}
- Website: ${profile.website || "unknown"}
- Summary: ${profile.summary || "unknown"}
- Hours: ${profile.hours || "unknown"}
- Services: ${profile.services || "unknown"}
- Service area: ${profile.serviceArea || "unknown"}
- Contact: ${profile.contact || "unknown"}
- Address: ${data.address || "unknown"}
- Pricing: ${data.pricing || "unknown"}
- Booking policy: ${data.bookingPolicy || "unknown"}
- FAQ: ${JSON.stringify(data.faq || [])}

Receptionist behavior:
- Speak naturally, briefly, and warmly.
- Answer questions using only the business profile above and the caller's conversation.
- If a fact is unknown, say you do not have that detail and offer to take a message.
- Collect name, phone, and email whenever booking an appointment, capturing a lead, or escalating.
- Use schedule_appointment when the caller wants an appointment, reservation, consultation, demo, or callback at a specific time.
- Use capture_lead when the caller is interested but not ready to schedule.
- Use transfer_message when the caller asks for a person, wants a transfer, has a complaint, or needs human follow-up.
- Use end_call when the caller says goodbye, asks to hang up, asks to end the call, or the conversation is clearly complete.
- Confirm important details before using a tool.
- Never claim an appointment is booked from conversation alone.
- Only say "booked" or "confirmed" after a booking tool result has verified=true and status="confirmed".
- If status="requested", say the request is pending confirmation, not booked.
- If a booking tool reports an error or verified=false, clearly say it was not booked and offer another slot.
`.trim();
}

async function researchBusiness({ businessName, website, researchModel, forceRefresh = false }) {
  const normalized = normalizeBusinessName(businessName);
  const normalizedWebsite = normalizeWebsite(website);
  if (!normalized) {
    throw new Error("business_name query parameter is required");
  }

  const cacheKey = businessCacheKey(normalized, normalizedWebsite);
  if (!forceRefresh) {
    const cached = await prisma.businessProfile.findUnique({ where: { cacheKey } });
    if (cached) return { profile: cached, cached: true };
  }

  const prompt = buildResearchPrompt(normalized, normalizedWebsite);
  const tools = normalizedWebsite ? [{ urlContext: {} }, { googleSearch: {} }] : [{ googleSearch: {} }];
  const geminiApiKey = await systemSecret("gemini_api_key", "GEMINI_API_KEY");
  if (!geminiApiKey) throw new Error("Gemini API key is not configured");
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const response = await ai.models.generateContent({
    model: researchModel,
    contents: [prompt],
    config: {
      tools,
      temperature: 0.2,
    },
  });

  const text = response.text || "";
  let data;
  try {
    data = JSON.parse(stripJsonFence(text));
  } catch (error) {
    data = {
      businessName: normalized,
      website: normalizedWebsite,
      summary: text.slice(0, 2000) || "Research completed, but JSON parsing failed.",
      hours: "unknown",
      services: [],
      serviceArea: "unknown",
      address: "unknown",
      phone: "unknown",
      email: "unknown",
      pricing: "unknown",
      bookingPolicy: "unknown",
      faq: [],
      sourceUrls: [],
      parseError: error.message,
    };
  }

  const finalName = normalizeBusinessName(data.businessName || normalized);
  const finalWebsite = normalizeWebsite(data.website) || normalizedWebsite;
  const contactParts = [data.phone, data.email, data.address].filter((item) => item && item !== "unknown");
  const systemPrompt = buildSystemPrompt({
    businessName: finalName,
    website: finalWebsite,
    summary: data.summary,
    hours: asText(data.hours),
    services: asText(data.services),
    serviceArea: asText(data.serviceArea),
    contact: contactParts.join(" | "),
    rawData: data,
  });

  const profile = await prisma.businessProfile.upsert({
    where: { cacheKey },
    create: {
      cacheKey,
      businessName: finalName,
      website: finalWebsite,
      normalized,
      summary: asText(data.summary),
      hours: asText(data.hours),
      services: asText(data.services),
      serviceArea: asText(data.serviceArea),
      contact: contactParts.join(" | "),
      rawData: data,
      systemPrompt,
      researchModel,
      sourceUrls: data.sourceUrls || [],
    },
    update: {
      businessName: finalName,
      website: finalWebsite,
      summary: asText(data.summary),
      hours: asText(data.hours),
      services: asText(data.services),
      serviceArea: asText(data.serviceArea),
      contact: contactParts.join(" | "),
      rawData: data,
      systemPrompt,
      researchModel,
      sourceUrls: data.sourceUrls || [],
    },
  });

  return { profile, cached: false };
}

function websiteIdentity(value) {
  const normalized = normalizeWebsite(value);
  if (!normalized) return "";
  try {
    const url = new URL(normalized);
    return `${url.hostname.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return normalized.toLowerCase().replace(/\/$/, "");
  }
}

async function findBusinessMatch(businessName, website) {
  const name = normalizeBusinessName(businessName);
  const websiteKey = websiteIdentity(website);
  const candidates = await prisma.businessProfile.findMany({
    where: name ? { businessName: { equals: name, mode: "insensitive" } } : undefined,
    include: { users: { select: { id: true } } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  if (websiteKey) {
    const websiteMatch = candidates.find((profile) => websiteIdentity(profile.website) === websiteKey);
    if (websiteMatch) return websiteMatch;
    const allWebsiteCandidates = await prisma.businessProfile.findMany({
      where: { website: { not: null } },
      include: { users: { select: { id: true } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    const match = allWebsiteCandidates.find((profile) => websiteIdentity(profile.website) === websiteKey);
    if (match) return match;
  }
  return candidates[0] || null;
}

function enforceOnboardingRateLimit(req) {
  const now = Date.now();
  const key = String(req.ip || req.socket.remoteAddress || "unknown");
  const recent = (onboardingAttempts.get(key) || []).filter((timestamp) => now - timestamp < 60 * 60 * 1000);
  if (recent.length >= 5) throw new Error("Too many demo agents were created from this connection. Try again later.");
  recent.push(now);
  onboardingAttempts.set(key, recent);
}

async function allocateDemoNumber(profile, settings) {
  const now = new Date();
  await prisma.demoNumberAssignment.deleteMany({ where: { expiresAt: { lte: now } } });
  const numbers = await prisma.voiceNumber.findMany({
    where: { numberType: "demo", status: "active" },
    include: { demoAssignments: { where: { expiresAt: { gt: now } }, select: { id: true } } },
    orderBy: { id: "asc" },
  });
  const available = numbers
    .filter((number) => number.demoAssignments.length < settings.demoNumberCapacity)
    .sort((a, b) => a.demoAssignments.length - b.demoAssignments.length || a.id - b.id)[0];
  if (!available) {
    await prisma.demoNumberAssignment.deleteMany({ where: { businessProfileId: profile.id } });
    return null;
  }
  const assignment = await prisma.demoNumberAssignment.upsert({
    where: { businessProfileId: profile.id },
    create: {
      voiceNumberId: available.id,
      businessProfileId: profile.id,
      expiresAt: profile.trialEndsAt,
      status: "waiting",
    },
    update: {
      voiceNumberId: available.id,
      expiresAt: profile.trialEndsAt,
      status: "waiting",
      callerBindings: { deleteMany: {} },
    },
    include: { voiceNumber: true },
  });
  return assignment;
}

async function resolveInboundBusiness(voiceNumber, callerPhone) {
  if (!voiceNumber) return null;
  if (voiceNumber.numberType !== "demo") return voiceNumber.businessProfile || null;
  const now = new Date();
  const normalizedCaller = String(callerPhone || "").trim();
  const [binding, waiting] = await Promise.all([
    normalizedCaller
      ? prisma.demoCallerBinding.findUnique({
          where: { callerPhone: normalizedCaller },
          include: { demoNumberAssignment: { include: { businessProfile: true } } },
        })
      : null,
    prisma.demoNumberAssignment.findFirst({
      where: { voiceNumberId: voiceNumber.id, status: "waiting", expiresAt: { gt: now } },
      include: { businessProfile: true, callerBindings: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const validBinding =
    binding?.demoNumberAssignment.voiceNumberId === voiceNumber.id && binding.demoNumberAssignment.expiresAt > now
      ? binding
      : null;
  if (!waiting || (validBinding && validBinding.demoNumberAssignment.createdAt >= waiting.createdAt)) {
    return validBinding?.demoNumberAssignment.businessProfile || null;
  }
  const settings = await getSettings();
  if (!normalizedCaller || waiting.callerBindings.length >= settings.demoCallerLimit) return null;
  await prisma.demoCallerBinding.deleteMany({ where: { callerPhone: normalizedCaller } });
  await prisma.demoCallerBinding.create({
    data: { demoNumberAssignmentId: waiting.id, callerPhone: normalizedCaller },
  });
  await prisma.demoNumberAssignment.update({ where: { id: waiting.id }, data: { status: "active" } });
  return waiting.businessProfile;
}

async function fastAgentSession(token) {
  if (!token) return null;
  const session = await prisma.fastAgentSession.findUnique({
    where: { tokenHash: sessionTokenHash(token) },
    include: { businessProfile: true },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  await prisma.fastAgentSession.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
  return session;
}

function requestBaseUrl(req, settings) {
  const configured = String(settings.publicBaseUrl || process.env.PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(configured)) return configured;
  return `${req.protocol}://${req.get("host")}`;
}

async function sendClaimEmail({ settings, email, setupUrl, businessName }) {
  const smtpUser = await systemSecret("smtp_username", "SMTP_USERNAME");
  const smtpPassword = await systemSecret("smtp_password", "SMTP_PASSWORD");
  if (!settings.smtpHost || !settings.smtpFromEmail) return false;
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: smtpUser ? { user: smtpUser, pass: smtpPassword } : undefined,
  });
  await transporter.sendMail({
    from: { name: settings.smtpFromName || "AI Receptionist", address: settings.smtpFromEmail },
    to: email,
    subject: `Finish setting up ${businessName}`,
    text: `Your AI receptionist is ready. Set your password and finish your account here:\n\n${setupUrl}\n\nThis link expires in ${settings.claimLinkDays} days.`,
    html: `<p>Your AI receptionist for <strong>${String(businessName).replace(/[<>&"]/g, "")}</strong> is ready.</p><p><a href="${setupUrl}">Set your password and finish your account</a></p><p>This link expires in ${settings.claimLinkDays} days.</p>`,
  });
  return true;
}

async function provisionTrialBusiness({ businessName, website, settings }) {
  const normalizedName = normalizeBusinessName(businessName);
  if (!normalizedName) throw new Error("Business name is required before building the agent");
  const normalizedWebsite = normalizeWebsite(website);
  const existing = await findBusinessMatch(normalizedName, normalizedWebsite);
  const activeTrial = existing?.accountStatus === "trial" && existing.trialEndsAt > new Date();
  if (existing && (existing.users.length || existing.accountStatus === "paid")) {
    return { claimed: true, profile: null, accessToken: null, demoAssignment: null, cached: true };
  }
  const researched = existing
    ? { profile: existing, cached: true }
    : await researchBusiness({ businessName: normalizedName, website: normalizedWebsite, researchModel: settings.researchModel });
  let profile = researched.profile;
  if (!activeTrial) {
    const trialStartedAt = new Date();
    profile = await prisma.businessProfile.update({
      where: { id: profile.id },
      data: {
        accountStatus: "trial",
        trialStartedAt,
        trialEndsAt: new Date(trialStartedAt.getTime() + settings.trialDays * 86400000),
        creditBalance: settings.trialCredits,
      },
    });
  }
  await ensureBusinessConfig(profile);
  const access = issueToken();
  await prisma.fastAgentSession.create({
    data: { tokenHash: access.tokenHash, businessProfileId: profile.id, expiresAt: profile.trialEndsAt },
  });
  let demoAssignment = await prisma.demoNumberAssignment.findUnique({
    where: { businessProfileId: profile.id },
    include: { voiceNumber: true },
  });
  if (!demoAssignment || demoAssignment.expiresAt <= new Date()) demoAssignment = await allocateDemoNumber(profile, settings);
  return { claimed: false, profile, accessToken: access.token, demoAssignment, cached: researched.cached };
}

async function lookupOnboardingBusiness(callerPhone, settings) {
  const template = String(settings.onboardingLookupUrl || "").trim();
  if (!template) return null;
  let lookupUrl;
  if (template.includes("{{phone}}")) {
    lookupUrl = template.replaceAll("{{phone}}", encodeURIComponent(callerPhone));
  } else {
    const url = new URL(template);
    url.searchParams.set("phone", callerPhone);
    lookupUrl = url.toString();
  }
  const response = await fetch(lookupUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Business lookup returned HTTP ${response.status}`);
  const data = await response.json();
  const businessName = normalizeBusinessName(data.business_name || data.businessName || data.name);
  const website = normalizeWebsite(data.website || data.url);
  return { businessName: businessName || null, website, raw: data };
}

async function sendBlueBubblesMessage({ settings, toPhone, message }) {
  const password = await systemSecret("bluebubbles_password", "BLUEBUBBLES_PASSWORD");
  if (!settings.blueBubblesBaseUrl || !password) throw new Error("BlueBubbles is not configured");
  const url = new URL(settings.blueBubblesSendPath || "/api/v1/chat/new", settings.blueBubblesBaseUrl);
  url.searchParams.set("password", password);
  const isNewChat = url.pathname.includes("/chat/new");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(
      isNewChat
        ? { addresses: [toPhone], message }
        : { chatGuid: `iMessage;-;${toPhone}`, message, tempGuid: crypto.randomUUID(), method: "apple-script" },
    ),
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || (data.status && Number(data.status) >= 400)) {
    throw new Error(data.message || `BlueBubbles returned HTTP ${response.status}`);
  }
  return { providerMessageId: data.data?.guid || data.data?.tempGuid || null, detail: data };
}

async function sendSentDmMessage({ settings, toPhone, setupUrl, businessName }) {
  const apiKey = await systemSecret("sentdm_api_key", "SENTDM_API_KEY");
  if (!apiKey || (!settings.sentDmTemplateId && !settings.sentDmTemplateName)) {
    throw new Error("Sent.dm API key and template are not configured");
  }
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-key": apiKey,
    "Idempotency-Key": `onboarding-${crypto.randomUUID()}`,
  };
  if (settings.sentDmProfileId) headers["x-profile-id"] = settings.sentDmProfileId;
  const template = {
    parameters: { business_name: businessName, setup_url: setupUrl },
  };
  if (settings.sentDmTemplateId) template.id = settings.sentDmTemplateId;
  if (settings.sentDmTemplateName) template.name = settings.sentDmTemplateName;
  const response = await fetch("https://api.sent.dm/v3/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({ to: [toPhone], channel: ["sent"], template, sandbox: false }),
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error?.message || `Sent.dm returned HTTP ${response.status}`);
  return { providerMessageId: data.data?.recipients?.[0]?.message_id || null, detail: data };
}

async function deliverSetupLink({ settings, toPhone, setupUrl, businessName }) {
  const providers = [settings.messagePrimaryProvider, settings.messageFailoverProvider].filter(
    (provider, index, list) => provider && provider !== "none" && list.indexOf(provider) === index,
  );
  const errors = [];
  for (const provider of providers) {
    const delivery = await prisma.messageDelivery.create({
      data: { provider, purpose: "onboarding_claim", toPhone, status: "sending" },
    });
    try {
      const result =
        provider === "bluebubbles"
          ? await sendBlueBubblesMessage({ settings, toPhone, message: `Your AI receptionist for ${businessName} is ready: ${setupUrl}` })
          : provider === "sentdm"
            ? await sendSentDmMessage({ settings, toPhone, setupUrl, businessName })
            : (() => {
                throw new Error(`Unsupported messaging provider: ${provider}`);
              })();
      await prisma.messageDelivery.update({
        where: { id: delivery.id },
        data: { status: "sent", providerMessageId: result.providerMessageId, detail: result.detail },
      });
      return { provider, ...result };
    } catch (error) {
      errors.push(`${provider}: ${error.message}`);
      await prisma.messageDelivery.update({ where: { id: delivery.id }, data: { status: "failed", error: error.message } });
    }
  }
  throw new Error(errors.join("; ") || "No messaging provider is configured");
}

async function createPhoneClaimLink({ profile, email, settings }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error("A valid email is required");
  if (await prisma.user.findUnique({ where: { email: normalizedEmail } })) throw new Error("That email already belongs to an account");
  await prisma.accountClaimToken.deleteMany({ where: { businessProfileId: profile.id, usedAt: null } });
  const claim = issueToken();
  await prisma.accountClaimToken.create({
    data: {
      tokenHash: claim.tokenHash,
      email: normalizedEmail,
      businessProfileId: profile.id,
      expiresAt: new Date(Date.now() + settings.claimLinkDays * 86400000),
    },
  });
  const baseUrl = String(settings.publicBaseUrl || process.env.PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(baseUrl)) throw new Error("Public base URL is not configured");
  return { email: normalizedEmail, setupUrl: `${baseUrl}/set-password/?token=${encodeURIComponent(claim.token)}` };
}

function liveModelPath(model) {
  const trimmed = String(model || "").trim();
  if (!trimmed) return "models/gemini-3.1-flash-live-preview";
  return trimmed.startsWith("models/") ? trimmed : `models/${trimmed}`;
}

function sessionIdentity(agentName, language) {
  const safeAgentName = String(agentName || "Alex").trim().slice(0, 80) || "Alex";
  const safeLanguage = String(language || "English").trim().slice(0, 80) || "English";
  return { agentName: safeAgentName, language: safeLanguage };
}

const businessConfigInclude = {
  intakeFields: { orderBy: { sortOrder: "asc" } },
  knowledgeEntries: { orderBy: { updatedAt: "desc" } },
  priceEntries: { orderBy: { updatedAt: "desc" } },
  availabilityRules: { orderBy: { dayOfWeek: "asc" } },
};

function fieldKey(value) {
  const normalized = String(value || "field")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
  return normalized || `field_${Date.now()}`;
}

async function ensureBusinessConfig(profile) {
  const existing = await prisma.businessConfig.findUnique({
    where: { businessProfileId: profile.id },
    include: businessConfigInclude,
  });
  if (existing) return existing;

  return prisma.businessConfig.create({
    data: {
      businessProfileId: profile.id,
      intakeFields: {
        create: [
          { fieldKey: "name", label: "Full name", fieldType: "text", required: true, sortOrder: 0 },
          { fieldKey: "phone", label: "Phone number", fieldType: "phone", required: true, sortOrder: 1 },
          { fieldKey: "email", label: "Email", fieldType: "email", required: false, sortOrder: 2 },
          { fieldKey: "reason", label: "Reason for appointment", fieldType: "text", required: true, sortOrder: 3 },
        ],
      },
      availabilityRules: {
        create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          startTime: "09:00",
          endTime: "17:00",
          enabled: dayOfWeek >= 1 && dayOfWeek <= 5,
        })),
      },
    },
    include: businessConfigInclude,
  });
}

async function adminContext(businessName, website, user) {
  if (user?.role === "business") {
    if (!user.businessProfileId) throw new Error("No business is assigned to this account");
    const profile = await prisma.businessProfile.findUnique({ where: { id: user.businessProfileId } });
    if (!profile) throw new Error("Assigned business was not found");
    return { profile, config: await ensureBusinessConfig(profile) };
  }
  const settings = await getSettings();
  const { profile } = await researchBusiness({
    businessName,
    website,
    researchModel: settings.researchModel,
  });
  const config = await ensureBusinessConfig(profile);
  return { profile, config };
}

function priceDisplay(entry) {
  const currency = entry.currency || "USD";
  if (entry.priceType === "call_for_quote") return "Call for quote";
  if (entry.priceType === "range") return `${currency} ${entry.amountMin ?? "?"}-${entry.amountMax ?? "?"}`;
  if (entry.priceType === "starting_at") return `Starting at ${currency} ${entry.amountMin ?? "?"}`;
  return `${currency} ${entry.amountMin ?? "?"}`;
}

function runtimeBusinessInstructions(config) {
  const intake = config.intakeFields.map((field) => ({
    key: field.fieldKey,
    label: field.label,
    type: field.fieldType,
    required: field.required,
    options: field.options || [],
  }));
  const knowledge = config.knowledgeEntries.slice(0, 200).map((entry) => ({
    question: entry.question,
    answer: entry.answer,
    category: entry.category,
  }));
  const prices = config.priceEntries.slice(0, 200).map((entry) => ({
    item: entry.item,
    description: entry.description,
    price: priceDisplay(entry),
    category: entry.category,
  }));
  return `
Business-managed receptionist configuration:
- Appointment mode: ${config.appointmentMode === "instant" ? "Book available slots immediately" : "Create pending appointment requests"}.
- Calendar timezone: ${config.timezone}.
- Default appointment duration: ${config.slotDurationMinutes} minutes.
- Information to collect before an appointment: ${JSON.stringify(intake)}
- Knowledge base: ${JSON.stringify(knowledge)}
- Prices: ${JSON.stringify(prices)}
- Extra instructions: ${config.extraInstructions || "none"}

Use get_available_slots before offering or scheduling a time. Collect every required appointment field before calling schedule_appointment. After schedule_appointment succeeds, call verify_appointment with its confirmationCode before telling the caller the outcome. Only call it booked when verification returns verified=true and status="confirmed". For status="requested", say it is pending confirmation. Follow the extra instructions exactly unless they conflict with safety or factual accuracy.`;
}

function cellText(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("text" in value) return String(value.text || "");
    if ("result" in value) return String(value.result || "");
    if (Array.isArray(value.richText)) return value.richText.map((item) => item.text).join("");
  }
  return String(value).trim();
}

async function readTabularUpload(file) {
  if (!file) throw new Error("CSV or XLSX file is required");
  let grid;
  if (/\.csv$/i.test(file.originalname) || file.mimetype.includes("csv")) {
    grid = parseCsv(file.buffer, {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });
  } else {
    grid = await readXlsxFile(file.buffer);
    if (Array.isArray(grid) && grid[0]?.data && Array.isArray(grid[0].data)) {
      grid = grid[0].data;
    }
  }
  if (!grid?.length) throw new Error("The uploaded file is empty");
  const headers = grid[0].map((value) => fieldKey(cellText(value)));
  return grid.slice(1).reduce((rows, row) => {
    const record = {};
    headers.forEach((header, index) => {
      if (header) record[header] = cellText(row[index]);
    });
    if (Object.values(record).some(Boolean)) rows.push(record);
    return rows;
  }, []);
}

function toolDeclarations(config) {
  const appointmentProperties = {
    start: {
      type: "STRING",
      description: `Exact ISO appointment start including timezone offset in ${config.timezone}.`,
    },
    durationMinutes: { type: "INTEGER" },
  };
  const appointmentRequired = ["start"];
  for (const field of config.intakeFields) {
    appointmentProperties[field.fieldKey] = {
      type: "STRING",
      description: field.options?.length
        ? `${field.label}. Allowed values: ${field.options.join(", ")}`
        : field.label,
    };
    if (field.required) appointmentRequired.push(field.fieldKey);
  }
  return [
    {
      name: "get_available_slots",
      description: "Get currently available appointment times from the configured calendar provider.",
      parameters: {
        type: "OBJECT",
        properties: {
          fromDate: { type: "STRING", description: "Start date in YYYY-MM-DD format." },
          days: { type: "INTEGER", description: "Number of days to search, up to 30." },
          durationMinutes: { type: "INTEGER" },
        },
      },
    },
    {
      name: "schedule_appointment",
      description:
        config.appointmentMode === "instant"
          ? "Book a confirmed appointment in an available calendar slot."
          : "Create a pending appointment request in an available calendar slot.",
      parameters: {
        type: "OBJECT",
        properties: appointmentProperties,
        required: appointmentRequired,
      },
    },
    {
      name: "verify_appointment",
      description:
        "Verify that an appointment or request actually exists in the business calendar database before telling the caller it was booked.",
      parameters: {
        type: "OBJECT",
        properties: {
          confirmationCode: {
            type: "STRING",
            description: "Confirmation code returned by schedule_appointment, for example APT-000123.",
          },
        },
        required: ["confirmationCode"],
      },
    },
    {
      name: "capture_lead",
      description: "Capture a caller's contact information and interest when they are not booking yet.",
      parameters: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          phone: { type: "STRING" },
          email: { type: "STRING" },
          need: { type: "STRING" },
        },
        required: ["name"],
      },
    },
    {
      name: "transfer_message",
      description: "Record a message that needs human follow-up, transfer, escalation, or complaint handling.",
      parameters: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          phone: { type: "STRING" },
          email: { type: "STRING" },
          message: { type: "STRING" },
          urgency: { type: "STRING" },
        },
        required: ["message"],
      },
    },
    {
      name: "end_call",
      description: "End the live call after the caller asks to hang up, says goodbye, or the conversation is complete.",
      parameters: {
        type: "OBJECT",
        properties: {
          reason: {
            type: "STRING",
            description: "Short reason for ending the call.",
          },
        },
        required: ["reason"],
      },
    },
  ];
}

function onboardingToolDeclarations() {
  return [
    {
      name: "build_business_agent",
      description: "Research the confirmed business and build its trial receptionist. Use after confirming business name and website.",
      parameters: {
        type: "OBJECT",
        properties: {
          businessName: { type: "STRING" },
          website: { type: "STRING" },
        },
        required: ["businessName"],
      },
    },
    {
      name: "switch_to_business_agent",
      description: "Switch the current phone conversation into the newly built business receptionist for a live test.",
      parameters: { type: "OBJECT", properties: {} },
    },
    {
      name: "send_setup_link",
      description: "Send the secure account setup link by the configured text provider after collecting and confirming the email.",
      parameters: {
        type: "OBJECT",
        properties: { email: { type: "STRING" } },
        required: ["email"],
      },
    },
    {
      name: "end_call",
      description: "End the onboarding call when the caller says goodbye or asks to hang up.",
      parameters: {
        type: "OBJECT",
        properties: { reason: { type: "STRING" } },
        required: ["reason"],
      },
    },
  ];
}

function qualificationToolDeclarations(config) {
  return [
    {
      name: "update_lead_qualification",
      description:
        "Update the CRM lead after an outbound qualification call. Call this when you learn qualification status, next step, or useful lead details.",
      parameters: {
        type: "OBJECT",
        properties: {
          status: {
            type: "STRING",
            description: "One of: qualified, unqualified, callback, appointment, transferred, unreachable, new.",
          },
          summary: { type: "STRING", description: "Short outcome summary for the CRM." },
          notes: { type: "STRING", description: "Private notes for the business owner." },
          nextStep: { type: "STRING", description: "Recommended next action." },
          urgency: { type: "STRING" },
          serviceNeed: { type: "STRING" },
          bestCallbackTime: { type: "STRING" },
          email: { type: "STRING" },
          phone: { type: "STRING" },
        },
        required: ["status", "summary"],
      },
    },
    ...toolDeclarations(config),
  ];
}

async function runToolCall(profile, config, functionCall, context = {}) {
  const args = functionCall.args || {};
  if (functionCall.name === "get_available_slots") {
    const availability = await listCalendarSlots({
      prisma,
      profile,
      config,
      fromDate: args.fromDate,
      days: Math.min(30, Number(args.days || 14)),
      durationMinutes: args.durationMinutes,
    });
    return {
      ok: true,
      timezone: availability.timezone,
      durationMinutes: availability.durationMinutes,
      slots: availability.slots.slice(0, 20),
    };
  }

  if (functionCall.name === "schedule_appointment") {
    const intakeData = Object.fromEntries(
      config.intakeFields.map((field) => [field.fieldKey, args[field.fieldKey] ?? null]),
    );
    const appointment = await bookCalendarAppointment({
      prisma,
      profile,
      config,
      start: args.start,
      durationMinutes: args.durationMinutes,
      customer: {
        name: args.name || args.customer_name || args.customerName,
        phone: args.phone,
        email: args.email,
      },
      intakeData,
      reason: args.reason,
    });
    const confirmationCode = appointmentConfirmationCode(appointment.id);
    return {
      ok: true,
      recorded: true,
      verified: true,
      booked: appointment.status === "confirmed",
      appointmentId: appointment.id,
      confirmationCode,
      status: appointment.status,
      start: appointment.scheduledStart,
      end: appointment.scheduledEnd,
      timezone: appointment.timezone,
      message:
        appointment.status === "confirmed"
          ? `Appointment ${confirmationCode} is saved and confirmed.`
          : `Appointment request ${confirmationCode} is saved and pending confirmation.`,
    };
  }

  if (functionCall.name === "verify_appointment") {
    return verifyCalendarAppointment({
      prisma,
      profile,
      confirmationCode: args.confirmationCode,
    });
  }

  if (functionCall.name === "capture_lead") {
    if (context.qualificationLeadId) {
      const lead = await prisma.lead.update({
        where: { id: context.qualificationLeadId },
        data: {
          name: args.name === undefined ? undefined : String(args.name || "unknown"),
          phone: args.phone ? String(args.phone) : undefined,
          email: args.email ? String(args.email) : undefined,
          need: args.need ? String(args.need) : undefined,
          source: "outbound_qualification",
          extractedFields: {
            ...(context.leadExtractedFields && typeof context.leadExtractedFields === "object" ? context.leadExtractedFields : {}),
            captureLeadTool: {
              name: args.name ? String(args.name) : null,
              phone: args.phone ? String(args.phone) : null,
              email: args.email ? String(args.email) : null,
              need: args.need ? String(args.need) : null,
              capturedAt: new Date().toISOString(),
            },
          },
        },
      });
      return { ok: true, leadId: lead.id };
    }
    const data = {
      businessName: profile.businessName,
      website: profile.website,
      businessProfileId: profile.id,
      name: String(args.name || "unknown"),
      phone: args.phone ? String(args.phone) : context.fromNumber || null,
      email: args.email ? String(args.email) : null,
      need: args.need ? String(args.need) : null,
      status: "new",
      source: context.voiceCallId ? "call_capture" : "agent",
      extractedFields: {
        name: String(args.name || "unknown"),
        phone: args.phone ? String(args.phone) : context.fromNumber || null,
        email: args.email ? String(args.email) : null,
        need: args.need ? String(args.need) : null,
        capturedAt: new Date().toISOString(),
      },
    };
    const lead = context.voiceCallId
      ? await prisma.lead.upsert({
          where: { voiceCallId: context.voiceCallId },
          create: { ...data, voiceCallId: context.voiceCallId },
          update: data,
        })
      : await prisma.lead.create({ data });
    return { ok: true, leadId: lead.id };
  }

  if (functionCall.name === "transfer_message") {
    const message = await prisma.transferMessage.create({
      data: {
        businessName: profile.businessName,
        website: profile.website,
        name: args.name ? String(args.name) : null,
        phone: args.phone ? String(args.phone) : null,
        email: args.email ? String(args.email) : null,
        message: String(args.message || ""),
        urgency: args.urgency ? String(args.urgency) : null,
      },
    });
    return { ok: true, messageId: message.id };
  }

  if (functionCall.name === "end_call") {
    return { ok: true, shouldEndCall: true, reason: String(args.reason || "Call ended by request.") };
  }

  return { ok: false, error: `Unknown tool: ${functionCall.name}` };
}

async function runQualificationToolCall(profile, config, functionCall, context) {
  const args = functionCall.args || {};
  if (functionCall.name === "update_lead_qualification") {
    const status = normalizeCrmStatus(args.status, "qualified");
    const existing = await prisma.lead.findFirst({
      where: { AND: [{ id: context.qualificationLeadId }, leadWhereForProfile(profile)] },
    });
    if (!existing) throw new Error("Qualification lead was not found");
    const previousFields = existing.extractedFields && typeof existing.extractedFields === "object" ? existing.extractedFields : {};
    const qualification = {
      status,
      summary: args.summary ? String(args.summary) : null,
      notes: args.notes ? String(args.notes) : null,
      nextStep: args.nextStep ? String(args.nextStep) : null,
      urgency: args.urgency ? String(args.urgency) : null,
      serviceNeed: args.serviceNeed ? String(args.serviceNeed) : null,
      bestCallbackTime: args.bestCallbackTime ? String(args.bestCallbackTime) : null,
      updatedAt: new Date().toISOString(),
      voiceCallId: context.voiceCallId || null,
      attemptId: context.qualificationAttemptId || null,
    };
    const lead = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        status,
        source: existing.source || "outbound_qualification",
        summary: args.summary ? String(args.summary) : existing.summary,
        notes: [existing.notes, args.notes ? String(args.notes) : ""].filter(Boolean).join("\n\n") || null,
        email: args.email ? String(args.email) : existing.email,
        phone: args.phone ? String(args.phone) : existing.phone,
        need: args.serviceNeed ? String(args.serviceNeed) : existing.need,
        extractedFields: { ...previousFields, qualification },
      },
    });
    if (context.qualificationAttemptId) {
      await prisma.outboundQualificationCall.update({
        where: { id: context.qualificationAttemptId },
        data: {
          status: "completed",
          resultStatus: status,
          summary: args.summary ? String(args.summary) : null,
          notes: args.notes ? String(args.notes) : null,
          extractedFields: qualification,
        },
      });
    }
    return { ok: true, leadId: lead.id, status };
  }
  const result = await runToolCall(profile, config, functionCall, context);
  if (functionCall.name === "schedule_appointment" && result.ok && context.qualificationLeadId) {
    await prisma.lead.update({
      where: { id: context.qualificationLeadId },
      data: {
        status: "appointment",
        summary: result.message || "Appointment created during outbound qualification call.",
      },
    });
    if (context.qualificationAttemptId) {
      await prisma.outboundQualificationCall.update({
        where: { id: context.qualificationAttemptId },
        data: { status: "completed", resultStatus: "appointment", summary: result.message || null },
      });
    }
  }
  return result;
}

async function handleToolCall(geminiWs, clientWs, profile, config, toolCall) {
  const functionResponses = [];
  let shouldEndCall = false;
  let endReason = "Call ended.";
  for (const functionCall of toolCall.functionCalls || []) {
    try {
      const result = await runToolCall(profile, config, functionCall);
      if (result.shouldEndCall) {
        shouldEndCall = true;
        endReason = result.reason || endReason;
      }
      functionResponses.push({
        id: functionCall.id,
        name: functionCall.name,
        response: { result },
      });
    } catch (error) {
      functionResponses.push({
        id: functionCall.id,
        name: functionCall.name,
        response: { ok: false, verified: false, booked: false, error: error.message },
      });
    }
  }

  if (geminiWs.readyState === WebSocket.OPEN) {
    geminiWs.send(JSON.stringify({ toolResponse: { functionResponses } }));
  }

  if (shouldEndCall) {
    setTimeout(() => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "end_call", reason: endReason }));
      }
      if (geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.close(1000, endReason.slice(0, 120));
      }
    }, 900);
  }
}

app.post("/api/onboarding/fast-agent", async (req, res) => {
  try {
    const businessName = normalizeBusinessName(req.body.businessName || req.query.business_name);
    const website = normalizeWebsite(req.body.website || req.query.website);
    if (!businessName) throw new Error("Business name is required");

    const settings = await getSettings();
    const existing = await findBusinessMatch(businessName, website);
    const activeTrial = existing?.accountStatus === "trial" && existing.trialEndsAt > new Date();
    if (existing && (existing.users.length || existing.accountStatus === "paid")) {
      return res.status(409).json({
        error: "This business already has an account. Sign in to access it.",
        code: "BUSINESS_ALREADY_ACTIVE",
      });
    }
    if (!activeTrial) enforceOnboardingRateLimit(req);

    const researched = existing
      ? { profile: existing, cached: true }
      : await researchBusiness({ businessName, website, researchModel: settings.researchModel });
    let profile = researched.profile;
    if (!activeTrial) {
      const trialStartedAt = new Date();
      const trialEndsAt = new Date(trialStartedAt.getTime() + settings.trialDays * 24 * 60 * 60 * 1000);
      profile = await prisma.businessProfile.update({
        where: { id: researched.profile.id },
        data: {
          accountStatus: "trial",
          trialStartedAt,
          trialEndsAt,
          creditBalance: settings.trialCredits,
        },
      });
    }
    await ensureBusinessConfig(profile);
    await prisma.fastAgentSession.deleteMany({ where: { businessProfileId: profile.id, expiresAt: { lte: new Date() } } });
    const access = issueToken();
    await prisma.fastAgentSession.create({
      data: { tokenHash: access.tokenHash, businessProfileId: profile.id, expiresAt: profile.trialEndsAt },
    });
    let demoAssignment = await prisma.demoNumberAssignment.findUnique({
      where: { businessProfileId: profile.id },
      include: { voiceNumber: true },
    });
    if (!demoAssignment || demoAssignment.expiresAt <= new Date()) {
      demoAssignment = await allocateDemoNumber(profile, settings);
    }
    res.status(activeTrial ? 200 : 201).json({
      accessToken: access.token,
      cached: researched.cached,
      profile: publicBusinessProfile(profile),
      trial: {
        days: settings.trialDays,
        endsAt: profile.trialEndsAt,
        credits: profile.creditBalance,
        tokenUsd: settings.tokenUsd,
      },
      demoPhoneNumber: demoAssignment?.voiceNumber.phoneNumber || null,
      demoCallerLimit: settings.demoCallerLimit,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/onboarding/fast-agent", async (req, res) => {
  const session = await fastAgentSession(req.query.token);
  if (!session) return res.status(401).json({ error: "This demo session is invalid or expired" });
  const settings = await getSettings();
  let assignment = await prisma.demoNumberAssignment.findUnique({
    where: { businessProfileId: session.businessProfileId },
    include: { voiceNumber: true, callerBindings: { orderBy: { createdAt: "asc" } } },
  });
  if (!assignment) {
    await allocateDemoNumber(session.businessProfile, settings);
    assignment = await prisma.demoNumberAssignment.findUnique({
      where: { businessProfileId: session.businessProfileId },
      include: { voiceNumber: true, callerBindings: { orderBy: { createdAt: "asc" } } },
    });
  }
  res.json({
    profile: publicBusinessProfile(session.businessProfile),
    demoPhoneNumber: assignment?.voiceNumber.phoneNumber || null,
    callerPhones: assignment?.callerBindings.map((binding) => binding.callerPhone) || [],
    demoCallerLimit: settings.demoCallerLimit,
  });
});

app.post("/api/onboarding/demo-callers", async (req, res) => {
  try {
    const session = await fastAgentSession(req.body.accessToken);
    if (!session) return res.status(401).json({ error: "This demo session is invalid or expired" });
    const callerPhone = String(req.body.phone || "").trim().replace(/[^+0-9]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(callerPhone)) throw new Error("Use a phone number in international format, such as +13125550100");
    const settings = await getSettings();
    const assignment = await prisma.demoNumberAssignment.findUnique({
      where: { businessProfileId: session.businessProfileId },
      include: { callerBindings: true },
    });
    if (!assignment) throw new Error("No demo phone number is currently available. Use the browser call instead.");
    if (
      assignment.callerBindings.length >= settings.demoCallerLimit &&
      !assignment.callerBindings.some((binding) => binding.callerPhone === callerPhone)
    ) {
      throw new Error(`This trial already has ${settings.demoCallerLimit} caller numbers`);
    }
    await prisma.demoCallerBinding.deleteMany({ where: { callerPhone } });
    await prisma.demoCallerBinding.create({ data: { demoNumberAssignmentId: assignment.id, callerPhone } });
    await prisma.demoNumberAssignment.update({ where: { id: assignment.id }, data: { status: "active" } });
    const callerBindings = await prisma.demoCallerBinding.findMany({
      where: { demoNumberAssignmentId: assignment.id },
      orderBy: { createdAt: "asc" },
    });
    res.json({ callerPhones: callerBindings.map((binding) => binding.callerPhone) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/onboarding/claim", async (req, res) => {
  try {
    const session = await fastAgentSession(req.body.accessToken);
    if (!session) return res.status(401).json({ error: "This demo session is invalid or expired" });
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address");
    if (await prisma.user.findUnique({ where: { email } })) throw new Error("That email already belongs to an account");
    if (await prisma.user.findFirst({ where: { businessProfileId: session.businessProfileId } })) {
      throw new Error("This business has already been claimed");
    }
    const settings = await getSettings();
    await prisma.accountClaimToken.deleteMany({ where: { businessProfileId: session.businessProfileId, usedAt: null } });
    const claim = issueToken();
    const expiresAt = new Date(Date.now() + settings.claimLinkDays * 24 * 60 * 60 * 1000);
    await prisma.accountClaimToken.create({
      data: { tokenHash: claim.tokenHash, email, businessProfileId: session.businessProfileId, expiresAt },
    });
    const setupUrl = `${requestBaseUrl(req, settings)}/set-password/?token=${encodeURIComponent(claim.token)}`;
    const delivered = await sendClaimEmail({
      settings,
      email,
      setupUrl,
      businessName: session.businessProfile.businessName,
    });
    res.json({
      ok: true,
      delivered,
      message: delivered ? "Check your email to finish setting up your account." : "SMTP is not configured yet.",
      ...(process.env.NODE_ENV !== "production" && !delivered ? { setupUrl } : {}),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/onboarding/claim", async (req, res) => {
  const claim = await prisma.accountClaimToken.findUnique({
    where: { tokenHash: sessionTokenHash(req.query.token || "") },
    include: { businessProfile: true },
  });
  if (!claim || claim.usedAt || claim.expiresAt <= new Date()) {
    return res.status(404).json({ error: "This setup link is invalid or expired" });
  }
  res.json({ email: claim.email, businessName: claim.businessProfile.businessName, expiresAt: claim.expiresAt });
});

app.post("/api/onboarding/complete", async (req, res) => {
  try {
    const password = String(req.body.password || "");
    if (password.length < 10) throw new Error("Password must be at least 10 characters");
    const claim = await prisma.accountClaimToken.findUnique({
      where: { tokenHash: sessionTokenHash(req.body.token || "") },
      include: { businessProfile: true },
    });
    if (!claim || claim.usedAt || claim.expiresAt <= new Date()) throw new Error("This setup link is invalid or expired");
    if (await prisma.user.findUnique({ where: { email: claim.email } })) throw new Error("That email already belongs to an account");
    if (await prisma.user.findFirst({ where: { businessProfileId: claim.businessProfileId } })) {
      throw new Error("This business has already been claimed");
    }
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: claim.email,
          passwordHash: passwordHash(password),
          name: String(req.body.name || claim.businessProfile.businessName).trim(),
          role: "business",
          businessProfileId: claim.businessProfileId,
        },
        include: { businessProfile: true },
      });
      await tx.accountClaimToken.update({ where: { id: claim.id }, data: { usedAt: new Date() } });
      return created;
    });
    const session = issueToken();
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await prisma.session.create({ data: { tokenHash: session.tokenHash, userId: user.id, expiresAt } });
    setSessionCookie(req, res, session.token);
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, business: user.businessProfile },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email }, include: { businessProfile: true } });
    if (!user?.active || !passwordMatches(req.body.password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const { token, tokenHash } = issueToken();
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await prisma.session.create({ data: { tokenHash, userId: user.id, expiresAt } });
    setSessionCookie(req, res, token);
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, business: user.businessProfile } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  const token = cookieValue(req, SESSION_COOKIE);
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sessionTokenHash(token) } });
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      business: req.user.businessProfile,
    },
  });
});

app.post("/webhooks/telnyx", async (req, res) => {
  try {
    if (!(await verifyTelnyxWebhook(req))) return res.status(401).json({ error: "Invalid Telnyx signature" });
    const event = req.body?.data;
    const payload = event?.payload || {};
    const eventType = event?.event_type;
    const webhookId = event?.id || crypto.createHash("sha256").update(req.rawBody).digest("hex");
    try {
      await prisma.telnyxWebhookEvent.create({
        data: { webhookId, eventType: String(eventType || "unknown"), payload: req.body },
      });
    } catch (error) {
      if (error.code === "P2002") return res.json({ ok: true, duplicate: true });
      throw error;
    }

    if (eventType === "call.initiated" && payload.direction === "outgoing") {
      const clientState = decodeClientState(payload.client_state);
      const isQualification = clientState.callMode === "qualification" && clientState.leadId;
      const profile = isQualification
        ? await prisma.businessProfile.findUnique({ where: { id: Number(clientState.businessProfileId || 0) } })
        : null;
      const voiceCall = await prisma.voiceCall.upsert({
        where: { callControlId: payload.call_control_id },
        create: {
          callControlId: payload.call_control_id,
          callSessionId: payload.call_session_id,
          fromNumber: payload.from,
          toNumber: payload.to,
          businessProfileId: profile?.id || null,
          callMode: isQualification ? "qualification" : "outbound",
          status: "initiated",
        },
        update: {
          callSessionId: payload.call_session_id,
          fromNumber: payload.from,
          toNumber: payload.to,
          businessProfileId: profile?.id || undefined,
          callMode: isQualification ? "qualification" : undefined,
          status: "initiated",
        },
      });
      if (isQualification && clientState.attemptId) {
        await prisma.outboundQualificationCall.updateMany({
          where: { id: Number(clientState.attemptId), leadId: Number(clientState.leadId) },
          data: { voiceCallId: voiceCall.id, status: "calling", startedAt: new Date() },
        });
      }
      await logVoiceCallEvent(payload.call_control_id, "webhook.call.initiated", {
        from: payload.from,
        to: payload.to,
        direction: "outgoing",
        businessProfileId: profile?.id || null,
        callMode: isQualification ? "qualification" : "outbound",
        leadId: isQualification ? Number(clientState.leadId) : null,
        attemptId: isQualification ? Number(clientState.attemptId || 0) || null : null,
      });
    } else if (eventType === "call.initiated" && payload.direction === "incoming") {
      const voiceNumber = await prisma.voiceNumber.findUnique({
        where: { phoneNumber: payload.to },
        include: { businessProfile: true },
      });
      const isOnboarding = voiceNumber?.numberType === "onboarding";
      const inboundBusiness = isOnboarding ? null : await resolveInboundBusiness(voiceNumber, payload.from);
      const voiceCall = await prisma.voiceCall.upsert({
        where: { callControlId: payload.call_control_id },
        create: {
          callControlId: payload.call_control_id,
          callSessionId: payload.call_session_id,
          fromNumber: payload.from,
          toNumber: payload.to,
          businessProfileId: inboundBusiness?.id || null,
          callMode: isOnboarding ? "onboarding" : "business",
        },
        update: { status: "initiated", callMode: isOnboarding ? "onboarding" : "business" },
      });
      if (isOnboarding) {
        const settings = await getSettings();
        await prisma.onboardingSession.upsert({
          where: { voiceCallId: voiceCall.id },
          create: {
            voiceCallId: voiceCall.id,
            callerPhone: payload.from,
            campaignLabel: voiceNumber.label,
            recordingEnabled: settings.onboardingRecordCalls,
            transcriptionEnabled: settings.onboardingTranscription,
          },
          update: { callerPhone: payload.from, campaignLabel: voiceNumber.label },
        });
      } else if (inboundBusiness) {
        await ensureCallLead({ voiceCall, profile: inboundBusiness, source: "incoming_call" });
      }
      await logVoiceCallEvent(payload.call_control_id, "webhook.call.initiated", {
        from: payload.from,
        to: payload.to,
        businessProfileId: inboundBusiness?.id || null,
        callMode: isOnboarding ? "onboarding" : "business",
        campaignLabel: isOnboarding ? voiceNumber?.label || null : null,
      });
      if (!inboundBusiness && !isOnboarding) {
        await telnyxRequest(`/calls/${encodeURIComponent(payload.call_control_id)}/actions/hangup`, {
          method: "POST",
          body: JSON.stringify({ command_id: webhookId }),
        });
        return res.json({ ok: true, action: "unassigned_number_rejected" });
      }
      await telnyxRequest(`/calls/${encodeURIComponent(payload.call_control_id)}/actions/answer`, {
        method: "POST",
        body: JSON.stringify({
          command_id: webhookId,
          client_state: Buffer.from(
            JSON.stringify({ businessProfileId: inboundBusiness?.id || null, callMode: isOnboarding ? "onboarding" : "business" }),
          ).toString("base64"),
          ...(await telnyxStreamOptions(payload.call_control_id)),
        }),
      });
    } else if (eventType === "call.answered") {
      await prisma.voiceCall.updateMany({
        where: { callControlId: payload.call_control_id },
        data: { status: "answered", answeredAt: new Date() },
      });
      await logVoiceCallEvent(payload.call_control_id, "webhook.call.answered");
      const answeredCall = await prisma.voiceCall.findUnique({
        where: { callControlId: payload.call_control_id },
        include: { onboardingSession: true, outboundQualificationCall: true },
      });
      if (answeredCall?.outboundQualificationCall) {
        await prisma.outboundQualificationCall.update({
          where: { id: answeredCall.outboundQualificationCall.id },
          data: { status: "answered", answeredAt: new Date() },
        });
        await telnyxRequest(`/calls/${encodeURIComponent(payload.call_control_id)}/actions/streaming_start`, {
          method: "POST",
          body: JSON.stringify({
            command_id: crypto.randomUUID(),
            ...(await telnyxStreamOptions(payload.call_control_id)),
          }),
        });
        await logVoiceCallEvent(payload.call_control_id, "qualification.streaming_start_requested");
      }
      if (answeredCall?.onboardingSession?.recordingEnabled) {
        await telnyxRequest(`/calls/${encodeURIComponent(payload.call_control_id)}/actions/record_start`, {
          method: "POST",
          body: JSON.stringify({ format: "wav", channels: "single", command_id: crypto.randomUUID() }),
        });
        await logVoiceCallEvent(payload.call_control_id, "recording.started");
      }
    } else if (eventType === "call.hangup") {
      await prisma.voiceCall.updateMany({
        where: { callControlId: payload.call_control_id },
        data: { status: "ended", hangupCause: payload.hangup_cause || null, endedAt: new Date() },
      });
      const endedCall = await prisma.voiceCall.findUnique({
        where: { callControlId: payload.call_control_id },
        include: { businessProfile: true, outboundQualificationCall: { include: { lead: true } } },
      });
      if (endedCall?.businessProfile && endedCall.callMode === "business") {
        await ensureCallLead({ voiceCall: endedCall, profile: endedCall.businessProfile });
      }
      if (endedCall?.outboundQualificationCall) {
        const attempt = endedCall.outboundQualificationCall;
        const answered = Boolean(attempt.answeredAt || endedCall.answeredAt);
        const finalStatus = attempt.resultStatus ? "completed" : answered ? "completed" : "unreachable";
        await prisma.outboundQualificationCall.update({
          where: { id: attempt.id },
          data: {
            status: finalStatus,
            endedAt: new Date(),
            transcript: endedCall.transcript || attempt.transcript,
            summary: attempt.summary || shortCallSummary(endedCall),
          },
        });
        if (!answered && !attempt.resultStatus) {
          await prisma.lead.update({
            where: { id: attempt.leadId },
            data: {
              status: "unreachable",
              summary: `Outbound qualification call was not answered or ended before qualification. ${payload.hangup_cause || ""}`.trim(),
            },
          });
        }
      }
      await logVoiceCallEvent(payload.call_control_id, "webhook.call.hangup", {
        cause: payload.hangup_cause,
        source: payload.hangup_source,
        sipCode: payload.sip_hangup_cause,
      });
      await prisma.onboardingSession.updateMany({
        where: { voiceCall: { callControlId: payload.call_control_id } },
        data: { completedAt: new Date(), status: "completed" },
      });
    } else if (eventType === "call.recording.saved") {
      const recordingUrl = payload.recording_urls?.wav || payload.recording_urls?.mp3 || payload.recording_url || null;
      await prisma.voiceCall.updateMany({ where: { callControlId: payload.call_control_id }, data: { recordingUrl } });
      const recordedCall = await prisma.voiceCall.findUnique({
        where: { callControlId: payload.call_control_id },
        include: { businessProfile: true, lead: true },
      });
      if (recordedCall?.lead) {
        await prisma.lead.update({
          where: { id: recordedCall.lead.id },
          data: { summary: shortCallSummary({ ...recordedCall, recordingUrl }) },
        });
      }
      await logVoiceCallEvent(payload.call_control_id, "recording.saved", { recordingUrl });
    } else if (eventType?.startsWith("streaming.")) {
      await logVoiceCallEvent(payload.call_control_id, `webhook.${eventType}`, {
        streamUrl: payload.stream_url || null,
      });
    } else if (eventType?.startsWith("call.speak.")) {
      await logVoiceCallEvent(payload.call_control_id, `webhook.${eventType}`, {
        clientState: payload.client_state || null,
        status: payload.status || null,
      });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error("[telnyx] webhook error", error.message);
    res.status(500).json({ error: "Unable to process Telnyx webhook" });
  }
});

app.use("/api/business-admin", requireAuth);
app.use("/api/demo-data", requireAuth);

app.get("/api/admin/settings", requireAuth, requireAdmin, async (_req, res) => {
  const [settings, secrets] = await Promise.all([getSettings(), prisma.systemSecret.findMany()]);
  const stored = new Map(secrets.map((secret) => [secret.secretKey, secret]));
  const secretState = (key, envKey) => ({
    configured: stored.has(key) || Boolean(process.env[envKey]),
    source: stored.has(key) ? "database" : process.env[envKey] ? "environment" : "missing",
    hint: stored.get(key)?.hint || null,
  });
  res.json({
    settings,
    secrets: {
      geminiApiKey: secretState("gemini_api_key", "GEMINI_API_KEY"),
      telnyxApiKey: secretState("telnyx_api_key", "TELNYX_API_KEY"),
      telnyxPublicKey: secretState("telnyx_public_key", "TELNYX_PUBLIC_KEY"),
      telnyxConnectionId: secretState("telnyx_connection_id", "TELNYX_CONNECTION_ID"),
      smtpUsername: secretState("smtp_username", "SMTP_USERNAME"),
      smtpPassword: secretState("smtp_password", "SMTP_PASSWORD"),
      sentDmApiKey: secretState("sentdm_api_key", "SENTDM_API_KEY"),
      blueBubblesPassword: secretState("bluebubbles_password", "BLUEBUBBLES_PASSWORD"),
    },
    publicBaseUrl: settings.publicBaseUrl || process.env.PUBLIC_BASE_URL || "",
  });
});

app.put("/api/admin/settings", requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = await prisma.appSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        researchModel: req.body.researchModel || "gemini-3.1-pro-preview",
        liveModel: liveModelPath(req.body.liveModel),
        voiceName: req.body.voiceName || "Puck",
        language: req.body.language || "English",
        agentName: req.body.agentName || "Alex",
        publicBaseUrl: String(req.body.publicBaseUrl || "").trim().replace(/\/$/, ""),
        trialDays: Math.max(1, Number(req.body.trialDays || 7)),
        claimLinkDays: Math.max(1, Number(req.body.claimLinkDays || 30)),
        trialCredits: Math.max(0, Number(req.body.trialCredits || 900)),
        tokenUsd: Math.max(0.000001, Number(req.body.tokenUsd || 0.01)),
        lowBalanceTokens: Math.max(0, Number(req.body.lowBalanceTokens || 100)),
        recordingRetentionDays: Math.max(1, Number(req.body.recordingRetentionDays || 30)),
        demoNumberCapacity: Math.max(1, Number(req.body.demoNumberCapacity || 10)),
        demoCallerLimit: Math.max(1, Number(req.body.demoCallerLimit || 3)),
        smtpHost: String(req.body.smtpHost || "").trim(),
        smtpPort: Math.max(1, Number(req.body.smtpPort || 587)),
        smtpSecure: Boolean(req.body.smtpSecure),
        smtpFromEmail: String(req.body.smtpFromEmail || "").trim(),
        smtpFromName: String(req.body.smtpFromName || "AI Receptionist").trim(),
        onboardingLookupUrl: String(req.body.onboardingLookupUrl || "").trim(),
        onboardingVoiceName: String(req.body.onboardingVoiceName || "Puck").trim() || "Puck",
        onboardingInstructions: String(req.body.onboardingInstructions || "").trim(),
        onboardingRecordCalls: Boolean(req.body.onboardingRecordCalls),
        onboardingTranscription: req.body.onboardingTranscription !== false,
        messagePrimaryProvider: String(req.body.messagePrimaryProvider || "bluebubbles"),
        messageFailoverProvider: String(req.body.messageFailoverProvider || "sentdm"),
        blueBubblesBaseUrl: String(req.body.blueBubblesBaseUrl || "").trim().replace(/\/$/, ""),
        blueBubblesSendPath: String(req.body.blueBubblesSendPath || "/api/v1/chat/new").trim(),
        sentDmTemplateId: String(req.body.sentDmTemplateId || "").trim(),
        sentDmTemplateName: String(req.body.sentDmTemplateName || "").trim(),
        sentDmProfileId: String(req.body.sentDmProfileId || "").trim(),
      },
      update: {
        researchModel: req.body.researchModel || undefined,
        liveModel: req.body.liveModel ? liveModelPath(req.body.liveModel) : undefined,
        publicBaseUrl: typeof req.body.publicBaseUrl === "string" ? req.body.publicBaseUrl.trim().replace(/\/$/, "") : undefined,
        trialDays: req.body.trialDays === undefined ? undefined : Math.max(1, Number(req.body.trialDays)),
        claimLinkDays: req.body.claimLinkDays === undefined ? undefined : Math.max(1, Number(req.body.claimLinkDays)),
        trialCredits: req.body.trialCredits === undefined ? undefined : Math.max(0, Number(req.body.trialCredits)),
        tokenUsd: req.body.tokenUsd === undefined ? undefined : Math.max(0.000001, Number(req.body.tokenUsd)),
        lowBalanceTokens: req.body.lowBalanceTokens === undefined ? undefined : Math.max(0, Number(req.body.lowBalanceTokens)),
        recordingRetentionDays:
          req.body.recordingRetentionDays === undefined ? undefined : Math.max(1, Number(req.body.recordingRetentionDays)),
        demoNumberCapacity:
          req.body.demoNumberCapacity === undefined ? undefined : Math.max(1, Number(req.body.demoNumberCapacity)),
        demoCallerLimit: req.body.demoCallerLimit === undefined ? undefined : Math.max(1, Number(req.body.demoCallerLimit)),
        smtpHost: typeof req.body.smtpHost === "string" ? req.body.smtpHost.trim() : undefined,
        smtpPort: req.body.smtpPort === undefined ? undefined : Math.max(1, Number(req.body.smtpPort)),
        smtpSecure: typeof req.body.smtpSecure === "boolean" ? req.body.smtpSecure : undefined,
        smtpFromEmail: typeof req.body.smtpFromEmail === "string" ? req.body.smtpFromEmail.trim() : undefined,
        smtpFromName: typeof req.body.smtpFromName === "string" ? req.body.smtpFromName.trim() : undefined,
        onboardingLookupUrl:
          typeof req.body.onboardingLookupUrl === "string" ? req.body.onboardingLookupUrl.trim() : undefined,
        onboardingVoiceName:
          typeof req.body.onboardingVoiceName === "string" ? req.body.onboardingVoiceName.trim() || "Puck" : undefined,
        onboardingInstructions:
          typeof req.body.onboardingInstructions === "string" ? req.body.onboardingInstructions.trim() : undefined,
        onboardingRecordCalls:
          typeof req.body.onboardingRecordCalls === "boolean" ? req.body.onboardingRecordCalls : undefined,
        onboardingTranscription:
          typeof req.body.onboardingTranscription === "boolean" ? req.body.onboardingTranscription : undefined,
        messagePrimaryProvider:
          typeof req.body.messagePrimaryProvider === "string" ? req.body.messagePrimaryProvider : undefined,
        messageFailoverProvider:
          typeof req.body.messageFailoverProvider === "string" ? req.body.messageFailoverProvider : undefined,
        blueBubblesBaseUrl:
          typeof req.body.blueBubblesBaseUrl === "string" ? req.body.blueBubblesBaseUrl.trim().replace(/\/$/, "") : undefined,
        blueBubblesSendPath:
          typeof req.body.blueBubblesSendPath === "string" ? req.body.blueBubblesSendPath.trim() : undefined,
        sentDmTemplateId: typeof req.body.sentDmTemplateId === "string" ? req.body.sentDmTemplateId.trim() : undefined,
        sentDmTemplateName:
          typeof req.body.sentDmTemplateName === "string" ? req.body.sentDmTemplateName.trim() : undefined,
        sentDmProfileId: typeof req.body.sentDmProfileId === "string" ? req.body.sentDmProfileId.trim() : undefined,
      },
    });
    await Promise.all([
      saveSystemSecret("gemini_api_key", req.body.geminiApiKey),
      saveSystemSecret("telnyx_api_key", req.body.telnyxApiKey),
      saveSystemSecret("telnyx_public_key", req.body.telnyxPublicKey),
      saveSystemSecret("telnyx_connection_id", req.body.telnyxConnectionId),
      saveSystemSecret("smtp_username", req.body.smtpUsername),
      saveSystemSecret("smtp_password", req.body.smtpPassword),
      saveSystemSecret("sentdm_api_key", req.body.sentDmApiKey),
      saveSystemSecret("bluebubbles_password", req.body.blueBubblesPassword),
    ]);
    res.json({ ok: true, settings });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/admin/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({ include: { businessProfile: true }, orderBy: { createdAt: "desc" } });
  res.json({ users: users.map(({ passwordHash: _passwordHash, ...user }) => user) });
});

app.post("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || password.length < 10) throw new Error("Email and a password of at least 10 characters are required");
    const settings = await getSettings();
    const { profile } = await researchBusiness({
      businessName: req.body.businessName,
      website: req.body.website,
      researchModel: settings.researchModel,
    });
    await ensureBusinessConfig(profile);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: passwordHash(password),
        name: String(req.body.name || profile.businessName),
        role: "business",
        businessProfileId: profile.id,
      },
      include: { businessProfile: true },
    });
    await prisma.businessProfile.update({ where: { id: profile.id }, data: { accountStatus: "paid" } });
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, business: user.businessProfile } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = {};
    if (typeof req.body.active === "boolean") data.active = req.body.active;
    if (req.body.password) {
      if (String(req.body.password).length < 10) throw new Error("Password must be at least 10 characters");
      data.passwordHash = passwordHash(req.body.password);
      await prisma.session.deleteMany({ where: { userId: Number(req.params.id) } });
    }
    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data });
    res.json({ user: { id: user.id, email: user.email, role: user.role, active: user.active } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/admin/businesses", requireAuth, requireAdmin, async (_req, res) => {
  const businesses = await prisma.businessProfile.findMany({
    include: {
      users: { select: { id: true, email: true, name: true, active: true } },
      voiceNumbers: { select: { id: true, phoneNumber: true, status: true } },
      config: {
        select: {
          id: true,
          agentName: true,
          language: true,
          voiceName: true,
          timezone: true,
          appointmentMode: true,
          _count: { select: { intakeFields: true, knowledgeEntries: true, priceEntries: true } },
        },
      },
    },
    orderBy: { businessName: "asc" },
  });
  res.json({ businesses });
});

app.get("/api/admin/calls", requireAuth, requireAdmin, async (_req, res) => {
  const calls = await prisma.voiceCall.findMany({
    include: {
      businessProfile: { select: { id: true, businessName: true } },
      onboardingSession: true,
      events: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  res.json({ calls });
});

app.post("/api/admin/calls/:id/diagnostics/speak", requireAuth, requireAdmin, async (req, res) => {
  const call = await prisma.voiceCall.findUnique({ where: { id: Number(req.params.id) } });
  if (!call) return res.status(404).json({ error: "Call not found" });
  if (!call.callControlId) return res.status(400).json({ error: "Call has no Telnyx call control ID" });
  if (call.status === "ended" || call.endedAt) return res.status(400).json({ error: "Call has already ended. Start a live call, refresh logs, then run the test." });

  const payload = String(req.body.payload || "Telnyx diagnostic test. If you can hear this sentence clearly, Telnyx native audio is working on this phone call.").slice(0, 3000);
  const rawVoice = String(req.body.voice || "female").trim() || "female";
  const basicVoice = ["male", "female"].includes(rawVoice.toLowerCase());
  const voice = basicVoice ? rawVoice.toLowerCase() : rawVoice;
  const targetLegs = ["self", "opposite", "both"].includes(req.body.targetLegs) ? req.body.targetLegs : "self";
  const stopStreaming = req.body.stopStreaming !== false;
  const results = [];

  try {
    if (stopStreaming) {
      try {
        await telnyxRequest(`/calls/${encodeURIComponent(call.callControlId)}/actions/streaming_stop`, {
          method: "POST",
          body: JSON.stringify({ command_id: crypto.randomUUID() }),
        });
        results.push("streaming_stop requested");
        await logVoiceCallEvent(call.callControlId, "diagnostic.streaming_stop_requested");
      } catch (error) {
        results.push(`streaming_stop failed: ${error.message}`);
        await logVoiceCallEvent(call.callControlId, "diagnostic.streaming_stop_failed", { message: error.message });
      }
    }

    const commandId = crypto.randomUUID();
    const response = await telnyxRequest(`/calls/${encodeURIComponent(call.callControlId)}/actions/speak`, {
      method: "POST",
      body: JSON.stringify({
        command_id: commandId,
        payload,
        payload_type: "text",
        service_level: basicVoice ? "basic" : "premium",
        voice,
        language: "en-US",
        stop: "all",
        target_legs: targetLegs,
        client_state: Buffer.from(JSON.stringify({ diagnostic: "telnyx_speak", callId: call.id })).toString("base64"),
      }),
    });
    await logVoiceCallEvent(call.callControlId, "diagnostic.speak_requested", {
      commandId,
      voice,
      targetLegs,
      serviceLevel: basicVoice ? "basic" : "premium",
      stoppedStreaming: stopStreaming,
      payload,
    });
    res.json({ ok: true, results, response });
  } catch (error) {
    await logVoiceCallEvent(call.callControlId, "diagnostic.speak_failed", { message: error.message });
    res.status(500).json({ error: error.message, results });
  }
});

app.get("/api/admin/onboarding", requireAuth, requireAdmin, async (_req, res) => {
  const sessions = await prisma.onboardingSession.findMany({
    include: {
      voiceCall: { select: { callControlId: true, status: true, startedAt: true, endedAt: true, recordingUrl: true } },
      businessProfile: { select: { id: true, businessName: true, website: true, accountStatus: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ sessions });
});

app.get("/api/admin/telnyx/search", requireAuth, requireAdmin, async (req, res) => {
  try {
    const query = new URLSearchParams();
    query.set("filter[country_code]", String(req.query.country || "US").toUpperCase());
    query.set("filter[features]", "voice");
    query.set("filter[limit]", String(Math.min(30, Math.max(1, Number(req.query.limit || 12)))));
    query.set("filter[reservable]", "true");
    query.set("filter[exclude_held_numbers]", "true");
    if (req.query.areaCode) query.set("filter[national_destination_code]", String(req.query.areaCode).replace(/\D/g, ""));
    if (req.query.locality) query.set("filter[locality]", String(req.query.locality));
    const data = await telnyxRequest(`/available_phone_numbers?${query}`);
    res.json({ numbers: data.data || [] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/admin/telnyx/reservations", requireAuth, requireAdmin, async (req, res) => {
  try {
    const phoneNumber = String(req.body.phoneNumber || "").trim();
    if (!phoneNumber.startsWith("+")) throw new Error("A valid E.164 phone number is required");
    const data = await telnyxRequest("/number_reservations", {
      method: "POST",
      body: JSON.stringify({ phone_numbers: [{ phone_number: phoneNumber }] }),
    });
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/admin/telnyx/orders", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (req.body.confirmPurchase !== true) throw new Error("Purchase confirmation is required");
    const phoneNumber = String(req.body.phoneNumber || "").trim();
    if (!phoneNumber.startsWith("+")) throw new Error("A valid E.164 phone number is required");
    const connectionId = await systemSecret("telnyx_connection_id", "TELNYX_CONNECTION_ID");
    if (!connectionId) throw new Error("Telnyx connection ID is not configured");
    const data = await telnyxRequest("/number_orders", {
      method: "POST",
      body: JSON.stringify({
        phone_numbers: [{ phone_number: phoneNumber }],
        connection_id: connectionId,
        customer_reference: `ai-receptionist-${Date.now()}`,
      }),
    });
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/admin/telnyx/numbers", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const query = new URLSearchParams({ "page[size]": "100" });
    const data = await telnyxRequest(`/phone_numbers?${query}`);
    for (const number of data.data || []) {
      await prisma.voiceNumber.upsert({
        where: { providerNumberId: number.id },
        create: {
          providerNumberId: number.id,
          phoneNumber: number.phone_number,
          status: number.status || "unknown",
          connectionId: number.connection_id || null,
          metadata: number,
        },
        update: {
          phoneNumber: number.phone_number,
          status: number.status || "unknown",
          connectionId: number.connection_id || null,
          metadata: number,
        },
      });
    }
    const numbers = await prisma.voiceNumber.findMany({
      include: {
        businessProfile: true,
        demoAssignments: {
          where: { expiresAt: { gt: new Date() } },
          include: { businessProfile: { select: { id: true, businessName: true } }, callerBindings: true },
        },
      },
      orderBy: { phoneNumber: "asc" },
    });
    res.json({ numbers });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/admin/telnyx/numbers/:id/assign", requireAuth, requireAdmin, async (req, res) => {
  try {
    const number = await prisma.voiceNumber.findUnique({ where: { id: Number(req.params.id) } });
    const business = await prisma.businessProfile.findUnique({ where: { id: Number(req.body.businessProfileId) } });
    if (!number || !business) throw new Error("Phone number or business was not found");
    if (number.numberType !== "regular") {
      throw new Error("Only regular numbers can be assigned to a business. Save this number as Regular first.");
    }
    const connectionId = await systemSecret("telnyx_connection_id", "TELNYX_CONNECTION_ID");
    if (!connectionId) throw new Error("Telnyx connection ID is not configured");
    await telnyxRequest(`/phone_numbers/${encodeURIComponent(number.providerNumberId)}`, {
      method: "PATCH",
      body: JSON.stringify({ connection_id: connectionId, customer_reference: business.cacheKey }),
    });
    const updated = await prisma.voiceNumber.update({
      where: { id: number.id },
      data: { businessProfileId: business.id, connectionId, numberType: "regular" },
      include: { businessProfile: true },
    });
    res.json({ number: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch("/api/admin/telnyx/numbers/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const numberType = ["regular", "demo", "onboarding"].includes(req.body.numberType)
      ? req.body.numberType
      : "regular";
    const updated = await prisma.voiceNumber.update({
      where: { id: Number(req.params.id) },
      data: {
        numberType,
        label: req.body.label === undefined ? undefined : String(req.body.label || "").trim() || null,
        businessProfileId: numberType === "regular" ? undefined : null,
      },
      include: { businessProfile: true, demoAssignments: true },
    });
    if (numberType !== "demo") await prisma.demoNumberAssignment.deleteMany({ where: { voiceNumberId: updated.id } });
    res.json({ number: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/settings", async (_req, res) => {
  const settings = await getSettings();
  res.json({
    researchModel: settings.researchModel,
    liveModel: settings.liveModel,
    voiceName: settings.voiceName,
    language: settings.language,
    agentName: settings.agentName,
  });
});

app.get("/api/business-phone-status", async (req, res) => {
  try {
    const normalized = normalizeBusinessName(req.query.business_name);
    const normalizedWebsite = normalizeWebsite(req.query.website);
    if (!normalized) return res.status(400).json({ error: "business_name query parameter is required" });
    const cacheKey = businessCacheKey(normalized, normalizedWebsite);
    const profile =
      (await prisma.businessProfile.findUnique({ where: { cacheKey } })) ||
      (await prisma.businessProfile.findFirst({
        where: normalizedWebsite
          ? { normalized, website: normalizedWebsite }
          : { normalized },
        orderBy: { updatedAt: "desc" },
      }));
    const phoneNumbers = profile ? await businessPhoneNumbers(profile.id) : [];
    res.json({
      businessProfileId: profile?.id || null,
      businessName: profile?.businessName || normalized,
      phoneNumbers,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/settings", requireAuth, requireAdmin, async (req, res) => {
  const settings = await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      researchModel: req.body.researchModel || "gemini-3.1-pro-preview",
      liveModel: liveModelPath(req.body.liveModel),
      voiceName: req.body.voiceName || "Puck",
      language: req.body.language || "English",
      agentName: req.body.agentName || "Alex",
    },
    update: {
      researchModel: req.body.researchModel || "gemini-3.1-pro-preview",
      liveModel: liveModelPath(req.body.liveModel),
      voiceName: req.body.voiceName || "Puck",
      language: req.body.language || "English",
      agentName: req.body.agentName || "Alex",
    },
  });
  res.json(settings);
});

async function refreshedAdmin(profile) {
  const config = await prisma.businessConfig.findUnique({
    where: { businessProfileId: profile.id },
    include: businessConfigInclude,
  });
  return businessAdminResponse(profile, config);
}

async function businessPhoneNumbers(profileId) {
  return prisma.voiceNumber.findMany({
    where: { businessProfileId: profileId },
    select: { id: true, phoneNumber: true, status: true, numberType: true, label: true },
    orderBy: [{ status: "asc" }, { phoneNumber: "asc" }],
  });
}

async function businessAdminResponse(profile, config) {
  const phoneNumbers = await businessPhoneNumbers(profile.id);
  return { profile, config, phoneNumbers };
}

function adminRequestIdentity(req) {
  return {
    businessName: req.body.businessName || req.query.business_name,
    website: req.body.website || req.query.website,
  };
}

app.get("/api/business-admin", async (req, res) => {
  try {
    const { profile, config } = await adminContext(req.query.business_name, req.query.website, req.user);
    res.json(await businessAdminResponse(profile, config));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/business-admin/profile", async (req, res) => {
  try {
    const { profile } = await adminContext(req.body.businessName, req.body.website, req.user);
    const businessName = normalizeBusinessName(req.body.profileBusinessName || profile.businessName);
    const website = normalizeWebsite(req.body.profileWebsite);
    if (!businessName) throw new Error("Business name is required");
    let faq = profile.rawData?.faq || [];
    if (req.body.faq !== undefined) {
      faq = typeof req.body.faq === "string" ? JSON.parse(req.body.faq || "[]") : req.body.faq;
      if (!Array.isArray(faq)) throw new Error("FAQ must be a JSON array");
    }
    const rawData = {
      ...(profile.rawData || {}),
      businessName,
      website,
      address: String(req.body.address || "").trim() || "unknown",
      phone: String(req.body.phone || "").trim() || "unknown",
      email: String(req.body.email || "").trim() || "unknown",
      pricing: String(req.body.pricing || "").trim() || "unknown",
      bookingPolicy: String(req.body.bookingPolicy || "").trim() || "unknown",
      faq,
    };
    const values = {
      businessName,
      website,
      summary: String(req.body.summary || "").trim(),
      hours: String(req.body.hours || "").trim(),
      services: String(req.body.services || "").trim(),
      serviceArea: String(req.body.serviceArea || "").trim(),
      contact: [rawData.phone, rawData.email, rawData.address].filter((value) => value && value !== "unknown").join(" | "),
      rawData,
    };
    const systemPrompt = buildSystemPrompt(values);
    const updated = await prisma.businessProfile.update({
      where: { id: profile.id },
      data: {
        ...values,
        normalized: businessName,
        cacheKey: businessCacheKey(businessName, website),
        systemPrompt,
      },
    });
    res.json(await refreshedAdmin(updated));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/business-admin/config", async (req, res) => {
  try {
    const { profile, config } = await adminContext(req.body.businessName, req.body.website, req.user);
    const appointmentMode = req.body.appointmentMode === "request" ? "request" : "instant";
    await prisma.businessConfig.update({
      where: { id: config.id },
      data: {
        extraInstructions: String(req.body.extraInstructions || ""),
        qualificationInstructions: String(req.body.qualificationInstructions || config.qualificationInstructions || ""),
        qualificationEnabled: req.body.qualificationEnabled === undefined ? config.qualificationEnabled : Boolean(req.body.qualificationEnabled),
        qualificationLaunchMode: ["approval", "immediate"].includes(String(req.body.qualificationLaunchMode))
          ? String(req.body.qualificationLaunchMode)
          : config.qualificationLaunchMode || "approval",
        qualificationDelayMinSeconds: Math.max(0, Number(req.body.qualificationDelayMinSeconds ?? config.qualificationDelayMinSeconds ?? 30)),
        qualificationDelayMaxSeconds: Math.max(0, Number(req.body.qualificationDelayMaxSeconds ?? config.qualificationDelayMaxSeconds ?? 100)),
        qualificationMaxAttempts: Math.max(1, Number(req.body.qualificationMaxAttempts || config.qualificationMaxAttempts || 3)),
        qualificationRetryDelayMinutes: Math.max(
          1,
          Number(req.body.qualificationRetryDelayMinutes || config.qualificationRetryDelayMinutes || 120),
        ),
        appointmentMode,
        slotDurationMinutes: Math.max(5, Number(req.body.slotDurationMinutes || 30)),
        bufferMinutes: Math.max(0, Number(req.body.bufferMinutes || 0)),
        timezone: String(req.body.timezone || "America/Chicago"),
        voiceName: String(req.body.voiceName || config.voiceName || "Puck"),
        language: String(req.body.language || config.language || "English"),
        agentName: String(req.body.agentName || config.agentName || "Alex"),
      },
    });
    for (const rule of req.body.availabilityRules || []) {
      await prisma.availabilityRule.upsert({
        where: {
          businessConfigId_dayOfWeek: {
            businessConfigId: config.id,
            dayOfWeek: Number(rule.dayOfWeek),
          },
        },
        create: {
          businessConfigId: config.id,
          dayOfWeek: Number(rule.dayOfWeek),
          startTime: String(rule.startTime || "09:00"),
          endTime: String(rule.endTime || "17:00"),
          enabled: Boolean(rule.enabled),
        },
        update: {
          startTime: String(rule.startTime || "09:00"),
          endTime: String(rule.endTime || "17:00"),
          enabled: Boolean(rule.enabled),
        },
      });
    }
    res.json(await refreshedAdmin(profile));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/business-admin/intake", async (req, res) => {
  try {
    const { profile, config } = await adminContext(req.body.businessName, req.body.website, req.user);
    await prisma.intakeField.create({
      data: {
        businessConfigId: config.id,
        fieldKey: fieldKey(req.body.fieldKey || req.body.label),
        label: String(req.body.label || "New field"),
        fieldType: String(req.body.fieldType || "text"),
        required: Boolean(req.body.required),
        options: Array.isArray(req.body.options) ? req.body.options : [],
        sortOrder: Number(req.body.sortOrder ?? config.intakeFields.length),
      },
    });
    res.json(await refreshedAdmin(profile));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/business-admin/intake/:id", async (req, res) => {
  try {
    const { profile, config } = await adminContext(req.body.businessName, req.body.website, req.user);
    await prisma.intakeField.updateMany({
      where: { id: Number(req.params.id), businessConfigId: config.id },
      data: {
        fieldKey: fieldKey(req.body.fieldKey || req.body.label),
        label: String(req.body.label || "Field"),
        fieldType: String(req.body.fieldType || "text"),
        required: Boolean(req.body.required),
        options: Array.isArray(req.body.options) ? req.body.options : [],
        sortOrder: Number(req.body.sortOrder || 0),
      },
    });
    res.json(await refreshedAdmin(profile));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/business-admin/intake/:id", async (req, res) => {
  try {
    const identity = adminRequestIdentity(req);
    const { profile, config } = await adminContext(identity.businessName, identity.website, req.user);
    await prisma.intakeField.deleteMany({ where: { id: Number(req.params.id), businessConfigId: config.id } });
    res.json(await refreshedAdmin(profile));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/business-admin/knowledge", async (req, res) => {
  try {
    const { profile, config } = await adminContext(req.body.businessName, req.body.website, req.user);
    await prisma.knowledgeEntry.create({
      data: {
        businessConfigId: config.id,
        question: String(req.body.question || ""),
        answer: String(req.body.answer || ""),
        category: req.body.category ? String(req.body.category) : null,
      },
    });
    res.json(await refreshedAdmin(profile));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/business-admin/knowledge/:id", async (req, res) => {
  try {
    const { profile, config } = await adminContext(req.body.businessName, req.body.website, req.user);
    await prisma.knowledgeEntry.updateMany({
      where: { id: Number(req.params.id), businessConfigId: config.id },
      data: {
        question: String(req.body.question || ""),
        answer: String(req.body.answer || ""),
        category: req.body.category ? String(req.body.category) : null,
      },
    });
    res.json(await refreshedAdmin(profile));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/business-admin/knowledge/:id", async (req, res) => {
  try {
    const identity = adminRequestIdentity(req);
    const { profile, config } = await adminContext(identity.businessName, identity.website, req.user);
    await prisma.knowledgeEntry.deleteMany({ where: { id: Number(req.params.id), businessConfigId: config.id } });
    res.json(await refreshedAdmin(profile));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

function normalizedPriceType(value) {
  const normalized = fieldKey(value || "fixed");
  if (["range", "starting_at", "call_for_quote"].includes(normalized)) return normalized;
  return "fixed";
}

function numberOrNull(value) {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

app.post("/api/business-admin/prices", async (req, res) => {
  try {
    const { profile, config } = await adminContext(req.body.businessName, req.body.website, req.user);
    await prisma.priceEntry.create({
      data: {
        businessConfigId: config.id,
        item: String(req.body.item || ""),
        description: req.body.description ? String(req.body.description) : null,
        priceType: normalizedPriceType(req.body.priceType),
        amountMin: numberOrNull(req.body.amountMin),
        amountMax: numberOrNull(req.body.amountMax),
        currency: String(req.body.currency || "USD"),
        category: req.body.category ? String(req.body.category) : null,
      },
    });
    res.json(await refreshedAdmin(profile));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/business-admin/prices/:id", async (req, res) => {
  try {
    const { profile, config } = await adminContext(req.body.businessName, req.body.website, req.user);
    await prisma.priceEntry.updateMany({
      where: { id: Number(req.params.id), businessConfigId: config.id },
      data: {
        item: String(req.body.item || ""),
        description: req.body.description ? String(req.body.description) : null,
        priceType: normalizedPriceType(req.body.priceType),
        amountMin: numberOrNull(req.body.amountMin),
        amountMax: numberOrNull(req.body.amountMax),
        currency: String(req.body.currency || "USD"),
        category: req.body.category ? String(req.body.category) : null,
      },
    });
    res.json(await refreshedAdmin(profile));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/business-admin/prices/:id", async (req, res) => {
  try {
    const identity = adminRequestIdentity(req);
    const { profile, config } = await adminContext(identity.businessName, identity.website, req.user);
    await prisma.priceEntry.deleteMany({ where: { id: Number(req.params.id), businessConfigId: config.id } });
    res.json(await refreshedAdmin(profile));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/business-admin/import/:type", upload.single("file"), async (req, res) => {
  try {
    const { profile, config } = await adminContext(req.body.businessName, req.body.website, req.user);
    const rows = await readTabularUpload(req.file);
    if (req.params.type === "knowledge") {
      const data = rows
        .map((row) => ({
          businessConfigId: config.id,
          question: row.question || row.q || "",
          answer: row.answer || row.a || "",
          category: row.category || null,
        }))
        .filter((row) => row.question && row.answer);
      if (data.length) await prisma.knowledgeEntry.createMany({ data });
    } else if (req.params.type === "prices") {
      const data = rows
        .map((row) => {
          const rawPrice = row.price || row.amount || row.amount_min || "";
          const range = String(rawPrice).match(/([0-9.]+)\s*[-–]\s*([0-9.]+)/);
          return {
            businessConfigId: config.id,
            item: row.item || row.service || row.name || "",
            description: row.description || null,
            priceType: normalizedPriceType(row.price_type || row.type || (range ? "range" : "fixed")),
            amountMin: numberOrNull(row.amount_min || row.min || (range ? range[1] : rawPrice)),
            amountMax: numberOrNull(row.amount_max || row.max || (range ? range[2] : null)),
            currency: row.currency || "USD",
            category: row.category || null,
          };
        })
        .filter((row) => row.item);
      if (data.length) await prisma.priceEntry.createMany({ data });
    } else {
      throw new Error("Import type must be knowledge or prices");
    }
    res.json({ ...(await refreshedAdmin(profile)), imported: rows.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/business-admin/calendar", async (req, res) => {
  try {
    const { profile, config } = await adminContext(req.query.business_name, req.query.website, req.user);
    const availability = await listCalendarSlots({
      prisma,
      profile,
      config,
      fromDate: req.query.from,
      days: Math.min(60, Number(req.query.days || 14)),
      durationMinutes: req.query.duration,
    });
    res.json(availability);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const crmStatuses = new Set(["new", "qualified", "unqualified", "callback", "appointment", "transferred", "unreachable"]);

function normalizeCrmStatus(value, fallback = "new") {
  const status = String(value || fallback).trim().toLowerCase();
  return crmStatuses.has(status) ? status : fallback;
}

function leadWhereForProfile(profile) {
  return {
    OR: [
      { businessProfileId: profile.id },
      { businessName: profile.businessName, website: profile.website },
    ],
  };
}

function issueLeadWebhookToken() {
  return `lead_${crypto.randomBytes(24).toString("base64url")}`;
}

async function webhookBaseUrl(req) {
  const settings = await getSettings();
  const configured = String(settings.publicBaseUrl || process.env.PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  return `${req.protocol}://${req.get("host")}`.replace(/\/$/, "");
}

async function ensureLeadWebhook(profile) {
  if (profile.leadWebhookToken) return profile;
  return prisma.businessProfile.update({
    where: { id: profile.id },
    data: { leadWebhookToken: issueLeadWebhookToken(), leadWebhookEnabled: true },
  });
}

function leadWebhookUrl(baseUrl, token) {
  return `${baseUrl.replace(/\/$/, "")}/webhooks/leads/${encodeURIComponent(token)}`;
}

function firstPayloadValue(payload, keys) {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null && String(payload[key]).trim() !== "") {
      return String(payload[key]).trim();
    }
  }
  return "";
}

function normalizeLeadWebhookPayload(payload = {}) {
  const body = payload && typeof payload === "object" ? payload : {};
  const name = firstPayloadValue(body, ["name", "full_name", "fullName", "contact_name", "customer_name", "first_name"]);
  const lastName = firstPayloadValue(body, ["last_name", "lastName"]);
  const fullName = [name, lastName].filter(Boolean).join(" ").trim() || "Webhook lead";
  const phone = firstPayloadValue(body, ["phone", "phone_number", "phoneNumber", "mobile", "caller_phone", "contact_phone"]);
  const email = firstPayloadValue(body, ["email", "email_address", "emailAddress", "contact_email"]);
  const need = firstPayloadValue(body, ["need", "service", "service_needed", "request", "message", "description", "notes", "comments"]);
  const source = firstPayloadValue(body, ["source", "lead_source", "utm_source", "platform", "provider"]) || "webhook";
  const notes = firstPayloadValue(body, ["notes", "message", "comments", "description"]);
  const knownKeys = new Set([
    "name",
    "full_name",
    "fullName",
    "contact_name",
    "customer_name",
    "first_name",
    "last_name",
    "lastName",
    "phone",
    "phone_number",
    "phoneNumber",
    "mobile",
    "caller_phone",
    "contact_phone",
    "email",
    "email_address",
    "emailAddress",
    "contact_email",
    "need",
    "service",
    "service_needed",
    "request",
    "message",
    "description",
    "notes",
    "comments",
    "source",
    "lead_source",
    "utm_source",
    "platform",
    "provider",
    "status",
  ]);
  const extra = Object.fromEntries(Object.entries(body).filter(([key]) => !knownKeys.has(key)));
  return {
    name: fullName,
    phone: phone || null,
    email: email || null,
    need: need || null,
    status: normalizeCrmStatus(body.status),
    source,
    notes: notes || null,
    extractedFields: {
      receivedAt: new Date().toISOString(),
      normalized: { name: fullName, phone: phone || null, email: email || null, need: need || null, source },
      extra,
      raw: body,
    },
  };
}

function leadWebhookHelp() {
  return {
    acceptedFields: [
      "name/full_name",
      "phone/phone_number",
      "email/email_address",
      "need/service/message",
      "source/lead_source/utm_source",
      "status",
      "notes",
    ],
    examplePayload: {
      name: "Jane Customer",
      phone: "+15551234567",
      email: "jane@example.com",
      service: "Lock replacement",
      source: "website-form",
      notes: "Needs service tomorrow morning",
    },
  };
}

function qualificationAutoLaunchEnabled(config) {
  return Boolean(config?.qualificationEnabled) && String(config?.qualificationLaunchMode || "approval") === "immediate";
}

async function maybeAutoStartQualification({ profile, config, lead }) {
  if (!qualificationAutoLaunchEnabled(config)) return { started: false };
  try {
    const delaySeconds = randomQualificationDelaySeconds(config);
    const scheduledFor = new Date(Date.now() + delaySeconds * 1000);
    const prepared = await prepareQualificationAttempt({
      config,
      lead,
      status: delaySeconds > 0 ? "scheduled" : "queued",
      scheduledFor: delaySeconds > 0 ? scheduledFor : null,
    });
    if (prepared.reused) {
      return {
        started: false,
        scheduled: prepared.attempt.status === "scheduled",
        attempt: prepared.attempt,
        reused: true,
      };
    }
    if (delaySeconds > 0) {
      setTimeout(() => {
        startOutboundQualificationCall({ profile, config, lead, attemptId: prepared.attempt.id }).catch((error) => {
          console.warn(`[qualification] delayed call failed for lead ${lead.id}: ${error.message}`);
        });
      }, delaySeconds * 1000);
      return { started: false, scheduled: true, delaySeconds, scheduledFor, attempt: prepared.attempt };
    }
    const result = await startOutboundQualificationCall({ profile, config, lead, attemptId: prepared.attempt.id });
    return { started: true, attempt: result.attempt, reused: result.reused };
  } catch (error) {
    return { started: false, error: error.message };
  }
}

function qualificationDelayRange(config) {
  const min = Math.max(0, Number(config?.qualificationDelayMinSeconds ?? 30));
  const max = Math.max(0, Number(config?.qualificationDelayMaxSeconds ?? 100));
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

function randomQualificationDelaySeconds(config) {
  const { min, max } = qualificationDelayRange(config);
  if (max <= min) return min;
  return min + Math.floor(Math.random() * (max - min + 1));
}

async function assignedOutboundNumber(profile) {
  const number = await prisma.voiceNumber.findFirst({
    where: {
      businessProfileId: profile.id,
      status: "active",
      numberType: { in: ["regular", "demo"] },
    },
    orderBy: [{ numberType: "desc" }, { updatedAt: "desc" }],
  });
  if (!number) throw new Error("Assign an active Telnyx number to this business before making outbound calls");
  return number;
}

async function prepareQualificationAttempt({ config, lead, status = "queued", scheduledFor = null }) {
  if (!config.qualificationEnabled) throw new Error("Outbound qualification is disabled for this business");
  const toNumber = normalizeE164Phone(lead.phone);
  if (!/^\+[1-9]\d{7,14}$/.test(toNumber)) throw new Error("Lead phone must be in a valid E.164 format");
  const existingOpenAttempt = await prisma.outboundQualificationCall.findFirst({
    where: { leadId: lead.id, status: { in: ["scheduled", "queued", "calling", "answered"] } },
    include: { voiceCall: true },
    orderBy: { createdAt: "desc" },
  });
  if (existingOpenAttempt) return { attempt: existingOpenAttempt, reused: true };
  const attemptNumber = (await prisma.outboundQualificationCall.count({ where: { leadId: lead.id } })) + 1;
  if (attemptNumber > config.qualificationMaxAttempts) {
    throw new Error(`Maximum qualification attempts reached (${config.qualificationMaxAttempts})`);
  }
  const attempt = await prisma.outboundQualificationCall.create({
    data: {
      leadId: lead.id,
      attemptNumber,
      status,
      toNumber,
      scheduledFor,
    },
  });
  return { attempt, reused: false };
}

async function startOutboundQualificationCall({ profile, config, lead, attemptId = null }) {
  if (!config.qualificationEnabled) {
    if (attemptId) {
      await prisma.outboundQualificationCall.updateMany({
        where: { id: Number(attemptId), leadId: lead.id },
        data: { status: "failed", lastError: "Outbound qualification is disabled for this business", endedAt: new Date() },
      });
    }
    throw new Error("Outbound qualification is disabled for this business");
  }
  const prepared = attemptId
    ? {
        attempt: await prisma.outboundQualificationCall.findFirst({
          where: { id: Number(attemptId), leadId: lead.id },
          include: { voiceCall: true },
        }),
        reused: false,
      }
    : await prepareQualificationAttempt({ config, lead });
  const attempt = prepared.attempt;
  if (!attempt) throw new Error("Qualification attempt was not found");
  if (prepared.reused) return prepared;
  const toNumber = normalizeE164Phone(lead.phone);
  try {
    const number = await assignedOutboundNumber(profile);
    const connectionId = number.connectionId || (await systemSecret("telnyx_connection_id", "TELNYX_CONNECTION_ID"));
    if (!connectionId) throw new Error("Telnyx connection ID is not configured");
    await prisma.outboundQualificationCall.update({
      where: { id: attempt.id },
      data: { fromNumber: number.phoneNumber, status: "queued" },
    });
    const commandId = crypto.randomUUID();
    const clientState = Buffer.from(
      JSON.stringify({
        callMode: "qualification",
        businessProfileId: profile.id,
        leadId: lead.id,
        attemptId: attempt.id,
      }),
    ).toString("base64");
    const response = await telnyxRequest("/calls", {
      method: "POST",
      body: JSON.stringify({
        connection_id: connectionId,
        to: toNumber,
        from: number.phoneNumber,
        command_id: commandId,
        client_state: clientState,
      }),
    });
    const callData = response.data || response;
    const callControlId = callData.call_control_id || callData.callControlId || callData.call_control_id_v2 || "";
    if (!callControlId) throw new Error("Telnyx did not return a call_control_id");
    const voiceCall = await prisma.voiceCall.upsert({
      where: { callControlId },
      create: {
        callControlId,
        callSessionId: callData.call_session_id || null,
        fromNumber: number.phoneNumber,
        toNumber,
        status: "initiated",
        callMode: "qualification",
        businessProfileId: profile.id,
      },
      update: {
        callSessionId: callData.call_session_id || undefined,
        fromNumber: number.phoneNumber,
        toNumber,
        status: "initiated",
        callMode: "qualification",
        businessProfileId: profile.id,
      },
    });
    const updatedAttempt = await prisma.outboundQualificationCall.update({
      where: { id: attempt.id },
      data: { voiceCallId: voiceCall.id, status: "calling", startedAt: new Date() },
      include: { voiceCall: true },
    });
    await logVoiceCallEvent(callControlId, "qualification.call_requested", { leadId: lead.id, attemptId: attempt.id });
    return { attempt: updatedAttempt, reused: false };
  } catch (error) {
    await prisma.outboundQualificationCall.update({
      where: { id: attempt.id },
      data: { status: "failed", lastError: error.message, endedAt: new Date() },
    });
    throw error;
  }
}

app.post("/webhooks/leads/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    const profile = await prisma.businessProfile.findFirst({
      where: { leadWebhookToken: token, leadWebhookEnabled: true },
    });
    if (!profile) return res.status(404).json({ error: "Lead webhook was not found or is disabled" });
    const config = await ensureBusinessConfig(profile);
    const normalized = normalizeLeadWebhookPayload(req.body);
    const lead = await prisma.lead.create({
      data: {
        businessProfileId: profile.id,
        businessName: profile.businessName,
        website: profile.website,
        ...normalized,
      },
    });
    const qualification = await maybeAutoStartQualification({ profile, config, lead });
    res.status(201).json({ ok: true, leadId: lead.id, status: lead.status, businessName: profile.businessName, qualification });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/business-admin/lead-webhook", async (req, res) => {
  try {
    const { profile } = await adminContext(req.query.business_name, req.query.website, req.user);
    const updatedProfile = await ensureLeadWebhook(profile);
    const baseUrl = await webhookBaseUrl(req);
    res.json({
      enabled: updatedProfile.leadWebhookEnabled,
      webhookUrl: leadWebhookUrl(baseUrl, updatedProfile.leadWebhookToken),
      ...leadWebhookHelp(),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/business-admin/lead-webhook/rotate", async (req, res) => {
  try {
    const identity = adminRequestIdentity(req);
    const { profile } = await adminContext(identity.businessName, identity.website, req.user);
    const updatedProfile = await prisma.businessProfile.update({
      where: { id: profile.id },
      data: { leadWebhookToken: issueLeadWebhookToken(), leadWebhookEnabled: true },
    });
    const baseUrl = await webhookBaseUrl(req);
    res.json({
      enabled: updatedProfile.leadWebhookEnabled,
      webhookUrl: leadWebhookUrl(baseUrl, updatedProfile.leadWebhookToken),
      ...leadWebhookHelp(),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/business-admin/crm", async (req, res) => {
  try {
    const { profile } = await adminContext(req.query.business_name, req.query.website, req.user);
    const status = req.query.status ? normalizeCrmStatus(req.query.status, "new") : null;
    const leads = await prisma.lead.findMany({
      where: {
        AND: [leadWhereForProfile(profile), status ? { status } : {}],
      },
      include: {
        voiceCall: {
          select: {
            id: true,
            callControlId: true,
            fromNumber: true,
            toNumber: true,
            status: true,
            hangupCause: true,
            recordingUrl: true,
            transcript: true,
            startedAt: true,
            answeredAt: true,
            endedAt: true,
          },
        },
        qualificationCalls: {
          include: {
            voiceCall: {
              select: {
                id: true,
                callControlId: true,
                fromNumber: true,
                toNumber: true,
                status: true,
                hangupCause: true,
                recordingUrl: true,
                transcript: true,
                startedAt: true,
                answeredAt: true,
                endedAt: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: Math.min(200, Math.max(1, Number(req.query.limit || 100))),
    });
    res.json({ leads, statuses: Array.from(crmStatuses) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/business-admin/crm", async (req, res) => {
  try {
    const { profile, config } = await adminContext(req.body.businessName, req.body.website, req.user);
    const lead = await prisma.lead.create({
      data: {
        businessProfileId: profile.id,
        businessName: profile.businessName,
        website: profile.website,
        name: String(req.body.name || "Unknown lead").trim() || "Unknown lead",
        phone: req.body.phone ? String(req.body.phone).trim() : null,
        email: req.body.email ? String(req.body.email).trim() : null,
        need: req.body.need ? String(req.body.need).trim() : null,
        status: normalizeCrmStatus(req.body.status),
        source: String(req.body.source || "manual").trim() || "manual",
        notes: req.body.notes ? String(req.body.notes).trim() : null,
        extractedFields: req.body.extractedFields && typeof req.body.extractedFields === "object" ? req.body.extractedFields : undefined,
      },
      include: { voiceCall: true },
    });
    const qualification = await maybeAutoStartQualification({ profile, config, lead });
    res.status(201).json({ lead, qualification });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/business-admin/crm/:id", async (req, res) => {
  try {
    const identity = adminRequestIdentity(req);
    const { profile } = await adminContext(identity.businessName, identity.website, req.user);
    const existing = await prisma.lead.findFirst({
      where: { AND: [{ id: Number(req.params.id) }, leadWhereForProfile(profile)] },
    });
    if (!existing) throw new Error("CRM lead was not found for this business");
    let extractedFields = existing.extractedFields;
    if (typeof req.body.extractedFieldsJson === "string" && req.body.extractedFieldsJson.trim()) {
      extractedFields = JSON.parse(req.body.extractedFieldsJson);
    } else if (req.body.extractedFields && typeof req.body.extractedFields === "object") {
      extractedFields = req.body.extractedFields;
    }
    const lead = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        name: req.body.name === undefined ? undefined : String(req.body.name || "Unknown lead").trim() || "Unknown lead",
        phone: req.body.phone === undefined ? undefined : String(req.body.phone || "").trim() || null,
        email: req.body.email === undefined ? undefined : String(req.body.email || "").trim() || null,
        need: req.body.need === undefined ? undefined : String(req.body.need || "").trim() || null,
        status: req.body.status === undefined ? undefined : normalizeCrmStatus(req.body.status, existing.status),
        notes: req.body.notes === undefined ? undefined : String(req.body.notes || "").trim() || null,
        extractedFields,
      },
      include: { voiceCall: true },
    });
    res.json({ lead });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/business-admin/crm/:id/qualify-call", async (req, res) => {
  try {
    const identity = adminRequestIdentity(req);
    const { profile, config } = await adminContext(identity.businessName, identity.website, req.user);
    const lead = await prisma.lead.findFirst({
      where: { AND: [{ id: Number(req.params.id) }, leadWhereForProfile(profile)] },
    });
    if (!lead) throw new Error("CRM lead was not found for this business");
    const result = await startOutboundQualificationCall({ profile, config, lead });
    res.status(result.reused ? 200 : 201).json({ attempt: result.attempt, reused: result.reused });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/business", requireAuth, async (req, res) => {
  try {
    const settings = await getSettings();
    const scopedBusinessName = req.user.role === "business" ? req.user.businessProfile?.businessName : req.query.business_name;
    const scopedWebsite = req.user.role === "business" ? req.user.businessProfile?.website : req.query.website;
    const result = await researchBusiness({
      businessName: scopedBusinessName,
      website: scopedWebsite,
      researchModel: req.query.research_model || settings.researchModel,
      forceRefresh: req.query.refresh === "1",
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/demo-data", async (req, res) => {
  const businessWhere =
    req.user.role === "business" && req.user.businessProfile
      ? { businessName: req.user.businessProfile.businessName, website: req.user.businessProfile.website }
      : {};
  const [appointments, leads, transferMessages, businesses] = await Promise.all([
    prisma.appointment.findMany({ where: businessWhere, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.lead.findMany({ where: businessWhere, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.transferMessage.findMany({ where: businessWhere, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.businessProfile.findMany({
      where: req.user.role === "business" ? { id: req.user.businessProfileId } : {},
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);
  res.json({ appointments, leads, transferMessages, businesses });
});

async function handleTelnyxMediaConnection(telnyxWs, request) {
  const queuedMediaMessages = [];
  let mediaMessageHandler = null;
  telnyxWs.on("message", (raw) => {
    if (mediaMessageHandler) {
      mediaMessageHandler(raw);
    } else {
      queuedMediaMessages.push(raw);
    }
  });
  const url = new URL(request.url || "/", "http://localhost");
  const callControlId = url.searchParams.get("call_control_id") || "";
  const token = url.searchParams.get("token") || "";
  if (!callControlId || !safeTokenMatches(token, telnyxMediaToken(callControlId))) {
    telnyxWs.close(1008, "Invalid media token");
    return;
  }

  const call = await prisma.voiceCall.findUnique({
    where: { callControlId },
    include: {
      businessProfile: true,
      onboardingSession: true,
      outboundQualificationCall: { include: { lead: true } },
    },
  });
  const isOnboarding = call?.callMode === "onboarding" && Boolean(call.onboardingSession);
  const isQualification = call?.callMode === "qualification" && Boolean(call.outboundQualificationCall?.lead);
  if (!call || (!call.businessProfile && !isOnboarding)) {
    telnyxWs.close(1008, "Call is not assigned to a business");
    return;
  }

  let profile = call.businessProfile;
  let config = profile ? await ensureBusinessConfig(profile) : null;
  let onboardingSession = call.onboardingSession;
  const qualificationAttempt = call.outboundQualificationCall;
  const qualificationLead = qualificationAttempt?.lead || null;
  const settings = await getSettings();
  const useTelnyxSpeakOutput = TELNYX_PHONE_OUTPUT_MODE === "telnyx_speak" && call.status !== "test";
  await logVoiceCallEvent(callControlId, "media.connected", {
    businessProfileId: profile?.id || null,
    callMode: isOnboarding ? "onboarding" : isQualification ? "qualification" : "business",
    phoneOutputMode: useTelnyxSpeakOutput ? "telnyx_speak" : "media_stream",
    l16Endian: TELNYX_L16_ENDIAN,
    leadId: qualificationLead?.id || null,
    qualificationAttemptId: qualificationAttempt?.id || null,
  });
  let geminiWs = null;
  let streamId = null;
  let geminiReady = false;
  let telnyxSampleRate = 8000;
  let telnyxEncoding = "PCMU";
  const telnyxOutputEncoding = TELNYX_OUTBOUND_CODEC;
  const telnyxOutputRate = TELNYX_OUTBOUND_SAMPLE_RATE;
  const pcmuOutputConverter =
    telnyxOutputEncoding === "PCMU" ? createPcm24kToPcmuConverter(telnyxOutputRate) : null;
  const l16OutputConverter =
    telnyxOutputEncoding === "L16" ? createPcm24kToL16Converter(telnyxOutputRate) : null;
  let callerAudioChunks = 0;
  let agentAudioChunks = 0;
  let agentAudioBytes = 0;
  let greeted = false;
  let onboardingGreetingComplete = false;
  let onboardingContextSent = false;
  let pendingOnboardingPreparation = null;
  const outboundAudioQueue = [];
  let outboundAudioTimer = null;
  let telnyxSpeakTimer = null;
  let pendingTelnyxSpeakText = "";
  let agentTextChunks = 0;
  let agentAudioPlaying = false;
  let callerInputForwardingEnabled = false;
  let initialGreetingComplete = false;
  let enableCallerInputWhenPlaybackDrains = false;
  let suppressInputUntil = 0;
  let suppressedInputChunks = 0;
  const loggedSuppressedInputReasons = new Set();
  let closing = false;
  let mediaStartTimer = null;
  let onboardingTranscript = onboardingSession?.transcript || "";
  let qualificationTranscript = qualificationAttempt?.transcript || "";
  let provisioningPromise = null;
  let loggedCallerAudioPacket = false;
  let loggedGeminiSourcePacket = false;
  let loggedGeminiOutputPacket = false;
  let loggedTelnyxOutboundFrame = false;
  let outboundFramesQueued = 0;
  let outboundFramesSent = 0;
  let outboundMaxQueueDepth = 0;
  const bridgeAudioCapture = {
    enabled: BRIDGE_AUDIO_CAPTURE_ENABLED,
    saved: false,
    geminiSourcePcm24Le: [],
    geminiSourcePcm24LeBytes: 0,
    telnyxOutboundRaw: [],
    telnyxOutboundRawBytes: 0,
    callerInboundRaw: [],
    callerInboundRawBytes: 0,
    geminiSourceMaxBytes: Math.max(0, Math.floor(24000 * 2 * (BRIDGE_AUDIO_CAPTURE_MS / 1000))),
    telnyxOutboundMaxBytes: Math.max(0, Math.floor(telnyxOutputRate * 2 * (BRIDGE_AUDIO_CAPTURE_MS / 1000))),
    callerInboundMaxBytes: Math.max(0, Math.floor(24000 * 2 * (BRIDGE_AUDIO_CAPTURE_MS / 1000))),
  };

  const captureBridgeAudio = (key, payload, maxBytes) => {
    if (!bridgeAudioCapture.enabled || bridgeAudioCapture[`${key}Bytes`] >= maxBytes) return;
    const buffer = Buffer.from(String(payload || ""), "base64");
    if (!buffer.length) return;
    const remaining = maxBytes - bridgeAudioCapture[`${key}Bytes`];
    const chunk = buffer.length > remaining ? buffer.subarray(0, remaining) : buffer;
    bridgeAudioCapture[key].push(Buffer.from(chunk));
    bridgeAudioCapture[`${key}Bytes`] += chunk.length;
  };

  const runBackground = (label, task) => {
    Promise.resolve()
      .then(task)
      .catch((error) => console.warn(`[telnyx] ${label} failed: ${error.message}`));
  };

  const saveBridgeAudioCapture = async (reason = "closed") => {
    if (!bridgeAudioCapture.enabled || bridgeAudioCapture.saved) return;
    bridgeAudioCapture.saved = true;
    const geminiSource = Buffer.concat(bridgeAudioCapture.geminiSourcePcm24Le);
    const telnyxOutbound = Buffer.concat(bridgeAudioCapture.telnyxOutboundRaw);
    const callerInbound = Buffer.concat(bridgeAudioCapture.callerInboundRaw);
    if (!geminiSource.length && !telnyxOutbound.length && !callerInbound.length) return;

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const prefix = `call-${call.id}-${stamp}`;
    const files = {};
    try {
      fs.mkdirSync(BRIDGE_AUDIO_CAPTURE_DIR, { recursive: true });
      if (geminiSource.length) {
        const filePath = path.join(BRIDGE_AUDIO_CAPTURE_DIR, `${prefix}-gemini-source-24k-le.wav`);
        writePcm16Wav(filePath, geminiSource, 24000);
        files.geminiSourceWav = filePath;
      }
      if (telnyxOutbound.length) {
        const rawPath = path.join(BRIDGE_AUDIO_CAPTURE_DIR, `${prefix}-telnyx-outbound-exact.l16${TELNYX_L16_ENDIAN.toLowerCase()}`);
        fs.writeFileSync(rawPath, telnyxOutbound);
        files.telnyxOutboundExactRaw = rawPath;
        if (telnyxOutputEncoding === "L16") {
          const configuredWavPath = path.join(
            BRIDGE_AUDIO_CAPTURE_DIR,
            `${prefix}-telnyx-outbound-${TELNYX_L16_ENDIAN.toLowerCase()}-decoded-16k.wav`,
          );
          const oppositeWavPath = path.join(
            BRIDGE_AUDIO_CAPTURE_DIR,
            `${prefix}-telnyx-outbound-${TELNYX_L16_ENDIAN === "BE" ? "le" : "be"}-interpreted-16k.wav`,
          );
          writePcm16Wav(
            configuredWavPath,
            TELNYX_L16_ENDIAN === "BE" ? pcm16BigEndianToLittleEndian(telnyxOutbound) : telnyxOutbound,
            telnyxOutputRate,
          );
          writePcm16Wav(
            oppositeWavPath,
            TELNYX_L16_ENDIAN === "BE" ? telnyxOutbound : pcm16BigEndianToLittleEndian(telnyxOutbound),
            telnyxOutputRate,
          );
          files.telnyxOutboundConfiguredEndianWav = configuredWavPath;
          files.telnyxOutboundOppositeEndianWav = oppositeWavPath;
        }
      }
      if (callerInbound.length) {
        const rawPath = path.join(
          BRIDGE_AUDIO_CAPTURE_DIR,
          `${prefix}-caller-inbound-exact.${telnyxEncoding.toLowerCase()}${telnyxEncoding === "L16" ? TELNYX_L16_ENDIAN.toLowerCase() : ""}`,
        );
        fs.writeFileSync(rawPath, callerInbound);
        files.callerInboundExactRaw = rawPath;
        if (telnyxEncoding === "L16") {
          const wavPath = path.join(
            BRIDGE_AUDIO_CAPTURE_DIR,
            `${prefix}-caller-inbound-${TELNYX_L16_ENDIAN.toLowerCase()}-decoded-${telnyxSampleRate}hz.wav`,
          );
          writePcm16Wav(
            wavPath,
            TELNYX_L16_ENDIAN === "BE" ? pcm16BigEndianToLittleEndian(callerInbound) : callerInbound,
            telnyxSampleRate,
          );
          files.callerInboundConfiguredEndianWav = wavPath;
        }
      }
      await logVoiceCallEvent(callControlId, "bridge.audio.capture_saved", {
        reason,
        captureMs: BRIDGE_AUDIO_CAPTURE_MS,
        files,
        bytes: {
          geminiSourcePcm24Le: geminiSource.length,
          telnyxOutboundRaw: telnyxOutbound.length,
          callerInboundRaw: callerInbound.length,
        },
        telnyxOutput: { encoding: telnyxOutputEncoding, sampleRate: telnyxOutputRate },
        telnyxInput: { encoding: telnyxEncoding, sampleRate: telnyxSampleRate },
        l16Endian: TELNYX_L16_ENDIAN,
      });
    } catch (error) {
      await logVoiceCallEvent(callControlId, "bridge.audio.capture_failed", {
        reason,
        message: error.message,
      });
    }
  };

  const persistOnboardingTranscript = async (speaker, text) => {
    if (!isOnboarding || !onboardingSession?.transcriptionEnabled || !String(text || "").trim()) return;
    onboardingTranscript += `${onboardingTranscript ? "\n" : ""}[${speaker}] ${String(text).trim()}`;
    try {
      await Promise.all([
        withPrismaRetry(
          "persistOnboardingTranscript.onboardingSession",
          () => prisma.onboardingSession.update({ where: { id: onboardingSession.id }, data: { transcript: onboardingTranscript } }),
          3,
        ),
        withPrismaRetry(
          "persistOnboardingTranscript.voiceCall",
          () => prisma.voiceCall.update({ where: { id: call.id }, data: { transcript: onboardingTranscript } }),
          3,
        ),
      ]);
    } catch (error) {
      console.warn(`[db] onboarding transcript persistence skipped: ${error.message}`);
    }
  };

  const persistQualificationTranscript = async (speaker, text) => {
    if (!isQualification || !qualificationAttempt || !String(text || "").trim()) return;
    qualificationTranscript += `${qualificationTranscript ? "\n" : ""}[${speaker}] ${String(text).trim()}`;
    await withPrismaRetry(
      "persistQualificationTranscript.update",
      () => prisma.outboundQualificationCall.update({ where: { id: qualificationAttempt.id }, data: { transcript: qualificationTranscript } }),
      3,
    ).catch((error) => {
      console.warn(`[db] qualification transcript persistence skipped: ${error.message}`);
    });
  };

  const buildOnboardingAgent = async (businessName, website, lookupData = null) => {
    if (!isOnboarding) throw new Error("This is not an onboarding call");
    if (provisioningPromise) return provisioningPromise;
    provisioningPromise = (async () => {
      await prisma.onboardingSession.update({
        where: { id: onboardingSession.id },
        data: { status: "researching", businessName, website: normalizeWebsite(website), lookupData: lookupData || undefined },
      });
      const result = await provisionTrialBusiness({ businessName, website, settings });
      if (result.claimed) {
        await prisma.onboardingSession.update({
          where: { id: onboardingSession.id },
          data: { status: "existing_account", businessName, website: normalizeWebsite(website) },
        });
        return { ok: false, existingAccount: true, message: "This business already has an account." };
      }
      profile = result.profile;
      config = await ensureBusinessConfig(profile);
      onboardingSession = await prisma.onboardingSession.update({
        where: { id: onboardingSession.id },
        data: {
          status: "agent_ready",
          businessName: profile.businessName,
          website: profile.website,
          businessProfileId: profile.id,
          lookupData: lookupData || undefined,
        },
      });
      await prisma.voiceCall.update({ where: { id: call.id }, data: { businessProfileId: profile.id } });
      await logVoiceCallEvent(callControlId, "onboarding.agent_ready", {
        businessProfileId: profile.id,
        businessName: profile.businessName,
        cached: result.cached,
      });
      return {
        ok: true,
        businessName: profile.businessName,
        website: profile.website,
        summary: profile.summary,
        hours: profile.hours,
        services: profile.services,
        demoPhoneNumber: result.demoAssignment?.voiceNumber?.phoneNumber || null,
      };
    })().finally(() => {
      provisioningPromise = null;
    });
    return provisioningPromise;
  };

  const onboardingPreparation = isOnboarding
    ? (async () => {
        try {
          await prisma.onboardingSession.update({ where: { id: onboardingSession.id }, data: { status: "looking_up" } });
          const lookup = await lookupOnboardingBusiness(call.fromNumber, settings);
          if (!lookup?.businessName) {
            await prisma.onboardingSession.update({ where: { id: onboardingSession.id }, data: { status: "collecting_details" } });
            return { ok: false, found: false };
          }
          await logVoiceCallEvent(callControlId, "onboarding.lookup_found", {
            businessName: lookup.businessName,
            website: lookup.website,
          });
          return { found: true, lookup, agent: await buildOnboardingAgent(lookup.businessName, lookup.website, lookup.raw) };
        } catch (error) {
          await prisma.onboardingSession.update({
            where: { id: onboardingSession.id },
            data: { status: "collecting_details", lastError: error.message },
          });
          await logVoiceCallEvent(callControlId, "onboarding.lookup_failed", { message: error.message });
          return { ok: false, found: false, error: error.message };
        }
      })()
    : Promise.resolve(null);

  const hangup = async (reason = "normal_clearing") => {
    if (closing) return;
    closing = true;
    await logVoiceCallEvent(callControlId, "hangup.requested", { reason });
    try {
      await telnyxRequest(`/calls/${encodeURIComponent(callControlId)}/actions/hangup`, {
        method: "POST",
        body: JSON.stringify({ command_id: crypto.randomUUID() }),
      });
    } catch (error) {
      console.warn(`[telnyx] hangup failed (${reason}): ${error.message}`);
    }
  };

  const clearOutboundAudioQueue = (suppressAfterMs = 0) => {
    outboundAudioQueue.length = 0;
    if (outboundAudioTimer) {
      clearInterval(outboundAudioTimer);
      outboundAudioTimer = null;
    }
    if (telnyxSpeakTimer) {
      clearTimeout(telnyxSpeakTimer);
      telnyxSpeakTimer = null;
    }
    agentAudioPlaying = false;
    if (suppressAfterMs) suppressInputUntil = Date.now() + suppressAfterMs;
  };

  const agentOutputActive = () => agentAudioPlaying || outboundAudioQueue.length > 0 || Date.now() < suppressInputUntil;

  const enableCallerInput = (reason) => {
    if (callerInputForwardingEnabled || closing) return;
    callerInputForwardingEnabled = true;
    logVoiceCallEvent(callControlId, "caller.audio.forwarding_enabled", {
      reason,
      callMode: isOnboarding ? "onboarding" : isQualification ? "qualification" : "business",
    }).catch(() => {});
  };

  const maybeEnableCallerInputAfterPlayback = () => {
    if (!enableCallerInputWhenPlaybackDrains || callerInputForwardingEnabled || outboundAudioQueue.length || agentAudioPlaying) return;
    enableCallerInputWhenPlaybackDrains = false;
    setTimeout(() => enableCallerInput("initial_greeting_played"), 250);
  };

  const sendTelnyxAudioPayload = (payload) => {
    if (telnyxWs.readyState !== WebSocket.OPEN || !streamId || closing) return false;
    outboundFramesSent += 1;
    captureBridgeAudio("telnyxOutboundRaw", payload, bridgeAudioCapture.telnyxOutboundMaxBytes);
    if (!loggedTelnyxOutboundFrame) {
      loggedTelnyxOutboundFrame = true;
      logVoiceCallEvent(callControlId, "telnyx.audio.frame_sent", {
        frameIndex: outboundFramesSent,
        queueDepthAfterShift: outboundAudioQueue.length,
        summary: summarizeAudioPayload(payload, telnyxOutputEncoding, telnyxOutputRate),
      }).catch(() => {});
    }
    telnyxWs.send(JSON.stringify({ event: "media", media: { payload } }));
    if (outboundFramesSent === 1) {
      enableCallerInput("agent_audio_started");
    }
    return true;
  };

  const startOutboundAudioPacer = () => {
    if (outboundAudioTimer) return;
    outboundAudioTimer = setInterval(() => {
      const payload = outboundAudioQueue.shift();
      if (!payload) {
        clearOutboundAudioQueue(250);
        maybeEnableCallerInputAfterPlayback();
        return;
      }
      sendTelnyxAudioPayload(payload);
    }, TELNYX_OUTBOUND_FRAME_MS);
  };

  const enqueueTelnyxAudio = (base64Audio) => {
    const audio = Buffer.from(base64Audio, "base64");
    agentAudioPlaying = true;
    const bytesPerSample = telnyxOutputEncoding === "L16" ? 2 : 1;
    const frameBytes = Math.max(
      bytesPerSample,
      Math.floor(telnyxOutputRate * (TELNYX_OUTBOUND_FRAME_MS / 1000)) * bytesPerSample,
    );
    const frameCount = Math.ceil(audio.length / frameBytes);
    outboundFramesQueued += frameCount;
    for (let offset = 0; offset < audio.length; offset += frameBytes) {
      outboundAudioQueue.push(audio.subarray(offset, offset + frameBytes).toString("base64"));
    }
    outboundMaxQueueDepth = Math.max(outboundMaxQueueDepth, outboundAudioQueue.length);
    startOutboundAudioPacer();
  };

  const estimateTelnyxSpeakMs = (text) => Math.min(30000, Math.max(1500, Math.ceil(String(text || "").length * 70)));

  const speakWithTelnyx = async (text) => {
    const payload = String(text || "").replace(/\s+/g, " ").trim().slice(0, 3000);
    if (!payload || closing) return;
    clearOutboundAudioQueue();
    const estimatedMs = estimateTelnyxSpeakMs(payload);
    agentAudioPlaying = true;
    suppressInputUntil = Date.now() + estimatedMs + 500;
    telnyxSpeakTimer = setTimeout(() => {
      agentAudioPlaying = false;
      telnyxSpeakTimer = null;
    }, estimatedMs + 500);
    const commandId = crypto.randomUUID();
    try {
      await telnyxRequest(`/calls/${encodeURIComponent(callControlId)}/actions/speak`, {
        method: "POST",
        body: JSON.stringify({
          command_id: commandId,
          payload,
          payload_type: "text",
          service_level: "basic",
          voice: TELNYX_SPEAK_VOICE,
          language: TELNYX_SPEAK_LANGUAGE,
          stop: "all",
          target_legs: "self",
          client_state: Buffer.from(JSON.stringify({ mode: "agent_tts", voiceCallId: call.id })).toString("base64"),
        }),
      });
      await logVoiceCallEvent(callControlId, "telnyx.speak_requested", {
        commandId,
        characters: payload.length,
        estimatedMs,
        voice: TELNYX_SPEAK_VOICE,
        language: TELNYX_SPEAK_LANGUAGE,
      });
    } catch (error) {
      await logVoiceCallEvent(callControlId, "telnyx.speak_failed", { message: error.message });
      agentAudioPlaying = false;
    }
  };

  const runOnboardingTool = async (functionCall) => {
    const args = functionCall.args || {};
    if (functionCall.name === "build_business_agent") {
      return buildOnboardingAgent(args.businessName, args.website);
    }
    if (functionCall.name === "switch_to_business_agent") {
      if (!profile || !config) throw new Error("Build the business agent before switching personas");
      onboardingSession = await prisma.onboardingSession.update({
        where: { id: onboardingSession.id },
        data: { status: "testing_agent", personaSwitchedAt: new Date() },
      });
      await logVoiceCallEvent(callControlId, "onboarding.persona_switched", { businessProfileId: profile.id });
      return {
        ok: true,
        switched: true,
        personaPrompt: `${profile.systemPrompt}\n${runtimeBusinessInstructions(config)}\n\nYou have now switched into the live receptionist for ${profile.businessName}. Stop discussing platform onboarding. Greet the caller as ${config.agentName}, answer as this business receptionist, and use the business tools when appropriate.`,
      };
    }
    if (functionCall.name === "send_setup_link") {
      if (!profile) throw new Error("Build the business agent before sending its setup link");
      const claim = await createPhoneClaimLink({ profile, email: args.email, settings });
      const delivery = await deliverSetupLink({
        settings,
        toPhone: call.fromNumber,
        setupUrl: claim.setupUrl,
        businessName: profile.businessName,
      });
      await sendClaimEmail({
        settings,
        email: claim.email,
        setupUrl: claim.setupUrl,
        businessName: profile.businessName,
      }).catch(() => false);
      onboardingSession = await prisma.onboardingSession.update({
        where: { id: onboardingSession.id },
        data: {
          status: "claim_link_sent",
          email: claim.email,
          claimLinkSentAt: new Date(),
          messageProvider: delivery.provider,
        },
      });
      await logVoiceCallEvent(callControlId, "onboarding.claim_link_sent", {
        provider: delivery.provider,
        email: claim.email,
      });
      return { ok: true, sent: true, provider: delivery.provider };
    }
    if (functionCall.name === "end_call") return { ok: true, shouldEndCall: true, reason: args.reason || "Onboarding complete" };
    throw new Error(`Unknown onboarding tool: ${functionCall.name}`);
  };

  const startGemini = async () => {
    if (geminiWs) return;
    const geminiApiKey = await systemSecret("gemini_api_key", "GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("Gemini API key is not configured");
    const phoneLiveModel = liveModelPath(TELNYX_LIVE_MODEL || settings.liveModel);
    await logVoiceCallEvent(callControlId, "gemini.connecting", {
      model: phoneLiveModel,
      source: TELNYX_LIVE_MODEL ? "TELNYX_LIVE_MODEL" : "appSettings.liveModel",
    });
    geminiWs = new WebSocket(`${GEMINI_WS_URL}?key=${encodeURIComponent(geminiApiKey)}`);
    const onboardingContextFromPreparation = (prepared) => {
      if (prepared?.found && prepared.agent?.existingAccount) {
        return `Caller lookup found ${prepared.lookup.businessName} (${prepared.lookup.website || "website unknown"}), but it already has an account. Explain that you cannot expose the existing private agent and offer to explain the sign-in path.`;
      }
      if (prepared?.found && prepared.agent?.ok) {
        return `Caller lookup found and built ${prepared.agent.businessName} (${prepared.agent.website || "website unknown"}). Confirm this is the correct company, summarize what was found, and offer to switch into the completed receptionist for a live test.`;
      }
      return `No usable company was returned by caller lookup. Ask for the business name and optional website, confirm them, then use build_business_agent.`;
    };
    const maybeSendOnboardingContext = async () => {
      if (!isOnboarding || onboardingContextSent || !onboardingGreetingComplete || !pendingOnboardingPreparation) return;
      if (geminiWs?.readyState !== WebSocket.OPEN) return;
      onboardingContextSent = true;
      const prepared = pendingOnboardingPreparation;
      pendingOnboardingPreparation = null;
      const context = onboardingContextFromPreparation(prepared);
      await logVoiceCallEvent(callControlId, "onboarding.context_sent", {
        found: Boolean(prepared?.found),
        agentReady: Boolean(prepared?.agent?.ok),
      });
      geminiWs.send(
        JSON.stringify({
          clientContent: { turns: [{ role: "user", parts: [{ text: context }] }], turnComplete: true },
        }),
      );
    };
    geminiWs.on("open", async () => {
      await logVoiceCallEvent(callControlId, "gemini.connected");
      const identity = sessionIdentity(config?.agentName || settings.agentName, config?.language || settings.language);
      const onboardingPrompt = `${settings.onboardingInstructions}

Phone onboarding context:
- Caller phone: ${call.fromNumber || "unknown"}
- Campaign source: ${onboardingSession?.campaignLabel || "unlabeled"}
- Look up or collect the business name and website.
- Confirm details before using build_business_agent.
- Once the agent is ready, offer to switch into it for a live test.
- Collect and confirm the caller's email before using send_setup_link.
- Never claim a link was sent unless the tool reports sent=true.
- Keep responses brief and conversational.`;
      const qualificationPrompt = `${profile?.systemPrompt}
${config ? runtimeBusinessInstructions(config) : ""}

Outbound qualification call:
- You are calling on behalf of ${profile?.businessName}.
- Your goal is to qualify this CRM lead, not to hard sell.
- Lead name: ${qualificationLead?.name || "unknown"}.
- Lead phone: ${qualificationLead?.phone || call.toNumber || "unknown"}.
- Lead email: ${qualificationLead?.email || "unknown"}.
- Lead need/request: ${qualificationLead?.need || "unknown"}.
- Lead source: ${qualificationLead?.source || "unknown"}.
- Existing notes: ${qualificationLead?.notes || "none"}.
- Existing extracted fields: ${JSON.stringify(qualificationLead?.extractedFields || {})}.
- Business qualification instructions: ${config?.qualificationInstructions || "Confirm need, urgency, location, timing, and whether they want an appointment or callback."}
- First ask if now is a good time and identify yourself as ${identity.agentName} calling for ${profile?.businessName}.
- If they are not available, ask for a better callback time and call update_lead_qualification with status callback.
- If they are interested and a good fit, use status qualified or appointment.
- If they are not interested, wrong number, outside service area, or not a fit, use status unqualified or unreachable.
- Before ending, call update_lead_qualification with the outcome unless the call never reaches the lead.
- Keep responses brief and conversational.`;
      const businessPrompt = `${profile?.systemPrompt}
${config ? runtimeBusinessInstructions(config) : ""}

Live session identity and language:
- Your receptionist name is ${identity.agentName}.
- Speak in ${identity.language}.
- Introduce yourself as ${identity.agentName}.
- Continue using ${identity.language} unless the caller explicitly requests another language.
- If the caller changes languages and you understand it, respond naturally in the caller's requested language.`;
      const setup = {
        setup: {
          model: phoneLiveModel,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: isOnboarding
                    ? settings.onboardingVoiceName || settings.voiceName || "Puck"
                    : config?.voiceName || settings.voiceName || "Puck",
                },
              },
            },
          },
          systemInstruction: { parts: [{ text: isOnboarding ? onboardingPrompt : isQualification ? qualificationPrompt : businessPrompt }] },
          tools: [{ functionDeclarations: isOnboarding ? onboardingToolDeclarations() : isQualification ? qualificationToolDeclarations(config) : toolDeclarations(config) }],
          ...(isOnboarding && !onboardingSession.transcriptionEnabled
              ? {}
              : { inputAudioTranscription: {}, outputAudioTranscription: {} }),
        },
      };
      geminiWs.send(
        JSON.stringify(setup),
      );
    });

    geminiWs.on("message", async (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (message.setupComplete && !greeted) {
        greeted = true;
        geminiReady = true;
        runBackground("log gemini.ready", () => logVoiceCallEvent(callControlId, "gemini.ready"));
        const greeting = isOnboarding
          ? `Greet the caller as the AI Receptionist onboarding specialist. Follow the configured opening instructions and briefly explain that you can build and demonstrate their own business agent during this call.`
          : isQualification
            ? `Start the outbound qualification call. Ask for ${qualificationLead?.name || "the lead"} if appropriate, identify yourself as ${config.agentName || settings.agentName} calling for ${profile.businessName}, and ask if now is a good time for a quick follow-up.`
          : `Greet the caller briefly as ${config.agentName || settings.agentName}, the receptionist for ${profile.businessName}.`;
        geminiWs.send(
          JSON.stringify({
            clientContent: {
              turns: [
                {
                  role: "user",
                  parts: [
                    {
                      text: greeting,
                    },
                  ],
                },
              ],
              turnComplete: true,
            },
          }),
        );
        if (isOnboarding) {
          onboardingPreparation.then((prepared) => {
            pendingOnboardingPreparation = prepared;
            maybeSendOnboardingContext().catch((error) =>
              console.warn(`[telnyx] onboarding context send failed: ${error.message}`),
            );
          });
        }
      }
      const serverContent = message.serverContent;
      if (isOnboarding && serverContent?.inputTranscription?.text) {
        runBackground("persist onboarding caller transcript", () =>
          persistOnboardingTranscript("Caller", serverContent.inputTranscription.text),
        );
      } else if (!isOnboarding && serverContent?.inputTranscription?.text) {
        const text = serverContent.inputTranscription.text;
        runBackground("persist caller transcript", async () => {
          await appendVoiceCallTranscript({
            callId: call.id,
            speaker: "Caller",
            text,
            profile,
          });
          await persistQualificationTranscript("Caller", text);
        });
      }
      if (useTelnyxSpeakOutput && serverContent?.outputTranscription?.text) {
        pendingTelnyxSpeakText += serverContent.outputTranscription.text;
        agentTextChunks += 1;
      } else if (isOnboarding && serverContent?.outputTranscription?.text) {
        runBackground("persist onboarding agent transcript", () =>
          persistOnboardingTranscript("Agent", serverContent.outputTranscription.text),
        );
      } else if (!isOnboarding && serverContent?.outputTranscription?.text) {
        const text = serverContent.outputTranscription.text;
        runBackground("persist agent transcript", async () => {
          await appendVoiceCallTranscript({
            callId: call.id,
            speaker: "Agent",
            text,
            profile,
          });
          await persistQualificationTranscript("Agent", text);
        });
      }
      if (serverContent?.interrupted && telnyxWs.readyState === WebSocket.OPEN) {
        clearOutboundAudioQueue();
        runBackground("log gemini.interrupted", () => logVoiceCallEvent(callControlId, "gemini.interrupted", {
          callMode: isOnboarding ? "onboarding" : isQualification ? "qualification" : "business",
        }));
        telnyxWs.send(JSON.stringify({ event: "clear" }));
      }
      for (const part of serverContent?.modelTurn?.parts || []) {
        if (useTelnyxSpeakOutput && part.text) {
          pendingTelnyxSpeakText += part.text;
          agentTextChunks += 1;
        } else if (!useTelnyxSpeakOutput && part.inlineData?.data && telnyxWs.readyState === WebSocket.OPEN && streamId) {
          captureBridgeAudio("geminiSourcePcm24Le", part.inlineData.data, bridgeAudioCapture.geminiSourceMaxBytes);
          if (!loggedGeminiSourcePacket) {
            loggedGeminiSourcePacket = true;
            runBackground("log gemini.audio.source_packet", () => logVoiceCallEvent(callControlId, "gemini.audio.source_packet", {
              summary: summarizeAudioPayload(part.inlineData.data, "PCM16LE", 24000),
            }));
          }
          const telnyxAudio =
            telnyxOutputEncoding === "PCMU"
              ? isOnboarding
                ? pcmuOutputConverter(part.inlineData.data)
                : pcm24kToPcmuBase64(part.inlineData.data, telnyxOutputRate)
              : l16OutputConverter(part.inlineData.data);
          if (!telnyxAudio) continue;
          agentAudioChunks += 1;
          agentAudioBytes += Buffer.from(telnyxAudio, "base64").length;
          if (agentAudioChunks === 1) {
            runBackground("log gemini.audio.started", () => logVoiceCallEvent(callControlId, "gemini.audio.started", {
              mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
              outputEncoding: telnyxOutputEncoding,
              outputRate: telnyxOutputRate,
              l16Endian: TELNYX_L16_ENDIAN,
              frameMs: TELNYX_OUTBOUND_FRAME_MS,
            }));
          }
          if (!loggedGeminiOutputPacket) {
            loggedGeminiOutputPacket = true;
            runBackground("log gemini.audio.output_packet", () => logVoiceCallEvent(callControlId, "gemini.audio.output_packet", {
              frameBytes: Math.max(
                telnyxOutputEncoding === "L16" ? 2 : 1,
                Math.floor(telnyxOutputRate * (TELNYX_OUTBOUND_FRAME_MS / 1000)) *
                  (telnyxOutputEncoding === "L16" ? 2 : 1),
              ),
              summary: summarizeAudioPayload(telnyxAudio, telnyxOutputEncoding, telnyxOutputRate),
            }));
          }
          enqueueTelnyxAudio(telnyxAudio);
        }
      }
      if (useTelnyxSpeakOutput && serverContent?.turnComplete && pendingTelnyxSpeakText.trim()) {
        const text = pendingTelnyxSpeakText.trim();
        pendingTelnyxSpeakText = "";
        await logVoiceCallEvent(callControlId, "gemini.text.turn_complete", {
          chunks: agentTextChunks,
          characters: text.length,
        });
        agentTextChunks = 0;
        if (isOnboarding) {
          await persistOnboardingTranscript("Agent", text);
        } else {
          await appendVoiceCallTranscript({
            callId: call.id,
            speaker: "Agent",
            text,
            profile,
          });
          await persistQualificationTranscript("Agent", text);
        }
        await speakWithTelnyx(text);
        if (!initialGreetingComplete) {
          initialGreetingComplete = true;
          setTimeout(() => enableCallerInput("initial_telnyx_speak_estimate_elapsed"), estimateTelnyxSpeakMs(text) + 250);
        }
        if (isOnboarding && !onboardingGreetingComplete) {
          onboardingGreetingComplete = true;
          setTimeout(() => {
            maybeSendOnboardingContext().catch((error) =>
              console.warn(`[telnyx] onboarding context send failed: ${error.message}`),
            );
          }, 400);
        }
      }
      if (serverContent?.turnComplete && agentAudioChunks) {
        runBackground("log gemini.audio.turn_complete", () => logVoiceCallEvent(callControlId, "gemini.audio.turn_complete", {
          chunks: agentAudioChunks,
          bytes: agentAudioBytes,
          outboundFramesQueued,
          outboundFramesSent,
          outboundMaxQueueDepth,
        }));
        if (!initialGreetingComplete) {
          initialGreetingComplete = true;
          enableCallerInputWhenPlaybackDrains = true;
          maybeEnableCallerInputAfterPlayback();
        }
        if (isOnboarding && !onboardingGreetingComplete) {
          onboardingGreetingComplete = true;
          setTimeout(() => {
            maybeSendOnboardingContext().catch((error) =>
              console.warn(`[telnyx] onboarding context send failed: ${error.message}`),
            );
          }, 400);
        }
      }
      if (message.toolCall) {
        const functionResponses = [];
        let shouldEndCall = false;
        let endReason = "Call completed";
        let personaPrompt = null;
        for (const functionCall of message.toolCall.functionCalls || []) {
          try {
            const toolContext = {
              voiceCallId: call.id,
              fromNumber: call.fromNumber,
              toNumber: call.toNumber,
              qualificationLeadId: qualificationLead?.id || null,
              qualificationAttemptId: qualificationAttempt?.id || null,
              leadExtractedFields: qualificationLead?.extractedFields || null,
            };
            const result = isOnboarding
              ? await runOnboardingTool(functionCall)
              : isQualification
                ? await runQualificationToolCall(profile, config, functionCall, toolContext)
              : await runToolCall(profile, config, functionCall, {
                  voiceCallId: call.id,
                  fromNumber: call.fromNumber,
                  toNumber: call.toNumber,
                });
            shouldEndCall ||= Boolean(result.shouldEndCall);
            endReason = result.reason || endReason;
            personaPrompt ||= result.personaPrompt || null;
            functionResponses.push({ id: functionCall.id, name: functionCall.name, response: { result } });
          } catch (error) {
            functionResponses.push({
              id: functionCall.id,
              name: functionCall.name,
              response: { ok: false, error: error.message },
            });
          }
        }
        if (geminiWs.readyState === WebSocket.OPEN) {
          geminiWs.send(JSON.stringify({ toolResponse: { functionResponses } }));
          if (personaPrompt) {
            geminiWs.send(
              JSON.stringify({
                clientContent: { turns: [{ role: "user", parts: [{ text: personaPrompt }] }], turnComplete: true },
              }),
            );
          }
        }
        if (shouldEndCall) setTimeout(() => hangup(endReason), 1200);
      }
    });

    geminiWs.on("error", async (error) => {
      console.error("[telnyx] Gemini Live error", error.message);
      await logVoiceCallEvent(callControlId, "error", { stage: "gemini", message: error.message });
      hangup("gemini_error");
    });
    geminiWs.on("close", async (code, reason) => {
      await logVoiceCallEvent(callControlId, "gemini.closed", { code, reason: reason.toString() });
      if (!closing && telnyxWs.readyState === WebSocket.OPEN) hangup("gemini_closed");
    });
  };

  mediaMessageHandler = async (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      if (message.event === "start") {
        if (mediaStartTimer) clearTimeout(mediaStartTimer);
        streamId = message.stream_id;
        const format = message.start?.media_format || {};
        await logVoiceCallEvent(callControlId, "media.started", { streamId, format });
        telnyxSampleRate = Number(format.sample_rate);
        telnyxEncoding = String(format.encoding || "").toUpperCase();
        if (!["PCMU", "L16"].includes(telnyxEncoding) || ![8000, 16000, 24000].includes(telnyxSampleRate)) {
          throw new Error(`Unexpected media format: ${JSON.stringify(format)}`);
        }
        await startGemini();
      } else if (message.event === "media" && geminiReady && geminiWs?.readyState === WebSocket.OPEN) {
        callerAudioChunks += 1;
        if (callerAudioChunks === 1) {
          await logVoiceCallEvent(callControlId, "caller.audio.started", { inputRate: telnyxSampleRate });
        }
        captureBridgeAudio("callerInboundRaw", message.media?.payload, bridgeAudioCapture.callerInboundMaxBytes);
        if (!loggedCallerAudioPacket) {
          loggedCallerAudioPacket = true;
          await logVoiceCallEvent(callControlId, "caller.audio.packet", {
            expectedFrameBytes: Math.max(1, Math.floor(telnyxSampleRate * (TELNYX_OUTBOUND_FRAME_MS / 1000)) * (telnyxEncoding === "L16" ? 2 : 1)),
            summary: summarizeAudioPayload(message.media?.payload, telnyxEncoding, telnyxSampleRate),
          });
        }
        const suppressionReason = !callerInputForwardingEnabled ? "initial_greeting" : "";
        if (suppressionReason) {
          suppressedInputChunks += 1;
          if (!loggedSuppressedInputReasons.has(suppressionReason)) {
            loggedSuppressedInputReasons.add(suppressionReason);
            await logVoiceCallEvent(callControlId, "caller.audio.suppressed", {
              reason: suppressionReason,
              chunks: suppressedInputChunks,
              callMode: isOnboarding ? "onboarding" : isQualification ? "qualification" : "business",
            });
          }
          return;
        }
        geminiWs.send(
          JSON.stringify({
            realtimeInput: {
              audio: {
                mimeType: "audio/pcm;rate=16000",
                data:
                  telnyxEncoding === "PCMU"
                    ? pcmuToPcm16Base64(message.media?.payload, telnyxSampleRate)
                    : l16ToPcm16Base64(message.media?.payload, telnyxSampleRate),
              },
            },
          }),
        );
      } else if (message.event === "stop") {
        await logVoiceCallEvent(callControlId, "media.stopped", { reason: message.stop?.reason || null });
        closing = true;
        if (geminiWs?.readyState === WebSocket.OPEN) geminiWs.close(1000, "Telnyx stream stopped");
      } else if (message.event === "error") {
        await logVoiceCallEvent(callControlId, "media.provider_error", message.error || message);
      }
    } catch (error) {
      console.error("[telnyx] Media message error", error.message);
      await logVoiceCallEvent(callControlId, "error", { stage: "media", message: error.message });
      await hangup("media_error");
    }
  };

  mediaStartTimer = setTimeout(async () => {
    if (streamId || closing) return;
    const message = "Telnyx WebSocket connected but no media start frame arrived within 5 seconds";
    await logVoiceCallEvent(callControlId, "error", { stage: "media_start_timeout", message });
    await hangup("media_start_timeout");
  }, 5000);

  for (const raw of queuedMediaMessages.splice(0)) {
    await mediaMessageHandler(raw);
  }

  telnyxWs.on("error", async (error) => {
    await logVoiceCallEvent(callControlId, "error", { stage: "telnyx_websocket", message: error.message });
  });

  telnyxWs.on("close", async (code, reason) => {
      if (mediaStartTimer) clearTimeout(mediaStartTimer);
      clearOutboundAudioQueue();
      await logVoiceCallEvent(callControlId, "media.closed", { code, reason: reason.toString() });
      await saveBridgeAudioCapture("media_closed");
    closing = true;
    if (geminiWs?.readyState === WebSocket.OPEN) geminiWs.close(1000, "Telnyx media closed");
  });
}

telnyxWss.on("connection", (telnyxWs, request) => {
  handleTelnyxMediaConnection(telnyxWs, request).catch(async (error) => {
    const url = new URL(request.url || "/", "http://localhost");
    const callControlId = url.searchParams.get("call_control_id") || "";
    console.error("[telnyx] Media initialization error", error.message);
    if (callControlId) await logVoiceCallEvent(callControlId, "error", { stage: "initialization", message: error.message });
    if (telnyxWs.readyState === WebSocket.OPEN) telnyxWs.close(1011, "Media initialization failed");
  });
});

wss.on("connection", (clientWs, request) => {
  const socketUserPromise = currentUser(request).catch(() => null);
  let geminiWs = null;
  let profile = null;
  let businessConfig = null;
  let identity = sessionIdentity("Alex", "English");
  let greeted = false;
  let setupComplete = false;
  let micForwardingEnabled = false;
  let inputAudioChunks = 0;
  let outputAudioChunks = 0;

  const sendClient = (message) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(message));
    }
  };

  clientWs.on("message", async (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      sendClient({ type: "error", error: "Invalid JSON message" });
      return;
    }

    if (message.type === "start") {
      try {
        const settings = await getSettings();
        let result;
        if (message.demoToken) {
          const demoSession = await fastAgentSession(message.demoToken);
          if (!demoSession) throw new Error("This demo session is invalid or expired");
          if (demoSession.businessProfile.accountStatus !== "trial") throw new Error("This demo is no longer active");
          if (demoSession.businessProfile.creditBalance <= 0) throw new Error("This trial has no credits remaining");
          result = { profile: demoSession.businessProfile, cached: true };
        } else {
          const socketUser = await socketUserPromise;
          if (!socketUser) throw new Error("Authentication required");
          if (socketUser.role === "business") {
            if (!socketUser.businessProfileId) throw new Error("No business is assigned to this account");
            const assignedProfile = await prisma.businessProfile.findUnique({ where: { id: socketUser.businessProfileId } });
            if (!assignedProfile) throw new Error("Assigned business was not found");
            if (
              assignedProfile.accountStatus === "expired" ||
              (assignedProfile.accountStatus === "trial" && assignedProfile.trialEndsAt <= new Date())
            ) {
              throw new Error("This trial has expired");
            }
            if (assignedProfile.accountStatus === "trial" && assignedProfile.creditBalance <= 0) {
              throw new Error("This trial has no credits remaining");
            }
            result = { profile: assignedProfile, cached: true };
          } else if (socketUser.role === "admin") {
            result = await researchBusiness({
              businessName: message.businessName,
              website: message.website,
              researchModel: message.researchModel || settings.researchModel,
            });
          } else {
            throw new Error("This account cannot start live calls");
          }
        }
        profile = result.profile;
        businessConfig = await ensureBusinessConfig(profile);
        identity = sessionIdentity(businessConfig.agentName || settings.agentName, businessConfig.language || settings.language);
        sendClient({ type: "business", cached: result.cached, profile });
        sendClient({ type: "debug", message: `Business profile loaded. Cache: ${result.cached ? "yes" : "no"}.` });

        const geminiApiKey = await systemSecret("gemini_api_key", "GEMINI_API_KEY");
        if (!geminiApiKey) throw new Error("Gemini API key is not configured");
        geminiWs = new WebSocket(`${GEMINI_WS_URL}?key=${encodeURIComponent(geminiApiKey)}`);

        geminiWs.on("open", () => {
          const selectedLiveModel = liveModelPath(message.liveModel || settings.liveModel);
          const liveSystemPrompt = `${profile.systemPrompt}
${runtimeBusinessInstructions(businessConfig)}

Live session identity and language:
- Your receptionist name is ${identity.agentName}.
- Speak in ${identity.language}.
- Introduce yourself as ${identity.agentName}.
- Continue using ${identity.language} unless the caller explicitly requests another language.
- If the caller changes languages and you understand it, respond naturally in the caller's requested language.`;
          const setup = {
            setup: {
              model: selectedLiveModel,
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: businessConfig.voiceName || settings.voiceName || "Puck",
                    },
                  },
                },
              },
              systemInstruction: {
                parts: [{ text: liveSystemPrompt }],
              },
              tools: [{ functionDeclarations: toolDeclarations(businessConfig) }],
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
          };
          geminiWs.send(JSON.stringify(setup));
          console.log(`[live] Gemini socket opened for ${profile.businessName} using ${selectedLiveModel}`);
          sendClient({ type: "status", status: "gemini_open" });
          sendClient({ type: "debug", message: `Gemini Live socket opened with ${selectedLiveModel}.` });
        });

        geminiWs.on("message", async (geminiRaw) => {
          let geminiMessage;
          try {
            geminiMessage = JSON.parse(geminiRaw.toString());
          } catch {
            return;
          }

          if (geminiMessage.setupComplete && !greeted) {
            greeted = true;
            setupComplete = true;
            sendClient({ type: "ready" });
            sendClient({ type: "debug", message: "Gemini Live setup completed. Asking agent to greet." });
            geminiWs.send(
              JSON.stringify({
                clientContent: {
                  turns: [
                    {
                      role: "user",
                      parts: [
                        {
                          text: `Start the call with a short greeting in ${identity.language}. Introduce yourself as ${identity.agentName}, the receptionist for ${profile.businessName}.`,
                        },
                      ],
                    },
                  ],
                  turnComplete: true,
                },
              }),
            );
          }

          if (geminiMessage.serverContent) {
            const serverContent = geminiMessage.serverContent;
            if (serverContent.inputTranscription?.text) {
              sendClient({ type: "transcript", speaker: "caller", text: serverContent.inputTranscription.text });
            }
            if (serverContent.outputTranscription?.text) {
              sendClient({ type: "transcript", speaker: "agent", text: serverContent.outputTranscription.text });
            }
            if (serverContent.interrupted) {
              sendClient({ type: "interrupted" });
              sendClient({ type: "debug", message: "Agent playback interrupted by caller speech." });
            }
            for (const part of serverContent.modelTurn?.parts || []) {
              if (part.inlineData?.data) {
                outputAudioChunks += 1;
                if (setupComplete && greeted && !micForwardingEnabled) {
                  micForwardingEnabled = true;
                  sendClient({ type: "mic_ready" });
                  sendClient({ type: "debug", message: "Agent greeting started. Microphone forwarding enabled." });
                }
                if (outputAudioChunks === 1 || outputAudioChunks % 10 === 0) {
                  sendClient({
                    type: "debug",
                    message: `Received Gemini audio chunk ${outputAudioChunks}.`,
                  });
                }
                sendClient({
                  type: "audio",
                  data: part.inlineData.data,
                  mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
                });
              }
            }
            if (setupComplete && greeted && !micForwardingEnabled && serverContent.turnComplete) {
              micForwardingEnabled = true;
              sendClient({ type: "mic_ready" });
              sendClient({ type: "debug", message: "Initial greeting finished. Microphone forwarding enabled." });
            }
          }

          if (geminiMessage.toolCall) {
            await handleToolCall(geminiWs, clientWs, profile, businessConfig, geminiMessage.toolCall);
            sendClient({ type: "tool_call", toolCall: geminiMessage.toolCall });
          }

          if (geminiMessage.goAway) {
            sendClient({ type: "status", status: "go_away", detail: geminiMessage.goAway });
          }
        });

        geminiWs.on("close", (code, reason) => {
          console.log(`[live] Gemini socket closed code=${code} reason=${reason.toString()}`);
          sendClient({ type: "status", status: "gemini_closed", code, reason: reason.toString() });
        });

        geminiWs.on("error", (error) => {
          console.error("[live] Gemini socket error", error);
          sendClient({ type: "error", error: error.message });
        });
      } catch (error) {
        sendClient({ type: "error", error: error.message });
      }
      return;
    }

    if (message.type === "audio") {
      if (!geminiWs || geminiWs.readyState !== WebSocket.OPEN) return;
      if (!micForwardingEnabled) return;
      inputAudioChunks += 1;
      if (inputAudioChunks === 1 || inputAudioChunks % 50 === 0) {
        sendClient({ type: "debug", message: `Sent microphone audio chunk ${inputAudioChunks} to Gemini.` });
      }
      geminiWs.send(
        JSON.stringify({
          realtimeInput: {
            audio: {
              mimeType: "audio/pcm;rate=16000",
              data: message.data,
            },
          },
        }),
      );
      return;
    }

    if (message.type === "text") {
      if (!geminiWs || geminiWs.readyState !== WebSocket.OPEN) return;
      geminiWs.send(
        JSON.stringify({
          realtimeInput: {
            text: String(message.text || ""),
          },
        }),
      );
    }
  });

  clientWs.on("close", () => {
    if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.close();
    }
  });
});

await backfillAppointmentBookingKeys({ prisma });
await bootstrapAdmin();
await bootstrapBusinessLifecycle();

server.listen(PORT, () => {
  const protocol = USE_HTTPS ? "https" : "http";
  console.log(`AI receptionist demo running at ${protocol}://localhost:${PORT}`);
});
