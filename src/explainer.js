import './style.css';
import{dot,corners,cubeEdges,quads,net,polytope}from './geometry.js';
import{$,RM,K,mk,orbit,proj,paint,seg,shadow4,start}from './canvas.js';

// drives a slider back and forth: plays by itself while its figure is on screen, pauses when it scrolls away,
// and stays paused once the reader pauses it or grabs the slider
// o.stop, if given, says how long to rest on each whole number reached on the way up; o.back speeds up the way down
function player(btn,inp,o){const dur=o.dur||6000,min=+inp.min,max=+inp.max;let want=!RM,vis=false,run=0,dir=1,last=0,wait=0;
  const sync=()=>{btn.textContent=want?'Pause':'Play';btn.setAttribute('aria-pressed',want?'true':'false');
    const id=++run;if(!(want&&vis))return;last=performance.now();
    const tick=ts=>{if(id!==run)return;const dt=Math.min(50,ts-last);last=ts;if(wait>0){wait-=dt;requestAnimationFrame(tick);return;}
      const v0=+inp.value;let v=v0+dir*dt/dur*(max-min)*(dir<0&&o.back||1),hitMin=false;
      if(o.stop&&dir>0&&Math.floor(v+1e-9)>Math.floor(v0+1e-9)){v=Math.floor(v+1e-9);wait=o.stop(v);}
      if(v>=max){v=max;dir=-1;}else if(v<=min){v=min;hitMin=dir<0;dir=1;}
      inp.value=v;inp.dispatchEvent(new Event('input'));if(hitMin&&o.onMin)o.onMin();requestAnimationFrame(tick);};
    requestAnimationFrame(tick);};
  btn.addEventListener('click',()=>{want=!want;sync();});
  const hold=()=>{if(want){want=false;sync();}};inp.addEventListener('pointerdown',hold);inp.addEventListener('keydown',hold);
  new IntersectionObserver(es=>{vis=es[es.length-1].isIntersecting;sync();},{threshold:.3}).observe(inp.closest('.fig'));}

// two linked panes on one slider: the 3D case on the left, the 4D case on the right
// lab names each pane for screen readers; cap is the label printed under it, as [dimensions, text]
function duo(el,cfg){
  el.insertAdjacentHTML('afterbegin','<div class="duo">'+[0,1].map(i=>'<div><div class="cv"><canvas role="img" aria-label="'+cfg.lab[i]+'"></canvas></div><p class="lab"><span class="tag">'+cfg.cap[i][0]+'</span>'+cfg.cap[i][1]+'</p></div>').join('')+'</div>');
  const cvs=el.querySelectorAll('.duo canvas'),inp=el.querySelector('input[type=range]');let S;
  const fs=[mk(cvs[0],f=>paint(f,S.l),cfg.view),mk(cvs[1],f=>paint(f,S.r))];
  if(!cfg.flat)orbit(fs[0]);orbit(fs[1]);
  const calc=()=>{const t=inp?+inp.value:0;S=cfg.scene(t);fs.forEach(f=>f.dirty=true);};
  if(inp)inp.addEventListener('input',calc);calc();calc.fs=fs;return calc;
}

// ---------- Shared by the 4D shadow figures ----------
const topes={},tope=k=>topes[k]||(topes[k]=polytope(k));
// a slow double turn in 4D: A mixes x with w, B mixes y with z
const spin4=(A,B)=>{const ca=Math.cos(A),sa=Math.sin(A),cb=Math.cos(B),sb=Math.sin(B);return v=>[v[0]*ca-v[3]*sa,v[1]*cb-v[2]*sb,v[1]*sb+v[2]*cb,v[0]*sa+v[3]*ca];};

