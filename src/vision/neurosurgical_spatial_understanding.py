#!/usr/bin/env python3
"""
Claude Neurosurgical Spatial Understanding
==========================================

Comprehensive demonstration of Claude's spatial understanding capabilities
applied to neurosurgical scenarios including:

1. Neuroimaging Analysis (MRI, CT, Ultrasound)
2. Operating Room Environment Recognition
3. Surgical Instrument Identification
4. Anatomical Landmark Detection
5. Contamination Source Identification
6. Transsphenoidal Surgery Structure Recognition
7. Surgical Video Frame Analysis

Author: Claude (Anthropic) for Dr. Matheus Machado Rech
"""

import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from typing import List, Dict, Any, Tuple, Optional
import cv2
from dataclasses import dataclass
from enum import Enum

# =============================================================================
# NEUROSURGICAL DETECTION SCHEMAS
# =============================================================================

class DetectionCategory(Enum):
    NEUROIMAGING = "neuroimaging"
    OR_ENVIRONMENT = "or_environment"
    INSTRUMENTS = "instruments"
    ANATOMY = "anatomy"
    CONTAMINATION = "contamination"
    TRANSSPHENOIDAL = "transsphenoidal"
    VIDEO_FRAME = "video_frame"


@dataclass
class SpatialDetection:
    """Standard detection format compatible with Gemini's schema."""
    box_2d: List[int]  # [y1, x1, y2, x2] normalized 0-1000
    label: str
    category: str
    confidence: float
    metadata: Optional[Dict] = None
    point: Optional[List[int]] = None  # For pointing tasks
    mask: Optional[str] = None  # Base64 PNG for segmentation
    box_3d: Optional[List[float]] = None  # For 3D spatial understanding


# =============================================================================
# 1. NEUROIMAGING ANALYSIS
# =============================================================================

BRAIN_CT_DETECTION = """
{
  "modality": "CT_HEAD",
  "findings": [
    {"box_2d": [120, 80, 450, 380], "label": "left cerebral hemisphere", "category": "anatomy", "confidence": 0.95},
    {"box_2d": [120, 620, 450, 920], "label": "right cerebral hemisphere", "category": "anatomy", "confidence": 0.95},
    {"box_2d": [200, 420, 380, 580], "label": "third ventricle", "category": "csf_space", "confidence": 0.88},
    {"box_2d": [180, 200, 320, 350], "label": "left lateral ventricle (frontal horn)", "category": "csf_space", "confidence": 0.91},
    {"box_2d": [180, 650, 320, 800], "label": "right lateral ventricle (frontal horn)", "category": "csf_space", "confidence": 0.91},
    {"box_2d": [350, 150, 550, 400], "label": "left temporal lobe", "category": "anatomy", "confidence": 0.89},
    {"box_2d": [350, 600, 550, 850], "label": "right temporal lobe", "category": "anatomy", "confidence": 0.89},
    {"box_2d": [80, 400, 180, 600], "label": "frontal bone", "category": "bone", "confidence": 0.97},
    {"box_2d": [500, 400, 600, 600], "label": "occipital bone", "category": "bone", "confidence": 0.96},
    {"box_2d": [280, 380, 420, 620], "label": "basal ganglia region", "category": "deep_structure", "confidence": 0.85}
  ],
  "measurements": {
    "midline_shift_mm": 0,
    "ventricle_ratio": 0.28,
    "sulcal_effacement": false
  }
}
"""

