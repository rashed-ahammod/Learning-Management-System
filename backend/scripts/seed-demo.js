'use strict';

/**
 * Fills an empty database with something to look at.
 *
 * Not fixtures for the test suite - `check-permissions.js` makes and removes its
 * own data. This is for a fresh clone or a fresh deploy, where the app works
 * perfectly and shows you nothing because there is not a single course in it.
 *
 * Safe to run twice: anything already there is left alone rather than
 * duplicated, so it can be pointed at a running deployment without fear.
 *
 * Usage: start the backend, then `npm run seed:demo`
 */
require('dotenv').config();

const BASE = process.env.SEED_BASE_URL || `http://localhost:${process.env.PORT || 1337}`;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'Demo1234!';

const PEOPLE = [
  { username: 'nadia', email: 'nadia@lms.test', role: 'content-manager' },
  { username: 'rahim', email: 'rahim@lms.test', role: 'instructor' },
  { username: 'sadia', email: 'sadia@lms.test', role: 'student' },
];

const COURSES = [
  {
    owner: 'rahim',
    title: 'Getting Started with React',
    slug: 'getting-started-with-react',
    description:
      'Components, props and state, built up from scratch. By the end you can put a small React app together and understand why it re-renders.',
    lessons: [
      { title: 'What React actually does', content: 'The virtual DOM, and why re-rendering is not the same as repainting.' },
      { title: 'Components and props', content: 'Splitting a page into components, and passing data down through props.' },
      { title: 'State and events', content: 'useState, event handlers, and the rule that state updates are asynchronous.' },
      { title: 'Lists and keys', content: 'Rendering arrays, and why a stable key matters more than people expect.' },
    ],
    quiz: {
      title: 'React basics check',
      questions: [
        { text: 'What does useState return?', options: ['A value only', 'A value and a setter', 'A setter only', 'A promise'], correctIndex: 1 },
        { text: 'Why does a list need a key?', options: ['To sort it', 'To style it', 'So React can match items across renders', 'It is optional'], correctIndex: 2 },
        { text: 'Props are…', options: ['Mutable by the child', 'Read-only in the child', 'Global state', 'A kind of hook'], correctIndex: 1 },
      ],
    },
  },
  {
    owner: 'nadia',
    title: 'REST APIs with Strapi',
    slug: 'rest-apis-with-strapi',
    description:
      'Modelling content, wiring up roles and permissions, and shipping an API you can defend in a code review.',
    lessons: [
      { title: 'Content types and relations', content: 'Designing the schema, and where a relation beats a duplicated field.' },
      { title: 'Roles and permissions', content: 'Why permissions are endpoint-level, and what has to happen in a policy instead.' },
      { title: 'Custom controllers', content: 'Extending the core controller without losing sanitisation.' },
    ],
  },
];

const POSTS = [
  {
    author: 'nadia',
    title: 'How we think about course design',
    slug: 'how-we-think-about-course-design',
    excerpt: 'Short lessons, one idea each, and a quiz that checks understanding rather than memory.',
    body: 'Every course here is built around one rule: a lesson should cover a single idea, and you should be able to finish it in a sitting.\n\nThat is why lessons are short and numbered. Progress is per lesson, so putting a course down halfway through costs you nothing.',
    publish: true,
  },
  {
    author: 'nadia',
    title: 'What is coming next term',
    slug: 'what-is-coming-next-term',
    excerpt: 'A look at the courses being written at the moment.',
    body: 'Still being written - this one is a draft, and it is here so you can see that drafts do not show up on the public blog.',
    publish: false,
  },
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
  const existing = await req('GET', `/api/users?filters[email][$eq]=${person.email}`, {
    token: adminToken,
  });

  if (Array.isArray(existing) && existing.length > 0) {
    return { ...person, id: existing[0].id, created: false };
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

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const admin = (await req('POST', '/api/auth/local', {
    body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })).jwt;

  const { roles } = await req('GET', '/api/users-permissions/roles', { token: admin });

  console.log('\nPeople');
  const people = {};
  for (const person of PEOPLE) {
    const result = await ensurePerson(admin, roles, person);
    people[person.username] = result;
    console.log(`  ${result.created ? 'created' : 'already there'.padEnd(7)}  ${person.email.padEnd(20)} ${person.role}`);
  }

  const tokens = {};
  for (const username of Object.keys(people)) {
    tokens[username] = await tokenFor(people[username].email);
  }

  console.log('\nCourses');
  const courseIds = {};
  for (const course of COURSES) {
    const existing = await req('GET', `/api/courses?filters[slug][$eq]=${course.slug}`);

    if (existing.data.length > 0) {
      courseIds[course.slug] = existing.data[0].documentId;
      console.log(`  already there  ${course.title}`);
      continue;
    }

    const token = tokens[course.owner];
    const created = await req('POST', '/api/courses', {
      token,
      body: {
        data: { title: course.title, slug: course.slug, description: course.description },
      },
    });

    courseIds[course.slug] = created.data.documentId;

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

    console.log(
      `  created        ${course.title}  (${course.lessons.length} lessons${course.quiz ? ' + quiz' : ''})`
    );
  }

  console.log('\nEnrolments');
  const firstCourse = courseIds[COURSES[0].slug];
  try {
    await req('POST', '/api/enrollments', {
      token: tokens.sadia,
      body: { data: { course: firstCourse } },
    });
    console.log(`  created        sadia -> ${COURSES[0].title}`);
  } catch (error) {
    console.log(`  already there  sadia -> ${COURSES[0].title}`);
    void error;
  }

  console.log('\nBlog');
  for (const post of POSTS) {
    const existing = await req('GET', `/api/blog-posts?filters[slug][$eq]=${post.slug}&status=draft`, {
      token: tokens[post.author],
    });

    if (existing.data.length > 0) {
      console.log(`  already there  ${post.title}`);
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

    console.log(`  created        ${post.title}  (${post.publish ? 'published' : 'draft'})`);
  }

  console.log(`\nEveryone below shares the password: ${DEMO_PASSWORD}`);
  for (const person of PEOPLE) {
    console.log(`  ${person.email.padEnd(20)} ${person.role}`);
  }
  console.log(`  ${ADMIN_EMAIL.padEnd(20)} admin (your own SEED_ADMIN_PASSWORD)\n`);
}

main().catch((error) => {
  console.error('\nSeeding failed:', error.message);
  console.error(`Is the backend running on ${BASE} ?`);
  process.exit(1);
});
