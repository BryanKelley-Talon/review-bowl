// ============================================================
// THE COURT — Review Bowl volleyball's rally engine and its 16-bit gym.
//
// Ported from the concept BK played on 2026-10-03 (artifact "Review Bowl Volleyball", source
// in _INBOX/josh-volleyball-concept-source-2026-10-03.html, sha256 a30d92a8…b4869, the
// post-playtest version with the ace fix). The rally, the timing and the art are the concept's;
// what changed is the wiring:
//   • the call bar is React's (onUI), and every word comes from sport.js (VB)
//   • the stoppages belong to VolleyMatch.jsx: coin toss, timeouts, set point, set breaks and
//     the press conference. The court never asks a question; it pauses and hands over.
//   • the teams are the league's (teams.js), and your side wears your roster's numbers
//   • the guided first rally: a coach card at each touch, the first time it comes up (BK 15:24)
//
// Nothing here is stored or sent. The court forgets everything when the match ends.
// ============================================================
import { TEAMS as LEAGUE } from './teams.js'
import { VB as W8 } from './sport.js'

// The league's kits in the court's shape: jersey + trim. Trim is the helmet colour, or the pants
// when the helmet matches the jersey, or white (the concept's own table matched this rule).
function trimOf(k) { return k.helmet && k.helmet !== k.jersey ? k.helmet : k.pants && k.pants !== k.jersey ? k.pants : '#F2F2F2' }
const TEAMS = LEAGUE.map(t => ({ id: t.id, name: t.name, abbr: t.abbr, c: t.colors, changeAgainst: t.changeAgainst,
  kit: { j: t.kit.jersey, t: trimOf(t.kit) }, alt: { j: t.alt.jersey, t: trimOf(t.alt) } }))

export function createCourt(canvas, opts = {}) {
const rgb = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
function cdist(a,b){const[r1,g1,b1]=rgb(a),[r2,g2,b2]=rgb(b);const rm=(r1+r2)/2;return Math.sqrt((2+rm/256)*(r1-r2)**2+4*(g1-g2)**2+(2+(255-rm)/256)*(b1-b2)**2)}
const CVD={deut:[[.367,.861,-.228],[.280,.673,.047],[-.012,.043,.969]],prot:[[.152,1.053,-.205],[.115,.786,.099],[-.004,-.048,1.052]]};
const toHex=c=>'#'+c.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const seenAs=(h,m)=>{const c=rgb(h);return toHex(CVD[m].map(r=>r[0]*c[0]+r[1]*c[1]+r[2]*c[2]))};
const apart=(a,b)=>cdist(a,b)>115&&Math.min(...Object.keys(CVD).map(m=>cdist(seenAs(a,m),seenAs(b,m))))>40;
const lum=h=>{const[r,g,b]=rgb(h);return (0.299*r+0.587*g+0.114*b)/255};

// ───────────────────────── canvas + projection ─────────────────────────
const W=384,H=216;
const cv=canvas;
const screenCtx=cv.getContext('2d');
let G=screenCtx;                       // current drawing context (swapped for the celebration sprite)
const KX=18,SH=4.4,KY=9,KZ=15,Y0=206;
const sc=y=>1-0.018*y;
function P(x,y,z=0){const s=sc(y);return [Math.round(192+x*KX*s+(y-4.5)*SH),Math.round(Y0-y*KY-z*KZ*s)]}
function unP(sx,sy){const y=(Y0-sy)/KY;const s=sc(y);return {x:(sx-192-(y-4.5)*SH)/(KX*s),y}}
const R=(x,y,w,h,c)=>{G.fillStyle=c;G.fillRect(Math.round(x),Math.round(y),w,h)};
function L(x0,y0,x1,y1,c){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
  const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx+dy;G.fillStyle=c;
  for(let i=0;i<600;i++){G.fillRect(x0,y0,1,1);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx}if(e2<=dx){e+=dx;y0+=sy}}}
function ell(cx,cy,rx,ry,c){G.fillStyle=c;const n=Math.max(12,Math.round(rx*4));for(let i=0;i<n;i++){const a=i/n*Math.PI*2;G.fillRect(Math.round(cx+Math.cos(a)*rx),Math.round(cy+Math.sin(a)*ry),1,1)}}

// 5×7 pixel font
const F={A:" ### |#   #|#   #|#####|#   #|#   #|#   #",B:"#### |#   #|#   #|#### |#   #|#   #|#### ",C:" ####|#    |#    |#    |#    |#    | ####",D:"#### |#   #|#   #|#   #|#   #|#   #|#### ",E:"#####|#    |#    |#### |#    |#    |#####",F:"#####|#    |#    |#### |#    |#    |#    ",G:" ####|#    |#    |#  ##|#   #|#   #| ####",H:"#   #|#   #|#   #|#####|#   #|#   #|#   #",I:"#####|  #  |  #  |  #  |  #  |  #  |#####",J:"  ###|   # |   # |   # |   # |#  # | ##  ",K:"#   #|#  # |# #  |##   |# #  |#  # |#   #",L:"#    |#    |#    |#    |#    |#    |#####",M:"#   #|## ##|# # #|# # #|#   #|#   #|#   #",N:"#   #|##  #|# # #|#  ##|#   #|#   #|#   #",O:" ### |#   #|#   #|#   #|#   #|#   #| ### ",P:"#### |#   #|#   #|#### |#    |#    |#    ",Q:" ### |#   #|#   #|#   #|# # #|#  # | ## #",R:"#### |#   #|#   #|#### |# #  |#  # |#   #",S:" ####|#    |#    | ### |    #|    #|#### ",T:"#####|  #  |  #  |  #  |  #  |  #  |  #  ",U:"#   #|#   #|#   #|#   #|#   #|#   #| ### ",V:"#   #|#   #|#   #|#   #|#   #| # # |  #  ",W:"#   #|#   #|#   #|# # #|# # #|## ##|#   #",X:"#   #|#   #| # # |  #  | # # |#   #|#   #",Y:"#   #|#   #| # # |  #  |  #  |  #  |  #  ",Z:"#####|    #|   # |  #  | #   |#    |#####",
0:" ### |#   #|#  ##|# # #|##  #|#   #| ### ",1:"  #  | ##  |  #  |  #  |  #  |  #  | ### ",2:" ### |#   #|    #|   # |  #  | #   |#####",3:"#### |    #|    #| ### |    #|    #|#### ",4:"#   #|#   #|#   #|#####|    #|    #|    #",5:"#####|#    |#### |    #|    #|#   #| ### ",6:" ### |#    |#    |#### |#   #|#   #| ### ",7:"#####|    #|   # |  #  |  #  |  #  |  #  ",8:" ### |#   #|#   #| ### |#   #|#   #| ### ",9:" ### |#   #|#   #| ####|    #|    #| ### ",
'!':"  #  |  #  |  #  |  #  |  #  |     |  #  ",'-':"     |     |     |#####|     |     |     ",':':"     |  #  |     |     |     |  #  |     ",'.':"     |     |     |     |     |     |  #  ",' ':"     |     |     |     |     |     |     "};
const FG={};for(const k in F)FG[k]=F[k].split('|');
const tw=(s,k=1)=>s.length*6*k-k;
function txt(s,x,y,c,k=1,shadow){s=String(s).toUpperCase();if(shadow){const o=Math.min(k,2);txt(s,x+o,y+o,shadow,k)}G.fillStyle=c;
  for(let i=0;i<s.length;i++){const g=FG[s[i]]||FG[' '];for(let r=0;r<7;r++)for(let q=0;q<5;q++)if(g[r][q]==='#')G.fillRect(Math.round(x+(i*6+q)*k),Math.round(y+r*k),k,k)}}

// seeded random
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rand=(a=0,b=1)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const AUTO=!!opts.auto;

// ───────────────────────── state ─────────────────────────
const S={phase:'menu',ts:1,score:[0,0],sets:[0,0],setNo:1,serve:-1,target:15,timeouts:2,readBoost:false,
  you:0,opp:2,form:6,oppForm:6,steady:false,stats:{},ostats:{},kits:null,players:[],ball:{x:0,y:4.5,z:0,f:null,held:null},
  reticle:{x:5,y:4.5},pops:[],cele:null,cheerUntil:0,choice:null,blockChoice:null,readAt:Infinity,aiHitter:null,
  contactAt:0,digAt:0,digWin:0,digInfo:null,swing:null,meter:null,rally:0,over:false,paused:false,tutorial:null,setPointAsked:0};
let gt=0,rt=0,timers=[];
const after=(t,fn)=>timers.push({at:gt+t,fn});

// Lane → stat (Review Bowl lanes; stat names are volleyball's)
const LANEMAP=[['Reading sources','sources','Setting'],['Historical context','context','Passing'],['Content vocabulary','vocab','Hitting'],['Task words','reading','Blocking'],['Skills','skills','Serving'],['Defense (Practice Week)','defense','Digging']];
// stats arrive keyed by the football stat they sit on (ratings.js); the court reads volleyball names.
const VBKEY={throwing:'Setting',hands:'Passing',speed:'Hitting',blocking:'Blocking',toughness:'Serving',defense:'Digging'};
function setStats(v,opp){S.stats={};S.ostats={};for(const k in VBKEY){S.stats[VBKEY[k]]=clamp(v[k]??5,1,10);S.ostats[VBKEY[k]]=clamp(opp,1,10)}}

