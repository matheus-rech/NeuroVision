/**
 * GuidedNavigation - Step-by-Step Surgical Approach Walkthrough
 * ==============================================================
 *
 * 6-phase transsphenoidal endonasal approach with:
 * - Camera animations between phases
 * - Voice narration via ElevenLabs
 * - Visual highlights on relevant structures
 * - Teaching points display
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

// API endpoint for voice service
const VOICE_API = 'http://localhost:8000/api/voice/speak';

// Surgical phases with camera positions and teaching content
export const SURGICAL_PHASES = [
  {
    id: 1,
    name: 'Nasal Entry',
    shortName: 'Entry',
    camera: { position: [0, 0, 4], target: [0, 0, 2] },
    viewMode: 'endoscope',
    highlightStructures: ['nasalCorridor'],
    criticalStructures: [],
    duration: 20000, // ms
    teachingPoints: [
      'Identify middle turbinate',
      'Locate nasal septum',
      'Establish working corridor',
    ],
    narration: `Phase 1: Nasal Entry. We begin by introducing the endoscope through the right nostril.
      Identify the middle turbinate as your first landmark. The nasal septum should be visible medially.
      Gently advance while maintaining visualization of the sphenoethmoidal recess.`,
  },
  {
    id: 2,
    name: 'Sphenoidotomy',
    shortName: 'Sphenoid',
    camera: { position: [0, 0.2, 2.5], target: [0, 0, 0.5] },
    viewMode: 'endoscope',
    highlightStructures: ['sphenoid'],
    criticalStructures: [],
    duration: 25000,
    teachingPoints: [
      'Locate sphenoid ostium',
      'Remove anterior sphenoid wall',
      'Identify intersinus septum',
    ],
    narration: `Phase 2: Sphenoidotomy. The sphenoid ostium is your gateway to the sella.
      Use a Kerrison rongeur to enlarge the natural ostium. Remove the anterior sphenoid wall
      to expose the sellar floor. Note the intersinus septum which guides your midline.`,
  },
  {
    id: 3,
    name: 'Sellar Floor',
    shortName: 'Sella',
    camera: { position: [0, 0.3, 1.5], target: [0, 0, 0] },
    viewMode: 'endoscope',
    highlightStructures: ['sella', 'sphenoid'],
    criticalStructures: ['carotids'],
    duration: 25000,
    teachingPoints: [
      'Identify sellar floor',
      'Locate carotid prominences',
      'Mark safe corridor boundaries',
    ],
    narration: `Phase 3: Sellar Floor Exposure. You can now see the sellar floor.
      CRITICAL: Identify the carotid prominences bilaterally. These mark your lateral boundaries.
      The intercarotid distance defines your safe working corridor. Measure this carefully.`,
  },
  {
    id: 4,
    name: 'Dural Opening',
    shortName: 'Dura',
    camera: { position: [0, 0.4, 1], target: [0, 0.2, 0] },
    viewMode: 'endoscope',
    highlightStructures: ['sella', 'pituitary'],
    criticalStructures: ['carotids', 'chiasm'],
    duration: 20000,
    teachingPoints: [
      'Incise dura in cruciate fashion',
      'Identify normal pituitary tissue',
      'Locate tumor capsule',
    ],
    narration: `Phase 4: Dural Opening. Remove the sellar floor bone with a high-speed drill.
      Incise the dura in a cruciate fashion. Normal pituitary tissue appears orange-pink.
      The tumor, if an adenoma, will appear softer and more gray-white in color.`,
  },
  {
    id: 5,
    name: 'Tumor Resection',
    shortName: 'Resection',
    camera: { position: [0, 0.5, 0.8], target: [0, 0.3, 0] },
    viewMode: 'endoscope',
    highlightStructures: ['tumor', 'pituitary'],
    criticalStructures: ['carotids', 'chiasm'],
    duration: 30000,
    teachingPoints: [
      'Use ring curettes for tumor removal',
      'Preserve normal pituitary',
      'Monitor for CSF leak',
    ],
    narration: `Phase 5: Tumor Resection. Using ring curettes, begin removing the tumor in a
      systematic fashion. Start centrally and work toward the periphery.
      IMPORTANT: Preserve normal pituitary tissue. Watch superiorly for the diaphragma sellae
      descending, which indicates adequate decompression.`,
  },
  {
    id: 6,
    name: 'Closure',
    shortName: 'Close',
    camera: { position: [0, 0.2, 2], target: [0, 0, 0.5] },
    viewMode: 'endoscope',
    highlightStructures: ['sella', 'sphenoid'],
    criticalStructures: [],
    duration: 20000,
    teachingPoints: [
      'Pack sella with fat graft',
      'Reconstruct sellar floor',
      'Nasoseptal flap if needed',
    ],
    narration: `Phase 6: Closure. Hemostasis is critical. Pack the sella with abdominal fat graft
      if there's a CSF leak. Reconstruct the sellar floor with bone or synthetic material.
      For larger defects, use a nasoseptal flap for watertight closure.
      Congratulations on completing the transsphenoidal approach.`,
  },
];

/**
 * Progress bar component
 */
