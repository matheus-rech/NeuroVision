import { useState, useCallback, useEffect, useRef } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

// Default WebSocket URL - connects to ARIA backend
const DEFAULT_WS_URL = 'ws://localhost:8000/ws';

// Message types from backend
const MESSAGE_TYPES = {
  FRAME: 'frame',
  ALERT: 'alert',
  METRICS: 'metrics',
  PHASE: 'phase',
  TRAJECTORY: 'trajectory',
  CONNECTION: 'connection',
  ROLE_CONFIRMED: 'role_confirmed',
  ERROR: 'error',
};

// Initial state structure
const initialState = {
  // Connection
  isConnected: false,
  connectionStatus: 'disconnected',
  lastMessageTime: null,

  // Video feed
  currentFrame: null,
  frameRate: 0,
  overlays: [],

  // Alerts
  alerts: [],
  unreadAlertCount: 0,

  // Metrics
  safetyScore: 100,
  currentPhase: 'Preparation',
  phaseProgress: 0,
  techniqueScore: null,
  coachingMessage: null,

  // 3D Navigation
  trajectory: null,
  entryPoint: null,
  targetPoint: null,
  currentDepth: 0,
  maxDepth: 100,

  // Role
  currentRole: 'surgeon',
  isMuted: false,
};

/**
 * Custom hook for managing NeuroVision WebSocket connection and state
 * @param {string} wsUrl - WebSocket URL to connect to
 * @returns {Object} State and control functions
 */
