import React from 'react';
import { 
  RotateCcw, 
  Info, 
  Thermometer, 
  Droplets, 
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { VisualizationSettings } from '../../types/ocean';

export interface TopBarProps {
  settings: VisualizationSettings;
  onUpdateSettings: (updates: Partial<VisualizationSettings>) => void;
  onResetView: () => void;
  onOpenAbout: () => void;
  toggleControlPanel: () => void;
  isControlPanelOpen: boolean;
  currentDateLabel: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  settings,
  onUpdateSettings,
  onResetView,
  onOpenAbout,
  toggleControlPanel,
  isControlPanelOpen,
  currentDateLabel,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2.5 bg-scientific-panel backdrop-blur-md border-b border-scientific-border text-scientific-text shadow-glass select-none">
      {/* Left: Branding & Status */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={toggleControlPanel}
          className={`p-1.5 rounded-lg border transition-colors ${
            isControlPanelOpen 
              ? 'bg-scientific-highlight border-cyan text-cyan' 
              : 'border-scientific-border hover:bg-ocean-800 text-scientific-dim hover:text-white'
          }`}
          title="Toggle Control Panel"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="AquaScope Logo" className="w-7 h-7 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider text-base bg-gradient-to-r from-cyan to-teal-accent bg-clip-text text-transparent font-mono">
                AQUASCOPE
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded bg-cyan/15 text-cyan border border-cyan/30">
                INCOIS DATA
              </span>
            </div>
            <p className="text-[11px] text-scientific-dim font-medium tracking-tight">
              3D Indian Ocean Data Visualization
            </p>
          </div>
        </div>
      </div>

      {/* Middle: Active Dataset Readout */}
      <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-ocean-950/70 border border-scientific-border rounded-full text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-scientific-dim">INCOIS 10-DAY ANALYSIS:</span>
        </div>
        <span className="text-cyan font-semibold">{currentDateLabel}</span>
        <span className="text-scientific-dim">•</span>
        <span className="text-teal-300 text-[11px]">
          78 Argo Buoys • 24 Depths (0–2000m)
        </span>
      </div>

      {/* Right: Quick Controls */}
      <div className="flex items-center gap-2">
        <div className="flex bg-ocean-950/80 p-0.5 rounded-lg border border-scientific-border">
          <button
            onClick={() => onUpdateSettings({ variable: 'temperature' })}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
              settings.variable === 'temperature'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm font-semibold'
                : 'text-scientific-dim hover:text-white hover:bg-ocean-800/60'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>TEMP (°C)</span>
          </button>
          <button
            onClick={() => onUpdateSettings({ variable: 'salinity' })}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
              settings.variable === 'salinity'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm font-semibold'
                : 'text-scientific-dim hover:text-white hover:bg-ocean-800/60'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>SAL (PSU)</span>
          </button>
        </div>

        <div className="relative group">
          <select
            value={settings.cameraPreset}
            onChange={(e) => onUpdateSettings({ cameraPreset: e.target.value as any })}
            className="appearance-none bg-ocean-900 border border-scientific-border hover:border-cyan text-xs font-medium text-scientific-text py-1.5 pl-2.5 pr-7 rounded-lg cursor-pointer focus:outline-none focus:border-cyan transition-colors"
          >
            <option value="overview">🌐 Overview (3D Basin)</option>
            <option value="topdown">🗺️ Top-Down (Map View)</option>
            <option value="arabian">🌊 Arabian Sea</option>
            <option value="bayofbengal">🌀 Bay of Bengal</option>
            <option value="equatorial">📐 Equatorial Transect</option>
            <option value="southocean">🧭 South Indian Ocean</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-scientific-dim absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <button
          onClick={onResetView}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-scientific-border bg-ocean-900 hover:bg-ocean-800 text-xs font-medium text-scientific-dim hover:text-white transition-colors"
          title="Reset Camera View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          onClick={onOpenAbout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan/40 bg-cyan/10 hover:bg-cyan/20 text-xs font-semibold text-cyan transition-all shadow-sm"
          title="About AquaScope & Future Scope"
        >
          <Info className="w-3.5 h-3.5" />
          <span>About</span>
        </button>
      </div>
    </header>
  );
};
