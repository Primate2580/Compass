import { useRef, useState } from "react";
import { api } from "../api";

const DAYS = [
  ["mon", "Mon", 1], ["tue", "Tue", 2], ["wed", "Wed", 3], ["thu", "Thu", 4],
  ["fri", "Fri", 5], ["sat", "Sat", 6], ["sun", "Sun", 0],
];
const DEFAULT_HOURS = { days: ["mon", "tue", "wed", "thu", "fri"], start: "09:00", end: "17:00" };

// Each step is one screen. `id` is where the answer is stored; `type` decides how it's drawn.
// To add or change a question, edit this list. The screen and progress bar update on their own.
const STEPS = [
  { id: "role_type", section: "About you", q: "Which best describes you?", type: "chips",
    options: [["employee", "Employee"], ["freelancer", "Freelancer"], ["business_owner", "Business owner"], ["student", "Student"], ["between_jobs", "Between jobs"]] },
  { id: "role_title", section: "About you", q: "What do you do?", hint: "For example: accountant, fashion designer, teacher, trader.", type: "text", placeholder: "Your job or field of study" },
  { id: "industry", section: "About you", q: "Which industry or field is that in?", type: "text", placeholder: "e.g. finance, fashion, education" },
  { id: "years_experience_band", section: "About you", q: "How long have you been doing it?", type: "chips",
    options: [["<1", "Under 1 year"], ["1-3", "1–3 years"], ["3-10", "3–10 years"], ["10+", "10+ years"]] },
  { id: "org_size", section: "About you", q: "How many people are in your company or team?", hint: "Working alone? Enter 1.", type: "number", placeholder: "1" },

  { id: "income_pattern", section: "Money", q: "How would you describe your income?", type: "chips",
    options: [["steady", "Steady"], ["irregular", "Varies a lot"], ["just_starting", "Just starting"]] },
  { id: "fixed_costs", section: "Money", q: "Roughly what are your fixed monthly costs?", hint: "Rent, salaries, data, transport, subscriptions. A rough total is fine.", type: "number", placeholder: "e.g. 150000" },
  { id: "target_monthly_income", section: "Money", q: "What would a good month look like in income?", type: "number", placeholder: "e.g. 500000" },

  { id: "work_hours", section: "Your time", q: "When do you usually work?", type: "hours" },
  { id: "commitments", section: "Your time", q: "Anything that can't move?", hint: "Classes, church, the school run, a standing meeting. Add as many as you like.", type: "commitments" },
  { id: "peak_energy", section: "Your time", q: "When is your brain sharpest?", type: "chips",
    options: [["early_morning", "Early morning"], ["midday", "Midday"], ["afternoon", "Afternoon"], ["night", "Night"]] },

  { id: "deadline_behavior", section: "Your style", q: "A deadline is two weeks away. You usually…", type: "chips",
    options: [["starts_early", "Start right away"], ["plans_then_starts", "Plan first, then start"], ["last_minute", "Do most of it near the deadline"]] },
  { id: "planning_style", section: "Your style", q: "You prefer…", type: "chips",
    options: [["structured", "A detailed schedule"], ["flexible", "A loose outline with flexibility"]] },
  { id: "style_focus", styleKey: "focus", section: "Your style", q: "You work best…", type: "chips",
    options: [["single", "One task at a time"], ["multi", "Juggling several things"]] },
  { id: "style_replan", styleKey: "replan", section: "Your style", q: "When your plan falls apart, you…", type: "chips",
    options: [["calm", "Re-plan calmly"], ["adapt", "Adapt as I go"], ["stuck", "Feel stuck for a while"]] },
  { id: "style_recharge", styleKey: "recharge", section: "Your style", q: "You recharge by…", type: "chips",
    options: [["people", "Being around people"], ["alone", "Being alone"]] },

  { id: "goals_3mo", section: "Your goals", q: "What are your top goals for the next 3 months?", hint: "One per line, up to 5.", type: "textarea", placeholder: "Land 3 new clients\nSave one month of costs" },
  { id: "goal_12mo", section: "Your goals", q: "What's one big goal for the next 12 months?", type: "text", placeholder: "e.g. Open my own studio" },
  { id: "pain_points", section: "Your goals", q: "What's stealing your time or causing the most stress right now?", type: "textarea", placeholder: "e.g. clients pay late and I keep overbooking myself" },

  { id: "leisure_min_hours_week", section: "Your rest", q: "At least how many free hours per week do you want protected?", hint: "I'll plan around this and warn you if your week can't fit it.", type: "chips",
    options: [[3, "3 hours"], [5, "5 hours"], [8, "8 hours"], [12, "12 hours"], [15, "15 hours"]] },
];

