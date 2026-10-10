"""
FitForm AI — Workout Routes (Real MySQL)
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db

workout_bp = Blueprint('workout', __name__)


@workout_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    from models import WorkoutSession
    from sqlalchemy import func

    user_id = int(get_jwt_identity())
    sessions = WorkoutSession.query.filter_by(user_id=user_id).all()

    total_sessions  = len(sessions)
    total_calories  = sum(s.calories_burned or 0 for s in sessions)
    total_reps      = sum(s.reps or 0 for s in sessions)
    avg_form_score  = (
        sum(s.form_score or 0 for s in sessions) / total_sessions
        if total_sessions else 0
    )

    return jsonify({
        'total_sessions': total_sessions,
        'total_calories': round(total_calories, 1),
        'avg_form_score': round(avg_form_score, 1),
        'total_reps':     total_reps,
    })


@workout_bp.route('/sessions', methods=['GET'])
@jwt_required()
def get_sessions():
    from models import WorkoutSession

    user_id  = int(get_jwt_identity())
    limit    = int(request.args.get('limit', 20))
    sessions = (WorkoutSession.query
                .filter_by(user_id=user_id)
                .order_by(WorkoutSession.started_at.desc())
                .limit(limit)
                .all())
    return jsonify([s.to_dict() for s in sessions])


@workout_bp.route('/sessions', methods=['POST'])
@jwt_required()
def create_session():
    from models import WorkoutSession

    user_id = int(get_jwt_identity())
    data    = request.get_json() or {}

    session = WorkoutSession(
        user_id          = user_id,
        exercise_name    = data.get('exercise_name', 'Unknown'),
        exercise_id      = data.get('exercise_id'),
        duration_seconds = data.get('duration_seconds', 0),
        reps             = data.get('reps', 0),
        sets             = data.get('sets', 0),
        calories_burned  = data.get('calories_burned', 0),
        form_score       = data.get('form_score', 0),
        notes            = data.get('notes'),
    )
    db.session.add(session)
    db.session.commit()

    return jsonify({'id': session.id, 'message': 'Session saved successfully'}), 201
