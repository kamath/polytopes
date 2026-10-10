import './style.css';
import{dot,polytope,faces,solid,hinge,fold}from './geometry.js';
import{$,RM,K,mk,proj,fit,paint,solid3,shadow4,start}from './canvas.js';

// ---------- Visualizer: a polygon, the solid built from it, the 4D shape built from that solid ----------
// blue marks the piece from one dimension down: one face of the solid, one cell of the 4D shape
const POLY=[{p:3,name:'Triangle',pl:'triangles'},{p:4,name:'Square',pl:'squares'},{p:5,name:'Pentagon',pl:'pentagons'}];
const SOLID=[
  {s:'3,3',name:'Tetrahedron',pl:'tetrahedra',n:4},{s:'3,4',name:'Octahedron',pl:'octahedra',n:8},{s:'3,5',name:'Icosahedron',pl:'icosahedra',n:20},
  {s:'4,3',name:'Cube',pl:'cubes',n:6},{s:'5,3',name:'Dodecahedron',pl:'dodecahedra',n:12}];
const TOPE=[
  {k:5,name:'5-cell',cell:'3,3',r:3},{k:16,name:'16-cell',cell:'3,3',r:4},{k:600,name:'600-cell',cell:'3,3',r:5},
  {k:24,name:'24-cell',cell:'3,4',r:3},{k:8,name:'Tesseract',cell:'4,3',r:3},{k:120,name:'120-cell',cell:'5,3',r:3}];
const cvs=$('#viz .shapes').querySelectorAll('canvas'),out=$('#viz-out'),playBtn=$('#viz-play'),cache={};
let sol=SOLID[3],tope=TOPE[4],G3,S3,P4,hi=[],fill4=null,play=!RM,drag4=false,ang=0,adv=false,solidOn=false;
const faceOf=s=>POLY.find(x=>x.p==+s.s[0]);
// the 4D shape starts a little turned; rows of M are where each screen axis reads from
const M=[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
const turn=(i,j,t)=>{const c=Math.cos(t),s=Math.sin(t),a=M[i],b=M[j];M[i]=a.map((x,k)=>c*x-s*b[k]);M[j]=a.map((x,k)=>s*x+c*b[k]);};
turn(0,3,.7);turn(1,2,.35);
const dt=(f,ts)=>{const d=play?Math.min(50,ts-(f.last||ts)):0;f.last=ts;return d;};
// zoom by r, keeping the point under x,y where it is
const zoomAt=(f,x,y,r)=>{const z=Math.max(.4,Math.min(8,f.zoom*r)),q=z/f.zoom;x-=f.w/2;y-=f.h/2;f.px=x-(x-f.px)*q;f.py=y-(y-f.py)*q;f.zoom=z;f.dirty=true;};
// a drag turns the shape; in advanced mode shift-drag or two fingers slide the view, and scroll or pinch zooms it
const pull=(f,fn)=>{const cv=f.cv,pt=new Map();f.zoom=1;f.px=f.py=0;cv.classList.add('grab');
  const two=()=>{const[a,b]=[...pt.values()];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)||1};};
  cv.addEventListener('pointerdown',e=>{pt.set(e.pointerId,{x:e.clientX,y:e.clientY});try{cv.setPointerCapture(e.pointerId)}catch(_){}});
  cv.addEventListener('pointermove',e=>{const p=pt.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;
    if(pt.size>1){if(!adv||pt.size>2)return;const a=two();p.x=e.clientX;p.y=e.clientY;const b=two(),r=cv.getBoundingClientRect();
      f.px+=b.x-a.x;f.py+=b.y-a.y;zoomAt(f,b.x-r.left,b.y-r.top,b.d/a.d);return;}
    p.x=e.clientX;p.y=e.clientY;if(adv&&e.shiftKey){f.px+=dx;f.py+=dy;}else fn(dx,dy);f.dirty=true;});
  const up=e=>pt.delete(e.pointerId);cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  cv.addEventListener('wheel',e=>{if(!adv)return;e.preventDefault();const r=cv.getBoundingClientRect();
    zoomAt(f,e.clientX-r.left,e.clientY-r.top,Math.exp(-e.deltaY*(e.deltaMode?16:1)*(e.ctrlKey?.01:.0015)));},{passive:false});};

