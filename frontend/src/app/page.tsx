import Link from 'next/link';

import AnimatedNumber from '@/components/AnimatedNumber';
import CourseCard from '@/components/CourseCard';
import CountdownTimer from '@/components/CountdownTimer';
import EmptyState from '@/components/EmptyState';
import HeroMascot from '@/components/HeroMascot';
import Reveal from '@/components/Reveal';
import StickyCta from '@/components/StickyCta';
import { getSession } from '@/lib/auth';
import { listPublishedPosts } from '@/lib/blog';
import { listCourses } from '@/lib/courses';
import { homePathFor } from '@/lib/roles';
import { StrapiError } from '@/lib/strapi';

export const metadata = {
  title: 'LMS — University Admission Prep',
  description:
    'Structured courses, tracked progress and instant-graded quizzes for university admission preparation.',
};

/**
 * The one date this whole page is built around: the entrance test.
 *
 * Not invented for the landing page - it is the same date announced in the
 * "Admission Test 2026: Key Dates" post that ships with the seed data, so the
 * countdown below and the blog agree with each other. If that date is ever
 * changed through the CMS, this constant is the one place to update it too.
 */
const ADMISSION_TEST_DATE = '2026-11-14T09:00:00';

/**
 * Breaks a section out to the full width of the viewport, regardless of the
 * max-w-5xl container every other page sits inside.
 *
 * The trick: at 50% from the left, then pulled back by half the viewport
 * width, the section's edges land exactly on the screen edges no matter how
 * wide its actual parent is. `overflow-x-clip` on <body> (see layout.tsx) is
 * what stops that from ever producing a horizontal scrollbar.
 */
function FullBleed({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`relative left-1/2 right-1/2 -mx-[50vw] w-screen ${className}`}>
      <div className="mx-auto max-w-5xl px-6">{children}</div>
    </section>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="text-4xl font-bold tracking-tight text-indigo-200" aria-hidden>
      {String(n).padStart(2, '0')}
    </span>
  );
}

/** A small set of hand-drawn icons, kept simple rather than pulling in a library for a handful of glyphs. */
const icons = {
  book: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.5c-1.5-1-4-1.5-6-1.5v13c2 0 4.5.5 6 1.5m0-13c1.5-1 4-1.5 6-1.5v13c-2 0-4.5.5-6 1.5m0-13v13"
    />
  ),
  chart: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V9m6 10V5m6 14v-7m-13 7h14" />
  ),
  users: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 11a3 3 0 100-6 3 3 0 000 6zm0 2c-3 0-6 1.5-6 4v1h12v-1c0-2.5-3-4-6-4zm7-6a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm1 1.5c1.8.4 3.5 1.6 3.5 3.5v1h-4"
    />
  ),
  shield: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
    />
  ),
  compass: <circle cx="12" cy="12" r="9" strokeLinecap="round" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
    </>
  ),
  flag: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 21V4m0 1l6-1.5c1.5-.4 3 0 4.5.5l.5.2c1.5.5 3 .3 4.5-.3v10c-1.5.6-3 .8-4.5.3l-.5-.2c-1.5-.5-3-.9-4.5-.5L5 15"
    />
  ),
  check: <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />,
  cross: <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />,
  bolt: <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />,
};

function Icon({ name, className = 'h-5 w-5' }: { name: keyof typeof icons; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      {icons[name]}
    </svg>
  );
}

