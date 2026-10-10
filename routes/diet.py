from flask import Blueprint, request, jsonify

diet_bp = Blueprint('diet', __name__)

@diet_bp.route('/plan', methods=['GET'])
def get_plan():
    return jsonify({
        'plan_name': 'Muscle Building Plan',
        'daily_calories': 3000,
        'protein_g': 200,
        'carbs_g': 350,
        'fats_g': 80,
        'meals': []
    })

@diet_bp.route('/generate', methods=['POST'])
def generate_plan():
    return jsonify({
        'plan_name': 'Muscle Building Plan',
        'daily_calories': 3000,
        'protein_g': 200,
        'carbs_g': 350,
        'fats_g': 80,
        'meals': [
            {'time': '7:00 AM', 'name': 'Breakfast', 'items': ['5 egg omelette', 'Whole grain toast', 'Banana']},
            {'time': '10:00 AM', 'name': 'Snack', 'items': ['Protein shake', 'Rice cakes']},
            {'time': '1:00 PM', 'name': 'Lunch', 'items': ['Grilled chicken', 'Brown rice', 'Broccoli']},
            {'time': '4:00 PM', 'name': 'Pre-Workout', 'items': ['Banana', 'Oats', 'Creatine']},
            {'time': '7:00 PM', 'name': 'Dinner', 'items': ['Salmon fillet', 'Sweet potato', 'Salad']}
        ]
    })