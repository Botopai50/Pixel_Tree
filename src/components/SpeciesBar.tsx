import React, { useState, useRef, useEffect } from 'react';
import { AssetConfig,AssetId,AssetCategory,isStructure } from '../assets/types';
import { ASSET_PRESETS,classifyAsset } from '../assets/catalog';
import { TreeSpecies, TreeConfig } from '../types';
import { TREE_PRESETS } from '../constants/presets';
import { rockBiomeForSpecies } from '../constants/rockBiomes';
import { PROP_LABELS } from '../constants/groundProps';
import { audioSystem } from '../services/audioSynthesizer';
import {
  TreePine,
  Sprout,
  Leaf,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  X,
  Check,
  Axe,
  Flower2,
  Mountain,
  Gem,
} from 'lucide-react';

interface SpeciesBarProps {
  currentSpecies: AssetId;
  onSelectPreset: (species: AssetId) => void;
}

type Stage = 'adult' | 'sapling' | 'shrub' | 'log' | 'plant' | 'rock' | 'ore' | 'gravel' | 'crystals' | 'leaves' | 'structure';

interface PresetItem {
  id: string;
  name: string;
  shortName: string;
  species: AssetId;
  color: string;
  growthStage: Stage;
}

function stageOf(p:AssetConfig|undefined):Stage{return classifyAsset(p);}

