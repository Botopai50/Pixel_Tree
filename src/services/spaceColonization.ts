import * as THREE from 'three';
import { TreeConfig, CrownShape } from '../types';

export interface SCANode {
  id: number;
  position: THREE.Vector3;
  parent: SCANode | null;
  children: SCANode[];
  radius: number;
  depth: number;
  isLeaf: boolean;
  dir: THREE.Vector3;
  isTrunk: boolean;
}

export interface BranchSegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radiusStart: number;
  radiusEnd: number;
  depth: number;
  isTrunk: boolean;
}

export interface FoliageClusterAnchor {
  position: THREE.Vector3;
  radius: number;
  leafCount: number;
}

export interface SCATreeData {
  rootNode: SCANode;
  allNodes: SCANode[];
  leafNodes: SCANode[];
  branchSegments: BranchSegment[];
  foliageClusters: FoliageClusterAnchor[];
  attractorPositions: THREE.Vector3[];
  crownCenter: THREE.Vector3;
  crownBottomY: number;
  crownTopY: number;
  crownRadiusX: number;
  crownRadiusY: number;
  crownRadiusZ: number;
}

export interface TreeChain {
  nodes: SCANode[];
  isTrunk: boolean;
  baseRadius?: number;
}

/**
 * Clusters attractor pull vectors into distinct branch buds.
 * Prevents opposing attractors from canceling out into a zero vector,
 * enabling natural bifurcations and whorled conifer bough sprouting!
 */
function clusterDirections(dirs: THREE.Vector3[], maxClusters: number = 4, minDot: number = 0.52): THREE.Vector3[] {
  if (dirs.length <= 1) return dirs.length === 1 ? [dirs[0].clone()] : [];

  const clusters: { sum: THREE.Vector3; count: number; dir: THREE.Vector3 }[] = [];

  for (const d of dirs) {
    let bestCluster: (typeof clusters)[0] | null = null;
    let bestDot = minDot;

    for (const c of clusters) {
      const dot = d.dot(c.dir);
      if (dot > bestDot) {
        bestDot = dot;
        bestCluster = c;
      }
    }

    if (bestCluster) {
      bestCluster.sum.add(d);
      bestCluster.count++;
      bestCluster.dir.copy(bestCluster.sum).divideScalar(bestCluster.count).normalize();
    } else if (clusters.length < maxClusters) {
      clusters.push({
        sum: d.clone(),
        count: 1,
        dir: d.clone().normalize(),
      });
    }
  }

  return clusters.map((c) => c.dir);
}

/**
 * 3D Space Colonization Algorithm (Runions et al.)
 * Fully procedural generation of both trunk, branches, and canopy from ground to crown.
 */
