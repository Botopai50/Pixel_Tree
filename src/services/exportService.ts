import * as THREE from 'three';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

export function exportTreeAsOBJ(treeGroup: THREE.Group, filename = 'zelda_botw_tree.obj') {
  const exporter = new OBJExporter();
  const result = exporter.parse(treeGroup);
  
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
