#!/usr/bin/env node
/**
 * Regression test for the Postgres-backed messages API.
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

async function run() {
  console.log(`\nRegression test → ${BASE}\n`);

  // 0. Setup (idempotent — ensures table exists)
  console.log("0. Setup");
  const setupRes = await fetch(`${BASE}/api/messages/setup`, { method: "POST" });
  assert("POST /api/messages/setup → 200", setupRes.ok, `status ${setupRes.status}`);

  // 1. Create
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

  // 2. Read
  console.log("\n2. Read");
  const listRes = await fetch(`${BASE}/api/messages`);
  assert("GET /api/messages → 200", listRes.ok, `status ${listRes.status}`);
  const list = await listRes.json();
  assert("response is array", Array.isArray(list));
  assert("created message is in list", list.some(m => m.id === id));

  // 3. Update
  console.log("\n3. Update");
  const updateRes = await fetch(`${BASE}/api/messages/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "regression-test-message-updated" }),
  });
  assert("PUT /api/messages/:id → 200", updateRes.ok, `status ${updateRes.status}`);
  const updated = await updateRes.json();
  assert("text was updated", updated.text === "regression-test-message-updated");

  // 4. Validation — empty text rejected
  console.log("\n4. Validation");
  const emptyRes = await fetch(`${BASE}/api/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "  " }),
  });
  assert("POST with empty text → 400", emptyRes.status === 400, `status ${emptyRes.status}`);

  // 5. Delete
  console.log("\n5. Delete");
  const deleteRes = await fetch(`${BASE}/api/messages/${id}`, { method: "DELETE" });
  assert("DELETE /api/messages/:id → 204", deleteRes.status === 204, `status ${deleteRes.status}`);

  // Verify gone
  const afterDeleteRes = await fetch(`${BASE}/api/messages`);
  const afterList = await afterDeleteRes.json();
  assert("deleted message no longer in list", !afterList.some(m => m.id === id));

  // Summary
  console.log(`\n${"─".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(err => { console.error("Test runner error:", err); process.exit(1); });