// ───────────────────────── players ─────────────────────────
const SKIN=['#f1c7a3','#e3b089','#c98e62','#a8714a','#7a4b2c','#5c3a22'];
const HAIR=['#2a1a10','#5a3a1e','#8b5a2b','#c99a55','#1a1a1a','#6b2f1a'];
function makeSide(s,r){const nums=[1,2,3,4,5,6,7,8,9].sort(()=>r()-0.5);let ni=0;const mine=s<0?(opts.numbers||{}):{};const used=new Set(Object.values(mine));const free=nums.filter(n=>!used.has(n));let fi=0;const near=1.5,mid=4.5,far=7.5;const OH=s<0?far:near,RS=s<0?near:far,SB=s<0?near:far;
  return [{role:'OH',hx:s*2.2,hy:OH},{role:'MB',hx:s*1.8,hy:mid},{role:'RS',hx:s*2.2,hy:RS},{role:'S',hx:s*6.2,hy:SB},{role:'LI',hx:s*6.6,hy:mid},{role:'DS',hx:s*6.2,hy:OH}]
   .map(p=>({...p,side:s,x:p.hx,y:p.hy,z:0,tx:p.hx,ty:p.hy,pose:'ready',poseUntil:0,jump:null,face:-s,
     skin:SKIN[Math.floor(r()*SKIN.length)],hair:HAIR[Math.floor(r()*HAIR.length)],tail:r()<0.6,band:r()<0.3,num:s<0?(mine[p.role]??free[fi++]??nums[ni++]):nums[ni++]}))}
const side=s=>S.players.filter(p=>p.side===s);
const role=(s,ro)=>S.players.find(p=>p.side===s&&p.role===ro);
const ST=s=>({x:s*0.9,y:s<0?3.6:5.4});
function home(){for(const p of S.players){p.tx=p.hx;p.ty=p.hy}}
function pose(p,ps,dur=0.5){p.pose=ps;p.poseUntil=gt+dur}
function jump(p,h,dur){p.jump={t0:gt,h,dur}}
function nearest(s,pt,filter=()=>true){let best=null,bd=1e9;for(const p of side(s)){if(!filter(p))continue;const d=Math.hypot(p.x-pt.x,p.y-pt.y);if(d<bd){bd=d;best=p}}return[best,bd]}

// ───────────────────────── ball ─────────────────────────
function fly(from,to,dur,apex,onEnd){const b=S.ball;b.held=null;b.f={from:{...from},to:{...to},t0:gt,dur,apex,onEnd};b.x=from.x;b.y=from.y;b.z=from.z}
function ballStep(){const b=S.ball;if(b.held){b.x=b.held.x+b.held.face*0.25;b.y=b.held.y;b.z=1.4;return}
  const f=b.f;if(!f)return;const u=clamp((gt-f.t0)/f.dur,0,1);
  b.x=f.from.x+(f.to.x-f.from.x)*u;b.y=f.from.y+(f.to.y-f.from.y)*u;b.z=Math.max(0,f.from.z+(f.to.z-f.from.z)*u+4*f.apex*u*(1-u));
  if(u>=1){b.f=null;f.onEnd&&f.onEnd()}}

// ───────────────────────── UI ─────────────────────────
let callFns=[];
let lastUI={text:'',buttons:[]};
function ui(text,buttons=[]){callFns=buttons.map(b=>b.disabled?null:b.fn);lastUI={text,buttons};opts.onUI&&opts.onUI(lastUI)}
function timeoutBtn(){return{label:W8.timeout(S.timeouts),key:'T',timeout:true,disabled:S.timeouts<=0,why:W8.noTimeouts,fn:askTimeout}}
function pop(text,x,y,z=0.3){const n=S.pops.filter(q=>rt-q.t0<0.9).length;S.pops.push({text,x,y,z,t0:rt,lift:n*9})}
// coach cards (BK 15:24): each touch's card shows once, the first time that touch comes up
const COACH_ORDER=['serve','pass','set','attack','block','dig'];
function coach(key){const T=S.tutorial;if(!T||T.seen[key])return;T.seen[key]=true;T.queue.push(key);
  if(!S.paused){S.paused=true;opts.onCoach&&opts.onCoach(T.queue[0])}}
function coachDone(skip){const T=S.tutorial;if(!T)return;if(skip){S.tutorial=null;S.paused=false;opts.onCoach&&opts.onCoach(null);const n=S.afterCoach;S.afterCoach=null;n&&n();return}
  T.queue.shift();if(T.queue.length){opts.onCoach&&opts.onCoach(T.queue[0]);return}
  S.paused=false;opts.onCoach&&opts.onCoach(null);
  if(T.wrapShown){S.tutorial=null;const n=S.afterCoach;S.afterCoach=null;n&&n()}}
function coachWrap(){const T=S.tutorial;if(!T||T.wrapShown||!COACH_ORDER.every(k=>T.seen[k]))return false;T.wrapShown=true;T.queue.push('wrap');S.paused=true;opts.onCoach&&opts.onCoach('wrap');return true}

// ───────────────────────── match flow ─────────────────────────
function kitFor(t,other){const strips=[t.kit,t.alt,{j:'#2B2F36',t:'#F2F2F2'}].filter((k,i)=>!(i===0&&(t.changeAgainst||[]).includes(other.id)));return strips}
function startMatch(firstServe,tutorial){
  const y=TEAMS[S.you],o=TEAMS[S.opp];const ok=kitFor(y,o)[0];const ok2=kitFor(o,y).find(k=>apart(ok.j,k.j))||{j:'#2B2F36',t:'#F2F2F2'};
  S.kits={[-1]:ok,[1]:ok2};
  const r=rng(S.you*31+S.opp*7+11);S.players=[...makeSide(-1,r),...makeSide(1,r)];
  buildCrowd();buildBg();spriteCache.clear();
  S.score=[0,0];S.sets=[0,0];S.setNo=1;S.timeouts=2;S.serve=firstServe;S.over=false;S.setPointAsked=0;
  S.tutorial=tutorial?{seen:{},queue:[],wrapShown:false}:null;
  S.paused=false;go();
}
function go(){const s=S.score,lead=Math.abs(s[0]-s[1]),sp=(s[0]>=S.target-1||s[1]>=S.target-1)&&s[0]!==s[1];
  if(opts.beforeRally&&sp&&S.setPointAsked!==S.setNo){S.setPointAsked=S.setNo;S.paused=true;opts.beforeRally({who:s[0]>s[1]?'you':'them'},()=>{S.paused=false;newRally()});return}
  newRally()}
function newRally(){
  S.rally=0;S.choice=null;S.blockChoice=null;S.readAt=Infinity;S.aiHitter=null;S.swing=null;S.meter=null;S.digInfo=null;S.ts=1;
  home();for(const p of S.players){p.x=p.tx;p.y=p.ty;p.z=0;p.jump=null;p.pose='ready'}
  const s=S.serve,sv=role(s,'LI');sv.x=sv.tx=s*9.7;sv.y=sv.ty=4.5;sv.face=-s;S.ball.f=null;S.ball.held=sv;
  if(s<0){S.phase='serveAim';S.reticle={x:5.5,y:4.5};
    ui(W8.yourServe,[timeoutBtn()]);coach('serve');
    if(AUTO)after(0.6,()=>{S.reticle={x:rand(2,8),y:rand(1,8)};aimServe()})}
  else{S.phase='oppServe';ui(W8.theirServe,[timeoutBtn()]);after(1.8,()=>{if(S.phase==='oppServe')aiServe()})}
}
function aimServe(){S.phase='serveMeter';S.meter={t0:gt,green:(0.05+S.stats.Serving*0.012)*(S.steady?1.8:1)};ui(W8.meter,[]);
  if(AUTO)after(0.6+Math.random()*0.4,()=>strikeServe())}
function meterPos(){return 0.5+0.5*Math.sin((gt-S.meter.t0)*Math.PI*2/1.3-Math.PI/2)}
function strikeServe(){const m=meterPos(),d=Math.abs(m-0.5),g=S.meter.green;let q,err=null;
  if(d<g){q=1;pop('PERFECT',-9,4.5,3)}else if(d<g+0.13){q=0.55;pop('GOOD',-9,4.5,3)}else{err=m<0.5?'net':'long';q=0}
  S.meter=null;doServe(-1,{...S.reticle},q,err)}
function aiServe(){const o=S.ostats.Serving;const err=Math.random()<0.09-o*0.004?(Math.random()<0.5?'net':'long'):null;
  doServe(1,{x:rand(-8.4,-1.5),y:rand(0.6,8.4)},clamp(rand(0.2,0.6)+o*0.04,0,1),err)}
