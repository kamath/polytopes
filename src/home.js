import './style.css';
import{dot,polytope,solid}from './geometry.js';
import{$,RM,K,mk,orbit,paint,seg,shadow4,start}from './canvas.js';

// ---------- Visualizer: a polygon, the solid built from it, the 4D shape built from that solid ----------
// blue marks the piece from one dimension down: one face of the solid, one cell of the 4D shape
const POLY=[{p:3,name:'Triangle',pl:'triangles'},{p:4,name:'Square',pl:'squares'},{p:5,name:'Pentagon',pl:'pentagons'}];
const SOLID=[
  {s:'3,3',name:'Tetrahedron',pl:'tetrahedra',n:4},{s:'3,4',name:'Octahedron',pl:'octahedra',n:8},{s:'3,5',name:'Icosahedron',pl:'icosahedra',n:20},
  {s:'4,3',name:'Cube',pl:'cubes',n:6},{s:'5,3',name:'Dodecahedron',pl:'dodecahedra',n:12}];
const TOPE=[
  {k:5,name:'5-cell',cell:'3,3',r:3},{k:16,name:'16-cell',cell:'3,3',r:4},{k:600,name:'600-cell',cell:'3,3',r:5},
  {k:24,name:'24-cell',cell:'3,4',r:3},{k:8,name:'Tesseract',cell:'4,3',r:3},{k:120,name:'120-cell',cell:'5,3',r:3}];
const cvs=$('#viz').querySelectorAll('canvas'),out=$('#viz-out'),playBtn=$('#viz-play'),cache={};
let sol=SOLID[3],tope=TOPE[4],S3,P4,hi=[],play=!RM,drag4=false,ang=0;
const faceOf=s=>POLY.find(x=>x.p==+s.s[0]);
// the 4D shape starts a little turned; rows of M are where each screen axis reads from
const M=[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
const turn=(i,j,t)=>{const c=Math.cos(t),s=Math.sin(t),a=M[i],b=M[j];M[i]=a.map((x,k)=>c*x-s*b[k]);M[j]=a.map((x,k)=>s*x+c*b[k]);};
turn(0,3,.7);turn(1,2,.35);
const dt=(f,ts)=>{const d=play?Math.min(50,ts-(f.last||ts)):0;f.last=ts;return d;};
const pull=(cv,fn)=>{let px=0,py=0,on=false;cv.classList.add('grab');
  cv.addEventListener('pointerdown',e=>{on=true;px=e.clientX;py=e.clientY;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
  cv.addEventListener('pointermove',e=>{if(!on)return;fn(e.clientX-px,e.clientY-py);px=e.clientX;py=e.clientY;});
  const up=()=>{on=false};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);};

const f2=mk(cvs[0],(f,ts)=>{ang+=dt(f,ts)*.0003;const p=faceOf(sol).p,P=[],E=[];
  for(let i=0;i<p;i++){const a=ang-Math.PI/2+i*2*Math.PI/p;P.push([Math.cos(a),Math.sin(a)]);E.push([i,(i+1)%p,1]);}
  paint(f,{flat:true,P,E,F:[{i:P.map((_,i)=>i),a:.16}],R:1.2});},{anim:play});
pull(cvs[0],dx=>{ang+=dx*.01;f2.dirty=true;});
const f3=mk(cvs[1],(f,ts)=>{f.yaw+=dt(f,ts)*.0004;paint(f,S3);},{anim:play,far:14});orbit(f3);
const f4=mk(cvs[2],(f,ts)=>{const d=dt(f,ts);
  if(!P4){const c=f.ctx;c.fillStyle=K.muted;c.font='13px Geist, system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('No regular 4D shape has '+sol.pl+' for cells',f.w/2,f.h/2);return;}
  turn(0,3,d*.00022);turn(1,2,d*.00009);shadow4(f,P4,v=>M.map(r=>dot(r,v)),hi,null);},{R:1.6,yaw:.4,pitch:.3,anim:play});
pull(cvs[2],(dx,dy)=>{if(drag4){turn(0,3,dx*.01);turn(1,3,dy*.01);}else{f4.yaw+=dx*.01;f4.pitch=Math.max(-1.5,Math.min(1.5,f4.pitch+dy*.01));}f4.dirty=true;});

const lab=(tag,name,sym)=>'<span class="tag">'+tag+'</span>'+name+(sym?' <code>{'+sym+'}</code>':'');
const bar=(el,items,on,ok,pick)=>{el.innerHTML=items.map((it,i)=>'<button class="btn'+(ok(it)?'':' off')+'" type="button" data-i="'+i+'" aria-pressed="'+(it===on)+'">'+it.name+'</button>').join('');
  el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>pick(items[+b.dataset.i])));};
function show(){
  const face=faceOf(sol),G=cache[sol.s]||(cache[sol.s]=solid(sol.s)),ring=G.F[0],q=sol.s[2];
  const on=e=>{const a=ring.indexOf(e[0]),b=ring.indexOf(e[1]),d=Math.abs(a-b);return a>=0&&b>=0&&(d==1||d==ring.length-1);};
  S3={P:G.V,E:G.E.map(e=>[e[0],e[1],on(e)?1:0]),F:[{i:ring,a:.16}],R:1.2};
  P4=tope?cache[tope.k]||(cache[tope.k]=polytope(tope.k)):null;hi=[];
  if(P4){const C=new Set(P4.cells[0]);for(const e of P4.E)if(C.has(e[0])&&C.has(e[1]))hi.push([e[0],e[1],0]);}
  $('#viz-l2').innerHTML=lab('2D',face.name,face.p);
  $('#viz-l3').innerHTML=lab('3D',sol.name,sol.s);
  $('#viz-l4').innerHTML=tope?lab('4D',tope.name,tope.cell+','+tope.r):lab('4D','Nothing');
  bar($('#viz-b2'),POLY,face,()=>true,x=>pickSolid(SOLID.find(s=>+s.s[0]==x.p)));
  bar($('#viz-b3'),SOLID,sol,s=>faceOf(s)===face,pickSolid);
  bar($('#viz-b4'),TOPE,tope,t=>t.cell==sol.s,t=>{tope=t;sol=SOLID.find(s=>s.s==t.cell);show();});
  const made=(/^[IO]/.test(sol.name)?'An':'A')+' <b>'+sol.name.toLowerCase()+'</b> is '+sol.n+' '+face.pl+', '+q+' at each corner.';
  out.innerHTML=made+' '+(tope?(/^\d/.test(tope.name)?'The':'A')+' <b>'+tope.name.toLowerCase()+'</b> is '+P4.cells.length+' '+sol.pl+', '+tope.r+' around each edge.'
    :'Three '+sol.pl+' around an edge already overlap, so no regular 4D shape is built from them.');
  [f2,f3,f4].forEach(f=>f.dirty=true);
}
function pickSolid(s){sol=s;tope=TOPE.find(t=>t.cell==s.s)||null;show();}
const syncPlay=()=>{playBtn.textContent=play?'Pause':'Play';[f2,f3,f4].forEach(f=>{f.anim=play;f.last=0;});};
playBtn.addEventListener('click',()=>{play=!play;syncPlay();});syncPlay();
seg([...$('#viz-drag').querySelectorAll('button')],b=>{drag4=b.dataset.d=='4';});
show();
start();
