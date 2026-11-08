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
function diagramFixture(kind='critical',target='t1') {
  const e=environment();e.load('js/formula-diagram.js');
  const answer=Math.asin(1/1.5)*180/Math.PI;
  const q={answerValue:answer,formulaDiagram:{kind,values:{n1:1.5,n2:1,t2:90},target,precision:1}};
  const host=e.add('host');let awards=0;
  const d=e.context.FormulaDiagram.mount(host,q,()=>awards++);
  return {...e,q,host,d,awards:()=>awards};
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
test('numeric validation rejects blank, nonfinite and out-of-domain values; precision matches display',()=>{
  const e=environment();e.load('js/formula-diagram.js');const {parse,accepts}=e.context.FormulaDiagram;
  for(const raw of ['', ' ', 'Infinity','NaN','-1','91'])assert.equal(parse('t1',raw),null);
  assert.equal(parse('n1','0'),null);assert.equal(parse('n1','-1'),null);
  assert.equal(parse('t1','0'),0);assert.equal(parse('t1','90'),90);
  assert.ok(accepts(41.8,41.8103149,1));assert.ok(!accepts(41.7,41.8103149,1));
  assert.ok(accepts(1.333,4/3,3));assert.ok(!accepts(1.33,4/3,3));
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
test('diagram starts unsolved, previews input, rejects mistakes, locks correctly once and cancels pending frames',()=>{
  const e=diagramFixture(),input=e.document.getElementById('fd-t1'),form=e.host.querySelector('form');
  assert.equal(input.value,'');assert.equal(input.readOnly,false);
  assert.equal(e.document.getElementById('fd-n1').readOnly,true);
  const ray=e.host.querySelectorAll('g').find(n=>n.getAttribute('data-ray')==='incident');
  assert.equal(ray.style.visibility,'hidden');
  input.value='30';e.dispatch('input',input);e.flush();assert.equal(ray.style.transform,'rotate(-30deg)');
  e.dispatch('submit',form);assert.equal(e.awards(),0);assert.equal(input.getAttribute('aria-invalid'),'true');
  input.value='41.8';e.dispatch('input',input);e.dispatch('submit',form);
  assert.equal(e.awards(),1);assert.equal(input.readOnly,true);assert.equal(form.querySelector('button').disabled,true);
  e.dispatch('submit',form);e.d.complete();assert.equal(e.awards(),1);
  e.dispatch('input',input);assert.ok(e.frames.size);e.d.destroy();assert.equal(e.frames.size,0);assert.equal(e.host.hidden,true);
});
test('exploration preserves question locks and hides transmitted ray in TIR',()=>{
  const e=diagramFixture();e.d.complete();
  const fixed=e.document.getElementById('fd-t1').value,angle=e.document.getElementById('fd-explore-angle');
  angle.value='60';e.dispatch('input',angle);e.flush();
  const transmitted=e.host.querySelectorAll('g').find(n=>n.getAttribute('data-ray')==='refracted');
  assert.equal(transmitted.style.visibility,'hidden');assert.equal(e.document.getElementById('fd-t1').value,fixed);
  const critical=e.host.querySelectorAll('button').find(n=>n.textContent==='At critical angle');
  critical.click();e.flush();assert.equal(transmitted.style.visibility,'visible');assert.equal(transmitted.style.transform,'rotate(-90deg)');
  angle.value='-2';e.dispatch('input',angle);assert.equal(angle.getAttribute('aria-invalid'),'true');
  assert.equal(e.awards(),0);
});
function practiceFixture() {
  const e=environment();
  for(const id of ['formulaWorkspace','formulaBackBtn','formulaView','formulaTitle','formulaElapsed','formulaQText','formulaDiagram','formulaOptions','formulaFeedback','formulaHintBox','formulaHintText','formulaShowBtn','formulaFamilyStrip','formulaStatus','formulaPanel','formulaAdvanceWrap','formulaAdvanceFill','formulaRollBtn','formulaSetsBtn'])e.add(id);
  e.context.showView=id=>{e.document.getElementById(id)?.classList.add('active');};
  e.context.__activeMaterial={formulas:{gen:'Pt2FormulaGen',key:'test'}};
  e.load('js/formula-gen-pt2.js');e.load('js/formula-diagram.js');e.load('js/formula-practice.js');return e;
}
test('numeric and MCQ completion share progress, retain green answer state and wait for explicit next',()=>{
  const e=practiceFixture();e.context.FormulaPractice.start(['criticalAngle']);
  const q=e.context.FormulaPractice.question,input=e.document.getElementById('fd-'+q.formulaDiagram.target);
  assert.equal(e.document.getElementById('formulaDiagram').hidden,true);
  e.document.getElementById('formulaOptions').children[q.correct].click();
  assert.equal(e.document.getElementById('formulaDiagram').hidden,false);
  assert.ok(e.document.getElementById('formulaWorkspace').classList.contains('has-diagram'));
  assert.equal(input.readOnly,true);
  assert.equal(e.context.FormulaPractice.totalAnswered(),1);
  const options=e.document.getElementById('formulaOptions').children;
  assert.ok(options[q.correct].classList.contains('correct'));assert.ok(options.every(n=>n.disabled));
  options[q.correct].click();assert.equal(e.context.FormulaPractice.totalAnswered(),1);
  assert.ok(!e.document.getElementById('formulaView').classList.contains('formula-waiting'));
  assert.ok(![...e.timers.values()].some(t=>t.ms>=3200));
  const hint=e.document.getElementById('fd-hint');
  const hintButton=e.document.getElementById('formulaDiagram').querySelectorAll('button').find(b=>b.textContent==='Diagram hint');
  assert.equal(hint.hidden,true);hintButton.click();assert.equal(hint.hidden,false);
  e.document.getElementById('formulaRollBtn').click();assert.notEqual(e.context.FormulaPractice.question.id,q.id);
  assert.equal(e.document.getElementById('formulaDiagram').hidden,true);
  e.document.getElementById('formulaBackBtn').click();assert.equal(e.context.FormulaPractice.question.id,q.id);
  assert.equal(e.document.getElementById('formulaDiagram').hidden,false);
  assert.equal(e.context.FormulaPractice.totalAnswered(),1);
  assert.ok(e.document.getElementById('formulaOptions').children[q.correct].classList.contains('correct'));
  e.context.FormulaPractice.leave();assert.equal(e.document.getElementById('formulaDiagram').hidden,true);
});
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
