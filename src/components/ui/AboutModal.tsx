import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Cpu, 
  Radio, 
  Radar, 
  Waves, 
  Globe, 
  Boxes, 
  Layers, 
  Share2, 
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'about' | 'future_scope'>('about');

  if (!isOpen) return null;

  const futureScopeItems = [
    {
      title: 'Live NetCDF / OPeNDAP Ingestion',
      icon: Globe,
      tag: 'BACKEND PROTOCOL',
      description: 'Direct asynchronous streaming of multi-terabyte CMEMS, INCOIS-GODAS, and HYCOM NetCDF4/Zarr archives without client-side memory exhaustion.'
    },
    {
      title: 'OGC WMS / WCS Web Map Services',
      icon: Layers,
      tag: 'INTEROPERABILITY',
      description: 'Standardized GIS map layers integration with GeoServer / THREDDS for dynamic tiled raster overlays and satellite SST swaths.'
    },
    {
      title: 'Autonomous Glider / CTD / BGC Ingestion',
      icon: Radio,
      tag: 'OBSERVATIONS',
      description: 'Real-time telemetry ingestion for autonomous underwater gliders, biogeochemical sensors (Dissolved O2, pH, Chl-a, Nitrate), and shipboard CTD casts.'
    },
    {
      title: 'High-Frequency (HF) Coastal Radar',
      icon: Radar,
      tag: 'COASTAL RADAR',
      description: 'Assimilation of INCOIS coastal HF radar surface current vectors along Indian coastlines (Gujarat, Kerala, Tamil Nadu, Andhra Pradesh).'
    },
    {
      title: 'Acoustic Doppler Current Profiler (ADCP)',
      icon: Waves,
      tag: 'CURRENT PROFILING',
      description: 'Moored ADCP current velocity profiles across the water column to resolve equatorial Wyrtki jets and deep Undercurrents.'
    },
    {
      title: 'True Marching-Cubes 3D Isosurfaces',
      icon: Boxes,
      tag: 'VOLUMETRIC COMPUTE',
      description: 'WebGPU / Compute shader implementation of GPU-accelerated marching cubes to extract 3D isothermal surfaces (e.g. 20°C & 28°C thermocline domes).'
    },
    {
      title: 'Physics-Informed ML Ocean Forecasting',
      icon: Cpu,
      tag: 'AI & PREDICTION',
      description: 'Neural operator models (FNO / PINNs) to forecast marine heatwaves, cyclone-induced upwelling, and Indian Ocean Dipole (IOD) events.'
    },
    {
      title: 'Operational INCOIS Deployment',
      icon: ShieldCheck,
      tag: 'INFRASTRUCTURE',
      description: 'Integration into the INCOIS Digital Ocean portal for operational marine forecasting, fisheries advisories (PFZ), and disaster management.'
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ocean-950/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-2xl bg-scientific-panel border border-cyan/40 rounded-2xl shadow-glass-glow text-scientific-text flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-scientific-border bg-ocean-950/80">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="AquaScope" className="w-8 h-8" />
            <div>
              <h2 className="text-lg font-bold font-mono tracking-wide bg-gradient-to-r from-cyan to-teal-accent bg-clip-text text-transparent">
                AQUASCOPE
              </h2>
              <p className="text-xs text-scientific-dim">
                INCOIS 3D Ocean Data Visualization Platform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-scientific-border hover:bg-ocean-800 text-scientific-dim hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex px-6 pt-3 border-b border-scientific-border/60 bg-ocean-950/40">
          <button
            onClick={() => setTab('about')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
              tab === 'about'
                ? 'border-cyan text-cyan'
                : 'border-transparent text-scientific-dim hover:text-white'
            }`}
          >
            About AquaScope
          </button>
          <button
            onClick={() => setTab('future_scope')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'future_scope'
                ? 'border-cyan text-cyan'
                : 'border-transparent text-scientific-dim hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Future Scope (Roadmap)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-scientific-text leading-relaxed">
          {tab === 'about' ? (
            <>
              {/* Mission Statement Quote Box */}
              <div className="p-4 rounded-xl bg-cyan/10 border border-cyan/30 text-cyan-100 font-medium italic shadow-inner">
                “AquaScope transforms complex ocean observations and model fields into an intuitive interactive 3D environment for analysis, forecasting, education and science communication.”
              </div>

              {/* Core Capabilities */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-xs uppercase tracking-wider font-mono text-cyan">
                  Platform Core Architecture
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-lg bg-ocean-900/60 border border-scientific-border">
                    <span className="font-bold text-white block mb-1">
                      1. INCOIS Gridded Model Fields
                    </span>
                    <p className="text-scientific-dim text-[11px]">
                      Interactive 4D assimilation grid covering the Indian Ocean basin with 24 depth levels (0–3000m) and real-time vertical slicing.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-ocean-900/60 border border-scientific-border">
                    <span className="font-bold text-white block mb-1">
                      2. Robotic Argo Profiling Floats
                    </span>
                    <p className="text-scientific-dim text-[11px]">
                      Active INCOIS/WMO profiling buoys with continuous CTD vertical profiles and 3D drift trajectory visualization.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-ocean-900/60 border border-scientific-border">
                    <span className="font-bold text-white block mb-1">
                      3. Dynamic SW Monsoon Evolution
                    </span>
                    <p className="text-scientific-dim text-[11px]">
                      High-temporal timeline tracking the Somali upwelling cold tongue, Arabian Sea salinity core, and Bay of Bengal freshwater plumes.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-ocean-900/60 border border-scientific-border">
                    <span className="font-bold text-white block mb-1">
                      4. High-Performance Three.js Engine
                    </span>
                    <p className="text-scientific-dim text-[11px]">
                      GPU-accelerated vertex shading, vertical exaggeration scaling, and extensible Blender GLTF/GLB asset pipeline.
                    </p>
                  </div>
                </div>
              </div>

              {/* SIH Submission Context */}
              <div className="p-3 rounded-lg bg-ocean-950/80 border border-scientific-border text-[11px] text-scientific-dim flex items-center justify-between">
                <span>Smart India Hackathon • Internal Round Working Prototype</span>
                <span className="font-mono text-teal-300 font-semibold">MoES / INCOIS Problem Statement</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider font-mono text-cyan">
                    Planned Capabilities & Future Scope
                  </h4>
                  <p className="text-[11px] text-scientific-dim">
                    The following features are architected into the roadmap for the Grand Finale and operational INCOIS deployment.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-mono font-bold">
                  FUTURE SCOPE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {futureScopeItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="p-3 rounded-xl bg-ocean-900/50 border border-scientific-border/80 hover:border-cyan/50 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 text-cyan">
                            <Icon className="w-4 h-4" />
                            <span className="font-semibold text-white text-xs">
                              {item.title}
                            </span>
                          </div>
                        </div>
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-mono rounded bg-ocean-950 text-teal-300 border border-scientific-border mb-1.5">
                          {item.tag}
                        </span>
                        <p className="text-scientific-dim text-[11px] leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-ocean-950/90 border-t border-scientific-border flex items-center justify-between">
          <span className="text-[11px] font-mono text-scientific-dim">
            AquaScope v1.0.0 • INCOIS 3D Ocean Visualizer
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan text-ocean-950 font-bold text-xs hover:bg-cyan/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
