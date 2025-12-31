"""
NeuroVision Robotics Module
===========================

Surgical robotics integration for trajectory planning, execution, and safety.

Components:
-----------
- TrajectoryPlanner: Plan safe surgical trajectories
- SafetyCorridor: Real-time boundary enforcement
- RobotController: Interface with surgical robots
- TaskOrchestrator: Multi-step procedure coordination

Supported Robots:
----------------
- ROSA (Zimmer Biomet) - DBS, SEEG, biopsy
- Medtronic Stealth - Navigation integration
- BrainLab - Cranial navigation
- Custom robot interfaces via API

Example:
--------
>>> from neurovision.robotics import TrajectoryPlanner, SafetyCorridor
>>> 
>>> planner = TrajectoryPlanner(robot_type="ROSA", procedure="DBS")
>>> trajectory = planner.plan(
...     entry_point=[45.2, 32.1, 78.5],
...     target_point=[12.3, 28.4, 45.2],
...     critical_structures=[{"name": "internal_capsule", "margin_mm": 2.0}]
... )
>>> 
>>> corridor = SafetyCorridor(trajectory, radius_mm=1.5)
>>> if not corridor.is_within_bounds(current_position):
...     robot.emergency_stop()
"""

from .neurosurgical_robotics_ai import (
    SurgicalRoboticsFramework,
    # TrajectoryPlanner,
    # SafetyCorridor,
    # RobotController,
    # TaskOrchestrator,
)

__all__ = [
    "SurgicalRoboticsFramework",
    # "TrajectoryPlanner",
    # "SafetyCorridor",
    # "RobotController",
    # "TaskOrchestrator",
]
