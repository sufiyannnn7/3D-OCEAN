import React from 'react';
import { Waves, Wind, Compass, Clock, Activity } from 'lucide-react';
import { WaveManifest, WaveSettings, WaveStats, WaveSample } from '../../types/wave';

export interface WaveLegendProps {
  manifest: WaveManifest;
  settings: WaveSettings;
  activeStats: WaveStats;
  hoveredWave: WaveSample | null;
  forecastDateFormatted: string;
}

export const WaveLegend: React.FC<WaveLegendProps> = ({
  settings,
  activeStats,
  hoveredWave,
  forecastDateFormatted,
}) => {
  if (!settings.showWaves) return null;

  // Use hovered sample if available, otherwise domain summary statistics
  const currentHs = hoveredWave?.hs !== null && hoveredWave?.hs !== undefined ? hoveredWave.hs : activeStats.meanHs;
  const currentPwp = hoveredWave?.pwp !== null && hoveredWave?.pwp !== undefined ? hoveredWave.pwp : activeStats.meanPwp;
  const currentMwd = hoveredWave?.mwd !== null && hoveredWave?.mwd !== undefined ? hoveredWave.mwd : activeStats.dominantMwd;
  const isSampled = hoveredWave?.hs !== null && hoveredWave?.hs !== undefined;

  return (
    <div className="absolute right-4 top-16 z-20 w-72 bg-scientific-panel/95 backdrop-blur-xl border border-cyan/40 rounded-xl shadow-glass text-scientific-text p-3 flex flex-col gap-2.5 select-none animate-in fade-in slide-in-from-top-2">
      {/* Header & Source Attribution */}
      <div className="flex items-center justify-between border-b border-scientific-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan/15 border border-cyan/30 text-cyan">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-xs text-white">
                INCOIS WW3
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                REAL FORECAST
              </span>
            </div>
            <span className="text-[10px] text-scientific-dim font-medium block">
              INCOIS RSMC • WAVEWATCH-III
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Wave Parameter Readout */}
      <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-ocean-950/80 border border-scientific-border/80 text-center font-mono">
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-scientific-dim flex items-center gap-0.5">
            <Activity className="w-2.5 h-2.5 text-cyan" />
            Wave Height
          </span>
          <span className="text-sm font-bold text-cyan">
            {currentHs} <span className="text-[10px] font-normal text-scientific-dim">m</span>
          </span>
        </div>

        <div className="flex flex-col items-center border-x border-scientific-border/60">
          <span className="text-[9px] text-scientific-dim flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5 text-teal-300" />
            Peak Period
          </span>
          <span className="text-sm font-bold text-teal-300">
            {currentPwp} <span className="text-[10px] font-normal text-scientific-dim">s</span>
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[9px] text-scientific-dim flex items-center gap-0.5">
            <Compass className="w-2.5 h-2.5 text-amber-400" />
            Mean Dir
          </span>
          <span className="text-sm font-bold text-amber-400">
            {currentMwd}°
          </span>
        </div>
      </div>

      {/* Context indicator */}
      <div className="flex items-center justify-between text-[10px] font-mono text-scientific-dim px-0.5">
        <span className="italic text-teal-200">
          {isSampled ? '📍 Point observation' : '🌐 Basin mean average'}
        </span>
        <span className="text-white font-semibold">
          {forecastDateFormatted}
        </span>
      </div>

      {/* Wave Height Color Scale (0m to 6m+) */}
      {settings.colorByWaveHeight && (
        <div className="space-y-1 pt-1 border-t border-scientific-border/60">
          <div className="flex items-center justify-between text-[10px] font-mono text-scientific-dim">
            <span className="font-semibold text-white">Wave Height (m)</span>
            <span className="text-cyan">0 – 6.0+ m</span>
          </div>

          <div
            className="w-full h-3 rounded-md border border-white/20 shadow-inner"
            style={{
              background: 'linear-gradient(to right, #082d73 0%, #00a6d9 25%, #26d9a6 50%, #f2b31f 75%, #f22e59 100%)',
            }}
          />

          <div className="flex justify-between text-[9px] font-mono text-scientific-dim px-0.5">
            <span>0 m</span>
            <span>1.5 m</span>
            <span>3.0 m</span>
            <span>4.5 m</span>
            <span>6.0+ m</span>
          </div>
        </div>
      )}
    </div>
  );
};