export default async function HomePage() {
  const session = await getSession();

  let courses;
  try {
    courses = await listCourses();
  } catch (error) {
    // The catalogue is the first thing anyone sees, so a backend that is not
    // running should say so plainly rather than throw a stack trace at them.
    return (
      <EmptyState title="The course catalogue is unavailable">
        {error instanceof StrapiError
          ? error.message
          : 'Could not reach the backend. Is Strapi running?'}
      </EmptyState>
    );
  }

  // Real counts, not placeholders - both come from the same public endpoints
  // the catalogue below already calls, fetched fresh on every request (see
  // strapiFetch's no-store default). A stats section that quietly went stale
  // the moment a course was added would be worse than not having one.
  const totalLessons = courses.reduce((sum, course) => sum + (course.lessons?.length ?? 0), 0);
  const posts = await listPublishedPosts().catch(() => []);

  const primaryCta = session
    ? { href: homePathFor(session.role), label: 'Go to your dashboard' }
    : { href: '/signup', label: "Get started — it's free" };

  return (
    <div className="-mt-10 -mx-6">
      {/* ---------- Hero ---------- */}
      <FullBleed className="overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
        {/* Three soft, blurred colour blobs drifting at different speeds, plus a
            faint grid - a small "aurora" effect, all pure CSS. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl motion-safe:animate-[float_9s_ease-in-out_infinite]"
        />
        <div
          aria-hidden
          style={{ animationDelay: '-3s' }}
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl motion-safe:animate-[float_11s_ease-in-out_infinite]"
        />
        <div
          aria-hidden
          style={{ animationDelay: '-6s' }}
          className="pointer-events-none absolute top-1/3 left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl motion-safe:animate-[float_13s_ease-in-out_infinite]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'linear-gradient(to bottom, black, transparent)',
          }}
        />

        <div className="relative grid gap-6 py-20 sm:py-28 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Applications are open — University admission prep, structured
            </span>

            <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Most applicants prepare from scattered PDFs, old group chats and guesswork.
            </h1>
            <p className="mt-3 max-w-2xl bg-[length:200%_auto] bg-gradient-to-r from-indigo-300 via-violet-300 to-sky-300 bg-clip-text text-4xl font-semibold tracking-tight text-transparent motion-safe:animate-[gradient-pan_6s_ease_infinite] sm:text-5xl">
              This is where that stops.
            </p>

            <p className="mt-6 max-w-xl text-base text-slate-300">
              One platform where instructors build structured courses, students track their
              progress lesson by lesson, and every quiz is graded the instant it&apos;s
              submitted — so nobody walks into test day not knowing where they stand.
            </p>

            <div id="hero-cta" className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={primaryCta.href}
                className="group inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-200"
              >
                {primaryCta.label}
                <span aria-hidden className="transition group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
              <Link
                href="#courses"
                className="rounded-md border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Browse courses
              </Link>
            </div>

            {/* Live countdown to the same test date the blog announces. */}
            <div className="mt-14 inline-flex flex-col gap-4 rounded-xl border border-indigo-400/20 bg-gradient-to-r from-indigo-500/10 via-white/5 to-sky-400/10 px-6 py-5 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-8">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                  <Icon name="bolt" className="h-3.5 w-3.5 text-amber-400" />
                  Time until the entrance test
                </p>
                <p className="mt-1 text-xs text-slate-500">14 November — same date as the blog</p>
              </div>
              <div className="h-px w-full bg-white/10 sm:h-10 sm:w-px" />
              <CountdownTimer targetIso={ADMISSION_TEST_DATE} />
            </div>

            {/* Real numbers, pulled from the same public API the catalogue below uses. */}
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-8">
              <div>
                <dt className="text-xs text-slate-400">Courses</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  <AnimatedNumber value={courses.length} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Lessons</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  <AnimatedNumber value={totalLessons} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Updates published</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  <AnimatedNumber value={posts.length} />
                </dd>
              </div>
            </dl>
          </div>

          <HeroMascot />
        </div>
      </FullBleed>

      <div className="mx-auto max-w-5xl px-6">
        {/* ---------- Why now ---------- */}
        <section className="border-b border-slate-200 py-14">
          <Reveal className="flex flex-col items-start gap-4 rounded-lg border border-amber-200 bg-amber-50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Icon name="bolt" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">
                  There is one test date. The next chance is a year away.
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  Every day spent without a plan is a day a better-prepared applicant already
                  has one. Starting now, with weeks left, is the difference an organised course
                  makes.
                </p>
              </div>
            </div>
            <Link
              href={primaryCta.href}
              className="shrink-0 rounded-md bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
            >
              Start preparing now
            </Link>
          </Reveal>
        </section>

        {/* ---------- Problem / solution ---------- */}
        <section className="py-20">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            The problem with how most people prepare
          </h2>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Reveal className="rounded-lg border border-slate-200 bg-white p-6">
              <p className="text-sm font-medium text-slate-500">Without a structured platform</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                {[
                  'Course material scattered across PDFs, screenshots and forwarded messages',
                  'No way to tell how much of the syllabus you’ve actually covered',
                  'Practice questions with no answer key, or an answer key you have to trust blindly',
                  'Deadline changes that reach some applicants and quietly miss others',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <Icon name="cross" className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal
              delayMs={150}
              className="rounded-lg border border-indigo-900 bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-950 p-6 text-white shadow-lg shadow-indigo-900/20"
            >
              <p className="text-sm font-medium text-indigo-200">With this platform</p>
              <ul className="mt-4 space-y-3 text-sm">
                {[
                  'Every subject organised into courses with lessons in a fixed, sensible order',
                  'A progress bar per course that only moves when you actually mark a lesson done',
                  'Quizzes graded on the server the instant you submit — the score can’t be faked either way',
                  'Deadline and policy updates published to one blog everyone can read',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <FullBleed className="border-t border-slate-200 bg-gradient-to-b from-indigo-50/70 via-violet-50/30 to-transparent">
          <section className="py-20">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              How it works
            </h2>

            <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: 'Create your account',
                  body: 'Sign up in under a minute. Every new account starts as a student — no waiting on approval.',
                },
                {
                  title: 'Enrol in a course',
                  body: 'Browse what’s on offer by subject and enrol in whichever ones you need.',
                },
                {
                  title: 'Work through the lessons',
                  body: 'Lessons run in a fixed order. Mark each one complete as you finish it.',
                },
                {
                  title: 'Take the quiz, see your score',
                  body: 'Submit your answers and get marked immediately — no waiting for anyone to grade it.',
                },
              ].map((step, index) => (
                <Reveal key={step.title} delayMs={index * 100}>
                  <StepNumber n={index + 1} />
                  <h3 className="mt-2 font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600">{step.body}</p>
                </Reveal>
              ))}
            </div>
          </section>
        </FullBleed>

        {/* ---------- Built for every role ---------- */}
        <section className="border-t border-slate-200 py-20">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Built for everyone involved, not just the applicant
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: 'users' as const,
                role: 'Student',
                color: 'from-indigo-500 to-blue-600 shadow-indigo-500/30',
                body: 'Enrol in prep courses, work through lessons at your own pace, and take auto-graded quizzes that show exactly where you stand.',
              },
              {
                icon: 'book' as const,
                role: 'Instructor',
                color: 'from-violet-500 to-fuchsia-600 shadow-violet-500/30',
                body: 'Own your subject’s courses and quizzes, and see how every student enrolled in them is actually progressing.',
              },
              {
                icon: 'chart' as const,
                role: 'Content Manager',
                color: 'from-sky-500 to-cyan-600 shadow-sky-500/30',
                body: 'Build and maintain the whole course library, and publish blog updates the moment a deadline or policy changes.',
              },
              {
                icon: 'shield' as const,
                role: 'Admin',
                color: 'from-rose-500 to-orange-600 shadow-rose-500/30',
                body: 'Full oversight: reassign any user’s role, manage every course and post, and see platform-wide stats at a glance.',
              },
            ].map((card, index) => (
              <Reveal key={card.role} delayMs={index * 80}>
                <div className="group h-full rounded-lg border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br text-white shadow-lg transition group-hover:scale-110 ${card.color}`}
                  >
                    <Icon name={card.icon} className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{card.role}</h3>
                  <p className="mt-1.5 text-sm text-slate-600">{card.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- Mission, vision, goal ---------- */}
        <FullBleed className="border-t border-slate-200 bg-gradient-to-b from-violet-50/60 via-sky-50/30 to-transparent">
          <section className="py-20">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Why this exists
            </h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: 'compass' as const,
                  title: 'Mission',
                  color: 'text-indigo-500',
                  body: 'Replace scattered PDFs, outdated group chats and guesswork with one structured programme every applicant can actually track.',
                },
                {
                  icon: 'target' as const,
                  title: 'Vision',
                  color: 'text-fuchsia-500',
                  body: 'A platform where no applicant reaches test day not knowing where they stand, because their preparation was measured, not assumed, from day one.',
                },
                {
                  icon: 'flag' as const,
                  title: 'Goal',
                  color: 'text-emerald-500',
                  body: 'Give every instructor and content manager the tools to build a course once, and know in real time exactly how their students are doing.',
                },
              ].map((card, index) => (
                <Reveal key={card.title} delayMs={index * 100}>
                  <div className="rounded-lg p-1 transition hover:-translate-y-0.5">
                    <Icon name={card.icon} className={`h-6 w-6 ${card.color}`} />
                    <h3 className="mt-3 font-semibold">{card.title}</h3>
                    <p className="mt-1.5 text-sm text-slate-600">{card.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        </FullBleed>

        {/* ---------- Course catalogue ---------- */}
        <section id="courses" className="scroll-mt-20 border-t border-slate-200 py-20">
          <h2 className="text-2xl font-semibold tracking-tight">Available courses</h2>
          <p className="mt-2 text-sm text-slate-600">
            {session
              ? 'Browse everything on offer and enrol in whatever looks useful.'
              : 'Browse what is on offer. Sign in to enrol and track your progress.'}
          </p>

          {courses.length === 0 ? (
            <div className="mt-8">
              <EmptyState title="No courses published yet">
                Once a content manager or instructor adds one, it shows up here.
              </EmptyState>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course, index) => (
                <Reveal key={course.documentId} delayMs={(index % 3) * 80} className="h-full">
                  <CourseCard course={course} />
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ---------- Final CTA ---------- */}
      <FullBleed className="relative mt-4 overflow-hidden bg-[length:200%_200%] bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 text-white motion-safe:animate-[gradient-pan_10s_ease_infinite]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <Reveal className="relative py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Ready to start preparing?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-indigo-100">
            It takes less than a minute to create an account, and every course on this platform
            is one click away from there.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href={primaryCta.href}
              className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-indigo-700 transition hover:scale-[1.03] hover:bg-indigo-50"
            >
              {primaryCta.label}
            </Link>
            <Link
              href="/blog"
              className="rounded-md border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Read the latest updates
            </Link>
          </div>
        </Reveal>
      </FullBleed>

      <StickyCta href={primaryCta.href} label={primaryCta.label} />
    </div>
  );
}
