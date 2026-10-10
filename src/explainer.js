import './style.css';
import{dot,corners,cubeEdges,quads,net,cut,ring2,cutCells,polytope}from './geometry.js';
import{$,RM,K,mk,orbit,proj,paint,seg,shadow4,start}from './canvas.js';

// drives a slider back and forth: plays by itself while its figure is on screen, pauses when it scrolls away,
// and stays paused once the reader pauses it or grabs the slider
function player(btn,inp,o){const dur=o.dur||6000,min=+inp.min,max=+inp.max;let want=!RM,vis=false,run=0,dir=1,last=0;
  const sync=()=>{btn.textContent=want?'Pause':'Play';btn.setAttribute('aria-pressed',want?'true':'false');
    const id=++run;if(!(want&&vis))return;last=performance.now();
    const tick=ts=>{if(id!==run)return;const dt=Math.min(50,ts-last);last=ts;let v=+inp.value+dir*dt/dur*(max-min),hitMin=false;
      if(v>=max){v=max;dir=-1;}else if(v<=min){v=min;hitMin=dir<0;dir=1;}
      inp.value=v;inp.dispatchEvent(new Event('input'));if(hitMin&&o.onMin)o.onMin();requestAnimationFrame(tick);};
    requestAnimationFrame(tick);};
  btn.addEventListener('click',()=>{want=!want;sync();});
  const hold=()=>{if(want){want=false;sync();}};inp.addEventListener('pointerdown',hold);inp.addEventListener('keydown',hold);
  new IntersectionObserver(es=>{vis=es[es.length-1].isIntersecting;sync();},{threshold:.3}).observe(inp.closest('.fig'));}

// two linked panes on one slider: the 3D case on the left, the 4D case on the right
function duo(el,cfg){
  el.insertAdjacentHTML('afterbegin','<div class="duo">'+[0,1].map(i=>'<div><div class="cv"><canvas role="img" aria-label="'+cfg.lab[i]+'"></canvas></div><p class="lab"><span class="tag">'+(cfg.tags||['3D','4D'])[i]+'</span>'+cfg.lab[i]+'</p></div>').join('')+'</div>');
  const cvs=el.querySelectorAll('.duo canvas'),inp=el.querySelector('input[type=range]');let S;
  const fs=[mk(cvs[0],f=>paint(f,S.l),cfg.view),mk(cvs[1],f=>paint(f,S.r))];
  if(!cfg.flat)orbit(fs[0]);orbit(fs[1]);
  const calc=()=>{const t=inp?+inp.value:0;S=cfg.scene(t);fs.forEach(f=>f.dirty=true);if(cfg.out)cfg.out(t);};
  if(inp)inp.addEventListener('input',calc);calc();calc.fs=fs;return calc;
}

// ---------- Sweep ----------
(()=>{
  const el=$('#sweep'),inp=$('#sweep-t'),out=$('#sweep-out'),AX=[[1,0],[0,-1],[.46,-.3],[-.34,-.52]],NM=['Point','Line','Square','Cube','Tesseract'];
  const pl=(n,w)=>n+' '+w+(n==1?'':'s');
  const read=()=>{const t=+inp.value,k=Math.min(4,Math.floor(t+1e-9)),fr=k==4?0:t-k;return{k,fr:fr<.004?0:fr};};
  const f=mk($('canvas',el),f=>{
    const{k,fr}=read(),c=f.ctx,base=corners(k),ed=cubeEdges(k),sc=Math.min(f.w,f.h)/2/2.05;
    const at=(v,off)=>{let x=0,y=0;for(let i=0;i<k;i++){x+=v[i]*AX[i][0];y+=v[i]*AX[i][1];}if(k<4){x+=off*AX[k][0];y+=off*AX[k][1];}return[f.w/2+x*sc,f.h/2+y*sc];};
    const A=base.map(v=>at(v,-fr)),B=base.map(v=>at(v,fr));c.lineCap='round';
    const lines=(pairs,col,a,lw)=>{c.beginPath();for(const[p,q]of pairs){c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);}c.globalAlpha=a;c.strokeStyle=col;c.lineWidth=lw;c.stroke();c.globalAlpha=1;};
    const dots=(pts,col)=>{c.fillStyle=col;for(const p of pts){c.beginPath();c.arc(p[0],p[1],k?2.6:4,0,7);c.fill();}};
    if(fr)lines(A.map((p,i)=>[p,B[i]]),K.accent,1,1.6);
    lines(ed.map(e=>[A[e[0]],A[e[1]]]),K.fg,.7,1.2);
    if(fr)lines(ed.map(e=>[B[e[0]],B[e[1]]]),K.fg,.7,1.2);
    dots(A,K.fg);if(fr)dots(B,K.accent);
  });
  const say=()=>{const{k,fr}=read(),V=1<<k,E=k*V/2;
    out.innerHTML=fr?NM[k]+' → <b>'+NM[k+1].toLowerCase()+'</b> · '+V+' + '+V+' = '+pl(2*V,'corner')+' · '+pl(2*E+V,'edge')
      :'<b>'+NM[k]+'</b> · '+pl(V,'corner')+' · '+pl(E,'edge');f.dirty=true;};
  inp.addEventListener('input',say);say();player($('#sweep-play'),inp,{dur:10000});
})();

