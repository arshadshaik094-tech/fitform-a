"""
FitForm AI — TTS routes (Speaker engine from reg/tts.py, adapted for Flask Blueprint).
Endpoints:
  POST /api/tts/speak          { "text": "..." } → { "ok": true, "id": N, "text": "..." }
  GET  /api/tts/progress?id=N  → { "started", "done", "frac", "events", "error" }
  POST /api/tts/stop           → 204
"""
import itertools
import os
import queue
import re
import threading
import time

from flask import Blueprint, request, jsonify

tts_bp = Blueprint("tts", __name__)

# ── pyttsx3 ──────────────────────────────────────────────────────────────────
try:
    import pyttsx3
    _IMPORT_ERROR = None
except Exception as exc:
    pyttsx3 = None
    _IMPORT_ERROR = f"pyttsx3 is not installed ({exc}). Run: pip install pyttsx3"

# ── Text cleaning (copied verbatim from reg/tts.py) ───────────────────────────
_EMOJI = re.compile(
    "["
    "\U0001F000-\U0001FAFF"
    "\U00002600-\U000027BF"
    "\U00002B00-\U00002BFF"
    "\U0001F1E6-\U0001F1FF"
    "\U0000FE00-\U0000FE0F"
    "\U0000200D\U000020E3"
    "]+",
    flags=re.UNICODE,
)

_UNITS = [
    (r"(\d)\s*kcal\b", r"\1 calories"),
    (r"(\d)\s*kgs?\b", r"\1 kilograms"),
    (r"(\d)\s*cm\b", r"\1 centimeters"),
    (r"(\d)\s*(?:lbs?|pounds)\b", r"\1 pounds"),
    (r"(\d)\s*g\b", r"\1 grams"),
    (r"(\d)\s*%", r"\1 percent"),
    (r"\bBMI\b", "body mass index"),
    (r"(\d)\s*[–-]\s*(\d)", r"\1 to \2"),
    (r"\s*[•·→]\s*", ", "),
    (r"\s*&\s*", " and "),
]


def clean_display(text: str) -> str:
    text = _EMOJI.sub("", text)
    text = re.sub(r"[*_#`~]+", "", text)
    return re.sub(r"[ \t]+", " ", text).strip()


def clean_speech(text: str) -> str:
    text = clean_display(text)
    for pattern, repl in _UNITS:
        text = re.sub(pattern, repl, text)
    return re.sub(r"\s+", " ", text).strip()


# ── Voice preference (copied verbatim from reg/tts.py) ────────────────────────
_PREFERRED = [
    "heera", "zira", "aria", "jenny", "hazel", "susan",
    "samantha", "karen", "moira", "daniel", "alex",
    "english",
]


def _pick_voice(engine, hint):
    voices = engine.getProperty("voices") or []
    wanted = ([hint.lower()] if hint else []) + _PREFERRED
    for key in wanted:
        for v in voices:
            if key in (v.name or "").lower() or key in (v.id or "").lower():
                engine.setProperty("voice", v.id)
                return v.name
    if voices:
        engine.setProperty("voice", voices[0].id)
        return voices[0].name
    return "default"


# ── Speaker class (copied verbatim from reg/tts.py) ───────────────────────────
class Speaker:
    def __init__(self, rate=168, voice_hint=None):
        self.rate = rate
        self.voice_hint = voice_hint or os.environ.get("VOICE_NAME")
        self.voice_name = None
        self.error = _IMPORT_ERROR
        self._engine = None
        self._current = None
        self._jobs = {}
        self._ids = itertools.count(1)
        self._last_id = 0
        self._cancel_upto = 0
        self._queue = queue.Queue()
        self._ready = threading.Event()
        threading.Thread(target=self._run, daemon=True).start()
        self._ready.wait(timeout=10)

    def _make_engine(self):
        engine = pyttsx3.init()
        engine.setProperty("rate", self.rate)
        engine.setProperty("volume", 1.0)
        self.voice_name = _pick_voice(engine, self.voice_hint)
        engine.connect("started-word", self._on_word)
        return engine

    def _on_word(self, name, location, length):
        job = self._current
        if not job:
            return
        if job["id"] <= self._cancel_upto:
            try:
                self._engine.stop()
            except Exception:
                pass
            return
        job["events"] = True
        job["frac"] = min(1.0, (location + length) / job["len"])

    def _run(self):
        try:
            import comtypes
            comtypes.CoInitialize()
        except Exception:
            try:
                import pythoncom
                pythoncom.CoInitialize()
            except Exception:
                pass

        if pyttsx3 is not None:
            try:
                self._engine = self._make_engine()
            except Exception as exc:
                self.error = f"Voice engine failed to start: {exc}"
        self._ready.set()

        while True:
            job = self._queue.get()
            if job["id"] <= self._cancel_upto or self.error:
                job["done"] = True
                continue
            self._current = job
            job["t0"] = time.time()
            job["started"] = True
            try:
                self._engine.say(job["speech"], str(job["id"]))
                self._engine.runAndWait()
            except Exception as exc:
                job["error"] = str(exc)
                try:
                    self._engine = self._make_engine()
                except Exception:
                    self.error = "Voice engine stopped working."
            if job["id"] > self._cancel_upto:
                job["frac"] = 1.0
            job["done"] = True
            self._current = None

    def speak(self, text):
        if self.error:
            raise RuntimeError(self.error)
        speech = clean_speech(text)
        jid = next(self._ids)
        job = {
            "id": jid, "speech": speech, "len": max(1, len(speech)),
            "frac": 0.0, "started": False, "done": False,
            "events": False, "error": None, "t0": None,
        }
        self._jobs[jid] = job
        self._last_id = jid
        for old in [k for k in self._jobs if k < jid - 30]:
            self._jobs.pop(old, None)
        self._queue.put(job)
        return jid

    def progress(self, jid):
        job = self._jobs.get(jid)
        if not job:
            return {"done": True, "frac": 1.0, "started": True, "events": False}
        return {
            "started": job["started"], "done": job["done"], "frac": job["frac"],
            "events": job["events"], "error": job["error"],
        }

    def stop(self, upto=None):
        self._cancel_upto = max(self._cancel_upto, upto or self._last_id)
        cur = self._current
        if cur and cur["id"] <= self._cancel_upto:
            try:
                self._engine.stop()
            except Exception:
                pass

    def voices(self):
        try:
            return [v.name for v in self._engine.getProperty("voices")]
        except Exception:
            return []


# Singleton — one engine for the whole app lifetime
speaker = Speaker()


# ── Flask endpoints ───────────────────────────────────────────────────────────
@tts_bp.post("/speak")
def api_speak():
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify(ok=False, error="empty"), 400
    try:
        jid = speaker.speak(text)
        return jsonify(ok=True, id=jid, text=clean_display(text), wpm=speaker.rate)
    except RuntimeError as e:
        return jsonify(ok=False, error=str(e)), 503


@tts_bp.get("/progress")
def api_progress():
    try:
        jid = int(request.args.get("id", 0))
    except (TypeError, ValueError):
        return jsonify(error="bad id"), 400
    return jsonify(speaker.progress(jid))


@tts_bp.post("/stop")
def api_stop():
    body = request.get_json(silent=True) or {}
    upto = body.get("id")
    speaker.stop(upto=int(upto) if upto else None)
    return ("", 204)
