import type {StructureKind} from './types';
export function structureCapabilities(type:StructureKind){return {
 floors:['house','largeHouse','abandonedHouse','ruinedHouse','mansion','castle','ruinedCastle','village','snowy','windmill'].includes(type),
 windows:!['bridge','dock','camp','wall','watchtower','ruinedTower','stable','ancientRuins','mine'].includes(type),
 roof:!['bridge','dock','camp','wall','watchtower','ruinedTower','lighthouse','underground','mine'].includes(type),
 minFloors:['largeHouse','mansion','windmill'].includes(type)?2:1,
};}
