/**
 * The shapes this app actually receives from Strapi.
 *
 * Written by hand rather than generated, and narrower than the database schema
 * on purpose: these describe what the controllers *return*, which is not the
 * same thing. A lesson inside a course has no `content` here, for instance,
 * because the course endpoint deliberately omits it - so the type stops anyone
 * writing `course.lessons[0].content` and wondering why it is undefined.
 */

export type Paginated<T> = {
  data: T[];
  meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } };
};

export type Single<T> = { data: T };

export type Author = {
  id: number;
  username: string;
};

/** A lesson as it appears in a course listing: enough to show a syllabus. */
export type SyllabusLesson = {
  id: number;
  documentId: string;
  title: string;
  order: number;
};

export type Course = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  owner: Author | null;
  lessons: SyllabusLesson[];
  createdAt: string;
  updatedAt: string;
};

/** A lesson fetched on its own, which only happens once you are enrolled. */
export type Lesson = SyllabusLesson & {
  content: string | null;
  videoUrl: string | null;
};

export type Enrollment = {
  id: number;
  documentId: string;
  course: Course | null;
  createdAt: string;
};

export type CourseProgress = {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  completedLessonIds: string[];
};

export type StudentProgress = {
  studentId: number;
  username: string;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
};

/**
 * A question as the browser receives it.
 *
 * `correctIndex` is optional in the type because it is optional in the
 * response: the backend builds a student's copy without it. Making it optional
 * here means the compiler will not let the quiz-taking UI read it by accident -
 * it has to be narrowed first, and the only place that narrowing succeeds is
 * staff-facing code.
 */
export type QuizQuestion = {
  id: number;
  text: string;
  options: string[];
  correctIndex?: number;
};

export type Quiz = {
  id: number;
  documentId: string;
  title: string;
  questions: QuizQuestion[];
  course: { documentId: string; title: string } | null;
};

export type AttemptAnswer = {
  questionId: number;
  selectedIndex: number | null;
  correct: boolean;
};

export type QuizAttempt = {
  id: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: AttemptAnswer[];
  submittedAt: string;
};

export type BlogPost = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  coverImageUrl: string | null;
  author: Author | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * A post in the management list, with whether a published version exists.
 *
 * That flag cannot come from the post itself. With draft and publish switched
 * on, every document has a draft, and the draft always reports publishedAt as
 * null - so "is this live?" is answered by asking Strapi for the published list
 * separately and seeing which ids appear in it.
 */
export type ManagedPost = {
  post: BlogPost;
  published: boolean;
};

export type PlatformStats = {
  users: { total: number; byRole: Record<string, number> };
  courses: number;
  lessons: number;
  enrollments: number;
  quizzes: number;
  quizAttempts: number;
  lessonsCompleted: number;
  blogPosts: { total: number; published: number; drafts: number };
};

/**
 * A user as the admin screens see them.
 *
 * The users-permissions endpoints answer with a bare array and a flat object -
 * no { data } wrapper and no attributes nesting - unlike everything under
 * /api/<content-type>. Worth stating, because it is the one place in this app
 * where the response shape is different.
 */
export type ManagedUser = {
  id: number;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  role: { id: number; name: string; type: string } | null;
};

export type AssignableRole = { id: number; name: string; type: string };
