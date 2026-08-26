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
  if (ok) {
    passed += 1;
  } else {
    failed += 1;
  }
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

  section('progress tracking');
  const lessonTwo = await req('POST', '/api/lessons', {
    token: alice.token,
    body: { data: { title: 'Lesson two', order: 2, content: 'More', course: courseId } },
  });
  const lessonTwoId = lessonTwo.json?.data?.documentId;
  if (lessonTwoId) {
    cleanup.push(() => req('DELETE', `/api/lessons/${lessonTwoId}`, { token: admin }));
  }

  const mark = (token, id, completed) =>
    req('PUT', `/api/lessons/${id}/progress`, { token, body: { completed } });

  // Progress rows have no CRUD route, so they are cleared the same way they were
  // set. Registered here so it runs before the lessons and users are removed.
  cleanup.push(() => mark(sam.token, lessonId, false));

  const first = await mark(sam.token, lessonId, true);
  expect('PUT  lesson/progress   mark complete', first.status, 200);
  expect('     1 of 2 lessons is 50%', first.json?.data?.percentage, 50);

  const again = await mark(sam.token, lessonId, true);
  expect('     marking it twice changes nothing', again.json?.data?.percentage, 50);

  const both = await mark(sam.token, lessonTwoId, true);
  expect('     2 of 2 lessons is 100%', both.json?.data?.percentage, 100);

  const undone = await mark(sam.token, lessonTwoId, false);
  expect('     un-marking drops it back', undone.json?.data?.percentage, 50);

  expect(
    'PUT  lesson/progress   completed must be boolean',
    (await req('PUT', `/api/lessons/${lessonId}/progress`, { token: sam.token, body: { completed: 'yes' } })).status,
    400
  );
  expect('PUT  lesson/progress   not enrolled', (await mark(zoe.token, lessonId, true)).status, 403);

  section('progress is per student, per course');
  const samProgress = await req('GET', `/api/courses/${courseId}/progress`, { token: sam.token });
  expect('GET  course/progress   Sam is at 50%', samProgress.json?.data?.percentage, 50);
  expect('     and knows which lesson', samProgress.json?.data?.completedLessonIds?.length, 1);

  const zoeProgress = await req('GET', `/api/courses/${courseId}/progress`, { token: zoe.token });
  expect('GET  course/progress   Zoe is still at 0%', zoeProgress.json?.data?.percentage, 0);

  section('who may see student progress');
  const aliceView = await req('GET', `/api/courses/${courseId}/progress/students`, { token: alice.token });
  expect('GET  progress/students Alice owns the course', aliceView.status, 200);
  expect('     and sees Sam at 50%', aliceView.json?.data?.students?.[0]?.percentage, 50);
  expect('     without exposing his email', aliceView.json?.data?.students?.[0]?.email, undefined);
  expect(
    'GET  progress/students Bob owns nothing here',
    (await req('GET', `/api/courses/${courseId}/progress/students`, { token: bob.token })).status,
    403
  );
  expect(
    'GET  progress/students content manager may',
    (await req('GET', `/api/courses/${courseId}/progress/students`, { token: manager.token })).status,
    200
  );
  expect(
    'GET  progress/students a student may not',
    (await req('GET', `/api/courses/${courseId}/progress/students`, { token: sam.token })).status,
    403
  );

  section('a course with no lessons yet');
  const empty = await req('POST', '/api/courses', {
    token: alice.token,
    body: { data: { title: `Empty course ${stamp}`, slug: `empty-course-${stamp}` } },
  });
  const emptyId = empty.json?.data?.documentId;
  if (emptyId) {
    cleanup.push(() => req('DELETE', `/api/courses/${emptyId}`, { token: admin }));
  }

  const emptyEnrol = await req('POST', '/api/enrollments', {
    token: sam.token,
    body: { data: { course: emptyId } },
  });
  if (emptyEnrol.json?.data?.documentId) {
    cleanup.push(() => req('DELETE', `/api/enrollments/${emptyEnrol.json.data.documentId}`, { token: admin }));
  }

  const emptyProgress = await req('GET', `/api/courses/${emptyId}/progress`, { token: sam.token });
  expect('GET  course/progress   0 of 0 lessons is 0%, not NaN', emptyProgress.json?.data?.percentage, 0);

  section('quizzes belong to whoever owns the course');
  const quizBody = (title) => ({
    data: {
      title,
      course: courseId,
      questions: [
        { text: 'Two plus two?', options: ['3', '4', '5'], correctIndex: 1 },
        { text: 'Capital of France?', options: ['Lyon', 'Paris'], correctIndex: 1 },
      ],
    },
  });

  const quiz = await req('POST', '/api/quizzes', { token: alice.token, body: quizBody(`Quiz ${stamp}`) });
  expect('POST /api/quizzes      Alice owns the course', quiz.status, 201);

  const quizId = quiz.json?.data?.documentId;
  if (quizId) {
    cleanup.push(() => req('DELETE', `/api/quizzes/${quizId}`, { token: admin }));
  }

  expect(
    'POST /api/quizzes      Bob does not',
    (await req('POST', '/api/quizzes', { token: bob.token, body: quizBody('nope') })).status,
    403
  );
  expect(
    'PUT  /api/quizzes/:id  Bob cannot edit hers',
    (await req('PUT', `/api/quizzes/${quizId}`, { token: bob.token, body: { data: { title: 'hijacked' } } })).status,
    403
  );

  section('a quiz has to be answerable');
  const badQuiz = (questions) =>
    req('POST', '/api/quizzes', {
      token: alice.token,
      body: { data: { title: 'bad', course: courseId, questions } },
    });

  expect(
    '     correctIndex past the last option',
    (await badQuiz([{ text: 'q', options: ['a', 'b'], correctIndex: 5 }])).status,
    400
  );
  expect(
    '     a single option is not a choice',
    (await badQuiz([{ text: 'q', options: ['a'], correctIndex: 0 }])).status,
    400
  );
  expect('     no questions at all', (await badQuiz([])).status, 400);

  section('the answer key never reaches a student');
  const staffView = await req('GET', `/api/quizzes/${quizId}`, { token: alice.token });
  expect('GET  /api/quizzes/:id  staff do see correctIndex', staffView.json?.data?.questions?.[0]?.correctIndex, 1);

  const studentView = await req('GET', `/api/quizzes/${quizId}`, { token: sam.token });
  expect('GET  /api/quizzes/:id  enrolled student may read', studentView.status, 200);
  expect('     gets the question text', studentView.json?.data?.questions?.[0]?.text, 'Two plus two?');
  expect('     gets all three options', studentView.json?.data?.questions?.[0]?.options?.length, 3);
  expect('     but NOT correctIndex', studentView.json?.data?.questions?.[0]?.correctIndex, undefined);
  expect(
    '     nor through ?populate=questions',
    (await req('GET', `/api/quizzes/${quizId}?populate=questions`, { token: sam.token })).json?.data?.questions?.[0]
      ?.correctIndex,
    undefined
  );
  expect(
    'GET  /api/quizzes/:id  not enrolled',
    (await req('GET', `/api/quizzes/${quizId}`, { token: zoe.token })).status,
    403
  );

  section('auto-grading');
  const questions = studentView.json?.data?.questions ?? [];
  const submit = (token, answers) =>
    req('POST', `/api/quizzes/${quizId}/attempts`, { token, body: { answers } });

  const keepAttempt = (res) => {
    const id = res.json?.data?.id;
    if (id) cleanup.push(() => req('DELETE', `/api/quiz-attempts/${id}`, { token: admin }));
    return res;
  };

  const allRight = keepAttempt(
    await submit(sam.token, [
      { questionId: questions[0]?.id, selectedIndex: 1 },
      { questionId: questions[1]?.id, selectedIndex: 1 },
    ])
  );
  expect('POST quiz/attempts     both answers right', allRight.status, 201);
  expect('     scores 2 of 2', allRight.json?.data?.score, 2);
  expect('     which is 100%', allRight.json?.data?.percentage, 100);

  const half = keepAttempt(
    await submit(sam.token, [
      { questionId: questions[0]?.id, selectedIndex: 1 },
      { questionId: questions[1]?.id, selectedIndex: 0 },
    ])
  );
  expect('     one of two is 50%', half.json?.data?.percentage, 50);

  const blank = keepAttempt(await submit(sam.token, []));
  expect('     unanswered counts as wrong', blank.json?.data?.percentage, 0);

  expect(
    '     the stored answers carry no key',
    JSON.stringify(allRight.json?.data?.answers ?? []).includes('correctIndex'),
    false
  );
  expect('POST quiz/attempts     not enrolled', (await submit(zoe.token, [])).status, 403);
  expect(
    'POST quiz/attempts     answers must be an array',
    (await req('POST', `/api/quizzes/${quizId}/attempts`, { token: sam.token, body: { answers: 'all of them' } }))
      .status,
    400
  );

  section('results are stored and stay private');
  const samResults = await req('GET', `/api/quizzes/${quizId}/attempts`, { token: sam.token });
  expect('GET  quiz/attempts     all three kept', samResults.json?.data?.length, 3);
  expect('     newest first', samResults.json?.data?.[0]?.percentage, 0);

  const zoeResults = await req('GET', `/api/quizzes/${quizId}/attempts`, { token: zoe.token });
  expect('     Zoe sees none belonging to Sam', zoeResults.json?.data?.length, 0);

  section('deleting a course takes its contents with it');
  // Everything below hangs off the course, and the ownership policies work out
  // permission *from* the course - so anything left behind would be permanently
  // unreachable, not merely untidy.
  const doomed = await req('POST', '/api/courses', {
    token: alice.token,
    body: { data: { title: `Doomed ${stamp}`, slug: `doomed-${stamp}` } },
  });
  const doomedId = doomed.json?.data?.documentId;

  const doomedLesson = await req('POST', '/api/lessons', {
    token: alice.token,
    body: { data: { title: 'Doomed lesson', order: 1, course: doomedId } },
  });
  const doomedQuiz = await req('POST', '/api/quizzes', {
    token: alice.token,
    body: {
      data: {
        title: 'Doomed quiz',
        course: doomedId,
        questions: [{ text: 'q', options: ['a', 'b'], correctIndex: 0 }],
      },
    },
  });
  await req('POST', '/api/enrollments', { token: sam.token, body: { data: { course: doomedId } } });
  await mark(sam.token, doomedLesson.json?.data?.documentId, true);
  await req('POST', `/api/quizzes/${doomedQuiz.json?.data?.documentId}/attempts`, {
    token: sam.token,
    body: { answers: [] },
  });

  expect(
    'DELETE /api/courses/:id  removes the course',
    (await req('DELETE', `/api/courses/${doomedId}`, { token: alice.token })).status,
    204
  );
  expect(
    '     its lessons are gone too',
    (await req('GET', `/api/lessons/${doomedLesson.json?.data?.documentId}`, { token: alice.token })).status,
    404
  );
  expect(
    '     and its quiz',
    (await req('GET', `/api/quizzes/${doomedQuiz.json?.data?.documentId}`, { token: alice.token })).status,
    404
  );

  const samAfter = await req('GET', '/api/enrollments', { token: sam.token });
  expect('     and the enrolment', samAfter.json?.data?.length, 2);

  section('only admins and content managers write the blog');
  const manager2 = await makeUser(admin, 'content-manager', `cm2${stamp}`);

  const postBody = {
    data: {
      title: `Draft post ${stamp}`,
      slug: `draft-post-${stamp}`,
      body: 'Something worth reading.',
      author: sam.id, // must be ignored
    },
  };

  const post = await req('POST', '/api/blog-posts', { token: manager.token, body: postBody });
  expect('POST /api/blog-posts   content manager may', post.status, 201);

  const postId = post.json?.data?.documentId;
  if (postId) {
    cleanup.push(() => req('DELETE', `/api/blog-posts/${postId}`, { token: admin }));
  }
  expect('     author is the creator, not the payload', post.json?.data?.author?.username, `cm${stamp}`);

  expect(
    'POST /api/blog-posts   an instructor may not',
    (await req('POST', '/api/blog-posts', { token: alice.token, body: postBody })).status,
    403
  );
  expect(
    'POST /api/blog-posts   a student may not',
    (await req('POST', '/api/blog-posts', { token: sam.token, body: postBody })).status,
    403
  );

  section('a draft is invisible until it is published');
  const listHas = (res) => (res.json?.data ?? []).some((p) => p.documentId === postId);

  expect('GET  /api/blog-posts   not in the public list', listHas(await req('GET', '/api/blog-posts')), false);
  expect('GET  /api/blog-posts/:id  reads as missing', (await req('GET', `/api/blog-posts/${postId}`)).status, 404);

  // The one that matters: Strapi picks the version from ?status, and the
  // permission system has no opinion on it.
  expect(
    'GET  ?status=draft     logged out cannot force it',
    listHas(await req('GET', '/api/blog-posts?status=draft')),
    false
  );
  expect(
    'GET  ?status=draft     nor can a student',
    listHas(await req('GET', '/api/blog-posts?status=draft', { token: sam.token })),
    false
  );
  expect(
    'GET  ?status=draft     nor an instructor',
    listHas(await req('GET', '/api/blog-posts?status=draft', { token: alice.token })),
    false
  );
  expect(
    'GET  ?status=draft     but the author can',
    listHas(await req('GET', '/api/blog-posts?status=draft', { token: manager.token })),
    true
  );

  section('publishing');
  const emptyPost = await req('POST', '/api/blog-posts', {
    token: manager.token,
    body: { data: { title: `Empty post ${stamp}`, slug: `empty-post-${stamp}` } },
  });
  const emptyPostId = emptyPost.json?.data?.documentId;
  if (emptyPostId) {
    cleanup.push(() => req('DELETE', `/api/blog-posts/${emptyPostId}`, { token: admin }));
  }
  expect(
    'POST :id/publish       refuses an empty post',
    (await req('POST', `/api/blog-posts/${emptyPostId}/publish`, { token: manager.token })).status,
    400
  );

  expect(
    'POST :id/publish       the author may',
    (await req('POST', `/api/blog-posts/${postId}/publish`, { token: manager.token })).status,
    200
  );
  expect('GET  /api/blog-posts   now in the public list', listHas(await req('GET', '/api/blog-posts')), true);
  expect('GET  /api/blog-posts/:id  now readable', (await req('GET', `/api/blog-posts/${postId}`)).status, 200);

  expect(
    'POST :id/unpublish     takes it back off',
    (await req('POST', `/api/blog-posts/${postId}/unpublish`, { token: manager.token })).status,
    200
  );
  expect('GET  /api/blog-posts   gone from the list again', listHas(await req('GET', '/api/blog-posts')), false);

  section('a content manager only controls their own posts');
  expect(
    'PUT  /api/blog-posts/:id  another CM cannot edit it',
    (await req('PUT', `/api/blog-posts/${postId}`, { token: manager2.token, body: { data: { title: 'hijacked' } } })).status,
    403
  );
  expect(
    'POST :id/publish       nor publish it',
    (await req('POST', `/api/blog-posts/${postId}/publish`, { token: manager2.token })).status,
    403
  );
  expect(
    'DELETE /api/blog-posts/:id  nor delete it',
    (await req('DELETE', `/api/blog-posts/${postId}`, { token: manager2.token })).status,
    403
  );
  expect(
    'PUT  /api/blog-posts/:id  but the admin can',
    (await req('PUT', `/api/blog-posts/${postId}`, { token: admin, body: { data: { title: `Edited by admin ${stamp}` } } })).status,
    200
  );
  expect(
    'POST :id/publish       and publish somebody else post',
    (await req('POST', `/api/blog-posts/${postId}/publish`, { token: admin })).status,
    200
  );

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