// ---------- Projection: a solid cube between a lamp and a sheet, and the shadow that lands on the sheet ----------
// the cube is drawn as a block: only the faces turned to the viewer, brighter where the lamp reaches them
// the shadow is one dark patch, the hull of where the corners land, and a ray runs to each corner of that outline
(()=>{
  const H=8,T=3.4,L=[0,H,0],O=[0,1.9,0],QD=quads(3);
  const sub=(a,b)=>a.map((x,i)=>x-b[i]),area=(Q,r)=>{let a=0;r.forEach((i,k)=>{const j=r[(k+1)%r.length];a+=Q[i][0]*Q[j][1]-Q[j][0]*Q[i][1];});return a;};
  const dark=()=>parseInt(K.bg.slice(1,3),16)<128;
  const ring=(c,Q,r)=>{c.beginPath();r.forEach((i,k)=>k?c.lineTo(Q[i][0],Q[i][1]):c.moveTo(Q[i][0],Q[i][1]));c.closePath();};
  const face=(c,Q,F)=>{const dk=dark();ring(c,Q,F.r);
    c.globalAlpha=1;c.fillStyle=K.bg;c.fill();c.globalAlpha=dk?.07+.3*F.lit:.32-.28*F.lit;c.fillStyle=K.fg;c.fill();
    c.globalAlpha=.7;c.strokeStyle=K.fg;c.lineWidth=1.1;c.stroke();c.globalAlpha=1;};
  // a lit sheet with the shadow cut out of it: o is where the shadow's corners start in Q
  const sheet=(c,Q,r,o,hull)=>{const dk=dark();ring(c,Q,r);c.globalAlpha=dk?.2:.04;c.fillStyle=K.fg;c.fill();c.globalAlpha=.25;c.strokeStyle=K.fg;c.lineWidth=1;c.stroke();
    ring(c,Q,hull.map(i=>i+o));c.globalAlpha=1;c.fillStyle=K.bg;c.fill();if(!dk){c.globalAlpha=.45;c.fillStyle=K.fg;c.fill();}c.globalAlpha=1;};
  const rays=(c,lp,ends)=>{c.beginPath();for(const p of ends){c.moveTo(lp[0],lp[1]);c.lineTo(p[0],p[1]);}c.globalAlpha=.4;c.strokeStyle=K.c2;c.lineWidth=1;c.stroke();c.globalAlpha=1;};
  const lamp=(c,lp)=>{c.fillStyle=K.c2;c.beginPath();c.arc(lp[0],lp[1],5,0,7);c.fill();
    c.fillStyle=K.muted;c.font='12px Geist, system-ui, sans-serif';c.textAlign='left';c.textBaseline='middle';c.fillText('lamp',lp[0]+10,lp[1]);};
  // the cube turned by t: its corners V, its faces FC, where the corners land on the sheet S, and the outline of the shadow
  const turn=t=>{const a=t*.785,b=t*.955,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),
      V=corners(3).map(v=>{const x=v[0]*ca+v[2]*sa,z=-v[0]*sa+v[2]*ca;return[x,O[1]+v[1]*cb-z*sb,v[1]*sb+z*cb];}),
      S=V.map(p=>{const k=H/(H-p[1]);return[p[0]*k,0,p[2]*k];});
    // the outline of the shadow: the convex hull of the eight corners where they land
    const id=S.map((_,i)=>i).sort((a,b)=>S[a][0]-S[b][0]||S[a][2]-S[b][2]),cr=(o,a,b)=>(S[a][0]-S[o][0])*(S[b][2]-S[o][2])-(S[a][2]-S[o][2])*(S[b][0]-S[o][0]),
      half=ids=>{const h=[];for(const i of ids){while(h.length>1&&cr(h[h.length-2],h[h.length-1],i)<=1e-9)h.pop();h.push(i);}h.pop();return h;};
    // n points out of the face, o says which way round its ring runs, lit is how squarely the lamp hits it
    const FC=QD.map(r=>{const c=[0,1,2].map(d=>r.reduce((s,i)=>s+V[i][d],0)/4),n=sub(c,O),u=sub(V[r[1]],V[r[0]]),w=sub(V[r[2]],V[r[1]]),l=sub(L,c);
      return{r,o:Math.sign(dot([u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],n)),lit:Math.max(0,dot(l,n)/Math.hypot(...l))};});
    return{V,S,FC,hull:[...half(id),...half(id.slice().reverse())]};};
  // a figure of two panes on one slider that turns the cube: a and b are each [draw(f,st), framing]
  const two=(id,a,b)=>{const inp=$('#'+id+'-t'),cvs=$('#'+id).querySelectorAll('canvas');let st;
    const fs=[mk(cvs[0],f=>a[0](f,st),a[1]),mk(cvs[1],f=>b[0](f,st),b[1])];
    const calc=()=>{st=turn(+inp.value);fs.forEach(f=>f.dirty=true);};
    inp.addEventListener('input',calc);calc();player($('#'+id+'-play'),inp,{dur:6000});return fs;};
  // 3D to 2D: the cube, the lamp and the sheet from the side, then the sheet from above
  orbit(two('proj',[(f,st)=>{const c=f.ctx,Q=proj(f,[...st.V,...st.S,[-T,0,-T],[T,0,-T],[T,0,T],[-T,0,T],L]),lp=Q[20];c.lineJoin=c.lineCap='round';
      sheet(c,Q,[16,17,18,19],8,st.hull);rays(c,lp,st.hull.map(i=>Q[i+8]));st.FC.filter(F=>area(Q,F.r)*F.o<0).forEach(F=>face(c,Q,F));lamp(c,lp);},{yaw:.6,pitch:.3,R:5,C:[0,3.4,0]}],
    [(f,st)=>{const c=f.ctx,Q=proj(f,[...st.S.map(p=>[p[0],p[2]]),[-T,-T],[T,-T],[T,T],[-T,T]],true);c.lineJoin='round';sheet(c,Q,[8,9,10,11],0,st.hull);},{R:T*1.2}])[0]);
  // 2D to 1D: a second lamp lies on the sheet, and the flat shadow lands on the sheet's bottom edge as a bar; then that edge by itself
  const HL=6,G=3.6,W=4.2,R=5.6;
  const edge=st=>{const A=st.S.map(p=>[p[0],p[2]]),x=A.map(p=>p[0]*(G+HL)/(p[1]+HL));return{A,lo:Math.min(...x),hi:Math.max(...x)};};
  const bar=(c,p,q)=>{c.strokeStyle=K.fg;c.lineWidth=3.2;c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);c.stroke();};
  two('flat',[(f,st)=>{const c=f.ctx,e=edge(st),Q=proj(f,[...e.A,[-W,-HL-.7],[W,-HL-.7],[W,G],[-W,G],[0,-HL],[e.lo,G],[e.hi,G]],true),lp=Q[12];c.lineJoin=c.lineCap='round';
      sheet(c,Q,[8,9,10,11],0,st.hull);rays(c,lp,[Q[13],Q[14]]);bar(c,Q[13],Q[14]);lamp(c,lp);},{R,C:[0,(G-HL-.7)/2,0]}],
    [(f,st)=>{const c=f.ctx,e=edge(st),Q=proj(f,[[-W,0],[W,0],[e.lo,0],[e.hi,0]],true);c.lineCap='round';
      c.globalAlpha=.25;c.strokeStyle=K.fg;c.lineWidth=1;c.beginPath();c.moveTo(Q[0][0],Q[0][1]);c.lineTo(Q[1][0],Q[1][1]);c.stroke();c.globalAlpha=1;bar(c,Q[2],Q[3]);},{R}]);
})();

