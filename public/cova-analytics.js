(function () {
  'use strict';
  var KEY = 'skillgrid-cova-activation-v1';
  var names = ['profile_completed','practice_started','answer_submitted','explanation_viewed','independent_correct_answer','session_completed'];
  var excluded = !!(window.__COVA__ && window.__COVA__.analyticsExcluded);
  var production = /^(www\.)?covacampus\.com$/.test(location.hostname);
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  // Remove URL parameters and fragments before sending page views to Vercel.
  window.va('beforeSend', function (event) {
    if (excluded) return null;
    if (event.url) { var url = new URL(event.url, location.origin); url.search = ''; url.hash = ''; event.url = url.href; }
    return event;
  });
  window.covaTrack = function (name, input) {
    if (excluded || names.indexOf(name) < 0) return;
    var now = new Date().toISOString(), day = now.slice(0,10), data = {};
    // No free text, student identity, responses, source titles, or Canvas URLs.
    input = input || {};
    if (typeof input.correct === 'boolean') data.correct = input.correct;
    if (typeof input.firstAttempt === 'boolean') data.firstAttempt = input.firstAttempt;
    ['questionCount','answeredCount','courseCount'].forEach(function (key) {
      if (Number.isInteger(input[key]) && input[key] >= 0 && input[key] <= 10000) data[key] = input[key];
    });
    if (window.__COVA__) {
      try {
        var report = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (!report || report.version !== 1) report = {version:1,firstSeenAt:now,milestones:{},days:{}};
        report.milestones[name] = report.milestones[name] || now;
        report.days[day] = report.days[day] || {};
        report.days[day][name] = (Number(report.days[day][name]) || 0) + 1;
        Object.keys(report.days).sort().slice(0,-90).forEach(function (old) { delete report.days[old]; });
        localStorage.setItem(KEY, JSON.stringify(report));
      } catch (_) { /* Analytics must never interrupt practice. */ }
    }
    if (production) window.va('event', {name:name,data:data});
  };
  if (production && !excluded) {
    var script = document.createElement('script');
    script.defer = true; script.src = '/_vercel/insights/script.js';
    script.dataset.covaAnalytics = '1';
    document.head.appendChild(script);
  }
})();