// ---------- Shadow: a lamp, a wire cube, a table ----------
function lampScene(H){const T=3.1,top=2,P=corners(3).map(v=>[v[0],2+v[1],v[2]]);
  P.slice(0,8).forEach(p=>{const k=H/(H-p[1]);P.push([p[0]*k,0,p[2]*k]);});
  P.push([-T,0,-T],[T,0,-T],[T,0,T],[-T,0,T],[0,H,0]);
  const E=[];for(const e of cubeEdges(3)){const c=(e[0]&top)&&(e[1]&top)?1:0;E.push([e[0],e[1],c],[e[0]+8,e[1]+8,c]);}
  for(let i=0;i<4;i++)E.push([16+i,16+(i+1)%4,2]);
  for(const i of[2,3,6,7])E.push([20,i+8,3]);
  return{P,E,F:[{i:[2,3,7,6],a:.16},{i:[10,11,15,14],a:.12}],D:[20],T:[[20,'lamp']],R:4.2,C:[0,1.9,0]};}
(()=>{
  const el=$('#shadow'),inp=$('#shadow-t');let S;
  const f=mk($('canvas',el),f=>paint(f,S),{yaw:.6,pitch:.38});orbit(f);
  const calc=()=>{const t=+inp.value;S=lampScene(5+2.1*t);f.dirty=true;};
  inp.addEventListener('input',calc);calc();player($('#shadow-play'),inp,{dur:5000});
})();

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

// ---------- Flat-pack: the same pieces laid flat and glued together ----------
(()=>{
  const D=5,out=$('#flat-out'),nOut=$('#flat-n');let m=3,idx=3;
  const pick=N=>{const w=1<<m,o=idx*w;return{E:N.E.map(e=>[e[0],e[1],e[0]>=o&&e[0]<o+w?1:0]),F:quads(m).map(q=>({i:q.map(i=>i+o),a:m==2?.18:.09}))};};
  const calc=duo($('#flat'),{lab:['Unfolded and laid flat','Glued back together, as a shadow'],tags:['flat','shadow'],
    scene:()=>{const A=net(m,0),B=net(m,Math.PI/2),a=pick(A),b=pick(B);
      if(m==2)return{l:{flat:true,P:A.P.map(p=>[p[0],p[1]]),E:a.E,F:a.F},r:{flat:true,P:B.P.map(p=>{const s=D/(D-p[2]);return[p[0]*s,p[1]*s];}),E:b.E,F:b.F}};
      return{l:{P:A.P.map(p=>[p[0],-p[1],p[2]]),E:a.E,F:a.F},r:{P:B.P.map(p=>{const s=D/(D-p[3]);return[p[0]*s,-p[1]*s,p[2]*s];}),E:b.E,F:b.F}};},
    out:()=>{const N=2*m+2,sq=m==2?'square':'cube';nOut.textContent='Piece '+(idx+1)+' of '+N;
      out.innerHTML='Laid flat it is a plain <b>'+sq+'</b>. In the shadow it is '+(idx==0?'the <b>small inner '+sq+'</b>, because it is farthest from the lamp.'
        :idx==N-1?'the <b>big outer '+sq+'</b>, because it is nearest the lamp.':'a <b>slanted '+(m==2?'shape':'block')+'</b>, because it is side-on to the lamp.');}});
  const go=d=>{const N=2*m+2;idx=(idx+d+N)%N;calc();};
  // steps through the pieces by itself while on screen; the arrows or Pause hand control to the reader
  // both panes also turn slowly together; the arrows stop the stepping but not the turning
  const btn=$('#flat-play');let want=!RM,spin=!RM,vis=false,timer=0,run=0;
  const sync=()=>{const any=want||spin;btn.textContent=any?'Pause':'Play';btn.setAttribute('aria-pressed',any?'true':'false');
    clearInterval(timer);timer=0;if(want&&vis)timer=setInterval(()=>go(1),1700);
    const id=++run;if(!(spin&&vis))return;let last=performance.now();
    const tick=ts=>{if(id!==run)return;const d=Math.min(50,ts-last)*.00035;last=ts;calc.fs.forEach(f=>{f.yaw+=d;f.dirty=true;});requestAnimationFrame(tick);};
    requestAnimationFrame(tick);};
  const hold=()=>{if(want){want=false;sync();}};
  btn.addEventListener('click',()=>{want=spin=!(want||spin);sync();});
  new IntersectionObserver(es=>{vis=es[es.length-1].isIntersecting;sync();},{threshold:.3}).observe($('#flat'));
  $('#flat-prev').addEventListener('click',()=>{hold();go(-1);});$('#flat-next').addEventListener('click',()=>{hold();go(1);});
  seg([$('#flat-cube'),$('#flat-tess')],b=>{m=b.id=='flat-cube'?2:3;idx=Math.min(idx,2*m+1);calc();});
})();