// ---------- Projection, one dimension up: the tesseract turns in 4D and only its solid shadow can be drawn ----------
(()=>{
  const inp=$('#proj4-t'),P=tope(8),C=new Set(P.cells[0]),hi=P.E.filter(e=>C.has(e[0])&&C.has(e[1])).map(e=>[e[0],e[1],0]);let t=0;
  const f=mk($('#proj4 canvas'),f=>shadow4(f,P,spin4(t*1.1,t*.3),hi,null),{R:1.3,yaw:.4,pitch:.3});orbit(f);
  const calc=()=>{t=+inp.value;f.dirty=true;};
  inp.addEventListener('input',calc);calc();player($('#proj4-play'),inp,{dur:6000});
})();

// ---------- Nets: six squares that fold into a cube, eight cubes that fold into a tesseract ----------
// the net of the (m+1)-cube with piece i marked: 0 is the base, then the sides, and the last is the lid; i < 0 marks nothing
const piece=(N,m,i)=>{const w=1<<m,o=i*w;
  return{E:N.E.map(e=>[e[0],e[1],i>=0&&e[0]>=o&&e[0]<o+w?1:0]),F:i<0?[]:quads(m).map(q=>({i:q.map(j=>j+o),a:m==2?.18:.09}))};};
// that net folded by u (0 flat, 1 shut) and seen as its shadow, one dimension down
// the lamp backs off while the lid swings past where it ends up, so its shadow never runs away
function netShadow(m,u,i){const N=net(m,u*Math.PI/2);let h=2;for(const p of N.P)if(p[m]>h)h=p[m];const D=2.5*h;
  return{...piece(N,m,i),flat:m==2,P:N.P.map(p=>{const s=D/(D-p[m]);return m==2?[p[0]*s,p[1]*s]:[p[0]*s,-p[1]*s,p[2]*s];})};}