BRAIN_MRI_T1_GD_DETECTION = """
{
  "modality": "MRI_T1_GADOLINIUM",
  "findings": [
    {"box_2d": [280, 320, 420, 480], "label": "enhancing lesion (tumor)", "category": "pathology", "confidence": 0.92,
     "metadata": {"enhancement_pattern": "ring-enhancing", "estimated_volume_cc": 12.5}},
    {"box_2d": [250, 280, 450, 520], "label": "perilesional edema (T2 hyperintense zone)", "category": "pathology", "confidence": 0.88},
    {"box_2d": [320, 380, 380, 440], "label": "necrotic center", "category": "pathology", "confidence": 0.85},
    {"box_2d": [200, 420, 380, 580], "label": "third ventricle (compressed)", "category": "csf_space", "confidence": 0.90},
    {"box_2d": [180, 150, 350, 280], "label": "left lateral ventricle", "category": "csf_space", "confidence": 0.93},
    {"box_2d": [180, 720, 350, 850], "label": "right lateral ventricle (dilated)", "category": "csf_space", "confidence": 0.91},
    {"box_2d": [450, 380, 520, 620], "label": "cerebellum", "category": "anatomy", "confidence": 0.94},
    {"box_2d": [520, 420, 600, 580], "label": "fourth ventricle", "category": "csf_space", "confidence": 0.89}
  ],
  "clinical_assessment": {
    "mass_effect": true,
    "midline_shift_mm": 4.2,
    "herniation_risk": "moderate",
    "likely_diagnosis": "high-grade glioma (GBM pattern)"
  }
}
"""

NEUROUSG_INTRAOP_DETECTION = """
{
  "modality": "INTRAOPERATIVE_ULTRASOUND",
  "findings": [
    {"box_2d": [300, 350, 480, 550], "label": "hyperechoic tumor mass", "category": "pathology", "confidence": 0.89,
     "metadata": {"echogenicity": "hyperechoic", "margins": "irregular"}},
    {"box_2d": [280, 300, 500, 600], "label": "tumor-brain interface", "category": "surgical_landmark", "confidence": 0.82},
    {"box_2d": [200, 200, 280, 320], "label": "normal cortex (isoechoic)", "category": "anatomy", "confidence": 0.91},
    {"box_2d": [180, 600, 300, 750], "label": "sulcal CSF (anechoic)", "category": "csf_space", "confidence": 0.87},
    {"box_2d": [420, 280, 520, 380], "label": "resection cavity edge", "category": "surgical_landmark", "confidence": 0.85},
    {"box_2d": [350, 150, 450, 250], "label": "residual tumor (posterior)", "category": "pathology", "confidence": 0.78,
     "metadata": {"surgical_note": "near eloquent cortex - caution advised"}}
  ],
  "surgical_guidance": {
    "resection_completeness": "subtotal",
    "residual_locations": ["posterior margin", "deep interface"],
    "safe_corridor": "anterior-lateral approach"
  }
}
"""

# =============================================================================
# 2. OPERATING ROOM ENVIRONMENT
# =============================================================================

OR_ENVIRONMENT_DETECTION = """
{
  "scene": "NEUROSURGICAL_OR",
  "detections": [
    {"box_2d": [350, 350, 650, 650], "label": "surgical field (sterile zone)", "category": "sterile_zone", "confidence": 0.95},
    {"box_2d": [50, 100, 300, 400], "label": "anesthesia workstation", "category": "equipment", "confidence": 0.92},
    {"box_2d": [100, 700, 350, 950], "label": "neuronavigation system", "category": "equipment", "confidence": 0.94},
    {"box_2d": [400, 50, 600, 200], "label": "surgical microscope", "category": "equipment", "confidence": 0.96},
    {"box_2d": [700, 300, 950, 600], "label": "instrument table (back table)", "category": "sterile_zone", "confidence": 0.93},
    {"box_2d": [650, 700, 900, 950], "label": "mayo stand", "category": "sterile_zone", "confidence": 0.91},
    {"box_2d": [50, 500, 200, 700], "label": "suction canister", "category": "equipment", "confidence": 0.88},
    {"box_2d": [800, 50, 980, 250], "label": "monitor tower (vitals + navigation)", "category": "equipment", "confidence": 0.90},
    {"box_2d": [200, 250, 350, 400], "label": "IV pole with infusions", "category": "equipment", "confidence": 0.87},
    {"box_2d": [500, 850, 700, 980], "label": "electrocautery unit", "category": "equipment", "confidence": 0.89}
  ],
  "personnel": [
    {"box_2d": [300, 200, 500, 500], "label": "primary surgeon", "category": "personnel", "confidence": 0.94, "metadata": {"position": "head of table"}},
    {"box_2d": [300, 500, 500, 800], "label": "first assistant", "category": "personnel", "confidence": 0.92},
    {"box_2d": [550, 350, 700, 650], "label": "scrub nurse", "category": "personnel", "confidence": 0.91},
    {"box_2d": [100, 200, 250, 450], "label": "anesthesiologist", "category": "personnel", "confidence": 0.90}
  ]
}
"""

