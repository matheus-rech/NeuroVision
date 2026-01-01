# Pituitary Surgery Training Module - Design Document

**Date:** 2025-01-01
**Status:** Approved
**Author:** Claude + Matheus Rech

## Overview

A teaching-focused training module for transsphenoidal endonasal pituitary surgery, featuring realistic 3D anatomical visualization, guided navigation, measurement tools, and progressive case scenarios.

## Goals

1. Replace the current basic sphere with accurate pituitary region anatomy
2. Provide step-by-step surgical approach walkthrough for residents
3. Enable measurement practice for surgical planning
4. Offer progressive difficulty scenarios for structured learning

---

## Architecture

### 1. Anatomical Model Structure

Modular 3D model with separate meshes for independent visibility/transparency control:

| Structure | Purpose | Interaction |
|-----------|---------|-------------|
| Skull base (partial) | Context/orientation | Semi-transparent shell |
| Nasal cavity | Entry corridor | Fade during deep navigation |
| Sphenoid sinus | Surgical corridor | Highlight during approach |
| Sella turcica | Surgical target zone | Glow effect when reached |
| Pituitary gland | Normal anatomy reference | Color-coded (anterior/posterior) |
| Tumor (3 variants) | Pathology visualization | Red, pulsing, size varies by case |
| Optic chiasm | Critical structure | Warning zone - proximity alerts |
| Carotid arteries (L/R) | Critical structure | Red pulsing, danger zones |
| Cavernous sinus | Advanced landmark | Visible in invasive case |

**Model Source:** CC0-licensed anatomical model from BodyParts3D or Sketchfab, adapted for surgical teaching.

### 2. Guided Navigation System

6-phase transsphenoidal approach with voice narration:

| Phase | Name | Camera Position | Teaching Points |
|-------|------|-----------------|-----------------|
| 1 | Nasal Entry | Endoscope POV at nostril | Middle turbinate, septum |
| 2 | Sphenoidotomy | Inside sphenoid sinus | Sphenoid ostium, anterior wall |
| 3 | Sellar Floor | Facing sella | Midline, carotid prominences |
| 4 | Dural Opening | Close-up sella | Dura opening, tumor capsule |
| 5 | Tumor Resection | Inside sella | Progressive removal, margins |
| 6 | Closure | Pulling back | Reconstruction, fat graft, flap |

**Voice Narration:**
- ElevenLabs "George" voice (British, professional)
- 15-30 second audio per phase
- Pause/repeat/skip controls

**Visual Feedback:**
- Active structure pulses green
- Critical structures pulse red on proximity
- Progress bar shows current phase

### 3. Measurement Tools

5 key measurements for surgical planning practice:

| Priority | Measurement | Clinical Relevance | Alert Threshold |
|----------|-------------|-------------------|-----------------|
| Essential | Intercarotid distance | Safe corridor width | <12mm = high risk |
| Essential | Tumor → Optic chiasm | Vision risk | <3mm = urgent |
| Essential | Tumor max diameter | Classification | >10mm = macro |
| Advanced | Suprasellar extension | Resection strategy | >10mm above sella |
| Advanced | Sellar depth | Instrument planning | Patient-specific |

**Features:**
- Click-to-place measurement points
- Distance displayed in millimeters
- Red highlight for unsafe proximity
- Voice alert for critical measurements
- Quiz mode (hide values, trainee guesses)

### 4. Training Scenarios

3 progressive cases with unlock system:

| Case | Difficulty | Tumor | Challenges |
|------|------------|-------|------------|
| Case 1 | Beginner | Microadenoma (8mm) | Confined to sella, wide corridor |
| Case 2 | Intermediate | Macroadenoma (25mm) | Suprasellar, touching chiasm |
| Case 3 | Advanced | Invasive (30mm) | Cavernous sinus, encasing carotid |

**Progression System:**
- Complete Case 1 to unlock Case 2
- Pre-op quiz before each case
- Scoring: measurement accuracy, structure ID, navigation safety
- Certificate on completion

