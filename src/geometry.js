// Pure geometry: cubes in any dimension, their nets and slices, and the six regular 4D polytopes.
const dot=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s;};
const PHI=(1+Math.sqrt(5))/2;
// corners of the m-cube as ±1 vectors; corner i has bit j set when coordinate j is +1
function corners(m){const o=[];for(let i=0;i<1<<m;i++){const c=[];for(let j=0;j<m;j++)c.push(i>>j&1?1:-1);o.push(c);}return o;}
function cubeEdges(m){const e=[];for(let i=0;i<1<<m;i++)for(let j=0;j<m;j++)if(!(i>>j&1))e.push([i,i|1<<j]);return e;}
function quads(m){if(m==2)return[[0,1,3,2]];const q=[];for(let j=0;j<3;j++){const a=(j+1)%3,b=(j+2)%3;for(const t of[0,1<<j])q.push([t,t|1<<a,t|1<<a|1<<b,t|1<<b]);}return q;}
// net of the (m+1)-cube: 2m+2 pieces of dimension m, hinged; last coordinate is height above the net
function net(m,th){
  const cs=corners(m),ce=cubeEdges(m),P=[],E=[],c=Math.cos(th),s=Math.sin(th),c2=Math.cos(2*th),s2=Math.sin(2*th);
  const add=(fn,cls)=>{const o=P.length;cs.forEach(v=>P.push(fn(v)));ce.forEach(e=>E.push([o+e[0],o+e[1],cls]));return o;};
  add(v=>[...v,0],0);
  for(let a=0;a<m;a++)for(const sg of[1,-1])add(v=>{const d=v[a]+1,p=v.slice();p[a]=sg*(1+d*c);p.push(d*s);return p;},0);
  const lid=add(v=>{const u=v[1]+1,p=v.slice();p[1]=1+2*c+u*c2;p.push(2*s+u*s2);return p;},1);
  return{P,E,lid};
}
function basis(nv){const n=nv.length,B=[];for(let i=0;i<n&&B.length<n-1;i++){let v=Array(n).fill(0);v[i]=1;for(const b of[nv,...B]){const d=dot(v,b);v=v.map((x,k)=>x-d*b[k]);}const L=Math.hypot(...v);if(L>1e-6)B.push(v.map(x=>x/L));}return B;}
// cut the n-cube corner first with the hyperplane nv·x = L; returns crossing points in hyperplane coordinates
function cut(n,t){
  const nv=Array(n).fill(1/Math.sqrt(n)),B=basis(nv),V=corners(n),L=t*Math.sqrt(n)+1e-7,d=V.map(v=>dot(v,nv)-L),X=[];
  for(const e of cubeEdges(n))if(d[e[0]]*d[e[1]]<0){const u=d[e[0]]/(d[e[0]]-d[e[1]]),p=V[e[0]].map((x,i)=>x+(V[e[1]][i]-x)*u);X.push({e,q:Object.assign(B.map(b=>dot(p,b)),{p})});}
  return{nv,B,V,L,X};
}
function ring2(pts){const c=[0,1].map(i=>pts.reduce((s,p)=>s+p[i],0)/pts.length);return pts.slice().sort((a,b)=>Math.atan2(a[1]-c[1],a[0]-c[0])-Math.atan2(b[1]-c[1],b[0]-c[0]));}
function ring3(pts,nrm){const c=[0,1,2].map(i=>pts.reduce((s,p)=>s+p[i],0)/pts.length),u=pts[0].map((x,i)=>x-c[i]),
  w=[nrm[1]*u[2]-nrm[2]*u[1],nrm[2]*u[0]-nrm[0]*u[2],nrm[0]*u[1]-nrm[1]*u[0]],ang=p=>{const r=p.map((x,i)=>x-c[i]);return Math.atan2(dot(r,w),dot(r,u));};
  return pts.slice().sort((a,b)=>ang(a)-ang(b));}