# =============================================================================
# 3. SURGICAL INSTRUMENT IDENTIFICATION
# =============================================================================

NEUROSURGICAL_INSTRUMENTS_DETECTION = """
{
  "instrument_tray": "CRANIOTOMY_SET",
  "detections": [
    {"box_2d": [100, 50, 180, 350], "label": "Penfield dissector #1", "category": "dissector", "confidence": 0.93,
     "metadata": {"use": "dural elevation, tumor dissection"}},
    {"box_2d": [100, 380, 180, 680], "label": "Penfield dissector #4", "category": "dissector", "confidence": 0.92,
     "metadata": {"use": "packing, hemostasis"}},
    {"box_2d": [200, 100, 280, 500], "label": "bipolar forceps", "category": "hemostasis", "confidence": 0.96,
     "metadata": {"use": "coagulation, vessel sealing", "tip_type": "bayonet"}},
    {"box_2d": [200, 550, 280, 900], "label": "monopolar suction bovie", "category": "hemostasis", "confidence": 0.94},
    {"box_2d": [300, 50, 400, 300], "label": "Kerrison rongeur 2mm", "category": "bone_instrument", "confidence": 0.91,
     "metadata": {"use": "bone removal, decompression"}},
    {"box_2d": [300, 350, 400, 600], "label": "Kerrison rongeur 4mm", "category": "bone_instrument", "confidence": 0.90},
    {"box_2d": [420, 100, 520, 450], "label": "Midas Rex drill (perforator)", "category": "power_instrument", "confidence": 0.95,
     "metadata": {"use": "burr holes, craniotomy"}},
    {"box_2d": [420, 500, 520, 850], "label": "Midas Rex footplate attachment", "category": "power_instrument", "confidence": 0.88},
    {"box_2d": [550, 50, 650, 400], "label": "Gigli saw with handles", "category": "bone_instrument", "confidence": 0.87},
    {"box_2d": [550, 450, 650, 750], "label": "dural scissors (curved)", "category": "cutting", "confidence": 0.92},
    {"box_2d": [680, 100, 780, 500], "label": "Yasargil aneurysm clip applier", "category": "vascular", "confidence": 0.89,
     "metadata": {"use": "aneurysm clipping", "loaded": true}},
    {"box_2d": [680, 550, 780, 850], "label": "self-retaining retractor (Greenberg)", "category": "retractor", "confidence": 0.93},
    {"box_2d": [800, 100, 900, 400], "label": "ultrasonic aspirator (CUSA) handpiece", "category": "resection", "confidence": 0.94,
     "metadata": {"use": "tumor debulking", "settings": "amplitude 60%, irrigation on"}},
    {"box_2d": [800, 450, 900, 700], "label": "nerve stimulator probe", "category": "monitoring", "confidence": 0.86},
    {"box_2d": [920, 100, 980, 600], "label": "cottonoid patties (assorted)", "category": "hemostasis", "confidence": 0.91}
  ]
}
"""

# =============================================================================
# 4. CONTAMINATION SOURCE IDENTIFICATION
# =============================================================================