function doServe(s,t,q,err){
  S.phase='rally';ui(s<0?W8.serveAway:W8.hereItComes,[]);
  const sv=role(s,'LI');pose(sv,'swing',0.4);const from={x:sv.x,y:sv.y,z:2.7};
  // scatter: better serving lands closer to the aim
  const st=s<0?S.stats.Serving:S.ostats.Serving;t.x+=rand(-1,1)*(10-st)*0.06;t.y+=rand(-1,1)*(10-st)*0.06;
  after(0.5,()=>{sv.tx=s*6.6;sv.ty=4.5});
  if(err==='net'){fly(from,{x:s*0.05,y:t.y,z:1.7},0.8,0.6,()=>{fly({...S.ball},{x:s*0.6,y:t.y,z:0},0.4,0,()=>{pop('NET',0,t.y,2);point(-s,'error')})});return}
  if(err==='long'){const out={x:-s*10.6,y:t.y,z:0};fly(from,out,1.2,2.4,()=>{pop('OUT',out.x,out.y);point(-s,'error')});return}
  const inn=Math.abs(t.x)<=9&&t.y>=0&&t.y<=9;
  const dur=1.25-q*0.25;
  const r=-s;const[rec,d0]=nearest(r,t,p=>p.role!=='S'&&p.role!=='MB');
  if(rec&&inn){rec.tx=t.x;rec.ty=t.y}
  fly(from,{x:t.x,y:t.y,z:0.6},dur,2.3+(1-q)*0.6,()=>{
    if(!inn){pop('OUT',t.x,t.y);fly({...S.ball},{x:t.x,y:t.y,z:0},0.1,0,()=>point(r,'error'));return}
    const ps=r<0?S.stats.Passing:S.ostats.Passing;const eff=Math.max(0,d0-4.3*dur*0.8);
    const pAce=clamp(0.02+q*0.06+eff*0.04-(ps-5)*0.01,0.01,0.16);
    const score=ps/10*1.1-q*0.35-eff*0.25+rand(-0.2,0.2);
    const pq=Math.random()<pAce?0:score<0.25?1:score<0.55?2:3;
    if(pq===0){pose(rec,'dig',0.5);fly({...S.ball},{x:t.x+r*-1.5,y:clamp(t.y+rand(-3,3),-1,10),z:0},0.5,0.8,()=>point(s,'ace'));return}
    pass(r,rec,pq,dur);
  });
}
// a pass or dig sends the ball to the setter; quality decides which sets are open
function pass(s,by,pq,_){
  pose(by,pq>=2?'bump':'dig',0.5);
  const st=ST(s),setter=role(s,'S');setter.tx=st.x;setter.ty=st.y;
  const off=pq===3?0:pq===2?0.6:1.6;const to={x:st.x+s*rand(0,off),y:st.y+rand(-off,off),z:2.5};
  setter.tx=to.x;setter.ty=to.y;
  // hitters pull back to start the approach
  for(const ro of['OH','MB','RS']){const h=role(s,ro);h.tx=s*3.6;h.ty=h.hy}
  const dur=1.05;S.rally++;
  const opn=pq===3?['OH','MB','RS']:pq===2?['OH','RS']:['OH'];
  if(pq===3)pop('PERFECT PASS',by.x,by.y,2.2);else if(pq===1)pop('SHANKED',by.x,by.y,2.2);
  if(s<0){S.phase='setCall';S.ts=AUTO?1:0.42;S.choice=null;
    const lbl=W8.setLabels;
    ui(pq===3?W8.callSet:pq===2?W8.callSetMid:W8.shanked,['OH','MB','RS'].map((ro,i)=>({label:lbl[ro],key:String(i+1),disabled:!opn.includes(ro),why:W8.needsPass,fn:()=>{S.choice=ro;ui(W8.setTo(lbl[ro].toLowerCase()),[])}})));
    coach('pass');coach('set');
    if(AUTO)after(0.3,()=>{S.choice=opn[Math.floor(Math.random()*opn.length)]})
  }else{
    const w=pq===3?[0.45,0.3,0.25]:[0.65,0,0.35];const roll=Math.random();const pick=roll<w[0]?'OH':roll<w[0]+w[1]?'MB':'RS';
    S.aiHitter=opn.includes(pick)?pick:'OH';S.blockChoice=null;S.phase='blockCall';S.ts=AUTO?1:0.42;
    const lead=0.15+S.stats.Blocking*0.06+(S.readBoost?0.35:0);S.readAt=gt+dur-lead;
    const lbl=W8.blockLabels;
    ui(W8.blockCall,['OH','MB','RS'].map((ro,i)=>({label:lbl[ro],key:String(i+1),fn:()=>{S.blockChoice=ro;ui(W8.blocking(lbl[ro].toLowerCase()),[])}})));
    coach('block');
    if(AUTO)after(dur-lead+0.1,()=>{if(!S.blockChoice)S.blockChoice=Math.random()<0.6?S.aiHitter:'MB'})
  }
  fly({...S.ball},to,dur,2.2,()=>doSet(s,s<0?(S.choice&&opn.includes(S.choice)?S.choice:'OH'):S.aiHitter,pq));
}
function doSet(s,ro,pq){
  const setter=role(s,'S');pose(setter,'set',0.5);S.readAt=Infinity;
  const h=role(s,ro);const C={x:s*0.55,y:h.hy,z:ro==='MB'?2.7:2.9};
  const dur=ro==='MB'?0.45:ro==='OH'?1.05:0.8,apex=ro==='MB'?0.2:ro==='OH'?1.9:1.2;
  const sq=(s<0?S.stats.Setting:S.ostats.Setting);C.y+=rand(-1,1)*(10-sq)*0.05;S.setQ=sq;
  h.tx=s*0.9;h.ty=C.y;after(Math.max(0,dur-0.32),()=>{jump(h,0.8,0.64);pose(h,'spike',0.7)});
  // the defending side's block
  const d=-s;let committed;
  if(d>0){const guess=Math.random()<0.33+0.035*S.ostats.Blocking?ro:['OH','MB','RS'][Math.floor(Math.random()*3)];committed=guess===ro?(ro==='MB'&&Math.random()<0.5?'late':'yes'):'no';S.oppBlockOn=guess}
  else{const bc=S.blockChoice||'MB';committed=bc===ro?'yes':'no';S.oppBlockOn=bc}
  const blk=blockerFor(d,S.oppBlockOn);blk.tx=d*0.45;blk.ty=role(s,S.oppBlockOn).hy;
  after(Math.max(0,dur-0.3+(committed==='late'?0.12:0)),()=>{jump(blk,0.7,0.6);pose(blk,'block',0.7)});
  S.blockInfo={committed,blk,shade:Math.random()<0.5?'line':'cross'};
  if(s<0){S.phase='spike';S.ts=AUTO?1:0.6;S.contactAt=gt+dur;S.swing=null;S.hitter=h;S.C=C;
    ui(W8.swingCall,[]);coach('attack');
    if(AUTO)after(dur+rand(-0.05,0.05),()=>{S.reticle={x:rand(1,8.5),y:rand(0.5,8.5)};trySwing()})}
  else{S.phase='rally';ui(W8.theirAttack,[])}
  fly({...S.ball},C,dur,apex,()=>{
    if(s>0){aiSpike(h,C);return}
    // hold the ball at contact for the late window; no swing means a weak down ball
    S.ball.f={from:{...C},to:{...C},t0:gt,dur:9,apex:0,onEnd:null};
    after(windows().ok*1.0,()=>{if(S.phase==='spike'&&!S.swing){S.reticle={x:5,y:4.5};swing(-1,h,C,{x:5,y:4.5},'off',true)}});
  });
}
function blockerFor(d,hitterRole){ // the defender's front player facing that hitter (same y)
  const y=role(-d,hitterRole).hy;return side(d).filter(p=>['OH','MB','RS'].includes(p.role)).sort((a,b)=>Math.abs(a.hy-y)-Math.abs(b.hy-y))[0]}
function windows(stat){const v=stat??S.stats.Hitting;const k=S.steady?1.9:1;return{perfect:(0.06+v*0.006)*k,ok:(0.14+v*0.012)*k}}
function trySwing(){if(S.phase!=='spike'||S.swing)return;const err=gt-S.contactAt;if(err<-0.5)return;
  const w=windows();const a=Math.abs(err);const grade=a<w.perfect?'perfect':a<w.ok?'good':'off';
  pop(grade==='perfect'?'PERFECT':grade==='good'?'GOOD':err<0?'EARLY':'LATE',S.C.x,S.C.y,3.6);
  swing(-1,S.hitter,S.C,{...S.reticle},grade,false)}
function aiSpike(h,C){const o=S.ostats.Hitting;const g=Math.random();const grade=g<0.15+o*0.03?'perfect':g<0.75?'good':'off';
  let t={x:rand(-8.6,-1.2),y:rand(0.3,8.7)};if(Math.random()<0.15)t={x:rand(-2.2,-0.8),y:rand(1,8)};swing(1,h,C,t,grade,false)}
