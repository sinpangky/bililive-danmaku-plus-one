"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { scenarioAttemptFailed } = require("./run-browser-e2e.cjs");

test("retries a failed browser scenario exactly at the runner boundary", () => {
  assert.equal(scenarioAttemptFailed({ code: 0, parsed: {}, timedOut: false }), false);
  assert.equal(scenarioAttemptFailed({ code: 1, parsed: {}, timedOut: false }), true);
  assert.equal(scenarioAttemptFailed({ code: 0, parsed: null, timedOut: false }), true);
  assert.equal(scenarioAttemptFailed({ code: 0, parsed: {}, timedOut: true }), true);
});