function PhaseProgress({ currentPhase, totalPhases, phaseProgress }) {
  return (
    <div className="w-full">
      {/* Phase indicators */}
      <div className="flex justify-between mb-2">
        {SURGICAL_PHASES.map((phase, idx) => (
          <div
            key={phase.id}
            className={`flex flex-col items-center ${
              idx < currentPhase
                ? 'text-emerald-400'
                : idx === currentPhase
                ? 'text-white'
                : 'text-gray-500'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                idx < currentPhase
                  ? 'bg-emerald-500/20 border-emerald-500'
                  : idx === currentPhase
                  ? 'bg-purple-500/20 border-purple-500 animate-pulse'
                  : 'bg-gray-800 border-gray-600'
              }`}
            >
              {idx + 1}
            </div>
            <span className="text-xs mt-1 hidden sm:block">{phase.shortName}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-purple-500 transition-all duration-300"
          style={{
            width: `${((currentPhase + phaseProgress / 100) / totalPhases) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Teaching points panel
 */
function TeachingPoints({ phase }) {
  if (!phase) return null;

  return (
    <div className="bg-gray-800/80 rounded-lg p-3">
      <h4 className="text-sm font-semibold text-emerald-400 mb-2">
        Teaching Points - {phase.name}
      </h4>
      <ul className="space-y-1">
        {phase.teachingPoints.map((point, idx) => (
          <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
            <ChevronRight className="w-3 h-3 mt-0.5 text-emerald-500 flex-shrink-0" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Main GuidedNavigation component
 */
export function GuidedNavigation({
  onPhaseChange,
  onCameraChange,
  onHighlightChange,
  onCriticalChange,
  className = '',
}) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [isNarrating, setIsNarrating] = useState(false);

  const progressIntervalRef = useRef(null);
  const narrationTimeoutRef = useRef(null);

  const currentPhase = SURGICAL_PHASES[currentPhaseIndex];
  const totalPhases = SURGICAL_PHASES.length;

  // Speak narration via backend API
  const speakNarration = useCallback(async (text) => {
    if (isMuted) return;

    try {
      setIsNarrating(true);
      const response = await fetch(`${VOICE_API}?text=${encodeURIComponent(text)}&priority=info`, {
        method: 'POST',
      });

      if (!response.ok) {
        console.warn('[Navigation] Voice API unavailable, continuing without narration');
      }
    } catch (error) {
      console.warn('[Navigation] Voice API error:', error.message);
    } finally {
      // Estimate narration duration (roughly 150 words per minute)
      const wordCount = text.split(' ').length;
      const estimatedDuration = (wordCount / 150) * 60 * 1000;

      narrationTimeoutRef.current = setTimeout(() => {
        setIsNarrating(false);
      }, estimatedDuration);
    }
  }, [isMuted]);

  // Apply phase settings
  const applyPhaseSettings = useCallback((phase) => {
    onPhaseChange?.(phase.id);
    onCameraChange?.(phase.camera, phase.viewMode);
    onHighlightChange?.(phase.highlightStructures);
    onCriticalChange?.(phase.criticalStructures);
  }, [onPhaseChange, onCameraChange, onHighlightChange, onCriticalChange]);

  // Go to specific phase
  const goToPhase = useCallback((index) => {
    if (index < 0 || index >= totalPhases) return;

    setCurrentPhaseIndex(index);
    setPhaseProgress(0);

    const phase = SURGICAL_PHASES[index];
    applyPhaseSettings(phase);
    speakNarration(phase.narration);
  }, [totalPhases, applyPhaseSettings, speakNarration]);

  // Navigation controls
  const nextPhase = useCallback(() => {
    if (currentPhaseIndex < totalPhases - 1) {
      goToPhase(currentPhaseIndex + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentPhaseIndex, totalPhases, goToPhase]);

  const prevPhase = useCallback(() => {
    if (currentPhaseIndex > 0) {
      goToPhase(currentPhaseIndex - 1);
    }
  }, [currentPhaseIndex, goToPhase]);

  const restart = useCallback(() => {
    goToPhase(0);
    setIsPlaying(false);
  }, [goToPhase]);

  const togglePlay = useCallback(() => {
    if (!isPlaying) {
      // Start playing - speak current phase narration
      speakNarration(currentPhase.narration);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, currentPhase, speakNarration]);

  // Auto-advance when playing
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        setPhaseProgress((prev) => {
          const newProgress = prev + (100 / (currentPhase.duration / 100));

          if (newProgress >= 100) {
            nextPhase();
            return 0;
          }

          return newProgress;
        });
      }, 100);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, currentPhase.duration, nextPhase]);

  // Initialize on mount
  useEffect(() => {
    applyPhaseSettings(SURGICAL_PHASES[0]);

    return () => {
      if (narrationTimeoutRef.current) {
        clearTimeout(narrationTimeoutRef.current);
      }
    };
  }, [applyPhaseSettings]);

  return (
    <div className={`bg-gray-900/95 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Guided Navigation</h3>
          <p className="text-xs text-gray-400">Transsphenoidal Endonasal Approach</p>
        </div>

        {/* Narration indicator */}
        {isNarrating && (
          <div className="flex items-center gap-2 px-2 py-1 bg-purple-500/20 rounded-full">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            <span className="text-xs text-purple-400">Speaking...</span>
          </div>
        )}
      </div>

      {/* Current phase info */}
      <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Phase {currentPhaseIndex + 1} of {totalPhases}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            currentPhase.criticalStructures.length > 0
              ? 'bg-red-500/20 text-red-400'
              : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {currentPhase.criticalStructures.length > 0 ? '⚠️ Critical Zone' : '✓ Safe'}
          </span>
        </div>
        <h4 className="text-xl font-bold text-white">{currentPhase.name}</h4>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <PhaseProgress
          currentPhase={currentPhaseIndex}
          totalPhases={totalPhases}
          phaseProgress={phaseProgress}
        />
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={restart}
          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
          title="Restart"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={prevPhase}
          disabled={currentPhaseIndex === 0}
          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous phase"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={togglePlay}
          className={`p-3 rounded-full transition-colors ${
            isPlaying
              ? 'bg-purple-500 text-white hover:bg-purple-600'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <button
          onClick={nextPhase}
          disabled={currentPhaseIndex === totalPhases - 1}
          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next phase"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-2 rounded-lg transition-colors ${
            isMuted
              ? 'bg-red-500/20 text-red-400'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
          title={isMuted ? 'Unmute narration' : 'Mute narration'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Teaching points */}
      <TeachingPoints phase={currentPhase} />

      {/* Quick navigation */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 mb-2">Jump to phase:</p>
        <div className="flex flex-wrap gap-1">
          {SURGICAL_PHASES.map((phase, idx) => (
            <button
              key={phase.id}
              onClick={() => goToPhase(idx)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                idx === currentPhaseIndex
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {phase.shortName}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GuidedNavigation;