function swing(s,h,C,t,grade,downBall){
  S.swing=true;S.phase='rally';S.ts=1;ui(s<0?W8.swing:W8.theySwing,[]);pose(h,'swing',0.4);
  const hit=s<0?S.stats.Hitting:S.ostats.Hitting,blkStat=s<0?S.ostats.Blocking:S.stats.Blocking;
  let power=clamp(0.5+hit*0.035+(grade==='perfect'?0.15:grade==='good'?0.05:-0.2)-(downBall?0.3:0),0.15,1);
  const tip=Math.abs(t.x)<2.6&&!downBall;
  const sc=(10-hit)*0.06+(grade==='off'?0.7:0)+(S.setQ<5?0.25:0);t={x:t.x+rand(-1,1)*sc,y:t.y+rand(-1,1)*sc,z:0.35};
  if(grade==='off'&&!downBall&&Math.random()<0.45){
    if(Math.random()<0.5){fly({...C},{x:s*0.05,y:C.y,z:1.8},0.25,0,()=>{pop('NET',0,C.y,2.4);fly({...S.ball},{x:s*0.7,y:C.y,z:0},0.4,0,()=>point(-s,'error'))})}
    else{const out={x:-s*10.8,y:t.y,z:0};fly({...C},out,0.6,0.3,()=>{pop('OUT',out.x,out.y);point(-s,'error')})}return}
  if(tip)power=0.25;
  const B=S.blockInfo;const line=Math.abs(t.y-h.hy)<2.2;const match=(B.shade==='line')===line;
  let pStuff=0.03,pTouch=0.12;
  if(!tip&&B.committed!=='no'){pStuff=clamp(0.28+0.05*(blkStat-hit)+(match?0.12:-0.12)+(grade==='perfect'?-0.1:0),0.05,0.6);pTouch=0.35;if(B.committed==='late'){pStuff*=0.4;pTouch=0.3}}
  if(tip){pStuff=0;pTouch=0}
  const roll=Math.random();const d=-s;
  if(roll<pStuff){fly({...C},{x:s*1.3,y:clamp(C.y+rand(-1.5,1.5),0.3,8.7),z:0},0.38,0.25,()=>point(d,'stuff'));return}
  const touched=roll<pStuff+pTouch;if(touched){power*=0.6;pop('TOUCH',0,C.y,3.4)}
  const inn=Math.abs(t.x)<=9&&Math.abs(t.x)>=0&&t.y>=0&&t.y<=9&&Math.sign(t.x)===d;
  const dur=tip?0.85:clamp(0.62-power*0.25,0.34,0.62);
  defend(d,t,dur,tip?0.9:0.15,power,touched,inn,s);
  fly({...C},t,dur,tip?0.9:0.15,afterContact);
}
function afterContact(){const I=S.digInfo;if(I&&I.d<0&&!I.done){fly({...S.ball},{x:I.t.x,y:I.t.y,z:0},S.digWin*1.7,0,resolveDefense);return}resolveDefense()}
function defend(d,t,dur,apex,power,touched,inn,att){
  const[df,d0]=nearest(d,t,p=>!(p.jump));if(df){df.tx=t.x;df.ty=t.y}
  S.digInfo={d,t,dur,power,touched,inn,att,df,d0,start:gt};
  if(d<0){S.phase='dig';S.ts=AUTO?1:0.62;S.digAt=gt+dur;
    const base=0.09+S.stats.Digging*0.013,eff=Math.max(0,d0-4.2*dur*0.9);
    S.digWin=clamp(base*(touched?1.4:1)*(S.steady?2:1)*(S.readBoost?1.3:1)-eff*0.03-power*0.03,0.04,0.4);
    ui(inn||touched?W8.dig:W8.digOrLeave,[]);coach('dig');
    if(AUTO)after(dur+rand(-0.06,0.06),()=>digTap())}
}
function digTap(){if(S.phase!=='dig'||S.digInfo.done)return;const I=S.digInfo;const a=Math.abs(gt-S.digAt),w=S.digWin;
  I.done=true;
  if(a>w*1.7){pop(gt<S.digAt?'EARLY':'LATE',I.t.x,I.t.y,1.2);I.dug=0;return} // a whiff: no second tap
  I.dug=a<w*0.5?3:a<w?2:1;
  if(S.ball.f)S.ball.f.dur=Math.max(0.01,gt-S.ball.f.t0+0.001); // contact now
}
function resolveDefense(){const I=S.digInfo;if(!I)return;const d=I.d;
  if(d<0){ // you defending
    if(I.dug){pop(I.dug===3?'GREAT DIG':'DIG',I.t.x,I.t.y,1.6);S.phase='rally';pass(-1,I.df,I.dug,0);return}
    if(!I.inn&&!I.touched){pop('OUT',I.t.x,I.t.y);fly({...S.ball},{x:I.t.x,y:I.t.y,z:0},0.12,0,()=>point(-1,'leave'));return}
    S.phase='rally';fly({...S.ball},{x:I.t.x,y:I.t.y,z:0},0.12,0,()=>point(1,'kill'));return}
  // AI defending
  if(!I.inn&&!I.touched){pop('OUT',I.t.x,I.t.y);fly({...S.ball},{x:I.t.x,y:I.t.y,z:0},0.12,0,()=>point(1,'error'));return}
  if(!I.inn&&I.touched){pop('OFF THE BLOCK',I.t.x,I.t.y,1.5);fly({...S.ball},{x:I.t.x,y:I.t.y,z:0},0.12,0,()=>point(-1,'kill'));return}
  const dg=S.ostats.Digging;const eff=Math.max(0,I.d0-4.2*I.dur*0.85);
  const p=clamp(0.62-eff*0.6-I.power*0.45+dg*0.03+(I.touched?0.2:0),0.04,0.85);
  if(Math.random()<p){pass(1,I.df,Math.random()<0.35+dg*0.03?2:1,0)}
  else fly({...S.ball},{x:I.t.x,y:I.t.y,z:0},0.12,0,()=>point(-1,'kill'));
}
function point(w,kind){
  if(S.phase==='over')return;S.phase='point';S.ts=1;S.ball.f=null;S.readAt=Infinity;
  S.score[w<0?0:1]++;const youWon=w<0;
  const words={kill:'KILL!',ace:'ACE!',stuff:'STUFF!'};
  if(youWon){S.cheerUntil=rt+0.9}
  const [a,b]=S.score,lead=Math.abs(a-b),setDone=(a>=S.target||b>=S.target)&&lead>=2;
  ui(W8.point(youWon?TEAMS[S.you].abbr:TEAMS[S.opp].abbr,a,b),[]);
  opts.onScore&&opts.onScore({score:[a,b],sets:[...S.sets],setNo:S.setNo,serve:w});
  const next=()=>{S.readBoost=false;S.serve=w;
    if(coachWrap()){S.afterCoach=next;return}
    if(setDone){const winner=a>b?0:1;S.sets[winner]++;
      const info={setNo:S.setNo,score:[a,b],sets:[...S.sets],winner:winner===0?'you':'them'};
      if(S.sets[winner]>=2){S.phase='over';S.over=true;opts.onMatchEnd&&opts.onMatchEnd(info);return}
      S.phase='between';S.paused=true;opts.onSetEnd&&opts.onSetEnd(info);return}
    go()};
  if(youWon&&words[kind]){celebrate(words[kind],next)}else after(1.0,next);
}
function celebrate(word,then){S.cele={word,t0:rt,dur:reduced?1.0:1.5,then}}
function askTimeout(){if(S.paused||S.timeouts<=0||!['serveAim','oppServe'].includes(S.phase))return;S.paused=true;opts.onTimeout&&opts.onTimeout()}
function timeoutTaken(read){S.timeouts=Math.max(0,S.timeouts-1);if(read)S.readBoost=true;S.paused=false;
  if(S.phase==='serveAim')ui(W8.yourServe,[timeoutBtn()]);else{ui(W8.theirServe,[timeoutBtn()]);timers=timers.filter(t=>!t.serveT);after(1.4,()=>{if(S.phase==='oppServe')aiServe()})}}

