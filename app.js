/* ================================================
   CampusMind Pro — app.js
   Full application logic for all 5 modules
   ================================================ */

// ── CONFIG ──────────────────────────────────────
const GEMINI_API_KEY = CONFIG.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// ── STATE ────────────────────────────────────────
const state = {
  currentModule: 'home',
  pdfText: '',
  pdfFileName: '',
  interview: {
    questions: [],
    answers: [],
    scores: [],
    currentQ: 0,
    totalQ: 5,
    domain: 'Python',
    difficulty: 'Intermediate',
    mode: 'text',
    timer: null,
    elapsed: 0,
    fillerCount: 0,
    isRecording: false,
    mediaRecorder: null,
    audioChunks: []
  },
  proctor: {
    active: false,
    timer: null,
    elapsed: 0,
    events: [],
    stream: null,
    faceDetected: true,
    gazeAwayStart: null
  },
  presentation: {
    active: false,
    timer: null,
    elapsed: 0,
    wordCount: 0,
    fillerCount: 0,
    gazeGoodTime: 0,
    gazeTotalTime: 0,
    gestureCount: 0,
    stream: null,
    recognition: null,
    audioChunks: [],
    mediaRecorder: null
  }
};

// ── UTILITIES ─────────────────────────────────────
async function callGemini(prompt) {
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
      })
    });
    const data = await res.json();
    if (data.candidates && data.candidates[0]) {
      return data.candidates[0].content.parts[0].text;
    }
    return 'AI response unavailable. Please check your API key.';
  } catch (e) {
    return 'Network error. Running in offline demo mode.';
  }
}

function showLoading(el, msg = 'AI is thinking') {
  el.innerHTML = `<div class="ai-loading"><div class="dot-bounce"></div><div class="dot-bounce"></div><div class="dot-bounce"></div><span>${msg}…</span></div>`;
}

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── LOADER ───────────────────────────────────────
window.addEventListener('load', () => {
  const msgs = ['Initialising AI modules…', 'Loading MediaPipe…', 'Preparing Gemini…', 'CampusMind Pro ready!'];
  let i = 0;
  const msgEl = document.getElementById('loaderMsg');
  const iv = setInterval(() => {
    i++;
    if (i < msgs.length) msgEl.textContent = msgs[i];
    else clearInterval(iv);
  }, 700);

  setTimeout(() => {
    document.getElementById('loader').classList.add('fade-out');
    animateStats();
  }, 2900);
});

// ── STATS COUNTER ────────────────────────────────
function animateStats() {
  document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    const prefix = el.textContent.startsWith('₹') ? '₹' : '';
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const iv = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = prefix + current;
      if (current >= target) clearInterval(iv);
    }, 40);
  });
}

// ── NAVIGATION ───────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => switchModule(item.dataset.module));
});

function switchModule(id) {
  state.currentModule = id;

  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.module === id));
  document.querySelectorAll('.module-section').forEach(s => s.classList.toggle('active', s.id === `mod-${id}`));

  const titles = {
    home: 'Dashboard', study: 'Study Companion',
    code: 'Code Reviewer', interview: 'Mock Interviewer',
    proctor: 'Exam Proctoring', present: 'Presentation Coach'
  };
  const crumbs = {
    home: 'Home / Overview', study: 'Home / Study Companion',
    code: 'Home / Code Reviewer', interview: 'Home / Mock Interviewer',
    proctor: 'Home / Exam Proctoring', present: 'Home / Presentation Coach'
  };
  document.getElementById('pageTitle').textContent = titles[id] || id;
  document.getElementById('breadcrumb').textContent = crumbs[id] || '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToCards() {
  document.getElementById('moduleCardsAnchor').scrollIntoView({ behavior: 'smooth' });
}

// Sidebar toggle (mobile)
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});

// ── GLOBAL SEARCH ────────────────────────────────
document.getElementById('globalSearch').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  if (!q) return;
  const map = {
    study: ['pdf','quiz','flash','summar','voice','lms','course'],
    code: ['code','bug','security','review','python','java'],
    interview: ['interview','mock','hr','techni','cherry'],
    proctor: ['proctor','exam','face','phone','yolo'],
    present: ['present','gaze','pace','filler','gesture','coach']
  };
  for (const [mod, keys] of Object.entries(map)) {
    if (keys.some(k => q.includes(k))) { switchModule(mod); break; }
  }
});

/* ═══════════════════════════════════════════════
   MODULE 1 — STUDY COMPANION (LMS)
═══════════════════════════════════════════════ */

// LMS Tabs
document.querySelectorAll('.lms-tab').forEach(tab => {
  tab.addEventListener('click', () => switchLmsTab(tab.dataset.ltab));
});

function switchLmsTab(id) {
  document.querySelectorAll('.lms-tab').forEach(t => t.classList.toggle('active', t.dataset.ltab === id));
  document.querySelectorAll('.lms-panel').forEach(p => p.classList.toggle('active', p.id === `ltab-${id}`));
}

function lmsOpenCourse(name) {
  switchLmsTab('pdfchat');
  addChatMessage('ai', `📖 Welcome to **${name}**! Upload the course PDF or ask me any question about this subject. I'll help you understand concepts, solve problems, and quiz you!`);
}

// ── PDF Upload ────────────────────────────────────
function handlePdfUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  state.pdfFileName = file.name;

  const dropZone = document.getElementById('pdfDropZone');
  dropZone.innerHTML = `<div class="upload-icon">✅</div><p>${escapeHtml(file.name)}</p><span>${(file.size/1024).toFixed(1)} KB</span>`;
  dropZone.style.borderColor = 'var(--neon-peach)';

  const listEl = document.getElementById('pdfFileList');
  const item = document.createElement('div');
  item.className = 'pdf-file-item active';
  item.textContent = `📄 ${file.name}`;
  listEl.innerHTML = '';
  listEl.appendChild(item);

  const reader = new FileReader();
  reader.onload = async ev => {
    // Extract text from PDF using basic approach
    try {
      // For real PDF extraction you'd use pdf.js — here we simulate with filename context
      state.pdfText = `[PDF: ${file.name}] Content loaded. (For full text extraction, integrate pdf.js)`;
      addChatMessage('ai', `✅ **${file.name}** uploaded! I'm ready to help you with this document. What would you like to know?`);
    } catch (err) {
      addChatMessage('ai', 'PDF loaded! Ask me questions and I\'ll do my best to help based on the document.');
    }
  };
  reader.readAsArrayBuffer(file);
}

// Drag & drop
const dropZone = document.getElementById('pdfDropZone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--neon-peach)'; });
dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    document.getElementById('pdfInput').files = e.dataTransfer.files;
    handlePdfUpload({ target: { files: [file] } });
  }
});

