import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { 
  X, 
  Anchor, 
  MapPin, 
  Calendar, 
  Layers, 
  Download, 
  Thermometer, 
  Droplets,
  Info,
  Clock
} from 'lucide-react';
import { ArgoFloat, ArgoCast } from '../../types/argo';
import { OceanVariable } from '../../types/ocean';
import { argoDataLoader } from '../../services/argoDataLoader';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface ArgoProfilePanelProps {
  float: ArgoFloat;
  onClose: () => void;
}

export const ArgoProfilePanel: React.FC<ArgoProfilePanelProps> = ({
  float,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'ts_diagram'>('profile');
  const [profileVar, setProfileVar] = useState<OceanVariable>('temperature');
  const [overlayAllCasts, setOverlayAllCasts] = useState<boolean>(false);
  const [selectedCastIdx, setSelectedCastIdx] = useState<number>(0);

  // Group profile points by cast
  const casts: ArgoCast[] = useMemo(() => {
    return argoDataLoader.groupProfilesByCast(float.profiles);
  }, [float.profiles]);

  const activeCast = casts[selectedCastIdx] || casts[0] || {
    time: float.lastTime,
    dateLabel: float.lastTime,
    points: float.profiles,
  };

  const isTemp = profileVar === 'temperature';
  const mainColor = isTemp ? 'rgb(249, 115, 22)' : 'rgb(6, 182, 212)';
  const mainBg = isTemp ? 'rgba(249, 115, 22, 0.15)' : 'rgba(6, 182, 212, 0.15)';

  // Calculate max depth for Y scale
  const maxDepthInCast = useMemo(() => {
    let maxD = 2000;
    activeCast.points.forEach(p => {
      if (p.depth > maxD) maxD = Math.ceil(p.depth / 250) * 250;
    });
    return maxD;
  }, [activeCast.points]);

  // Profile Chart Datasets
  const profileChartData = {
    datasets: overlayAllCasts
      ? casts.map((cast, idx) => {
          const isSelected = idx === selectedCastIdx;
          const dataPoints = cast.points.map(p => ({
            x: isTemp ? p.temp : p.salinity,
            y: p.depth,
          }));

          const colors = [
            '#00f2fe', '#3894f2', '#a855f7', '#ec4899', '#f97316', '#eab308', '#22c55e', '#06b6d4'
          ];
          const color = colors[idx % colors.length];

          return {
            label: cast.dateLabel,
            data: dataPoints,
            borderColor: isSelected ? '#ffffff' : color,
            backgroundColor: 'transparent',
            borderWidth: isSelected ? 3 : 1.5,
            borderDash: isSelected ? [] : [4, 4],
            pointRadius: isSelected ? 2.5 : 1,
            tension: 0.2,
          };
        })
      : [
          {
            label: `${isTemp ? 'Temperature (°C)' : 'Salinity (PSU)'} — ${activeCast.dateLabel}`,
            data: activeCast.points.map(p => ({
              x: isTemp ? p.temp : p.salinity,
              y: p.depth,
            })),
            borderColor: mainColor,
            backgroundColor: mainBg,
            fill: true,
            borderWidth: 2.5,
            pointRadius: 2.5,
            pointBackgroundColor: mainColor,
            pointHoverRadius: 6,
            tension: 0.2,
          },
        ],
  };

  // Inverted Depth Y-Axis
  const profileChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear',
        position: 'top',
        title: {
          display: true,
          text: isTemp ? 'Temperature (°C)' : 'Practical Salinity (PSU)',
          color: '#a8d3ff',
          font: { size: 11, family: 'Inter', weight: 'bold' },
        },
        grid: {
          color: 'rgba(70, 150, 240, 0.12)',
        },
        ticks: {
          color: '#8ba4cb',
          font: { family: 'JetBrains Mono', size: 10 },
        },
      },
      y: {
        type: 'linear',
        reverse: true, // Inverted: 0m at top
        min: 0,
        max: maxDepthInCast,
        title: {
          display: true,
          text: 'Depth (meters)',
          color: '#a8d3ff',
          font: { size: 11, family: 'Inter', weight: 'bold' },
        },
        grid: {
          color: 'rgba(70, 150, 240, 0.12)',
        },
        ticks: {
          color: '#8ba4cb',
          font: { family: 'JetBrains Mono', size: 10 },
          stepSize: 250,
        },
      },
    },
    plugins: {
      legend: {
        display: overlayAllCasts,
        position: 'bottom',
        labels: {
          color: '#e2edfd',
          font: { family: 'Inter', size: 10 },
          boxWidth: 12,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(7, 18, 38, 0.95)',
        titleColor: '#00f2fe',
        bodyColor: '#e2edfd',
        borderColor: 'rgba(0, 242, 254, 0.4)',
        borderWidth: 1,
        padding: 8,
        callbacks: {
          label: (context) => {
            const pt = context.raw as { x: number; y: number };
            return `Depth: ${pt.y} m  |  ${isTemp ? 'Temp' : 'Salinity'}: ${pt.x} ${isTemp ? '°C' : 'PSU'}`;
          },
        },
      },
    },
  };

  // T-S Diagram
  const tsDiagramData = {
    datasets: [
      {
        label: `T-S Curve (${activeCast.dateLabel})`,
        data: activeCast.points.map(p => ({
          x: p.salinity,
          y: p.temp,
        })),
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#00f2fe',
        showLine: true,
        tension: 0.2,
      },
    ],
  };

  const tsDiagramOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear',
        title: {
          display: true,
          text: 'Practical Salinity (PSU)',
          color: '#a8d3ff',
          font: { size: 11, family: 'Inter', weight: 'bold' },
        },
        grid: { color: 'rgba(70, 150, 240, 0.12)' },
        ticks: { color: '#8ba4cb', font: { family: 'JetBrains Mono', size: 10 } },
      },
      y: {
        type: 'linear',
        title: {
          display: true,
          text: 'In-Situ Temperature (°C)',
          color: '#a8d3ff',
          font: { size: 11, family: 'Inter', weight: 'bold' },
        },
        grid: { color: 'rgba(70, 150, 240, 0.12)' },
        ticks: { color: '#8ba4cb', font: { family: 'JetBrains Mono', size: 10 } },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(7, 18, 38, 0.95)',
        titleColor: '#00f2fe',
        callbacks: {
          label: (context) => {
            const pt = context.raw as { x: number; y: number };
            const ptObj = activeCast.points[context.dataIndex];
            return `Depth: ${ptObj ? ptObj.depth : '?'}m | Sal: ${pt.x} PSU | Temp: ${pt.y} °C`;
          },
        },
      },
    },
  };

  // Export CSV
  const handleExportCsv = () => {
    let csv = 'Depth_m,Temperature_degC,Salinity_PSU,Timestamp\n';
    activeCast.points.forEach((p) => {
      csv += `${p.depth},${p.temp},${p.salinity},"${p.time}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `INCOIS_ARGO_${float.floatId}_${activeCast.time.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ocean-950/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-3xl bg-scientific-panel border border-cyan/40 rounded-2xl shadow-glass-glow text-scientific-text flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-scientific-border bg-ocean-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base font-mono text-white">
                  INCOIS ARGO FLOAT #{float.floatId}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  REAL IN-SITU DATA
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan/15 text-cyan border border-cyan/30">
                  {float.nCasts} {float.nCasts === 1 ? 'Cast' : 'Casts'} ({float.nPoints} pts)
                </span>
              </div>
              <p className="text-xs text-scientific-dim font-medium">
                Indian Ocean Robotic Autonomous Profiling Float • INCOIS Data Assembly Centre
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-scientific-border hover:bg-ocean-800 text-scientific-dim hover:text-white transition-colors"
            title="Close Profile Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-2.5 bg-ocean-900/60 border-b border-scientific-border text-xs font-mono">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-cyan" />
            <div>
              <span className="text-[10px] text-scientific-dim block">Fix Coordinates</span>
              <span className="text-white font-semibold">
                {float.lat > 0 ? `${float.lat}°N` : `${Math.abs(float.lat)}°S`}, {float.lon}°E
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-cyan" />
            <div>
              <span className="text-[10px] text-scientific-dim block">Cast Date & Time</span>
              <span className="text-white font-semibold">{activeCast.dateLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan" />
            <div>
              <span className="text-[10px] text-scientific-dim block">Cast Max Depth</span>
              <span className="text-white font-semibold">
                {activeCast.points[activeCast.points.length - 1]?.depth || 2000} m
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan" />
            <div>
              <span className="text-[10px] text-scientific-dim block">Cast Selection</span>
              <span className="text-cyan font-semibold">
                Cast #{selectedCastIdx + 1} of {casts.length}
              </span>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-ocean-950/40 border-b border-scientific-border/60">
          <div className="flex items-center gap-2">
            <div className="flex bg-ocean-950 p-0.5 rounded-lg border border-scientific-border">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'profile'
                    ? 'bg-cyan text-ocean-950 font-bold'
                    : 'text-scientific-dim hover:text-white'
                }`}
              >
                Vertical Profile
              </button>
              <button
                onClick={() => setActiveTab('ts_diagram')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'ts_diagram'
                    ? 'bg-cyan text-ocean-950 font-bold'
                    : 'text-scientific-dim hover:text-white'
                }`}
              >
                T-S Diagram (Water Mass)
              </button>
            </div>

            {activeTab === 'profile' && (
              <div className="flex bg-ocean-950 p-0.5 rounded-lg border border-scientific-border ml-2">
                <button
                  onClick={() => setProfileVar('temperature')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-all ${
                    isTemp
                      ? 'bg-orange-500 text-white font-semibold'
                      : 'text-scientific-dim hover:text-white'
                  }`}
                >
                  <Thermometer className="w-3 h-3" />
                  <span>Temp (°C)</span>
                </button>
                <button
                  onClick={() => setProfileVar('salinity')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-all ${
                    !isTemp
                      ? 'bg-cyan text-ocean-950 font-bold'
                      : 'text-scientific-dim hover:text-white'
                  }`}
                >
                  <Droplets className="w-3 h-3" />
                  <span>Salinity (PSU)</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {casts.length > 1 && activeTab === 'profile' && (
              <label className="flex items-center gap-1.5 text-xs text-scientific-dim hover:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={overlayAllCasts}
                  onChange={(e) => setOverlayAllCasts(e.target.checked)}
                  className="rounded bg-ocean-950 border-scientific-border text-cyan focus:ring-0"
                />
                <span>Overlay All Casts</span>
              </label>
            )}

            {casts.length > 1 && !overlayAllCasts && (
              <select
                value={selectedCastIdx}
                onChange={(e) => setSelectedCastIdx(parseInt(e.target.value))}
                className="bg-ocean-950 border border-scientific-border text-xs text-scientific-text py-1 px-2 rounded-lg font-mono focus:border-cyan focus:outline-none"
              >
                {casts.map((c, idx) => (
                  <option key={c.time} value={idx}>
                    Cast #{idx + 1} ({c.dateLabel})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-scientific-border bg-ocean-900 hover:bg-ocean-800 text-xs font-mono text-cyan transition-colors"
              title="Download Profile CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="flex-1 p-5 min-h-[360px] max-h-[440px] bg-ocean-950/70">
          {activeTab === 'profile' ? (
            <Line data={profileChartData} options={profileChartOptions} />
          ) : (
            <Line data={tsDiagramData} options={tsDiagramOptions} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-ocean-950/90 border-t border-scientific-border text-[11px] font-mono text-scientific-dim">
          <span className="flex items-center gap-1 text-teal-300">
            <Info className="w-3.5 h-3.5 text-cyan" />
            Sensor Suite: Sea-Bird CTD (TEMP + PSAL + PRES)
          </span>
          <span className="text-white">
            Source: INCOIS ERDDAP Indian ARGO Floats
          </span>
        </div>
      </div>
    </div>
  );
};
