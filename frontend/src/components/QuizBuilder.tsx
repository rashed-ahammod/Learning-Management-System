'use client';

import { useActionState, useState } from 'react';

import { FormError, SavedHint, SubmitButton, TextField } from './form/Fields';
import { saveQuiz, type QuizFormState } from '@/lib/quiz-actions';
import type { Quiz } from '@/lib/types';

type Draft = { key: string; text: string; options: string[]; correctIndex: number };

const BLANK: Omit<Draft, 'key'> = { text: '', options: ['', ''], correctIndex: 0 };

let counter = 0;
const nextKey = () => `q${(counter += 1)}`;

/**
 * Turns an existing quiz into editable rows.
 *
 * correctIndex is optional on the type because a student's copy of a quiz does
 * not carry it. This component is only ever rendered for staff, whose copy does
 * - the `?? 0` is what satisfies the compiler about a case that cannot arise
 * here, rather than a guess at a sensible default.
 */
function toDrafts(quiz?: Quiz): Draft[] {
  if (!quiz || quiz.questions.length === 0) {
    return [{ key: nextKey(), ...BLANK, options: [...BLANK.options] }];
  }

  return quiz.questions.map((question) => ({
    key: nextKey(),
    text: question.text,
    options: [...question.options],
    correctIndex: question.correctIndex ?? 0,
  }));
}

export default function QuizBuilder({
  courseId,
  slug,
  quiz,
}: {
  courseId: string;
  slug: string;
  quiz?: Quiz;
}) {
  const [questions, setQuestions] = useState<Draft[]>(() => toDrafts(quiz));
  const [state, formAction] = useActionState<QuizFormState, FormData>(saveQuiz, { error: null });

  const update = (index: number, changes: Partial<Draft>) =>
    setQuestions((current) =>
      current.map((question, i) => (i === index ? { ...question, ...changes } : question))
    );

  const setOption = (qIndex: number, oIndex: number, value: string) =>
    setQuestions((current) =>
      current.map((question, i) =>
        i === qIndex
          ? { ...question, options: question.options.map((o, j) => (j === oIndex ? value : o)) }
          : question
      )
    );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="course" value={courseId} />
      <input type="hidden" name="slug" value={slug} />
      {quiz ? <input type="hidden" name="quiz" value={quiz.documentId} /> : null}

      <TextField
        name="title"
        label="Quiz title"
        defaultValue={quiz?.title}
        placeholder="React basics check"
        required
      />

      <div className="space-y-5">
        {questions.map((question, qIndex) => (
          <fieldset
            key={question.key}
            className="rounded-lg border border-slate-200 bg-white p-5"
          >
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Question {qIndex + 1}
            </legend>

            <input
              name={`q${qIndex}-text`}
              value={question.text}
              onChange={(event) => update(qIndex, { text: event.target.value })}
              placeholder="What does useState return?"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />

            <p className="mt-4 text-xs font-medium text-slate-600">
              Answers — select the correct one
            </p>

            <div className="mt-2 space-y-2">
              {question.options.map((option, oIndex) => (
                <div key={oIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`q${qIndex}-correct`}
                    value={oIndex}
                    checked={question.correctIndex === oIndex}
                    onChange={() => update(qIndex, { correctIndex: oIndex })}
                    aria-label={`Question ${qIndex + 1}, answer ${oIndex + 1} is correct`}
                    className="h-4 w-4 shrink-0 accent-slate-900"
                  />
                  <input
                    name={`q${qIndex}-opt${oIndex}`}
                    value={option}
                    onChange={(event) => setOption(qIndex, oIndex, event.target.value)}
                    placeholder={`Answer ${oIndex + 1}`}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                  {question.options.length > 2 ? (
                    <button
                      type="button"
                      onClick={() =>
                        update(qIndex, {
                          options: question.options.filter((_, j) => j !== oIndex),
                          // Keep the tick on the same answer it was on.
                          correctIndex:
                            question.correctIndex > oIndex
                              ? question.correctIndex - 1
                              : Math.min(question.correctIndex, question.options.length - 2),
                        })
                      }
                      className="text-xs text-slate-400 transition hover:text-red-600"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-4 text-xs">
              <button
                type="button"
                onClick={() => update(qIndex, { options: [...question.options, ''] })}
                className="text-slate-600 transition hover:text-slate-900"
              >
                + Add an answer
              </button>
              {questions.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setQuestions((c) => c.filter((_, i) => i !== qIndex))}
                  className="text-slate-400 transition hover:text-red-600"
                >
                  Remove this question
                </button>
              ) : null}
            </div>
          </fieldset>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          setQuestions((current) => [
            ...current,
            { key: nextKey(), ...BLANK, options: [...BLANK.options] },
          ])
        }
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-50"
      >
        + Add a question
      </button>

      <FormError message={state.error} />

      <div className="flex items-center gap-4 border-t border-slate-200 pt-5">
        <SubmitButton label={quiz ? 'Save quiz' : 'Create quiz'} />
        <SavedHint show={Boolean(state.saved)} />
      </div>
    </form>
  );
}
