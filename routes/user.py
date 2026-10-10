"""
FitForm AI — User / Profile Routes (Real MySQL)
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db

user_bp = Blueprint('user', __name__)


@user_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    from models import User
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict())


@user_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    from models import User
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    allowed = ['username', 'weight_kg', 'height_cm', 'age', 'gender',
               'fitness_goal', 'activity_level']
    for field in allowed:
        if field in data:
            setattr(user, field, data[field])

    db.session.commit()
    return jsonify(user.to_dict())


@user_bp.route('/onboarding', methods=['POST'])
@jwt_required()
def complete_onboarding():
    """
    Called after the AI chatbot onboarding flow completes.
    Saves all onboarding data, calculates BMI/calories/protein,
    then assigns exercises based on the goal.
    """
    from models import User, Exercise, UserExercise

    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}

    # Map frontend field names to database fields
    field_mapping = {
        'age': 'age',
        'gender': 'gender',
        'height_cm': 'height_cm',
        'weight_kg': 'weight_kg',
        'goal': 'fitness_goal',
        'target_weight_kg': 'target_weight_kg',
        'experience': 'experience_level',
        'days_per_week': 'days_per_week',
        'location': 'workout_location',
        'activity': 'activity_level',
        'diet': 'diet_preference',
        'limitations': 'limitations'
    }

    # Persist profile fields
    for frontend_key, db_field in field_mapping.items():
        if frontend_key in data:
            setattr(user, db_field, data[frontend_key])

    user.onboarding_done = True

    # Calculate BMI, calories, protein
    height_cm = data.get('height_cm', user.height_cm or 170)
    weight_kg = data.get('weight_kg', user.weight_kg or 70)
    age = data.get('age', user.age or 25)
    gender = data.get('gender', user.gender or 'male')
    goal = data.get('goal', 'maintain')
    activity = data.get('activity', 'moderate')
    days_per_week = data.get('days_per_week', 3)

    # BMI calculation
    bmi = round(weight_kg / ((height_cm / 100) ** 2), 1)
    
    # BMI label
    if bmi < 18.5:
        bmi_label = "underweight"
    elif bmi < 25:
        bmi_label = "healthy"
    elif bmi < 30:
        bmi_label = "overweight"
    else:
        bmi_label = "obese"

    # TDEE calculation (Mifflin-St Jeor)
    if gender == 'male':
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

    # Activity multiplier
    activity_multipliers = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'high': 1.725
    }
    tdee = bmr * activity_multipliers.get(activity, 1.55)

    # Goal adjustment
    goal_adjustments = {
        'lose': -0.2,      # 20% deficit
        'muscle': 0.1,     # 10% surplus
        'tone': 0.0,       # maintenance
        'endurance': 0.05  # slight surplus
    }
    adjustment = goal_adjustments.get(goal, 0.0)
    
    # Don't suggest deficit for under-18s
    if age < 18 and adjustment < 0:
        adjustment = 0.0

    calories = max(1200, int(round((tdee * (1 + adjustment)) / 10.0) * 10))
    
    # Protein calculation (g/kg bodyweight)
    protein_per_kg = 2.0 if goal in ('lose', 'muscle') else 1.6
    protein = int(weight_kg * protein_per_kg)

    # Workout split based on days
    split_map = {
        2: "Full Body",
        3: "Upper/Lower",
        4: "Upper/Lower",
        5: "Push/Pull/Legs",
        6: "Push/Pull/Legs"
    }
    split = split_map.get(days_per_week, "Full Body")

    # Clear any existing assigned exercises for this user
    UserExercise.query.filter_by(user_id=user.id).delete()

    # Assign exercises based on goal
    goal_tag_map = {
        'lose': 'lose_weight',
        'muscle': 'build_muscle',
        'tone': 'maintain',
        'endurance': 'maintain'
    }
    goal_tag = goal_tag_map.get(goal, 'maintain')
    
    exercises = Exercise.query.filter(
        Exercise.goal_tags.contains(goal_tag)
    ).limit(12).all()

    # Fallback: use all exercises if nothing matched
    if not exercises:
        exercises = Exercise.query.limit(8).all()

    # Spread exercises across workout days
    workout_days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][:days_per_week]

    for idx, ex in enumerate(exercises):
        day = workout_days[idx % len(workout_days)]
        
        # Adjust sets/reps by goal
        if goal == 'lose':
            sets, reps, rest = 3, '15-20', 30
        elif goal in ('muscle',):
            sets, reps, rest = 4, '8-12', 90
        elif goal == 'endurance':
            sets, reps, rest = 3, '12-15', 45
        else:  # tone/maintain
            sets, reps, rest = 3, '10-15', 60

        ue = UserExercise(
            user_id=user.id,
            exercise_id=ex.id,
            sets=sets,
            reps=reps,
            rest_secs=rest,
            day_of_week=day,
        )
        db.session.add(ue)

    db.session.commit()

    return jsonify({
        'ok': True,
        'bmi': bmi,
        'bmi_label': bmi_label,
        'calories': calories,
        'protein': protein,
        'split': split,
        'exercises_assigned': len(exercises)
    })