export function runSpaceColonization(config: TreeConfig): SCATreeData {
  // Seeded PRNG
  let seed = config.seed;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const canopySpread = config.canopySpread ?? 1.0;
  const crownShape: CrownShape = config.scaCrownShape ?? 'dome';
  const attractorCount = Math.max(120, Math.min(1200, config.scaAttractorCount ?? 450));
  const maxSearchDist = Math.max(1.5, Math.min(7.0, config.scaAttractionRadius ?? 3.6));
  const killDist = Math.max(0.25, Math.min(1.8, config.scaKillDistance ?? 0.65));
  const stepSize = Math.max(0.2, Math.min(0.8, config.scaStepSize ?? 0.38));

  // Crown and Trunk Dimensions
  const trunkHeight = config.trunkHeight;
  const isPineSpecies = config.species === 'hebra_pine' || crownShape === 'conical';
  const isCactusSpecies = config.species === 'gerudo_cactus' || crownShape === 'candelabra';
  const isSwampSpecies = config.species === 'swamp_mangrove' || crownShape === 'swamp_vault';
  const minBranchH = isPineSpecies ? 0.22 : (isCactusSpecies ? 0.30 : (isSwampSpecies ? 0.44 : 0.35));
  const branchStartH = Math.max(minBranchH, Math.min(0.75, config.branchStartHeight ?? 0.45));
  const crownBottomY = trunkHeight * branchStartH;
  const crownTopY = trunkHeight * 1.18;
  const crownHeight = crownTopY - crownBottomY;
  const crownCenterY = crownBottomY + crownHeight * 0.52;
  const crownRadiusX = (config.branchLength * 0.95 + 1.2) * canopySpread;
  const crownRadiusZ = crownRadiusX * (0.9 + rnd() * 0.2);
  const crownRadiusY = crownHeight * 0.55;

  const crownCenter = new THREE.Vector3(0, crownCenterY, 0);

  // -------------------------------------------------------------
  // 1. GENERATE ATTRACTION POINTS (TRUNK GUIDE + CROWN VOLUME)
  // -------------------------------------------------------------
  const attractors: THREE.Vector3[] = [];
  const attractorPositionsForDebug: THREE.Vector3[] = [];

  // A) Trunk Growth Guide Attractors (guiding upward growth without stray horizontal branches)
  const trunkTargetY = isPineSpecies
    ? crownTopY * 0.98
    : isCactusSpecies
    ? trunkHeight
    : isSwampSpecies
    ? trunkHeight * 0.88
    : crownBottomY;
  const trunkAttractorCount = Math.max(18, Math.floor((trunkTargetY / stepSize) * 1.4));
  const curveAmpX = (rnd() - 0.5) * 2.4 * config.trunkCurvature * (isPineSpecies ? 0.25 : (isCactusSpecies ? 1.45 : 1.5));
  const curveAmpZ = (rnd() - 0.5) * 2.4 * config.trunkCurvature * (isPineSpecies ? 0.25 : (isCactusSpecies ? 1.45 : 1.5));

  // Organic lean direction for natural saguaro posture
  const cactusLeanAngle = rnd() * Math.PI * 2;
  const cactusLeanMag = config.trunkCurvature * 1.6;

  // Conifer lean: the whole tree bends progressively to one side toward the
  // top. It is applied to EVERY conifer attractor - trunk guide, branch tiers,
  // spire and volume - so the crown travels with the trunk instead of the
  // trunk bending out from under a crown still centred on the vertical axis.
  const pineLeanMag = isPineSpecies ? (config.coniferLean ?? 0) * trunkHeight * 0.2 : 0;
  const pineLeanX = Math.cos(config.coniferLeanAngle ?? 0);
  const pineLeanZ = Math.sin(config.coniferLeanAngle ?? 0);
  const pineOffset = (y: number): [number, number] => {
    if (pineLeanMag <= 0) return [0, 0];
    const k = pineLeanMag * Math.pow(THREE.MathUtils.clamp(y / crownTopY, 0, 1), 1.5);
    return [pineLeanX * k, pineLeanZ * k];
  };

  for (let i = 1; i <= trunkAttractorCount; i++) {
    const t = i / trunkAttractorCount;
    const y = t * trunkTargetY;

    let lateralX = 0;
    let lateralZ = 0;

    if (isCactusSpecies) {
      // Natural organic saguaro posture: gentle progressive lean + S-curve + subtle undulating sway
      const progressiveLean = Math.pow(t, 1.35) * cactusLeanMag;
      const sWaveX = Math.sin(t * Math.PI * 1.8) * curveAmpX;
      const sWaveZ = Math.sin(t * Math.PI * 1.8) * curveAmpZ;
      const swayNoise = Math.sin(t * Math.PI * 3.5) * 0.12 * config.trunkCurvature;

      lateralX = Math.cos(cactusLeanAngle) * progressiveLean + sWaveX + (rnd() - 0.5) * 0.14 * config.trunkCurvature;
      lateralZ = Math.sin(cactusLeanAngle) * progressiveLean + sWaveZ + swayNoise + (rnd() - 0.5) * 0.14 * config.trunkCurvature;
    } else if (isSwampSpecies) {
      // Sculptural bonsai/mangrove trunk curvature:
      // Starts upright from the aerial roots, bows out gracefully to one side around mid-height,
      // then curves back towards center-top where it forks into the high apex boughs
      lateralX = Math.sin(t * Math.PI * 1.05) * curveAmpX * 1.30 + (rnd() - 0.5) * 0.05 * config.trunkCurvature;
      lateralZ = Math.cos(t * Math.PI * 0.85) * curveAmpZ * 0.85 + (rnd() - 0.5) * 0.05 * config.trunkCurvature;
    } else {
      // Organic sine waviness + seed noise along the trunk
      lateralX = Math.sin(t * Math.PI) * curveAmpX + (rnd() - 0.5) * (isPineSpecies ? 0.04 : 0.15) * config.trunkCurvature;
      lateralZ = Math.sin(t * Math.PI * 1.2) * curveAmpZ + (rnd() - 0.5) * (isPineSpecies ? 0.04 : 0.15) * config.trunkCurvature;
      const [lx, lz] = pineOffset(y);
      lateralX += lx;
      lateralZ += lz;
    }

    const pt = new THREE.Vector3(lateralX, y, lateralZ);
    attractors.push(pt);
    attractorPositionsForDebug.push(pt.clone());
  }

  // B) Crown Volume Attractors
  if (isPineSpecies) {
    // -------------------------------------------------------------
    // CONIFER BOTANICAL TIERED WHORLS (VERTICILOS ESCALONADOS)
    // Generates distinct horizontal branch tiers radiating from the trunk in
    // a noble alpine silhouette with snow-shedding droop, authentic to Breath of the Wild!
    // -------------------------------------------------------------
    const numTiers = Math.max(8, Math.min(13, config.branchCount ?? 10));
    const targetPointsPerTier = Math.floor(attractorCount / (numTiers + 1));

    for (let t = 0; t < numTiers; t++) {
      const frac = t / Math.max(1, numTiers - 1); // 0 (lowest tier) to 1 (near top)
      const tierY = crownBottomY + Math.pow(frac, 0.92) * crownHeight * 0.93;
      // Preserve the broad shoulder, then tighten only the terminal whorls so
      // the SCA itself forms a natural leader instead of relying on giant leaves.
      const terminalTaper = THREE.MathUtils.smoothstep(frac, 0.86, 1);
      const tierRadius = crownRadiusX
        * Math.pow(1.0 - 0.76 * frac, 0.82)
        * THREE.MathUtils.lerp(1, 0.4, terminalTaper)
        * canopySpread;

      // 4 to 6 main bough rays per tier
      const boughCount = frac < 0.35 ? 6 : (frac < 0.70 ? 5 : 4);
      // Alternating rotational offset per tier so tiers interleave naturally
      const tierAngleOffset = t * 1.05 + (rnd() - 0.5) * 0.12;

      for (let b = 0; b < boughCount; b++) {
        const boughAngle = (b / boughCount) * Math.PI * 2 + tierAngleOffset + (rnd() - 0.5) * 0.14;
        const boughDir = new THREE.Vector3(Math.cos(boughAngle), 0, Math.sin(boughAngle));
        const boughRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), boughDir).normalize();

        const steps = Math.max(4, Math.floor(targetPointsPerTier / (boughCount * 1.8)));
        for (let s = 1; s <= steps; s++) {
          const rFrac = 0.22 + (s / steps) * 0.78;
          const r = rFrac * tierRadius;

          // Natural gravitational snow droop with subtle tip upturn
          const droop = (1.0 - frac * 0.72) * 0.55 * Math.pow(rFrac, 1.35);
          const tipUp = rFrac > 0.85 ? Math.pow((rFrac - 0.85) / 0.15, 2.0) * 0.14 : 0;
          const y = tierY - droop + tipUp + (rnd() - 0.5) * 0.08;

          const jitterSide = (rnd() - 0.5) * 0.16 * (1.0 + rFrac);
          const [tierOx, tierOz] = pineOffset(tierY);
          const pt = new THREE.Vector3(
            tierOx + boughDir.x * r + boughRight.x * jitterSide,
            y,
            tierOz + boughDir.z * r + boughRight.z * jitterSide
          );
          attractors.push(pt);
          attractorPositionsForDebug.push(pt.clone());

          // Outer tip sub-branch fan attractors (creating lush bough shelves)
          if (rFrac > 0.65) {
            [-1, 1].forEach((side) => {
              const fanAngle = boughAngle + side * 0.38;
              const fanDir = new THREE.Vector3(Math.cos(fanAngle), 0, Math.sin(fanAngle));
              const fanPt = new THREE.Vector3(
                tierOx + fanDir.x * (r * 1.02),
                y - 0.06 + (rnd() - 0.5) * 0.06,
                tierOz + fanDir.z * (r * 1.02)
              );
              attractors.push(fanPt);
              attractorPositionsForDebug.push(fanPt.clone());
            });
          }
        }
      }
    }

    // Apex Pinnacle: Upright needle spire crowning the tree
    const spireCount = 28;
    for (let sp = 0; sp < spireCount; sp++) {
      const spT = sp / spireCount;
      const spY = crownTopY * 0.94 + spT * crownHeight * 0.09;
      const spR = (1.0 - spT) * 0.28 + 0.05;
      const spA = rnd() * Math.PI * 2;
      const spDist = rnd() * spR;
      const [spOx, spOz] = pineOffset(spY);
      const pt = new THREE.Vector3(spOx + Math.cos(spA) * spDist, spY, spOz + Math.sin(spA) * spDist);
      attractors.push(pt);
      attractorPositionsForDebug.push(pt.clone());
    }

    // Subtle organic ambient volume attractors (adds gentle natural irregularity)
    const ambientCount = Math.floor(attractorCount * 0.15);
    for (let a = 0; a < ambientCount; a++) {
      const ambFrac = rnd();
      const ambY = crownBottomY + ambFrac * crownHeight;
      const ambientTerminalTaper = THREE.MathUtils.smoothstep(ambFrac, 0.86, 1);
      const ambMaxR = crownRadiusX
        * Math.pow(1.0 - 0.76 * ambFrac, 0.82)
        * THREE.MathUtils.lerp(1, 0.4, ambientTerminalTaper)
        * canopySpread;
      const ambR = (0.28 + rnd() * 0.70) * ambMaxR;
      const ambA = rnd() * Math.PI * 2;
      const [ambOx, ambOz] = pineOffset(ambY);
      const pt = new THREE.Vector3(ambOx + Math.cos(ambA) * ambR, ambY + (rnd() - 0.5) * 0.25, ambOz + Math.sin(ambA) * ambR);
      attractors.push(pt);
      attractorPositionsForDebug.push(pt.clone());
    }
  } else if (isCactusSpecies) {
    // -------------------------------------------------------------
    // GERUDO DESERT CANDELABRA CACTUS (SAGUARO)
    // Upright main stem with organically curved arms (0 to 8 arms).
    // The number of arms varies dynamically based on config.branchCount.
    // Stems bow, curve, sway, and emerge at varied heights and angles.
    // -------------------------------------------------------------
    const desiredArms = config.branchCount !== undefined ? Math.round(config.branchCount) : 3;
    const numArms = Math.max(0, Math.min(8, desiredArms));
    const armAttractorsPerArm = numArms > 0 ? Math.floor(attractorCount / (numArms + 1)) : attractorCount;

    // 1. Central trunk continuation & apex cluster
    const apexClusterCount = numArms > 0 ? Math.floor(armAttractorsPerArm * 0.9) : Math.floor(attractorCount * 0.6);
    for (let i = 0; i < apexClusterCount; i++) {
      const frac = i / Math.max(1, apexClusterCount - 1);
      const y = trunkHeight * (0.82 + frac * 0.18);
      const r = (1.0 - frac * 0.65) * 0.28;
      const angle = rnd() * Math.PI * 2;
      const pt = new THREE.Vector3(
        curveAmpX * 0.35 + Math.cos(angle) * r,
        y,
        curveAmpZ * 0.35 + Math.sin(angle) * r
      );
      attractors.push(pt);
      attractorPositionsForDebug.push(pt.clone());
    }

    // 2. Candelabra Arms (if numArms > 0)
    if (numArms > 0) {
      const baseArmDist = (config.branchLength * 0.45 + 1.1) * canopySpread;

      // Generate asymmetrical arm angles with natural dispersion
      const armAngles: number[] = [];
      for (let a = 0; a < numArms; a++) {
        if (numArms === 1) {
          armAngles.push(rnd() * Math.PI * 2);
        } else if (numArms === 2) {
          // Typically on roughly opposite sides with natural stagger
          const baseA = rnd() * Math.PI * 2;
          armAngles.push(baseA);
          armAngles.push(baseA + Math.PI * (0.75 + rnd() * 0.45));
          break;
        } else {
          // Botanical golden ratio or staggered distribution with jitter
          const baseA = (a / numArms) * Math.PI * 2 + (rnd() - 0.5) * 0.65;
          armAngles.push(baseA);
        }
      }

      for (let a = 0; a < numArms; a++) {
        const armFrac = a / Math.max(1, numArms - 1);
        // Stagger emergence heights so arms branch at distinct levels (30% to 65% of trunk)
        const emergenceY = trunkHeight * (0.30 + 0.35 * (numArms === 1 ? 0.45 : armFrac) + (rnd() - 0.5) * 0.08);
        const armAngle = armAngles[a % armAngles.length];
        const armDir = new THREE.Vector3(Math.cos(armAngle), 0, Math.sin(armAngle));
        // Perpendicular vector for lateral sway
        const sideDir = new THREE.Vector3(-armDir.z, 0, armDir.x);

        // Individual arm distance and reach
        const armDist = baseArmDist * (0.78 + (rnd() - 0.5) * 0.32);

        // Top height of this arm: varied maturity (young arm ~65% to mature arm ~102% of trunk)
        const heightVariation = (a % 2 === 0) ? (0.85 + rnd() * 0.18) : (0.68 + rnd() * 0.22);
        const armTopY = trunkHeight * Math.max(0.62, Math.min(1.04, heightVariation));

        // Curvature factors for this particular arm
        const armBowFactor = (rnd() - 0.35) * 0.35 * (config.trunkCurvature + 0.5);
        const armLateralSway = (rnd() - 0.5) * 0.45 * (config.trunkCurvature + 0.5);
        const armTipCurl = (rnd() - 0.5) * 0.25;

        // A) Elbow curve from trunk outward to armDist
        const elbowSteps = 14;
        for (let s = 1; s <= elbowSteps; s++) {
          const t = s / elbowSteps;
          // Smooth arch outward
          const lateralDist = THREE.MathUtils.lerp(0.35, armDist, Math.sin(t * Math.PI * 0.5));
          // Elbow dips and arches up
          const y = emergenceY + Math.pow(t, 1.8) * (armDist * 0.42);
          const elbowSway = Math.sin(t * Math.PI) * armLateralSway * 0.4;

          const pt = new THREE.Vector3(
            armDir.x * lateralDist + sideDir.x * elbowSway + (rnd() - 0.5) * 0.05,
            y,
            armDir.z * lateralDist + sideDir.z * elbowSway + (rnd() - 0.5) * 0.05
          );
          attractors.push(pt);
          attractorPositionsForDebug.push(pt.clone());
        }

        // B) Non-straight upright column rising from elbow to armTopY
        const elbowEndY = emergenceY + armDist * 0.42;
        const verticalSteps = Math.max(12, Math.floor((Math.max(0.6, armTopY - elbowEndY) / stepSize) * 1.5));

        for (let v = 1; v <= verticalSteps; v++) {
          const t = v / verticalSteps;
          const y = THREE.MathUtils.lerp(elbowEndY, armTopY, t);

          // Organic bowing: arm bows out or in as it grows
          const bowOffset = Math.sin(t * Math.PI) * armBowFactor;
          // Lateral sway: gentle S-curve perpendicular to the radial direction
          const swayOffset = Math.sin(t * Math.PI * 1.6) * armLateralSway;
          // Apex tilt: gentle curl at the top
          const curlOffset = Math.pow(t, 2.2) * armTipCurl;

          const curDist = armDist + bowOffset + curlOffset;

          const pt = new THREE.Vector3(
            armDir.x * curDist + sideDir.x * swayOffset + (rnd() - 0.5) * 0.08,
            y,
            armDir.z * curDist + sideDir.z * swayOffset + (rnd() - 0.5) * 0.08
          );
          attractors.push(pt);
          attractorPositionsForDebug.push(pt.clone());
        }

        // C) Dense tip cluster at the apex of the arm for smooth rounded domed cap
        const tipCluster = 8;
        const finalDist = armDist + armTipCurl;
        for (let tc = 0; tc < tipCluster; tc++) {
          const tcAngle = rnd() * Math.PI * 2;
          const tcR = rnd() * 0.22;
          const pt = new THREE.Vector3(
            armDir.x * finalDist + Math.cos(tcAngle) * tcR,
            armTopY + (rnd() - 0.5) * 0.12,
            armDir.z * finalDist + Math.sin(tcAngle) * tcR
          );
          attractors.push(pt);
          attractorPositionsForDebug.push(pt.clone());
        }
      }
    }
  } else if (isSwampSpecies) {
    // -------------------------------------------------------------
    // TIERED SCULPTURAL MANGROVE / SWAMP BOUGHS (DESNÍVEL ESCALONADO)
    // Directly implements the vertical height stratification from the reference:
    // - Tier 1 (Low Shelf): ~46% to 54% trunk height, with 3 branching bough networks
    // - Tier 2 (Mid Shelf): ~66% to 76% trunk height, with 4 branching bough networks
    // - Tier 3 (High Crown Apex): ~85% to 110% trunk height, with 4 ascending crowning limbs
    // Each bough branches into secondary arms and terminal twigs, giving an abundant,
    // authentic bonsai/mangrove branch structure with plenty of branches ("muitos galhos")!
    // -------------------------------------------------------------
    const baseAngle = (rnd() - 0.5) * 0.6;

    // Helper to spawn a ramified bough system (main stem + 2 bifurcating arms + terminal twigs)
    const spawnBranchingBough = (
      startHeight: number,
      mainAngle: number,
      boughLength: number,
      verticalProfile: (t: number) => number,
      subBranchSpread: number = 0.52,
      pointsPerBough: number = 32
    ) => {
      const dirX = Math.cos(mainAngle);
      const dirZ = Math.sin(mainAngle);
      const sideX = -dirZ;
      const sideZ = dirX;

      // 1. Main bough stem (from trunk out to 42% length)
      const stemPoints = Math.max(7, Math.floor(pointsPerBough * 0.35));
      for (let i = 0; i < stemPoints; i++) {
        const frac = ((i + 1) / stemPoints) * 0.42;
        const r = frac * boughLength;
        const y = startHeight + verticalProfile(frac) + (rnd() - 0.5) * 0.12;
        const sway = Math.sin(frac * Math.PI * 1.8) * 0.22 + (rnd() - 0.5) * 0.12;
        const pt = new THREE.Vector3(
          dirX * r + sideX * sway,
          y,
          dirZ * r + sideZ * sway
        );
        attractors.push(pt);
        attractorPositionsForDebug.push(pt.clone());
      }

      // 2. Diverging Sub-Branches (Arm A and Arm B)
      const armAngles = [
        mainAngle - subBranchSpread * (0.85 + rnd() * 0.35),
        mainAngle + subBranchSpread * (0.85 + rnd() * 0.35),
      ];

      armAngles.forEach((armAng, armIdx) => {
        const armDirX = Math.cos(armAng);
        const armDirZ = Math.sin(armAng);
        const armSideX = -armDirZ;
        const armSideZ = armDirX;
        const armLen = boughLength * (0.85 + (armIdx === 0 ? 0.12 : -0.08) + rnd() * 0.15);
        const armPoints = Math.max(8, Math.floor(pointsPerBough * 0.32));

        for (let j = 0; j < armPoints; j++) {
          const frac = 0.42 + ((j + 1) / armPoints) * 0.50; // 42% to 92%
          const r = frac * armLen;
          const y = startHeight + verticalProfile(frac) + (rnd() - 0.5) * 0.14;
          const armSway = Math.sin((frac - 0.42) * Math.PI * 2.2) * 0.18 + (rnd() - 0.5) * 0.10;
          const pt = new THREE.Vector3(
            armDirX * r + armSideX * armSway,
            y,
            armDirZ * r + armSideZ * armSway
          );
          attractors.push(pt);
          attractorPositionsForDebug.push(pt.clone());
        }

        // 3. Terminal Twig Forks at the end of each arm
        const twigCount = 3;
        for (let tw = 0; tw < twigCount; tw++) {
          const twAngle = armAng + (tw - 1) * 0.32 + (rnd() - 0.5) * 0.16;
          const twLen = armLen * (0.95 + rnd() * 0.18);
          const pt = new THREE.Vector3(
            Math.cos(twAngle) * twLen + (rnd() - 0.5) * 0.25,
            startHeight + verticalProfile(1.0) + (rnd() - 0.5) * 0.18,
            Math.sin(twAngle) * twLen + (rnd() - 0.5) * 0.25
          );
          attractors.push(pt);
          attractorPositionsForDebug.push(pt.clone());
        }
      });
    };

    // =============================================================
    // TIER 1: LOWER SHELF (Y ≈ 4.7m - 5.5m)
    // Major horizontal and slightly dipping boughs on the lower left/front
    // =============================================================
    // Bough 1A: Primary low bough (Left-front)
    spawnBranchingBough(
      trunkHeight * (0.48 + (rnd() - 0.5) * 0.03),
      baseAngle - 2.25,
      (config.branchLength * 0.90 + 0.6) * canopySpread,
      (t) => -Math.sin(t * Math.PI) * 0.38 + (t > 0.7 ? 0.22 : 0),
      0.54,
      36
    );

    // Bough 1B: Secondary low bough (Front-left, Y ≈ 5.2m)
    spawnBranchingBough(
      trunkHeight * (0.52 + (rnd() - 0.5) * 0.03),
      baseAngle - 1.45,
      (config.branchLength * 0.76 + 0.4) * canopySpread,
      (t) => -Math.sin(t * Math.PI) * 0.28 + (t > 0.7 ? 0.18 : 0),
      0.48,
      28
    );

    // Bough 1C: Tertiary lower bough (Back-left, Y ≈ 4.9m)
    spawnBranchingBough(
      trunkHeight * (0.49 + (rnd() - 0.5) * 0.03),
      baseAngle - 2.95,
      (config.branchLength * 0.68 + 0.3) * canopySpread,
      (t) => -Math.sin(t * Math.PI) * 0.32 + (t > 0.7 ? 0.16 : 0),
      0.46,
      26
    );

    // =============================================================
    // TIER 2: MID SHELF (Y ≈ 6.8m - 7.7m) - Elevated ~2.2m above Tier 1!
    // Staggered boughs extending right, front-right, and rear
    // =============================================================
    // Bough 2A: Primary mid bough (Right-lateral)
    spawnBranchingBough(
      trunkHeight * (0.69 + (rnd() - 0.5) * 0.03),
      baseAngle + 0.95,
      (config.branchLength * 0.86 + 0.5) * canopySpread,
      (t) => -Math.sin(t * Math.PI) * 0.26 + (t > 0.7 ? 0.22 : 0),
      0.52,
      36
    );

    // Bough 2B: Secondary mid bough (Right-back, Y ≈ 7.3m)
    spawnBranchingBough(
      trunkHeight * (0.73 + (rnd() - 0.5) * 0.03),
      baseAngle + 1.85,
      (config.branchLength * 0.78 + 0.4) * canopySpread,
      (t) => -Math.sin(t * Math.PI) * 0.22 + (t > 0.7 ? 0.18 : 0),
      0.50,
      30
    );

    // Bough 2C: Tertiary mid bough (Front-right, Y ≈ 6.6m)
    spawnBranchingBough(
      trunkHeight * (0.66 + (rnd() - 0.5) * 0.03),
      baseAngle + 0.18,
      (config.branchLength * 0.72 + 0.3) * canopySpread,
      (t) => -Math.sin(t * Math.PI) * 0.20 + (t > 0.7 ? 0.15 : 0),
      0.46,
      28
    );

    // Bough 2D: Quaternary mid bough (Back-lateral depth, Y ≈ 7.5m)
    spawnBranchingBough(
      trunkHeight * (0.75 + (rnd() - 0.5) * 0.03),
      baseAngle + 2.75,
      (config.branchLength * 0.64 + 0.3) * canopySpread,
      (t) => -Math.sin(t * Math.PI) * 0.18 + (t > 0.7 ? 0.14 : 0),
      0.44,
      24
    );

    // =============================================================
    // TIER 3: HIGH CROWN APEX (Y ≈ 8.8m - 11.2m) - Elevated ~2.5m above Tier 2!
    // Top fork splitting into 4 high ascending crowning limbs
    // =============================================================
    const forkY = trunkHeight * (0.86 + (rnd() - 0.5) * 0.02);

    // Apex Bough 3A: Left-upward
    spawnBranchingBough(
      forkY,
      baseAngle - 1.25,
      (config.branchLength * 0.70 + 0.4) * canopySpread,
      (t) => Math.pow(t, 0.85) * (trunkHeight * 0.16) + (rnd() - 0.5) * 0.10,
      0.48,
      32
    );

    // Apex Bough 3B: Right-upward (Apex Summit)
    spawnBranchingBough(
      forkY,
      baseAngle + 2.05,
      (config.branchLength * 0.76 + 0.4) * canopySpread,
      (t) => Math.pow(t, 0.82) * (trunkHeight * 0.22) + (rnd() - 0.5) * 0.10,
      0.50,
      36
    );

    // Apex Bough 3C: Center-high summit
    spawnBranchingBough(
      forkY + 0.2,
      baseAngle + 0.55,
      (config.branchLength * 0.65 + 0.3) * canopySpread,
      (t) => Math.pow(t, 0.80) * (trunkHeight * 0.26) + (rnd() - 0.5) * 0.10,
      0.45,
      30
    );

    // Apex Bough 3D: High front-left leader
    spawnBranchingBough(
      forkY - 0.1,
      baseAngle - 0.38,
      (config.branchLength * 0.62 + 0.3) * canopySpread,
      (t) => Math.pow(t, 0.85) * (trunkHeight * 0.14) + (rnd() - 0.5) * 0.10,
      0.44,
      28
    );
  } else {
    // BROADLEAF & OTHER CROWN VOLUMES
    const cloudSubCenters: { pos: THREE.Vector3; radius: number }[] = [];
    if (crownShape === 'multi_cloud') {
      const cloudCount = 5;
      for (let i = 0; i < cloudCount; i++) {
        const angle = (i / cloudCount) * Math.PI * 2 + (rnd() - 0.5) * 0.4;
        const dist = (0.35 + rnd() * 0.55) * crownRadiusX;
        const cy = crownCenterY + (rnd() - 0.4) * crownRadiusY * 0.8;
        cloudSubCenters.push({
          pos: new THREE.Vector3(Math.cos(angle) * dist, cy, Math.sin(angle) * dist),
          radius: (0.35 + rnd() * 0.35) * crownRadiusX,
        });
      }
      cloudSubCenters.push({
        pos: new THREE.Vector3(0, crownCenterY + crownRadiusY * 0.35, 0),
        radius: crownRadiusX * 0.5,
      });
    }

    let crownAttempts = 0;
    const maxAttempts = attractorCount * 8;

    while (attractors.length < attractorCount + trunkAttractorCount && crownAttempts < maxAttempts) {
      crownAttempts++;

      const px = (rnd() - 0.5) * 2;
      const py = (rnd() - 0.5) * 2;
      const pz = (rnd() - 0.5) * 2;

      let inside = false;
      let worldX = 0;
      let worldY = 0;
      let worldZ = 0;

      switch (crownShape) {
        case 'sphere': {
          if (px * px + py * py + pz * pz <= 1.0) {
            worldX = px * crownRadiusX;
            worldY = crownCenterY + py * crownRadiusY;
            worldZ = pz * crownRadiusZ;
            inside = true;
          }
          break;
        }

        case 'umbrella': {
          const umbrellaY = py * 0.45;
          const rXZ = Math.sqrt(px * px + pz * pz);
          const maxR = 1.0 - Math.abs(umbrellaY) * 0.4;
          if (rXZ <= maxR && umbrellaY >= -0.35 && umbrellaY <= 0.45) {
            worldX = px * crownRadiusX * 1.35;
            worldY = crownCenterY + umbrellaY * crownRadiusY * 0.85;
            worldZ = pz * crownRadiusZ * 1.35;
            inside = true;
          }
          break;
        }

        case 'multi_cloud': {
          const targetCloud = cloudSubCenters[Math.floor(rnd() * cloudSubCenters.length)];
          const theta = rnd() * Math.PI * 2;
          const phi = Math.acos(2 * rnd() - 1);
          const r = Math.cbrt(rnd()) * targetCloud.radius;
          worldX = targetCloud.pos.x + r * Math.sin(phi) * Math.cos(theta);
          worldY = targetCloud.pos.y + r * Math.cos(phi) * 0.85;
          worldZ = targetCloud.pos.z + r * Math.sin(phi) * Math.sin(theta);
          inside = true;
          break;
        }

        case 'gnarled': {
          // Asymmetrical, angular reaching limbs with twisting jagged clusters and sharp forks (deadwood skeleton)
          const limbCount = 6;
          const limbIdx = Math.floor(rnd() * limbCount);
          const limbAngle = (limbIdx / limbCount) * Math.PI * 2 + (rnd() - 0.5) * 0.8;
          const reachFraction = 0.35 + rnd() * 0.75;
          const limbReach = reachFraction * crownRadiusX * canopySpread;
          const limbElevation = (rnd() - 0.2) * crownRadiusY * 1.1;
          const jaggedKink = (rnd() - 0.5) * 0.8;

          worldX = Math.cos(limbAngle) * limbReach + jaggedKink;
          worldY = crownCenterY + limbElevation;
          worldZ = Math.sin(limbAngle) * limbReach + jaggedKink;
          inside = true;
          break;
        }

        case 'dome':
        default: {
          if (px * px + py * py + pz * pz <= 1.0 && py >= -0.32) {
            worldX = px * crownRadiusX;
            worldY = crownCenterY + py * crownRadiusY;
            worldZ = pz * crownRadiusZ;
            inside = true;
          }
          break;
        }
      }

      if (inside) {
        const pt = new THREE.Vector3(worldX, worldY, worldZ);
        attractors.push(pt);
        attractorPositionsForDebug.push(pt.clone());
      }
    }
  }

  // -------------------------------------------------------------
  // 2. INITIALIZE ROOT NODE AT (0, 0, 0)
  // -------------------------------------------------------------
  let nextNodeId = 0;
  const allNodes: SCANode[] = [];

  const rootNode: SCANode = {
    id: nextNodeId++,
    position: new THREE.Vector3(0, 0, 0),
    parent: null,
    children: [],
    radius: config.trunkRadiusBase,
    depth: 0,
    isLeaf: false,
    dir: new THREE.Vector3(0, 1, 0),
    isTrunk: true,
  };
  allNodes.push(rootNode);

  // -------------------------------------------------------------
  // 3. SPACE COLONIZATION GROWTH ITERATIONS
  // -------------------------------------------------------------
  // A fixed iteration cap truncates tall trees when a smaller SCA step is
  // selected. Budget enough vertical steps for the leader to reach the crown,
  // plus a small margin for the organic (not perfectly vertical) path.
  const maxIterations = Math.min(
    110,
    Math.max(55, Math.ceil(crownTopY / Math.max(stepSize * 0.86, 0.01)) + 8)
  );
  let activeAttractors = [...attractors];

  for (let iter = 0; iter < maxIterations; iter++) {
    if (activeAttractors.length === 0) break;

    const nodeDirections = new Map<SCANode, THREE.Vector3[]>();
    const attractorsToRemove = new Set<number>();

    for (let aIdx = 0; aIdx < activeAttractors.length; aIdx++) {
      const attractor = activeAttractors[aIdx];

      let closestNode: SCANode | null = null;
      let closestDistSq = maxSearchDist * maxSearchDist;

      for (let nIdx = 0; nIdx < allNodes.length; nIdx++) {
        const node = allNodes[nIdx];
        const distSq = node.position.distanceToSquared(attractor);

        // Extended attraction reach along trunk guide
        const searchReach = node.isTrunk && attractor.y < (isPineSpecies ? crownTopY : (isSwampSpecies ? trunkHeight * 0.90 : crownBottomY * 1.1))
          ? maxSearchDist * 1.35
          : maxSearchDist;
        const searchReachSq = searchReach * searchReach;

        if (distSq < searchReachSq && distSq < closestDistSq) {
          closestDistSq = distSq;
          closestNode = node;
        }
      }

      if (closestNode) {
        const dist = Math.sqrt(closestDistSq);

        if (dist <= killDist) {
          attractorsToRemove.add(aIdx);
        } else {
          const dir = attractor.clone().sub(closestNode.position).normalize();
          if (!nodeDirections.has(closestNode)) {
            nodeDirections.set(closestNode, []);
          }
          nodeDirections.get(closestNode)!.push(dir);
        }
      }
    }

    // Upward guidance fallback if no node reached search dist yet
    if (nodeDirections.size === 0 && activeAttractors.length > 0) {
      let topNode = allNodes[0];
      for (let n = 1; n < allNodes.length; n++) {
        if (allNodes[n].position.y > topNode.position.y) {
          topNode = allNodes[n];
        }
      }

      let nearestAttractor = activeAttractors[0];
      let minDistSq = topNode.position.distanceToSquared(nearestAttractor);
      for (let a = 1; a < activeAttractors.length; a++) {
        const dSq = topNode.position.distanceToSquared(activeAttractors[a]);
        if (dSq < minDistSq) {
          minDistSq = dSq;
          nearestAttractor = activeAttractors[a];
        }
      }

      const towardDir = nearestAttractor.clone().sub(topNode.position).normalize();
      nodeDirections.set(topNode, [towardDir]);
    }

    if (attractorsToRemove.size > 0) {
      activeAttractors = activeAttractors.filter((_, idx) => !attractorsToRemove.has(idx));
    }

    let newNodesAdded = 0;
    nodeDirections.forEach((dirs, node) => {
      // Cluster directions if divergent to form distinct branch buds
      const maxClust = node.isTrunk ? (isPineSpecies ? 5 : (isSwampSpecies ? 4 : 3)) : (isSwampSpecies ? 3 : 2);
      const minDot = isSwampSpecies ? 0.60 : 0.52;
      const clusterDirs = clusterDirections(dirs, maxClust, minDot);

      // A broadleaf fork may produce several buds at once, but only the most
      // vertical one is the continuation of the central leader. Marking every
      // bud as trunk gives each one a full trunk target radius; the pipe model
      // then sums those oversized radii into a polygonal shoulder just below
      // the fork. The remaining buds are still fully procedural SCA branches.
      let broadleafLeaderIndex = -1;
      if (!isPineSpecies && !isSwampSpecies && node.isTrunk && clusterDirs.length > 0) {
        broadleafLeaderIndex = clusterDirs.reduce((bestIndex, direction, index) =>
          direction.y > clusterDirs[bestIndex].y ? index : bestIndex, 0
        );
      }

      clusterDirs.forEach((cDir, clusterIndex) => {
        const dir = cDir.clone();

        // Growth direction bias:
        if (isPineSpecies) {
          if (node.isTrunk) {
            // If pulling mostly vertical, continue trunk; otherwise it's a lateral branch bud
            if (dir.y > 0.65) {
              // Reinforce along the (possibly leaning) axis rather than
              // straight up - a pure vertical push held the trunk upright
              // while its whole crown leaned away - and steer back onto that
              // axis if the leader has drifted off it.
              const [ax, az] = pineOffset(node.position.y);
              const [ax2, az2] = pineOffset(node.position.y + 1);
              dir.x += (ax2 - ax) * 0.45 + (ax - node.position.x) * 0.35;
              dir.z += (az2 - az) * 0.45 + (az - node.position.z) * 0.35;
              dir.y += 0.45;
            } else {
              // A pine bud must leave the trunk laterally. Keeping most of the
              // attractor's vertical component makes adjacent whorl tiers merge
              // into competing upright leaders instead of distinct boughs.
              dir.y = THREE.MathUtils.clamp(dir.y * 0.18 - 0.08, -0.28, 0.12);
            }
          } else {
            // Conifer lateral branches grow outward horizontally with gentle snow droop
            dir.y = THREE.MathUtils.clamp(dir.y * 0.18 - 0.08, -0.28, 0.12);
          }
        } else if (isSwampSpecies) {
          if (node.isTrunk) {
            // If the pull is mostly upward, continue the central trunk leader
            if (dir.y > 0.52) {
              dir.y += 0.42;
            } else {
              // Lateral branch bud leaving the trunk horizontally with a gentle arch
              dir.y = THREE.MathUtils.clamp(dir.y * 0.22 - 0.04, -0.22, 0.16);
            }
          } else {
            // Once inside a branch, guide horizontally with natural sag and slight tip lift
            dir.y = THREE.MathUtils.clamp(dir.y * 0.55 + 0.03, -0.22, 0.26);
          }
        } else {
          if (node.position.y < crownBottomY) {
            dir.y += 0.38;
          } else {
            dir.y += 0.12;
          }
        }

        // Add gentle organic twist/curl
        dir.x += (rnd() - 0.5) * 0.10 * (config.trunkTwist + 0.5);
        dir.z += (rnd() - 0.5) * 0.10 * (config.trunkTwist + 0.5);
        dir.normalize();

        const newPos = node.position.clone().add(dir.clone().multiplyScalar(stepSize));
        // Distance from the tree's axis at this height. For a leaning conifer
        // that axis bends with the lean: measured from the vertical instead,
        // the leader left the "trunk" cylinder partway up, stopped counting
        // as trunk, and the tree lost its leader under a crown that leaned on.
        const [axisX, axisZ] = pineOffset(newPos.y);
        const distFromCentralAxis = Math.hypot(newPos.x - axisX, newPos.z - axisZ);

        // Keep the lower oak trunk genuinely clean. Divergent buds are held
        // until the configured fork height, while the selected leader keeps
        // advancing upward and remains driven by the same attractor field.
        const broadleafForkY = trunkHeight * (config.branchStartHeight ?? 0.40) * 0.96;
        if (
          !isPineSpecies
          && !isSwampSpecies
          && node.isTrunk
          && clusterIndex !== broadleafLeaderIndex
          && newPos.y < broadleafForkY
        ) {
          return;
        }

        const isStillTrunk = isPineSpecies
          ? (node.isTrunk && newPos.y < crownTopY * 0.98 && distFromCentralAxis < 0.45 && dir.y > 0.55)
          : isSwampSpecies
          ? (node.isTrunk && newPos.y < trunkHeight * 0.85 && distFromCentralAxis < 1.35 && dir.y > 0.45)
          : (
              node.isTrunk
              && clusterIndex === broadleafLeaderIndex
              && newPos.y < crownBottomY * 0.96
            );

        const newNode: SCANode = {
          id: nextNodeId++,
          position: newPos,
          parent: node,
          children: [],
          radius: 0.08,
          depth: node.depth + 1,
          isLeaf: true,
          dir,
          isTrunk: isStillTrunk,
        };

        node.children.push(newNode);
        node.isLeaf = false;
        allNodes.push(newNode);
        newNodesAdded++;
      });
    });

    if (newNodesAdded === 0 && attractorsToRemove.size === 0) {
      break;
    }
  }

  // -------------------------------------------------------------
  // 4. DA VINCI PIPE MODEL RADIUS PROPAGATION
  // -------------------------------------------------------------
  const leafNodes = allNodes.filter((n) => n.children.length === 0);
  const sortedNodes = [...allNodes].sort((a, b) => b.depth - a.depth);

  const terminalRadius = 0.045;
  sortedNodes.forEach((node) => {
    if (node.children.length === 0) {
      node.radius = terminalRadius;
    } else {
      let sumSq = 0;
      node.children.forEach((c) => {
        sumSq += Math.pow(c.radius, 2.1);
      });
      const calculatedRadius = Math.pow(sumSq, 1.0 / 2.1) + 0.012;

      if (isCactusSpecies) {
        if (node.isTrunk) {
          const t = Math.min(1.0, Math.max(0, node.position.y / trunkHeight));
          node.radius = THREE.MathUtils.lerp(config.trunkRadiusBase, config.trunkRadiusTop, Math.pow(t, 0.6));
        } else {
          // Cactus arms maintain thick succulent proportion (around 80-88% of trunk top radius)
          node.radius = Math.max(0.24, config.trunkRadiusTop * 0.86);
        }
      } else if (node.isTrunk) {
        const topY = isPineSpecies ? crownTopY : (isSwampSpecies ? trunkHeight * 0.86 : crownBottomY);
        const t = Math.min(1.0, node.position.y / Math.max(1.0, topY));
        const targetR = THREE.MathUtils.lerp(config.trunkRadiusBase, config.trunkRadiusTop, Math.pow(t, 0.75));
        if (isSwampSpecies) {
          // Swamp mangrove has its own prominent stilt roots, so trunk stays slender and elegant!
          // Do NOT accumulate huge branch sumSq into a giant monolithic trunk that swallows the roots.
          node.radius = targetR;
        } else {
          node.radius = Math.max(calculatedRadius, targetR);
        }
      } else {
        const maxBranchR = isSwampSpecies ? config.trunkRadiusTop * 0.85 : config.trunkRadiusTop * 0.95;
        node.radius = Math.min(maxBranchR, calculatedRadius);
        node.radius = Math.max(terminalRadius, node.radius);
      }
    }
  });

  // Base of tree gets configured trunk base radius
  rootNode.radius = config.trunkRadiusBase;

  // -------------------------------------------------------------
  // 5. EXTRACT BRANCH & TRUNK SEGMENTS
  // -------------------------------------------------------------
  const branchSegments: BranchSegment[] = [];
  allNodes.forEach((node) => {
    if (node.parent) {
      branchSegments.push({
        start: node.parent.position,
        end: node.position,
        radiusStart: node.parent.radius,
        radiusEnd: node.radius,
        depth: node.depth,
        isTrunk: node.isTrunk && node.parent.isTrunk,
      });
    }
  });

  // -------------------------------------------------------------
  // 6. FOLIAGE CLUSTER ANCHORS (BOTW VOLUMETRIC CLOUDS)
  // -------------------------------------------------------------
  const foliageClusters: FoliageClusterAnchor[] = [];
  const targetClusterCount = Math.max(8, Math.min(36, config.clusterCount));
  const baseRadius = config.clusterRadius;

  if (leafNodes.length > 0) {
    const step = Math.max(1, Math.floor(leafNodes.length / targetClusterCount));
    for (let i = 0; i < leafNodes.length && foliageClusters.length < targetClusterCount; i += step) {
      const leaf = leafNodes[i];
      if (leaf.position.y >= crownBottomY * 0.7) {
        foliageClusters.push({
          position: leaf.position.clone(),
          radius: baseRadius * (0.85 + rnd() * 0.35),
          leafCount: 1,
        });
      }
    }
  }

  while (foliageClusters.length < Math.min(6, targetClusterCount)) {
    const angle = rnd() * Math.PI * 2;
    const dist = rnd() * crownRadiusX * 0.75;
    const y = crownCenterY + (rnd() - 0.4) * crownRadiusY;
    foliageClusters.push({
      position: new THREE.Vector3(Math.cos(angle) * dist, y, Math.sin(angle) * dist),
      radius: baseRadius * 0.9,
      leafCount: 1,
    });
  }

  return {
    rootNode,
    allNodes,
    leafNodes,
    branchSegments,
    foliageClusters,
    attractorPositions: attractorPositionsForDebug,
    crownCenter,
    crownBottomY,
    crownTopY,
    crownRadiusX,
    crownRadiusY,
    crownRadiusZ,
  };
}

