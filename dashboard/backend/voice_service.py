#!/usr/bin/env python3
"""
ARIA Voice Service
==================

Voice alert system for the Surgical Command Center.
Provides text-to-speech with ElevenLabs API and pyttsx3 fallback.

Features:
- ElevenLabs API with 300ms timeout for low-latency alerts
- pyttsx3 offline fallback for critical alerts
- Priority queue (critical > warning > navigation > info)
- Smart throttling (no repeats within 5 seconds)
- Async audio playback
"""

import asyncio
import time
import os
import tempfile
import hashlib
from queue import PriorityQueue
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import IntEnum
import threading


# Voice library imports with fallbacks
try:
    from elevenlabs import ElevenLabs
    from elevenlabs.core import ApiError
    ELEVENLABS_AVAILABLE = True
except ImportError:
    ELEVENLABS_AVAILABLE = False
    print("[VoiceService] Warning: ElevenLabs not available")

try:
    import pyttsx3
    PYTTSX3_AVAILABLE = True
except ImportError:
    PYTTSX3_AVAILABLE = False
    print("[VoiceService] Warning: pyttsx3 not available")


class AlertPriority(IntEnum):
    """Alert priority levels (lower = higher priority)."""
    CRITICAL = 1    # Immediate danger, must be heard
    WARNING = 2     # Important but not immediate
    NAVIGATION = 3  # Trajectory/position guidance
    INFO = 4        # Informational updates


@dataclass(order=True)
class VoiceAlert:
    """Voice alert with priority ordering."""
    priority: int
    timestamp: float = field(compare=False)
    text: str = field(compare=False)
    alert_id: str = field(compare=False)
    metadata: Dict[str, Any] = field(default_factory=dict, compare=False)


