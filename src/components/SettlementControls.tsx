import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Castle, Dices } from 'lucide-react';
import type { StructureAssetConfig } from '../structures/types';
import { isStructure } from '../assets/types';
import { ROCK_BIOMES } from '../constants/rockBiomes';
import type { RockBiome } from '../types';
import type { AssetPanelProps } from './StructureControls';
import { useIsMobile } from './useIsMobile';
import { DEFAULT_SETTLEMENT_SETTINGS, SettlementSettings } from '../settlements/types';
import { SETTLEMENT_TYPES } from '../settlements/kinds';

const KIND_LABEL: Record<string, string> = {
  hamlet: 'Vila pequena', village: 'Vilarejo', town: 'Cidade', fortifiedTown: 'Cidade fortificada',
};
const KIND_TEXT: Record<string, string> = {
  hamlet: 'Poucas casas, caminhos simples e construções rurais.',
  village: 'Praça central, comércio, casas ao longo de ruas interligadas.',
  town: 'Bairros, ruas principais e secundárias, mercado e anel viário.',
  fortifiedTown: 'Castelo, muralhas, torres, portões e bairros dentro e fora dos muros.',
};

/**
 * Settings of the settlement generator (src/settlements). The scene is rebuilt
 * when "Gerar" is pressed, not on every slider tick: a town is a lot to build.
 */
