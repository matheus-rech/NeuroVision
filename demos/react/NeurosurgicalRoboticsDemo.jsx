import React, { useState, useEffect, useRef } from 'react';

// Neurosurgical Robotics AI Demo - Inspired by Gemini Robotics-ER
// Capabilities: Spatial Understanding, Trajectory Planning, Task Orchestration, Robot Control

const PROCEDURES = {
  biopsy: {
    name: "Stereotactic Biopsy",
    icon: "🎯",
    description: "Precision tissue sampling from deep brain lesion",
    trajectory: {
      entry: { x: 250, y: 150 },
      target: { x: 500, y: 600 },
      waypoints: Array.from({length: 10}, (_, i) => ({
        x: 250 + (500-250) * (i+1)/11,
        y: 150 + (600-150) * (i+1)/11,
        label: i === 9 ? "TARGET" : `WP${i+1}`
      }))
    },
    criticalStructures: [
      { x: 350, y: 350, r: 40, name: "Lateral Ventricle", severity: "warning", color: "#3B82F6" },
      { x: 450, y: 450, r: 30, name: "Caudate Nucleus", severity: "caution", color: "#F59E0B" }
    ],
    subtasks: [
      { step: 1, action: "check_registration", desc: "Verify navigation accuracy", status: "pending" },
      { step: 2, action: "move_to_entry", desc: "Position robot at entry point", status: "pending" },
      { step: 3, action: "set_instrument", desc: "Attach biopsy needle", status: "pending" },
      { step: 4, action: "safety_check", desc: "Verify trajectory clearance", status: "pending" },
      { step: 5, action: "advance_trajectory", desc: "Advance along planned path", status: "pending" },
      { step: 6, action: "confirm_position", desc: "Confirm target reached", status: "pending" },
      { step: 7, action: "obtain_sample", desc: "Obtain tissue sample", status: "pending" },
      { step: 8, action: "retract", desc: "Retract needle safely", status: "pending" },
      { step: 9, action: "return_home", desc: "Return to safe position", status: "pending" }
    ]
  },
  dbs: {
    name: "DBS Lead Placement",
    icon: "⚡",
    description: "Deep Brain Stimulation for movement disorders",
    trajectory: {
      entry: { x: 300, y: 100 },
      target: { x: 480, y: 650 },
      waypoints: Array.from({length: 12}, (_, i) => ({
        x: 300 + (480-300) * (i+1)/13,
        y: 100 + (650-100) * (i+1)/13,
        label: i === 11 ? "STN" : `MER${i+1}`
      }))
    },
    criticalStructures: [
      { x: 400, y: 400, r: 35, name: "Internal Capsule", severity: "critical", color: "#EF4444" },
      { x: 550, y: 500, r: 25, name: "Red Nucleus", severity: "warning", color: "#F59E0B" }
    ],
    subtasks: [
      { step: 1, action: "verify_trajectory", desc: "Confirm planned trajectory", status: "pending" },
      { step: 2, action: "insert_guide", desc: "Insert guide tube to 10mm above target", status: "pending" },
      { step: 3, action: "mer_recording", desc: "Microelectrode recording (5 tracks)", status: "pending" },
      { step: 4, action: "analyze_mer", desc: "Analyze neuronal activity patterns", status: "pending" },
      { step: 5, action: "select_track", desc: "Select optimal lead position", status: "pending" },
      { step: 6, action: "advance_lead", desc: "Advance DBS lead to target", status: "pending" },
      { step: 7, action: "confirm_position", desc: "Verify lead position (fluoroscopy)", status: "pending" },
      { step: 8, action: "test_stim", desc: "Intraoperative test stimulation", status: "pending" },
      { step: 9, action: "secure_lead", desc: "Fix lead in position", status: "pending" }
    ]
  },
  transsphenoidal: {
    name: "Transsphenoidal Surgery",
    icon: "👃",
    description: "Endoscopic pituitary tumor resection",
    trajectory: {
      entry: { x: 500, y: 100 },
      target: { x: 500, y: 550 },
      waypoints: Array.from({length: 8}, (_, i) => ({
        x: 500,
        y: 100 + (550-100) * (i+1)/9,
        label: i === 7 ? "SELLA" : `NAV${i+1}`
      }))
    },
    criticalStructures: [
      { x: 300, y: 450, r: 45, name: "Left ICA", severity: "critical", color: "#EF4444" },
      { x: 700, y: 450, r: 45, name: "Right ICA", severity: "critical", color: "#EF4444" },
      { x: 500, y: 250, r: 35, name: "Optic Chiasm", severity: "critical", color: "#EF4444" }
    ],
    subtasks: [
      { step: 1, action: "nasal_entry", desc: "Establish nasal corridor", status: "pending" },
      { step: 2, action: "identify_landmarks", desc: "Identify sphenoid ostium", status: "pending" },
      { step: 3, action: "open_sphenoid", desc: "Open sphenoid sinus", status: "pending" },
      { step: 4, action: "identify_sella", desc: "Identify sellar floor", status: "pending" },
      { step: 5, action: "ica_check", desc: "Confirm ICA positions (Doppler)", status: "pending" },
      { step: 6, action: "open_sella", desc: "Open sellar floor", status: "pending" },
      { step: 7, action: "tumor_resection", desc: "Resect pituitary tumor", status: "pending" },
      { step: 8, action: "hemostasis", desc: "Achieve hemostasis", status: "pending" },
      { step: 9, action: "reconstruction", desc: "Sellar floor reconstruction", status: "pending" }
    ]
  }
};

