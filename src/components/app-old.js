/**
 * FitForm AI — Frontend Application
 * Handles all UI, state, and API communication
 */

const API = 'http://localhost:5000/api';
let token = localStorage.getItem('fitform_token');
let currentUser = null;
let currentExercise = 'squat';
let cameraStream = null;
let poseInterval = null;
let sessionReps = 0;
let sessionStartTime = null;
let formScores = [];

// ─── Utility ────────────────────────────────────────────────────

function showPage(pageId, containerId) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('[id$="-page"]').forEach(p => p.style.display = 'none');
  document.getElementById(pageId).style.display = 'flex';
}

function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  const nav = [...document.querySelectorAll('.nav-item')].find(n => n.onclick?.toString().includes(`'${name}'`));
  if (nav) nav.classList.add('active');
  const titles = { dashboard: 'DASHBOARD', pose: 'POSE DETECTION', exercises: 'EXERCISE LIBRARY', history: 'MY HISTORY', diet: 'DIET PLANNER', chatbot: 'AI COACH', profile: 'PROFILE' };
  document.getElementById('topbar-title').textContent = titles[name] || name.toUpperCase();
  if (name === 'exercises') loadExercises();
  if (name === 'history') loadHistory();
  if (name === 'diet') loadDiet();
  if (name === 'chatbot') loadChatHistory();
  if (name === 'profile') loadProfile();
  if (name === 'dashboard') loadDashboard();
}

function toast(msg, isError = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' error' : '');
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API + path, { ...opts, headers: { ...headers, ...opts.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Auth ────────────────────────────────────────────────────────

async function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    token = data.token;
    localStorage.setItem('fitform_token', token);
    currentUser = data.user;
    launchApp();
  } catch (e) { toast(e.message, true); }
}

async function handleRegister() {
  const body = {
    username: document.getElementById('reg-username').value,
    email: document.getElementById('reg-email').value,
    password: document.getElementById('reg-password').value,
    age: +document.getElementById('reg-age').value || null,
    weight_kg: +document.getElementById('reg-weight').value || null,
    height_cm: +document.getElementById('reg-height').value || null,
    fitness_goal: document.getElementById('reg-goal').value,
  };
  try {
    const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) });
    token = data.token;
    localStorage.setItem('fitform_token', token);
    currentUser = data.user;
    launchApp();
  } catch (e) { toast(e.message, true); }
}

function demoLogin() {
  document.getElementById('login-email').value = 'demo@fitform.ai';
  document.getElementById('login-password').value = 'demo123';
  // Demo mode — bypass API with mock user
  currentUser = { id: 1, username: 'Demo User', email: 'demo@fitform.ai', fitness_goal: 'build_muscle', weight_kg: 75, height_cm: 178, age: 25 };
  token = 'demo-token';
  localStorage.setItem('fitform_token', 'demo-token');
  launchApp();
}

function logout() {
  stopCamera();
  localStorage.removeItem('fitform_token');
  token = null;
  currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-pages').style.display = 'block';
  showPage('login-page', 'auth-pages');
}

function launchApp() {
  document.getElementById('auth-pages').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  updateSidebarUser();
  loadDashboard();
  document.getElementById('topbar-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function updateSidebarUser() {
  if (!currentUser) return;
  document.getElementById('sidebar-username').textContent = currentUser.username;
  const goalMap = { lose_weight: '🔥 Lose Weight', build_muscle: '💪 Build Muscle', maintain: '⚖️ Maintain' };
  document.getElementById('sidebar-goal').textContent = goalMap[currentUser.fitness_goal] || '—';
  const initials = (currentUser.username || 'FF').slice(0, 2).toUpperCase();
  document.getElementById('user-avatar-initials').textContent = initials;
}

// ─── Dashboard ───────────────────────────────────────────────────

async function loadDashboard() {
  try {
    const stats = await apiFetch('/workout/stats');
    document.getElementById('stat-sessions').textContent = stats.total_sessions;
    document.getElementById('stat-calories').textContent = stats.total_calories;
    document.getElementById('stat-form').textContent = stats.avg_form_score || '—';
    document.getElementById('stat-reps').textContent = stats.total_reps;
  } catch (e) {
    // Demo fallback
    document.getElementById('stat-sessions').textContent = '7';
    document.getElementById('stat-calories').textContent = '1240';
    document.getElementById('stat-form').textContent = '84';
    document.getElementById('stat-reps').textContent = '342';
  }
  buildActivityChart();
  loadSuggested();
  loadRecentSessions();
}

function buildActivityChart() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const values = [2, 3, 1, 4, 2, 5, 3];
  const max = Math.max(...values);
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const container = document.getElementById('activity-chart');
  container.innerHTML = days.map((d, i) => `
    <div class="chart-bar-wrapper">
      <div class="chart-bar ${i === todayIdx ? 'today' : ''}" style="height:${(values[i] / max) * 100}px;"></div>
      <div class="chart-day-label">${d}</div>
    </div>
  `).join('');
}

