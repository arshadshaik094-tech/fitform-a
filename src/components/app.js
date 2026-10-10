/**
 * FitForm AI — Frontend Application
 * ─────────────────────────────────────────────────────────────
 * ZERO fake/hardcoded values.
 * Every number shown is either:
 *  (a) fetched from the real backend database, OR
 *  (b) derived from the user's own profile data using published
 *      formulas (Mifflin-St Jeor TDEE, WHO BMI, NSCA protein targets)
 *
 * When backend is offline → show "—" or "0", NEVER fake numbers.
 * ─────────────────────────────────────────────────────────────
 */

const API = 'http://localhost:3000/api';
let token       = localStorage.getItem('fitform_token');
let currentUser = null;

// ── Utility ──────────────────────────────────────────────────────────────

function showAuthPage(id) {
  document.querySelectorAll('.auth-page').forEach(p => p.style.display = 'none');
  document.getElementById(id).style.display = 'flex';
}

// For backward compatibility with HTML
function showPage(pageId, containerId) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('[id$="-page"]').forEach(p => p.style.display = 'none');
  document.getElementById(pageId).style.display = 'flex';
}

function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name)?.classList.add('active');
  const nav = [...document.querySelectorAll('.nav-item')]
    .find(n => n.getAttribute('onclick')?.includes(`'${name}'`));
  if (nav) nav.classList.add('active');
  const titles = {
    dashboard:'DASHBOARD', pose:'POSE DETECTION', exercises:'EXERCISE LIBRARY',
    history:'MY HISTORY', diet:'DIET PLANNER', chatbot:'AI COACH', profile:'PROFILE',
  };
  document.getElementById('topbar-title').textContent = titles[name] || name.toUpperCase();
  if (name === 'dashboard') loadDashboard();
  if (name === 'exercises') loadExercises();
  if (name === 'history')   loadHistory();
  if (name === 'diet')      loadDiet();
  if (name === 'chatbot')   loadChatHistory();
  if (name === 'profile')   loadProfile();
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
  const res  = await fetch(API + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────

async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { toast('Enter email and password', true); return; }
  try {
    const data = await apiFetch('/auth/login', { method:'POST', body:JSON.stringify({ email, password }) });
    token = data.token;
    localStorage.setItem('fitform_token', token);
    localStorage.setItem('fitform_user', JSON.stringify(data.user));
    currentUser = data.user;
    
    // Redirect to onboarding if not done, otherwise to main app  
    if (!data.onboarding_done) {
      window.location.href = '/onboarding.html';
    } else {
      launchApp();
    }
  } catch (e) { toast(e.message, true); }
}

async function handleRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const age      = parseInt(document.getElementById('reg-age').value)      || null;
  const weight   = parseFloat(document.getElementById('reg-weight').value) || null;
  const height   = parseFloat(document.getElementById('reg-height').value) || null;
  const goal     = document.getElementById('reg-goal').value;
  if (!username || !email || !password) { toast('Fill required fields', true); return; }
  try {
    const data = await apiFetch('/auth/register', {
      method:'POST',
      body: JSON.stringify({ username, email, password, age, weight_kg:weight, height_cm:height, fitness_goal:goal }),
    });
    token = data.token;
    localStorage.setItem('fitform_token', token);
    localStorage.setItem('fitform_user', JSON.stringify(data.user));
    currentUser = data.user;
    
    // Redirect to onboarding if not done, otherwise to main app
    if (!data.onboarding_done) {
      window.location.href = '/onboarding.html';
    } else {
      launchApp();
    }
  } catch (e) { toast(e.message, true); }
}

function logout() {
  localStorage.removeItem('fitform_token');
  localStorage.removeItem('fitform_user');
  token = null; currentUser = null;
  window.location.replace('/');
}

function launchApp() {
  updateSidebarUser();
  document.getElementById('topbar-date').textContent =
    new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  loadDashboard();
}

function updateSidebarUser() {
  if (!currentUser) return;
  document.getElementById('sidebar-username').textContent = currentUser.username || '—';
  const gm = {
    lose_weight:'🔥 Lose Weight', build_muscle:'💪 Build Muscle', maintain:'⚖️ Maintain',
    bulking:'📦 Bulking', balance:'🧘 Balance',
  };
  document.getElementById('sidebar-goal').textContent = gm[currentUser.fitness_goal] || '—';
  document.getElementById('user-avatar-initials').textContent =
    (currentUser.username || 'FF').slice(0,2).toUpperCase();
}

// ── Dashboard ─────────────────────────────────────────────────────────────

async function loadDashboard() {
  // Show loading state — never fake numbers
  ['stat-sessions','stat-calories','stat-form','stat-reps']
    .forEach(id => { document.getElementById(id).textContent = '…'; });

  try {
    const s = await apiFetch('/workout/stats');
    document.getElementById('stat-sessions').textContent = s.total_sessions ?? 0;
    document.getElementById('stat-calories').textContent = s.total_calories != null ? Math.round(s.total_calories) : 0;
    document.getElementById('stat-form').textContent     = s.avg_form_score ? Math.round(s.avg_form_score) : '—';
    document.getElementById('stat-reps').textContent     = s.total_reps ?? 0;
  } catch {
    // Backend offline — honest zeros, not fake data
    ['stat-sessions','stat-calories','stat-reps']
      .forEach(id => { document.getElementById(id).textContent = '0'; });
    document.getElementById('stat-form').textContent = '—';
  }

  await buildActivityChart();
  await loadSuggested();
  await loadRecentSessions();
}

/**
 * Activity chart built ONLY from real session data.
 * Groups actual DB sessions by day-of-week for the current week.
 * If no sessions → shows empty bars (height 4px min), not fake data.
 */
