import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GridManifest, TimestepData, VisualizationSettings } from './types/ocean';
import { ArgoFloat, ArgoManifest } from './types/argo';
import { WaveManifest, WaveTimestepData, WaveSettings, WaveSample, WaveStats } from './types/wave';
import { gridDataLoader } from './services/gridDataLoader';
import { argoDataLoader } from './services/argoDataLoader';
import { waveDataLoader } from './services/waveDataLoader';
import { OceanCanvas } from './components/canvas/OceanCanvas';
import { TopBar } from './components/ui/TopBar';
import { ControlPanel } from './components/ui/ControlPanel';
import { TimelineBar } from './components/ui/TimelineBar';
import { ColorbarLegend } from './components/ui/ColorbarLegend';
import { WaveLegend } from './components/ui/WaveLegend';
import { ArgoProfilePanel } from './components/ui/ArgoProfilePanel';
import { TelemetryBar } from './components/ui/TelemetryBar';
import { AboutModal } from './components/ui/AboutModal';
import { AlertCircle, Loader2 } from 'lucide-react';

export function App() {
  // Data State - 4D Ocean Grid
  const [gridManifest, setGridManifest] = useState<GridManifest | null>(null);
  const [currentStepData, setCurrentStepData] = useState<TimestepData | null>(null);

  // Data State - Argo Floats
  const [argoManifest, setArgoManifest] = useState<ArgoManifest | null>(null);
  const [floats, setFloats] = useState<ArgoFloat[]>([]);

  // Data State - INCOIS WW3 Wave Forecast
  const [waveManifest, setWaveManifest] = useState<WaveManifest | null>(null);
  const [currentWaveStepData, setCurrentWaveStepData] = useState<WaveTimestepData | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // UI & Modal States
  const [isControlPanelOpen, setIsControlPanelOpen] = useState<boolean>(true);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [selectedFloatId, setSelectedFloatId] = useState<string | null>(null);
  const [resetViewTrigger, setResetViewTrigger] = useState<number>(0);

  // Telemetry Hover State
  const [oceanHover, setOceanHover] = useState<{
    lat: number;
    lon: number;
    depth: number;
    value: number | null;
  } | null>(null);

  const [hoveredWave, setHoveredWave] = useState<WaveSample | null>(null);

  const [hoveredFloat, setHoveredFloat] = useState<{
    floatId: string;
    float: ArgoFloat;
    screenPos: { x: number; y: number } | null;
  } | null>(null);

  // Visualization State - 4D Ocean
  const [settings, setSettings] = useState<VisualizationSettings>({
    variable: 'temperature',
    depthIndex: 0,
    currentDepth: 5,
    timestepIndex: 0,
    opacity: 0.95,
    verticalExaggeration: 2.5,
    colorRange: {
      min: 2.56,
      max: 29.77,
      autoScale: false,
    },
    colormap: 'turbo',
    showArgoFloats: true,
    showSeabed: true,
    showLandmass: true,
    showCoordinates: true,
    showTrajectories: true,
    showIsoVolume: false,
    cameraPreset: 'overview',
  });

  // Visualization State - INCOIS WW3 Waves
  const [waveSettings, setWaveSettings] = useState<WaveSettings>({
    showWaves: true,
    intensity: 1.0,
    isPlaying: true,
    timestepIndex: 0,
    colorByWaveHeight: true,
    opacity: 0.88,
  });

  // Initial Data Ingestion from Real Files
  useEffect(() => {
    async function initData() {
      try {
        setIsLoading(true);
        setError(null);

        const [gManifest, aManifest, argoList, wManifest] = await Promise.all([
          gridDataLoader.loadManifest(),
          argoDataLoader.loadManifest(),
          argoDataLoader.loadFloats(),
          waveDataLoader.loadManifest().catch((err) => {
            console.warn('Waves manifest load warning:', err);
            return null;
          }),
        ]);

        setGridManifest(gManifest);
        setArgoManifest(aManifest);
        setFloats(argoList);

        // Load first grid timestep
        const firstFile = gManifest.files[0] || 'step_00.json';
        const firstStepData = await gridDataLoader.loadTimestep(firstFile);
        setCurrentStepData(firstStepData);

        // Load first wave timestep if wave manifest exists
        if (wManifest) {
          setWaveManifest(wManifest);
          const firstWaveStep = await waveDataLoader.loadTimestep(0);
          setCurrentWaveStepData(firstWaveStep);
        }

        // Set initial color range from real manifest
        setSettings((prev) => ({
          ...prev,
          currentDepth: gManifest.depths_m[0] || 5,
          colorRange: {
            min: gManifest.variables.TEMP.colorBarMin,
            max: gManifest.variables.TEMP.colorBarMax,
            autoScale: false,
          },
        }));

        // Preload remaining grid timesteps
        gridDataLoader.preloadAllTimesteps().catch(console.warn);

        setIsLoading(false);
      } catch (err: any) {
        console.error('Data initialization failure:', err);
        setError(err.message || 'Failed to load INCOIS dataset files.');
        setIsLoading(false);
      }
    }

    initData();
  }, []);

  // Update Grid Timestep Data when timestepIndex changes
  useEffect(() => {
    if (!gridManifest) return;
    const targetFile = gridManifest.files[settings.timestepIndex] || `step_0${settings.timestepIndex}.json`;

    gridDataLoader.loadTimestep(targetFile).then((data) => {
      setCurrentStepData(data);
    }).catch(err => {
      console.error('Error switching ocean timestep:', err);
    });
  }, [settings.timestepIndex, gridManifest]);

  // Update Wave Timestep Data when waveSettings.timestepIndex changes
  useEffect(() => {
    if (!waveManifest) return;

    waveDataLoader.loadTimestep(waveSettings.timestepIndex).then((data) => {
      setCurrentWaveStepData(data);
    }).catch(err => {
      console.error('Error switching wave forecast timestep:', err);
    });
  }, [waveSettings.timestepIndex, waveManifest]);

  // Adjust default color range and colormap when switching ocean variable
  const handleUpdateSettings = useCallback((updates: Partial<VisualizationSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };

      if (updates.variable && updates.variable !== prev.variable && gridManifest) {
        const isTemp = updates.variable === 'temperature';
        const varMeta = isTemp ? gridManifest.variables.TEMP : gridManifest.variables.SAL;

        next.colorRange = {
          min: varMeta.colorBarMin,
          max: varMeta.colorBarMax,
          autoScale: false,
        };
        next.colormap = isTemp ? 'turbo' : 'haline';
      }

      return next;
    });
  }, [gridManifest]);

  // Handle Wave Settings Updates
  const handleUpdateWaveSettings = useCallback((updates: Partial<WaveSettings>) => {
    setWaveSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  // Calculate slice statistics
  const activeSliceStats = useMemo(() => {
    if (!currentStepData) return undefined;
    return gridDataLoader.getSliceStats(
      currentStepData,
      settings.variable,
      settings.depthIndex
    );
  }, [currentStepData, settings.variable, settings.depthIndex]);

  // Calculate Wave Statistics for active forecast time
  const activeWaveStats: WaveStats = useMemo(() => {
    if (!currentWaveStepData) {
      return { minHs: 0, maxHs: 0, meanHs: 0, meanPwp: 0, dominantMwd: 0, validCount: 0 };
    }
    return waveDataLoader.getWaveStats(currentWaveStepData);
  }, [currentWaveStepData]);

  // Selected Argo Float object
  const selectedFloat = useMemo(() => {
    if (!selectedFloatId) return null;
    return floats.find((f) => f.floatId === selectedFloatId) || null;
  }, [selectedFloatId, floats]);

  const activeTimeISO = gridManifest?.times[settings.timestepIndex] || '2026-05-30T00:00:00Z';
  const formattedDateLabel = useMemo(() => {
    try {
      const d = new Date(activeTimeISO);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      });
    } catch {
      return activeTimeISO;
    }
  }, [activeTimeISO]);

  const activeWaveTimeISO = waveManifest?.times[waveSettings.timestepIndex] || '2026-08-30T00:00:00Z';
  const formattedWaveDateLabel = useMemo(() => {
    try {
      const d = new Date(activeWaveTimeISO);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC';
    } catch {
      return activeWaveTimeISO;
    }
  }, [activeWaveTimeISO]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-ocean-950 text-scientific-text">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-ocean-950 text-cyan space-y-4">
          <div className="relative">
            <img src="/logo.svg" alt="AquaScope Logo" className="w-16 h-16 animate-bounce" />
            <div className="absolute inset-0 rounded-full border-2 border-cyan animate-ping opacity-30" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold font-mono tracking-widest bg-gradient-to-r from-cyan to-teal-accent bg-clip-text text-transparent">
              AQUASCOPE
            </h2>
            <p className="text-xs text-scientific-dim font-mono flex items-center justify-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading real INCOIS 4D ocean grid, WW3 wave forecast & Argo float network...
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 p-4 bg-red-950/90 border border-red-500 rounded-xl shadow-glass text-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="text-xs font-mono">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Main 3D Canvas & UI when manifest is loaded */}
      {gridManifest && currentStepData && (
        <>
          {/* Top Bar */}
          <TopBar
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onResetView={() => setResetViewTrigger((n) => n + 1)}
            onOpenAbout={() => setIsAboutOpen(true)}
            toggleControlPanel={() => setIsControlPanelOpen(!isControlPanelOpen)}
            isControlPanelOpen={isControlPanelOpen}
            currentDateLabel={formattedDateLabel}
          />

          {/* Left Scientific Control Panel */}
          <ControlPanel
            manifest={gridManifest}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            waveManifest={waveManifest}
            waveSettings={waveSettings}
            onUpdateWaveSettings={handleUpdateWaveSettings}
            waveStats={activeWaveStats}
            isOpen={isControlPanelOpen}
            onClose={() => setIsControlPanelOpen(false)}
            activeSliceStats={activeSliceStats}
          />

          {/* Three.js 3D Viewport */}
          <main className="w-full h-full">
            <OceanCanvas
              manifest={gridManifest}
              stepData={currentStepData}
              floats={floats}
              settings={settings}
              waveManifest={waveManifest}
              waveStepData={currentWaveStepData}
              waveSettings={waveSettings}
              hoveredFloatId={hoveredFloat ? hoveredFloat.floatId : null}
              selectedFloatId={selectedFloatId}
              onHoverFloat={(floatId, float, screenPos) => {
                if (floatId && float) {
                  setHoveredFloat({ floatId, float, screenPos });
                } else {
                  setHoveredFloat(null);
                }
              }}
              onSelectFloat={(floatId) => setSelectedFloatId(floatId)}
              onHoverOcean={(info, screenPos) => setOceanHover(info)}
              onHoverWave={(sample) => setHoveredWave(sample)}
              resetViewTrigger={resetViewTrigger}
            />
          </main>

          {/* Bottom Timeline for 4D Ocean Grid */}
          <TimelineBar
            times={gridManifest.times}
            currentStepIndex={settings.timestepIndex}
            onSelectStep={(idx) => handleUpdateSettings({ timestepIndex: idx })}
          />

          {/* Right Scientific Colorbar Legend for Active Ocean Variable (TEMP/SAL) */}
          <ColorbarLegend
            manifest={gridManifest}
            settings={settings}
          />

          {/* Top Right Floating Wave Legend & Info Readout Panel */}
          {waveManifest && (
            <WaveLegend
              manifest={waveManifest}
              settings={waveSettings}
              activeStats={activeWaveStats}
              hoveredWave={hoveredWave}
              forecastDateFormatted={formattedWaveDateLabel}
            />
          )}

          {/* Bottom Left Telemetry Status Bar & Buoy Hover Tooltips */}
          <TelemetryBar
            oceanHover={oceanHover}
            hoveredWave={hoveredWave}
            hoveredFloat={hoveredFloat}
            variable={settings.variable}
            visibleFloatsCount={floats.length}
            showWaves={waveSettings.showWaves}
          />

          {/* Argo Float Profile Panel Modal */}
          {selectedFloat && (
            <ArgoProfilePanel
              float={selectedFloat}
              onClose={() => setSelectedFloatId(null)}
            />
          )}

          {/* About AquaScope & Future Scope Roadmap Modal */}
          <AboutModal
            isOpen={isAboutOpen}
            onClose={() => setIsAboutOpen(false)}
          />
        </>
      )}
    </div>
  );
}

export default App;
