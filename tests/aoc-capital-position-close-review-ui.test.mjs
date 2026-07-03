// ─── AOC Capital Governed Paper Close Position Review (PR #17) — UI Copy &
// Safety Static Source Checks ───────────────────────────────────────────────
// Mirrors the static-source-check pattern used across this suite (e.g.
// tests/aoc-capital-draft-cancel-safety.test.mjs, tests/aoc-capital-position-
// detail-ui.test.mjs) — checks the content module, button component, and
// page source for required copy and forbidden execution language, without
// rendering the React server component.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const contentTs = fs.readFileSync("src/lib/capital/position-detail-content.ts", "utf8");
const pageTsx = fs.readFileSync("src/app/(protected)/capital/positions/[id]/page.tsx", "utf8");
const buttonTsx = fs.readFileSync("src/app/(protected)/capital/positions/[id]/request-paper-close-review-button.tsx", "utf8");

const {
  CLOSE_REVIEW_CTA_LABEL,
  CLOSE_REVIEW_HELP_TEXT,
  CLOSE_REVIEW_CONFIRM_TITLE,
  CLOSE_REVIEW_CONFIRM_BODY_1,
  CLOSE_REVIEW_CONFIRM_BODY_2,
  CLOSE_REVIEW_CONFIRM_WILL_NOT_ITEMS,
  CLOSE_REVIEW_CONFIRM_BUTTON,
  CLOSE_REVIEW_KEEP_OPEN_BUTTON,
  CLOSE_REVIEW_SUCCESS_NOTE,
  CLOSE_REVIEW_CLOSED_NOTE,
  CLOSE_REVIEW_MISSING_VALUATION_NOTE,
  SECTION_TITLES,
} = await import("../src/lib/capital/position-detail-content.ts");

// ─── Required copy ───────────────────────────────────────────────────────────

test("the close review section title is Governed Paper Close Review", () => {
  assert.equal(SECTION_TITLES.closeReview, "Governed Paper Close Review");
});

test("the CTA label is exactly Request Paper Close Review", () => {
  assert.equal(CLOSE_REVIEW_CTA_LABEL, "Request Paper Close Review");
});

test("the CTA help text explains governed close review, latest stored valuation, and no real order", () => {
  assert.match(CLOSE_REVIEW_HELP_TEXT, /governed close review/i);
  assert.match(CLOSE_REVIEW_HELP_TEXT, /latest stored paper valuation/i);
  assert.match(CLOSE_REVIEW_HELP_TEXT, /no real order will be placed/i);
});

test("confirmation copy matches the approved product copy", () => {
  assert.equal(CLOSE_REVIEW_CONFIRM_TITLE, "Request paper close review?");
  assert.match(CLOSE_REVIEW_CONFIRM_BODY_1, /governed close review/i);
  assert.match(CLOSE_REVIEW_CONFIRM_BODY_2, /latest stored paper valuation/i);
  assert.match(CLOSE_REVIEW_CONFIRM_BODY_2, /realized simulated P&L/i);
});

test("confirmation copy states what the review will not do: no real order, no broker, no live trade, no withdrawals/deposits, real execution stays locked", () => {
  const items = CLOSE_REVIEW_CONFIRM_WILL_NOT_ITEMS.join(" | ");
  assert.match(items, /place a real order/i);
  assert.match(items, /connect to a broker/i);
  assert.match(items, /route a live trade/i);
  assert.match(items, /withdraw or deposit funds/i);
  assert.match(items, /enable real execution/i);
});

test("confirmation buttons are Confirm Paper Close and Keep Position Open", () => {
  assert.equal(CLOSE_REVIEW_CONFIRM_BUTTON, "Confirm Paper Close");
  assert.equal(CLOSE_REVIEW_KEEP_OPEN_BUTTON, "Keep Position Open");
});

test("success copy states the position closed through governed paper close review and real execution remained locked", () => {
  assert.match(CLOSE_REVIEW_SUCCESS_NOTE, /governed paper close review/i);
  assert.match(CLOSE_REVIEW_SUCCESS_NOTE, /real execution remained locked/i);
});

