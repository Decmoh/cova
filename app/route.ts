import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getStudentStore } from '@/lib/student-data'

export const dynamic = 'force-dynamic'

const HTML_PATH = path.join(process.cwd(), 'content', 'cova-campus.html')
let cachedHtml: Promise<string> | null = null
function loadHtml() {
  if (process.env.NODE_ENV === 'development') return readFile(HTML_PATH, 'utf8')
  cachedHtml ??= readFile(HTML_PATH, 'utf8')
  return cachedHtml
}

function safeJson(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

const BOOTSTRAP = `
(function(){
  var C=window.__COVA__,ls=window.localStorage,P='skillgrid-';
  function keys(){var out=[];for(var i=0;i<ls.length;i++){var k=ls.key(i);if(k&&k.indexOf(P)===0)out.push(k)}return out}
  try{keys().forEach(function(k){ls.removeItem(k)})}catch(e){}
  try{var s=C.store||{};Object.keys(s).forEach(function(k){if(k.indexOf(P)===0&&typeof s[k]==='string')ls.setItem(k,s[k])});ls.setItem('skillgrid-v18-active-account',C.user.id)}catch(e){}
  var origSet=Storage.prototype.setItem,origRemove=Storage.prototype.removeItem,timer=null,dirty=false,inflight=null;
  function snapshot(){var o={};keys().forEach(function(k){o[k]=ls.getItem(k)});return o}
  function flush(unloading){
    if(!dirty)return inflight||Promise.resolve();
    dirty=false;clearTimeout(timer);
    var body=JSON.stringify({store:snapshot()});
    inflight=fetch('/api/student-data',{method:'PUT',headers:{'Content-Type':'application/json'},body:body,credentials:'same-origin',keepalive:!!unloading&&body.length<60000})
      .then(function(r){if(r.status===401){window.location.href='/sign-in'}else if(!r.ok){dirty=true;console.error('[cova] progress save failed, will retry:',r.status);if(!unloading)timer=setTimeout(flush,3000)}})
      .catch(function(err){dirty=true;console.error('[cova] progress save failed, will retry:',err);if(!unloading)timer=setTimeout(flush,3000)});
    return inflight;
  }
  function mark(k){if(typeof k==='string'&&k.indexOf(P)===0){dirty=true;clearTimeout(timer);timer=setTimeout(flush,1000)}}
  Storage.prototype.setItem=function(k,v){origSet.call(this,k,v);if(this===ls)mark(k)};
  Storage.prototype.removeItem=function(k){origRemove.call(this,k);if(this===ls)mark(k)};
  window.addEventListener('pagehide',function(){flush(true)});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')flush(true)});
  function downloadAnalytics(){
    flush(false).then(function(){
      return fetch('/api/student-data/report',{credentials:'same-origin'});
    }).then(function(r){
      if(!r.ok)throw new Error('Report download failed');
      return r.blob();
    }).then(function(blob){
      var a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='cova-campus-analytics.csv';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(function(){URL.revokeObjectURL(a.href)},1000);
    }).catch(function(err){console.error('[cova] analytics export failed:',err)});
  }
  window.covaDownloadAnalytics=downloadAnalytics;
  window.addEventListener('DOMContentLoaded',function(){
    if(!C.user || String(C.user.email||'').trim().toLowerCase()!=='declan.mohan2007@gmail.com')return;
    var button=document.createElement('button');
    button.type='button';button.textContent='Download analytics report';
    button.setAttribute('aria-label','Download analytics report');
    button.style.cssText='position:fixed;right:16px;bottom:16px;z-index:9999;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#111827;font:600 14px/1.2 sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.12);cursor:pointer';
    button.addEventListener('click',downloadAnalytics);
    document.body.appendChild(button);
  });
  window.covaSignOut=function(){
    return flush(false).then(function(){
      return fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',credentials:'same-origin'});
    }).catch(function(){}).then(function(){
      try{keys().forEach(function(k){origRemove.call(ls,k)})}catch(e){}
      window.location.href='/sign-in';
    });
  };
})();
`

const QUESTION_NAV_PATCH = `
(function(){
  function syncNextQuestionButton(){
    var root=document.querySelector('#v19QuestionRoot');
    if(!root)return;
    var right=root.querySelector('.v19-session-actions .right');
    if(!right)return;

    var button=right.querySelector('#v344SkipBtn');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='secondary';
      button.id='v344SkipBtn';
    }

    var feedbackNext=root.querySelector('#v19Feedback #v19NextBtn,#v19Feedback #v34ShortNext,#v19Feedback #cf-legacy-next');
    button.textContent=feedbackNext&&feedbackNext.textContent?feedbackNext.textContent:'Next question';
    button.setAttribute('aria-label',button.textContent);
    button.title=feedbackNext?'Continue to the next question':'Skip this question for now and go to the next one';

    button.onclick=function(){
      var next=root.querySelector('#v19Feedback #v19NextBtn,#v19Feedback #v34ShortNext,#v19Feedback #cf-legacy-next');
      if(next&&typeof next.click==='function'){next.click();return}
      if(typeof v344SkipCurrent==='function'){v344SkipCurrent();return}
      if(typeof advanceV19Question==='function')advanceV19Question();
    };

    right.appendChild(button);
    try{if(typeof normalizeButtons==='function')normalizeButtons(root)}catch(e){}
  }

  try{
    if(typeof renderV19Question==='function'&&!renderV19Question.__covaNextQuestion){
      var priorRender=renderV19Question;
      var wrappedRender=function(){
        var result=priorRender.apply(this,arguments);
        syncNextQuestionButton();
        return result;
      };
      wrappedRender.__covaNextQuestion=true;
      renderV19Question=wrappedRender;
      window.renderV19Question=wrappedRender;
    }
  }catch(e){console.error('[cova] next-question button setup failed:',e)}

  syncNextQuestionButton();
})();
`

const ACG_EXAM_SCOPE_PATCH = `
(function(){
  function isAcgExam2Question(question){
    if(!question)return false;
    if(question.courseId&&question.courseId!=='uncw-acg-201')return false;
    if(question.examUnit==='exam2')return true;
    return ['acg201-ch4','acg201-ch5','acg201-ch6'].indexOf(question.chapterId)>=0;
  }

  function clearContaminatedResume(){
    try{
      var saved=state&&state.v19&&state.v19.activeSession;
      if(!saved||saved.courseId!=='uncw-acg-201'||saved.examUnit!=='exam2'||!Array.isArray(saved.questions))return;
      if(saved.questions.some(function(question){return !isAcgExam2Question(question)})){
        state.v19.activeSession=null;
        if(typeof save==='function')save();
      }
    }catch(e){}
  }

  clearContaminatedResume();

  try{
    if(typeof v36ExamQuestions==='function'&&!v36ExamQuestions.__covaAcgExam2Scope){
      var priorExamQuestions=v36ExamQuestions;
      var scopedExamQuestions=function(course,examId){
        if(course&&course.id==='uncw-acg-201'&&examId==='exam2'){
          var bank=[];
          try{
            if(typeof courseQuestionBank==='function')bank=courseQuestionBank(course,'mixed')||[];
          }catch(e){}
          var strict=bank.filter(isAcgExam2Question);
          if(strict.length)return strict;
          return (priorExamQuestions.apply(this,arguments)||[]).filter(isAcgExam2Question);
        }
        return priorExamQuestions.apply(this,arguments);
      };
      scopedExamQuestions.__covaAcgExam2Scope=true;
      v36ExamQuestions=scopedExamQuestions;
      window.v36ExamQuestions=scopedExamQuestions;
    }
  }catch(e){console.error('[cova] ACG Exam 2 scope setup failed:',e)}

  try{
    if(typeof v37Pick==='function'&&!v37Pick.__covaAcgExam2Formats){
      var priorPick=v37Pick;
      var scopedPick=function(bank,count,options){
        var opts=options||{};
        var isExam2Bank=Array.isArray(bank)&&bank.length>0&&bank.every(isAcgExam2Question);
        if(isExam2Bank&&Array.isArray(opts.formats)&&opts.formats.length){
          var hasRequestedFormat=bank.some(function(question){return opts.formats.indexOf(question.format)>=0});
          if(!hasRequestedFormat){
            var relaxed={skills:opts.skills||null,formats:null};
            return priorPick(bank,count,relaxed);
          }
        }
        return priorPick(bank,count,opts);
      };
      scopedPick.__covaAcgExam2Formats=true;
      v37Pick=scopedPick;
      window.v37Pick=scopedPick;
    }
  }catch(e){console.error('[cova] ACG Exam 2 format fallback failed:',e)}

  try{
    if(typeof v37LaunchQuestions==='function'&&!v37LaunchQuestions.__covaAcgExam2Scope){
      var priorLaunch=v37LaunchQuestions;
      var scopedLaunch=function(course,questions,meta){
        if(course&&course.id==='uncw-acg-201'&&meta&&meta.examId==='exam2'){
          clearContaminatedResume();
          questions=(questions||[]).filter(isAcgExam2Question);
          if(!questions.length){
            if(typeof toast==='function')toast('Exam 2 practice is limited to Chapters 4–6.');
            return;
          }
        }
        return priorLaunch.call(this,course,questions,meta);
      };
      scopedLaunch.__covaAcgExam2Scope=true;
      v37LaunchQuestions=scopedLaunch;
      window.v37LaunchQuestions=scopedLaunch;
    }
  }catch(e){console.error('[cova] ACG Exam 2 launch guard failed:',e)}
})();
`

const LAUNCH_FIX_PATCH = "\n(function(){\n  /* Launch QA patch: exam fallback, completion summary, calendar editing,\n     onboarding escape hatch, copy cleanup, and live Ask Cova transport. */\n\n  function covaPluralizeText(root){\n    if(!root)return;\n    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);\n    var nodes=[],node;\n    while((node=walker.nextNode()))nodes.push(node);\n    nodes.forEach(function(n){\n      var parent=n.parentElement;\n      if(!parent||/^(SCRIPT|STYLE|TEXTAREA)$/.test(parent.tagName))return;\n      var value=n.nodeValue||'',next=value\n        .replace(/\\b1 independent attempts\\b/g,'1 independent attempt')\n        .replace(/\\b1 attempts\\b/g,'1 attempt')\n        .replace(/\\b1 curated practice questions?\\b/g,'1 curated practice question')\n        .replace(/\\b1 mapped practice questions\\b/g,'1 mapped practice question')\n        .replace(/\\b1 practice questions\\b/g,'1 practice question')\n        .replace(/\\b1 mapped questions\\b/g,'1 mapped question')\n        .replace(/\\b1 practice exams\\b/g,'1 practice exam')\n        .replace(/\\b0 practice exams\\b/g,'No practice exams yet');\n      if(next!==value)n.nodeValue=next;\n    });\n  }\n\n  try{\n    covaPluralizeText(document.body);\n    var pluralObserver=new MutationObserver(function(mutations){\n      mutations.forEach(function(m){\n        m.addedNodes.forEach(function(node){\n          if(node.nodeType===1)covaPluralizeText(node);\n          else if(node.nodeType===3&&node.parentElement)covaPluralizeText(node.parentElement);\n        });\n      });\n    });\n    pluralObserver.observe(document.body,{childList:true,subtree:true});\n  }catch(e){console.error('[cova] copy cleanup failed:',e)}\n\n  /* Courses without an instructor-backed exam map still need a useful Exams tab.\n     Give them cumulative Cova review without pretending it mirrors an instructor exam. */\n  try{\n    if(typeof v37ExamDefs==='function'&&!v37ExamDefs.__covaCourseReview){\n      var priorExamDefs=v37ExamDefs;\n      var wrappedExamDefs=function(course){\n        var defs=priorExamDefs.apply(this,arguments)||[];\n        if(defs.length||!course)return defs;\n        var bank=[];\n        try{if(typeof courseQuestionBank==='function')bank=courseQuestionBank(course,'mixed')||[]}catch(e){}\n        if(!bank.length)return defs;\n        var chapters=[];\n        try{if(typeof courseChapters==='function')chapters=courseChapters(course)||[]}catch(e){}\n        return [{\n          id:'course-review',\n          label:'Course Review Practice',\n          note:'Cumulative Cova practice across mapped course content · not an instructor exam blueprint',\n          chapters:chapters.map(function(ch){return ch.number}).filter(function(n){return Number.isFinite(Number(n))}),\n          practice:true,\n          covaFallback:true\n        }];\n      };\n      wrappedExamDefs.__covaCourseReview=true;\n      v37ExamDefs=wrappedExamDefs;\n      window.v37ExamDefs=wrappedExamDefs;\n    }\n\n    if(typeof v37ExamBank==='function'&&!v37ExamBank.__covaCourseReview){\n      var priorExamBank=v37ExamBank;\n      var wrappedExamBank=function(course,examId){\n        if(course&&examId==='course-review'){\n          var bank=[];\n          try{if(typeof courseQuestionBank==='function')bank=courseQuestionBank(course,'mixed')||[]}catch(e){}\n          return bank.filter(function(question){\n            return question&&(!question.courseId||question.courseId===course.id);\n          });\n        }\n        return priorExamBank.apply(this,arguments)||[];\n      };\n      wrappedExamBank.__covaCourseReview=true;\n      v37ExamBank=wrappedExamBank;\n      window.v37ExamBank=wrappedExamBank;\n    }\n  }catch(e){console.error('[cova] course review exam fallback failed:',e)}\n\n  /* Repair the final summary after all older wrappers have finished. */\n  try{\n    if(typeof finishV19Session==='function'&&!finishV19Session.__covaSummaryRepair){\n      var priorFinish=finishV19Session;\n      var wrappedFinish=function(exited){\n        var snapshot=null;\n        try{\n          if(v19Session){\n            snapshot={\n              total:Array.isArray(v19Session.questions)?v19Session.questions.length:0,\n              results:Array.isArray(v19Session.results)?v19Session.results.slice():[]\n            };\n          }\n        }catch(e){}\n        var result=priorFinish.apply(this,arguments);\n        if(exited||!snapshot)return result;\n        try{\n          var summary=document.querySelector('#actionModalBody .v19-summary');\n          if(!summary)return result;\n          var independent=snapshot.results.filter(function(r){return r&&r.correct===true&&r.firstAttempt!==false}).length;\n          var needsReview=snapshot.results.filter(function(r){return r&&r.correct===false}).length;\n          var skillSet=new Set(snapshot.results.map(function(r){return r&&r.skill}).filter(Boolean));\n          var formatSet=new Set(snapshot.results.map(function(r){return r&&r.format}).filter(Boolean));\n          var values=[snapshot.total,independent,formatSet.size,needsReview];\n          summary.querySelectorAll('.v19-summary-grid > div > b').forEach(function(el,index){\n            if(index<values.length){\n              el.textContent=String(values[index]);\n              el.style.display='block';\n              el.style.color='#173d32';\n              el.style.fontWeight='850';\n              el.style.visibility='visible';\n            }\n          });\n          var grid=summary.querySelector('.v19-summary-grid');\n          var sentence=grid&&grid.nextElementSibling;\n          if(sentence&&sentence.tagName==='P'){\n            var skillCount=skillSet.size,formatCount=formatSet.size;\n            sentence.innerHTML='<b>'+skillCount+' skill'+(skillCount===1?'':'s')+' practiced.</b> '+formatCount+' response format'+(formatCount===1?'':'s')+' used across this session.';\n            sentence.style.whiteSpace='normal';\n            sentence.style.overflow='visible';\n            sentence.style.textOverflow='clip';\n          }\n        }catch(e){console.error('[cova] completion summary repair failed:',e)}\n        return result;\n      };\n      wrappedFinish.__covaSummaryRepair=true;\n      finishV19Session=wrappedFinish;\n      window.finishV19Session=wrappedFinish;\n    }\n  }catch(e){console.error('[cova] summary wrapper setup failed:',e)}\n\n  /* Turn Calendar > Edit dates into a focused date editor instead of onboarding. */\n  function covaOpenDateEditor(){\n    var courses=[];\n    try{courses=typeof selectedCourses==='function'?selectedCourses():[]}catch(e){}\n    var rows=courses.map(function(course){\n      var defs=[];\n      try{defs=typeof v37ExamDefs==='function'?v37ExamDefs(course):[]}catch(e){}\n      var old=(app&&app.student&&app.student.examDates&&app.student.examDates[course.id])||{};\n      var options=defs.length?defs.map(function(def){\n        return '<option value=\"'+esc(def.id)+'\" '+(old.examId===def.id?'selected':'')+'>'+esc(def.label||def.id)+'</option>';\n      }).join(''):'<option value=\"next\">Next exam</option>';\n      return '<div class=\"cova-date-row\" data-cova-date-row=\"'+esc(course.id)+'\">'+\n        '<div><b>'+esc(course.code||course.title)+'</b><small>'+esc(course.title)+'</small></div>'+\n        '<select data-cova-date-exam=\"'+esc(course.id)+'\">'+options+'</select>'+\n        '<input type=\"date\" data-cova-date-input=\"'+esc(course.id)+'\" value=\"'+esc(old.date||'')+'\">'+\n      '</div>';\n    }).join('');\n    openModal('Edit exam dates','Semester calendar',\n      '<div class=\"cova-date-editor\"><p class=\"sub\">Update only the dates you know. These dates drive Home priorities and Exam Prep.</p>'+\n      '<div class=\"cova-date-list\">'+(rows||'<div class=\"v34-empty\">Add a course before adding exam dates.</div>')+'</div>'+\n      '<div class=\"modal-actions\"><button class=\"primary\" id=\"covaSaveDates\">Save dates</button><button class=\"secondary\" data-modal-close>Cancel</button></div></div>');\n    var saveButton=document.querySelector('#covaSaveDates');\n    if(saveButton)saveButton.onclick=function(){\n      try{\n        app.student.examDates=app.student.examDates||{};\n        courses.forEach(function(course){\n          var input=document.querySelector('[data-cova-date-input=\"'+course.id+'\"]');\n          var select=document.querySelector('[data-cova-date-exam=\"'+course.id+'\"]');\n          var date=input&&input.value;\n          if(date){\n            var defs=typeof v37ExamDefs==='function'?v37ExamDefs(course):[];\n            var def=defs.find(function(x){return x.id===(select&&select.value)});\n            app.student.examDates[course.id]={date:date,examId:(select&&select.value)||'next',label:(def&&def.label)||'Next exam'};\n          }else{\n            delete app.student.examDates[course.id];\n          }\n        });\n        if(typeof saveCore==='function')saveCore();\n        closeModal();\n        if(typeof renderStudentView==='function')renderStudentView('home');\n        if(typeof toast==='function')toast('Exam dates updated.');\n      }catch(e){\n        console.error('[cova] save dates failed:',e);\n        if(typeof toast==='function')toast('Could not save exam dates.');\n      }\n    };\n  }\n\n  try{\n    if(typeof v372CalendarHTML==='function'&&!v372CalendarHTML.__covaDateEditor){\n      var priorCalendarHTML=v372CalendarHTML;\n      var wrappedCalendarHTML=function(){\n        return String(priorCalendarHTML.apply(this,arguments)||'').replace('data-v37-edit-semester','data-cova-edit-dates');\n      };\n      wrappedCalendarHTML.__covaDateEditor=true;\n      v372CalendarHTML=wrappedCalendarHTML;\n      window.v372CalendarHTML=wrappedCalendarHTML;\n    }\n    document.addEventListener('click',function(event){\n      var edit=event.target&&event.target.closest&&event.target.closest('[data-cova-edit-dates]');\n      if(edit){\n        event.preventDefault();\n        event.stopImmediatePropagation();\n        covaOpenDateEditor();\n        return;\n      }\n      var close=event.target&&event.target.closest&&event.target.closest('[data-cova-onboarding-close]');\n      if(close){\n        event.preventDefault();\n        var overlay=document.querySelector('#v37Onboarding');\n        if(overlay)overlay.style.display='none';\n      }\n    },true);\n  }catch(e){console.error('[cova] calendar editor setup failed:',e)}\n\n  /* Every forced onboarding/edit flow must have an escape hatch. */\n  try{\n    if(typeof v37OnboardingStep==='function'&&!v37OnboardingStep.__covaDismissible){\n      var priorOnboardingStep=v37OnboardingStep;\n      var wrappedOnboardingStep=function(){\n        var result=priorOnboardingStep.apply(this,arguments);\n        var card=document.querySelector('#v37Onboarding .v37-on-card');\n        if(card&&!card.querySelector('[data-cova-onboarding-close]')){\n          card.style.position='relative';\n          var close=document.createElement('button');\n          close.type='button';\n          close.setAttribute('data-cova-onboarding-close','');\n          close.setAttribute('aria-label','Close semester editor');\n          close.textContent='×';\n          close.style.cssText='position:absolute;right:16px;top:14px;width:34px;height:34px;border:1px solid #dce5df;border-radius:10px;background:#f6f8f7;font-size:20px;line-height:1;cursor:pointer;color:#315d4c';\n          card.appendChild(close);\n        }\n        return result;\n      };\n      wrappedOnboardingStep.__covaDismissible=true;\n      v37OnboardingStep=wrappedOnboardingStep;\n      window.v37OnboardingStep=wrappedOnboardingStep;\n    }\n    document.addEventListener('keydown',function(event){\n      if(event.key!=='Escape')return;\n      var overlay=document.querySelector('#v37Onboarding');\n      if(overlay&&getComputedStyle(overlay).display!=='none'){\n        event.preventDefault();\n        overlay.style.display='none';\n      }\n    });\n  }catch(e){console.error('[cova] onboarding dismiss setup failed:',e)}\n\n  /* Live Ask Cova: send the current Cova course context to the authenticated\n     server route. Never send hidden solutions or the full question bank. */\n  function covaTutorContext(){\n    var ctx={};\n    try{ctx=typeof getAiContext==='function'?(getAiContext()||{}):{}}catch(e){}\n    var courseId=ctx.courseId||(app&&app.ui&&app.ui.activeCourseId)||(typeof v19Session!=='undefined'&&v19Session&&v19Session.courseId)||null;\n    var course=null,chapter=null,cfg=null,progress=null;\n    try{course=courseId&&typeof courseById==='function'?courseById(courseId):null}catch(e){}\n    try{chapter=course&&app&&app.ui&&app.ui.activeChapterId&&typeof chapterById==='function'?chapterById(course,app.ui.activeChapterId):null}catch(e){}\n    try{cfg=course&&typeof v36Cfg==='function'?v36Cfg(course):null}catch(e){}\n    try{progress=course&&typeof classProgress==='function'?classProgress(course):null}catch(e){}\n    var topics=[],exams=[];\n    try{topics=course&&typeof courseTopics==='function'?(courseTopics(course)||[]).slice(0,60):[]}catch(e){}\n    try{\n      exams=course&&typeof v37ExamDefs==='function'?(v37ExamDefs(course)||[]).map(function(exam){\n        return {id:exam.id,label:exam.label,note:exam.note,chapters:exam.chapters||[],practice:exam.practice!==false};\n      }):[];\n    }catch(e){}\n    return {\n      page:ctx.page||null,\n      skill:ctx.skill||null,\n      role:ctx.role||'student',\n      course:course?{id:course.id,code:course.code||null,title:course.title,description:course.description||null}:null,\n      chapter:chapter?{id:chapter.id,number:chapter.number,title:chapter.title,objective:chapter.objective||null,topics:chapter.topics||[]}:null,\n      topics:topics,\n      exams:exams,\n      progress:progress?{attempts:progress.attempts,accuracy:progress.accuracy,questions:progress.questions,topics:progress.topics}:null,\n      policy:(cfg&&cfg.policy)||ctx.assistancePolicy||null,\n      source:cfg?{label:cfg.sourceLabel||null,status:cfg.sourceStatus||null,note:cfg.note||null}:null,\n      recentMistakes:Array.isArray(ctx.recentMistakes)?ctx.recentMistakes.slice(0,5):[],\n      currentQuestion:ctx.currentQuestion?{id:ctx.currentQuestion.id,skill:ctx.currentQuestion.skill,prompt:ctx.currentQuestion.prompt}:null\n    };\n  }\n\n  try{\n    if(typeof submitAiPrompt==='function'&&!submitAiPrompt.__covaLiveTutor){\n      var localSubmit=submitAiPrompt;\n      var liveSubmit=async function(text){\n        var input=document.querySelector('#aiInput');\n        var prompt=String(text||(input&&input.value)||'').trim();\n        if(!prompt)return;\n        if(input)input.value='';\n        try{\n          appendAiMessage('user',prompt);\n          var conversation=ensureConversation();\n          var generation={\n            id:makeId('gen'),\n            userId:activeAccountId,\n            conversationId:conversation.id,\n            prompt:prompt,\n            status:'pending',\n            model:'Ask Cova',\n            feature:'ask-cova-live',\n            createdAt:nowIso(),\n            usage:null,\n            estimatedCostCents:0\n          };\n          conversation.generations.push(generation);\n          var pending=appendAiMessage('assistant','',{status:'pending',model:'Ask Cova'});\n          renderAiConversation();\n          renderAiHistory();\n          pending.status='streaming';\n          generation.status='streaming';\n          saveAiStore();\n          renderAiConversation();\n\n          var response=await fetch('/api/cova-chat',{\n            method:'POST',\n            headers:{'Content-Type':'application/json'},\n            body:JSON.stringify({prompt:prompt,context:covaTutorContext()})\n          });\n          var data={};\n          try{data=await response.json()}catch(e){}\n          if(!response.ok||!data||typeof data.text!=='string'||!data.text.trim()){\n            throw new Error((data&&data.error)||'Live tutor unavailable');\n          }\n\n          var localMeta={};\n          try{localMeta=localAssistantResponse(prompt)||{}}catch(e){}\n          pending.status='complete';\n          pending.content=data.text.trim();\n          pending.actions=localMeta.actions||[];\n          pending.source=data.source||'Live Cova course context';\n          pending.model=data.model||'Ask Cova';\n          generation.status='complete';\n          generation.result=pending.content;\n          generation.completedAt=nowIso();\n          generation.usage=data.usage||null;\n          if(aiStore&&aiStore.usage){\n            aiStore.usage.turns=(aiStore.usage.turns||0)+1;\n            var inTokens=Number(data.usage&&((data.usage.prompt_tokens??data.usage.input_tokens)))||estimateTokens(prompt);\n            var outTokens=Number(data.usage&&((data.usage.completion_tokens??data.usage.output_tokens)))||estimateTokens(pending.content);\n            aiStore.usage.inputTokens=(aiStore.usage.inputTokens||0)+inTokens;\n            aiStore.usage.outputTokens=(aiStore.usage.outputTokens||0)+outTokens;\n          }\n          saveAiStore();\n          renderAiConversation();\n          renderAiHistory();\n          if(typeof v37Track==='function')v37Track('ask_cova_live',{courseId:(covaTutorContext().course||{}).id||null});\n          return;\n        }catch(error){\n          console.warn('[cova] live tutor fallback:',error&&error.message?error.message:error);\n          try{\n            var conversation=ensureConversation();\n            var messages=conversation.messages||[];\n            var pending=messages.slice().reverse().find(function(message){return message.role==='assistant'&&(message.status==='pending'||message.status==='streaming')});\n            var local=localAssistantResponse(prompt);\n            if(pending){\n              pending.status='complete';\n              pending.content=local.text;\n              pending.actions=local.actions||[];\n              pending.source=(local.source||'Cova local context')+' · live tutor temporarily unavailable';\n              pending.model='Cova fallback';\n            }\n            var generation=(conversation.generations||[]).slice().reverse().find(function(item){return item.status==='pending'||item.status==='streaming'});\n            if(generation){\n              generation.status='fallback';\n              generation.result=local.text;\n              generation.completedAt=nowIso();\n            }\n            saveAiStore();\n            renderAiConversation();\n            renderAiHistory();\n          }catch(fallbackError){\n            console.error('[cova] tutor fallback failed:',fallbackError);\n            return localSubmit.apply(this,arguments);\n          }\n        }\n      };\n      liveSubmit.__covaLiveTutor=true;\n      submitAiPrompt=liveSubmit;\n      window.submitAiPrompt=liveSubmit;\n    }\n  }catch(e){console.error('[cova] live Ask Cova setup failed:',e)}\n\n  var style=document.createElement('style');\n  style.textContent='.v19-summary-grid b{display:block!important;color:#173d32!important;visibility:visible!important}.v19-summary p{white-space:normal!important;overflow:visible!important;text-overflow:clip!important}.cova-date-list{display:grid;gap:10px;margin:16px 0}.cova-date-row{display:grid;grid-template-columns:minmax(160px,1.25fr) minmax(150px,.9fr) minmax(145px,.75fr);gap:10px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:12px;background:#fbfcfb}.cova-date-row b,.cova-date-row small{display:block}.cova-date-row small{margin-top:2px;color:var(--muted)}@media(max-width:700px){.cova-date-row{grid-template-columns:1fr}}';\n  document.head.appendChild(style);\n})();\n"

// Faculty screens only show sample class data, so hiding them client-side is
// enough; nothing faculty-only is sent from the server to student accounts.
const STUDENT_LOCK = `
(function(){
  var css=document.createElement('style');
  css.textContent='#facultyBtn,#page-faculty,[data-page="faculty"]{display:none!important}';
  document.head.appendChild(css);
  function guard(){
    if(typeof window.showPage!=='function'||window.showPage.__covaLock)return;
    var prior=window.showPage;
    var locked=function(id,opts){return prior(id==='faculty'?'home':id,opts)};
    locked.__covaLock=true;
    window.showPage=locked;
    try{showPage=locked}catch(e){}
  }
  guard();
  document.addEventListener('click',function(e){
    var t=e.target&&e.target.closest&&e.target.closest('[data-page="faculty"],#facultyBtn');
    if(t){e.preventDefault();e.stopImmediatePropagation()}
  },true);
  function bounce(){if((location.hash||'').indexOf('faculty')!==-1){guard();window.showPage('home')}}
  window.addEventListener('hashchange',bounce);
  bounce();
  try{if(window.state&&state.page==='faculty'){state.page='home';window.showPage('home')}}catch(e){}
})();
`

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return new Response(null, { status: 307, headers: { Location: '/sign-in' } })
  }

  const [html, store] = await Promise.all([loadHtml(), getStudentStore(session.user.id)])
  const role = (session.user as { role?: string }).role === 'faculty' ? 'faculty' : 'student'
  const payload = {
    user: { id: session.user.id, name: session.user.name, email: session.user.email, role },
    store,
  }
  const injection = `<script>window.__COVA__=${safeJson(payload)};${BOOTSTRAP}</script>`
  const body = html
    .replace(/<head([^>]*)>/i, (match) => `${match}${injection}`)
    .replace(/<\/body>/i, (match) => `<script>${QUESTION_NAV_PATCH}</script><script>${ACG_EXAM_SCOPE_PATCH}</script><script>${LAUNCH_FIX_PATCH}</script>${role === 'faculty' ? '' : `<script>${STUDENT_LOCK}</script>`}${match}`)

  return new Response(body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  })
}
