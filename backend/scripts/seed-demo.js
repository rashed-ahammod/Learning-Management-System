'use strict';

/**
 * Fills an empty database with a coherent, demo-ready platform.
 *
 * Not fixtures for the test suite - check-permissions.js makes and removes its
 * own data. This is for a fresh clone or a fresh deploy, where the app works
 * perfectly and shows you nothing because there is not a single course in it.
 *
 * The content is a university admission-prep programme, and it is deliberately
 * *unbalanced*: two instructors who own different courses, a student partway
 * through one, another who has finished, quiz attempts already on record, and a
 * blog post still in draft. A demo where everything sits at 0% shows a progress
 * bar; a demo where one student is at 60% shows progress tracking.
 *
 * Safe to run twice: anything already there is left alone rather than
 * duplicated, so it can be pointed at a running deployment without fear.
 *
 * Usage: start the backend, then `npm run seed:demo`
 *        to clear what a previous run made first: `npm run seed:reset`
 */
require('dotenv').config();

const BASE = process.env.SEED_BASE_URL || `http://localhost:${process.env.PORT || 1337}`;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'Demo1234!';
const RESET = process.argv.includes('--reset');

const PEOPLE = [
  { username: 'nusrat', email: 'nusrat@university.test', role: 'content-manager', of: 'Admissions Office' },
  { username: 'kamrul', email: 'kamrul@university.test', role: 'instructor', of: 'Mathematics' },
  { username: 'farhana', email: 'farhana@university.test', role: 'instructor', of: 'English' },
  { username: 'sadia', email: 'sadia@university.test', role: 'student', of: 'Applicant' },
  { username: 'tanvir', email: 'tanvir@university.test', role: 'student', of: 'Applicant' },
  { username: 'mim', email: 'mim@university.test', role: 'student', of: 'Applicant' },
];

