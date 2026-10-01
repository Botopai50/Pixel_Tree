import React from 'react';
import { GroundPropConfig, TreeConfig, TreeSpecies, OreKind } from '../types';
import { ROCK_BIOMES } from '../constants/rockBiomes';
import { PROP_LABELS } from '../constants/groundProps';
import { TREE_PRESETS } from '../constants/presets';
import { ORE_STYLES } from '../services/oreSystem';

export function GroundPropControls({config,onUpdate,onSelect}: {config:TreeConfig;onUpdate:(updater:(prev:TreeConfig)=>TreeConfig)=>void;onSelect:(species:TreeSpecies)=>void}) {
  const prop=config.prop!;
  const update=(patch:Partial<GroundPropConfig>)=>onUpdate(prev=>({...prev,prop:{...prev.prop!,...patch}}));
  const input='w-full rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-2 text-stone-100';
  const slider=(key:'count'|'size'|'spread'|'density',label:string,min:number,max:number,step:number)=> <label className="block space-y-1.5" htmlFor={`prop-${key}`}>
    <span className="flex justify-between text-stone-300"><span>{label}</span><b className="font-mono text-amber-200">{step===1?prop[key]:prop[key].toFixed(2)}{key==='size'||key==='spread'?'m':''}</b></span>
    <input id={`prop-${key}`} type="range" className="w-full accent-amber-400" min={min} max={max} step={step} value={prop[key]} onChange={e=>update({[key]:Number(e.target.value)})}/>
  </label>;
  return <div className="space-y-4">
    <section className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-3">
      <h2 className="font-semibold text-amber-200">{PROP_LABELS[prop.kind]} de {ROCK_BIOMES[prop.biome].name}</h2>
      <p className="text-stone-400">{prop.kind==='flowers'?'Flores em pequenos grupos, com pétalas e folhas dobradas em 3D.':prop.kind==='crystals'?'Formações independentes com faces pintadas e brilhos em cruz pixelados.':'Folhas secas dobradas e sobrepostas em montinhos irregulares.'}</p>
      <label className="block space-y-1" htmlFor="prop-biome"><span>Bioma</span><select id="prop-biome" className={input} value={prop.biome} onChange={e=>onSelect(`${e.target.value}_${prop.kind}` as TreeSpecies)}>{Object.entries(ROCK_BIOMES).map(([key,b])=><option key={key} value={key}>{b.name}</option>)}</select></label>
    </section>
    <section className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 space-y-3">
      <h3 className="font-semibold text-amber-200">Geração procedural</h3>
      <label className="block space-y-1" htmlFor="prop-seed"><span>Semente</span><input id="prop-seed" className={input} type="number" min={0} max={999999} value={config.seed} onChange={e=>onUpdate(prev=>({...prev,seed:Math.max(0,Math.min(999999,Math.floor(Number(e.target.value))))}))}/></label>
      <button className="w-full p-2 rounded-lg bg-amber-500/20 text-amber-200 cursor-pointer" onClick={()=>onUpdate(prev=>({...prev,seed:Math.floor(Math.random()*90000)+1000}))}>Sortear variação</button>
      {slider('count',prop.kind==='leaves'?'Quantidade de montinhos':'Quantidade de grupos',0,16,1)}
      {slider('size',prop.kind==='flowers'?'Altura das flores':prop.kind==='crystals'?'Tamanho dos cristais':'Tamanho dos montinhos',.15,1.2,.05)}
      {slider('spread','Dispersão',.1,2.5,.05)}
      {slider('density',prop.kind==='leaves'?'Densidade de folhas':prop.kind==='flowers'?'Densidade de flores':'Densidade de cristais',0,1,.05)}
      {prop.kind==='flowers'&&<label className="block space-y-1" htmlFor="prop-shape"><span>Formato das flores</span><select id="prop-shape" className={input} value={prop.flowerShape} onChange={e=>update({flowerShape:e.target.value as GroundPropConfig['flowerShape']})}><option value="daisy">Margarida</option><option value="poppy">Papoula</option><option value="bell">Campânula</option><option value="star">Estrelada</option></select></label>}
      {prop.kind==='crystals'?<label className="block space-y-1" htmlFor="prop-crystal"><span>Tipo de cristal</span><select id="prop-crystal" className={input} value={prop.crystal} onChange={e=>update({crystal:e.target.value as OreKind})}>{(['quartz','amethyst','emerald','ruby','sapphire','diamond'] as const).map(key=><option key={key} value={key}>{ORE_STYLES[key].name}</option>)}</select></label>:<label className="block space-y-1" htmlFor="prop-color"><span>{prop.kind==='flowers'?'Cor das pétalas':'Cor das folhas'}</span><input id="prop-color" type="color" className={`${input} h-10`} value={prop.color} onChange={e=>update({color:e.target.value})}/></label>}
      <label className="block space-y-1" htmlFor="prop-pixels"><span>Tamanho dos pixels</span><input id="prop-pixels" type="range" className="w-full accent-amber-400" min={1} max={4} step={1} value={config.pixelSize??2} onChange={e=>onUpdate(prev=>({...prev,pixelSize:Number(e.target.value)}))}/></label>
      <button className="w-full p-2 rounded-lg border border-stone-700 text-stone-300 cursor-pointer" onClick={()=>onUpdate(prev=>({...TREE_PRESETS[config.species],seed:prev.seed}))}>Restaurar padrão do bioma</button>
    </section>
    <p className="text-xs text-stone-500">A exportação OBJ inclui a geometria 3D. A captura PNG preserva as cores e a pintura pixelada.</p>
  </div>;
}
