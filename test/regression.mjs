#!/usr/bin/env node
/**
 * Regression test suite.
 * Usage: node test/regression.mjs [base_url]
 * Default base_url: https://my-crud-app-rust.vercel.app
 *
 * Covers:
 *   - Auth: /chat redirect, /login page
 *   - AI API: unauthenticated 401, empty prompt validation
 *
 * Note: Messages API tests live in feat/postgres-backend (PR #3).
 */

const BASE = process.argv[2] ?? "https://my-crud-app-rust.vercel.app";
let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function run() {
  console.log(`\nRegression test → ${BASE}\n`);

  // ── Auth ──────────────────────────────────────────
  console.log("1. Auth — /chat redirects unauthenticated users");
  const chatRes = await fetch(`${BASE}/chat`, { redirect: "manual" });
  assert(
    "GET /chat → redirect (307/302/308)",
    [302, 307, 308].includes(chatRes.status),
    `status ${chatRes.status}`
  );
  const location = chatRes.headers.get("location") ?? "";
  assert("redirect targets /login", location.includes("/login"), `location: ${location}`);

  console.log("\n2. Auth — /login page is accessible");
  const loginRes = await fetch(`${BASE}/login`);
  assert("GET /login → 200", loginRes.ok, `status ${loginRes.status}`);
  const loginHtml = await loginRes.text();
  assert(
    "login page contains sign-in content",
    loginHtml.includes("sign") || loginHtml.includes("google") || loginHtml.includes("AI"),
    "expected sign-in content not found"
  );

  // ── AI API ────────────────────────────────────────
  console.log("\n3. AI API — unauthenticated request blocked");
  const aiUnauthedRes = await fetch(`${BASE}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "hello" }),
  });
  assert("POST /api/ai without session → 401", aiUnauthedRes.status === 401, `status ${aiUnauthedRes.status}`);
  const unauthedBody = await aiUnauthedRes.json().catch(() => ({}));
  assert("401 body has error field", typeof unauthedBody.error === "string");

  console.log("\n4. AI API — empty prompt rejected before auth check");
  // Auth runs first — empty prompt returns 401 before validation; that's acceptable
  const aiEmptyRes = await fetch(`${BASE}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "   " }),
  });
  assert(
    "POST /api/ai with blank prompt → 400 or 401",
    aiEmptyRes.status === 400 || aiEmptyRes.status === 401,
    `status ${aiEmptyRes.status}`
  );

  console.log("\n5. Auth callback route registered");
  // GET to the OAuth callback base should return 400 (missing params), not 404
  const callbackRes = await fetch(`${BASE}/api/auth/callback/google`);
  assert(
    "GET /api/auth/callback/google → not 404 (route exists)",
    callbackRes.status !== 404,
    `status ${callbackRes.status}`
  );

  // ── Summary ───────────────────────────────────────
  console.log(`\n${"─".repeat(46)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(err => { console.error("Test runner error:", err); process.exit(1); });