// ───────────────────────── input ─────────────────────────
function tapAt(sx,sy){
  if(S.cele){S.cele.dur=0;return}
  const pt=unP(sx,sy);const onThem=pt.x>0.2&&pt.x<10.5&&pt.y>-1&&pt.y<10;
  // a fingertip is wide: a tap just past a line aims just inside it. Balls still go out from timing and scatter.
  const inside={x:clamp(pt.x,0.6,8.7),y:clamp(pt.y,0.3,8.7)};
  if(S.phase==='serveAim'){if(onThem){S.reticle=inside;aimServe()}return}
  if(S.phase==='serveMeter'){strikeServe();return}
  if(S.phase==='spike'){if(onThem)S.reticle=inside;trySwing();return}
  if(S.phase==='dig'){digTap();return}
}
const onDown=e=>{if(S.paused)return;const r=cv.getBoundingClientRect();tapAt((e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H)};
const onMove=e=>{if(e.pointerType!=='mouse')return;if(!['serveAim','spike'].includes(S.phase))return;const r=cv.getBoundingClientRect();const pt=unP((e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H);if(pt.x>0.2&&pt.x<10.5&&pt.y>-1&&pt.y<10)S.reticle={x:pt.x,y:pt.y}};
cv.addEventListener('pointerdown',onDown);cv.addEventListener('pointermove',onMove);
const onKey=e=>{if(S.paused||S.phase==='menu'||(opts.blocked&&opts.blocked()))return;const tg=document.activeElement&&document.activeElement.tagName;if(tg==='INPUT'||tg==='TEXTAREA')return;
  const k=e.key;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(k)&&['serveAim','spike'].includes(S.phase)){e.preventDefault();
    const st=0.5;if(k==='ArrowLeft')S.reticle.x-=st;if(k==='ArrowRight')S.reticle.x+=st;if(k==='ArrowUp')S.reticle.y+=st;if(k==='ArrowDown')S.reticle.y-=st;
    S.reticle.x=clamp(S.reticle.x,0.4,10.4);S.reticle.y=clamp(S.reticle.y,-0.8,9.8);return}
  if(k===' '||k==='Enter'){if(document.activeElement&&document.activeElement.tagName==='BUTTON')return;e.preventDefault();
    if(S.cele){S.cele.dur=0;return}
    if(S.phase==='serveAim')aimServe();else if(S.phase==='serveMeter')strikeServe();else if(S.phase==='spike')trySwing();else if(S.phase==='dig')digTap();return}
  if(['1','2','3'].includes(k)){const f=callFns[+k-1];if(f)f();return}
  if(k==='t'||k==='T')askTimeout();
};
addEventListener('keydown',onKey);

// ───────────────────────── drawing ─────────────────────────
// ───────────────────────── 16-bit art ─────────────────────────
// The gym is painted once per match into an offscreen canvas; only the crowd, the scoreboard
// and the moving pieces are drawn each frame. Players are posed skeletons, shaded in three
// tones and outlined, then cached per pose so a Chromebook never redraws one from scratch.
const OUTC='#170f1c';
let crowd=[];
function buildCrowd(){const r=rng(S.you*13+5);crowd=[];const yc=TEAMS[S.you].c,oc=TEAMS[S.opp].c;
  for(let row=0;row<8;row++)for(let x=3+(row%2)*3;x<W-4;x+=6){if(r()<0.1)continue;const pick=r();
    crowd.push({x:x+Math.floor(r()*2),row,skin:SKIN[Math.floor(r()*SKIN.length)],hair:HAIR[Math.floor(r()*HAIR.length)],
      shirt:pick<0.55?yc[Math.floor(r()*yc.length)]:pick<0.8?oc[Math.floor(r()*oc.length)]:['#d0d4dc','#6b7280','#2f3b55','#8b2c2c','#3d6b4a'][Math.floor(r()*5)],
      ph:r()*6.28,home:pick<0.55})}}
function rowFill(y0,y1,xl,xr,c){for(let sy=Math.ceil(P(0,y1)[1]);sy<=Math.floor(P(0,y0)[1]);sy++){const y=(Y0-sy)/KY;const a=P(xl,y)[0],b=P(xr,y)[0];R(a,sy,b-a+1,1,c)}}
function dith(x,y,w,h,c){G.fillStyle=c;for(let yy=y;yy<y+h;yy++)for(let xx=x+(yy&1);xx<x+w;xx+=2)G.fillRect(xx,yy,1,1)}
const bgCv=document.createElement('canvas');bgCv.width=W;bgCv.height=H;
const FT=()=>P(0,11.2)[1], BT=()=>FT()-50;
const LAMPS=[34,110,192,274,350];
function buildBg(){
  const save=G;G=bgCv.getContext('2d');G.clearRect(0,0,W,H);
  const home=TEAMS[S.you],ft=FT(),bt=BT();
  // wall: four bands, dithered seams, faint block courses
  const wall=['#151b30','#1b2340','#222c4d','#29355a'];const bh=Math.ceil(bt/4);
  wall.forEach((c,i)=>{R(0,i*bh,W,bh,c);if(i<3)dith(0,(i+1)*bh-2,W,2,wall[i+1])});
  for(let y=6;y<bt;y+=7){R(0,y,W,1,'rgba(0,0,0,.18)');for(let x=((y/7)%2)*9;x<W;x+=18)R(x,y-6,1,6,'rgba(0,0,0,.12)')}
  // lamps and their glow
  for(const lx of LAMPS){R(lx-8,0,16,3,'#6b7385');R(lx-7,3,14,1,'#fff3cf');G.globalAlpha=0.10;for(let i=0;i<5;i++)R(lx-10-i*3,4+i*4,20+i*6,4,'#fff3cf');G.globalAlpha=1}
  // home pennants either side of the scoreboard
  const pc=home.c;[[70,0],[88,1],[298,0],[316,1]].forEach(([x,i])=>{G.fillStyle=pc[i%pc.length];for(let r=0;r<16;r++)G.fillRect(x+Math.floor(r/2),6+r,Math.max(0,12-r),1);R(x,5,13,1,'#8a8f9c')});
  // league banners with strings and shading
  TEAMS.forEach((t,i)=>{const bx=8+i*31,by=bt-15;R(bx+3,by-5,1,5,'#5b6273');R(bx+22,by-5,1,5,'#5b6273');
    R(bx,by,26,14,t.c[0]);G.globalAlpha=0.16;R(bx,by,26,6,'#ffffff');G.globalAlpha=0.22;R(bx,by+10,26,4,'#000000');G.globalAlpha=1;
    R(bx,by,26,1,t.c[1]);R(bx,by+13,26,1,t.c[1]);R(bx-1,by,1,14,OUTC);R(bx+26,by,1,14,OUTC);
    const ink=Math.abs(lum(t.c[0])-lum(t.c[1]))>0.42?t.c[1]:(lum(t.c[0])>0.5?'#111111':'#ffffff');txt(t.abbr,bx+13-tw(t.abbr)/2,by+4,ink)});
  // bleachers: riser, plank, bright nosing
  for(let row=0;row<8;row++){const y=Math.round(bt+row*6.25);R(0,y,W,7,'#3a2b1f');R(0,y+3,W,3,'#7b5a3a');R(0,y+3,W,1,'#b08458');R(0,y+6,W,1,'#241a12')}
  // padded wall at court level, home colour
  const pad=lum(home.c[0])<0.12?shade(home.c[1],-0.25):home.c[0];R(0,ft-6,W,6,pad);R(0,ft-6,W,1,shade(pad,0.3));R(0,ft-1,W,1,shade(pad,-0.4));
  // floor: staggered planks, lamp gloss
  for(let y=ft;y<H;y+=2){R(0,y,W,2,((y-ft)/2)%2?'#c58b50':'#bf854a');const off=((y-ft)/2)%3*9;for(let x=off;x<W;x+=27)R(x,y,1,2,'#a8733f')}
  let zone=lum(home.c[0])<0.25?home.c[0]:home.c[1];if(lum(zone)<0.1)zone='#23242c';
  rowFill(-1.6,10.6,-11.2,11.2,zone);
  rowFill(0,9,-9,9,'#d7a467');rowFill(0,9,-3,3,'#cf995c');
  G.globalAlpha=0.22;for(let y=0;y<=9;y+=0.6)L(...P(-9,y),...P(9,y),'#a6713c');G.globalAlpha=1;
  G.globalAlpha=0.06;for(const lx of LAMPS){for(let i=0;i<3;i++)R(lx-6+i*2,ft,12-i*4,H-ft,'#fff6dc')}G.globalAlpha=1;
  // lines, with a one-pixel shadow on the near ones
  const lc='#f6f1e4';L(...P(-9,0),...P(9,0),lc);L(...P(-9,0.06),...P(9,0.06),'rgba(80,50,20,.35)');L(...P(-9,9),...P(9,9),lc);L(...P(-9,0),...P(-9,9),lc);L(...P(9,0),...P(9,9),lc);
  L(...P(0,0),...P(0,9),lc);L(...P(-3,0),...P(-3,9),lc);L(...P(3,0),...P(3,9),lc);
  const[lx,ly]=P(-6,4.5);G.globalAlpha=0.28;txt(home.abbr,lx-tw(home.abbr,2)/2,ly-7,shade(pad,-0.2),2);G.globalAlpha=1;
  G=save;
}
function drawScoreboard(){
  const sx=118,sy=4;R(sx-1,sy-1,150,36,OUTC);R(sx,sy,148,34,'#6b7385');R(sx,sy,148,1,'#a7aec0');R(sx+2,sy+2,144,30,'#07080b');
  txt(TEAMS[S.you].abbr,sx+8,sy+5,'#ffb02e');txt(TEAMS[S.opp].abbr,sx+140-tw(TEAMS[S.opp].abbr),sy+5,'#ffb02e');
  const a=String(S.score[0]).padStart(2,'0'),b=String(S.score[1]).padStart(2,'0');
  G.globalAlpha=0.12;txt('88',sx+8,sy+15,'#ff5a3c',2);txt('88',sx+140-tw('88',2),sy+15,'#ff5a3c',2);G.globalAlpha=1;
  txt(a,sx+8,sy+15,'#ff5a3c',2);txt(b,sx+140-tw(b,2),sy+15,'#ff5a3c',2);
  txt('SET '+S.setNo,sx+74-tw('SET '+S.setNo)/2,sy+5,'#9fd1ff');
  for(let i=0;i<2;i++){R(sx+60+i*6,sy+16,4,4,i<S.sets[0]?'#ffb02e':'#24272f');R(sx+80+i*6,sy+16,4,4,i<S.sets[1]?'#ffb02e':'#24272f')}
  const srv=S.serve<0?sx+46:sx+98;R(srv,sy+24,3,3,'#f5f5f0');
}
function drawCrowd(){const bt=BT();const cheer=rt<S.cheerUntil&&!reduced;
  for(const f of crowd){const y=Math.round(bt+f.row*6.25)+1;const up=cheer&&f.home&&Math.sin(rt*18+f.ph)>0;const dy=up?-2:0;
    R(f.x-1,y+1+dy,4,3,f.shirt);R(f.x,y-2+dy,2,3,f.skin);R(f.x,y-2+dy,2,1,f.hair);if(up){R(f.x-2,y-3+dy,1,3,f.skin);R(f.x+3,y-3+dy,1,3,f.skin)}}}
function drawNetSlice(y0,y1){
  const top=2.24,bot=1.24,home=TEAMS[S.you];
  for(const py of[-0.8,9.8])if(y0<=py&&y1>py){const[a,b]=P(0,py,0),[,d]=P(0,py,2.5);R(a-2,d,4,b-d,OUTC);R(a-1,d,2,b-d,'#9aa2b3');R(a-1,d,1,b-d,'#d3d8e2');
    const[,pt]=P(0,py,1.5);R(a-3,pt,6,b-pt,OUTC);R(a-2,pt+1,4,b-pt-1,home.c[0]);R(a-2,pt+1,1,b-pt-1,shade(home.c[0],0.3))}
  const ys=Math.max(-0.8,y0),ye=Math.min(9.8,y1);if(ys>=ye)return;
  G.globalAlpha=0.6;for(let z=bot+0.2;z<top;z+=0.2)L(...P(0,ys,z),...P(0,ye,z),'#15171d');
  for(let y=Math.ceil(ys/0.3)*0.3;y<ye;y+=0.3)L(...P(0,y,bot),...P(0,y,top),'#15171d');G.globalAlpha=1;
  L(...P(0,ys,top+0.07),...P(0,ye,top+0.07),'#ffffff');L(...P(0,ys,top),...P(0,ye,top),'#f2f2f2');L(...P(0,ys,top-0.07),...P(0,ye,top-0.07),'#b9bdc6');L(...P(0,ys,bot),...P(0,ye,bot),'#e6e6e6');
  for(const ay of[0,9])if(ay>=y0&&ay<y1){for(let i=0;i<9;i++){const z=top+i*0.1;const[a,b]=P(0,ay,z);R(a,b-1,1,2,i%2?'#f2f2f2':'#e02a2a')}}
}
const DIG3={0:"###|# #|# #|# #|###",1:" # |## | # | # |###",2:"###|  #|###|#  |###",3:"###|  #|###|  #|###",4:"# #|# #|###|  #|  #",5:"###|#  |###|  #|###",6:"###|#  |###|# #|###",7:"###|  #|  #|  #|  #",8:"###|# #|###|# #|###",9:"###|# #|###|  #|###"};
function shade(h,a){const c=rgb(h);return toHex(c.map(v=>a<0?v*(1+a):v+(255-v)*a))}
// joints, facing +x, feet on y=0, in sprite pixels
const POSES={
  ready:{hip:[-1,-16],sh:[1,-27],head:[3,-32],kB:[-3,-8],fB:[-5,0],kF:[3,-8],fF:[2,0],eB:[3,-21],hB:[6,-18],eF:[4,-21],hF:[7,-17]},
  run0:{hip:[0,-18],sh:[2,-29],head:[3,-34],kB:[-3,-9],fB:[-6,-3],kF:[3,-10],fF:[3,0],eB:[-2,-24],hB:[-1,-19],eF:[4,-24],hF:[6,-28]},
  run1:{hip:[0,-18],sh:[2,-29],head:[3,-34],kB:[2,-10],fB:[1,0],kF:[-2,-9],fF:[-5,-3],eB:[4,-24],hB:[6,-28],eF:[-2,-24],hF:[-1,-19]},
  bump:{hip:[-1,-16],sh:[1,-27],head:[3,-32],kB:[-3,-8],fB:[-5,0],kF:[3,-8],fF:[2,0],eB:[4,-22],hB:[9,-19],eF:[4,-22],hF:[9,-18]},
  dig:{hip:[-2,-11],sh:[2,-21],head:[4,-26],kB:[-7,-5],fB:[-10,0],kF:[4,-6],fF:[5,0],eB:[6,-17],hB:[10,-13],eF:[6,-16],hF:[10,-12]},
  set:{hip:[0,-19],sh:[0,-30],head:[1,-35],kB:[-1,-10],fB:[-2,0],kF:[2,-10],fF:[2,0],eB:[0,-35],hB:[2,-41],eF:[3,-35],hF:[4,-41]},
  spike:{hip:[-1,-19],sh:[-1,-30],head:[0,-35],kB:[-3,-12],fB:[-6,-5],kF:[2,-11],fF:[0,-3],eB:[-3,-37],hB:[0,-44],eF:[4,-33],hF:[7,-37]},
  swing:{hip:[0,-19],sh:[2,-30],head:[3,-35],kB:[-2,-11],fB:[-4,-3],kF:[2,-10],fF:[3,-2],eB:[6,-30],hB:[10,-26],eF:[2,-24],hF:[1,-20]},
  block:{hip:[0,-19],sh:[0,-30],head:[0,-35],kB:[-1,-10],fB:[-1,-1],kF:[1,-10],fF:[1,-1],eB:[0,-38],hB:[1,-45],eF:[2,-38],hF:[3,-45]},
  hero:{hip:[-1,-19],sh:[0,-30],head:[2,-35],kB:[-3,-12],fB:[-6,-5],kF:[2,-11],fF:[0,-3],eB:[4,-26],hB:[7,-22],eF:[6,-36],hF:[9,-43]},
  serve:{hip:[0,-19],sh:[0,-30],head:[1,-35],kB:[-2,-10],fB:[-4,0],kF:[2,-10],fF:[3,0],eB:[-4,-34],hB:[-2,-40],eF:[2,-36],hF:[3,-42]},
};
function paintSprite(ctx,p,poseName,f,air,s,ox,oy){
  const k=S.kits[p.side];const J=k.j,T=k.t;
  const dark=lum(J)<0.2;const Jd=shade(J,dark?0.16:-0.3),Jl=shade(J,dark?0.42:0.28);
  const sk=p.skin,skd=shade(sk,-0.24),skl=shade(sk,0.18),hair=p.hair,hairl=shade(hair,0.3);
  const SHO='#1a1a22',PAD='#2a2a34',PADl='#4a4a58';
  const j=JSON.parse(JSON.stringify(POSES[poseName]||POSES.ready));
  if(!air&&(poseName==='swing')){j.fB[1]=0;j.fF[1]=0}
  const X=v=>ox+f*v*s,Y=v=>oy+v*s;
  const fr=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)))};
  const seg=(a,b,t,c)=>{const x0=X(a[0]),y0=Y(a[1]),x1=X(b[0]),y1=Y(b[1]);const n=Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0)))+1;const tt=t*s;ctx.fillStyle=c;
    for(let i=0;i<=n;i++){const u=i/n;ctx.fillRect(Math.round(x0+(x1-x0)*u-tt/2),Math.round(y0+(y1-y0)*u-tt/2),Math.round(tt),Math.round(tt))}};
  const lp=(a,b,u)=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];
  const disc=(c,r,col,dx=0,dy=0)=>{const cx=X(c[0]+dx),cy=Y(c[1]+dy),rr=r*s;ctx.fillStyle=col;for(let yy=-rr;yy<=rr;yy++){const w=Math.sqrt(Math.max(0,rr*rr-yy*yy));ctx.fillRect(Math.round(cx-w),Math.round(cy+yy),Math.round(w*2),1)}};
  const leg=(kn,ft,back)=>{const c=back?skd:sk;seg(j.hip,kn,4.2,c);seg(kn,ft,3.2,c);if(!back)seg(lp(j.hip,kn,0.15),lp(j.hip,kn,0.8),1,skl);
    seg(ft,lp(ft,kn,0.24),3.3,back?'#c9c9d0':'#f4f4f6');
    seg(lp(j.hip,kn,0.82),lp(kn,ft,0.22),4.6,PAD);seg(lp(j.hip,kn,0.86),lp(kn,ft,0.05),1.2,PADl);
    const fx=X(ft[0]),fy=Y(ft[1]);const sw=5.4*s,sh=2.6*s;const x0=f>0?fx-1.6*s:fx-sw+1.6*s;
    fr(x0,fy-sh+0.6*s,sw,sh,back?'#d0d0d8':'#f6f6f8');fr(x0,fy+0.4*s,sw,1*s,back?shade(T,-0.3):T)};
  const arm=(e,h,back)=>{const c=back?skd:sk;seg(j.sh,e,3.1,c);seg(e,h,2.7,c);if(!back)seg(lp(j.sh,e,0.4),lp(e,h,0.6),1,skl);
    seg(j.sh,lp(j.sh,e,0.38),3.9,back?Jd:J);seg(lp(j.sh,e,0.34),lp(j.sh,e,0.4),3.9,back?shade(T,-0.25):T);disc(h,1.5,back?skd:skl)};
  arm(j.eB,j.hB,true);leg(j.kB,j.fB,true);leg(j.kF,j.fF,false);
  // shorts, then the jersey in three tones
  seg(lp(j.hip,j.sh,-0.02),lp(j.hip,j.kF,0.28),8.8,SHO);seg(j.hip,lp(j.hip,j.kB,0.28),8,SHO);
  seg([j.hip[0]+3.7,j.hip[1]+1],[j.hip[0]+3.7,j.hip[1]+3],1,T);
  seg(j.hip,j.sh,9.2,Jd);seg([j.hip[0]+0.9,j.hip[1]],[j.sh[0]+0.9,j.sh[1]],7,J);seg([j.hip[0]+3.7,j.hip[1]-1],[j.sh[0]+3.7,j.sh[1]+1.5],1,Jl);
  seg([j.hip[0]-4,j.hip[1]-1.5],[j.hip[0]+4,j.hip[1]-1.5],1.1,Jd);
  // neck, head, hair
  const hd=j.head;seg([j.sh[0]+1.2,j.sh[1]+0.5],[hd[0]+0.2,hd[1]+3.2],2.6,skd);seg([j.sh[0]-1,j.sh[1]],[j.sh[0]+3,j.sh[1]],1.2,T);
  if(p.tail){const sw=air?1:0;seg([hd[0]-3.8,hd[1]-1],[hd[0]-5.6,hd[1]+2+sw],2.6,hair);seg([hd[0]-5.6,hd[1]+2+sw],[hd[0]-6.2,hd[1]+4.5+sw],2.2,shade(hair,-0.2));fr(X(hd[0]-4.2)-s,Y(hd[1]-1.2),2*s,1.4*s,T)}
  disc(hd,4.2,hair,-0.5,-0.4);disc(hd,3.6,sk,1.3,1.0);disc(hd,1.3,skd,-0.6,1.6);
  disc(hd,1.1,hairl,-0.4,-3.3);
  if(p.band)seg([hd[0]-3.6,hd[1]-2.3],[hd[0]+3.6,hd[1]-2.6],1.2,T);
  fr(X(hd[0]+2.8)-(f>0?0:s),Y(hd[1]-0.2),1*s,1.5*s,'#141414');
  if(s>1){fr(X(hd[0]+2.4)-(f>0?0:s),Y(hd[1]-1.5),1.6*s,0.6*s,shade(hair,-0.1));fr(X(hd[0]+3.0)-(f>0?0:s),Y(hd[1]+0.1),0.5*s,0.6*s,'#ffffff');fr(X(hd[0]+2.6)-(f>0?0:s),Y(hd[1]+2.5),1.4*s,0.5*s,shade(sk,-0.4));fr(X(hd[0]+4.4)-(f>0?0:s),Y(hd[1]+0.9),0.7*s,0.9*s,skd)}
  arm(j.eF,j.hF,false);
  // number, never mirrored
  const m=lp(j.hip,j.sh,0.52),n=String(p.num),g=DIG3[n].split('|');const nx=X(m[0]+0.9)-1.5*s,ny=Y(m[1])-2.5*s;
  ctx.fillStyle=T;for(let yy=0;yy<5;yy++)for(let xx=0;xx<3;xx++)if(g[yy][xx]==='#')ctx.fillRect(Math.round(nx+xx*s),Math.round(ny+yy*s),Math.max(1,Math.round(s)),Math.max(1,Math.round(s)));
}
function outline(cv,col,th){const c=cv.getContext('2d');const d=c.getImageData(0,0,cv.width,cv.height);const a=d.data,w=cv.width,h=cv.height;
  const src=new Uint8Array(w*h);for(let i=0;i<w*h;i++)src[i]=a[i*4+3]>40?1:0;const[r,g,b]=rgb(col);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(src[i])continue;let hit=false;
    for(let dy=-th;dy<=th&&!hit;dy++)for(let dx=-th;dx<=th;dx++){if(Math.abs(dx)+Math.abs(dy)>th)continue;const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<w&&yy<h&&src[yy*w+xx]){hit=true;break}}
    if(hit){a[i*4]=r;a[i*4+1]=g;a[i*4+2]=b;a[i*4+3]=255}}
  c.putImageData(d,0,0)}
