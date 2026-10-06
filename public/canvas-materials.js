(function () {
  'use strict';
  var KEY = 'skillgrid-canvas-materials-v1';
  var MAX_BYTES = 2500000;
  function escape(value) { return String(value || '').replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function sourceUrl(value, origin) {
    try { var u = new URL(value); return u.protocol === 'https:' && u.origin === origin ? u.href : ''; } catch (_) { return ''; }
  }
  function validate(input) {
    if (!input || input.schema !== 'cova.canvas.v1' || !Array.isArray(input.courses) || input.courses.length > 30) throw new Error('Choose a Cova Canvas import file.');
    var origin = new URL(input.sourceOrigin);
    if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.instructure.com')) throw new Error('Invalid Canvas source.');
    var out = {schema: input.schema, sourceOrigin: origin.origin, importedAt: new Date().toISOString(), courses: []};
    input.courses.forEach(function (c) {
      if (!c || typeof c.code !== 'string' || typeof c.section !== 'string' || !Array.isArray(c.modules) || c.modules.length > 150) throw new Error('Invalid course in import.');
      var course = {code:c.code.slice(0,40),title:String(c.title||c.code).slice(0,200),section:c.section.slice(0,150),term:String(c.term||'').slice(0,80),instructor:String(c.instructor||'').slice(0,150),courseUrl:sourceUrl(c.courseUrl,origin.origin),modules:[],assignments:[],sectionNotes:String(c.sectionNotes||'').slice(0,30000)};
      if(!course.courseUrl || !/^\/courses\/\d+$/.test(new URL(course.courseUrl).pathname))throw new Error('Invalid Canvas course link.');
      c.modules.forEach(function (m) {
        if (!m || !Array.isArray(m.items) || m.items.length > 300) throw new Error('Invalid module in import.');
        course.modules.push({title:String(m.title||'Module').slice(0,200),notes:String(m.notes||'').slice(0,15000),items:m.items.map(function (x) { return {title:String(x.title||'Material').slice(0,300),type:String(x.type||'Material').slice(0,50),sourceUrl:sourceUrl(x.sourceUrl,origin.origin),text:String(x.text||'').slice(0,150000),status:String(x.status||'linked').slice(0,80)}; })});
      });
      if(Array.isArray(c.assignments))course.assignments=c.assignments.slice(0,500).map(function(a){return {title:String(a.title||'Assignment').slice(0,300),sourceUrl:sourceUrl(a.sourceUrl,origin.origin),due:String(a.due||'').slice(0,150),availability:String(a.availability||'').slice(0,150),text:String(a.text||'').slice(0,30000)};});
      out.courses.push(course);
    });
    if(new TextEncoder().encode(JSON.stringify(out)).length>MAX_BYTES)throw new Error('This import is too large. Split it by course.');
    return out;
  }
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {courses:[]}; } catch (_) { return {courses:[]}; } }
  function itemHTML(x) {
    var link=x.sourceUrl?'<a class="secondary" href="'+escape(x.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Open in Canvas</a>':'';
    return '<article class="cova-canvas-item"><div><b>'+escape(x.title)+'</b><small>'+escape(x.type)+' · '+(x.text?'Text collected':'Canvas link')+'</small></div>'+link+(x.text?'<details><summary>Read material</summary><pre>'+escape(x.text)+'</pre></details>':'')+'</article>';
  }
  function courseHTML(c) {
    return '<section class="cova-canvas-course"><h3>'+escape(c.code)+' · '+escape(c.title)+'</h3><p class="sub">'+escape(c.section)+' · '+escape(c.term)+(c.instructor?' · '+escape(c.instructor):'')+'</p>'+(c.sectionNotes?'<details><summary>Your section information</summary><pre>'+escape(c.sectionNotes)+'</pre></details>':'')+c.modules.map(function(m){return '<details class="cova-canvas-module"><summary>'+escape(m.title)+' <small>'+m.items.length+' items</small></summary>'+(m.notes?'<p class="sub">'+escape(m.notes)+'</p>':'')+m.items.map(itemHTML).join('')+'</details>';}).join('')+(c.assignments.length?'<details class="cova-canvas-module"><summary>Assignments and dates from your section</summary>'+c.assignments.map(function(a){return itemHTML({title:a.title,type:a.due?'Due '+a.due:'Assignment',sourceUrl:a.sourceUrl,text:[a.availability,a.text].filter(Boolean).join('\n')});}).join('')+'</details>':'')+'</section>';
  }
  function openMaterials(code) {
    var data=read(),courses=data.courses.filter(function(c){return !code||c.code.replace(/\W/g,'')===String(code).replace(/\W/g,'');});
    var html='<div class="cova-canvas"><p class="sub">Materials from your enrolled Canvas sections. Any exam dates shown belong to those sections. Your calendar stays editable and unchanged.</p><label class="secondary cova-canvas-upload">Choose Canvas import<input type="file" id="covaCanvasFile" accept=".json,application/json"></label><p id="covaCanvasStatus" role="status"></p><div id="covaCanvasCourses">'+(courses.length?courses.map(courseHTML).join(''):'<p>No materials imported yet. Choose your Cova Canvas import file.</p>')+'</div></div>';
    if(typeof openModal==='function')openModal('Canvas materials','Your courses · your sections',html);
    var input=document.getElementById('covaCanvasFile');
    if(input)input.addEventListener('change',async function(){
      var status=document.getElementById('covaCanvasStatus');
      try{
        if(!input.files[0])return;
        if(input.files[0].size>MAX_BYTES)throw new Error('This import is too large. Split it by course.');
        var incoming=validate(JSON.parse(await input.files[0].text())),current=read();
        var merged=new Map((current.courses||[]).map(function(c){return [c.courseUrl,c];}));
        incoming.courses.forEach(function(c){merged.set(c.courseUrl,c);});incoming.courses=Array.from(merged.values());
        if(new TextEncoder().encode(JSON.stringify(incoming)).length>MAX_BYTES)throw new Error('Combined materials exceed the import limit.');
        var store={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf('skillgrid-')===0)store[k]=localStorage.getItem(k);}
        store[KEY]=JSON.stringify(incoming);
        var result=await fetch('/api/student-data',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({store:store})});
        if(!result.ok)throw new Error(result.status===401?'Sign in to Cova before importing.':'Could not save the import. Your existing materials were kept.');
        localStorage.setItem(KEY,store[KEY]);
        status.textContent=incoming.courses.length+' courses saved to your account. Your calendar was kept unchanged.';
        document.getElementById('covaCanvasCourses').innerHTML=incoming.courses.map(courseHTML).join('');
      }catch(e){status.textContent=e.message||'Could not import this file.';}
    });
  }
  window.covaOpenCanvasMaterials=openMaterials;
  function decorate() {
    var actions=document.querySelector('#product .top-actions');
    if(actions&&!document.getElementById('covaCanvasButton')){var b=document.createElement('button');b.id='covaCanvasButton';b.type='button';b.className='secondary';b.textContent='Canvas materials';b.onclick=function(){openMaterials();};actions.prepend(b);}
    var root=document.getElementById('page-home'),course=null;
    try{course=app.ui.activeCourseId&&courseById(app.ui.activeCourseId);}catch(_){}
    if(root&&course&&String(app.ui.route||'').indexOf('classes/')===0&&read().courses.some(function(c){return c.code.replace(/\W/g,'')===String(course.code||'').replace(/\W/g,'');})&&!root.querySelector('[data-cova-canvas-course]')){
      var footer=document.createElement('div');footer.className='cova-canvas-entry';footer.setAttribute('data-cova-canvas-course','');
      var b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='Open materials from my Canvas section';b.onclick=function(){openMaterials(course.code);};footer.append(b);root.append(footer);
    }
  }
  /* Account-private Canvas notes now feed BAN 280 review. No shared dates or
     instructor exam blueprint are inferred from the presence of lecture notes. */
  var banCacheRaw = null, banCache = null;
  function banReview() {
    var raw = localStorage.getItem(KEY);
    if (raw === banCacheRaw && banCache) return banCache;
    banCacheRaw = raw;
    var data = read(), c = (data.courses || []).find(function(x){return x.code.replace(/\W/g,'') === 'BAN280';});
    var out = {bank:[], sources:[], chapters:[], section:c&&c.section};
    if (!c) return (banCache = out);
    function evidence(chapter, pattern) {
      var module = (c.modules||[]).find(function(m){return new RegExp('^Chapter '+chapter+'(?:\\D|$)','i').test(m.title);});
      var item = module && module.items.find(function(x){return x.type === 'Attachment' && x.text && x.text.length > 200 && pattern.test(x.text) && sourceUrl(x.sourceUrl,data.sourceOrigin);});
      if(item){if(out.sources.indexOf(item)<0)out.sources.push(item);if(out.chapters.indexOf(chapter)<0)out.chapters.push(chapter);}
      return item;
    }
    function base(source, chapter, skill, id, prompt, explanation) {
      return {id:'canvas-ban-'+id,courseId:'uncw-ban-280',chapterId:'canvas-ban-ch'+chapter,topicId:skill,skillId:skill,skill:skill,course:'Statistical Analysis for Business and Economics',family:'canvas-ban-'+skill,format:'numeric',difficulty:2,cognitive:'Apply',evidenceDimension:'Do',version:1,v36Pilot:true,v35Expanded:true,masteryEligible:false,v25MasteryEligible:false,practiceOnly:true,v344PracticeOnly:true,provenance:'course_material',answerProvenance:'cova_derived_solution',sourceType:'Cova-original review · '+source.title,sourceUrl:source.sourceUrl,sourceTitle:source.title,prompt:prompt,explanation:explanation+' Cova-derived explanation; source concept: '+source.title+'.',hint:'Identify the concept and write its rule before calculating.',tolerance:0.005};
    }
    function numeric(source,ch,skill,id,prompt,answer,explanation){if(!source)return;var q=base(source,ch,skill,id,prompt,explanation);q.solution=answer;q.canonicalAnswer=answer;out.bank.push(q);}
    function mcq(source,ch,skill,id,prompt,correct,wrong,explanation){if(!source)return;var q=base(source,ch,skill,id,prompt,explanation),options=[correct].concat(wrong),k=out.bank.length%4;q.format='mcq';q.options=options.slice(4-k).concat(options.slice(0,4-k));q.solution=k;q.canonicalAnswer=correct;out.bank.push(q);}
    var stats=evidence(1,/descriptive[\s\S]*inferential/i),variables=evidence(1,/qualitative[\s\S]*continuous/i),population=evidence(1,/population[\s\S]*statistic/i);
    ['guest satisfaction','delivery times','monthly sales','employee training hours'].forEach(function(subject,i){
      var infer=i%2===1;
      mcq(stats,1,'Descriptive vs Inferential Statistics','stats-'+i,(infer?'A manager uses a random sample to estimate ':'A manager summarizes only the recorded ')+subject+(infer?' for the entire population.':' in last month’s dataset.')+' Which branch of statistics is this?',infer?'Inferential statistics':'Descriptive statistics',[infer?'Descriptive statistics':'Inferential statistics','A census is required','Neither branch applies'],infer?'The claim generalizes from a sample to the population.':'The summary describes only the observed dataset.');
      var sample=i%2===0;
      mcq(population,1,'Population and Sample','population-'+i,'An average '+subject+' is computed from '+(sample?'a sample of 80 records.':'every member of the population.')+' Is the resulting number a statistic or a parameter?',sample?'Statistic':'Parameter',[sample?'Parameter':'Statistic','The number is a variable','It must be a census'],sample?'A statistic summarizes a sample.':'A parameter summarizes a population.');
    });
    [['Hotel category coded 1, 2, or 3','Qualitative','Codes identify categories; arithmetic on the category labels is not meaningful.'],['Number of special requests on a reservation','Quantitative discrete','This variable counts requests.'],['Time needed to clean a room','Quantitative continuous','Time is measured and can take intermediate values.'],['Distance traveled by a delivery vehicle','Quantitative continuous','Distance is measured and can take intermediate values.']].forEach(function(x,i){mcq(variables,1,'Variable Types','variable-'+i,'Classify this variable: '+x[0]+'.',x[1],['Qualitative','Quantitative discrete','Quantitative continuous','A population parameter'].filter(function(v){return v!==x[1];}).slice(0,3),x[2]);});
    var box=evidence(2,/interquartile range/i),sd=evidence(3,/square root of the variance/i),emp=evidence(3,/68%[\s\S]*95%/i),normal=evidence(6,/continuous[\s\S]*single point/i),z=evidence(6,/z transformation formula/i),excel=evidence(6,/NORM\.DIST[\s\S]*BETWEEN/i);
    for(var i=0;i<4;i++){
      var q1=10+3*i,q3=30+5*i;
      numeric(box,2,'Interquartile Range','iqr-'+i,'A dataset has Q1 = '+q1+' and Q3 = '+q3+'. Find its interquartile range.',q3-q1,'IQR = Q3 − Q1 = '+q3+' − '+q1+' = '+(q3-q1)+'. It describes the spread of the middle 50% of observations.');
      var deviation=3+i;
      numeric(sd,3,'Standard Deviation','sd-'+i,'A population variance is '+deviation*deviation+'. What is the population standard deviation?',deviation,'Standard deviation is the square root of variance: √'+deviation*deviation+' = '+deviation+'.');
    }
    for(var i=0;i<6;i++){
      var mean=40+5*i,deviation=2+i,steps=i%3+1,percent=[68,95,99.7][steps-1];
      numeric(emp,3,'Empirical Rule','emp-'+i,'Processing time is approximately normal with mean '+mean+' minutes and standard deviation '+deviation+' minutes. Approximately what percent lies between '+(mean-steps*deviation)+' and '+(mean+steps*deviation)+' minutes? Enter a percent, not a decimal.',percent,'The interval is the mean ± '+steps+' standard deviation(s). The empirical rule gives approximately '+percent+'%.');
      var score=[-2,-1,0,1,2,3][i],value=mean+score*deviation;
      numeric(z,6,'Z Scores','z-'+i,'For a normal distribution with mean '+mean+' and standard deviation '+deviation+', find the z-score of x = '+value+'.',score,'z = (x − mean) / standard deviation = ('+value+' − '+mean+') / '+deviation+' = '+score+'.');
    }
    [['below 28','NORM.DIST(28,30,4,TRUE)'],['above 28','1-NORM.DIST(28,30,4,TRUE)'],['between 28 and 34','NORM.DIST(34,30,4,TRUE)-NORM.DIST(28,30,4,TRUE)']].forEach(function(x,i){mcq(excel,6,'Normal Probabilities in Excel','excel-'+i,'X is normal with mean 30 and standard deviation 4. Which Excel expression gives P(X '+x[0]+')?',x[1],['NORM.DIST(28,30,4,FALSE)','NORM.DIST(30,28,4,TRUE)','NORM.DIST(34,30,4,FALSE)'],'NORM.DIST with TRUE returns area to the left. Use that area directly for below, subtract from 1 for above, and subtract the lower cumulative area from the upper cumulative area for between.');});
    mcq(normal,6,'Continuous Probability','point','Under a continuous normal model, what is P(X = 12) exactly?','0',['1','0.5','The density height at 12'],'An exact point has zero width and therefore zero area. A probability density height is not a probability.');
    mcq(normal,6,'Continuous Probability','area','What is the total probability under a probability density curve?','1',['0','50','100'],'Total probability is 1, which corresponds to 100%.');
    return (banCache = out);
  }
  function isBan(c){return c && c.id==='uncw-ban-280';}
  function reviewNote(){var r=banReview();return 'Review based on your imported Canvas notes: Chapters '+r.chapters.join(', ')+'. Exact midterm coverage and exam format are not confirmed by the extracted checklist. Original Cova exercises; no exam date is assumed.';}
  if(typeof v36Cfg==='function'){
    var priorCanvasCfg=v36Cfg;
    v36Cfg=function(c){var cfg=priorCanvasCfg.apply(this,arguments);if(!cfg||!isBan(c)||!banReview().bank.length)return cfg;return Object.assign({},cfg,{exams:cfg.exams.map(function(ex){return ex.id==='midterm'?Object.assign({},ex,{practice:true,chapters:[],note:reviewNote(),canvasReview:true}):ex;})});};
  }
  if(typeof v37ExamBank==='function'){
    var priorCanvasExamBank=v37ExamBank;
    v37ExamBank=function(c,id){return isBan(c)&&id==='midterm'&&banReview().bank.length?banReview().bank.slice():priorCanvasExamBank.apply(this,arguments);};
  }
  if(typeof v37ExamTopics==='function'){
    var priorCanvasExamTopics=v37ExamTopics;
    v37ExamTopics=function(c,id){return isBan(c)&&id==='midterm'&&banReview().bank.length?Array.from(new Set(banReview().bank.map(function(q){return q.skill;}))):priorCanvasExamTopics.apply(this,arguments);};
  }
  if(typeof courseQuestionBank==='function'){
    var priorCanvasCourseBank=courseQuestionBank;
    courseQuestionBank=function(c,type){var bank=priorCanvasCourseBank.apply(this,arguments);if(!isBan(c))return bank;var extra=banReview().bank.filter(function(q){return !type||type==='mixed'||(type==='mcq'&&q.format==='mcq')||(type==='fill'&&q.format==='numeric');}),seen=new Set(bank.map(function(q){return q.id;}));return bank.concat(extra.filter(function(q){return !seen.has(q.id);}));};
  }
  if(typeof v37ExamPrepHTML==='function'){
    var priorCanvasExamHTML=v37ExamPrepHTML;
    v37ExamPrepHTML=function(c,id){var html=priorCanvasExamHTML.apply(this,arguments);if(!isBan(c)||id!=='midterm'||!banReview().bank.length)return html;var r=banReview(),sources='<section class="v36-policy-card"><span class="eyebrow">Your Canvas materials are connected</span><h3>'+r.bank.length+' original review questions from your notes</h3><p>'+escape(reviewNote())+'</p><p>Section: '+escape(r.section)+'</p><ul>'+r.sources.map(function(s){return '<li><a href="'+escape(s.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+escape(s.title)+'</a></li>';}).join('')+'</ul></section>';return html.replace('<div class="v37-stage-track">',sources+'<div class="v37-stage-track">').replace('Cova mirrors the known course format where the source supports it, while keeping every item original.','Use original review exercises from your imported notes. This set does not claim to mirror your instructor’s exam format.');};
  }

  var style=document.createElement('style');style.textContent='.cova-canvas-upload{display:inline-flex;gap:10px;align-items:center;margin:12px 0}.cova-canvas-upload input{max-width:220px}.cova-canvas-course{margin-top:22px;border-top:1px solid var(--line,#dde5df);padding-top:16px}.cova-canvas-module{padding:12px;border:1px solid var(--line,#dde5df);border-radius:10px;margin:10px 0}.cova-canvas summary{cursor:pointer;font-weight:650}.cova-canvas summary small{color:var(--muted,#657369);margin-left:8px}.cova-canvas-item{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid var(--line,#dde5df)}.cova-canvas-item small{display:block;color:var(--muted,#657369);margin-top:4px}.cova-canvas-item details{width:100%}.cova-canvas pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:420px;overflow:auto;background:#f5f7f5;padding:14px;border-radius:8px;font-family:inherit;font-size:14px;line-height:1.6}.cova-canvas-entry{padding:20px 0}#covaCanvasButton{font-size:12px;white-space:nowrap}@media(max-width:700px){#covaCanvasButton{padding:7px;font-size:10px}}';document.head.append(style);
  decorate();var observer=new MutationObserver(decorate);observer.observe(document.body,{childList:true,subtree:true});
})();