/**
 * Extracts continuous branch chains from the tree graph.
 * This decomposition enables 100% continuous welded rings along each branch and the main trunk,
 * completely eliminating gaps, cuts, and detached peeling ribbons!
 */
export function extractTreeChains(rootNode: SCANode): TreeChain[] {
  const chains: TreeChain[] = [];

  function traceChain(startNodes: SCANode[], isTrunk: boolean, baseRadius?: number) {
    const chain = [...startNodes];
    let curr = chain[chain.length - 1];

    while (curr.children.length > 0) {
      let primaryChild = curr.children[0];

      if (curr.children.length > 1) {
        let bestScore = -1;
        for (const child of curr.children) {
          const segDir = child.position.clone().sub(curr.position).normalize();
          const continuity = curr.dir ? Math.max(0, segDir.dot(curr.dir)) : 0.5;
          const score = child.radius * 2.0 + continuity * 0.8;
          if (score > bestScore) {
            bestScore = score;
            primaryChild = child;
          }
        }

        // Secondary children start branch chains anchored smoothly at the parent node
        for (const child of curr.children) {
          if (child !== primaryChild) {
            traceChain([curr, child], false, child.radius * 1.15);
          }
        }
      }

      chain.push(primaryChild);
      curr = primaryChild;
    }

    if (chain.length >= 2) {
      chains.push({ nodes: chain, isTrunk, baseRadius });
    }
  }

  traceChain([rootNode], true);
  return chains;
}

