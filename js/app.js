// =====================================================
//  COGNITIVE ECHO — AI Interview Simulator
//  Main App Logic (ES Module)
// =====================================================

// ── State ────────────────────────────────────────────
const state = {
  resumeData: null,          // parsed JSON from Gemini
  questions: [],             // interview questions array
  currentQ: 0,               // current question index
  answers: [],               // { question, answer, score, emotion } per turn
  sessionStart: null,
  timerInterval: null,
  apiKey: '',
  lang: 'English',
  role: 'Software Engineer',
  isSpeaking: false,
  isListening: false,
  recognition: null,
  synth: window.speechSynthesis,
  confidenceScores: [],
  emotionHistory: [],
};

// ── PDF.js setup ─────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ── Navigation ────────────────────────────────────────
window.goToScreen = (name) => {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(`screen-${name}`);
  if (el) el.classList.remove('hidden');

  // header nav style
  ['prepare','interview','feedback'].forEach(n => {
    const link = document.getElementById(`nav-${n}`);
    if (link) link.className = `nav-link cursor-pointer transition-colors duration-300 ${n===name ? 'active-nav' : 'text-slate-500 hover:text-indigo-200'}`;
  });
};

// ── Language selection ────────────────────────────────
window.selectLang = (btn, lang) => {
  state.lang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.className = 'lang-btn unselected-lang flex items-center justify-between p-4 rounded-xl font-body text-on-surface-variant';
    b.querySelector('.material-symbols-outlined').style.opacity = '0';
  });
  btn.className = 'lang-btn selected-lang flex items-center justify-between p-4 rounded-xl font-body';
  btn.querySelector('.material-symbols-outlined').style.opacity = '1';
};

// ── File Handling ─────────────────────────────────────
window.handleDrop = (e) => {
  e.preventDefault();
  document.getElementById('drop-zone').classList.remove('border-primary/70');
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') processFile(file);
  else alert('Please drop a PDF file.');
};

window.handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (file) processFile(file);
};

async function processFile(file) {
  setParseStatus('loading', `Reading "${file.name}"…`);

  try {
    const text = await extractPdfText(file);
    if (text.length < 50) throw new Error('Could not extract text from PDF.');

    setParseStatus('loading', 'Analyzing with AI…');
    const apiKey = document.getElementById('api-key').value.trim();
    if (!apiKey) throw new Error('Please enter your Gemini API key first.');
    state.apiKey = apiKey;

    const parsed = await analyzeResume(text, apiKey);
    state.resumeData = parsed;
    state.role = document.getElementById('job-role').value;

    setParseStatus('success',
      `✓ Resume parsed — ${parsed.name || 'Candidate'} · ${parsed.experience_level} level · ${parsed.skills.slice(0,3).join(', ')}…`
    );

    document.getElementById('start-btn').disabled = false;
    document.getElementById('start-hint').textContent = 'You are ready! Click to begin.';

  } catch (err) {
    setParseStatus('error', `⚠ ${err.message}`);
  }
}

function setParseStatus(type, msg) {
  const el = document.getElementById('parse-status');
  const icon = document.getElementById('parse-icon');
  const text = document.getElementById('parse-text');
  el.classList.remove('hidden');
  text.textContent = msg;
  if (type === 'loading') {
    icon.textContent = 'autorenew'; icon.className = 'material-symbols-outlined text-primary animate-spin';
    el.className = 'mt-4 p-4 rounded-xl bg-surface-container-high flex items-center gap-3';
  } else if (type === 'success') {
    icon.textContent = 'check_circle'; icon.className = 'material-symbols-outlined text-green-400';
    el.className = 'mt-4 p-4 rounded-xl bg-green-900/20 flex items-center gap-3';
  } else {
    icon.textContent = 'error'; icon.className = 'material-symbols-outlined text-error';
    el.className = 'mt-4 p-4 rounded-xl bg-error/10 flex items-center gap-3';
  }
}

// ── PDF Text Extraction ───────────────────────────────
async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text.trim();
}

// ── Gemini API Helper ─────────────────────────────────
async function callGemini(prompt, apiKey, json = true) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      ...(json ? { responseMimeType: 'application/json' } : {})
    }
  };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Gemini API error');
  }
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (json) {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }
  return raw.trim();
}

