import React from 'react';
import { Mountain, Dices, RotateCcw } from 'lucide-react';
import { OreKind, RockConfig, RockShape, TreeConfig, TreeSpecies } from '../types';
import { ROCK_BIOMES } from '../constants/rockBiomes';
import { TREE_PRESETS } from '../constants/presets';
import { ORE_STYLES } from '../services/oreSystem';

interface Props {
  config: TreeConfig;
  onUpdate: (updater: (prev: TreeConfig) => TreeConfig) => void;
  onSelect: (species: TreeSpecies) => void;
}
const inputClass = 'w-full rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-2 text-stone-100 focus:outline-none focus:border-amber-400';
function Slider({ id, label, value, min, max, step = 0.05, unit = '', onChange }: {
  id: string; label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void;
}) {
  return <label htmlFor={id} className="block space-y-1.5">
    <span className="flex justify-between text-stone-300"><span>{label}</span><b className="font-mono text-amber-200">{step >= 1 ? value : value.toFixed(2)}{unit}</b></span>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-amber-400 cursor-pointer" />
  </label>;
}

export function RockControls({ config, onUpdate, onSelect }: Props) {
  const rock = { mushroomCount: 6, mushroomSize: 0.38, oreCount: 6, oreSize: 0.3, gravel: false, gravelCount: 6, gravelSize: 0.18, gravelSpread: 0.8, ...config.rock! };
  const biome = ROCK_BIOMES[rock.biome];
  const update = (patch: Partial<RockConfig>) => onUpdate(prev => ({
    ...prev, rock: { ...prev.rock!, ...patch },
    trunkHeight: patch.height ?? prev.trunkHeight,
    mossAmount: patch.moss ?? prev.mossAmount,
    snowCover: patch.snow ?? prev.snowCover,
  }));
  const slider = (key: keyof RockConfig, label: string, min: number, max: number, step = 0.05, unit = '') =>
    <Slider id={`rock-${key}`} label={label} value={rock[key] as number} min={min} max={max} step={step} unit={unit} onChange={value => update({ [key]: value })} />;
  return <div className="space-y-4">
    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
      <h2 className="flex items-center gap-2 font-semibold text-amber-200"><Mountain className="w-4 h-4" />{rock.gravel ? 'Pedrinhas e cascalho' : rock.ore ? 'Pedras com minérios' : 'Pedras'} de {biome.name}</h2>
      <p className="text-stone-400 leading-relaxed">{rock.gravel ? 'Pequenos grupos independentes de pedras, com tamanhos variados e a paleta deste bioma.' : biome.description}</p>
      <label htmlFor="rock-biome" className="block space-y-1"><span className="text-stone-300">Bioma</span>
        <select id="rock-biome" className={inputClass} value={rock.biome} onChange={e => onSelect(`${e.target.value}_${rock.gravel ? 'gravel' : rock.ore ? 'ore' : 'rock'}` as TreeSpecies)}>
          {Object.entries(ROCK_BIOMES).map(([key, preset]) => <option key={key} value={key}>{preset.name}</option>)}
        </select>
      </label>
    </div>
    {rock.ore && <section className="p-3 rounded-xl bg-orange-950/25 border border-orange-700/40 space-y-3">
      <h3 className="font-semibold text-orange-200">Depósitos de minério</h3>
      <label htmlFor="rock-ore" className="block space-y-1"><span className="text-stone-300">Tipo de minério</span>
        <select id="rock-ore" className={inputClass} value={rock.ore} onChange={e => update({ ore: e.target.value as OreKind })}>
          {Object.entries(ORE_STYLES).map(([key, style]) => <option key={key} value={key}>{style.name}</option>)}
        </select>
      </label>
      <p className="text-[11px] text-stone-400">{ORE_STYLES[rock.ore].description}</p>
      {slider('oreCount', 'Quantidade de depósitos', 0, 24, 1)}
      {slider('oreSize', 'Tamanho do minério', 0.1, 0.8, 0.02, 'm')}
    </section>}
    <section className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 space-y-3">
      <h3 className="font-semibold text-amber-200">Semente procedural</h3>
      <div className="flex gap-2">
        <input id="rock-seed" aria-label="Semente das pedras" type="number" min={0} max={999999} value={config.seed} className={inputClass} onChange={e => {
          const seed = Math.min(999999, Math.max(0, Math.floor(Number(e.target.value))));
          onUpdate(prev => ({ ...prev, seed }));
        }} />
        <button id="rock-randomize" className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 cursor-pointer" title="Sortear pedras" onClick={() => onUpdate(prev => ({ ...prev, seed: Math.floor(Math.random() * 90000) + 1000 }))}><Dices className="w-4 h-4" /></button>
      </div>
    </section>
    {!rock.gravel && <section className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 space-y-3">
      <h3 className="font-semibold text-amber-200">Forma e composição</h3>
      <label htmlFor="rock-shape" className="block space-y-1"><span className="text-stone-300">Formato</span>
        <select id="rock-shape" className={inputClass} value={rock.shape} onChange={e => {
          const shape = e.target.value as RockShape;
          update({ shape, count: shape === 'cluster' ? Math.max(3, rock.count) : rock.count });
        }}>
          <option value="boulder">Rochosa — bloco natural</option><option value="slab">Laje — faces achatadas</option>
          <option value="spire">Formação alta — desgastada</option><option value="cluster">Conjunto de rochas</option>
        </select>
      </label>
      {slider('width', 'Largura', 0.3, 8, 0.1, 'm')}
      {slider('height', 'Altura', 0.2, 8, 0.1, 'm')}
      {slider('depth', 'Profundidade', 0.3, 8, 0.1, 'm')}
      {slider('irregularity', 'Irregularidade', 0, 1)}
      {slider('detail', 'Detalhe das faces', 0, 2, 1)}
      {slider('count', 'Quantidade de pedras', 1, 12, 1)}
      {rock.count > 1 && slider('spread', 'Dispersão', 0, 6, 0.1, 'm')}
    </section>}
    {rock.gravel && <section className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 space-y-3">
      <h3 className="font-semibold text-amber-200">Pedrinhas e cascalho</h3>
        {slider('gravelCount', 'Grupos de pedrinhas', 0, 16, 1)}
        {slider('gravelSize', 'Tamanho das pedrinhas', 0.06, 0.4, 0.02, 'm')}
        {slider('gravelSpread', 'Dispersão do cascalho', 0.1, 2.5, 0.1, 'm')}
    </section>}
    <section className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 space-y-3">
      <h3 className="font-semibold text-amber-200">Superfície pintada</h3>
      <div className="grid grid-cols-2 gap-3">
        <label htmlFor="rock-color" className="space-y-1"><span className="block text-stone-300">Cor da pedra</span><input id="rock-color" type="color" value={rock.color} onChange={e => update({ color: e.target.value })} className="w-full h-8 rounded cursor-pointer bg-stone-800" /></label>
        <label htmlFor="rock-mossColor" className="space-y-1"><span className="block text-stone-300">Musgo / líquen</span><input id="rock-mossColor" type="color" value={rock.mossColor} onChange={e => update({ mossColor: e.target.value })} className="w-full h-8 rounded cursor-pointer bg-stone-800" /></label>
      </div>
      {slider('moss', 'Cobertura de musgo', 0, 1)}
      {slider('snow', 'Cobertura de neve', 0, 1)}
      {slider('cracks', 'Fissuras', 0, 1)}
      <Slider id="rock-pixelSize" label="Tamanho dos pixels" value={config.pixelSize ?? 2} min={1} max={5} step={1} onChange={pixelSize => onUpdate(prev => ({ ...prev, pixelSize }))} />
      <Slider id="rock-paletteSteps" label="Tons da paleta" value={config.paletteSteps ?? 6} min={4} max={9} step={1} onChange={paletteSteps => onUpdate(prev => ({ ...prev, paletteSteps }))} />
      <Slider id="rock-textureLightAzimuth" label="Direção da luz pintada" value={config.textureLightAzimuth ?? 135} min={0} max={360} step={5} unit="°" onChange={textureLightAzimuth => onUpdate(prev => ({ ...prev, textureLightAzimuth }))} />
    </section>
    {!rock.gravel && <section className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 space-y-3">
      <h3 className="font-semibold text-amber-200">Cogumelos nas pedras</h3>
      <label htmlFor="rock-mushrooms" className="flex items-center justify-between text-stone-300 cursor-pointer">
        <span>Crescer junto ao musgo</span>
        <input id="rock-mushrooms" type="checkbox" checked={rock.mushrooms ?? false} onChange={e => update({ mushrooms: e.target.checked })} className="accent-amber-400" />
      </label>
      {rock.mushrooms && <>
        {slider('mushroomCount', 'Grupos de cogumelos', 0, 24, 1)}
        {slider('mushroomSize', 'Tamanho dos cogumelos', 0.12, 0.8, 0.02, 'm')}
        <p className="text-[11px] text-stone-400">Surgem em trechos úmidos e expostos. A neve e o espaço disponível limitam a quantidade.</p>
      </>}
    </section>}
    <button id="rock-reset" className="w-full py-2 rounded-lg border border-stone-700 bg-stone-800 hover:bg-stone-700 flex justify-center items-center gap-2 text-stone-200 cursor-pointer" onClick={() => onUpdate(prev => ({ ...TREE_PRESETS[prev.species], rock: { ...TREE_PRESETS[prev.species].rock! }, seed: prev.seed }))}><RotateCcw className="w-3.5 h-3.5" />Restaurar padrão do bioma</button>
    <p className="text-[11px] text-stone-500 leading-relaxed">A exportação OBJ inclui a geometria {rock.gravel ? 'das pedrinhas e do cascalho' : 'das pedras'}{rock.ore ? ' e dos minérios' : ''}. Cores e texturas aparecem na captura PNG.</p>
  </div>;
}