const spriteCache=new Map();
function sprite(p,pose,f,air,s=1){const key=`${p.side}${p.role}|${pose}|${f}|${air?1:0}|${s}`;let cv=spriteCache.get(key);
  if(!cv){cv=document.createElement('canvas');cv.width=56*s;cv.height=66*s;paintSprite(cv.getContext('2d'),p,pose,f,air,s,28*s,60*s);outline(cv,OUTC,s>1?2:1);spriteCache.set(key,cv)}
  return cv}
function drawPlayer(p,ox,oy){const air=p.z>0.05;let pose=p.pose;
  if(pose==='ready'&&!air&&Math.hypot(p.tx-p.x,p.ty-p.y)>0.06)pose=Math.floor(gt*9)%2?'run1':'run0';
  if(air&&pose==='ready')pose='block';
  G.drawImage(sprite(p,pose,p.face,air),ox-28,oy-60)}
function drawBall(b){const[x,y]=P(b.x,b.y,b.z);const cx=x,cy=y-4;
  if(!reduced&&b.trail)b.trail.forEach((t,i)=>{G.globalAlpha=0.12+i*0.08;R(t[0]-2,t[1]-2,4,4,'#f6f4ec')});G.globalAlpha=1;
  const disc=(r,c)=>{G.fillStyle=c;for(let yy=-r;yy<=r;yy++){const w=Math.round(Math.sqrt(r*r-yy*yy));G.fillRect(cx-w,cy+yy,w*2+1,1)}};
  disc(4,OUTC);disc(3,'#f2eee2');R(cx-3,cy-1,2,3,'#f2c230');R(cx+1,cy-3,2,2,'#2f63c9');R(cx-1,cy+2,3,1,'#2f63c9');R(cx+2,cy,1,2,'#d4cfbf');R(cx+1,cy+2,2,1,'#c9c3b1');R(cx-1,cy-2,1,1,'#ffffff')}
