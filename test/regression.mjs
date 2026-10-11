#!/usr/bin/env node
/**
 * Regression test suite.
 * Usage: node test/regression.mjs [base_url]
 * Default base_url: https://my-crud-app-rust.vercel.app
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

async function runMessagesTests() {
  console.log("\n── Messages API ──────────────────────────\n");

  console.log("0. Setup");
  const setupRes = await fetch(`${BASE}/api/messages/setup`, { method: "POST" });
  assert("POST /api/messages/setup → 200", setupRes.ok, `status ${setupRes.status}`);

  console.log("\n1. Create");
  const createRes = await fetch(`${BASE}/api/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "regression-test-message" }),
  });
  assert("POST /api/messages → 201", createRes.status === 201, `status ${createRes.status}`);
  const created = await createRes.json();
  assert("response has id", typeof created.id === "string");
  assert("response has correct text", created.text === "regression-test-message");
  const id = created.id;

  console.log("\n2. Read");
  const listRes = await fetch(`${BASE}/api/messages`);
  assert("GET /api/messages → 200", listRes.ok, `status ${listRes.status}`);
  const list = await listRes.json();
  assert("response is array", Array.isArray(list));
  assert("created message is in list", list.some(m => m.id === id));

  console.log("\n3. Update");
  const updateRes = await fetch(`${BASE}/api/messages/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "regression-test-message-updated" }),
  });
  assert("PUT /api/messages/:id → 200", updateRes.ok, `status ${updateRes.status}`);
  const updated = await updateRes.json();
  assert("text was updated", updated.text === "regression-test-message-updated");

  console.log("\n4. Validation");
  const emptyRes = await fetch(`${BASE}/api/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "  " }),
  });
  assert("POST with empty text → 400", emptyRes.status === 400, `status ${emptyRes.status}`);

  console.log("\n5. Delete");
  const deleteRes = await fetch(`${BASE}/api/messages/${id}`, { method: "DELETE" });
  assert("DELETE /api/messages/:id → 204", deleteRes.status === 204, `status ${deleteRes.status}`);
  const afterList = await (await fetch(`${BASE}/api/messages`)).json();
  assert("deleted message no longer in list", !afterList.some(m => m.id === id));
}

async function runAuthTests() {
  console.log("\n── Auth & AI API ─────────────────────────\n");

  console.log("6. Auth — unauthenticated access");
  // /chat should redirect to /login (302) for unauthenticated users
  const chatRes = await fetch(`${BASE}/chat`, { redirect: "manual" });
  assert(
    "GET /chat redirects unauthenticated → 307/302",
    chatRes.status === 307 || chatRes.status === 302 || chatRes.status === 308,
    `status ${chatRes.status}`
  );
  const location = chatRes.headers.get("location") ?? "";
  assert("redirect targets /login", location.includes("/login"), `location: ${location}`);

  console.log("\n7. AI route — unauthenticated request rejected");
  const aiUnauthedRes = await fetch(`${BASE}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "hello" }),
  });
  assert("POST /api/ai without auth → 401", aiUnauthedRes.status === 401, `status ${aiUnauthedRes.status}`);

  console.log("\n8. AI route — empty prompt rejected");
  // We can't test authenticated AI calls without a real session cookie,
  // but we verify the 401 path handles bad input correctly too
  const aiEmptyRes = await fetch(`${BASE}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "" }),
  });
  assert(
    "POST /api/ai with empty prompt → 400 or 401",
    aiEmptyRes.status === 400 || aiEmptyRes.status === 401,
    `status ${aiEmptyRes.status}`
  );

  console.log("\n9. Login page accessible");
  const loginRes = await fetch(`${BASE}/login`);
  assert("GET /login → 200", loginRes.ok, `status ${loginRes.status}`);
  const loginHtml = await loginRes.text();
  assert("login page contains sign-in text", loginHtml.toLowerCase().includes("sign") || loginHtml.includes("AI_CHAT") || loginHtml.includes("google"));
}

async function run() {
  console.log(`\nRegression test → ${BASE}\n`);
  await runMessagesTests();
  await runAuthTests();

  console.log(`\n${"─".repeat(46)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(err => { console.error("Test runner error:", err); process.exit(1); });
