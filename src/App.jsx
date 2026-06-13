import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";
import {
  LayoutDashboard, Dumbbell, HeartPulse, TrendingUp,
  Plus, Trash2, Check, X, ChevronDown, ChevronUp, ArrowUp, ArrowDown,
  LogOut, KeyRound, CloudOff, Pencil, Copy, ListPlus, Trophy,
  Timer, Play, Pause, RotateCcw, Settings,
} from "lucide-react";

import {
  C, BUILTIN_TEMPLATES, BIO_METRICS, SEGMENTS, SEG_FIELDS, CSS,
  normSession, uid, today, fmtDate, num,
  BW_EXERCISES, bodyweightOn, exerciseVolume, exerciseTop, sessionVolume, setLoad,
  suggestForm, exerciseMeta, lastExerciseSets, prSessionMap,
  heroLift, weeklyTonnage, fatTrend, shortLift, setScheme, num1000,
  exerciseE1rmBest, detectSessionPRs, suggestProgression, recompTrend,
  exerciseNames, exercisePRList, SETTINGS_DEFAULTS, withSettings, canon,
} from "./data.js";
import { api, auth, ApiError } from "./api.js";

/* ---------------------------- LOGO ---------------------------- */
// вордмарк STR<O>NG·LOG: буква «O» — зелёный знак-болт (инлайн-SVG, масштаб от font-size)
function LogoMark() {
  return (
    <span className="ft-logo-mark">
      STR
      <svg className="ft-logo-o" viewBox="0 0 100 100" aria-hidden="true">
        <rect x="6" y="10" width="88" height="80" rx="40" fill={C.accent} />
        <path d="M58 20 L34 56 L48 56 L42 82 L68 44 L52 44 Z" fill={C.bg} />
      </svg>
      NG<span style={{ color: C.accent }}>·</span>LOG
    </span>
  );
}

/* ---------------------------- PR helpers (фича #2) ---------------------------- */
// заголовок-подсказка для кубка: перечень упражнений с рекордами
function prTitle(prs) {
  if (!prs || !prs.length) return "Личный рекорд";
  const names = [...new Set(prs.map((p) => p.name))];
  return "Личный рекорд: " + names.join(", ");
}
// текст празднования: «Новый рекорд: Жим штанги лёжа — 75 кг · e1RM 91»
function prCelebration(prs) {
  const byName = new Map();
  for (const p of prs) {
    if (!byName.has(p.name)) byName.set(p.name, {});
    byName.get(p.name)[p.kind] = p;
  }
  const parts = [];
  for (const [name, kinds] of byName) {
    const bits = [];
    if (kinds.weight) bits.push(Math.round(kinds.weight.value) + " кг");
    if (kinds.e1rm) bits.push("e1RM " + Math.round(kinds.e1rm.value));
    if (kinds.volume && !bits.length) bits.push("объём " + Math.round(kinds.volume.value));
    parts.push(name + " — " + bits.join(" · "));
  }
  return "Новый рекорд: " + parts.slice(0, 2).join("; ");
}

