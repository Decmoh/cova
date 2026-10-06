{
  const KEY = 'skillgrid-canvas-materials-v1';
  function read(){try{var d=JSON.parse(localStorage.getItem(KEY));return d&&Array.isArray(d.courses)?d:{courses:[]};}catch(_){return {courses:[]};}}
  function escape(v){return esc(v);}
  function sourceUrl(value,origin){try{var u=new URL(value);return u.protocol==='https:'&&u.origin===origin?u.href:'';}catch(_){return '';}}
  /* Original BAN 280 exercises are available to every account. Imported notes
     add private source references, never shared dates or an exam blueprint. */
  var banCacheRaw = null, banCache = null;
  function banReview() {
    var raw = localStorage.getItem(KEY);
    if (raw === banCacheRaw && banCache) return banCache;
    banCacheRaw = raw;
    var data = read(), c = (data.courses || []).find(function(x){return String(x.code||'').replace(/\W/g,'') === 'BAN280';});
    var out = {bank:[], sources:[], chapters:[1,2,3,6], section:c&&c.section};
    function evidence(chapter, pattern) {
      var module = (c&&c.modules||[]).find(function(m){return new RegExp('^Chapter '+chapter+'(?:\\D|$)','i').test(m.title);});
      var item = module && (module.items||[]).find(function(x){return x.type === 'Attachment' && x.text && x.text.length > 200 && pattern.test(x.text) && sourceUrl(x.sourceUrl,data.sourceOrigin);});
      if(item){if(out.sources.indexOf(item)<0)out.sources.push(item);return {title:item.title,sourceUrl:item.sourceUrl,imported:true};}
      return {title:'Cova original chapter '+chapter+' review',sourceUrl:'',imported:false};
    }
    function base(source, chapter, skill, id, prompt, explanation) {
      return {id:'canvas-ban-'+id,courseId:'uncw-ban-280',chapterId:'canvas-ban-ch'+chapter,topicId:skill,skillId:skill,skill:skill,course:'Statistical Analysis for Business and Economics',family:'canvas-ban-'+skill,format:'numeric',difficulty:2,cognitive:'Apply',evidenceDimension:'Do',version:1,v36Pilot:true,v35Expanded:true,masteryEligible:false,v25MasteryEligible:false,practiceOnly:true,v344PracticeOnly:true,provenance:source.imported?'course_material':'cova_original',answerProvenance:'cova_derived_solution',sourceType:'Cova-original review'+(source.imported?' · '+source.title:''),sourceUrl:source.sourceUrl,sourceTitle:source.title,prompt:prompt,explanation:explanation+(source.imported?' Related concept in your notes: '+source.title+'.':''),hint:'Identify the concept and write its rule before calculating.',tolerance:0.005};
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
  function reviewNote(){return 'Original Cova review for Chapters 1, 2, 3, and 6. Confirm your instructor’s midterm coverage and format. Add your section’s exam date in your calendar.';}
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
    v37ExamPrepHTML=function(c,id){var html=priorCanvasExamHTML.apply(this,arguments);if(!isBan(c)||id!=='midterm'||!banReview().bank.length)return html;var r=banReview(),sources='<section class="v36-policy-card"><span class="eyebrow">BAN 280 review is ready</span><h3>'+r.bank.length+' original review questions</h3><p>'+escape(reviewNote())+'</p>'+(r.sources.length?'<h4>Your Canvas sources</h4>'+(r.section?'<p>Section: '+escape(r.section)+'</p>':'')+'<ul>'+r.sources.map(function(s){return '<li><a href="'+escape(s.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+escape(s.title)+'</a></li>';}).join('')+'</ul>':'')+'</section>';return html.replace('<div class="v37-stage-track">',sources+'<div class="v37-stage-track">').replace('Cova mirrors the known course format where the source supports it, while keeping every item original.','Practice with original Cova exercises. Confirm your instructor’s exam format before using this set as a timed rehearsal.').replace('mapped exam coverage','review topics').replace('Mix the exam coverage.','Mix the review topics.').replace('Mapped coverage','Review topics').replace('mapped questions','review questions').replace(/<>|<\/>/g,'');};
  }

}