function render(){
  G=screenCtx;G.imageSmoothingEnabled=false;G.clearRect(0,0,W,H);
  G.drawImage(bgCv,0,0);drawCrowd();drawScoreboard();
  const list=[];for(let y=-1;y<10.2;y+=0.4)list.push({y:y+0.2,k:'net',y0:y,y1:y+0.4});
  for(const p of S.players)list.push({y:p.y,k:'p',p});
  const b=S.ball;list.push({y:b.y,k:'ball'});
  list.sort((a,c)=>c.y-a.y);
  for(const p of S.players){const[x,y]=P(p.x,p.y);G.globalAlpha=0.3;R(x-6,y-1,13,3,'#3a2210');R(x-4,y-2,9,1,'#3a2210');G.globalAlpha=1}
  {const[x,y]=P(b.x,b.y);G.globalAlpha=0.45;R(x-3,y-1,7,2,'#3a2210');G.globalAlpha=1}
  if(S.phase==='dig'&&S.digInfo&&!S.digInfo.done){const I=S.digInfo;const[x,y]=P(I.t.x,I.t.y);const rem=Math.max(0,S.digAt-gt);
    ell(x,y,6,2.4,'#ffffff');const rr=6+rem*42;ell(x,y,rr,rr*0.4,'#E3B341');ell(x,y,rr+1,rr*0.4+0.6,OUTC)}
  if(S.phase==='serveAim'||S.phase==='serveMeter'||S.phase==='spike'){const[x,y]=P(S.reticle.x,S.reticle.y);
    for(const[dx,dy]of[[-5,0],[5,0],[0,-3],[0,3]]){L(x+dx,y+dy+1,x+dx*0.4,y+dy*0.4+1,OUTC);L(x+dx,y+dy,x+dx*0.4,y+dy*0.4,'#E3B341')}R(x,y,1,1,'#ffffff')}
  for(const d of list){
    if(d.k==='net')drawNetSlice(d.y0,d.y1);
    else if(d.k==='p'){const[x,y]=P(d.p.x,d.p.y,d.p.z);drawPlayer(d.p,x,y)}
    else drawBall(b);
  }
  if(S.phase==='blockCall'&&gt>=S.readAt&&S.aiHitter){const st=role(1,'S');const[x,y]=P(st.x,st.y,st.z);const dir={OH:-1,MB:0,RS:1}[S.aiHitter];
    const lab={OH:'OUTSIDE',MB:'MIDDLE',RS:'RIGHT'}[S.aiHitter];const ax=x,ay=Math.max(14,y-58);
    R(ax-tw(lab)/2-4,ay-12,tw(lab)+8,24,OUTC);R(ax-tw(lab)/2-3,ay-11,tw(lab)+6,22,'#0B1220');R(ax-tw(lab)/2-3,ay-11,tw(lab)+6,1,'#E3B341');
    R(ax-1,ay,3,6,'#E3B341');if(dir!==0){for(let i=0;i<4;i++)R(ax+dir*(2+i),ay+1+i/2|0,1,4-i,'#E3B341')}else{R(ax-3,ay+6,7,1,'#E3B341');R(ax-2,ay+7,5,1,'#E3B341');R(ax-1,ay+8,3,1,'#E3B341')}
    txt(lab,ax-tw(lab)/2,ay-9,'#ffffff',1,'#000000')}
  if(S.phase==='spike'&&!S.swing){const rem=S.contactAt-gt;if(rem<0.9){const[x,y]=P(b.x,b.y,b.z);ell(x,y-4,5,5,'#ffffff');const rr=5+Math.max(0,rem)*26;ell(x,y-4,rr,rr,'#E3B341');ell(x,y-4,rr+1,rr+1,OUTC)}}
  if(S.phase==='serveMeter'&&S.meter){const mx=142,my=200,mw=100;R(mx-2,my-2,mw+4,11,OUTC);R(mx,my,mw,7,'#7a2a2a');
    const g=S.meter.green,yz=g+0.13;R(mx+mw*(0.5-yz),my,mw*yz*2,7,'#8a7a2a');R(mx+mw*(0.5-g),my,mw*g*2,7,'#2f7a3a');R(mx,my,mw,2,'rgba(255,255,255,.18)');
    R(mx+mw/2,my-2,1,11,'#ffffff');txt('NET',mx-24,my,'#ffffff',1,OUTC);txt('LONG',mx+mw+5,my,'#ffffff',1,OUTC);
    const m=meterPos();R(mx+mw*m-2,my-4,5,15,OUTC);R(mx+mw*m-1,my-3,3,13,'#E3B341')}
  S.pops=S.pops.filter(q=>rt-q.t0<0.9);for(const q of S.pops){const[x,y]=P(q.x,q.y,q.z);const up=reduced?0:(rt-q.t0)*10;txt(q.text,clamp(x-tw(q.text)/2,2,W-tw(q.text)-2),Math.max(2,y-14-up-q.lift),'#ffffff',1,'#0b1220')}
  if(S.cele)drawCele();
}
// 16-bit cut-ins: a white flash, a rotating burst in the team's colours, a close-up drawn at 3×
function txtG(s,x,y,k,cols,out){s=String(s).toUpperCase();
  if(out){G.fillStyle=out;for(let i=0;i<s.length;i++){const g=FG[s[i]]||FG[' '];for(let r=0;r<7;r++)for(let q=0;q<5;q++)if(g[r][q]==='#')G.fillRect(Math.round(x+(i*6+q)*k)-2,Math.round(y+r*k)-2,k+4,k+4)}}
  for(let i=0;i<s.length;i++){const g=FG[s[i]]||FG[' '];for(let r=0;r<7;r++){G.fillStyle=cols[r];for(let q=0;q<5;q++)if(g[r][q]==='#')G.fillRect(Math.round(x+(i*6+q)*k),Math.round(y+r*k),k,k)}}}