const COURSES = [
  {
    owner: 'kamrul',
    title: 'Admission Test: Mathematics',
    slug: 'admission-test-mathematics',
    description:
      'The mathematics section of the entrance test, topic by topic. Algebra, geometry and the timing strategy that decides most scores.',
    lessons: [
      {
        title: 'What the maths section actually tests',
        content:
          'Thirty questions in forty minutes. That works out at eighty seconds each, which is the single most important fact about this paper.\n\nThe syllabus is narrower than most applicants expect: algebra, coordinate geometry, trigonometry and a small amount of probability. There is no calculus. Questions are weighted equally, so a hard question is worth exactly as much as an easy one - and that shapes the strategy in the last lesson.',
      },
      {
        title: 'Algebra: the five patterns that keep coming back',
        content:
          'Quadratics, simultaneous equations, indices, logarithms and sequences. Past papers reuse these five relentlessly.\n\nWork through the factorisation drills until they are automatic. In a timed paper you cannot afford to derive the quadratic formula - you need to recognise the shape and move.',
      },
      {
        title: 'Coordinate geometry and trigonometry',
        content:
          'Straight lines, circles, and the unit circle identities.\n\nMost geometry questions here are secretly algebra questions wearing a diagram. Draw it, put coordinates on it, and it usually collapses into something from the previous lesson.',
      },
      {
        title: 'Probability and statistics',
        content:
          'Only three or four marks, but they are among the fastest marks on the paper if you know the definitions cold.\n\nCombinations and permutations account for most of them. Learn when order matters - that single distinction settles the majority of these questions.',
      },
      {
        title: 'Timing strategy: the three-pass method',
        content:
          'First pass: answer everything you can do in under a minute. Second pass: the ones you know how to do but that take longer. Third pass: what is left.\n\nBecause every question carries the same mark, spending four minutes on a hard one costs you three easy ones. Most applicants lose more marks to timing than to knowledge.',
      },
    ],
    quiz: {
      title: 'Mathematics readiness check',
      questions: [
        {
          text: 'How long, on average, can you spend on each question in the maths section?',
          options: ['About 40 seconds', 'About 80 seconds', 'About 2 minutes', 'There is no time limit'],
          correctIndex: 1,
        },
        {
          text: 'Which topic is NOT on the syllabus?',
          options: ['Coordinate geometry', 'Logarithms', 'Calculus', 'Probability'],
          correctIndex: 2,
        },
        {
          text: 'In the three-pass method, what belongs to the first pass?',
          options: [
            'The highest-scoring questions',
            'Anything answerable in under a minute',
            'The questions in order',
            'Whatever you find hardest, while you are fresh',
          ],
          correctIndex: 1,
        },
        {
          text: 'Why is spending four minutes on one hard question a poor trade?',
          options: [
            'Hard questions are marked more strictly',
            'All questions carry the same mark, so it costs three easy ones',
            'The paper is negatively marked',
            'It is not a poor trade',
          ],
          correctIndex: 1,
        },
      ],
    },
  },
  {
    owner: 'farhana',
    title: 'Admission Test: English',
    slug: 'admission-test-english',
    description:
      'Reading comprehension, grammar and the written task. How the English paper is marked, and what markers are actually looking for.',
    lessons: [
      {
        title: 'How the English paper is structured',
        content:
          'Two sections: forty multiple-choice questions on grammar and comprehension, then one written task of around three hundred words.\n\nThe written task is worth a third of the marks but takes most applicants half the time. Budget accordingly.',
      },
      {
        title: 'Reading comprehension under time pressure',
        content:
          'Read the questions before the passage. It feels backwards and it works: you read the passage looking for something rather than trying to remember all of it.\n\nMost comprehension questions are answerable from one or two sentences. Find those sentences.',
      },
      {
        title: 'The grammar rules that are actually tested',
        content:
          'Subject-verb agreement, tense consistency, pronoun reference, and parallel structure. Those four account for the large majority of the grammar questions.\n\nEverything else is long tail. Master these before broadening.',
      },
      {
        title: 'The written task: what markers look for',
        content:
          'A clear position, three supported points, and a conclusion that does not simply repeat the introduction.\n\nMarkers are not looking for elaborate vocabulary. They are looking for a structure they can follow. A plain essay with a clear spine outscores an ornate one that wanders.',
      },
    ],
    quiz: {
      title: 'English readiness check',
      questions: [
        {
          text: 'What proportion of the English marks does the written task carry?',
          options: ['About a tenth', 'About a quarter', 'About a third', 'Half'],
          correctIndex: 2,
        },
        {
          text: 'What does this course recommend for reading comprehension?',
          options: [
            'Read the passage twice before looking at questions',
            'Read the questions before the passage',
            'Skim only the first and last paragraph',
            'Answer in the order the questions appear',
          ],
          correctIndex: 1,
        },
        {
          text: 'Which is NOT one of the four heavily tested grammar areas?',
          options: ['Subject-verb agreement', 'Parallel structure', 'Use of semicolons', 'Tense consistency'],
          correctIndex: 2,
        },
      ],
    },
  },
  {
    owner: 'nusrat',
    title: 'How to Apply: Step by Step',
    slug: 'how-to-apply-step-by-step',
    description:
      'The application itself, from creating an account to uploading documents. Every deadline and every document, in the order you need them.',
    lessons: [
      {
        title: 'Before you start: what to have ready',
        content:
          'Your secondary school transcript, national ID or passport, a recent photograph meeting the size requirements, and a working email address you check daily.\n\nApplications are most often delayed by a photograph in the wrong format. Sort that first, not last.',
      },
      {
        title: 'Creating your applicant account',
        content:
          'One account per applicant. Use a personal email address rather than a school one - school accounts are frequently closed after graduation, and that is where your offer letter goes.',
      },
      {
        title: 'Filling in the form without losing work',
        content:
          'The form saves each section as you complete it, not continuously. Finish a section before leaving the page.\n\nAcademic history is where most corrections are needed later. Enter grades exactly as they appear on the transcript, including any subject you failed - omissions are treated far more seriously than a poor grade.',
      },
      {
        title: 'Uploading documents and submitting',
        content:
          'PDF only, under 2MB each, named clearly.\n\nOnce submitted the application cannot be edited, so read the summary page properly. You will receive a confirmation email with a tracking number within one hour; if it does not arrive, check spam before contacting the office.',
      },
    ],
  },
  {
    owner: 'nusrat',
    title: 'Scholarships and Financial Aid',
    slug: 'scholarships-and-financial-aid',
    description:
      'What support exists, who qualifies, and how the means assessment works. Read this before you assume you cannot afford to apply.',
    lessons: [
      {
        title: 'The three kinds of support',
        content:
          'Merit scholarships based on the entrance test, need-based grants assessed on household income, and subject bursaries funded by individual departments.\n\nThey are not mutually exclusive. A strong applicant from a low-income household can hold all three.',
      },
      {
        title: 'How the means assessment works',
        content:
          'Household income, number of dependants, and any exceptional circumstances you declare.\n\nThe assessment is done by a separate office and is not visible to the admissions panel. Declaring financial need does not weaken your application.',
      },
      {
        title: 'Deadlines and what happens if you miss them',
        content:
          'Scholarship applications close two weeks after the admission deadline, not at the same time - a distinction that costs applicants every year.\n\nLate applications are considered only where the delay was outside your control and documented.',
      },
    ],
  },
];

