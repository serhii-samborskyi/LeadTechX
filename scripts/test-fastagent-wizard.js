import assert from "node:assert/strict";

import {
  FAST_AGENT_DRAFT_KEY,
  FAST_AGENT_DRAFT_VERSION,
  FAST_AGENT_SENSITIVE_URL_KEYS,
  FAST_AGENT_VISITOR_KEY,
  clampRolloutPercent,
  classifyPlacePrediction,
  createFastAgentDraft,
  fastAgentBuildPayload,
  fastAgentSessionPath,
  fastAgentStorageKey,
  fastAgentVariant,
  firstFastAgentStep,
  normalizeBillingPeriodInput,
  normalizeWebsiteInput,
  parseFastAgentEntry,
  shouldAskServiceArea,
  stableExperimentBucket,
  validateFastAgentDraft,
  validBusinessUrl,
} from "../public/fastagent/wizard-state.js";

function section(name, checks) {
  checks();
  console.log(`[fastagent wizard] ${name}`);
}

section("normalizes websites, business links, and billing periods", () => {
  assert.equal(normalizeWebsiteInput(""), "");
  assert.equal(normalizeWebsiteInput(" example.com/book "), "https://example.com/book");
  assert.equal(normalizeWebsiteInput("http://example.com"), "http://example.com");

  assert.deepEqual(validBusinessUrl("example.com"), { valid: true, value: "https://example.com/" });
  assert.deepEqual(validBusinessUrl("instagram.com/example"), {
    valid: true,
    value: "https://instagram.com/example",
  });
  assert.equal(validBusinessUrl("not a website").valid, false);
  assert.equal(validBusinessUrl("localhost").valid, false);
  assert.equal(validBusinessUrl("https://example.com.").valid, false);

  for (const annual of ["12", "12 month", "12_months", "annual", "annually", "year", "yearly"]) {
    assert.equal(normalizeBillingPeriodInput(annual), 12, `${annual} should select annual billing`);
  }
  for (const monthly of ["", "1", "monthly", "quarterly", null]) {
    assert.equal(normalizeBillingPeriodInput(monthly), 1, `${monthly} should select monthly billing`);
  }
});

section("routes cold, prefilled, token, claim, and short-code entries", () => {
  assert.deepEqual(parseFastAgentEntry(), {
    businessName: "",
    website: "",
    placeId: "",
    serviceArea: "",
    accessToken: "",
    claimToken: "",
    shortCode: "",
    mobileDeviceId: "",
    requestedPlan: "",
    requestedPeriod: 1,
    bypassWizard: false,
  });

  const prefilled = parseFastAgentEntry({
    search:
      "?business_name=WireClean&website=wireclean.example&place_id=place-1&service_area=Chicago&mobileDeviceId=device-1&plan_slug=growth&billingPeriod=annual",
  });
  assert.equal(prefilled.businessName, "WireClean");
  assert.equal(prefilled.website, "https://wireclean.example");
  assert.equal(prefilled.placeId, "place-1");
  assert.equal(prefilled.serviceArea, "Chicago");
  assert.equal(prefilled.mobileDeviceId, "device-1");
  assert.equal(prefilled.requestedPlan, "growth");
  assert.equal(prefilled.requestedPeriod, 12);
  assert.equal(prefilled.bypassWizard, false);

  const token = parseFastAgentEntry({ search: "?token=session-token&access_token=ignored" });
  assert.equal(token.accessToken, "session-token");
  assert.equal(token.bypassWizard, true);

  const accessToken = parseFastAgentEntry({ search: "?access_token=access-token" });
  assert.equal(accessToken.accessToken, "access-token");
  assert.equal(accessToken.bypassWizard, true);

  const claim = parseFastAgentEntry({ search: "?claim_token=claim-token" });
  assert.equal(claim.claimToken, "claim-token");
  assert.equal(claim.bypassWizard, true);

  const shortLink = parseFastAgentEntry({ pathname: "/12345678" });
  assert.equal(shortLink.shortCode, "12345678");
  assert.equal(shortLink.bypassWizard, true);
  assert.equal(parseFastAgentEntry({ pathname: "/1234567" }).bypassWizard, false);
  assert.equal(parseFastAgentEntry({ pathname: "/fastagent/12345678" }).bypassWizard, false);
});