/**
 * Builds a 100% seamless, welded BufferGeometry for the entire tree (trunk + all branches)
 * using continuous Parallel Transport frames along each branch chain.
 *
 * Guaranteed outcomes:
 * 1. Zero gaps/slits between segments: rings are shared and welded along each chain.
 * 2. Zero peeling ribbon flaps at the base: buttress root fluting is radial on the solid welded trunk.
 */
/**
 * The one radius that represents a whole chain, weighted by lateral surface
 * area (which goes as r * length) rather than plainly averaged.
 *
 * The bark shader turns this into a ridge count that must be CONSTANT along the
 * chain, so every surface that wants to look like the same piece of wood has to
 * agree on it exactly - the trunk mesh and the fork junction that sits on it,
 * for instance. It lives here, exported, because the last time two call sites
 * each had their own version of this formula they drifted apart and the ridges
 * stopped lining up.
 *
 * A plain average is wrong for a tapered branch: most of its visible surface is
 * at the thick end, but the mean is dragged down by the thin tip and yields too
 * few ridges for what you actually see.
 */
export function chainRepresentativeRadius(nodes: SCANode[], radii?: number[]): number {
  const r = radii ?? nodes.map((n) => Math.max(0.025, n.radius));
  let areaWeight = 0;
  let radiusSum = 0;
  for (let i = 1; i < nodes.length; i++) {
    const segLen = nodes[i].position.distanceTo(nodes[i - 1].position);
    const rMid = (r[i] + r[i - 1]) * 0.5;
    const w = segLen * rMid;
    radiusSum += rMid * w;
    areaWeight += w;
  }
  return areaWeight > 1e-6 ? radiusSum / areaWeight : Math.max(0.03, r[0] ?? 0.03);
}