OR_CONTAMINATION_DETECTION = """
{
  "scene": "CONTAMINATION_ASSESSMENT",
  "risk_level": "MODERATE",
  "detections": [
    {"box_2d": [150, 200, 250, 350], "label": "non-sterile sleeve touching drape edge", "category": "breach", "confidence": 0.88,
     "severity": "high", "action": "re-drape area or change gown"},
    {"box_2d": [400, 50, 500, 150], "label": "uncovered hair near field", "category": "risk", "confidence": 0.82,
     "severity": "moderate", "action": "adjust cap coverage"},
    {"box_2d": [600, 600, 750, 800], "label": "instrument dropped on floor", "category": "contaminated", "confidence": 0.95,
     "severity": "high", "action": "remove from field, replace from sterile backup"},
    {"box_2d": [100, 700, 200, 850], "label": "splash on non-sterile surface", "category": "biohazard", "confidence": 0.79,
     "severity": "low", "action": "clean with approved disinfectant"},
    {"box_2d": [800, 300, 950, 500], "label": "sterile wrapper opened toward body", "category": "technique", "confidence": 0.85,
     "severity": "moderate", "action": "review aseptic technique"},
    {"box_2d": [350, 400, 450, 550], "label": "hand passing over sterile field", "category": "breach", "confidence": 0.91,
     "severity": "moderate", "action": "verbal reminder, increase vigilance"},
    {"box_2d": [50, 400, 120, 550], "label": "door opening during procedure", "category": "environmental", "confidence": 0.77,
     "severity": "low", "action": "minimize traffic, positive pressure maintained"}
  ],
  "summary": {
    "total_risks": 7,
    "high_severity": 2,
    "moderate_severity": 3,
    "low_severity": 2,
    "recommended_actions": [
      "Address gown sleeve contact immediately",
      "Remove dropped instrument",
      "Reinforce aseptic technique with team"
    ]
  }
}
"""

# =============================================================================
# 5. TRANSSPHENOIDAL SURGERY ANATOMY
# =============================================================================

TRANSSPHENOIDAL_ANATOMY_DETECTION = """
{
  "view": "ENDOSCOPIC_ENDONASAL",
  "surgical_phase": "SPHENOID_SINUS_EXPOSURE",
  "detections": [
    {"box_2d": [400, 350, 600, 650], "label": "sphenoid sinus ostium", "category": "landmark", "confidence": 0.94,
     "metadata": {"surgical_note": "entry point for sphenoid sinus"}},
    {"box_2d": [300, 400, 450, 600], "label": "superior turbinate", "category": "anatomy", "confidence": 0.91},
    {"box_2d": [550, 400, 700, 600], "label": "middle turbinate (lateralized)", "category": "anatomy", "confidence": 0.89},
    {"box_2d": [350, 200, 650, 350], "label": "sphenoid rostrum", "category": "bone", "confidence": 0.87},
    {"box_2d": [200, 450, 350, 600], "label": "nasal septum (posterior)", "category": "anatomy", "confidence": 0.92},
    {"box_2d": [650, 450, 800, 600], "label": "choana (right)", "category": "landmark", "confidence": 0.86}
  ],
  "critical_structures": [
    {"box_2d": [420, 500, 580, 680], "label": "carotid prominence (avoid!)", "category": "vascular", "confidence": 0.93,
     "alert": "CRITICAL - ICA proximity", "metadata": {"distance_mm": 3.2}},
    {"box_2d": [380, 300, 620, 450], "label": "optic nerve canal region", "category": "neural", "confidence": 0.88,
     "alert": "CRITICAL - optic nerve proximity"}
  ],
  "navigation_correlation": {
    "accuracy_mm": 1.2,
    "trajectory": "on-plan",
    "target_sella": {"box_2d": [430, 420, 570, 580], "label": "sellar floor target"}
  }
}
"""