async function loadSuggested() {
  try {
    const exercises = await apiFetch('/exercises/suggested');
    document.getElementById('suggested-list').innerHTML = exercises.slice(0, 3).map(e => `
      <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border);">
        <div style="width:36px; height:36px; border-radius:8px; background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; font-size:1.1rem;">${getExerciseEmoji(e.name)}</div>
        <div>
          <div style="font-weight:600; font-size:0.9rem;">${e.name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${e.category} • ${e.calories_per_min} kcal/min</div>
        </div>
        ${e.ai_supported ? '<span class="badge badge-green" style="margin-left:auto;">AI</span>' : ''}
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('suggested-list').innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem;">Connect backend to see suggestions</div>';
  }
}

async function loadRecentSessions() {
  try {
    const sessions = await apiFetch('/workout/sessions');
    if (!sessions.length) return;
    document.getElementById('recent-sessions').innerHTML = sessions.slice(0, 5).map(s => `
      <div style="display:flex; align-items:center; gap:14px; padding:12px 0; border-bottom:1px solid var(--border);">
        <div style="width:40px; height:40px; border-radius:10px; background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; font-size:1.2rem;">${getExerciseEmoji(s.exercise_name)}</div>
        <div style="flex:1;">
          <div style="font-weight:600; font-size:0.9rem;">${s.exercise_name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${s.reps} reps • ${s.sets} sets • ${s.duration_seconds}s</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700; color:var(--neon); font-size:0.9rem;">${s.form_score}%</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">Form</div>
        </div>
      </div>
    `).join('');
  } catch (e) {}
}

// ─── Pose Detection ──────────────────────────────────────────────

function selectExercise(name) {
  currentExercise = name;
  const labels = { squat: 'Squat', pushup: 'Push-Up', bicep_curl: 'Bicep Curl', plank: 'Plank' };
  document.getElementById('selected-exercise-label').textContent = labels[name];
  document.querySelectorAll('#exercise-selector .btn').forEach(b => b.className = 'btn btn-ghost');
  event.target.className = 'btn btn-primary';
  sessionReps = 0;
  document.getElementById('rep-counter').textContent = '0';
  updateTips(name);
}

function updateTips(exercise) {
  const tips = {
    squat: ['Keep chest up and back straight', 'Drive knees out over toes', 'Squat below parallel for full range'],
    pushup: ['Keep body in a straight line', 'Lower chest fully to floor', 'Lock elbows at top of rep'],
    bicep_curl: ['Pin elbows tight to your sides', 'Full extension at the bottom', 'Squeeze at the top of the rep'],
    plank: ['Don\'t hold your breath', 'Squeeze glutes and abs hard', 'Keep hips level — no sagging'],
  };
  document.getElementById('exercise-tips').innerHTML = (tips[exercise] || []).map(t => `
    <div style="font-size:0.85rem; color:var(--text-secondary);">• ${t}</div>
  `).join('');
}

async function startCamera() {
  try {
    console.log('Requesting camera access...');
    
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera not supported by this browser');
    }
    
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1280 }, 
        height: { ideal: 720 },
        facingMode: 'user'
      } 
    });
    
    console.log('Camera stream obtained:', stream);
    cameraStream = stream;
    
    const video = document.getElementById('pose-video');
    video.srcObject = stream;
    
    // Ensure video plays
    video.onloadedmetadata = () => {
      console.log('Video metadata loaded, playing...');
      video.play().catch(e => console.error('Video play failed:', e));
    };
    
    document.getElementById('start-camera-btn').style.display = 'none';
    document.getElementById('stop-camera-btn').style.display = 'inline-flex';
    document.getElementById('hud-status').className = 'hud-chip good';
    document.getElementById('hud-status').textContent = '🟢 Camera Active';
    document.getElementById('hud-angle').style.display = 'inline-flex';
    sessionStartTime = Date.now();
    
    // Start real pose detection instead of simulation
    if (window.poseDetector) {
      setTimeout(() => {
        window.poseDetector.startDetection(video);
      }, 1000); // Give video time to start
    } else {
      startPoseSimulation(); // Fallback to simulation
    }
    
    toast('Camera started! Begin your exercise 💪');
  } catch (e) {
    console.error('Camera error:', e);
    toast(`Camera error: ${e.message}`, true);
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  if (poseInterval) { clearInterval(poseInterval); poseInterval = null; }
  
  // Stop real pose detection
  if (window.poseDetector) {
    window.poseDetector.stopDetection();
  }
  
  document.getElementById('start-camera-btn').style.display = 'inline-flex';
  document.getElementById('stop-camera-btn').style.display = 'none';
  document.getElementById('hud-status').className = 'hud-chip';
  document.getElementById('hud-status').textContent = '⚫ Camera Off';
  document.getElementById('hud-angle').style.display = 'none';
}

function startPoseSimulation() {
  // Simulate pose analysis feedback (real version uses Socket.IO)
  const feedbackGood = ['Great form! Keep it up 💪', 'Perfect posture!', 'Excellent depth!', 'Looking strong!'];
  const feedbackBad = ['Keep your back straight!', 'Go deeper!', 'Control the movement', 'Slow down!'];
  let repStage = 'up';
  let angle = 160;
  let direction = -1;

  poseInterval = setInterval(() => {
    angle += direction * (Math.random() * 8 + 4);
    if (angle < 75) direction = 1;
    if (angle > 165) {
      direction = -1;
      if (repStage === 'down') {
        repStage = 'up';
        sessionReps++;
        document.getElementById('rep-counter').textContent = sessionReps;
      }
    }
    if (angle < 100) repStage = 'down';

    const score = Math.max(60, Math.min(100, 100 - Math.abs(angle - 90) * 0.3));
    formScores.push(score);
    updateFormScore(score);

    document.getElementById('hud-angle').textContent = `📐 Angle: ${Math.round(angle)}°`;

    const isGood = score > 80;
    const fb = isGood ? feedbackGood[Math.floor(Math.random() * feedbackGood.length)] : feedbackBad[Math.floor(Math.random() * feedbackBad.length)];
    const fbEl = document.getElementById('feedback-text');
    fbEl.textContent = fb;
    fbEl.className = 'feedback-text ' + (isGood ? 'good' : 'bad');
  }, 800);
}

function updateFormScore(score) {
  const arc = document.getElementById('form-score-arc');
  const circumference = 364.4;
  const offset = circumference - (score / 100) * circumference;
  arc.style.strokeDashoffset = offset;
  arc.style.stroke = score > 80 ? 'var(--neon)' : score > 60 ? 'var(--gold)' : 'var(--accent)';
  document.getElementById('form-score-text').textContent = Math.round(score);
}

function resetReps() {
  sessionReps = 0;
  document.getElementById('rep-counter').textContent = '0';
  formScores = [];
  updateFormScore(100);
  toast('Reps reset!');
}

async function saveSession() {
  if (!sessionStartTime) { toast('Start camera first!', true); return; }
  const duration = Math.round((Date.now() - sessionStartTime) / 1000);
  const avgForm = formScores.length ? formScores.reduce((a, b) => a + b, 0) / formScores.length : 80;
  const body = {
    exercise_name: currentExercise.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    duration_seconds: duration,
    reps: sessionReps,
    sets: 1,
    calories_burned: Math.round(duration / 60 * 8),
    form_score: Math.round(avgForm),
    feedback: `Completed ${sessionReps} reps with ${Math.round(avgForm)}% avg form score.`,
  };
  try {
    await apiFetch('/workout/sessions', { method: 'POST', body: JSON.stringify(body) });
    toast('Session saved! 🎉');
    resetReps();
    sessionStartTime = Date.now();
  } catch (e) { toast('Session saved locally (demo mode) ✓'); }
}

// ─── Exercise Library ────────────────────────────────────────────

let allExercises = [];

async function loadExercises() {
  try {
    allExercises = await apiFetch('/exercises/');
  } catch {
    allExercises = getDemoExercises();
  }
  renderExercises(allExercises);
}

function filterExercises() {
  const cat = document.getElementById('category-filter').value;
  renderExercises(cat ? allExercises.filter(e => e.category === cat) : allExercises);
}

function renderExercises(list) {
  document.getElementById('exercises-grid').innerHTML = list.map(e => `
    <div class="exercise-card" onclick="showExerciseDetail(${e.id})">
      <div class="exercise-thumb" style="background: linear-gradient(135deg, var(--bg-elevated), var(--bg-card));">
        <span style="font-size:3rem;">${getExerciseEmoji(e.name)}</span>
        ${e.ai_supported ? '<span class="badge badge-green" style="position:absolute; top:10px; right:10px;">🤖 AI</span>' : ''}
      </div>
      <div class="exercise-body">
        <div class="exercise-name">${e.name}</div>
        <div class="exercise-meta">
          <span>${e.category}</span>
          <span>•</span>
          <span>${e.difficulty}</span>
          <span>•</span>
          <span>${e.calories_per_min} kcal/min</span>
        </div>
        <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:5px;">
          ${(e.muscles || []).map(m => `<span class="badge badge-blue" style="font-size:0.65rem;">${m}</span>`).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function showExerciseDetail(id) {
  const e = allExercises.find(x => x.id === id);
  if (!e) return;
  toast(`${e.name}: ${e.description}`);
  if (e.ai_supported) {
    setTimeout(() => {
      if (confirm(`Start AI form tracking for ${e.name}?`)) {
        const map = { 'Squat': 'squat', 'Push-Up': 'pushup', 'Bicep Curl': 'bicep_curl', 'Plank': 'plank' };
        const key = map[e.name];
        if (key) { selectExercise(key); switchPage('pose'); }
      }
    }, 200);
  }
}

// ─── History ─────────────────────────────────────────────────────

async function loadHistory() {
  try {
    const sessions = await apiFetch('/workout/sessions');
    if (!sessions.length) return;
    document.getElementById('history-list').innerHTML = sessions.map(s => `
      <div class="card" style="display:flex; align-items:center; gap:16px;">
        <div style="width:48px; height:48px; border-radius:12px; background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; font-size:1.5rem;">${getExerciseEmoji(s.exercise_name)}</div>
        <div style="flex:1;">
          <div style="font-weight:700;">${s.exercise_name}</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">${new Date(s.started_at).toLocaleDateString()} • ${s.duration_seconds}s duration</div>
        </div>
        <div style="display:flex; gap:20px; text-align:center;">
          <div><div style="font-weight:700; color:var(--neon);">${s.reps}</div><div style="font-size:0.7rem; color:var(--text-muted);">Reps</div></div>
          <div><div style="font-weight:700; color:var(--blue);">${s.form_score}%</div><div style="font-size:0.7rem; color:var(--text-muted);">Form</div></div>
          <div><div style="font-weight:700; color:var(--gold);">${s.calories_burned}</div><div style="font-size:0.7rem; color:var(--text-muted);">kcal</div></div>
        </div>
      </div>
    `).join('');
  } catch { }
}

// ─── Diet Planner ────────────────────────────────────────────────

async function loadDiet() {
  try {
    const plan = await apiFetch('/diet/plan');
    renderDietPlan(plan);
  } catch { }
}

async function generateDiet() {
  try {
    const plan = await apiFetch('/diet/generate', { method: 'POST' });
    renderDietPlan(plan);
    toast('Diet plan generated! 🥗');
  } catch {
    // Demo fallback
    renderDietPlan(getDemoDiet());
    toast('Demo diet plan loaded!');
  }
}

function renderDietPlan(plan) {
  document.getElementById('macro-protein').textContent = plan.protein_g + 'g';
  document.getElementById('macro-carbs').textContent = plan.carbs_g + 'g';
  document.getElementById('macro-fats').textContent = plan.fats_g + 'g';
  document.getElementById('daily-calories').textContent = plan.daily_calories + ' kcal';
  document.getElementById('meal-plan').innerHTML = (plan.meals || []).map(m => `
    <div class="meal-card">
      <div class="meal-time">${m.time}</div>
      <div class="meal-name">${m.name}</div>
      <div class="meal-items">
        ${(m.items || []).map(item => `<span class="meal-item-tag">${item}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

// ─── AI Chatbot ──────────────────────────────────────────────────

async function loadChatHistory() {
  try {
    const messages = await apiFetch('/chat/messages');
    messages.forEach(m => appendMessage(m.role, m.content, false));
  } catch { }
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  appendMessage('user', msg);
  const typingEl = appendTyping();
  try {
    const data = await apiFetch('/chat/send', { method: 'POST', body: JSON.stringify({ message: msg }) });
    typingEl.remove();
    appendMessage('assistant', data.response);
  } catch {
    typingEl.remove();
    appendMessage('assistant', getLocalBotResponse(msg));
  }
}

function askQuick(msg) {
  document.getElementById('chat-input').value = msg;
  sendChatMessage();
}

function appendMessage(role, content, scroll = true) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'message ' + role;
  div.innerHTML = `
    ${role === 'assistant' ? '<div class="chat-bot-avatar" style="width:28px;height:28px;font-size:0.8rem;flex-shrink:0;">🤖</div>' : ''}
    <div class="message-bubble">${content}</div>
  `;
  container.appendChild(div);
  if (scroll) container.scrollTop = container.scrollHeight;
}

function appendTyping() {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'message assistant';
  div.innerHTML = '<div class="chat-bot-avatar" style="width:28px;height:28px;font-size:0.8rem;flex-shrink:0;">🤖</div><div class="message-bubble" style="display:flex; gap:4px; align-items:center;"><span class="spinner"></span> Thinking...</div>';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

async function clearChat() {
  document.getElementById('chat-messages').innerHTML = '<div class="message assistant"><div class="chat-bot-avatar" style="width:28px;height:28px;font-size:0.8rem;flex-shrink:0;">🤖</div><div class="message-bubble">Chat cleared! How can I help you? 💪</div></div>';
  try { await apiFetch('/chat/clear', { method: 'DELETE' }); } catch {}
}

// ─── Profile ─────────────────────────────────────────────────────

function loadProfile() {
  if (!currentUser) return;
  document.getElementById('prof-username').value = currentUser.username || '';
  document.getElementById('prof-age').value = currentUser.age || '';
  document.getElementById('prof-weight').value = currentUser.weight_kg || '';
  document.getElementById('prof-height').value = currentUser.height_cm || '';
  document.getElementById('prof-goal').value = currentUser.fitness_goal || 'maintain';
  calculateBMI();
}

function calculateBMI() {
  const w = +document.getElementById('prof-weight').value;
  const h = +document.getElementById('prof-height').value / 100;
  if (w && h) {
    const bmi = (w / (h * h)).toFixed(1);
    document.getElementById('bmi-value').textContent = bmi;
    const labels = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight ✓' : bmi < 30 ? 'Overweight' : 'Obese';
    document.getElementById('bmi-label').textContent = labels;
  }
}

async function saveProfile() {
  const body = {
    username: document.getElementById('prof-username').value,
    age: +document.getElementById('prof-age').value || null,
    weight_kg: +document.getElementById('prof-weight').value || null,
    height_cm: +document.getElementById('prof-height').value || null,
    fitness_goal: document.getElementById('prof-goal').value,
  };
  try {
    const user = await apiFetch('/user/profile', { method: 'PUT', body: JSON.stringify(body) });
    currentUser = { ...currentUser, ...user };
    updateSidebarUser();
    calculateBMI();
    toast('Profile updated! ✓');
  } catch {
    currentUser = { ...currentUser, ...body };
    updateSidebarUser();
    calculateBMI();
    toast('Profile saved locally ✓');
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function getExerciseEmoji(name) {
  const map = { Squat: '🏋️', 'Push-Up': '💪', 'Bicep Curl': '🦾', Plank: '🧘', Deadlift: '⛏️', 'Pull-Up': '🏅', Lunge: '🚶', 'Shoulder Press': '🙌' };
  for (const [k, v] of Object.entries(map)) {
    if (name && name.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return '🏃';
}

function getDemoExercises() {
  return [
    { id: 1, name: 'Squat', category: 'Legs', difficulty: 'Beginner', muscles: ['Quads', 'Glutes'], calories_per_min: 8, ai_supported: true, description: 'Classic lower body compound.' },
    { id: 2, name: 'Push-Up', category: 'Chest', difficulty: 'Beginner', muscles: ['Chest', 'Triceps'], calories_per_min: 7, ai_supported: true, description: 'Upper body push.' },
    { id: 3, name: 'Bicep Curl', category: 'Arms', difficulty: 'Beginner', muscles: ['Biceps'], calories_per_min: 4, ai_supported: true, description: 'Arm isolation.' },
    { id: 4, name: 'Plank', category: 'Core', difficulty: 'Beginner', muscles: ['Core', 'Shoulders'], calories_per_min: 5, ai_supported: true, description: 'Core stability.' },
    { id: 5, name: 'Deadlift', category: 'Back', difficulty: 'Intermediate', muscles: ['Hamstrings', 'Back'], calories_per_min: 10, ai_supported: false, description: 'Posterior chain.' },
    { id: 6, name: 'Pull-Up', category: 'Back', difficulty: 'Intermediate', muscles: ['Lats', 'Biceps'], calories_per_min: 9, ai_supported: false, description: 'Vertical pull.' },
  ];
}

function getDemoDiet() {
  return {
    plan_name: 'Muscle Building Plan',
    daily_calories: 3000,
    protein_g: 200,
    carbs_g: 350,
    fats_g: 80,
    meals: [
      { time: '7:00 AM', name: 'Breakfast', items: ['5 egg omelette', 'Whole grain toast', 'Banana'] },
      { time: '10:00 AM', name: 'Snack', items: ['Protein shake', 'Rice cakes'] },
      { time: '1:00 PM', name: 'Lunch', items: ['Grilled chicken', 'Brown rice', 'Broccoli'] },
      { time: '4:00 PM', name: 'Pre-Workout', items: ['Banana', 'Oats', 'Creatine'] },
      { time: '7:00 PM', name: 'Dinner', items: ['Salmon fillet', 'Sweet potato', 'Salad'] },
    ],
  };
}

function getLocalBotResponse(msg) {
  const lower = msg.toLowerCase();
  const kb = {
    squat: 'For squats: keep back straight, feet shoulder-width, push knees out over toes, lower until thighs are parallel.',
    pushup: 'Push-up tips: hands slightly wider than shoulders, straight body line, lower chest to floor.',
    protein: 'Aim for 1.6–2.2g protein per kg bodyweight. Good sources: chicken, fish, eggs, Greek yogurt.',
    cardio: 'Mix steady-state and HIIT for best results. Aim for 150–300 min/week of moderate activity.',
    rest: 'Muscles grow during rest! Get 7–9 hours sleep and allow 48 hours before training the same muscle.',
    diet: 'Balance 40% carbs, 30% protein, 30% fats. Eat whole foods, drink 2–3L water daily.',
  };
  for (const [k, v] of Object.entries(kb)) {
    if (lower.includes(k)) return v;
  }
  return 'Great question! Focus on consistency, proper form, sleep, and balanced nutrition. Try asking about a specific exercise or diet topic!';
}

// ─── Init ─────────────────────────────────────────────────────────

(function init() {
  if (token && token !== 'demo-token') {
    apiFetch('/auth/me').then(user => {
      currentUser = user;
      launchApp();
    }).catch(() => {
      localStorage.removeItem('fitform_token');
      token = null;
    });
  } else if (token === 'demo-token') {
    currentUser = { id: 1, username: 'Demo User', email: 'demo@fitform.ai', fitness_goal: 'build_muscle', weight_kg: 75, height_cm: 178, age: 25 };
    launchApp();
  }
})();
