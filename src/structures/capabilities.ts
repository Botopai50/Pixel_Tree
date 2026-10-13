import type {StructureKind} from './types';
export function structureCapabilities(type:StructureKind){return {
 floors:['house','largeHouse','abandonedHouse','ruinedHouse','mansion','castle','ruinedCastle','snowy','windmill'].includes(type),
 windows:!['stoneLantern','bridge','dock','camp','wall','watchtower','ruinedTower','stable','ancientRuins','mine'].includes(type),
 roof:!['stoneLantern','bridge','dock','camp','wall','watchtower','ruinedTower','lighthouse','mine','snowy','temple','ancientRuins'].includes(type),
 minFloors:['largeHouse','mansion','windmill'].includes(type)?2:1,
};}
