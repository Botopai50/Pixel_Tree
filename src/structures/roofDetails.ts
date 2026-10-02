import type {Architect} from './blueprint';
import type {RoofSurface,V3} from './types';

/** Fascias sit outside the slab faces. They attach to the roof so destruction
 * never leaves intact ornamental borders suspended around a missing roof.
 */
export function dressRoof(a:Architect,r:RoofSurface){
 const w=r.width/2,d=r.depth/2,e=r.eaves;
 const left=r.x-w-e,right=r.x+w+e,front=r.z-d-e,back=r.z+d+e;
 const ratio=r.ridgeRatio??.5,ridge=r.x-w+r.width*ratio;
 const beam=(from:V3,to:V3,role:string,section=.24)=>a.beam(from,to,section,r.material==='stone'?'stone':'wood',role,r.id);
 if(r.kind==='gable'||r.kind==='thatch'){
  const ly=r.y-r.rise*e/(r.width*ratio),ry=r.y-r.rise*e/(r.width*(1-ratio));
  for(const z of [front-.055,back+.055]){
   beam([left,ly-.055,z],[ridge,r.y+r.rise-.055,z],'roof-fascia');
   beam([ridge,r.y+r.rise-.055,z],[right,ry-.055,z],'roof-fascia');
  }
  beam([left-.035,ly-.055,front],[left-.035,ly-.055,back],'eave-fascia');
  beam([right+.035,ry-.055,front],[right+.035,ry-.055,back],'eave-fascia');
  beam([ridge,r.y+r.rise+.14,front-.12],[ridge,r.y+r.rise+.14,back+.12],'ridge-cap',.20);
 }else {
  const y=r.kind==='hip'?r.y-r.rise*e/Math.min(w,d):r.y;
  const ly=r.kind==='shed'?r.y-r.rise*e/(2*w):y;
  const ry=r.kind==='shed'?r.y+r.rise+r.rise*e/(2*w):y;
  for(const z of [front-.055,back+.055])beam([left,ly-.055,z],[right,ry-.055,z],'roof-fascia');
  beam([left-.035,ly-.055,front],[left-.035,ly-.055,back],'eave-fascia');
  beam([right+.035,ry-.055,front],[right+.035,ry-.055,back],'eave-fascia');
  if(r.kind==='hip'&&Math.abs(w-d)>.1){
   if(d>w)beam([r.x,r.y+r.rise+.14,r.z-d+w],[r.x,r.y+r.rise+.14,r.z+d-w],'ridge-cap',.20);
   else beam([r.x-w+d,r.y+r.rise+.14,r.z],[r.x+w-d,r.y+r.rise+.14,r.z],'ridge-cap',.20);
  }
 }
}
