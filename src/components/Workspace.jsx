import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../api";

const QUADRANTS = [
  ["do_now", "Do now", "Important and urgent"],
  ["schedule", "Schedule", "Important, not urgent"],
  ["delegate", "Delegate", "Urgent, not important"],
  ["eliminate", "Eliminate", "Neither important nor urgent"],
  [null, "Unsorted", "Not placed yet"],
];

const STARTERS = [
  "I have a few things on my plate. Help me sort them by priority.",
  "Help me turn a big goal into small SMART steps.",
  "Plan my week around my work hours and protect my rest.",
  "What common pitfalls should I watch for in my field?",
  "Where might there be gaps or opportunities in my profession?",
];

// Turns what Compass saved (tool calls) into small "Saved ..." badges.
function badges(actions) {
  return (Array.isArray(actions) ? actions : [])
    .filter((a) => a.ok)
    .map((a) =>
      a.tool === "add_task" ? `Saved task: ${a.input?.title}` : a.tool === "create_goal" ? `Saved goal: ${a.input?.title}` : null
    )
    .filter(Boolean);
}

export default function Workspace({ session, update, onReset }) {
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("chat"); // phone layout shows one panel at a time
  const endRef = useRef(null);

  const refreshTasks = () => api.getTasks(session.userId).then(setTasks).catch(() => {});

  useEffect(() => {
    refreshTasks();
    if (session.conversationId) {
      api
        .getMessages(session.userId, session.conversationId)
        .then((rows) => setMessages(rows.map((m) => ({ role: m.role, content: m.content, actions: m.tool_calls }))))
        .catch(() => update({ conversationId: null }));
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send(text) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    setError("");
    setSending(true);
    setMessages((m) => [...m, { role: "user", content: msg }]);
    try {
      const r = await api.chat(session.userId, { message: msg, conversation_id: session.conversationId || undefined });
      if (!session.conversationId) update({ conversationId: r.conversation_id });
      setMessages((m) => [...m, { role: "assistant", content: r.reply, actions: r.actions }]);
      if (r.actions?.length) refreshTasks();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  async function toggleDone(task) {
    await api.updateTask(session.userId, task.id, "done").catch(() => {});
    refreshTasks();
  }

  function newChat() {
    update({ conversationId: null });
    setMessages([]);
    setError("");
  }

  const open = tasks.filter((t) => t.status === "todo" || t.status === "in_progress");
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="app">
      <header className="topbar">
        <strong>🧭 Compass</strong>
        <span className="muted hide-sm">{session.name ? `Hi, ${session.name}` : ""}</span>
        <span className="spacer" />
        <button className="link" onClick={newChat}>New chat</button>
        <button className="link" onClick={() => onReset()}>Log out</button>
      </header>

      <div className="tabs">
        <button className={tab === "chat" ? "on" : ""} onClick={() => setTab("chat")}>Chat</button>
        <button className={tab === "tasks" ? "on" : ""} onClick={() => setTab("tasks")}>Tasks ({open.length})</button>
      </div>

      <div className={`workspace show-${tab}`}>
        <section className="chat">
          <div className="messages">
            {messages.length === 0 && (
              <div className="empty">
                <h2>What would you like help with?</h2>
                <p className="muted">Try one of these, or type your own.</p>
                <div className="starters">
                  {STARTERS.map((s) => (
                    <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, idx) => (
              <div key={idx} className={`bubble ${m.role}`}>
                {m.role === "assistant" ? (
                  <div className="md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
                ) : (
                  m.content
                )}
                {badges(m.actions).map((b, j) => <div className="badge" key={j}>✓ {b}</div>)}
              </div>
            ))}
            {sending && <div className="bubble assistant typing">Compass is thinking…</div>}
            {error && <p className="error">{error}</p>}
            <div ref={endRef} />
          </div>

          <div className="composer">
            <textarea
              rows={2}
              value={input}
              placeholder="Message Compass…  (Enter to send, Shift+Enter for a new line)"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button className="btn primary" disabled={sending || !input.trim()} onClick={() => send()}>Send</button>
          </div>
        </section>

        <aside className="tasks">
          <h3>Your tasks</h3>
          {open.length === 0 && <p className="muted">Nothing here yet. Ask Compass to sort your tasks and save them.</p>}
          {QUADRANTS.map(([key, label, hint]) => {
            const group = open.filter((t) => t.quadrant === key);
            if (!group.length) return null;
            return (
              <div className="quad" key={String(key)}>
                <h4>{label} <span className="tiny muted">{hint}</span></h4>
                {group.map((t) => (
                  <label className="task" key={t.id}>
                    <input type="checkbox" onChange={() => toggleDone(t)} />
                    <span>
                      {t.title}
                      {t.is_first_action && <em className="tag">First step</em>}
                      {t.estimated_minutes && <span className="tiny muted"> · {t.estimated_minutes} min</span>}
                    </span>
                  </label>
                ))}
              </div>
            );
          })}
          {doneCount > 0 && <p className="tiny muted">{doneCount} completed</p>}
        </aside>
      </div>
    </div>
  );
}