// ── Resume Analyzer (Step 1) ──────────────────────────
async function analyzeResume(text, apiKey) {
  const prompt = `You are an expert technical recruiter analyzing a resume for an interview simulation.
Extract and return ONLY valid JSON in this exact format:
{
  "name": "candidate full name",
  "skills": ["skill1","skill2"],
  "projects": [{"name":"","description":"one sentence","technologies":[]}],
  "experience_level": "beginner|intermediate|advanced",
  "target_roles": ["role1","role2"],
  "strengths": ["strength1","strength2","strength3"],
  "weaknesses": ["weakness1","weakness2"]
}
Rules: return ONLY the JSON. Keep values concise (max 10 words each). Infer experience_level from education+projects+skills.
Resume:
${text.substring(0, 6000)}`;
  return callGemini(prompt, apiKey, true);
}

// ── Question Generator (Step 2) ───────────────────────
async function generateQuestions(resumeData, role, apiKey) {
  const prompt = `You are a senior ${role} interviewer. Generate exactly 5 interview questions based on this candidate profile.
Return ONLY a JSON array of exactly 5 strings. Mix: 1 intro, 2 technical (based on their skills/projects), 1 behavioral, 1 challenging.
Make them conversational and natural — short sentences like a real human interviewer.
Candidate: ${JSON.stringify({ name: resumeData.name, skills: resumeData.skills, projects: resumeData.projects.slice(0,3), experience_level: resumeData.experience_level })}
Role: ${role}
Return only a JSON array like: ["question 1","question 2","question 3","question 4","question 5"]`;
  const result = await callGemini(prompt, apiKey, true);
  return Array.isArray(result) ? result : result.questions || [];
}

// ── Answer Evaluator (Step 3) ─────────────────────────
async function evaluateAnswer(question, answer, emotion, resumeData, apiKey) {
  if (!answer || answer.trim().length < 5) {
    return { score: 20, follow_up: "Take your time — can you try to answer that?", coaching: "Answer was too short or unclear." };
  }
  const prompt = `You are an AI interviewer evaluating a candidate's answer. Return ONLY JSON.
{
  "score": 0-100,
  "follow_up": "one short natural follow-up question or comment (max 20 words, conversational)",
  "coaching": "one sentence of private coaching note for report"
}
Question: "${question}"
Answer: "${answer}"
Candidate emotion: ${emotion}
Candidate level: ${resumeData.experience_level}
Rules: if nervous, follow_up should be supportive. If confident, be slightly challenging. If weak answer, guide gently. If strong, go deeper.`;
  return callGemini(prompt, apiKey, true);
}

// ── Final Report Generator (Step 6) ──────────────────
async function generateReport(answers, resumeData, role, apiKey) {
  const avgScore = Math.round(answers.reduce((a,b) => a + (b.score||50), 0) / answers.length);
  const prompt = `You are generating a final interview report. Return ONLY JSON.
{
  "confidence_score": 0-100,
  "communication_score": 0-100,
  "technical_score": 0-100,
  "competencies": [{"name":"skill name","score":0-100}],
  "strengths": ["specific strength observed in interview"],
  "growth_areas": ["specific area to improve"],
  "coaching": [{"tip":"AI coaching tip based on actual answers","tags":["tag1","tag2"]}]
}
Candidate: ${resumeData.name}, ${resumeData.experience_level}, role: ${role}
Interview QA: ${JSON.stringify(answers.map(a => ({q:a.question.slice(0,80), a:a.answer.slice(0,120), score:a.score})))}
Average score: ${avgScore}`;
  return callGemini(prompt, apiKey, true);
}

// ── Speech Synthesis (TTS) ────────────────────────────
function speak(text, onEnd) {
  state.synth.cancel();
  state.isSpeaking = true;
  setAiStatus('speaking');
  avatarSpeak(true);

  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.92;
  utter.pitch = 1.02;
  utter.lang = state.lang === 'Hindi' ? 'hi-IN' : 'en-US';

  // Pick a good voice
  const voices = state.synth.getVoices();
  const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                    voices.find(v => v.lang.startsWith('en')) || voices[0];
  if (preferred) utter.voice = preferred;

  utter.onend = () => {
    state.isSpeaking = false;
    avatarSpeak(false);
    setAiStatus('listening');
    if (onEnd) onEnd();
  };
  utter.onerror = () => {
    state.isSpeaking = false;
    avatarSpeak(false);
    if (onEnd) onEnd();
  };
  state.synth.speak(utter);
}

