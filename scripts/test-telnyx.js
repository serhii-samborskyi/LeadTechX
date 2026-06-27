import "dotenv/config";

import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function key() {
  const source = process.env.APP_ENCRYPTION_KEY || process.env.GEMINI_API_KEY;
  if (!source) throw new Error("APP_ENCRYPTION_KEY is required");
  return crypto.createHash("sha256").update(source).digest();
}

function decrypt(value) {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

async function secret(secretKey) {
  const item = await prisma.systemSecret.findUnique({ where: { secretKey } });
  if (!item) throw new Error(`${secretKey} is not configured`);
  return decrypt(item.encrypted);
}

async function request(path, apiKey) {
  const response = await fetch(`https://api.telnyx.com/v2${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.errors?.[0]?.detail || `Telnyx returned ${response.status}`);
  return data;
}

try {
  const [apiKey, publicKey, connectionId] = await Promise.all([
    secret("telnyx_api_key"),
    secret("telnyx_public_key"),
    secret("telnyx_connection_id"),
  ]);
  if (Buffer.from(publicKey, "base64").length !== 32) throw new Error("Telnyx public key is not a 32-byte Ed25519 key");
  const [numbers, application] = await Promise.all([
    request("/phone_numbers?page[size]=20", apiKey),
    request(`/call_control_applications/${encodeURIComponent(connectionId)}`, apiKey),
  ]);
  console.log(
    JSON.stringify({
      ok: true,
      publicKeyValid: true,
      applicationFound: Boolean(application.data?.id),
      applicationName: application.data?.application_name || null,
      webhookUrl: application.data?.webhook_event_url || null,
      webhookApiVersion: application.data?.webhook_api_version || null,
      ownedNumberCount: numbers.meta?.total_results ?? numbers.data?.length ?? 0,
      numbers: (numbers.data || []).map((number) => ({
        phoneNumber: number.phone_number,
        status: number.status,
        assignedToApplication: String(number.connection_id || "") === String(connectionId),
      })),
    }),
  );
} finally {
  await prisma.$disconnect();
}
