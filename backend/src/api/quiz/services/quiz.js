'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

const UID = 'api::quiz.quiz';

/**
 * Builds the copy of a quiz a student is allowed to see.
 *
 * Note that this *constructs* the safe shape rather than deleting correctIndex
 * from a copy of the record. Same result today, but a field added to the
 * question component later - an explanation of the answer, say - is excluded by
 * default instead of silently shipping to students until somebody notices.
 */
function presentQuestions(questions, { includeAnswerKey }) {
  return (questions ?? []).map((question) => {
    const visible = {
      id: question.id,
      text: question.text,
      options: question.options,
    };

    return includeAnswerKey ? { ...visible, correctIndex: question.correctIndex } : visible;
  });
}

/**
 * Checks a question set before it is saved.
 *
 * The correctIndex range check is the important one. A question whose answer
 * points past the end of its options can never be answered correctly, and
 * nothing would complain - the quiz would just quietly mark every student wrong.
 */
function findProblems(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return ['A quiz needs at least one question.'];
  }

  const problems = [];

  questions.forEach((question, index) => {
    const label = `Question ${index + 1}`;

    if (typeof question?.text !== 'string' || question.text.trim() === '') {
      problems.push(`${label}: needs some text.`);
    }

    if (!Array.isArray(question?.options) || question.options.length < 2) {
      problems.push(`${label}: needs at least two options.`);
      return;
    }

    if (
      !Number.isInteger(question.correctIndex) ||
      question.correctIndex < 0 ||
      question.correctIndex >= question.options.length
    ) {
      problems.push(
        `${label}: correctIndex must point at one of its ${question.options.length} options.`
      );
    }
  });

  return problems;
}

module.exports = createCoreService(UID, () => ({
  presentQuestions,
  findProblems,
}));