const toNum = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

// Sends everything to the backend. `doneRef` remembers which parts already succeeded,
// so pressing "Try again" after a failure doesn't save the same goals twice.
async function saveAll(userId, a, doneRef) {
  const run = async (name, fn) => {
    if (doneRef.current.has(name)) return;
    await fn();
    doneRef.current.add(name);
  };

  const profile = {};
  const put = (k, v) => { if (v !== null && v !== undefined && v !== "") profile[k] = v; };
  ["role_type", "role_title", "industry", "years_experience_band", "income_pattern", "peak_energy", "deadline_behavior", "planning_style"]
    .forEach((k) => put(k, typeof a[k] === "string" ? a[k].trim() : a[k]));
  put("org_size", toNum(a.org_size) === null ? null : Math.round(toNum(a.org_size)));
  put("target_monthly_income", toNum(a.target_monthly_income));
  put("leisure_min_hours_week", a.leisure_min_hours_week);

  const style = {};
  STEPS.filter((s) => s.styleKey && a[s.id]).forEach((s) => (style[s.styleKey] = a[s.id]));
  if (Object.keys(style).length) profile.style_answers = style;

  if (a.work_hours?.days?.length) {
    profile.work_hours = Object.fromEntries(a.work_hours.days.map((d) => [d, [a.work_hours.start, a.work_hours.end]]));
  }

  if (Object.keys(profile).length) await run("profile", () => api.saveProfile(userId, profile));

  if (a.pain_points?.trim())
    await run("pain", () => api.saveAnswer(userId, { question_key: "pain_points", answer: a.pain_points.trim() }));

  if (toNum(a.fixed_costs) > 0)
    await run("costs", () => api.addOverhead(userId, { label: "Fixed monthly costs", amount: toNum(a.fixed_costs), frequency: "monthly" }));

  const goals3 = (a.goals_3mo || "").split("\n").map((t) => t.trim()).filter(Boolean).slice(0, 5);
  if (goals3.length)
    await run("goals3", async () => { for (const title of goals3) await api.addGoal(userId, { title, horizon: "3_month" }); });

  if (a.goal_12mo?.trim())
    await run("goal12", () => api.addGoal(userId, { title: a.goal_12mo.trim(), horizon: "12_month" }));

  if (a.commitments?.length)
    await run("commitments", async () => {
      for (const c of a.commitments)
        await api.addCommitment(userId, { title: c.title, days: c.days, start_time: c.start, end_time: c.end });
    });

  await run("complete", () => api.completeOnboarding(userId));
}

function DayChips({ value, onChange }) {
  const toggle = (d) => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);
  return (
    <div className="chips small">
      {DAYS.map(([key, label]) => (
        <button type="button" key={key} className={"chip" + (value.includes(key) ? " on" : "")} onClick={() => toggle(key)}>{label}</button>
      ))}
    </div>
  );
}

function HoursField({ value, onChange }) {
  const v = value ?? DEFAULT_HOURS;
  return (
    <div className="stack">
      <DayChips value={v.days} onChange={(days) => onChange({ ...v, days })} />
      <div className="row">
        <label>Start<input type="time" value={v.start} onChange={(e) => onChange({ ...v, start: e.target.value })} /></label>
        <label>End<input type="time" value={v.end} onChange={(e) => onChange({ ...v, end: e.target.value })} /></label>
      </div>
    </div>
  );
}

