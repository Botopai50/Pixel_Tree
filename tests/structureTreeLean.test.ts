import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {bendLivingTree,treeLeanOffset} from '../src/structures/treeLean';

test('progressive tree lean preserves roots and moves native wood and leaf anchors together',()=>{
 const group=new THREE.Group();group.position.set(3,0,-2);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,2,0,0,8,0],3));
 const wood=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());group.add(wood);
 const leaves=new THREE.InstancedMesh(new THREE.PlaneGeometry(.3,.3),new THREE.MeshBasicMaterial(),1);
 leaves.setMatrixAt(0,new THREE.Matrix4().makeTranslation(0,8,0));group.add(leaves);
 const lean={direction:[-1,0] as [number,number],start:2,slope:.65};bendLivingTree(group,lean);
 assert.equal(geometry.attributes.position.getX(0),0);assert.equal(geometry.attributes.position.getX(1),0);
 assert.ok(geometry.attributes.position.getX(2)<-3);
 const matrix=new THREE.Matrix4();leaves.getMatrixAt(0,matrix);
 const at=new THREE.Vector3().setFromMatrixPosition(matrix);
 assert.ok(Math.abs(at.x-geometry.attributes.position.getX(2))<1e-6);assert.equal(at.y,8);
 assert.ok(treeLeanOffset(8,lean).length()>treeLeanOffset(4,lean).length());
 geometry.dispose();wood.material.dispose();leaves.geometry.dispose();leaves.material.dispose();leaves.dispose();
});
