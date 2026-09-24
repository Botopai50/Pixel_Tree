import React, { useState, useRef, useEffect } from 'react';
import { Viewport3D, Viewport3DHandle } from './components/Viewport3D';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { TreeConfig, EnvironmentConfig, TreeSpecies } from './types';
import { TREE_PRESETS } from './constants/presets';
import { audioSystem } from './services/audioSynthesizer';
import { SpeciesBar } from './components/SpeciesBar';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [treeConfig, setTreeConfig] = useState<TreeConfig>(TREE_PRESETS.swamp_mangrove);
  const [envConfig, setEnvConfig] = useState<EnvironmentConfig>({
    timeOfDay: 'day',
    showGrass: true,
    showStones: true,
    autoRotate: false,
    soundEnabled: false,
  });
  const [fps, setFps] = useState<number>(60);
  // the phone settings sheet, while open, covers the lower part of the scene
  const [sheetOpen, setSheetOpen] = useState(false);
  const viewportRef = useRef<Viewport3DHandle>(null);

  // Quick preset selector
  const handleSelectPreset = (species: TreeSpecies) => {
    const basePreset = TREE_PRESETS[species];
    if (basePreset) {
      setTreeConfig({
        ...basePreset,
        seed: Math.floor(Math.random() * 9000) + 1000,
      });
    }
  };

  // Randomize seed
  const handleRandomizeSeed = () => {
    setTreeConfig((prev) => ({
      ...prev,
      seed: Math.floor(Math.random() * 90000) + 1000,
    }));
  };

  // Toggle procedural wind sound
  const handleToggleSound = () => {
    setEnvConfig((prev) => {
      const nextState = !prev.soundEnabled;
      audioSystem.toggleWind(nextState);
      return { ...prev, soundEnabled: nextState };
    });
  };

  // Toggle Turntable
  const handleToggleAutoRotate = () => {
    setEnvConfig((prev) => ({ ...prev, autoRotate: !prev.autoRotate }));
  };

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      audioSystem.toggleWind(false);
    };
  }, []);

  return (
    <div id="botw-app-root" className="relative w-screen h-screen overflow-hidden font-sans bg-stone-950 select-none">
      {/* 3D Three.js Canvas Viewport */}
      <Viewport3D
        ref={viewportRef}
        treeConfig={treeConfig}
        envConfig={envConfig}
        onFpsUpdate={setFps}
        viewInsetBottom={sheetOpen ? 0.62 : 0}
      />

      {/* Header with Title & Action Controls */}
      <Header
        treeConfig={treeConfig}
        envConfig={envConfig}
        fps={fps}
        onRandomizeSeed={handleRandomizeSeed}
        onToggleSound={handleToggleSound}
        onToggleAutoRotate={handleToggleAutoRotate}
        onResetCamera={() => viewportRef.current?.resetCamera()}
        onFocusCanopy={() => viewportRef.current?.focusCanopy()}
        onFocusTrunk={() => viewportRef.current?.focusTrunk()}
        onScreenshot={() => viewportRef.current?.takeScreenshot()}
        onExportOBJ={() => viewportRef.current?.exportOBJ()}
      />

      {/* Floating Control & Customization Panel */}
      <ControlPanel
        treeConfig={treeConfig}
        envConfig={envConfig}
        onUpdateTreeConfig={setTreeConfig}
        onUpdateEnvConfig={setEnvConfig}
        onSelectPreset={handleSelectPreset}
        onMobileSheetChange={setSheetOpen}
      />

      {/* Floating Procedural Stats HUD (Top-Left under header) */}
      <div
        id="procedural-hud"
        className="absolute top-20 left-3 sm:left-4 z-10 pointer-events-none hidden md:flex flex-col gap-1.5"
      >
        <div className="pointer-events-auto bg-stone-950/80 backdrop-blur-md border border-stone-800/80 rounded-xl px-3 py-2 shadow-xl flex items-center gap-3 text-xs text-stone-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-stone-100">Geração Procedural</span>
          </div>
          <span className="text-stone-600">|</span>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>
              <b className="text-amber-300">#{treeConfig.seed}</b>
            </span>
            <span>
              Alt: <b className="text-emerald-300">{treeConfig.trunkHeight.toFixed(1)}m</b>
            </span>
            <span>
              Galhos: <b className="text-emerald-300">{treeConfig.branchCount}</b>
            </span>
            <span>
              Nuvens: <b className="text-emerald-300">{treeConfig.clusterCount}</b>
            </span>
          </div>
          <button
            onClick={handleRandomizeSeed}
            className="ml-1 px-2 py-1 rounded bg-stone-800/90 hover:bg-emerald-600 text-stone-200 hover:text-white border border-stone-700 hover:border-emerald-500 font-sans text-[11px] font-medium transition cursor-pointer active:scale-95 flex items-center gap-1 shadow-sm"
            title="Sortear nova semente procedural"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Sortear</span>
          </button>
        </div>
      </div>

      {/* Quick Bottom Species Switcher & Navigation Hints */}
      <SpeciesBar
        currentSpecies={treeConfig.species}
        onSelectPreset={handleSelectPreset}
      />
    </div>
  );
}
