import crypto from "node:crypto";

const OAUTH_TTL_MINUTES = 20;
const META_SCOPES = [
  "business_management",
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
  "pages_manage_metadata",
  "pages_manage_engagement",
  "pages_messaging",
  "instagram_basic",
  "instagram_manage_messages",
  "instagram_manage_comments",
];

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function tokenHash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function normalizedGraphVersion(value) {
  const version = String(value || "v24.0").trim();
  return /^v\d+\.\d+$/.test(version) ? version : "v24.0";
}

function cleanBaseUrl(value) {
  const baseUrl = String(value || "").trim().replace(/\/+$/, "");
  if (!/^https:\/\//i.test(baseUrl)) throw new Error("A public HTTPS base URL is required for Meta");
  return baseUrl;
}

async function responseBody(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { text: text.slice(0, 2000) };
  }
}

async function graphRequest(config, path, { method = "GET", accessToken = "", params = {}, body = null } = {}) {
  const url = new URL(`https://graph.facebook.com/${config.version}/${String(path).replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const headers = { Accept: "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (body !== null) headers["Content-Type"] = "application/json";
  const response = await fetch(url, {
    method,
    headers,
    body: body === null ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await responseBody(response);
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || data.message || `Meta Graph API failed with HTTP ${response.status}`);
  }
  return data;
}

function pageSummary(page) {
  return {
    id: String(page.id || ""),
    name: String(page.name || "Facebook Page"),
    tasks: Array.isArray(page.tasks) ? page.tasks : [],
    instagramBusinessId: String(page.instagram_business_account?.id || "") || null,
    instagramUsername: String(page.instagram_business_account?.username || page.instagram_business_account?.name || "") || null,
  };
}

function selectorPage({ state, pages, businessName }) {
  const cards = pages
    .map(
      (page) => `
        <label class="page-card">
          <input type="radio" name="pageId" value="${htmlEscape(page.id)}" required />
          <span><strong>${htmlEscape(page.name)}</strong><small>${page.instagramUsername ? `Instagram @${htmlEscape(page.instagramUsername)}` : "No connected professional Instagram account"}</small></span>
        </label>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect Meta | RingPort</title>
    <style>body{margin:0;background:#f3f8f5;color:#10251f;font:16px/1.5 system-ui,sans-serif}.shell{width:min(680px,calc(100% - 32px));margin:48px auto;background:#fff;border:1px solid #d9e7df;border-radius:18px;padding:28px}h1{margin:0 0 8px}.sub{color:#607068;margin:0 0 24px}.page-card{display:flex;gap:14px;align-items:center;padding:16px;border:1px solid #d9e7df;border-radius:12px;margin:10px 0;cursor:pointer}.page-card:has(input:checked){border-color:#16705a;background:#eef8f3}.page-card span{display:grid}.page-card small{color:#607068}.actions{display:flex;justify-content:flex-end;margin-top:22px}button{border:0;border-radius:10px;background:#16705a;color:#fff;font-weight:700;padding:12px 18px;cursor:pointer}</style></head>
    <body><main class="shell"><h1>Choose a business Page</h1><p class="sub">Connect a Page to ${htmlEscape(businessName)}. RingPort will also connect its professional Instagram account when available.</p>
    <form method="post" action="/api/meta/oauth/complete"><input type="hidden" name="state" value="${htmlEscape(state)}">${cards}<div class="actions"><button type="submit">Connect selected Page</button></div></form></main></body></html>`;
}

function completionPage({ title, message, success }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(title)} | RingPort</title>
    <style>body{margin:0;background:#f3f8f5;color:#10251f;font:16px/1.5 system-ui,sans-serif}.card{width:min(600px,calc(100% - 32px));margin:64px auto;background:#fff;border:1px solid #d9e7df;border-radius:18px;padding:30px}.mark{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:${success ? "#def5e9" : "#fff0e8"};color:${success ? "#16705a" : "#a64022"};font-size:24px;font-weight:800}h1{margin:16px 0 8px}.message{color:#607068}a{display:inline-block;margin-top:18px;color:#fff;background:#16705a;border-radius:10px;padding:11px 16px;text-decoration:none;font-weight:700}</style></head>
    <body><main class="card"><div class="mark">${success ? "✓" : "!"}</div><h1>${htmlEscape(title)}</h1><p class="message">${htmlEscape(message)}</p><a href="/?open=settings&tab=channels">Return to RingPort</a></main></body></html>`;
}

function publicConnection(connection) {
  return {
    id: connection.id,
    pageId: connection.pageId,
    pageName: connection.pageName,
    instagramBusinessId: connection.instagramBusinessId,
    instagramUsername: connection.instagramUsername,
    status: connection.status,
    webhookSubscribed: connection.webhookSubscribed,
    connectedAt: connection.connectedAt,
    lastWebhookAt: connection.lastWebhookAt,
    lastError: connection.lastError,
  };
}

function verifyWebhookSignature(rawBody, signatureHeader, appSecret) {
  const supplied = String(signatureHeader || "");
  if (!supplied.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody || Buffer.alloc(0)).digest("hex")}`;
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function messageIdForEvent(channel, entry, event, fallbackPrefix = "event") {
  return String(
    event?.message?.mid ||
      event?.delivery?.mids?.[0] ||
      `${fallbackPrefix}:${entry?.id || "unknown"}:${event?.sender?.id || "unknown"}:${event?.timestamp || Date.now()}`,
  );
}

export function registerMetaPlatform({
  app,
  prisma,
  requireAuth,
  adminContext,
  getSettings,
  systemSecret,
  encryptSecret,
  decryptSecret,
  configuredPublicBaseUrl,
  safeBackground,
  jsonSafe,
  createAiReply,
}) {
  async function config({ requireSecret = true, requireVerifyToken = false } = {}) {
    const settings = await getSettings();
    const appId = String(settings.metaAppId || process.env.META_APP_ID || "").trim();
    const loginConfigurationId = String(
      settings.metaLoginConfigurationId || process.env.META_LOGIN_CONFIGURATION_ID || "",
    ).trim();
    const appSecret = await systemSecret("meta_app_secret", "META_APP_SECRET");
    const verifyToken = await systemSecret("meta_webhook_verify_token", "META_WEBHOOK_VERIFY_TOKEN");
    const baseUrl = cleanBaseUrl(configuredPublicBaseUrl(settings));
    if (!settings.metaMessagingEnabled) throw new Error("Meta business messaging is disabled by the RingPort administrator");
    if (!appId) throw new Error("Meta App ID is not configured");
    if (requireSecret && !appSecret) throw new Error("Meta App Secret is not configured");
    if (requireVerifyToken && !verifyToken) throw new Error("Meta webhook verify token is not configured");
    return {
      settings,
      appId,
      loginConfigurationId,
      appSecret,
      verifyToken,
      version: normalizedGraphVersion(settings.metaGraphApiVersion || process.env.META_GRAPH_API_VERSION),
      baseUrl,
      callbackUrl: `${baseUrl}/api/meta/oauth/callback`,
      webhookUrl: `${baseUrl}/webhooks/meta`,
    };
  }

  async function pageAccounts(metaConfig, accessToken) {
    const data = await graphRequest(metaConfig, "me/accounts", {
      accessToken,
      params: {
        fields: "id,name,access_token,tasks,instagram_business_account{id,username,name}",
        limit: 100,
      },
    });
    return Array.isArray(data.data) ? data.data : [];
  }

  async function subscribeConnection(metaConfig, connection, pageToken) {
    const errors = [];
    let pageSubscribed = false;
    let instagramSubscribed = !connection.instagramBusinessId;
    try {
      await graphRequest(metaConfig, `${connection.pageId}/subscribed_apps`, {
        method: "POST",
        accessToken: pageToken,
        body: { subscribed_fields: "messages,messaging_postbacks,message_deliveries,messaging_referrals,feed" },
      });
      pageSubscribed = true;
    } catch (error) {
      errors.push(`Facebook Page: ${error.message}`);
    }
    if (connection.instagramBusinessId) {
      try {
        await graphRequest(metaConfig, `${connection.instagramBusinessId}/subscribed_apps`, {
          method: "POST",
          accessToken: pageToken,
          body: { subscribed_fields: "messages,messaging_postbacks,message_reactions,messaging_seen,comments" },
        });
        instagramSubscribed = true;
      } catch (error) {
        errors.push(`Instagram: ${error.message}`);
      }
    }
    return { subscribed: pageSubscribed && instagramSubscribed, errors };
  }

  app.get("/webhooks/meta", async (req, res) => {
    try {
      const metaConfig = await config({ requireSecret: false, requireVerifyToken: true });
      const mode = String(req.query["hub.mode"] || "");
      const token = String(req.query["hub.verify_token"] || "");
      const challenge = String(req.query["hub.challenge"] || "");
      if (mode === "subscribe" && token === metaConfig.verifyToken) return res.status(200).send(challenge);
      return res.sendStatus(403);
    } catch (error) {
      return res.status(503).json({ error: error.message });
    }
  });

  async function persistInbound({ connection, channel, eventType, externalUserId, externalMessageId, text, raw }) {
    if (externalMessageId) {
      const existing = await prisma.metaMessage.findUnique({
        where: { channel_externalMessageId: { channel, externalMessageId } },
      });
      if (existing) return { message: existing, duplicate: true };
    }
    const message = await prisma.metaMessage.create({
      data: {
        businessProfileId: connection.businessProfileId,
        connectionId: connection.id,
        channel,
        direction: "inbound",
        eventType,
        externalUserId: externalUserId || null,
        externalMessageId: externalMessageId || null,
        text: text || null,
        raw: jsonSafe(raw),
      },
    });
    return { message, duplicate: false };
  }

  async function recentConversation(connectionId, externalUserId) {
    if (!externalUserId) return [];
    const messages = await prisma.metaMessage.findMany({
      where: { connectionId, externalUserId, eventType: "message" },
      orderBy: { createdAt: "desc" },
      take: 16,
    });
    return messages.reverse().map((message) => ({ direction: message.direction, text: message.text || "" }));
  }

  async function ensureMetaLead({ connection, channel, externalUserId, text, eventType }) {
    if (!externalUserId) return null;
    const source = `meta_${channel}`;
    const existing = await prisma.lead.findFirst({
      where: {
        businessProfileId: connection.businessProfileId,
        source,
        extractedFields: { path: ["externalUserId"], equals: externalUserId },
      },
      orderBy: { createdAt: "desc" },
    });
    const detail = String(text || "").trim().slice(0, 2000);
    if (existing) {
      return prisma.lead.update({
        where: { id: existing.id },
        data: {
          need: detail || existing.need,
          summary: detail ? `Latest ${eventType === "comment" ? "comment" : "message"}: ${detail}` : existing.summary,
          status: existing.status === "new" ? "new" : "needs_reply",
        },
      });
    }
    const channelName = channel === "instagram" ? "Instagram" : "Facebook";
    return prisma.lead.create({
      data: {
        businessProfileId: connection.businessProfileId,
        businessName: connection.pageName,
        name: `${channelName} customer`,
        need: detail || `${channelName} conversation`,
        summary: detail ? `New ${eventType === "comment" ? "comment" : "message"}: ${detail}` : `New ${channelName} conversation`,
        status: "new",
        source,
        extractedFields: jsonSafe({ externalUserId, pageId: connection.pageId, channel, eventType }),
      },
    });
  }

  async function sendDirectReply({ metaConfig, connection, channel, externalUserId, text }) {
    const accessToken = decryptSecret(connection.pageAccessTokenEncrypted);
    const senderId = channel === "instagram" ? connection.instagramBusinessId : connection.pageId;
    if (!senderId) throw new Error(`No ${channel} sender is connected`);
    const body = {
      recipient: { id: externalUserId },
      message: { text: String(text).slice(0, 1800) },
    };
    if (channel === "messenger") body.messaging_type = "RESPONSE";
    return graphRequest(metaConfig, `${senderId}/messages`, {
      method: "POST",
      accessToken,
      body,
    });
  }

  async function handleDirectMessage(metaConfig, connection, entry, event) {
    if (!event?.message || event.message.is_echo || !event.message.text) return;
    const channel = String(entry.id) === String(connection.instagramBusinessId) ? "instagram" : "messenger";
    const externalUserId = String(event.sender?.id || "");
    if (!externalUserId) return;
    const externalMessageId = messageIdForEvent(channel, entry, event, "message");
    const stored = await persistInbound({
      connection,
      channel,
      eventType: "message",
      externalUserId,
      externalMessageId,
      text: event.message.text,
      raw: event,
    });
    if (stored.duplicate) return;
    await ensureMetaLead({ connection, channel, externalUserId, text: event.message.text, eventType: "message" });
    try {
      const history = await recentConversation(connection.id, externalUserId);
      const reply = await createAiReply({ connection, channel, externalUserId, text: event.message.text, eventType: "message", history });
      if (!reply) throw new Error("The AI did not produce a reply");
      const sent = await sendDirectReply({ metaConfig, connection, channel, externalUserId, text: reply });
      await prisma.metaMessage.create({
        data: {
          businessProfileId: connection.businessProfileId,
          connectionId: connection.id,
          channel,
          direction: "outbound",
          eventType: "message",
          externalUserId,
          externalMessageId: String(sent.message_id || sent.recipient_id || crypto.randomUUID()),
          text: reply,
          status: "sent",
          raw: jsonSafe(sent),
        },
      });
      await prisma.metaMessage.update({ where: { id: stored.message.id }, data: { status: "replied" } });
    } catch (error) {
      await prisma.metaMessage.update({ where: { id: stored.message.id }, data: { status: "failed", error: error.message } });
      await prisma.metaConnection.update({ where: { id: connection.id }, data: { lastError: error.message } });
    }
  }

  async function handleComment(metaConfig, connection, entry, change) {
    const value = change?.value || {};
    const isInstagram = change?.field === "comments" || String(entry.id) === String(connection.instagramBusinessId);
    const commentId = String(value.id || value.comment_id || "");
    const text = String(value.text || value.message || "").trim();
    const externalUserId = String(value.from?.id || value.from?.username || "");
    if (!commentId || !text || value.verb === "remove" || (change?.field === "feed" && value.item !== "comment")) return;
    const channel = isInstagram ? "instagram" : "messenger";
    const stored = await persistInbound({
      connection,
      channel,
      eventType: "comment",
      externalUserId,
      externalMessageId: `comment:${commentId}`,
      text,
      raw: change,
    });
    if (stored.duplicate) return;
    await ensureMetaLead({ connection, channel, externalUserId, text, eventType: "comment" });
    try {
      const reply = await createAiReply({ connection, channel, externalUserId, text, eventType: "comment", history: [] });
      if (!reply) throw new Error("The AI did not produce a private reply");
      const accessToken = decryptSecret(connection.pageAccessTokenEncrypted);
      const sent = await graphRequest(metaConfig, `${commentId}/private_replies`, {
        method: "POST",
        accessToken,
        body: { message: String(reply).slice(0, 900) },
      });
      await prisma.metaMessage.create({
        data: {
          businessProfileId: connection.businessProfileId,
          connectionId: connection.id,
          channel,
          direction: "outbound",
          eventType: "private_reply",
          externalUserId: externalUserId || null,
          externalMessageId: String(sent.id || sent.message_id || `private:${commentId}`),
          text: reply,
          status: "sent",
          raw: jsonSafe(sent),
        },
      });
      await prisma.metaMessage.update({ where: { id: stored.message.id }, data: { status: "replied" } });
    } catch (error) {
      await prisma.metaMessage.update({ where: { id: stored.message.id }, data: { status: "failed", error: error.message } });
    }
  }

  async function processWebhook(payload) {
    const metaConfig = await config({ requireSecret: true });
    for (const entry of payload.entry || []) {
      const connection = await prisma.metaConnection.findFirst({
        where: {
          status: "active",
          OR: [{ pageId: String(entry.id || "") }, { instagramBusinessId: String(entry.id || "") }],
        },
      });
      if (!connection) continue;
      await prisma.metaConnection.update({ where: { id: connection.id }, data: { lastWebhookAt: new Date(), lastError: null } });
      for (const event of entry.messaging || []) await handleDirectMessage(metaConfig, connection, entry, event);
      for (const change of entry.changes || []) {
        if (change?.field === "feed" || change?.field === "comments") await handleComment(metaConfig, connection, entry, change);
      }
    }
  }

  app.post("/webhooks/meta", async (req, res) => {
    try {
      const metaConfig = await config({ requireSecret: true });
      if (!verifyWebhookSignature(req.rawBody, req.headers["x-hub-signature-256"], metaConfig.appSecret)) return res.sendStatus(401);
      res.sendStatus(200);
      safeBackground("Meta webhook", () => processWebhook(req.body || {}));
    } catch (error) {
      res.status(503).json({ error: error.message });
    }
  });

  app.get("/api/meta/oauth/callback", requireAuth, async (req, res) => {
    try {
      const state = String(req.query.state || "");
      const code = String(req.query.code || "");
      if (!state || !code) throw new Error(String(req.query.error_description || "Meta authorization was cancelled"));
      const session = await prisma.metaOAuthSession.findUnique({ where: { stateHash: tokenHash(state) }, include: { businessProfile: true } });
      if (!session || session.expiresAt <= new Date() || session.usedAt || session.userId !== req.user.id) throw new Error("This Meta connection link has expired");
      const metaConfig = await config({ requireSecret: true });
      const tokenData = await graphRequest(metaConfig, "oauth/access_token", {
        params: {
          client_id: metaConfig.appId,
          client_secret: metaConfig.appSecret,
          redirect_uri: metaConfig.callbackUrl,
          code,
        },
      });
      let userToken = String(tokenData.access_token || "");
      const longLived = await graphRequest(metaConfig, "oauth/access_token", {
        params: {
          grant_type: "fb_exchange_token",
          client_id: metaConfig.appId,
          client_secret: metaConfig.appSecret,
          fb_exchange_token: userToken,
        },
      }).catch(() => null);
      if (longLived?.access_token) userToken = String(longLived.access_token);
      const pages = await pageAccounts(metaConfig, userToken);
      if (!pages.length) throw new Error("No Facebook Pages were available for this account");
      await prisma.metaOAuthSession.update({
        where: { id: session.id },
        data: {
          userAccessTokenEncrypted: encryptSecret(userToken),
          availablePages: pages.map(pageSummary),
        },
      });
      res.status(200).send(selectorPage({ state, pages: pages.map(pageSummary), businessName: session.businessProfile.businessName }));
    } catch (error) {
      res.status(400).send(completionPage({ title: "Could not connect Meta", message: error.message, success: false }));
    }
  });

  app.post("/api/meta/oauth/complete", requireAuth, async (req, res) => {
    try {
      const state = String(req.body.state || "");
      const pageId = String(req.body.pageId || "");
      const session = await prisma.metaOAuthSession.findUnique({ where: { stateHash: tokenHash(state) }, include: { businessProfile: true } });
      if (!session || session.expiresAt <= new Date() || session.usedAt || session.userId !== req.user.id) throw new Error("This Meta connection session has expired");
      if (!session.userAccessTokenEncrypted) throw new Error("Meta authorization is incomplete");
      const metaConfig = await config({ requireSecret: true });
      const userToken = decryptSecret(session.userAccessTokenEncrypted);
      const pages = await pageAccounts(metaConfig, userToken);
      const page = pages.find((item) => String(item.id) === pageId);
      if (!page?.access_token) throw new Error("The selected Page is no longer available");
      const summary = pageSummary(page);
      const connection = await prisma.metaConnection.upsert({
        where: { pageId: summary.id },
        create: {
          businessProfileId: session.businessProfileId,
          pageId: summary.id,
          pageName: summary.name,
          instagramBusinessId: summary.instagramBusinessId,
          instagramUsername: summary.instagramUsername,
          pageAccessTokenEncrypted: encryptSecret(page.access_token),
          pageAccessTokenHint: String(page.access_token).slice(-4),
          permissions: jsonSafe({ scopes: META_SCOPES, tasks: summary.tasks }),
          connectedByUserId: req.user.id,
        },
        update: {
          businessProfileId: session.businessProfileId,
          pageName: summary.name,
          instagramBusinessId: summary.instagramBusinessId,
          instagramUsername: summary.instagramUsername,
          pageAccessTokenEncrypted: encryptSecret(page.access_token),
          pageAccessTokenHint: String(page.access_token).slice(-4),
          permissions: jsonSafe({ scopes: META_SCOPES, tasks: summary.tasks }),
          status: "active",
          connectedByUserId: req.user.id,
          connectedAt: new Date(),
          lastError: null,
        },
      });
      const subscription = await subscribeConnection(metaConfig, connection, page.access_token);
      await prisma.metaConnection.update({
        where: { id: connection.id },
        data: { webhookSubscribed: subscription.subscribed, lastError: subscription.errors.join("; ") || null },
      });
      await prisma.metaOAuthSession.update({
        where: { id: session.id },
        data: { usedAt: new Date(), userAccessTokenEncrypted: null, availablePages: null },
      });
      const message = subscription.subscribed
        ? `${summary.name}${summary.instagramUsername ? ` and @${summary.instagramUsername}` : ""} are connected.`
        : `${summary.name} is connected, but Meta did not enable every webhook subscription: ${subscription.errors.join("; ")}`;
      res.status(200).send(completionPage({ title: "Meta connected", message, success: true }));
    } catch (error) {
      res.status(400).send(completionPage({ title: "Could not finish the connection", message: error.message, success: false }));
    }
  });

  app.get("/api/business-admin/meta", async (req, res) => {
    try {
      const { profile } = await adminContext(req.query.business_name, req.query.website, req.user);
      const metaConfig = await config({ requireSecret: true, requireVerifyToken: true }).catch((error) => ({ error: error.message }));
      const connections = await prisma.metaConnection.findMany({
        where: { businessProfileId: profile.id },
        orderBy: { connectedAt: "desc" },
      });
      const recentMessages = await prisma.metaMessage.findMany({
        where: { businessProfileId: profile.id },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, channel: true, direction: true, eventType: true, text: true, status: true, error: true, createdAt: true },
      });
      res.json({
        configured: !metaConfig.error,
        configurationError: metaConfig.error || "",
        appId: metaConfig.appId || "",
        callbackUrl: metaConfig.callbackUrl || "",
        webhookUrl: metaConfig.webhookUrl || "",
        connections: connections.map(publicConnection),
        recentMessages,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/business-admin/meta/connect", async (req, res) => {
    try {
      const { profile } = await adminContext(req.body.businessName, req.body.website, req.user);
      const metaConfig = await config({ requireSecret: true });
      const state = crypto.randomBytes(32).toString("base64url");
      await prisma.metaOAuthSession.deleteMany({ where: { userId: req.user.id, expiresAt: { lte: new Date() } } });
      await prisma.metaOAuthSession.create({
        data: {
          stateHash: tokenHash(state),
          businessProfileId: profile.id,
          userId: req.user.id,
          expiresAt: new Date(Date.now() + OAUTH_TTL_MINUTES * 60 * 1000),
        },
      });
      const url = new URL(`https://www.facebook.com/${metaConfig.version}/dialog/oauth`);
      url.searchParams.set("client_id", metaConfig.appId);
      url.searchParams.set("redirect_uri", metaConfig.callbackUrl);
      url.searchParams.set("state", state);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("auth_type", "rerequest");
      if (metaConfig.loginConfigurationId) url.searchParams.set("config_id", metaConfig.loginConfigurationId);
      else url.searchParams.set("scope", META_SCOPES.join(","));
      res.json({ url: url.toString() });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/business-admin/meta/:id", async (req, res) => {
    try {
      const { profile } = await adminContext(req.body.businessName, req.body.website, req.user);
      const connection = await prisma.metaConnection.findFirst({
        where: { id: Number(req.params.id), businessProfileId: profile.id },
      });
      if (!connection) throw new Error("Meta connection was not found");
      const metaConfig = await config({ requireSecret: true }).catch(() => null);
      if (metaConfig) {
        const accessToken = decryptSecret(connection.pageAccessTokenEncrypted);
        await graphRequest(metaConfig, `${connection.pageId}/subscribed_apps`, { method: "DELETE", accessToken }).catch(() => null);
        if (connection.instagramBusinessId) {
          await graphRequest(metaConfig, `${connection.instagramBusinessId}/subscribed_apps`, { method: "DELETE", accessToken }).catch(() => null);
        }
      }
      await prisma.metaConnection.delete({ where: { id: connection.id } });
      await prisma.metaOAuthSession.deleteMany({
        where: { businessProfileId: profile.id, OR: [{ usedAt: { not: null } }, { expiresAt: { lte: new Date() } }] },
      });
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
}