// ---------- Pieces: pick one side, turn it to face the lamp ----------
(()=>{
  const D=5,out=$('#pieces-out'),nOut=$('#pieces-n'),inp=$('#pieces-t');let idx=2;
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
  const calc=duo($('#pieces'),{lab:['What lands on the table','What lands in our room'],flat:true,
    scene:u=>{const A=make(3,u),B=make(4,u);
      return{l:{P:A.V.map(p=>{const k=D/(D-1-p[2]);return[p[0]*k,p[1]*k];}),E:A.E,F:A.F,R:2.9,flat:true},
        r:{P:B.V.map(p=>{const k=D/(D-1-p[3]);return[p[0]*k,-p[1]*k,p[2]*k];}),E:B.E,F:B.F,R:3.5}};},
    out:u=>{let s;
      if(idx==0)s='This piece already faces the lamp, so its shadow is a big, perfect cube.';
      else if(u>.98)s='Now it faces the lamp and its shadow is a <b>perfect cube</b>. It was a cube the whole time.';
      else if(u>.02)s='Same piece, turning. Its shadow is changing. The piece is not.';
      else s=idx==1?'This piece is farthest from the lamp, so its shadow is a <b>small cube</b>. Turn it to face the lamp.'
        :'This piece is side-on to the lamp, so its shadow is a <b>slanted block</b>. Turn it to face the lamp.';
      if(idx>5)s+=' A cube has only six sides, so nothing is marked on the left.';
      out.innerHTML=s;}});
  const go=d=>{idx=(idx+d+8)%8;inp.value=0;nOut.textContent='Piece '+(idx+1)+' of 8';calc();};
  $('#pieces-prev').addEventListener('click',()=>go(-1));$('#pieces-next').addEventListener('click',()=>go(1));
  player($('#pieces-play'),inp,{dur:3200});
})();

