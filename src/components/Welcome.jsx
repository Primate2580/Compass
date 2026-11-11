import { useState } from "react";
import { api } from "../api";

export default function Welcome({ onDone }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const user = await api.createUser({ email: email.trim(), full_name: name.trim() || null, timezone });
      onDone({ userId: user.id, name: user.full_name || "" });
    } catch (err) {
      setError(
        /already exists/i.test(err.message)
          ? "That email is already registered. Login isn't built yet, so please use a different email for now."
          : err.message
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="center">
      <form className="card welcome" onSubmit={submit}>
        <div className="logo">🧭</div>
        <h1>Compass</h1>
        <p className="muted">
          Your personal planning assistant. Tell me a little about your work and life, and I'll help you prioritise,
          set goals, plan your week, and protect your rest.
        </p>
        <label>
          Your name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ada" />
        </label>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" disabled={busy}>{busy ? "Setting up…" : "Get started"}</button>
        <p className="tiny muted">Takes about 3 minutes. You can skip any question.</p>
      </form>
    </main>
  );
}
