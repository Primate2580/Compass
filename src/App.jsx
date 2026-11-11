import { useEffect, useState } from "react";
import { api } from "./api";
import Welcome from "./components/Welcome";
import Onboarding from "./components/Onboarding";
import Workspace from "./components/Workspace";

// There's no login yet, so the browser remembers who you are (user id) in localStorage.
const KEY = "compass_session";
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
};

export default function App() {
  const [session, setSession] = useState(load); // { userId, name, conversationId }
  const [stage, setStage] = useState(session ? "loading" : "welcome");
  const [problem, setProblem] = useState("");

  const start = (s) => {
    localStorage.setItem(KEY, JSON.stringify(s));
    setSession(s);
    setStage("onboarding");
  };
  const update = (patch) =>
    setSession((s) => {
      const next = { ...s, ...patch };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  const reset = () => {
    localStorage.removeItem(KEY);
    setSession(null);
    setStage("welcome");
  };

  function check() {
    setStage("loading");
    setProblem("");
    api
      .getUser(session.userId)
      .then(({ profile }) => setStage(profile?.onboarding_done_at ? "chat" : "onboarding"))
      .catch((e) => {
        // 400/404 = this user doesn't exist (anymore), so start fresh. Anything else = try again.
        if (e.status === 400 || e.status === 404) reset();
        else {
          setProblem(e.message);
          setStage("problem");
        }
      });
  }

  useEffect(() => {
    if (session) check();
  }, []);

  if (stage === "welcome") return <Welcome onDone={start} />;
  if (stage === "loading") return <div className="center muted">Loading…</div>;
  if (stage === "problem")
    return (
      <div className="center">
        <p>{problem}</p>
        <button className="btn" onClick={check}>Try again</button>
      </div>
    );
  if (stage === "onboarding") return <Onboarding session={session} onDone={() => setStage("chat")} />;
  return <Workspace session={session} update={update} onReset={reset} />;
}