// ---------- Sweep: each shape dragged along a new axis into the next, resting on each to show what it is made of ----------
(()=>{
  const el=$('#sweep'),inp=$('#sweep-t'),out=$('#sweep-out'),AX=[[1,0],[0,-1],[.46,-.3],[-.34,-.52]],NM=['Point','Line','Square','Cube','Tesseract'];
  const pl=(n,w)=>n+' '+w+(n==1?'':'s');
  const read=()=>{const t=+inp.value,k=Math.min(4,Math.floor(t+1e-9)),fr=k==4?0:t-k;return{k,fr:fr<.004?0:fr};};
  // what gets picked out at each rest: the square itself, each square of the cube, each cube of the tesseract
  // a part is the corners that agree with val on the axes in mask; PER is how long each one stays lit
  const parts=k=>{if(k==2)return[[0,0]];const o=[];for(let j=0;j<k;j++)for(const b of[0,1])o.push([1<<j,b<<j]);return o;},PER=[0,0,1300,650,750];
  const squares=(k,mask,val)=>{const fr=[],o=[];for(let i=0;i<k;i++)if(!(mask>>i&1))fr.push(i);
    for(let x=0;x<fr.length;x++)for(let y=x+1;y<fr.length;y++){const a=1<<fr[x],b=1<<fr[y],rest=fr.filter((_,i)=>i!=x&&i!=y);
      for(let m=0;m<1<<rest.length;m++){let t=val;rest.forEach((r,i)=>{if(m>>i&1)t|=1<<r;});o.push([t,t|a,t|a|b,t|b]);}}return o;};
  let cur=0,since=0;
  const f=mk($('canvas',el),(f,ts)=>{
    const{k,fr}=read(),c=f.ctx,base=corners(k),ed=cubeEdges(k),sc=Math.min(f.w,f.h)/2/2.05;
    const at=(v,off)=>{let x=0,y=0;for(let i=0;i<k;i++){x+=v[i]*AX[i][0];y+=v[i]*AX[i][1];}if(k<4){x+=off*AX[k][0];y+=off*AX[k][1];}return[f.w/2+x*sc,f.h/2+y*sc];};
    const A=base.map(v=>at(v,-fr)),B=base.map(v=>at(v,fr));c.lineCap=c.lineJoin='round';
    const lines=(pairs,col,a,lw)=>{c.beginPath();for(const[p,q]of pairs){c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);}c.globalAlpha=a;c.strokeStyle=col;c.lineWidth=lw;c.stroke();c.globalAlpha=1;};
    const dots=(pts,col,a)=>{c.fillStyle=col;c.globalAlpha=a||1;for(const p of pts){c.beginPath();c.arc(p[0],p[1],k?2.6:4,0,7);c.fill();}c.globalAlpha=1;};
    // while one part of a cube or tesseract is lit, the rest of the shape drops back so the part stands out
    const lit=!fr&&k>1,dim=lit&&k>2;
    if(fr)lines(A.map((p,i)=>[p,B[i]]),K.accent,1,1.6);
    lines(ed.map(e=>[A[e[0]],A[e[1]]]),K.fg,dim?.2:.7,1.2);
    if(fr)lines(ed.map(e=>[B[e[0]],B[e[1]]]),K.fg,.7,1.2);
    dots(A,K.fg,dim?.3:1);
    if(lit){const P=parts(k),[mask,val]=P[RM?0:Math.floor(Math.max(0,ts-since)/PER[k])%P.length],on=i=>(i&mask)==val;
      c.fillStyle=K.accent;c.globalAlpha=k==4?.12:.2;for(const r of squares(k,mask,val)){c.beginPath();r.forEach((i,n)=>n?c.lineTo(A[i][0],A[i][1]):c.moveTo(A[i][0],A[i][1]));c.closePath();c.fill();}
      lines(ed.filter(e=>on(e[0])&&on(e[1])).map(e=>[A[e[0]],A[e[1]]]),K.accent,1,2);if(dim)dots(A.filter((_,i)=>on(i)),K.accent);}
    if(fr)dots(B,K.accent);
  });
  const say=e=>{
    // a hand on the slider settles onto a shape when it comes close to one
    if(e&&e.isTrusted){const v=+inp.value,r=Math.round(v);if(Math.abs(v-r)<.05)inp.value=r;}
    const{k,fr}=read(),V=1<<k,E=k*V/2,at=fr||k<2?0:k;
    if(at!==cur){cur=at;since=performance.now();}f.anim=!!at&&!RM;
    out.innerHTML=fr?NM[k]+' → <b>'+NM[k+1].toLowerCase()+'</b> · '+V+' + '+V+' = '+pl(2*V,'corner')+' · '+pl(2*E+V,'edge')
      :'<b>'+NM[k]+'</b> · '+pl(V,'corner')+' · '+pl(E,'edge');f.dirty=true;};
  // the player rests on each shape for one pass through its parts
  inp.addEventListener('input',say);say();player($('#sweep-play'),inp,{dur:3000,back:2,stop:k=>parts(k).length*PER[k]});
})();