function cutCells(S){const out=[];for(let k=0;k<4;k++)for(const sg of[1,-1]){const pts=S.X.filter(x=>S.V[x.e[0]][k]==sg&&S.V[x.e[1]][k]==sg).map(x=>x.q);if(pts.length>=3)out.push(ring3(pts,S.B.map(b=>b[k])));}return out;}
// regular polytopes from coordinates
const PERM=(()=>{const r=[];const go=(a,rest)=>{if(!rest.length){let inv=0;for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)if(a[i]>a[j])inv++;r.push([a,inv%2==0]);return;}rest.forEach((x,i)=>go([...a,x],rest.filter((_,j)=>j!=i)));};go([],[0,1,2,3]);return r;})();
function orbitPts(base,even){const seen=new Map();for(const[p,ev]of PERM){if(even&&!ev)continue;const v=p.map(i=>base[i]),nz=[];v.forEach((x,i)=>{if(x)nz.push(i)});
  for(let m=0;m<1<<nz.length;m++){const w=v.slice();nz.forEach((i,k)=>{if(m>>k&1)w[i]=-w[i]});seen.set(w.map(x=>x.toFixed(5)).join(),w);}}return[...seen.values()];}
function build(V){const n=V.length,r=Math.hypot(...V[0]);V=V.map(v=>v.map(x=>x/r));const d2=(a,b)=>{let s=0;for(let i=0;i<4;i++)s+=(a[i]-b[i])**2;return s;};
  let mn=1e9;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const d=d2(V[i],V[j]);if(d<mn)mn=d;}
  const E=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(d2(V[i],V[j])<mn*1.02)E.push([i,j]);return{V,E};}
function cellsOf(V,dirs){return dirs.map(d=>{const ds=V.map(v=>dot(v,d)),m=Math.max(...ds),o=[];ds.forEach((x,i)=>{if(x>m-1e-6)o.push(i)});return o;});}
let _raw;
function raw(){if(_raw)return _raw;const f=PHI,q=1/Math.sqrt(5);
  const v600=[...orbitPts([1,0,0,0]),...orbitPts([.5,.5,.5,.5]),...orbitPts([f/2,.5,1/(2*f),0],true)];
  // the 120-cell is the dual: one vertex at the centre of each of the 600 tetrahedra
  const E6=build(v600).E,nb=v600.map(()=>new Set()),v120=[];E6.forEach(e=>{nb[e[0]].add(e[1]);nb[e[1]].add(e[0]);});
  for(const[i,j]of E6)for(const k of nb[i])if(k>j&&nb[j].has(k))for(const l of nb[i])if(l>k&&nb[j].has(l)&&nb[k].has(l))v120.push(v600[i].map((x,a)=>x+v600[j][a]+v600[k][a]+v600[l][a]));
  const v5=[[1,1,1,-q],[1,-1,-1,-q],[-1,1,-1,-q],[-1,-1,1,-q],[0,0,0,4*q]];
  const v8=orbitPts([1,1,1,1]),v16=orbitPts([1,0,0,0]),v24=orbitPts([1,1,0,0]);
  return _raw={5:[v5,v5.map(v=>v.map(x=>-x))],8:[v8,v16],16:[v16,v8],24:[v24,[...v16,...v8]],120:[v120,v600],600:[v600,v120]};}
function polytope(k){const[v,d]=raw()[k],P=build(v);P.cells=cellsOf(P.V,d);return P;}
// the 2D faces of a 4D polytope: wherever two cells share three or more corners, walked into a ring along the edges
function faces(P){const nb=P.V.map(()=>new Set()),at=P.V.map(()=>[]),F=[];P.E.forEach(e=>{nb[e[0]].add(e[1]);nb[e[1]].add(e[0]);});
  P.cells.forEach((c,i)=>c.forEach(v=>at[v].push(i)));
  P.cells.forEach((c,i)=>{const sh=new Map();for(const v of c)for(const j of at[v])if(j>i){if(!sh.has(j))sh.set(j,[]);sh.get(j).push(v);}
    for(const s of sh.values())if(s.length>2){const r=[s[0]];for(let p=-1,v=s[0];r.length<s.length;){const n=s.find(x=>x!=p&&nb[v].has(x));r.push(n);p=v;v=n;}F.push(r);}});
  return F;}