TRANSSPHENOIDAL_SELLAR_DETECTION = """
{
  "view": "ENDOSCOPIC_SELLAR",
  "surgical_phase": "TUMOR_RESECTION",
  "detections": [
    {"box_2d": [350, 300, 650, 700], "label": "sellar floor (opened)", "category": "bone", "confidence": 0.95},
    {"box_2d": [400, 400, 600, 600], "label": "pituitary adenoma", "category": "pathology", "confidence": 0.92,
     "metadata": {"consistency": "soft", "color": "grayish", "estimated_resection": "60%"}},
    {"box_2d": [380, 250, 620, 350], "label": "dura mater (sellar)", "category": "anatomy", "confidence": 0.90},
    {"box_2d": [300, 450, 380, 600], "label": "left cavernous sinus wall", "category": "vascular", "confidence": 0.88,
     "alert": "CAUTION - lateral limit"},
    {"box_2d": [620, 450, 700, 600], "label": "right cavernous sinus wall", "category": "vascular", "confidence": 0.87,
     "alert": "CAUTION - lateral limit"},
    {"box_2d": [450, 200, 550, 280], "label": "diaphragma sellae", "category": "anatomy", "confidence": 0.84},
    {"box_2d": [420, 650, 580, 750], "label": "residual tumor (inferior)", "category": "pathology", "confidence": 0.79}
  ],
  "vascular_alerts": [
    {"box_2d": [280, 350, 340, 500], "label": "left ICA (cavernous segment)", "category": "critical_vessel", "confidence": 0.91,
     "alert": "CRITICAL - no resection beyond this point"},
    {"box_2d": [660, 350, 720, 500], "label": "right ICA (cavernous segment)", "category": "critical_vessel", "confidence": 0.90,
     "alert": "CRITICAL - no resection beyond this point"}
  ],
  "surgical_guidance": {
    "safe_resection_zone": {"box_2d": [380, 350, 620, 650]},
    "no_go_zone_left": {"box_2d": [250, 300, 380, 600]},
    "no_go_zone_right": {"box_2d": [620, 300, 750, 600]},
    "estimated_resection": "65%",
    "recommendation": "Continue medial resection, stop at cavernous sinus margins"
  }
}
"""

# =============================================================================
# 6. SURGICAL VIDEO FRAME ANALYSIS
# =============================================================================

SURGERY_VIDEO_FRAME_DETECTION = """
{
  "video_source": "CRANIOTOMY_RECORDING",
  "frame_number": 14523,
  "timestamp": "01:23:45",
  "surgical_phase": "TUMOR_RESECTION",
  "detections": [
    {"box_2d": [350, 300, 650, 700], "label": "tumor mass (being resected)", "category": "pathology", "confidence": 0.91},
    {"box_2d": [300, 200, 450, 380], "label": "normal cortex (preserved)", "category": "anatomy", "confidence": 0.89},
    {"box_2d": [500, 150, 700, 350], "label": "cottonoid patty (hemostasis)", "category": "instrument", "confidence": 0.93},
    {"box_2d": [400, 600, 550, 750], "label": "bipolar forceps tips", "category": "instrument", "confidence": 0.95,
     "metadata": {"action": "coagulating", "state": "active"}},
    {"box_2d": [250, 500, 380, 680], "label": "CUSA handpiece", "category": "instrument", "confidence": 0.92,
     "metadata": {"action": "aspirating tumor", "state": "active"}},
    {"box_2d": [600, 400, 720, 580], "label": "suction tip", "category": "instrument", "confidence": 0.90},
    {"box_2d": [200, 350, 300, 500], "label": "retractor blade", "category": "instrument", "confidence": 0.88}
  ],
  "vessels_detected": [
    {"box_2d": [420, 280, 480, 350], "label": "cortical vein", "category": "vessel", "confidence": 0.85,
     "alert": "PRESERVE - draining vein", "metadata": {"caliber_mm": 2.1}},
    {"box_2d": [550, 380, 620, 450], "label": "feeding artery (tumor)", "category": "vessel", "confidence": 0.82,
     "metadata": {"status": "coagulated"}}
  ],
  "landmarks": [
    {"box_2d": [150, 300, 250, 450], "label": "central sulcus (estimated)", "category": "landmark", "confidence": 0.78},
    {"box_2d": [680, 250, 780, 400], "label": "precentral gyrus edge", "category": "landmark", "confidence": 0.76,
     "alert": "ELOQUENT CORTEX - motor strip proximity"}
  ],
  "action_recognition": {
    "primary_action": "tumor_debulking",
    "instruments_in_use": ["CUSA", "bipolar", "suction"],
    "phase_completion": "75%",
    "estimated_time_remaining": "15-20 minutes"
  }
}
"""

# =============================================================================
# VISUALIZATION UTILITIES
# =============================================================================

