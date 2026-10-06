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
  var style=document.createElement('style');style.textContent='.cova-canvas-upload{display:inline-flex;gap:10px;align-items:center;margin:12px 0}.cova-canvas-upload input{max-width:220px}.cova-canvas-course{margin-top:22px;border-top:1px solid var(--line,#dde5df);padding-top:16px}.cova-canvas-module{padding:12px;border:1px solid var(--line,#dde5df);border-radius:10px;margin:10px 0}.cova-canvas summary{cursor:pointer;font-weight:650}.cova-canvas summary small{color:var(--muted,#657369);margin-left:8px}.cova-canvas-item{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid var(--line,#dde5df)}.cova-canvas-item small{display:block;color:var(--muted,#657369);margin-top:4px}.cova-canvas-item details{width:100%}.cova-canvas pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:420px;overflow:auto;background:#f5f7f5;padding:14px;border-radius:8px;font-family:inherit;font-size:14px;line-height:1.6}.cova-canvas-entry{padding:20px 0}#covaCanvasButton{font-size:12px;white-space:nowrap}@media(max-width:700px){#covaCanvasButton{padding:7px;font-size:10px}}';document.head.append(style);
  decorate();var observer=new MutationObserver(decorate);observer.observe(document.body,{childList:true,subtree:true});
})();
