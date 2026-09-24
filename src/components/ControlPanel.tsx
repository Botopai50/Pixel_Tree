import React, { useState } from 'react';
import { 
  Sliders, 
  TreePine, 
  Sun, 
  ChevronRight, 
  ChevronLeft, 
  Dices,
  Wand2,
  Apple,
  RotateCcw,
  Sprout,
  Leaf,
  Palette
} from 'lucide-react';
import { TreeConfig, EnvironmentConfig, TreeSpecies, TimeOfDay, CrownShape } from '../types';
import { TREE_PRESETS } from '../constants/presets';
import { audioSystem } from '../services/audioSynthesizer';
import { resolvePixelTextureParams } from '../services/pixelArtTextureSystem';

interface ControlPanelProps {
  treeConfig: TreeConfig;
  envConfig: EnvironmentConfig;
  onUpdateTreeConfig: (updater: (prev: TreeConfig) => TreeConfig) => void;
  onUpdateEnvConfig: (updater: (prev: EnvironmentConfig) => EnvironmentConfig) => void;
  onSelectPreset: (species: TreeSpecies) => void;
}

type MainTab = 'sliders' | 'presets' | 'env';
type SliderSection = 'all' | 'sca' | 'trunk' | 'branches' | 'foliage' | 'texture' | 'accents' | 'wind';

