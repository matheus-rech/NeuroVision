import React, { useState, useEffect, useRef } from 'react';

// Neurosurgical detection data organized by scenario
const SCENARIOS = {
  brain_ct: {
    title: "Brain CT Analysis",
    icon: "🧠",
    description: "Identify anatomical structures, hemorrhage, ventricles, and mass effect",
    detections: [
      { box_2d: [120, 80, 450, 380], label: "Left cerebral hemisphere", category: "anatomy", confidence: 0.95 },
      { box_2d: [120, 620, 450, 920], label: "Right cerebral hemisphere", category: "anatomy", confidence: 0.95 },
      { box_2d: [200, 420, 380, 580], label: "Third ventricle", category: "csf", confidence: 0.88 },
      { box_2d: [180, 200, 320, 350], label: "Left lateral ventricle", category: "csf", confidence: 0.91 },
      { box_2d: [180, 650, 320, 800], label: "Right lateral ventricle", category: "csf", confidence: 0.91 },
      { box_2d: [350, 150, 550, 400], label: "Left temporal lobe", category: "anatomy", confidence: 0.89 },
      { box_2d: [280, 380, 420, 620], label: "Basal ganglia region", category: "deep_structure", confidence: 0.85 }
    ],
    metrics: { midline_shift: "0mm", ventricle_ratio: "0.28", herniation: "None" }
  },
  mri_tumor: {
    title: "MRI T1+Gd Tumor",
    icon: "🎯",
    description: "Enhancing tumor with edema, mass effect, and surgical planning zones",
    detections: [
      { box_2d: [280, 320, 420, 480], label: "Enhancing tumor (GBM)", category: "pathology", confidence: 0.92, alert: "PRIMARY TARGET" },
      { box_2d: [250, 280, 450, 520], label: "Perilesional edema", category: "edema", confidence: 0.88 },
      { box_2d: [320, 380, 380, 440], label: "Necrotic center", category: "pathology", confidence: 0.85 },
      { box_2d: [200, 420, 380, 580], label: "Third ventricle (compressed)", category: "csf", confidence: 0.90 },
      { box_2d: [180, 720, 350, 850], label: "Right lateral ventricle (dilated)", category: "csf", confidence: 0.91 },
      { box_2d: [450, 380, 520, 620], label: "Cerebellum", category: "anatomy", confidence: 0.94 }
    ],
    metrics: { volume: "12.5cc", midline_shift: "4.2mm", diagnosis: "High-grade glioma" }
  },
  intraop_usg: {
    title: "Intraop Ultrasound",
    icon: "📡",
    description: "Real-time tumor localization and resection margin assessment",
    detections: [
      { box_2d: [300, 350, 480, 550], label: "Hyperechoic tumor mass", category: "pathology", confidence: 0.89 },
      { box_2d: [280, 300, 500, 600], label: "Tumor-brain interface", category: "landmark", confidence: 0.82, alert: "RESECTION BOUNDARY" },
      { box_2d: [200, 200, 280, 320], label: "Normal cortex (isoechoic)", category: "anatomy", confidence: 0.91 },
      { box_2d: [180, 600, 300, 750], label: "Sulcal CSF (anechoic)", category: "csf", confidence: 0.87 },
      { box_2d: [420, 280, 520, 380], label: "Resection cavity edge", category: "landmark", confidence: 0.85 },
      { box_2d: [350, 150, 450, 250], label: "Residual tumor (posterior)", category: "pathology", confidence: 0.78, alert: "NEAR ELOQUENT CORTEX" }
    ],
    metrics: { resection: "Subtotal", residual: "Posterior margin", guidance: "Anterior-lateral safe" }
  },
  instruments: {
    title: "Surgical Instruments",
    icon: "🔧",
    description: "Identification of neurosurgical instruments and their applications",
    detections: [
      { box_2d: [100, 50, 180, 350], label: "Penfield #1", category: "dissector", confidence: 0.93 },
      { box_2d: [200, 100, 280, 500], label: "Bipolar forceps (bayonet)", category: "hemostasis", confidence: 0.96 },
      { box_2d: [300, 50, 400, 300], label: "Kerrison rongeur 2mm", category: "bone", confidence: 0.91 },
      { box_2d: [420, 100, 520, 450], label: "Midas Rex drill", category: "power", confidence: 0.95 },
      { box_2d: [550, 450, 650, 750], label: "Dural scissors (curved)", category: "cutting", confidence: 0.92 },
      { box_2d: [680, 100, 780, 500], label: "Yasargil clip applier", category: "vascular", confidence: 0.89 },
      { box_2d: [800, 100, 900, 400], label: "CUSA handpiece", category: "resection", confidence: 0.94 },
      { box_2d: [680, 550, 780, 850], label: "Greenberg retractor", category: "retractor", confidence: 0.93 }
    ],
    metrics: { set: "Craniotomy", count: "15 instruments", status: "Complete" }
  },
  contamination: {
    title: "Contamination Detection",
    icon: "⚠️",
    description: "Sterile field breach identification and risk assessment",
    detections: [
      { box_2d: [150, 200, 250, 350], label: "Sleeve touching drape", category: "breach", confidence: 0.88, alert: "HIGH - Re-drape area", severity: "high" },
      { box_2d: [400, 50, 500, 150], label: "Uncovered hair", category: "risk", confidence: 0.82, alert: "MODERATE - Adjust cap", severity: "moderate" },
      { box_2d: [600, 600, 750, 800], label: "Dropped instrument", category: "contaminated", confidence: 0.95, alert: "HIGH - Replace from backup", severity: "high" },
      { box_2d: [350, 400, 450, 550], label: "Hand over sterile field", category: "breach", confidence: 0.91, alert: "MODERATE - Verbal reminder", severity: "moderate" },
      { box_2d: [50, 400, 120, 550], label: "Door opening", category: "environmental", confidence: 0.77, alert: "LOW - Minimize traffic", severity: "low" }
    ],
    metrics: { total_risks: "5", high_severity: "2", action_required: "Immediate" }
  },
  transsphenoidal: {
    title: "Transsphenoidal Surgery",
    icon: "👃",
    description: "Endoscopic endonasal anatomy and critical structure identification",
    detections: [
      { box_2d: [400, 350, 600, 650], label: "Sphenoid sinus ostium", category: "landmark", confidence: 0.94 },
      { box_2d: [300, 400, 450, 600], label: "Superior turbinate", category: "anatomy", confidence: 0.91 },
      { box_2d: [350, 200, 650, 350], label: "Sphenoid rostrum", category: "bone", confidence: 0.87 },
      { box_2d: [400, 400, 600, 600], label: "Pituitary adenoma", category: "pathology", confidence: 0.92, alert: "TARGET" },
      { box_2d: [280, 350, 340, 500], label: "Left ICA (cavernous)", category: "critical", confidence: 0.91, alert: "CRITICAL - NO RESECTION" },
      { box_2d: [660, 350, 720, 500], label: "Right ICA (cavernous)", category: "critical", confidence: 0.90, alert: "CRITICAL - NO RESECTION" },
      { box_2d: [380, 300, 620, 450], label: "Optic nerve region", category: "neural", confidence: 0.88, alert: "CAUTION" }
    ],
    metrics: { safe_zone: "Medial corridor", resection_limit: "Cavernous sinus", nav_accuracy: "1.2mm" }
  },
  video_frame: {
    title: "Surgical Video Analysis",
    icon: "🎥",
    description: "Real-time frame analysis with instrument tracking and action recognition",
    detections: [
      { box_2d: [350, 300, 650, 700], label: "Tumor (being resected)", category: "pathology", confidence: 0.91 },
      { box_2d: [300, 200, 450, 380], label: "Normal cortex", category: "anatomy", confidence: 0.89 },
      { box_2d: [500, 150, 700, 350], label: "Cottonoid patty", category: "instrument", confidence: 0.93 },
      { box_2d: [400, 600, 550, 750], label: "Bipolar (active)", category: "instrument", confidence: 0.95, alert: "COAGULATING" },
      { box_2d: [250, 500, 380, 680], label: "CUSA (active)", category: "instrument", confidence: 0.92, alert: "ASPIRATING" },
      { box_2d: [420, 280, 480, 350], label: "Cortical vein", category: "vessel", confidence: 0.85, alert: "PRESERVE" },
      { box_2d: [680, 250, 780, 400], label: "Motor strip edge", category: "eloquent", confidence: 0.76, alert: "ELOQUENT CORTEX" }
    ],
    metrics: { phase: "Tumor resection", completion: "75%", time_remaining: "15-20 min" }
  }
};

