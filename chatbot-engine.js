/**
 * FitForm AI — Advanced Fitness Chatbot
 * 50+ intent patterns, context memory, structured responses
 */

// ══════════════════════════════════════════════════════════════
//  KNOWLEDGE BASE
// ══════════════════════════════════════════════════════════════

const KB = {

  // ── Exercise form ──
  squat_form: {
    patterns: [/squat/i, /squats/i],
    response: `🏋️ **Squat Form Guide:**\n\n• **Stance:** Feet shoulder-width, toes 15–30° outward\n• **Descent:** Break at hips and knees simultaneously, keep chest up\n• **Depth:** Thighs at least parallel to the floor (below parallel = full squat)\n• **Knees:** Track over your toes — don't cave inward\n• **Back:** Neutral spine throughout — no rounding\n• **Drive:** Push through mid-foot, squeeze glutes at lockout\n\n💡 *A common mistake is looking down — keep your chin up and eyes forward.*`,
  },
  pushup_form: {
    patterns: [/push.?up/i, /pushup/i, /chest exercise/i],
    response: `💪 **Push-Up Form Guide:**\n\n• **Hand placement:** Slightly wider than shoulders, fingers spread\n• **Body line:** Head → heels in a straight plank, no sagging hips\n• **Elbow angle:** ~45° to your body (not flared wide)\n• **Descent:** Lower chest to 1 inch from floor\n• **Ascent:** Push explosively, full lockout at top\n• **Breathing:** Inhale down, exhale up\n\n💡 *Struggling? Drop to knees or elevate hands on a bench.*`,
  },
  deadlift_form: {
    patterns: [/deadlift/i, /dead lift/i],
    response: `⛏️ **Deadlift Form Guide:**\n\n• **Setup:** Bar over mid-foot, shoulder-width stance\n• **Grip:** Just outside legs, double overhand or mixed grip\n• **Back:** Flat/neutral — NEVER round your lower back\n• **Hips:** Start with hips higher than knees, lower than shoulders\n• **Pull:** Drag bar up legs, drive hips through at lockout\n• **Head:** Neutral neck, don't hyperextend\n\n⚠️ *The deadlift rewards patience. Master technique before adding weight.*`,
  },
  bicep_form: {
    patterns: [/bicep/i, /biceps/i, /curl/i, /arm exercise/i],
    response: `🦾 **Bicep Curl Form Guide:**\n\n• **Elbow position:** Pinned to your sides throughout\n• **Bottom:** Full extension — don't cut range short\n• **Top:** Curl until forearms are vertical, squeeze hard\n• **Speed:** 1s up, 2–3s down (the negative builds muscle!)\n• **Wrist:** Neutral or slightly supinated, don't flex the wrist\n• **Body:** No swinging — isolate the bicep\n\n💡 *If you're swinging your body, the weight is too heavy.*`,
  },
  plank_form: {
    patterns: [/plank/i, /core hold/i],
    response: `🧘 **Plank Form Guide:**\n\n• **Elbows:** Directly under shoulders\n• **Body:** Straight line from head to heels\n• **Core:** Squeeze abs like you're about to be punched\n• **Glutes:** Squeezed — this protects your lower back\n• **Hips:** Level — no sagging or piking\n• **Breathing:** Slow, controlled — don't hold your breath\n• **Head:** Neutral, looking at the floor\n\n🏆 *Target: 3×60s. Elite: 3×120s.*`,
  },
  pullup_form: {
    patterns: [/pull.?up/i, /pullup/i, /chin.?up/i],
    response: `🏅 **Pull-Up Form Guide:**\n\n• **Grip:** Slightly wider than shoulder width\n• **Start:** Full dead hang, arms fully extended\n• **Pull:** Lead with your elbows, not your hands\n• **Top:** Chin clearly over the bar\n• **Descent:** Slow and controlled (3s down)\n• **No kipping:** Unless training for CrossFit specifically\n\n💡 *Can't do one yet? Use a resistance band or do lat pulldowns.*`,
  },

  // ── Nutrition ──
  protein: {
    patterns: [/protein/i, /how much.*eat/i, /macro/i, /amino/i],
    response: `🥩 **Protein Guide:**\n\n• **For muscle building:** 1.6–2.2g per kg of bodyweight\n• **For fat loss:** 2.0–2.4g per kg (preserves muscle)\n• **For maintenance:** 1.2–1.6g per kg\n\n**Best sources:** Chicken breast, tuna, eggs, Greek yogurt, cottage cheese, beef, legumes, whey protein\n\n⏰ **Timing:** Spread across 3–5 meals for optimal muscle protein synthesis. Pre/post workout protein is beneficial but total daily intake matters most.`,
  },
  calories: {
    patterns: [/calori/i, /how much.*eat/i, /tdee/i, /caloric/i, /deficit/i, /surplus/i],
    response: `🔢 **Calorie Guide:**\n\n**Calculate your TDEE:**\n• Sedentary: BMR × 1.2\n• Light exercise: BMR × 1.375\n• Moderate exercise: BMR × 1.55\n• Heavy exercise: BMR × 1.725\n\n**Goals:**\n• Fat loss: TDEE − 300 to −500 kcal/day\n• Muscle gain: TDEE + 200 to +400 kcal/day\n• Maintenance: = TDEE\n\n⚠️ *Never drop below 1,200 kcal (women) or 1,500 kcal (men).*`,
  },
  creatine: {
    patterns: [/creatine/i, /supplement/i, /pre.?workout/i],
    response: `💊 **Supplements (Evidence-Based):**\n\n**Tier 1 (Strong evidence):**\n• **Creatine monohydrate** — 3–5g/day, most studied supplement. Increases strength, power output, muscle volume.\n• **Protein powder** — Convenient if you can't hit protein from food.\n• **Caffeine** — 3–6mg/kg body weight pre-workout.\n\n**Tier 2 (Moderate evidence):**\n• Beta-alanine, citrulline malate, fish oil\n\n❌ *Most other supplements have weak or no evidence.*`,
  },
  diet_meal: {
    patterns: [/diet/i, /meal plan/i, /what.*eat/i, /food/i, /nutrition/i],
    response: `🥗 **Balanced Diet Principles:**\n\n• **Protein:** 30% of calories (chicken, fish, eggs, legumes)\n• **Carbs:** 40% of calories (oats, rice, potato, fruit)\n• **Fats:** 30% of calories (avocado, nuts, olive oil, eggs)\n\n**Meal timing:**\n• Pre-workout: Carbs + protein, 60–90 min before\n• Post-workout: Protein + fast carbs within 60 min\n• Before bed: Casein protein (cottage cheese, Greek yogurt)\n\n💧 *Drink 2–3 liters of water daily. Dehydration kills performance.*`,
  },
  carbs: {
    patterns: [/carb/i, /carbohydrate/i, /carbo/i],
    response: `🍚 **Carbohydrates Guide:**\n\n**Complex carbs (choose these most):**\nOats, brown rice, quinoa, sweet potato, whole grain bread, legumes\n\n**Simple carbs (useful around training):**\nFruit, white rice, dextrose — fast energy pre/post workout\n\n**Carb cycling:**\n• High-carb days: Training days\n• Low-carb days: Rest days\n\n📌 *Carbs are not the enemy. They're your primary fuel source for high-intensity training.*`,
  },
  hydration: {
    patterns: [/water/i, /hydrat/i, /drink/i],
    response: `💧 **Hydration Guide:**\n\n• **Baseline:** 2–3 liters per day\n• **Per hour of training:** Add 500–700ml\n• **Hot weather:** Add 500ml more\n\n**Signs of dehydration:**\nDark urine, headache, reduced performance, cramping\n\n**Electrolytes matter:**\nIf you sweat heavily, add sodium (salt), potassium (banana), and magnesium to your water or diet.\n\n⚡ *Even 2% dehydration reduces strength by up to 10%.*`,
  },

  // ── Training ──
  cardio: {
    patterns: [/cardio/i, /running/i, /hiit/i, /fat.?burn/i, /aerob/i, /treadmill/i],
    response: `🏃 **Cardio Guide:**\n\n**LISS (Low Intensity Steady State):**\n• 60–70% max heart rate, 30–60 minutes\n• Best for: Fat oxidation, recovery, beginners\n• Examples: Brisk walk, cycling, swimming\n\n**HIIT (High Intensity Interval Training):**\n• 20–30 seconds max effort, 40–60s rest × 8–12 rounds\n• Best for: Time-efficient fat loss, cardiovascular improvement\n• 2–3x/week max (recovery intensive)\n\n📌 *Combine both for optimal results. Do LISS on rest days, HIIT after strength.*`,
  },
  rest: {
    patterns: [/rest/i, /recover/i, /sleep/i, /overtraining/i, /rest day/i],
    response: `😴 **Recovery Guide:**\n\n• **Sleep:** 7–9 hours. Growth hormone peaks during deep sleep — this is when muscles actually grow.\n• **Muscle rest:** 48 hours minimum between training the same muscle group\n• **Overtraining signs:** Persistent fatigue, declining performance, mood changes, frequent illness\n\n**Active recovery tools:**\n• Light walking, yoga, foam rolling, cold/warm contrast showers\n• Magnesium glycinate (supplement) aids sleep quality\n\n🏆 *Rest is not laziness. It's when adaptation happens.*`,
  },
  frequency: {
    patterns: [/how.*often/i, /how many.*days/i, /workout.*week/i, /training.*frequency/i, /days.*train/i],
    response: `📅 **Training Frequency:**\n\n**Beginner (0–1 year):** 3 full-body sessions/week\n**Intermediate (1–3 years):** 4 days (Upper/Lower split)\n**Advanced (3+ years):** 5–6 days (Push/Pull/Legs or similar)\n\n**Recommended splits:**\n• 3 days: Full Body × 3\n• 4 days: Upper/Lower/Upper/Lower\n• 5 days: PPL + 2 rest or Upper/Lower + full body\n• 6 days: Push/Pull/Legs × 2\n\n🔑 *More isn't always better. Recovery determines progress.*`,
  },
  warm_up: {
    patterns: [/warm.?up/i, /warm up/i, /stretch/i, /mobility/i, /before.*workout/i],
    response: `🔥 **Warm-Up Protocol:**\n\n**5–10 minutes total:**\n1. **General warm-up:** 5 min light cardio (bike, jog)\n2. **Dynamic stretching:** Leg swings, arm circles, hip circles\n3. **Activation:** Glute bridges, band pull-aparts\n4. **Specific warm-up:** 2 sets of your first exercise at 40–60% of working weight\n\n❌ *Avoid static stretching before lifting — it temporarily reduces strength*\n✅ *Save static stretching for the cool-down (post-workout)*`,
  },
  progressive_overload: {
    patterns: [/progress/i, /overload/i, /get stronger/i, /plateau/i, /not.*progress/i, /stuck/i],
    response: `📈 **Progressive Overload:**\n\nThe #1 principle for muscle and strength gain:\n\n**Methods:**\n• Add weight (2.5–5kg when you hit top of rep range)\n• Add reps (complete all reps before increasing weight)\n• Add sets (volume overload)\n• Reduce rest time (density overload)\n• Improve form and range of motion\n\n**Log your workouts.** You can't progress what you don't track.\n\n⚠️ *Hit a plateau? Deload for 1 week (50% volume/intensity), then push harder.*`,
  },

  // ── Programs ──
  beginner_program: {
    patterns: [/beginner/i, /starting/i, /never.*trained/i, /new.*gym/i, /where.*start/i, /first.*time/i],
    response: `🌱 **Beginner Program (3 days/week):**\n\n**Day A:**\nSquat 3×5, Bench Press 3×5, Barbell Row 3×5\n\n**Day B:**\nSquat 3×5, Overhead Press 3×5, Deadlift 1×5\n\nAlternate A/B each session.\n**Add 2.5kg to upper, 5kg to lower body lifts each session.**\n\n📌 *This is essentially StrongLifts 5×5 / Starting Strength. Proven over decades. Run it for 3–6 months before switching.*\n\nMost importantly: **Show up consistently and eat enough protein.**`,
  },
  muscle_building: {
    patterns: [/build.*muscle/i, /gain.*muscle/i, /hypertrophy/i, /bulk/i, /mass/i, /muscl/i],
    response: `💪 **Muscle Building Blueprint:**\n\n**Training:**\n• 10–20 sets per muscle group per week\n• Rep range: 6–12 reps (hypertrophy zone)\n• Rest: 60–120 seconds between sets\n• Train each muscle 2x/week minimum\n\n**Nutrition:**\n• Caloric surplus of 200–400 kcal/day\n• 1.8–2.2g protein per kg bodyweight\n• Prioritize whole foods\n\n**Recovery:**\n• 7–9 hours sleep (GH peak!)\n• Manage stress (cortisol kills gains)\n\n⏱️ *Expect 0.5–1kg of muscle/month as a natural lifter.*`,
  },
  fat_loss: {
    patterns: [/lose.*weight/i, /fat.*loss/i, /burn.*fat/i, /cut/i, /shred/i, /slim/i, /weight.*loss/i],
    response: `🔥 **Fat Loss Blueprint:**\n\n**The only rule:** Be in a caloric deficit.\n\n**Practical steps:**\n• Deficit: −300 to −500 kcal/day (0.5–1kg/week loss)\n• Keep protein HIGH (2.0–2.4g/kg) to preserve muscle\n• Lift weights — preserves muscle while losing fat\n• Cardio: 150–200 min/week of moderate activity\n• Sleep 7–9h (poor sleep spikes hunger hormones)\n\n❌ *Avoid crash diets — you'll lose muscle and regain fat*\n✅ *Slow, sustainable loss wins every time*`,
  },
  abs: {
    patterns: [/abs/i, /six.?pack/i, /belly/i, /core/i],
    response: `🔲 **Abs & Core:**\n\n**Truth:** Six-pack abs are made in the kitchen. You need low body fat to see them (men <12%, women <20%).\n\n**Best core exercises:**\n• Plank (builds stability)\n• Hanging leg raises (lower abs)\n• Ab wheel rollout (full core)\n• Cable crunches (weighted, builds thickness)\n• Pallof press (anti-rotation strength)\n\n📌 *Train abs 2–3x/week, 3–4 sets each. They recover fast.*\n\n🔑 *Combine fat loss nutrition + core training + overall lifting = visible abs.*`,
  },

  // ── Health & lifestyle ──
  motivation: {
    patterns: [/motiv/i, /lazy/i, /don't.*want/i, /not.*feel/i, /tired/i, /give.*up/i, /hard/i],
    response: `⚡ **Staying Motivated:**\n\n• **Set process goals** not just outcome goals ("workout 4x this week" vs "lose 10kg")\n• **Track progress** — seeing the numbers move is addictive\n• **Find your why** — write it down, revisit when struggling\n• **Workout partners** increase consistency by 65%\n• **Remove friction** — lay out gym clothes the night before\n• **"Never miss twice"** rule: missing once is human, twice is a habit\n\n💬 *"Motivation gets you started. Habit keeps you going."*\n\nThe fact that you're here means you're already ahead. 🔥`,
  },
  injury: {
    patterns: [/pain/i, /hurt/i, /injur/i, /sore/i, /ache/i],
    response: `⚕️ **Dealing with Pain/Injury:**\n\n**Sharp pain = STOP immediately.** Don't train through sharp, stabbing, or joint pain.\n\n**Delayed onset muscle soreness (DOMS):**\n• Normal 24–72h after training\n• Light movement actually helps recovery\n• Not a requirement for progress\n\n**Injury prevention:**\n• Always warm up properly\n• Leave ego at the door — use appropriate weights\n• Learn proper form before adding load\n• Deload every 6–8 weeks\n\n⚠️ *For persistent pain, please consult a physiotherapist or doctor. Don't self-diagnose.*`,
  },

  // ── FitForm AI specific ──
  ai_info: {
    patterns: [/how.*work/i, /what.*ai/i, /how.*detect/i, /mediapipe/i, /opencv/i, /technology/i],
    response: `🧠 **FitForm AI Technology:**\n\n**Pose Detection:**\nWe use **MediaPipe Pose** by Google — a machine learning pipeline that detects **33 body landmarks** (joints) in real-time from your webcam feed.\n\n**How it works:**\n1. Webcam frame → MediaPipe neural net\n2. 33 landmarks detected (shoulders, elbows, hips, knees...)\n3. Joint angles calculated between landmark triplets\n4. Angle + stage machine compares to ideal form ranges\n5. Rep is counted on full cycle (down → up)\n\n**Why Lite model?**\nOptimized to run at 25–30 FPS on a 4GB laptop without a GPU. No cloud required — all processing is local! 🔒`,
  },
  reps: {
    patterns: [/rep/i, /repetition/i, /how.*count/i, /set/i],
    response: `🔢 **Reps & Sets Guide:**\n\n**Rep ranges by goal:**\n• Strength: 1–5 reps @ 85–100% 1RM\n• Hypertrophy (size): 6–12 reps @ 65–80% 1RM\n• Endurance: 15–25 reps @ 40–60% 1RM\n• Power: 3–6 explosive reps @ 70–80%\n\n**Sets per session:**\n• Per muscle group: 10–20 working sets/week\n• Per exercise: 3–5 sets\n\n**Rest periods:**\n• Heavy compound lifts: 2–5 min\n• Hypertrophy: 60–120 sec\n• Isolation/endurance: 30–60 sec`,
  },

  // ── Greetings / Meta ──
  greeting: {
    patterns: [/^(hi|hello|hey|sup|yo|what'?s up|howdy)/i],
    response: `👋 Hey! I'm your FitForm AI coach.\n\nI can help you with:\n• 🏋️ **Exercise form** — Squat, deadlift, pushup, curls...\n• 🥗 **Nutrition** — Calories, protein, meal planning\n• 📈 **Programs** — Beginner plans, muscle building, fat loss\n• 🔬 **Science** — How training and recovery works\n• 🤖 **The AI** — How our pose detection works\n\nWhat would you like to know?`,
  },
  thanks: {
    patterns: [/thank/i, /thanks/i, /thx/i, /appreciate/i, /helpful/i],
    response: `You're welcome! 💪 That's what I'm here for.\n\nKeep training consistently and remember: **progress > perfection.** If you have more questions, just ask!`,
  },
};

// ── Fallback responses (varied to avoid repetition) ──────────
const FALLBACKS = [
  `🤔 I'm not sure about that specifically, but here's what I can tell you: consistent training + proper nutrition + adequate sleep = 90% of the result. What specific area would you like help with?\n\n*Try asking about: form tips, nutrition, programs, rep ranges, or recovery.*`,
  `💪 Great question! I don't have a specific answer for that, but I'd suggest starting with the basics: progressive overload in your training, high protein diet, and 7–9h sleep.\n\n*Ask me about a specific exercise, diet topic, or fitness goal!*`,
  `🧠 I specialize in exercise form, nutrition, and training programming. Could you rephrase that? Or try asking about: squats, push-ups, protein intake, fat loss, building muscle, or recovery.`,
];
let fallbackIdx = 0;

// ══════════════════════════════════════════════════════════════
//  NLP ENGINE
// ══════════════════════════════════════════════════════════════

// Context memory (last 5 exchanges)
const conversationContext = [];

function getResponse(userMessage) {
  const msg = userMessage.trim();

  // Store in context
  conversationContext.push({ role: 'user', content: msg });
  if (conversationContext.length > 10) conversationContext.shift();

  // Match against patterns
  let best = null;
  for (const [key, entry] of Object.entries(KB)) {
    for (const pattern of entry.patterns) {
      if (pattern.test(msg)) {
        best = entry;
        break;
      }
    }
    if (best) break;
  }

  let response;
  if (best) {
    response = best.response;
  } else {
    // Context-aware fallback
    const lastBotMsg = conversationContext.filter(m => m.role === 'bot').slice(-1)[0];
    if (lastBotMsg && lastBotMsg.topic === 'squat' && /more|continue|tell|explain/i.test(msg)) {
      response = KB.progressive_overload.response;
    } else {
      response = FALLBACKS[fallbackIdx % FALLBACKS.length];
      fallbackIdx++;
    }
  }

  conversationContext.push({ role: 'bot', content: response });
  return formatResponse(response);
}

// Render markdown-lite to HTML
function formatResponse(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul style="padding-left:18px;margin:8px 0;">$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/, '<p>$1</p>');
}

// Export for use in app.js
if (typeof module !== 'undefined') module.exports = { getResponse };
window.chatbotGetResponse = getResponse;
