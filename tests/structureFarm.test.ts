import './treeCanvasFixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fixture} from './structureFixtures';
import {buildStructurePlan} from '../src/structures/plan';
import {createStructure} from '../src/structures/generator';
import {validateStructurePlan} from '../src/structures/validation';
import {cabbageGeometry,carrotFoliageGeometry,leafyCropGeometry,cultivatedSoilTexture,vegetableLeafTexture,vegetableLeafGeometry} from '../src/structures/geometry/vegetables';

test('farm groups a plaster farmhouse, wooden barn and three planted beds behind a working gate',()=>{
 for(const seed of [1,42,91])for(const size of [6,14,24]){
  const input=fixture('farm',seed,{width:size,depth:size*.85}),plan=buildStructurePlan(input);
  assert.deepEqual(validateStructurePlan(plan),[]);assert.deepEqual(plan,buildStructurePlan(input));
  const home=plan.volumes.find(v=>v.role==='farmhouse')!,barn=plan.volumes.find(v=>v.role==='farm-barn')!;
  assert.ok(home.x>barn.x);assert.ok(home.height>barn.height);
  assert.ok(plan.walls.filter(w=>w.volume===home.id).every(w=>w.material==='plaster'));
  assert.ok(plan.walls.filter(w=>w.volume===barn.id).every(w=>w.material==='wood'));
  assert.equal(plan.roofs.length,2);assert.ok(plan.roofs.every(r=>r.kind==='thatch'));
  const beds=plan.pieces.filter(p=>p.role==='farm-crop-soil');assert.equal(beds.length,3);
  assert.ok(beds.every(p=>p.position[2]+p.size[2]/2<barn.z-barn.depth/2));
  for(const role of ['farm-cabbage','farm-carrot-leaves','farm-carrot-root','farm-leafy-crop'])assert.ok(plan.pieces.some(p=>p.role===role));
  assert.equal(plan.pieces.filter(p=>p.role==='farm-barn-door').length,2);
  const gate=plan.pieces.find(p=>p.role==='farm-gate')!;
  assert.ok(!plan.pieces.filter(p=>p.role==='farm-fence-rail'&&p.position[2]===gate.position[2]&&p.end?.[2]===gate.position[2]).some(p=>p.position[0]<gate.position[0]&&p.end![0]>gate.position[0]),'fence rails must stop at the gate');
  assert.equal(plan.pieces.find(p=>p.role==='veranda')!.material,'stone');
 }
});

test('farm crops have pixel leaf maps, finite meshes and release all resources once',()=>{
 const asset=createStructure(fixture('farm',42,{vegetation:.3})),disposed=new Map<object,number>();let leaves=false;
 asset.group.traverse(o=>{if(o instanceof THREE.Mesh){
  const pos=o.geometry.getAttribute('position');for(let i=0;i<pos.count;i++)assert.ok(Number.isFinite(pos.getX(i)+pos.getY(i)+pos.getZ(i)));
  const materials=Array.isArray(o.material)?o.material:[o.material];
  for(const m of materials)if((m as THREE.MeshStandardMaterial).side===THREE.DoubleSide&&(m as THREE.MeshStandardMaterial).map){leaves=true;assert.equal((m as THREE.MeshStandardMaterial).map!.magFilter,THREE.NearestFilter);}
  for(const resource of [o.geometry,...materials])if(!disposed.has(resource)){disposed.set(resource,0);resource.addEventListener('dispose',()=>disposed.set(resource,disposed.get(resource)!+1));}
 }});
 assert.ok(leaves);asset.dispose();asset.dispose();assert.ok([...disposed.values()].every(n=>n===1));
});

test('cabbage, carrot and leafy crops have distinct proportions with usable curved-leaf UVs',()=>{
 const cabbage=cabbageGeometry(),carrot=carrotFoliageGeometry(),leafy=leafyCropGeometry();
 const sizes=[cabbage,carrot,leafy].map(g=>{g.computeBoundingBox();return g.boundingBox!.getSize(new THREE.Vector3());});
 assert.ok(sizes[0].x>sizes[0].y*1.3,'a cabbage should be a broad rounded head');
 assert.ok(sizes[1].y>sizes[1].x,'carrot branches should grow upward');
 assert.ok(sizes[2].x>sizes[2].y*1.4,'the leafy crop should spread into a rosette');
 for(const g of [cabbage,carrot,leafy]){
  const uv=g.getAttribute('uv'),pos=g.getAttribute('position');assert.equal(uv.count,pos.count);
  for(let i=0;i<uv.count;i++)assert.ok(Number.isFinite(uv.getX(i)+uv.getY(i)));
  g.dispose();
 }
});

test('cultivated soil is dark brown and each vegetable has its own pixel palette',()=>{
 const soil=cultivatedSoilTexture(32,42),other=cultivatedSoilTexture(32,91),data=soil.image.data;
 let r=0,g=0,b=0;for(let i=0;i<data.length;i+=4){r+=data[i];g+=data[i+1];b+=data[i+2];}
 assert.ok(r>g&&g>b);assert.ok(r/(data.length/4)<110);assert.notDeepEqual(data,other.image.data);
 const maps=(['cabbage','carrot','leafy'] as const).map(kind=>vegetableLeafTexture(kind,32));
 assert.notDeepEqual(maps[0].image.data,maps[1].image.data);assert.notDeepEqual(maps[1].image.data,maps[2].image.data);
 for(const map of [soil,other,...maps]){assert.equal(map.magFilter,THREE.NearestFilter);map.dispose();}
});

test('vegetable leaf silhouettes follow whole pixel steps without diagonal outline cuts',()=>{
 for(const [cup,lobed] of [[false,false],[true,false],[false,true]]){
  const g=vegetableLeafGeometry(.25,.70,cup,lobed),index=g.index!,uv=g.getAttribute('uv'),edges=new Map<string,{a:number;b:number;count:number}>();
  for(let i=0;i<index.count;i+=3)for(let j=0;j<3;j++){
   const a=index.getX(i+j),b=index.getX(i+(j+1)%3),key=[a,b].sort((x,y)=>x-y).join(':');
   const existing=edges.get(key);if(existing)existing.count++;else edges.set(key,{a,b,count:1});
  }
  let steps=0;
  for(const {a,b,count} of edges.values())if(count===1){
   assert.ok(uv.getX(a)===uv.getX(b)||uv.getY(a)===uv.getY(b),'the outline must follow horizontal or vertical texel edges');
   if(uv.getY(a)===uv.getY(b))steps++;
  }
  assert.ok(steps>6,'the curved silhouette must contain a visible stepped fringe');g.dispose();
 }
});