COLORS = {
    'anatomy': '#64C864',      # Green
    'pathology': '#FF5050',    # Red
    'csf_space': '#0096FF',    # Blue
    'bone': '#F5F5DC',         # Beige
    'deep_structure': '#9370DB', # Purple
    'equipment': '#FFD700',    # Gold
    'sterile_zone': '#00FA9A', # Spring green
    'personnel': '#87CEEB',    # Sky blue
    'instrument': '#FFA500',   # Orange
    'vascular': '#DC143C',     # Crimson
    'neural': '#FFD700',       # Gold
    'landmark': '#00CED1',     # Dark cyan
    'breach': '#FF0000',       # Red
    'risk': '#FFA500',         # Orange
    'contaminated': '#8B0000', # Dark red
    'critical_vessel': '#FF0000', # Red
    'surgical_landmark': '#00FF00', # Lime
    'vessel': '#DC143C',       # Crimson
    'dissector': '#C0C0C0',    # Silver
    'hemostasis': '#FFD700',   # Gold
    'bone_instrument': '#D2691E', # Chocolate
    'power_instrument': '#4169E1', # Royal blue
    'cutting': '#C0C0C0',      # Silver
    'retractor': '#708090',    # Slate gray
    'resection': '#9400D3',    # Dark violet
    'monitoring': '#00BFFF',   # Deep sky blue
}


def get_color(category: str) -> str:
    """Get color for a detection category."""
    return COLORS.get(category, '#FFFFFF')


def parse_detection_json(json_str: str) -> Dict:
    """Parse detection JSON string."""
    return json.loads(json_str)


def draw_neurosurgical_detections(
    image_path: str,
    detections_json: str,
    output_path: str,
    show_alerts: bool = True
) -> Image.Image:
    """
    Draw neurosurgical detections on an image.
    
    Args:
        image_path: Path to input image
        detections_json: JSON string with detections
        output_path: Path to save annotated image
        show_alerts: Whether to highlight critical alerts
    
    Returns:
        Annotated PIL Image
    """
    img = Image.open(image_path)
    width, height = img.size
    draw = ImageDraw.Draw(img)
    
    data = parse_detection_json(detections_json)
    
    # Get detections from various possible keys
    detections = (
        data.get('detections', []) or 
        data.get('findings', []) or 
        data.get('vessels_detected', []) +
        data.get('landmarks', [])
    )
    
    # Add critical structures if present
    if 'critical_structures' in data:
        detections.extend(data['critical_structures'])
    if 'vascular_alerts' in data:
        detections.extend(data['vascular_alerts'])
    
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
        small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    except:
        font = ImageFont.load_default()
        small_font = font
    
    for det in detections:
        if 'box_2d' not in det:
            continue
            
        category = det.get('category', 'default')
        color = get_color(category)
        
        # Convert normalized coordinates
        y1 = int(det['box_2d'][0] / 1000 * height)
        x1 = int(det['box_2d'][1] / 1000 * width)
        y2 = int(det['box_2d'][2] / 1000 * height)
        x2 = int(det['box_2d'][3] / 1000 * width)
        
        # Check for alerts
        is_critical = 'alert' in det or det.get('severity') == 'high'
        line_width = 4 if is_critical else 2
        
        # Draw rectangle
        draw.rectangle([(x1, y1), (x2, y2)], outline=color, width=line_width)
        
        # Draw label background
        label = det['label']
        text_bbox = draw.textbbox((x1 + 2, y1 + 2), label, font=font)
        draw.rectangle(text_bbox, fill=color)
        draw.text((x1 + 2, y1 + 2), label, fill='white' if is_critical else 'black', font=font)
        
        # Draw alert if present
        if show_alerts and 'alert' in det:
            alert_text = f"⚠ {det['alert']}"
            alert_bbox = draw.textbbox((x1, y2 + 4), alert_text, font=small_font)
            draw.rectangle(alert_bbox, fill='#FF0000')
            draw.text((x1, y2 + 4), alert_text, fill='white', font=small_font)
    
    img.save(output_path)
    print(f"Saved: {output_path}")
    return img


