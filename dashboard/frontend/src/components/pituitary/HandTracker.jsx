/**
 * HandTracker - MediaPipe Hand Tracking for Surgical Instrument Control
 * =====================================================================
 *
 * Uses webcam to track hand movements and gestures, mapping them to
 * virtual surgical instruments for AR training simulation.
 *
 * Gesture Mappings:
 * - Pinch (thumb + index)  → Ring Curette (tumor removal)
 * - Point (index extended) → Suction Aspirator
 * - Open palm             → Endoscope (view control)
 * - Two-finger pinch      → Bipolar Forceps
 * - Fist                  → No instrument (rest)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

// Hand landmark indices
const LANDMARKS = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_TIP: 8,
  MIDDLE_TIP: 12,
  RING_TIP: 16,
  PINKY_TIP: 20,
  INDEX_MCP: 5,
  MIDDLE_MCP: 9,
  RING_MCP: 13,
  PINKY_MCP: 17,
};

// Instrument types based on PitVQA dataset
export const INSTRUMENTS = {
  NONE: 'none',
  CURETTE: 'curette',        // Ring curette for tumor removal
  SUCTION: 'suction',        // Suction aspirator
  ENDOSCOPE: 'endoscope',    // Endoscope (view control)
  FORCEPS: 'forceps',        // Bipolar forceps
  DISSECTOR: 'dissector',    // Micro-dissector
};

// Gesture recognition thresholds
const PINCH_THRESHOLD = 0.08;
const FINGER_EXTENDED_THRESHOLD = 0.15;

/**
 * Calculate distance between two landmarks
 */
function distance(a, b) {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2) +
    Math.pow((a.z || 0) - (b.z || 0), 2)
  );
}

/**
 * Check if a finger is extended
 */
function isFingerExtended(landmarks, tipIdx, mcpIdx) {
  const tip = landmarks[tipIdx];
  const mcp = landmarks[mcpIdx];
  const wrist = landmarks[LANDMARKS.WRIST];

  // Finger is extended if tip is farther from wrist than MCP
  const tipDist = distance(tip, wrist);
  const mcpDist = distance(mcp, wrist);

  return tipDist > mcpDist + FINGER_EXTENDED_THRESHOLD;
}

/**
 * Recognize gesture from hand landmarks
 */
function recognizeGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return INSTRUMENTS.NONE;

  const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
  const indexTip = landmarks[LANDMARKS.INDEX_TIP];
  const middleTip = landmarks[LANDMARKS.MIDDLE_TIP];

  // Check pinch (thumb + index close together)
  const pinchDistance = distance(thumbTip, indexTip);
  const isPinching = pinchDistance < PINCH_THRESHOLD;

  // Check which fingers are extended
  const indexExtended = isFingerExtended(landmarks, LANDMARKS.INDEX_TIP, LANDMARKS.INDEX_MCP);
  const middleExtended = isFingerExtended(landmarks, LANDMARKS.MIDDLE_TIP, LANDMARKS.MIDDLE_MCP);
  const ringExtended = isFingerExtended(landmarks, LANDMARKS.RING_TIP, LANDMARKS.RING_MCP);
  const pinkyExtended = isFingerExtended(landmarks, LANDMARKS.PINKY_TIP, LANDMARKS.PINKY_MCP);

  // Two-finger pinch (thumb + index + middle close)
  const twoFingerPinch = isPinching && distance(thumbTip, middleTip) < PINCH_THRESHOLD;

  // Gesture recognition logic
  if (twoFingerPinch) {
    return INSTRUMENTS.FORCEPS; // Bipolar forceps
  }

  if (isPinching && !middleExtended && !ringExtended) {
    return INSTRUMENTS.CURETTE; // Ring curette
  }

  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return INSTRUMENTS.SUCTION; // Suction (pointing)
  }

  if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
    return INSTRUMENTS.ENDOSCOPE; // Open palm = endoscope
  }

  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return INSTRUMENTS.NONE; // Fist = rest
  }

  return INSTRUMENTS.DISSECTOR; // Default for other gestures
}

/**
 * Calculate 3D position from hand landmarks
 * Maps 2D screen position + depth to 3D scene coordinates
 */
function calculate3DPosition(landmarks) {
  if (!landmarks || landmarks.length < 21) return { x: 0, y: 0, z: 0 };

  // Use wrist as reference, index tip for fine control
  const wrist = landmarks[LANDMARKS.WRIST];
  const indexTip = landmarks[LANDMARKS.INDEX_TIP];

  // Map to scene coordinates
  // X: left-right (0-1 → -2 to 2)
  // Y: up-down (0-1 → 2 to -2, inverted)
  // Z: depth based on hand size (smaller hand = further)

  const handSize = distance(wrist, landmarks[LANDMARKS.MIDDLE_TIP]);

  return {
    x: (indexTip.x - 0.5) * 4,      // Center and scale
    y: -(indexTip.y - 0.5) * 4,     // Invert Y
    z: (0.3 - handSize) * 10 + 2,   // Depth from hand size
    confidence: 1.0,
  };
}

