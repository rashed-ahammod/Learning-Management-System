'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { FormError } from './form/Fields';
import { submitQuiz, type AttemptState } from '@/lib/quiz-actions';
import type { Quiz } from '@/lib/types';

function Submit({ answered, total }: { answered: number; total: number }) {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {pending ? 'Marking…' : 'Submit answers'}
      </button>
      {/* Said rather than enforced. Leaving a question blank is allowed - it is
          simply wrong - so this is a nudge, not a gate. */}
      <span className="text-sm text-slate-500">
        {answered} of {total} answered
      </span>
    </div>
  );
}

export default function QuizRunner({ quiz, slug }: { quiz: Quiz; slug: string }) {
  const [state, formAction] = useActionState<AttemptState, FormData>(submitQuiz, { error: null });

  // Only used for the "3 of 5 answered" hint. The answers themselves stay in the
  // form's own fields, so the submission works whether or not this state exists.
  const [answered, setAnswered] = useState<Set<number>>(new Set());

  const result = state.result;

  if (result) {
    const byQuestion = new Map(result.answers.map((answer) => [answer.questionId, answer]));

    return (
      <div>
        <div
          className={`rounded-lg border p-6 text-center ${
            result.percentage >= 50
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <p className="text-3xl font-semibold tracking-tight">{result.percentage}%</p>
          <p className="mt-1 text-sm text-slate-700">
            {result.score} of {result.totalQuestions} correct
          </p>
        </div>

        <ol className="mt-6 space-y-3">
          {quiz.questions.map((question, index) => {
            const answer = byQuestion.get(question.id);
            const picked = answer?.selectedIndex;

            return (
              <li
                key={question.id}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <span className="text-sm text-slate-400">{index + 1}</span>
                  <p className="flex-1 text-sm font-medium">{question.text}</p>
                  <span
                    className={`text-xs font-medium ${
                      answer?.correct ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {answer?.correct ? 'Correct' : 'Wrong'}
                  </span>
                </div>
                <p className="mt-1 pl-7 text-xs text-slate-500">
                  {/* Which answer was right is deliberately not shown. The result
                      says whether you got it, not what the answer is - otherwise
                      one attempt would hand over the key for the next. */}
                  {typeof picked === 'number' && picked >= 0
                    ? `You chose: ${question.options[picked]}`
                    : 'You left this blank'}
                </p>
              </li>
            );
          })}
        </ol>

        <p className="mt-6 text-sm text-slate-600">
          Saved to your record. Reload the page to sit it again.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="quiz" value={quiz.documentId} />
      <input type="hidden" name="slug" value={slug} />

      <ol className="space-y-4">
        {quiz.questions.map((question, index) => (
          <li key={question.id}>
            <fieldset className="rounded-lg border border-slate-200 bg-white p-5">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Question {index + 1}
              </legend>

              <p className="text-sm font-medium">{question.text}</p>

              <div className="mt-3 space-y-2">
                {question.options.map((option, oIndex) => (
                  <label
                    key={oIndex}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition hover:bg-slate-50"
                  >
                    <input
                      type="radio"
                      name={`answer-${question.id}`}
                      value={oIndex}
                      onChange={() =>
                        setAnswered((current) => new Set(current).add(question.id))
                      }
                      className="h-4 w-4 accent-slate-900"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      <FormError message={state.error} />

      <Submit answered={answered.size} total={quiz.questions.length} />
    </form>
  );
}
