'use server';

import { revalidatePath } from 'next/cache';

import { getSession } from './auth';
import { StrapiError, strapiFetch } from './strapi';
import type { QuizAttempt } from './types';

export type QuizFormState = { error: string | null; saved?: boolean };
export type AttemptState = { error: string | null; result?: QuizAttempt };

type DraftQuestion = { text: string; options: string[]; correctIndex: number };

/**
 * Reads the question rows back out of the form.
 *
 * The fields are named q0-text, q0-opt0, q0-correct and so on, rather than the
 * whole thing being posted as one JSON blob. That keeps the form submittable as
 * an ordinary form - JavaScript is needed to add and remove rows, but the rows
 * already on screen work without it.
 */
function readQuestions(formData: FormData): { questions: DraftQuestion[]; error: string | null } {
  const questions: DraftQuestion[] = [];

  for (let q = 0; formData.has(`q${q}-text`); q += 1) {
    const label = `Question ${q + 1}`;
    const text = String(formData.get(`q${q}-text`) ?? '').trim();

    const rawOptions: string[] = [];
    for (let o = 0; formData.has(`q${q}-opt${o}`); o += 1) {
      rawOptions.push(String(formData.get(`q${q}-opt${o}`) ?? '').trim());
    }

    const chosen = Number(formData.get(`q${q}-correct`));

    if (!text) {
      return { questions: [], error: `${label}: type the question.` };
    }

    /**
     * Blank options are dropped, which moves everything after them along - so
     * the correct answer has to be tracked by its original position and looked
     * up again afterwards. Getting this wrong is quiet and nasty: the quiz
     * saves happily and marks the wrong option right.
     */
    const kept = rawOptions
      .map((value, index) => ({ value, index }))
      .filter((option) => option.value !== '');

    if (kept.length < 2) {
      return { questions: [], error: `${label}: give it at least two answers to choose from.` };
    }

    const correctIndex = kept.findIndex((option) => option.index === chosen);

    if (correctIndex === -1) {
      return { questions: [], error: `${label}: mark which answer is the correct one.` };
    }

    questions.push({ text, options: kept.map((option) => option.value), correctIndex });
  }

  if (questions.length === 0) {
    return { questions: [], error: 'A quiz needs at least one question.' };
  }

  return { questions, error: null };
}

export async function saveQuiz(
  _previous: QuizFormState,
  formData: FormData
): Promise<QuizFormState> {
  const courseId = String(formData.get('course') ?? '');
  const quizId = String(formData.get('quiz') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const title = String(formData.get('title') ?? '').trim();

  if (!courseId) return { error: 'Something went wrong - reload and try again.' };
  if (!title) return { error: 'Give the quiz a title.' };

  const { questions, error } = readQuestions(formData);
  if (error) return { error };

  const session = await getSession();
  if (!session) return { error: 'Your session has ended. Sign in again.' };

  try {
    if (quizId) {
      await strapiFetch(`/api/quizzes/${quizId}`, {
        method: 'PUT',
        body: { data: { title, questions } },
        token: session.jwt,
      });
    } else {
      await strapiFetch('/api/quizzes', {
        method: 'POST',
        body: { data: { title, questions, course: courseId } },
        token: session.jwt,
      });
    }
  } catch (caught) {
    return {
      error: caught instanceof StrapiError ? caught.message : 'Could not save the quiz.',
    };
  }

  revalidatePath(`/manage/courses/${slug}/quiz`);
  revalidatePath(`/courses/${slug}/quiz`);

  return { error: null, saved: true };
}

export async function deleteQuiz(
  _previous: QuizFormState,
  formData: FormData
): Promise<QuizFormState> {
  const quizId = String(formData.get('quiz') ?? '');
  const slug = String(formData.get('slug') ?? '');

  if (!quizId) return { error: 'Something went wrong - reload and try again.' };

  const session = await getSession();
  if (!session) return { error: 'Your session has ended. Sign in again.' };

  try {
    await strapiFetch(`/api/quizzes/${quizId}`, { method: 'DELETE', token: session.jwt });
  } catch (caught) {
    return {
      error: caught instanceof StrapiError ? caught.message : 'Could not delete the quiz.',
    };
  }

  revalidatePath(`/manage/courses/${slug}/quiz`);
  revalidatePath(`/courses/${slug}/quiz`);

  return { error: null, saved: true };
}

/**
 * Sends the student's answers off to be marked.
 *
 * Note what travels: the id of each question and which option was picked. No
 * score, and nothing about which answer was right - the server works that out
 * from its own copy, so there is nothing here for a determined student to edit
 * in the request.
 */
export async function submitQuiz(
  _previous: AttemptState,
  formData: FormData
): Promise<AttemptState> {
  const quizId = String(formData.get('quiz') ?? '');
  const slug = String(formData.get('slug') ?? '');

  if (!quizId) return { error: 'Something went wrong - reload and try again.' };

  const answers: { questionId: number; selectedIndex: number | null }[] = [];

  for (const [key, value] of formData.entries()) {
    const match = key.match(/^answer-(\d+)$/);
    if (!match) continue;

    const picked = Number(value);
    answers.push({
      questionId: Number(match[1]),
      selectedIndex: Number.isInteger(picked) ? picked : null,
    });
  }

  const session = await getSession();
  if (!session) return { error: 'Your session has ended. Sign in again.' };

  let result: QuizAttempt;

  try {
    const response = await strapiFetch<{ data: QuizAttempt }>(
      `/api/quizzes/${quizId}/attempts`,
      { method: 'POST', body: { answers }, token: session.jwt }
    );

    result = response.data;
  } catch (caught) {
    return {
      error: caught instanceof StrapiError ? caught.message : 'Could not submit your answers.',
    };
  }

  if (slug) revalidatePath(`/courses/${slug}/quiz`);

  return { error: null, result };
}
