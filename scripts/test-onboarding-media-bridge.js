import "dotenv/config";

import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { WebSocket } from "ws";

const prisma = new PrismaClient();
const callControlId = `local-onboarding-test-${crypto.randomUUID()}`;
const keySource = process.env.APP_ENCRYPTION_KEY || process.env.GEMINI_API_KEY;
if (!keySource) throw new Error("APP_ENCRYPTION_KEY is required");
const key = crypto.createHash("sha256").update(keySource).digest();
const token = crypto.createHmac("sha256", key).update(callControlId).digest("base64url");
const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
const call = await prisma.voiceCall.create({
  data: {
    callControlId,
    fromNumber: "+13125550100",
    toNumber: "+13125550101",
    callMode: "onboarding",
    status: "test",
    onboardingSession: {
      create: {
        callerPhone: "+13125550100",
        campaignLabel: "Automated test",
        recordingEnabled: false,
        transcriptionEnabled: true,
      },
    },
  },
});

let mediaChunks = 0;
let interval;
let socket;
try {
  if (settings?.onboardingLookupUrl) {
    await prisma.appSettings.update({ where: { id: 1 }, data: { onboardingLookupUrl: "" } });
  }
  socket = new WebSocket(
    `ws://127.0.0.1:${process.env.PORT || 3000}/telnyx-media?call_control_id=${encodeURIComponent(callControlId)}&token=${encodeURIComponent(token)}`,
  );
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for onboarding Gemini audio")), 15000);
    socket.on("open", () => {
      socket.send(JSON.stringify({ event: "connected", version: "1.0.0" }));
      socket.send(
        JSON.stringify({
          event: "start",
          stream_id: "local-onboarding-stream",
          start: { media_format: { encoding: "L16", sample_rate: 16000, channels: 1 } },
        }),
      );
      const silence = Buffer.alloc(640, 0x00).toString("base64");
      interval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ event: "media", media: { payload: silence } }));
      }, 20);
    });
    socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.event === "media" && message.media?.payload) {
        mediaChunks += 1;
        if (mediaChunks >= 3) {
          clearTimeout(timeout);
          resolve();
        }
      }
    });
    socket.on("error", reject);
    socket.on("close", (code, reason) => {
      if (!mediaChunks) reject(new Error(`Onboarding media socket closed ${code}: ${reason.toString()}`));
    });
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  const record = await prisma.voiceCall.findUnique({
    where: { id: call.id },
    include: { events: { orderBy: { createdAt: "asc" } }, onboardingSession: true },
  });
  const events = record.events.map((event) => event.eventType);
  for (const required of ["media.started", "gemini.ready", "gemini.audio.started"]) {
    if (!events.includes(required)) throw new Error(`Missing event: ${required}`);
  }
  console.log(JSON.stringify({ ok: true, mediaChunks, status: record.onboardingSession.status, events }));
} finally {
  if (interval) clearInterval(interval);
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  await prisma.voiceCall.delete({ where: { id: call.id } }).catch(() => {});
  if (settings?.onboardingLookupUrl) {
    await prisma.appSettings.update({ where: { id: 1 }, data: { onboardingLookupUrl: settings.onboardingLookupUrl } });
  }
  await prisma.$disconnect();
}
