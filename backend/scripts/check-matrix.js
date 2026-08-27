'use strict';

/**
 * Checks the project brief's permission matrix, one row at a time.
 *
 * check-permissions.js asks "is anything leaking". This asks a narrower and
 * more literal question: does each cell of the table in the spec match what the
 * API actually does? The two overlap, but this one is written so the output can
 * be read straight against the brief - same row names, same four columns.
 *
 *   Action                        Admin  Content Manager  Instructor    Student
 *   Manage users & assign roles     Y           N              N            N
 *   Create/edit/delete any course   Y           Y          own only         N
 *   Add/edit/delete lessons         Y           Y         own courses       N
 *   Create quizzes                  Y           Y         own courses       N
 *   View student progress           Y           Y         own courses   own only
 *   Write/manage blog posts         Y           Y              N            N
 *   Enroll in a course              N           N              N            Y
 *   Take quizzes                    N           N              N            Y
 *
 * Usage: start the backend, then `npm run check:matrix`
 */
require('dotenv').config();

const BASE = process.env.CHECK_BASE_URL || 'http://localhost:1337';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const PASSWORD = 'Testing123!';

const COLUMNS = ['admin', 'content manager', 'instructor', 'student'];

let failures = 0;
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
    // no body
  }

  return { status: res.status, json };
}

/** Prints one row of the matrix and checks every cell in it. */
function row(action, results, expected) {
  const cells = COLUMNS.map((who) => {
    const status = results[who];
    const allowed = status < 400;
    const ok = allowed === (expected[who] === 'Y');

    if (!ok) failures += 1;

    return `${ok ? ' ' : '!'}${expected[who].padEnd(4)}(${status})`;
  });

  console.log(`  ${action.padEnd(31)} ${cells.join(' ')}`);
}