section("keeps successful build URLs reload-safe without exposing contact details", () => {
  assert.equal(fastAgentSessionPath("https://ai.ringport.app/12345678"), "/12345678");
  assert.equal(
    fastAgentSessionPath("https://ai.ringport.app/12345678", { requestedPlan: "growth", requestedPeriod: 12 }),
    "/12345678?plan=growth&period=12",
  );
  assert.equal(fastAgentSessionPath("https://example.com/not-a-session"), "");
  assert.equal(FAST_AGENT_SENSITIVE_URL_KEYS.includes("ownerEmail"), true);
});

section("assigns deterministic experiment variants at 0, 50, and 100 percent", () => {
  assert.equal(clampRolloutPercent(-20), 0);
  assert.equal(clampRolloutPercent(49.6), 50);
  assert.equal(clampRolloutPercent(120), 100);
  assert.equal(clampRolloutPercent("not-a-number", 35), 35);

  assert.equal(stableExperimentBucket("visitor-a"), 75);
  assert.equal(stableExperimentBucket("visitor-c"), 13);
  assert.equal(stableExperimentBucket("fixed-visitor-123"), 27);
  assert.equal(stableExperimentBucket("visitor-a"), stableExperimentBucket("visitor-a"));

  assert.deepEqual(fastAgentVariant("visitor-a", 0), { bucket: 75, variant: "control" });
  assert.deepEqual(fastAgentVariant("visitor-a", 100), { bucket: 75, variant: "wizard" });
  assert.deepEqual(fastAgentVariant("visitor-a", 50), { bucket: 75, variant: "control" });
  assert.deepEqual(fastAgentVariant("visitor-c", 50), { bucket: 13, variant: "wizard" });
});

section("classifies Google predictions without mistaking addresses for businesses", () => {
  assert.equal(classifyPlacePrediction(["establishment", "point_of_interest"]), "business");
  assert.equal(classifyPlacePrediction(["point_of_interest"]), "business");
  assert.equal(classifyPlacePrediction(["street_address"]), "address");
  assert.equal(classifyPlacePrediction(["premise"]), "address");
  assert.equal(classifyPlacePrediction(["route"]), "address");
  assert.equal(classifyPlacePrediction(["locality", "political"]), "place");
  assert.equal(classifyPlacePrediction([]), "place");
  assert.equal(classifyPlacePrediction(null), "place");
  assert.equal(classifyPlacePrediction(["street_address", "establishment"]), "business");
});

section("restores valid drafts and lets explicit URL values win", () => {
  assert.equal(FAST_AGENT_DRAFT_VERSION, 1);
  assert.equal(FAST_AGENT_DRAFT_KEY, "ringport:fastagent:draft:v1");
  assert.equal(FAST_AGENT_VISITOR_KEY, "ringport:fastagent:visitor:v1");

  const saved = {
    version: FAST_AGENT_DRAFT_VERSION,
    step: "website",
    flowId: "flow-123",
    updatedAt: 123456,
    businessName: "Saved Business",
    placeId: "saved-place",
    selectionKind: "business",
    selectedPlace: { businessName: "Saved Business", website: "https://saved.example" },
    selectedAddress: "1 Saved Street",
    addressPlaceId: "saved-address",
    website: "saved.example",
    websiteSource: "typed",
    serviceArea: "Saved Area",
    noWebsite: false,
  };
  const restored = createFastAgentDraft({}, saved);
  assert.equal(restored.step, "website");
  assert.equal(restored.flowId, "flow-123");
  assert.equal(restored.businessName, "Saved Business");
  assert.equal(restored.website, "https://saved.example");
  assert.equal(restored.websiteSource, "typed");
  assert.equal(restored.selectedAddress, "1 Saved Street");

  const overridden = createFastAgentDraft(
    {
      businessName: "URL Business",
      website: "url.example",
      placeId: "url-place",
      serviceArea: "URL Area",
    },
    saved,
  );
  assert.equal(overridden.businessName, "URL Business");
  assert.equal(overridden.website, "https://url.example");
  assert.equal(overridden.websiteSource, "prefilled");
  assert.equal(overridden.placeId, "url-place");
  assert.equal(overridden.selectionKind, "business");
  assert.equal(overridden.selectedPlace, null);
  assert.equal(overridden.selectedAddress, "");
  assert.equal(overridden.addressPlaceId, "");
  assert.equal(overridden.serviceArea, "URL Area");
  assert.equal(overridden.noWebsite, false);

  const stale = createFastAgentDraft({}, { ...saved, version: FAST_AGENT_DRAFT_VERSION + 1 });
  assert.equal(stale.step, "business");
  assert.equal(stale.businessName, "");
  assert.equal(stale.website, "");
  assert.equal(stale.flowId, "");

  const namePrefill = createFastAgentDraft({ businessName: "  Prefilled Business  " });
  assert.equal(namePrefill.businessName, "Prefilled Business");
  assert.equal(namePrefill.selectionKind, "manual");
});