// ---------- Slice ----------
(()=>{
  // 2x2: the cube and its flat slice on top, the tesseract (as its shadow) and its solid slice below
  const el=$('#slice'),inp=$('#slice-t'),out=$('#slice-out'),cvs=el.querySelectorAll('.quad canvas'),S=[],D=5;
  const fs=[0,1,2,3].map(i=>mk(cvs[i],f=>paint(f,S[i])));[0,2,3].forEach(i=>orbit(fs[i]));
  const sh=p=>{const k=D/(D-1-p[3]);return[p[0]*k,-p[1]*k,p[2]*k];};
  const calc=()=>{const t=+inp.value,a=Math.abs(t);
    const A=cut(3,t),poly=A.X.length?ring2(A.X.map(x=>x.q)):[],cube=A.V.map(v=>[dot(v,A.B[0]),dot(v,A.nv),dot(v,A.B[1])]);
    S[0]={P:[...cube,...poly.map(q=>[q[0],A.L,q[1]])],E:cubeEdges(3),F:poly.length?[{i:poly.map((_,i)=>8+i),a:.22,s:true}]:[],R:1.95};
    S[1]={flat:true,P:poly,F:poly.length?[{i:poly.map((_,i)=>i),a:.14,s:true}]:[],R:1.75};
    const C=cut(4,t),P=[],F=[],T=C.V.map(sh),FT=[];
    cutCells(C).forEach(r=>{F.push({i:r.map((_,i)=>P.length+i),a:.07,s:true});FT.push({i:r.map((_,i)=>T.length+i),a:.1,s:true});r.forEach(q=>{P.push(q);T.push(sh(q.p));});});
    S[2]={P:T,E:cubeEdges(4),F:FT,R:3.5};
    S[3]={P,F,R:2.25};
    out.innerHTML=a>=1?(t<0?'Not here yet.':'Gone.')
      :'They see <b>'+(a>1/3?'a triangle':'a hexagon')+'</b>. We see <b>'+(a<.025?'an octahedron':a>.5?'a tetrahedron':'a tetrahedron with its corners cut off')+'</b>.';
    fs.forEach(f=>f.dirty=true);};
  inp.addEventListener('input',calc);calc();
  player($('#slice-play'),inp,{dur:7000});
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
  const el=$('#six'),info=$('#six-info'),tabs=$('#six-tabs'),playBtn=$('#six-play'),cache={};
  let P,mode='cell',play=!RM,A=.7,B=.35,last=0,hi=[],shared=null;
  const f=mk($('canvas',el),(f,ts)=>{
    if(play){const dt=Math.min(50,ts-(last||ts));A+=dt*.00022;B+=dt*.00009;}last=ts;
    const ca=Math.cos(A),sa=Math.sin(A),cb=Math.cos(B),sb=Math.sin(B);
    shadow4(f,P,v=>[v[0]*ca-v[3]*sa,v[1]*cb-v[2]*sb,v[1]*sb+v[2]*cb,v[0]*sa+v[3]*ca],hi,shared);
  },{R:1.6,yaw:.4,pitch:.3,anim:play});
  orbit(f);
  function mark(){hi=[];shared=null;
    if(mode=='cell'){const S=new Set(P.cells[0]);for(const e of P.E)if(S.has(e[0])&&S.has(e[1]))hi.push([e[0],e[1],0]);}
    else{const e0=P.E[0];shared=e0;P.cells.filter(c=>c.includes(e0[0])&&c.includes(e0[1])).forEach((cl,g)=>{const S=new Set(cl);for(const e of P.E)if(e!==e0&&S.has(e[0])&&S.has(e[1]))hi.push([e[0],e[1],g]);});}
    f.dirty=true;}
  function show(d){P=cache[d.k]||(cache[d.k]=polytope(d.k));const n=d.n;
    info.innerHTML='<h3>'+d.name+' <code>'+d.sym+'</code></h3><p>'+n[3]+' '+d.cell+', '+d.r+' around each edge. '+d.like+'</p>'
      +'<dl><div><dt>Corners</dt><dd>'+n[0]+'</dd></div><div><dt>Edges</dt><dd>'+n[1]+'</dd></div><div><dt>Faces</dt><dd>'+n[2]+'</dd></div><div><dt>Cells</dt><dd>'+n[3]+'</dd></div></dl>';
    mark();}
  tabs.innerHTML=SIX.map((d,i)=>'<button class="btn" type="button" data-i="'+i+'" aria-pressed="'+(i==1)+'">'+d.name+'</button>').join('');
  seg([...tabs.querySelectorAll('button')],b=>show(SIX[+b.dataset.i]));
  seg([...$('#six-mode').querySelectorAll('button')],b=>{mode=b.dataset.m;mark();});
  const syncPlay=()=>{playBtn.textContent=play?'Pause':'Play';f.anim=play;last=0;};
  playBtn.addEventListener('click',()=>{play=!play;syncPlay();});syncPlay();
  show(SIX[1]);
})();

start();
