'use strict';

/**
 * Hits the running API as each role and asserts what that role may and may not do.
 *
 * The permission matrix is easy to get subtly wrong, and a leak looks exactly like
 * a working app until someone tries the request the UI does not offer. So rather
 * than clicking through the frontend, this calls the endpoints directly - including
 * the ones no button exists for.
 *
 * Usage: start the backend, then `npm run check:permissions`
 */
require('dotenv').config();

const BASE = process.env.CHECK_BASE_URL || 'http://localhost:1337';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

let passed = 0;
let failed = 0;

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    // some responses have no body, that is fine
  }

  return { status: res.status, json };
}

function expect(label, actual, wanted) {
  const ok = actual === wanted;
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${label.padEnd(52)} ${actual}${ok ? '' : `   (expected ${wanted})`}`);
  ok ? (passed += 1) : (failed += 1);
}

async function run() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const stamp = Date.now();

  console.log('\n--- logged out ---');
  expect('GET  /api/courses   catalogue is public', (await req('GET', '/api/courses')).status, 200);
  expect('GET  /api/lessons   lessons are not', (await req('GET', '/api/lessons')).status, 403);
  expect(
    'POST /api/courses   no writing',
    (await req('POST', '/api/courses', { body: { data: { title: 'x', slug: `x${stamp}` } } })).status,
    403
  );
  expect('GET  /api/users     no user listing', (await req('GET', '/api/users')).status, 403);

  console.log('\n--- a new signup ---');
  const signup = await req('POST', '/api/auth/local/register', {
    body: { username: `check${stamp}`, email: `check${stamp}@lms.test`, password: 'Student123!' },
  });
  expect('POST /api/auth/local/register', signup.status, 200);

  const studentToken = signup.json?.jwt;
  const me = await req('GET', '/api/users/me', { token: studentToken });
  expect('GET  /api/users/me', me.status, 200);
  expect('     role defaults to student', me.json?.role?.type, 'student');

  console.log('\n--- student: reads content, writes nothing ---');
  expect(
    'GET  /api/lessons   may call it',
    (await req('GET', '/api/lessons', { token: studentToken })).status,
    200
  );
  expect(
    'POST /api/courses   blocked',
    (await req('POST', '/api/courses', { token: studentToken, body: { data: { title: 'no', slug: `no${stamp}` } } })).status,
    403
  );
  expect(
    'POST /api/lessons   blocked',
    (await req('POST', '/api/lessons', { token: studentToken, body: { data: { title: 'no', order: 1 } } })).status,
    403
  );
  expect('GET  /api/users     blocked', (await req('GET', '/api/users', { token: studentToken })).status, 403);

  console.log('\n--- admin: full access ---');
  const login = await req('POST', '/api/auth/local', {
    body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect('POST /api/auth/local', login.status, 200);

  const adminToken = login.json?.jwt;
  const adminMe = await req('GET', '/api/users/me', { token: adminToken });
  expect('     role is admin', adminMe.json?.role?.type, 'admin');
  expect('GET  /api/users     allowed', (await req('GET', '/api/users', { token: adminToken })).status, 200);

  const created = await req('POST', '/api/courses', {
    token: adminToken,
    body: { data: { title: `Permission check ${stamp}`, slug: `permission-check-${stamp}` } },
  });
  expect('POST /api/courses   allowed', created.status, 201);

  // Leave the database as we found it.
  if (created.json?.data?.documentId) {
    await req('DELETE', `/api/courses/${created.json.data.documentId}`, { token: adminToken });
  }
  if (me.json?.id) {
    await req('DELETE', `/api/users/${me.json.id}`, { token: adminToken });
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('\nCould not run the checks:', err.message);
  console.error('Is the backend running on ' + BASE + ' ?');
  process.exit(1);
});
