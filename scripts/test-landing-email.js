import assert from "node:assert/strict";
import { receiveLandingEmail } from "../public/fastagent/landing-email.js";

function fixture(href, storage = new Map(), now = 1000, blocked = false) {
  const location = new URL(href);
  const replaced = [];
  const result = receiveLandingEmail({
    location, now,
    history: { state: null, replaceState: (...args) => replaced.push(args[2]) },
    sessionStorage: {
      getItem: (key) => { if (blocked) throw Error("blocked"); return storage.get(key) || null; },
      setItem: (key, value) => { if (blocked) throw Error("blocked"); storage.set(key, value); },
      removeItem: (key) => { if (blocked) throw Error("blocked"); storage.delete(key); },
    },
  });
  return { result, replaced, storage };
}

const entry = fixture("https://ai.ringport.app/fastagent/?click_id=101&utm_source=meta#email=Owner%2Btest%40Example.test");
assert.equal(entry.result, "owner+test@example.test");
assert.deepEqual(entry.replaced, ["/fastagent/?click_id=101&utm_source=meta"]);
assert.equal(fixture("https://ai.ringport.app/fastagent/?business_name=Fixture", entry.storage).result, entry.result);
assert.equal(fixture("https://ai.ringport.app/fastagent/?click_id=102", entry.storage).result, "");

const expired = fixture("https://ai.ringport.app/fastagent/#email=owner%40example.test");
assert.equal(fixture("https://ai.ringport.app/fastagent/", expired.storage, 1801001).result, "");
const invalid = fixture("https://ai.ringport.app/fastagent/?owner_email=wrong#email=not-an-email");
assert.equal(invalid.result, "");
assert.deepEqual(invalid.replaced, ["/fastagent/"]);
assert.equal(invalid.storage.size, 0);
for (const alias of ["email", "owner_email", "ownerEmail"]) {
  const legacy = fixture(`https://ai.ringport.app/fastagent/?${alias}=owner%40example.test&plan=starter#details`);
  assert.equal(legacy.result, "owner@example.test");
  assert.deepEqual(legacy.replaced, ["/fastagent/?plan=starter#details"]);
}
assert.equal(fixture("https://ai.ringport.app/fastagent/#email=owner%40example.test", new Map(), 1000, true).result, "owner@example.test");
assert.equal(fixture("https://ai.ringport.app/fastagent/", new Map(), 1000, true).result, "");
assert.equal(fixture("https://ai.ringport.app/fastagent/", new Map([["ringport:landing-email", "broken-json"]])).result, "");
const hash = fixture("https://ai.ringport.app/fastagent/#email=owner%40example.test&section=plans");
assert.deepEqual(hash.replaced, ["/fastagent/#section=plans"]);
console.log("Landing email tests passed: fragment/query prefill, URL cleanup, setup persistence, expiry, new-click reset, invalid data and blocked storage.");
