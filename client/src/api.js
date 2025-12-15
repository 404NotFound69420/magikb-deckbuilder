const API = import.meta.env.VITE_API_URL;

export function getToken() {
  return localStorage.getItem("token");
}

export function setAuth(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

async function req(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  register: (body) => req("/api/auth/register", { method:"POST", body: JSON.stringify(body) }),
  login: (body) => req("/api/auth/login", { method:"POST", body: JSON.stringify(body) }),
  cards: () => req("/api/cards"),
  card: (id) => req(`/api/cards/${id}`),
  myDecks: () => req("/api/decks"),
  createDeck: (name) => req("/api/decks", { method:"POST", body: JSON.stringify({ name }) }),
  getDeck: (deckId) => req(`/api/decks/${deckId}`),
  saveDeckCards: (deckId, cards) => req(`/api/decks/${deckId}/cards`, { method:"PUT", body: JSON.stringify({ cards }) }),
  createMatch: (deckId) => req("/api/matches", { method:"POST", body: JSON.stringify({ deckId }) }),
  joinMatch: (matchId, deckId) => req(`/api/matches/${matchId}/join`, { method:"POST", body: JSON.stringify({ deckId }) }),
  getMatch: (matchId) => req(`/api/matches/${matchId}`),
};