// ---------- A lamp, a wire cube, a table ----------
function lampScene(H){const T=3.1,top=2,P=corners(3).map(v=>[v[0],2+v[1],v[2]]);
  P.slice(0,8).forEach(p=>{const k=H/(H-p[1]);P.push([p[0]*k,0,p[2]*k]);});
  P.push([-T,0,-T],[T,0,-T],[T,0,T],[-T,0,T],[0,H,0]);
  const E=[];for(const e of cubeEdges(3)){const c=(e[0]&top)&&(e[1]&top)?1:0;E.push([e[0],e[1],c],[e[0]+8,e[1]+8,c]);}
  for(let i=0;i<4;i++)E.push([16+i,16+(i+1)%4,2]);
  for(const i of[2,3,6,7])E.push([20,i+8,3]);
  return{P,E,F:[{i:[2,3,7,6],a:.16},{i:[10,11,15,14],a:.12}],D:[20],T:[[20,'lamp']],R:4.2,C:[0,1.9,0]};}

// ---------- Ladder: square to line, cube to flat shape, tesseract to solid ----------
(()=>{
  const el=$('#ladder'),inp=$('#ladder-t'),cvs=el.querySelectorAll('canvas'),E4=cubeEdges(4),V4=corners(4),top=8,S=[];
  const fs=[0,1,2].map(i=>mk(cvs[i],f=>paint(f,S[i]),{yaw:.6,pitch:.38}));orbit(fs[1]);orbit(fs[2]);
  const calc=()=>{const t=+inp.value,H=5+2.1*t,Hc=H-2;
    // a square standing on edge, as (x, height), drawn with height going up the screen
    const q=[[-1,1],[1,1],[1,3],[-1,3]],P=q.map(p=>[p[0],-p[1]]);q.forEach(p=>P.push([p[0]*H/(H-p[1]),0]));P.push([-3.1,0],[3.1,0],[0,-H]);
    S[0]={flat:true,P,E:[[0,1,0],[1,2,0],[2,3,1],[3,0,0],[8,9,2],[6,7,1],[4,5,4],[10,6,3],[10,7,3]],D:[10],R:4,C:[0,-2.3,0]};
    S[1]=lampScene(H);
    S[2]={P:V4.map(p=>{const k=Hc/(Hc-p[3]);return[p[0]*k,-p[1]*k,p[2]*k];}),E:E4.map(e=>[e[0],e[1],(e[0]&top)&&(e[1]&top)?1:0]),F:quads(3).map(d=>({i:d.map(i=>i|top),a:.07})),R:3};
    fs.forEach(f=>f.dirty=true);};
  inp.addEventListener('input',calc);calc();player($('#ladder-play'),inp,{dur:5000});
})();