/* ================================================================== */
export default function App() {
  const [status, setStatus] = useState("checking"); // checking | gate | ready
  const [gateErr, setGateErr] = useState("");
  const [tab, setTab] = useState("home");
  const [sessions, setSessions] = useState([]);
  const [bio, setBio] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [syncErr, setSyncErr] = useState("");
  const [settings, setSettings] = useState(SETTINGS_DEFAULTS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const restRef = useRef(null); // контроллер таймера: { start(sec) }

  async function load() {
    const [rawS, rawB] = await Promise.all([api.getSessions(), api.getBio()]);
    setSessions((Array.isArray(rawS) ? rawS : []).map(normSession));
    setBio(Array.isArray(rawB) ? rawB : []);
    // программы и настройки грузим толерантно: отсутствие эндпоинта/миграции не должно ронять загрузку
    let rawT = [];
    try { rawT = await api.getTemplates(); } catch { rawT = []; }
    setTemplates((Array.isArray(rawT) ? rawT : []).map((t) => ({ ...t, builtin: false })));
    try { setSettings(withSettings(await api.getSettings())); } catch { setSettings(SETTINGS_DEFAULTS); }
  }

  async function saveSettings(next) {
    const merged = withSettings(next);
    setSettings(merged); // оптимистично
    try { await api.saveSettings(merged); setSyncErr(""); }
    catch (e) { setSyncErr(e.message || "Не удалось сохранить настройки"); }
  }
  // авто-старт таймера отдыха из формы тренировки (фича #5)
  function startRest() {
    if (settings.autoStartRest) restRef.current?.start(settings.restSeconds);
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
          <div className="ft-logo"><LogoMark /></div>
          <div className="ft-head-actions">
            <span className={"ft-syncchip" + (syncErr ? " err" : "")}>
              <span className="ft-syncchip-dot" />{syncErr ? "ошибка" : "синк"}
            </span>
            <button className="ft-icon-b ft-gear" onClick={() => setSettingsOpen(true)} title="Настройки">
              <Settings size={16} />
            </button>
            <button className="ft-logout" onClick={logout} title="Выйти">
              <LogOut size={14} /> выход
            </button>
          </div>
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
        {tab === "home" && <Home sessions={sessions} bio={bio} go={setTab} templates={allTemplates} settings={settings} />}
        {tab === "log" && <Log sessions={sessions} bio={bio} addSession={addSession} removeSession={removeSession} onErr={setSyncErr} templates={allTemplates} addTemplate={addTemplate} removeTemplate={removeTemplate} settings={settings} startRest={startRest} />}
        {tab === "body" && <Body bio={bio} upsertBio={upsertBio} removeBio={removeBio} onErr={setSyncErr} />}
        {tab === "progress" && <Progress sessions={sessions} bio={bio} />}
      </main>

      {settingsOpen && (
        <SettingsPanel settings={settings} onSave={saveSettings} onClose={() => setSettingsOpen(false)}
          exercises={exerciseNames(sessions)} />
      )}

      {/* таймер отдыха — на уровне App, чтобы запущенный отсчёт переживал смену вкладок */}
      <RestTimer controllerRef={restRef} notify={settings.restNotify} />
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
        <div className="ft-logo"><LogoMark /></div>
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

/* ---------------------------- SETTINGS PANEL ---------------------------- */
function SettingsPanel({ settings, onSave, onClose, exercises = [] }) {
  const [f, setF] = useState(() => withSettings(settings));
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  function save() { onSave(f); onClose(); }
  // включение уведомлений — явный пользовательский жест: тут и запрашиваем разрешение
  async function toggleNotify(on) {
    if (on && "Notification" in window && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch { /* отказ — оставим флаг, просто не сработает */ }
    }
    set("restNotify", on);
  }
  return (
    <div className="ft-prog-overlay" onClick={onClose}>
      <div className="ft-prog-editor" onClick={(e) => e.stopPropagation()}>
        <div className="ft-row" style={{ marginBottom: 14 }}>
          <strong>Настройки</strong>
          <button className="ft-icon-b" onClick={onClose} title="Закрыть"><X size={16} /></button>
        </div>

        <div className="ft-set-group">
          <label className="ft-set-row">
            <span>Отдых по умолчанию, сек</span>
            <input className="ft-input ft-mono" type="number" min="10" max="600" step="5"
              value={f.restSeconds}
              onChange={(e) => set("restSeconds", Math.min(600, Math.max(10, num(e.target.value) || 90)))} />
          </label>
          <label className="ft-set-row">
            <span>Авто-старт таймера после подхода</span>
            <input type="checkbox" checked={!!f.autoStartRest}
              onChange={(e) => set("autoStartRest", e.target.checked)} />
          </label>
          <label className="ft-set-row">
            <span>Уведомлять, когда отдых окончен</span>
            <input type="checkbox" checked={!!f.restNotify}
              onChange={(e) => toggleNotify(e.target.checked)} />
          </label>
          <label className="ft-set-row">
            <span>Шаг прогрессии веса</span>
            <div className="ft-select-wrap">
              <select className="ft-select" value={f.progressionStep == null ? "auto" : String(f.progressionStep)}
                onChange={(e) => set("progressionStep", e.target.value === "auto" ? null : Number(e.target.value))}>
                <option value="auto">Авто (2.5 / 5 кг)</option>
                <option value="1.25">1.25 кг</option>
                <option value="2.5">2.5 кг</option>
                <option value="5">5 кг</option>
              </select>
              <ChevronDown size={14} className="ft-select-ic" />
            </div>
          </label>
          <label className="ft-set-row">
            <span>Упражнение на «Обзоре»</span>
            <div className="ft-select-wrap">
              <select className="ft-select" value={f.homeExercise == null ? "auto" : f.homeExercise}
                onChange={(e) => set("homeExercise", e.target.value === "auto" ? null : e.target.value)}>
                <option value="auto">Авто (самое частое)</option>
                {exercises.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown size={14} className="ft-select-ic" />
            </div>
          </label>
        </div>

        <div className="ft-muted ft-mini" style={{ marginTop: 10 }}>
          Пуш-напоминания — в следующем обновлении.
        </div>

        <button className="ft-btn ft-save" style={{ marginTop: 14 }} onClick={save}>
          <Check size={16} /> Сохранить
        </button>
      </div>
    </div>
  );
}

/* ---------------------------- OVERVIEW ---------------------------- */
function Home({ sessions, bio, go, templates, settings }) {
  const sorted = useMemo(() => [...sessions].sort((a, b) => b.date.localeCompare(a.date)), [sessions]);
  const prMap = useMemo(() => prSessionMap(sessions, bio), [sessions, bio]);
  const last = sorted[0];
  const lb = useMemo(() => [...bio].sort((a, b) => b.date.localeCompare(a.date))[0], [bio]);

  const hero = useMemo(() => heroLift(sessions, bio, settings?.homeExercise), [sessions, bio, settings]);
  const tonnage = useMemo(() => weeklyTonnage(sessions, bio), [sessions, bio]);
  const fatInfo = useMemo(() => fatTrend(bio), [bio]);
  const recomp = useMemo(() => recompTrend(bio, 90), [bio]);
  // цвет линии жира по семантике дашборда: вниз = хорошо (зелёное), вверх = плохо (красное)
  const fatColor = !recomp ? C.pink
    : recomp.fatDir < 0 ? C.accent : recomp.fatDir > 0 ? C.danger : C.muted;

  return (
    <div>
      {/* HERO — ключевой жим, макс. рабочий вес */}
      {hero ? (
        <div className="ft-card ft-hero">
          <div className="ft-hero-top">
            <span className="ft-hero-label">{shortLift(hero.name)} · макс</span>
            {hero.delta != null && hero.delta !== 0 && (
              <span className={"ft-badge" + (hero.delta < 0 ? " down" : "")}>
                {hero.delta < 0 ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
                {Math.abs(hero.delta).toFixed(1)} / 8 нед
              </span>
            )}
          </div>
          <div className="ft-hero-v">{hero.value}<span className="ft-hero-unit">кг</span></div>
          {hero.series.length >= 2 && (
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={hero.series} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="ft-hero-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke={C.muted} fontSize={11} tickLine={false}
                  axisLine={false} interval="preserveStartEnd" />
                <Tooltip
                  contentStyle={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, color: C.txt, fontSize: 12 }}
                  labelStyle={{ color: C.muted }}
                  formatter={(v) => [`${v} кг`, ""]} />
                <Area dataKey="v" stroke={C.accent} strokeWidth={2.5} fill="url(#ft-hero-fill)"
                  dot={{ r: 2.5, fill: C.accent }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      ) : (
        <div className="ft-card">
          <div className="ft-card-h">Обзор силовых</div>
          <button className="ft-btn" onClick={() => go("log")}>
            <Plus size={16} /> Записать первую тренировку
          </button>
        </div>
      )}

      {/* две карточки: тоннаж/нед и жир */}
      <div className="ft-grid">
        <div className="ft-card ft-stat2">
          <div className="ft-muted ft-mini">Тоннаж / нед</div>
          <div className="ft-mono ft-stat2-v">
            {tonnage ? num1000(tonnage.cur) : "—"}<span className="ft-unit">кг</span>
          </div>
          {tonnage && tonnage.pct != null && (
            <div className={"ft-stat2-sub" + (tonnage.pct < 0 ? " down" : "")}>
              {tonnage.pct < 0 ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
              {Math.abs(tonnage.pct)}% к прошлой
            </div>
          )}
        </div>
        <div className="ft-card ft-stat2">
          <div className="ft-muted ft-mini">Жир (биоимпеданс)</div>
          <div className="ft-mono ft-stat2-v">
            {fatInfo ? fatInfo.value : "—"}<span className="ft-unit">%</span>
          </div>
          {fatInfo && fatInfo.delta != null && fatInfo.delta !== 0 && (
            <div className={"ft-stat2-sub" + (fatInfo.delta < 0 ? " down" : "")}>
              {fatInfo.delta < 0 ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
              {Math.abs(fatInfo.delta).toFixed(1)} за месяц
            </div>
          )}
        </div>
      </div>

      {/* РЕКОМПОЗИЦИЯ — тренд жир/мышцы за 90 дней (фича #4) */}
      {recomp && (
        <div className="ft-card">
          <div className="ft-section-h ft-row">
            <span>Рекомпозиция · 90 дней</span>
            <span className={"ft-verdict ft-verdict-" + recomp.tone}>{recomp.verdict}</span>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={recomp.series} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="label" stroke={C.muted} fontSize={11} tickLine={false}
                axisLine={false} interval="preserveStartEnd" />
              <YAxis yAxisId="fat" stroke={fatColor} fontSize={10} tickLine={false} axisLine={false}
                width={36} tickMargin={2} domain={["auto", "auto"]} />
              <YAxis yAxisId="mus" orientation="right" stroke={C.blue} fontSize={10} tickLine={false}
                axisLine={false} width={36} tickMargin={2} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, color: C.txt, fontSize: 12 }}
                labelStyle={{ color: C.muted }}
                formatter={(v, n) => [n === "Жир" ? `${v} %` : `${v} кг`, n]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="fat" name="Жир" dataKey="fat" stroke={fatColor} strokeWidth={2.5}
                dot={{ r: 2.5, fill: fatColor }} connectNulls />
              <Line yAxisId="mus" name="Мышцы" dataKey="muscle" stroke={C.blue} strokeWidth={2.5}
                dot={{ r: 2.5, fill: C.blue }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ПОСЛЕДНИЕ */}
      {last && (
        <div className="ft-card">
          <div className="ft-section-h ft-row">
            <span>Последние</span>
            {prMap.get(last.id) && (
              <span className="ft-pr" title={prTitle(prMap.get(last.id))}>
                <Trophy size={13} />
              </span>
            )}
          </div>
          {(() => {
            const bw = bodyweightOn(bio, last.date);
            return last.exercises.slice(0, 4).map((e, i) => {
              const top = exerciseTop(e, bw);
              return (
                <div key={i} className="ft-recent-row">
                  <span className="ft-trunc">{e.n} <span className="ft-muted">· {setScheme(e)}</span></span>
                  <span className="ft-mono">{top ? top + " кг" : "св.вес"}</span>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Состав тела */}
      <div className="ft-card">
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

/* ---------------------------- LOG ---------------------------- */
function Log({ sessions, bio, addSession, removeSession, onErr, templates, addTemplate, removeTemplate, settings, startRest }) {
  const [tplId, setTplId] = useState(templates[0].id);
  const [date, setDate] = useState(today());
  const [form, setForm] = useState(() => suggestForm(templates[0], sessions));
  const [openHist, setOpenHist] = useState(false);
  const [toast, setToast] = useState("");
  const [toastPr, setToastPr] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [confirmDelEx, setConfirmDelEx] = useState(null); // индекс упражнения, ожидающего подтверждения удаления
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorNew, setEditorNew] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false); // выбор упражнения из базы для добавления в форму
  // упражнение -> снимок подходов ДО прибавки «+вес» (для отмены применения)
  const [appliedBump, setAppliedBump] = useState(() => new Map());
  // упражнение -> снимок подходов ДО прогрессии (фича #3, для отмены)
  const [appliedProg, setAppliedProg] = useState(() => new Map());
  // раскрытые упражнения (по имени); по умолчанию все свёрнуты — открываются по клику
  const [openEx, setOpenEx] = useState(() => new Set());
  function toggleEx(name) {
    setOpenEx((prev) => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s; });
  }

  const prMap = useMemo(() => prSessionMap(sessions, bio), [sessions, bio]);
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
  // каталог упражнений для добавления в форму: из всех программ + из истории, канонизировано и без дублей
  const exerciseCatalog = useMemo(() => {
    const set = new Set();
    templates.forEach((t) => (t.ex || []).forEach((e) => { if (e.n) set.add(canon(e.n)); }));
    exerciseNames(sessions).forEach((n) => set.add(n));
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [templates, sessions]);

  const toastTimer = useRef(null);
  function flash(msg, pr = false) {
    setToast(msg); setToastPr(pr);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => { setToast(""); setToastPr(false); }, pr ? 4200 : 2400);
  }
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // если выбранная (кастомная) программа была удалена — откатываемся на первую
  useEffect(() => {
    if (!editingId && !templates.some((t) => t.id === tplId)) {
      const tpl = templates[0];
      setTplId(tpl.id);
      setForm(suggestForm(tpl, sessions));
      setOpenEx(new Set());
    }
  }, [templates]); // eslint-disable-line react-hooks/exhaustive-deps

  // мета прогрессии по упражнениям текущей формы (имена + история).
  // ключ через JSON.stringify — безопасно для имён с любыми символами
  const exNamesKey = JSON.stringify(form.map((e) => e.n));
  const exMeta = useMemo(() => {
    const m = {};
    JSON.parse(exNamesKey).forEach((n) => { if (n) m[n] = exerciseMeta(sessions, n); });
    return m;
  }, [exNamesKey, sessions]);

  // предложение прогрессии по каждому упражнению формы (фича #3)
  const progMap = useMemo(() => form.map((e) => {
    const meta = exMeta[e.n];
    if (!meta || !meta.lastText) return null;
    const hint = e.sets.find((s) => s.hint)?.hint || "";
    const step = settings?.progressionStep ?? meta.step;
    return suggestProgression(e.n, lastExerciseSets(sessions, e.n), hint, step);
  }), [form, exMeta, sessions, settings]);

  function bumpWeights(ei, step) {
    const name = form[ei]?.n;
    if (name && appliedBump.has(name)) return; // уже применяли — игнорируем
    const snap = structuredClone(form[ei].sets); // запоминаем для отмены
    setForm((f) => {
      const c = structuredClone(f);
      c[ei].sets = c[ei].sets.map((s) => ({
        ...s,
        weight: (s.weight === "" || s.weight == null) ? s.weight : Number(s.weight) + step,
      }));
      return c;
    });
    if (name) setAppliedBump((prev) => new Map(prev).set(name, snap));
  }
  // отменить прибавку «+вес» — вернуть подходы к снимку до применения
  function undoBump(ei, name) {
    const snap = appliedBump.get(name);
    setForm((f) => { const c = structuredClone(f); if (snap) c[ei].sets = structuredClone(snap); return c; });
    setAppliedBump((prev) => { const m = new Map(prev); m.delete(name); return m; });
  }

  // применить предложение прогрессии: проставить вес/целевые повторы во все подходы (фича #3)
  function applyProgression(ei, prog) {
    const name = form[ei]?.n;
    if (!prog || (name && appliedProg.has(name))) return;
    const snap = structuredClone(form[ei].sets); // запоминаем для отмены
    setForm((f) => {
      const c = structuredClone(f);
      c[ei].sets = c[ei].sets.map((s) => ({
        ...s,
        weight: prog.weight != null ? prog.weight : s.weight,
        reps: prog.reps != null ? prog.reps : s.reps,
      }));
      return c;
    });
    if (name) setAppliedProg((prev) => new Map(prev).set(name, snap));
  }
  // отменить прогрессию — вернуть подходы к снимку до применения
  function undoProgression(ei, name) {
    const snap = appliedProg.get(name);
    setForm((f) => { const c = structuredClone(f); if (snap) c[ei].sets = structuredClone(snap); return c; });
    setAppliedProg((prev) => { const m = new Map(prev); m.delete(name); return m; });
  }

  function pick(id) {
    const tpl = templates.find((t) => t.id === id) || templates[0];
    setTplId(tpl.id);
    setForm(suggestForm(tpl, sessions));
    setEditingId(null);
    setAppliedBump(new Map()); setAppliedProg(new Map()); setOpenEx(new Set()); setConfirmDelEx(null);
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
    setAppliedBump(new Map()); setAppliedProg(new Map()); setConfirmDelEx(null);
    setOpenEx(new Set(s.exercises.map((e) => e.n))); // при редактировании показываем подходы сразу
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelEdit() {
    setEditingId(null);
    const tpl = templates.find((t) => t.id === tplId) || templates[0];
    setTplId(tpl.id);
    setForm(suggestForm(tpl, sessions));
    setAppliedBump(new Map()); setAppliedProg(new Map()); setOpenEx(new Set()); setConfirmDelEx(null);
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
    startRest?.(); // авто-старт таймера отдыха (если включён в настройках) — фича #5
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
    setConfirmDelEx(null);
  }
  // добавить упражнение из базы (или новое) в текущую форму; веса/повторы — из последней тренировки, если была
  function addExerciseToForm(name) {
    const n = canon((name || "").trim());
    setPickerOpen(false);
    if (!n) return;
    setOpenEx((prev) => new Set(prev).add(n)); // раскрываем сразу
    if (form.some((e) => canon(e.n) === n)) { flash("Упражнение уже в тренировке"); return; }
    const hist = lastExerciseSets(sessions, n);
    const sets = (hist && hist.length)
      ? hist.map((s) => ({ weight: s.weight ?? "", reps: s.reps ?? "", hint: "" }))
      : [{ weight: "", reps: "", hint: "" }];
    setForm((f) => [...f, { n, sets }]);
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
      // празднование PR: сравниваем с историей без самой сессии (ресейв не зажигает заново)
      const prs = detectSessionPRs(sessions, normSession(session), bio);
      setForm(suggestForm(tpl, sessions));
      setEditingId(null);
      setAppliedBump(new Map()); setAppliedProg(new Map()); setOpenEx(new Set()); setConfirmDelEx(null);
      setOpenHist(true);
      if (prs.length) flash(prCelebration(prs), true);
      else flash(`${tpl.name} ${wasEditing ? "обновлена" : "сохранена"} — ${fmtDate(date)}`);
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
                    {prMap.get(s.id) && (
                      <span className="ft-pr" style={{ marginLeft: 6 }}
                        title={prTitle(prMap.get(s.id))}>
                        <Trophy size={13} />
                      </span>
                    )}
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

      <div className="ft-row ft-datebar">
        <label className="ft-mini ft-muted">Дата</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ft-input ft-mono" />
      </div>

      {form.map((e, ei) => {
        const open = openEx.has(e.n);
        const preview = e.sets
          .map((x) => (x.weight ? x.weight + "×" : "") + (x.reps ?? ""))
          .filter(Boolean).join(" / ");
        return (
        <div key={ei} className={"ft-card ft-ex" + (open ? " open" : "")}>
          <div className="ft-ex-h">
            <span className="ft-ex-num ft-mono">{ei + 1}</span>
            <button className="ft-ex-toggle" onClick={() => toggleEx(e.n)} aria-expanded={open}
              title={open ? "Свернуть подходы" : "Открыть подходы"}>
              <span className="ft-ex-name">{e.n}</span>
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {confirmDelEx === ei ? (
              <span className="ft-row ft-ex-del" style={{ gap: 4, flex: "none" }}>
                <button className="ft-confirm-del" onClick={() => delExercise(ei)}>Убрать</button>
                <button className="ft-icon-b" onClick={() => setConfirmDelEx(null)} title="Отмена">
                  <X size={15} />
                </button>
              </span>
            ) : (
              <button className="ft-icon-b ft-ex-del" onClick={() => setConfirmDelEx(ei)}
                title="Убрать упражнение (не делал)">
                <Trash2 size={15} />
              </button>
            )}
          </div>

          {!open && (
            <button className="ft-ex-preview ft-mono" onClick={() => toggleEx(e.n)}
              title="Открыть подходы">
              {preview || "нажми, чтобы заполнить подходы"}
            </button>
          )}

          {open && <>
          {exMeta[e.n]?.lastText && (
            appliedBump.has(e.n) ? (
              <div className="ft-progress-chip done">
                <Check size={12} /> применено
                <button className="ft-chip-undo" onClick={() => undoBump(ei, e.n)} title="Отменить прибавку">
                  <X size={11} /> отменить
                </button>
              </div>
            ) : (
              <button className="ft-progress-chip"
                onClick={() => bumpWeights(ei, exMeta[e.n].step)}
                title={`Прибавить ${exMeta[e.n].step} кг ко всем подходам`}>
                <ArrowUp size={12} /> +{exMeta[e.n].step} кг
                <span className="ft-muted">· в прошлый раз {exMeta[e.n].lastText}</span>
              </button>
            )
          )}
          {progMap[ei] && progMap[ei].note && (
            <div className="ft-prog-sugg">
              <span className="ft-prog-sugg-note">{progMap[ei].note}</span>
              {appliedProg.has(e.n) ? (
                <span className="ft-prog-sugg-done">
                  <Check size={12} /> применено
                  <button className="ft-chip-undo" onClick={() => undoProgression(ei, e.n)} title="Отменить">
                    <X size={11} /> отменить
                  </button>
                </span>
              ) : (
                <button className="ft-prog-sugg-b" onClick={() => applyProgression(ei, progMap[ei])}>
                  применить
                </button>
              )}
            </div>
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
          </>}
        </div>
        );
      })}

      <button className="ft-add" onClick={() => setPickerOpen(true)}>
        <ListPlus size={14} /> добавить упражнение из базы
      </button>

      {pickerOpen && (
        <ExercisePicker
          catalog={exerciseCatalog}
          onPick={addExerciseToForm}
          onClose={() => setPickerOpen(false)}
        />
      )}

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
        <div className={"ft-toast" + (toastPr ? " pr" : "")}>
          {toastPr ? <Trophy size={15} /> : <Check size={15} />} {toast}
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

/* ---------------------------- EXERCISE PICKER (фича #5) ---------------------------- */
// выбор упражнения из базы (программы + история) для добавления в текущую тренировку;
// если введённого названия нет в каталоге — можно добавить его как новое
function ExercisePicker({ catalog, onPick, onClose }) {
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const filtered = ql ? catalog.filter((n) => n.toLowerCase().includes(ql)) : catalog;
  const exact = catalog.some((n) => n.toLowerCase() === ql);
  return (
    <div className="ft-prog-overlay" onClick={onClose}>
      <div className="ft-prog-editor" onClick={(e) => e.stopPropagation()}>
        <div className="ft-row ft-prog-head">
          <strong>Добавить упражнение</strong>
          <button className="ft-icon-b" onClick={onClose} title="Закрыть"><X size={18} /></button>
        </div>
        <input className="ft-input" autoFocus placeholder="Поиск или новое название…"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="ft-pick-list">
          {q.trim() && !exact && (
            <button className="ft-pick-item ft-pick-new" onClick={() => onPick(q.trim())}>
              <Plus size={15} /> Добавить «{q.trim()}»
            </button>
          )}
          {filtered.map((n) => (
            <button key={n} className="ft-pick-item" onClick={() => onPick(n)}>{n}</button>
          ))}
          {!filtered.length && !q.trim() && (
            <div className="ft-mini ft-muted" style={{ padding: "8px 2px" }}>
              Пока нет известных упражнений — введи название вручную.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- REST TIMER (фичи #1) ---------------------------- */
const REST_PRESETS = [60, 90, 120, 180];
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// короткий бип через WebAudio (без ассетов)
function restBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.start(t); o.stop(t + 0.5);
    o.onended = () => ctx.close();
  } catch { /* звук необязателен */ }
}

// уведомление, если приложение свёрнуто/вкладка скрыта (Web Notifications, без сервера).
// Включается тумблером в настройках (разрешение запрашивается там же по явному жесту).
function notifyRestDone(enabled) {
  if (!enabled) return;
  try {
    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
      new Notification("Отдых окончен", { body: "Пора к следующему подходу", tag: "ft-rest" });
    }
  } catch { /* уведомление необязательно */ }
}

function RestTimer({ controllerRef, notify }) {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false); // визуальная вспышка по нулю
  const tick = useRef(null);

  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(tick.current);
  }, [running]);

  // срабатывание ровно при переходе в 0 на работающем таймере;
  // ручной «Сброс» гасит running одновременно с remaining → сигнала не будет
  useEffect(() => {
    if (running && remaining === 0) {
      setRunning(false);
      setDone(true);          // вспышка — всегда (главный сигнал на iOS)
      restBeep();             // звук
      navigator.vibrate?.([200, 100, 200]); // вибро — где поддерживается
      notifyRestDone(notify); // уведомление, если в фоне и включено в настройках
    }
  }, [remaining, running, notify]);

  function start(sec) {
    setDone(false);
    setRemaining(sec); setRunning(true); setOpen(true);
  }
  function toggle() { if (remaining > 0) setRunning((v) => !v); }
  function reset() { setRunning(false); setRemaining(0); setDone(false); }
  function hide() { reset(); setOpen(false); }

  // контроллер для авто-старта из формы тренировки (фича #5)
  useEffect(() => {
    if (controllerRef) controllerRef.current = { start };
    return () => { if (controllerRef) controllerRef.current = null; };
  }, [controllerRef]);

  const expanded = open || running || remaining > 0 || done;

  return (
    <div className={"ft-rest-timer" + (expanded ? " open" : "") + (done ? " done" : "")}>
      {expanded ? (
        <>
          <span className="ft-rest-time ft-mono">{done ? "Отдых!" : fmtClock(remaining)}</span>
          <div className="ft-rest-presets">
            {REST_PRESETS.map((p) => (
              <button key={p} className="ft-rest-preset" onClick={() => start(p)}>
                {p % 60 === 0 && p >= 120 ? p / 60 + "м" : p + "с"}
              </button>
            ))}
          </div>
          <button className="ft-icon-b ft-rest-ctl" onClick={toggle} disabled={remaining === 0}
            title={running ? "Пауза" : "Продолжить"}>
            {running ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button className="ft-icon-b ft-rest-ctl" onClick={reset} title="Сброс">
            <RotateCcw size={16} />
          </button>
          <button className="ft-icon-b ft-rest-ctl" onClick={hide} title="Скрыть">
            <X size={16} />
          </button>
        </>
      ) : (
        <button className="ft-rest-fab" onClick={() => setOpen(true)} title="Таймер отдыха">
          <Timer size={20} />
        </button>
      )}
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
// периоды отображения временных графиков (дни; 0 = весь период)
const PROGRESS_PERIODS = [
  { k: 30, label: "30 дней" },
  { k: 90, label: "90 дней" },
  { k: 365, label: "365 дней" },
  { k: 0, label: "Весь период" },
];

function Progress({ sessions, bio }) {
  const exNames = useMemo(() => {
    const set = new Set();
    sessions.forEach((s) => s.exercises.forEach((e) => set.add(e.n)));
    return [...set].sort();
  }, [sessions]);

  const [ex, setEx] = useState("");
  const [metric, setMetric] = useState("top");
  const [bioMetric, setBioMetric] = useState("weight");
  const [period, setPeriod] = useState(0); // дни; 0 = весь период
  const prList = useMemo(() => exercisePRList(sessions), [sessions]);

  useEffect(() => { if (!ex && exNames.length) setEx(exNames[0]); }, [exNames, ex]);

  // нижняя граница дат для графиков: today() − period дней; null = без ограничения.
  // даты в формате ISO «YYYY-MM-DD» сравниваются лексикографически, поэтому строкового cutoff достаточно
  const periodCutoff = useMemo(() => {
    if (!period) return null;
    const d = new Date();
    d.setDate(d.getDate() - period);
    return d.toISOString().slice(0, 10);
  }, [period]);
  const inPeriod = (date) => !periodCutoff || date >= periodCutoff;

  // --- сегменты тела: сравнение двух замеров (радар) ---
  const segBio = useMemo(
    () => [...bio]
      .filter((b) => b.segments && Object.keys(b.segments).length)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [bio]
  );
  const [segField, setSegField] = useState("muscleKg");
  const [segA, setSegA] = useState("");
  const [segB, setSegB] = useState("");
  useEffect(() => {
    if (!segBio.length) return;
    const dates = segBio.map((b) => b.date);
    setSegA((cur) => (cur && dates.includes(cur)) ? cur : dates[0]);
    setSegB((cur) => (cur && dates.includes(cur)) ? cur : (dates[1] || ""));
  }, [segBio]);

  const radarData = useMemo(() => {
    const A = segBio.find((b) => b.date === segA);
    const B = segBio.find((b) => b.date === segB);
    return SEGMENTS.map((s) => ({
      seg: s.label,
      A: A?.segments?.[s.k]?.[segField] ?? null,
      B: B?.segments?.[s.k]?.[segField] ?? null,
    }));
  }, [segBio, segA, segB, segField]);
  const segFieldDef = SEG_FIELDS.find((f) => f.k === segField);

  const exData = useMemo(() => {
    if (!ex) return [];
    return sessions
      .filter((s) => inPeriod(s.date) && s.exercises.some((e) => e.n === ex))
      .map((s) => {
        const e = s.exercises.find((x) => x.n === ex);
        const bw = bodyweightOn(bio, s.date);
        // подходы для тултипа: эфф. нагрузка × повторы (строки сходятся с объёмом)
        const setRows = e.sets
          .map((st) => {
            const load = setLoad(st, e.n, bw);
            return { w: load == null ? null : Math.round(load), reps: num(st.reps) };
          })
          .filter((r) => r.w != null || r.reps != null);
        const best = exerciseE1rmBest(e, bw);
        return {
          date: s.date, label: fmtDate(s.date), setRows,
          volume: Math.round(exerciseVolume(e, bw)), top: exerciseTop(e, bw),
          e1rm: Math.round(best.value), e1rmSet: best.w ? { w: Math.round(best.w), reps: best.reps } : null,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [ex, sessions, bio, periodCutoff]);

  // для e1RM строим только точки с валидным значением (BW/нечисловые повторы пропускаются)
  const e1rmData = useMemo(() => exData.filter((p) => p.e1rm > 0), [exData]);

  const volData = useMemo(() =>
    [...sessions]
      .filter((s) => inPeriod(s.date))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({ label: fmtDate(s.date), v: Math.round(sessionVolume(s, bio)) })),
    [sessions, bio, periodCutoff]);

  const bioData = useMemo(() =>
    [...bio].filter((b) => b[bioMetric] != null && inPeriod(b.date))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((b) => ({ label: fmtDate(b.date), v: b[bioMetric] })),
    [bio, bioMetric, periodCutoff]);

  const bm = BIO_METRICS.find((m) => m.k === bioMetric);

  return (
    <div>
      {/* период отображения для всех временных графиков ниже (выбор по упражнению, объём, состав тела) */}
      <div className="ft-card ft-period-card">
        <span className="ft-mini ft-muted">Период графиков</span>
        <div className="ft-pills" style={{ flexWrap: "wrap" }}>
          {PROGRESS_PERIODS.map((p) => (
            <button key={p.k} className={"ft-pill" + (period === p.k ? " on" : "")}
              onClick={() => setPeriod(p.k)}>{p.label}</button>
          ))}
        </div>
      </div>

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
                <button className={"ft-pill" + (metric === "e1rm" ? " on" : "")} onClick={() => setMetric("e1rm")}>e1RM</button>
              </div>
            </div>
            {metric === "e1rm" && e1rmData.length === 0 ? (
              <div className="ft-muted ft-mini">Нет данных для оценки 1ПМ (нужен рабочий вес и числовые повторы).</div>
            ) : (
              <Chart data={metric === "e1rm" ? e1rmData : exData} dataKey={metric} color={C.accent}
                unit={metric === "top" || metric === "e1rm" ? "кг" : ""} type="line"
                tooltipContent={metric === "volume" ? SetBreakdownTip : metric === "e1rm" ? E1rmTip : undefined} />
            )}
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
        <div className="ft-card-h">Сегменты тела — сравнение</div>
        {segBio.length === 0 ? (
          <div className="ft-muted ft-mini">
            Добавь замер с посегментным анализом на вкладке «Тело».
          </div>
        ) : (
          <>
            <div className="ft-pills" style={{ marginBottom: 10, flexWrap: "wrap" }}>
              {SEG_FIELDS.map((f) => (
                <button key={f.k} className={"ft-pill" + (segField === f.k ? " on" : "")}
                  onClick={() => setSegField(f.k)}>{f.label} {f.unit}</button>
              ))}
            </div>
            <div className="ft-row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <div className="ft-select-wrap">
                <select className="ft-select" value={segA} onChange={(e) => setSegA(e.target.value)}>
                  {segBio.map((b) => <option key={b.date} value={b.date}>{fmtDate(b.date)}</option>)}
                </select>
                <ChevronDown size={14} className="ft-select-ic" />
              </div>
              <span className="ft-muted ft-mini">сравнить с</span>
              <div className="ft-select-wrap">
                <select className="ft-select" value={segB} onChange={(e) => setSegB(e.target.value)}>
                  <option value="">— нет</option>
                  {segBio.map((b) => <option key={b.date} value={b.date}>{fmtDate(b.date)}</option>)}
                </select>
                <ChevronDown size={14} className="ft-select-ic" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke={C.line} />
                <PolarAngleAxis dataKey="seg" tick={{ fill: C.muted, fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: C.muted, fontSize: 10 }} stroke={C.line} angle={90} />
                <Radar name={segA ? fmtDate(segA) : "A"} dataKey="A"
                  stroke={C.accent} fill={C.accent} fillOpacity={0.35} />
                {segB && (
                  <Radar name={fmtDate(segB)} dataKey="B"
                    stroke={C.blue} fill={C.blue} fillOpacity={0.15} />
                )}
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, color: C.txt, fontSize: 12 }}
                  labelStyle={{ color: C.muted }}
                  formatter={(v) => [`${v}${segFieldDef?.unit ? " " + segFieldDef.unit : ""}`, ""]} />
              </RadarChart>
            </ResponsiveContainer>
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

      {/* ЛИЧНЫЕ РЕКОРДЫ — макс. реальный рабочий вес в подходе по упражнению */}
      <div className="ft-section-h" style={{ marginTop: 18 }}>Личные рекорды</div>
      {prList.length === 0 ? (
        <div className="ft-muted ft-mini" style={{ padding: "0 2px" }}>
          Запиши тренировки с рабочим весом — здесь появятся рекорды по упражнениям.
        </div>
      ) : (
        <div className="ft-pr-list">
          {prList.map((p) => (
            <div key={p.name} className="ft-card ft-pr-card">
              <div className="ft-pr-name">{p.name}</div>
              <div className="ft-pr-val ft-mono">
                {+p.weight.toFixed(1)} кг
                {p.reps != null && <span className="ft-pr-reps"> × {p.reps}</span>}
              </div>
              <div className="ft-pr-date ft-mini ft-muted">рекорд: {fmtDate(p.date)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// тултип графика «Прогресс по упражнению» в режиме «Объём»:
// дата, разбивка по подходам «вес × повторы» и итоговый объём
function SetBreakdownTip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  const rows = p.setRows || [];
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 10px", fontSize: 12 }}>
      <div style={{ color: C.muted, marginBottom: 4 }}>{p.label}</div>
      {rows.map((r, i) => (
        <div key={i} className="ft-mono" style={{ color: C.txt }}>
          {r.w != null ? r.w : "св.вес"} × {r.reps != null ? r.reps : "—"}
        </div>
      ))}
      <div className="ft-mono" style={{ color: C.accent, fontWeight: 700, marginTop: 4 }}>
        {p.volume} кг
      </div>
    </div>
  );
}

// тултип режима «e1RM»: дата, лучший подход и оценка 1ПМ
function E1rmTip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 10px", fontSize: 12 }}>
      <div style={{ color: C.muted, marginBottom: 4 }}>{p.label}</div>
      {p.e1rmSet && (
        <div className="ft-mono" style={{ color: C.txt }}>{p.e1rmSet.w} × {p.e1rmSet.reps}</div>
      )}
      <div className="ft-mono" style={{ color: C.accent, fontWeight: 700, marginTop: 4 }}>e1RM {p.e1rm} кг</div>
    </div>
  );
}

function Chart({ data, dataKey, color, unit, type, tooltipContent }) {
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
          <Tooltip {...tip} content={tooltipContent} cursor={{ fill: "rgba(200,242,63,0.06)" }} />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={C.line} vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} domain={["auto", "auto"]} />
          <Tooltip {...tip} content={tooltipContent} />
          <Line dataKey={dataKey} stroke={color} strokeWidth={2.5}
            dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
