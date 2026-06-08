import { useState, useRef, useEffect } from "react";

const EXP = {
  beginner: { label: "До 1 года", color: "#FFFFFF", text: "#000000" },
  junior:   { label: "1-3 года",  color: "#5BB8FF", text: "#000000" },
  pro:      { label: "3+ года",   color: "#1A6FD4", text: "#FFFFFF" },
};

const STATUS = {
  new:       { label: "Новая заявка",    pill: "#00C853", pillText: "#000" },
  scheduled: { label: "Назначен созвон", pill: "#FFD600", pillText: "#000" },
  called:    { label: "Созвон проведён", pill: "#FF8C00", pillText: "#000" },
  noreply:   { label: "Нет ответа",      pill: "#707070", pillText: "#fff" },
  postponed: { label: "Отложен",         pill: "#7B5C3E", pillText: "#fff" },
  rejected:  { label: "Отказ",           pill: "#3A1A1A", pillText: "#FF5252" },
};

const initLeads = [
  { id: 1,  name: "Максим",    exp: "pro",      status: "new", phone: "+79778374340", note: "3+ лет. Недостаточно зарабатывает. Не понимает как выстроить систему.", vk: "https://vk.com/id4224630",  source: "ВК", date: "04 июн", nextAction: "", history: ["04 июн — добавлен"], transcript: null, transcriptName: null, chatHistory: [] },
  { id: 2,  name: "Sonya",     exp: "pro",      status: "new", phone: "+79319550287", note: "3+ лет. Недостаточно зарабатывает. Не знает где искать клиентов.",       vk: "https://vk.com/id54541631", source: "ВК", date: "04 июн", nextAction: "", history: ["04 июн — добавлен"], transcript: null, transcriptName: null, chatHistory: [] },
  { id: 3,  name: "Мила",      exp: "pro",      status: "new", phone: "+79514176989", note: "3+ лет. Боли не указала.",                                               vk: "https://vk.com/id20729254", source: "ВК", date: "04 июн", nextAction: "", history: ["04 июн — добавлен"], transcript: null, transcriptName: null, chatHistory: [] },
  { id: 4,  name: "Алёна",     exp: "beginner", status: "new", phone: "+79194789751", note: "До 1 года. Недостаточно зарабатывает. Не понимает как выстроить систему.", vk: "https://vk.com/id337269417", source: "ВК", date: "05 июн", nextAction: "", history: ["05 июн — добавлен"], transcript: null, transcriptName: null, chatHistory: [] },
  { id: 5,  name: "Лилия",     exp: "pro",      status: "new", phone: "+79658721655", note: "3+ лет. Фото не приносит дохода. Не знает где искать клиентов.",          vk: "https://vk.com/id23231532", source: "ВК", date: "05 июн", nextAction: "", history: ["05 июн — добавлен"], transcript: null, transcriptName: null, chatHistory: [] },
  { id: 6,  name: "Даниил",    exp: "pro",      status: "new", phone: "+79534757727", note: "3+ лет. Зарабатывает, но хочет больше. Не знает где искать клиентов.",    vk: "https://vk.com/id372318970", source: "ВК", date: "05 июн", nextAction: "", history: ["05 июн — добавлен"], transcript: null, transcriptName: null, chatHistory: [] },
  { id: 7,  name: "Анна",      exp: "junior",   status: "new", phone: "+79227448681", note: "1-3 года. Фотографирует за деньги редко. Не знает где искать клиентов.",  vk: "https://vk.com/id96951195", source: "ВК", date: "05 июн", nextAction: "", history: ["05 июн — добавлен"], transcript: null, transcriptName: null, chatHistory: [] },
  { id: 8,  name: "Фотограф",  exp: "beginner", status: "new", phone: "+79028359744", note: "Опыт и боли не указаны.",                                                 vk: "https://vk.com/id148884490", source: "ВК", date: "05 июн", nextAction: "", history: ["05 июн — добавлен"], transcript: null, transcriptName: null, chatHistory: [] },
  { id: 9,  name: "Полина",    exp: "pro",      status: "new", phone: "+79175490433", note: "3+ лет. Зарабатывает, но хочет больше. Не знает где искать клиентов.",    vk: "https://vk.com/id62515646", source: "ВК", date: "06 июн", nextAction: "", history: ["06 июн — добавлен"], transcript: null, transcriptName: null, chatHistory: [] },
  { id: 10, name: "Мария",     exp: "beginner", status: "new", phone: "+79119116881", note: "Опыт и боли не указаны.",                                                 vk: "https://vk.com/id873253",   source: "ВК", date: "07 июн", nextAction: "", history: ["07 июн — добавлен"], transcript: null, transcriptName: null, chatHistory: [] },
];

