import React from 'react';
import { Crosshair, MapPin, Layers, Thermometer, Droplets, Anchor } from 'lucide-react';
import { OceanVariable } from '../../types/ocean';
import { ArgoFloat } from '../../types/argo';

export interface TelemetryBarProps {
  oceanHover: { lat: number; lon: number; depth: number; value: number | null } | null;
  hoveredFloat: { floatId: string; float: ArgoFloat; screenPos: { x: number; y: number } | null } | null;
  variable: OceanVariable;
  visibleFloatsCount: number;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  oceanHover,
  hoveredFloat,
  variable,
  visibleFloatsCount,
}) => {
  const isTemp = variable === 'temperature';
  const unit = isTemp ? '°C' : 'PSU';

  return (
    <>
      {/* Bottom Left Telemetry Status Bar */}
      <div className="absolute left-4 bottom-4 z-20 hidden md:flex items-center gap-3 px-3.5 py-1.5 bg-scientific-panel/90 backdrop-blur-md border border-scientific-border rounded-lg shadow-glass text-xs font-mono select-none">
        <div className="flex items-center gap-1.5 text-cyan">
          <Crosshair className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="font-semibold text-white">CURSOR TELEMETRY:</span>
        </div>

        {oceanHover ? (
          <div className="flex items-center gap-3 text-scientific-text">
            <span className="text-scientific-dim">
              LAT: <strong className="text-white">{oceanHover.lat > 0 ? `${oceanHover.lat}°N` : `${Math.abs(oceanHover.lat)}°S`}</strong>
            </span>
            <span className="text-scientific-dim">
              LON: <strong className="text-white">{oceanHover.lon}°E</strong>
            </span>
            <span className="text-scientific-dim">
              DEPTH: <strong className="text-cyan">{oceanHover.depth} m</strong>
            </span>
            <span className="text-scientific-dim">
              VALUE:{' '}
              <strong className={isTemp ? 'text-orange-400' : 'text-teal-300'}>
                {oceanHover.value !== null ? `${oceanHover.value} ${unit}` : 'LAND MASK'}
              </strong>
            </span>
          </div>
        ) : (
          <span className="text-scientific-dim italic">
            Hover over 3D ocean slice or buoys to sample real data
          </span>
        )}

        <div className="border-l border-scientific-border pl-3 flex items-center gap-1 text-[11px] text-amber-400">
          <Anchor className="w-3 h-3" />
          <span>{visibleFloatsCount} In-Situ Floats</span>
        </div>
      </div>

      {/* Floating 3D Tooltip when hovering over an Argo Float */}
      {hoveredFloat && hoveredFloat.screenPos && (
        <div
          className="fixed z-40 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-2 bg-ocean-950/95 backdrop-blur-md border border-amber-400/60 rounded-xl shadow-glass-glow text-xs select-none animate-in fade-in zoom-in-95"
          style={{
            left: `${hoveredFloat.screenPos.x}px`,
            top: `${hoveredFloat.screenPos.y - 12}px`,
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-mono font-bold text-amber-400">
              INCOIS ARGO #{hoveredFloat.floatId}
            </span>
            <span className="text-[10px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {hoveredFloat.float.nCasts} {hoveredFloat.float.nCasts === 1 ? 'Cast' : 'Casts'}
            </span>
          </div>
          <div className="text-[11px] text-scientific-dim font-mono pt-1">
            Lat: {hoveredFloat.float.lat > 0 ? `${hoveredFloat.float.lat}°N` : `${Math.abs(hoveredFloat.float.lat)}°S`}, Lon: {hoveredFloat.float.lon}°E
          </div>
          <div className="text-[10px] text-cyan font-mono pt-0.5">
            Click buoy to view {hoveredFloat.float.nPoints} CTD depth profile points ➔
          </div>
        </div>
      )}
    </>
  );
};
