# RingPort

RingPort is a real-time phone and browser receptionist platform backed by a live voice provider, Prisma, and PostgreSQL.

## Run

```bash
./install.sh
./restart.sh 3000
```

Open:

```text
http://localhost:3000/
```

Create an instant researched trial agent:

```text
http://localhost:3000/fastagent/?business_name=Chicago%20Locksmiths&website=https%3A%2F%2Fwww.chicagolocksmiths.net
```

The business portal requires a business account created by an administrator.

Open the system administration panel at:

```text
http://localhost:3000/admin.html
```

The initial administrator is created from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Use the admin panel to configure AI models and encrypted API credentials, then create business logins. Each business login is restricted to its assigned profile and records.

## What It Does

- Researches the business using the configured AI research provider.
- Caches the structured business profile and generated system prompt in PostgreSQL.
- Starts a server-side WebSocket bridge to the configured live voice provider.
- Streams browser microphone audio as 16 kHz PCM.
- Plays live voice audio responses as 24 kHz PCM.
- Provides tool calls for appointment requests, lead capture, and transfer/escalation messages.
- Stores demo appointments, leads, and transfer messages in PostgreSQL.
- Provides separate administrator and business portals with database-backed sessions.
- Stores provider credentials encrypted and never returns their values to the browser.
- Lets administrators choose global AI models and businesses configure their own voice, language, knowledge, pricing, and calendar.
- Creates seven-day fast-agent trials with configurable credits, secure email claim links, and immediate browser voice.
- Supports shared Telnyx demo-number pools with per-trial caller-number routing.
- Lets owners edit all researched business information and regenerates the live system prompt when saved.

## RingPort Fast Agent

`/fastagent` accepts `business_name` and optional `website` query parameters. It automatically researches an unclaimed business, creates a trial, and opens the browser-call experience. Businesses with an active trial or account cannot be opened anonymously.

Configure trial length, claim-link validity, token value, starting credits, low-balance threshold, demo-number capacity, caller limits, and SMTP under Admin > System. SMTP credentials are encrypted in PostgreSQL.

Under Admin > Phone numbers, classify one or more Telnyx numbers as `Demo`. A demo number can serve the configured number of concurrent trials. Each trial may bind up to the configured number of caller phone numbers; unknown callers are rejected when no waiting trial can claim them.

## Environment

Create `.env`:

```bash
GEMINI_API_KEY="your-key"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="use-a-long-unique-password"
APP_ENCRYPTION_KEY="use-a-separate-long-random-secret"
DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&pgbouncer=true"
SHADOW_DATABASE_URL="postgres://postgres:postgres@localhost:51215/template1?sslmode=disable&pgbouncer=true"
PORT=3000
```

Provider keys can remain in `.env` or be saved through the admin panel. Database values are encrypted with `APP_ENCRYPTION_KEY`. Do not change that encryption key after saving credentials unless you replace the saved credentials too.

## Docker and Coolify Deployment

Use the `Dockerfile` build pack in Coolify. The image runs Node.js 22 on Debian slim, generates Prisma Client during the Docker build, exposes port `3000`, and includes a `/healthz` health check.

Recommended Coolify settings:

```text
Build pack: Dockerfile
Port: 3000
Health check path: /healthz
```

Set production environment variables in Coolify, not in the repository:

```bash
NODE_ENV=production
PORT=3000
RUN_DB_DEPLOY_ON_START=1
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
SHADOW_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE_shadow"
APP_ENCRYPTION_KEY="use-a-long-random-secret-and-keep-it-stable"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="use-a-long-unique-password"
PUBLIC_BASE_URL="https://YOUR-PUBLIC-DOMAIN"
HTTPS=false
```

Keep `HTTPS=false` inside Coolify unless you intentionally mount certificates into the container. Coolify should terminate public HTTPS at the proxy.

With `RUN_DB_DEPLOY_ON_START=1`, the Docker entrypoint runs the database deployment before starting the app. If you prefer to run schema changes manually, set `RUN_DB_DEPLOY_ON_START=0` and run the database deployment command from the app image or Coolify terminal before starting the app:

```bash
npm run db:deploy
```