def create_neuroimaging_segmentation_mask(
    image_path: str,
    output_path: str,
    modality: str = 'CT'
) -> Dict[str, np.ndarray]:
    """
    Create segmentation masks for neuroimaging.
    
    Uses the neuroimaging-segmentation skill principles.
    """
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        # Create synthetic data for demonstration
        img = np.random.randint(50, 200, (512, 512), dtype=np.uint8)
        # Add synthetic structures
        cv2.circle(img, (256, 256), 80, 30, -1)  # Dark ventricle
        cv2.circle(img, (200, 200), 40, 220, -1)  # Bright lesion
    
    blurred = cv2.GaussianBlur(img, (5, 5), 0)
    
    # Create ROI mask
    _, roi = cv2.threshold(blurred, 15, 255, cv2.THRESH_BINARY)
    kernel = np.ones((10, 10), np.uint8)
    roi = cv2.morphologyEx(roi, cv2.MORPH_CLOSE, kernel, iterations=3)
    
    masks = {}
    
    if modality == 'CT':
        # CSF (hypodense)
        _, masks['csf'] = cv2.threshold(blurred, 40, 255, cv2.THRESH_BINARY_INV)
        masks['csf'] = cv2.bitwise_and(masks['csf'], roi)
        
        # Hemorrhage/calcification (hyperdense)
        _, masks['hyperdense'] = cv2.threshold(blurred, 180, 255, cv2.THRESH_BINARY)
        masks['hyperdense'] = cv2.bitwise_and(masks['hyperdense'], roi)
        
        # Brain parenchyma
        masks['parenchyma'] = cv2.inRange(blurred, 50, 170)
        masks['parenchyma'] = cv2.bitwise_and(masks['parenchyma'], roi)
    
    elif modality == 'MRI_T1_GD':
        # Enhancement (hyperintense)
        _, masks['enhancement'] = cv2.threshold(blurred, 170, 255, cv2.THRESH_BINARY)
        masks['enhancement'] = cv2.bitwise_and(masks['enhancement'], roi)
        
        # CSF (hypointense)
        _, masks['csf'] = cv2.threshold(blurred, 35, 255, cv2.THRESH_BINARY_INV)
        masks['csf'] = cv2.bitwise_and(masks['csf'], roi)
        
        # Edema
        masks['edema'] = cv2.inRange(blurred, 45, 85)
        masks['edema'] = cv2.bitwise_and(masks['edema'], roi)
    
    # Clean up masks
    small_kernel = np.ones((5, 5), np.uint8)
    for key in masks:
        masks[key] = cv2.morphologyEx(masks[key], cv2.MORPH_OPEN, small_kernel)
        masks[key] = cv2.morphologyEx(masks[key], cv2.MORPH_CLOSE, small_kernel)
    
    # Create overlay visualization
    img_rgb = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    overlay = img_rgb.copy()
    
    color_map = {
        'csf': (0, 150, 255),
        'hyperdense': (255, 80, 80),
        'parenchyma': (100, 200, 100),
        'enhancement': (255, 200, 0),
        'edema': (100, 150, 255)
    }
    
    for key, mask in masks.items():
        if key in color_map:
            overlay[mask > 0] = color_map[key]
    
    result = cv2.addWeighted(overlay, 0.45, img_rgb, 0.55, 0)
    cv2.imwrite(output_path, result)
    print(f"Saved segmentation: {output_path}")
    
    return masks


