import "dotenv/config";

import { execFileSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const sqlitePath = path.resolve(process.env.SQLITE_DATABASE_PATH || "prisma/dev.sqlite.backup.db");

const tables = [
  { table: "BusinessProfile", delegate: "businessProfile", dates: ["createdAt", "updatedAt"], json: ["rawData", "sourceUrls"] },
  { table: "BusinessConfig", delegate: "businessConfig", dates: ["createdAt", "updatedAt"], json: ["providerConfig"] },
  {
    table: "IntakeField",
    delegate: "intakeField",
    dates: ["createdAt", "updatedAt"],
    json: ["options"],
    booleans: ["required"],
  },
  { table: "KnowledgeEntry", delegate: "knowledgeEntry", dates: ["createdAt", "updatedAt"] },
  { table: "PriceEntry", delegate: "priceEntry", dates: ["createdAt", "updatedAt"] },
  { table: "AvailabilityRule", delegate: "availabilityRule", booleans: ["enabled"] },
  { table: "Appointment", delegate: "appointment", dates: ["scheduledStart", "scheduledEnd", "createdAt"], json: ["intakeData"] },
  { table: "Lead", delegate: "lead", dates: ["createdAt"] },
  { table: "TransferMessage", delegate: "transferMessage", dates: ["createdAt"] },
  { table: "AppSettings", delegate: "appSettings", dates: ["updatedAt"] },
  { table: "User", delegate: "user", dates: ["createdAt", "updatedAt"], booleans: ["active"] },
  { table: "Session", delegate: "session", dates: ["expiresAt", "createdAt"] },
  { table: "SystemSecret", delegate: "systemSecret", dates: ["updatedAt"] },
  { table: "VoiceNumber", delegate: "voiceNumber", dates: ["createdAt", "updatedAt"], json: ["metadata"] },
  {
    table: "VoiceCall",
    delegate: "voiceCall",
    dates: ["startedAt", "answeredAt", "endedAt", "updatedAt"],
  },
  { table: "VoiceCallEvent", delegate: "voiceCallEvent", dates: ["createdAt"], json: ["detail"] },
  { table: "TelnyxWebhookEvent", delegate: "telnyxWebhookEvent", dates: ["receivedAt"], json: ["payload"] },
];

function readTable(table) {
  const output = execFileSync("sqlite3", ["-json", sqlitePath, `SELECT * FROM "${table}" ORDER BY id`], {
    encoding: "utf8",
  }).trim();
  return output ? JSON.parse(output) : [];
}

function asDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return new Date(value);
  if (/^\d+$/.test(String(value))) return new Date(Number(value));
  return new Date(value);
}

function normalizeRows(rows, config) {
  return rows.map((source) => {
    const row = { ...source };
    for (const field of config.dates || []) {
      if (row[field] !== null && row[field] !== undefined) row[field] = asDate(row[field]);
    }
    for (const field of config.booleans || []) row[field] = Boolean(row[field]);
    for (const field of config.json || []) {
      if (row[field] === null || row[field] === undefined || row[field] === "") {
        delete row[field];
      } else if (typeof row[field] === "string") {
        row[field] = JSON.parse(row[field]);
      }
    }
    return row;
  });
}

try {
  if (process.argv.includes("--reset")) {
    if (!String(process.env.DATABASE_URL || "").includes("localhost:51214")) {
      throw new Error("--reset is restricted to the managed local PostgreSQL instance");
    }
    const tableNames = tables.map((item) => `"${item.table}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`);
  }
  const existingBusinesses = await prisma.businessProfile.count();
  if (existingBusinesses) throw new Error("PostgreSQL is not empty; refusing to duplicate imported records");

  const imported = {};
  for (const config of tables) {
    const rows = normalizeRows(readTable(config.table), config);
    if (rows.length) await prisma[config.delegate].createMany({ data: rows });
    imported[config.table] = rows.length;
  }

  for (const config of tables.filter((item) => item.table !== "AppSettings")) {
    await prisma.$queryRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${config.table}"', 'id'), COALESCE(MAX("id"), 1), MAX("id") IS NOT NULL) FROM "${config.table}"`,
    );
  }

  console.log(JSON.stringify({ ok: true, source: sqlitePath, imported }));
} finally {
  await prisma.$disconnect();
}
