"""
FitForm AI — Flask Backend
"""
import os
import pymysql
from flask import Flask, redirect
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from extensions import db, socketio

load_dotenv()

# Tell SQLAlchemy to use PyMySQL as the MySQL driver
pymysql.install_as_MySQLdb()


def create_app():
    app = Flask(__name__, static_folder='.', static_url_path='')

    # ── Config ──────────────────────────────────────────────────────────────
    app.config["SECRET_KEY"]    = os.getenv("SECRET_KEY",    "fitform-dev-secret-change-me")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "jwt-dev-secret")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 86400  # 24 hours instead of 15 minutes

    # MySQL connection  (password contains a space so we pass it via env/hardcode)
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASS = os.getenv("DB_PASS", "thunder thor69")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "fitform")

    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        "?charset=utf8mb4"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 280,
        "pool_pre_ping": True,
    }

    # ── Extensions ──────────────────────────────────────────────────────────
    CORS(app, resources={r"/*": {"origins": "*"}})
    db.init_app(app)
    JWTManager(app)
    socketio.init_app(app)

    # ── Blueprints ──────────────────────────────────────────────────────────
    from routes.auth      import auth_bp
    from routes.user      import user_bp
    from routes.workout   import workout_bp
    from routes.diet      import diet_bp
    from routes.chatbot   import chatbot_bp
    from routes.exercises import exercises_bp
    from routes.tts       import tts_bp

    app.register_blueprint(auth_bp,      url_prefix="/api/auth")
    app.register_blueprint(user_bp,      url_prefix="/api/user")
    app.register_blueprint(workout_bp,   url_prefix="/api/workout")
    app.register_blueprint(diet_bp,      url_prefix="/api/diet")
    app.register_blueprint(chatbot_bp,   url_prefix="/api/chat")
    app.register_blueprint(exercises_bp, url_prefix="/api/exercises")
    app.register_blueprint(tts_bp,       url_prefix="/api/tts")

    # ── DB init + seed ───────────────────────────────────────────────────────
    with app.app_context():
        try:
            # Import models so SQLAlchemy knows about the tables before create_all
            import models  # noqa: F401
            db.create_all()
            _seed_exercises()
        except Exception as e:
            print(f"⚠️  DB init warning: {e}")
            print("   → Make sure MySQL is running: open MySQL80 service or run 'mysqld'")

    # ── Static routes ────────────────────────────────────────────────────────
    @app.route('/')
    def index():
        resp = app.send_static_file('login.html')
        resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate'
        return resp

    @app.route('/dashboard')
    def dashboard():
        resp = app.send_static_file('index.html')
        resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate'
        return resp

    @app.route('/onboarding')
    def onboarding():
        resp = app.send_static_file('onboarding.html')
        resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate'
        return resp

    return app