const POSTS = [
  {
    author: 'nusrat',
    title: 'Admission Test 2026: key dates',
    slug: 'admission-test-2026-key-dates',
    excerpt: 'Applications open 1 September. The test is on 14 November. Everything else falls between those two.',
    body:
      'Applications open on 1 September and close at 11:59 PM on 20 October. There is no extension.\n\nThe entrance test is on 14 November. Admit cards are released a week before through your applicant account - they are not posted.\n\nResults are published on 5 December, and scholarship decisions follow two weeks later. Applicants often assume the two arrive together; they do not.',
    publish: true,
  },
  {
    author: 'nusrat',
    title: 'What to bring on test day',
    slug: 'what-to-bring-on-test-day',
    excerpt: 'Admit card, photo ID, and nothing else you would mind leaving outside the hall.',
    body:
      'Bring your printed admit card and the photo ID you used on the application. A digital admit card on a phone is not accepted.\n\nCalculators, watches and phones are not permitted in the hall. There is storage outside, but it is not secured - leave anything valuable at home.\n\nDoors close fifteen minutes before the start. Applicants arriving after that are not admitted, and this is applied strictly.',
    publish: true,
  },
  {
    author: 'nusrat',
    title: 'Changes to the interview stage',
    slug: 'changes-to-the-interview-stage',
    excerpt: 'Being drafted by the admissions committee - not yet public.',
    body:
      'This post is still a draft. It is here so the draft and publish flow can be demonstrated: it does not appear on the public blog, and its URL returns a 404 to anyone who is not an admin or content manager.',
    publish: false,
  },
];

/**
 * Who is enrolled in what, and how far through.
 *
 * `completeLessons` is a count, not a list, so the numbers read the way the
 * brief's own example does: 3 of 5 lessons done is 60%.
 */
const ENROLMENTS = [
  { student: 'sadia', course: 'admission-test-mathematics', completeLessons: 3, attempts: [4, 2] },
  { student: 'sadia', course: 'admission-test-english', completeLessons: 1 },
  { student: 'sadia', course: 'how-to-apply-step-by-step', completeLessons: 0 },
  { student: 'tanvir', course: 'admission-test-mathematics', completeLessons: 5, attempts: [3] },
  { student: 'tanvir', course: 'scholarships-and-financial-aid', completeLessons: 2 },
  { student: 'mim', course: 'how-to-apply-step-by-step', completeLessons: 4 },
];

async function req(method, path, { token, body } = {}) {
  const response = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    // 204s have no body
  }

  if (!response.ok) {
    const message = json?.error?.message || `${response.status}`;
    throw new Error(`${method} ${path} failed: ${message}`);
  }

  return json;
}

