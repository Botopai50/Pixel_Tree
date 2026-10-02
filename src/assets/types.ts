import * as THREE from 'three';
import type { TreeConfig,TreeSpecies } from '../types';
import type { FellInfo } from '../services/treeGenerator';
import type { StructureAssetConfig,StructureId } from '../structures/types';
export type AssetConfig=TreeConfig|StructureAssetConfig;
export type AssetId=TreeSpecies|StructureId;
export type AssetCategory='adult'|'sapling'|'shrub'|'log'|'plant'|'rock'|'ore'|'gravel'|'crystals'|'leaves'|'structure';
export const isStructure=(config:AssetConfig):config is StructureAssetConfig=>'structure' in config;
export interface AssetInstance {group:THREE.Group;assetGroup:THREE.Group;bounds:THREE.Box3;update:(time:number)=>void;dispose:()=>void;canFell:boolean;fell?:()=>FellInfo|null;setCutaway?:(enabled:boolean)=>void;}