---

## Technical Implementation

### File Structure

```
dashboard/frontend/src/
├── components/
│   ├── PituitaryModel3D.jsx      # Main 3D component
│   ├── AnatomyStructures.jsx     # Individual structure meshes
│   ├── GuidedNavigation.jsx      # Step-by-step walkthrough
│   ├── MeasurementTools.jsx      # Distance measurement UI
│   └── TrainingScenarios.jsx     # Case selection & progression
├── models/
│   └── pituitary/
│       ├── skull_base.glb
│       ├── sphenoid.glb
│       ├── sella.glb
│       ├── pituitary.glb
│       ├── optic_chiasm.glb
│       ├── carotids.glb
│       └── tumors/
│           ├── microadenoma.glb
│           ├── macroadenoma.glb
│           └── invasive.glb
└── audio/
    └── navigation/
        ├── phase1_nasal_entry.mp3
        ├── phase2_sphenoidotomy.mp3
        └── ...
```

### Dependencies

- `@react-three/fiber` - Already installed
- `@react-three/drei` - Already installed (GLTFLoader, Html, etc.)
- `three` - Already installed

### Voice Integration

Uses existing `VoiceService` from backend for narration playback.

---

## Phase 2: PitVQA Real Surgical Video Integration

**Resource Discovered:** [PitVQA Dataset](https://doi.org/10.5522/04/27004666.v2) from National Hospital of Neurology and Neurosurgery, London.

### Dataset Overview

| Metric | Value |
|--------|-------|
| Videos | 25 endoscopic pituitary surgeries |
| Frames | 109,173 (extracted at 1 fps) |
| Q&A Pairs | 884,242 (~8 per frame) |
| License | CC BY-NC-ND 4.0 (educational use) |
| Equipment | Karl Storz HD endoscope |

### Annotation Categories

| Category | Count | Integration Use |
|----------|-------|-----------------|
| Surgical Phases | 4 | Auto-phase detection |
| Surgical Steps | 15 | Detailed navigation |
| Instruments | 18 | Tool recognition quiz |
| Instrument Positions | 5 | Technique assessment |
| Operation Notes | 14 | Context awareness |

### Integration Plan

1. **Video Frame Player**
   - Display real surgical frames alongside 3D model
   - Synchronized phase indicators
   - Frame-by-frame stepping for detailed review

2. **VQA Assessment System**
   - Load pretrained PitVQA model
   - Generate questions about current frame
   - Score trainee responses
   - Track improvement over time

3. **Phase Auto-Detection**
   - Use model to detect current surgical phase
   - Sync 3D guided navigation with video
   - Provide real-time feedback on phase transitions

4. **Instrument Recognition Quiz**
   - Show frame, ask "What instrument is being used?"
   - Multiple choice from 18 known instruments
   - Track accuracy per instrument type

### GitHub Repository

- **Code:** https://github.com/mobarakol/PitVQA
- **Paper:** MICCAI 2024
- **Dependencies:** BLIP, Hugging Face Transformers, timm

---

## Phase 3: DICOM Support (Future)

After Phase 2 (PitVQA integration) is complete:

1. Add DICOM file upload endpoint
2. Use `cornerstone.js` or `vtk.js` for 3D reconstruction
3. Overlay anatomical reference on patient data
4. Allow trainees to practice on real cases

---

## Success Criteria

- [ ] Realistic 3D anatomy replaces current sphere
- [ ] All 9 anatomical structures visible and labeled
- [ ] 6-phase navigation with voice works end-to-end
- [ ] 5 measurements functional with alerts
- [ ] 3 scenarios with unlock progression
- [ ] Trainee can complete full Case 1 walkthrough

---

## Timeline

| Phase | Deliverable |
|-------|-------------|
| 1 | Source/create 3D anatomical models |
| 2 | Build modular structure components |
| 3 | Implement guided navigation + voice |
| 4 | Add measurement tools |
| 5 | Create training scenarios + progression |
| 6 | Testing and polish |