def _seed_exercises():
    """Populate the exercises table on first run."""
    from models import Exercise
    if Exercise.query.count() > 0:
        return   # already seeded

    import json
    exercises = [
        # ── Weight Loss ────────────────────────────────────────────────────
        {"name": "Jumping Jacks",      "category": "Cardio",  "difficulty": "Beginner",     "muscles": json.dumps(["Full Body"]),                   "calories_per_min": 10, "ai_supported": False, "description": "Classic full-body cardio warm-up.",               "goal_tags": "lose_weight,maintain"},
        {"name": "Burpees",            "category": "Cardio",  "difficulty": "Intermediate", "muscles": json.dumps(["Full Body", "Core"]),            "calories_per_min": 14, "ai_supported": False, "description": "High-intensity fat-burning compound movement.",     "goal_tags": "lose_weight"},
        {"name": "Mountain Climbers",  "category": "Core",    "difficulty": "Intermediate", "muscles": json.dumps(["Core", "Shoulders", "Quads"]),   "calories_per_min": 11, "ai_supported": False, "description": "Cardio-core combo for calorie burn.",              "goal_tags": "lose_weight,maintain"},
        {"name": "Jump Rope",          "category": "Cardio",  "difficulty": "Beginner",     "muscles": json.dumps(["Calves", "Shoulders"]),          "calories_per_min": 13, "ai_supported": False, "description": "Great cardio for burning calories fast.",          "goal_tags": "lose_weight"},
        {"name": "High Knees",         "category": "Cardio",  "difficulty": "Beginner",     "muscles": json.dumps(["Quads", "Core"]),                "calories_per_min": 10, "ai_supported": False, "description": "Running in place with high knee drive.",           "goal_tags": "lose_weight,maintain"},
        # ── Build Muscle / Bulking ─────────────────────────────────────────
        {"name": "Squat",              "category": "Legs",    "difficulty": "Beginner",     "muscles": json.dumps(["Quads", "Glutes", "Hamstrings"]),"calories_per_min": 8,  "ai_supported": True,  "description": "King of lower body compound lifts.",               "goal_tags": "build_muscle,bulking,maintain"},
        {"name": "Deadlift",           "category": "Back",    "difficulty": "Intermediate", "muscles": json.dumps(["Hamstrings", "Glutes", "Back"]), "calories_per_min": 10, "ai_supported": False, "description": "Full posterior chain builder.",                    "goal_tags": "build_muscle,bulking"},
        {"name": "Bench Press",        "category": "Chest",   "difficulty": "Intermediate", "muscles": json.dumps(["Chest", "Triceps", "Shoulders"]),"calories_per_min": 7,  "ai_supported": False, "description": "Primary chest and upper body push.",               "goal_tags": "build_muscle,bulking"},
        {"name": "Pull-Up",            "category": "Back",    "difficulty": "Intermediate", "muscles": json.dumps(["Lats", "Biceps", "Core"]),       "calories_per_min": 9,  "ai_supported": False, "description": "Best vertical pull for back width.",               "goal_tags": "build_muscle,bulking,maintain"},
        {"name": "Overhead Press",     "category": "Shoulders","difficulty":"Intermediate", "muscles": json.dumps(["Shoulders", "Triceps"]),         "calories_per_min": 7,  "ai_supported": False, "description": "Builds shoulder mass and core stability.",         "goal_tags": "build_muscle,bulking"},
        {"name": "Barbell Row",        "category": "Back",    "difficulty": "Intermediate", "muscles": json.dumps(["Lats", "Rhomboids", "Biceps"]),  "calories_per_min": 8,  "ai_supported": False, "description": "Horizontal pull for back thickness.",              "goal_tags": "build_muscle,bulking"},
        # ── Beginner / General ─────────────────────────────────────────────
        {"name": "Push-Up",            "category": "Chest",   "difficulty": "Beginner",     "muscles": json.dumps(["Chest", "Triceps", "Shoulders"]),"calories_per_min": 7,  "ai_supported": True,  "description": "Fundamental upper body push movement.",            "goal_tags": "build_muscle,maintain,lose_weight,balance,bulking"},
        {"name": "Plank",              "category": "Core",    "difficulty": "Beginner",     "muscles": json.dumps(["Core", "Shoulders"]),            "calories_per_min": 5,  "ai_supported": True,  "description": "Core stability and endurance hold.",               "goal_tags": "maintain,balance,lose_weight,build_muscle"},
        {"name": "Bicep Curl",         "category": "Arms",    "difficulty": "Beginner",     "muscles": json.dumps(["Biceps"]),                       "calories_per_min": 4,  "ai_supported": True,  "description": "Classic arm isolation exercise.",                  "goal_tags": "build_muscle,bulking,maintain"},
        {"name": "Tricep Dip",         "category": "Arms",    "difficulty": "Beginner",     "muscles": json.dumps(["Triceps", "Chest"]),             "calories_per_min": 6,  "ai_supported": False, "description": "Bodyweight tricep builder.",                       "goal_tags": "build_muscle,maintain"},
        {"name": "Lunges",             "category": "Legs",    "difficulty": "Beginner",     "muscles": json.dumps(["Quads", "Glutes", "Hamstrings"]),"calories_per_min": 7,  "ai_supported": False, "description": "Unilateral leg strength and balance.",             "goal_tags": "lose_weight,maintain,balance"},
        {"name": "Glute Bridge",       "category": "Legs",    "difficulty": "Beginner",     "muscles": json.dumps(["Glutes", "Hamstrings"]),         "calories_per_min": 5,  "ai_supported": False, "description": "Glute activation and lower back relief.",          "goal_tags": "maintain,balance,lose_weight"},
        # ── Balance / Flexibility ──────────────────────────────────────────
        {"name": "Yoga Tree Pose",     "category": "Balance", "difficulty": "Beginner",     "muscles": json.dumps(["Core", "Calves", "Hip Flexors"]),"calories_per_min": 3,  "ai_supported": False, "description": "Single-leg balance for stability.",                "goal_tags": "balance"},
        {"name": "Bird Dog",           "category": "Core",    "difficulty": "Beginner",     "muscles": json.dumps(["Core", "Back", "Glutes"]),       "calories_per_min": 4,  "ai_supported": False, "description": "Anti-rotation core exercise for balance.",         "goal_tags": "balance,maintain"},
        {"name": "Side Plank",         "category": "Core",    "difficulty": "Intermediate", "muscles": json.dumps(["Obliques", "Core", "Shoulders"]),"calories_per_min": 5,  "ai_supported": False, "description": "Lateral core stability movement.",                 "goal_tags": "balance,maintain,lose_weight"},
        {"name": "Romanian Deadlift",  "category": "Legs",    "difficulty": "Intermediate", "muscles": json.dumps(["Hamstrings", "Glutes", "Back"]), "calories_per_min": 8,  "ai_supported": False, "description": "Hip hinge for hamstring strength.",                "goal_tags": "build_muscle,bulking,balance"},
        {"name": "Cable Fly",          "category": "Chest",   "difficulty": "Intermediate", "muscles": json.dumps(["Chest", "Shoulders"]),           "calories_per_min": 6,  "ai_supported": False, "description": "Isolation chest exercise for definition.",         "goal_tags": "build_muscle,bulking"},
        {"name": "Leg Press",          "category": "Legs",    "difficulty": "Beginner",     "muscles": json.dumps(["Quads", "Glutes"]),              "calories_per_min": 7,  "ai_supported": False, "description": "Machine quad and glute builder.",                  "goal_tags": "build_muscle,bulking,lose_weight"},
        {"name": "Lat Pulldown",       "category": "Back",    "difficulty": "Beginner",     "muscles": json.dumps(["Lats", "Biceps"]),               "calories_per_min": 7,  "ai_supported": False, "description": "Cable pull for back width.",                       "goal_tags": "build_muscle,bulking,maintain"},
    ]

    for data in exercises:
        ex = Exercise(**data)
        db.session.add(ex)
    db.session.commit()
    print(f"✅ Seeded {len(exercises)} exercises to database")


if __name__ == "__main__":
    app = create_app()
    print("🚀 FitForm AI running on http://localhost:3000")
    socketio.run(app, host="0.0.0.0", port=3000, debug=True)