const INSTRUMENTS = [
  { id: 1, name: "Biopsy Needle", type: "biopsy", icon: "💉", x: 50, y: 100 },
  { id: 2, name: "Bipolar Forceps", type: "hemostasis", icon: "⚡", x: 50, y: 180 },
  { id: 3, name: "CUSA", type: "resection", icon: "🔊", x: 50, y: 260 },
  { id: 4, name: "Suction", type: "aspiration", icon: "💨", x: 50, y: 340 },
  { id: 5, name: "DBS Lead", type: "implant", icon: "🔌", x: 50, y: 420 }
];

function TrajectoryVisualization({ procedure, currentStep, robotPosition }) {
  const { trajectory, criticalStructures } = procedure;
  const canvasSize = 700;
  
  return (
    <svg width="100%" viewBox={`0 0 ${canvasSize} ${canvasSize}`} style={{ background: 'radial-gradient(circle, #1a1a2e 0%, #0a0a12 100%)', borderRadius: 12 }}>
      {/* Grid */}
      <defs>
        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
        </pattern>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="trajectoryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22C55E"/>
          <stop offset="100%" stopColor="#3B82F6"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)"/>
      
      {/* Critical Structures */}
      {criticalStructures.map((struct, idx) => (
        <g key={idx}>
          <circle 
            cx={struct.x} cy={struct.y} r={struct.r + 10}
            fill="none" stroke={struct.color} strokeWidth="2" strokeDasharray="5,5"
            opacity="0.5"
          />
          <circle 
            cx={struct.x} cy={struct.y} r={struct.r}
            fill={struct.color} opacity="0.3"
          />
          <text x={struct.x} y={struct.y + struct.r + 20} textAnchor="middle" fill={struct.color} fontSize="11" fontWeight="600">
            {struct.name}
          </text>
          <text x={struct.x} y={struct.y + struct.r + 35} textAnchor="middle" fill={struct.color} fontSize="9" opacity="0.8">
            ⚠ {struct.severity.toUpperCase()}
          </text>
        </g>
      ))}
      
      {/* Trajectory Line */}
      <line 
        x1={trajectory.entry.x} y1={trajectory.entry.y}
        x2={trajectory.target.x} y2={trajectory.target.y}
        stroke="url(#trajectoryGrad)" strokeWidth="3" strokeDasharray="10,5"
        filter="url(#glow)"
      />
      
      {/* Entry Point */}
      <circle cx={trajectory.entry.x} cy={trajectory.entry.y} r="12" fill="#22C55E" filter="url(#glow)"/>
      <text x={trajectory.entry.x} y={trajectory.entry.y - 20} textAnchor="middle" fill="#22C55E" fontSize="12" fontWeight="600">ENTRY</text>
      
      {/* Target Point */}
      <circle cx={trajectory.target.x} cy={trajectory.target.y} r="12" fill="#3B82F6" filter="url(#glow)"/>
      <text x={trajectory.target.x} y={trajectory.target.y + 30} textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="600">TARGET</text>
      
      {/* Waypoints */}
      {trajectory.waypoints.map((wp, idx) => {
        const isReached = idx < currentStep - 3;
        const isCurrent = idx === currentStep - 4;
        return (
          <g key={idx}>
            <circle 
              cx={wp.x} cy={wp.y} r={isCurrent ? 8 : 5}
              fill={isReached ? "#22C55E" : isCurrent ? "#F59E0B" : "#6B7280"}
              filter={isCurrent ? "url(#glow)" : "none"}
            />
            {(isCurrent || idx === trajectory.waypoints.length - 1) && (
              <text x={wp.x + 15} y={wp.y + 4} fill="#fff" fontSize="10">{wp.label}</text>
            )}
          </g>
        );
      })}
      
      {/* Robot Position */}
      {robotPosition && (
        <g transform={`translate(${robotPosition.x}, ${robotPosition.y})`}>
          <circle r="15" fill="#8B5CF6" filter="url(#glow)"/>
          <circle r="8" fill="#fff"/>
          <text y={-25} textAnchor="middle" fill="#8B5CF6" fontSize="11" fontWeight="600">ROBOT</text>
        </g>
      )}
      
      {/* Legend */}
      <g transform="translate(550, 30)">
        <rect x="-10" y="-10" width="150" height="120" fill="rgba(0,0,0,0.5)" rx="8"/>
        <text y="10" fill="#fff" fontSize="11" fontWeight="600">Legend</text>
        <circle cx="10" cy="35" r="6" fill="#22C55E"/><text x="25" y="39" fill="#888" fontSize="10">Entry Point</text>
        <circle cx="10" cy="55" r="6" fill="#3B82F6"/><text x="25" y="59" fill="#888" fontSize="10">Target</text>
        <circle cx="10" cy="75" r="6" fill="#EF4444"/><text x="25" y="79" fill="#888" fontSize="10">Critical Structure</text>
        <circle cx="10" cy="95" r="6" fill="#8B5CF6"/><text x="25" y="99" fill="#888" fontSize="10">Robot Position</text>
      </g>
    </svg>
  );
}