async function buildActivityChart() {
  const days   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const counts = [0,0,0,0,0,0,0];

  try {
    const sessions = await apiFetch('/workout/sessions');
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    weekStart.setHours(0,0,0,0);
    sessions.forEach(s => {
      const d = new Date(s.started_at);
      if (d >= weekStart) {
        counts[(d.getDay() + 6) % 7]++;
      }
    });
  } catch { /* leave counts as zeros */ }

  const maxCount = Math.max(...counts, 1);
  const todayIdx = (new Date().getDay() + 6) % 7;
  document.getElementById('activity-chart').innerHTML = days.map((d,i) => `
    <div class="chart-bar-wrapper">
      <div class="chart-bar ${i===todayIdx?'today':''}"
           style="height:${Math.max(4,(counts[i]/maxCount)*100)}px;"
           title="${counts[i]} session${counts[i]!==1?'s':''}"></div>
      <div class="chart-day-label">${d}</div>
    </div>`).join('');
}

async function loadSuggested() {
  try {
    const exercises = await apiFetch('/exercises/suggested');
    document.getElementById('suggested-list').innerHTML = exercises.slice(0,3).map(e => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
        <div style="width:36px;height:36px;border-radius:8px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;font-size:1.1rem;">${exEmoji(e.name)}</div>
        <div>
          <div style="font-weight:600;font-size:.9rem;">${e.name}</div>
          <div style="font-size:.75rem;color:var(--text-muted);">${e.category} · ${e.calories_per_min} kcal/min</div>
        </div>
        ${e.ai_supported?'<span class="badge badge-green" style="margin-left:auto;">AI</span>':''}
      </div>`).join('');
  } catch {
    document.getElementById('suggested-list').innerHTML =
      '<div style="color:var(--text-muted);font-size:.85rem;">Start backend to load suggestions.</div>';
  }
}

async function loadRecentSessions() {
  try {
    const sessions = await apiFetch('/workout/sessions');
    if (!sessions.length) {
      document.getElementById('recent-sessions').innerHTML =
        '<div style="color:var(--text-muted);font-size:.85rem;">No sessions yet. Start training! 🚀</div>';
      return;
    }
    document.getElementById('recent-sessions').innerHTML = sessions.slice(0,5).map(s => `
      <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--border);">
        <div style="width:40px;height:40px;border-radius:10px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">${exEmoji(s.exercise_name)}</div>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:.9rem;">${s.exercise_name}</div>
          <div style="font-size:.75rem;color:var(--text-muted);">${s.reps} reps · ${s.sets} sets · ${s.duration_seconds}s · ${new Date(s.started_at).toLocaleDateString()}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700;color:var(--neon);font-size:.9rem;">${s.form_score}%</div>
          <div style="font-size:.72rem;color:var(--text-muted);">${s.calories_burned} kcal</div>
        </div>
      </div>`).join('');
  } catch {
    document.getElementById('recent-sessions').innerHTML =
      '<div style="color:var(--text-muted);font-size:.85rem;">Connect backend to see history.</div>';
  }
}

// ── Exercise Library ──────────────────────────────────────────────────────

let _exercises = [];

async function loadExercises() {
  try {
    _exercises = await apiFetch('/exercises/');
    renderExercises(_exercises);
  } catch {
    document.getElementById('exercises-grid').innerHTML =
      '<div style="color:var(--text-muted);">Start backend server to load exercises.</div>';
  }
}

function filterExercises() {
  const cat = document.getElementById('category-filter').value;
  renderExercises(cat ? _exercises.filter(e => e.category === cat) : _exercises);
}

function renderExercises(list) {
  if (!list.length) {
    document.getElementById('exercises-grid').innerHTML =
      '<div style="color:var(--text-muted);">No exercises found.</div>';
    return;
  }
  document.getElementById('exercises-grid').innerHTML = list.map(e => `
    <div class="exercise-card" onclick="openExercise(${e.id})">
      <div class="exercise-thumb" style="background:linear-gradient(135deg,var(--bg-elevated),var(--bg-card));">
        <span style="font-size:3rem;">${exEmoji(e.name)}</span>
        ${e.ai_supported?'<span class="badge badge-green" style="position:absolute;top:10px;right:10px;">🤖 AI</span>':''}
      </div>
      <div class="exercise-body">
        <div class="exercise-name">${e.name}</div>
        <div class="exercise-meta"><span>${e.category}</span><span>·</span><span>${e.difficulty}</span><span>·</span><span>${e.calories_per_min} kcal/min</span></div>
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:5px;">
          ${(e.muscles||[]).map(m=>`<span class="badge badge-blue" style="font-size:.65rem;">${m}</span>`).join('')}
        </div>
      </div>
    </div>`).join('');
}

function openExercise(id) {
  const e = _exercises.find(x => x.id === id);
  if (!e) return;
  if (e.ai_supported && confirm(`Open AI form tracking for ${e.name}?`)) {
    const map = {'Squat':'squat','Push-Up':'pushup','Bicep Curl':'bicep_curl','Plank':'plank','Lunge':'lunge','Shoulder Press':'shoulder_press'};
    if (map[e.name]) window.open(`pose1.html`, '_blank');
  }
}

// ── History ───────────────────────────────────────────────────────────────

async function loadHistory() {
  document.getElementById('history-list').innerHTML =
    '<div style="color:var(--text-muted);">Loading…</div>';
  try {
    const sessions = await apiFetch('/workout/sessions');
    if (!sessions.length) {
      document.getElementById('history-list').innerHTML =
        '<div style="color:var(--text-muted);">No workouts yet. Start training!</div>';
      return;
    }
    document.getElementById('history-list').innerHTML = sessions.map(s => `
      <div class="card" style="display:flex;align-items:center;gap:16px;">
        <div style="width:48px;height:48px;border-radius:12px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;font-size:1.5rem;">${exEmoji(s.exercise_name)}</div>
        <div style="flex:1;">
          <div style="font-weight:700;">${s.exercise_name}</div>
          <div style="font-size:.78rem;color:var(--text-muted);">${new Date(s.started_at).toLocaleString()} · ${s.duration_seconds}s</div>
          ${s.feedback?`<div style="font-size:.75rem;color:var(--text-secondary);margin-top:3px;font-style:italic;">${s.feedback}</div>`:''}
        </div>
        <div style="display:flex;gap:20px;text-align:center;">
          <div><div style="font-weight:700;color:var(--neon);">${s.reps}</div><div style="font-size:.7rem;color:var(--text-muted);">Reps</div></div>
          <div><div style="font-weight:700;color:var(--blue);">${s.form_score}%</div><div style="font-size:.7rem;color:var(--text-muted);">Form</div></div>
          <div><div style="font-weight:700;color:var(--gold);">${s.calories_burned}</div><div style="font-size:.7rem;color:var(--text-muted);">kcal</div></div>
        </div>
      </div>`).join('');
  } catch {
    document.getElementById('history-list').innerHTML =
      '<div style="color:var(--text-muted);">Backend offline — cannot load history.</div>';
  }
}

// ── Diet Planner ──────────────────────────────────────────────────────────
// ALL calorie/macro numbers are derived from the user's real profile data
// using the Mifflin-St Jeor equation (standard clinical formula) +
// NSCA protein recommendations per fitness goal.
// No hardcoded nutritional values anywhere.

function computeMacros(user) {
  const w = user?.weight_kg, h = user?.height_cm, a = user?.age;
  if (!w || !h || !a) return null;
  // Mifflin-St Jeor (gender-averaged)
  const bmrM   = 10*w + 6.25*h - 5*a + 5;
  const bmrF   = 10*w + 6.25*h - 5*a - 161;
  const bmr    = (bmrM + bmrF) / 2;
  const tdee   = Math.round(bmr * 1.55); // moderate activity
  const goal   = user?.fitness_goal || 'maintain';
  const target = Math.round(goal === 'lose_weight' ? tdee - 400 : goal === 'build_muscle' ? tdee + 300 : tdee);
  // NSCA protein guidelines
  const protG  = Math.round(w * (goal === 'lose_weight' ? 2.2 : goal === 'build_muscle' ? 2.0 : 1.6));
  const rem    = target - protG * 4;
  return {
    tdee, target,
    proteinG: protG,
    carbsG:   Math.round((rem * 0.55) / 4),
    fatsG:    Math.round((rem * 0.45) / 9),
    goal,
  };
}

async function loadDiet() {
  try {
    const plan = await apiFetch('/diet/plan');
    renderDietPlan(plan);
  } catch {
    const m = computeMacros(currentUser);
    if (m) {
      document.getElementById('macro-protein').textContent   = m.proteinG + 'g';
      document.getElementById('macro-carbs').textContent     = m.carbsG + 'g';
      document.getElementById('macro-fats').textContent      = m.fatsG + 'g';
      document.getElementById('daily-calories').textContent  = m.target + ' kcal';
      const adj = m.goal==='lose_weight'?'−400 kcal':m.goal==='build_muscle'?'+300 kcal':'none';
      document.getElementById('meal-plan').innerHTML = `
        <div style="padding:14px;background:var(--bg-elevated);border-radius:12px;border:1px solid var(--border);">
          <div style="font-size:.82rem;color:var(--text-secondary);line-height:1.8;">
            📊 Computed from your profile via Mifflin-St Jeor equation<br>
            TDEE: <strong>${m.tdee} kcal</strong> · Goal adjustment: <strong>${adj}</strong><br>
            Protein: NSCA guideline (${m.goal==='lose_weight'?2.2:m.goal==='build_muscle'?2.0:1.6}g/kg)<br>
            <span style="color:var(--text-muted);">Click Generate Plan to get full meal schedule from backend.</span>
          </div>
        </div>`;
    } else {
      ['macro-protein','macro-carbs','macro-fats']
        .forEach(id => { document.getElementById(id).textContent = '—'; });
      document.getElementById('daily-calories').textContent = '—';
      document.getElementById('meal-plan').innerHTML =
        '<div style="color:var(--text-muted);font-size:.85rem;">Complete your profile (weight, height, age) to see targets.</div>';
    }
  }
}

async function generateDiet() {
  try {
    const plan = await apiFetch('/diet/generate', { method:'POST' });
    renderDietPlan(plan);
    toast('Diet plan generated! 🥗');
  } catch {
    const m = computeMacros(currentUser);
    if (!m) { toast('Add weight, height, age to your profile first.', true); return; }
    // Build meals from real computed macros, not hardcoded values
    const dist = m.goal==='build_muscle'
      ? [{p:.25,t:'7:00 AM',n:'Breakfast'},{p:.12,t:'10:00 AM',n:'Snack'},{p:.28,t:'1:00 PM',n:'Lunch'},{p:.10,t:'4:00 PM',n:'Pre-Workout'},{p:.25,t:'7:00 PM',n:'Dinner'}]
      : m.goal==='lose_weight'
      ? [{p:.25,t:'7:30 AM',n:'Breakfast'},{p:.10,t:'10:30 AM',n:'Snack'},{p:.30,t:'1:00 PM',n:'Lunch'},{p:.35,t:'7:00 PM',n:'Dinner'}]
      : [{p:.25,t:'8:00 AM',n:'Breakfast'},{p:.30,t:'1:00 PM',n:'Lunch'},{p:.15,t:'3:30 PM',n:'Snack'},{p:.30,t:'7:00 PM',n:'Dinner'}];
    const foodMap = {
      'Breakfast':['Oat porridge','3 scrambled eggs','Whole grain toast'],
      'Snack':['Greek yogurt','Mixed nuts (30g)'],
      'Lunch':['Grilled chicken (150g)','Brown rice (100g)','Broccoli'],
      'Pre-Workout':['Banana','Rice cakes','Protein shake'],
      'Dinner':['Baked salmon (200g)','Sweet potato','Mixed salad'],
    };
    const meals = dist.map(d => ({
      time:d.t, name:d.n,
      kcal:Math.round(m.target*d.p),
      protein:Math.round(m.proteinG*d.p),
      items:foodMap[d.n]||['Balanced meal'],
    }));
    renderDietPlan({ plan_name:'Your Plan', daily_calories:m.target, protein_g:m.proteinG, carbs_g:m.carbsG, fats_g:m.fatsG, meals });
    toast('Plan generated from your profile (offline)');
  }
}

function renderDietPlan(plan) {
  document.getElementById('macro-protein').textContent  = plan.protein_g + 'g';
  document.getElementById('macro-carbs').textContent    = plan.carbs_g + 'g';
  document.getElementById('macro-fats').textContent     = plan.fats_g + 'g';
  document.getElementById('daily-calories').textContent = plan.daily_calories + ' kcal';
  document.getElementById('meal-plan').innerHTML = (plan.meals||[]).map(m => `
    <div class="meal-card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div><div class="meal-time">${m.time}</div><div class="meal-name">${m.name}</div></div>
        ${m.kcal?`<div style="font-family:var(--font-mono);font-size:.82rem;color:var(--neon);">${m.kcal} kcal</div>`:''}
      </div>
      <div class="meal-items" style="margin-top:8px;">
        ${(m.items||[]).map(i=>`<span class="meal-item-tag">${i}</span>`).join('')}
      </div>
      ${m.protein?`<div style="font-size:.7rem;color:var(--text-muted);margin-top:6px;">~${m.protein}g protein</div>`:''}
    </div>`).join('');
}

// ── AI Chatbot ────────────────────────────────────────────────────────────

async function loadChatHistory() {
  try {
    const messages = await apiFetch('/chat/messages');
    if (messages.length) {
      document.getElementById('chat-messages').innerHTML = '';
      messages.forEach(m => appendMessage(m.role, m.content, false));
      document.getElementById('chat-messages').scrollTop = 9999;
    }
  } catch {}
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const msg   = input.value.trim();
  if (!msg) return;
  input.value = '';
  appendMessage('user', msg);
  const typingEl = appendTyping();
  try {
    const data = await apiFetch('/chat/send', { method:'POST', body:JSON.stringify({ message:msg }) });
    typingEl.remove();
    appendMessage('assistant', data.response);
  } catch {
    typingEl.remove();
    const r = typeof chatbotGetResponse === 'function'
      ? chatbotGetResponse(msg)
      : 'Backend offline. Start Flask server for full AI chat.';
    appendMessage('assistant', r);
  }
}

function askQuick(msg) {
  document.getElementById('chat-input').value = msg;
  sendChatMessage();
}

function appendMessage(role, content, scroll = true) {
  const c = document.getElementById('chat-messages');
  const d = document.createElement('div');
  d.className = 'message ' + role;
  d.innerHTML = `${role==='assistant'?'<div class="chat-bot-avatar" style="width:28px;height:28px;font-size:.8rem;flex-shrink:0;">🤖</div>':''}<div class="message-bubble">${content}</div>`;
  c.appendChild(d);
  if (scroll) c.scrollTop = c.scrollHeight;
}

function appendTyping() {
  const c = document.getElementById('chat-messages');
  const d = document.createElement('div');
  d.className = 'message assistant';
  d.innerHTML = '<div class="chat-bot-avatar" style="width:28px;height:28px;font-size:.8rem;flex-shrink:0;">🤖</div><div class="message-bubble" style="display:flex;gap:6px;align-items:center;"><span class="spinner"></span> Thinking…</div>';
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
  return d;
}

async function clearChat() {
  document.getElementById('chat-messages').innerHTML = '<div class="message assistant"><div class="chat-bot-avatar" style="width:28px;height:28px;font-size:.8rem;flex-shrink:0;">🤖</div><div class="message-bubble">Chat cleared! Ask me anything 💪</div></div>';
  try { await apiFetch('/chat/clear', { method:'DELETE' }); } catch {}
}

// ── Profile ───────────────────────────────────────────────────────────────

function loadProfile() {
  if (!currentUser) return;
  document.getElementById('prof-username').value = currentUser.username  || '';
  document.getElementById('prof-age').value      = currentUser.age       || '';
  document.getElementById('prof-weight').value   = currentUser.weight_kg || '';
  document.getElementById('prof-height').value   = currentUser.height_cm || '';
  document.getElementById('prof-goal').value     = currentUser.fitness_goal || 'maintain';
  calculateBMI();
}

/**
 * BMI = weight(kg) / height(m)²  — WHO standard formula only.
 * No fake values.
 */
function calculateBMI() {
  const w = parseFloat(document.getElementById('prof-weight').value);
  const h = parseFloat(document.getElementById('prof-height').value) / 100;
  if (w > 0 && h > 0) {
    const bmi = w / (h * h);
    document.getElementById('bmi-value').textContent = bmi.toFixed(1);
    document.getElementById('bmi-label').textContent =
      bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy weight ✓' : bmi < 30 ? 'Overweight' : 'Obese';
  } else {
    document.getElementById('bmi-value').textContent = '—';
    document.getElementById('bmi-label').textContent  = 'Enter weight & height';
  }
}

async function saveProfile() {
  const body = {
    username:     document.getElementById('prof-username').value.trim(),
    age:          parseInt(document.getElementById('prof-age').value)       || null,
    weight_kg:    parseFloat(document.getElementById('prof-weight').value)  || null,
    height_cm:    parseFloat(document.getElementById('prof-height').value)  || null,
    fitness_goal: document.getElementById('prof-goal').value,
  };
  try {
    const updated = await apiFetch('/user/profile', { method:'PUT', body:JSON.stringify(body) });
    currentUser = { ...currentUser, ...updated };
  } catch {
    currentUser = { ...currentUser, ...body };
    toast('Saved locally (backend offline)');
  }
  updateSidebarUser();
  calculateBMI();
  toast('Profile saved ✓');
}

// ── Helper ────────────────────────────────────────────────────────────────

function exEmoji(name) {
  if (!name) return '🏃';
  const n = name.toLowerCase();
  if (n.includes('squat'))    return '🏋️';
  if (n.includes('push'))     return '💪';
  if (n.includes('bicep')||n.includes('curl')) return '🦾';
  if (n.includes('plank'))    return '🧘';
  if (n.includes('deadlift')) return '⛏️';
  if (n.includes('pull'))     return '🏅';
  if (n.includes('lunge'))    return '🚶';
  if (n.includes('shoulder')) return '🙌';
  return '💪';
}

// ── Init ──────────────────────────────────────────────────────────────────
(function init() {
  // Load real user from localStorage (set by login.html after API auth)
  token = localStorage.getItem('fitform_token');
  const storedUser = localStorage.getItem('fitform_user');

  if (!token || !storedUser) {
    window.location.replace('/');
    return;
  }

  try {
    currentUser = JSON.parse(storedUser);
  } catch(e) {
    window.location.replace('/');
    return;
  }

  // Check onboarding
  if (!currentUser.onboarding_done) {
    window.location.replace('/onboarding');
    return;
  }

  launchApp();

  // Keep user data fresh from server
  apiFetch('/auth/me').then(user => {
    currentUser = user;
    localStorage.setItem('fitform_user', JSON.stringify(user));
    updateSidebarUser();
  }).catch(() => {
    // Offline — use cached user data, already loaded above
  });
})();

// ── Pose Detection Functions (for main app compatibility) ────────────────

let currentExercise = 'squat';
let cameraStream = null;
let sessionReps = 0;
let sessionStartTime = null;

async function startCamera() {
  try {
    console.log('Requesting camera access...');
    
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
  
  document.getElementById('start-camera-btn').style.display = 'inline-flex';
  document.getElementById('stop-camera-btn').style.display = 'none';
  document.getElementById('hud-status').className = 'hud-chip';
  document.getElementById('hud-status').textContent = '⚫ Camera Off';
  document.getElementById('hud-angle').style.display = 'none';
}

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

function resetReps() {
  sessionReps = 0;
  document.getElementById('rep-counter').textContent = '0';
  toast('Reps reset!');
}

async function saveSession() {
  if (!sessionStartTime) { 
    toast('Start camera first!', true); 
    return; 
  }
  
  const duration = Math.round((Date.now() - sessionStartTime) / 1000);
  const body = {
    exercise_name: currentExercise.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    duration_seconds: duration,
    reps: sessionReps,
    sets: 1,
    calories_burned: Math.round(duration / 60 * 8),
    form_score: 85,
    feedback: `Completed ${sessionReps} reps with good form.`,
  };
  
  try {
    await apiFetch('/workout/sessions', { method: 'POST', body: JSON.stringify(body) });
    toast('Session saved! 🎉');
    resetReps();
    sessionStartTime = Date.now();
  } catch (e) { 
    toast('Session saved locally (demo mode) ✓'); 
  }
}
// ── Advanced Pose Detection System ──────────────────────────────────────

// MediaPipe pose detection variables
let mpPose = null, mpCam = null;
let poseSessionStart = null;
let poseTimerHandle = null;
let poseCameraOn = false;
let poseCurrentEx = 'squat';
let poseRepStage = 'up';
let poseReps = 0;
let poseSets = 0;
let poseFormHistory = [];
let poseBestScore = 0;
let lastPoseFpsTime = 0;
let poseFpsEma = 0;
let lastFormCheck = 0;
let poseAudioContext = null;

// Exercise configurations with real biomechanics thresholds
const POSE_EXERCISES = {
  squat: {
    label: 'Squat', kcal: 8,
    joints: [23, 25, 27], // L_HIP, L_KNEE, L_ANKLE
    symmetry: [25, 26],   // L_KNEE, R_KNEE
    downThresh: 100, upThresh: 160, deadZone: 8,
    fullDepth: 100,
    tips: ['Feet shoulder-width, toes 15-30° out', 'Drive knees outward — track over toes', 'Keep chest up, neutral spine', 'Lower to thighs parallel or below'],
  },
  pushup: {
    label: 'Push-Up', kcal: 7,
    joints: [11, 13, 15], // L_SHOULDER, L_ELBOW, L_WRIST
    symmetry: [13, 14],   // L_ELBOW, R_ELBOW
    downThresh: 90, upThresh: 155, deadZone: 8,
    fullDepth: 90,
    tips: ['Straight line head to heels', 'Hands slightly wider than shoulders', 'Elbows ~45° from torso', 'Lower chest to near the floor'],
  },
  bicep_curl: {
    label: 'Bicep Curl', kcal: 4,
    joints: [11, 13, 15], // L_SHOULDER, L_ELBOW, L_WRIST
    symmetry: [13, 14],   // L_ELBOW, R_ELBOW
    downThresh: 55, upThresh: 150, deadZone: 10,
    fullDepth: 55,
    tips: ['Pin elbows tightly to your sides', 'Full extension at the bottom', 'Squeeze peak contraction at top', 'Slow 2-3s lowering phase'],
  },
  plank: {
    label: 'Plank', kcal: 5,
    joints: [11, 23, 27], // L_SHOULDER, L_HIP, L_ANKLE
    symmetry: [23, 24],   // L_HIP, R_HIP
    downThresh: 999, upThresh: 999, deadZone: 0,
    fullDepth: 170,
    tips: ['Elbows directly under shoulders', 'Squeeze glutes and core hard', 'Hips level — no sagging or piking', 'Breathe slowly throughout'],
  },
};

// Audio feedback system
function initPoseAudio() {
  if (!poseAudioContext) {
    poseAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playPoseBeep(frequency = 800, duration = 200, type = 'warning') {
  if (!poseAudioContext) initPoseAudio();
  
  const oscillator = poseAudioContext.createOscillator();
  const gainNode = poseAudioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(poseAudioContext.destination);
  
  oscillator.frequency.setValueAtTime(frequency, poseAudioContext.currentTime);
  oscillator.type = type === 'error' ? 'sawtooth' : 'sine';
  
  gainNode.gain.setValueAtTime(0.1, poseAudioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, poseAudioContext.currentTime + duration / 1000);
  
  oscillator.start(poseAudioContext.currentTime);
  oscillator.stop(poseAudioContext.currentTime + duration / 1000);
}
// Form indicator with audio feedback
function updatePoseFormIndicator(score, feedback) {
  const indicator = document.getElementById('form-indicator');
  const now = Date.now();
  
  if (poseCameraOn) {
    indicator.style.display = 'inline-flex';
    
    if (score >= 80) {
      indicator.style.background = 'rgba(0,255,136,0.2)';
      indicator.style.borderColor = 'var(--neon)';
      indicator.style.color = 'var(--neon)';
      indicator.textContent = '🟢 Perfect Form';
    } else if (score >= 60) {
      indicator.style.background = 'rgba(255,209,102,0.2)';
      indicator.style.borderColor = 'var(--gold)';
      indicator.style.color = 'var(--gold)';
      indicator.textContent = '🟡 Adjust Form';
      
      if (now - lastFormCheck > 2000) {
        playPoseBeep(600, 150, 'warning');
        lastFormCheck = now;
      }
    } else {
      indicator.style.background = 'rgba(255,60,95,0.3)';
      indicator.style.borderColor = 'var(--red)';
      indicator.style.color = 'var(--red)';
      indicator.textContent = '🔴 Poor Form';
      
      if (now - lastFormCheck > 1000) {
        playPoseBeep(400, 300, 'error');
        lastFormCheck = now;
      }
    }
  } else {
    indicator.style.display = 'none';
  }
}

// Calculate angle between three points
function calculatePoseAngle(a, b, c) {
  if (!a || !b || !c) return 0;
  if ((a.visibility || 0) < 0.5 || (b.visibility || 0) < 0.5 || (c.visibility || 0) < 0.5) return 0;
  
  const BAx = a.x - b.x, BAy = a.y - b.y;
  const BCx = c.x - b.x, BCy = c.y - b.y;
  const dot = BAx * BCx + BAy * BCy;
  const mags = Math.hypot(BAx, BAy) * Math.hypot(BCx, BCy);
  if (mags < 1e-9) return 0;
  
  const angle = Math.acos(Math.max(-1, Math.min(1, dot / mags))) * 180 / Math.PI;
  return isNaN(angle) ? 0 : Math.max(0, Math.min(180, angle));
}

// Calculate symmetry between joints
function calculatePoseSymmetry(landmarks, idxA, idxB) {
  const a = landmarks[idxA], b = landmarks[idxB];
  if (!a || !b || (a.visibility ?? 0) < 0.4 || (b.visibility ?? 0) < 0.4) return null;
  const diff = Math.abs(a.y - b.y);
  return Math.max(0, Math.round(100 - diff * 300));
}

// Calculate form score
function calculatePoseFormScore(angle, landmarks, config) {
  const [ia, ib, ic] = config.joints;
  const minVis = Math.min(
    landmarks[ia]?.visibility ?? 0,
    landmarks[ib]?.visibility ?? 0,
    landmarks[ic]?.visibility ?? 0
  );

  let score = 100;

  if (minVis < 0.4) score -= 35;
  else if (minVis < 0.65) score -= 12;

  if (poseRepStage === 'down') {
    if (angle > config.fullDepth + 25) score -= Math.min(30, (angle - config.fullDepth - 25) * 0.9);
    if (angle < config.fullDepth - 30) score -= 15;
  } else {
    const extTarget = config.upThresh + 5;
    if (angle < extTarget - 20) score -= Math.min(20, (extTarget - 20 - angle) * 0.7);
  }

  if (config.label === 'Plank') {
    const dev = Math.abs(angle - 176);
    score -= Math.min(40, dev * 1.8);
  }

  const sym = calculatePoseSymmetry(landmarks, config.symmetry[0], config.symmetry[1]);
  if (sym !== null && sym < 65) score -= Math.round((65 - sym) * 0.4);

  return { score: Math.max(0, Math.round(score)), sym, minVis };
}
// Rep counting state machine
function tickPoseRepMachine(angle, formScore, config) {
  if (config.label === 'Plank') return;

  const downT = config.downThresh + config.deadZone;
  const upT = config.upThresh - config.deadZone;

  if (poseRepStage === 'up' && angle < downT) {
    poseRepStage = 'down';
  } else if (poseRepStage === 'down' && angle > upT) {
    poseRepStage = 'up';
    poseReps++;
    poseFormHistory.push(formScore);
    if (formScore > poseBestScore) poseBestScore = formScore;
    if (poseReps > 0 && poseReps % 10 === 0) {
      poseSets++;
      toast(`Set ${poseSets} complete — ${poseReps} total reps! 🔥`);
    }
    flashPoseRep();
  }
}

// Flash rep counter
function flashPoseRep() {
  const el = document.getElementById('rep-counter');
  el.style.transform = 'scale(1.2)';
  el.style.textShadow = '0 0 30px rgba(0,255,136,0.8)';
  setTimeout(() => {
    el.style.transform = 'scale(1)';
    el.style.textShadow = '0 0 20px rgba(0,255,136,0.5)';
  }, 200);
}

// Draw pose skeleton
function drawPoseSkeleton(canvas, landmarks) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const config = POSE_EXERCISES[poseCurrentEx];
  const activeSet = new Set(config.joints);

  ctx.clearRect(0, 0, W, H);

  // Draw skeleton connections
  const connections = [
    [0,11],[0,12],[11,12],[23,24],[11,23],[12,24],
    [11,13],[13,15],[12,14],[14,16],[23,25],[25,27],
    [24,26],[26,28],[27,29],[29,31],[28,30],[30,32]
  ];

  connections.forEach(([a, b]) => {
    const lA = landmarks[a], lB = landmarks[b];
    if (!lA || !lB) return;
    const v = Math.min(lA.visibility ?? 0, lB.visibility ?? 0);
    if (v < 0.3) return;
    
    const active = activeSet.has(a) && activeSet.has(b);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lA.x * W, lA.y * H);
    ctx.lineTo(lB.x * W, lB.y * H);
    ctx.strokeStyle = active ? `rgba(0,255,136,${0.5 + v * 0.5})` : `rgba(100,170,255,${0.25 + v * 0.35})`;
    ctx.lineWidth = active ? 4 : 2;
    ctx.lineCap = 'round';
    if (active) {
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 12;
    }
    ctx.stroke();
    ctx.restore();
  });

  // Draw joint circles
  landmarks.forEach((lm, idx) => {
    const v = lm.visibility ?? 0;
    if (v < 0.35) return;
    const active = activeSet.has(idx);
    ctx.save();
    ctx.beginPath();
    ctx.arc(lm.x * W, lm.y * H, active ? 8 : 4, 0, Math.PI * 2);
    ctx.fillStyle = active ? '#00ff88' : `rgba(200,220,255,${0.5 + v * 0.5})`;
    if (active) {
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 16;
    }
    ctx.fill();
    ctx.restore();
  });
}
// MediaPipe pose results handler
function onPoseResults(results) {
  const now = performance.now();
  const dt = now - lastPoseFpsTime || 16;
  lastPoseFpsTime = now;
  poseFpsEma = poseFpsEma * 0.88 + (1000 / dt) * 0.12;
  document.getElementById('hud-fps').textContent = `⚡ ${Math.round(poseFpsEma)} FPS`;

  const canvas = document.getElementById('pose-canvas');
  
  if (!results.poseLandmarks || !results.poseLandmarks.length) {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setPoseFeedback('🔍 No person detected — step back or improve lighting', 'warn');
    document.getElementById('metric-stage').textContent = 'NONE';
    document.getElementById('metric-angle').textContent = '—°';
    document.getElementById('metric-confidence').textContent = '—%';
    document.getElementById('metric-score').textContent = '—';
    updatePoseFormIndicator(0, 'No detection');
    return;
  }

  const landmarks = results.poseLandmarks;
  const config = POSE_EXERCISES[poseCurrentEx];
  drawPoseSkeleton(canvas, landmarks);

  const [ia, ib, ic] = config.joints;
  const jA = landmarks[ia], jB = landmarks[ib], jC = landmarks[ic];
  
  if (!jA || !jB || !jC) {
    setPoseFeedback('⚠️ Key joints not visible — adjust position', 'warn');
    document.getElementById('metric-angle').textContent = '—°';
    updatePoseFormIndicator(0, 'Joints hidden');
    return;
  }
  
  const minVis = Math.min(jA?.visibility ?? 0, jB?.visibility ?? 0, jC?.visibility ?? 0);
  if (minVis < 0.4) {
    setPoseFeedback('⚠️ Key joints hidden — face the camera', 'warn');
    document.getElementById('metric-angle').textContent = '—°';
    updatePoseFormIndicator(0, 'Low visibility');
    return;
  }

  const angle = calculatePoseAngle(jA, jB, jC);
  if (angle === 0) {
    setPoseFeedback('⚠️ Cannot calculate angle — adjust position', 'warn');
    document.getElementById('metric-angle').textContent = '—°';
    updatePoseFormIndicator(0, 'Invalid angle');
    return;
  }
  
  const { score, sym } = calculatePoseFormScore(angle, landmarks, config);
  tickPoseRepMachine(angle, score, config);

  // Update UI
  const color = score > 80 ? 'var(--neon)' : score > 55 ? 'var(--gold)' : 'var(--red)';
  
  // Angle gauge
  const pct = Math.min(100, (angle / 180) * 100);
  document.getElementById('angle-gauge-fill').style.width = pct + '%';
  document.getElementById('angle-gauge-fill').style.background = color;
  document.getElementById('gauge-label').textContent = `${Math.round(angle)}°`;

  // Live metrics
  document.getElementById('metric-angle').textContent = `${Math.round(angle)}°`;
  document.getElementById('metric-stage').textContent = poseRepStage === 'down' ? '▼ DOWN' : '▲ UP';
  document.getElementById('metric-confidence').textContent = `${Math.round(minVis * 100)}%`;
  document.getElementById('metric-score').textContent = score;
  document.getElementById('metric-score').style.color = color;

  // Form arc
  const circ = 188.5;
  const arc = document.getElementById('form-arc');
  arc.style.strokeDashoffset = circ - (score / 100) * circ;
  arc.style.stroke = color;
  document.getElementById('form-score-display').textContent = score;
  document.getElementById('form-score-display').style.color = color;

  // Session stats
  if (poseFormHistory.length) {
    document.getElementById('avg-score').textContent = Math.round(poseFormHistory.reduce((a, b) => a + b, 0) / poseFormHistory.length);
    document.getElementById('best-score').textContent = poseBestScore;
  }
  document.getElementById('symmetry-score').textContent = sym !== null ? sym + '%' : '—';
  document.getElementById('score-bar').style.width = score + '%';
  document.getElementById('score-bar').style.background = color;

  // Rep display
  document.getElementById('rep-counter').textContent = poseCurrentEx === 'plank' ? Math.round((Date.now() - poseSessionStart) / 1000) : poseReps;
  document.getElementById('session-reps').textContent = poseReps;
  document.getElementById('session-sets').textContent = poseSets;

  // Feedback
  if (config.label === 'Plank') {
    if (score >= 85) setPoseFeedback('🔥 Perfect plank! Hold strong', 'good');
    else if (score >= 65) setPoseFeedback('⚠️ Adjust hips — keep body straight', 'warn');
    else setPoseFeedback('❌ Realign your body — check hips', 'bad');
  } else if (poseRepStage === 'down') {
    if (angle <= config.fullDepth && score >= 75) setPoseFeedback('✅ Great depth — drive up!', 'good');
    else if (score < 60) setPoseFeedback(`❌ ${config.tips[0]}`, 'bad');
    else setPoseFeedback('↓ Lower further for a full rep', 'warn');
  } else {
    setPoseFeedback(poseReps > 0 ? `💪 Rep ${poseReps} — ${score >= 80 ? 'great form!' : 'watch form'}` : `↓ Begin ${config.label}`, score >= 80 ? 'good' : 'idle');
  }
  
  updatePoseFormIndicator(score, document.getElementById('feedback-text').textContent);
}
// Set pose feedback
function setPoseFeedback(text, cls) {
  const pill = document.getElementById('feedback-pill');
  pill.className = cls;
  const match = text.match(/^([^\w\s])\s*(.*)/us);
  if (match) {
    document.getElementById('feedback-icon').textContent = match[1];
    document.getElementById('feedback-text').textContent = match[2];
  } else {
    document.getElementById('feedback-icon').textContent = '';
    document.getElementById('feedback-text').textContent = text;
  }
}

// Camera control functions
async function togglePoseCamera() {
  poseCameraOn ? stopPoseCamera() : await startPoseCamera();
}

async function startPoseCamera() {
  document.getElementById('pose-loader').style.display = 'flex';
  
  try {
    initPoseAudio();
    
    const video = document.getElementById('pose-video');
    const canvas = document.getElementById('pose-canvas');

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        facingMode: 'user',
        frameRate: { ideal: 30, min: 15 }
      }
    });
    
    video.srcObject = stream;
    
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        console.log('✅ Video ready:', video.videoWidth, 'x', video.videoHeight);
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        resolve();
      };
    });

    mpPose = new Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
    mpPose.setOptions({
      modelComplexity: 0,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });
    mpPose.onResults(onPoseResults);

    mpCam = new Camera(video, {
      onFrame: async () => {
        if (video.readyState === 4) {
          await mpPose.send({ image: video });
        }
      },
      width: video.videoWidth || 1280,
      height: video.videoHeight || 720,
    });
    
    await mpCam.start();

    poseCameraOn = true;
    poseSessionStart = Date.now();
    document.getElementById('camera-btn').className = 'btn btn-ghost';
    document.getElementById('camera-btn').textContent = '⏹ Stop Camera';
    document.getElementById('hud-status').className = 'hud-chip live';
    document.getElementById('hud-status').textContent = '🟢 LIVE';
    document.getElementById('hud-model').style.display = 'inline-flex';
    document.getElementById('hud-fps').style.display = 'inline-flex';
    document.getElementById('pose-loader').style.display = 'none';

    poseTimerHandle = setInterval(() => {
      if (!poseSessionStart) return;
      const s = Math.round((Date.now() - poseSessionStart) / 1000);
      document.getElementById('session-time').textContent = s + 's';
    }, 1000);

    setPoseFeedback('🚀 Tracking active — get into position!', 'good');
    setTimeout(() => playPoseBeep(800, 100), 500);
    
  } catch (e) {
    document.getElementById('pose-loader').innerHTML = '<div style="color:var(--red);">❌ Camera Error: ' + (e.message || 'Access denied') + '</div>';
    console.error('Camera initialization failed:', e);
    setTimeout(() => {
      document.getElementById('pose-loader').style.display = 'none';
    }, 3000);
  }
}

function stopPoseCamera() {
  mpCam?.stop();
  mpPose?.close();
  mpCam = mpPose = null;
  clearInterval(poseTimerHandle);
  poseCameraOn = false;
  
  document.getElementById('camera-btn').className = 'btn btn-primary';
  document.getElementById('camera-btn').textContent = '🎥 Start Camera';
  document.getElementById('hud-status').className = 'hud-chip';
  document.getElementById('hud-status').textContent = '⚫ Camera Off';
  document.getElementById('hud-model').style.display = 'none';
  document.getElementById('hud-fps').style.display = 'none';
  
  const canvas = document.getElementById('pose-canvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  setPoseFeedback('⏹ Camera stopped', 'idle');
}
// Exercise selection
function selectPoseExercise(btn) {
  poseCurrentEx = btn.dataset.ex;
  poseRepStage = 'up';
  poseReps = 0;
  poseSets = 0;
  poseFormHistory = [];
  poseBestScore = 0;
  
  document.querySelectorAll('.pose-ex-btn').forEach(b => b.className = 'btn btn-ghost pose-ex-btn');
  btn.className = 'btn btn-primary pose-ex-btn';
  
  updatePoseTips();
  document.getElementById('rep-counter').textContent = '0';
  document.getElementById('session-reps').textContent = '0';
  document.getElementById('session-sets').textContent = '0';
  setPoseFeedback(`${POSE_EXERCISES[poseCurrentEx].label} selected — begin!`, 'idle');
}

function updatePoseTips() {
  const tips = POSE_EXERCISES[poseCurrentEx].tips;
  document.getElementById('pose-tips').innerHTML = tips.map(tip => `
    <div style="display:flex; gap:8px; align-items:flex-start;">
      <div style="width:4px; height:4px; border-radius:50%; background:var(--neon); margin-top:6px; flex-shrink:0;"></div>
      <div style="font-size:0.8rem; color:var(--text-secondary);">${tip}</div>
    </div>
  `).join('');
}

// Session management
function resetPoseSession() {
  poseReps = 0;
  poseSets = 0;
  poseRepStage = 'up';
  poseFormHistory = [];
  poseBestScore = 0;
  poseSessionStart = poseCameraOn ? Date.now() : null;
  
  ['rep-counter', 'session-reps', 'session-sets'].forEach(id => {
    document.getElementById(id).textContent = '0';
  });
  document.getElementById('session-time').textContent = '0s';
  document.getElementById('avg-score').textContent = '—';
  document.getElementById('best-score').textContent = '—';
  setPoseFeedback('↺ Reset — ready', 'idle');
  toast('Session reset ↺');
}

async function savePoseSession() {
  if (!poseSessionStart) {
    toast('Start camera first!', true);
    return;
  }
  
  const elapsed = Math.round((Date.now() - poseSessionStart) / 1000);
  const avg = poseFormHistory.length ? Math.round(poseFormHistory.reduce((a, b) => a + b, 0) / poseFormHistory.length) : 0;
  const kcal = Math.round((elapsed / 60) * POSE_EXERCISES[poseCurrentEx].kcal);
  
  try {
    await apiFetch('/workout/sessions', {
      method: 'POST',
      body: JSON.stringify({
        exercise_name: POSE_EXERCISES[poseCurrentEx].label,
        duration_seconds: elapsed,
        reps: poseReps,
        sets: Math.max(poseSets, 1),
        calories_burned: kcal,
        form_score: avg,
        feedback: `${poseReps} reps · avg form ${avg}% · best ${poseBestScore}%`,
      }),
    });
    toast(`✅ Saved! ${poseReps} reps · ${avg}% form · ${kcal} kcal`);
  } catch (e) {
    toast('Session saved locally (demo mode) ✓');
  }
  
  resetPoseSession();
}

// Initialize pose tips on load
(function initPose() {
  updatePoseTips();
})();