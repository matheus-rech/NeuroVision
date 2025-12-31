import { useMemo } from 'react';
import {
  Shield,
  Activity,
  Target,
  Timer,
  TrendingUp,
  GraduationCap,
  MessageSquare,
} from 'lucide-react';

/**
 * Circular gauge component for safety/technique scores
 */
function CircularGauge({
  value,
  maxValue = 100,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  colorStops = [
    { offset: 0, color: '#ef4444' },     // 0-30: Red
    { offset: 30, color: '#f59e0b' },    // 30-70: Amber
    { offset: 70, color: '#10b981' },    // 70-100: Green
  ],
}) {
  const normalizedValue = Math.min(100, Math.max(0, (value / maxValue) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedValue / 100) * circumference;

  // Determine color based on value
  const color = useMemo(() => {
    for (let i = colorStops.length - 1; i >= 0; i--) {
      if (normalizedValue >= colorStops[i].offset) {
        return colorStops[i].color;
      }
    }
    return colorStops[0].color;
  }, [normalizedValue, colorStops]);

  const gradientId = `gauge-gradient-${label?.replace(/\s/g, '-')}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Gradient definition */}
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              {colorStops.map((stop, i) => (
                <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} />
              ))}
            </linearGradient>
          </defs>

          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1f2937"
            strokeWidth={strokeWidth}
          />

          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
            style={{
              filter: `drop-shadow(0 0 6px ${color}40)`,
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold"
            style={{ color }}
          >
            {Math.round(value)}
          </span>
          {sublabel && (
            <span className="text-xs text-gray-500">{sublabel}</span>
          )}
        </div>
      </div>

      {label && (
        <span className="mt-2 text-sm font-medium text-gray-300">{label}</span>
      )}
    </div>
  );
}

/**
 * Phase indicator component
 */
function PhaseIndicator({ currentPhase, progress = 0 }) {
  const phases = [
    { name: 'Preparation', icon: Timer },
    { name: 'Approach', icon: Target },
    { name: 'Resection', icon: Activity },
    { name: 'Closure', icon: Shield },
  ];

  const currentIndex = phases.findIndex(
    p => p.name.toLowerCase() === currentPhase?.toLowerCase()
  );

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-medium text-gray-300">Surgical Phase</span>
      </div>

      <div className="space-y-2">
        {phases.map((phase, index) => {
          const Icon = phase.icon;
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <div
              key={phase.name}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-emerald-500/20 border border-emerald-500/30'
                  : isCompleted
                  ? 'bg-gray-700/30'
                  : 'bg-gray-800/30'
              }`}
            >
              <div className={`p-1.5 rounded ${
                isActive
                  ? 'bg-emerald-500/30 text-emerald-400'
                  : isCompleted
                  ? 'bg-gray-600/30 text-gray-400'
                  : 'bg-gray-700/30 text-gray-500'
              }`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1">
                <span className={`text-sm font-medium ${
                  isActive ? 'text-emerald-400' : isCompleted ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {phase.name}
                </span>
              </div>

              {isActive && (
                <span className="text-xs text-emerald-400 font-medium">
                  {progress}%
                </span>
              )}
              {isCompleted && (
                <span className="text-xs text-gray-500">Done</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Technique coaching panel for trainee mode
 */
function TechniqueCoaching({ score, message }) {
  return (
    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap className="w-5 h-5 text-purple-400" />
        <span className="text-sm font-medium text-purple-300">Technique Coaching</span>
      </div>

      {/* Technique score */}
      {score !== null && score !== undefined && (
        <div className="flex items-center gap-3 mb-4">
          <CircularGauge
            value={score}
            size={80}
            strokeWidth={8}
            sublabel="%"
            colorStops={[
              { offset: 0, color: '#ef4444' },
              { offset: 50, color: '#f59e0b' },
              { offset: 80, color: '#10b981' },
            ]}
          />
          <div>
            <div className="text-lg font-bold text-white">
              {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work'}
            </div>
            <div className="text-xs text-gray-400">Technique Score</div>
          </div>
        </div>
      )}

      {/* Coaching message */}
      {message && (
        <div className="flex items-start gap-2 bg-gray-800/50 rounded-lg p-3">
          <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300">{message}</p>
        </div>
      )}

      {!message && !score && (
        <p className="text-sm text-gray-500 text-center py-4">
          Technique analysis will appear during the procedure
        </p>
      )}
    </div>
  );
}

/**
 * Stats card component
 */
function StatCard({ icon: Icon, label, value, unit, trend, color = 'text-emerald-400' }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-white">{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
        {trend && (
          <TrendingUp className={`w-4 h-4 ml-auto ${
            trend > 0 ? 'text-emerald-400' : 'text-red-400 transform rotate-180'
          }`} />
        )}
      </div>
    </div>
  );
}

/**
 * Main Metrics Dashboard component
 */
export function MetricsDashboard({
  safetyScore = 100,
  currentPhase = 'Preparation',
  phaseProgress = 0,
  techniqueScore = null,
  coachingMessage = null,
  additionalMetrics = {},
  role = 'surgeon',
  compact = false,
  className = '',
}) {
  const showTechniqueCoaching = role === 'trainee';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Safety Score - Always visible */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="font-medium text-white">Safety Status</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
            safetyScore >= 80
              ? 'bg-emerald-500/20 text-emerald-400'
              : safetyScore >= 50
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {safetyScore >= 80 ? 'OPTIMAL' : safetyScore >= 50 ? 'CAUTION' : 'ALERT'}
          </span>
        </div>

        <div className="flex items-center justify-center">
          <CircularGauge
            value={safetyScore}
            size={compact ? 100 : 140}
            strokeWidth={compact ? 8 : 12}
            label="Safety Score"
          />
        </div>
      </div>

      {/* Phase Indicator - For surgeon/nurse */}
      {!compact && role !== 'trainee' && (
        <PhaseIndicator currentPhase={currentPhase} progress={phaseProgress} />
      )}

      {/* Technique Coaching - Trainee only */}
      {showTechniqueCoaching && (
        <TechniqueCoaching score={techniqueScore} message={coachingMessage} />
      )}

      {/* Quick Stats Grid */}
      {!compact && (
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            icon={Timer}
            label="Duration"
            value={additionalMetrics.duration || '0:00'}
            color="text-blue-400"
          />
          <StatCard
            icon={Target}
            label="Depth"
            value={additionalMetrics.depth || 0}
            unit="mm"
            color="text-purple-400"
          />
        </div>
      )}
    </div>
  );
}

export default MetricsDashboard;
