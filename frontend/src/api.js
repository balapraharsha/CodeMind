const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const api = {
  get: (path) =>
    fetch(`${BASE}${path}`).then((r) => r.json()),

  post: (path, body) =>
    fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
};