function drawCele(){
  const c=S.cele,e=rt-c.t0,k=reduced?1:clamp(e/0.2,0,1),ease=1-(1-k)*(1-k),home=TEAMS[S.you],kit=S.kits[-1];
  if(!reduced&&e<0.05){R(0,0,W,H,'#ffffff');return}
  R(0,0,W,H,'#05070d');
  const cx=110,cy=118,n=20,rot=reduced?0:e*0.5;const c1=kit.j,c2=lum(kit.j)<0.15?shade(kit.t,-0.35):shade(kit.j,-0.35);
  for(let i=0;i<n;i++){const a0=rot+i/n*Math.PI*2,a1=a0+Math.PI/n;G.fillStyle=i%2?c1:c2;G.beginPath();G.moveTo(cx,cy);G.lineTo(cx+Math.cos(a0)*420,cy+Math.sin(a0)*420);G.lineTo(cx+Math.cos(a1)*420,cy+Math.sin(a1)*420);G.closePath();G.fill()}
  G.globalAlpha=0.55;R(0,0,W,28,'#05070d');R(0,H-30,W,30,'#05070d');G.globalAlpha=1;R(0,28,W,2,'#E3B341');R(0,H-32,W,2,'#E3B341');
  const h=S.hitter||role(-1,'OH');const pose=c.word==='STUFF!'?'block':c.word==='ACE!'?'serve':'hero';
  const spr=sprite(h,pose,1,true,3);const hx=Math.round(-90+ease*150);G.drawImage(spr,hx,H-32-spr.height+18);
  const word=c.word,ks=5,ww=tw(word,ks),wx=Math.round(W-18-ww+(1-ease)*220);
  const grad=['#fff6c8','#ffe27a','#f7c948','#f0b232','#e8962a','#df7a22','#c85a18'];
  R(wx-10,62,ww+20,52,'rgba(5,7,13,.72)');txtG(word,wx,70,ks,grad,OUTC);
  const sub=home.abbr+' SCORES';txt(sub,W-18-tw(sub,2),126,'#ffffff',2,OUTC);
}

// ───────────────────────── loop ─────────────────────────
let last=performance.now(),raf=0,dead=false;
function frame(now){if(dead)return;let dt=Math.min(0.05,(now-last)/1000);last=now;rt+=dt;
  if(S.cele){if(rt-S.cele.t0>=S.cele.dur){const t=S.cele.then;S.cele=null;t&&t()}}
  else if(!S.paused&&S.phase!=='menu'&&S.phase!=='between'&&S.phase!=='over'){
    // the guided first rally runs slowed (BK 15:24)
    const g=dt*S.ts*(S.tutorial&&!AUTO?0.7:1);gt+=g;
    const due=timers.filter(t=>t.at<=gt);timers=timers.filter(t=>t.at>gt);due.forEach(t=>t.fn());
    for(const p of S.players){const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy),sp=4.8*g;if(d>0.01){const m=Math.min(1,sp/d);p.x+=dx*m;p.y+=dy*m}
      if(p.jump){const u=(gt-p.jump.t0)/p.jump.dur;if(u>=1){p.jump=null;p.z=0}else p.z=4*p.jump.h*u*(1-u)}
      if(p.poseUntil&&gt>p.poseUntil){p.pose='ready';p.poseUntil=0}}
    ballStep();
    {const b=S.ball;b.trail=b.trail||[];if(b.f&&b.f.dur<0.75){const[x,y]=P(b.x,b.y,b.z);b.trail.push([x,y-4]);if(b.trail.length>3)b.trail.shift()}else b.trail.length=0}
  }
  render();raf=requestAnimationFrame(frame)}


// the idle court before the first serve
S.you=opts.you??0;S.opp=opts.opp??1;S.target=opts.target??15;S.steady=!!opts.steady;setStats(opts.stats||{},opts.oppStrength??5);
{const y=TEAMS[S.you],o=TEAMS[S.opp];const ok=kitFor(y,o)[0];S.kits={[-1]:ok,[1]:kitFor(o,y).find(k=>apart(ok.j,k.j))||{j:'#2B2F36',t:'#F2F2F2'}}}
buildCrowd();buildBg();
S.players=[...makeSide(-1,rng(S.you*31+S.opp*7+11)),...makeSide(1,rng(4))];S.ball.held=null;S.ball.x=-0.5;S.ball.y=4.5;S.ball.z=3.4;
raf=requestAnimationFrame(frame);

return {
  start: (firstServe, tutorial) => startMatch(firstServe === 'you' ? -1 : 1, tutorial),
  nextSet: () => { S.setNo++; S.score = [0, 0]; S.timeouts = 2; S.setPointAsked = 0; S.paused = false; go() },
  pause: () => { S.paused = true },
  resume: () => { S.paused = false },
  timeoutTaken,
  setReadBoost: on => { S.readBoost = !!on },
  setStats: (v, opp) => setStats(v, opp),
  setSteady: on => { S.steady = !!on },
  coachDone,
  call: i => { const f = callFns[i]; if (f && !S.paused) f() },
  state: () => ({ score: [...S.score], sets: [...S.sets], setNo: S.setNo, timeouts: S.timeouts, phase: S.phase, serve: S.serve }),
  ui: () => lastUI,
  destroy: () => { dead = true; cancelAnimationFrame(raf); removeEventListener('keydown', onKey); cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove) },
  _S: S,
}
}
