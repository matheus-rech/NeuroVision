# Changelog

All notable changes to NeuroVision will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- MRI modality support (T1, T2, FLAIR)
- Instrument trajectory prediction
- DICOM integration
- HL7/FHIR interoperability
- Edge deployment support (NVIDIA Jetson)

## [0.1.0] - 2024-12-31

### Added

#### Core Platform
- Comprehensive neurosurgical AI platform with three main modules:
  - Real-time OR safety monitoring
  - Surgical training and assessment
  - Intraoperative navigation assistance
- Async streaming support for real-time feedback
- Voice-ready alert generation for TTS integration

#### Vision System
- Real-time camera capture using OpenCV
  - USB webcam support
  - IP camera (RTSP) support
  - Video file processing
  - Single image analysis
- Claude Vision API integration for intelligent scene understanding
- Configurable analysis modes:
  - OR_SAFETY: Contamination, sterile field monitoring
  - NAVIGATION: Critical structure identification
  - TRAINING: Technique assessment
  - SEGMENTATION: Structure segmentation
  - INSTRUMENT: Tool tracking
  - FULL: All capabilities combined

#### Segmentation Engine
- Physics-based neuroimaging segmentation
- Multi-modality support:
  - OR Camera: Tumor, blood, tissue, instrument detection
  - Ultrasound (USG): Tumor (hyperechoic), CSF (anechoic), parenchyma
  - T1+Gadolinium: Enhancement, necrotic core, edema, CSF
- Morphological processing pipeline:
  - Gaussian blur preprocessing
  - ROI masking
  - Binary thresholding
  - Morphological closing/opening
  - Small region filtering
- Contour extraction with:
  - Centroid calculation
  - Area measurement
  - Bounding box detection

#### Demo System
- Live demonstration with synthetic surgical images
- Synthetic image generators:
  - Surgical microscope view (craniotomy scenes)
  - Intraoperative ultrasound
- Real-time streaming simulation
- Performance metrics collection

### Performance

| Metric | Value |
|--------|-------|
| Microscope segmentation | 34.7ms |
| Ultrasound segmentation | 2.5ms |
| Streaming average | 27.6ms/frame |
| Real-time FPS | 36.3 fps |

### Documentation
- Comprehensive README with:
  - Quick start guide
  - API reference
  - Architecture overview
  - Configuration options
- Contributing guidelines
- MIT License with medical disclaimer
- Changelog

### Infrastructure
- Modern Python packaging with pyproject.toml
- Type hints throughout codebase
- Async/await support for streaming
- Modular architecture for extensibility

---

## Version History

- **0.1.0** (2024-12-31): Initial release with core functionality
  - Real-time camera vision
  - Physics-based segmentation
  - Claude Vision API integration
  - Live demo system

[Unreleased]: https://github.com/matheus-rech/NeuroVision/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/matheus-rech/NeuroVision/releases/tag/v0.1.0