// the five Platonic solids by Schläfli symbol; each face is a ring of vertex indices, found from the dual's corners
const signs=v=>{let o=[[]];for(const x of v)o=o.flatMap(p=>x?[[...p,x],[...p,-x]]:[[...p,0]]);return o;};
const cyc=v=>[0,1,2].flatMap(s=>signs([v[s],v[(s+1)%3],v[(s+2)%3]]));
function solid(k){const vT=[[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]],vC=signs([1,1,1]),vO=cyc([1,0,0]),vI=cyc([0,1,PHI]),vD=[...vC,...cyc([0,1/PHI,PHI])];
  const[v,d]={'3,3':[vT,vT.map(p=>p.map(x=>-x))],'4,3':[vC,vO],'3,4':[vO,vC],'5,3':[vD,cyc([0,PHI,1])],'3,5':[vI,[...vC,...cyc([0,PHI,1/PHI])]]}[k],P=build(v.map(p=>[...p,0])),V=P.V.map(p=>p.slice(0,3));
  const F=cellsOf(V,d).map((idx,j)=>{const n=d[j],c=[0,1,2].map(i=>idx.reduce((s,a)=>s+V[a][i],0)/idx.length),r=a=>V[a].map((x,i)=>x-c[i]),u=r(idx[0]),
    w=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]],ang=a=>Math.atan2(dot(r(a),w),dot(r(a),u));return idx.slice().sort((a,b)=>ang(a)-ang(b));});
  return{V,E:P.E,F};}

// a net: the pieces (corner lists) as a tree from piece 0, each hinged to its parent on the k or more corners they share
// a points from the hinge into the piece, b is the way it swings to lie flat beside its parent, th is how far it swings
function hinge(V,pieces,E,k){
  const n=V[0].length,N=V.length,cen=ids=>{const c=Array(n).fill(0);for(const i of ids)for(let d=0;d<n;d++)c[d]+=V[i][d]/ids.length;return c;},
    unit=v=>{const L=Math.hypot(...v);return v.map(x=>x/L);},at=V.map(()=>[]),ES=new Set(E.map(e=>e[0]*N+e[1])),
    node=(i,o)=>{const v=pieces[i],e=[];v.forEach((x,a)=>v.forEach((y,b)=>{if(ES.has(x*N+y))e.push([a,b]);}));return Object.assign({i,v,E:e},o);};
  pieces.forEach((p,i)=>p.forEach(v=>at[v].push(i)));
  const C=pieces.map(cen),T=[node(0,{par:-1,dep:0})],seen=new Set([0]);
  for(let q=0;q<T.length;q++){const P=T[q],sh=new Map();
    for(const v of P.v)for(const j of at[v])if(!seen.has(j)){if(!sh.has(j))sh.set(j,[]);sh.get(j).push(v);}
    for(const[j,s]of sh)if(s.length>=k){seen.add(j);const h=cen(s),a=unit(C[j].map((x,d)=>x-h[d])),p=unit(C[P.i].map((x,d)=>x-h[d])),ap=dot(a,p);
      T.push(node(j,{par:q,dep:P.dep+1,h,a,b:unit(p.map((x,d)=>ap*a[d]-x)),th:Math.PI-Math.acos(ap)}));}}
  T.V=V;return T;}
// where the corners of every piece of a net are: u folds it from flat (0) to closed (1)
function fold(T,u){const V=T.V,n=V[0].length,I=V[0].map((_,i)=>V[0].map((_,j)=>+(i==j))),lin=(R,v)=>I.map((_,d)=>{let s=0;for(let k=0;k<n;k++)s+=v[k]*R[k][d];return s;});
  return T.map((N,q)=>{
    if(!q){N.R=I;N.t=Array(n).fill(0);return N.v.map(i=>V[i]);}
    const P=T[N.par],{a,b,h}=N,ph=(1-u)*N.th,c=Math.cos(ph)-1,s=Math.sin(ph),rot=v=>{const x=dot(a,v),y=dot(b,v);return v.map((z,d)=>z+c*(a[d]*x+b[d]*y)+s*(b[d]*x-a[d]*y));},rh=rot(h);
    N.R=I.map(e=>lin(P.R,rot(e)));N.t=lin(P.R,h.map((z,d)=>z-rh[d])).map((z,d)=>z+P.t[d]);
    return N.v.map(i=>lin(N.R,V[i]).map((z,d)=>z+N.t[d]));});}

export{dot,corners,cubeEdges,quads,net,cut,ring2,cutCells,polytope,faces,solid,hinge,fold};
