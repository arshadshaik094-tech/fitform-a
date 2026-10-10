"""
FitForm AI — Exercises Routes (Real MySQL)
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

exercises_bp = Blueprint('exercises', __name__)


@exercises_bp.route('/', methods=['GET'])
@jwt_required()
def get_exercises():
    from models import Exercise
    category   = request.args.get('category')
    difficulty = request.args.get('difficulty')

    q = Exercise.query
    if category:
        q = q.filter_by(category=category)
    if difficulty:
        q = q.filter_by(difficulty=difficulty)

    exercises = q.order_by(Exercise.category, Exercise.name).all()
    return jsonify([ex.to_dict() for ex in exercises])


@exercises_bp.route('/suggested', methods=['GET'])
@jwt_required()
def get_suggested():
    """Return exercises tailored to the current user's goal."""
    from models import Exercise, User

    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    goal    = (user.fitness_goal if user else None) or 'maintain'

    exercises = Exercise.query.filter(
        Exercise.goal_tags.contains(goal)
    ).limit(6).all()

    if not exercises:
        exercises = Exercise.query.limit(6).all()

    return jsonify([ex.to_dict() for ex in exercises])


@exercises_bp.route('/assigned', methods=['GET'])
@jwt_required()
def get_assigned():
    """Return the exercises assigned to the current user (from onboarding)."""
    from models import UserExercise

    user_id    = int(get_jwt_identity())
    day        = request.args.get('day')  # optional filter

    q = UserExercise.query.filter_by(user_id=user_id)
    if day:
        q = q.filter_by(day_of_week=day)

    assigned = q.order_by(UserExercise.day_of_week, UserExercise.id).all()
    return jsonify([ue.to_dict() for ue in assigned])
