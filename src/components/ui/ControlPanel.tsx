import React from 'react';
import { 
  Sliders, 
  Layers, 
  Eye, 
  Maximize2, 
  Palette, 
  Anchor, 
  Mountain, 
  Compass, 
  RotateCcw,
  ArrowUpDown,
  X
} from 'lucide-react';
import { ColormapType, GridManifest, VisualizationSettings } from '../../types/ocean';

export interface ControlPanelProps {
  manifest: GridManifest;
  settings: VisualizationSettings;
  onUpdateSettings: (updates: Partial<VisualizationSettings>) => void;
  isOpen: boolean;
  onClose: () => void;
  activeSliceStats?: { min: number; max: number; mean: number; validCount: number };
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  manifest,
  settings,
  onUpdateSettings,
  isOpen,
  onClose,
  activeSliceStats,
}) => {
  if (!isOpen) return null;

  const depths = manifest.depths_m;
  const currentDepthMeters = depths[settings.depthIndex] || depths[0];
  const isTemp = settings.variable === 'temperature';
  const activeVarMeta = isTemp ? manifest.variables.TEMP : manifest.variables.SAL;

  const handleResetColorRange = () => {
    onUpdateSettings({
      colorRange: {
        min: activeVarMeta.colorBarMin,
        max: activeVarMeta.colorBarMax,
        autoScale: false,
      }
    });
  };

  const handleDepthPreset = (depthM: number) => {
    let bestIdx = 0;
    let minDiff = Infinity;
    depths.forEach((d, idx) => {
      const diff = Math.abs(d - depthM);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = idx;
      }
    });
    onUpdateSettings({
      depthIndex: bestIdx,
      currentDepth: depths[bestIdx],
    });
  };

  return (
    <aside className="absolute top-16 left-4 bottom-20 z-20 w-84 bg-scientific-panel/95 backdrop-blur-xl border border-scientific-border rounded-xl shadow-glass text-scientific-text flex flex-col overflow-hidden transition-all duration-300 select-none animate-in fade-in slide-in-from-left-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-scientific-border bg-ocean-950/60">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan" />
          <span className="font-semibold text-xs uppercase tracking-wider font-mono text-cyan">
            Scientific Controls
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-ocean-800 text-scientific-dim hover:text-white transition-colors"
          title="Collapse Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Control Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs">
        {/* 1. VARIABLE SELECTION */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-scientific-dim flex items-center justify-between">
            <span>Observation Variable</span>
            <span className="text-cyan font-mono">{activeVarMeta.units === 'degC' ? '°C' : activeVarMeta.units}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdateSettings({ variable: 'temperature' })}
              className={`flex flex-col items-start p-2 rounded-lg border transition-all ${
                settings.variable === 'temperature'
                  ? 'bg-gradient-to-br from-orange-500/20 to-amber-500/10 border-orange-400/60 text-white shadow-sm'
                  : 'border-scientific-border bg-ocean-950/40 text-scientific-dim hover:bg-ocean-800/60 hover:text-white'
              }`}
            >
              <span className="font-bold text-xs">Temperature</span>
              <span className="text-[10px] text-orange-300 font-mono">TEMP (°C)</span>
            </button>

            <button
              onClick={() => onUpdateSettings({ variable: 'salinity' })}
              className={`flex flex-col items-start p-2 rounded-lg border transition-all ${
                settings.variable === 'salinity'
                  ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border-cyan/60 text-white shadow-sm'
                  : 'border-scientific-border bg-ocean-950/40 text-scientific-dim hover:bg-ocean-800/60 hover:text-white'
              }`}
            >
              <span className="font-bold text-xs">Salinity</span>
              <span className="text-[10px] text-cyan-300 font-mono">SAL (PSU)</span>
            </button>
          </div>
        </div>

        {/* 2. DEPTH SLICE SLIDER */}
        <div className="space-y-2 pt-2 border-t border-scientific-border/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-scientific-dim">
              Ocean Depth Slice
            </span>
            <span className="font-mono font-bold text-cyan text-xs bg-cyan/10 px-2 py-0.5 rounded border border-cyan/20">
              {currentDepthMeters === 5 ? 'Surface (5 m)' : `${currentDepthMeters} m`}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={depths.length - 1}
            step={1}
            value={settings.depthIndex}
            onChange={(e) => {
              const idx = parseInt(e.target.value);
              onUpdateSettings({
                depthIndex: idx,
                currentDepth: depths[idx],
              });
            }}
            className="w-full h-1.5 bg-ocean-800 rounded-lg appearance-none cursor-pointer accent-cyan"
          />

          {/* Quick depth preset badges */}
          <div className="flex flex-wrap gap-1 pt-1">
            {[
              { label: 'Surface (5m)', depth: 5 },
              { label: '50m', depth: 50 },
              { label: '150m', depth: 150 },
              { label: '500m', depth: 500 },
              { label: '1000m', depth: 1000 },
              { label: '2000m', depth: 2000 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleDepthPreset(preset.depth)}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                  currentDepthMeters === preset.depth
                    ? 'bg-cyan text-ocean-950 font-bold border-cyan'
                    : 'bg-ocean-950/70 border-scientific-border text-scientific-dim hover:text-white hover:border-cyan/50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. OPACITY & VERTICAL EXAGGERATION */}
        <div className="space-y-3 pt-2 border-t border-scientific-border/60">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-scientific-dim flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-scientific-dim" />
                Layer Opacity
              </span>
              <span className="font-mono text-xs text-white">
                {Math.round(settings.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={settings.opacity}
              onChange={(e) => onUpdateSettings({ opacity: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-ocean-800 rounded-lg appearance-none cursor-pointer accent-cyan"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-scientific-dim flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-scientific-dim" />
                Vertical Exaggeration
              </span>
              <span className="font-mono text-xs text-cyan font-semibold">
                {settings.verticalExaggeration.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={1.0}
              max={6.0}
              step={0.2}
              value={settings.verticalExaggeration}
              onChange={(e) => onUpdateSettings({ verticalExaggeration: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-ocean-800 rounded-lg appearance-none cursor-pointer accent-cyan"
            />
          </div>
        </div>

        {/* 4. COLORMAP & RANGE */}
        <div className="space-y-2.5 pt-2 border-t border-scientific-border/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-scientific-dim flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-cyan" />
              Scientific Colormap
            </span>
            <button
              onClick={handleResetColorRange}
              className="flex items-center gap-1 text-[10px] text-cyan hover:underline font-mono"
              title="Reset to dataset colorbar defaults"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Range
            </button>
          </div>

          <select
            value={settings.colormap}
            onChange={(e) => onUpdateSettings({ colormap: e.target.value as ColormapType })}
            className="w-full bg-ocean-950 border border-scientific-border rounded-lg px-2.5 py-1.5 text-xs text-scientific-text font-mono focus:border-cyan focus:outline-none"
          >
            <option value="turbo">Google Turbo (Universal Spectrum)</option>
            <option value="thermal">Ocean Thermal (Sea Temp Standard)</option>
            <option value="haline">cmocean Haline (Salinity Standard)</option>
            <option value="viridis">Viridis (Perceptually Uniform)</option>
            <option value="plasma">Plasma (High Contrast)</option>
            <option value="coolwarm">CoolWarm (Diverging Anomaly)</option>
          </select>

          {/* Min & Max Inputs */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[10px] text-scientific-dim font-mono">
                Min ({isTemp ? '°C' : 'PSU'})
              </label>
              <input
                type="number"
                step="0.5"
                value={settings.colorRange.min}
                onChange={(e) =>
                  onUpdateSettings({
                    colorRange: {
                      ...settings.colorRange,
                      min: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                className="w-full bg-ocean-950 border border-scientific-border rounded px-2 py-1 text-xs font-mono text-white focus:border-cyan focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-scientific-dim font-mono">
                Max ({isTemp ? '°C' : 'PSU'})
              </label>
              <input
                type="number"
                step="0.5"
                value={settings.colorRange.max}
                onChange={(e) =>
                  onUpdateSettings({
                    colorRange: {
                      ...settings.colorRange,
                      max: parseFloat(e.target.value) || 30,
                    },
                  })
                }
                className="w-full bg-ocean-950 border border-scientific-border rounded px-2 py-1 text-xs font-mono text-white focus:border-cyan focus:outline-none"
              />
            </div>
          </div>

          {/* Real-time Slice Stats */}
          {activeSliceStats && activeSliceStats.validCount > 0 && (
            <div className="p-2 rounded bg-ocean-950/80 border border-scientific-border/80 text-[10px] font-mono text-scientific-dim space-y-0.5">
              <div className="flex justify-between text-teal-300 font-semibold">
                <span>Observed Slice Mean:</span>
                <span>{activeSliceStats.mean} {isTemp ? '°C' : 'PSU'}</span>
              </div>
              <div className="flex justify-between">
                <span>Slice Range:</span>
                <span>{activeSliceStats.min} – {activeSliceStats.max} {isTemp ? '°C' : 'PSU'}</span>
              </div>
            </div>
          )}
        </div>

        {/* 5. 3D SCENE LAYERS TOGGLE */}
        <div className="space-y-2 pt-2 border-t border-scientific-border/60">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-scientific-dim flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan" />
            Visualization Layers
          </span>

          <div className="space-y-1.5 font-mono text-[11px]">
            <label className="flex items-center justify-between p-1.5 rounded hover:bg-ocean-800/40 cursor-pointer">
              <span className="flex items-center gap-2 text-white">
                <Anchor className="w-3.5 h-3.5 text-amber-400" />
                Argo Float Buoys (78 in-situ)
              </span>
              <input
                type="checkbox"
                checked={settings.showArgoFloats}
                onChange={(e) => onUpdateSettings({ showArgoFloats: e.target.checked })}
                className="rounded bg-ocean-950 border-scientific-border text-cyan focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-ocean-800/40 cursor-pointer">
              <span className="flex items-center gap-2 text-white">
                <Mountain className="w-3.5 h-3.5 text-blue-400" />
                Seabed Bathymetry Floor
              </span>
              <input
                type="checkbox"
                checked={settings.showSeabed}
                onChange={(e) => onUpdateSettings({ showSeabed: e.target.checked })}
                className="rounded bg-ocean-950 border-scientific-border text-cyan focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-ocean-800/40 cursor-pointer">
              <span className="flex items-center gap-2 text-white">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                Coastal Landmasses
              </span>
              <input
                type="checkbox"
                checked={settings.showLandmass}
                onChange={(e) => onUpdateSettings({ showLandmass: e.target.checked })}
                className="rounded bg-ocean-950 border-scientific-border text-cyan focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded hover:bg-ocean-800/40 cursor-pointer">
              <span className="flex items-center gap-2 text-white">
                <Maximize2 className="w-3.5 h-3.5 text-cyan" />
                Lat/Lon & Depth Ruler
              </span>
              <input
                type="checkbox"
                checked={settings.showCoordinates}
                onChange={(e) => onUpdateSettings({ showCoordinates: e.target.checked })}
                className="rounded bg-ocean-950 border-scientific-border text-cyan focus:ring-0 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>
    </aside>
  );
};
