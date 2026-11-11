// Every call to your backend goes through here, so the rest of the app never deals with fetch.
const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function request(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error("Can't reach the server. Is the backend running (npm run dev in compass-backend)?");
    err.network = true;
    throw err;
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const u = (id) => `/users/${id}`;

export const api = {
  createUser: (body) => request("/users", { method: "POST", body }),
  getUser: (id) => request(u(id)),
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
