import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const baselineMigration = "20260722000000_baseline";

function runPrisma(args) {
  const result = spawnSync("npx", ["prisma", ...args], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function shouldBaselineExistingDatabase() {
  if (process.env.AUTO_BASELINE_EXISTING_DB === "0") {
    return false;
  }

  const prisma = new PrismaClient();
  try {
    const [state] = await prisma.$queryRaw`
      SELECT
        to_regclass('public."BusinessProfile"') IS NOT NULL AS "hasAppSchema",
        to_regclass('public."_prisma_migrations"') IS NOT NULL AS "hasMigrationTable"
    `;

    if (!state?.hasAppSchema) {
      return false;
    }

    if (!state.hasMigrationTable) {
      return true;
    }

    const [migrationState] = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS "migrationCount",
        COUNT(*) FILTER (WHERE migration_name = ${baselineMigration})::int AS "baselineCount"
      FROM "_prisma_migrations"
    `;

    return migrationState?.migrationCount === 0 && migrationState?.baselineCount === 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (await shouldBaselineExistingDatabase()) {
  console.log(`[db] Existing RingPort schema found without Prisma migration history; marking ${baselineMigration} as applied.`);
  runPrisma(["migrate", "resolve", "--applied", baselineMigration]);
}

runPrisma(["migrate", "deploy"]);