section("chooses the first unanswered wizard step", () => {
  assert.equal(firstFastAgentStep({}), "business");
  assert.equal(firstFastAgentStep({ website: "https://example.com" }), "business");
  assert.equal(firstFastAgentStep({ businessName: "Acme" }), "website");
  assert.equal(firstFastAgentStep({ businessName: "Acme", website: "https://example.com" }), "review");
  assert.equal(firstFastAgentStep({ businessName: "Acme", noWebsite: true }), "review");
});

section("asks for service area only on the manual no-website path", () => {
  assert.equal(shouldAskServiceArea({ noWebsite: true, selectionKind: "manual" }), true);
  assert.equal(shouldAskServiceArea({ noWebsite: false, selectionKind: "manual" }), false);
  assert.equal(shouldAskServiceArea({ noWebsite: true, selectionKind: "business", placeId: "place-1" }), false);
  assert.equal(shouldAskServiceArea({ noWebsite: true, selectionKind: "address_resolved", selectedAddress: "1 Main St" }), false);
  assert.equal(shouldAskServiceArea({ noWebsite: true, selectionKind: "manual", selectedAddress: "1 Main St" }), false);
});

section("validates every build path, including review edits and prefills", () => {
  assert.deepEqual(validateFastAgentDraft({ businessName: "" }), {
    valid: false,
    step: "business",
    field: "businessName",
  });
  assert.deepEqual(validateFastAgentDraft({ businessName: "Acme", website: "not a url" }), {
    valid: false,
    step: "website",
    field: "website",
  });
  assert.deepEqual(validateFastAgentDraft({ businessName: "Acme", noWebsite: true, selectionKind: "manual" }), {
    valid: false,
    step: "website",
    field: "serviceArea",
  });
  assert.deepEqual(
    validateFastAgentDraft({ businessName: " Acme ", website: "acme.example" }),
    { valid: true, businessName: "Acme", website: "https://acme.example/" },
  );
});

section("builds minimal API payloads and stable session storage keys", () => {
  const selectedBusiness = {
    businessName: " WireClean ",
    website: "wireclean.example/book",
    placeId: " place-123 ",
    serviceArea: " Chicago ",
  };
  assert.deepEqual(fastAgentBuildPayload(selectedBusiness, " growth "), {
    businessName: "WireClean",
    website: "https://wireclean.example/book",
    noWebsite: false,
    placeId: "place-123",
    serviceArea: "Chicago",
    plan: "growth",
  });
  assert.deepEqual(
    fastAgentBuildPayload({ businessName: "Control Business", website: "" }, "", { includeWebsiteDecision: false }),
    {
      businessName: "Control Business",
      website: "",
      placeId: "",
      serviceArea: "",
      plan: "",
    },
  );
  assert.equal(fastAgentStorageKey(selectedBusiness), "fastagent:place:place-123");

  const manualNoWebsite = {
    businessName: " New Company ",
    website: "must-not-be-sent.example",
    noWebsite: true,
    serviceArea: " Milwaukee ",
  };
  assert.deepEqual(fastAgentBuildPayload(manualNoWebsite), {
    businessName: "New Company",
    website: "",
    noWebsite: true,
    placeId: "",
    serviceArea: "Milwaukee",
    plan: "",
  });
  assert.equal(fastAgentStorageKey(fastAgentBuildPayload(manualNoWebsite)), "fastagent:new company|");

  assert.equal(
    fastAgentStorageKey({ businessName: "Mixed Case LLC", website: "HTTPS://Example.COM/Book" }),
    "fastagent:mixed case llc|https://example.com/book",
  );
  assert.equal(fastAgentStorageKey({}), "");

  assert.equal(
    fastAgentBuildPayload({ selectedAddress: "500 Address Lane" }).serviceArea,
    "500 Address Lane",
  );
});

console.log("Fast Agent wizard checks passed");
