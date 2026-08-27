import React, { useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  FastForward, 
  Clock,
  Waves
} from 'lucide-react';

export interface TimelineBarProps {
  times: string[];
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({
  times,
  currentStepIndex,
  onSelectStep,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 2200 / playbackSpeed;
    const interval = setInterval(() => {
      onSelectStep((currentStepIndex + 1) % times.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, currentStepIndex, times.length, playbackSpeed, onSelectStep]);

  const handlePrev = () => {
    const prev = (currentStepIndex - 1 + times.length) % times.length;
    onSelectStep(prev);
  };

  const handleNext = () => {
    const next = (currentStepIndex + 1) % times.length;
    onSelectStep(next);
  };

  const toggleSpeed = () => {
    if (playbackSpeed === 1.0) setPlaybackSpeed(2.0);
    else if (playbackSpeed === 2.0) setPlaybackSpeed(0.5);
    else setPlaybackSpeed(1.0);
  };

  const formatStepDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      });
    } catch {
      return isoStr;
    }
  };

  const activeTimeStr = times[currentStepIndex] || times[0];
  const activeDateFormatted = formatStepDate(activeTimeStr);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-4xl bg-scientific-panel/95 backdrop-blur-xl border border-scientific-border rounded-xl shadow-glass px-4 py-2.5 text-scientific-text select-none">
      <div className="flex items-center justify-between gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg border border-scientific-border bg-ocean-950/60 hover:bg-ocean-800 text-scientific-dim hover:text-white transition-colors"
            title="Previous Timestep"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-lg border transition-all ${
              isPlaying
                ? 'bg-cyan text-ocean-950 font-bold border-cyan shadow-cyan-glow'
                : 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white border-cyan/40 hover:opacity-90'
            }`}
            title={isPlaying ? 'Pause Animation' : 'Play Timeline Animation'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg border border-scientific-border bg-ocean-950/60 hover:bg-ocean-800 text-scientific-dim hover:text-white transition-colors"
            title="Next Timestep"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={toggleSpeed}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-scientific-border bg-ocean-950/60 hover:bg-ocean-800 text-[11px] font-mono text-cyan transition-colors"
            title="Change Playback Speed"
          >
            <FastForward className="w-3 h-3" />
            <span>{playbackSpeed}x</span>
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="flex-1 flex flex-col gap-1.5 px-2">
          <div className="relative flex items-center justify-between w-full h-5">
            <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-1 bg-ocean-800 rounded-full" />

            <div
              className="absolute left-2 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-teal-500 to-cyan rounded-full transition-all duration-300"
              style={{
                width: `${(currentStepIndex / (times.length - 1)) * 100}%`,
              }}
            />

            {times.map((tStr, idx) => {
              const isActive = idx === currentStepIndex;
              const isPast = idx < currentStepIndex;
              const shortDate = formatStepDate(tStr).slice(0, 6); // "May 30"

              return (
                <button
                  key={tStr}
                  onClick={() => onSelectStep(idx)}
                  className="relative z-10 group flex flex-col items-center focus:outline-none"
                  title={`Step ${idx + 1}: ${formatStepDate(tStr)}`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                      isActive
                        ? 'bg-cyan border-white scale-125 shadow-cyan-glow'
                        : isPast
                        ? 'bg-teal-500 border-ocean-950'
                        : 'bg-ocean-900 border-scientific-border group-hover:border-cyan'
                    }`}
                  />
                  <span
                    className={`absolute top-5 text-[10px] font-mono whitespace-nowrap hidden sm:block transition-colors ${
                      isActive
                        ? 'text-cyan font-bold'
                        : 'text-scientific-dim group-hover:text-white'
                    }`}
                  >
                    {shortDate}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-scientific-dim pt-2">
            <span className="flex items-center gap-1 text-teal-300">
              <Waves className="w-3 h-3 text-cyan" />
              INCOIS 10-Day Variational Analysis
            </span>
            <span className="text-white font-semibold flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan" />
              {activeDateFormatted} (Step {currentStepIndex + 1}/{times.length})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