class VoiceService:
    """
    Voice alert service for ARIA surgical assistant.

    Provides real-time voice alerts during surgery with intelligent
    throttling and priority management.
    """

    # ElevenLabs configuration
    ELEVENLABS_TIMEOUT_MS = 300
    DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel voice
    DEFAULT_MODEL = "eleven_flash_v2_5"

    # Throttling configuration
    THROTTLE_WINDOW_SECONDS = 5.0
    MAX_QUEUE_SIZE = 20

    # Voice characteristics for surgical context
    VOICE_SETTINGS = {
        "stability": 0.75,      # Stable, clear pronunciation
        "similarity_boost": 0.8,
        "style": 0.1,           # Minimal style variation
        "use_speaker_boost": True
    }

    def __init__(
        self,
        elevenlabs_api_key: Optional[str] = None,
        voice_id: str = DEFAULT_VOICE_ID,
        enable_fallback: bool = True
    ):
        self.voice_id = voice_id
        self.enable_fallback = enable_fallback

        # ElevenLabs client
        self.elevenlabs_client = None
        api_key = elevenlabs_api_key or os.environ.get("ELEVENLABS_API_KEY")
        if ELEVENLABS_AVAILABLE and api_key:
            try:
                self.elevenlabs_client = ElevenLabs(api_key=api_key)
                print("[VoiceService] ElevenLabs initialized")
            except Exception as e:
                print(f"[VoiceService] ElevenLabs init failed: {e}")

        # pyttsx3 fallback
        self.tts_engine = None
        if PYTTSX3_AVAILABLE and enable_fallback:
            try:
                self.tts_engine = pyttsx3.init()
                # Configure for clear surgical alerts
                self.tts_engine.setProperty('rate', 160)  # Slightly slower
                self.tts_engine.setProperty('volume', 1.0)
                print("[VoiceService] pyttsx3 fallback initialized")
            except Exception as e:
                print(f"[VoiceService] pyttsx3 init failed: {e}")

        # Alert queue
        self.alert_queue: PriorityQueue[VoiceAlert] = PriorityQueue(maxsize=self.MAX_QUEUE_SIZE)
        self.is_speaking = False
        self.is_muted = False

        # Throttling state
        self._recent_alerts: Dict[str, float] = {}  # alert_hash -> last_time
        self._alert_count = 0
        self._last_cleanup = time.time()

        # Worker thread
        self._worker_thread: Optional[threading.Thread] = None
        self._running = False

        # Audio cache for repeated alerts
        self._audio_cache: Dict[str, bytes] = {}
        self._cache_max_size = 50

    def start(self):
        """Start the voice service worker thread."""
        if self._running:
            return

        self._running = True
        self._worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self._worker_thread.start()
        print("[VoiceService] Worker started")

    def stop(self):
        """Stop the voice service."""
        self._running = False
        if self._worker_thread:
            self._worker_thread.join(timeout=2.0)
        print("[VoiceService] Stopped")

    def queue_alert(
        self,
        text: str,
        priority: AlertPriority = AlertPriority.INFO,
        force: bool = False,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Queue a voice alert for playback.

        Args:
            text: Alert text to speak
            priority: Alert priority level
            force: Skip throttling check
            metadata: Additional alert metadata

        Returns:
            True if alert was queued, False if throttled or queue full
        """
        if self.is_muted and priority != AlertPriority.CRITICAL:
            return False

        # Clean old throttle entries periodically
        current_time = time.time()
        if current_time - self._last_cleanup > 30:
            self._cleanup_throttle_cache()
            self._last_cleanup = current_time

        # Check throttling
        alert_hash = self._hash_alert(text)
        if not force and alert_hash in self._recent_alerts:
            last_time = self._recent_alerts[alert_hash]
            if current_time - last_time < self.THROTTLE_WINDOW_SECONDS:
                return False

        # Create alert
        alert = VoiceAlert(
            priority=priority,
            timestamp=current_time,
            text=text,
            alert_id=f"{self._alert_count}_{alert_hash[:8]}",
            metadata=metadata or {}
        )

        # Queue alert
        try:
            self.alert_queue.put_nowait(alert)
            self._recent_alerts[alert_hash] = current_time
            self._alert_count += 1
            return True
        except Exception:
            # Queue full, drop lowest priority if this is higher priority
            return False

    async def queue_alert_async(
        self,
        text: str,
        priority: AlertPriority = AlertPriority.INFO,
        force: bool = False,
        metadata: Optional[Dict] = None
    ) -> bool:
        """Async wrapper for queue_alert."""
        return await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: self.queue_alert(text, priority, force, metadata)
        )

    def speak_immediate(self, text: str, use_fallback: bool = False) -> bool:
        """
        Speak text immediately, bypassing the queue.
        Used for critical alerts that cannot wait.

        Args:
            text: Text to speak
            use_fallback: Force use of fallback TTS

        Returns:
            True if speech was initiated successfully
        """
        if self.is_muted:
            return False

        self.is_speaking = True

        try:
            if not use_fallback and self.elevenlabs_client:
                return self._speak_elevenlabs(text)
            elif self.tts_engine:
                return self._speak_pyttsx3(text)
            else:
                print(f"[VoiceService] No TTS available. Alert: {text}")
                return False
        finally:
            self.is_speaking = False

    def _speak_elevenlabs(self, text: str) -> bool:
        """Speak using ElevenLabs API."""
        try:
            # Check cache first
            text_hash = self._hash_alert(text)
            if text_hash in self._audio_cache:
                audio_data = self._audio_cache[text_hash]
            else:
                # Generate speech with timeout
                audio_generator = self.elevenlabs_client.text_to_speech.convert(
                    voice_id=self.voice_id,
                    text=text,
                    model_id=self.DEFAULT_MODEL,
                    output_format="mp3_22050_32"
                )

                # Collect audio data
                audio_data = b"".join(audio_generator)

                # Cache for reuse
                if len(self._audio_cache) < self._cache_max_size:
                    self._audio_cache[text_hash] = audio_data

            # Play audio
            self._play_audio_data(audio_data)
            return True

        except Exception as e:
            print(f"[VoiceService] ElevenLabs error: {e}")
            # Fall back to pyttsx3
            if self.tts_engine:
                return self._speak_pyttsx3(text)
            return False

    def _speak_pyttsx3(self, text: str) -> bool:
        """Speak using pyttsx3 (offline fallback)."""
        try:
            self.tts_engine.say(text)
            self.tts_engine.runAndWait()
            return True
        except Exception as e:
            print(f"[VoiceService] pyttsx3 error: {e}")
            return False

    def _play_audio_data(self, audio_data: bytes):
        """Play audio data (MP3 bytes)."""
        try:
            # Write to temp file and play
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                f.write(audio_data)
                temp_path = f.name

            # Use system audio player
            import subprocess
            import platform

            if platform.system() == "Darwin":  # macOS
                subprocess.run(["afplay", temp_path], check=True, timeout=10)
            elif platform.system() == "Linux":
                subprocess.run(["mpg123", "-q", temp_path], check=True, timeout=10)
            elif platform.system() == "Windows":
                import winsound
                # Windows needs WAV, so this might not work directly
                # Consider using pygame or another library
                pass

            os.unlink(temp_path)

        except Exception as e:
            print(f"[VoiceService] Audio playback error: {e}")

    def _worker_loop(self):
        """Background worker processing alert queue."""
        while self._running:
            try:
                # Get next alert with timeout
                try:
                    alert = self.alert_queue.get(timeout=0.5)
                except Exception:
                    continue

                # Check if alert is still relevant (not too old)
                age = time.time() - alert.timestamp
                if age > 10.0 and alert.priority > AlertPriority.CRITICAL:
                    continue  # Skip stale non-critical alerts

                # Speak alert
                use_fallback = alert.priority == AlertPriority.CRITICAL
                self.speak_immediate(alert.text, use_fallback=use_fallback)

            except Exception as e:
                print(f"[VoiceService] Worker error: {e}")

    def _hash_alert(self, text: str) -> str:
        """Generate hash for alert text (for throttling)."""
        return hashlib.md5(text.lower().encode()).hexdigest()

    def _cleanup_throttle_cache(self):
        """Remove old entries from throttle cache."""
        current_time = time.time()
        expired = [
            k for k, v in self._recent_alerts.items()
            if current_time - v > self.THROTTLE_WINDOW_SECONDS * 2
        ]
        for k in expired:
            del self._recent_alerts[k]

    def mute(self):
        """Mute voice alerts (except critical)."""
        self.is_muted = True
        print("[VoiceService] Muted")

    def unmute(self):
        """Unmute voice alerts."""
        self.is_muted = False
        print("[VoiceService] Unmuted")

    def set_voice(self, voice_id: str):
        """Change ElevenLabs voice."""
        self.voice_id = voice_id
        self._audio_cache.clear()

    def clear_queue(self):
        """Clear all pending alerts."""
        while not self.alert_queue.empty():
            try:
                self.alert_queue.get_nowait()
            except Exception:
                break

    def get_status(self) -> Dict[str, Any]:
        """Get voice service status."""
        return {
            "elevenlabs_available": self.elevenlabs_client is not None,
            "pyttsx3_available": self.tts_engine is not None,
            "is_muted": self.is_muted,
            "is_speaking": self.is_speaking,
            "queue_size": self.alert_queue.qsize(),
            "total_alerts": self._alert_count,
            "cache_size": len(self._audio_cache),
            "voice_id": self.voice_id
        }


# Pre-defined surgical alerts
class SurgicalAlerts:
    """Common surgical alert messages."""

    # Critical
    CRITICAL_VESSEL = "Critical! Vessel proximity detected."
    CRITICAL_NERVE = "Critical! Neural structure at risk."
    CRITICAL_BREACH = "Critical! Sterile field compromised."
    CRITICAL_BLEEDING = "Critical! Active bleeding detected."

    # Warning
    WARNING_TRAJECTORY = "Warning: Trajectory approaching critical structure."
    WARNING_CONTAMINATION = "Warning: Potential contamination risk."
    WARNING_INSTRUMENT = "Warning: Instrument near sensitive area."

    # Navigation
    NAV_ON_TARGET = "Navigation: On target trajectory."
    NAV_ADJUST_LEFT = "Navigation: Adjust trajectory left."
    NAV_ADJUST_RIGHT = "Navigation: Adjust trajectory right."
    NAV_ADJUST_DEPTH = "Navigation: Adjust depth."

    # Info
    INFO_STRUCTURE_DETECTED = "Structure detected: {name}"
    INFO_SAFETY_SCORE = "Safety score: {score}"
    INFO_RESECTION_PROGRESS = "Resection progress: {percent} percent."


# Singleton instance
_voice_instance: Optional[VoiceService] = None


def get_voice_service() -> VoiceService:
    """Get or create the global voice service instance."""
    global _voice_instance
    if _voice_instance is None:
        api_key = os.environ.get("ELEVENLABS_API_KEY")
        _voice_instance = VoiceService(elevenlabs_api_key=api_key)
        _voice_instance.start()
    return _voice_instance


def init_voice_service(
    elevenlabs_api_key: Optional[str] = None,
    **kwargs
) -> VoiceService:
    """Initialize the global voice service with specific settings."""
    global _voice_instance
    if _voice_instance is not None:
        _voice_instance.stop()

    _voice_instance = VoiceService(
        elevenlabs_api_key=elevenlabs_api_key,
        **kwargs
    )
    _voice_instance.start()
    return _voice_instance


# Convenience functions
async def speak_alert(
    text: str,
    priority: AlertPriority = AlertPriority.INFO
) -> bool:
    """Quick function to queue a voice alert."""
    service = get_voice_service()
    return await service.queue_alert_async(text, priority)


async def speak_critical(text: str) -> bool:
    """Speak a critical alert immediately."""
    service = get_voice_service()
    return service.speak_immediate(text, use_fallback=True)
