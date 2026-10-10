"""
FitForm AI — Pose Detection Service
Uses MediaPipe + OpenCV to detect exercise form in real-time.
"""
import cv2
import mediapipe as mp
import numpy as np
import base64
import json
from typing import Optional

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles


# ─── Angle Calculation ───────────────────────────────────────────────────────

def calculate_angle(a: list, b: list, c: list) -> float:
    """Calculate the angle at point B between vectors BA and BC."""
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - \
              np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    return angle if angle <= 180 else 360 - angle


# ─── Form Checkers ───────────────────────────────────────────────────────────

EXERCISE_RULES = {
    "squat": {
        "landmarks": [
            mp_pose.PoseLandmark.LEFT_HIP,
            mp_pose.PoseLandmark.LEFT_KNEE,
            mp_pose.PoseLandmark.LEFT_ANKLE,
        ],
        "rules": [
            {"name": "knee_angle", "min": 70, "max": 170,
             "feedback_low": "Go deeper into your squat!",
             "feedback_high": "You're not squatting deep enough."},
        ],
    },
    "pushup": {
        "landmarks": [
            mp_pose.PoseLandmark.LEFT_SHOULDER,
            mp_pose.PoseLandmark.LEFT_ELBOW,
            mp_pose.PoseLandmark.LEFT_WRIST,
        ],
        "rules": [
            {"name": "elbow_angle", "min": 70, "max": 180,
             "feedback_low": "Lower your chest to the floor!",
             "feedback_high": "Great extension — now lower down!"},
        ],
    },
    "bicep_curl": {
        "landmarks": [
            mp_pose.PoseLandmark.LEFT_SHOULDER,
            mp_pose.PoseLandmark.LEFT_ELBOW,
            mp_pose.PoseLandmark.LEFT_WRIST,
        ],
        "rules": [
            {"name": "curl_angle", "min": 30, "max": 160,
             "feedback_low": "Curl up fully!",
             "feedback_high": "Lower the weight fully!"},
        ],
    },
    "plank": {
        "landmarks": [
            mp_pose.PoseLandmark.LEFT_SHOULDER,
            mp_pose.PoseLandmark.LEFT_HIP,
            mp_pose.PoseLandmark.LEFT_ANKLE,
        ],
        "rules": [
            {"name": "body_line", "min": 160, "max": 185,
             "feedback_low": "Raise your hips — keep body straight!",
             "feedback_high": "Lower your hips — keep body straight!"},
        ],
    },
}


class PoseAnalyzer:
    def __init__(self):
        self.pose = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.6,
            min_tracking_confidence=0.6,
        )
        self.rep_counter = {}
        self.rep_stage = {}

    def analyze_frame(self, frame_bytes: bytes, exercise: str) -> dict:
        """Decode a JPEG frame, run pose, return JSON result."""
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"error": "Could not decode frame"}

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb)

        if not results.pose_landmarks:
            return {"detected": False, "feedback": "No pose detected — step back!"}

        landmarks = results.pose_landmarks.landmark
        output = self._check_form(landmarks, exercise, frame)

        # Draw skeleton
        annotated = frame.copy()
        mp_drawing.draw_landmarks(
            annotated,
            results.pose_landmarks,
            mp_pose.POSE_CONNECTIONS,
            landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style(),
        )

        _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 75])
        output["frame"] = base64.b64encode(buffer).decode("utf-8")
        return output

    def _check_form(self, landmarks, exercise: str, frame) -> dict:
        h, w = frame.shape[:2]
        result = {"detected": True, "exercise": exercise, "feedback": [], "form_score": 100, "reps": 0}

        rules_def = EXERCISE_RULES.get(exercise)
        if not rules_def:
            result["feedback"].append("Exercise not recognized.")
            return result

        lm_indices = rules_def["landmarks"]
        pts = [[landmarks[lm.value].x * w, landmarks[lm.value].y * h] for lm in lm_indices]
        angle = calculate_angle(*pts)

        for rule in rules_def["rules"]:
            if angle < rule["min"]:
                result["feedback"].append(rule["feedback_low"])
                result["form_score"] -= 20
            elif angle > rule["max"]:
                result["feedback"].append(rule["feedback_high"])
                result["form_score"] -= 10

        # Rep counting
        key = exercise
        if key not in self.rep_stage:
            self.rep_stage[key] = None
            self.rep_counter[key] = 0

        if angle > 160:
            self.rep_stage[key] = "up"
        if angle < 90 and self.rep_stage[key] == "up":
            self.rep_stage[key] = "down"
            self.rep_counter[key] += 1

        result["reps"] = self.rep_counter[key]
        result["angle"] = round(angle, 1)
        result["form_score"] = max(0, result["form_score"])
        if not result["feedback"]:
            result["feedback"].append("Great form! Keep it up 💪")
        return result

    def reset_reps(self, exercise: str):
        self.rep_counter[exercise] = 0
        self.rep_stage[exercise] = None


# ─── Socket Events ────────────────────────────────────────────────────────────

_analyzer = PoseAnalyzer()


def register_socket_events(socketio):
    @socketio.on("connect")
    def on_connect():
        print("[Socket] Client connected")

    @socketio.on("disconnect")
    def on_disconnect():
        print("[Socket] Client disconnected")

    @socketio.on("frame")
    def on_frame(data):
        """Receive base64 frame + exercise name, emit analysis result."""
        try:
            exercise = data.get("exercise", "squat")
            raw = base64.b64decode(data["frame"])
            result = _analyzer.analyze_frame(raw, exercise)
            socketio.emit("analysis", result)
        except Exception as e:
            socketio.emit("analysis", {"error": str(e)})

    @socketio.on("reset_reps")
    def on_reset(data):
        exercise = data.get("exercise", "squat")
        _analyzer.reset_reps(exercise)
        socketio.emit("reps_reset", {"exercise": exercise})