export function useNeuroVision(wsUrl = DEFAULT_WS_URL) {
  const [state, setState] = useState(initialState);
  const frameCountRef = useRef(0);
  const frameTimeRef = useRef(Date.now());
  const alertIdRef = useRef(0);

  // WebSocket connection
  const {
    sendMessage,
    sendJsonMessage,
    lastMessage,
    readyState,
    getWebSocket,
  } = useWebSocket(wsUrl, {
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
    onOpen: () => {
      console.log('[NeuroVision] WebSocket connected');
      setState(prev => ({
        ...prev,
        isConnected: true,
        connectionStatus: 'connected',
      }));
    },
    onClose: () => {
      console.log('[NeuroVision] WebSocket disconnected');
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionStatus: 'disconnected',
      }));
    },
    onError: (event) => {
      console.error('[NeuroVision] WebSocket error:', event);
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
      }));
    },
  });

  // Connection status mapping
  const connectionStatus = {
    [ReadyState.CONNECTING]: 'connecting',
    [ReadyState.OPEN]: 'connected',
    [ReadyState.CLOSING]: 'disconnecting',
    [ReadyState.CLOSED]: 'disconnected',
    [ReadyState.UNINSTANTIATED]: 'disconnected',
  }[readyState];

  // Calculate frame rate
  const updateFrameRate = useCallback(() => {
    frameCountRef.current++;
    const now = Date.now();
    const elapsed = now - frameTimeRef.current;

    if (elapsed >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / elapsed);
      setState(prev => ({ ...prev, frameRate: fps }));
      frameCountRef.current = 0;
      frameTimeRef.current = now;
    }
  }, []);

  // Process incoming messages
  useEffect(() => {
    if (!lastMessage?.data) return;

    try {
      const message = JSON.parse(lastMessage.data);
      const { type, data } = message;

      setState(prev => ({
        ...prev,
        lastMessageTime: Date.now(),
        connectionStatus: 'connected',
      }));

      switch (type) {
        case MESSAGE_TYPES.FRAME:
          updateFrameRate();
          setState(prev => ({
            ...prev,
            currentFrame: data.frame,
            overlays: data.overlays || [],
          }));
          break;

        case MESSAGE_TYPES.ALERT:
          const newAlert = {
            id: ++alertIdRef.current,
            priority: data.priority || 'info',
            message: data.message,
            source: data.source || 'system',
            timestamp: data.timestamp || new Date().toISOString(),
            acknowledged: false,
          };
          setState(prev => ({
            ...prev,
            alerts: [newAlert, ...prev.alerts].slice(0, 50), // Keep last 50 alerts
            unreadAlertCount: prev.unreadAlertCount + 1,
          }));
          break;

        case MESSAGE_TYPES.METRICS:
          setState(prev => ({
            ...prev,
            safetyScore: data.safety_score ?? prev.safetyScore,
            techniqueScore: data.technique_score ?? prev.techniqueScore,
            coachingMessage: data.coaching_message ?? prev.coachingMessage,
          }));
          break;

        case MESSAGE_TYPES.PHASE:
          setState(prev => ({
            ...prev,
            currentPhase: data.phase || prev.currentPhase,
            phaseProgress: data.progress ?? prev.phaseProgress,
          }));
          break;

        case MESSAGE_TYPES.TRAJECTORY:
          setState(prev => ({
            ...prev,
            trajectory: data.trajectory,
            entryPoint: data.entry_point,
            targetPoint: data.target_point,
            currentDepth: data.current_depth ?? prev.currentDepth,
            maxDepth: data.max_depth ?? prev.maxDepth,
          }));
          break;

        case MESSAGE_TYPES.ROLE_CONFIRMED:
          setState(prev => ({
            ...prev,
            currentRole: data.role,
          }));
          break;

        case MESSAGE_TYPES.ERROR:
          console.error('[NeuroVision] Server error:', data.message);
          break;

        default:
          console.log('[NeuroVision] Unknown message type:', type);
      }
    } catch (error) {
      // Handle binary frame data (base64 encoded image)
      if (typeof lastMessage.data === 'string' && lastMessage.data.startsWith('data:image')) {
        updateFrameRate();
        setState(prev => ({
          ...prev,
          currentFrame: lastMessage.data,
        }));
      } else {
        console.warn('[NeuroVision] Failed to parse message:', error);
      }
    }
  }, [lastMessage, updateFrameRate]);

  // Action: Set role
  const setRole = useCallback((role) => {
    sendJsonMessage({
      type: 'set_role',
      data: { role },
    });
    setState(prev => ({ ...prev, currentRole: role }));
  }, [sendJsonMessage]);

  // Action: Toggle mute
  const toggleMute = useCallback(() => {
    setState(prev => {
      const newMuted = !prev.isMuted;
      sendJsonMessage({
        type: 'set_mute',
        data: { muted: newMuted },
      });
      return { ...prev, isMuted: newMuted };
    });
  }, [sendJsonMessage]);

  // Action: Acknowledge alert
  const acknowledgeAlert = useCallback((alertId) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ),
      unreadAlertCount: Math.max(0, prev.unreadAlertCount - 1),
    }));
    sendJsonMessage({
      type: 'acknowledge_alert',
      data: { alert_id: alertId },
    });
  }, [sendJsonMessage]);

  // Action: Clear all alerts
  const clearAlerts = useCallback(() => {
    setState(prev => ({
      ...prev,
      alerts: [],
      unreadAlertCount: 0,
    }));
  }, []);

  // Action: Request fullscreen
  const requestFullscreen = useCallback((elementId) => {
    const element = document.getElementById(elementId);
    if (element?.requestFullscreen) {
      element.requestFullscreen();
    }
  }, []);

  // Action: Send custom command
  const sendCommand = useCallback((command, data = {}) => {
    sendJsonMessage({
      type: command,
      data,
    });
  }, [sendJsonMessage]);

  return {
    // State
    ...state,
    connectionStatus,
    isConnected: readyState === ReadyState.OPEN,

    // Actions
    setRole,
    toggleMute,
    acknowledgeAlert,
    clearAlerts,
    requestFullscreen,
    sendCommand,

    // WebSocket utilities
    sendMessage,
    sendJsonMessage,
    getWebSocket,
  };
}

export default useNeuroVision;
export { MESSAGE_TYPES, DEFAULT_WS_URL };