const f2=mk(cvs[0],(f,ts)=>{ang+=dt(f,ts)*.0003;const p=faceOf(sol).p,P=[],E=[];
  for(let i=0;i<p;i++){const a=ang-Math.PI/2+i*2*Math.PI/p;P.push([Math.cos(a),Math.sin(a)]);E.push([i,(i+1)%p,1]);}
  paint(f,{flat:true,P,E,F:[{i:P.map((_,i)=>i),a:solidOn?.6:.16}],R:1.2});},{anim:play});
pull(f2,dx=>{ang+=dx*.01;});
const f3=mk(cvs[1],(f,ts)=>{f.yaw+=dt(f,ts)*.0004;solidOn?solid3(f,G3,G3.F[0],1.2):paint(f,S3);},{anim:play,far:14});
pull(f3,(dx,dy)=>{f3.yaw+=dx*.01;f3.pitch=Math.max(-1.5,Math.min(1.5,f3.pitch+dy*.01));});
const f4=mk(cvs[2],(f,ts)=>{const d=dt(f,ts);
  if(!P4){const c=f.ctx;c.fillStyle=K.muted;c.font='13px Geist, system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('No regular 4D shape has '+sol.pl+' for cells',f.w/2,f.h/2);return;}
  turn(0,3,d*.00022);turn(1,2,d*.00009);shadow4(f,P4,v=>M.map(r=>dot(r,v)),hi,null,fill4);},{R:1.6,yaw:.4,pitch:.3,anim:play});
pull(f4,(dx,dy)=>{if(drag4){turn(0,3,dx*.01);turn(1,3,dy*.01);}else{f4.yaw+=dx*.01;f4.pitch=Math.max(-1.5,Math.min(1.5,f4.pitch+dy*.01));}});

// ---------- Build: one flat shape, copies of it folded up into the solid, copies of the solid folded up into the 4D shape, and back ----------
const bInp=$('#build-t'),bOut=$('#build-out');
let NB,bKey,bt=0,bStage='',sway=0,by=.5,bp=.3;
const ramp=(x,a,b)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// both nets in one frame: the first face lies flat on the screen, the first cell lies in our space, and w is the way the cells fold
function nets(){
  const V4=P4?P4.V:G3.V.map(p=>[...p,0]),E=P4?P4.E:G3.E,sub=(a,b)=>a.map((x,i)=>x-b[i]),unit=v=>{const L=Math.hypot(...v);return v.map(x=>x/L);},
    cen=ids=>V4[0].map((_,d)=>ids.reduce((s,i)=>s+V4[i][d],0)/ids.length),C0=P4&&new Set(P4.cells[0]),
    F=P4?P4.cells.slice(1).map(c=>c.filter(v=>C0.has(v))).filter(s=>s.length>2):G3.F,
    o=P4?cen(P4.cells[0]):[0,0,0,0],ew=P4?unit(o.map(x=>-x)):[0,0,0,1],fc=cen(F[0]),ez=unit(sub(fc,o)),
    // the first face sits on one of its edges, so squares and cubes come out square to the screen
    v0=V4[F[0][0]],v1=F[0].slice(1).map(i=>V4[i]).sort((a,b)=>Math.hypot(...sub(a,v0))-Math.hypot(...sub(b,v0)))[0],ey=unit(sub(fc,v0.map((x,i)=>(x+v1[i])/2))),
    ex=unit([0,1,2,3].map(i=>{let v=[0,0,0,0];v[i]=1;for(const b of[ew,ez,ey]){const d=dot(v,b);v=v.map((x,k)=>x-d*b[k]);}return v;}).sort((a,b)=>Math.hypot(...b)-Math.hypot(...a))[0]),
    V=V4.map(p=>[ex,ey,ez,ew].map(e=>dot(sub(p,o),e))),TA=hinge(V,F,E,2),TB=P4?hinge(V,P4.cells,E,3):null,ang=i=>Math.atan2(V[F[0][i]][1],V[F[0][i]][0]);
  // far is the cell that swings furthest through w: it ends up nearest the lamp, so it is the one whose shadow grows over the rest
  const up=TB&&TB.map(n=>n.v.reduce((s,i)=>s+V[i][3],0)/n.v.length),far=TB?up.indexOf(Math.max(...up)):-1,ring=F[0].map((_,i)=>i).sort((a,b)=>ang(a)-ang(b));
  const fv=TB&&TB[far].v,farF=TB&&(P4.F||(P4.F=faces(P4))).filter(r=>r.every(v=>fv.includes(v))).map(r=>r.map(v=>fv.indexOf(v)));
  return{TA,TB,far,farF,wmax:Math.max(...V.map(p=>p[3])),ring,ringB:TB&&ring.map(i=>TB[0].v.indexOf(F[0][i]))};}
const say=st=>{const face=faceOf(sol),A=n=>(/^[IO]/.test(n)?'An':/^\d/.test(n)?'The':'A')+' <b>'+n.toLowerCase()+'</b>',nc=P4&&P4.cells.length;
  bOut.innerHTML={one:()=>lab('2D','One <b>'+face.name.toLowerCase()+'</b>.'),
    netA:()=>lab('2D',sol.n+' '+face.pl+' laid flat, joined edge to edge.'),
    foldA:()=>lab('2D → 3D','Folded up out of the flat until their edges meet, '+sol.s[2]+' at each corner.'),
    solid:()=>lab('3D',A(sol.name)+': '+sol.n+' '+face.pl+'.'+(tope?'':' No regular 4D shape is built from '+sol.pl+', so it stops here.')),
    netB:()=>lab('3D',nc+' '+sol.pl+' laid out in our space, joined face to face.'),
    foldB:()=>lab('3D → 4D','Folded up through the fourth direction until their faces meet, '+tope.r+' around each edge. We only see the shadow. Watch the blue one.'),
    tope:()=>lab('4D',A(tope.name)+': '+nc+' '+sol.pl+'. '+(NB.TB[NB.far].dep>1?'The blue one swung furthest, right round to the far side. It is nearest the lamp, so its shadow is the biggest.':'The blue one is one of the '+(nc-1)+' that folded up.'))}[st]();};
const fb=mk($('#build canvas'),(f,ts)=>{const d=Math.min(50,ts-(f.last||ts)),max=+bInp.max,c=f.ctx;f.last=ts;
  if(play){bt=(bt+d*.0002)%max;bInp.value=bt;sway+=d*.0004;}
  const s=bt>max/2?max-bt:bt,inB=s>1,x=inB?s-1:s,T=inB?NB.TB:NB.TA,g=ramp(x,.1,.36),
    tilt=inB?1:ramp(x,.42,.75),u=ramp(x,.5,.9),L=fold(T,u),off=[],P3=[];
  const st=inB?(x<.08?'solid':x<.46?'netB':x<.92?'foldB':'tope'):(x<.08?'one':x<.46?'netA':x<.9?'foldA':'solid');if(st!=bStage)say(bStage=st);
  // the lamp backs off while pieces swing past where they end up, so nothing reaches it
  let wm=NB.wmax;for(const P of L)for(const p of P)if(p[3]>wm)wm=p[3];const Dw=2*wm||1;
  L.forEach(P=>{off.push(P3.length);for(const p of P){const k=Dw/(Dw-p[3]);P3.push([p[0]*k,p[1]*k,p[2]*k]);}});
  // the rest of the net fades in all at once while the view widens from the first piece to take it in
  fit(f,P3.slice(0,L[0].length),3);const C=f.C,R=f.R;fit(f,P3,3);f.C=f.C.map((v,i)=>C[i]+(v-C[i])*g);f.R=R+(f.R-R)*g;f.yaw=tilt*(by+.2*Math.sin(sway));f.pitch=tilt*bp;
  const Q=proj(f,P3),ne=T.length*T[0].E.length,[al,lw]=ne>2000?[.25,.6]:ne>250?[.4,.8]:[.6,1.1];
  const far=inB?NB.far:-1,ink=(col,a,w)=>{if(a<=0)return;c.globalAlpha=a;c.strokeStyle=col;c.lineWidth=w;c.stroke();};
  const poly=(o,r)=>{r.forEach((i,k)=>k?c.lineTo(Q[o+i][0],Q[o+i][1]):c.moveTo(Q[o+i][0],Q[o+i][1]));c.closePath();};
  // grey edges fade with distance once the view is tilted, so the near side of a shape reads in front of its far side
  let z0=1e9,z1=-1e9;for(const q of Q){if(q[2]<z0)z0=q[2];if(q[2]>z1)z1=q[2];}const NZ=8,zk=NZ/(z1-z0+1e-9);
  const grey=(ok,a)=>{const bk=Array.from({length:NZ},()=>[]);T.forEach((N,i)=>{if(!ok(i))return;const o=off[i];for(const e of N.E){const p=Q[o+e[0]],q=Q[o+e[1]];bk[Math.min(NZ-1,Math.floor(((p[2]+q[2])/2-z0)*zk))].push(p,q);}});
    bk.forEach((es,k)=>{if(!es.length)return;c.beginPath();for(let j=0;j<es.length;j+=2){c.moveTo(es[j][0],es[j][1]);c.lineTo(es[j+1][0],es[j+1][1]);}ink(K.fg,a*(1-tilt*.7*(1-k/(NZ-1))),lw*(1+tilt*.5*k/(NZ-1)));});};
  c.lineJoin=c.lineCap='round';
  // blue is the piece to watch: the first face while the solid folds up, then it hands over to the far cell as the net of solids appears
  const hand=inB?1-g:1,ring=inB?NB.ringB:NB.ring;
  if(hand>0){c.beginPath();poly(0,ring);c.globalAlpha=.16*hand;c.fillStyle=K.accent;c.fill();}
  grey(i=>i&&i!=far,al*g*(inB?.7:1));
  if(inB){grey(i=>!i,al);c.fillStyle=K.accent;c.globalAlpha=.09*g;for(const r of NB.farF){c.beginPath();poly(off[far],r);if(g>0)c.fill();}
    c.beginPath();for(const r of NB.farF)poly(off[far],r);ink(K.accent,g,1.8);}
  c.beginPath();poly(0,ring);ink(K.accent,hand,1.8);
  c.globalAlpha=1;},{anim:play});
pull(fb,(dx,dy)=>{by+=dx*.01;bp=Math.max(-1.5,Math.min(1.5,bp+dy*.01));});
bInp.addEventListener('input',()=>{bt=+bInp.value;fb.dirty=true;});
// grabbing the slider hands control to the reader
const bHold=()=>{if(play){play=false;syncPlay();}};bInp.addEventListener('pointerdown',bHold);bInp.addEventListener('keydown',bHold);

const lab=(tag,name,sym)=>'<span class="tag">'+tag+'</span>'+name+(sym?' <code>{'+sym+'}</code>':'');
const bar=(el,items,on,ok,pick)=>{el.innerHTML=items.map((it,i)=>'<button class="btn'+(ok(it)?'':' off')+'" type="button" data-i="'+i+'" aria-pressed="'+(it===on)+'">'+it.name+'</button>').join('');
  el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>pick(items[+b.dataset.i])));};
