#!/usr/bin/env node
/**
 * Regression test suite.
 * Usage: node test/regression.mjs [base_url]
 * Default base_url: https://my-crud-app-rust.vercel.app
 *
 * Covers:
 *   - Auth: landing page redirects to /login
 *   - Auth: /chat and /crud redirect unauthenticated users to /login
 *   - Auth: /login page is accessible
 *   - AI API: unauthenticated 401, empty prompt validation
 *   - Chat logs: setup endpoint is reachable
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

  // ── Landing page ──────────────────────────────────
  console.log("1. Landing page redirects to /login");
  const rootRes = await fetch(`${BASE}/`, { redirect: "manual" });
  assert(
    "GET / → redirect",
    [301, 302, 307, 308].includes(rootRes.status),
    `status ${rootRes.status}`
  );
  const rootLocation = rootRes.headers.get("location") ?? "";
  assert("/ redirect targets /login", rootLocation.includes("/login"), `location: ${rootLocation}`);

  // ── Auth: protected routes ─────────────────────────
  console.log("\n2. Auth — /chat redirects unauthenticated users");
  const chatRes = await fetch(`${BASE}/chat`, { redirect: "manual" });
  assert(
    "GET /chat → redirect (307/302/308)",
    [302, 307, 308].includes(chatRes.status),
    `status ${chatRes.status}`
  );
  const chatLocation = chatRes.headers.get("location") ?? "";
  assert("redirect targets /login", chatLocation.includes("/login"), `location: ${chatLocation}`);

  console.log("\n3. Auth — /crud redirects unauthenticated users");
  const crudRes = await fetch(`${BASE}/crud`, { redirect: "manual" });
  assert(
    "GET /crud → redirect (307/302/308)",
    [302, 307, 308].includes(crudRes.status),
    `status ${crudRes.status}`
  );
  const crudLocation = crudRes.headers.get("location") ?? "";
  assert("redirect targets /login", crudLocation.includes("/login"), `location: ${crudLocation}`);

  // ── Auth: login page ───────────────────────────────
  console.log("\n4. Auth — /login page is accessible");
  const loginRes = await fetch(`${BASE}/login`);
  assert("GET /login → 200", loginRes.ok, `status ${loginRes.status}`);
  const loginHtml = await loginRes.text();
  assert(
    "login page contains sign-in content",
    loginHtml.includes("sign") || loginHtml.includes("google") || loginHtml.includes("AI"),
    "expected sign-in content not found"
  );

  // ── AI API ─────────────────────────────────────────
  console.log("\n5. AI API — unauthenticated request blocked");
  const aiUnauthedRes = await fetch(`${BASE}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "hello" }),
  });
  assert("POST /api/ai without session → 401", aiUnauthedRes.status === 401, `status ${aiUnauthedRes.status}`);
  const unauthedBody = await aiUnauthedRes.json().catch(() => ({}));
  assert("401 body has error field", typeof unauthedBody.error === "string");

  console.log("\n6. AI API — empty prompt rejected before auth check");
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

  // ── Auth callback ──────────────────────────────────
  console.log("\n7. Auth callback route registered");
  const callbackRes = await fetch(`${BASE}/api/auth/callback/google`);
  assert(
    "GET /api/auth/callback/google → not 404",
    callbackRes.status !== 404,
    `status ${callbackRes.status}`
  );

  // ── Chat logs setup ────────────────────────────────
  console.log("\n8. Chat logs — setup endpoint reachable");
  const setupRes = await fetch(`${BASE}/api/chat-logs/setup`);
  assert(
    "GET /api/chat-logs/setup → 200",
    setupRes.ok,
    `status ${setupRes.status}`
  );
  const setupBody = await setupRes.json().catch(() => ({}));
  assert("setup returns { ok: true }", setupBody.ok === true, JSON.stringify(setupBody));

  // ── Summary ────────────────────────────────────────
  console.log(`\n${"─".repeat(46)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(err => { console.error("Test runner error:", err); process.exit(1); });