test("closed-position copy states the position is historical and cannot be closed again", () => {
  assert.match(CLOSE_REVIEW_CLOSED_NOTE, /historical simulated record/i);
  assert.match(CLOSE_REVIEW_CLOSED_NOTE, /cannot be closed again/i);
});

test("missing-valuation copy explains stored valuation is required before close review", () => {
  assert.equal(CLOSE_REVIEW_MISSING_VALUATION_NOTE, "Stored valuation is required before paper close review.");
});

// ─── Page wiring ─────────────────────────────────────────────────────────────

test("the position detail page renders the SECTION_TITLES.closeReview section", () => {
  assert.match(pageTsx, /SECTION_TITLES\.closeReview/);
});

test("the page imports RequestPaperCloseReviewButton and passes the position id", () => {
  assert.match(pageTsx, /import \{ RequestPaperCloseReviewButton \} from "\.\/request-paper-close-review-button";/);
  assert.match(pageTsx, /<RequestPaperCloseReviewButton positionId=\{position\.id\} \/>/);
});

test("the CTA only renders in code logic when the position is open and eligible (not for closed positions)", () => {
  const sectionMatch = pageTsx.match(/\{\/\* Governed Paper Close Review \*\/\}[\s\S]*?<\/SectionCard>/);
  assert.ok(sectionMatch, "expected to find the Governed Paper Close Review section block");
  const block = sectionMatch[0];
  assert.match(block, /position\.status === "closed"/);
  assert.match(block, /closeReviewEligibility\.eligible/);
  const closedBranchIndex = block.indexOf('position.status === "closed"');
  const ctaIndex = block.indexOf("<RequestPaperCloseReviewButton");
  const eligibleBranchIndex = block.indexOf("closeReviewEligibility.eligible");
  assert.ok(closedBranchIndex < eligibleBranchIndex && eligibleBranchIndex < ctaIndex, "the CTA must be nested after the closed and eligibility checks, not unconditional");
});

test("the page shows the closed-position and missing-valuation notices", () => {
  assert.match(pageTsx, /CLOSE_REVIEW_CLOSED_NOTE/);
  assert.match(pageTsx, /CLOSE_REVIEW_MISSING_VALUATION_NOTE/);
});

// ─── Button component ────────────────────────────────────────────────────────

test("the button POSTs to /api/capital/positions/{id}/request-close-review with no request body", () => {
  const fetchIndex = buttonTsx.indexOf("fetch(`/api/capital/positions/${positionId}/request-close-review`");
  assert.ok(fetchIndex >= 0);
  const fetchCall = buttonTsx.slice(fetchIndex, fetchIndex + 200);
  assert.doesNotMatch(fetchCall, /body:/);
});

test("the button requires an explicit second confirmation step before it POSTs (a user-confirmed action, not a single click)", () => {
  assert.match(buttonTsx, /confirming/);
  assert.match(buttonTsx, /CLOSE_REVIEW_KEEP_OPEN_BUTTON/);
  assert.match(buttonTsx, /CLOSE_REVIEW_CONFIRM_TITLE/);
});

// ─── Forbidden execution language ───────────────────────────────────────────

const FORBIDDEN_EXECUTION_COPY =
  /Sell [Nn]ow|Trade [Nn]ow|Place [Oo]rder|\bExecute\b|Send to [Bb]roker|Connect [Ee]xchange|Fund [Aa]ccount|\bWithdraw\b|\bDeposit\b|Live [Tt]rade|Real [Tt]rade/;

test("the close review content module never uses forbidden execution language", () => {
  assert.doesNotMatch(contentTs, FORBIDDEN_EXECUTION_COPY);
});

test("the position detail page never uses forbidden execution language", () => {
  assert.doesNotMatch(pageTsx, FORBIDDEN_EXECUTION_COPY);
});

test("the close review button never uses forbidden execution language", () => {
  assert.doesNotMatch(buttonTsx, FORBIDDEN_EXECUTION_COPY);
});

test("the close review content module never uses the literal phrase 'Close Position'", () => {
  assert.doesNotMatch(contentTs, /Close [Pp]osition/);
});

test("the close review button never uses the literal phrase 'Close Position'", () => {
  assert.doesNotMatch(buttonTsx, /Close [Pp]osition/);
});
