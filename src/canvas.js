// Canvas plumbing shared by the visualizer and the explainer.
const $=(s,r=document)=>r.querySelector(s);
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- canvas plumbing ----------
const K={},figs=[],byCv=new WeakMap();
function readK(){const cs=getComputedStyle(document.documentElement);for(const n of['bg','fg','muted','faint','line','accent','c2','c3','c4','c5'])K[n]=cs.getPropertyValue('--'+n).trim();figs.forEach(f=>f.dirty=true);}
const io=new IntersectionObserver(es=>es.forEach(e=>{const f=byCv.get(e.target);if(f){f.vis=e.isIntersecting;f.dirty=true;}}),{rootMargin:'120px'});
function mk(cv,draw,o){
  const f=Object.assign({cv,ctx:cv.getContext('2d'),w:0,h:0,d:1,dirty:true,vis:true,draw,anim:false,yaw:.55,pitch:.42,R:2,C:[0,0,0]},o||{});
  byCv.set(cv,f);io.observe(cv);
  new ResizeObserver(()=>{const r=cv.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);f.w=r.width;f.h=r.height;f.d=d;cv.width=Math.max(1,Math.round(r.width*d));cv.height=Math.max(1,Math.round(r.height*d));f.dirty=true;}).observe(cv);
  figs.push(f);return f;
}
function orbit(f){const cv=f.cv;let px=0,py=0,on=false;cv.classList.add('grab');
  cv.addEventListener('pointerdown',e=>{on=true;px=e.clientX;py=e.clientY;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
  cv.addEventListener('pointermove',e=>{if(!on)return;f.yaw+=(e.clientX-px)*.01;f.pitch=Math.max(-1.5,Math.min(1.5,f.pitch+(e.clientY-py)*.01));px=e.clientX;py=e.clientY;f.dirty=true;});
  const up=()=>{on=false};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);}
function loop(ts){for(const f of figs){if(!f.vis||!f.w)continue;if(f.anim||f.dirty){f.dirty=false;const c=f.ctx;c.setTransform(f.d,0,0,f.d,0,0);c.clearRect(0,0,f.w,f.h);f.draw(f,ts);}}requestAnimationFrame(loop);}

// zoom and px,py are the camera: a scale and a slide in screen pixels, both optional
function proj(f,P,flat){const k=Math.min(f.w,f.h)/2/f.R*.84*(f.zoom||1),ox=f.w/2+(f.px||0),oy=f.h/2+(f.py||0);
  if(flat)return P.map(p=>[ox+(p[0]-f.C[0])*k,oy+(p[1]-f.C[1])*k,0]);
  const cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),cp=Math.cos(f.pitch),sp=Math.sin(f.pitch),D=f.R*(f.far||4.5);
  return P.map(p=>{const x=p[0]-f.C[0],y=p[1]-f.C[1],z=p[2]-f.C[2],x1=x*cy+z*sy,z1=-x*sy+z*cy,y1=y*cp-z1*sp,z2=y*sp+z1*cp,s=D/(D-z2);return[ox+x1*s*k,oy-y1*s*k,z2];});}
function fit(f,P,n){const lo=Array(n).fill(1e9),hi=Array(n).fill(-1e9);for(const p of P)for(let i=0;i<n;i++){if(p[i]<lo[i])lo[i]=p[i];if(p[i]>hi[i])hi[i]=p[i];}
  const C=lo.map((v,i)=>(v+hi[i])/2);let R=0;for(const p of P){let s=0;for(let i=0;i<n;i++)s+=(p[i]-C[i])**2;if(s>R)R=s;}
  f.C=n==2?[C[0],C[1],0]:C;f.R=Math.sqrt(R)||1;}
