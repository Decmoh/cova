{
  // This bridge runs inside the course engine's closure, after its final wrappers.
  const emitActivation = (name, data) => { try { window.covaTrack?.(name, data || {}); } catch (_) {} };
  const previousActivationTrack = v37Track;
  v37Track = function (type, meta = {}) {
    const result = previousActivationTrack.apply(this, arguments);
    if (type === 'onboarding_complete') emitActivation('profile_completed', {courseCount:meta.courseCount});
    if (type === 'practice_start') emitActivation('practice_started', {questionCount:meta.count});
    return result;
  };
  let activationAttempt = null, activationObserver = null;
  const previousActivationRecord = recordV19Attempt;
  recordV19Attempt = function (question, response, correct) {
    const row = previousActivationRecord.apply(this, arguments);
    if (row) {
      activationAttempt = row;
      emitActivation('answer_submitted', {correct:row.correct === true,firstAttempt:row.firstAttempt === true});
      // Independent here measures unaided first-attempt behavior, not mastery eligibility.
      // A correct retry, hint, Teach me, or previously revealed answer never qualifies.
      const revealed = typeof v25HadAnswerReveal === 'function' && v25HadAnswerReveal(question);
      if (row.correct === true && row.firstAttempt === true && Number(row.hints) === 0 && !row.guided && !revealed)
        emitActivation('independent_correct_answer');
    }
    return row;
  };
  const previousActivationSubmit = submitV19Answer;
  submitV19Answer = function () {
    const before = activationAttempt, result = previousActivationSubmit.apply(this, arguments);
    if (activationAttempt && activationAttempt !== before && activationAttempt.correct === false) {
      if (activationObserver) activationObserver.disconnect();
      const explanation = document.querySelector('#v19Feedback .v37-explain, #v19Feedback .v19-feedback');
      if (explanation && typeof IntersectionObserver !== 'undefined') {
        activationObserver = new IntersectionObserver(entries => {
          if (document.visibilityState === 'visible' && entries.some(entry => entry.isIntersecting)) {
            emitActivation('explanation_viewed'); activationObserver.disconnect();
          }
        }, {threshold:0.5});
        activationObserver.observe(explanation);
      }
    }
    return result;
  };
  const previousActivationFinish = finishV19Session;
  finishV19Session = function (exited = false) {
    const session = v19Session;
    const ids = new Set((session?.results || []).map(row => row.questionId));
    const questions = session?.questions || [];
    const completed = !exited && questions.length > 0 && questions.every(question => ids.has(question.id));
    const result = previousActivationFinish.apply(this, arguments);
    if (completed) emitActivation('session_completed', {questionCount:questions.length,answeredCount:ids.size});
    return result;
  };
}