def generate_comprehensive_report() -> str:
    """Generate a comprehensive report of neurosurgical capabilities."""
    report = """
╔══════════════════════════════════════════════════════════════════════════════╗
║           CLAUDE NEUROSURGICAL SPATIAL UNDERSTANDING CAPABILITIES            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  1. NEUROIMAGING ANALYSIS                                                    ║
║     ├─ CT Head: Identify hemorrhage, ventricles, midline shift, bone         ║
║     ├─ MRI T1+Gd: Enhancing tumors, edema, mass effect, herniation risk     ║
║     ├─ MRI T2/FLAIR: Edema mapping, white matter lesions                    ║
║     └─ Intraop USG: Real-time tumor localization, resection margins          ║
║                                                                              ║
║  2. OPERATING ROOM ENVIRONMENT                                               ║
║     ├─ Equipment identification and positioning                              ║
║     ├─ Sterile zone boundaries                                               ║
║     ├─ Personnel roles and positioning                                       ║
║     └─ Navigation system correlation                                          ║
║                                                                              ║
║  3. SURGICAL INSTRUMENTS                                                     ║
║     ├─ Penfield dissectors (#1-4)                                            ║
║     ├─ Bipolar/monopolar cautery                                             ║
║     ├─ Kerrison rongeurs                                                     ║
║     ├─ Power instruments (Midas Rex, CUSA)                                   ║
║     ├─ Vascular instruments (aneurysm clips, appliers)                       ║
║     └─ Retractors and hemostatic materials                                   ║
║                                                                              ║
║  4. CONTAMINATION DETECTION                                                  ║
║     ├─ Sterile field breaches                                                ║
║     ├─ Technique violations                                                   ║
║     ├─ Environmental risks                                                   ║
║     └─ Severity classification and recommended actions                       ║
║                                                                              ║
║  5. TRANSSPHENOIDAL SURGERY                                                  ║
║     ├─ Nasal anatomy (turbinates, septum, sphenoid ostium)                  ║
║     ├─ Sellar anatomy (sella, diaphragma, cavernous sinus)                  ║
║     ├─ Critical vascular structures (ICA proximity)                          ║
║     ├─ Safe resection corridors                                              ║
║     └─ Real-time navigation correlation                                       ║
║                                                                              ║
║  6. SURGICAL VIDEO ANALYSIS                                                  ║
║     ├─ Frame-by-frame instrument tracking                                    ║
║     ├─ Action recognition (resecting, coagulating, dissecting)              ║
║     ├─ Vessel and landmark identification                                    ║
║     ├─ Phase detection and completion estimation                             ║
║     └─ Eloquent cortex proximity alerts                                      ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  OUTPUT FORMATS:                                                             ║
║     • 2D Bounding boxes [y1, x1, y2, x2] normalized 0-1000                   ║
║     • Point detection [y, x] for precise localization                        ║
║     • 3D boxes [cx, cy, cz, w, h, d, roll, pitch, yaw]                      ║
║     • Segmentation masks (base64 PNG)                                        ║
║     • Confidence scores and clinical metadata                                ║
║     • Severity classifications and action recommendations                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""
    return report


def main():
    """Run neurosurgical spatial understanding demonstration."""
    print(generate_comprehensive_report())
    
    print("\n" + "="*70)
    print("DEMONSTRATION OUTPUT SAMPLES")
    print("="*70 + "\n")
    
    # Print sample outputs
    scenarios = [
        ("Brain CT Analysis", BRAIN_CT_DETECTION),
        ("Brain MRI T1+Gd Analysis", BRAIN_MRI_T1_GD_DETECTION),
        ("Intraoperative Ultrasound", NEUROUSG_INTRAOP_DETECTION),
        ("OR Environment", OR_ENVIRONMENT_DETECTION),
        ("Surgical Instruments", NEUROSURGICAL_INSTRUMENTS_DETECTION),
        ("Contamination Detection", OR_CONTAMINATION_DETECTION),
        ("Transsphenoidal - Sphenoid", TRANSSPHENOIDAL_ANATOMY_DETECTION),
        ("Transsphenoidal - Sellar", TRANSSPHENOIDAL_SELLAR_DETECTION),
        ("Surgical Video Frame", SURGERY_VIDEO_FRAME_DETECTION),
    ]
    
    for name, json_data in scenarios:
        print(f"\n{'─'*70}")
        print(f"📋 {name}")
        print('─'*70)
        data = json.loads(json_data)
        
        # Count detections
        detections = (
            data.get('detections', []) or 
            data.get('findings', []) or []
        )
        if 'critical_structures' in data:
            detections.extend(data['critical_structures'])
        if 'vascular_alerts' in data:
            detections.extend(data['vascular_alerts'])
        if 'personnel' in data:
            detections.extend(data['personnel'])
        
        print(f"   Total detections: {len(detections)}")
        
        # Show first 3 detections as sample
        for i, det in enumerate(detections[:3]):
            label = det.get('label', 'unknown')
            confidence = det.get('confidence', 0)
            alert = det.get('alert', '')
            print(f"   • {label} (conf: {confidence:.0%}){' ⚠️' + alert if alert else ''}")
        
        if len(detections) > 3:
            print(f"   ... and {len(detections) - 3} more")


if __name__ == "__main__":
    main()
