import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard, Dumbbell, HeartPulse, TrendingUp,
  Plus, Trash2, Check, X, ChevronDown, ChevronUp, Flame, ArrowUp, ArrowDown,
  LogOut, KeyRound, CloudOff, Pencil, Copy, ListPlus,
} from "lucide-react";

import {
  C, BUILTIN_TEMPLATES, BIO_METRICS, SEGMENTS, SEG_FIELDS, CSS,
  normSession, uid, today, fmtDate, num,
  BW_EXERCISES, bodyweightOn, exerciseVolume, exerciseTop, sessionVolume,
  suggestForm, exerciseMeta,
} from "./data.js";
import { api, auth, ApiError } from "./api.js";

/* ================================================================== */
export default function App() {
  const [status, setStatus] = useState("checking"); // checking | gate | ready
  const [gateErr, setGateErr] = useState("");
  const [tab, setTab] = useState("home");
  const [sessions, setSessions] = useState([]);
  const [bio, setBio] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [syncErr, setSyncErr] = useState("");

  async function load() {
    const [rawS, rawB] = await Promise.all([api.getSessions(), api.getBio()]);
    setSessions((Array.isArray(rawS) ? rawS : []).map(normSession));
    setBio(Array.isArray(rawB) ? rawB : []);
    // программы грузим толерантно: отсутствие эндпоинта/миграции не должно ронять загрузку
    let rawT = [];
    try { rawT = await api.getTemplates(); } catch { rawT = []; }
    setTemplates((Array.isArray(rawT) ? rawT : []).map((t) => ({ ...t, builtin: false })));
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
  function logout() { auth.clear(); setSessions([]); setBio([]); setTemplates([]); setStatus("gate"); setGateErr(""); }

  /* ---- мутации через API (per-record upsert/delete) ---- */
  async function addSession(session) {
    await api.saveSession(session);
    setSessions((prev) => [normSession(session), ...prev.filter((s) => s.id !== session.id)]);
    setSyncErr("");
  }
  async function removeSession(id) {
    await api.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setSyncErr("");
  }
  async function upsertBio(entry) {
    await api.saveBio(entry);
    setBio((prev) => [entry, ...prev.filter((b) => b.id !== entry.id && b.date !== entry.date)]);
    setSyncErr("");
  }
  async function removeBio(id) {
    await api.deleteBio(id);
    setBio((prev) => prev.filter((b) => b.id !== id));
    setSyncErr("");
  }
  async function addTemplate(tpl) {
    const payload = { id: tpl.id, name: tpl.name, sub: tpl.sub || "", ex: tpl.ex };
    await api.saveTemplate(payload);
    const saved = { ...payload, builtin: false };
    setTemplates((prev) => [saved, ...prev.filter((t) => t.id !== saved.id)]);
    setSyncErr("");
  }
  async function removeTemplate(id) {
    await api.deleteTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
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

  const allTemplates = [...BUILTIN_TEMPLATES, ...templates];

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
        {tab === "home" && <Home sessions={sessions} bio={bio} go={setTab} templates={allTemplates} />}
        {tab === "log" && <Log sessions={sessions} bio={bio} addSession={addSession} removeSession={removeSession} onErr={setSyncErr} templates={allTemplates} addTemplate={addTemplate} removeTemplate={removeTemplate} />}
        {tab === "body" && <Body bio={bio} upsertBio={upsertBio} removeBio={removeBio} onErr={setSyncErr} />}
        {tab === "progress" && <Progress sessions={sessions} bio={bio} />}
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
function Home({ sessions, bio, go, templates }) {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const last = sorted[0];
  const weekCount = sessions.filter(
    (s) => (Date.now() - new Date(s.date)) / 864e5 <= 7
  ).length;
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
              <strong>{templates.find((t) => t.id === last.templateId)?.name || "Тренировка"}</strong>
              <span className="ft-muted ft-mono">{fmtDate(last.date)}</span>
            </div>
            {(() => {
              const bw = bodyweightOn(bio, last.date);
              return last.exercises.slice(0, 7).map((e, i) => {
                const top = exerciseTop(e, bw);
                const vol = exerciseVolume(e, bw);
                return (
                  <div key={i} className="ft-row ft-mini">
                    <span className="ft-trunc">{e.n}</span>
                    <span className="ft-mono ft-muted">
                      {top ? top + " кг" : "св.вес"}{vol ? " · " + Math.round(vol) + " об." : ""}
                    </span>
                  </div>
                );
              });
            })()}
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
function Log({ sessions, bio, addSession, removeSession, onErr, templates, addTemplate, removeTemplate }) {
  const [tplId, setTplId] = useState(templates[0].id);
  const [date, setDate] = useState(today());
  const [form, setForm] = useState(() => suggestForm(templates[0], sessions));
  const [openHist, setOpenHist] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorNew, setEditorNew] = useState(false);

  const lastDates = useMemo(() => {
    const m = {};
    sessions.forEach((s) => { if (!m[s.templateId] || s.date > m[s.templateId]) m[s.templateId] = s.date; });
    return m;
  }, [sessions]);
  const nextId = useMemo(() => {
    if (!sessions.length) return templates[0].id;
    const last = [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0];
    const idx = templates.findIndex((t) => t.id === last.templateId);
    return idx < 0 ? templates[0].id : templates[(idx + 1) % templates.length].id;
  }, [sessions, templates]);
  function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2400); }

  // если выбранная (кастомная) программа была удалена — откатываемся на первую
  useEffect(() => {
    if (!editingId && !templates.some((t) => t.id === tplId)) {
      const tpl = templates[0];
      setTplId(tpl.id);
      setForm(suggestForm(tpl, sessions));
    }
  }, [templates]); // eslint-disable-line react-hooks/exhaustive-deps

  // мета прогрессии по упражнениям текущей формы (имена + история)
  const exNames = form.map((e) => e.n).join("|");
  const exMeta = useMemo(() => {
    const m = {};
    exNames.split("|").forEach((n) => { if (n) m[n] = exerciseMeta(sessions, n); });
    return m;
  }, [exNames, sessions]);

  function bumpWeights(ei, step) {
    setForm((f) => {
      const c = structuredClone(f);
      c[ei].sets = c[ei].sets.map((s) => ({
        ...s,
        weight: (s.weight === "" || s.weight == null) ? s.weight : Number(s.weight) + step,
      }));
      return c;
    });
  }

  function pick(id) {
    const tpl = templates.find((t) => t.id === id) || templates[0];
    setTplId(tpl.id);
    setForm(suggestForm(tpl, sessions));
    setEditingId(null);
  }
  function startEdit(s) {
    setEditingId(s.id);
    setTplId(s.templateId);
    setDate(s.date);
    setForm(s.exercises.map((e) => ({
      n: e.n,
      sets: e.sets.map((x) => ({ weight: x.weight ?? "", reps: x.reps ?? "", hint: x.hint ?? "" })),
    })));
    setOpenHist(false);
    setConfirmId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelEdit() {
    setEditingId(null);
    const tpl = templates.find((t) => t.id === tplId) || templates[0];
    setTplId(tpl.id);
    setForm(suggestForm(tpl, sessions));
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
    const tpl = templates.find((t) => t.id === tplId) || templates[0];
    const session = {
      id: editingId || uid(), date, templateId: tplId,
      exercises: form.map((e) => ({
        n: e.n,
        sets: e.sets
          .filter((s) => s.weight !== "" || s.reps !== "")
          .map((s) => ({ weight: s.weight, reps: s.reps })),
      })).filter((e) => e.sets.length),
    };
    if (!session.exercises.length) { flash("Заполни хотя бы один подход"); return; }
    setSaving(true);
    const wasEditing = !!editingId;
    try {
      await addSession(session);
      setForm(suggestForm(tpl, sessions));
      setEditingId(null);
      setOpenHist(true);
      flash(`${tpl.name} ${wasEditing ? "обновлена" : "сохранена"} — ${fmtDate(date)}`);
    } catch (e) {
      onErr(e.message || "Не удалось сохранить");
      flash("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }
  async function delSession(id) {
    try { await removeSession(id); }
    catch (e) { onErr(e.message || "Не удалось удалить"); }
    setConfirmId(null);
  }

  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="ft-prog-bar">
        <span className="ft-mini ft-muted">Программа тренировки</span>
        <div className="ft-row" style={{ gap: 6 }}>
          <button className="ft-prog-btn" onClick={() => { setEditorNew(true); setEditorOpen(true); }}>
            <Plus size={13} /> Новая
          </button>
          <button className="ft-prog-btn" onClick={() => { setEditorNew(false); setEditorOpen(true); }}>
            <Pencil size={13} /> Программы
          </button>
        </div>
      </div>
      <div className="ft-seg">
        {templates.map((t) => (
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

      {editorOpen && (
        <ProgramEditor
          templates={templates}
          addTemplate={addTemplate}
          removeTemplate={removeTemplate}
          startNew={editorNew}
          onClose={() => setEditorOpen(false)}
        />
      )}

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
          {exMeta[e.n]?.lastText && (
            <button className="ft-progress-chip" onClick={() => bumpWeights(ei, exMeta[e.n].step)}
              title={`Прибавить ${exMeta[e.n].step} кг ко всем подходам`}>
              <ArrowUp size={12} /> +{exMeta[e.n].step} кг
              <span className="ft-muted">· в прошлый раз {exMeta[e.n].lastText}</span>
            </button>
          )}
          {BW_EXERCISES.has(e.n) && (
            <div className="ft-mini ft-muted ft-bw-hint">
              Вес тела учитывается автоматически. Помощь — со знаком «+», утяжелитель — со знаком «−».
            </div>
          )}
          <div className="ft-sets">
            <div className="ft-set ft-set-head ft-mini ft-muted">
              <span>#</span><span>{BW_EXERCISES.has(e.n) ? "помощь+/утяж−" : "кг"}</span><span>повт.</span><span></span>
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

      {editingId && (
        <div className="ft-edit-bar ft-mini">
          <span><Pencil size={13} /> Редактирование тренировки от {fmtDate(date)}</span>
          <button className="ft-icon-b" onClick={cancelEdit} title="Отменить редактирование">
            <X size={15} />
          </button>
        </div>
      )}
      <button className="ft-btn ft-save" onClick={commit} disabled={saving}>
        <Check size={17} /> {saving ? "Сохранение…" : editingId ? "Сохранить изменения" : "Сохранить тренировку"}
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
            const tpl = templates.find((t) => t.id === s.templateId);
            const totalVol = sessionVolume(s, bio);
            return (
              <div key={s.id} className="ft-card ft-hist">
                <div className="ft-row">
                  <div>
                    <strong>{tpl?.name || "Тренировка"}</strong>
                    <span className="ft-muted ft-mini" style={{ marginLeft: 8 }}>{fmtDate(s.date)}</span>
                  </div>
                  <div className="ft-row" style={{ gap: 10 }}>
                    <span className="ft-mono ft-muted ft-mini">{Math.round(totalVol)} об.</span>
                    {confirmId === s.id ? (
                      <span className="ft-row" style={{ gap: 4 }}>
                        <button className="ft-confirm-del" onClick={() => delSession(s.id)}>Удалить</button>
                        <button className="ft-icon-b" onClick={() => setConfirmId(null)} title="Отмена">
                          <X size={15} />
                        </button>
                      </span>
                    ) : (
                      <span className="ft-row" style={{ gap: 2 }}>
                        <button className="ft-icon-b" onClick={() => startEdit(s)} title="Редактировать тренировку">
                          <Pencil size={14} />
                        </button>
                        <button className="ft-icon-b" onClick={() => setConfirmId(s.id)} title="Удалить тренировку">
                          <Trash2 size={14} />
                        </button>
                      </span>
                    )}
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

/* ---------------------------- PROGRAM EDITOR ---------------------------- */
const blankDraft = () => ({ id: uid(), name: "", sub: "", ex: [{ n: "", s: [["", ""]] }] });
// шаблон -> черновик (значения как строки для контролируемых инпутов)
function toDraft(t, fresh) {
  return {
    id: fresh ? uid() : t.id,
    name: fresh ? t.name + " (копия)" : t.name,
    sub: t.sub || "",
    ex: (t.ex || []).map((e) => ({
      n: e.n,
      s: (e.s || []).map((arr) => [
        arr[0] === 0 || arr[0] == null ? "" : String(arr[0]),
        arr[1] == null ? "" : String(arr[1]),
      ]),
    })),
  };
}

function ProgramEditor({ templates, addTemplate, removeTemplate, startNew, onClose }) {
  const [draft, setDraft] = useState(() => (startNew ? blankDraft() : null));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const custom = templates.filter((t) => !t.builtin);

  const mut = (fn) => setDraft((d) => { const c = structuredClone(d); fn(c); return c; });
  const setName = (v) => mut((d) => { d.name = v; });
  const setSub = (v) => mut((d) => { d.sub = v; });
  const setExName = (ei, v) => mut((d) => { d.ex[ei].n = v; });
  const setCell = (ei, si, k, v) => mut((d) => { d.ex[ei].s[si][k] = v; });
  const addEx = () => mut((d) => { d.ex.push({ n: "", s: [["", ""]] }); });
  const delEx = (ei) => mut((d) => { d.ex.splice(ei, 1); });
  const addSet = (ei) => mut((d) => {
    const last = d.ex[ei].s[d.ex[ei].s.length - 1] || ["", ""];
    d.ex[ei].s.push([last[0], last[1]]);
  });
  const delSet = (ei, si) => mut((d) => { d.ex[ei].s.splice(si, 1); });

  async function save() {
    setErr("");
    const name = draft.name.trim();
    if (!name) { setErr("Укажи название программы"); return; }
    const ex = draft.ex
      .map((e) => ({
        n: e.n.trim(),
        s: e.s
          .map((arr) => [num(arr[0]) ?? 0, num(arr[1])])
          .filter((arr) => arr[0] !== 0 || arr[1] != null),
      }))
      .filter((e) => e.n && e.s.length);
    if (!ex.length) { setErr("Добавь хотя бы одно упражнение с подходом"); return; }
    setBusy(true);
    try {
      await addTemplate({ id: draft.id, name, sub: draft.sub.trim(), ex });
      setDraft(null);
    } catch (e) {
      setErr(e.message || "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }
  async function del(id) {
    try { await removeTemplate(id); }
    catch (e) { setErr(e.message || "Не удалось удалить"); }
    setConfirmDel(null);
  }

  return (
    <div className="ft-prog-overlay" onClick={onClose}>
      <div className="ft-prog-editor" onClick={(e) => e.stopPropagation()}>
        <div className="ft-row ft-prog-head">
          <strong>{draft ? "Программа" : "Мои программы"}</strong>
          <button className="ft-icon-b" onClick={onClose} title="Закрыть"><X size={18} /></button>
        </div>

        {!draft ? (
          <div className="ft-prog-list">
            <button className="ft-btn ft-save" onClick={() => setDraft(blankDraft())}>
              <Plus size={16} /> Новая программа
            </button>
            {templates.map((t) => (
              <div key={t.id} className="ft-prog-item">
                <div style={{ minWidth: 0 }}>
                  <strong className="ft-trunc" style={{ display: "block" }}>{t.name}</strong>
                  <span className="ft-mini ft-muted">{t.sub || `${t.ex.length} упр.`}{t.builtin ? " · встроенная" : ""}</span>
                </div>
                <div className="ft-row" style={{ gap: 2, flex: "none" }}>
                  {!t.builtin && (
                    <button className="ft-icon-b" title="Изменить" onClick={() => { setErr(""); setDraft(toDraft(t, false)); }}>
                      <Pencil size={15} />
                    </button>
                  )}
                  <button className="ft-icon-b" title="Дублировать" onClick={() => { setErr(""); setDraft(toDraft(t, true)); }}>
                    <Copy size={15} />
                  </button>
                  {!t.builtin && (confirmDel === t.id ? (
                    <button className="ft-confirm-del" onClick={() => del(t.id)}>Удалить</button>
                  ) : (
                    <button className="ft-icon-b" title="Удалить" onClick={() => setConfirmDel(t.id)}>
                      <Trash2 size={15} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {custom.length === 0 && (
              <div className="ft-mini ft-muted" style={{ padding: "4px 2px" }}>
                Свои программы можно создать с нуля или «Дублировать» встроенную.
              </div>
            )}
            {err && <div className="ft-gate-err" style={{ textAlign: "left" }}>{err}</div>}
          </div>
        ) : (
          <div className="ft-prog-form">
            <label className="ft-field">
              <span className="ft-mini ft-muted">Название</span>
              <input className="ft-input" value={draft.name} placeholder="Моя программа"
                onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="ft-field">
              <span className="ft-mini ft-muted">Подпись (мышцы / акцент)</span>
              <input className="ft-input" value={draft.sub} placeholder="напр. Ноги / плечи"
                onChange={(e) => setSub(e.target.value)} />
            </label>

            {draft.ex.map((e, ei) => (
              <div key={ei} className="ft-card ft-prog-ex">
                <div className="ft-ex-h">
                  <span className="ft-ex-num ft-mono">{ei + 1}</span>
                  <input className="ft-input" value={e.n} placeholder="Название упражнения"
                    onChange={(ev) => setExName(ei, ev.target.value)} />
                  <button className="ft-icon-b" onClick={() => delEx(ei)} title="Убрать упражнение">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="ft-sets">
                  <div className="ft-set ft-set-head ft-mini ft-muted">
                    <span>#</span><span>кг</span><span>повт.</span><span></span>
                  </div>
                  {e.s.map((arr, si) => (
                    <div key={si} className="ft-set">
                      <span className="ft-mono ft-muted">{si + 1}</span>
                      <input className="ft-input ft-mono" type="number" inputMode="decimal" placeholder="—"
                        value={arr[0]} onChange={(ev) => setCell(ei, si, 0, ev.target.value)} />
                      <input className="ft-input ft-mono" type="number" inputMode="numeric" placeholder="—"
                        value={arr[1]} onChange={(ev) => setCell(ei, si, 1, ev.target.value)} />
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
            <button className="ft-add" onClick={addEx}>
              <ListPlus size={14} /> упражнение
            </button>

            {err && <div className="ft-gate-err" style={{ textAlign: "left" }}>{err}</div>}
            <div className="ft-row" style={{ gap: 8, marginTop: 6 }}>
              <button className="ft-btn ft-save" onClick={save} disabled={busy}>
                <Check size={16} /> {busy ? "Сохранение…" : "Сохранить"}
              </button>
              <button className="ft-prog-btn" style={{ flex: "none" }} onClick={() => { setErr(""); setDraft(null); }}>
                Назад
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- BODY (bioimpedance) ---------------------------- */
function Body({ bio, upsertBio, removeBio, onErr }) {
  const blank = () => {
    const o = { date: today(), note: "" };
    BIO_METRICS.forEach((m) => { o[m.k] = ""; });
    return o;
  };
  const [f, setF] = useState(blank);
  const [segs, setSegs] = useState({});
  const [toast, setToast] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [saving, setSaving] = useState(false);
  function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2400); }
  function setSeg(segK, fieldK, val) {
    setSegs((p) => ({ ...p, [segK]: { ...(p[segK] || {}), [fieldK]: val } }));
  }

  async function commit() {
    if (saving) return;
    const anyMetric = BIO_METRICS.some((m) => f[m.k] !== "");
    const anySeg = Object.values(segs).some((row) => row && Object.values(row).some((v) => v !== "" && v != null));
    if (!anyMetric && !anySeg) { flash("Заполни хотя бы одно поле"); return; }
    const entry = { id: uid(), date: f.date, note: f.note };
    BIO_METRICS.forEach((m) => { entry[m.k] = num(f[m.k]); });
    const segData = {};
    SEGMENTS.forEach((s) => {
      const row = segs[s.k] || {};
      if (SEG_FIELDS.some((sf) => row[sf.k] !== "" && row[sf.k] != null)) {
        segData[s.k] = {};
        SEG_FIELDS.forEach((sf) => { segData[s.k][sf.k] = num(row[sf.k]); });
      }
    });
    if (Object.keys(segData).length) entry.segments = segData;
    setSaving(true);
    try {
      await upsertBio(entry);
      setF(blank());
      setSegs({});
      flash(`Замер сохранён — ${fmtDate(entry.date)}`);
    } catch (e) {
      onErr(e.message || "Не удалось сохранить");
      flash("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }
  async function del(id) {
    try { await removeBio(id); }
    catch (e) { onErr(e.message || "Не удалось удалить"); }
    setConfirmId(null);
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
        <div className="ft-mini ft-muted" style={{ marginTop: 8 }}>
          Замер на ту же дату перезапишется.
        </div>
      </div>

      <div className="ft-card">
        <div className="ft-card-h">Анализ по сегментам</div>
        <div className="ft-mini ft-muted" style={{ marginBottom: 10 }}>
          Мышцы и жир по конечностям и туловищу. Необязательно — заполняй, если есть данные.
        </div>
        <div className="ft-seg-table">
          <div className="ft-seg-trow ft-seg-thead ft-mini ft-muted">
            <span></span>
            {SEG_FIELDS.map((sf) => (
              <span key={sf.k} style={{ color: sf.color }}>{sf.label}<br />{sf.unit}</span>
            ))}
          </div>
          {SEGMENTS.map((s) => (
            <div key={s.k} className="ft-seg-trow">
              <span className="ft-mini">{s.label}</span>
              {SEG_FIELDS.map((sf) => (
                <input key={sf.k} className="ft-input ft-mono ft-seg-in" type="number"
                  inputMode="decimal" placeholder="—"
                  value={(segs[s.k] && segs[s.k][sf.k]) ?? ""}
                  onChange={(e) => setSeg(s.k, sf.k, e.target.value)} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <button className="ft-btn ft-save" onClick={commit} disabled={saving}>
        <Check size={16} /> {saving ? "Сохранение…" : "Сохранить замер"}
      </button>
      {toast && <div className="ft-toast"><Check size={15} /> {toast}</div>}

      {sorted.map((b) => (
        <div key={b.id} className="ft-card ft-hist">
          <div className="ft-row">
            <strong className="ft-mono">{fmtDate(b.date)}</strong>
            {confirmId === b.id ? (
              <span className="ft-row" style={{ gap: 4 }}>
                <button className="ft-confirm-del" onClick={() => del(b.id)}>Удалить</button>
                <button className="ft-icon-b" onClick={() => setConfirmId(null)} title="Отмена">
                  <X size={15} />
                </button>
              </span>
            ) : (
              <button className="ft-icon-b" onClick={() => setConfirmId(b.id)} title="Удалить замер">
                <Trash2 size={14} />
              </button>
            )}
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
          {b.segments && Object.keys(b.segments).length > 0 && (
            <div className="ft-seg-table" style={{ marginTop: 10 }}>
              <div className="ft-seg-trow ft-seg-thead ft-mini ft-muted">
                <span>Сегмент</span>
                {SEG_FIELDS.map((sf) => (
                  <span key={sf.k} style={{ color: sf.color }}>{sf.label}<br />{sf.unit}</span>
                ))}
              </div>
              {SEGMENTS.map((s) => b.segments[s.k] && (
                <div key={s.k} className="ft-seg-trow">
                  <span className="ft-mini">{s.label}</span>
                  {SEG_FIELDS.map((sf) => (
                    <span key={sf.k} className="ft-mono ft-mini" style={{ textAlign: "center" }}>
                      {b.segments[s.k][sf.k] ?? "—"}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
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
  const [metric, setMetric] = useState("top");
  const [bioMetric, setBioMetric] = useState("weight");

  useEffect(() => { if (!ex && exNames.length) setEx(exNames[0]); }, [exNames, ex]);

  const exData = useMemo(() => {
    if (!ex) return [];
    return sessions
      .filter((s) => s.exercises.some((e) => e.n === ex))
      .map((s) => {
        const e = s.exercises.find((x) => x.n === ex);
        const bw = bodyweightOn(bio, s.date);
        return {
          date: s.date, label: fmtDate(s.date),
          volume: Math.round(exerciseVolume(e, bw)), top: exerciseTop(e, bw),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [ex, sessions, bio]);

  const volData = useMemo(() =>
    [...sessions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({ label: fmtDate(s.date), v: Math.round(sessionVolume(s, bio)) })),
    [sessions, bio]);

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
              unit={metric === "top" ? "кг" : ""} type="line" />
          </>
        )}
      </div>

      <div className="ft-card">
        <div className="ft-card-h">Объём по тренировкам</div>
        {sessions.length === 0 ? (
          <div className="ft-muted ft-mini">Запиши тренировку, чтобы увидеть график.</div>
        ) : (
          <Chart data={volData} dataKey="v" color={C.accent2} unit="об." type="line" />
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