export function SettlementControls(props: AssetPanelProps & { treeConfig: StructureAssetConfig }) {
  const asset = props.treeConfig;
  const mobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(mobile);
  useEffect(() => setCollapsed(mobile), [mobile]);
  useEffect(() => {
    props.onMobileSheetChange?.(mobile && !collapsed);
    props.onDesktopPanelChange?.(!mobile && !collapsed);
  }, [mobile, collapsed]);

  const applied: SettlementSettings = { ...DEFAULT_SETTLEMENT_SETTINGS, ...(asset.structure.settlement ?? {}) };
  const [draft, setDraft] = useState<SettlementSettings>(applied);
  const [seed, setSeed] = useState(asset.seed);
  useEffect(() => { setDraft(applied); setSeed(asset.seed); }, [asset.species, asset.seed, asset.structure.settlement]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied) || seed !== asset.seed;

  const apply = (nextSeed = seed, patch: Partial<SettlementSettings> = {}) =>
    props.onUpdateTreeConfig((prev) => isStructure(prev)
      ? { ...prev, seed: nextSeed, structure: { ...prev.structure, settlement: { ...draft, ...patch } } }
      : prev);

  const field = 'w-full rounded-lg border border-stone-700 bg-stone-900 px-2 py-2 text-stone-100';
  const slider = (key: 'size' | 'density' | 'frequency', label: string, min: number, max: number, step: number, fmt: (v: number) => string) => (
    <label className="block space-y-1">
      <span className="flex justify-between"><span>{label}</span><b className="text-amber-200">{fmt(draft[key])}</b></span>
      <input id={'settlement-' + key} type="range" min={min} max={max} step={step} value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })} className="w-full" />
    </label>
  );

  return (
    <>
      {mobile && collapsed && (
        <button id="btn-open-panel-mobile" className="fixed right-3 bottom-[9.5rem] z-20 px-4 py-2 rounded-full bg-sky-700 text-white cursor-pointer" onClick={() => setCollapsed(false)}>Ajustar</button>
      )}
      <div id="botw-control-panel-wrapper" className={mobile ? 'fixed inset-x-0 bottom-0 z-30 h-[62dvh] transition-transform ' + (collapsed ? 'translate-y-full pointer-events-none' : '') : 'fixed right-4 top-20 bottom-4 z-20 flex items-start transition-transform ' + (collapsed ? 'translate-x-[calc(100%-2.5rem)]' : '')}>
        {!mobile && (
          <button id="btn-collapse-panel" onClick={() => setCollapsed(!collapsed)} className="h-12 px-2 bg-stone-900 text-stone-300 border border-stone-700 rounded-l-xl cursor-pointer">
            {collapsed ? <ChevronLeft /> : <ChevronRight />}
          </button>
        )}
        <div id="botw-control-panel" className={(mobile ? 'w-full rounded-t-2xl border-t' : 'w-96 rounded-r-xl rounded-bl-xl border') + ' h-full bg-stone-950/95 border-stone-700 text-stone-200 text-sm overflow-y-auto'}>
          <div className="p-3 space-y-3">
            <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-700/40 space-y-2">
              <h2 className="font-semibold text-sky-200 flex items-center gap-2"><Castle className="w-4 h-4" />{KIND_LABEL[asset.structure.type] ?? asset.name}</h2>
              <p className="text-stone-400">{KIND_TEXT[asset.structure.type]}</p>
              <label className="block space-y-1">
                <span>Tipo de assentamento</span>
                <select id="settlement-kind" className={field} value={asset.structure.type}
                  onChange={(e) => props.onSelectPreset(('structure_' + e.target.value) as never)}>
                  {SETTLEMENT_TYPES.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </select>
              </label>
              <label className="block space-y-1">
                <span>Bioma</span>
                <select id="settlement-biome" className={field} value={asset.structure.biome}
                  onChange={(e) => props.onUpdateTreeConfig((prev) => isStructure(prev) ? { ...prev, structure: { ...prev.structure, biome: e.target.value as RockBiome, snow: e.target.value === 'hebra_snowy' ? 0.65 : 0 } } : prev)}>
                  {Object.entries(ROCK_BIOMES).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                </select>
              </label>
            </div>
            <section className="p-3 space-y-3 bg-stone-900/60 rounded-xl border border-stone-800">
              <h3 className="font-semibold text-sky-200">Semente</h3>
              <div className="flex gap-2">
                <input id="settlement-seed" aria-label="Semente do assentamento" type="number" className={field} value={seed} onChange={(e) => setSeed(Math.floor(Number(e.target.value)) || 1)} />
                <button className="px-3 rounded-lg bg-stone-800 border border-stone-700 cursor-pointer" title="Sortear" onClick={() => { const s = Math.floor(Math.random() * 90000) + 1000; setSeed(s); apply(s); }}><Dices className="w-4 h-4" /></button>
              </div>
              <p className="text-stone-500">A mesma semente e as mesmas opções geram sempre o mesmo assentamento.</p>
            </section>
            <section className="p-3 space-y-3 bg-stone-900/60 rounded-xl border border-stone-800">
              <h3 className="font-semibold text-sky-200">Assentamento</h3>
              {slider('size', 'Tamanho', 0.6, 1.8, 0.05, (v) => '×' + v.toFixed(2))}
              {slider('density', 'Densidade de construções', 0.2, 1, 0.05, (v) => Math.round(v * 100) + '%')}
              {slider('frequency', 'Comércio, ofícios e adereços', 0, 1, 0.05, (v) => Math.round(v * 100) + '%')}
              <label className="flex justify-between"><span>Árvores nas áreas livres</span>
                <input id="settlement-trees" type="checkbox" checked={draft.trees} onChange={(e) => setDraft({ ...draft, trees: e.target.checked })} />
              </label>
              <label className="block space-y-1">
                <span>Terreno de teste</span>
                <select id="settlement-terrain" className={field} value={draft.terrainStyle} onChange={(e) => setDraft({ ...draft, terrainStyle: e.target.value as SettlementSettings['terrainStyle'] })}>
                  <option value="river">Colinas com rio</option>
                  <option value="lake">Colinas com lago</option>
                  <option value="hills">Colinas</option>
                  <option value="flat">Plano</option>
                </select>
              </label>
              <p className="text-stone-500">Sem um gerador de terreno registrado no jogo, o assentamento usa este terreno de teste.</p>
              <button id="settlement-generate" disabled={!dirty} onClick={() => apply()}
                className={'w-full py-2 rounded-lg font-semibold cursor-pointer ' + (dirty ? 'bg-sky-700 text-white hover:bg-sky-600' : 'bg-stone-800 text-stone-500 cursor-default')}>
                {dirty ? 'Gerar com estas opções' : 'Gerado'}
              </button>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
