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
    .replace(/<\/body>/i, (match) => (role === 'faculty' ? match : `<script>${STUDENT_LOCK}</script>${match}`))

  return new Response(body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  })
}