// ---------- Pieces: pick one side, turn it to face the lamp ----------
(()=>{
  const D=5,inp=$('#pieces-t');let idx=2;
  // sides of the n-cube as [axis, sign]: nearest the lamp, farthest, then the ones side-on to it
  const sides=n=>{const L=[[n-1,1],[n-1,-1]];for(let a=0;a<n-1;a++)L.push([a,1],[a,-1]);return L;};
  const emb=(l,a,b)=>(l&((1<<a)-1))|(b<<a)|((l>>a)<<(a+1));
  const make=(n,u)=>{const pc=sides(n)[idx],h=n-1,E=cubeEdges(n).map(e=>[e[0],e[1],0]);let V=corners(n),F=[];
    if(pc){const a=pc[0],s=pc[1],bit=s>0?1:0,ang=u*Math.PI/(a==h?1:2),c=Math.cos(ang),sn=Math.sin(ang);
      if(a!=h)V=V.map(v=>{const p=v.slice();p[a]=v[a]*c-s*v[h]*sn;p[h]=s*v[a]*sn+v[h]*c;return p;});
      else if(s<0)V=V.map(v=>{const p=v.slice();p[0]=v[0]*c-v[h]*sn;p[h]=v[0]*sn+v[h]*c;return p;});
      E.forEach(e=>{if((e[0]>>a&1)==bit&&(e[1]>>a&1)==bit)e[2]=1;});
      F=quads(n-1).map(q=>({i:q.map(l=>emb(l,a,bit)),a:n==3?.18:.08}));}
    return{V,E,F};};
  const calc=duo($('#pieces'),{lab:['The flat shadow of a cube, with one piece marked','The solid shadow of a tesseract, with one piece marked'],cap:[['3D → 2D','A cube\'s shadow, one square marked'],['4D → 3D','A tesseract\'s shadow, one cube marked']],flat:true,
    scene:u=>{const A=make(3,u),B=make(4,u);
      return{l:{P:A.V.map(p=>{const k=D/(D-1-p[2]);return[p[0]*k,p[1]*k];}),E:A.E,F:A.F,R:2.9,flat:true},
        r:{P:B.V.map(p=>{const k=D/(D-1-p[3]);return[p[0]*k,-p[1]*k,p[2]*k];}),E:B.E,F:B.F,R:3.5}};}});
  // the choice is a kind of piece, not one of eight, so the cube and the tesseract always have a matching one marked
  seg([...$('#pieces-kind').querySelectorAll('button')],b=>{idx=+b.dataset.i;inp.value=0;calc();});
  player($('#pieces-play'),inp,{dur:3200});
})();

// ---------- Folding: the box itself, its shadow on a sheet, and the shadow of the same fold one dimension up ----------
(()=>{
  const el=$('#both'),inp=$('#both-t'),cvs=el.querySelectorAll('canvas'),S=[];let kind=2;
  const fs=[mk(cvs[0],f=>paint(f,S[0]),{yaw:1.02,pitch:.5}),mk(cvs[1],f=>paint(f,S[1])),mk(cvs[2],f=>paint(f,S[2]))];orbit(fs[0]);orbit(fs[2]);
  // the marked piece is a kind (base, a side, the lid), so the box and the tesseract always have a matching one marked
  const calc=()=>{const u=+inp.value,j=[0,1,5][kind],idx=[0,1,7][kind],N=net(2,u*Math.PI/2);
    S[0]={...piece(N,2,j),P:N.P.map(p=>[p[0],p[2],p[1]]),R:3.9,C:[0,.9,.9]};S[1]=netShadow(2,u,j);S[2]=netShadow(3,u,idx);fs.forEach(f=>f.dirty=true);};
  seg([...$('#both-kind').querySelectorAll('button')],b=>{kind=+b.dataset.i;calc();});
  inp.addEventListener('input',calc);calc();player($('#both-play'),inp,{dur:7000});
})();

