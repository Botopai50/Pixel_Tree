import React, { useState, useRef, useEffect } from 'react';
import { TreeSpecies, TreeConfig } from '../types';
import { TREE_PRESETS } from '../constants/presets';
import { audioSystem } from '../services/audioSynthesizer';
import {
  TreePine,
  Sprout,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  X,
  Check,
} from 'lucide-react';

interface SpeciesBarProps {
  currentSpecies: TreeSpecies;
  onSelectPreset: (species: TreeSpecies) => void;
}

interface PresetItem {
  id: string;
  name: string;
  shortName: string;
  species: TreeSpecies;
  color: string;
  growthStage: 'adult' | 'sapling';
}

export function SpeciesBar({ currentSpecies, onSelectPreset }: SpeciesBarProps) {
  const currentStage: 'adult' | 'sapling' = currentSpecies.endsWith('_sapling')
    ? 'sapling'
    : 'adult';

  const [activeTab, setActiveTab] = useState<'adult' | 'sapling'>(currentStage);
  const [isGridOpen, setIsGridOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridModalRef = useRef<HTMLDivElement>(null);

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
  const allPresets = Object.values(TREE_PRESETS);
  const adultPresets: PresetItem[] = allPresets
    .filter((p) => (p.growthStage ?? 'adult') === 'adult' && !p.species.endsWith('_sapling'))
    .map((p) => ({
      id: p.id,
      name: p.name,
      shortName: formatShortName(p.name, 'adult'),
      species: p.species as TreeSpecies,
      color: p.foliageColorTop || '#7ec832',
      growthStage: 'adult',
    }));

  const saplingPresets: PresetItem[] = allPresets
    .filter((p) => p.growthStage === 'sapling' || p.species.endsWith('_sapling'))
    .map((p) => ({
      id: p.id,
      name: p.name,
      shortName: formatShortName(p.name, 'sapling'),
      species: p.species as TreeSpecies,
      color: p.foliageColorTop || '#8fe83a',
      growthStage: 'sapling',
    }));

  const displayedPresets = activeTab === 'adult' ? adultPresets : saplingPresets;

  const handleSelect = (species: TreeSpecies) => {
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
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 w-full max-w-[calc(100vw-1.5rem)] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl px-2 pointer-events-none"
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
                Catálogo Botânico de Hyrule ({allPresets.length} Espécies)
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
          </div>
        </div>
      )}

      {/* Main Bar: Category Selector + Scrollable Pills + Grid Button */}
      <div className="pointer-events-auto flex items-center gap-1.5 p-1 sm:p-1.5 rounded-2xl bg-stone-950/90 backdrop-blur-xl border border-stone-800/90 shadow-2xl w-full overflow-hidden">
        {/* Category Tabs: Árvores vs Mudas */}
        <div className="flex items-center p-0.5 rounded-xl bg-stone-900/90 border border-stone-800 shrink-0">
          <button
            id="tab-select-adult"
            onClick={() => setActiveTab('adult')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'adult'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Exibir árvores adultas"
          >
            <TreePine className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Árvores</span>
            <span className="text-[10px] opacity-75">8</span>
          </button>

          <button
            id="tab-select-sapling"
            onClick={() => setActiveTab('sapling')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'sapling'
                ? 'bg-lime-600 text-white shadow-md shadow-lime-950/60'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Exibir mudas e brotos"
          >
            <Sprout className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mudas</span>
            <span className="text-[10px] opacity-75">8</span>
          </button>
        </div>

        {/* Scroll Left Button */}
        <button
          id="btn-scroll-species-left"
          onClick={() => handleScroll('left')}
          className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/80 transition cursor-pointer shrink-0"
          title="Rolar espécies para esquerda"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Horizontal Scrollable Pills Area */}
        <div
          ref={scrollRef}
          className="flex items-center gap-1.5 overflow-x-auto scroll-smooth py-0.5 px-1 scrollbar-none touch-pan-x flex-1 min-w-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {displayedPresets.map((item) => {
            const isSelected = currentSpecies === item.species;
            return (
              <button
                key={item.id}
                id={`pill-preset-${item.species}`}
                onClick={() => handleSelect(item.species)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 ${
                  isSelected
                    ? activeTab === 'sapling'
                      ? 'bg-lime-600 text-white shadow-md shadow-lime-900/50'
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
          className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/80 transition cursor-pointer shrink-0"
          title="Rolar espécies para direita"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Open Catalog (Grid Popover) */}
        <button
          id="btn-open-species-grid"
          onClick={() => setIsGridOpen(!isGridOpen)}
          className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 text-xs shrink-0 ${
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
      <div className="flex items-center gap-3 text-[11px] text-stone-300/80 bg-stone-950/60 backdrop-blur-sm px-3 py-0.5 rounded-full border border-stone-800/50">
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

function formatShortName(fullName: string, stage: 'adult' | 'sapling'): string {
  if (stage === 'sapling') {
    return fullName
      .replace('Muda de Carvalho de Hyrule', 'Muda Carvalho')
      .replace('Muda de Cerejeira de Satori', 'Muda Cerejeira')
      .replace('Muda de Bétula de Akkala', 'Muda Bétula')
      .replace('Muda de Pinheiro de Hebra', 'Muda Pinheiro')
      .replace('Broto de Palmeira de Faron', 'Broto Palmeira')
      .replace('Broto da Árvore Ancestral Korok', 'Broto Korok')
      .replace('Muda de Cacto de Gerudo', 'Muda Cacto')
      .replace('Muda de Manguezal do Pântano', 'Muda Manguezal')
      .replace('Muda Seca de Hyrule', 'Muda Seca');
  }

  return fullName
    .replace('Carvalho de Hyrule', 'Carvalho')
    .replace('Cerejeira de Satori', 'Cerejeira')
    .replace('Bétula Dourada de Akkala', 'Bétula Dourada')
    .replace('Pinheiro de Hebra', 'Pinheiro')
    .replace('Palmeira de Faron', 'Palmeira')
    .replace('Árvore Ancestral Korok', 'Árvore Ancestral')
    .replace('Cacto de Gerudo', 'Cacto Gerudo')
    .replace('Árvore do Pântano (Manguezal)', 'Manguezal')
    .replace('Árvore Seca de Hyrule', 'Árvore Seca');
}