function CommitmentsField({ value = [], onChange }) {
  const [title, setTitle] = useState("");
  const [days, setDays] = useState([]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const valid = title.trim() && days.length && end > start;

  function add() {
    const nums = DAYS.filter(([k]) => days.includes(k)).map(([, , n]) => n);
    onChange([...value, { title: title.trim(), days: nums, dayKeys: days, start, end }]);
    setTitle("");
    setDays([]);
  }

  return (
    <div className="stack">
      {value.map((c, i) => (
        <div className="listrow" key={i}>
          <span><strong>{c.title}</strong> · {c.dayKeys.join(", ")} · {c.start}–{c.end}</span>
          <button type="button" className="link" onClick={() => onChange(value.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sunday service" />
      <DayChips value={days} onChange={setDays} />
      <div className="row">
        <label>Start<input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label>End<input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      </div>
      <button type="button" className="btn" disabled={!valid} onClick={add}>Add</button>
      {title.trim() && days.length > 0 && end <= start && <p className="error tiny">End time must be after start time.</p>}
    </div>
  );
}

export default function Onboarding({ session, onDone }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const doneRef = useRef(new Set());

  const step = STEPS[i];
  const set = (id, v) => setAnswers((a) => ({ ...a, [id]: v }));

  async function finish(a) {
    setSaving(true);
    setError("");
    try {
      await saveAll(session.userId, a, doneRef);
      onDone();
    } catch (e) {
      setError(e.message);
    }
  }

  // `a` is passed in explicitly so the answer just given is never missed on the last step.
  function next(a = answers) {
    if (i + 1 >= STEPS.length) finish(a);
    else setI(i + 1);
  }

  function pick(value) {
    const updated = { ...answers, [step.id]: value };
    setAnswers(updated);
    setTimeout(() => next(updated), 150);
  }

  function continueClick() {
    if (step.type === "hours") {
      const updated = { ...answers, work_hours: answers.work_hours ?? DEFAULT_HOURS };
      setAnswers(updated);
      next(updated);
    } else next();
  }

  if (saving) {
    return (
      <main className="center">
        <div className="card">
          {error ? (
            <>
              <h2>That didn't save</h2>
              <p className="error">{error}</p>
              <button className="btn primary" onClick={() => finish(answers)}>Try again</button>
            </>
          ) : (
            <>
              <div className="logo">🧭</div>
              <h2>Setting up your plan…</h2>
              <p className="muted">Saving your answers.</p>
            </>
          )}
        </div>
      </main>
    );
  }

  const value = answers[step.id];
  return (
    <main className="center">
      <div className="card onboarding">
        <div className="progress"><div style={{ width: `${(i / STEPS.length) * 100}%` }} /></div>
        <p className="tiny muted">{step.section} · {i + 1} of {STEPS.length}</p>
        <h2>{step.q}</h2>
        {step.hint && <p className="muted">{step.hint}</p>}

        {step.type === "chips" && (
          <div className="chips">
            {step.options.map(([val, label]) => (
              <button key={String(val)} className={"chip" + (value === val ? " on" : "")} onClick={() => pick(val)}>{label}</button>
            ))}
          </div>
        )}
        {step.type === "text" && (
          <input autoFocus value={value ?? ""} placeholder={step.placeholder} onChange={(e) => set(step.id, e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && continueClick()} />
        )}
        {step.type === "number" && (
          <input autoFocus type="number" min="0" value={value ?? ""} placeholder={step.placeholder} onChange={(e) => set(step.id, e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && continueClick()} />
        )}
        {step.type === "textarea" && (
          <textarea autoFocus rows={4} value={value ?? ""} placeholder={step.placeholder} onChange={(e) => set(step.id, e.target.value)} />
        )}
        {step.type === "hours" && <HoursField value={value} onChange={(v) => set(step.id, v)} />}
        {step.type === "commitments" && <CommitmentsField value={value} onChange={(v) => set(step.id, v)} />}

        <div className="nav">
          <button className="link" disabled={i === 0} onClick={() => setI(i - 1)}>Back</button>
          <span className="spacer" />
          <button className="link" onClick={() => next()}>Skip</button>
          {step.type !== "chips" && <button className="btn primary" onClick={continueClick}>{i + 1 >= STEPS.length ? "Finish" : "Continue"}</button>}
        </div>
      </div>
    </main>
  );
}