function show(){
  const face=faceOf(sol),G=cache[sol.s]||(cache[sol.s]=solid(sol.s)),ring=G.F[0],q=sol.s[2];
  const on=e=>{const a=ring.indexOf(e[0]),b=ring.indexOf(e[1]),d=Math.abs(a-b);return a>=0&&b>=0&&(d==1||d==ring.length-1);};
  G3=G;S3={P:G.V,E:G.E.map(e=>[e[0],e[1],on(e)?1:0]),F:[{i:ring,a:.16}],R:1.2};
  P4=tope?cache[tope.k]||(cache[tope.k]=polytope(tope.k)):null;hi=[];fill4=null;
  if(P4){const C=new Set(P4.cells[0]);for(const e of P4.E)if(C.has(e[0])&&C.has(e[1]))hi.push([e[0],e[1],0]);
    if(solidOn){const F=P4.F||(P4.F=faces(P4));fill4={F,M:F.filter(r=>r.every(v=>C.has(v)))};}}
  // hovering a symbol spells out what each of its numbers counts
  const sym=(s,rows)=>'<code tabindex="0">{'+s+'}</code><span class="tip" role="tooltip">'+rows.map(r=>'<span><b>'+r[0]+'</b> '+r[1]+'</span>').join('')+'</span>',
    one=face.name.toLowerCase(),r2=[face.p,'sides on each '+one],r3=[q,face.pl+' at each corner'];
  $('#viz-l2').innerHTML=sym(face.p,[[face.p,'sides']]);
  $('#viz-l3').innerHTML=sym(sol.s,[r2,r3]);
  $('#viz-l4').innerHTML=tope?sym(tope.cell+','+tope.r,[r2,[q,face.pl+' at each corner of '+(/^[io]/.test(sol.name.toLowerCase())?'an ':'a ')+sol.name.toLowerCase()],[tope.r,sol.pl+' around each edge']]):'';
  bar($('#viz-b2'),POLY,face,()=>true,x=>pickSolid(SOLID.find(s=>+s.s[0]==x.p)));
  bar($('#viz-b3'),SOLID,sol,s=>faceOf(s)===face,pickSolid);
  bar($('#viz-b4'),TOPE,tope,t=>t.cell==sol.s,t=>{tope=t;sol=SOLID.find(s=>s.s==t.cell);show();});
  const made=(/^[IO]/.test(sol.name)?'An':'A')+' <b>'+sol.name.toLowerCase()+'</b> is '+sol.n+' '+face.pl+', '+q+' at each corner.';
  out.innerHTML=made+' '+(tope?(/^\d/.test(tope.name)?'The':'A')+' <b>'+tope.name.toLowerCase()+'</b> is '+P4.cells.length+' '+sol.pl+', '+tope.r+' around each edge.'
    :'Three '+sol.pl+' around an edge already overlap, so no regular 4D shape is built from them.');
  const key=tope?tope.k:sol.s;
  if(key!==bKey){bKey=key;NB=nets();bt=0;bInp.max=tope?4:2;bInp.value=0;$('#build-ticks').innerHTML=(tope?['2D','3D','4D','3D','2D']:['2D','3D','2D']).map(t=>'<span>'+t+'</span>').join('');}
  bStage='';[f2,f3,f4,fb].forEach(f=>f.dirty=true);
}
function pickSolid(s){sol=s;tope=TOPE.find(t=>t.cell==s.s)||null;show();}
const syncPlay=()=>{playBtn.textContent=play?'Pause':'Play';[f2,f3,f4,fb].forEach(f=>{f.anim=play;f.last=0;});};
playBtn.addEventListener('click',()=>{play=!play;syncPlay();});syncPlay();
// advanced mode: filled faces, dragging in 4D and a movable view; leaving it puts them all back
const advBtn=$('#viz-adv'),solidBox=$('#viz-solid'),dragBox=$('#viz-drag4');
const resetView=()=>[f2,f3,f4,fb].forEach(f=>{f.zoom=1;f.px=f.py=0;f.dirty=true;});
advBtn.addEventListener('click',()=>{adv=!adv;advBtn.setAttribute('aria-pressed',adv);$('#viz-advrow').hidden=!adv;$('#viz').classList.toggle('adv',adv);
  if(!adv){resetView();solidBox.checked=solidOn=false;dragBox.checked=drag4=false;show();}});
dragBox.addEventListener('change',()=>{drag4=dragBox.checked;});
solidBox.addEventListener('change',()=>{solidOn=solidBox.checked;show();});
$('#viz-reset').addEventListener('click',resetView);
show();
start();