async function ensurePerson(adminToken, roles, person) {
  /**
   * Look for them by username as well as email.
   *
   * Strapi enforces uniqueness on both. Checking only the email means a run
   * that changes an address - or a second run after somebody edited one - tries
   * to create an account whose username is still taken, and fails on a
   * constraint rather than recognising the person is already there.
   */
  const [byEmail, byUsername] = await Promise.all([
    req('GET', `/api/users?filters[email][$eq]=${person.email}`, { token: adminToken }),
    req('GET', `/api/users?filters[username][$eq]=${person.username}`, { token: adminToken }),
  ]);

  const existing = (Array.isArray(byEmail) ? byEmail : [])[0] ?? (Array.isArray(byUsername) ? byUsername : [])[0];

  if (existing) {
    // Report the address that actually signs in, which may not be the one above.
    return { ...person, email: existing.email, id: existing.id, created: false };
  }

  const role = roles.find((r) => r.type === person.role);
  const created = await req('POST', '/api/users', {
    token: adminToken,
    body: {
      username: person.username,
      email: person.email,
      password: DEMO_PASSWORD,
      role: role.id,
      confirmed: true,
    },
  });

  return { ...person, id: created.id, created: true };
}

async function tokenFor(email) {
  const auth = await req('POST', '/api/auth/local', {
    body: { identifier: email, password: DEMO_PASSWORD },
  });

  return auth.jwt;
}

