import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TreeConfig, EnvironmentConfig } from '../types';
import { createTree, TreeInstance } from '../services/treeGenerator';
import { LeafParticleSystem } from '../services/particleSystem';

export interface Viewport3DHandle {
  exportOBJ: () => void;
  takeScreenshot: () => void;
  resetCamera: () => void;
  focusCanopy: () => void;
  focusTrunk: () => void;
}

// The camera's vertical field of view. On a wide screen it is a fixed 42
// degrees; on a portrait phone that leaves a slice too narrow for a crown, so
// the view is widened until it spans as much sideways as a square screen would
// (capped, so it does not turn fish-eyed).
const BASE_FOV = 42;
function fovForAspect(aspect: number): number {
  if (aspect >= 1) return BASE_FOV;
  const halfTan = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) / aspect;
  return Math.min(68, THREE.MathUtils.radToDeg(Math.atan(halfTan)) * 2);
}
// ...and past that cap, a tall narrow screen frames the tree from further back.
function portraitDistanceScale(aspect: number): number {
  return aspect >= 1 ? 1 : Math.min(1.4, 1 / Math.sqrt(aspect * 1.4));
}

interface Viewport3DProps {
  treeConfig: TreeConfig;
  envConfig: EnvironmentConfig;
  onFpsUpdate?: (fps: number) => void;
  // share of the screen height covered from below by an overlay (0 = none)
  viewInsetBottom?: number;
}