// ---------- Only six ----------
(()=>{
  const M={poly:{items:[['Triangles',60,'3'],['Squares',90,'4'],['Pentagons',108,'5'],['Hexagons',120,'6']],
      res:{'3,3':'tetrahedron','3,4':'octahedron','3,5':'icosahedron','4,3':'cube','5,3':'dodecahedron'}},
    solid:{items:[['Tetrahedra',70.5288,'3,3'],['Cubes',90,'4,3'],['Octahedra',109.4712,'3,4'],['Dodecahedra',116.5651,'5,3'],['Icosahedra',138.1897,'3,5']],
      res:{'3,3,3':'5-cell','3,3,4':'16-cell','3,3,5':'600-cell','4,3,3':'tesseract','3,4,3':'24-cell','5,3,3':'120-cell'}}};
  const st={mode:'poly',idx:{poly:0,solid:0},cnt:{poly:3,solid:3}};
  const svg=$('#fit-svg'),shapes=$('#fit-shapes'),out=$('#fit-out'),nOut=$('#fit-n');
  const fmt=x=>{const r=Math.round(x*10)/10;return r%1?r.toFixed(1):String(r);},rad=d=>d*Math.PI/180,pt=(r,d)=>[r*Math.cos(rad(d)),r*Math.sin(rad(d))];
  function render(){
    const m=st.mode,mm=M[m],it=mm.items[st.idx[m]],ang=it[1],cnt=st.cnt[m],tot=ang*cnt,gap=360-tot,flat=Math.abs(gap)<.05,over=gap<-.05,start=-90+Math.max(gap,0)/2;let s='';
    for(let k=0;k<cnt;k++){const a0=start+k*ang;let pts;
      if(m=='poly'){const p=+it[2],L=92*Math.sin(Math.PI/p);pts=[[0,0]];let x=0,y=0,th=a0;for(let i=0;i<p-1;i++){x+=L*Math.cos(rad(th));y+=L*Math.sin(rad(th));pts.push([x,y]);th+=360/p;}}
      else pts=[[0,0],pt(88,a0),pt(88,a0+ang)];
      s+='<polygon class="pc-shape'+(over?' over':'')+'" points="'+pts.map(p=>p.map(v=>v.toFixed(2)).join()).join(' ')+'"/>';}
    if(!flat&&!over){const p1=pt(46,start+tot),p2=pt(46,start+360);
      s+='<path class="gap" d="M0 0L'+p1.map(v=>v.toFixed(2)).join(' ')+'A46 46 0 '+(gap>180?1:0)+' 1 '+p2.map(v=>v.toFixed(2)).join(' ')+'Z"/><text class="gapt" x="0" y="-58">gap '+fmt(gap)+'°</text>';}
    s+='<circle class="hub" r="2.2"/>';svg.innerHTML=s;
    const key=it[2]+','+cnt,name=mm.res[key],sum='<span class="sum">'+cnt+' × '+fmt(ang)+'° = '+fmt(tot)+'°</span>';
    out.innerHTML=sum+(!flat&&!over&&name?'Gap. Folds up into the <b>'+name+'</b> <code>{'+key+'}</code>'
      :flat?'No gap. Stays flat forever, so nothing closes up.':'Too much. They would overlap.');
    nOut.textContent=cnt;
    svg.setAttribute('aria-label',m=='poly'?cnt+' '+it[0].toLowerCase()+' around a shared corner':cnt+' '+it[0].toLowerCase()+' around a shared edge, seen end on');
  }
  function tabs(){const m=st.mode;shapes.innerHTML=M[m].items.map((it,i)=>'<button class="btn" type="button" data-i="'+i+'" aria-pressed="'+(i==st.idx[m])+'">'+it[0]+'</button>').join('');
    seg([...shapes.querySelectorAll('button')],b=>{st.idx[m]=+b.dataset.i;st.cnt[m]=3;render();});}
  seg([$('#fit-poly'),$('#fit-solid')],b=>{st.mode=b.id=='fit-poly'?'poly':'solid';tabs();render();});
  $('#fit-less').addEventListener('click',()=>{st.cnt[st.mode]=Math.max(3,st.cnt[st.mode]-1);render();});
  $('#fit-more').addEventListener('click',()=>{st.cnt[st.mode]=Math.min(6,st.cnt[st.mode]+1);render();});
  tabs();render();
})();