/**
 * Cleans a stem path traced through the SCA graph before a thick tube is swept
 * along it (the palm trunk, the cactus column and its arms).
 *
 * Those stems are traced by always taking the highest child, all the way to a
 * leaf. Near the leaf the colonisation front chases whatever attractors are
 * left, so the last few nodes often hook sideways or even turn down. Swept at a
 * radius larger than the node spacing, any turn tighter than the radius folds
 * the tube through itself: the kinked, pinched top of a palm, the lopsided knob
 * on a cactus arm. So:
 *
 *  1. the wandering tip is cut off: from `startIndex` (and never inside the
 *     first `protectFraction` of the path) the first step that heads below
 *     `minUp` or turns more than `maxTurnDeg` away from the recent heading
 *     ends the stem;
 *  2. the rest is resampled at an even spacing;
 *  3. it is relaxed (Laplacian, ends pinned) only until no bend of the swept
 *     tube is tighter than about 1.3x its radius - a gentle curve is left
 *     exactly as it was.
 */
export function cleanStemPath(
  points: THREE.Vector3[],
  opts: {
    radius: number;
    minUp?: number;
    maxTurnDeg?: number;
    protectFraction?: number;
    startIndex?: number;
  }
): THREE.Vector3[] {
  if (points.length < 3) return points;
  const minUp = opts.minUp ?? 0.3;
  const maxTurn = THREE.MathUtils.degToRad(opts.maxTurnDeg ?? 40);
  const n = points.length;

  // 1. trim the wandering tip
  let cut = n;
  const first = Math.max(2, Math.ceil(n * (opts.protectFraction ?? 0.5)), opts.startIndex ?? 0);
  const d = new THREE.Vector3();
  const ref = new THREE.Vector3();
  for (let i = first; i < n; i++) {
    d.subVectors(points[i], points[i - 1]);
    if (d.lengthSq() < 1e-10) continue;
    d.normalize();
    ref.subVectors(points[i - 1], points[Math.max(0, i - 4)]);
    if (ref.lengthSq() < 1e-10) continue;
    ref.normalize();
    if (d.y < minUp || d.angleTo(ref) > maxTurn) {
      cut = i;
      break;
    }
  }
  const kept = points.slice(0, Math.max(3, cut));

  // 2. even resampling
  const curve = new THREE.CatmullRomCurve3(kept, false, 'centripetal');
  const length = curve.getLength();
  if (length < 1e-4) return kept;
  const step = Math.max(0.05, Math.min(opts.radius * 0.6, length / 8));
  const count = Math.max(8, Math.ceil(length / step));
  let pts = curve.getSpacedPoints(count);
  const actualStep = length / count;

  // 3. relax until the tightest bend is no tighter than the tube allows. The
  // margin is on the POLYLINE: the Catmull-Rom the generators pass through
  // these points gathers each vertex's turn into a shorter arc, bending about
  // 1.7x tighter, so 2.2x here keeps the swept tube at about 1.3x its radius.
  const maxTurnPerStep = actualStep / (2.2 * Math.max(0.02, opts.radius));
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let iter = 0; iter < 200; iter++) {
    let worst = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      a.subVectors(pts[i], pts[i - 1]);
      b.subVectors(pts[i + 1], pts[i]);
      if (a.lengthSq() > 1e-10 && b.lengthSq() > 1e-10) worst = Math.max(worst, a.angleTo(b));
    }
    if (worst <= maxTurnPerStep) break;
    const next = pts.map((p) => p.clone());
    for (let i = 1; i < pts.length - 1; i++) {
      next[i].copy(pts[i]).multiplyScalar(0.5).addScaledVector(pts[i - 1], 0.25).addScaledVector(pts[i + 1], 0.25);
    }
    pts = next;
  }
  return pts;
}

