"""
NeuroVision Training Module
===========================

Surgical training and assessment tools for neurosurgical education.

Components:
-----------
- ProcedureLibrary: Pre-built surgical procedure definitions
- AssessmentEngine: Real-time technique scoring
- FeedbackGenerator: Voice-ready coaching messages
- CertificationTracker: Competency management

Supported Procedures:
--------------------
- Craniotomy for tumor resection (8 steps)
- Transsphenoidal pituitary surgery (6 steps)
- Deep brain stimulation placement (6 steps)
- Posterior fossa surgery (variable)

Scoring Metrics:
---------------
- Accuracy: 25% weight
- Efficiency: 15% weight
- Safety: 30% weight (highest priority)
- Technique: 20% weight
- Time: 10% weight

Certification Eligibility:
- Overall score >= 80
- Safety score >= 85
- All critical steps passed

Example:
--------
>>> from neurovision.training import SurgicalTrainingSystem
>>> 
>>> trainer = SurgicalTrainingSystem(procedure="craniotomy_tumor")
>>> 
>>> async for assessment in trainer.assess_stream(video_source):
...     print(f"Step: {assessment.current_step}")
...     print(f"Score: {assessment.overall_score}")
...     if assessment.voice_feedback:
...         speak(assessment.voice_feedback)
"""

# Training components are in the core platform
# from ..core.neurosurgical_ai_platform import SurgicalTrainingSystem

__all__ = [
    # "SurgicalTrainingSystem",
    # "ProcedureLibrary",
    # "AssessmentEngine",
]