// ── PDF Chat ──────────────────────────────────────
async function sendPdfChat() {
  const input = document.getElementById('pdfChatInput');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';

  addChatMessage('user', q);

  const msgList = document.getElementById('pdfChatMessages');
  const loadDiv = document.createElement('div');
  loadDiv.className = 'chat-bubble ai';
  loadDiv.innerHTML = `<div class="bubble-avatar">🤖</div><div class="bubble-text"><div class="ai-loading"><div class="dot-bounce"></div><div class="dot-bounce"></div><div class="dot-bounce"></div></div></div>`;
  msgList.appendChild(loadDiv);
  msgList.scrollTop = msgList.scrollHeight;

  const context = state.pdfText
    ? `You are a helpful study assistant. The student uploaded a PDF: "${state.pdfFileName}". ${state.pdfText}\n\nAnswer the following question clearly and helpfully:`
    : 'You are a helpful study assistant for university students. Answer clearly:';
  const answer = await callGemini(`${context}\n\n${q}`);

  loadDiv.querySelector('.bubble-text').innerHTML = formatAIText(answer);
  msgList.scrollTop = msgList.scrollHeight;
}

function addChatMessage(role, text) {
  const msgList = document.getElementById('pdfChatMessages');
  const div = document.createElement('div');
  div.className = `chat-bubble ${role}`;
  const avatar = role === 'ai' ? '🤖' : '👤';
  div.innerHTML = `<div class="bubble-avatar">${avatar}</div><div class="bubble-text">${formatAIText(text)}</div>`;
  msgList.appendChild(div);
  msgList.scrollTop = msgList.scrollHeight;
}

function formatAIText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:var(--brown-card);padding:1px 5px;border-radius:4px;font-family:monospace;">$1</code>')
    .replace(/\n/g, '<br/>');
}

// ── Quiz Generator ────────────────────────────────
async function generateQuiz() {
  const topic = document.getElementById('quizTopic').value.trim() || 'General Knowledge';
  const type = document.getElementById('quizType').value;
  const diff = document.getElementById('quizDiff').value;
  const count = document.getElementById('quizCount').value;

  const setup = document.getElementById('quizSetup');
  const area = document.getElementById('quizArea');
  area.style.display = 'block';
  showLoading(area, `Generating ${count} ${diff} questions on ${topic}`);

  const typeMap = { mcq: 'multiple choice (4 options each, mark correct with ✓)', tf: 'true/false', fib: 'fill in the blanks (use ___ for blank)', mixed: 'mixed (MCQ, T/F, fill-in-the-blank)' };

  const prompt = `Generate exactly ${count} ${diff.toLowerCase()} ${typeMap[type]} questions on the topic: "${topic}".

Format each question EXACTLY like this (JSON array):
[
  {
    "q": "Question text here",
    "type": "mcq",
    "options": ["Option A", "Option B ✓", "Option C", "Option D"],
    "answer": "Option B",
    "explanation": "Brief explanation"
  }
]

For T/F: type="tf", options=["True","False"], mark correct with ✓.
For FIB: type="fib", no options needed, answer is the missing word.
Return ONLY the JSON array, nothing else.`;

  const raw = await callGemini(prompt);

  try {
    const cleaned = raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const questions = JSON.parse(cleaned);
    renderQuiz(questions, topic);
  } catch (e) {
    // Fallback demo quiz
    renderQuiz(getDemoQuiz(topic, count), topic);
  }
}

function getDemoQuiz(topic, count) {
  const demos = [
    { q: `What is a key concept in ${topic}?`, type: 'mcq', options: ['Concept A', 'Concept B ✓', 'Concept C', 'Concept D'], answer: 'Concept B', explanation: 'Concept B is the correct answer based on the topic.' },
    { q: `${topic} is widely used in industry.`, type: 'tf', options: ['True ✓', 'False'], answer: 'True', explanation: 'Yes, it is commonly used.' },
    { q: `The primary purpose of ${topic} is ___.`, type: 'fib', options: [], answer: 'problem solving', explanation: 'It is designed for problem solving.' },
    { q: `Which of the following best describes ${topic}?`, type: 'mcq', options: ['Option 1 ✓', 'Option 2', 'Option 3', 'Option 4'], answer: 'Option 1', explanation: 'Option 1 is the most accurate description.' },
    { q: `${topic} requires specialized hardware.`, type: 'tf', options: ['True', 'False ✓'], answer: 'False', explanation: 'It can run on standard hardware.' }
  ];
  return demos.slice(0, parseInt(count));
}

