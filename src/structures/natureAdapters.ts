import * as THREE from 'three';
import {TREE_PRESETS} from '../constants/presets';
import {ROCK_BIOMES} from '../constants/rockBiomes';
import {createGroundProps} from '../services/groundPropGenerator';
import {createProceduralRock} from '../services/rockGenerator';
import {runSpaceColonization,buildFullTreeGeometry} from '../services/spaceColonization';
import {buildPixelSaplingLeafPixels} from '../services/pixelArtTextureSystem';
import type {TreeConfig} from '../types';
import type {StructureConfig,PieceSpec} from './types';
import type {StructureResources} from './materials';

/** Original generator keeps ownership of detached asset and its unused presentation resources. */
export function natureAsset(kind:'flowers'|'leaves'|'rock',c:StructureConfig,seed:number) {
 const original=Object.values(TREE_PRESETS).find(p=>kind==='rock'?p.rock?.biome===c.biome&&!p.rock.gravel&&!p.rock.ore:p.prop?.kind===kind&&p.prop.biome===c.biome)!;
 const config:TreeConfig={...original,seed};
 if(kind==='rock')config.rock={...original.rock!,width:.65,height:.45,depth:.55,count:1,mushrooms:false,ore:undefined,gravel:false,moss:c.vegetation*.5,snow:c.snow};
 else config.prop={...original.prop!,count:1,size:kind==='flowers'?.4:.55,spread:.15,density:.2};
 const instance=kind==='rock'?createProceduralRock(config):createGroundProps(config);
 const group=instance.group.getObjectByName('RockAsset') as THREE.Group;
 group.removeFromParent();let disposed=false;
 return {group,update:instance.update,dispose:()=>{if(disposed)return;disposed=true;instance.dispose();}};
}

/** Uses the existing branching algorithm and leaf silhouettes without a second presentation island. */
export function livingTree(p:PieceSpec,c:StructureConfig,seed:number,resources:StructureResources,wood:THREE.Material) {
 const original=TREE_PRESETS.hyrule_oak;
 const config:TreeConfig={...original,seed,trunkHeight:p.size[1],trunkRadiusBase:Math.max(.28,p.size[0]*.065),trunkRadiusTop:.17,trunkCurvature:0,branchStartHeight:.75,canopySpread:p.size[0]*.6,scaAttractorCount:160,scaCrownShape:'dome',scaStepSize:.25};
 const data=runSpaceColonization(config),group=new THREE.Group();group.name='LivingTree';group.position.set(...p.position);
 const trunkGeometry=buildFullTreeGeometry(data.rootNode,8,1,.15);resources.geometries.add(trunkGeometry);
 const trunk=new THREE.Mesh(trunkGeometry,wood);trunk.name='TreeSupportTrunk';trunk.castShadow=trunk.receiveShadow=true;group.add(trunk);
 const leaf=buildPixelSaplingLeafPixels(config),pixels=new Uint8Array(leaf.pixels),color=new THREE.Color(ROCK_BIOMES[c.biome].grass).convertLinearToSRGB();
 for(let i=0;i<pixels.length;i+=4){const tone=pixels[i]/255;pixels[i]=Math.round(color.r*255*(.55+tone*.45));pixels[i+1]=Math.round(color.g*255*(.55+tone*.45));pixels[i+2]=Math.round(color.b*255*(.55+tone*.45));}
 const texture=new THREE.DataTexture(pixels,leaf.width,leaf.height);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;resources.textures.add(texture);
 const mat=new THREE.MeshStandardMaterial({map:texture,alphaTest:.5,side:THREE.DoubleSide,roughness:1});resources.materials.add(mat);
 const geo=new THREE.PlaneGeometry(1.4,2.1);resources.geometries.add(geo);
 const anchors=data.foliageClusters.length?data.foliageClusters.map(x=>x.position):data.leafNodes.map(x=>x.position);
 const count=Math.min(420,Math.max(120,anchors.length*6)),cards=new THREE.InstancedMesh(geo,mat,count),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(1,1,1);cards.name='TreeSupportLeaves';resources.instances.add(cards);
 let state=(seed>>>0)+31;const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 for(let i=0;i<count;i++){const anchor=(anchors[i%Math.max(1,anchors.length)]??new THREE.Vector3(0,p.size[1],0)).clone();anchor.add(new THREE.Vector3((rnd()-.5)*2,(rnd()-.5)*1.8,(rnd()-.5)*2));q.setFromEuler(new THREE.Euler((rnd()-.5)*2,rnd()*Math.PI*2,(rnd()-.5)));matrix.compose(anchor,q,s);cards.setMatrixAt(i,matrix);}
 cards.castShadow=cards.receiveShadow=true;group.add(cards);return group;
}