// ── Speech Recognition (STT) ─────────────────────────
function setupRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Speech recognition not supported. Use Chrome.'); return null; }
  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = state.lang === 'Hindi' ? 'hi-IN' : 'en-US';
  let finalTranscript = '';
  let silenceTimer = null;

  rec.onresult = (e) => {
    let interim = '';
    finalTranscript = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    const displayed = (finalTranscript + interim).trim();
    document.getElementById('live-transcript').textContent = displayed || 'Listening…';

    // Silence detection: 3s of no new speech → auto-submit
    clearTimeout(silenceTimer);
    if (displayed) {
      silenceTimer = setTimeout(() => {
        if (state.isListening && finalTranscript.trim()) {
          submitAnswer(finalTranscript.trim());
        }
      }, 3000);
    }
  };

  rec.onend = () => {
    if (state.isListening) rec.start(); // keep alive
  };
  rec.onerror = (e) => {
    if (e.error !== 'no-speech') console.warn('STT error:', e.error);
  };
  return rec;
}

// ── Emotion Detection (simple heuristic) ─────────────
function detectEmotion(transcript, pauseMs) {
  const fillers = /\b(uh+|um+|er+|hmm+|like|you know|basically|sort of|kind of)\b/gi;
  const fillerCount = (transcript.match(fillers) || []).length;
  const wordCount = transcript.split(/\s+/).length;
  const words = wordCount || 1;

  let emotionScore = 50;
  if (fillerCount / words > 0.1) emotionScore -= 20;     // many fillers → nervous
  if (pauseMs > 5000) emotionScore -= 15;                // long pause → nervous
  if (wordCount < 10) emotionScore -= 10;                // short answer → low confidence
  if (wordCount > 50) emotionScore += 10;                // detailed → confident
  emotionScore = Math.max(10, Math.min(100, emotionScore));

  const label = emotionScore >= 70 ? 'Confident' : emotionScore >= 40 ? 'Calm' : 'Nervous';
  return { score: emotionScore, label };
}

// ── Avatar Animation ──────────────────────────────────
function avatarSpeak(speaking) {
  const waves = document.getElementById('speak-waves');
  const glow  = document.getElementById('avatar-glow');
  const mouth = document.getElementById('mouth-path');
  if (!waves) return;
  waves.style.opacity = speaking ? '1' : '0';
  glow.className = speaking
    ? 'absolute -inset-4 bg-primary/40 rounded-full blur-3xl transition-all duration-700'
    : 'absolute -inset-4 bg-primary/20 rounded-full blur-3xl transition-all duration-700';
  if (mouth) {
    mouth.setAttribute('d', speaking
      ? 'M 86 116 Q 100 128 114 116'
      : 'M 88 118 Q 100 126 112 118');
  }
}

// ── UI Helpers ────────────────────────────────────────
function setAiStatus(mode) {
  const dot  = document.getElementById('ai-status-dot');
  const text = document.getElementById('ai-status-text');
  if (mode === 'speaking') {
    dot.className  = 'w-2 h-2 rounded-full bg-tertiary animate-pulse';
    text.textContent = 'AI is Speaking…';
  } else {
    dot.className  = 'w-2 h-2 rounded-full bg-primary animate-pulse';
    text.textContent = 'Listening…';
  }
}

function updateQuestionCounter() {
  document.getElementById('question-counter').textContent = `${state.currentQ + 1} / ${state.questions.length}`;
}

function updateConfidence(score) {
  state.confidenceScores.push(score);
  const avg = Math.round(state.confidenceScores.reduce((a,b)=>a+b,0)/state.confidenceScores.length);
  document.getElementById('confidence-score').textContent = avg;
  document.getElementById('confidence-bar').style.width = avg + '%';
}

function showEmotion(label) {
  const tag = document.getElementById('emotion-tag');
  tag.classList.remove('hidden');
  document.getElementById('emotion-label').textContent = label;
}

