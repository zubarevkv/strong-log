/* ============================================================
 * api.js — доступ к данным (шаг 2 спеки).
 * Заменяет обёртку store над window.storage. Единая точка доступа:
 * структура состояния и компоненты не меняются.
 *
 * Режимы (VITE_API_BASE):
 *   "/api" (по умолчанию) — реальный бэкенд, fetch + Bearer-токен.
 *   "local"               — fallback на localStorage для разработки без
 *                           сервера (тот же интерфейс, токен принимается любой).
 * ========================================================== */

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
const IS_LOCAL = API_BASE === "local";
const TOKEN_KEY = "strong-log-token";

/* ---- управление токеном ---- */
export const auth = {
  get: () => localStorage.getItem(TOKEN_KEY) || "",
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
  isLocal: IS_LOCAL,
};

/* ошибка с кодом статуса, чтобы гейт мог отличить 401 */
export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function req(method, path, body) {
  const headers = { Authorization: `Bearer ${auth.get()}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError("Нет связи с сервером", 0);
  }
  if (res.status === 401) throw new ApiError("Неверный токен", 401);
  if (!res.ok) {
    let msg = `Ошибка ${res.status}`;
    try { const j = await res.json(); if (j && j.error) msg = j.error; } catch {}
    throw new ApiError(msg, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ============================================================
 * Реальный бэкенд
 * ========================================================== */
const remote = {
  ping: () => req("GET", "/sessions"),            // используется гейтом для проверки токена
  getSessions: () => req("GET", "/sessions"),
  saveSession: (s) => req("POST", "/sessions", s),
  deleteSession: (id) => req("DELETE", `/sessions/${encodeURIComponent(id)}`),
  getBio: () => req("GET", "/bio"),
  saveBio: (b) => req("POST", "/bio", b),
  deleteBio: (id) => req("DELETE", `/bio/${encodeURIComponent(id)}`),
  exportAll: () => req("GET", "/export"),
  importAll: (payload) => req("POST", "/import", payload),
};

/* ============================================================
 * Локальный адаптер (localStorage) — тот же интерфейс
 * ========================================================== */
const LS = {
  sessions: "strong-log:sessions",
  bio: "strong-log:bio",
};
const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const local = {
  async ping() { return []; },                    // токен в local-режиме не проверяется
  async getSessions() { return lsGet(LS.sessions); },
  async saveSession(s) {
    const arr = lsGet(LS.sessions).filter((x) => x.id !== s.id);
    lsSet(LS.sessions, [s, ...arr]);
    return s;
  },
  async deleteSession(id) {
    lsSet(LS.sessions, lsGet(LS.sessions).filter((x) => x.id !== id));
    return null;
  },
  async getBio() { return lsGet(LS.bio); },
  async saveBio(b) {
    const arr = lsGet(LS.bio).filter((x) => x.id !== b.id && x.date !== b.date);
    lsSet(LS.bio, [b, ...arr]);
    return b;
  },
  async deleteBio(id) {
    lsSet(LS.bio, lsGet(LS.bio).filter((x) => x.id !== id));
    return null;
  },
  async exportAll() {
    return { sessions: lsGet(LS.sessions), bio: lsGet(LS.bio) };
  },
  async importAll(payload) {
    const sessions = Array.isArray(payload?.sessions) ? payload.sessions : [];
    const bio = Array.isArray(payload?.bio) ? payload.bio : [];
    // upsert по id / по дате (для bio) — как делает сервер
    const curS = lsGet(LS.sessions);
    sessions.forEach((s) => {
      const i = curS.findIndex((x) => x.id === s.id);
      if (i >= 0) curS[i] = s; else curS.unshift(s);
    });
    lsSet(LS.sessions, curS);
    const curB = lsGet(LS.bio);
    bio.forEach((b) => {
      const i = curB.findIndex((x) => x.id === b.id || x.date === b.date);
      if (i >= 0) curB[i] = b; else curB.unshift(b);
    });
    lsSet(LS.bio, curB);
    return { imported: { sessions: sessions.length, bio: bio.length } };
  },
};

export const api = IS_LOCAL ? local : remote;