export const ControlPanel: React.FC<ControlPanelProps> = ({
  treeConfig,
  envConfig,
  onUpdateTreeConfig,
  onUpdateEnvConfig,
  onSelectPreset,
}) => {
  // Default directly to 'sliders' so procedural controls are immediately visible!
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('sliders');
  const [activeSection, setActiveSection] = useState<SliderSection>('all');
  const [stageFilter, setStageFilter] = useState<'all' | 'adult' | 'sapling' | 'shrub'>('all');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const presetsList = Object.values(TREE_PRESETS);

  // The texture sliders are all optional overrides, and their real defaults are
  // per-species and resolved in the texture system. Reading them from there
  // keeps every slider showing the value actually being rendered, instead of a
  // second copy of the defaults that drifts out of step with it.
  const texDefaults = resolvePixelTextureParams(treeConfig);

  // Quick seed randomizer
  const handleRandomize = () => {
    audioSystem.playLeafRustle();
    onUpdateTreeConfig((prev) => ({
      ...prev,
      seed: Math.floor(Math.random() * 90000) + 1000,
    }));
  };

  // Subtle mutation (keeps seed close for organic branch variation)
  const handleMutate = () => {
    audioSystem.playLeafRustle();
    onUpdateTreeConfig((prev) => ({
      ...prev,
      seed: prev.seed + 1,
    }));
  };

  return (
    <div
      id="botw-control-panel-wrapper"
      className={`fixed right-2 sm:right-4 top-20 bottom-4 z-20 transition-transform duration-300 flex items-start ${
        isCollapsed ? 'translate-x-[calc(100%-2.5rem)]' : 'translate-x-0'
      }`}
    >
      {/* Collapse/Expand Handle Button */}
      <button
        id="btn-collapse-panel"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="h-12 px-2 bg-stone-900/95 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700/80 rounded-l-xl shadow-2xl flex items-center justify-center cursor-pointer transition active:scale-95"
        title={isCollapsed ? 'Expandir Sliders Procedurais' : 'Recolher Painel'}
      >
        {isCollapsed ? <ChevronLeft className="w-5 h-5 text-emerald-400" /> : <ChevronRight className="w-5 h-5" />}
      </button>

      {/* Main Glass Panel */}
      <div
        id="botw-control-panel"
        className="w-[21rem] sm:w-[24rem] h-full bg-stone-950/90 backdrop-blur-xl border border-stone-800/80 rounded-r-xl rounded-bl-xl shadow-2xl flex flex-col overflow-hidden text-stone-200"
      >
        {/* Main Navigation Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-900/80 p-1.5 gap-1">
          <button
            id="tab-sliders"
            onClick={() => setActiveMainTab('sliders')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeMainTab === 'sliders'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Sliders Procedurais</span>
          </button>

          <button
            id="tab-presets"
            onClick={() => setActiveMainTab('presets')}
            className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition cursor-pointer ${
              activeMainTab === 'presets'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <TreePine className="w-4 h-4" />
            <span>Espécies</span>
          </button>

          <button
            id="tab-env"
            onClick={() => setActiveMainTab('env')}
            className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition cursor-pointer ${
              activeMainTab === 'env'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Clima</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
          
          {/* TAB 1: PROCEDURAL SLIDERS (PRIMARY FOCUS) */}
          {activeMainTab === 'sliders' && (
            <div className="space-y-4">

              {/* Seed Bar & Quick Mutation */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 via-stone-900/60 to-stone-900/40 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Semente Procedural
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleMutate}
                      className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-300 border border-stone-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer active:scale-95 transition"
                      title="Mutação leve (+1 na semente)"
                    >
                      <Wand2 className="w-3 h-3 text-amber-400" />
                      <span>Variar</span>
                    </button>
                    <button
                      onClick={handleRandomize}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer active:scale-95 transition shadow-sm"
                      title="Sorteio aleatório de semente"
                    >
                      <Dices className="w-3.5 h-3.5" />
                      <span>Sortear</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1000"
                    max="99999"
                    step="1"
                    value={treeConfig.seed}
                    onChange={(e) =>
                      onUpdateTreeConfig((prev) => ({ ...prev, seed: parseInt(e.target.value) }))
                    }
                    className="flex-1 accent-emerald-500 cursor-pointer"
                  />
                  <input
                    type="number"
                    value={treeConfig.seed}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) {
                        onUpdateTreeConfig((prev) => ({ ...prev, seed: val }));
                      }
                    }}
                    className="w-20 px-2 py-1 bg-stone-900 border border-stone-700 rounded font-mono text-center text-xs text-amber-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Sub-Section Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-stone-800/80 scrollbar-none">
                {[
                  { id: 'all', label: 'Todos os Sliders' },
                  { id: 'sca', label: 'Space Colonization' },
                  { id: 'trunk', label: 'Tronco' },
                  { id: 'branches', label: 'Galhos' },
                  { id: 'foliage', label: 'Folhas' },
                  { id: 'texture', label: 'Texturas Pixel Art' },
                  { id: 'accents', label: 'Itens' },
                  { id: 'wind', label: 'Vento' },
                ].map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id as SliderSection)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                      activeSection === sec.id
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                    }`}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>

              {/* SECTION: SPACE COLONIZATION ALGORITHM (SCA) */}
              {(activeSection === 'all' || activeSection === 'sca') && (
                <div className="space-y-3.5 bg-emerald-950/20 p-3 rounded-xl border border-emerald-800/40">
                  <div className="flex items-center justify-between border-b border-emerald-800/40 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-semibold text-emerald-200">Space Colonization Algorithm</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-mono">Runions et al.</span>
                  </div>

                  {/* Toggle SCA Active */}
                  <label className="flex items-center justify-between p-2 rounded-lg bg-stone-900/60 border border-stone-800 cursor-pointer">
                    <div className="flex flex-col">
                      <span className="text-xs text-stone-200 font-medium">Space Colonization Completo (Tronco + Galhos)</span>
                      <span className="text-[10px] text-stone-400">100% procedural do solo até a copa (Leonardo Da Vinci)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={treeConfig.useSpaceColonization ?? true}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, useSpaceColonization: e.target.checked }))
                      }
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </label>

                  {/* Crown Envelope Shape */}
                  <div>
                    <label className="text-xs text-stone-300 block mb-1.5 font-medium">
                      Formato do Volume da Copa (Crown Shape)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {[
                        { id: 'dome', label: 'Cúpula / Domo' },
                        { id: 'sphere', label: 'Esfera Suave' },
                        { id: 'umbrella', label: 'Guarda-Chuva' },
                        { id: 'flat_top', label: 'Mesa (Acácia)' },
                        { id: 'conical', label: 'Cônica (Pinheiro)' },
                        { id: 'multi_cloud', label: 'Nuvens Múltiplas' },
                        { id: 'candelabra', label: 'Candelabro (Cacto)' },
                        { id: 'swamp_vault', label: 'Catedral Pântano' },
                        { id: 'gnarled', label: 'Seco / Retorcido' },
                      ].map((shape) => (
                        <button
                          key={shape.id}
                          type="button"
                          onClick={() =>
                            onUpdateTreeConfig((prev) => ({ ...prev, scaCrownShape: shape.id as CrownShape }))
                          }
                          className={`py-1 px-2 rounded text-[11px] font-medium transition cursor-pointer text-center ${
                            (treeConfig.scaCrownShape ?? 'dome') === shape.id
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-stone-900/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                          }`}
                        >
                          {shape.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Attractor Count Slider */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Pontos de Atração (Atratores)</span>
                      <span className="font-mono text-emerald-300 font-semibold">{treeConfig.scaAttractorCount ?? 450} pts</span>
                    </div>
                    <input
                      type="range"
                      min="150"
                      max="1000"
                      step="25"
                      value={treeConfig.scaAttractorCount ?? 450}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, scaAttractorCount: parseInt(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400">
                      <span>150 (leve)</span>
                      <span>1000 (hiper-denso)</span>
                    </div>
                  </div>

                  {/* Attraction Radius (Search Distance) */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Raio de Atração (Alcance de Busca)</span>
                      <span className="font-mono text-emerald-300 font-semibold">{(treeConfig.scaAttractionRadius ?? 3.5).toFixed(1)}m</span>
                    </div>
                    <input
                      type="range"
                      min="1.5"
                      max="6.0"
                      step="0.2"
                      value={treeConfig.scaAttractionRadius ?? 3.5}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, scaAttractionRadius: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400">
                      <span>1.5m (ramos curtos)</span>
                      <span>6.0m (ramos longos)</span>
                    </div>
                  </div>

                  {/* Kill Distance */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Distância de Eliminação (Kill Dist)</span>
                      <span className="font-mono text-emerald-300 font-semibold">{(treeConfig.scaKillDistance ?? 0.65).toFixed(2)}m</span>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="1.5"
                      step="0.05"
                      value={treeConfig.scaKillDistance ?? 0.65}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, scaKillDistance: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400">
                      <span>0.30m (ramificação fina)</span>
                      <span>1.50m (galhos espaçados)</span>
                    </div>
                  </div>

                  {/* Step Size */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Passo de Crescimento (Step Size)</span>
                      <span className="font-mono text-emerald-300 font-semibold">{(treeConfig.scaStepSize ?? 0.38).toFixed(2)}m</span>
                    </div>
                    <input
                      type="range"
                      min="0.22"
                      max="0.70"
                      step="0.02"
                      value={treeConfig.scaStepSize ?? 0.38}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, scaStepSize: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400">
                      <span>0.22m (curvas suaves)</span>
                      <span>0.70m (ramos retos)</span>
                    </div>
                  </div>

                  {/* Show Attractor Points in 3D */}
                  <label className="flex items-center justify-between p-2 rounded-lg bg-stone-900/60 border border-stone-800 cursor-pointer hover:bg-stone-800/60 transition">
                    <span className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
                      <span>✨ Ver Pontos de Atração no Espaço 3D</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={treeConfig.showAttractors ?? false}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, showAttractors: e.target.checked }))
                      }
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                  </label>
                </div>
              )}

              {/* SECTION: TRUNK & ROOTS */}
              {(activeSection === 'all' || activeSection === 'trunk') && (
                <div className="space-y-3.5 bg-stone-900/40 p-3 rounded-xl border border-stone-800/80">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
                    <span className="font-semibold text-stone-200">Tronco & Raízes</span>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider font-mono">Geometria</span>
                  </div>

                  {/* Trunk Height */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Altura do Tronco</span>
                      <span className="font-mono text-emerald-300 font-semibold">{treeConfig.trunkHeight.toFixed(1)}m</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="16"
                      step="0.5"
                      value={treeConfig.trunkHeight}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, trunkHeight: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400">
                      <span>5.0m</span>
                      <span>16.0m</span>
                    </div>
                  </div>

                  {/* Base Radius */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Espessura da Base</span>
                      <span className="font-mono text-emerald-300 font-semibold">{treeConfig.trunkRadiusBase.toFixed(2)}m</span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="2.2"
                      step="0.05"
                      value={treeConfig.trunkRadiusBase}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, trunkRadiusBase: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Top Radius (Tapering) */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Afilamento do Topo</span>
                      <span className="font-mono text-emerald-300 font-semibold">{treeConfig.trunkRadiusTop.toFixed(2)}m</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="0.8"
                      step="0.05"
                      value={treeConfig.trunkRadiusTop}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, trunkRadiusTop: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Root Spread */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Espalhamento das Raízes</span>
                      <span className="font-mono text-emerald-300 font-semibold">{treeConfig.rootSpread.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="2.5"
                      step="0.1"
                      value={treeConfig.rootSpread}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, rootSpread: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Trunk Curvature */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Curvatura Orgânica (Sway)</span>
                      <span className="font-mono text-emerald-300 font-semibold">
                        {Math.round(treeConfig.trunkCurvature * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.0"
                      step="0.05"
                      value={treeConfig.trunkCurvature}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, trunkCurvature: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Trunk Twist */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Torção da Madeira</span>
                      <span className="font-mono text-emerald-300 font-semibold">
                        {Math.round(treeConfig.trunkTwist * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.2"
                      step="0.05"
                      value={treeConfig.trunkTwist}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, trunkTwist: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Moss Amount */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Musgo na Base (Floresta de Hyrule)</span>
                      <span className="font-mono text-emerald-300 font-semibold">
                        {Math.round(treeConfig.mossAmount * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={treeConfig.mossAmount}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, mossAmount: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Snow Cover (pines) */}
                  {treeConfig.species.startsWith('hebra_pine') && (
                    <div>
                      <div className="flex justify-between text-stone-300 mb-1">
                        <span>Cobertura de Neve (Hebra)</span>
                        <span className="font-mono text-sky-300 font-semibold">
                          {Math.round((treeConfig.snowCover ?? 0) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={treeConfig.snowCover ?? 0}
                        onChange={(e) =>
                          onUpdateTreeConfig((prev) => ({ ...prev, snowCover: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Swamp Stilt Roots Controls (Raízes para Fora) */}
                  {(treeConfig.species === 'swamp_mangrove' || treeConfig.barkStyle === 'swamp') && (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                      <div className="flex items-center justify-between border-b border-emerald-800/50 pb-1">
                        <span className="font-semibold text-emerald-300 text-xs flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Raízes Escoras (Raízes para Fora)
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono">Manguezal</span>
                      </div>

                      {/* Root Count */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Quantidade de Raízes</span>
                          <span className="font-mono text-emerald-300 font-semibold">{treeConfig.aerialRootCount ?? 8} raízes</span>
                        </div>
                        <input
                          type="range"
                          min="4"
                          max="14"
                          step="1"
                          value={treeConfig.aerialRootCount ?? 8}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, aerialRootCount: parseInt(e.target.value) }))
                          }
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      {/* Root Spread */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Abertura / Raio das Raízes</span>
                          <span className="font-mono text-emerald-300 font-semibold">{(treeConfig.aerialRootSpread ?? 1.25).toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.8"
                          max="2.0"
                          step="0.05"
                          value={treeConfig.aerialRootSpread ?? 1.25}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, aerialRootSpread: parseFloat(e.target.value) }))
                          }
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      {/* Root Emergence Height */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Altura de Emergência no Tronco</span>
                          <span className="font-mono text-emerald-300 font-semibold">{(treeConfig.aerialRootHeight ?? 1.5).toFixed(1)}m</span>
                        </div>
                        <input
                          type="range"
                          min="0.6"
                          max="2.2"
                          step="0.1"
                          value={treeConfig.aerialRootHeight ?? 1.5}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, aerialRootHeight: parseFloat(e.target.value) }))
                          }
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      {/* Hanging Spanish Moss */}
                      <div className="flex items-center justify-between pt-1 border-t border-emerald-900/60">
                        <div className="flex flex-col">
                          <span className="text-stone-200 font-medium text-xs">Musgo Espanhol / Cipós Pendentes</span>
                          <span className="text-[10px] text-stone-400">Balançam com o vento</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={treeConfig.showHangingMoss ?? true}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, showHangingMoss: e.target.checked }))
                          }
                          className="accent-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </div>

                      {/* Swamp Water & Lily Pads */}
                      <div className="flex items-center justify-between pt-1 border-t border-emerald-900/60">
                        <div className="flex flex-col">
                          <span className="text-stone-200 font-medium text-xs">Espelho d'Água e Vitórias-Régias</span>
                          <span className="text-[10px] text-stone-400">Lago escuro com reflexo</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={treeConfig.showSwampWater ?? true}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, showSwampWater: e.target.checked }))
                          }
                          className="accent-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </div>

                      {/* Purple Shelf Mushrooms */}
                      <div className="flex items-center justify-between pt-1 border-t border-emerald-900/60">
                        <div className="flex flex-col">
                          <span className="text-stone-200 font-medium text-xs">Orelhas-de-Pau Violetas</span>
                          <span className="text-[10px] text-stone-400">Cogumelos em leque nas raízes</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={treeConfig.showShelfMushrooms ?? true}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, showShelfMushrooms: e.target.checked }))
                          }
                          className="accent-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* Bark Style selector */}
                  <div>
                    <span className="text-stone-300 block mb-1">Textura da Casca Cel-Shaded</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'oak', label: 'Carvalho' },
                        { id: 'birch', label: 'Bétula Akkala' },
                        { id: 'pine', label: 'Pinheiro Hebra' },
                        { id: 'ancient', label: 'Ancestral Korok' },
                        { id: 'cactus', label: 'Cacto Estriado' },
                        { id: 'swamp', label: 'Pântano / Mangue' },
                        { id: 'deadwood', label: 'Madeira Seca' },
                      ].map((style) => (
                        <button
                          key={style.id}
                          onClick={() =>
                            onUpdateTreeConfig((prev) => ({
                              ...prev,
                              barkStyle: style.id as TreeConfig['barkStyle'],
                              barkColor:
                                style.id === 'birch'
                                    ? '#e0d8cc'
                                    : style.id === 'ancient'
                                    ? '#3b281c'
                                    : style.id === 'cactus'
                                    ? '#639b33'
                                    : style.id === 'swamp'
                                    ? '#2b1d16'
                                    : style.id === 'deadwood'
                                    ? '#7a6f64'
                                    : '#5c3e23',
                            }))
                          }
                          className={`p-2 rounded-lg border text-center transition cursor-pointer text-xs ${
                            treeConfig.barkStyle === style.id
                              ? 'bg-amber-500/25 border-amber-500/60 text-amber-200 font-semibold'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: BRANCHES & HIERARCHY */}
              {(activeSection === 'all' || activeSection === 'branches') && (
                <div className="space-y-3.5 bg-stone-900/40 p-3 rounded-xl border border-stone-800/80">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
                    <span className="font-semibold text-stone-200">Galhos & Ramificação</span>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider font-mono">Estrutura</span>
                  </div>

                  {/* Branch Count / Arm Count */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>{treeConfig.species === 'gerudo_cactus' ? 'Quantidade de Braços (Cacto)' : 'Quantidade de Galhos'}</span>
                      <span className="font-mono text-emerald-300 font-semibold">
                        {treeConfig.species === 'gerudo_cactus'
                          ? (treeConfig.branchCount === 0 ? '0 (Pilar Solitário)' : `${treeConfig.branchCount} braço${treeConfig.branchCount > 1 ? 's' : ''}`)
                          : treeConfig.branchCount}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={treeConfig.species === 'gerudo_cactus' ? 0 : 3}
                      max={treeConfig.species === 'gerudo_cactus' ? 8 : 16}
                      step="1"
                      value={treeConfig.branchCount}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, branchCount: parseInt(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400">
                      <span>{treeConfig.species === 'gerudo_cactus' ? '0 (sem braços)' : '3 galhos'}</span>
                      <span>{treeConfig.species === 'gerudo_cactus' ? '8 braços' : '16 galhos'}</span>
                    </div>
                  </div>

                  {/* Branch Length */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Comprimento dos Galhos</span>
                      <span className="font-mono text-emerald-300 font-semibold">{treeConfig.branchLength.toFixed(1)}m</span>
                    </div>
                    <input
                      type="range"
                      min="1.5"
                      max="6.5"
                      step="0.2"
                      value={treeConfig.branchLength}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, branchLength: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Branch Angle */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Ângulo de Abertura</span>
                      <span className="font-mono text-emerald-300 font-semibold">
                        {Math.round(treeConfig.branchAngle * 57.3)}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="1.3"
                      step="0.05"
                      value={treeConfig.branchAngle}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, branchAngle: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400">
                      <span>Mais Verticais</span>
                      <span>Mais Horizontais</span>
                    </div>
                  </div>

                  {/* Branch Start Height */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Início da Ramificação</span>
                      <span className="font-mono text-emerald-300 font-semibold">
                        {Math.round((treeConfig.branchStartHeight ?? 0.45) * 100)}% da altura
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.25"
                      max="0.75"
                      step="0.05"
                      value={treeConfig.branchStartHeight ?? 0.45}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, branchStartHeight: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Canopy Spread Multiplier */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Espalhamento da Copa</span>
                      <span className="font-mono text-emerald-300 font-semibold">
                        {(treeConfig.canopySpread ?? 1.0).toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="2.0"
                      step="0.1"
                      value={treeConfig.canopySpread ?? 1.0}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, canopySpread: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Sub-branch density */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Sub-ramos Secundários</span>
                      <span className="font-mono text-emerald-300 font-semibold">
                        {Math.round((treeConfig.subBranchDensity ?? 0.6) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.0"
                      step="0.1"
                      value={treeConfig.subBranchDensity ?? 0.6}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, subBranchDensity: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* SECTION: FOLIAGE & CLOUDS */}
              {(activeSection === 'all' || activeSection === 'foliage') && (
                <div className="space-y-3.5 bg-stone-900/40 p-3 rounded-xl border border-stone-800/80">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
                    <span className="font-semibold text-stone-200">Copa & Folhas (Nuvens BotW)</span>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider font-mono">Cel-Shading</span>
                  </div>

                  {/* Foliage Type */}
                  <div>
                    <span className="text-stone-300 block mb-1">Estilo de Folhagem</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { id: 'cloud', label: 'Nuvens BotW' },
                        { id: 'pine_cone', label: 'Coníferas' },
                        { id: 'palm_frond', label: 'Palmeira' },
                        { id: 'cactus_bloom', label: 'Voltfruit / Flor' },
                        { id: 'none', label: 'Seco / Sem Folhas' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() =>
                            onUpdateTreeConfig((prev) => ({ ...prev, foliageType: f.id as TreeConfig['foliageType'] }))
                          }
                          className={`p-2 rounded-lg border text-center transition cursor-pointer text-xs ${
                            treeConfig.foliageType === f.id
                              ? 'bg-emerald-500/25 border-emerald-500/60 text-emerald-200 font-semibold'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cluster Count */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Quantidade de Nuvens / Tufos</span>
                      <span className="font-mono text-emerald-300 font-semibold">{treeConfig.clusterCount}</span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="36"
                      step="1"
                      value={treeConfig.clusterCount}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, clusterCount: parseInt(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400">
                      <span>6 tufos</span>
                      <span>36 tufos</span>
                    </div>
                  </div>

                  {/* Cluster Radius / Volume */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Volume de cada Tufo</span>
                      <span className="font-mono text-emerald-300 font-semibold">{treeConfig.clusterRadius.toFixed(2)}m</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="3.0"
                      step="0.1"
                      value={treeConfig.clusterRadius}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, clusterRadius: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Foliage Colors */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-stone-300 block mb-1">Sol (Topo)</label>
                      <div className="flex items-center gap-2 bg-stone-900 p-1.5 rounded-lg border border-stone-800">
                        <input
                          type="color"
                          value={treeConfig.foliageColorTop}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, foliageColorTop: e.target.value }))
                          }
                          className="w-6 h-6 rounded border-none cursor-pointer bg-transparent"
                        />
                        <span className="font-mono text-[11px] uppercase text-stone-300">
                          {treeConfig.foliageColorTop}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-stone-300 block mb-1">Sombra (Base)</label>
                      <div className="flex items-center gap-2 bg-stone-900 p-1.5 rounded-lg border border-stone-800">
                        <input
                          type="color"
                          value={treeConfig.foliageColorBottom}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, foliageColorBottom: e.target.value }))
                          }
                          className="w-6 h-6 rounded border-none cursor-pointer bg-transparent"
                        />
                        <span className="font-mono text-[11px] uppercase text-stone-300">
                          {treeConfig.foliageColorBottom}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cel-Shading Steps */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Passos de Cel-Shading (Toon)</span>
                      <span className="font-mono text-emerald-300 font-semibold">{treeConfig.celSteps} Degraus</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="4"
                      step="1"
                      value={treeConfig.celSteps}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, celSteps: parseInt(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Rim Light */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Contorno Solar (Rim Light BotW)</span>
                      <span className="font-mono text-emerald-300 font-semibold">
                        {treeConfig.rimLightIntensity.toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.8"
                      step="0.1"
                      value={treeConfig.rimLightIntensity}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, rimLightIntensity: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Procedural Leaf Cards & Canopy Tuning Section */}
                  <div className="pt-2 border-t border-stone-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-300">Folhagem Procedural BotW</span>
                      <span className="text-[9px] bg-emerald-950/80 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/50">Leaf Cards NPR</span>
                    </div>

                    {/* Leaf Card Size */}
                    <div className="mb-2.5">
                      <div className="flex justify-between text-stone-300 mb-1">
                        <span>Tamanho dos Leaf Cards</span>
                        <span className="font-mono text-emerald-300 font-semibold">
                          {(treeConfig.leafCardSize ?? 1.35).toFixed(2)}m
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.8"
                        max="2.5"
                        step="0.05"
                        value={treeConfig.leafCardSize ?? 1.35}
                        onChange={(e) =>
                          onUpdateTreeConfig((prev) => ({ ...prev, leafCardSize: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>

                    {/* Canopy Spread */}
                    <div className="mb-2.5">
                      <div className="flex justify-between text-stone-300 mb-1">
                        <span>Envergadura da Copa (Canopy Spread)</span>
                        <span className="font-mono text-emerald-300 font-semibold">
                          {(treeConfig.canopySpread ?? 1.15).toFixed(2)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.7"
                        max="1.8"
                        step="0.05"
                        value={treeConfig.canopySpread ?? 1.15}
                        onChange={(e) =>
                          onUpdateTreeConfig((prev) => ({ ...prev, canopySpread: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>

                    {/* Wind Flutter */}
                    <div className="mb-2">
                      <div className="flex justify-between text-stone-300 mb-1">
                        <span>Farfalhar com o Vento (Flutter)</span>
                        <span className="font-mono text-emerald-300 font-semibold">
                          {((treeConfig.flutterStrength ?? 0.045) * 1000).toFixed(0)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="0.10"
                        step="0.005"
                        value={treeConfig.flutterStrength ?? 0.045}
                        onChange={(e) =>
                          onUpdateTreeConfig((prev) => ({ ...prev, flutterStrength: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: BOTW ACCENTS */}
              {(activeSection === 'all' || activeSection === 'accents') && (
                <div className="space-y-3.5 bg-stone-900/40 p-3 rounded-xl border border-stone-800/80">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
                    <span className="font-semibold text-stone-200">Itens & Acessórios de Zelda</span>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider font-mono">Detalhes</span>
                  </div>

                  {/* Apples */}
                  <div className="p-2.5 rounded-lg bg-stone-900/60 border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="font-medium text-stone-200">
                          {treeConfig.growthStage === 'shrub'
                            ? treeConfig.bushAccent === 'flowers'
                              ? 'Flores (cachos de 3)'
                              : 'Frutinhas (cachos de 3)'
                            : 'Maçãs de Hyrule'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={treeConfig.showApples}
                        onChange={(e) =>
                          onUpdateTreeConfig((prev) => ({ ...prev, showApples: e.target.checked }))
                        }
                        className="accent-red-500 w-4 h-4 cursor-pointer"
                      />
                    </div>
                    {treeConfig.showApples && (
                      <div>
                        <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                          <span>Quantidade</span>
                          <span className="font-mono text-stone-200">{treeConfig.appleCount}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="16"
                          step="1"
                          value={treeConfig.appleCount}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, appleCount: parseInt(e.target.value) }))
                          }
                          className="w-full accent-red-500 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Mushrooms */}
                  <div className="p-2.5 rounded-lg bg-stone-900/60 border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="font-medium text-stone-200">Cogumelos no Tronco (Shrooms)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={treeConfig.showMushrooms}
                        onChange={(e) =>
                          onUpdateTreeConfig((prev) => ({ ...prev, showMushrooms: e.target.checked }))
                        }
                        className="accent-amber-500 w-4 h-4 cursor-pointer"
                      />
                    </div>
                    {treeConfig.showMushrooms && (
                      <div>
                        <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                          <span>Quantidade</span>
                          <span className="font-mono text-stone-200">{treeConfig.mushroomCount}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="14"
                          step="1"
                          value={treeConfig.mushroomCount}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, mushroomCount: parseInt(e.target.value) }))
                          }
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Korok Pinwheel */}
                  <div className="p-2.5 rounded-lg bg-stone-900/60 border border-stone-800 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-stone-200">Cata-Vento Korok</div>
                      <div className="text-[10px] text-stone-400">Gira dinamicamente com a brisa</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={treeConfig.showKorokPinwheel}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, showKorokPinwheel: e.target.checked }))
                      }
                      className="accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {/* Falling Leaves Particles */}
                  <div className="p-2.5 rounded-lg bg-stone-900/60 border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-stone-200">Folhas / Pétalas Flutuantes</div>
                      <input
                        type="checkbox"
                        checked={treeConfig.showFallingLeaves}
                        onChange={(e) =>
                          onUpdateTreeConfig((prev) => ({ ...prev, showFallingLeaves: e.target.checked }))
                        }
                        className="accent-emerald-500 w-4 h-4 cursor-pointer"
                      />
                    </div>
                    {treeConfig.showFallingLeaves && (
                      <div>
                        <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                          <span>Intensidade da Chuva de Folhas</span>
                          <span className="font-mono text-stone-200">{treeConfig.fallingLeafCount}</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="160"
                          step="10"
                          value={treeConfig.fallingLeafCount}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, fallingLeafCount: parseInt(e.target.value) }))
                          }
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: WIND PHYSICS */}
              {(activeSection === 'all' || activeSection === 'wind') && (
                <div className="space-y-3.5 bg-stone-900/40 p-3 rounded-xl border border-stone-800/80">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
                    <span className="font-semibold text-stone-200">Física do Vento & Balanço</span>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider font-mono">Dinâmica</span>
                  </div>

                  {/* Wind Strength */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Intensidade do Vento</span>
                      <span className="font-mono text-cyan-300 font-semibold">
                        {Math.round(treeConfig.windStrength * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.0"
                      step="0.05"
                      value={treeConfig.windStrength}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, windStrength: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {/* Wind Speed */}
                  <div>
                    <div className="flex justify-between text-stone-300 mb-1">
                      <span>Velocidade da Rajada</span>
                      <span className="font-mono text-cyan-300 font-semibold">{treeConfig.windSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.8"
                      step="0.1"
                      value={treeConfig.windSpeed}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, windSpeed: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* SECTION: PROCEDURAL PIXEL ART TEXTURES */}
              {(activeSection === 'all' || activeSection === 'texture') && (
                <div className="space-y-3.5 bg-fuchsia-950/15 p-3 rounded-xl border border-fuchsia-900/40">
                  <div className="flex items-center justify-between border-b border-fuchsia-900/40 pb-1.5">
                    <div className="flex items-center gap-2">
                      <Palette className="w-3.5 h-3.5 text-fuchsia-300" />
                      <span className="font-semibold text-fuchsia-100">Texturas Pixel Art</span>
                    </div>
                    <span className="text-[10px] text-fuchsia-400 uppercase tracking-wider font-mono">Procedural</span>
                  </div>

                  {/* Master toggle */}
                  <label className="flex items-center justify-between p-2 rounded-lg bg-stone-900/60 border border-stone-800 cursor-pointer">
                    <div className="flex flex-col">
                      <span className="text-xs text-stone-200 font-medium">Geração Procedural de Texturas</span>
                      <span className="text-[10px] text-stone-400">
                        Paleta limitada, pixels definidos, Nearest Neighbor
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={treeConfig.pixelTextureEnabled !== false}
                      onChange={(e) =>
                        onUpdateTreeConfig((prev) => ({ ...prev, pixelTextureEnabled: e.target.checked }))
                      }
                      className="w-4 h-4 accent-fuchsia-500 cursor-pointer"
                    />
                  </label>

                  {treeConfig.pixelTextureEnabled !== false && (
                    <>
                      {/* Texture seed */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Semente da Textura</span>
                          <span className="font-mono text-fuchsia-300 font-semibold">
                            {treeConfig.textureSeed ?? treeConfig.seed}
                            {treeConfig.textureSeed === undefined ? ' (herdada)' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="1000"
                            max="99999"
                            step="1"
                            value={treeConfig.textureSeed ?? treeConfig.seed}
                            onChange={(e) =>
                              onUpdateTreeConfig((prev) => ({ ...prev, textureSeed: parseInt(e.target.value) }))
                            }
                            className="flex-1 accent-fuchsia-500 cursor-pointer"
                          />
                          <button
                            onClick={() =>
                              onUpdateTreeConfig((prev) => ({ ...prev, textureSeed: undefined }))
                            }
                            className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-[10px] cursor-pointer active:scale-95 transition whitespace-nowrap"
                            title="Voltar a usar a semente da árvore"
                          >
                            Herdar
                          </button>
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          A mesma semente sempre gera exatamente a mesma textura.
                        </div>
                      </div>

                      {/* Apparent pixel size */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Tamanho Aparente do Pixel</span>
                          <span className="font-mono text-fuchsia-300 font-semibold">
                            {['Fino', 'Médio-fino', 'Médio', 'Grosso', 'Muito grosso'][
                              Math.max(0, Math.min(4, Math.round((texDefaults.pixelSize) - 1)))
                            ]}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={texDefaults.pixelSize}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, pixelSize: parseInt(e.target.value) }))
                          }
                          className="w-full accent-fuchsia-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-stone-400">
                          <span>64 texels/folha</span>
                          <span>26 texels/folha</span>
                        </div>
                      </div>

                      {/* Palette size */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Quantidade de Cores</span>
                          <span className="font-mono text-fuchsia-300 font-semibold">
                            {texDefaults.steps} tons
                          </span>
                        </div>
                        <input
                          type="range"
                          min="4"
                          max="9"
                          step="1"
                          value={texDefaults.steps}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, paletteSteps: parseInt(e.target.value) }))
                          }
                          className="w-full accent-fuchsia-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-stone-400">
                          <span>sombra profunda → highlight</span>
                          <span>9</span>
                        </div>
                      </div>

                      {/* Detail density */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Densidade dos Detalhes</span>
                          <span className="font-mono text-fuchsia-300 font-semibold">
                            {Math.round((texDefaults.detail) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={texDefaults.detail}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, detailDensity: parseFloat(e.target.value) }))
                          }
                          className="w-full accent-fuchsia-500 cursor-pointer"
                        />
                      </div>

                      {/* Contrast */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Contraste</span>
                          <span className="font-mono text-fuchsia-300 font-semibold">
                            {Math.round((texDefaults.contrast) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={texDefaults.contrast}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, textureContrast: parseFloat(e.target.value) }))
                          }
                          className="w-full accent-fuchsia-500 cursor-pointer"
                        />
                      </div>

                      {/* Shadow strength */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Intensidade das Sombras</span>
                          <span className="font-mono text-fuchsia-300 font-semibold">
                            {Math.round((texDefaults.shadow) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={texDefaults.shadow}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, shadowStrength: parseFloat(e.target.value) }))
                          }
                          className="w-full accent-fuchsia-500 cursor-pointer"
                        />
                      </div>

                      {/* Highlights */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Quantidade de Highlights</span>
                          <span className="font-mono text-fuchsia-300 font-semibold">
                            {Math.round((texDefaults.highlights) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={texDefaults.highlights}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, highlightAmount: parseFloat(e.target.value) }))
                          }
                          className="w-full accent-fuchsia-500 cursor-pointer"
                        />
                      </div>

                      <div className="pt-1 border-t border-stone-800/80 text-[10px] text-stone-400 uppercase tracking-wider font-mono">
                        Copa
                      </div>

                      {/* Leaf cluster size */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Tamanho dos Clusters de Folhas</span>
                          <span className="font-mono text-emerald-300 font-semibold">
                            {(texDefaults.clusterSizeBase).toFixed(1)} texels
                          </span>
                        </div>
                        <input
                          type="range"
                          min="2.5"
                          max="12"
                          step="0.5"
                          value={texDefaults.clusterSizeBase}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, leafClusterSize: parseFloat(e.target.value) }))
                          }
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-stone-400">
                          <span>Folhas miúdas</span>
                          <span>Massas largas</span>
                        </div>
                      </div>

                      {/* Cluster irregularity */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Irregularidade dos Clusters</span>
                          <span className="font-mono text-emerald-300 font-semibold">
                            {Math.round((texDefaults.irregularity) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={texDefaults.irregularity}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({
                              ...prev,
                              leafClusterIrregularity: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      {/* Canopy gaps */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Áreas Vazias na Copa</span>
                          <span className="font-mono text-emerald-300 font-semibold">
                            {Math.round((texDefaults.gaps) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={texDefaults.gaps}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, canopyGapAmount: parseFloat(e.target.value) }))
                          }
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-stone-400">
                          <span>Copa sólida</span>
                          <span>Copa rendada</span>
                        </div>
                      </div>

                      {/* Color variation / accent ramp */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Variação de Cor entre Clusters</span>
                          <span className="font-mono text-emerald-300 font-semibold">
                            {Math.round((texDefaults.accent) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={texDefaults.accent}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({
                              ...prev,
                              textureAccentAmount: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      <div className="pt-1 border-t border-stone-800/80 text-[10px] text-stone-400 uppercase tracking-wider font-mono">
                        Tronco & Galhos
                      </div>

                      {/* Bark variation */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Variação da Casca</span>
                          <span className="font-mono text-amber-300 font-semibold">
                            {Math.round((texDefaults.barkVariation) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={texDefaults.barkVariation}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({ ...prev, barkVariation: parseFloat(e.target.value) }))
                          }
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-stone-400">
                          <span>Madeira lisa</span>
                          <span>Casca rachada e manchada</span>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-stone-800/80 text-[10px] text-stone-400 uppercase tracking-wider font-mono">
                        Iluminação Procedural da Textura
                      </div>

                      {/* Light azimuth */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Azimute da Luz</span>
                          <span className="font-mono text-yellow-300 font-semibold">
                            {Math.round(texDefaults.lightAzimuth)}°
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          step="5"
                          value={texDefaults.lightAzimuth}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({
                              ...prev,
                              textureLightAzimuth: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-yellow-500 cursor-pointer"
                        />
                      </div>

                      {/* Light elevation */}
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Elevação da Luz</span>
                          <span className="font-mono text-yellow-300 font-semibold">
                            {Math.round(texDefaults.lightElevation)}°
                          </span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="88"
                          step="1"
                          value={texDefaults.lightElevation}
                          onChange={(e) =>
                            onUpdateTreeConfig((prev) => ({
                              ...prev,
                              textureLightElevation: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-yellow-500 cursor-pointer"
                        />
                      </div>

                      <button
                        onClick={() =>
                          onUpdateTreeConfig((prev) => ({
                            ...prev,
                            textureSeed: undefined,
                            pixelSize: undefined,
                            paletteSteps: undefined,
                            detailDensity: undefined,
                            textureContrast: undefined,
                            shadowStrength: undefined,
                            highlightAmount: undefined,
                            leafClusterSize: undefined,
                            leafClusterIrregularity: undefined,
                            canopyGapAmount: undefined,
                            barkVariation: undefined,
                            textureAccentAmount: undefined,
                            textureLightAzimuth: undefined,
                            textureLightElevation: undefined,
                            barkTexelScale: undefined,
                          }))
                        }
                        className="w-full py-1.5 rounded-lg bg-stone-800/90 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 text-[11px] font-medium cursor-pointer active:scale-95 transition flex items-center justify-center gap-1.5"
                        title="Voltar aos padrões artísticos da espécie"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restaurar Padrões da Espécie</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SPECIES / PRESETS */}
          {activeMainTab === 'presets' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-stone-300 font-medium">Espécies de Hyrule & Mudas</span>
                <span className="text-[10px] text-amber-400 font-serif">Zelda: BotW</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Selecione uma espécie para carregar a configuração base (árvore adulta majestosa ou muda tenra) e ajuste os sliders livremente.
              </p>

              {/* Stage Filter Buttons */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-stone-900/90 rounded-lg border border-stone-800 text-[11px]">
                <button
                  onClick={() => setStageFilter('all')}
                  className={`py-1 rounded font-medium transition cursor-pointer text-center ${
                    stageFilter === 'all'
                      ? 'bg-stone-700 text-stone-100 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Todas ({presetsList.length})
                </button>
                <button
                  onClick={() => setStageFilter('adult')}
                  className={`py-1 rounded font-medium transition flex items-center justify-center gap-1 cursor-pointer ${
                    stageFilter === 'adult'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <TreePine className="w-3 h-3" />
                  <span>Adultas</span>
                </button>
                <button
                  onClick={() => setStageFilter('sapling')}
                  className={`py-1 rounded font-medium transition flex items-center justify-center gap-1 cursor-pointer ${
                    stageFilter === 'sapling'
                      ? 'bg-lime-600 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Sprout className="w-3 h-3" />
                  <span>Mudas</span>
                </button>
                <button
                  onClick={() => setStageFilter('shrub')}
                  className={`py-1 rounded font-medium transition flex items-center justify-center gap-1 cursor-pointer ${
                    stageFilter === 'shrub'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Leaf className="w-3 h-3" />
                  <span>Arbustos</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1 max-h-[60vh] overflow-y-auto pr-1">
                {presetsList
                  .filter((p) => {
                    if (stageFilter === 'all') return true;
                    const stage = p.growthStage === 'shrub' ? 'shrub' : (p.growthStage === 'sapling' || p.species.endsWith('_sapling') ? 'sapling' : 'adult');
                    return stage === stageFilter;
                  })
                  .map((preset) => {
                    const isSelected = treeConfig.species === preset.species;
                    const isSapling = preset.growthStage === 'sapling' || preset.species.endsWith('_sapling');
                    const isShrub = preset.growthStage === 'shrub';

                    return (
                      <button
                        key={preset.id}
                        id={`preset-btn-${preset.species}`}
                        onClick={() => {
                          audioSystem.playKorokJingle();
                          onSelectPreset(preset.species);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                          isSelected
                            ? isSapling
                              ? 'bg-lime-950/70 border-lime-500/70 shadow-lg shadow-lime-950/40 text-lime-200'
                              : 'bg-emerald-950/70 border-emerald-500/70 shadow-lg shadow-emerald-950/40 text-emerald-200'
                            : 'bg-stone-900/50 hover:bg-stone-900 border-stone-800 text-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-4 h-4 rounded-full border border-stone-700 shadow-sm flex-shrink-0"
                            style={{ backgroundColor: preset.foliageColorTop }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-xs text-stone-100 truncate">{preset.name}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium border ${
                                  isSapling
                                    ? 'bg-lime-500/20 text-lime-300 border-lime-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {isShrub ? 'Arbusto' : isSapling ? 'Muda' : 'Adulta'} • {preset.trunkHeight}m
                              </span>
                            </div>
                            <div className="text-[10px] text-stone-400 truncate">
                              {preset.foliageType === 'cloud' && 'Copa em Nuvens Flutuantes'}
                              {preset.foliageType === 'pine_cone' && 'Pinheiro Cônico Escalonado'}
                              {preset.foliageType === 'palm_frond' && 'Palmeira Tropical de Faron'}
                              {preset.foliageType === 'cactus_bloom' && 'Cacto de Gerudo (Florescente)'}
                              {preset.foliageType === 'swamp_weeping' && 'Manguezal do Pântano (Raízes Escoras)'}
                              {preset.foliageType === 'none' && 'Árvore Seca / Deadwood (Sem Folhas, Galhos Retorcidos)'}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold border flex-shrink-0 ml-1 ${
                              isSapling
                                ? 'bg-lime-500/30 text-lime-200 border-lime-400/50'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            Ativa
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 3: ENVIRONMENT & LIGHTING */}
          {activeMainTab === 'env' && (
            <div className="space-y-4">
              <div>
                <span className="text-stone-400 block mb-2 font-medium">Horário do Dia em Hyrule</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'day', label: 'Meio-Dia', desc: 'Sol Vivo BotW' },
                    { id: 'sunset', label: 'Pôr do Sol', desc: 'Golden Hour' },
                    { id: 'night', label: 'Noite', desc: 'Silent Princess' },
                    { id: 'misty', label: 'Névoa', desc: 'Serenidade Faron' },
                  ].map((time) => (
                    <button
                      key={time.id}
                      onClick={() =>
                        onUpdateEnvConfig((prev) => ({ ...prev, timeOfDay: time.id as TimeOfDay }))
                      }
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        envConfig.timeOfDay === time.id
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                          : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800/80'
                      }`}
                    >
                      <div className="font-semibold text-xs">{time.label}</div>
                      <div className="text-[10px] text-stone-400">{time.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
