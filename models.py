"""
FitForm AI — SQLAlchemy Models (MySQL)
"""
from datetime import datetime
from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(80),  nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

    # Body metrics
    weight_kg  = db.Column(db.Float, nullable=True)
    height_cm  = db.Column(db.Float, nullable=True)
    age        = db.Column(db.Integer, nullable=True)
    gender     = db.Column(db.String(10), nullable=True)  # male / female

    # Goals & onboarding
    fitness_goal    = db.Column(db.String(50), nullable=True)   # lose_weight / build_muscle / maintain / balance / bulking
    activity_level  = db.Column(db.String(50), nullable=True)   # sedentary / light / moderate / active / very_active
    onboarding_done = db.Column(db.Boolean, default=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workout_sessions = db.relationship('WorkoutSession', backref='user', lazy=True, cascade='all, delete-orphan')
    chat_messages    = db.relationship('ChatMessage',    backref='user', lazy=True, cascade='all, delete-orphan')
    user_exercises   = db.relationship('UserExercise',   backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def bmi(self):
        if self.weight_kg and self.height_cm and self.height_cm > 0:
            h = self.height_cm / 100
            return round(self.weight_kg / (h * h), 1)
        return None

    def bmi_category(self):
        bmi = self.bmi()
        if bmi is None:
            return 'Unknown'
        if bmi < 18.5:
            return 'Underweight'
        if bmi < 25:
            return 'Normal'
        if bmi < 30:
            return 'Overweight'
        return 'Obese'

    def to_dict(self):
        return {
            'id':              self.id,
            'username':        self.username,
            'email':           self.email,
            'weight_kg':       self.weight_kg,
            'height_cm':       self.height_cm,
            'age':             self.age,
            'gender':          self.gender,
            'fitness_goal':    self.fitness_goal,
            'activity_level':  self.activity_level,
            'onboarding_done': self.onboarding_done,
            'bmi':             self.bmi(),
            'bmi_category':    self.bmi_category(),
            'created_at':      self.created_at.isoformat() if self.created_at else None,
        }


class Exercise(db.Model):
    __tablename__ = 'exercises'

    id               = db.Column(db.Integer, primary_key=True)
    name             = db.Column(db.String(100), nullable=False)
    category         = db.Column(db.String(50),  nullable=False)  # Chest / Back / Legs / Arms / Core / Cardio
    difficulty       = db.Column(db.String(20),  nullable=False)  # Beginner / Intermediate / Advanced
    muscles          = db.Column(db.Text,         nullable=True)   # JSON list stored as string
    calories_per_min = db.Column(db.Float,        default=5.0)
    ai_supported     = db.Column(db.Boolean,      default=False)
    description      = db.Column(db.Text,         nullable=True)

    # Goal tags — comma-separated e.g. "lose_weight,maintain"
    goal_tags        = db.Column(db.String(200),  nullable=True)

    def to_dict(self):
        import json
        try:
            muscles = json.loads(self.muscles) if self.muscles else []
        except Exception:
            muscles = [m.strip() for m in (self.muscles or '').split(',')]
        return {
            'id':               self.id,
            'name':             self.name,
            'category':         self.category,
            'difficulty':       self.difficulty,
            'muscles':          muscles,
            'calories_per_min': self.calories_per_min,
            'ai_supported':     self.ai_supported,
            'description':      self.description,
            'goal_tags':        (self.goal_tags or '').split(','),
        }


class UserExercise(db.Model):
    """Exercises assigned to a user based on their goal."""
    __tablename__ = 'user_exercises'

    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'), nullable=False)
    sets        = db.Column(db.Integer, default=3)
    reps        = db.Column(db.String(20), default='10-12')  # e.g. "10-12" or "30 sec"
    rest_secs   = db.Column(db.Integer, default=60)
    day_of_week = db.Column(db.String(20), nullable=True)   # Monday / Tuesday / etc.
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)

    exercise = db.relationship('Exercise', backref='assignments')

    def to_dict(self):
        return {
            'id':          self.id,
            'user_id':     self.user_id,
            'exercise':    self.exercise.to_dict() if self.exercise else None,
            'sets':        self.sets,
            'reps':        self.reps,
            'rest_secs':   self.rest_secs,
            'day_of_week': self.day_of_week,
        }


class WorkoutSession(db.Model):
    __tablename__ = 'workout_sessions'

    id               = db.Column(db.Integer, primary_key=True)
    user_id          = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    exercise_id      = db.Column(db.Integer, db.ForeignKey('exercises.id'), nullable=True)
    exercise_name    = db.Column(db.String(100), nullable=True)
    duration_seconds = db.Column(db.Integer, default=0)
    reps             = db.Column(db.Integer, default=0)
    sets             = db.Column(db.Integer, default=0)
    calories_burned  = db.Column(db.Float,   default=0)
    form_score       = db.Column(db.Float,   default=0)
    notes            = db.Column(db.Text,    nullable=True)
    started_at       = db.Column(db.DateTime, default=datetime.utcnow)

    exercise = db.relationship('Exercise', backref='sessions')

    def to_dict(self):
        return {
            'id':               self.id,
            'user_id':          self.user_id,
            'exercise_name':    self.exercise_name or (self.exercise.name if self.exercise else 'Unknown'),
            'duration_seconds': self.duration_seconds,
            'reps':             self.reps,
            'sets':             self.sets,
            'calories_burned':  self.calories_burned,
            'form_score':       self.form_score,
            'notes':            self.notes,
            'started_at':       self.started_at.isoformat() if self.started_at else None,
        }


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role       = db.Column(db.String(10), nullable=False)   # 'user' or 'assistant'
    content    = db.Column(db.Text,      nullable=False)
    created_at = db.Column(db.DateTime,  default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':         self.id,
            'role':       self.role,
            'content':    self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
