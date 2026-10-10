"""
FitForm AI — Chatbot Routes (Real MySQL)
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db

chatbot_bp = Blueprint('chatbot', __name__)


def _generate_response(message: str, user) -> str:
    """Rule-based fitness AI response (upgrade to GPT later)."""
    msg = message.lower()
    name = (user.username or 'there').split()[0] if user else 'there'
    goal = user.fitness_goal if user else None

    # Goal-specific tips
    goal_tips = {
        'lose_weight': "Focus on cardio (3-5×/week), keep calories in a 300-500 kcal deficit, and hit 1.6g protein/kg bodyweight.",
        'build_muscle': "Lift heavy 4-5×/week with progressive overload, eat in a 200-300 kcal surplus, and get 2g protein/kg bodyweight.",
        'bulking': "Eat in a 400-600 kcal surplus, focus on compound lifts, and aim for 2.2g protein/kg bodyweight.",
        'maintain': "Balance cardio and strength training, eat at maintenance calories, and stay consistent.",
        'balance': "Mix yoga, pilates, and functional training. Focus on stability exercises and core work.",
    }

    if any(w in msg for w in ['squat', 'squats']):
        return ("🏋️ **Squat Tips:** Keep chest up, feet shoulder-width apart, knees tracking over toes. "
                "Lower until thighs are parallel to floor. Drive through heels on the way up. "
                "Use our AI pose detection to get real-time form feedback!")
    if any(w in msg for w in ['push up', 'pushup', 'push-up']):
        return ("💪 **Push-Up Tips:** Hands slightly wider than shoulder-width, body in a straight line. "
                "Lower chest to the floor, elbows at ~45°. Full range of motion for best results.")
    if any(w in msg for w in ['protein', 'diet', 'nutrition', 'eat', 'food', 'macro']):
        return (f"🥩 **Nutrition for {goal or 'your goal'}:** "
                + (goal_tips.get(goal, "Eat whole foods, prioritize protein, and stay hydrated."))
                + " Track macros in the Diet section!")
    if any(w in msg for w in ['bmi', 'weight', 'fat', 'body']):
        bmi = user.bmi() if user else None
        if bmi:
            return f"📊 Your current BMI is **{bmi}** ({user.bmi_category()}). Check the Profile page for full details and recommendations!"
        return "📊 Update your weight and height in the Profile page to calculate your BMI automatically!"
    if any(w in msg for w in ['cardio', 'run', 'running', 'jog', 'hiit']):
        return ("🏃 **Cardio Tips:** Aim for 150-300 mins moderate-intensity or 75-150 mins vigorous cardio per week. "
                "HIIT is great for fat loss — try 20 mins, 3×/week. Steady-state cardio for endurance.")
    if any(w in msg for w in ['rest', 'sleep', 'recovery']):
        return ("😴 **Recovery Tips:** Aim for 7-9 hours of sleep. Rest 48-72 hours between training the same muscle group. "
                "Active recovery (walking, stretching) on rest days is great!")
    if any(w in msg for w in ['goal', 'plan', 'exercise', 'workout', 'training']):
        tip = goal_tips.get(goal, "Stay consistent and progressive!")
        return f"🎯 **Your {goal or 'fitness'} plan:** {tip} Check the Exercises tab for your personalized exercise list!"
    if any(w in msg for w in ['hello', 'hi', 'hey', 'hii']):
        return (f"👋 Hey {name}! I'm **FitBot**, your AI fitness coach. "
                f"I can help with workout tips, nutrition advice, form guidance, and more. What's on your mind?")

    return (f"💪 Great question, {name}! I'm here to help with your fitness journey. "
            "Try asking me about: **squats**, **push-ups**, **nutrition**, **cardio**, **recovery**, or your **workout plan**!")


@chatbot_bp.route('/messages', methods=['GET'])
@jwt_required()
def get_messages():
    from models import ChatMessage
    user_id = int(get_jwt_identity())
    limit   = int(request.args.get('limit', 50))
    messages = (ChatMessage.query
                .filter_by(user_id=user_id)
                .order_by(ChatMessage.created_at.asc())
                .limit(limit)
                .all())
    return jsonify([m.to_dict() for m in messages])


@chatbot_bp.route('/send', methods=['POST'])
@jwt_required()
def send_message():
    from models import ChatMessage, User

    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    data    = request.get_json() or {}
    message = (data.get('message') or '').strip()

    if not message:
        return jsonify({'error': 'Message cannot be empty'}), 400

    # Save user message
    user_msg = ChatMessage(user_id=user_id, role='user', content=message)
    db.session.add(user_msg)

    # Generate and save assistant response
    response = _generate_response(message, user)
    bot_msg  = ChatMessage(user_id=user_id, role='assistant', content=response)
    db.session.add(bot_msg)
    db.session.commit()

    return jsonify({'response': response, 'message_id': bot_msg.id})


@chatbot_bp.route('/clear', methods=['DELETE'])
@jwt_required()
def clear_chat():
    from models import ChatMessage
    user_id = int(get_jwt_identity())
    ChatMessage.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'message': 'Chat history cleared'})