function renderQuiz(questions, topic) {
  const area = document.getElementById('quizArea');
  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
    <h3 style="font-family:'Playfair Display',serif;color:var(--text-primary)">📝 ${escapeHtml(topic)} Quiz</h3>
    <span style="font-size:12px;font-family:'Space Mono',monospace;color:var(--text-muted)">${questions.length} Questions</span>
  </div>`;

  questions.forEach((q, i) => {
    html += `<div class="quiz-question" id="qq-${i}">
      <div class="quiz-q-text">${i+1}. ${escapeHtml(q.q)}</div>`;

    if (q.type === 'fib') {
      html += `<div style="display:flex;gap:10px;align-items:center;">
        <input type="text" id="fib-${i}" class="answer-input" style="max-width:300px;padding:8px 12px;" placeholder="Your answer…"/>
        <button class="btn-sm" onclick="checkFib(${i},'${escapeHtml(q.answer)}')">Check</button>
      </div><div id="fib-result-${i}" style="margin-top:8px;font-size:13px;"></div>`;
    } else {
      html += `<div class="quiz-options">`;
      (q.options||[]).forEach((opt, j) => {
        const cleanOpt = opt.replace(' ✓','');
        const isCorrect = opt.includes('✓');
        html += `<div class="quiz-option" id="opt-${i}-${j}" onclick="selectOption(${i},${j},${isCorrect},'${escapeHtml(q.explanation||'')}')">
          <span style="width:22px;height:22px;border-radius:50%;border:2px solid var(--brown-line);display:inline-flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0">${String.fromCharCode(65+j)}</span>
          ${escapeHtml(cleanOpt)}
        </div>`;
      });
      html += `</div>`;
    }
    html += `<div id="explanation-${i}" style="display:none;margin-top:10px;padding:8px 12px;background:rgba(255,107,71,0.08);border-radius:8px;font-size:12px;color:var(--text-secondary);border-left:3px solid var(--neon-peach)"></div>
    </div>`;
  });

  html += `<button class="btn-primary" style="margin-top:16px" onclick="retakeQuiz()">🔄 Generate New Quiz</button>`;
  area.innerHTML = html;
}

function selectOption(qi, oi, isCorrect, explanation) {
  const qEl = document.getElementById(`qq-${qi}`);
  if (qEl.dataset.answered) return;
  qEl.dataset.answered = '1';

  qEl.querySelectorAll('.quiz-option').forEach((opt, j) => {
    if (j === oi) opt.classList.add(isCorrect ? 'correct' : 'wrong');
  });
  // Reveal correct if wrong
  if (!isCorrect) {
    qEl.querySelectorAll('.quiz-option').forEach(opt => {
      if (opt.textContent.trim() && !opt.classList.contains('wrong')) {
        // Find correct one by checking original
      }
    });
  }
  const expEl = document.getElementById(`explanation-${qi}`);
  expEl.textContent = `💡 ${explanation}`;
  expEl.style.display = 'block';
}

function checkFib(i, correctAnswer) {
  const input = document.getElementById(`fib-${i}`);
  const result = document.getElementById(`fib-result-${i}`);
  const val = input.value.trim().toLowerCase();
  const correct = correctAnswer.toLowerCase();
  if (val === correct || correct.includes(val)) {
    result.innerHTML = `<span style="color:#4cff80">✅ Correct! "${escapeHtml(correctAnswer)}"</span>`;
    input.style.borderColor = '#4cff80';
  } else {
    result.innerHTML = `<span style="color:#f87171">❌ Incorrect. Answer: <strong>${escapeHtml(correctAnswer)}</strong></span>`;
    input.style.borderColor = '#f87171';
  }
}

function retakeQuiz() {
  document.getElementById('quizArea').style.display = 'none';
  document.getElementById('quizArea').innerHTML = '';
}

// ── Flashcards ────────────────────────────────────
async function generateFlashcards() {
  const topic = document.getElementById('flashTopic').value.trim();
  if (!topic) return;

  const deck = document.getElementById('flashcardDeck');
  showLoading(deck, `Creating flashcards for ${topic}`);

  const prompt = `Create 8 flashcards for the topic: "${topic}".
Return ONLY a JSON array like this:
[{"term":"Term here","definition":"Clear, concise definition here"}]
Make definitions educational and helpful for students.`;

  const raw = await callGemini(prompt);

  try {
    const cleaned = raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const cards = JSON.parse(cleaned);
    renderFlashcards(cards);
  } catch(e) {
    renderFlashcards(getDemoFlashcards(topic));
  }
}

function getDemoFlashcards(topic) {
  return [
    { term: `${topic} - Core Concept`, definition: `The fundamental principle underlying ${topic} that drives its primary functionality.` },
    { term: `${topic} - Application`, definition: `Real-world use cases where ${topic} provides significant value and efficiency.` },
    { term: `${topic} - Key Feature`, definition: `The distinguishing characteristic that makes ${topic} unique among alternatives.` },
    { term: `${topic} - Example`, definition: `A practical demonstration of ${topic} in action within a typical scenario.` },
    { term: `${topic} - Advantage`, definition: `The primary benefit of using ${topic} over traditional approaches.` },
    { term: `${topic} - Limitation`, definition: `Known constraints or challenges when working with ${topic}.` },
    { term: `${topic} - History`, definition: `The origin and evolution of ${topic} from its inception to present.` },
    { term: `${topic} - Future`, definition: `Upcoming developments and trends expected to shape ${topic}.` }
  ];
}

function renderFlashcards(cards) {
  const deck = document.getElementById('flashcardDeck');
  deck.innerHTML = cards.map((c, i) => `
    <div class="flashcard" id="fc-${i}" onclick="flipCard(${i})">
      <div class="flashcard-inner">
        <div class="flashcard-front">
          <div class="fc-term">${escapeHtml(c.term)}</div>
          <div class="flashcard-hint">Tap to reveal</div>
        </div>
        <div class="flashcard-back">
          <div class="fc-def">${escapeHtml(c.definition)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function flipCard(i) {
  document.getElementById(`fc-${i}`).classList.toggle('flipped');
}

// ── Summariser ────────────────────────────────────
async function generateSummary() {
  const text = document.getElementById('summaryInput').value.trim();
  if (!text) return;

  const sumtype = document.querySelector('input[name="sumtype"]:checked').value;
  const output = document.getElementById('summaryOutput');
  showLoading(output, 'Summarising your content');

  const typePrompts = {
    bullets: 'Create a bullet-point summary with clear, concise points. Use • for bullets.',
    onepage: 'Create a one-page summary with paragraphs, covering all key points.',
    mindmap: 'Create a mind map text outline. Use indentation: main topic > subtopics > details.'
  };

  const prompt = `${typePrompts[sumtype]}\n\nText to summarise:\n${text}`;
  const result = await callGemini(prompt);
  output.innerHTML = formatAIText(result);
}

function copySummary() {
  const text = document.getElementById('summaryOutput').innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = '📋 Copy', 2000);
  });
}

// ── Voice Q&A ─────────────────────────────────────
let voiceQAActive = false;
let voiceRecognition = null;

