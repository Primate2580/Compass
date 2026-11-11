// Every call to your backend goes through here, so the rest of the app never deals with fetch.
const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// After login the backend gives us a token. We keep it in localStorage and send it with every request.
const TOKEN_KEY = "compass_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// App.jsx registers a function here that logs the user out when the server says the token is no longer valid.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function request(path, { method = "GET", body } = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error("Can't reach the server. Is the backend running (npm run dev in compass-backend)?");
    err.network = true;
    throw err;
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // A 401 while we hold a token means it expired or is invalid, so log out.
    if (res.status === 401 && token && !path.startsWith("/auth/login")) {
      clearToken();
      onUnauthorized?.();
    }
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const u = (id) => `/users/${id}`;

export const api = {
  register: async (body) => {
    const data = await request("/auth/register", { method: "POST", body });
    setToken(data.token);
    return data;
  },
  login: async (body) => {
    const data = await request("/auth/login", { method: "POST", body });
    setToken(data.token);
    return data;
  },
  me: () => request("/auth/me"),
  saveProfile: (id, body) => request(`${u(id)}/profile`, { method: "PUT", body }),
  saveAnswer: (id, body) => request(`${u(id)}/answers`, { method: "POST", body }),
  addCommitment: (id, body) => request(`${u(id)}/commitments`, { method: "POST", body }),
  addGoal: (id, body) => request(`${u(id)}/goals`, { method: "POST", body }),
  addOverhead: (id, body) => request(`${u(id)}/overheads`, { method: "POST", body }),
  completeOnboarding: (id) => request(`${u(id)}/onboarding/complete`, { method: "POST" }),
  chat: (id, body) => request(`${u(id)}/chat`, { method: "POST", body }),
  getTasks: (id) => request(`${u(id)}/tasks`),
  updateTask: (id, taskId, status) => request(`${u(id)}/tasks/${taskId}`, { method: "PATCH", body: { status } }),
  getMessages: (id, convoId) => request(`${u(id)}/conversations/${convoId}/messages`),
};