/**
 * HandTracker Component
 */
export function HandTracker({
  onHandUpdate,
  onInstrumentChange,
  showVideo = true,
  showSkeleton = true,
  className = '',
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentInstrument, setCurrentInstrument] = useState(INSTRUMENTS.NONE);
  const [handPosition, setHandPosition] = useState({ x: 0, y: 0, z: 0 });
  const [isTracking, setIsTracking] = useState(false);

  // Smoothing for position (reduce jitter)
  const smoothedPosition = useRef({ x: 0, y: 0, z: 0 });
  const SMOOTHING = 0.3;

  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) return;

    // Clear and draw video frame
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showVideo && results.image) {
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setIsTracking(true);

      // Use first detected hand
      const landmarks = results.multiHandLandmarks[0];

      // Draw skeleton if enabled
      if (showSkeleton) {
        // Draw connections
        drawConnectors(ctx, landmarks, Hands.HAND_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 2,
        });

        // Draw landmarks
        drawLandmarks(ctx, landmarks, {
          color: '#FF0000',
          lineWidth: 1,
          radius: 3,
        });
      }

      // Recognize gesture → instrument
      const instrument = recognizeGesture(landmarks);
      if (instrument !== currentInstrument) {
        setCurrentInstrument(instrument);
        onInstrumentChange?.(instrument);
      }

      // Calculate 3D position
      const rawPosition = calculate3DPosition(landmarks);

      // Apply smoothing
      smoothedPosition.current = {
        x: smoothedPosition.current.x + (rawPosition.x - smoothedPosition.current.x) * SMOOTHING,
        y: smoothedPosition.current.y + (rawPosition.y - smoothedPosition.current.y) * SMOOTHING,
        z: smoothedPosition.current.z + (rawPosition.z - smoothedPosition.current.z) * SMOOTHING,
      };

      setHandPosition(smoothedPosition.current);
      onHandUpdate?.({
        position: smoothedPosition.current,
        landmarks,
        instrument,
      });
    } else {
      setIsTracking(false);
    }

    ctx.restore();
  }, [currentInstrument, onHandUpdate, onInstrumentChange, showSkeleton, showVideo]);

  // Initialize MediaPipe Hands
  useEffect(() => {
    const initHands = async () => {
      try {
        const hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(onResults);
        handsRef.current = hands;

        // Initialize camera
        if (videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (handsRef.current && videoRef.current) {
                await handsRef.current.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480,
          });

          await camera.start();
          cameraRef.current = camera;
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize hand tracking:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initHands();

    return () => {
      cameraRef.current?.stop();
      handsRef.current?.close();
    };
  }, [onResults]);

  // Set canvas size to match video
  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      canvasRef.current.width = 640;
      canvasRef.current.height = 480;
    }
  }, []);

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Hidden video element for camera input */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
      />

      {/* Canvas for rendering */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">Initializing hand tracking...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="text-center p-4">
            <p className="text-red-400 mb-2">Camera Error</p>
            <p className="text-xs text-gray-500">{error}</p>
          </div>
        </div>
      )}

      {/* Status overlay */}
      <div className="absolute top-2 left-2 flex flex-col gap-1">
        {/* Tracking status */}
        <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
          isTracking
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-gray-800/80 text-gray-400 border border-gray-700'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
          {isTracking ? 'Hand Detected' : 'No Hand'}
        </div>

        {/* Current instrument */}
        {isTracking && currentInstrument !== INSTRUMENTS.NONE && (
          <div className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
            🔧 {currentInstrument.charAt(0).toUpperCase() + currentInstrument.slice(1)}
          </div>
        )}
      </div>

      {/* Position readout */}
      {isTracking && (
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded text-xs bg-gray-800/80 text-gray-400 font-mono">
          X:{handPosition.x.toFixed(1)} Y:{handPosition.y.toFixed(1)} Z:{handPosition.z.toFixed(1)}
        </div>
      )}

      {/* Gesture guide */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-500">
        <div className="bg-gray-800/80 rounded p-2 space-y-1">
          <div>👌 Pinch → Curette</div>
          <div>👆 Point → Suction</div>
          <div>✋ Palm → Endoscope</div>
          <div>🤏 2-Finger → Forceps</div>
        </div>
      </div>
    </div>
  );
}

export default HandTracker;