/**
 * Ring frame for a trunk that has to stand on the ground.
 *
 * A swept tube's rings are perpendicular to its path, so on a leaning trunk the
 * first ring is tilted by the lean: one side digs into the ground and the other
 * lifts clear of it, leaving the trunk visibly floating on that side (up to
 * ~0.8 m on a strongly leaning palm). The base ring is made horizontal instead
 * - and sunk a few centimetres so no seam shows - and the frame eases back to
 * the path's own over `blendLength` metres, so the trunk still leans exactly as
 * before above its foot. The ring angle keeps its meaning (the normal is only
 * re-projected), so bark texturing is unaffected.
 */
export function groundedRingFrame(
  center: THREE.Vector3,
  tangent: THREE.Vector3,
  normal: THREE.Vector3,
  binormal: THREE.Vector3,
  distanceFromBase: number,
  blendLength: number,
  sink = 0.06
): { center: THREE.Vector3; normal: THREE.Vector3; binormal: THREE.Vector3 } {
  const x = THREE.MathUtils.clamp(distanceFromBase / Math.max(1e-4, blendLength), 0, 1);
  const s = x * x * (3 - 2 * x);
  if (s >= 1) return { center, normal, binormal };

  const axis = new THREE.Vector3(0, 1, 0).lerp(tangent.clone().normalize(), s).normalize();
  let n = normal.clone().addScaledVector(axis, -normal.dot(axis));
  if (n.lengthSq() < 1e-8) {
    // normal ran along the axis: rebuild it from the binormal instead
    n = new THREE.Vector3().crossVectors(binormal, axis);
  }
  n.normalize();
  // same handedness as three's Frenet frames (B = T x N)
  const b = new THREE.Vector3().crossVectors(axis, n).normalize();
  const c = center.clone();
  c.y -= (1 - s) * sink;
  return { center: c, normal: n, binormal: b };
}

