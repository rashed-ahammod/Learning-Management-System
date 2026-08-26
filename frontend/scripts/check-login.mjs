/**
 * Signs in through the real form and checks what comes back.
 *
 * No browser involved. The login form is server-rendered with its action wired
 * up as hidden fields, because a server action has to keep working when
 * JavaScript does not - so submitting those fields is exactly what a browser
 * with scripting off would do, and it exercises the whole path: form -> server
 * action -> Strapi -> session cookie -> redirect.
 *
 * Needs both halves running: Strapi on 1337 and this app on 3000.
 * Usage: npm run check:login
 */
const BASE = process.env.CHECK_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.CHECK_ADMIN_EMAIL || 'admin@lms.test';
const PASSWORD = process.env.CHECK_ADMIN_PASSWORD || 'Admin123!';

let passed = 0;
let failed = 0;

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

const unescapeHtml = (value) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');

async function submitLogin(identifier, password) {
  const html = await (await fetch(`${BASE}/login`)).text();
  const form = new FormData();

  // The $ACTION_* fields are how the form tells Next which server action to run.
  for (const match of html.matchAll(/<input type="hidden" name="(\$ACTION[^"]*)"(?: value="([^"]*)")?\s*\/>/g)) {
    form.append(match[1], unescapeHtml(match[2] ?? ''));
  }

  form.append('identifier', identifier);
  form.append('password', password);

  const response = await fetch(`${BASE}/login`, { method: 'POST', body: form, redirect: 'manual' });
  const cookies = response.headers.getSetCookie?.() ?? [];
  const session = cookies.find((cookie) => cookie.startsWith('lms_session='));

  return {
    status: response.status,
    location: response.headers.get('location'),
    sessionCookie: session ?? null,
    body: await response.text(),
  };
}

async function run() {
  console.log('\n--- signing in with good credentials ---');
  const good = await submitLogin(EMAIL, PASSWORD);

  expect('POST /login    redirects', good.status, 303);
  expect('     to the admin landing page', good.location, '/admin');
  expect('     and sets a session cookie', Boolean(good.sessionCookie), true);

  const attributes = (good.sessionCookie ?? '').split(';').map((part) => part.trim().toLowerCase());
  expect('     the cookie is httpOnly', attributes.includes('httponly'), true);
  expect('     and sameSite=lax', attributes.includes('samesite=lax'), true);

  const value = (good.sessionCookie ?? '').split(';')[0].split('=').slice(1).join('=');
  const session = JSON.parse(decodeURIComponent(atob(value)));

  expect('     it carries the role from Strapi', session.role, 'admin');
  expect('     and a real JWT', session.jwt?.startsWith('ey'), true);

  const cookie = (good.sessionCookie ?? '').split(';')[0];
  const admin = await fetch(`${BASE}/admin`, { headers: { cookie }, redirect: 'manual' });
  expect('GET  /admin    the cookie gets you in', admin.status, 200);

  console.log('\n--- signing in with the wrong password ---');
  const bad = await submitLogin(EMAIL, 'DefinitelyNotThePassword!');

  expect('POST /login    no redirect', bad.status, 200);
  expect('     and no session cookie', bad.sessionCookie, null);
  expect(
    '     the error from Strapi is shown',
    /invalid identifier or password/i.test(bad.body),
    true
  );

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error('\nCould not run the checks:', error.message);
  console.error(`Are both Strapi and the frontend running? (${BASE})`);
  process.exit(1);
});
