#!/usr/bin/env python3
"""
NeuroVision - Real-time AI-powered neurosurgical vision system
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read README
this_directory = Path(__file__).parent
long_description = (this_directory / "README.md").read_text(encoding="utf-8")

setup(
    name="neurovision",
    version="0.1.0",
    author="Dr. Matheus Machado Rech",
    author_email="matheus@neurovision.ai",
    description="Real-time AI-powered neurosurgical vision system with camera integration",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/matheus-rech/NeuroVision",
    project_urls={
        "Bug Tracker": "https://github.com/matheus-rech/NeuroVision/issues",
        "Documentation": "https://github.com/matheus-rech/NeuroVision/docs",
        "Source Code": "https://github.com/matheus-rech/NeuroVision",
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Healthcare Industry",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Scientific/Engineering :: Image Processing",
        "Topic :: Scientific/Engineering :: Medical Science Apps.",
    ],
    keywords=[
        "neurosurgery",
        "computer vision",
        "medical imaging",
        "ai",
        "claude",
        "segmentation",
        "surgical robotics",
        "real-time",
    ],
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    python_requires=">=3.9",
    install_requires=[
        "numpy>=1.21.0",
        "opencv-python>=4.5.0",
        "pillow>=9.0.0",
        "anthropic>=0.18.0",
        "aiohttp>=3.8.0",
        "pyyaml>=6.0",
        "loguru>=0.6.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.18.0",
            "pytest-cov>=3.0.0",
            "black>=22.0.0",
            "flake8>=4.0.0",
            "mypy>=0.950",
        ],
        "deep": [
            "torch>=1.10.0",
            "torchvision>=0.11.0",
        ],
        "voice": [
            "elevenlabs>=0.2.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "neurovision=neurovision.cli:main",
            "neurovision-demo=neurovision.demos:run_demo",
        ],
    },
    include_package_data=True,
    package_data={
        "neurovision": ["config/*.yaml", "assets/*"],
    },
)
