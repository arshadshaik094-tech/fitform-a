# FitForm AI - Intelligent Fitness Coach

An AI-powered fitness coaching application with real-time pose detection, personalized workout plans, and interactive voice guidance.

## Features

- 🤖 **AI Coach**: Interactive chatbot for fitness guidance
- 📊 **Workout Tracking**: Real-time pose detection and form analysis
- 🍽️ **Diet Planning**: Personalized meal plans based on your goals
- 📈 **Progress Tracking**: Track your fitness journey with detailed analytics
- 🎯 **Goal-Based Training**: Customized workouts for weight loss, muscle building, or maintenance
- 🗣️ **Voice Guidance**: Text-to-speech coach during onboarding

## Tech Stack

**Backend:**
- Flask (Python)
- MySQL Database
- Flask-JWT-Extended for authentication
- Flask-SocketIO for real-time features
- pyttsx3 for text-to-speech

**Frontend:**
- Vanilla JavaScript
- HTML5/CSS3
- MediaPipe for pose detection
- Custom cursor and animations

## Prerequisites

- Python 3.8+
- MySQL 8.0+
- Node.js (for package management)

## Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Fitfrom
```

### 2. Set up Python environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Set up MySQL Database

```bash
# Start MySQL service
# Windows: Start MySQL80 service from Services
# Mac: brew services start mysql
# Linux: sudo systemctl start mysql

# Create database
mysql -u root -p
CREATE DATABASE fitform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 4. Configure environment (optional)

Create a `.env` file in the root directory:

```env
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
DB_USER=root
DB_PASS=your-mysql-password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fitform
```

### 5. Run the application

```bash
python app.py
```

The application will be available at `http://localhost:3000`

## Project Structure

```
Fitfrom/
├── app.py                  # Main Flask application
├── models.py              # Database models
├── extensions.py          # Flask extensions (SQLAlchemy, SocketIO)
├── requirements.txt       # Python dependencies
├── routes/               # API route blueprints
│   ├── auth.py          # Authentication endpoints
│   ├── user.py          # User profile endpoints
│   ├── workout.py       # Workout tracking endpoints
│   ├── diet.py          # Diet planning endpoints
│   ├── chatbot.py       # AI chatbot endpoints
│   ├── exercises.py     # Exercise library endpoints
│   └── tts.py           # Text-to-speech endpoints
├── services/            # Business logic services
│   └── pose_service.py  # Pose detection service
├── src/                 # Frontend assets
│   ├── assets/
│   │   ├── css/        # Stylesheets
│   │   └── cursor.js   # Custom cursor
│   └── components/
│       └── app.js      # Main application logic
├── index.html          # Main application page
├── login.html          # Login/Register page
└── onboarding.html     # Interactive onboarding flow
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/onboarding` - Complete onboarding

### Workouts
- `GET /api/workout/sessions` - Get workout sessions
- `POST /api/workout/sessions` - Log workout session
- `GET /api/workout/stats` - Get workout statistics

### Diet
- `GET /api/diet/plan` - Get diet plan
- `POST /api/diet/generate` - Generate new diet plan

### Exercises
- `GET /api/exercises/` - Get all exercises
- `GET /api/exercises/suggested` - Get suggested exercises

### Chatbot
- `POST /api/chat/send` - Send message to AI coach
- `GET /api/chat/messages` - Get chat history
- `DELETE /api/chat/clear` - Clear chat history

### TTS (Text-to-Speech)
- `POST /api/tts/speak` - Start speech
- `GET /api/tts/progress` - Check speech progress
- `POST /api/tts/stop` - Stop speech

## Database Schema

The application uses the following main tables:
- `users` - User accounts and profiles
- `exercises` - Exercise library
- `user_exercises` - User's assigned exercises
- `workout_sessions` - Workout history
- `diet_plans` - Personalized diet plans
- `chat_messages` - Chat history

## Default Database Configuration

The app uses these MySQL credentials by default:
- **User**: root
- **Password**: thunder thor69
- **Database**: fitform
- **Host**: localhost
- **Port**: 3306

You can override these in the `.env` file.

## Features in Detail

### Onboarding
New users go through an interactive onboarding experience with:
- Personal information (age, gender, height, weight)
- Fitness goals (lose weight, build muscle, tone up, endurance)
- Training experience level
- Available training days per week
- Training location (home, gym, or both)
- Activity level
- Diet preferences
- Physical limitations/injuries

The system calculates:
- BMI (Body Mass Index)
- Daily calorie target using Mifflin-St Jeor equation
- Protein requirements based on goals
- Recommended training split

### Pose Detection
Real-time pose analysis for exercises using MediaPipe:
- Squat
- Push-up
- Bicep Curl
- Plank

### AI Coach
Interactive chatbot that provides:
- Exercise guidance
- Form correction tips
- Motivation and encouragement
- Answers to fitness questions

## Troubleshooting

**Database Connection Error:**
- Make sure MySQL service is running
- Verify database credentials in `.env` or code
- Create the `fitform` database manually if needed

**TTS Voice Not Working:**
- Windows: pyttsx3 uses SAPI5 (built-in)
- Make sure audio output is not muted
- Check system audio settings

**Camera Not Accessible:**
- Grant browser camera permissions
- Make sure no other app is using the camera
- Use HTTPS or localhost (required by browsers)

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Contact

For questions or support, please open an issue on GitHub.