export function SpeciesBar({ currentSpecies, onSelectPreset }: SpeciesBarProps) {
  const currentStage: Stage = stageOf(ASSET_PRESETS[currentSpecies]);

  const [activeTab, setActiveTab] = useState<Stage>(currentStage);
  const [isGridOpen, setIsGridOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [categoryEdges, setCategoryEdges] = useState({ left: false, right: false });
  const gridModalRef = useRef<HTMLDivElement>(null);

  const updateCategoryEdges = () => {
    const strip = categoryScrollRef.current;
    if (strip) setCategoryEdges({ left: strip.scrollLeft > 2, right: strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 2 });
  };
  useEffect(() => {
    const strip = categoryScrollRef.current;
    if (!strip) return;
    const observer = new ResizeObserver(updateCategoryEdges);
    observer.observe(strip);
    updateCategoryEdges();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    categoryScrollRef.current?.querySelector(`#tab-select-${activeTab}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    updateCategoryEdges();
  }, [activeTab]);
  const scrollCategories = (direction: number) => {
    const strip = categoryScrollRef.current;
    strip?.scrollBy({ left: direction * Math.max(160, strip.clientWidth * 0.65), behavior: 'smooth' });
  };

  // Sync active tab when currentSpecies changes externally
  useEffect(() => {
    setActiveTab(currentStage);
  }, [currentSpecies, currentStage]);

  // Click outside to close grid
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        gridModalRef.current &&
        !gridModalRef.current.contains(e.target as Node)
      ) {
        setIsGridOpen(false);
      }
    }
    if (isGridOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isGridOpen]);

  // Group presets
  const allPresets = Object.values(ASSET_PRESETS);
  const presetsOf = (stage: Stage): PresetItem[] =>
    allPresets
      .filter((p) => stageOf(p) === stage)
      .map((p) => ({
        id: p.id,
        name: p.name,
        shortName: formatShortName(p.name, stage),
        species: p.species as AssetId,
        color: isStructure(p)?p.structure.palette.roof:p.foliageColorTop || '#7ec832',
        growthStage: stage,
      }));
  const adultPresets = presetsOf('adult');
  const saplingPresets = presetsOf('sapling');
  const shrubPresets = presetsOf('shrub');
  const logPresets = presetsOf('log');
  const plantPresets = presetsOf('plant');
  const rockPresets = presetsOf('rock');
  const orePresets = presetsOf('ore');
  const gravelPresets = presetsOf('gravel');

  const structurePresets=presetsOf('structure');
  const displayedPresets =
    activeTab==='structure'?structurePresets:
    activeTab === 'adult'
      ? adultPresets
      : activeTab === 'sapling'
      ? saplingPresets
      : activeTab === 'shrub'
      ? shrubPresets
      : activeTab === 'log'
      ? logPresets
      : activeTab === 'rock' ? rockPresets : activeTab === 'ore' ? orePresets : activeTab === 'gravel' ? gravelPresets : ['crystals','leaves'].includes(activeTab) ? presetsOf(activeTab) : plantPresets;

  const handleSelect = (species: AssetId) => {
    audioSystem.playKorokJingle();
    onSelectPreset(species);
    setIsGridOpen(false);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div
      id="botw-bottom-bar"
      className="absolute bottom-2 sm:bottom-3 pb-[env(safe-area-inset-bottom)] left-1/2 -translate-x-1/2 md:left-3 md:translate-x-0 z-20 flex flex-col items-center gap-1.5 w-full max-w-[calc(100vw-1rem)] sm:max-w-2xl md:max-w-[calc(100vw-28rem)] lg:max-w-[calc(100vw-28rem)] px-2 pointer-events-none"
    >
      {/* Popover: Grid of all 16 species */}
      {isGridOpen && (
        <div
          ref={gridModalRef}
          id="species-grid-modal"
          className="pointer-events-auto mb-2 w-full max-w-xl bg-stone-950/95 backdrop-blur-xl border border-stone-700/80 rounded-2xl shadow-2xl p-4 text-stone-200 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="font-serif font-bold text-stone-100 text-sm tracking-wide">
                Catálogo de Natureza ({allPresets.length} Modelos)
              </h3>
            </div>
            <button
              id="btn-close-species-grid"
              onClick={() => setIsGridOpen(false)}
              className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition cursor-pointer"
              title="Fechar catálogo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 pt-3 max-h-[50vh] overflow-y-auto pr-1">
            {/* Adult Trees */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
                <TreePine className="w-4 h-4" />
                <span>Árvores Adultas Majestosas ({adultPresets.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {adultPresets.map((item) => {
                  const isSelected = currentSpecies === item.species;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.species)}
                      className={`p-2 rounded-xl text-left border text-xs font-medium transition cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-100 shadow-sm'
                          : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:text-white hover:bg-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="w-3 h-3 rounded-full border border-black/40 shadow-sm shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <span className="truncate font-sans">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Saplings & Sprouts */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-lime-400 mb-2">
                <Sprout className="w-4 h-4" />
                <span>Mudas & Brotos Delicados ({saplingPresets.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {saplingPresets.map((item) => {
                  const isSelected = currentSpecies === item.species;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.species)}
                      className={`p-2 rounded-xl text-left border text-xs font-medium transition cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-lime-600/30 border-lime-500 text-lime-100 shadow-sm'
                          : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:text-white hover:bg-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="w-3 h-3 rounded-full border border-black/40 shadow-sm shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        {isSelected && <Check className="w-3.5 h-3.5 text-lime-400" />}
                      </div>
                      <span className="truncate font-sans">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shrubs */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-400 mb-2">
                <Leaf className="w-4 h-4" />
                <span>Arbustos ({shrubPresets.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {shrubPresets.map((item) => {
                  const isSelected = currentSpecies === item.species;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.species)}
                      className={`p-2 rounded-xl text-left border text-xs font-medium transition cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-teal-600/30 border-teal-500 text-teal-100 shadow-sm'
                          : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:text-white hover:bg-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="w-3 h-3 rounded-full border border-black/40 shadow-sm shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        {isSelected && <Check className="w-3.5 h-3.5 text-teal-400" />}
                      </div>
                      <span className="truncate font-sans">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Logs & Stumps */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-2">
                <Axe className="w-4 h-4" />
                <span>Troncos & Tocos ({logPresets.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {logPresets.map((item) => {
                  const isSelected = currentSpecies === item.species;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.species)}
                      className={`p-2 rounded-xl text-left border text-xs font-medium transition cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-amber-600/30 border-amber-500 text-amber-100 shadow-sm'
                          : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:text-white hover:bg-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="w-3 h-3 rounded-full border border-black/40 shadow-sm shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <span className="truncate font-sans">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-200 mb-2"><Mountain className="w-4 h-4" /><span>Pedras por Bioma ({rockPresets.length})</span></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {rockPresets.map(item => <button key={item.id} onClick={() => handleSelect(item.species)} className={
                  'p-2 rounded-xl text-left border text-xs cursor-pointer ' + (currentSpecies === item.species ? 'bg-amber-950 border-amber-500 text-amber-100' : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800')
                }><span className="block w-3 h-3 rounded mb-1" style={{ backgroundColor: item.color }} />{item.shortName}</button>)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-200 mb-2"><Mountain className="w-4 h-4" /><span>Pedrinhas e cascalho ({gravelPresets.length})</span></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {gravelPresets.map(item => <button key={item.id} onClick={() => handleSelect(item.species)} className={'p-2 rounded-xl text-left border text-xs cursor-pointer ' + (currentSpecies === item.species ? 'bg-stone-700 border-stone-400 text-white' : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800')}><span className="block w-3 h-3 rounded mb-1" style={{ backgroundColor: item.color }} />{item.shortName}</button>)}
              </div>
            </div>
            <div><div className="text-xs font-semibold text-sky-200 mb-2">Estruturas ({structurePresets.length})</div><div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">{structurePresets.map(item=><button key={item.id} onClick={()=>handleSelect(item.species)} className="p-2 rounded-xl border border-stone-700 text-left text-xs text-stone-200 hover:bg-stone-800 cursor-pointer">{item.name}</button>)}</div></div>
            {/* Ground plants */}
            {(['crystals','leaves'] as const).map(kind=><div key={kind}>
              <div className="text-xs font-semibold text-amber-200 mb-2">{PROP_LABELS[kind]} ({presetsOf(kind).length})</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">{presetsOf(kind).map(item=><button key={item.id} onClick={()=>handleSelect(item.species)} className={'p-2 rounded-xl text-left border text-xs cursor-pointer '+(currentSpecies===item.species?'bg-amber-950 border-amber-500 text-amber-100':'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800')}><span className="block w-3 h-3 rounded mb-1" style={{backgroundColor:item.color}}/>{item.shortName}</button>)}</div>
            </div>)}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-300 mb-2"><Gem className="w-4 h-4" /><span>Pedras com minérios ({orePresets.length})</span></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {orePresets.map(item => <button key={item.id} onClick={() => handleSelect(item.species)} className={
                  'p-2 rounded-xl text-left border text-xs cursor-pointer ' + (currentSpecies === item.species ? 'bg-orange-950 border-orange-500 text-orange-100' : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800')
                }><span className="block w-3 h-3 rounded mb-1" style={{ backgroundColor: item.color }} />{item.shortName}</button>)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 mb-2">
                <Flower2 className="w-4 h-4" />
                <span>Plantas Rasteiras ({plantPresets.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {plantPresets.map((item) => {
                  const isSelected = currentSpecies === item.species;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.species)}
                      className={`p-2 rounded-xl text-left border text-xs font-medium transition cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-rose-600/30 border-rose-500 text-rose-100 shadow-sm'
                          : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:text-white hover:bg-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="w-3 h-3 rounded-full border border-black/40 shadow-sm shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        {isSelected && <Check className="w-3.5 h-3.5 text-rose-400" />}
                      </div>
                      <span className="truncate font-sans">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Bar: Category Selector + Scrollable Pills + Grid Button */}
      <div className="pointer-events-auto grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-1.5 p-1.5 rounded-2xl bg-stone-950/90 backdrop-blur-xl border border-stone-800/90 shadow-2xl w-full overflow-hidden">
        {/* Category Tabs: Árvores / Mudas / Arbustos / Troncos */}
        <div className="col-span-4 min-w-0 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 p-0.5 rounded-xl bg-stone-900/90 border border-stone-800">
          <button id="btn-scroll-categories-left" aria-label="Rolar categorias para esquerda" title="Rolar categorias para esquerda" disabled={!categoryEdges.left} onClick={() => scrollCategories(-1)} className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700 disabled:opacity-25 disabled:cursor-default cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
          <div ref={categoryScrollRef} onScroll={updateCategoryEdges} className="min-w-0 flex items-center overflow-x-auto scrollbar-none touch-pan-x [&>button]:shrink-0 [&>button]:flex-none [&>button]:whitespace-nowrap">
          <button
            id="tab-select-adult"
            onClick={() => setActiveTab('adult')}
            className={`flex-1 md:flex-none justify-center px-1.5 sm:px-2.5 py-1.5 md:py-1 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition cursor-pointer ${
              activeTab === 'adult'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Exibir árvores adultas"
          >
            <TreePine className="w-3.5 h-3.5" />
            <span className={activeTab === 'adult' ? '' : 'hidden sm:inline'}>Árvores</span>
            <span className="hidden sm:inline text-[10px] opacity-75">{adultPresets.length}</span>
          </button>

          <button
            id="tab-select-sapling"
            onClick={() => setActiveTab('sapling')}
            className={`flex-1 md:flex-none justify-center px-1.5 sm:px-2.5 py-1.5 md:py-1 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition cursor-pointer ${
              activeTab === 'sapling'
                ? 'bg-lime-600 text-white shadow-md shadow-lime-950/60'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Exibir mudas e brotos"
          >
            <Sprout className="w-3.5 h-3.5" />
            <span className={activeTab === 'sapling' ? '' : 'hidden sm:inline'}>Mudas</span>
            <span className="hidden sm:inline text-[10px] opacity-75">{saplingPresets.length}</span>
          </button>

          <button
            id="tab-select-shrub"
            onClick={() => setActiveTab('shrub')}
            className={`flex-1 md:flex-none justify-center px-1.5 sm:px-2.5 py-1.5 md:py-1 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition cursor-pointer ${
              activeTab === 'shrub'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-950/60'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Exibir arbustos"
          >
            <Leaf className="w-3.5 h-3.5" />
            <span className={activeTab === 'shrub' ? '' : 'hidden sm:inline'}>Arbustos</span>
            <span className="hidden sm:inline text-[10px] opacity-75">{shrubPresets.length}</span>
          </button>

          <button
            id="tab-select-log"
            onClick={() => setActiveTab('log')}
            className={`flex-1 md:flex-none justify-center px-1.5 sm:px-2.5 py-1.5 md:py-1 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition cursor-pointer ${
              activeTab === 'log'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/60'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Exibir troncos e tocos"
          >
            <Axe className="w-3.5 h-3.5" />
            <span className={activeTab === 'log' ? '' : 'hidden sm:inline'}>Troncos</span>
            <span className="hidden sm:inline text-[10px] opacity-75">{logPresets.length}</span>
          </button>

          <button
            id="tab-select-plant"
            onClick={() => setActiveTab('plant')}
            className={`flex-1 md:flex-none justify-center px-1.5 sm:px-2.5 py-1.5 md:py-1 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition cursor-pointer ${
              activeTab === 'plant'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/60'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Exibir plantas rasteiras"
          >
            <Flower2 className="w-3.5 h-3.5" />
            <span className={activeTab === 'plant' ? '' : 'hidden sm:inline'}>Rasteiras</span>
            <span className="hidden sm:inline text-[10px] opacity-75">{plantPresets.length}</span>
          </button>
          <button id="tab-select-rock" onClick={() => {
            setActiveTab('rock');
            if (currentStage !== 'rock') handleSelect((rockBiomeForSpecies(currentSpecies as TreeSpecies) + '_rock') as TreeSpecies);
          }} className={
            'flex-1 md:flex-none justify-center px-1.5 sm:px-2.5 py-1.5 md:py-1 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition cursor-pointer ' +
            (activeTab === 'rock' ? 'bg-amber-700 text-white' : 'text-stone-400 hover:text-stone-200')
          } title="Gerar pedras do bioma da árvore atual"><Mountain className="w-3.5 h-3.5" /><span className={activeTab === 'rock' ? '' : 'hidden sm:inline'}>Pedras</span><span className="text-[10px] opacity-75">{rockPresets.length}</span></button>
          <button id="tab-select-gravel" onClick={() => {
            setActiveTab('gravel');
            if (currentStage !== 'gravel') handleSelect((rockBiomeForSpecies(currentSpecies as TreeSpecies) + '_gravel') as TreeSpecies);
          }} className={'flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 md:py-1 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap cursor-pointer ' + (activeTab === 'gravel' ? 'bg-stone-600 text-white' : 'text-stone-400 hover:text-stone-200')} title="Gerar pequenos grupos de pedras por bioma"><Mountain className="w-3.5 h-3.5" /><span className={activeTab === 'gravel' ? '' : 'hidden sm:inline'}>Pedrinhas e cascalho</span><span className="text-[10px] opacity-75">{gravelPresets.length}</span></button>
          <button id="tab-select-ore" onClick={() => {
            setActiveTab('ore');
            if (currentStage !== 'ore') handleSelect((rockBiomeForSpecies(currentSpecies as TreeSpecies) + '_ore') as TreeSpecies);
          }} className={
            'flex-1 md:flex-none shrink-0 justify-center px-1.5 sm:px-2.5 py-1.5 md:py-1 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 whitespace-nowrap transition cursor-pointer ' +
            (activeTab === 'ore' ? 'bg-orange-700 text-white' : 'text-stone-400 hover:text-stone-200')
          } title="Gerar pedras com minérios do bioma atual"><Gem className="w-3.5 h-3.5" /><span className={activeTab === 'ore' ? '' : 'hidden sm:inline'}>Pedras com minérios</span><span className="text-[10px] opacity-75">{orePresets.length}</span></button>
          {(['crystals','leaves'] as const).map(kind=><button key={kind} id={`tab-select-${kind}`} onClick={()=>{setActiveTab(kind);if(currentStage!==kind)handleSelect(`${rockBiomeForSpecies(currentSpecies as TreeSpecies)}_${kind}` as TreeSpecies);}} className={'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer '+(activeTab===kind?'bg-emerald-700 text-white':'text-stone-400 hover:text-stone-200')}>
            {kind==='crystals'?<Gem className="w-3.5 h-3.5"/>:<Leaf className="w-3.5 h-3.5"/>}<span>{PROP_LABELS[kind]}</span><span className="text-[10px] opacity-75">{presetsOf(kind).length}</span>
          </button>)}
          <button id="tab-select-structure" onClick={()=>{setActiveTab('structure');if(currentStage!=='structure')handleSelect('structure_house');}} className={'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer '+(activeTab==='structure'?'bg-sky-700 text-white':'text-stone-400 hover:text-stone-200')}><Mountain className="w-3.5 h-3.5"/><span>Estruturas</span><span className="text-[10px] opacity-75">{structurePresets.length}</span></button>
          </div>
          <button id="btn-scroll-categories-right" aria-label="Rolar categorias para direita" title="Rolar categorias para direita" disabled={!categoryEdges.right} onClick={() => scrollCategories(1)} className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700 disabled:opacity-25 disabled:cursor-default cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
        </div>

        {/* Scroll Left Button */}
        <button
          id="btn-scroll-species-left"
          onClick={() => handleScroll('left')}
          className="col-start-1 p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/80 transition cursor-pointer shrink-0"
          title="Rolar espécies para esquerda"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Horizontal Scrollable Pills Area */}
        <div
          ref={scrollRef}
          className="col-start-2 flex items-center gap-1.5 overflow-x-auto scroll-smooth py-0.5 px-1 scrollbar-none touch-pan-x flex-1 min-w-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {displayedPresets.map((item) => {
            const isSelected = currentSpecies === item.species;
            return (
              <button
                key={item.id}
                id={`pill-preset-${item.species}`}
                onClick={() => handleSelect(item.species)}
                className={`px-3 py-2 md:py-1.5 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 ${
                  isSelected
                    ? activeTab === 'sapling'
                      ? 'bg-lime-600 text-white shadow-md shadow-lime-900/50'
                      : activeTab === 'shrub'
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-900/50'
                      : activeTab === 'log'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-900/50'
                      : activeTab === 'plant'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-900/50'
                      : activeTab === 'ore'
                      ? 'bg-orange-700 text-white shadow-md shadow-orange-900/50'
                      : 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                    : 'bg-stone-900/60 text-stone-300 hover:text-white hover:bg-stone-800/80 border border-stone-800/60'
                }`}
                title={item.name}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Scroll Right Button */}
        <button
          id="btn-scroll-species-right"
          onClick={() => handleScroll('right')}
          className="col-start-3 p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/80 transition cursor-pointer shrink-0"
          title="Rolar espécies para direita"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Open Catalog (Grid Popover) */}
        <button
          id="btn-open-species-grid"
          onClick={() => setIsGridOpen(!isGridOpen)}
          className={`col-start-4 p-2 md:p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 text-xs shrink-0 ${
            isGridOpen
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 border-stone-700/60'
          }`}
          title={`Abrir catálogo completo com todas as ${allPresets.length} espécies`}
        >
          <LayoutGrid className="w-4 h-4 text-amber-400" />
          <span className="hidden md:inline font-medium">Todas</span>
        </button>
      </div>

      {/* Viewport Interaction Legend */}
      {/* (touch screens) */}
      <div className="md:hidden flex items-center gap-2 text-[10px] text-stone-300/80 bg-stone-950/60 backdrop-blur-sm px-3 py-0.5 rounded-full border border-stone-800/50">
        <span>
          Girar: <b>1 dedo</b>
        </span>
        <span>&bull;</span>
        <span>
          Zoom: <b>pinça</b>
        </span>
        <span>&bull;</span>
        <span>
          Mover: <b>2 dedos</b>
        </span>
      </div>
      <div className="hidden md:flex items-center gap-3 text-[11px] text-stone-300/80 bg-stone-950/60 backdrop-blur-sm px-3 py-0.5 rounded-full border border-stone-800/50">
        <span>
          Girar: <b>Clique & Arraste</b>
        </span>
        <span>&bull;</span>
        <span>
          Zoom: <b>Scroll</b>
        </span>
        <span>&bull;</span>
        <span>
          Mover: <b>Botão Direito</b>
        </span>
      </div>
    </div>
  );
}

function formatShortName(fullName: string, stage: Stage): string {
  if (stage === 'crystals' || stage === 'leaves') return fullName.replace(`${PROP_LABELS[stage]} de `, '');
  if (stage === 'gravel') return fullName.replace('Pedrinhas e cascalho de ', '');
  if (stage === 'ore') return fullName.replace('Pedra com minérios de ', '');
  if (stage === 'rock') return fullName.replace('Pedra de ', '');
  if (stage === 'plant') return fullName;
  if (stage === 'log') {
    return fullName.replace('Tronco com Raízes', 'Com Raízes');
  }
  if (stage === 'shrub') {
    return fullName
      .replace('Arbusto de Hyrule', 'Arbusto Hyrule')
      .replace('Arbusto de Frutinhas', 'Frutinhas')
      .replace('Arbusto Florido', 'Florido')
      .replace('Arbusto do Deserto', 'Deserto')
      .replace('Arbusto de Satori', 'Satori')
      .replace('Arbusto de Akkala', 'Akkala')
      .replace('Arbusto de Hebra', 'Hebra')
      .replace('Arbusto de Faron', 'Faron')
      .replace('Arbusto Korok', 'Korok')
      .replace('Arbusto do Pântano', 'Pântano')
      .replace('Arbusto da Savana', 'Savana')
      .replace('Arbusto Seco', 'Seco')
      .replace('Salgueiro-anão Ártico', 'Salgueiro Ártico');
  }
  if (stage === 'sapling') {
    return fullName
      .replace('Muda de Carvalho de Hyrule', 'Muda Carvalho')
      .replace('Muda de Cerejeira de Satori', 'Muda Cerejeira')
      .replace('Muda de Bétula de Akkala', 'Muda Bétula')
      .replace('Muda de Pinheiro Nevado de Hebra', 'Muda Pinheiro Nevado')
      .replace('Muda de Pinheiro de Hebra', 'Muda Pinheiro')
      .replace('Broto de Palmeira de Faron', 'Broto Palmeira')
      .replace('Broto da Árvore Ancestral Korok', 'Broto Korok')
      .replace('Muda de Cacto de Gerudo', 'Muda Cacto')
      .replace('Muda de Manguezal do Pântano', 'Muda Manguezal')
      .replace('Muda Seca de Hyrule', 'Muda Seca')
      .replace('Muda de Acácia da Savana', 'Muda Acácia');
  }

  return fullName
    .replace('Carvalho de Hyrule', 'Carvalho')
    .replace('Cerejeira de Satori', 'Cerejeira')
    .replace('Bétula Dourada de Akkala', 'Bétula Dourada')
    .replace('Pinheiro Nevado de Hebra', 'Pinheiro Nevado')
    .replace('Pinheiro de Hebra', 'Pinheiro')
    .replace('Palmeira de Faron', 'Palmeira')
    .replace('Árvore Ancestral Korok', 'Árvore Ancestral')
    .replace('Cacto de Gerudo', 'Cacto Gerudo')
    .replace('Árvore do Pântano (Manguezal)', 'Manguezal')
    .replace('Árvore Seca de Hyrule', 'Árvore Seca')
    .replace('Acácia da Savana', 'Acácia')
    .replace(/Bordo Outonal \((\w+)\)/, 'Bordo $1');
}


