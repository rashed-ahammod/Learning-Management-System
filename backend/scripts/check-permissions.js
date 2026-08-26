'use strict';

/**
 * Hits the running API as each role and asserts what that role may and may not do.
 *
 * Access control here has two layers - the permission matrix decides which
 * endpoints a role may call, and the policies and controllers decide which rows
 * they may call them on. A leak in either layer looks exactly like a working app
 * from the browser, because the UI simply never renders the button. So this
 * calls the endpoints directly, including the ones no button exists for.
 *
 * Usage: start the backend, then `npm run check:permissions`
 */
require('dotenv').config();

const BASE = process.env.CHECK_BASE_URL || 'http://localhost:1337';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const PASSWORD = 'Testing123!';

let passed = 0;
let failed = 0;
const cleanup = [];

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
    // plenty of responses have no body
  }

  return { status: res.status, json };
}

function expect(label, actual, wanted) {
  const ok = actual === wanted;
  const detail = ok ? '' : `   (expected ${wanted})`;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(54)} ${actual}${detail}`);
  ok ? (passed += 1) : (failed += 1);
}

function section(name) {
  console.log(`\n--- ${name} ---`);
}

/** Creates a user with a given role, then logs in as them. */
async function makeUser(adminToken, roleType, tag) {
  const roles = await req('GET', '/api/users-permissions/roles', { token: adminToken });
  const role = roles.json?.roles?.find((r) => r.type === roleType);

  const email = `${tag}@lms.test`;
  const created = await req('POST', '/api/users', {
    token: adminToken,
    body: { username: tag, email, password: PASSWORD, role: role.id, confirmed: true },
  });

  if (created.json?.id) {
    cleanup.push(() => req('DELETE', `/api/users/${created.json.id}`, { token: adminToken }));
  }

  const login = await req('POST', '/api/auth/local', {
    body: { identifier: email, password: PASSWORD },
  });

  return { id: created.json?.id, token: login.json?.jwt };
}

async function run() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const stamp = Date.now();

  const adminLogin = await req('POST', '/api/auth/local', {
    body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const admin = adminLogin.json?.jwt;

  if (!admin) {
    console.error('Could not log in as the seeded admin. Check SEED_ADMIN_* in .env');
    process.exit(1);
  }

  section('logged out');
  expect('GET  /api/courses    catalogue is public', (await req('GET', '/api/courses')).status, 200);
  expect('GET  /api/lessons    lessons are not', (await req('GET', '/api/lessons')).status, 403);
  expect(
    'POST /api/courses    no writing',
    (await req('POST', '/api/courses', { body: { data: { title: 'x', slug: `x${stamp}` } } })).status,
    403
  );
  expect('GET  /api/users      no user listing', (await req('GET', '/api/users')).status, 403);

  section('signup');
  const signup = await req('POST', '/api/auth/local/register', {
    body: { username: `signup${stamp}`, email: `signup${stamp}@lms.test`, password: PASSWORD },
  });
  expect('POST /api/auth/local/register', signup.status, 200);

  const me = await req('GET', '/api/users/me', { token: signup.json?.jwt });
  expect('     role defaults to student', me.json?.role?.type, 'student');
  if (me.json?.id) {
    cleanup.push(() => req('DELETE', `/api/users/${me.json.id}`, { token: admin }));
  }

  section('roles under test');
  const alice = await makeUser(admin, 'instructor', `alice${stamp}`);
  const bob = await makeUser(admin, 'instructor', `bob${stamp}`);
  const manager = await makeUser(admin, 'content-manager', `cm${stamp}`);
  const sam = await makeUser(admin, 'student', `sam${stamp}`);
  const zoe = await makeUser(admin, 'student', `zoe${stamp}`);
  expect(
    'two instructors, a content manager, two students',
    [alice, bob, manager, sam, zoe].every((u) => Boolean(u.token)),
    true
  );

  section('a course belongs to whoever created it');
  const created = await req('POST', '/api/courses', {
    token: alice.token,
    // Alice names Bob as the owner. The server has to ignore that.
    body: {
      data: { title: `Alice course ${stamp}`, slug: `alice-course-${stamp}`, owner: bob.id },
    },
  });
  expect('POST /api/courses    instructor may create', created.status, 201);

  const courseId = created.json?.data?.documentId;
  if (courseId) {
    cleanup.push(() => req('DELETE', `/api/courses/${courseId}`, { token: admin }));
  }

  const ownerCheck = await req('GET', `/api/courses/${courseId}`);
  expect('     owner is the creator, not the payload', ownerCheck.json?.data?.owner?.username, `alice${stamp}`);

  section('an instructor cannot touch another instructor course');
  expect(
    'PUT    Bob edits Alice course',
    (await req('PUT', `/api/courses/${courseId}`, { token: bob.token, body: { data: { title: 'hijacked' } } })).status,
    403
  );
  expect(
    'DELETE Bob deletes Alice course',
    (await req('DELETE', `/api/courses/${courseId}`, { token: bob.token })).status,
    403
  );
  expect(
    'PUT    Alice edits her own',
    (await req('PUT', `/api/courses/${courseId}`, { token: alice.token, body: { data: { description: 'updated' } } })).status,
    200
  );
  expect(
    'PUT    content manager edits any course',
    (await req('PUT', `/api/courses/${courseId}`, { token: manager.token, body: { data: { description: 'cm was here' } } })).status,
    200
  );

  section('lessons inherit the permissions of their course');
  expect(
    'POST   Bob adds a lesson to Alice course',
    (await req('POST', '/api/lessons', {
      token: bob.token,
      body: { data: { title: 'nope', order: 1, course: courseId } },
    })).status,
    403
  );

  const lesson = await req('POST', '/api/lessons', {
    token: alice.token,
    body: { data: { title: 'Lesson one', order: 1, content: 'Secret body', course: courseId } },
  });
  expect('POST   Alice adds a lesson to her own', lesson.status, 201);

  const lessonId = lesson.json?.data?.documentId;
  if (lessonId) {
    cleanup.push(() => req('DELETE', `/api/lessons/${lessonId}`, { token: admin }));
  }

  expect(
    'PUT    Bob edits Alice lesson by id',
    (await req('PUT', `/api/lessons/${lessonId}`, { token: bob.token, body: { data: { title: 'hijacked' } } })).status,
    403
  );

  section('the public catalogue never leaks lesson bodies');
  const publicCourse = await req('GET', `/api/courses/${courseId}?populate=lessons`);
  const syllabus = publicCourse.json?.data?.lessons?.[0];
  expect('     syllabus lists the lesson title', syllabus?.title, 'Lesson one');
  expect('     but not its content', syllabus?.content, undefined);

  section('lesson content requires enrolment');
  expect(
    'GET  /api/lessons/:id  not enrolled',
    (await req('GET', `/api/lessons/${lessonId}`, { token: sam.token })).status,
    403
  );

  const listBefore = await req('GET', '/api/lessons', { token: sam.token });
  expect('GET  /api/lessons      not enrolled, empty', listBefore.json?.data?.length, 0);

  const enrol = await req('POST', '/api/enrollments', {
    token: sam.token,
    // Sam tries to enrol Zoe. The server has to enrol Sam instead.
    body: { data: { course: courseId, student: zoe.id } },
  });
  expect('POST /api/enrollments  student may enrol', enrol.status, 201);

  const enrolId = enrol.json?.data?.documentId;
  if (enrolId) {
    cleanup.push(() => req('DELETE', `/api/enrollments/${enrolId}`, { token: admin }));
  }

  expect(
    'GET  /api/lessons/:id  enrolled',
    (await req('GET', `/api/lessons/${lessonId}`, { token: sam.token })).status,
    200
  );

  const listAfter = await req('GET', '/api/lessons', { token: sam.token });
  expect('GET  /api/lessons      enrolled, visible', listAfter.json?.data?.length, 1);

  section('enrolment edge cases');
  expect(
    'POST /api/enrollments  enrolling twice',
    (await req('POST', '/api/enrollments', { token: sam.token, body: { data: { course: courseId } } })).status,
    400
  );
  expect(
    'POST /api/enrollments  unknown course',
    (await req('POST', '/api/enrollments', { token: sam.token, body: { data: { course: 'does-not-exist' } } })).status,
    404
  );

  const zoeSees = await req('GET', '/api/enrollments', { token: zoe.token });
  expect('     Zoe was not enrolled by Sam', zoeSees.json?.data?.length, 0);

  section('enrolment rows are private');
  const samSees = await req('GET', '/api/enrollments', { token: sam.token });
  expect('GET  /api/enrollments  own rows only', samSees.json?.data?.length, 1);

  // Try to widen the result set with a filter the controller did not anticipate.
  const escape = await req(
    'GET',
    '/api/enrollments?filters[$or][0][id][$gt]=0&filters[$or][1][id][$lte]=0',
    { token: zoe.token }
  );
  expect('     an $or filter cannot widen it', escape.json?.data?.length, 0);

  const aliceSees = await req('GET', '/api/enrollments', { token: alice.token });
  expect('     Alice sees enrolments on her course', aliceSees.json?.data?.length, 1);

  const bobSees = await req('GET', '/api/enrollments', { token: bob.token });
  expect('     Bob sees none, he owns no courses', bobSees.json?.data?.length, 0);

  console.log(`\n${passed} passed, ${failed} failed\n`);
}

run()
  .catch((err) => {
    console.error('\nCould not run the checks:', err.message);
    console.error(`Is the backend running on ${BASE} ?`);
    failed += 1;
  })
  .finally(async () => {
    // Leave the database as we found it, whatever happened above.
    for (const undo of cleanup.reverse()) {
      await undo().catch(() => {});
    }
    process.exit(failed > 0 ? 1 : 0);
  });