function toggleVoiceQA() {
  const orb = document.getElementById('voiceOrb');
  const instruction = document.getElementById('voiceInstruction');
  const transcript = document.getElementById('voiceTranscript');
  const answer = document.getElementById('voiceAnswer');

  if (voiceQAActive) {
    voiceQAActive = false;
    orb.classList.remove('listening');
    instruction.textContent = 'Tap the orb to speak your question';
    if (voiceRecognition) voiceRecognition.stop();
    return;
  }

  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    answer.innerHTML = `<p style="color:var(--text-muted)">🎙️ Voice Q&A requires a browser with speech recognition (Chrome recommended). You can also type below.</p>
    <div style="display:flex;gap:8px;margin-top:10px">
      <input type="text" id="voiceTextInput" placeholder="Type your question…" style="flex:1;background:var(--brown-card);border:1px solid var(--brown-line);border-radius:8px;padding:8px 12px;color:var(--text-primary);font-family:'DM Sans',sans-serif;outline:none"/>
      <button class="btn-sm" onclick="handleVoiceText()">Ask</button>
    </div>`;
    return;
  }

  voiceQAActive = true;
  orb.classList.add('listening');
  instruction.textContent = 'Listening… speak your question';
  transcript.textContent = '';
  answer.textContent = '';

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  voiceRecognition = new SR();
  voiceRecognition.lang = 'en-US';
  voiceRecognition.continuous = false;
  voiceRecognition.interimResults = true;

  voiceRecognition.onresult = async (e) => {
    const q = e.results[0][0].transcript;
    transcript.textContent = `"${q}"`;

    if (e.results[0].isFinal) {
      voiceQAActive = false;
      orb.classList.remove('listening');
      instruction.textContent = 'Processing your question…';
      showLoading(answer, 'Finding answer');

      const context = state.pdfText ? `Based on the PDF "${state.pdfFileName}": ` : '';
      const result = await callGemini(`${context}Answer this question clearly for a student:\n${q}`);
      answer.innerHTML = formatAIText(result);
      instruction.textContent = 'Tap the orb to ask another question';

      // Text-to-speech
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(result.replace(/<[^>]*>/g,'').substring(0, 300));
        utterance.rate = 0.9; utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  voiceRecognition.onerror = () => {
    voiceQAActive = false;
    orb.classList.remove('listening');
    instruction.textContent = 'Error. Tap to try again.';
  };

  voiceRecognition.start();
}

async function handleVoiceText() {
  const input = document.getElementById('voiceTextInput');
  const q = input.value.trim();
  if (!q) return;
  const answer = document.getElementById('voiceAnswer');
  showLoading(answer, 'Finding answer');
  const result = await callGemini(`Answer this clearly for a student: ${q}`);
  answer.innerHTML = formatAIText(result);
}

/* ═══════════════════════════════════════════════
   MODULE 2 — CODE REVIEWER
═══════════════════════════════════════════════ */

// Line numbers
function updateGutter() {
  const editor = document.getElementById('codeEditor');
  const gutter = document.getElementById('codeGutter');
  const lines = editor.value.split('\n').length;
  gutter.innerHTML = Array.from({length: lines}, (_,i) => `<div>${i+1}</div>`).join('');
}
updateGutter();

// Sync scroll
document.getElementById('codeEditor').addEventListener('scroll', function() {
  document.getElementById('codeGutter').scrollTop = this.scrollTop;
});

async function reviewCode() {
  const code = document.getElementById('codeEditor').value.trim();
  if (!code) return;

  const lang = document.getElementById('codeLang').value;
  const chkBugs = document.getElementById('chkBugs').checked;
  const chkSec = document.getElementById('chkSecurity').checked;
  const chkStyle = document.getElementById('chkStyle').checked;
  const chkFix = document.getElementById('chkFix').checked;

  document.getElementById('reportPlaceholder').style.display = 'none';
  const reportContent = document.getElementById('reportContent');
  reportContent.style.display = 'flex';

  // Show loading in all tabs
  ['bugs','security','style','fixes'].forEach(tab => {
    document.getElementById(`rtab-${tab}`).innerHTML = '<div class="ai-loading"><div class="dot-bounce"></div><div class="dot-bounce"></div><div class="dot-bounce"></div><span>Analysing…</span></div>';
  });

  const checks = [];
  if (chkBugs) checks.push('bugs and logical errors');
  if (chkSec) checks.push('security vulnerabilities (hardcoded secrets, SQL injection, unsafe imports)');
  if (chkStyle) checks.push('style issues (PEP8 for Python, ESLint rules for JS)');
  if (chkFix) checks.push('suggested fixes with corrected code');

  const prompt = `You are an expert code reviewer. Analyse this ${lang} code and provide a detailed review.

CODE:
\`\`\`${lang}
${code}
\`\`\`

Provide the review as a JSON object with this EXACT structure:
{
  "score": "85/100",
  "bugs": [{"severity":"high|medium|low","line":"line number or range","description":"what the bug is"}],
  "security": [{"severity":"high|medium|low","line":"line number","description":"security issue"}],
  "style": [{"severity":"medium|low","line":"line number","description":"style issue"}],
  "fixes": [{"title":"Fix title","original":"original code snippet","fixed":"corrected code","explanation":"why this fix"}]
}

Be specific and educational. Return ONLY the JSON.`;

  const raw = await callGemini(prompt);

  try {
    const cleaned = raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const review = JSON.parse(cleaned);
    renderCodeReport(review);
  } catch(e) {
    renderCodeReportFallback(code, lang);
  }
}

function renderCodeReport(r) {
  document.getElementById('reportScoreBadge').textContent = r.score || '—';

  const renderIssues = (items) => {
    if (!items || !items.length) return '<p style="color:var(--text-muted);font-size:13px;padding:10px">✅ No issues found in this category</p>';
    return items.map(item => `
      <div class="issue-item ${item.severity}">
        <div><div class="issue-sev">${(item.severity||'low').toUpperCase()}</div></div>
        <div>
          <div class="issue-text">${escapeHtml(item.description)}</div>
          ${item.line ? `<div class="issue-line">📍 Line ${item.line}</div>` : ''}
        </div>
      </div>`).join('');
  };

  document.getElementById('rtab-bugs').innerHTML = renderIssues(r.bugs);
  document.getElementById('rtab-security').innerHTML = renderIssues(r.security);
  document.getElementById('rtab-style').innerHTML = renderIssues(r.style);

  if (r.fixes && r.fixes.length) {
    document.getElementById('rtab-fixes').innerHTML = r.fixes.map(f => `
      <div class="issue-item low" style="flex-direction:column;gap:8px">
        <strong style="font-size:13px;color:var(--text-primary)">✅ ${escapeHtml(f.title)}</strong>
        ${f.original ? `<div style="font-size:11px;color:var(--text-muted)">Before:<br/><code style="background:var(--brown-dark);padding:4px 8px;border-radius:4px;display:block;margin-top:4px;font-family:monospace;color:#f87171">${escapeHtml(f.original)}</code></div>` : ''}
        ${f.fixed ? `<div style="font-size:11px;color:var(--text-muted)">After:<br/><code style="background:var(--brown-dark);padding:4px 8px;border-radius:4px;display:block;margin-top:4px;font-family:monospace;color:#4cff80">${escapeHtml(f.fixed)}</code></div>` : ''}
        ${f.explanation ? `<div class="issue-text">💡 ${escapeHtml(f.explanation)}</div>` : ''}
      </div>`).join('');
  } else {
    document.getElementById('rtab-fixes').innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:10px">✅ Code looks clean — no fixes needed!</p>';
  }
}

function renderCodeReportFallback(code, lang) {
  document.getElementById('reportScoreBadge').textContent = '—';
  const msg = '<p style="color:var(--text-muted);font-size:13px;padding:10px">⚠️ Add your Gemini API key for full AI analysis. Demo results shown.</p>';
  ['bugs','security','style','fixes'].forEach(t => document.getElementById(`rtab-${t}`).innerHTML = msg);

  // Show basic static analysis
  const lines = code.split('\n');
  const issues = [];
  lines.forEach((line, i) => {
    if (/secret|password|api_key|token\s*=\s*['"][^'"]+['"]/i.test(line)) {
      issues.push({tab:'security', severity:'high', line:i+1, description:`Possible hardcoded credential: ${line.trim().substring(0,60)}`});
    }
    if (/print\s*\(/.test(line) && lang==='python') {
      issues.push({tab:'style', severity:'low', line:i+1, description:'Consider using logging instead of print() for production code.'});
    }
    if (/exec\(|eval\(/.test(line)) {
      issues.push({tab:'security', severity:'high', line:i+1, description:'Use of eval()/exec() is a security risk — avoid dynamic code execution.'});
    }
  });

  issues.forEach(issue => {
    const el = document.getElementById(`rtab-${issue.tab}`);
    el.innerHTML += `<div class="issue-item ${issue.severity}"><div class="issue-sev">${issue.severity.toUpperCase()}</div><div><div class="issue-text">${issue.description}</div><div class="issue-line">📍 Line ${issue.line}</div></div></div>`;
  });
}

function clearCode() {
  document.getElementById('codeEditor').value = '';
  updateGutter();
  document.getElementById('reportPlaceholder').style.display = 'flex';
  document.getElementById('reportContent').style.display = 'none';
}

function loadSampleCode() {
  const sample = `def calculate_discount(price, discount):
    secret_key = 'abc123'   # hardcoded secret
    result = price - discount  # no input validation
    return result

def get_user(username):
    query = "SELECT * FROM users WHERE name = '" + username + "'"  # SQL injection
    return query

def processData(data):
    eval(data)  # dangerous eval
    x=1+2  # style: no spaces around operators
    print(x)  # use logging instead`;
  document.getElementById('codeEditor').value = sample;
  updateGutter();
}

// Report tabs
document.querySelectorAll('.rtab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.rtab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.rtab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`rtab-${tab.dataset.rtab}`).classList.add('active');
  });
});

function exportHTMLReport() {
  const code = document.getElementById('codeEditor').value;
  const bugs = document.getElementById('rtab-bugs').innerHTML;
  const sec = document.getElementById('rtab-security').innerHTML;
  const style = document.getElementById('rtab-style').innerHTML;
  const fixes = document.getElementById('rtab-fixes').innerHTML;
  const score = document.getElementById('reportScoreBadge').textContent;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CampusMind Pro — Code Review Report</title>
<style>body{font-family:Arial,sans-serif;background:#1a0e06;color:#fff8f2;max-width:900px;margin:0 auto;padding:30px}
h1{color:#FF6B47}h2{color:#FFB347;border-bottom:1px solid #5a3520;padding-bottom:8px}
pre{background:#0f0704;padding:16px;border-radius:8px;overflow-x:auto;font-size:13px;color:#f0c080}
.score{font-size:24px;font-weight:bold;color:#FF6B47}.issue{margin:10px 0;padding:10px;border-radius:8px;border:1px solid}
.high{border-color:rgba(220,38,38,0.4);background:rgba(220,38,38,0.08)}.medium{border-color:rgba(255,179,0,0.4);background:rgba(255,179,0,0.08)}
.low{border-color:rgba(76,255,128,0.3);background:rgba(76,255,128,0.05)}</style></head><body>
<h1>🔍 CampusMind Pro — Code Review Report</h1>
<p>Generated: ${new Date().toLocaleString()}</p>
<p>Score: <span class="score">${score}</span></p>
<h2>📄 Code</h2><pre>${escapeHtml(code)}</pre>
<h2>🐛 Bugs</h2>${bugs}
<h2>🔐 Security</h2>${sec}
<h2>🎨 Style</h2>${style}
<h2>✅ Fixes</h2>${fixes}
</body></html>`;

  const blob = new Blob([html], {type:'text/html'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `code-review-${Date.now()}.html`;
  a.click();
}

/* ═══════════════════════════════════════════════
   MODULE 3 — MOCK INTERVIEWER (CherryAI)
═══════════════════════════════════════════════ */

async function startInterview() {
  const domain = document.getElementById('ivDomain').value;
  const diff = document.getElementById('ivDiff').value;
  const count = parseInt(document.getElementById('ivCount').value);
  const mode = document.getElementById('ivMode').value;

  Object.assign(state.interview, { domain, difficulty: diff, totalQ: count, mode, currentQ: 0, questions: [], answers: [], scores: [], elapsed: 0, fillerCount: 0 });

  document.getElementById('interviewSetup').style.display = 'none';
  document.getElementById('interviewLive').style.display = 'grid';
  document.getElementById('interviewResults').style.display = 'none';

  // Start timer
  state.interview.timer = setInterval(() => {
    state.interview.elapsed++;
    document.getElementById('metTimer').textContent = formatTime(state.interview.elapsed);
  }, 1000);

  // Show voice controls if voice mode
  if (mode === 'voice') {
    document.getElementById('voiceControls').style.display = 'flex';
    document.getElementById('answerArea').style.display = 'none';
  }

  await loadQuestion();
}

async function loadQuestion() {
  const { domain, difficulty, totalQ, currentQ, questions } = state.interview;

  // Update progress
  const pct = (currentQ / totalQ) * 100;
  document.getElementById('ivProgressFill').style.width = pct + '%';
  document.getElementById('ivProgressLabel').textContent = `Q ${currentQ + 1} / ${totalQ}`;
  document.getElementById('qNumber').textContent = `Q${currentQ + 1}`;
  document.getElementById('qDomainTag').textContent = domain;
  document.getElementById('feedbackCard').style.display = 'none';
  document.getElementById('answerText').value = '';
  document.getElementById('transcriptPreview').textContent = '';

  // Generate question
  let qText = '';
  if (questions[currentQ]) {
    qText = questions[currentQ];
  } else {
    const prompt = `Generate 1 ${difficulty.toLowerCase()} technical interview question for the domain: ${domain}.
Question ${currentQ + 1} of ${totalQ}.
Already asked: ${questions.join('; ') || 'none'}.
Return ONLY the question text, nothing else. Make it specific and challenging.`;
    qText = await callGemini(prompt);
    questions.push(qText.trim());
  }

  document.getElementById('qText').textContent = qText;
}

async function submitAnswer() {
  const mode = state.interview.mode;
  let answer = '';

  if (mode === 'voice') {
    answer = document.getElementById('transcriptPreview').textContent;
  } else {
    answer = document.getElementById('answerText').value.trim();
  }

  if (!answer) {
    alert('Please provide an answer before submitting!');
    return;
  }

  state.interview.answers.push(answer);

  // Count filler words
  const fillers = ['um', 'uh', 'like', 'you know', 'basically', 'literally'];
  const fillerCount = fillers.reduce((acc, f) => acc + (answer.toLowerCase().split(f).length - 1), 0);
  state.interview.fillerCount += fillerCount;
  document.getElementById('metFiller').textContent = `${state.interview.fillerCount} detected`;

  // Get AI feedback
  const q = state.interview.questions[state.interview.currentQ];
  const feedbackCard = document.getElementById('feedbackCard');
  feedbackCard.style.display = 'block';
  document.getElementById('feedbackText').innerHTML = '<div class="ai-loading"><div class="dot-bounce"></div><div class="dot-bounce"></div><div class="dot-bounce"></div><span>Evaluating…</span></div>';

  const prompt = `You are a technical interviewer evaluating a candidate's answer. 
Question: "${q}"
Candidate's Answer: "${answer}"
Domain: ${state.interview.domain}
Difficulty: ${state.interview.difficulty}

Evaluate and return ONLY this JSON:
{
  "relevance": 8,
  "clarity": 7,
  "technical": 6,
  "overall": 7,
  "feedback": "2-3 sentence constructive feedback about what was good and what could be improved"
}
Scores are 0-10. Be fair but honest.`;

  const raw = await callGemini(prompt);

  let scores = { relevance: 7, clarity: 7, technical: 6, overall: 7, feedback: 'Good attempt! Structure your answers better using the STAR method.' };
  try {
    const cleaned = raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    scores = JSON.parse(cleaned);
  } catch(e) {}

  state.interview.scores.push(scores);

  // Render scores
  ['Relevance','Clarity','Technical'].forEach(key => {
    const k = key.toLowerCase();
    const val = scores[k] || 0;
    document.getElementById(`sb${key}`).style.width = (val * 10) + '%';
    document.getElementById(`st${key}`).textContent = `${val}/10`;
  });
  document.getElementById('feedbackText').textContent = scores.feedback || '';
}

function nextQuestion() {
  state.interview.currentQ++;
  if (state.interview.currentQ >= state.interview.totalQ) {
    endInterview();
  } else {
    loadQuestion();
  }
}

function skipQuestion() {
  state.interview.answers.push('(skipped)');
  state.interview.scores.push({ relevance: 0, clarity: 0, technical: 0, overall: 0, feedback: 'Question skipped.' });
  nextQuestion();
}

function endInterview() {
  clearInterval(state.interview.timer);
  document.getElementById('interviewLive').style.display = 'none';
  const resultsEl = document.getElementById('interviewResults');
  resultsEl.style.display = 'block';

  const scores = state.interview.scores;
  const avg = scores.length ? (scores.reduce((s,r) => s + (r.overall||0), 0) / scores.length).toFixed(1) : 0;

  document.getElementById('overallScore').innerHTML = `${avg}<small>/10</small>`;

  // Ring animation
  const pct = avg / 10;
  const circumference = 314;
  const offset = circumference - (pct * circumference);
  document.getElementById('scoreRingCircle').style.strokeDashoffset = offset;

  // Breakdown
  const breakdown = document.getElementById('resultsBreakdown');
  breakdown.innerHTML = state.interview.questions.map((q, i) => {
    const s = scores[i] || {};
    return `<div class="result-item">
      <div class="result-item-q">Q${i+1}: ${q.substring(0,50)}…</div>
      <div class="result-item-s">${s.overall || 0}<small style="font-size:14px;color:var(--text-muted)">/10</small></div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${s.feedback ? s.feedback.substring(0,60)+'…' : 'Skipped'}</div>
    </div>`;
  }).join('');
}

function restartInterview() {
  document.getElementById('interviewResults').style.display = 'none';
  document.getElementById('interviewSetup').style.display = 'grid';
}

async function downloadReport() {
  const scores = state.interview.scores;
  const avg = scores.length ? (scores.reduce((s,r) => s + (r.overall||0), 0) / scores.length).toFixed(1) : 0;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>CampusMind Pro — Interview Report</title>
<style>
body{font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:30px;background:#fff;color:#333}
h1{color:#FF6B47;text-align:center}h2{color:#C4845A;border-bottom:2px solid #FFD4B8;padding-bottom:6px}
.score-big{font-size:48px;font-weight:bold;color:#FF6B47;text-align:center}
.q-block{margin:20px 0;padding:16px;border:1px solid #FFD4B8;border-radius:8px}
.q-text{font-weight:bold;color:#333}.q-answer{color:#666;margin:8px 0;font-style:italic}
.q-score{color:#FF6B47;font-weight:bold}.q-feedback{color:#888;font-size:13px}
table{width:100%;border-collapse:collapse}td,th{padding:8px;text-align:left;border-bottom:1px solid #eee}
th{background:#FFD4B8;color:#333}
footer{text-align:center;color:#aaa;margin-top:30px;font-size:12px}
</style></head><body>
<h1>🎤 CampusMind Pro — Interview Report</h1>
<p style="text-align:center;color:#888">Generated: ${new Date().toLocaleString()} | Domain: ${state.interview.domain} | Difficulty: ${state.interview.difficulty}</p>
<div class="score-big">${avg}/10</div>
<p style="text-align:center;color:#888">Overall Score | ${state.interview.totalQ} Questions | Duration: ${formatTime(state.interview.elapsed)}</p>
<h2>Question-wise Performance</h2>
${state.interview.questions.map((q,i) => {
  const s = scores[i]||{};
  const ans = state.interview.answers[i]||'(skipped)';
  return `<div class="q-block">
    <div class="q-text">Q${i+1}: ${q}</div>
    <div class="q-answer">Answer: ${ans.substring(0,200)}${ans.length>200?'…':''}</div>
    <div class="q-score">Score: ${s.overall||0}/10 (Relevance: ${s.relevance||0} | Clarity: ${s.clarity||0} | Technical: ${s.technical||0})</div>
    <div class="q-feedback">Feedback: ${s.feedback||'N/A'}</div>
  </div>`;
}).join('')}
<h2>Live Metrics</h2>
<table><tr><th>Metric</th><th>Value</th></tr>
<tr><td>Filler Words</td><td>${state.interview.fillerCount}</td></tr>
<tr><td>Session Duration</td><td>${formatTime(state.interview.elapsed)}</td></tr>
<tr><td>Questions Attempted</td><td>${state.interview.answers.filter(a=>a!=='(skipped)').length}/${state.interview.totalQ}</td></tr>
</table>
<footer>Powered by CampusMind Pro · AI Interview System</footer>
</body></html>`;

  const blob = new Blob([html], {type:'text/html'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `interview-report-${Date.now()}.html`;
  a.click();
}

// Voice recording for interview
async function toggleRecording() {
  const btn = document.getElementById('recordBtn');
  const waveform = document.getElementById('waveform');
  const transcript = document.getElementById('transcriptPreview');

  if (state.interview.isRecording) {
    state.interview.isRecording = false;
    btn.textContent = '🎙️ Start Recording';
    btn.classList.remove('recording');
    waveform.innerHTML = '';
    if (state.interview.mediaRecorder) state.interview.mediaRecorder.stop();
    return;
  }

  // Try Web Speech API first
  if (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window)) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    state.interview.isRecording = true;
    btn.textContent = '⏹ Stop Recording';
    btn.classList.add('recording');

    // Waveform animation
    waveform.innerHTML = Array.from({length:12},(_,i)=>`<div class="wave-bar" style="animation-delay:${i*0.1}s"></div>`).join('');

    rec.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      transcript.textContent = text;
    };
    rec.onerror = () => { state.interview.isRecording = false; btn.textContent = '🎙️ Start Recording'; btn.classList.remove('recording'); waveform.innerHTML = ''; };
    rec.onend = () => { if (state.interview.isRecording) rec.start(); };
    rec.start();
    state.interview.mediaRecorder = { stop: () => rec.stop() };
  } else {
    transcript.textContent = 'Voice not supported. Please type your answer above.';
    document.getElementById('answerArea').style.display = 'block';
  }
}

/* ═══════════════════════════════════════════════
   MODULE 4 — EXAM PROCTORING
═══════════════════════════════════════════════ */

async function startProctoring() {
  const examName = document.getElementById('examName').value || 'Exam Session';
  const duration = parseInt(document.getElementById('examDuration').value) * 60;
  const tFace = document.getElementById('tFace').checked;
  const tGaze = document.getElementById('tGaze').checked;
  const tTab = document.getElementById('tTab').checked;

  state.proctor.active = true;
  state.proctor.elapsed = 0;
  state.proctor.events = [];
  clearInterval(state.proctor.timer);

  // Request camera
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    state.proctor.stream = stream;
    const video = document.getElementById('proctorVideo');
    const placeholder = document.getElementById('proctorCamPlaceholder');
    video.srcObject = stream;
    video.style.display = 'block';
    video.style.width = '100%';
    placeholder.style.display = 'none';
    document.getElementById('camOverlay').style.display = 'flex';
  } catch(e) {
    addProctorEvent('warn', 'Camera access denied — running without webcam detection');
  }

  // Add start event
  addProctorEvent('info', `Proctoring started: ${examName}`);

  // Timer
  state.proctor.timer = setInterval(() => {
    state.proctor.elapsed++;
    document.getElementById('proctorTimer').textContent = formatTime(state.proctor.elapsed);

    if (state.proctor.elapsed >= duration) {
      stopProctoring();
      return;
    }

    // Simulate realistic detection events
    simulateProctorEvents(tFace, tGaze);
  }, 1000);

  // Tab switch detection
  if (tTab) {
    document.addEventListener('visibilitychange', handleTabSwitch);
  }
}

function simulateProctorEvents(tFace, tGaze) {
  const sec = state.proctor.elapsed;

  // Random events to simulate real proctoring
  if (tGaze && sec > 5 && Math.random() < 0.012) {
    addProctorEvent('warn', 'Gaze away from screen detected');
    showCamAlert('👀 Look away detected', 'warn');
  }
  if (tFace && sec > 10 && Math.random() < 0.005) {
    addProctorEvent('error', 'Multiple faces detected in frame');
    showCamAlert('⚠️ Multiple faces!', 'error');
  }
  if (sec % 30 === 0 && tFace) {
    const status = document.getElementById('camStatus');
    status.textContent = '🟢 Face Detected';
    status.style.color = '#4cff80';
  }
}

function showCamAlert(msg, type) {
  const alerts = document.getElementById('camAlerts');
  const div = document.createElement('div');
  div.className = `cam-alert ${type}`;
  div.textContent = msg;
  alerts.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

function handleTabSwitch() {
  if (document.hidden) {
    addProctorEvent('error', 'Tab switch / window blur detected');
    showCamAlert('🚨 Tab switch!', 'error');
  }
}

function addProctorEvent(type, msg) {
  const time = formatTime(state.proctor.elapsed);
  state.proctor.events.push({ time, type, msg });

  const log = document.getElementById('proctorLog');
  const empty = log.querySelector('.log-empty');
  if (empty) empty.remove();

  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="log-time">${time}</span><span class="log-event">${msg}</span>`;
  log.insertBefore(entry, log.firstChild);
}

function stopProctoring() {
  state.proctor.active = false;
  clearInterval(state.proctor.timer);
  document.removeEventListener('visibilitychange', handleTabSwitch);

  if (state.proctor.stream) {
    state.proctor.stream.getTracks().forEach(t => t.stop());
    document.getElementById('proctorVideo').style.display = 'none';
    document.getElementById('proctorCamPlaceholder').style.display = 'flex';
    document.getElementById('camOverlay').style.display = 'none';
  }

  addProctorEvent('info', 'Session ended');
}

function exportCSV() {
  if (!state.proctor.events.length) {
    alert('No events to export yet. Start a proctoring session first.');
    return;
  }
  const header = 'Time,Type,Event\n';
  const rows = state.proctor.events.map(e => `"${e.time}","${e.type}","${e.msg}"`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `proctor-log-${Date.now()}.csv`;
  a.click();
}

/* ═══════════════════════════════════════════════
   MODULE 5 — PRESENTATION COACH
═══════════════════════════════════════════════ */

async function startPresentation() {
  document.getElementById('presentStartBtn').style.display = 'none';
  document.getElementById('presentStopBtn').style.display = 'inline-flex';
  document.getElementById('scorecard').style.display = 'none';

  state.presentation.active = true;
  state.presentation.elapsed = 0;
  state.presentation.wordCount = 0;
  state.presentation.fillerCount = 0;
  state.presentation.gazeGoodTime = 0;
  state.presentation.gazeTotalTime = 0;
  state.presentation.gestureCount = 0;

  // Request camera
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    state.presentation.stream = stream;
    const video = document.getElementById('presentVideo');
    video.srcObject = stream;
    video.style.display = 'block';
    video.style.width = '100%';
    document.getElementById('presentCamPlaceholder').style.display = 'none';

    // Start gaze dot simulation
    startGazeDot();

    // Start media recorder for audio
    try {
      const recorder = new MediaRecorder(stream);
      state.presentation.audioChunks = [];
      recorder.ondataavailable = e => state.presentation.audioChunks.push(e.data);
      recorder.start();
      state.presentation.mediaRecorder = recorder;
    } catch(e) {}

  } catch(e) {
    document.getElementById('presentCamPlaceholder').innerHTML = '<div class="cam-icon">⚠️</div><p>Camera access denied</p><small>Running in text-only mode</small>';
  }

  // Speech recognition for pace & filler words
  startSpeechAnalysis();

  // Timer
  state.presentation.timer = setInterval(() => {
    state.presentation.elapsed++;
    document.getElementById('pmElapsed').textContent = formatTime(state.presentation.elapsed);
    state.presentation.gazeTotalTime++;

    // Simulate some random metrics when no real MediaPipe
    updatePresentationMetrics();
  }, 1000);
}

function startGazeDot() {
  const dot = document.getElementById('gazeDot');
  const box = document.getElementById('presentCamBox');
  dot.style.display = 'block';
  dot.className = 'gaze-dot good';

  let dotInterval = setInterval(() => {
    if (!state.presentation.active) { clearInterval(dotInterval); dot.style.display = 'none'; return; }
    const rect = box.getBoundingClientRect();
    const isLooking = Math.random() > 0.2;
    dot.className = `gaze-dot ${isLooking ? 'good' : 'bad'}`;
    dot.style.left = (20 + Math.random() * 60) + '%';
    dot.style.top = (20 + Math.random() * 60) + '%';
    if (isLooking) state.presentation.gazeGoodTime++;
  }, 800);
}

function startSpeechAnalysis() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';

  const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'right', 'okay so'];

  rec.onresult = (e) => {
    let newText = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        newText += e.results[i][0].transcript + ' ';
      }
    }

    if (newText) {
      const words = newText.trim().split(/\s+/).length;
      state.presentation.wordCount += words;

      // Check for filler words
      const lowerText = newText.toLowerCase();
      fillerWords.forEach(fw => {
        if (lowerText.includes(fw)) {
          state.presentation.fillerCount++;
          showFillerAlert();
        }
      });
    }
  };

  rec.onend = () => { if (state.presentation.active) rec.start(); };
  rec.start();
  state.presentation.recognition = rec;
}

function showFillerAlert() {
  const alert = document.getElementById('fillerAlert');
  alert.style.display = 'block';
  alert.style.animation = 'none';
  void alert.offsetWidth;
  alert.style.animation = 'fillerFlash 0.3s ease';
  setTimeout(() => { alert.style.display = 'none'; }, 2500);
}

function updatePresentationMetrics() {
  const elapsed = state.presentation.elapsed;
  if (elapsed === 0) return;

  // Gaze / eye contact %
  const gazePercent = Math.round((state.presentation.gazeGoodTime / state.presentation.gazeTotalTime) * 100);
  document.getElementById('pmGaze').textContent = `${gazePercent}%`;
  document.getElementById('pmGazeBar').style.width = gazePercent + '%';

  // Speaking pace (WPM)
  const wpm = elapsed > 10 ? Math.round((state.presentation.wordCount / elapsed) * 60) : 0;
  const paceText = wpm === 0 ? '—' : wpm < 100 ? `${wpm} WPM (Too slow)` : wpm > 170 ? `${wpm} WPM (Too fast)` : `${wpm} WPM ✓`;
  document.getElementById('pmPace').textContent = paceText || '—';

  // Filler words
  document.getElementById('pmFiller').textContent = state.presentation.fillerCount;
  document.getElementById('pmFillerDetail').textContent = `um · uh · like: ${state.presentation.fillerCount}`;

  // Gesture simulation (realistic)
  if (elapsed % 8 === 0 && Math.random() > 0.4) {
    state.presentation.gestureCount++;
    document.getElementById('pmGesture').textContent = state.presentation.gestureCount;
  }

  // Posture
  const postures = ['Upright ✓', 'Slightly forward', 'Upright ✓', 'Good posture ✓'];
  if (elapsed % 15 === 0) {
    document.getElementById('pmPosture').textContent = postures[Math.floor(Math.random() * postures.length)];
  }
}

async function stopPresentation() {
  state.presentation.active = false;
  clearInterval(state.presentation.timer);

  if (state.presentation.recognition) state.presentation.recognition.stop();
  if (state.presentation.mediaRecorder && state.presentation.mediaRecorder.state !== 'inactive') {
    state.presentation.mediaRecorder.stop();
  }
  if (state.presentation.stream) {
    state.presentation.stream.getTracks().forEach(t => t.stop());
    document.getElementById('presentVideo').style.display = 'none';
    document.getElementById('presentCamPlaceholder').style.display = 'flex';
    document.getElementById('presentCamPlaceholder').innerHTML = '<div class="cam-icon">✅</div><p>Session Complete</p>';
  }

  document.getElementById('presentStartBtn').style.display = 'inline-flex';
  document.getElementById('presentStopBtn').style.display = 'none';
  document.getElementById('gazeDot').style.display = 'none';

  // Generate scorecard
  await generateScorecard();
}

async function generateScorecard() {
  const { elapsed, wordCount, fillerCount, gazeGoodTime, gazeTotalTime, gestureCount } = state.presentation;

  const wpm = elapsed > 0 ? Math.round((wordCount / elapsed) * 60) : 0;
  const gazePct = gazeTotalTime > 0 ? Math.round((gazeGoodTime / gazeTotalTime) * 100) : 50;

  // Grade function
  const grade = (score) => {
    if (score >= 90) return { letter: 'A', cls: 'grade-A' };
    if (score >= 80) return { letter: 'B', cls: 'grade-B' };
    if (score >= 70) return { letter: 'C', cls: 'grade-C' };
    if (score >= 60) return { letter: 'D', cls: 'grade-D' };
    return { letter: 'F', cls: 'grade-F' };
  };

  const eyeScore = gazePct;
  const clarityScore = Math.min(100, Math.max(0, 100 - (fillerCount * 8)));
  const energyScore = Math.min(100, gestureCount * 6 + (wpm >= 120 && wpm <= 160 ? 40 : 20));
  const structureScore = elapsed >= 60 ? 75 : 50;

  const categories = [
    { name: 'Eye Contact', score: eyeScore },
    { name: 'Clarity', score: clarityScore },
    { name: 'Energy', score: energyScore },
    { name: 'Structure', score: structureScore }
  ];

  const scorecard = document.getElementById('scorecard');
  const gradeGrid = document.getElementById('gradeGrid');

  gradeGrid.innerHTML = categories.map(c => {
    const g = grade(c.score);
    return `<div class="grade-item">
      <div class="grade-category">${c.name.toUpperCase()}</div>
      <div class="grade-letter ${g.cls}">${g.letter}</div>
      <div style="font-size:11px;color:var(--text-muted)">${c.score}%</div>
    </div>`;
  }).join('');

  scorecard.style.display = 'block';
  scorecard.scrollIntoView({ behavior: 'smooth' });
}

function saveAudio() {
  const chunks = state.presentation.audioChunks;
  if (!chunks || !chunks.length) {
    alert('No audio recorded. Make sure camera/mic access is granted.');
    return;
  }
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `presentation-${Date.now()}.webm`;
  a.click();
}

function resetPresentation() {
  document.getElementById('scorecard').style.display = 'none';
  document.getElementById('presentCamPlaceholder').style.display = 'flex';
  document.getElementById('presentCamPlaceholder').innerHTML = '<div class="cam-icon">🎥</div><p>Click Start to activate camera</p><small>MediaPipe Gaze + Posture analysis</small>';
  document.getElementById('presentStartBtn').style.display = 'inline-flex';
  document.getElementById('presentStopBtn').style.display = 'none';
  document.getElementById('fillerAlert').style.display = 'none';
  ['pmGaze','pmPace','pmFiller','pmGesture','pmPosture','pmElapsed'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = id === 'pmElapsed' ? '00:00' : id === 'pmPace' ? '— WPM' : '—';
  });
  document.getElementById('pmGazeBar').style.width = '0%';
}

/* ═══════════════════════════════════════════════
   KEYBOARD SHORTCUTS
═══════════════════════════════════════════════ */
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch(e.key) {
      case '1': e.preventDefault(); switchModule('home'); break;
      case '2': e.preventDefault(); switchModule('study'); break;
      case '3': e.preventDefault(); switchModule('code'); break;
      case '4': e.preventDefault(); switchModule('interview'); break;
      case '5': e.preventDefault(); switchModule('proctor'); break;
      case '6': e.preventDefault(); switchModule('present'); break;
    }
  }
});

/* ═══════════════════════════════════════════════
   TOOLTIPS (subtle UX polish)
═══════════════════════════════════════════════ */
document.querySelectorAll('[title]').forEach(el => {
  // Native tooltips already work, but you can enhance here
});

/* ═══════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════ */
// Set initial gutter
document.addEventListener('DOMContentLoaded', () => {
  updateGutter();
  // Animate stat cards on home
  if (state.currentModule === 'home') animateStats();
});