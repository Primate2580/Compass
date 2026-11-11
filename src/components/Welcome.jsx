import { useState } from "react";
import { api } from "../api";

// Sign-up and log-in screen. `onDone` is called once the backend has accepted us and given us a token.
export default function Welcome({ onDone, notice }) {
  const [mode, setMode] = useState("register"); // "register" | "login"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const registering = mode === "register";

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (registering) {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await api.register({ email: email.trim(), password, full_name: name.trim() || null, timezone });
      } else {
        await api.login({ email: email.trim(), password });
      }
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  function switchMode() {
    setMode(registering ? "login" : "register");
    setError("");
  }

  return (
    <main className="center">
      <form className="card welcome" onSubmit={submit}>
        <div className="logo">🧭</div>
        <h1>Compass</h1>
        <p className="muted">
          {registering
            ? "Your personal planning assistant. Create an account, tell me a little about your work and life, and I'll help you prioritise, set goals, plan your week, and protect your rest."
            : "Welcome back. Log in to pick up where you left off."}
        </p>
        {notice && <p className="notice">{notice}</p>}

        {registering && (
          <label>
            Your name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ada" autoComplete="name" />
          </label>
        )}
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type={show ? "text" : "password"}
            required
            minLength={registering ? 8 : undefined}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={registering ? "At least 8 characters" : "Your password"}
            autoComplete={registering ? "new-password" : "current-password"}
          />
        </label>
        <label className="inline">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password
        </label>

        {error && <p className="error">{error}</p>}
        <button className="btn primary" disabled={busy}>
          {busy ? "Please wait…" : registering ? "Create account" : "Log in"}
        </button>
        <p className="tiny muted">
          {registering ? "Already have an account?" : "New here?"}{" "}
          <button type="button" className="link" onClick={switchMode}>{registering ? "Log in" : "Create an account"}</button>
        </p>
      </form>
    </main>
  );
}
