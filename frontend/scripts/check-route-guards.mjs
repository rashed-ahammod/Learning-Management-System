/**
 * Checks that the proxy sends each role to the right place.
 *
 * This covers routing, not security. The session cookie is forged here on
 * purpose - which is exactly the point being made: a cookie is something the
 * user controls, so passing these proves the app *routes* correctly, and the
 * backend's own `npm run check:permissions` is what proves nothing leaks.
 *
 * Usage: start the frontend, then `npm run check:guards`
 */
const BASE = process.env.CHECK_BASE_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;

function cookieFor(role) {
  const session = {
    jwt: 'not-a-real-token',
    userId: 1,
    username: `test-${role}`,
    email: `${role}@lms.test`,
    role,
  };

  return `lms_session=${btoa(encodeURIComponent(JSON.stringify(session)))}`;
}

async function go(path, role) {
  const response = await fetch(BASE + path, {
    redirect: 'manual',
    headers: role ? { cookie: cookieFor(role) } : {},
  });

  const location = response.headers.get('location');

  return {
    status: response.status,
    // Redirects come back absolute; only the path is interesting.
    to: location ? new URL(location, BASE).pathname + new URL(location, BASE).search : null,
  };
}

function expect(label, actual, wanted) {
  const ok = actual === wanted;
  const detail = ok ? '' : `   (expected ${wanted})`;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${actual}${detail}`);
  if (ok) {
    passed += 1;
  } else {
    failed += 1;
  }
}

function section(name) {
  console.log(`\n--- ${name} ---`);
}

async function run() {
  section('open to everyone');
  expect('GET /          logged out', (await go('/')).status, 200);
  expect('GET /blog      logged out', (await go('/blog')).status, 200);
  expect('GET /login     logged out', (await go('/login')).status, 200);
  expect('GET /signup    logged out', (await go('/signup')).status, 200);

  section('signed out, asking for a guarded page');
  expect('GET /manage    -> login, remembering where', (await go('/manage')).to, '/login?next=%2Fmanage');
  expect('GET /admin     -> login', (await go('/admin')).to, '/login?next=%2Fadmin');
  expect('GET /my-courses -> login', (await go('/my-courses')).to, '/login?next=%2Fmy-courses');

  section('a student');
  expect('GET /my-courses  allowed', (await go('/my-courses', 'student')).status, 200);
  // ...but "allowed" only means the page rendered. The cookie above is forged,
  // so Strapi rejects the token inside it and the page comes back with nothing
  // in it. This is the whole point: the proxy decides which page, the backend
  // decides what is on it.
  const forged = await fetch(`${BASE}/my-courses`, { headers: { cookie: cookieFor('student') } });
  const forgedHtml = await forged.text();
  expect('     but a forged cookie gets no data', /session is no longer valid/i.test(forgedHtml), true);
  expect('GET /manage      turned away', (await go('/manage', 'student')).to, '/unauthorized');
  expect('GET /admin       turned away', (await go('/admin', 'student')).to, '/unauthorized');
  expect('GET /dashboard   sent to their own page', (await go('/dashboard', 'student')).to, '/my-courses');

  section('an instructor');
  expect('GET /manage      allowed', (await go('/manage', 'instructor')).status, 200);
  expect('GET /admin       turned away', (await go('/admin', 'instructor')).to, '/unauthorized');
  expect('GET /my-courses  turned away', (await go('/my-courses', 'instructor')).to, '/unauthorized');
  expect('GET /dashboard   sent to manage', (await go('/dashboard', 'instructor')).to, '/manage');

  section('a content manager');
  expect('GET /manage      allowed', (await go('/manage', 'content-manager')).status, 200);
  expect('GET /admin       turned away', (await go('/admin', 'content-manager')).to, '/unauthorized');
  expect('GET /manage/blog allowed', (await go('/manage/blog', 'content-manager')).status, 200);

  section('the blog is narrower than the rest of /manage');
  // /manage/blog has to beat /manage, which is why the rules are sorted by
  // prefix length rather than left in the order they were typed.
  expect('GET /manage/blog an instructor may not', (await go('/manage/blog', 'instructor')).to, '/unauthorized');
  expect('GET /manage      but courses are fine', (await go('/manage', 'instructor')).status, 200);
  expect('GET /manage/blog nor a student', (await go('/manage/blog', 'student')).to, '/unauthorized');
  expect('GET /manage/blog an admin may', (await go('/manage/blog', 'admin')).status, 200);
  expect(
    'GET /manage/blog/new inherits the same rule',
    (await go('/manage/blog/new', 'instructor')).to,
    '/unauthorized'
  );

  section('an admin');
  expect('GET /admin       allowed', (await go('/admin', 'admin')).status, 200);
  expect('GET /manage      allowed too', (await go('/manage', 'admin')).status, 200);
  expect('GET /dashboard   sent to admin', (await go('/dashboard', 'admin')).to, '/admin');

  section('already signed in');
  expect('GET /login       no point showing it', (await go('/login', 'student')).to, '/dashboard');
  expect('GET /signup      likewise', (await go('/signup', 'admin')).to, '/dashboard');

  section('a cookie that makes no sense');
  const junk = await fetch(`${BASE}/admin`, {
    redirect: 'manual',
    headers: { cookie: 'lms_session=not-base64-at-all' },
  });
  expect(
    'GET /admin       treated as signed out',
    new URL(junk.headers.get('location'), BASE).pathname,
    '/login'
  );

  const wrongRole = `lms_session=${btoa(encodeURIComponent(JSON.stringify({ jwt: 'x', role: 'superuser' })))}`;
  const invented = await fetch(`${BASE}/admin`, { redirect: 'manual', headers: { cookie: wrongRole } });
  expect(
    'GET /admin       invented role rejected',
    new URL(invented.headers.get('location'), BASE).pathname,
    '/login'
  );

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error('\nCould not run the checks:', error.message);
  console.error(`Is the frontend running on ${BASE} ?`);
  process.exit(1);
});