export const Viewport3D = forwardRef<Viewport3DHandle, Viewport3DProps>(
  ({ treeConfig, envConfig, onFpsUpdate, viewInsetBottom = 0 }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const viewInsetRef = useRef(viewInsetBottom);

    // Zooms the picture out to the height left uncovered and shifts the
    // rendered window down, so the whole tree sits in what is still visible
    // (a little below its middle: the toolbar covers the very top).
    const applyViewInset = () => {
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      if (!camera || !renderer) return;
      const inset = viewInsetRef.current;
      const size = renderer.getSize(new THREE.Vector2());
      camera.zoom = 1 - inset * 0.9;
      if (inset > 0 && size.x > 0 && size.y > 0) {
        camera.setViewOffset(size.x, size.y, 0, size.y * inset * 0.4, size.x, size.y);
      } else {
        camera.clearViewOffset();
      }
    };

    // Refs for active Three.js state
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const treeInstanceRef = useRef<TreeInstance | null>(null);
    const particleSystemRef = useRef<LeafParticleSystem | null>(null);
    const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
    const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);

    // -------------------------------------------------------------
    // SETUP SCENE & RENDERER ONCE
    // -------------------------------------------------------------
    useEffect(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(fovForAspect(width / height), width / height, 0.1, 100);
      camera.position.set(0, 6.5, 18).multiplyScalar(portraitDistanceScale(width / height));
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        preserveDrawingBuffer: true, // required for clean screenshot capture
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      rendererRef.current = renderer;

      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.target.set(0, 5, 0);
      controls.minDistance = 3.5;
      controls.maxDistance = 38;
      controls.maxPolarAngle = Math.PI / 2 - 0.02; // prevent going under the ground
      controlsRef.current = controls;

      // Lights
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
      hemiLight.position.set(0, 20, 0);
      scene.add(hemiLight);
      hemiLightRef.current = hemiLight;

      const dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
      dirLight.position.set(12, 22, 14);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 50;
      dirLight.shadow.camera.left = -12;
      dirLight.shadow.camera.right = 12;
      dirLight.shadow.camera.top = 16;
      dirLight.shadow.camera.bottom = -4;
      dirLight.shadow.bias = -0.0005;
      scene.add(dirLight);
      dirLightRef.current = dirLight;

      // Resize observer
      const resizeObserver = new ResizeObserver((entries) => {
        if (!entries[0]) return;
        const { width: newW, height: newH } = entries[0].contentRect;
        if (newW > 0 && newH > 0 && renderer && camera) {
          camera.aspect = newW / newH;
          camera.fov = fovForAspect(camera.aspect);
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
          applyViewInset();
        }
      });
      resizeObserver.observe(container);

      // Animation Loop
      let animationFrameId: number;
      let lastTime = performance.now();
      let frameCount = 0;
      let lastFpsTime = lastTime;

      const clock = new THREE.Clock();

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        const now = performance.now();
        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // FPS calculation
        frameCount++;
        if (now - lastFpsTime >= 1000) {
          if (onFpsUpdate) {
            onFpsUpdate(Math.round((frameCount * 1000) / (now - lastFpsTime)));
          }
          frameCount = 0;
          lastFpsTime = now;
        }

        // Auto-rotation turntable
        if (controlsRef.current) {
          controlsRef.current.autoRotate = envConfig.autoRotate;
          controlsRef.current.autoRotateSpeed = 1.2;
          controlsRef.current.update();
        }

        // Update Tree procedural vertex shader time & wind
        if (treeInstanceRef.current) {
          treeInstanceRef.current.update(elapsedTime);
        }

        // Update falling leaf particles
        if (particleSystemRef.current) {
          particleSystemRef.current.update(delta, treeConfig);
        }

        renderer.render(scene, camera);
      };

      animate();

      return () => {
        cancelAnimationFrame(animationFrameId);
        resizeObserver.disconnect();
        controls.dispose();
        renderer.dispose();
      };
    }, []);

    // -------------------------------------------------------------
    // UPDATE TREE WHEN CONFIG CHANGES
    // -------------------------------------------------------------
    useEffect(() => {
      const scene = sceneRef.current;
      if (!scene) return;

      // Cleanup old tree
      if (treeInstanceRef.current) {
        scene.remove(treeInstanceRef.current.group);
        treeInstanceRef.current.dispose();
        treeInstanceRef.current = null;
      }

      // Cleanup old particles
      if (particleSystemRef.current) {
        scene.remove(particleSystemRef.current.group);
        particleSystemRef.current.dispose();
        particleSystemRef.current = null;
      }

      // Generate new procedural tree
      const newTree = createTree(treeConfig);
      treeInstanceRef.current = newTree;
      scene.add(newTree.group);

      // Generate falling leaves particles
      if (treeConfig.showFallingLeaves && treeConfig.fallingLeafCount > 0) {
        const particles = new LeafParticleSystem(treeConfig);
        particleSystemRef.current = particles;
        scene.add(particles.group);
      }

      // Adjust controls target height and camera distance based on growth stage
      if (controlsRef.current && cameraRef.current) {
        const isFallen = treeConfig.growthStage === 'fallen' || treeConfig.species.endsWith('_fallen');
        const isSapling = treeConfig.growthStage === 'sapling' || treeConfig.species.endsWith('_sapling');
        const isShrub = treeConfig.growthStage === 'shrub';
        const isLog = treeConfig.growthStage === 'log';
        const isStump = isLog && treeConfig.species === 'tree_stump';
        const targetX = isFallen && treeConfig.showBrokenStump !== false ? (treeConfig.trunkHeight || 9.0) * 0.35 : 0;
        const targetY = isLog
          ? isStump ? Math.max(0.35, treeConfig.trunkHeight * 0.45) : Math.max(0.4, treeConfig.trunkRadiusBase * 0.9)
          : isFallen
          ? 0.65
          : isSapling || isShrub
          ? Math.max(0.45, treeConfig.trunkHeight * 0.5)
          : treeConfig.trunkHeight * 0.52;
        controlsRef.current.target.set(targetX, targetY, 0);

        if (isLog) {
          // logs lie low and long: frame the whole length from a little above
          controlsRef.current.minDistance = 1.2;
          const want = isStump ? 6 : Math.max(8, treeConfig.trunkHeight * 1.9);
          const currentDist = cameraRef.current.position.distanceTo(controlsRef.current.target);
          if (currentDist < want * 0.6 || currentDist > want * 1.6) {
            const dir = cameraRef.current.position.clone().sub(controlsRef.current.target).normalize();
            cameraRef.current.position.copy(controlsRef.current.target).addScaledVector(dir, want * portraitDistanceScale(cameraRef.current.aspect));
          }
        } else if (isShrub) {
          // a bush is a couple of metres across: frame it whole, a little closer
          // than a tree
          controlsRef.current.minDistance = 1.2;
          const currentDist = cameraRef.current.position.distanceTo(controlsRef.current.target);
          if (currentDist < 3.5 || currentDist > 9.0) {
            const dir = cameraRef.current.position.clone().sub(controlsRef.current.target).normalize();
            cameraRef.current.position.copy(controlsRef.current.target).addScaledVector(dir, 5.5 * portraitDistanceScale(cameraRef.current.aspect));
          }
        } else if (isFallen) {
          controlsRef.current.minDistance = 1.6;
          const currentDist = cameraRef.current.position.distanceTo(controlsRef.current.target);
          if (currentDist < 6.0 || currentDist > 14.0) {
            const dir = cameraRef.current.position.clone().sub(controlsRef.current.target).normalize();
            cameraRef.current.position.copy(controlsRef.current.target).addScaledVector(dir, 9.5 * portraitDistanceScale(cameraRef.current.aspect));
          }
        } else if (isSapling) {
          controlsRef.current.minDistance = 0.8;
          const currentDist = cameraRef.current.position.distanceTo(controlsRef.current.target);
          if (currentDist > 4.5) {
            const dir = cameraRef.current.position.clone().sub(controlsRef.current.target).normalize();
            cameraRef.current.position.copy(controlsRef.current.target).addScaledVector(dir, 3.4 * portraitDistanceScale(cameraRef.current.aspect));
          }
        } else {
          controlsRef.current.minDistance = 3.0;
          const currentDist = cameraRef.current.position.distanceTo(controlsRef.current.target);
          if (currentDist < 6.5) {
            const dir = cameraRef.current.position.clone().sub(controlsRef.current.target).normalize();
            cameraRef.current.position.copy(controlsRef.current.target).addScaledVector(dir, 14.0 * portraitDistanceScale(cameraRef.current.aspect));
          }
        }
      }
    }, [treeConfig]);

    // -------------------------------------------------------------
    // UPDATE ENVIRONMENT & ATMOSPHERE (TIME OF DAY)
    // -------------------------------------------------------------
    useEffect(() => {
      const scene = sceneRef.current;
      const dirLight = dirLightRef.current;
      const hemiLight = hemiLightRef.current;
      if (!scene || !dirLight || !hemiLight) return;

      if (controlsRef.current) {
        controlsRef.current.autoRotate = envConfig.autoRotate;
      }

      switch (envConfig.timeOfDay) {
        case 'sunset': // Golden Hour
          scene.background = new THREE.Color('#e07a5f');
          scene.fog = new THREE.FogExp2('#e07a5f', 0.024);
          dirLight.color.set('#ffaa55');
          dirLight.intensity = 1.8;
          dirLight.position.set(16, 8, 12);
          hemiLight.color.set('#ffeedd');
          hemiLight.groundColor.set('#4d2b24');
          hemiLight.intensity = 0.65;
          break;

        case 'night': // Silent Princess Hyrule Night
          scene.background = new THREE.Color('#0c1326');
          scene.fog = new THREE.FogExp2('#0c1326', 0.028);
          dirLight.color.set('#90b4ce');
          dirLight.intensity = 0.75;
          dirLight.position.set(10, 18, 10);
          hemiLight.color.set('#2b3a67');
          hemiLight.groundColor.set('#0b101d');
          hemiLight.intensity = 0.4;
          break;

        case 'misty': // Morning Dew / Faron Mist
          scene.background = new THREE.Color('#b8c5d6');
          scene.fog = new THREE.FogExp2('#b8c5d6', 0.04);
          dirLight.color.set('#fff5eb');
          dirLight.intensity = 1.0;
          dirLight.position.set(6, 16, 8);
          hemiLight.color.set('#e2eafc');
          hemiLight.groundColor.set('#3a506b');
          hemiLight.intensity = 0.8;
          break;

        case 'day':
        default: // Iconic BotW Hyrule Noon
          scene.background = new THREE.Color('#8ecae6');
          scene.fog = new THREE.FogExp2('#8ecae6', 0.016);
          dirLight.color.set('#fffcf0');
          dirLight.intensity = 1.45;
          dirLight.position.set(14, 22, 14);
          hemiLight.color.set('#ffffff');
          hemiLight.groundColor.set('#486824');
          hemiLight.intensity = 0.75;
          break;
      }
    }, [envConfig.timeOfDay, envConfig.autoRotate]);

    // While the phone's settings sheet covers the bottom of the screen, the
    // scene is drawn raised into the part still visible.
    useEffect(() => {
      viewInsetRef.current = viewInsetBottom;
      applyViewInset();
    }, [viewInsetBottom]);

    // -------------------------------------------------------------
    // EXPOSE IMPERATIVE METHODS (EXPORT, CAMERA CONTROLS)
    // -------------------------------------------------------------
    useImperativeHandle(ref, () => ({
      exportOBJ: async () => {
        if (!treeInstanceRef.current) return;
        const { exportTreeAsOBJ } = await import('../services/exportService');
        exportTreeAsOBJ(
          treeInstanceRef.current.group,
          `zelda_${treeConfig.species}_seed${treeConfig.seed}.obj`
        );
      },
      takeScreenshot: async () => {
        if (!canvasRef.current) return;
        const { captureCanvasScreenshot } = await import('../services/exportService');
        captureCanvasScreenshot(
          canvasRef.current,
          `zelda_${treeConfig.species}_seed${treeConfig.seed}.png`
        );
      },
      resetCamera: () => {
        if (!cameraRef.current || !controlsRef.current) return;
        const isFallen = treeConfig.growthStage === 'fallen' || treeConfig.species.endsWith('_fallen');
        const isSapling = treeConfig.growthStage === 'sapling' || treeConfig.species.endsWith('_sapling');
        if (treeConfig.growthStage === 'log') {
          const isStump = treeConfig.species === 'tree_stump';
          const d = isStump ? 6 : Math.max(8, treeConfig.trunkHeight * 1.9);
          cameraRef.current.position.set(0, d * 0.45, d * 0.9);
          controlsRef.current.target.set(0, isStump ? Math.max(0.35, treeConfig.trunkHeight * 0.45) : 0.5, 0);
        } else if (isFallen) {
          cameraRef.current.position.set(0, 3.2, 7.2);
          controlsRef.current.target.set(0, 0.5, 0);
        } else if (isSapling) {
          cameraRef.current.position.set(0, 1.2, 3.2);
          controlsRef.current.target.set(0, 0.5, 0);
        } else if (treeConfig.growthStage === 'shrub') {
          cameraRef.current.position.set(0, 2.0, 5.5);
          controlsRef.current.target.set(0, Math.max(0.45, treeConfig.trunkHeight * 0.5), 0);
        } else {
          cameraRef.current.position.set(0, 6.5, 18);
          controlsRef.current.target.set(0, treeConfig.trunkHeight * 0.55, 0);
        }
        const target = controlsRef.current.target;
        cameraRef.current.position
          .sub(target)
          .multiplyScalar(portraitDistanceScale(cameraRef.current.aspect))
          .add(target);
        controlsRef.current.update();
      },
      focusCanopy: () => {
        if (!cameraRef.current || !controlsRef.current) return;
        const isFallen = treeConfig.growthStage === 'fallen' || treeConfig.species.endsWith('_fallen');
        if (isFallen) {
          controlsRef.current.target.set(1.5, 0.5, 0);
          cameraRef.current.position.set(1.5, 2.5, 4.5);
        } else {
          const targetY = treeConfig.trunkHeight * 0.85;
          controlsRef.current.target.set(0, targetY, 0);
          cameraRef.current.position.set(0, targetY + 1.5, treeConfig.clusterRadius * 4.5 + 4);
        }
        controlsRef.current.update();
      },
      focusTrunk: () => {
        if (!cameraRef.current || !controlsRef.current) return;
        const isFallen = treeConfig.growthStage === 'fallen' || treeConfig.species.endsWith('_fallen');
        if (isFallen) {
          controlsRef.current.target.set(-1.8, 0.6, -0.3);
          cameraRef.current.position.set(-1.8, 2.2, 3.8);
        } else {
          const targetY = treeConfig.trunkHeight * 0.25;
          controlsRef.current.target.set(0, targetY, 0);
          cameraRef.current.position.set(0, targetY + 0.8, treeConfig.trunkRadiusBase * 6 + 3);
        }
        controlsRef.current.update();
      },
    }));

    return (
      <div
        id="botw-viewport-container"
        ref={containerRef}
        className="relative w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
      >
        <canvas id="botw-tree-canvas" ref={canvasRef} className="w-full h-full block" />
      </div>
    );
  }
);
Viewport3D.displayName = 'Viewport3D';
