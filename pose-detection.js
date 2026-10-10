/**
 * Client-side pose detection using MediaPipe
 * This will add real pose tracking with skeleton overlay
 */

class PoseDetector {
  constructor() {
    this.pose = null;
    this.camera = null;
    this.canvas = null;
    this.ctx = null;
    this.isRunning = false;
  }

  async initialize() {
    // Load MediaPipe Pose
    const { Pose } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js');
    const { Camera } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js');
    const { drawConnectors, drawLandmarks } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466862/drawing_utils.js');
    
    this.drawConnectors = drawConnectors;
    this.drawLandmarks = drawLandmarks;
    
    // Initialize pose detection
    this.pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`
    });
    
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    this.pose.onResults(this.onResults.bind(this));
    
    console.log('✅ MediaPipe Pose initialized');
  }

  async startDetection(videoElement) {
    if (!this.pose) {
      await this.initialize();
    }
    
    this.canvas = document.getElementById('pose-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Set canvas size to match video
    this.canvas.width = videoElement.videoWidth || 640;
    this.canvas.height = videoElement.videoHeight || 480;
    
    // Initialize camera
    const { Camera } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js');
    
    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        if (this.isRunning) {
          await this.pose.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480
    });
    
    this.isRunning = true;
    this.camera.start();
    
    console.log('🎥 Pose detection started');
  }

  stopDetection() {
    this.isRunning = false;
    if (this.camera) {
      this.camera.stop();
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    console.log('⏹️ Pose detection stopped');
  }

  onResults(results) {
    if (!this.ctx || !this.isRunning) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (results.poseLandmarks) {
      // Draw pose connections (skeleton)
      this.drawConnectors(this.ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
        color: '#00FF88',
        lineWidth: 2
      });
      
      // Draw landmarks (joints)
      this.drawLandmarks(this.ctx, results.poseLandmarks, {
        color: '#FF3C5F',
        lineWidth: 1,
        radius: 3
      });
      
      // Calculate exercise-specific metrics
      this.analyzeExercise(results.poseLandmarks);
    }
  }

  analyzeExercise(landmarks) {
    // Get current exercise type
    const exercise = window.currentExercise || 'squat';
    
    if (exercise === 'squat') {
      this.analyzeSquat(landmarks);
    } else if (exercise === 'pushup') {
      this.analyzePushup(landmarks);
    }
    // Add more exercises as needed
  }

  analyzeSquat(landmarks) {
    // Calculate knee angle for squat analysis
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    
    if (leftHip && leftKnee && leftAnkle) {
      const angle = this.calculateAngle(
        [leftHip.x, leftHip.y],
        [leftKnee.x, leftKnee.y],
        [leftAnkle.x, leftAnkle.y]
      );
      
      // Update UI with real angle
      document.getElementById('hud-angle').textContent = `📐 Knee Angle: ${Math.round(angle)}°`;
      
      // Calculate form score based on squat depth
      let score = 100;
      if (angle > 160) score = 60; // Too shallow
      else if (angle < 70) score = 70; // Too deep
      else if (angle >= 80 && angle <= 120) score = 95; // Perfect range
      
      window.updateFormScore(score);
      
      // Rep counting logic
      this.countReps(angle, 'squat');
    }
  }

  analyzePushup(landmarks) {
    // Calculate elbow angle for push-up analysis
    const leftShoulder = landmarks[11];
    const leftElbow = landmarks[13];
    const leftWrist = landmarks[15];
    
    if (leftShoulder && leftElbow && leftWrist) {
      const angle = this.calculateAngle(
        [leftShoulder.x, leftShoulder.y],
        [leftElbow.x, leftElbow.y],
        [leftWrist.x, leftWrist.y]
      );
      
      document.getElementById('hud-angle').textContent = `📐 Elbow Angle: ${Math.round(angle)}°`;
      
      let score = 100;
      if (angle > 170) score = 60; // Arms too straight
      else if (angle < 60) score = 70; // Too low
      else if (angle >= 70 && angle <= 110) score = 95; // Perfect range
      
      window.updateFormScore(score);
      this.countReps(angle, 'pushup');
    }
  }

  calculateAngle(a, b, c) {
    const radians = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(a[1] - b[1], a[0] - b[0]);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  }

  countReps(angle, exercise) {
    const key = `${exercise}_stage`;
    
    if (!this[key]) this[key] = 'up';
    
    if (exercise === 'squat') {
      if (angle > 160) this[key] = 'up';
      if (angle < 90 && this[key] === 'up') {
        this[key] = 'down';
        window.sessionReps++;
        document.getElementById('rep-counter').textContent = window.sessionReps;
        
        // Feedback
        const feedback = angle < 80 ? 'Great depth! 💪' : 'Good rep! Go deeper next time';
        document.getElementById('feedback-text').textContent = feedback;
        document.getElementById('feedback-text').className = 'feedback-text good';
      }
    } else if (exercise === 'pushup') {
      if (angle > 160) this[key] = 'up';
      if (angle < 100 && this[key] === 'up') {
        this[key] = 'down';
        window.sessionReps++;
        document.getElementById('rep-counter').textContent = window.sessionReps;
        
        const feedback = angle < 80 ? 'Perfect push-up! 🔥' : 'Good form!';
        document.getElementById('feedback-text').textContent = feedback;
        document.getElementById('feedback-text').className = 'feedback-text good';
      }
    }
  }
}

// Global pose detector instance
window.poseDetector = new PoseDetector();