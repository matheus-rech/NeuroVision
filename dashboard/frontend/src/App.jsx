import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Brain,
  Volume2,
  VolumeX,
  Settings,
  Wifi,
  WifiOff,
  Maximize,
  RefreshCw,
  Target,
} from 'lucide-react';

// Components
import { VideoFeed } from './components/VideoFeed';
import { BrainModel3D } from './components/BrainModel3D';
import { PituitaryModel3D } from './components/pituitary/PituitaryModel3D';
import { HandTracker, INSTRUMENTS } from './components/pituitary/HandTracker';
import { AlertPanel } from './components/AlertPanel';
import { MetricsDashboard } from './components/MetricsDashboard';
import { RoleSelector } from './components/RoleSelector';

// Hooks
import { useNeuroVision } from './hooks/useNeuroVision';

// WebSocket URL - can be configured via environment variable
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

/**
 * Header component with branding and controls
 */
function Header({
  connectionStatus,
  currentRole,
  onRoleChange,
  isMuted,
  onToggleMute,
  onFullscreen,
  viewMode,
  onViewModeChange,
}) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-gray-800 backdrop-blur-sm">
      {/* Left: Branding */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Brain className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">ARIA</h1>
            <p className="text-xs text-gray-500">Surgical Command Center</p>
          </div>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800/50 border border-gray-700">
          <div className={`connection-dot ${connectionStatus}`} />
          <span className="text-xs text-gray-400 capitalize">{connectionStatus}</span>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-800/50 border border-gray-700">
          <button
            onClick={() => onViewModeChange('general')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'general'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Brain className="w-4 h-4" />
            General
          </button>
          <button
            onClick={() => onViewModeChange('pituitary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'pituitary'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Target className="w-4 h-4" />
            Pituitary
          </button>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Role selector */}
        <RoleSelector
          currentRole={currentRole}
          onRoleChange={onRoleChange}
        />

        {/* Mute button */}
        <button
          onClick={onToggleMute}
          className={`p-2 rounded-lg transition-colors ${
            isMuted
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
          }`}
          title={isMuted ? 'Unmute voice' : 'Mute voice'}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Fullscreen */}
        <button
          onClick={onFullscreen}
          className="p-2 rounded-lg bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 transition-colors"
          title="Fullscreen"
        >
          <Maximize className="w-5 h-5" />
        </button>

        {/* Settings */}
        <button
          className="p-2 rounded-lg bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

/**
 * Main dashboard layout - adapts based on role
 */
function DashboardLayout({ role, children }) {
  // Role-specific grid configurations
  const layoutConfig = useMemo(() => ({
    surgeon: {
      // Large video (70%), smaller 3D (30%)
      gridTemplate: 'grid-cols-[7fr_3fr]',
      videoSize: 'h-full',
      brainSize: 'h-full',
      bottomLayout: 'grid-cols-[7fr_3fr]',
    },
    nurse: {
      // Equal split
      gridTemplate: 'grid-cols-2',
      videoSize: 'h-full',
      brainSize: 'h-full',
      bottomLayout: 'grid-cols-2',
    },
    trainee: {
      // Smaller video, larger 3D
      gridTemplate: 'grid-cols-[4fr_6fr]',
      videoSize: 'h-full',
      brainSize: 'h-full',
      bottomLayout: 'grid-cols-[4fr_6fr]',
    },
  }), []);

  const config = layoutConfig[role] || layoutConfig.surgeon;

  return (
    <div className={`role-${role} h-full flex flex-col`}>
      {children(config)}
    </div>
  );
}

/**
 * Demo data generator for when backend is not connected
 */
function useDemoData(isConnected) {
  const [demoState, setDemoState] = useState({
    safetyScore: 95,
    currentPhase: 'Approach',
    phaseProgress: 45,
    currentDepth: 23,
    maxDepth: 80,
    techniqueScore: 82,
    alerts: [],
  });

  useEffect(() => {
    if (isConnected) return;

    // Simulate changing metrics
    const metricsInterval = setInterval(() => {
      setDemoState(prev => ({
        ...prev,
        safetyScore: Math.max(70, Math.min(100, prev.safetyScore + (Math.random() - 0.5) * 5)),
        currentDepth: Math.min(prev.maxDepth, prev.currentDepth + Math.random() * 0.5),
        phaseProgress: Math.min(100, prev.phaseProgress + 0.2),
        techniqueScore: Math.max(60, Math.min(100, prev.techniqueScore + (Math.random() - 0.5) * 3)),
      }));
    }, 2000);

    // Simulate alerts
    const alertMessages = [
      { priority: 'info', message: 'Tumor margin identified - 2mm clearance' },
      { priority: 'warning', message: 'Vessel proximity - 4mm from trajectory' },
      { priority: 'info', message: 'Motor cortex localized - safe distance maintained' },
      { priority: 'success', message: 'Approach phase 50% complete' },
    ];

    const alertInterval = setInterval(() => {
      const randomAlert = alertMessages[Math.floor(Math.random() * alertMessages.length)];
      setDemoState(prev => ({
        ...prev,
        alerts: [
          {
            id: Date.now(),
            ...randomAlert,
            timestamp: new Date().toISOString(),
            acknowledged: false,
          },
          ...prev.alerts,
        ].slice(0, 20),
      }));
    }, 8000);

    // Add initial demo alert
    setDemoState(prev => ({
      ...prev,
      alerts: [{
        id: 1,
        priority: 'info',
        message: 'Demo mode active - connect backend for live data',
        source: 'System',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      }],
    }));

    return () => {
      clearInterval(metricsInterval);
      clearInterval(alertInterval);
    };
  }, [isConnected]);

  return demoState;
}

/**
 * Main App component
 */
function App() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState('pituitary'); // 'general' or 'pituitary'
  const [tumorCase, setTumorCase] = useState('micro'); // 'micro', 'macro', 'invasive'

  // Hand tracking state for AR instruments
  const [instrumentType, setInstrumentType] = useState(INSTRUMENTS.NONE);
  const [instrumentPosition, setInstrumentPosition] = useState({ x: 0, y: 0, z: 2 });
  const [isInstrumentActive, setIsInstrumentActive] = useState(false);

  // Handle hand tracking updates
  const handleHandUpdate = useCallback((data) => {
    setInstrumentPosition(data.position);
    setIsInstrumentActive(true);
  }, []);

  // Handle instrument changes
  const handleInstrumentChange = useCallback((instrument) => {
    setInstrumentType(instrument);
    console.log('[AR] Instrument changed:', instrument);
  }, []);

  // Handle collision with critical structures
  const handleCollision = useCallback((collision) => {
    if (collision.isColliding) {
      console.warn('[AR] COLLISION WARNING:', collision.structureName);
      // Could trigger voice alert here via WebSocket
    }
  }, []);

  // WebSocket connection and state
  const {
    // Connection
    isConnected,
    connectionStatus,

    // Video
    currentFrame,
    frameRate,
    overlays,

    // Alerts
    alerts: wsAlerts,
    unreadAlertCount,

    // Metrics
    safetyScore: wsSafetyScore,
    currentPhase: wsCurrentPhase,
    phaseProgress: wsPhaseProgress,
    techniqueScore: wsTechniqueScore,
    coachingMessage,

    // Navigation
    trajectory,
    entryPoint,
    targetPoint,
    currentDepth: wsCurrentDepth,
    maxDepth: wsMaxDepth,

    // Role/Audio
    currentRole,
    isMuted,

    // Actions
    setRole,
    toggleMute,
    acknowledgeAlert,
    clearAlerts,
  } = useNeuroVision(WS_URL);

  // Demo data fallback when not connected
  const demoData = useDemoData(isConnected);

  // Use real data when connected, demo data when not
  const displayData = useMemo(() => ({
    safetyScore: isConnected ? wsSafetyScore : demoData.safetyScore,
    currentPhase: isConnected ? wsCurrentPhase : demoData.currentPhase,
    phaseProgress: isConnected ? wsPhaseProgress : demoData.phaseProgress,
    techniqueScore: isConnected ? wsTechniqueScore : demoData.techniqueScore,
    currentDepth: isConnected ? wsCurrentDepth : demoData.currentDepth,
    maxDepth: isConnected ? wsMaxDepth : demoData.maxDepth,
    alerts: isConnected ? wsAlerts : demoData.alerts,
  }), [
    isConnected,
    wsSafetyScore, wsCurrentPhase, wsPhaseProgress, wsTechniqueScore,
    wsCurrentDepth, wsMaxDepth, wsAlerts,
    demoData,
  ]);

  // Handle fullscreen
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[#0a0f1a] overflow-hidden">
      {/* Header */}
      <Header
        connectionStatus={connectionStatus}
        currentRole={currentRole}
        onRoleChange={setRole}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onFullscreen={handleFullscreen}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main content */}
      <main className="flex-1 p-4 overflow-hidden">
        <DashboardLayout role={currentRole}>
          {(config) => (
            <div className="h-full flex flex-col gap-4">
              {/* Top row: Video/HandTracker + 3D */}
              <div className={`flex-1 grid ${config.gridTemplate} gap-4 min-h-0`}>
                {/* Video Feed or Hand Tracker based on view mode */}
                {viewMode === 'pituitary' ? (
                  <HandTracker
                    onHandUpdate={handleHandUpdate}
                    onInstrumentChange={handleInstrumentChange}
                    showVideo={true}
                    showSkeleton={true}
                    className={config.videoSize}
                  />
                ) : (
                  <VideoFeed
                    frame={currentFrame}
                    overlays={overlays}
                    frameRate={frameRate}
                    role={currentRole}
                    className={config.videoSize}
                  />
                )}

                {/* 3D Model - switches based on view mode */}
                {viewMode === 'pituitary' ? (
                  <PituitaryModel3D
                    tumorCase={tumorCase}
                    currentPhase={Math.floor(displayData.phaseProgress / 100 * 6)}
                    showLabels={true}
                    instrumentType={instrumentType}
                    instrumentPosition={instrumentPosition}
                    isInstrumentActive={isInstrumentActive}
                    onCollision={handleCollision}
                    className={config.brainSize}
                  />
                ) : (
                  <BrainModel3D
                    trajectory={trajectory}
                    entryPoint={entryPoint}
                    targetPoint={targetPoint}
                    currentDepth={displayData.currentDepth}
                    maxDepth={displayData.maxDepth}
                    role={currentRole}
                    className={config.brainSize}
                  />
                )}
              </div>

              {/* Bottom row: Alerts + Metrics */}
              <div className={`grid ${config.bottomLayout} gap-4`} style={{ height: '35%' }}>
                {/* Alert Panel */}
                <AlertPanel
                  alerts={displayData.alerts}
                  onAcknowledge={acknowledgeAlert}
                  onClearAll={clearAlerts}
                  maxVisible={currentRole === 'nurse' ? 15 : 8}
                  compact={currentRole === 'surgeon'}
                  role={currentRole}
                  className="h-full"
                />

                {/* Metrics Dashboard */}
                <MetricsDashboard
                  safetyScore={displayData.safetyScore}
                  currentPhase={displayData.currentPhase}
                  phaseProgress={displayData.phaseProgress}
                  techniqueScore={displayData.techniqueScore}
                  coachingMessage={coachingMessage}
                  role={currentRole}
                  compact={currentRole === 'surgeon'}
                  additionalMetrics={{
                    depth: displayData.currentDepth,
                    duration: '0:42:15',
                  }}
                  className="h-full overflow-y-auto"
                />
              </div>
            </div>
          )}
        </DashboardLayout>
      </main>

      {/* Connection indicator overlay when disconnected */}
      {connectionStatus === 'disconnected' && (
        <div className="fixed bottom-4 left-4 flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg">
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-amber-400">
            Demo mode - Backend not connected
          </span>
          <button
            onClick={() => window.location.reload()}
            className="ml-2 p-1 hover:bg-amber-500/20 rounded transition-colors"
            title="Retry connection"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
