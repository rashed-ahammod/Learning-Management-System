'use strict';

/**
 * Marks a submission against the quiz's own questions.
 *
 * The score is worked out here, on the server, from the stored correctIndex. The
 * request only ever says which option was picked - it has no say in whether that
 * was right, and no way to send a score of its own.
 */
function grade(questions, submitted) {
  const chosen = new Map();

  for (const answer of Array.isArray(submitted) ? submitted : []) {
    chosen.set(answer?.questionId, answer?.selectedIndex);
  }

  let score = 0;

  const answers = questions.map((question) => {
    const selectedIndex = chosen.has(question.id) ? chosen.get(question.id) : null;
    const correct = Number.isInteger(selectedIndex) && selectedIndex === question.correctIndex;

    if (correct) score += 1;

    // correctIndex is deliberately not recorded. A stored attempt gets reviewed
    // later, and if it carried the answer key then reviewing one old attempt
    // would hand over every answer for the retake.
    return { questionId: question.id, selectedIndex, correct };
  });

  const totalQuestions = questions.length;

  return {
    score,
    totalQuestions,
    // A question left blank is simply wrong, which is why this divides by the
    // number of questions rather than by the number answered.
    percentage: totalQuestions ? Math.round((score / totalQuestions) * 100) : 0,
    answers,
  };
}

module.exports = () => ({ grade });
