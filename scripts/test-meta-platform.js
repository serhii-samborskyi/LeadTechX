import assert from "node:assert/strict";

import {
  mergeMetaQualification,
  metaAttributionFromEvent,
  metaPrivateReplyRequest,
  normalizeMetaAiResult,
} from "../meta-platform.js";

const facebookReply = metaPrivateReplyRequest({
  channel: "messenger",
  pageId: "page-123",
  commentId: "comment-456",
  text: "How soon do you need service?",
});
assert.deepEqual(facebookReply, {
  path: "page-123/messages",
  body: {
    recipient: { comment_id: "comment-456" },
    message: { text: "How soon do you need service?" },
  },
});

const instagramReply = metaPrivateReplyRequest({
  channel: "instagram",
  pageId: "page-123",
  commentId: "comment-456",
  text: "What city are you in?",
});
assert.deepEqual(instagramReply, {
  path: "comment-456/private_replies",
  body: { message: "What city are you in?" },
});

const paidAttribution = metaAttributionFromEvent({
  connection: { pageId: "page-123" },
  entry: { id: "page-123" },
  channel: "messenger",
  eventType: "message",
  payload: {
    referral: {
      source: "ADS",
      type: "OPEN_THREAD",
      ad_id: "ad-789",
      ref: "fall-locksmith-offer",
      ads_context_data: { ad_title: "Emergency locksmith", post_id: "post-555" },
    },
  },
});
assert.equal(paidAttribution.trafficType, "paid");
assert.equal(paidAttribution.adId, "ad-789");
assert.equal(paidAttribution.postId, "post-555");
assert.equal(paidAttribution.referralCode, "fall-locksmith-offer");

const commentAttribution = metaAttributionFromEvent({
  connection: { pageId: "page-123" },
  entry: { id: "page-123" },
  channel: "messenger",
  eventType: "comment",
  payload: {
    comment_id: "comment-456",
    post_id: "post-555",
    from: { id: "person-1", name: "Dora Robinson" },
  },
});
assert.equal(commentAttribution.trafficType, "post_unknown");
assert.equal(commentAttribution.commentId, "comment-456");
assert.equal(commentAttribution.personName, "Dora Robinson");

const mergedQualification = mergeMetaQualification(
  { urgency: "urgent", intent: "high", isQualified: true, serviceNeed: "Car lockout" },
  { urgency: "unknown", intent: "unknown", isQualified: false, location: "Chicago" },
);
assert.deepEqual(mergedQualification, {
  urgency: "urgent",
  intent: "high",
  isQualified: true,
  serviceNeed: "Car lockout",
  location: "Chicago",
});

assert.deepEqual(normalizeMetaAiResult("Hello"), { reply: "Hello", qualification: {} });
assert.deepEqual(normalizeMetaAiResult({ reply: "Hi", qualification: { intent: "high" } }), {
  reply: "Hi",
  qualification: { intent: "high" },
});

console.log("Meta platform checks passed");
