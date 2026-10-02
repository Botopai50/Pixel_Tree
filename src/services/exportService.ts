import * as THREE from 'three';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

/** Snapshot only when filtering, restoring a cutaway or expanding instances is needed. */
export function geometryExportGroup(group: THREE.Group): THREE.Group {
 let needsSnapshot=false;
 group.traverse(object=>{if(object.userData.excludeFromOBJ||object.userData.cutawayPart||object instanceof THREE.InstancedMesh)needsSnapshot=true;});
 if(!needsSnapshot)return group;
 const snapshot=group.clone(true),excluded:THREE.Object3D[]=[],instances:THREE.InstancedMesh[]=[];
 snapshot.traverse(object=>{if(object.userData.excludeFromOBJ)excluded.push(object);if(object.userData.cutawayPart)object.visible=true;if(object instanceof THREE.InstancedMesh)instances.push(object);});
 excluded.forEach(object=>object.removeFromParent());
 for(const instance of instances){if(!instance.parent)continue;const parent=instance.parent;for(let i=0;i<instance.count;i++){const transform=new THREE.Matrix4();instance.getMatrixAt(i,transform);const mesh=new THREE.Mesh(instance.geometry,instance.material);mesh.name=instance.name+'_'+i;mesh.matrixAutoUpdate=false;mesh.matrix.copy(instance.matrix).multiply(transform);parent.add(mesh);}instance.removeFromParent();}
 snapshot.updateMatrixWorld(true);return snapshot;
}

export function exportTreeAsOBJ(treeGroup: THREE.Group, filename = 'zelda_botw_tree.obj') {
  const exporter = new OBJExporter();
  const result = exporter.parse(geometryExportGroup(treeGroup));
  
  const blob = new Blob([result], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function captureCanvasScreenshot(canvas: HTMLCanvasElement, filename = 'zelda_botw_tree.png') {
  const image = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = image;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
