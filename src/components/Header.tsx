import React from 'react';
import { 
  Sparkles, 
  Dices, 
  Camera, 
  Download, 
  Volume2, 
  VolumeX, 
  RotateCw, 
  Focus, 
  Maximize2 
} from 'lucide-react';
import { TreeConfig, EnvironmentConfig } from '../types';
import { audioSystem } from '../services/audioSynthesizer';

interface HeaderProps {
  treeConfig: TreeConfig;
  envConfig: EnvironmentConfig;
  fps: number;
  onRandomizeSeed: () => void;
  onToggleSound: () => void;
  onToggleAutoRotate: () => void;
  onResetCamera: () => void;
  onFocusCanopy: () => void;
  onFocusTrunk: () => void;
  onScreenshot: () => void;
  onExportOBJ: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  treeConfig,
  envConfig,
  fps,
  onRandomizeSeed,
  onToggleSound,
  onToggleAutoRotate,
  onResetCamera,
  onFocusCanopy,
  onFocusTrunk,
  onScreenshot,
  onExportOBJ,
}) => {
  return (
    <header
      id="botw-header"
      className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-gradient-to-b from-stone-950/85 via-stone-950/40 to-transparent"
    >
      {/* Title & BotW Brand */}
      <div className="pointer-events-auto flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-950/50 backdrop-blur-md">
          <Sparkles className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif tracking-widest text-sm sm:text-base font-bold text-amber-200 uppercase drop-shadow-sm">
              The Legend of Zelda
            </h1>
            <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider font-semibold">
              BotW Tree.js
            </span>
          </div>
          <p className="text-xs text-stone-300 font-sans tracking-wide">
            Gerador Procedural Cel-Shaded &bull; {treeConfig.name}
          </p>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 sm:gap-2 bg-stone-900/80 backdrop-blur-md border border-stone-700/60 p-1.5 rounded-xl shadow-xl">
        {/* Seed & Randomize */}
        <button
          id="btn-randomize-seed"
          onClick={() => {
            audioSystem.playLeafRustle();
            onRandomizeSeed();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-medium transition cursor-pointer active:scale-95"
          title="Gerar nova semente aleatória"
        >
          <Dices className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Semente:</span>
          <span className="font-mono text-amber-300 font-semibold">{treeConfig.seed}</span>
        </button>

        <div className="h-4 w-[1px] bg-stone-700" />

        {/* Camera Controls */}
        <button
          id="btn-camera-reset"
          onClick={onResetCamera}
          className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800/80 transition cursor-pointer"
          title="Resetar Câmera"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          id="btn-camera-canopy"
          onClick={onFocusCanopy}
          className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800/80 transition cursor-pointer text-xs flex items-center gap-1"
          title="Focar na Copa da Árvore"
        >
          <Focus className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] hidden lg:inline">Copa</span>
        </button>
        <button
          id="btn-camera-trunk"
          onClick={onFocusTrunk}
          className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800/80 transition cursor-pointer text-xs flex items-center gap-1"
          title="Focar no Tronco & Raízes"
        >
          <Focus className="w-4 h-4 text-amber-600" />
          <span className="text-[11px] hidden lg:inline">Tronco</span>
        </button>

        <button
          id="btn-auto-rotate"
          onClick={onToggleAutoRotate}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            envConfig.autoRotate
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
          }`}
          title="Girar Câmera Automaticamente (Turntable)"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Ambient Sound */}
        <button
          id="btn-toggle-sound"
          onClick={onToggleSound}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            envConfig.soundEnabled
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80'
          }`}
          title={envConfig.soundEnabled ? 'Silenciar som do vento' : 'Ativar brisa suave de Hyrule'}
        >
          {envConfig.soundEnabled ? (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>

        <div className="h-4 w-[1px] bg-stone-700" />

        {/* Screenshot */}
        <button
          id="btn-screenshot"
          onClick={onScreenshot}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-stone-200 hover:text-white hover:bg-stone-800/80 transition cursor-pointer text-xs flex items-center gap-1.5"
          title="Capturar Foto PNG em Alta Resolução"
        >
          <Camera className="w-4 h-4 text-sky-400" />
          <span className="hidden md:inline">Capturar</span>
        </button>

        {/* Export OBJ */}
        <button
          id="btn-export-obj"
          onClick={onExportOBJ}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/40 transition cursor-pointer active:scale-95"
          title="Exportar Geometria 3D (.OBJ para Blender/Unity)"
        >
          <Download className="w-4 h-4" />
          <span>Exportar 3D (.OBJ)</span>
        </button>

        {/* Performance indicator */}
        <span className="text-[10px] font-mono text-stone-400 px-1 hidden sm:inline">
          {fps} FPS
        </span>
      </div>
    </header>
  );
};
