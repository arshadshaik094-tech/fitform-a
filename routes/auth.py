"""
FitForm AI — Auth Routes (Real MySQL)
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from extensions import db

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    from models import User

    data     = request.get_json() or {}
    email    = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()
    username = (data.get('username') or '').strip()

    if not email or not password or not username:
        return jsonify({'error': 'email, password and username are required'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'token':           token,
        'user':            user.to_dict(),
        'onboarding_done': user.onboarding_done,
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    from models import User

    data     = request.get_json() or {}
    email    = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'token':           token,
        'user':            user.to_dict(),
        'onboarding_done': user.onboarding_done,
    })


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    from models import User
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict())