const CATEGORY_COLORS = {
  anatomy: '#64C864',
  pathology: '#FF5050',
  csf: '#0096FF',
  edema: '#6496FF',
  bone: '#D2B48C',
  deep_structure: '#9370DB',
  landmark: '#00CED1',
  dissector: '#C0C0C0',
  hemostasis: '#FFD700',
  power: '#4169E1',
  cutting: '#C0C0C0',
  vascular: '#DC143C',
  resection: '#9400D3',
  retractor: '#708090',
  breach: '#FF0000',
  risk: '#FFA500',
  contaminated: '#8B0000',
  environmental: '#FFD700',
  critical: '#FF0000',
  neural: '#FFD700',
  instrument: '#FFA500',
  vessel: '#DC143C',
  eloquent: '#FF69B4'
};

function DetectionOverlay({ detections, width, height, hoveredIdx, setHoveredIdx, showAlerts }) {
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {detections.map((det, idx) => {
        const [y1, x1, y2, x2] = det.box_2d;
        const rx1 = (x1 / 1000) * width;
        const ry1 = (y1 / 1000) * height;
        const rx2 = (x2 / 1000) * width;
        const ry2 = (y2 / 1000) * height;
        const color = CATEGORY_COLORS[det.category] || '#FFFFFF';
        const isHovered = hoveredIdx === idx;
        const hasAlert = det.alert;
        
        return (
          <g key={idx} style={{ pointerEvents: 'all' }}>
            <rect
              x={rx1} y={ry1} width={rx2 - rx1} height={ry2 - ry1}
              fill={isHovered ? `${color}44` : 'transparent'}
              stroke={color}
              strokeWidth={hasAlert ? 3 : 2}
              strokeDasharray={hasAlert ? "5,3" : "none"}
              rx={4}
              filter={hasAlert ? "url(#glow)" : "none"}
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
            {isHovered && (
              <>
                <rect x={rx1} y={ry1 - 22} width={det.label.length * 7 + 16} height={20} fill={color} rx={4} />
                <text x={rx1 + 8} y={ry1 - 7} fill="white" fontSize="11" fontWeight="600" fontFamily="system-ui">{det.label}</text>
              </>
            )}
            {showAlerts && hasAlert && (
              <>
                <rect x={rx1} y={ry2 + 4} width={det.alert.length * 6 + 20} height={18} fill="#FF0000" rx={3} />
                <text x={rx1 + 4} y={ry2 + 16} fill="white" fontSize="10" fontFamily="system-ui">⚠ {det.alert}</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function MetricsPanel({ metrics }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 16 }}>
      {Object.entries(metrics).map(([key, value]) => (
        <div key={key} style={{ background: 'rgba(0,212,255,0.1)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,212,255,0.2)' }}>
          <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#00d4ff' }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function DetectionList({ detections, hoveredIdx, setHoveredIdx }) {
  return (
    <div style={{ maxHeight: 350, overflowY: 'auto', paddingRight: 8 }}>
      {detections.map((det, idx) => {
        const color = CATEGORY_COLORS[det.category] || '#888';
        const isHovered = hoveredIdx === idx;
        return (
          <div
            key={idx}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              padding: '10px 12px',
              marginBottom: 6,
              borderRadius: 8,
              background: isHovered ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.03)',
              borderLeft: `4px solid ${color}`,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{det.label}</span>
              <span style={{ fontSize: '0.75rem', color: '#888' }}>{Math.round(det.confidence * 100)}%</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 4 }}>
              <span style={{ background: color + '33', color: color, padding: '2px 6px', borderRadius: 4 }}>{det.category}</span>
            </div>
            {det.alert && (
              <div style={{ fontSize: '0.75rem', color: '#FF6B6B', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>⚠</span> {det.alert}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function NeurosurgicalSpatialDemo() {
  const [activeScenario, setActiveScenario] = useState('brain_ct');
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);
  
  const scenario = SCENARIOS[activeScenario];
  const imgSize = 500;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a12 0%, #1a1a2e 50%, #0f1729 100%)',
      color: '#e0e0e0',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: '16px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,212,255,0.3); border-radius: 3px; }
      `}</style>
      
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            background: 'linear-gradient(90deg, #00d4ff, #7c3aed, #ff6b6b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            🧠 Claude Neurosurgical Spatial Understanding
          </h1>
          <p style={{ color: '#666', fontSize: '0.9rem', marginTop: 8 }}>
            AI-powered detection for neuroimaging, surgical instruments, OR safety, and intraoperative guidance
          </p>
        </div>
        
        {/* Scenario Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
          {Object.entries(SCENARIOS).map(([key, s]) => (
            <button
              key={key}
              onClick={() => { setActiveScenario(key); setHoveredIdx(null); }}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: activeScenario === key ? '2px solid #00d4ff' : '1px solid rgba(255,255,255,0.1)',
                background: activeScenario === key ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.03)',
                color: activeScenario === key ? '#00d4ff' : '#888',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>{s.icon}</span>
              <span style={{ display: window.innerWidth < 600 ? 'none' : 'inline' }}>{s.title}</span>
            </button>
          ))}
        </div>
        
        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* Image Panel */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 16,
            padding: 16,
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#00d4ff' }}>
                {scenario.icon} {scenario.title}
              </h2>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showBoxes} onChange={e => setShowBoxes(e.target.checked)} />
                  Boxes
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showAlerts} onChange={e => setShowAlerts(e.target.checked)} />
                  Alerts
                </label>
              </div>
            </div>
            <p style={{ color: '#888', fontSize: '0.8rem', margin: '0 0 12px' }}>{scenario.description}</p>
            
            {/* Image with detections */}
            <div style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '75%',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#000'
            }}>
              {/* Simulated medical image background */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: activeScenario.includes('ct') || activeScenario.includes('mri') || activeScenario.includes('usg')
                  ? 'radial-gradient(ellipse at center, #333 0%, #111 50%, #000 100%)'
                  : activeScenario === 'contamination'
                  ? 'linear-gradient(135deg, #1a3a2a 0%, #0a1a10 100%)'
                  : 'linear-gradient(135deg, #1a2a3a 0%, #0a1020 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* Simulated scan effect */}
                <div style={{
                  position: 'absolute',
                  width: '100%',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent)',
                  animation: 'scan 3s linear infinite',
                  opacity: 0.5
                }} />
                
                {/* Placeholder text */}
                <div style={{ textAlign: 'center', color: '#444', fontSize: '0.9rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 8 }}>{scenario.icon}</div>
                  <div>Medical Image Visualization</div>
                  <div style={{ fontSize: '0.75rem', marginTop: 4 }}>({scenario.detections.length} detections)</div>
                </div>
              </div>
              
              {showBoxes && (
                <DetectionOverlay
                  detections={scenario.detections}
                  width={1000}
                  height={750}
                  hoveredIdx={hoveredIdx}
                  setHoveredIdx={setHoveredIdx}
                  showAlerts={showAlerts}
                />
              )}
            </div>
            
            {/* Metrics */}
            <MetricsPanel metrics={scenario.metrics} />
          </div>
          
          {/* Detection Panel */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 16,
            padding: 16,
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#00d4ff' }}>
              📋 Detections ({scenario.detections.length})
            </h3>
            <DetectionList
              detections={scenario.detections}
              hoveredIdx={hoveredIdx}
              setHoveredIdx={setHoveredIdx}
            />
          </div>
        </div>
        
        {/* Capabilities Summary */}
        <div style={{
          marginTop: 24,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 16,
          padding: 20,
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <h3 style={{ margin: '0 0 16px', textAlign: 'center', color: '#00d4ff' }}>
            ✅ Neurosurgical Spatial Understanding Capabilities
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { icon: '🧠', title: 'Neuroimaging', items: ['CT/MRI/USG', 'Tumor detection', 'Ventricle analysis'] },
              { icon: '🔧', title: 'Instruments', items: ['15+ tool types', 'State detection', 'Usage tracking'] },
              { icon: '⚠️', title: 'Safety', items: ['Breach detection', 'Risk scoring', 'Action alerts'] },
              { icon: '👃', title: 'Transsphenoidal', items: ['ICA proximity', 'Safe corridors', 'Navigation'] },
              { icon: '🎥', title: 'Video Analysis', items: ['Phase detection', 'Action recognition', 'Vessel tracking'] },
              { icon: '📊', title: 'Output Formats', items: ['2D/3D boxes', 'Confidence scores', 'Clinical metadata'] }
            ].map((cap, idx) => (
              <div key={idx} style={{
                padding: 12,
                borderRadius: 10,
                background: 'rgba(0,212,255,0.05)',
                border: '1px solid rgba(0,212,255,0.15)'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{cap.icon}</div>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.9rem' }}>{cap.title}</div>
                {cap.items.map((item, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', color: '#888' }}>• {item}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 20, color: '#444', fontSize: '0.75rem' }}>
          Claude Neurosurgical Spatial Understanding Demo | For Dr. Matheus Machado Rech
        </div>
      </div>
    </div>
  );
}
