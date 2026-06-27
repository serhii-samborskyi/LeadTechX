import "dotenv/config";

import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { WebSocket } from "ws";

const prisma = new PrismaClient();
const callControlId = `local-media-test-${crypto.randomUUID()}`;
const keySource = process.env.APP_ENCRYPTION_KEY || process.env.GEMINI_API_KEY;
if (!keySource) throw new Error("APP_ENCRYPTION_KEY is required");
const key = crypto.createHash("sha256").update(keySource).digest();
const token = crypto.createHmac("sha256", key).update(callControlId).digest("base64url");
const business = await prisma.businessProfile.findFirst({
  where: { voiceNumbers: { some: {} } },
  orderBy: { updatedAt: "desc" },
});
if (!business) throw new Error("Assign a phone number to a business before testing media");

const call = await prisma.voiceCall.create({
  data: {
    callControlId,
    fromNumber: "+10000000000",
    toNumber: "+10000000001",
    businessProfileId: business.id,
    status: "test",
  },
});

let mediaChunks = 0;
let interval;
let socket;
try {
  socket = new WebSocket(
    `ws://127.0.0.1:${process.env.PORT || 3000}/telnyx-media?call_control_id=${encodeURIComponent(callControlId)}&token=${encodeURIComponent(token)}`,
  );
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for Gemini audio")), 15000);
    socket.on("open", () => {
      socket.send(JSON.stringify({ event: "connected", version: "1.0.0" }));
      setTimeout(() => {
        socket.send(
          JSON.stringify({
            event: "start",
            stream_id: "local-test-stream",
            start: { media_format: { encoding: "L16", sample_rate: 16000, channels: 1 } },
          }),
        );
        const silence = Buffer.alloc(640, 0x00).toString("base64");
        interval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ event: "media", media: { payload: silence } }));
          }
        }, 20);
      }, 300);
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
      if (!mediaChunks) reject(new Error(`Media socket closed ${code}: ${reason.toString()}`));
    });
  });
  const events = await prisma.voiceCallEvent.findMany({ where: { voiceCallId: call.id }, orderBy: { createdAt: "asc" } });
  console.log(JSON.stringify({ ok: true, mediaChunks, events: events.map((event) => event.eventType) }));
} catch (error) {
  const record = await prisma.voiceCall.findUnique({
    where: { id: call.id },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
  console.error(
    JSON.stringify({
      ok: false,
      error: error.message,
      lastError: record?.lastError,
      events: record?.events.map((event) => ({ type: event.eventType, detail: event.detail })),
    }),
  );
  process.exitCode = 1;
} finally {
  if (interval) clearInterval(interval);
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  await prisma.voiceCall.delete({ where: { id: call.id } }).catch(() => {});
  await prisma.$disconnect();
}