/**
 * The radii a chain is actually rendered with.
 *
 * The pipe model is evaluated at discrete SCA nodes. At a major fork its
 * mathematically correct radius can fall sharply in a single growth step,
 * which renders as a cut shoulder. Spread that taper across consecutive
 * trunk rings; branch radii and topology remain untouched.
 *
 * Exported so that anything deriving bark parameters from the trunk (the fork
 * junction) feeds chainRepresentativeRadius the very same numbers the trunk
 * mesh did - raw node radii give a slightly different figure, and at some
 * seeds that is enough to round to another ridge count.
 */
export function chainRenderedRadii(chain: TreeChain, isSwampTree = false): number[] {
  const renderedRadii = chain.nodes.map((node) => Math.max(0.025, node.radius));
  if (chain.isTrunk && !isSwampTree) {
    const maxTaperPerStep = 1.28;
    for (let i = 1; i < renderedRadii.length; i++) {
      renderedRadii[i] = Math.max(renderedRadii[i], renderedRadii[i - 1] / maxTaperPerStep);
    }
  }
  return renderedRadii;
}

export interface ChainFrames {
  tangents: THREE.Vector3[];
  frames: { u: THREE.Vector3; v: THREE.Vector3 }[];
}

/**
 * Smooth tangents plus rotation-minimising (parallel transported) frames along
 * a chain of nodes.
 *
 * Exported because the frame fixes where angle 0 sits around the wood, and the
 * bark's ridges are laid out from that angle. Anything that wants to texture a
 * surface consistently with the trunk - the fork junction, for instance - has
 * to use the SAME frame, or its ridges land at a different phase and the patch
 * reads as belonging to another tree.
 */
export function computeChainFrames(nodes: SCANode[], seedU?: THREE.Vector3): ChainFrames {
  const tangents: THREE.Vector3[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (i === 0) {
      tangents.push(nodes[1].position.clone().sub(nodes[0].position).normalize());
    } else if (i === nodes.length - 1) {
      tangents.push(nodes[i].position.clone().sub(nodes[i - 1].position).normalize());
    } else {
      const d1 = nodes[i].position.clone().sub(nodes[i - 1].position).normalize();
      const d2 = nodes[i + 1].position.clone().sub(nodes[i].position).normalize();
      const miter = d1.clone().add(d2);
      if (miter.lengthSq() < 0.001) {
        tangents.push(d2);
      } else {
        tangents.push(miter.normalize());
      }
    }
  }

  const frames: { u: THREE.Vector3; v: THREE.Vector3 }[] = [];
  let initialU: THREE.Vector3 | null = null;

  // Continue the parent's frame when one is handed in: take its reference
  // direction and strip off whatever component runs along this chain, so the
  // phase carries over instead of restarting arbitrarily.
  if (seedU) {
    const candidate = seedU.clone();
    candidate.sub(tangents[0].clone().multiplyScalar(candidate.dot(tangents[0])));
    if (candidate.lengthSq() > 1e-6) initialU = candidate.normalize();
  }

  if (!initialU) {
    initialU = new THREE.Vector3().crossVectors(tangents[0], new THREE.Vector3(0, 1, 0));
    if (initialU.lengthSq() < 0.001) {
      initialU = new THREE.Vector3().crossVectors(tangents[0], new THREE.Vector3(1, 0, 0));
    }
    initialU.normalize();
  }
  const initialV = new THREE.Vector3().crossVectors(tangents[0], initialU).normalize();
  frames.push({ u: initialU, v: initialV });

  for (let i = 1; i < nodes.length; i++) {
    const prevT = tangents[i - 1];
    const currT = tangents[i];
    const prevU = frames[i - 1].u.clone();

    const rotAxis = new THREE.Vector3().crossVectors(prevT, currT);
    if (rotAxis.lengthSq() > 1e-6) {
      const angle = prevT.angleTo(currT);
      rotAxis.normalize();
      prevU.applyAxisAngle(rotAxis, angle);
    }
    prevU.sub(currT.clone().multiplyScalar(prevU.dot(currT))).normalize();
    const currV = new THREE.Vector3().crossVectors(currT, prevU).normalize();
    frames.push({ u: prevU, v: currV });
  }

  return { tangents, frames };
}

