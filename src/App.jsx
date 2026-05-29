import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard, Dumbbell, HeartPulse, TrendingUp,
  Plus, Trash2, Check, ChevronDown, ChevronUp, Flame, ArrowUp, ArrowDown,
  LogOut, KeyRound, CloudOff, Download, Upload, Database,
} from "lucide-react";

import {
  C, TEMPLATES, BIO_METRICS, CSS,
  canon, normSession, uid, today, fmtDate, num,
} from "./data.js";
import { api, auth, ApiError } from "./api.js";

/* ================================================================== */
export default function App() {
  const [status, setStatus] = useState("checking"); // checking | gate | ready
  const [gateErr, setGateErr] = useState("");
  const [tab, setTab] = useState("home");
  const [sessions, setSessions] = useState([]);
  const [bio, setBio] = useState([]);
  const [syncErr, setSyncErr] = useState("");

  async function load() {
    const [rawS, rawB] = await Promise.all([api.getSessions(), api.getBio()]);
    setSessions((Array.isArray(rawS) ? rawS : []).map(normSession));
    setBio(Array.isArray(rawB) ? rawB : []);
  }

  // первичная проверка токена + загрузка
  useEffect(() => {
    (async () => {
      if (!auth.get()) { setStatus("gate"); return; }
      try { await load(); setStatus("ready"); }
      catch (e) {
        if (e instanceof ApiError && e.status === 401) { auth.clear(); setStatus("gate"); setGateErr("Сессия истекла, войди заново."); }
        else { setSyncErr(e.message || "Ошибка загрузки"); setStatus("ready"); }
      }
    })();
  }, []);

  async function handleAuth(token) {
    setGateErr("");
    auth.set(token);
    try {
      await load();
      setStatus("ready");
    } catch (e) {
      auth.clear();
      if (e instanceof ApiError && e.status === 401) setGateErr("Неверный токен.");
      else setGateErr(e.message || "Не удалось подключиться.");
    }
  }
  function logout() { auth.clear(); setSessions([]); setBio([]); setStatus("gate"); setGateErr(""); }

  /* ---- мутации через API (per-record upsert/delete) ----
   * Берём в стейт объект, который ВЕРНУЛ сервер: при upsert по date/id сервер
   * может сохранить прежний id, и локальный объект с новым uid() разойдётся с БД. */
  async function addSession(session) {
    const saved = (await api.saveSession(session)) || session;
    setSessions((prev) => [normSession(saved), ...prev.filter((s) => s.id !== saved.id)]);
    setSyncErr("");
  }
  async function removeSession(id) {
    await api.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setSyncErr("");
  }
  async function upsertBio(entry) {
    const saved = (await api.saveBio(entry)) || entry;
    setBio((prev) => [saved, ...prev.filter((b) => b.id !== saved.id && b.date !== saved.date)]);
    setSyncErr("");
  }
  async function removeBio(id) {
    await api.deleteBio(id);
    setBio((prev) => prev.filter((b) => b.id !== id));
    setSyncErr("");
  }

  if (status === "checking") {
    return <div style={{ background: C.bg, color: C.muted, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>Загрузка…
    </div>;
  }
  if (status === "gate") {
    return <Gate onAuth={handleAuth} error={gateErr} />;
  }

  const tabs = [
    { k: "home", label: "Обзор", icon: LayoutDashboard },
    { k: "log", label: "Тренировки", icon: Dumbbell },
    { k: "body", label: "Тело", icon: HeartPulse },
    { k: "progress", label: "Прогресс", icon: TrendingUp },
  ];

  return (
    <div style={{ background: C.bg, color: C.txt, minHeight: "100vh" }} className="ft-root">
      <style>{CSS}</style>

      <header className="ft-head">
        <div className="ft-head-top">
          <div>
            <div className="ft-logo">
              <Flame size={20} color={C.accent} strokeWidth={2.5} />
              <span>STRØNG<span style={{ color: C.accent }}>·</span>LOG</span>
            </div>
            <div className="ft-head-sub">личный трекер силовых и состава тела</div>
          </div>
          <button className="ft-logout" onClick={logout} title="Выйти">
            <LogOut size={14} /> выход
          </button>
        </div>
        {syncErr && (
          <div className="ft-sync err"><CloudOff size={13} /> {syncErr}</div>
        )}
      </header>

      <nav className="ft-nav">
        {tabs.map((t) => {
          const I = t.icon;
          return (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={"ft-tab" + (tab === t.k ? " on" : "")}>
              <I size={17} strokeWidth={2.2} /> <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      <main className="ft-main">
        {tab === "home" && <Home sessions={sessions} bio={bio} go={setTab} />}
        {tab === "log" && <Log sessions={sessions} addSession={addSession} removeSession={removeSession} onErr={setSyncErr} />}
        {tab === "body" && <Body bio={bio} upsertBio={upsertBio} removeBio={removeBio} onErr={setSyncErr} />}
        {tab === "progress" && <Progress sessions={sessions} bio={bio} />}

        <Backup sessions={sessions} bio={bio} reload={load} onErr={setSyncErr} />
      </main>
    </div>
  );
}

/* ---------------------------- TOKEN GATE ---------------------------- */
function Gate({ onAuth, error }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (!token.trim() || busy) return;
    setBusy(true);
    await onAuth(token.trim());
    setBusy(false);
  }
  return (
    <div style={{ background: C.bg, color: C.txt }} className="ft-root ft-gate">
      <style>{CSS}</style>
      <form className="ft-card ft-gate-card" onSubmit={submit}>
        <div className="ft-logo">
          <Flame size={20} color={C.accent} strokeWidth={2.5} />
          <span>STRØNG<span style={{ color: C.accent }}>·</span>LOG</span>
        </div>
        <div className="ft-head-sub" style={{ textAlign: "center", marginBottom: 16 }}>
          {auth.isLocal ? "локальный режим — введи любой токен" : "введи токен доступа"}
        </div>
        <label className="ft-field">
          <span className="ft-mini ft-muted">Токен</span>
          <input className="ft-input ft-mono" type="password" value={token} autoFocus
            placeholder="••••••••" onChange={(e) => setToken(e.target.value)} />
        </label>
        <button className="ft-btn ft-save" type="submit" disabled={busy || !token.trim()}>
          <KeyRound size={16} /> {busy ? "Проверка…" : "Войти"}
        </button>
        {error && <div className="ft-gate-err">{error}</div>}
      </form>
    </div>
  );
}

/* ---------------------------- OVERVIEW ---------------------------- */
function Home({ sessions, bio, go }) {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const last = sorted[0];
  const weekCount = sessions.filter((s) => {
    const days = (Date.now() - new Date(s.date)) / 864e5;
    return days >= 0 && days <= 7; // без будущих дат
  }).length;
  const bioSorted = [...bio].sort((a, b) => b.date.localeCompare(a.date));
  const lb = bioSorted[0], pb = bioSorted[1];
  const delta = (k) => (lb && pb && lb[k] != null && pb[k] != null) ? lb[k] - pb[k] : null;

  return (
    <div className="ft-grid">
      <Stat label="Тренировок за 7 дней" value={weekCount} accent />
      <Stat label="Всего тренировок" value={sessions.length} />
      <Stat label="Текущий вес" value={lb?.weight != null ? lb.weight + " кг" : "—"}
        trend={delta("weight")} invert />
      <Stat label="Жир" value={lb?.fat != null ? lb.fat + " %" : "—"}
        trend={delta("fat")} invert />

      <div className="ft-card span2">
        <div className="ft-card-h">Последняя тренировка</div>
        {last ? (
          <>
            <div className="ft-row" style={{ marginBottom: 10 }}>
              <strong>{TEMPLATES.find((t) => t.id === last.templateId)?.name || "Тренировка"}</strong>
              <span className="ft-muted ft-mono">{fmtDate(last.date)}</span>
            </div>
            {last.exercises.slice(0, 7).map((e, i) => {
              const top = e.sets.reduce((m, s) => Math.max(m, num(s.weight) || 0), 0);
              const vol = e.sets.reduce((v, s) => v + (num(s.weight) || 0) * (num(s.reps) || 0), 0);
              return (
                <div key={i} className="ft-row ft-mini">
                  <span className="ft-trunc">{e.n}</span>
                  <span className="ft-mono ft-muted">
                    {top ? top + " кг" : "св.вес"}{vol ? " · " + Math.round(vol) + " об." : ""}
                  </span>
                </div>
              );
            })}
          </>
        ) : (
          <button className="ft-btn" onClick={() => go("log")}>
            <Plus size={16} /> Записать первую тренировку
          </button>
        )}
      </div>

      <div className="ft-card span2">
        <div className="ft-card-h">Состав тела</div>
        {lb ? (
          <div className="ft-bio-grid">
            {BIO_METRICS.map((m) => lb[m.k] != null && (
              <div key={m.k} className="ft-bio-cell">
                <div className="ft-muted ft-mini">{m.label}</div>
                <div className="ft-mono ft-bio-v" style={{ color: m.color }}>
                  {lb[m.k]}<span className="ft-unit">{m.unit}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <button className="ft-btn" onClick={() => go("body")}>
            <Plus size={16} /> Добавить замер
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent, trend, invert }) {
  let arrow = null;
  if (trend != null && trend !== 0) {
    const down = trend < 0;
    const good = invert ? down : !down;
    arrow = (
      <span className="ft-mono ft-mini" style={{ color: good ? C.accent : C.danger }}>
        {down ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
        {Math.abs(trend).toFixed(1)}
      </span>
    );
  }
  return (
    <div className="ft-card ft-stat">
      <div className="ft-muted ft-mini">{label}</div>
      <div className="ft-row">
        <div className="ft-mono ft-stat-v" style={{ color: accent ? C.accent : C.txt }}>{value}</div>
        {arrow}
      </div>
    </div>
  );
}

/* ---------------------------- LOG ---------------------------- */
function Log({ sessions, addSession, removeSession, onErr }) {
  const [tplId, setTplId] = useState(TEMPLATES[0].id);
  const [date, setDate] = useState(today());
  const [form, setForm] = useState(() => initForm(TEMPLATES[0]));
  const [openHist, setOpenHist] = useState(false);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const lastDates = useMemo(() => {
    const m = {};
    sessions.forEach((s) => { if (!m[s.templateId] || s.date > m[s.templateId]) m[s.templateId] = s.date; });
    return m;
  }, [sessions]);
  const nextId = useMemo(() => {
    if (!sessions.length) return TEMPLATES[0].id;
    const last = [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0];
    const idx = TEMPLATES.findIndex((t) => t.id === last.templateId);
    return TEMPLATES[(idx + 1) % TEMPLATES.length].id;
  }, [sessions]);
  function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2400); }

  function pick(id) {
    setTplId(id);
    setForm(initForm(TEMPLATES.find((t) => t.id === id)));
  }
  function setCell(ei, si, key, val) {
    setForm((f) => {
      const c = structuredClone(f);
      c[ei].sets[si][key] = val;
      return c;
    });
  }
  function addSet(ei) {
    setForm((f) => {
      const c = structuredClone(f);
      const last = c[ei].sets[c[ei].sets.length - 1] || { weight: "", reps: "" };
      c[ei].sets.push({ weight: last.weight, reps: last.reps, hint: "" });
      return c;
    });
  }
  function delSet(ei, si) {
    setForm((f) => {
      const c = structuredClone(f);
      c[ei].sets.splice(si, 1);
      return c;
    });
  }
  function delExercise(ei) {
    setForm((f) => f.filter((_, i) => i !== ei));
  }
  async function commit() {
    if (saving) return;
    const tpl = TEMPLATES.find((t) => t.id === tplId);
    const session = {
      id: uid(), date, templateId: tplId,
      exercises: form.map((e) => ({
        n: e.n,
        sets: e.sets
          .filter((s) => s.weight !== "" || s.reps !== "")
          .map((s) => ({ weight: s.weight, reps: s.reps })),
      })).filter((e) => e.sets.length),
    };
    if (!session.exercises.length) { flash("Заполни хотя бы один подход"); return; }
    setSaving(true);
    try {
      await addSession(session);
      setForm(initForm(tpl));
      setOpenHist(true);
      flash(`${tpl.name} сохранена — ${fmtDate(date)}`);
    } catch (e) {
      onErr(e.message || "Не удалось сохранить");
      flash("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }
  async function delSession(s) {
    const tpl = TEMPLATES.find((t) => t.id === s.templateId);
    if (!window.confirm(`Удалить тренировку «${tpl?.name || "Тренировка"}» от ${fmtDate(s.date)}?`)) return;
    try { await removeSession(s.id); }
    catch (e) { onErr(e.message || "Не удалось удалить"); }
  }

  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="ft-seg">
        {TEMPLATES.map((t) => (
          <button key={t.id} onClick={() => pick(t.id)}
            className={"ft-seg-b" + (tplId === t.id ? " on" : "")}>
            <div className="ft-row" style={{ width: "100%", alignItems: "flex-start" }}>
              <strong>{t.name}</strong>
              {nextId === t.id && <span className="ft-next">следующая</span>}
            </div>
            <span className="ft-mini ft-muted">{t.sub}</span>
            <span className="ft-mini ft-last ft-mono">
              {lastDates[t.id] ? "посл.: " + fmtDate(lastDates[t.id]) : "ещё не было"}
            </span>
          </button>
        ))}
      </div>

      <div className="ft-row ft-datebar">
        <label className="ft-mini ft-muted">Дата</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ft-input ft-mono" />
      </div>

      {form.map((e, ei) => (
        <div key={ei} className="ft-card ft-ex">
          <div className="ft-ex-h">
            <span className="ft-ex-num ft-mono">{ei + 1}</span>
            <span className="ft-ex-name">{e.n}</span>
            <button className="ft-icon-b ft-ex-del" onClick={() => delExercise(ei)}
              title="Убрать упражнение (не делал)">
              <Trash2 size={15} />
            </button>
          </div>
          <div className="ft-sets">
            <div className="ft-set ft-set-head ft-mini ft-muted">
              <span>#</span><span>кг</span><span>повт.</span><span></span>
            </div>
            {e.sets.map((s, si) => (
              <div key={si} className="ft-set">
                <span className="ft-mono ft-muted">{si + 1}</span>
                <input className="ft-input ft-mono" type="number" inputMode="decimal"
                  value={s.weight} placeholder="—"
                  onChange={(ev) => setCell(ei, si, "weight", ev.target.value)} />
                <input className="ft-input ft-mono" type="number" inputMode="numeric"
                  value={s.reps ?? ""} placeholder={s.hint || "—"}
                  onChange={(ev) => setCell(ei, si, "reps", ev.target.value)} />
                <button className="ft-icon-b" onClick={() => delSet(ei, si)} title="Удалить подход">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button className="ft-add" onClick={() => addSet(ei)}>
            <Plus size={13} /> подход
          </button>
        </div>
      ))}

      <button className="ft-btn ft-save" onClick={commit} disabled={saving}>
        <Check size={17} /> {saving ? "Сохранение…" : "Сохранить тренировку"}
      </button>
      {toast && (
        <div className="ft-toast"><Check size={15} /> {toast}</div>
      )}

      <button className="ft-hist-toggle" onClick={() => setOpenHist((v) => !v)}>
        История ({sessions.length}) {openHist ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {openHist && (
        <div>
          {sorted.length === 0 && <div className="ft-muted ft-mini" style={{ padding: 8 }}>Пока пусто.</div>}
          {sorted.map((s) => {
            const tpl = TEMPLATES.find((t) => t.id === s.templateId);
            const totalVol = s.exercises.reduce((v, e) =>
              v + e.sets.reduce((vv, x) => vv + (num(x.weight) || 0) * (num(x.reps) || 0), 0), 0);
            return (
              <div key={s.id} className="ft-card ft-hist">
                <div className="ft-row">
                  <div>
                    <strong>{tpl?.name || "Тренировка"}</strong>
                    <span className="ft-muted ft-mini" style={{ marginLeft: 8 }}>{fmtDate(s.date)}</span>
                  </div>
                  <div className="ft-row" style={{ gap: 10 }}>
                    <span className="ft-mono ft-muted ft-mini">{Math.round(totalVol)} об.</span>
                    <button className="ft-icon-b" onClick={() => delSession(s)} title="Удалить тренировку">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {s.exercises.map((e, i) => (
                  <div key={i} className="ft-row ft-mini">
                    <span className="ft-trunc ft-muted">{e.n}</span>
                    <span className="ft-mono">{e.sets.map((x) =>
                      (x.weight ? x.weight + "×" : "") + (x.reps ?? "")).join(" / ")}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function initForm(tpl) {
  return tpl.ex.map((e) => ({
    n: canon(e.n),
    sets: e.s.map((arr) => ({
      weight: arr[0] ? arr[0] : "",
      reps: arr[1] != null ? arr[1] : "",
      hint: arr[2] || "",
    })),
  }));
}

/* ---------------------------- BODY (bioimpedance) ---------------------------- */
function Body({ bio, upsertBio, removeBio, onErr }) {
  const empty = { date: today(), weight: "", fat: "", muscle: "", water: "", visceral: "", bone: "", note: "" };
  const [f, setF] = useState(empty);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2400); }

  async function commit() {
    if (saving) return;
    if (Object.keys(empty).every((k) => k === "date" || k === "note" ? false : f[k] === "")) {
      flash("Заполни хотя бы одно поле"); return;
    }
    const entry = { id: uid(), date: f.date, note: f.note };
    BIO_METRICS.forEach((m) => { entry[m.k] = num(f[m.k]); });
    setSaving(true);
    try {
      await upsertBio(entry);
      setF(empty);
      flash(`Замер сохранён — ${fmtDate(entry.date)}`);
    } catch (e) {
      onErr(e.message || "Не удалось сохранить");
      flash("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }
  async function del(b) {
    if (!window.confirm(`Удалить замер от ${fmtDate(b.date)}?`)) return;
    try { await removeBio(b.id); }
    catch (e) { onErr(e.message || "Не удалось удалить"); }
  }

  const sorted = [...bio].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="ft-card">
        <div className="ft-card-h">Новый замер биоимпеданса</div>
        <div className="ft-row ft-datebar" style={{ marginBottom: 12 }}>
          <label className="ft-mini ft-muted">Дата</label>
          <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })}
            className="ft-input ft-mono" />
        </div>
        <div className="ft-bio-form">
          {BIO_METRICS.map((m) => (
            <label key={m.k} className="ft-field">
              <span className="ft-mini ft-muted">{m.label}{m.unit ? `, ${m.unit}` : ""}</span>
              <input className="ft-input ft-mono" type="number" inputMode="decimal" placeholder="—"
                value={f[m.k]} onChange={(e) => setF({ ...f, [m.k]: e.target.value })} />
            </label>
          ))}
        </div>
        <button className="ft-btn ft-save" onClick={commit} disabled={saving}>
          <Check size={16} /> {saving ? "Сохранение…" : "Сохранить замер"}
        </button>
        {toast && <div className="ft-toast"><Check size={15} /> {toast}</div>}
        <div className="ft-mini ft-muted" style={{ marginTop: 8 }}>
          Замер на ту же дату перезапишется.
        </div>
      </div>

      {sorted.map((b) => (
        <div key={b.id} className="ft-card ft-hist">
          <div className="ft-row">
            <strong className="ft-mono">{fmtDate(b.date)}</strong>
            <button className="ft-icon-b" onClick={() => del(b)} title="Удалить замер">
              <Trash2 size={14} />
            </button>
          </div>
          <div className="ft-bio-grid" style={{ marginTop: 6 }}>
            {BIO_METRICS.map((m) => b[m.k] != null && (
              <div key={m.k} className="ft-bio-cell">
                <div className="ft-muted ft-mini">{m.label}</div>
                <div className="ft-mono ft-bio-v" style={{ color: m.color }}>
                  {b[m.k]}<span className="ft-unit">{m.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------- PROGRESS ---------------------------- */
function Progress({ sessions, bio }) {
  const exNames = useMemo(() => {
    const set = new Set();
    sessions.forEach((s) => s.exercises.forEach((e) => set.add(e.n)));
    return [...set].sort();
  }, [sessions]);

  const [ex, setEx] = useState("");
  const [metric, setMetric] = useState("volume");
  const [bioMetric, setBioMetric] = useState("weight");

  useEffect(() => { if (!ex && exNames.length) setEx(exNames[0]); }, [exNames, ex]);

  const exData = useMemo(() => {
    if (!ex) return [];
    return sessions
      .filter((s) => s.exercises.some((e) => e.n === ex))
      .map((s) => {
        const e = s.exercises.find((x) => x.n === ex);
        const vol = e.sets.reduce((v, x) => v + (num(x.weight) || 0) * (num(x.reps) || 0), 0);
        const top = e.sets.reduce((m, x) => Math.max(m, num(x.weight) || 0), 0);
        return { date: s.date, label: fmtDate(s.date), volume: Math.round(vol), top };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [ex, sessions]);

  const bioData = useMemo(() =>
    [...bio].filter((b) => b[bioMetric] != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((b) => ({ label: fmtDate(b.date), v: b[bioMetric] })),
    [bio, bioMetric]);

  const bm = BIO_METRICS.find((m) => m.k === bioMetric);

  return (
    <div>
      <div className="ft-card">
        <div className="ft-card-h">Прогресс по упражнению</div>
        {exNames.length === 0 ? (
          <div className="ft-muted ft-mini">Запиши тренировку, чтобы увидеть графики.</div>
        ) : (
          <>
            <div className="ft-row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <div className="ft-select-wrap">
                <select className="ft-select" value={ex} onChange={(e) => setEx(e.target.value)}>
                  {exNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <ChevronDown size={14} className="ft-select-ic" />
              </div>
              <div className="ft-pills">
                <button className={"ft-pill" + (metric === "volume" ? " on" : "")} onClick={() => setMetric("volume")}>Объём</button>
                <button className={"ft-pill" + (metric === "top" ? " on" : "")} onClick={() => setMetric("top")}>Макс. вес</button>
              </div>
            </div>
            <Chart data={exData} dataKey={metric} color={C.accent}
              unit={metric === "top" ? "кг" : ""} type="bar" />
          </>
        )}
      </div>

      <div className="ft-card">
        <div className="ft-card-h">Состав тела</div>
        {bio.length === 0 ? (
          <div className="ft-muted ft-mini">Добавь замеры на вкладке «Тело».</div>
        ) : (
          <>
            <div className="ft-pills" style={{ marginBottom: 10, flexWrap: "wrap" }}>
              {BIO_METRICS.map((m) => (
                <button key={m.k} className={"ft-pill" + (bioMetric === m.k ? " on" : "")}
                  onClick={() => setBioMetric(m.k)}>{m.label}</button>
              ))}
            </div>
            <Chart data={bioData} dataKey="v" color={bm.color} unit={bm.unit} type="line" />
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- BACKUP (export / import) ---------------------------- */
function Backup({ sessions, bio, reload, onErr }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = React.useRef(null);
  function flash(m) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  async function exportData() {
    if (busy) return;
    setBusy(true);
    try {
      const data = await api.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `strong-log-backup-${today()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flash(`Выгружено: ${data.sessions?.length || 0} трен., ${data.bio?.length || 0} замеров`);
    } catch (e) {
      onErr(e.message || "Не удалось выгрузить");
    } finally {
      setBusy(false);
    }
  }

  async function importData(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // позволяем выбрать тот же файл повторно
    if (!file || busy) return;
    setBusy(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload || (!Array.isArray(payload.sessions) && !Array.isArray(payload.bio))) {
        throw new Error("Файл не похож на бэкап STRØNG·LOG");
      }
      const cnt = (payload.sessions?.length || 0) + (payload.bio?.length || 0);
      if (!window.confirm(`Импортировать ${cnt} записей? Существующие с теми же id/датами будут перезаписаны.`)) {
        setBusy(false);
        return;
      }
      const res = await api.importAll(payload);
      await reload();
      const im = res?.imported || {};
      flash(`Импортировано: ${im.sessions ?? payload.sessions?.length ?? 0} трен., ${im.bio ?? payload.bio?.length ?? 0} замеров`);
    } catch (e) {
      onErr(e.message || "Не удалось импортировать");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ft-card ft-backup">
      <div className="ft-card-h"><Database size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Бэкап данных</div>
      <div className="ft-mini ft-muted" style={{ marginBottom: 10 }}>
        Выгрузка всех тренировок и замеров в JSON-файл и восстановление из него.
      </div>
      <div className="ft-row" style={{ justifyContent: "flex-start", gap: 8, flexWrap: "wrap" }}>
        <button className="ft-btn ft-backup-b" onClick={exportData} disabled={busy}>
          <Download size={15} /> Выгрузить
        </button>
        <button className="ft-btn ft-backup-b" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload size={15} /> Импортировать
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json"
          onChange={importData} style={{ display: "none" }} />
      </div>
      {msg && <div className="ft-toast" style={{ marginTop: 10 }}><Check size={15} /> {msg}</div>}
    </div>
  );
}

function Chart({ data, dataKey, color, unit, type }) {
  if (!data.length) return <div className="ft-muted ft-mini">Нет данных.</div>;
  const tip = {
    contentStyle: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, color: C.txt, fontSize: 12 },
    labelStyle: { color: C.muted },
    formatter: (v) => [`${v}${unit ? " " + unit : ""}`, ""],
  };
  const axis = { stroke: C.muted, fontSize: 11, tickLine: false };
  return (
    <ResponsiveContainer width="100%" height={220}>
      {type === "bar" ? (
        <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={C.line} vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} />
          <Tooltip {...tip} cursor={{ fill: "rgba(200,242,63,0.06)" }} />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={C.line} vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} domain={["auto", "auto"]} />
          <Tooltip {...tip} />
          <Line dataKey={dataKey} stroke={color} strokeWidth={2.5}
            dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
