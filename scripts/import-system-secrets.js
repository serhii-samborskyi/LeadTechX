import "dotenv/config";

import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const allowed = new Set(["gemini_api_key", "telnyx_api_key", "telnyx_public_key", "telnyx_connection_id"]);

function encryptionKey() {
  const source = process.env.APP_ENCRYPTION_KEY || process.env.GEMINI_API_KEY;
  if (!source) throw new Error("APP_ENCRYPTION_KEY is required");
  return crypto.createHash("sha256").update(source).digest();
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

try {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  for (const [secretKey, rawValue] of Object.entries(input.secrets || {})) {
    if (!allowed.has(secretKey)) throw new Error(`Unsupported secret: ${secretKey}`);
    const value = String(rawValue || "").trim();
    if (!value) continue;
    await prisma.systemSecret.upsert({
      where: { secretKey },
      create: { secretKey, encrypted: encrypt(value), hint: value.slice(-4) },
      update: { encrypted: encrypt(value), hint: value.slice(-4) },
    });
  }
  if (typeof input.publicBaseUrl === "string") {
    await prisma.appSettings.upsert({
      where: { id: 1 },
      create: { id: 1, publicBaseUrl: input.publicBaseUrl.trim().replace(/\/$/, "") },
      update: { publicBaseUrl: input.publicBaseUrl.trim().replace(/\/$/, "") },
    });
  }
  console.log(JSON.stringify({ ok: true, imported: Object.keys(input.secrets || {}).length }));
} finally {
  await prisma.$disconnect();
}