async function run() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const stamp = Date.now();

  const login = await req('POST', '/api/auth/local', {
    body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  if (login.status === 429) {
    console.error('\nStrapi is rate-limiting sign-ins. Wait a minute and try again.\n');
    process.exit(1);
  }

  const adminToken = login.json?.jwt;

  if (!adminToken) {
    console.error('Could not sign in as the seeded admin. Check SEED_ADMIN_* in .env');
    process.exit(1);
  }

  const { roles } = (await req('GET', '/api/users-permissions/roles', { token: adminToken })).json;

  async function makeUser(type, tag) {
    const role = roles.find((r) => r.type === type);
    const created = await req('POST', '/api/users', {
      token: adminToken,
      body: { username: tag, email: `${tag}@matrix.test`, password: PASSWORD, role: role.id, confirmed: true },
    });

    if (created.json?.id) {
      cleanup.push(() => req('DELETE', `/api/users/${created.json.id}`, { token: adminToken }));
    }

    const auth = await req('POST', '/api/auth/local', {
      body: { identifier: `${tag}@matrix.test`, password: PASSWORD },
    });

    return { id: created.json?.id, token: auth.json?.jwt };
  }

  const manager = await makeUser('content-manager', `mxcm${stamp}`);
  const instructor = await makeUser('instructor', `mxin${stamp}`);
  const student = await makeUser('student', `mxst${stamp}`);

  const actors = {
    admin: { token: adminToken },
    'content manager': manager,
    instructor,
    student,
  };

  /**
   * Two courses, so "own" and "somebody else's" are both real cases: one owned
   * by the instructor, one by the content manager. The instructor column is
   * tested against the course they do *not* own, since that is what "own only"
   * actually restricts.
   */
  const mine = (
    await req('POST', '/api/courses', {
      token: instructor.token,
      body: { data: { title: `Matrix own ${stamp}`, slug: `matrix-own-${stamp}` } },
    })
  ).json.data;

  const theirs = (
    await req('POST', '/api/courses', {
      token: manager.token,
      body: { data: { title: `Matrix other ${stamp}`, slug: `matrix-other-${stamp}` } },
    })
  ).json.data;

  cleanup.push(() => req('DELETE', `/api/courses/${mine.documentId}`, { token: adminToken }));
  cleanup.push(() => req('DELETE', `/api/courses/${theirs.documentId}`, { token: adminToken }));

  // A quiz and an enrolment on the content manager's course, so the student can
  // actually sit something and the instructor has somebody else's data to fail on.
  const quiz = (
    await req('POST', '/api/quizzes', {
      token: manager.token,
      body: {
        data: {
          title: `Matrix quiz ${stamp}`,
          course: theirs.documentId,
          questions: [{ text: 'q', options: ['a', 'b'], correctIndex: 0 }],
        },
      },
    })
  ).json.data;

  await req('POST', '/api/enrollments', {
    token: student.token,
    body: { data: { course: theirs.documentId } },
  });

  const everyone = async (fn) => {
    const out = {};
    for (const who of COLUMNS) out[who] = (await fn(actors[who], who)).status;
    return out;
  };

  console.log('\n  Action                          Admin      CM         Instructor Student');
  console.log('  ' + '-'.repeat(74));

  row(
    'Manage users & assign roles',
    await everyone((a) => req('GET', '/api/users', { token: a.token })),
    { admin: 'Y', 'content manager': 'N', instructor: 'N', student: 'N' }
  );

  // "any course" - so the instructor is tested on one they do not own.
  row(
    'Edit/delete any course',
    await everyone((a) =>
      req('PUT', `/api/courses/${theirs.documentId}`, {
        token: a.token,
        body: { data: { description: `touched ${stamp}` } },
      })
    ),
    { admin: 'Y', 'content manager': 'Y', instructor: 'N', student: 'N' }
  );

  row(
    'Add lessons (to that course)',
    await everyone((a, who) =>
      req('POST', '/api/lessons', {
        token: a.token,
        body: { data: { title: `L ${who}`, order: 1, course: theirs.documentId } },
      })
    ),
    { admin: 'Y', 'content manager': 'Y', instructor: 'N', student: 'N' }
  );

  row(
    'Create quizzes (that course)',
    await everyone((a, who) =>
      req('POST', '/api/quizzes', {
        token: a.token,
        body: {
          data: {
            title: `Q ${who} ${stamp}`,
            course: theirs.documentId,
            questions: [{ text: 'q', options: ['a', 'b'], correctIndex: 1 }],
          },
        },
      })
    ),
    { admin: 'Y', 'content manager': 'Y', instructor: 'N', student: 'N' }
  );

  row(
    'View student progress',
    await everyone((a) =>
      req('GET', `/api/courses/${theirs.documentId}/progress/students`, { token: a.token })
    ),
    { admin: 'Y', 'content manager': 'Y', instructor: 'N', student: 'N' }
  );

  row(
    'Write/manage blog posts',
    await everyone((a, who) =>
      req('POST', '/api/blog-posts', {
        token: a.token,
        body: { data: { title: `B ${who} ${stamp}`, slug: `b-${who.replace(/ /g, '')}-${stamp}` } },
      })
    ),
    { admin: 'Y', 'content manager': 'Y', instructor: 'N', student: 'N' }
  );

  row(
    'Enroll in a course',
    await everyone((a) =>
      req('POST', '/api/enrollments', { token: a.token, body: { data: { course: mine.documentId } } })
    ),
    { admin: 'N', 'content manager': 'N', instructor: 'N', student: 'Y' }
  );

  row(
    'Take quizzes',
    await everyone((a) =>
      req('POST', `/api/quizzes/${quiz.documentId}/attempts`, { token: a.token, body: { answers: [] } })
    ),
    { admin: 'N', 'content manager': 'N', instructor: 'N', student: 'Y' }
  );

  console.log('  ' + '-'.repeat(74));

  // The two cells the table words differently: "own only" / "own courses".
  console.log('\n  Where the spec says "own":');

  const ownEdit = await req('PUT', `/api/courses/${mine.documentId}`, {
    token: instructor.token,
    body: { data: { description: 'own course' } },
  });
  const ownProgress = await req('GET', `/api/courses/${mine.documentId}/progress/students`, {
    token: instructor.token,
  });
  const ownLesson = await req('POST', '/api/lessons', {
    token: instructor.token,
    body: { data: { title: 'own lesson', order: 1, course: mine.documentId } },
  });
  const studentOwn = await req('GET', `/api/courses/${theirs.documentId}/progress`, {
    token: student.token,
  });

  for (const [label, res, want] of [
    ['instructor edits their OWN course', ownEdit, true],
    ['instructor adds a lesson to it', ownLesson, true],
    ['instructor sees ITS student progress', ownProgress, true],
    ['student sees their OWN progress', studentOwn, true],
  ]) {
    const ok = res.status < 400 === want;
    if (!ok) failures += 1;
    console.log(`  ${ok ? 'ok  ' : 'BAD '} ${label.padEnd(40)} ${res.status}`);
  }

  console.log(
    failures === 0
      ? '\n  Every cell matches the brief.\n'
      : `\n  ${failures} cell(s) DO NOT match the brief.\n`
  );
}

run()
  .catch((error) => {
    console.error('\nCould not run the checks:', error.message);
    failures += 1;
  })
  .finally(async () => {
    for (const undo of cleanup.reverse()) await undo().catch(() => {});
    process.exit(failures > 0 ? 1 : 0);
  });
