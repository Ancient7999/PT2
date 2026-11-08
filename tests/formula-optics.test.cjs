/* Run with node --test tests/*.test.cjs. DOM fixtures exercise state, not browser layout. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function environment() {
  const listeners = {}, windowListeners = {}, storage = new Map(), frames = new Map(), timers = new Map();
  let serial = 0;
  class Node {
    constructor(tag) {
      this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.dataset = {}; this.events = {};
      this.value = ''; this.textContent = ''; this.hidden = false; this.readOnly = false; this.disabled = false;
      this.style = { setProperty(k,v) { this[k]=v; }, removeProperty(k) { delete this[k]; }, getPropertyValue(k) { return this[k] || ''; } };
      this.className = '';
      this.classList = { contains: k => this.className.split(/\s+/).includes(k),
        add: (...ks) => { this.className = [...new Set(this.className.split(/\s+/).filter(Boolean).concat(ks))].join(' '); },
        remove: (...ks) => { this.className = this.className.split(/\s+/).filter(k=>!ks.includes(k)).join(' '); },
        toggle: (k,on) => { if (on === undefined) on = !this.classList.contains(k); this.classList[on?'add':'remove'](k); return on; } };
    }
    setAttribute(k,v) { this.attrs[k]=String(v); if(k==='id')this.id=String(v); if(k==='class')this.className=String(v); }
    getAttribute(k) { return this.attrs[k] ?? null; }
    removeAttribute(k) { delete this.attrs[k]; }
    appendChild(n) { n.parentElement=this; this.children.push(n); return n; }
    replaceChildren() { this.children=[]; }
    set innerHTML(v) { this.children=[]; this._html=v; }
    get innerHTML() { return this._html || ''; }
    contains(n) { return n===this || this.children.some(c=>c.contains(n)); }
    addEventListener(k,f) { (this.events[k] ||= []).push(f); }
    closest(selector) { return selector.split(',').some(s=>matches(this,s.trim())) ? this : this.parentElement?.closest(selector) || null; }
    querySelectorAll(s) { return query(this,s); }
    querySelector(s) { return this.querySelectorAll(s)[0] || null; }
    focus() { document.activeElement=this; dispatch('focusin',this); }
    getBoundingClientRect() { return {left:0,top:0,width:560,height:320}; }
    blur() { document.activeElement=document.body; }
    click() { if(!this.disabled) dispatch('click',this); }
  }
  function matches(n,s) {
    if (s.includes(' ')) { const parts=s.split(/\s+/); return matches(n,parts.pop()) && !!n.parentElement?.closest(parts.join(' ')); }
    if(s.startsWith('#'))return n.id===s.slice(1);
    if(s.startsWith('.'))return s.slice(1).split('.').every(k=>n.classList.contains(k));
    if(s==='[data-fs]')return n.attrs['data-fs']!==undefined;
    if(s.includes('[data-id='))return n.attrs['data-id']===s.match(/data-id="([^"]+)"/)[1];
    if(s.includes('[data-nav='))return n.attrs['data-nav']===s.match(/data-nav="([^"]+)"/)[1];
    return n.tagName.toLowerCase()===s;
  }
  function query(n,s) { const out=[]; for(const c of n.children) { if(s.split(',').some(x=>matches(c,x.trim())))out.push(c); out.push(...query(c,s)); } return out; }
  const document = { readyState:'complete', documentElement:new Node('html'), body:new Node('body'),
    createElement:tag=>new Node(tag), createElementNS:(_,tag)=>new Node(tag),
    getElementById:id=>document.documentElement.querySelector('#'+id), querySelectorAll:s=>document.documentElement.querySelectorAll(s),
    querySelector:s=>document.querySelectorAll(s)[0] || null, addEventListener:(k,f,c)=>(listeners[k] ||= []).push({f,c:!!c}) };
  document.documentElement.appendChild(document.body); document.activeElement=document.body;
  const store = { getItem:k=>storage.get(k)??null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:k=>storage.delete(k) };
  const context = { document, console, localStorage:store, sessionStorage:store,
    setTimeout:(f,ms)=>{ const id=++serial; timers.set(id,{f,ms}); return id; }, clearTimeout:id=>timers.delete(id),
    setInterval:()=>++serial, clearInterval:()=>{}, requestAnimationFrame:f=>{const id=++serial;frames.set(id,f);return id;}, cancelAnimationFrame:id=>frames.delete(id),
    performance:{now:()=>0}, getComputedStyle:()=>({getPropertyValue:()=>''}),
    MutationObserver:class { observe(){} }, addEventListener:(k,f)=>(windowListeners[k] ||= []).push(f),
    matchMedia:()=>({matches:false}), innerWidth:1280, innerHeight:800 };
  context.window=context; vm.createContext(context);
  function load(file) { vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file}); }
  function add(id,tag='div',parent=document.body) { const n=new Node(tag); n.id=id;parent.appendChild(n);return n; }
  function dispatch(type,target,extra={}) {
    const e={type,target,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...extra};
    for(const {f,c} of listeners[type]||[])if(c)f(e);
    if(!e.stopped) for(let n=target;n;n=n.parentElement)for(const f of n.events[type]||[])f(e);
    if(!e.stopped)for(const {f,c} of listeners[type]||[])if(!c)f(e);
    if(!e.stopped)for(const f of windowListeners[type]||[])f(e);
    return e;
  }
  function flush(){const work=[...frames.values()];frames.clear();work.forEach(f=>f(16));}
  return {context,document,load,add,dispatch,flush,frames,timers,storage};
}
test('Snell geometry, reflection, normal incidence, critical grazing and TIR',()=>{
  const e=environment();e.load('js/formula-diagram.js');const {trace}=e.context.FormulaDiagram;
  assert.ok(Math.abs(trace(1,1.33,30).t2-22.0824)<0.001);
  assert.equal(trace(1,1.33,30).reflected,30);
  assert.equal(trace(1,1.5,0).t2,0);
  const tc=Math.asin(1/1.5)*180/Math.PI;
  assert.equal(trace(1.5,1,tc).mode,'grazing');assert.equal(trace(1.5,1,tc).t2,90);
  assert.equal(trace(1.5,1,tc+0.1).mode,'tir');assert.equal(trace(1.5,1,60).t2,null);
  for(const bad of [[0,1,20],[1,0,20],[1,1,-1],[1,1,91],[NaN,1,20]])assert.equal(trace(...bad),null);
});
test('all generated optics variants supply only exact printed givens and reconstruct the answer',()=>{
  const e=environment();e.load('js/formula-gen-pt2.js');const gen=e.context.Pt2FormulaGen;const variants=new Set();
  for(const family of ['snell','criticalAngle'])for(let i=0;i<400;i++){
    const q=gen.generateQuestion([family]),m=q.formulaDiagram,v={...m.values,[m.target]:q.answerValue};
    variants.add(family+q._formulaVariant);assert.ok(!(m.target in m.values));
    assert.ok(Math.abs(v.n1*Math.sin(v.t1*Math.PI/180)-v.n2*Math.sin(v.t2*Math.PI/180))<1e-10);
    assert.equal(new Set(q.options).size,4);
    if(m.target==='n2'||(family==='snell'&&m.target==='t1'))assert.ok(q.q.includes(m.values.t2.toFixed(1)+'°'));
    if(family==='criticalAngle'&&m.target==='n1')assert.ok(q.q.includes(m.values.t1.toFixed(1)+'°'));
  }
  assert.equal(variants.size,5);assert.equal(gen.generateQuestion(['waveSpeed']).formulaDiagram,undefined);
});
function practiceFixture() {
  const e=environment();
  for(const id of ['formulaWorkspace','formulaBackBtn','formulaView','formulaTitle','formulaElapsed','formulaQText','formulaDiagram','formulaOptions','formulaFeedback','formulaHintBox','formulaHintText','formulaShowBtn','formulaFamilyStrip','formulaStatus','formulaPanel','formulaAdvanceWrap','formulaAdvanceFill','formulaRollBtn','formulaSetsBtn'])e.add(id);
  e.context.showView=id=>{e.document.getElementById(id)?.classList.add('active');};
  e.context.__activeMaterial={formulas:{gen:'Pt2FormulaGen',key:'test'}};
  e.load('js/formula-gen-pt2.js');e.load('js/formula-diagram.js');e.load('js/formula-practice.js');return e;
}
test('MCQ-only formulas use explicit Next and Back without automatic advance',()=>{
  const e=practiceFixture();e.context.FormulaPractice.start(['waveSpeed']);
  e.document.getElementById('formulaOptions').children[e.context.FormulaPractice.question.correct].click();
  assert.equal(e.context.FormulaPractice.totalAnswered(),1);
  assert.ok(![...e.timers.values()].some(t=>t.ms>=3200));
  const q=e.context.FormulaPractice.question;e.document.getElementById('formulaRollBtn').click();
  assert.notEqual(e.context.FormulaPractice.question.id,q.id);e.document.getElementById('formulaBackBtn').click();
  assert.equal(e.context.FormulaPractice.question.id,q.id);assert.equal(e.context.FormulaPractice.totalAnswered(),1);
});
function calculatorFixture() {
  const e=environment();
  const calc=e.add('calculator-widget');calc.style.display='block';
  for(const id of ['dspMain','dspExpr','errMsg','dspAngle','dspHyp','dsp2nd','dspMem','dspNav','calcWrapper','btn2nd','infoPopup','calcDisplay'])e.add(id,'div',calc);
  const key=e.add('calc-seven','button',calc);key.setAttribute('data-id','7');key.classList.add('calc-btn');
  e.add('formulaView').classList.add('active');e.add('calc-toggle-btn','button');
  e.load('js/vendor/calculator-core.js');e.load('js/pt2-calculator.js');
  return {...e,calc,key};
}
test('last pointer click owns calculator input; outside clicks and editors release it; close releases it',()=>{
  const e=calculatorFixture();const outside=e.add('question'),input=e.add('typed','input');let quizKeys=0;
  e.document.addEventListener('keydown',()=>quizKeys++);
  e.dispatch('pointerdown',e.key);const first=e.dispatch('keydown',e.document.body,{key:'7'});
  assert.equal(e.context.lastInputTarget,'calc');assert.ok(first.defaultPrevented);assert.equal(quizKeys,0);
  assert.ok(e.document.getElementById('dspMain').innerHTML.includes('7'));
  const previous=e.document.getElementById('dspMain').innerHTML;
  e.dispatch('pointerdown',outside);e.dispatch('keydown',e.document.body,{key:'1'});
  assert.equal(e.context.lastInputTarget,'answer');assert.equal(e.context.PT2CalcKeysBlocked(),false);
  assert.equal(quizKeys,1);assert.equal(e.document.getElementById('dspMain').innerHTML,previous);
  e.dispatch('pointerdown',e.calc);assert.equal(e.context.PT2CalcKeysBlocked(),true);
  input.focus();e.dispatch('keydown',input,{key:'2'});assert.equal(e.document.getElementById('dspMain').innerHTML,previous);
  e.context.PT2Calculator.close();assert.equal(e.context.lastInputTarget,'answer');assert.equal(e.context.PT2CalcKeysBlocked(),false);
});
test('settings alignment clears document top on phones and retains desktop alignment',()=>{
  const e=environment();e.document.readyState='loading';
  const wrapper=e.add('settings-wrapper');wrapper.style.top='143px';
  const full=e.add('fs');full.setAttribute('data-fs','');full.offsetParent=e.document.body;full.getBoundingClientRect=()=>({top:70});
  e.context.scrollY=20;e.load('js/pt2-offline.js');
  e.document.documentElement.classList.add('pt2-phone');e.dispatch('click',e.document.body);
  for(const {f} of [...e.timers.values()])f();assert.equal(wrapper.style.top,undefined);
  e.document.documentElement.classList.remove('pt2-phone');e.dispatch('click',e.document.body);
  for(const {f} of [...e.timers.values()])f();assert.equal(wrapper.style.top,'90px');
});
test('explanations render math after a correct answer',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','js/quiz-engine.js'),'utf8');
  const lines=src.split('\n').filter(l=>/feedback good'; fb\.textContent=(correctFeedbackText\(q\)|'✓ '\+\(q\.explain)/.test(l));
  assert.ok(lines.length>=6);for(const l of lines)assert.match(l,/renderMathIn\(fb\)/);
  const e=environment();const seen=[];
  e.context.renderMathInElement=(el,o)=>seen.push([el,o.delimiters.map(d=>d.left)]);
  vm.runInContext(src.match(/function renderMathIn\(el\)\{[\s\S]*?\n\}\n/)[0],e.context);
  const el=e.document.createElement('div');e.context.renderMathIn(el);
  assert.equal(seen[0][0],el);assert.equal(seen[0][1].join(' '),'\\( \\[');
  const p=practiceFixture();const hit=[];p.context.renderMathIn=el=>hit.push(el);
  p.context.FormulaPractice.start(['waveSpeed']);const q=p.context.FormulaPractice.question;
  p.document.querySelectorAll('#formulaOptions .opt')[q.correct].click();
  assert.ok(hit.includes(p.document.getElementById('formulaFeedback')));
});

const RAD=Math.PI/180;
function at(name,a,s=1){ // client point for a line at angle a from the normal (fixture rect = viewBox)
  const r=100,t=a*RAD; if(name==='normal')return {clientX:280+r*Math.sin(t),clientY:160-r*Math.cos(t)};
  return {clientX:280+s*r*Math.sin(t),clientY:160+(name==='refracted'?1:-1)*r*Math.cos(t)};
}
function drawFixture(family='snell'){
  const e=environment();e.load('js/formula-gen-pt2.js');e.load('js/formula-diagram.js');
  const q=e.context.Pt2FormulaGen.generateQuestion([family]);const host=e.add('host');let done=0;
  const d=e.context.FormulaDiagram.mount(host,q,()=>done++);const svg=host.querySelector('svg');
  const goal=e.context.FormulaDiagram.targets(q);
  const g=k=>host.querySelectorAll('g').find(n=>n.getAttribute('data-line')===k);
  const drag=(name,path)=>{e.dispatch('pointerdown',svg,{pointerId:1,...path[0]});path.slice(1).forEach(p=>e.dispatch('pointermove',svg,{pointerId:1,...p}));e.dispatch('pointerup',svg,{pointerId:1,...path[path.length-1]});};
  const ghost=()=>host.querySelector('.fd-ghost').style.visibility;
  return {...e,q,host,d,svg,goal,g,drag,ghost,done:()=>done,
    button:t=>host.querySelectorAll('button').find(b=>b.textContent===t),status:()=>host.querySelector('.fd-status').textContent};
}
test('Snell geometry, critical grazing and TIR',()=>{
  const e=environment();e.load('js/formula-diagram.js');const t=e.context.FormulaDiagram.trace;
  assert.ok(Math.abs(t(1,1.5,30).t2-19.47122)<1e-4);assert.equal(t(1.5,1,90/1).mode,'tir');
  assert.equal(t(1.5,1,Math.asin(1/1.5)/RAD).t2,90);assert.equal(t(1,1.5,0).t2,0);
});
test('snap band: ghost appears near the target, pull locks exact angle, outside stays free',()=>{
  const e=environment();e.load('js/formula-diagram.js');const F=e.context.FormulaDiagram,goal={t1:30,t2:19.47};
  let g=F.guide('incident',{a:30+F.GHOST+1,s:-1},goal,null);assert.equal(g.ghost,false);assert.equal(g.snapped,false);
  g=F.guide('incident',{a:30+F.GHOST-1,s:-1},goal,null);assert.equal(g.ghost,true);assert.equal(g.snapped,false);assert.equal(g.line.a,30+F.GHOST-1);
  g=F.guide('incident',{a:30+F.SNAP-0.5,s:-1},goal,null);assert.equal(g.snapped,true);assert.equal(g.line.a,30);assert.equal(g.line.s,-1);
  g=F.guide('refracted',{a:19,s:-1},goal,-1);assert.equal(g.ghost,false,'same side as incident is wrong');
  g=F.guide('refracted',{a:22,s:1},goal,-1);assert.equal(g.snapped,true);assert.equal(g.line.a,19.47);
  assert.equal(F.guide('normal',{a:9},goal).snapped,true);assert.equal(F.guide('normal',{a:14},goal).snapped,false);
});
test('drawing starts empty, steps unlock in order, release on guide locks, completion fires once',()=>{
  const e=drawFixture('snell');const {goal}=e;
  assert.equal(e.g('normal').style.visibility,'hidden');assert.equal(e.g('incident').style.visibility,'hidden');
  assert.equal(e.button('Incident ray').disabled,true);
  e.dispatch('pointerdown',e.svg,{pointerId:1,...at('normal',40)});e.dispatch('pointermove',e.svg,{pointerId:1,...at('normal',40)});
  assert.equal(e.ghost(),'hidden');
  e.dispatch('pointermove',e.svg,{pointerId:1,...at('normal',12)});assert.equal(e.ghost(),'visible');
  e.dispatch('pointerup',e.svg,{pointerId:1,...at('normal',12)});assert.ok(!e.g('normal').classList.contains('fd-locked'),'released outside snap stays adjustable');
  e.drag('normal',[at('normal',12),at('normal',5)]);assert.ok(e.g('normal').classList.contains('fd-locked'));
  assert.equal(e.button('Incident ray').disabled,false);
  e.drag('incident',[at('incident',goal.t1+25,-1)]);assert.ok(!e.g('incident').classList.contains('fd-locked'));
  e.button('Check diagram').click();assert.match(e.status(),/closer to the normal/);
  e.drag('incident',[at('incident',goal.t1+3,-1)]);assert.ok(e.g('incident').classList.contains('fd-locked'));
  e.drag('refracted',[at('refracted',goal.t2,-1)]);assert.ok(!e.g('refracted').classList.contains('fd-locked'),'wrong side never snaps');
  e.button('Check diagram').click();assert.match(e.status(),/other side of the normal/);
  assert.equal(e.done(),0);
  e.drag('refracted',[at('refracted',goal.t2+2,1)]);assert.equal(e.done(),1);assert.equal(e.d.done,true);
  e.button('Check diagram').click();e.drag('refracted',[at('refracted',goal.t2,1)]);assert.equal(e.done(),1);
  const s=e.d.getState();assert.ok(s.locked.normal&&s.locked.incident&&s.locked.refracted);assert.equal(s.refracted.a,goal.t2);
});
test('critical angle: refracted ray must graze the boundary on the far side',()=>{
  const e=drawFixture('criticalAngle');const {goal}=e;assert.equal(goal.t2,90);
  e.drag('normal',[at('normal',0)]);e.drag('incident',[at('incident',goal.t1,1)]);
  e.drag('refracted',[at('refracted',60,-1)]);assert.equal(e.done(),0);
  e.button('Check diagram').click();assert.match(e.status(),/along the boundary/);
  e.drag('refracted',[at('refracted',86,-1)]);assert.equal(e.done(),1);
});
test('keyboard handles rotate in steps, snap and lock; hint reveals only the next step',()=>{
  const e=drawFixture('snell');const handle=k=>e.host.querySelectorAll('circle').find(c=>c.getAttribute('data-handle')===k);
  const hintEl=e.host.querySelector('#fd-hint');e.button('Diagram hint').click();
  assert.equal(hintEl.hidden,false);assert.match(hintEl.textContent,/perpendicular/);assert.doesNotMatch(hintEl.textContent,/θ₂/);
  const press=(k,key,shift=false)=>e.dispatch('keydown',handle(k),{key,shiftKey:shift});
  press('normal','ArrowLeft');assert.equal(e.d.getState().normal.a,34);
  for(let i=0;i<6;i++)press('normal','ArrowLeft',true);assert.ok(e.g('normal').classList.contains('fd-locked'));
  e.button('Diagram hint').click();assert.match(hintEl.textContent,/θ₁/);
  for(let i=0;i<40&&!e.d.getState().locked.incident;i++)press('incident',e.goal.t1>45?'ArrowUp':'ArrowDown');
  assert.ok(e.d.getState().locked.incident);assert.equal(e.d.getState().incident.a,e.goal.t1);
});
test('MCQ reveals an unsolved drawing; Next waits; credit once; Back restores drawing',()=>{
  const e=practiceFixture();e.context.FormulaPractice.start(['snell']);
  const q=e.context.FormulaPractice.question,dia=e.document.getElementById('formulaDiagram'),next=e.document.getElementById('formulaRollBtn');
  assert.equal(dia.hidden,true);
  e.document.getElementById('formulaOptions').children[q.correct].click();
  assert.equal(dia.hidden,false);assert.ok(e.document.getElementById('formulaWorkspace').classList.contains('has-diagram'));
  assert.equal(dia.querySelectorAll('g').filter(g=>g.style.visibility==='visible').length,0,'nothing pre-drawn');
  assert.equal(dia.querySelectorAll('input').length,0);
  assert.equal(next.disabled,true);assert.equal(e.context.FormulaPractice.totalAnswered(),0);
  next.click();assert.equal(e.context.FormulaPractice.question.id,q.id);
  const goal=e.context.FormulaDiagram.targets(q),svg=dia.querySelector('svg');
  const drag=p=>{e.dispatch('pointerdown',svg,{pointerId:1,...p});e.dispatch('pointerup',svg,{pointerId:1,...p});};
  drag(at('normal',0));drag(at('incident',goal.t1,-1));
  assert.equal(e.context.FormulaPractice.totalAnswered(),0);
  drag(at('refracted',goal.t2,1));
  assert.equal(next.disabled,false);assert.equal(e.context.FormulaPractice.totalAnswered(),1);
  next.click();assert.notEqual(e.context.FormulaPractice.question.id,q.id);
  e.document.getElementById('formulaBackBtn').click();assert.equal(e.context.FormulaPractice.question.id,q.id);
  const d2=e.document.getElementById('formulaDiagram');
  assert.equal(d2.hidden,false);assert.equal(d2.querySelectorAll('.fd-locked').length,3);
  assert.equal(next.disabled,false);assert.equal(e.context.FormulaPractice.totalAnswered(),1);
  e.document.getElementById('formulaOptions').children[q.correct].click();assert.equal(e.context.FormulaPractice.totalAnswered(),1);
});
test('quiz options are scoped to the quiz; leaving formulas clears its options',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','js/quiz-engine.js'),'utf8');
  assert.doesNotMatch(src,/document\.querySelectorAll\('\.opt'\)/);
  assert.match(src,/document\.querySelectorAll\('#options \.opt'\)\.forEach\(\(o,i\)=>\{ o\.disabled=true; if\(i===idx\) o\.classList\.add\('correct'\)/);
  const html=fs.readFileSync(path.join(__dirname,'..','quiz.html'),'utf8');
  assert.ok(html.indexOf('id="formulaOptions"')<html.indexOf('id="options"'),'formula options come first in the page');
  const e=practiceFixture();e.context.FormulaPractice.start(['waveSpeed']);
  e.document.getElementById('formulaOptions').children[e.context.FormulaPractice.question.correct].click();
  e.context.FormulaPractice.leave();assert.equal(e.document.getElementById('formulaOptions').children.length,0);
});
test('index labels keep up to 3 decimals',()=>{
  const e=environment();e.load('js/formula-diagram.js');const host=e.add('host');
  e.context.FormulaDiagram.mount(host,{formulaDiagram:{kind:'critical',values:{n1:1.461,n2:1,t2:90},target:'t1',precision:1},answerValue:43.2},()=>{});
  const t=host.querySelectorAll('text').map(n=>n.textContent);assert.ok(t.includes('Medium 1 · n₁ = 1.461'));assert.ok(t.includes('Medium 2 · n₂ = 1'));
});
test('keyboard path starts from the visible tool button and focuses a visible handle',()=>{
  const e=drawFixture('snell');const handle=k=>e.host.querySelectorAll('circle').find(c=>c.getAttribute('data-handle')===k);
  const tool=e.button('Normal');assert.equal(e.g('normal').style.visibility,'hidden');
  e.dispatch('keydown',tool,{key:'ArrowLeft'});
  assert.equal(e.g('normal').style.visibility,'visible');assert.equal(e.document.activeElement,handle('normal'));
  assert.equal(e.ghost(),'hidden','starter is off target');assert.equal(e.d.getState().normal.a,34);
  for(let i=0;i<6;i++)e.dispatch('keydown',e.document.activeElement,{key:'ArrowLeft',shiftKey:true});
  assert.ok(e.d.getState().locked.normal);
  const inc=e.button('Incident ray');inc.click();
  assert.equal(e.g('incident').style.visibility,'visible');assert.equal(e.document.activeElement,handle('incident'));
  assert.ok(Math.abs(e.d.getState().incident.a-e.goal.t1)>=e.context.FormulaDiagram.GHOST);assert.equal(e.d.getState().locked.incident,undefined);
});
test('pointercancel ends the drag without locking and keeps the raw line adjustable',()=>{
  const e=drawFixture('snell');
  e.dispatch('pointerdown',e.svg,{pointerId:1,...at('normal',30)});e.dispatch('pointermove',e.svg,{pointerId:1,...at('normal',4)});
  assert.equal(e.ghost(),'visible');
  e.dispatch('pointercancel',e.svg,{pointerId:1,...at('normal',4)});
  assert.equal(e.d.getState().locked.normal,undefined);assert.ok(Math.abs(e.d.getState().normal.a-4)<1e-6,'raw, not snapped');
  assert.equal(e.ghost(),'hidden');assert.equal(e.done(),0);
  e.dispatch('pointermove',e.svg,{pointerId:1,...at('normal',40)});assert.ok(Math.abs(e.d.getState().normal.a-4)<1e-6,'drag ended');
  e.drag('normal',[at('normal',2)]);assert.ok(e.d.getState().locked.normal);
});

test('a bank optics question gets the same gated drawing; bank-only formulas join the strip',()=>{
  const e=practiceFixture();
  const bank=JSON.parse(fs.readFileSync(path.join(__dirname,'..','banks/medphys/pt2.json'),'utf8'));
  const reg=bank.bank.A.filter(q=>q.formula).map(q=>({...q,__id:q.id}));
  e.context.StudyQuiz={formulaBank:()=>({questions:reg,names:bank.formulaNames})};
  e.context.FormulaPractice.start(['refractiveIndex','snell','criticalAngle'],'ch5');
  const fp=e.context.FormulaPractice,next=e.document.getElementById('formulaRollBtn');
  const strip=()=>e.document.getElementById('formulaFamilyStrip').children.map(c=>c.textContent);
  assert.ok(strip().some(t=>t.startsWith('Law of reflection')));assert.ok(strip().some(t=>t.startsWith('Mirror equation')));
  let guard=0;while(fp.question.bankId!=='PHY50020'&&guard++<20){e.document.getElementById('formulaOptions').children[fp.question.correct].click();next.click();}
  const q=fp.question,orig=reg.find(x=>x.id==='PHY50020');
  assert.equal(q.q,orig.q);assert.equal(q.options[q.correct],orig.options[orig.correct]);
  const before=fp.totalAnswered();
  e.document.getElementById('formulaOptions').children[q.correct].click();
  const dia=e.document.getElementById('formulaDiagram');assert.equal(dia.hidden,false);
  assert.equal(next.disabled,true);assert.equal(fp.totalAnswered(),before);
  const goal=e.context.FormulaDiagram.targets(q);assert.ok(Math.abs(goal.t2-22.08)<0.01);
  const svg=dia.querySelector('svg'),tap=p=>{e.dispatch('pointerdown',svg,{pointerId:1,...p});e.dispatch('pointerup',svg,{pointerId:1,...p});};
  const at=(n,a,s)=>{const t=a*Math.PI/180;return n==='normal'?{clientX:280,clientY:60}:{clientX:280+s*100*Math.sin(t),clientY:160+(n==='refracted'?1:-1)*100*Math.cos(t)};};
  tap(at('normal'));tap(at('incident',30,-1));tap(at('refracted',goal.t2,1));
  assert.equal(next.disabled,false);assert.equal(fp.totalAnswered(),before+1);
});
test('question stems, step prompts and the step recap render math',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','js/quiz-engine.js'),'utf8');
  const body=src.slice(src.indexOf('\nfunction renderQuestion('),src.indexOf('\n}',src.indexOf('\nfunction renderQuestion(')));
  assert.ok(body.indexOf("pr.append(txt);")<body.indexOf('renderMathIn(qText);'),'prompt built before rendering');
  const recap=src.slice(src.indexOf('\nfunction renderStepRecap('),src.indexOf('\nfunction renderQuestion('));
  assert.match(recap,/renderMathIn\(document\.getElementById\('stepRecap'\)\);/);
  const bank=JSON.parse(fs.readFileSync(path.join(__dirname,'..','banks/medphys/pt2.json'),'utf8'));
  const q=bank.bank.A.find(x=>x.id==='PHY30047');assert.ok(q.steps.some(s=>/\\\(Q = A \\bar\{v\}\\\)/.test(s.prompt)),'fixture prompt uses \\( \\)');
});