// ---------- The six ----------
(()=>{
  const SIX=[
    {k:5,name:'5-cell',sym:'{3,3,3}',cell:'tetrahedra',r:3,n:[5,10,10,5],like:'The tetrahedron, one step up.'},
    {k:8,name:'Tesseract',sym:'{4,3,3}',cell:'cubes',r:3,n:[16,32,24,8],like:'The cube, one step up.'},
    {k:16,name:'16-cell',sym:'{3,3,4}',cell:'tetrahedra',r:4,n:[8,24,32,16],like:'The octahedron, one step up.'},
    {k:24,name:'24-cell',sym:'{3,4,3}',cell:'octahedra',r:3,n:[24,96,96,24],like:'Exists only in 4D.'},
    {k:120,name:'120-cell',sym:'{5,3,3}',cell:'dodecahedra',r:3,n:[600,1200,720,120],like:'The dodecahedron, one step up.'},
    {k:600,name:'600-cell',sym:'{3,3,5}',cell:'tetrahedra',r:5,n:[120,720,1200,600],like:'The icosahedron, one step up.'}];
  const el=$('#six'),info=$('#six-info'),tabs=$('#six-tabs'),playBtn=$('#six-play');
  let P,mode='cell',play=!RM,A=.7,B=.35,last=0,hi=[],shared=null;
  const f=mk($('canvas',el),(f,ts)=>{
    if(play){const dt=Math.min(50,ts-(last||ts));A+=dt*.00022;B+=dt*.00009;}last=ts;
    shadow4(f,P,spin4(A,B),hi,shared);
  },{R:1.6,yaw:.4,pitch:.3,anim:play});
  orbit(f);
  function mark(){hi=[];shared=null;
    if(mode=='cell'){const S=new Set(P.cells[0]);for(const e of P.E)if(S.has(e[0])&&S.has(e[1]))hi.push([e[0],e[1],0]);}
    else{const e0=P.E[0];shared=e0;P.cells.filter(c=>c.includes(e0[0])&&c.includes(e0[1])).forEach((cl,g)=>{const S=new Set(cl);for(const e of P.E)if(e!==e0&&S.has(e[0])&&S.has(e[1]))hi.push([e[0],e[1],g]);});}
    f.dirty=true;}
  function show(d){P=tope(d.k);const n=d.n;
    info.innerHTML='<h3>'+d.name+' <code>'+d.sym+'</code></h3><p>'+n[3]+' '+d.cell+', '+d.r+' around each edge. '+d.like+'</p>'
      +'<dl><div><dt>Corners</dt><dd>'+n[0]+'</dd></div><div><dt>Edges</dt><dd>'+n[1]+'</dd></div><div><dt>Faces</dt><dd>'+n[2]+'</dd></div><div><dt>Cells</dt><dd>'+n[3]+'</dd></div></dl>';
    mark();}
  tabs.innerHTML=SIX.map((d,i)=>'<button class="btn" type="button" data-i="'+i+'" aria-pressed="'+(i==4)+'">'+d.name+'</button>').join('');
  seg([...tabs.querySelectorAll('button')],b=>show(SIX[+b.dataset.i]));
  seg([...$('#six-mode').querySelectorAll('button')],b=>{mode=b.dataset.m;mark();});
  const syncPlay=()=>{playBtn.textContent=play?'Pause':'Play';f.anim=play;last=0;};
  playBtn.addEventListener('click',()=>{play=!play;syncPlay();});syncPlay();
  show(SIX[4]);
})();

start();
