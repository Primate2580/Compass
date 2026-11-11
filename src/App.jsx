import { useEffect, useState } from "react";
import { api, getToken, clearToken, setUnauthorizedHandler } from "./api";
import Welcome from "./components/Welcome";
import Onboarding from "./components/Onboarding";
import Workspace from "./components/Workspace";

// Who is logged in is decided by the token in localStorage (see api.js).
// On load we ask the backend "who am I?" and then show the right screen:
//   no token -> login/sign-up   |   not onboarded -> onboarding   |   otherwise -> chat
export default function App() {
  const [session, setSession] = useState(null); // { userId, name, conversationId }
  const [stage, setStage] = useState(getToken() ? "loading" : "welcome");
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");

  const update = (patch) => setSession((s) => ({ ...s, ...patch }));

  function logout(message = "") {
    clearToken();
    setSession(null);
    setNotice(message);
    setStage("welcome");
  }

  async function load() {
    setStage("loading");
    setProblem("");
    setNotice("");
    try {
      const { user, profile, latest_conversation_id } = await api.me();
      setSession({ userId: user.id, name: user.full_name || "", conversationId: latest_conversation_id });
      setStage(profile?.onboarding_done_at ? "chat" : "onboarding");
    } catch (e) {
      if (e.status === 401) return; // the 401 handler below has already logged us out
      setProblem(e.message);
      setStage("problem");
    }
  }

  useEffect(() => {
    // If the server ever says our token is no longer valid, go back to the login screen.
    setUnauthorizedHandler(() => logout("Your session has ended. Please log in again."));
    if (getToken()) load();
  }, []);

  if (stage === "welcome") return <Welcome onDone={load} notice={notice} />;
  if (stage === "loading") return <div className="center muted">Loading…</div>;
  if (stage === "problem")
    return (
      <div className="center">
        <p>{problem}</p>
        <button className="btn" onClick={load}>Try again</button>
        <button className="link" onClick={() => logout()}>Log out</button>
      </div>
    );
  if (stage === "onboarding") return <Onboarding session={session} onDone={() => setStage("chat")} />;
  return <Workspace session={session} update={update} onReset={() => logout()} />;
}