// scene: P points, E [i,j,cls], F [{i:[...],a,s}] filled polygons, D lamp dots, T labels, R/C fixed framing, flat for 2D
// edge classes: 0 normal, 1 marked, 2 faint, 3 light ray
const STY=[['fg',.6,1.1],['accent',1,1.8],['fg',.2,1],['c2',.45,1],['fg',1,3.2]];
function paint(f,S){
  const c=f.ctx,flat=!!S.flat;
  if(S.R){f.R=S.R;f.C=S.C||[0,0,0];}else fit(f,S.P,flat?2:3);
  const Q=proj(f,S.P,flat);c.lineJoin=c.lineCap='round';
  for(const F of S.F||[]){c.beginPath();F.i.forEach((i,k)=>k?c.lineTo(Q[i][0],Q[i][1]):c.moveTo(Q[i][0],Q[i][1]));c.closePath();c.globalAlpha=F.a==null?.14:F.a;c.fillStyle=K.accent;c.fill();if(F.s){c.globalAlpha=1;c.strokeStyle=K.accent;c.lineWidth=1.6;c.stroke();}}
  for(const cls of[2,3,0,1,4]){c.beginPath();let n=0;for(const e of S.E||[])if((e[2]||0)===cls){c.moveTo(Q[e[0]][0],Q[e[0]][1]);c.lineTo(Q[e[1]][0],Q[e[1]][1]);n++;}
    if(!n)continue;const st=STY[cls];c.globalAlpha=st[1];c.strokeStyle=K[st[0]];c.lineWidth=st[2];c.stroke();}
  c.globalAlpha=1;
  for(const d of S.D||[]){c.fillStyle=K.c2;c.beginPath();c.arc(Q[d][0],Q[d][1],5,0,7);c.fill();}
  for(const t of S.T||[]){c.fillStyle=K.muted;c.font='12px Geist, system-ui, sans-serif';c.textAlign='left';c.textBaseline='middle';c.fillText(t[1],Q[t[0]][0]+10,Q[t[0]][1]);}
  if(S.note){c.fillStyle=K.muted;c.font='13px Geist, system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(S.note,f.w/2,f.h/2);}
}
// a convex solid centred on the origin with opaque faces: G has V and F (rings of vertex indices), mark is the ring to colour
// faces turned away are skipped, the rest are lit from the upper left
function solid3(f,G,mark,R){
  const c=f.ctx,cy=Math.cos(f.yaw),sy=Math.sin(f.yaw),cp=Math.cos(f.pitch),sp=Math.sin(f.pitch),dk=parseInt(K.bg.slice(1,3),16)<128,ed=new Map();
  f.R=R;f.C=[0,0,0];const Q=proj(f,G.V);c.lineJoin=c.lineCap='round';
  for(const r of G.F){let a=0;r.forEach((i,k)=>{const j=r[(k+1)%r.length];a+=Q[i][0]*Q[j][1]-Q[j][0]*Q[i][1];});if(a>=0)continue;
    const n=[0,1,2].map(d=>r.reduce((s,i)=>s+G.V[i][d],0)),z1=-n[0]*sy+n[2]*cy,m=r===mark,
      lit=Math.max(0,(-.35*(n[0]*cy+n[2]*sy)+.55*(n[1]*cp-z1*sp)+.76*(n[1]*sp+z1*cp))/Math.hypot(...n));
    c.beginPath();r.forEach((i,k)=>k?c.lineTo(Q[i][0],Q[i][1]):c.moveTo(Q[i][0],Q[i][1]));c.closePath();
    c.globalAlpha=1;c.fillStyle=K.bg;c.fill();
    c.globalAlpha=m?.45+.3*lit:dk?.08+.24*lit:.3-.24*lit;c.fillStyle=m?K.accent:K.fg;c.fill();
    r.forEach((i,k)=>{const j=r[(k+1)%r.length],key=Math.min(i,j)+','+Math.max(i,j),o=ed.get(key);ed.set(key,[i,j,m||o&&o[2]?1:0]);});}
  for(const cls of[0,1]){c.beginPath();for(const e of ed.values())if(e[2]===cls){c.moveTo(Q[e[0]][0],Q[e[0]][1]);c.lineTo(Q[e[1]][0],Q[e[1]][1]);}
    const st=STY[cls];c.globalAlpha=st[1];c.strokeStyle=K[st[0]];c.lineWidth=st[2];c.stroke();}
  c.globalAlpha=1;
}
function seg(btns,fn){btns.forEach(b=>b.addEventListener('click',()=>{btns.forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));fn(b);}));}
// solid shadow of a 4D shape: rot turns a vertex in 4D, then it is projected along w; nearer edges are darker
// hi marks edges [i,j,group] in colour, shared marks one edge heavily
// fill, if given, has F (every 2D face as a ring) and M (the faces to colour)
function shadow4(f,P,rot,hi,shared,fill){
  const c=f.ctx,D4=3,W=[];
  const P3=P.V.map(v=>{const[x,y,z,w]=rot(v),s=D4/(D4-w);W.push(w);return[x*s,y*s,z*s];});
  const Q=proj(f,P3),nE=P.E.length,lw=nE>500?.6:nE>90?.9:1.3,al=[.08,.16,.27,.42],bk=[[],[],[],[]];
  for(const e of P.E)bk[Math.max(0,Math.min(3,Math.floor(((W[e[0]]+W[e[1]])/2+1)*2)))].push(e);
  if(fill){const ring=r=>{c.beginPath();r.forEach((i,k)=>k?c.lineTo(Q[i][0],Q[i][1]):c.moveTo(Q[i][0],Q[i][1]));c.closePath();c.fill();};
    // one fill per face, so faces stacked behind each other add up
    c.fillStyle=K.fg;c.globalAlpha=Math.max(.035,Math.min(.18,.9/Math.sqrt(fill.F.length)));fill.F.forEach(ring);
    c.fillStyle=K.accent;c.globalAlpha=.3;fill.M.forEach(ring);}
  c.lineCap='round';c.strokeStyle=K.fg;c.lineWidth=lw;
  bk.forEach((es,i)=>{if(!es.length)return;c.beginPath();for(const e of es){c.moveTo(Q[e[0]][0],Q[e[0]][1]);c.lineTo(Q[e[1]][0],Q[e[1]][1]);}c.globalAlpha=al[i];c.stroke();});
  c.globalAlpha=1;const cols=[K.accent,K.c2,K.c3,K.c4,K.c5];
  for(let g=0;g<5;g++){c.beginPath();let n=0;for(const h of hi)if(h[2]==g){c.moveTo(Q[h[0]][0],Q[h[0]][1]);c.lineTo(Q[h[1]][0],Q[h[1]][1]);n++;}if(n){c.strokeStyle=cols[g];c.lineWidth=1.8;c.stroke();}}
  if(shared){c.beginPath();c.moveTo(Q[shared[0]][0],Q[shared[0]][1]);c.lineTo(Q[shared[1]][0],Q[shared[1]][1]);c.strokeStyle=K.fg;c.lineWidth=3.2;c.stroke();}
}
function start(){readK();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',readK);
  new MutationObserver(readK).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  requestAnimationFrame(loop);}

export{$,RM,K,mk,orbit,proj,paint,solid3,seg,shadow4,start};