export function buildFullTreeGeometry(
  rootNode: SCANode,
  radialSegments = 16,
  rootSpread = 1.0,
  trunkTwist = 0.5,
  isSwampTree = false
): THREE.BufferGeometry {
  const chains = extractTreeChains(rootNode);
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  // (ring radius, arc length) in metres, so the bark shader can lay out a
  // texel grid in world units instead of in UV space
  const woodInfo: number[] = [];
  // (cos, sin) of the ring angle. The bark shader reconstructs the azimuth from
  // this instead of from uv.x, so any mesh that can supply the angle - even one
  // whose triangles straddle the 0/1 seam, like the convex fork junction - gets
  // a continuous angle with no wrap artefact.
  const barkAngle: number[] = [];
  const indices: number[] = [];

  let vertOffset = 0;

  // Each branch chain starts at a node it SHARES with its parent chain. If every
  // chain restarts its parallel transport from scratch, that shared node ends up
  // with two unrelated "angle zero" directions, so the bark ridges on a branch
  // sit at an arbitrary phase against the ones on the trunk and the fork reads
  // as two different pieces of wood. Processing parents first and seeding each
  // chain from its parent's frame at that shared node carries the phase across
  // every fork.
  const orderedChains = [...chains].sort(
    (a, b) => (a.nodes[0].depth ?? 0) - (b.nodes[0].depth ?? 0)
  );
  const frameByNode = new Map<number, THREE.Vector3>();
  const alongByNode = new Map<number, number>();

  for (const chain of orderedChains) {
    const nodes = chain.nodes;
    if (nodes.length < 2) continue;

    // Use higher radial resolution for the main trunk to ensure smooth root fluting
    const segs = chain.isTrunk ? Math.max(18, radialSegments) : radialSegments;

    const renderedRadii = chainRenderedRadii(chain, isSwampTree);

    // One representative radius for the WHOLE chain. The bark shader turns this
    // into a lobe count, and it has to be constant along the branch: deriving
    // it from each ring's own radius makes the count step as the trunk tapers,
    // and every step re-phases the lobes, so the ridges break and jump sideways
    // instead of running unbroken from root to tip. With a fixed count the
    // ridges simply narrow as the wood narrows, which is what real bark does.
    const chainMeanRadius = chainRepresentativeRadius(nodes, renderedRadii);

    // 1-2. Tangents and rotation-minimising frames along the chain, seeded from
    // the parent chain's frame at the node they share.
    const { tangents, frames: normalFrames } = computeChainFrames(
      nodes,
      frameByNode.get(nodes[0].id)
    );
    for (let i = 0; i < nodes.length; i++) {
      if (!frameByNode.has(nodes[i].id)) frameByNode.set(nodes[i].id, normalFrames[i].u.clone());
    }

    // 3. Generate smooth, connected rings of vertices for each node
    const chainStartVert = vertOffset;
    // Arc length carries on from the parent chain at the shared node, for the
    // same reason as the frame above: the bark's texel rows and the slow drift
    // of its ridges are laid out along it, so restarting it at zero on every
    // branch shifts the whole pattern sideways at every fork.
    const chainStartAlong = alongByNode.get(nodes[0].id) ?? 0;
    let accumulatedLength = chainStartAlong;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (i > 0) {
        accumulatedLength += node.position.distanceTo(nodes[i - 1].position);
      }
      if (!alongByNode.has(node.id)) alongByNode.set(node.id, accumulatedLength);

      let r = renderedRadii[i];
      if (i === 0 && chain.baseRadius) {
        r = Math.max(0.04, chain.baseRadius);
      }

      const frame = normalFrames[i];
      // Flared buttress roots on the solid trunk base near the ground
      const isTrunkBase = chain.isTrunk && node.position.y < 2.5;
      const groundFactor = isTrunkBase ? Math.pow(Math.max(0, 1.0 - node.position.y / 2.5), 2.0) : 0;

      // Radius of this ring in metres, for the bark shader: u spans the
      // circumference exactly once whatever the girth, so without a real radius
      // the bark texels come out three times wider at the base than at the top.
      //
      // Deliberately the NOMINAL radius, excluding the buttress flare. The
      // shader turns this into a whole number of bark lobes, and the flare
      // balloons over just a couple of rings - feeding it in would change that
      // count from ring to ring, re-phasing the lobes each time and laying a
      // staircase of bricks across the root. Holding the count through the
      // flare instead lets the lobes widen into the buttress, which is what
      // roots actually do.
      const ringRadius = r;

      for (let j = 0; j <= segs; j++) {
        const frac = j / segs;
        const angle = frac * Math.PI * 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // Smooth radial fluting at trunk base
        let flute = 1.0;
        if (isTrunkBase) {
          flute += rootSpread * groundFactor * (0.55 + 0.3 * Math.cos(angle * 4.0 + trunkTwist * 2.0));
        }

        const effectiveR = r * flute;
        const nX = frame.u.x * cosA + frame.v.x * sinA;
        const nY = frame.u.y * cosA + frame.v.y * sinA;
        const nZ = frame.u.z * cosA + frame.v.z * sinA;

        let pX = node.position.x + nX * effectiveR;
        let pY = node.position.y + nY * effectiveR;
        let pZ = node.position.z + nZ * effectiveR;

        // Ensure bottom ring at y = 0 anchors smoothly into the ground
        if (chain.isTrunk && i === 0) {
          pY = Math.min(-0.06, pY);
        }

        positions.push(pX, pY, pZ);
        normals.push(nX, nY, nZ);
        uvs.push(frac, accumulatedLength * 0.4);
        woodInfo.push(ringRadius, accumulatedLength, chainMeanRadius);
        barkAngle.push(cosA, sinA);
        vertOffset++;
      }
    }

    // 4. Connect adjacent rings with welded quad faces
    const vertsPerRing = segs + 1;
    for (let i = 0; i < nodes.length - 1; i++) {
      const ring1Start = chainStartVert + i * vertsPerRing;
      const ring2Start = chainStartVert + (i + 1) * vertsPerRing;

      for (let j = 0; j < segs; j++) {
        const a = ring1Start + j;
        const b = ring2Start + j;
        const c = ring2Start + (j + 1);
        const d = ring1Start + (j + 1);

        indices.push(a, d, b);
        indices.push(b, d, c);
      }
    }

    // 5. Clean tip cap for branch ends
    const tipIndex = chainStartVert + (nodes.length - 1) * vertsPerRing;
    const tipPos = nodes[nodes.length - 1].position;
    const tipNorm = tangents[tangents.length - 1];
    positions.push(tipPos.x, tipPos.y, tipPos.z);
    normals.push(tipNorm.x, tipNorm.y, tipNorm.z);
    uvs.push(0.5, (accumulatedLength + 0.05) * 0.4);
    woodInfo.push(Math.max(0.02, renderedRadii[nodes.length - 1]), accumulatedLength + 0.05, chainMeanRadius);
    barkAngle.push(1, 0);
    const tipCenterVert = vertOffset;
    vertOffset++;

    for (let j = 0; j < segs; j++) {
      indices.push(tipIndex + j, tipIndex + j + 1, tipCenterVert);
    }

    // 6. Solid bottom cap for the trunk base (eliminates hollow opening under ground)
    if (chain.isTrunk) {
      const bottomCenterPos = nodes[0].position.clone();
      bottomCenterPos.y = -0.08;
      positions.push(bottomCenterPos.x, bottomCenterPos.y, bottomCenterPos.z);
      normals.push(0, -1, 0);
      uvs.push(0.5, chainStartAlong * 0.4);
      woodInfo.push(Math.max(0.02, renderedRadii[0]), chainStartAlong, chainMeanRadius);
      barkAngle.push(1, 0);
      const bottomCenterVert = vertOffset;
      vertOffset++;

      const bottomRingStart = chainStartVert;
      for (let j = 0; j < segs; j++) {
        indices.push(bottomCenterVert, bottomRingStart + j + 1, bottomRingStart + j);
      }
    }
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aWood', new THREE.Float32BufferAttribute(woodInfo, 3));
  geo.setAttribute('aBarkAngle', new THREE.Float32BufferAttribute(barkAngle, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}
