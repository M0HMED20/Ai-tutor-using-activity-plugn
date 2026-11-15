/* ============ CONFIG ============
   Put your backend URL here. Leave empty to use demo answers.
   POST JSON in, JSON out:
   {type:"answer", question, mode}  ->  {answer:"text with [1] markers", citations:[{title,url}]}
   {type:"quiz", topic, difficulty, count} -> {questions:[{q, options:[4], answer:0-3, explanation}]}
*/


document.addEventListener('DOMContentLoaded', function () {

    // console.log("AI Tutor JavaScript started!");

    // console.log("AI Tutor script loaded successfully!");

const API_URL = "";

(function () {
  "use strict";

  /* ---- safe storage (works even where localStorage is blocked) ---- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const MODES = { simple: "Simple", detailed: "Detailed", steps: "Step by step", beginner: "Beginner" };
  let chats = [];
  try { chats = JSON.parse(store.get("sb_chats") || "[]"); } catch (e) { chats = []; }
  let currentId = null, mode = "simple", difficulty = "medium", qCount = 5, busy = false, filter = "";

  const $ = id => document.getElementById(id);
  const app = $("app"), messages = $("messages"), welcome = $("welcome"), input = $("input"), sendBtn = $("send"),
        historyEl = $("history"), titleEl = $("chatTitle"), modePop = $("modePop"), quizPop = $("quizPop"),
        modeBtn = $("modeBtn"), quizBtn = $("quizBtn");

  const save = () => store.set("sb_chats", JSON.stringify(chats));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const current = () => chats.find(c => c.id === currentId);
  const isMobile = () => window.innerWidth <= 820;

  /* ============ Sidebar ============ */
  function groupOf(id) {
    const d = new Date(Number(id)), now = new Date();
    const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((day(now) - day(d)) / 864e5);
    return diff <= 0 ? "Today" : diff === 1 ? "Yesterday" : diff <= 7 ? "Previous 7 days" : "Older";
  }
  function renderHistory() {
    historyEl.innerHTML = "";
    const list = chats.filter(c => c.title.toLowerCase().includes(filter));
    if (!list.length) { historyEl.innerHTML = `<div class="empty-h">${chats.length ? "No chats match your search." : "Your chats will appear here."}</div>`; return; }
    let last = "";
    list.forEach(c => {
      const g = groupOf(c.id);
      if (g !== last) { historyEl.insertAdjacentHTML("beforeend", `<div class="group">${g}</div>`); last = g; }
      const b = document.createElement("div");
      b.className = "h-item" + (c.id === currentId ? " active" : "");
      b.setAttribute("role", "button"); b.tabIndex = 0;
      b.innerHTML = `<span>${esc(c.title)}</span><button type="button" class="del" title="Delete chat"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`;
      b.addEventListener("click", e => {
        if (e.target.closest(".del")) { chats = chats.filter(x => x.id !== c.id); save(); if (c.id === currentId) newChat(); else renderHistory(); return; }
        currentId = c.id; renderChat(); renderHistory(); app.classList.remove("open");
      });
      b.addEventListener("keydown", e => { if (e.key === "Enter") b.click(); });
      historyEl.appendChild(b);
    });
  }
  function newChat() { currentId = null; renderChat(); renderHistory(); app.classList.remove("open"); input.focus(); }
  $("newChat").addEventListener("click", newChat);
  $("searchChats").addEventListener("input", e => { filter = e.target.value.trim().toLowerCase(); renderHistory(); });
  $("clearAll").addEventListener("click", () => {
    if (chats.length && confirm("Delete all chats? This can't be undone.")) { chats = []; save(); newChat(); }
  });
  $("collapseBtn").addEventListener("click", () => isMobile() ? app.classList.remove("open") : app.classList.add("collapsed"));
  $("menuBtn").addEventListener("click", () => isMobile() ? app.classList.add("open") : app.classList.remove("collapsed"));
  $("scrim").addEventListener("click", () => app.classList.remove("open"));

  /* ============ Rendering ============ */
  const scrollDown = () => requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
  function renderChat() {
    const c = current();
    messages.innerHTML = "";
    titleEl.textContent = c ? c.title : "New chat";
    if (!c || !c.messages.length) { messages.appendChild(welcome); return; }
    c.messages.forEach(m => messages.appendChild(renderMsg(m)));
    scrollDown();
  }
  function renderMsg(m) {
    const d = document.createElement("div");
    d.className = "msg " + (m.role === "user" ? "user" : "ai");
    if (m.role === "user") { d.innerHTML = `<div class="bubble">${esc(m.text)}</div>`; return d; }
    if (m.type === "quiz") { d.appendChild(renderQuiz(m)); return d; }
    d.innerHTML = `<div class="ai-card"><div class="ai-head"><span class="logo">S</span>StudyBuddy<em>${MODES[m.mode] || "Simple"}</em></div>
      <div class="answer">${formatAnswer(m.text, m.cites)}</div>${sourcesHTML(m.cites)}</div>`;
    return d;
  }
  function formatAnswer(text, cites) {
    cites = cites || [];
    const cite = s => s.replace(/\[(\d+)\]/g, (_, n) => {
      const c = cites[n - 1];
      return c ? `<a class="cite" href="${esc(c.url)}" target="_blank" rel="noopener" title="${esc(c.title)}">${n}</a>` : "";
    });
    return esc(text).split(/\n\n+/).map(block => {
      const lines = block.split("\n");
      if (lines.every(l => /^\d+\.\s/.test(l))) return "<ol>" + lines.map(l => `<li>${cite(l.replace(/^\d+\.\s/, ""))}</li>`).join("") + "</ol>";
      return `<p>${cite(lines.join("<br>"))}</p>`;
    }).join("");
  }
  function sourcesHTML(cites) {
    if (!cites || !cites.length) return "";
    return '<div class="sources">' + cites.map((c, i) =>
      `<a class="source" href="${esc(c.url)}" target="_blank" rel="noopener"><b>${i + 1}</b>${esc(c.title)}</a>`).join("") + "</div>";
  }

  /* ============ Quiz card ============ */
  function renderQuiz(m) {
    const box = document.createElement("div");
    box.className = "quiz";
    const total = m.questions.length;
    if (m.idx >= total) {
      const pct = Math.round(m.score / total * 100);
      box.innerHTML = `<div class="result"><div class="ring" style="--p:${pct}"><div>${m.score}/${total}</div></div>
        <h3>${pct >= 80 ? "Great job!" : pct >= 50 ? "Nice work!" : "Keep practicing"}</h3>
        <p>You scored ${pct}% on this ${m.difficulty} quiz about ${esc(m.topic)}.</p>
        <div class="row"><button type="button" class="ghost" id="retry">Try again</button><button type="button" class="primary" id="again">New quiz</button></div></div>`;
      box.querySelector("#retry").onclick = () => { m.idx = 0; m.score = 0; m.picked = null; save(); renderChat(); };
      box.querySelector("#again").onclick = openQuizPop;
      return box;
    }
    const q = m.questions[m.idx];
    box.innerHTML = `<div class="q-top"><span class="tag">${m.difficulty} · ${esc(m.topic)}</span><span>${m.idx + 1} of ${total}</span></div>
      <div class="bar"><i style="width:${m.idx / total * 100}%"></i></div>
      <div class="q-text">${esc(q.q)}</div><div class="choices"></div>`;
    const wrap = box.querySelector(".choices");
    q.options.forEach((o, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "choice"; b.innerHTML = `<b>${"ABCD"[i]}</b><span>${esc(o)}</span>`;
      if (m.picked != null) {
        b.disabled = true;
        if (i === q.answer) b.classList.add("right"); else if (i === m.picked) b.classList.add("wrong");
      }
      b.onclick = () => { m.picked = i; if (i === q.answer) m.score++; save(); box.replaceWith(renderQuiz(m)); };
      wrap.appendChild(b);
    });
    if (m.picked != null) {
      box.insertAdjacentHTML("beforeend", `<div class="explain">${esc(q.explanation || "")}</div>
        <div class="q-actions"><button type="button" class="primary">${m.idx + 1 === total ? "See results" : "Next question"}</button></div>`);
      box.querySelector(".primary").onclick = () => { m.idx++; m.picked = null; save(); box.replaceWith(renderQuiz(m)); scrollDown(); };
    }
    return box;
  }

  /* ============ Backend ============ */
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function callAPI(payload) {
    const r = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) throw new Error("Server error " + r.status);
    return r.json();
  }
  async function askAI(question, mode) {
    if (API_URL) return callAPI({ type: "answer", question, mode });
    await wait(800);
    const t = question.replace(/[?؟]+$/, "");
    const demo = {
      simple: `Here is a short answer about "${t}". [1] This is demo text. Connect your AI backend in script.js to get real answers. [2]`,
      detailed: `Here is an in-depth look at "${t}". [1]\n\nFirst, the core idea and why it matters. Then the main parts and how they connect. [2]\n\nFinally, common mistakes students make and how to avoid them.`,
      steps: `Let's break down "${t}":\n\n1. Understand the key definition. [1]\n2. See how the parts fit together.\n3. Work through a simple example. [2]\n4. Check your understanding with a quiz.`,
      beginner: `Think of "${t}" like an everyday example you already know. [1]\n\nNo jargon: the main idea is simple, and the details come after. [2]`
    };
    return { answer: demo[mode], citations: [{ title: "Wikipedia", url: "https://wikipedia.org" }, { title: "Khan Academy", url: "https://khanacademy.org" }] };
  }
  async function makeQuizAI(topic, difficulty, count) {
    if (API_URL) return (await callAPI({ type: "quiz", topic, difficulty, count })).questions;
    await wait(800);
    return Array.from({ length: count }, (_, i) => ({
      q: `Demo question ${i + 1} (${difficulty}) about "${topic}"?`,
      options: ["First option", "Second option", "Third option", "Fourth option"],
      answer: i % 4, explanation: "Demo explanation. Connect your backend to get real questions."
    }));
  }

  /* ============ Actions ============ */
  function ensureChat(title) {
    if (!current()) { const c = { id: String(Date.now()), title: title.slice(0, 40), messages: [] }; chats.unshift(c); currentId = c.id; }
    return current();
  }
  function addTyping() {
    const t = document.createElement("div"); t.className = "msg ai";
    t.innerHTML = '<div class="typing"><i></i><i></i><i></i></div>';
    messages.appendChild(t); scrollDown(); return t;
  }
  async function sendQuestion() {
    const text = input.value.trim();
    if (!text || busy) return;
    busy = true; closePops();
    const c = ensureChat(text);
    c.messages.push({ role: "user", text });
    input.value = ""; autosize(); save(); renderChat(); renderHistory();
    addTyping();
    try {
      const res = await askAI(text, mode);
      c.messages.push({ role: "ai", type: "answer", text: res.answer, cites: res.citations || [], mode });
    } catch (e) {
      c.messages.push({ role: "ai", type: "answer", text: "Something went wrong. Please try again.", cites: [], mode });
    }
    busy = false; save(); renderChat();
  }
  function quizTopic() {
    const typed = input.value.trim();
    if (typed) return typed;
    const c = current();
    const last = c && c.messages.slice().reverse().find(m => m.role === "user" && !m.isQuiz);
    return last ? last.text : "";
  }
  function openQuizPop() {
    closePops();
    const t = quizTopic(), h = $("topicHint");
    h.classList.toggle("warn", !t);
    h.textContent = t ? "Topic: " + t : "Type a topic in the box first, or ask a question.";
    quizPop.hidden = false; quizBtn.classList.add("on");
  }
  async function startQuiz() {
    const topic = quizTopic();
    if (!topic || busy) { $("topicHint").classList.add("warn"); return; }
    busy = true; closePops();
    const c = ensureChat("Quiz: " + topic);
    c.messages.push({ role: "user", isQuiz: true, text: `Quiz me on: ${topic} (${difficulty}, ${qCount} questions)` });
    input.value = ""; autosize(); renderChat(); renderHistory();
    addTyping();
    try {
      const questions = await makeQuizAI(topic, difficulty, qCount);
      c.messages.push({ role: "ai", type: "quiz", topic, difficulty, questions, idx: 0, score: 0, picked: null });
    } catch (e) {
      c.messages.push({ role: "ai", type: "answer", text: "Couldn't create the quiz. Please try again.", cites: [], mode });
    }
    busy = false; save(); renderChat();
  }

  /* ============ Controls ============ */
  function closePops() { modePop.hidden = true; quizPop.hidden = true; modeBtn.classList.remove("on"); quizBtn.classList.remove("on"); }
  modeBtn.addEventListener("click", e => {
    e.stopPropagation();
    const wasOpen = !modePop.hidden; closePops();
    if (!wasOpen) { modePop.hidden = false; modeBtn.classList.add("on"); }
  });
  quizBtn.addEventListener("click", e => { e.stopPropagation(); quizPop.hidden ? openQuizPop() : closePops(); });
  document.addEventListener("click", e => { if (!e.target.closest(".popover")) closePops(); });
  modePop.querySelectorAll(".opt").forEach(b => b.addEventListener("click", () => {
    mode = b.dataset.mode; $("modeLabel").textContent = MODES[mode];
    modePop.querySelectorAll(".opt").forEach(x => x.classList.toggle("active", x === b)); closePops();
  }));
  $("diffSeg").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    difficulty = b.dataset.d; $("diffSeg").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
  }));
  $("qMinus").addEventListener("click", () => { qCount = Math.max(1, qCount - 1); $("qCount").textContent = qCount; });
  $("qPlus").addEventListener("click", () => { qCount = Math.min(20, qCount + 1); $("qCount").textContent = qCount; });
  $("makeQuiz").addEventListener("click", startQuiz);
  sendBtn.addEventListener("click", sendQuestion);

  function autosize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 160) + "px";
    sendBtn.disabled = !input.value.trim();
  }
  input.addEventListener("input", autosize);
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuestion(); } });

  renderChat(); renderHistory();
})();


});