That command removes legacy plan-manager columns that were replaced by subscription plans, applies the Prisma schema with `prisma db push --skip-generate`, then runs the current idempotent SQL patches for credit buckets and RingPort branding. Back up the production database before running schema changes on an existing production database.

After deployment, configure external webhooks with the production domain:

```text
Telnyx: https://YOUR-PUBLIC-DOMAIN/webhooks/telnyx
Stripe: https://YOUR-PUBLIC-DOMAIN/webhooks/stripe
BlueBubbles replies: https://YOUR-PUBLIC-DOMAIN/webhooks/bluebubbles?password=YOUR-BLUEBUBBLES-PASSWORD
```

The same URLs are also shown with copy buttons inside the admin System settings when `PUBLIC_BASE_URL` or the saved public base URL is configured.

## Scripts

```bash
./install.sh
```

Installs/checks Node.js 22+, npm, SQLite (for legacy data import), project dependencies, starts the named local Prisma Postgres instance, and initializes the schema. It supports macOS with Homebrew and common Linux package managers: apt, dnf, yum, and pacman.

```bash
npm run db:local
```

Starts the named `live-receptionist` Prisma Postgres instance when `DATABASE_URL` uses the managed local port `51214`. The command is idempotent, and `restart.sh` runs it automatically. It skips local database startup when a production `DATABASE_URL` is configured.

To import the legacy SQLite database once:

```bash
npm run db:migrate-sqlite -- --reset
```

The reset option is restricted to the managed localhost database. The original SQLite file is retained at `prisma/dev.sqlite.backup.db`.

```bash
./restart.sh 3000
```

Stops any process using port `3000`, prepares the database, and starts the app in the foreground.

```bash
./restart.sh 3000 --background
```

Starts the app in the background and writes logs to `logs/app-3000.log` and the PID to `pids/app-3000.pid`.

```bash
npm run test:booking
```

Runs an end-to-end calendar diagnostic: finds a free slot, writes a temporary appointment, verifies it by confirmation code, rejects a duplicate booking, and removes the temporary record.

```bash
npm run test:telnyx
```

Validates the encrypted Telnyx credentials, Ed25519 public key, Voice API application, and owned phone-number status without printing credentials.

```bash
npm run test:onboarding-media
```

Exercises an onboarding-number call through the Telnyx media bridge and verifies that the live voice provider receives caller audio and returns agent audio.

## Telnyx Inbound Calling

Configure the Telnyx Voice API Application with webhook API version V2 and this webhook URL:

```text
https://YOUR-PUBLIC-DOMAIN/webhooks/telnyx
```

The server answers inbound calls with a token-protected bidirectional media stream at `/telnyx-media`, forwards caller audio to the live voice provider, and sends agent audio back to the caller through Telnyx media frames.

### Current Call Flow and Codecs

The phone bridge currently runs in Telnyx bidirectional media-stream mode:

1. Telnyx sends `call.initiated` to `/webhooks/telnyx`.
2. The app looks up the dialed number, resolves the business/onboarding/qualification call context, answers the call, and starts a token-protected WebSocket stream at `/telnyx-media`.
3. Telnyx connects the media socket with inbound RTP media only from the caller leg and accepts outbound RTP media back to the same call leg.
4. The bridge opens the live voice provider with the admin-configured live model. `TELNYX_LIVE_MODEL` is ignored unless `TELNYX_LIVE_MODEL_FORCE=true` is also set.
5. The live voice provider receives caller audio as 16 kHz PCM16 little-endian audio.
6. The live voice provider returns agent audio as 24 kHz PCM16 little-endian audio.
7. The bridge converts agent audio from 24 kHz PCM to the configured Telnyx outbound codec, splits it into 20 ms frames, and paces those frames back to Telnyx.
8. When the live voice provider reports `serverContent.interrupted`, the bridge clears the queued outbound audio and sends Telnyx a `clear` event so caller barge-in can stop agent playback.

Current phone codec settings:

- Telnyx inbound stream: `PCMU`, 8 kHz, mono by default. Set `TELNYX_STREAM_CODEC=L16` and `TELNYX_STREAM_SAMPLE_RATE=16000` to test the previous linear PCM path.
- Telnyx outbound stream: `PCMU`, 8 kHz, mono by default. Set `TELNYX_OUTBOUND_CODEC=L16` and `TELNYX_OUTBOUND_SAMPLE_RATE=16000` to test the previous linear PCM path.
- Telnyx L16 byte order: little-endian by default when L16 is enabled. Set `TELNYX_L16_ENDIAN=BE` only as a rollback/test override.
- Outbound frame size: 20 ms, which is 160 bytes for `PCMU` at 8 kHz or 640 bytes for `L16` at 16 kHz.
- Live voice input from the bridge: PCM16 little-endian at 16 kHz.
- Live voice output to the bridge: PCM16 little-endian at 24 kHz.
- Phone model default: the admin-configured live model, matching the browser call path. Use `TELNYX_LIVE_MODEL_FORCE=true` plus `TELNYX_LIVE_MODEL=...` only for explicit test overrides.
- Normal phone playback does not drop queued audio frames by default, because that cuts words. Barge-in still clears stale queued playback when the caller interrupts. Set `TELNYX_DROP_QUEUED_AUDIO=1` only for latency experiments.
- Bridge audio diagnostics are disabled by default. Set `BRIDGE_AUDIO_CAPTURE=1` for a debug run, and optionally set `BRIDGE_AUDIO_CAPTURE_MS=60000` to capture a longer window. Files are written under `logs/audio-dumps/` and are ignored by git.

The browser call path is separate from Telnyx: the browser streams microphone audio to the app as 16 kHz PCM, the live voice provider returns 24 kHz PCM, and the browser plays it directly through Web Audio. Browser clients also clear queued playback when an interruption is reported.

In `/admin.html`:

1. Save the Telnyx API key, public key, connection ID, and public HTTPS base URL under System.
2. Open Phone numbers and select Sync inventory.
3. Assign the purchased number to a business.

Calls to unassigned numbers are rejected. Number purchases require an explicit confirmation after current Telnyx pricing is displayed.

## Phone Onboarding

Phone onboarding is administered under Admin > Onboarding:

1. Set the caller lookup URL. Use `{{phone}}` where the E.164 caller number belongs, for example `https://crm.example/api/business?phone={{phone}}`. The endpoint must return JSON with `business_name` and optional `website` fields.
2. Edit the onboarding agent instructions and choose whether calls are recorded and transcribed.
3. Configure BlueBubbles or Sent.dm as the primary setup-link provider and optionally select the other as failover.
4. Under Admin > Phone numbers, change a number type to `Onboarding`, enter its campaign label, and select Save.

The onboarding agent looks up or collects business details, texts the captured company name and website to the caller for confirmation, creates the trial agent only after confirmation, and sends a unique password-setup link.

For BlueBubbles, enter the server base URL, password, and the send endpoint used by your server version. The default is `/api/v1/chat/new`.

For Sent.dm, create and approve a message template before enabling the provider. Configure its template ID or name and optional profile ID. The app sends `business_name` and `setup_url` as template parameters.

## LAN Microphone Access

Browsers allow microphone access on `http://localhost`, but not on plain HTTP LAN IPs like `http://10.0.0.211:3000`. Use HTTPS for phone or LAN testing.

```bash
scripts/generate-local-cert.sh 10.0.0.211
./restart.sh 3000 --foreground --https
```

Then open:

```text
https://10.0.0.211:3000/?business_name=Chicago%20Locksmiths&website=https%3A%2F%2Fwww.chicagolocksmiths.net
```

The browser will show a certificate warning because this is a local self-signed certificate. Accept the warning for local demo testing.

Plain HTTP on a LAN IP will not get microphone permission:

```text
http://10.0.0.211:3000
```

For a quick desktop Chrome-only dev workaround, open:

```text
chrome://flags/#unsafely-treat-insecure-origin-as-secure
```

Enable it, add:

```text
http://10.0.0.211:3000
```

Then relaunch Chrome. This is only for local development. Mobile Safari/Chrome generally need trusted HTTPS or a public HTTPS tunnel.