// ── Timer ─────────────────────────────────────────────
function startTimer() {
  state.sessionStart = Date.now();
  state.timerInterval = setInterval(() => {
    const secs = Math.floor((Date.now() - state.sessionStart) / 1000);
    const m = String(Math.floor(secs/60)).padStart(2,'0');
    const s = String(secs % 60).padStart(2,'0');
    document.getElementById('session-timer').textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
}

// ── Mic Toggle ────────────────────────────────────────
window.toggleMic = () => {
  if (state.isSpeaking) return; // don't interrupt AI
  if (state.isListening) {
    stopListening();
  } else {
    startListening();
  }
};

function startListening() {
  state.isListening = true;
  if (!state.recognition) state.recognition = setupRecognition();
  if (state.recognition) state.recognition.start();
  document.getElementById('mic-btn').className = document.getElementById('mic-btn').className + ' listening';
  document.getElementById('mic-btn').classList.remove('muted');
}

function stopListening() {
  state.isListening = false;
  if (state.recognition) state.recognition.stop();
  const btn = document.getElementById('mic-btn');
  btn.classList.remove('listening');
}

// ── Interview Flow ────────────────────────────────────
window.startInterview = async () => {
  if (!state.resumeData || !state.apiKey) return;
  state.role = document.getElementById('job-role').value;

  goToScreen('interview');
  document.getElementById('ai-question-text').textContent = 'Generating your personalized questions…';

  try {
    state.questions = await generateQuestions(state.resumeData, state.role, state.apiKey);
    state.currentQ = 0;
    state.answers  = [];
    state.confidenceScores = [];
    startTimer();
    askQuestion(0);
  } catch(err) {
    document.getElementById('ai-question-text').textContent = '⚠ ' + err.message;
  }
};

function askQuestion(index) {
  if (index >= state.questions.length) {
    finishInterview();
    return;
  }
  const q = state.questions[index];
  updateQuestionCounter();
  document.getElementById('ai-question-text').textContent = `"${q}"`;
  document.getElementById('live-transcript').textContent = 'Listening…';

  speak(q, () => {
    startListening();
  });
}

async function submitAnswer(transcript) {
  stopListening();
  document.getElementById('live-transcript').textContent = transcript;

  const q = state.questions[state.currentQ];
  const emotion = detectEmotion(transcript, 0);
  showEmotion(emotion.label);
  updateConfidence(emotion.score);

  // Evaluate
  let evalResult = { score: 50, follow_up: "Hmm, okay. Let's move on.", coaching: '' };
  try {
    evalResult = await evaluateAnswer(q, transcript, emotion.label, state.resumeData, state.apiKey);
  } catch(e) { console.warn('Eval error:', e); }

  state.answers.push({
    question: q,
    answer: transcript,
    score: evalResult.score,
    emotion: emotion.label,
    coaching: evalResult.coaching
  });

  // Speak follow-up then next question
  speak(evalResult.follow_up, () => {
    state.currentQ++;
    if (state.currentQ < state.questions.length) {
      setTimeout(() => askQuestion(state.currentQ), 800);
    } else {
      finishInterview();
    }
  });
}

window.skipQuestion = () => {
  state.synth.cancel();
  stopListening();
  state.answers.push({
    question: state.questions[state.currentQ] || '',
    answer: '[skipped]',
    score: 40,
    emotion: 'Calm',
    coaching: 'Candidate skipped this question.'
  });
  state.currentQ++;
  if (state.currentQ < state.questions.length) {
    askQuestion(state.currentQ);
  } else {
    finishInterview();
  }
};

window.endInterview = () => {
  state.synth.cancel();
  stopListening();
  finishInterview();
};

async function finishInterview() {
  stopTimer();
  stopListening();
  state.synth.cancel();

  goToScreen('feedback');
  renderFeedbackLoading();

  try {
    const report = await generateReport(state.answers, state.resumeData, state.role, state.apiKey);
    renderFeedback(report);
  } catch(err) {
    document.getElementById('feedback-subtitle').textContent = '⚠ Could not generate report: ' + err.message;
    renderFeedbackFallback();
  }
}

// ── Feedback Rendering ────────────────────────────────
function renderFeedbackLoading() {
  document.getElementById('feedback-subtitle').textContent = 'Generating your AI report…';
  document.getElementById('score-confidence').textContent = '…';
  document.getElementById('score-comm').textContent = '…';
  document.getElementById('score-tech').textContent = '…';
}

function renderFeedback(report) {
  document.getElementById('feedback-subtitle').textContent =
    `Your cognitive footprint from the ${state.role} interview has been mapped. Explore your metrics below.`;

  // Scores
  animateScore('score-confidence', 'bar-confidence', report.confidence_score || 75);
  animateScore('score-comm',       'bar-comm',       report.communication_score || 80);
  animateScore('score-tech',       'bar-tech',       report.technical_score || 65);

  // Competency bars
  const compEl = document.getElementById('competency-bars');
  compEl.innerHTML = (report.competencies || []).slice(0,5).map(c => `
    <div class="space-y-2">
      <div class="flex justify-between items-end">
        <span class="font-headline font-semibold text-on-surface">${c.name}</span>
        <span class="text-on-surface-variant text-sm">${c.score}%</span>
      </div>
      <div class="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
        <div class="score-bar h-full bg-primary-container rounded-full" style="width:0%" data-target="${c.score}%"></div>
      </div>
    </div>
  `).join('');
  setTimeout(() => {
    document.querySelectorAll('.score-bar').forEach(bar => {
      bar.style.width = bar.dataset.target;
    });
  }, 100);

  // Strengths
  const strEl = document.getElementById('strengths-list');
  strEl.innerHTML = (report.strengths || state.resumeData?.strengths || []).map(s => `
    <li class="flex gap-4">
      <span class="material-symbols-outlined text-primary-container shrink-0">check_circle</span>
      <p class="text-on-surface-variant text-sm">${s}</p>
    </li>
  `).join('');

  // Growth areas
  const growEl = document.getElementById('growth-list');
  growEl.innerHTML = (report.growth_areas || state.resumeData?.weaknesses || []).map(g => `
    <li class="flex gap-4">
      <span class="material-symbols-outlined text-tertiary shrink-0">priority_high</span>
      <p class="text-on-surface-variant text-sm">${g}</p>
    </li>
  `).join('');

  // Coaching
  const coachEl = document.getElementById('coaching-list');
  coachEl.innerHTML = (report.coaching || []).map(c => `
    <div class="flex gap-6 items-start">
      <div class="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-primary">auto_awesome</span>
      </div>
      <div class="bg-surface-container-low p-6 rounded-3xl asymmetric-bubble flex-1">
        <p class="text-on-surface mb-3 italic">"${c.tip}"</p>
        <div class="flex gap-2 flex-wrap">
          ${(c.tags||[]).map(t => `<span class="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-medium">${t}</span>`).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function renderFeedbackFallback() {
  // Compute rough scores from answers
  const avg = state.answers.length
    ? Math.round(state.answers.reduce((a,b)=>a+(b.score||50),0)/state.answers.length)
    : 60;
  animateScore('score-confidence', 'bar-confidence', avg);
  animateScore('score-comm',       'bar-comm',       avg + 5);
  animateScore('score-tech',       'bar-tech',       avg - 10);

  document.getElementById('strengths-list').innerHTML =
    (state.resumeData?.strengths || ['Good project experience']).map(s =>
      `<li class="flex gap-4"><span class="material-symbols-outlined text-primary-container shrink-0">check_circle</span><p class="text-on-surface-variant text-sm">${s}</p></li>`
    ).join('');

  document.getElementById('growth-list').innerHTML =
    (state.resumeData?.weaknesses || ['Continue practicing technical questions']).map(g =>
      `<li class="flex gap-4"><span class="material-symbols-outlined text-tertiary shrink-0">priority_high</span><p class="text-on-surface-variant text-sm">${g}</p></li>`
    ).join('');
}

function animateScore(scoreId, barId, value) {
  const scoreEl = document.getElementById(scoreId);
  const barEl   = document.getElementById(barId);
  scoreEl.textContent = '0';
  let current = 0;
  const step = Math.ceil(value / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, value);
    scoreEl.textContent = current;
    barEl.style.width = current + '%';
    if (current >= value) clearInterval(timer);
  }, 30);
}

// ── Export Report ─────────────────────────────────────
window.exportReport = () => {
  const lines = [
    `COGNITIVE ECHO — Interview Report`,
    `Candidate: ${state.resumeData?.name || 'Unknown'}`,
    `Role: ${state.role}`,
    `Date: ${new Date().toLocaleDateString()}`,
    ``,
    `SCORES`,
    `Confidence:    ${document.getElementById('score-confidence').textContent}%`,
    `Communication: ${document.getElementById('score-comm').textContent}%`,
    `Technical:     ${document.getElementById('score-tech').textContent}%`,
    ``,
    `Q&A TRANSCRIPT`,
    ...state.answers.map((a,i) =>
      `Q${i+1}: ${a.question}\nA: ${a.answer}\nScore: ${a.score}/100 | Emotion: ${a.emotion}\n`
    )
  ].join('\n');

  const blob = new Blob([lines], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `cognitive-echo-report-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  goToScreen('prepare');
  // Pre-load voices
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
});