/** Removes only what a previous run of this script created. */
async function reset(adminToken) {
  console.log('\nClearing previously seeded content');

  for (const course of COURSES) {
    const found = await req('GET', `/api/courses?filters[slug][$eq]=${course.slug}`);
    for (const row of found.data) {
      // Deleting a course cascades to its lessons, quizzes, enrolments,
      // progress and attempts - see the course lifecycles file.
      await req('DELETE', `/api/courses/${row.documentId}`, { token: adminToken });
      console.log(`  removed course  ${row.title}`);
    }
  }

  for (const post of POSTS) {
    const found = await req('GET', `/api/blog-posts?filters[slug][$eq]=${post.slug}&status=draft`, {
      token: adminToken,
    });
    for (const row of found.data) {
      await req('DELETE', `/api/blog-posts/${row.documentId}`, { token: adminToken });
      console.log(`  removed post    ${row.title}`);
    }
  }
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const admin = (
    await req('POST', '/api/auth/local', {
      body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
  ).jwt;

  const { roles } = await req('GET', '/api/users-permissions/roles', { token: admin });

  if (RESET) await reset(admin);

  console.log('\nPeople');
  const people = {};
  for (const person of PEOPLE) {
    const result = await ensurePerson(admin, roles, person);
    people[person.username] = result;
    console.log(
      `  ${(result.created ? 'created' : 'exists').padEnd(8)} ${person.email.padEnd(26)} ${person.role.padEnd(16)} ${person.of}`
    );
  }

  const tokens = {};
  for (const username of Object.keys(people)) {
    tokens[username] = await tokenFor(people[username].email);
  }


  console.log('\nCourses');
  const courses = {};
  for (const course of COURSES) {
    const existing = await req('GET', `/api/courses?filters[slug][$eq]=${course.slug}`);

    if (existing.data.length > 0) {
      courses[course.slug] = existing.data[0];
      console.log(`  exists    ${course.title}`);
      continue;
    }

    const token = tokens[course.owner];
    const created = await req('POST', '/api/courses', {
      token,
      body: { data: { title: course.title, slug: course.slug, description: course.description } },
    });

    for (const [index, lesson] of course.lessons.entries()) {
      await req('POST', '/api/lessons', {
        token,
        body: {
          data: {
            title: lesson.title,
            content: lesson.content,
            order: index + 1,
            course: created.data.documentId,
          },
        },
      });
    }

    if (course.quiz) {
      await req('POST', '/api/quizzes', {
        token,
        body: { data: { ...course.quiz, course: created.data.documentId } },
      });
    }

    courses[course.slug] = created.data;
    console.log(
      `  created   ${course.title.padEnd(34)} ${course.lessons.length} lessons${course.quiz ? ' + quiz' : ''}  (${course.owner})`
    );
  }

  console.log('\nEnrolments and progress');
  for (const entry of ENROLMENTS) {
    const token = tokens[entry.student];
    const course = courses[entry.course];

    try {
      await req('POST', '/api/enrollments', {
        token,
        body: { data: { course: course.documentId } },
      });
    } catch {
      // already enrolled - the backend rejects duplicates, which is the point
    }

    // Lessons come back in order, so "the first three" is meaningful.
    const full = await req('GET', `/api/courses/${course.documentId}`);
    const lessons = [...(full.data.lessons ?? [])].sort((a, b) => a.order - b.order);

    for (const lesson of lessons.slice(0, entry.completeLessons)) {
      await req('PUT', `/api/lessons/${lesson.documentId}/progress`, {
        token,
        body: { completed: true },
      });
    }

    const summary = await req('GET', `/api/courses/${course.documentId}/progress`, { token });
    console.log(
      `  ${entry.student.padEnd(8)} ${entry.course.padEnd(34)} ${summary.data.completedLessons}/${summary.data.totalLessons} = ${summary.data.percentage}%`
    );

    // Quiz attempts, so the demo has a result history rather than an empty list.
    if (entry.attempts) {
      const quizzes = await req(
        `GET`,
        `/api/quizzes?filters[course][documentId][$eq]=${course.documentId}`,
        { token }
      );
      const quiz = quizzes.data[0];

      if (quiz) {
        for (const correctCount of entry.attempts) {
          const answers = quiz.questions.map((question, index) => ({
            questionId: question.id,
            // The student's copy carries no correct answer, so the script cannot
            // "know" the right option either - it picks index 0 for the ones it
            // wants wrong and relies on the server to mark it. That is the same
            // constraint a real student has.
            selectedIndex: index < correctCount ? 1 : 0,
          }));

          const attempt = await req('POST', `/api/quizzes/${quiz.documentId}/attempts`, {
            token,
            body: { answers },
          });
          console.log(
            `  ${''.padEnd(8)} └─ quiz attempt: ${attempt.data.score}/${attempt.data.totalQuestions} = ${attempt.data.percentage}%`
          );
        }
      }
    }
  }

  console.log('\nBlog');
  for (const post of POSTS) {
    const existing = await req('GET', `/api/blog-posts?filters[slug][$eq]=${post.slug}&status=draft`, {
      token: tokens[post.author],
    });

    if (existing.data.length > 0) {
      console.log(`  exists    ${post.title}`);
      continue;
    }

    const created = await req('POST', '/api/blog-posts', {
      token: tokens[post.author],
      body: {
        data: { title: post.title, slug: post.slug, excerpt: post.excerpt, body: post.body },
      },
    });

    if (post.publish) {
      await req('POST', `/api/blog-posts/${created.data.documentId}/publish`, {
        token: tokens[post.author],
      });
    }

    console.log(`  created   ${post.title.padEnd(38)} ${post.publish ? 'published' : 'DRAFT'}`);
  }

  console.log(`\nEveryone below shares the password: ${DEMO_PASSWORD}`);
  for (const person of PEOPLE) {
    // The address that actually signs in, which is not always the one this
    // script asked for - an account matched by username keeps its own email,
    // and printing the intended one would hand out a login that fails.
    const { email } = people[person.username];
    console.log(`  ${email.padEnd(26)} ${person.role.padEnd(16)} ${person.of}`);
  }
  console.log(`  ${ADMIN_EMAIL.padEnd(26)} ${'admin'.padEnd(16)} (your own SEED_ADMIN_PASSWORD)\n`);
}

main().catch((error) => {
  console.error('\nSeeding failed:', error.message);
  console.error(`Is the backend running on ${BASE} ?`);
  process.exit(1);
});