function TaskOrchestration({ subtasks, currentStep, onStepClick }) {
  return (
    <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
      {subtasks.map((task, idx) => {
        const isComplete = idx < currentStep;
        const isCurrent = idx === currentStep;
        const statusColor = isComplete ? '#22C55E' : isCurrent ? '#F59E0B' : '#6B7280';
        
        return (
          <div
            key={idx}
            onClick={() => onStepClick(idx)}
            style={{
              padding: '12px 16px',
              marginBottom: 8,
              borderRadius: 8,
              background: isCurrent ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)',
              borderLeft: `4px solid ${statusColor}`,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', background: statusColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 600, color: '#fff'
                }}>
                  {isComplete ? '✓' : task.step}
                </span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{task.desc}</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#888', fontFamily: 'monospace' }}>{task.action}</span>
            </div>
            {isCurrent && (
              <div style={{ marginTop: 8, paddingLeft: 36, fontSize: '0.8rem', color: '#F59E0B' }}>
                ▶ Executing...
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InstrumentPanel({ instruments, selectedInstrument, onSelect, onPickPlace }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {instruments.map(inst => (
        <div
          key={inst.id}
          onClick={() => onSelect(inst)}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: selectedInstrument?.id === inst.id ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)',
            border: selectedInstrument?.id === inst.id ? '2px solid #8B5CF6' : '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '1.5rem' }}>{inst.icon}</div>
          <div style={{ fontSize: '0.75rem', marginTop: 4 }}>{inst.name}</div>
        </div>
      ))}
      {selectedInstrument && (
        <button
          onClick={onPickPlace}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
            border: 'none',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          🤖 Pick & Place
        </button>
      )}
    </div>
  );
}

function RobotStatus({ status }) {
  return (
    <div style={{
      padding: 16,
      borderRadius: 12,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
      <h4 style={{ margin: '0 0 12px', color: '#8B5CF6' }}>🤖 Robot Status</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ background: 'rgba(34,197,94,0.1)', padding: 8, borderRadius: 6 }}>
          <div style={{ fontSize: '0.7rem', color: '#888' }}>Position</div>
          <div style={{ fontSize: '0.85rem', color: '#22C55E' }}>
            ({status.position.x.toFixed(1)}, {status.position.y.toFixed(1)}, {status.position.z.toFixed(1)})
          </div>
        </div>
        <div style={{ background: 'rgba(59,130,246,0.1)', padding: 8, borderRadius: 6 }}>
          <div style={{ fontSize: '0.7rem', color: '#888' }}>State</div>
          <div style={{ fontSize: '0.85rem', color: '#3B82F6' }}>{status.state}</div>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.1)', padding: 8, borderRadius: 6 }}>
          <div style={{ fontSize: '0.7rem', color: '#888' }}>Instrument</div>
          <div style={{ fontSize: '0.85rem', color: '#F59E0B' }}>{status.instrument || 'None'}</div>
        </div>
        <div style={{ background: status.safetyOK ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', padding: 8, borderRadius: 6 }}>
          <div style={{ fontSize: '0.7rem', color: '#888' }}>Safety</div>
          <div style={{ fontSize: '0.85rem', color: status.safetyOK ? '#22C55E' : '#EF4444' }}>
            {status.safetyOK ? '✅ Clear' : '⚠️ Warning'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NeurosurgicalRoboticsDemo() {
  const [selectedProcedure, setSelectedProcedure] = useState('biopsy');
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [robotStatus, setRobotStatus] = useState({
    position: { x: 0, y: 0, z: 100 },
    state: 'IDLE',
    instrument: null,
    safetyOK: true
  });
  const [robotPosition, setRobotPosition] = useState(null);
  
  const procedure = PROCEDURES[selectedProcedure];
  
  useEffect(() => {
    if (isRunning && currentStep < procedure.subtasks.length) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        
        // Update robot position along trajectory
        if (currentStep >= 3 && currentStep < procedure.subtasks.length - 2) {
          const wpIdx = Math.min(currentStep - 3, procedure.trajectory.waypoints.length - 1);
          const wp = procedure.trajectory.waypoints[wpIdx];
          setRobotPosition({ x: wp.x, y: wp.y });
          setRobotStatus(prev => ({
            ...prev,
            position: { x: wp.x, y: wp.y, z: 50 - (wpIdx * 5) },
            state: 'MOVING'
          }));
        }
      }, 1500);
      return () => clearTimeout(timer);
    } else if (currentStep >= procedure.subtasks.length) {
      setIsRunning(false);
      setRobotStatus(prev => ({ ...prev, state: 'COMPLETE' }));
    }
  }, [isRunning, currentStep, procedure]);
  
  const handleStart = () => {
    setCurrentStep(0);
    setRobotPosition(procedure.trajectory.entry);
    setRobotStatus(prev => ({
      ...prev,
      position: { ...procedure.trajectory.entry, z: 100 },
      state: 'RUNNING',
      instrument: procedure.name.includes('Biopsy') ? 'Biopsy Needle' : 'DBS Lead'
    }));
    setIsRunning(true);
  };
  
  const handleStop = () => {
    setIsRunning(false);
    setRobotStatus(prev => ({ ...prev, state: 'STOPPED' }));
  };
  
  const handleEmergencyStop = () => {
    setIsRunning(false);
    setRobotStatus(prev => ({ ...prev, state: 'E-STOP', safetyOK: false }));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a12 0%, #1a1a2e 50%, #0f1729 100%)',
      color: '#e0e0e0',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: 16
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
      
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h1 style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            background: 'linear-gradient(90deg, #8B5CF6, #3B82F6, #22C55E)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            🤖 Claude Neurosurgical Robotics AI
          </h1>
          <p style={{ color: '#666', fontSize: '0.85rem', marginTop: 8 }}>
            Spatial Understanding | Trajectory Planning | Task Orchestration | Robot Control
          </p>
        </div>
        
        {/* Procedure Selection */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
          {Object.entries(PROCEDURES).map(([key, proc]) => (
            <button
              key={key}
              onClick={() => { setSelectedProcedure(key); setCurrentStep(0); setIsRunning(false); setRobotPosition(null); }}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: selectedProcedure === key ? '2px solid #8B5CF6' : '1px solid rgba(255,255,255,0.1)',
                background: selectedProcedure === key ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                color: selectedProcedure === key ? '#8B5CF6' : '#888',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {proc.icon} {proc.name}
            </button>
          ))}
        </div>
        
        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
          {/* Left: Visualization */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 16,
            padding: 16,
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#8B5CF6' }}>
                {procedure.icon} {procedure.name}
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleStart}
                  disabled={isRunning}
                  style={{
                    padding: '8px 16px', borderRadius: 6, border: 'none',
                    background: isRunning ? '#4B5563' : 'linear-gradient(135deg, #22C55E, #16A34A)',
                    color: '#fff', fontWeight: 600, cursor: isRunning ? 'not-allowed' : 'pointer'
                  }}
                >
                  ▶ Execute
                </button>
                <button
                  onClick={handleStop}
                  style={{
                    padding: '8px 16px', borderRadius: 6, border: 'none',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#fff', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  ⏸ Pause
                </button>
                <button
                  onClick={handleEmergencyStop}
                  style={{
                    padding: '8px 16px', borderRadius: 6, border: 'none',
                    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                    color: '#fff', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  ⚠ E-STOP
                </button>
              </div>
            </div>
            <p style={{ color: '#888', fontSize: '0.8rem', margin: '0 0 12px' }}>{procedure.description}</p>
            
            <TrajectoryVisualization 
              procedure={procedure}
              currentStep={currentStep}
              robotPosition={robotPosition}
            />
          </div>
          
          {/* Right: Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Robot Status */}
            <RobotStatus status={robotStatus} />
            
            {/* Task Orchestration */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 12,
              padding: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              flex: 1
            }}>
              <h4 style={{ margin: '0 0 12px', color: '#3B82F6' }}>📋 Task Orchestration</h4>
              <TaskOrchestration 
                subtasks={procedure.subtasks}
                currentStep={currentStep}
                onStepClick={setCurrentStep}
              />
            </div>
            
            {/* Instruments */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 12,
              padding: 16,
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <h4 style={{ margin: '0 0 12px', color: '#F59E0B' }}>🔧 Instruments</h4>
              <InstrumentPanel
                instruments={INSTRUMENTS}
                selectedInstrument={selectedInstrument}
                onSelect={setSelectedInstrument}
                onPickPlace={() => console.log('Pick and place:', selectedInstrument)}
              />
            </div>
          </div>
        </div>
        
        {/* Capabilities Footer */}
        <div style={{
          marginTop: 20,
          padding: 16,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, textAlign: 'center' }}>
            {[
              { icon: '🎯', title: 'Spatial Understanding', desc: 'Object detection, bounding boxes' },
              { icon: '🛤️', title: 'Trajectory Planning', desc: 'Safe surgical corridors' },
              { icon: '⚠️', title: 'Critical Avoidance', desc: 'Vessels, nerves, eloquent cortex' },
              { icon: '📋', title: 'Task Orchestration', desc: 'Natural language commands' },
              { icon: '🔧', title: 'Instrument Control', desc: 'Pick-and-place operations' },
              { icon: '🛡️', title: 'Safety Monitoring', desc: 'Real-time violation detection' }
            ].map((cap, idx) => (
              <div key={idx} style={{ padding: 12 }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{cap.icon}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>{cap.title}</div>
                <div style={{ fontSize: '0.7rem', color: '#666' }}>{cap.desc}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: 16, color: '#444', fontSize: '0.75rem' }}>
          Claude Neurosurgical Robotics AI | Inspired by Gemini Robotics-ER | For Dr. Matheus Machado Rech
        </div>
      </div>
    </div>
  );
}
