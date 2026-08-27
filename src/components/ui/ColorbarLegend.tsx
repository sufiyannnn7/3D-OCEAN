import React from 'react';
import { getCssGradient } from '../../services/colorScales';
import { GridManifest, VisualizationSettings } from '../../types/ocean';
import { Thermometer, Droplets, Layers } from 'lucide-react';

export interface ColorbarLegendProps {
  manifest: GridManifest;
  settings: VisualizationSettings;
}

export const ColorbarLegend: React.FC<ColorbarLegendProps> = ({
  manifest,
  settings,
}) => {
  const isTemp = settings.variable === 'temperature';
  const meta = isTemp ? manifest.variables.TEMP : manifest.variables.SAL;
  const currentDepth = manifest.depths_m[settings.depthIndex] || manifest.depths_m[0];

  const minVal = settings.colorRange.min;
  const maxVal = settings.colorRange.max;
  const midVal = Number(((minVal + maxVal) / 2).toFixed(1));
  const q1Val = Number((minVal + (maxVal - minVal) * 0.25).toFixed(1));
  const q3Val = Number((minVal + (maxVal - minVal) * 0.75).toFixed(1));

  const gradientCss = getCssGradient(settings.colormap, 'top');
  const unitStr = meta.units === 'degC' ? '°C' : meta.units;

  return (
    <div className="absolute right-4 bottom-24 z-20 bg-scientific-panel/95 backdrop-blur-xl border border-scientific-border rounded-xl shadow-glass p-3 text-scientific-text flex flex-col gap-2 select-none">
      {/* Header with Icon & Active Variable */}
      <div className="flex items-center justify-between gap-3 border-b border-scientific-border/60 pb-1.5">
        <div className="flex items-center gap-1.5">
          {isTemp ? (
            <Thermometer className="w-3.5 h-3.5 text-orange-400" />
          ) : (
            <Droplets className="w-3.5 h-3.5 text-cyan" />
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-white">
            {meta.longName}
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-cyan bg-cyan/15 px-1.5 py-0.5 rounded border border-cyan/30">
          {unitStr}
        </span>
      </div>

      {/* Vertical Colorbar & Values */}
      <div className="flex items-center gap-3 py-1">
        <div className="relative w-4 h-36 rounded-md overflow-hidden border border-white/20 shadow-inner">
          <div
            className="w-full h-full"
            style={{ background: gradientCss }}
          />
        </div>

        <div className="h-36 flex flex-col justify-between text-[10px] font-mono text-scientific-dim font-medium">
          <div className="flex items-center gap-1">
            <span className="w-2 h-px bg-white/50" />
            <span className="text-white font-bold">{maxVal} {unitStr}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-px bg-white/30" />
            <span>{q3Val}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-px bg-white/50" />
            <span className="text-teal-300 font-semibold">{midVal}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-px bg-white/30" />
            <span>{q1Val}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-px bg-white/50" />
            <span className="text-white font-bold">{minVal} {unitStr}</span>
          </div>
        </div>
      </div>

      {/* Current Slice Depth Badge */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-scientific-border/60 text-[10px] font-mono text-scientific-dim">
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3 text-cyan" />
          Depth:
        </span>
        <span className="text-cyan font-bold">
          {currentDepth === 5 ? 'Surface (5m)' : `${currentDepth} m`}
        </span>
      </div>
    </div>
  );
};