const initStudents = [
  {
    id: 1, name: "Алла Морозова", avatar: "АМ", exp: "junior", since: "март 2024",
    sessions: 8, nextSession: "10 июн, 18:00",
    sessionNotes: [
      { date: "30 май", summary: "Разобрали структуру прайса. Переписала пакеты — стало чище. ДЗ: 3 КП клиентам." },
      { date: "22 май", summary: "Позиционирование и целевая аудитория. Определили нишу — малый бизнес и рестораны." },
    ],
    topics: ["Позиционирование", "Прайс-лист", "Переговоры", "Портфолио"],
    nextTopics: ["Работа с возражениями", "Корп. клиенты"],
    homework: [
      { text: "Отправить 3 коммерческих предложения", done: true },
      { text: "Переснять 2 кейса для портфолио", done: false },
      { text: "Написать пост про ценность съёмки", done: false },
    ],
    transcript: null, transcriptName: null, chatHistory: [],
  },
];

// ── helpers ────────────────────────────────────────────────
async function askClaude(messages, systemPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? "Ошибка ответа";
}

const inp = { background: "#1C1C1C", border: "none", borderRadius: 10, color: "#fff", padding: "11px 14px", fontSize: 13, fontFamily: "inherit", width: "100%", outline: "none" };

// ── TranscriptPanel ────────────────────────────────────────
function TranscriptPanel({ entity, onUpdate, accentColor, accentText }) {
  const [tab, setTab] = useState("transcript");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [entity.chatHistory]);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onUpdate({ transcript: e.target.result, transcriptName: file.name, chatHistory: [] });
    reader.readAsText(file);
  };

  const getSummary = async () => {
    if (!entity.transcript) return;
    setSummaryLoading(true);
    const system = `Ты помощник наставника по фотографии. Тебе дан транскрипт переговорного или учебного созвона. 
Дай структурированное саммари: 1) О чём говорили (3-5 пунктов), 2) Ключевые боли и запросы человека, 3) Готовность к покупке / работе, 4) Что стоит сделать следующим шагом.
Отвечай кратко и по делу, на русском языке.`;
    const text = await askClaude([{ role: "user", content: `Транскрипт:\n\n${entity.transcript.slice(0, 8000)}` }], system);
    setSummaryLoading(false);
    const newMsg = { role: "assistant", content: text, auto: true };
    onUpdate({ chatHistory: [...(entity.chatHistory || []), newMsg] });
    setTab("chat");
  };

  const sendQuestion = async () => {
    if (!question.trim() || !entity.transcript) return;
    const userMsg = { role: "user", content: question };
    const newHistory = [...(entity.chatHistory || []), userMsg];
    onUpdate({ chatHistory: newHistory });
    setQuestion("");
    setLoading(true);
    const system = `Ты помощник наставника по фотографии. Отвечай на вопросы на основе транскрипта созвона. Транскрипт:\n\n${entity.transcript.slice(0, 8000)}`;
    const apiMessages = newHistory.map(m => ({ role: m.role, content: m.content }));
    const answer = await askClaude(apiMessages, system);
    setLoading(false);
    onUpdate({ chatHistory: [...newHistory, { role: "assistant", content: answer }] });
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {["transcript","chat"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "7px 16px", borderRadius: 20, border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: tab === t ? accentColor : "#1A1A1A", color: tab === t ? accentText : "#555" }}>
            {t === "transcript" ? "Транскрипт" : `Чат с AI ${entity.chatHistory?.length ? `(${entity.chatHistory.length})` : ""}`}
          </button>
        ))}
      </div>

      {tab === "transcript" && (
        <div>
          {entity.transcript ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: "#555" }}>📄 {entity.transcriptName}</div>
                <button onClick={() => onUpdate({ transcript: null, transcriptName: null, chatHistory: [] })}
                  style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>удалить</button>
              </div>
              <div style={{ background: "#111", borderRadius: 10, padding: "12px 14px", maxHeight: 180, overflowY: "auto", fontSize: 12, color: "#666", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 12 }}>
                {entity.transcript.slice(0, 1200)}{entity.transcript.length > 1200 ? "\n\n[...]" : ""}
              </div>
              <button onClick={getSummary} disabled={summaryLoading}
                style={{ width: "100%", padding: "11px 0", background: accentColor, color: accentText, border: "none", borderRadius: 20, fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: summaryLoading ? "wait" : "pointer", opacity: summaryLoading ? 0.7 : 1 }}>
                {summaryLoading ? "Анализирую..." : "✦ Сделать саммари"}
              </button>
            </div>
          ) : (
            <div>
              <input ref={fileRef} type="file" accept=".txt,.md,.doc,.docx" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
              <div onClick={() => fileRef.current?.click()}
                style={{ border: "1.5px dashed #2A2A2A", borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>Загрузить транскрипт созвона</div>
                <div style={{ fontSize: 11, color: "#333" }}>.txt, .md — текстовый файл с расшифровкой</div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "chat" && (
        <div>
          {!entity.transcript && (
            <div style={{ fontSize: 13, color: "#444", padding: "20px", textAlign: "center" }}>Сначала загрузи транскрипт</div>
          )}
          {entity.transcript && (
            <div>
              <div style={{ background: "#111", borderRadius: 12, padding: "12px", maxHeight: 260, overflowY: "auto", marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {(!entity.chatHistory || entity.chatHistory.length === 0) && (
                  <div style={{ fontSize: 12, color: "#333", textAlign: "center", padding: "20px 0" }}>
                    Нажми «Сделать саммари» или задай вопрос по транскрипту
                  </div>
                )}
                {(entity.chatHistory || []).map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "88%", padding: "9px 13px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: m.role === "user" ? accentColor : "#1A1A1A", color: m.role === "user" ? accentText : "#ccc",
                      fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {m.auto && <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>САММАРИ</div>}
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div style={{ padding: "9px 14px", background: "#1A1A1A", borderRadius: "14px 14px 14px 4px", fontSize: 12, color: "#555" }}>думаю...</div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={question} onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendQuestion()}
                  placeholder="Спроси что-нибудь по созвону..." style={{ ...inp, flex: 1 }} />
                <button onClick={sendQuestion} disabled={loading || !question.trim()}
                  style={{ padding: "0 16px", background: accentColor, color: accentText, border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 16, opacity: loading ? 0.5 : 1 }}>
                  ↑
                </button>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {["Готов ли он платить?","Главные боли?","Что стоит предложить?"].map(q => (
                  <button key={q} onClick={() => { setQuestion(q); }}
                    style={{ padding: "5px 12px", background: "#1A1A1A", color: "#555", border: "none", borderRadius: 20, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────
// ── localStorage helpers ─────────────────────────────────
function loadLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function saveLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export default function CRM() {
  const [leads, setLeads] = useState(() => {
    const saved = loadLS("crm_leads", null);
    // если в localStorage лежат тестовые лиды — чистим
    if (saved && saved.length > 0 && saved[0]?.name === "Марина Соколова") {
      saveLS("crm_leads", null);
      return initLeads;
    }
    return saved ?? initLeads;
  });
  const [students, setStudents] = useState(() => loadLS("crm_students", initStudents));
  const [tab, setTab] = useState("leads");
  const [panel, setPanel] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [paste, setPaste] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", note: "", exp: "beginner", vk: "" });
  const [filterExp, setFilterExp] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [newNote, setNewNote] = useState("");
  const [newSession, setNewSession] = useState({ date: "", summary: "" });
  const [showAddSession, setShowAddSession] = useState(false);
  const [sortBy, setSortBy] = useState('date_added'); // date_added | last_contact

  // auto-save to localStorage
  useEffect(() => { saveLS("crm_leads", leads); }, [leads]);
  useEffect(() => { saveLS("crm_students", students); }, [students]);

  const openPanel = (type, data) => { setPanel({ type, data }); setNewNote(""); setShowAddSession(false); };
  const closePanel = () => setPanel(null);

  const updateLead = (id, changes) => {
    setLeads(l => l.map(x => x.id === id ? { ...x, ...changes } : x));
    if (panel?.type === "lead" && panel.data.id === id) setPanel(p => ({ ...p, data: { ...p.data, ...changes } }));
  };

  const updateStudent = (id, changes) => {
    setStudents(s => s.map(x => x.id === id ? { ...x, ...changes } : x));
    if (panel?.type === "student" && panel.data.id === id) setPanel(p => ({ ...p, data: { ...p.data, ...changes } }));
  };

  const setLeadStatus = (id, status) => {
    const d = new Date(); const M = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
    const dateStr = `${d.getDate()} ${M[d.getMonth()]}`;
    setLeads(l => l.map(x => x.id === id ? { ...x, status, history: [...x.history, `${dateStr} — ${STATUS[status].label}`] } : x));
    if (panel?.type === "lead" && panel.data.id === id) setPanel(p => ({ ...p, data: { ...p.data, status, history: [...p.data.history, `${dateStr} — ${STATUS[status].label}`] } }));
  };

  const addCallNote = (id) => {
    if (!newNote.trim()) return;
    const d = new Date(); const M = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
    const entry = `${d.getDate()} ${M[d.getMonth()]} — ${newNote.trim()}`;
    updateLead(id, { history: [...(panel.data.history || []), entry] });
    setNewNote("");
  };

  const addSession = (id) => {
    if (!newSession.summary.trim()) return;
    const d = new Date(); const M = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
    const note = { date: newSession.date || `${d.getDate()} ${M[d.getMonth()]}`, summary: newSession.summary };
    const student = students.find(s => s.id === id);
    const updated = { sessionNotes: [note, ...(student.sessionNotes || [])] };
    updateStudent(id, updated);
    setNewSession({ date: "", summary: "" });
    setShowAddSession(false);
  };

  const toggleHomework = (studentId, idx) => {
    const student = students.find(s => s.id === studentId);
    const hw = student.homework.map((h, i) => i === idx ? { ...h, done: !h.done } : h);
    updateStudent(studentId, { homework: hw });
  };

  const [parsing, setParsing] = useState(false);

  const parsePaste = async (text) => {
    setPaste(text);
    if (text.length < 20) return;
    // fast regex fallback first
    const nameM = text.match(/(?:Имя|ФИО|Контакт)[:\s]+([^\n]+)/i);
    const phoneM = text.match(/(\+?[78][\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})/);
    setForm(f => ({ ...f, name: nameM?.[1]?.trim() ?? "", phone: phoneM?.[0] ?? "", note: text.slice(0, 120) }));
    // AI parse for richer data
    setParsing(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: "Из текста заявки извлеки данные и верни ТОЛЬКО JSON без пояснений:\n{\"name\":\"\",\"phone\":\"\",\"note\":\"краткое описание до 80 символов\",\"exp\":\"beginner|junior|pro\"}\nexp: beginner=до 1 года, junior=1-3 года, pro=3+ лет. Если опыт не указан — beginner.",
          messages: [{ role: "user", content: text }]
        })
      });
      const data = await res.json();
      const raw = data.content?.[0]?.text ?? "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setForm(f => ({
        name: parsed.name || f.name,
        phone: parsed.phone || f.phone,
        note: parsed.note || f.note,
        exp: parsed.exp || f.exp,
        vk: parsed.vk || f.vk,
      }));
    } catch {}
    setParsing(false);
  };

  const deleteLead = (id) => {
    setLeads(l => l.filter(x => x.id !== id));
    closePanel();
  };

  const addLead = () => {
    if (!form.name) return;
    const d = new Date(); const M = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
    const dateStr = `${d.getDate()} ${M[d.getMonth()]}`;
    setLeads(prev => [{ id: Date.now(), ...form, source: "ВК", date: dateStr, status: "new", nextAction: "", history: [`${dateStr} — добавлен`], transcript: null, transcriptName: null, chatHistory: [] }, ...prev]);
    setForm({ name: "", phone: "", note: "", exp: "beginner", vk: "" }); setPaste(""); setShowAdd(false);
  };

  const MONTHS = {"янв":0,"фев":1,"мар":2,"апр":3,"май":4,"июн":5,"июл":6,"авг":7,"сен":8,"окт":9,"ноя":10,"дек":11};
  const parseDate = (str) => {
    if (!str) return 0;
    const parts = str.trim().split(" ");
    if (parts.length < 2) return 0;
    return (MONTHS[parts[1]] ?? 0) * 31 + parseInt(parts[0] || 0);
  };
  const getLastContact = (lead) => {
    if (!lead.history || lead.history.length === 0) return parseDate(lead.date);
    return parseDate(lead.history[lead.history.length - 1].split(" — ")[0]);
  };
  const filtered = leads
    .filter(l =>
      (filterExp === "all" || l.exp === filterExp) &&
      (filterStatus === "all" || l.status === filterStatus) &&
      (search === "" || l.name.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === "date_added") return parseDate(b.date) - parseDate(a.date);
      if (sortBy === "last_contact") return getLastContact(b) - getLastContact(a);
      return 0;
    });

  const doneRatio = (s) => {
    if (!s.homework?.length) return 0;
    return Math.round(s.homework.filter(h => h.done).length / s.homework.length * 100);
  };

  return (
    <div style={{ fontFamily: "'Archivo', sans-serif", background: "#0A0A0A", minHeight: "100vh", color: "#fff", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #2a2a2a; }
        input::placeholder, textarea::placeholder { color: #3a3a3a; }
        textarea { resize: none; }
        .pill-lead { transition: filter 0.12s; cursor: pointer; }
        .pill-lead:hover { filter: brightness(1.08); }
        .fbtn { cursor: pointer; transition: opacity 0.12s; }
        .fbtn:hover { opacity: 0.75; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; display: flex; align-items: flex-end; }
        .modal-sheet { background: #141414; border-radius: 24px 24px 0 0; width: 100%; max-height: 90vh; overflow-y: auto; padding: 10px 20px 50px; }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, fontWeight: 700 }}>НАСТАВНИЧЕСТВО</div>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginTop: 2 }}>CRM</div>
        </div>
        <div style={{ display: "flex", background: "#1A1A1A", borderRadius: 12, padding: 3 }}>
          {[["leads","Лиды",leads.length],["students","Студенты",students.length]].map(([k,l,c]) => (
            <button key={k} className="fbtn" onClick={() => { setTab(k); closePanel(); }}
              style={{ padding: "8px 16px", borderRadius: 10, border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                background: tab === k ? "#fff" : "transparent", color: tab === k ? "#000" : "#555" }}>
              {l} <span style={{ opacity: 0.45 }}>{c}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 20px 80px" }}>

        {/* ── LEADS ── */}
        {tab === "leads" && (
          <div>
            {/* counts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {Object.entries(EXP).map(([key, e]) => (
                <div key={key} style={{ background: "#141414", borderRadius: 14, padding: "12px 14px" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: e.color }}>{leads.filter(l => l.exp === key).length}</div>
                  <div style={{ fontSize: 10, color: "#444", marginTop: 2, fontWeight: 700 }}>{e.label.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {/* search */}
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Поиск по имени..."
              style={{ ...inp, marginBottom: 14 }} />

            {/* filters */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#444", fontWeight: 700, letterSpacing: 1.5, marginBottom: 7 }}>ОПЫТ</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                <button className="fbtn" onClick={() => setFilterExp("all")} style={{ padding: "6px 14px", borderRadius: 20, border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: filterExp === "all" ? "#fff" : "#2D2D2D", color: filterExp === "all" ? "#000" : "#AAA" }}>Все</button>
                {Object.entries(EXP).map(([key, e]) => (
                  <button key={key} className="fbtn" onClick={() => setFilterExp(filterExp === key ? "all" : key)}
                    style={{ padding: "6px 14px", borderRadius: 20, border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                      background: filterExp === key ? e.color : "#2D2D2D", color: filterExp === key ? e.text : "#AAA" }}>
                    {e.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "#444", fontWeight: 700, letterSpacing: 1.5, marginBottom: 7 }}>СТАТУС</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button className="fbtn" onClick={() => setFilterStatus("all")} style={{ padding: "6px 14px", borderRadius: 20, border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: filterStatus === "all" ? "#fff" : "#2D2D2D", color: filterStatus === "all" ? "#000" : "#AAA" }}>Все</button>
                {Object.entries(STATUS).map(([key, s]) => (
                  <button key={key} className="fbtn" onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
                    style={{ padding: "6px 14px", borderRadius: 20, border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                      background: filterStatus === key ? s.pill : "#2D2D2D", color: filterStatus === key ? s.pillText : "#AAA" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* sort + add */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", background: "#141414", borderRadius: 20, padding: 3, gap: 2 }}>
                {[["date_added","По дате"],["last_contact","По контакту"]].map(([val, label]) => (
                  <button key={val} className="fbtn" onClick={() => setSortBy(val)}
                    style={{ padding: "6px 14px", borderRadius: 18, border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                      background: sortBy === val ? "#fff" : "transparent", color: sortBy === val ? "#000" : "#AAA" }}>
                    {label}
                  </button>
                ))}
              </div>
              <button className="fbtn" onClick={() => setShowAdd(!showAdd)}
                style={{ padding: "8px 20px", background: showAdd ? "#fff" : "#1A1A1A", color: showAdd ? "#000" : "#666", border: "none", borderRadius: 20, fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>
                {showAdd ? "✕ Закрыть" : "+ Добавить лид"}
              </button>
            </div>

            {showAdd && (
              <div style={{ background: "#141414", borderRadius: 16, padding: 18, marginBottom: 16 }}>
                <div style={{ position: "relative" }}>
                  <textarea value={paste} onChange={e => parsePaste(e.target.value)} placeholder="Вставь текст заявки из ВК — поля заполнятся автоматически..." style={{ ...inp, height: 80, marginBottom: 0, paddingRight: parsing ? 110 : 14 }} />
                  {parsing && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#5BB8FF", fontWeight: 700 }}>AI парсит...</div>}
                </div>
                <div style={{ height: 10 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <input placeholder="Имя" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inp} />
                  <input placeholder="Телефон" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={inp} />
                </div>
                <input placeholder="Ссылка ВК (vk.com/...)" value={form.vk} onChange={e => setForm({...form, vk: e.target.value})} style={{ ...inp, marginBottom: 8 }} />
                <input placeholder="Заметка" value={form.note} onChange={e => setForm({...form, note: e.target.value})} style={{ ...inp, marginBottom: 12 }} />
                <div style={{ fontSize: 10, color: "#444", fontWeight: 700, marginBottom: 8 }}>ОПЫТ</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  {Object.entries(EXP).map(([key, e]) => (
                    <button key={key} className="fbtn" onClick={() => setForm({...form, exp: key})}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 20, border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                        background: form.exp === key ? e.color : "#2D2D2D", color: form.exp === key ? e.text : "#AAA" }}>
                      {e.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="fbtn" onClick={addLead} style={{ padding: "10px 24px", background: "#fff", color: "#000", border: "none", borderRadius: 20, fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>Добавить</button>
                  <button className="fbtn" onClick={() => setShowAdd(false)} style={{ padding: "10px 16px", background: "transparent", color: "#555", border: "1px solid #222", borderRadius: 20, fontFamily: "inherit", fontSize: 13 }}>Отмена</button>
                </div>
              </div>
            )}

            {/* list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {filtered.length === 0 && <div style={{ textAlign: "center", color: "#333", padding: "40px 0", fontSize: 14 }}>Нет лидов</div>}
              {filtered.map(lead => {
                const e = EXP[lead.exp];
                const s = STATUS[lead.status];
                return (
                  <div key={lead.id} className="pill-lead" onClick={() => openPanel("lead", lead)}
                    style={{ background: e.color, borderRadius: 50, padding: "13px 16px 13px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: e.text, whiteSpace: "nowrap", flex: 1 }}>{lead.name}</div>
                    <div style={{ fontSize: 11, color: e.text, opacity: 0.45, whiteSpace: "nowrap", flexShrink: 0 }}>{lead.date}</div>
                    <div style={{ padding: "4px 12px", borderRadius: 20, background: s.pill, color: s.pillText, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>{s.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STUDENTS ── */}
        {tab === "students" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {students.map(s => {
              const e = EXP[s.exp];
              const prog = doneRatio(s);
              return (
                <div key={s.id} className="pill-lead" onClick={() => openPanel("student", s)}
                  style={{ background: "#141414", borderRadius: 16, padding: 18, borderLeft: `3px solid ${e.color}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${e.color}22`, border: `2px solid ${e.color}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: e.color, flexShrink: 0 }}>{s.avatar}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>с {s.since} · {s.sessions} сессий</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#444", fontWeight: 700 }}>СОЗВОН</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: e.color, marginTop: 2 }}>{s.nextSession}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 10, color: "#444", fontWeight: 700 }}>ДЗ ВЫПОЛНЕНО</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: e.color }}>{prog}%</span>
                    </div>
                    <div style={{ height: 5, background: "#222", borderRadius: 3 }}>
                      <div style={{ width: `${prog}%`, height: "100%", background: e.color, borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── BOTTOM SHEET ── */}
      {panel && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closePanel(); }}>
          <div className="modal-sheet">
            <div style={{ width: 36, height: 4, background: "#2A2A2A", borderRadius: 2, margin: "10px auto 20px" }} />

            {/* LEAD PANEL */}
            {panel.type === "lead" && (() => {
              const lead = panel.data;
              const e = EXP[lead.exp];
              const s = STATUS[lead.status];
              return (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: -0.5 }}>{lead.name}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="fbtn" onClick={() => { if (window.confirm(`Удалить ${lead.name}?`)) deleteLead(lead.id); }}
                        style={{ background: "#3A1A1A", border: "none", color: "#FF5252", padding: "0 12px", height: 32, borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
                        Удалить
                      </button>
                      <button className="fbtn" onClick={closePanel} style={{ background: "#222", border: "none", color: "#888", width: 32, height: 32, borderRadius: 8, fontSize: 16, flexShrink: 0 }}>×</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "#555" }}>{lead.phone}</span>
                    <span style={{ fontSize: 13, color: "#333" }}>·</span>
                    <span style={{ fontSize: 13, color: "#555" }}>{lead.source}</span>
                    <span style={{ fontSize: 13, color: "#333" }}>·</span>
                    <span style={{ fontSize: 13, color: "#555" }}>{lead.date}</span>
                    {lead.vk && (
                      <a href={lead.vk.startsWith("http") ? lead.vk : "https://" + lead.vk} target="_blank" rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, background: "#1A6FD420", border: "1px solid #1A6FD440", color: "#5BB8FF", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                        <span>ВК</span><span style={{ fontSize: 10, opacity: 0.7 }}>↗</span>
                      </a>
                    )}
                    {!lead.vk && (
                      <input placeholder="+ ссылка ВК" defaultValue="" onBlur={e => e.target.value && updateLead(lead.id, { vk: e.target.value })}
                        style={{ background: "transparent", border: "none", borderBottom: "1px solid #2A2A2A", color: "#5BB8FF", fontSize: 12, padding: "2px 4px", width: 120, outline: "none", fontFamily: "inherit" }} />
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                    <div style={{ padding: "6px 16px", borderRadius: 20, background: e.color, color: e.text, fontSize: 12, fontWeight: 800 }}>{e.label}</div>
                    <div style={{ padding: "6px 16px", borderRadius: 20, background: s.pill, color: s.pillText, fontSize: 12, fontWeight: 800 }}>{s.label}</div>
                  </div>

                  {/* note */}
                  <div style={{ fontSize: 10, color: "#444", fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>ЗАМЕТКА</div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: "#aaa", marginBottom: 18, padding: "12px 14px", background: "#1A1A1A", borderRadius: 10 }}>{lead.note}</div>

                  {/* next action */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#444", fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>СЛЕДУЮЩИЙ ШАГ</div>
                      <input value={lead.nextAction} onChange={ev => updateLead(lead.id, { nextAction: ev.target.value })}
                        placeholder="напр. 10 июн" style={{ ...inp, fontSize: 12, padding: "9px 12px" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#444", fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>ИСТОЧНИК</div>
                      <div style={{ padding: "9px 12px", background: "#1A1A1A", borderRadius: 10, fontSize: 12, color: "#aaa" }}>{lead.source}</div>
                    </div>
                  </div>

                  {/* status */}
                  <div style={{ fontSize: 10, color: "#444", fontWeight: 700, letterSpacing: 1.5, marginBottom: 8 }}>ИЗМЕНИТЬ СТАТУС</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                    {Object.entries(STATUS).map(([key, val]) => (
                      <button key={key} className="fbtn" onClick={() => setLeadStatus(lead.id, key)}
                        style={{ padding: "7px 14px", borderRadius: 20, border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                          background: lead.status === key ? val.pill : "#1A1A1A", color: lead.status === key ? val.pillText : "#555" }}>
                        {val.label}
                      </button>
                    ))}
                  </div>

                  {/* history */}
                  <div style={{ fontSize: 10, color: "#444", fontWeight: 700, letterSpacing: 1.5, marginBottom: 8 }}>ИСТОРИЯ</div>
                  <div style={{ background: "#111", borderRadius: 10, padding: "10px 14px", marginBottom: 10, maxHeight: 120, overflowY: "auto" }}>
                    {(lead.history || []).map((h, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#555", padding: "3px 0", borderBottom: i < lead.history.length - 1 ? "1px solid #1A1A1A" : "none" }}>{h}</div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === "Enter" && addCallNote(lead.id)}
                      placeholder="Добавить заметку..." style={{ ...inp, flex: 1, fontSize: 12, padding: "9px 12px" }} />
                    <button className="fbtn" onClick={() => addCallNote(lead.id)} style={{ padding: "0 14px", background: "#fff", color: "#000", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14 }}>+</button>
                  </div>

                  {/* transcript */}
                  <div style={{ fontSize: 10, color: "#444", fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>ТРАНСКРИПТ СОЗВОНА / AI-АНАЛИЗ</div>
                  <TranscriptPanel
                    entity={lead}
                    onUpdate={(changes) => updateLead(lead.id, changes)}
                    accentColor={e.color}
                    accentText={e.text}
                  />

                  <div style={{ marginTop: 22 }}>
                    <button className="fbtn" style={{ width: "100%", padding: 14, background: e.color, color: e.text, border: "none", borderRadius: 20, fontSize: 14, fontWeight: 800, fontFamily: "inherit" }}>
                      Перевести в студенты →
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* STUDENT PANEL */}
            {panel.type === "student" && (() => {
              const s = panel.data;
              const e = EXP[s.exp];
              const prog = doneRatio(s);
              return (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                    <div style={{ width: 46, height: 46, borderRadius: "50%", background: `${e.color}22`, border: `2px solid ${e.color}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: e.color, flexShrink: 0 }}>{s.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: 19 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>с {s.since} · {s.sessions} сессий</div>
                    </div>
                    <button className="fbtn" onClick={closePanel} style={{ background: "#222", border: "none", color: "#888", width: 32, height: 32, borderRadius: 8, fontSize: 16, flexShrink: 0 }}>×</button>
                  </div>

                  {/* next session + progress */}
                  <div style={{ background: "#1A1A1A", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#444", fontWeight: 700 }}>СЛЕДУЮЩИЙ СОЗВОН</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: e.color, marginTop: 3 }}>{s.nextSession}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#444", fontWeight: 700 }}>ДЗ ВЫПОЛНЕНО</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: e.color, marginTop: 2 }}>{prog}%</div>
                    </div>
                  </div>
                  <div style={{ height: 5, background: "#222", borderRadius: 3, marginBottom: 20 }}>
                    <div style={{ width: `${prog}%`, height: "100%", background: e.color, borderRadius: 3 }} />
                  </div>

                  {/* homework */}
                  <div style={{ fontSize: 10, color: "#444", fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>ДОМАШНИЕ ЗАДАНИЯ</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {s.homework.map((hw, i) => (
                      <div key={i} onClick={() => toggleHomework(s.id, i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#1A1A1A", borderRadius: 10, cursor: "pointer" }}>
                        <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: hw.done ? e.color : "#2A2A2A" }}>
                          {hw.done && <span style={{ color: e.text, fontSize: 11, fontWeight: 900 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 13, color: hw.done ? "#444" : "#ccc", textDecoration: hw.done ? "line-through" : "none" }}>{hw.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* session notes */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: "#444", fontWeight: 700, letterSpacing: 1.5 }}>ИТОГИ СЕССИЙ</div>
                    <button className="fbtn" onClick={() => setShowAddSession(!showAddSession)}
                      style={{ padding: "5px 12px", background: "#1A1A1A", color: "#666", border: "none", borderRadius: 20, fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>
                      {showAddSession ? "✕" : "+ Добавить"}
                    </button>
                  </div>
                  {showAddSession && (
                    <div style={{ background: "#1A1A1A", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                      <input placeholder="Дата (напр. 10 июн)" value={newSession.date} onChange={e => setNewSession(ns => ({...ns, date: e.target.value}))}
                        style={{ ...inp, marginBottom: 8, fontSize: 12, padding: "9px 12px" }} />
                      <textarea placeholder="Что разобрали, домашнее задание..." value={newSession.summary} onChange={e => setNewSession(ns => ({...ns, summary: e.target.value}))}
                        style={{ ...inp, height: 72, marginBottom: 10 }} />
                      <button className="fbtn" onClick={() => addSession(s.id)} style={{ padding: "8px 20px", background: e.color, color: e.text, border: "none", borderRadius: 20, fontFamily: "inherit", fontSize: 13, fontWeight: 800 }}>Сохранить</button>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {(s.sessionNotes || []).map((n, i) => (
                      <div key={i} style={{ background: "#1A1A1A", borderRadius: 10, padding: "10px 14px" }}>
                        <div style={{ fontSize: 10, color: e.color, fontWeight: 700, marginBottom: 4 }}>{n.date}</div>
                        <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>{n.summary}</div>
                      </div>
                    ))}
                  </div>

                  {/* next topics */}
                  <div style={{ fontSize: 10, color: "#444", fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>СЛЕДУЮЩИЕ ТЕМЫ</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                    {s.nextTopics.map((t, i) => (
                      <div key={i} style={{ fontSize: 13, color: "#aaa", padding: "10px 14px", background: "#1A1A1A", borderRadius: 10, display: "flex", gap: 8 }}>
                        <span style={{ color: e.color, fontWeight: 900 }}>→</span> {t}
                      </div>
                    ))}
                  </div>

                  {/* transcript */}
                  <div style={{ fontSize: 10, color: "#444", fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>ТРАНСКРИПТ СЕССИИ / AI-АНАЛИЗ</div>
                  <TranscriptPanel
                    entity={s}
                    onUpdate={(changes) => updateStudent(s.id, changes)}
                    accentColor={e.color}
                    accentText={e.text}
                  />
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
