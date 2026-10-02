import * as THREE from 'three';
import type {RoofSurface,V3} from '../types';
import {merge} from './common';
import {paintUV} from './paintUV';

/** Closed slab for a triangle or quad; collapsed ridge points are removed. */
const edgeKey=(a:V3,b:V3)=>[a.map(v=>v.toFixed(5)).join(','),b.map(v=>v.toFixed(5)).join(',')].sort().join('|');
function slab(points:V3[],exposed?:Set<string>) {
 const unique=points.filter((p,i)=>i===0||new THREE.Vector3(...p).distanceToSquared(new THREE.Vector3(...points[i-1]))>1e-10);
 if(unique.length>2&&new THREE.Vector3(...unique[0]).distanceToSquared(new THREE.Vector3(...unique.at(-1)!))<1e-10)unique.pop();
 const vectors=unique.map(p=>new THREE.Vector3(...p));
 let normal=vectors[1].clone().sub(vectors[0]).cross(vectors[2].clone().sub(vectors[0])).normalize();
 if(normal.y<0){unique.reverse();vectors.reverse();normal.negate();}
 const n=unique.length,vertices=[...vectors,...vectors.map(p=>p.clone().addScaledVector(normal,.12))],positions:number[]=[];
 const tri=(i:number,j:number,k:number)=>{const a=vertices[i],b=vertices[j],c=vertices[k];if(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()>1e-16)positions.push(...a.toArray(),...b.toArray(),...c.toArray());};
 for(let i=1;i<n-1;i++){tri(0,i+1,i);tri(n,n+i,n+i+1);}
 for(let i=0;i<n;i++){const next=(i+1)%n;if(exposed&&!exposed.has(edgeKey(unique[i],unique[next])))continue;tri(i,next,n+next);tri(i,n+next,n+i);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(Array(positions.length/3*2).fill(0),2));g.computeVertexNormals();return g;
}
function brokenFacet(points:V3[],damage:number,id:string) {
 if(damage<=.08)return slab(points);
 const triangles=points.length===3?[points]:[[points[0],points[1],points[2]],[points[0],points[2],points[3]]];
 const kept:V3[][]=[];let phase=0;for(const letter of id)phase+=letter.charCodeAt(0)*.07;
 const cuts=5;
 for(const triangle of triangles){const [a,b,c]=triangle.map(p=>new THREE.Vector3(...p));
  const point=(i:number,j:number)=>a.clone().addScaledVector(b.clone().sub(a),i/cuts).addScaledVector(c.clone().sub(a),j/cuts).toArray() as V3;
  const emit=(t:V3[])=>{const center=new THREE.Vector3();t.forEach(p=>center.add(new THREE.Vector3(...p)));center.divideScalar(3);const field=(Math.sin(center.x*1.2+phase)+Math.cos(center.z*.9-phase)+2)/4;if(field>damage*.95)kept.push(t);};
  for(let i=0;i<cuts;i++)for(let j=0;j<cuts-i;j++){emit([point(i,j),point(i+1,j),point(i,j+1)]);if(j<cuts-i-1)emit([point(i+1,j),point(i+1,j+1),point(i,j+1)]);}
 }
 const counts=new Map<string,number>();for(const t of kept)for(let i=0;i<3;i++){const key=edgeKey(t[i],t[(i+1)%3]);counts.set(key,(counts.get(key)??0)+1);}
 const exposed=new Set([...counts].filter(([,count])=>count===1).map(([key])=>key));
 return kept.length?merge(kept.map(t=>slab(t,exposed))):new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([],3));
}
export function buildRoof(r:RoofSurface) {
 const {x,z,y,rise,eaves:e}=r,w=r.width/2,d=r.depth/2,left=x-w-e,right=x+w+e,front=z-d-e,back=z+d+e,low=y-rise*e/Math.max(w,.1);
 let facets:V3[][];
 if(r.kind==='flat')facets=[[[left,y,front],[right,y,front],[right,y,back],[left,y,back]]];
 else if(r.kind==='shed')facets=[[[left,y-rise*e/(2*w),front],[right,y+rise+rise*e/(2*w),front],[right,y+rise+rise*e/(2*w),back],[left,y-rise*e/(2*w),back]]];
 else if(r.kind==='hip'){
 const hipLow=y-rise*e/Math.min(w,d);
 if(d>=w){const rf=z-(d-w),rb=z+(d-w);facets=[[[left,hipLow,front],[x,y+rise,rf],[x,y+rise,rb],[left,hipLow,back]],[[x,y+rise,rf],[right,hipLow,front],[right,hipLow,back],[x,y+rise,rb]],[[left,hipLow,front],[right,hipLow,front],[x,y+rise,rf]],[[right,hipLow,back],[left,hipLow,back],[x,y+rise,rb]]];}
 else {const rl=x-(w-d),rr=x+(w-d);facets=[[[left,hipLow,front],[right,hipLow,front],[rr,y+rise,z],[rl,y+rise,z]],[[right,hipLow,back],[left,hipLow,back],[rl,y+rise,z],[rr,y+rise,z]],[[left,hipLow,back],[left,hipLow,front],[rl,y+rise,z]],[[right,hipLow,front],[right,hipLow,back],[rr,y+rise,z]]];}
 facets=facets.map(points=>points.filter((p,i)=>!points.slice(0,i).some(other=>p.every((v,j)=>v===other[j]))));
 }else {const ratio=r.ridgeRatio??.5,ridge=x-w+r.width*ratio,leftY=y-rise*e/(r.width*ratio),rightY=y-rise*e/(r.width*(1-ratio));facets=[[[left,leftY,front],[ridge,y+rise,front],[ridge,y+rise,back],[left,leftY,back]],[[ridge,y+rise,front],[right,rightY,front],[right,rightY,back],[ridge,y+rise,back]]];}
 return paintUV(merge(facets.map((points,i)=>brokenFacet(points,r.damage??0,r.id+'_'+i))));
}
