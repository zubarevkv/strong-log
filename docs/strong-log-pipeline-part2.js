export const meta = {
  name: 'strong-log-upgrade-part2',
  description: 'STRØNG·LOG: доделать фиксы #1 (чекбокс упражнения + персист формы между вкладками) и #3 (минус-инпут для BW). План→ревью и билд→ревью, каждый луп до APPROVE. #4 и #2 уже сделаны и закоммичены — не трогать.',
  phases: [
    { title: 'Plan', detail: 'планировщики f1 и f3 параллельно, цикл plan→review до APPROVE' },
    { title: 'Build', detail: 'разработчики последовательно (f1→f3, общий set-row), цикл build→review до APPROVE' },
    { title: 'Verify', detail: 'npm run build + php -l + интеграционное ревью + регрессия #4/#2' },
  ],
}

/* ---------- общий контекст кодовой базы ---------- */
const CTX = `
Проект STRØNG·LOG — личный трекер силовых. Стек: React 18 (Vite, JSX) + PHP8/MySQL. Один пользователь. UI и комментарии — по-русски.
Рабочая директория — реальный репозиторий, ветка claude/workout-app-fixes-o5st5x. НЕ переключать ветку, НЕ коммитить и НЕ пушить (коммит сделает оркестратор в конце).
ВАЖНО: фиксы #4 (апгрейд программы + канон) и #2 (тоннаж гантелей ×2) УЖЕ СДЕЛАНЫ и закоммичены (коммит e0517ec). Их НЕ переделывать и НЕ ломать. Сейчас доделываем ТОЛЬКО #1 и #3.
Уже внедрено и должно остаться нетронутым:
- src/data.js: DUMBBELL_PAIR (Set парных гантельных), loadUnits(), exerciseVolume умножает нагрузку на units (×2 для парных). setLoad/exerciseTop/exerciseE1rmBest/exercisePRList — на весе одной гантели, НЕ трогать. BUILTIN_TEMPLATES переписаны под новую программу (новые упражнения). Новые синонимы CANON.
- api/lib/Exercises.php: новые синонимы CANON синхронно.
Ключевые файлы для #1/#3:
- src/App.jsx (~1820 строк). Компонент Log (строки ~547-932) — форма логирования; стейт form = массив упражнений { n, sets:[{weight,reps,hint,done}] }. App (~строка 216) рендерит вкладки условно: {tab === 'log' && <Log .../>} — Log РАЗМОНТИРУЕТСЯ при смене вкладки и теряет стейт form (корень жалобы #1). RestTimer вынесен на уровень App (переживает смену вкладок). Существующая кнопка галочки подхода — .ft-set-check + toggleDone(ei,si), которая при включении одного подхода стартует таймер отдыха (startRest). Grid набора .ft-set-log = 5 колонок: # / вес / повт / галочка / удалить.
- src/data.js: BW_EXERCISES = Set(["Подтягивания","Брусья"]); большой export const CSS с стилями (сюда добавлять CSS-классы).
Поле веса подхода сейчас: <input type="number" inputMode="decimal"> (App.jsx ~875-878); reps: inputMode="numeric".
Команды проверки: npm run build (Vite, node_modules есть). php -l api/lib/Exercises.php.
`

/* ---------- спеки (идентичны утверждённым в handoff) ---------- */
const F1_SPEC = `
ЗАДАЧА 1 — чекбокс на уровне упражнения + сохранение прогресса тренировки между вкладками (src/App.jsx; при необходимости CSS в src/data.js).
Проблема: Log размонтируется при смене вкладки (App.jsx ~216) — введённые веса/повторы и отметки «сделано» пропадают. Чекбокса на уровне упражнения нет — только на подходах (toggleDone, .ft-set-check).
Требования:
1) У КАЖДОГО упражнения в форме — свой чекбокс в шапке .ft-ex-h (рядом с .ft-ex-num / названием). Клик отмечает ВСЕ подходы этого упражнения done=true; повторный клик снимает у всех.
2) Когда вручную отмечены ВСЕ подходы упражнения — чекбокс упражнения автоматически «сделано». СОСТОЯНИЕ ВЫЧИСЛЯЕМОЕ: allDone = e.sets.length>0 && e.sets.every(s=>s.done). Единый источник истины — done у подходов; ОТДЕЛЬНОЕ поле done у упражнения НЕ вводить.
3) Прогресс незавершённой тренировки (tplId, date, form с введёнными weight/reps и флагами done, editingId) ПЕРЕЖИВАЕТ смену вкладок и перезагрузку — localStorage, ключ "strong-log:draft". Восстанавливать при монтировании Log ВМЕСТО чистого suggestForm(). ОЧИЩАТЬ черновик после успешного commit().
Реализация (в Log, src/App.jsx):
- Ленивый useState инициализатор для form/tplId/date/editingId, читающий "strong-log:draft" из localStorage (try/catch, версия v:1). Нет/битый → как сейчас (tplId=templates[0].id, form=suggestForm(templates[0],sessions), editingId=null). Аккуратно: сейчас это отдельные useState — можно ввести хелпер loadDraft(), возвращающий {tplId,date,form,editingId} или null, и инициализировать каждый useState из него.
- useEffect([form,tplId,date,editingId]) → пишет JSON-черновик в localStorage (try/catch).
- В commit() после успешного addSession → localStorage.removeItem("strong-log:draft").
- toggleExDone(ei): const c=structuredClone(form); const cur=c[ei].sets; const allDone=cur.length>0 && cur.every(s=>s.done); cur.forEach(s=>{ s.done=!allDone; }); setForm(c). Таймер отдыха при массовом переключении НЕ запускать.
- Существующий toggleDone(ei,si) НЕ менять.
- Чекбокс упражнения — <button> в .ft-ex-h; класс «вкл» когда allDone. Стиль в духе .ft-set-check; при необходимости добавить CSS-класс(ы) в export const CSS (src/data.js). aria-pressed, title по-русски. Разместить так, чтобы не сломать существующую раскладку шапки (.ft-ex-num, .ft-ex-toggle с названием и шевроном, .ft-ex-del кнопка удаления).
- Свернутое упражнение уже показывает preview (веса/повторы) — данные видны и после restore; убедиться, что preview и done корректны после восстановления черновика.
Не сломать: startEdit (восстанавливает exercises сохранённой тренировки, done=false), pick (смена программы → form=suggestForm(новый tpl), черновик обновляется), cancelEdit, addSet/delSet/delExercise/addExerciseToForm. Экспортируемый API data.js не менять (только CSS при желании).
ГРАНИЦЫ: не трогать тоннаж (#2) и апгрейд программы (#4). set-row правит и #3 — писать так, чтобы #3 (кнопка ± в ячейке веса) потом легко встроилась.
`

const F3_SPEC = `
ЗАДАЧА 3 — дать вводить «минус» в весе для BW-упражнений (Брусья/Подтягивания) на мобильной цифровой клавиатуре (src/App.jsx; CSS в src/data.js).
Проблема: поле веса подхода — <input type="number" inputMode="decimal"> (App.jsx ~875-878). На iOS/Android цифровая клавиатура не содержит «−», а утяжелитель для Брусьев вводится отрицательным (−10). Ввести минус нельзя.
Требование: для BW-упражнений (BW_EXERCISES.has(e.n)) — удобный способ поставить/снять знак «−», не ломая цифровой ввод и раскладку. РЕКОМЕНДАЦИЯ: кнопка-тумблер «±» в ячейке веса ТОЛЬКО для BW-упражнений; инвертирует знак текущего значения, работает и на пустом поле (→ "-"). Значение остаётся строкой; хранение/onChange не менять.
Реализация:
- Только для BW-упражнений: обёртка position:relative вокруг <input> веса, внутри неё кнопка «±» position:absolute слева, у input левый padding, чтобы цифры не налезали. НЕ добавлять новую колонку в grid .ft-set-log (5 колонок). Для НЕ-BW — поле веса как раньше (без обёртки).
- toggleSign(ei,si): v = String(form[ei].sets[si].weight ?? ""); next = v.startsWith("-") ? v.slice(1) : ("-" + v); setCell(ei,si,"weight",next). Кнопка disabled когда s.done.
- Добавить CSS-классы (обёртка/кнопка ±) в export const CSS (src/data.js) в стиле проекта (акцент C.accent, как .ft-set-check).
- inputMode оставить "decimal", знак — кнопкой.
ВАЖНО: #3 внедряется ПОСЛЕ #1, которая уже поправила этот же участок (set-row + шапка упражнения). ОБЯЗАТЕЛЬНО перечитать актуальный src/App.jsx перед правкой и встроиться, не ломая чекбоксы/персист #1.
`

const FEATURES = [
  { key: 'f1', title: 'Чекбокс упражнения + персист формы', spec: F1_SPEC },
  { key: 'f3', title: 'Минус в весе (BW)', spec: F3_SPEC },
]

/* ---------- схемы ---------- */
const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    steps: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { file: { type: 'string' }, location: { type: 'string' }, change: { type: 'string' } },
      required: ['file', 'change'] } },
    risks: { type: 'string' },
    selfCheck: { type: 'string' },
  },
  required: ['summary', 'steps'],
}
const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['APPROVE', 'REVISE'] },
    issues: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['verdict'],
}
const IMPL_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    buildOk: { type: 'boolean' },
    notes: { type: 'string' },
  },
  required: ['summary', 'filesChanged', 'buildOk'],
}
const VERIFY_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    buildOk: { type: 'boolean' },
    phpOk: { type: 'boolean' },
    f1Present: { type: 'boolean' },
    f3Present: { type: 'boolean' },
    regressionOk: { type: 'boolean', description: '#4/#2 не сломаны' },
    issues: { type: 'array', items: { type: 'string' } },
    verdict: { type: 'string', enum: ['APPROVE', 'REVISE'] },
    summary: { type: 'string' },
  },
  required: ['buildOk', 'verdict', 'summary'],
}

/* ---------- prompts ---------- */
function planPrompt(f, prevPlan, prevReview) {
  let rev = ''
  if (prevReview && prevReview.verdict === 'REVISE') rev = `\n\nПРЕДЫДУЩИЙ ПЛАН ОТКЛОНЁН. Замечания (устрани все):\n- ${(prevReview.issues || []).join('\n- ')}`
  return `${CTX}\n\nТы — планировщик. Составь КОНКРЕТНЫЙ план реализации задачи. НИЧЕГО НЕ РЕДАКТИРУЙ — только читай (Read/Grep), сверь спеку с реальным кодом (точные функции/строки/якоря), проверь полноту и отсутствие поломок соседних фич.\n\n${f.spec}${rev}\n\nВерни план строго по схеме.`
}
function planReviewPrompt(f, plan) {
  return `${CTX}\n\nТы — придирчивый ревьюер ПЛАНА. Проверь план против спеки и реального кода (Read/Grep, не редактируй).\nAPPROVE только если: покрывает все требования; точен по файлам/функциям; не ломает соседние фичи (в т.ч. уже сделанные #4/#2) и существующее поведение (редактирование/смена программы/таймер отдыха); есть внятная проверка. Иначе REVISE со списком конкретных issues.\n\nСПЕКА:\n${f.spec}\n\nПЛАН:\n${JSON.stringify(plan, null, 2)}`
}
function implPrompt(f, plan, prevReview) {
  let rev = ''
  if (prevReview && prevReview.verdict === 'REVISE') rev = `\n\nТВОЯ ПРЕДЫДУЩАЯ РЕАЛИЗАЦИЯ ОТКЛОНЕНА. Исправь ВСЕ замечания, не откатывая корректное:\n- ${(prevReview.issues || []).join('\n- ')}`
  return `${CTX}\n\nТы — разработчик. РЕАЛИЗУЙ задачу в РЕАЛЬНЫХ файлах через Read + Edit. Перед правкой ОБЯЗАТЕЛЬНО перечитай актуальное состояние (файлы мог изменить предыдущий шаг пайплайна) и встройся, НЕ ломая уже сделанное (#4/#2 и, для #3 — чекбоксы/персист #1).\n\n${f.spec}\n\nУТВЕРЖДЁННЫЙ ПЛАН:\n${JSON.stringify(plan, null, 2)}${rev}\n\nПосле правок ОБЯЗАТЕЛЬНО \`npm run build\` из корня (покажи хвост вывода). НЕ коммить/не пушь/не переключай ветку. Верни отчёт по схеме (buildOk по факту сборки).`
}
function buildReviewPrompt(f, plan, impl) {
  return `${CTX}\n\nТы — придирчивый код-ревьюер. Оцени ФАКТИЧЕСКИЕ изменения. Запусти \`git --no-pager diff\` и читай изменённые файлы. Сопоставь со спекой и планом. Проверь: (1) все требования выполнены; (2) не сломаны соседние фичи и существующее поведение (редактирование/смена программы/таймер/тоннаж/шаблоны); (3) для #3 — не сломаны чекбоксы/персист #1; (4) сборка проходит — при сомнении сам \`npm run build\`. НЕ РЕДАКТИРУЙ сам.\nЕсли есть хоть одна конкретная проблема — REVISE с точными issues (файл/строка/что не так). Иначе APPROVE.\n\nСПЕКА:\n${f.spec}\n\nОТЧЁТ РАЗРАБОТЧИКА:\n${JSON.stringify(impl, null, 2)}`
}

/* ---------- циклы до APPROVE ---------- */
const MAX_ITERS = 4
async function planLoop(f) {
  let plan = null, review = null
  for (let i = 1; i <= MAX_ITERS; i++) {
    plan = await agent(planPrompt(f, plan, review), { phase: 'Plan', label: `план/${f.key}#${i}`, schema: PLAN_SCHEMA })
    if (!plan) { log(`план ${f.key}: пусто (итер ${i})`); continue }
    review = await agent(planReviewPrompt(f, plan), { phase: 'Plan', label: `план-ревью/${f.key}#${i}`, schema: REVIEW_SCHEMA })
    if (review && review.verdict === 'APPROVE') { log(`✅ план ${f.key} APPROVED за ${i} итер.`); break }
    log(`↻ план ${f.key} REVISE (итер ${i})`)
  }
  return { key: f.key, feature: f, plan, review }
}
async function buildLoop(f, plan) {
  let impl = null, review = null
  for (let i = 1; i <= MAX_ITERS; i++) {
    impl = await agent(implPrompt(f, plan, review), { phase: 'Build', label: `билд/${f.key}#${i}`, agentType: 'general-purpose', schema: IMPL_SCHEMA })
    if (!impl) { log(`билд ${f.key}: пусто (итер ${i})`); continue }
    review = await agent(buildReviewPrompt(f, plan, impl), { phase: 'Build', label: `билд-ревью/${f.key}#${i}`, agentType: 'general-purpose', schema: REVIEW_SCHEMA })
    if (review && review.verdict === 'APPROVE') { log(`✅ билд ${f.key} APPROVED за ${i} итер.`); break }
    log(`↻ билд ${f.key} REVISE (итер ${i}): ${review ? (review.issues || []).slice(0,3).join(' | ') : '?'}`)
  }
  return { key: f.key, impl, review }
}

/* ============================ RUN ============================ */
phase('Plan')
log('Планирование #1 и #3 параллельно, цикл plan→review до APPROVE…')
const planned = await parallel(FEATURES.map((f) => () => planLoop(f)))
const planByKey = {}
planned.filter(Boolean).forEach((p) => { planByKey[p.key] = p })

phase('Build')
log('Разработка последовательно f1→f3 (общий set-row), цикл build→review до APPROVE…')
const built = []
for (const key of ['f1', 'f3']) {
  const p = planByKey[key]
  if (!p || !p.plan) { log(`⚠ нет плана для ${key} — пропуск`); continue }
  built.push(await buildLoop(p.feature, p.plan))
}

phase('Verify')
log('Финальная проверка: сборка + php -l + интеграционное ревью + регрессия #4/#2…')
let verify = null
for (let i = 1; i <= 2; i++) {
  verify = await agent(
    `${CTX}\n\nТы — финальный верификатор. Проверь результат по #1 и #3 И регрессию #4/#2.\nШаги: (1) \`npm run build\` — без ошибок (хвост вывода); (2) \`php -l api/lib/Exercises.php\`; (3) \`git --no-pager diff --stat\` и просмотр ключевых мест App.jsx/data.js.\nПодтверди:\n  f1 — чекбокс упражнения в шапке .ft-ex-h + toggleExDone (массовое переключение подходов, allDone вычисляемое) + черновик "strong-log:draft" в localStorage (restore при монтировании Log, remove в commit);\n  f3 — кнопка «±»/toggleSign для BW-полей веса (только для BW_EXERCISES), grid .ft-set-log не сломан;\n  регрессия — DUMBBELL_PAIR/loadUnits/units в exerciseVolume на месте, BUILTIN_TEMPLATES с новыми упражнениями на месте, setLoad не тронут;\n  f1 и f3 не конфликтуют в set-row.\nЕсли нарушение МЕЛКОЕ — можешь поправить сам (Edit) и перепроверить сборку; крупное — зафиксируй в issues. НЕ коммить/не пушь.\nВердикт APPROVE только если build+php ок, f1+f3 присутствуют и не конфликтуют, регрессии нет.`,
    { phase: 'Verify', label: `verify#${i}`, agentType: 'general-purpose', schema: VERIFY_SCHEMA }
  )
  if (verify && verify.verdict === 'APPROVE') break
  if (verify) log(`↻ verify REVISE (итер ${i}): ${(verify.issues || []).slice(0,4).join(' | ')}`)
}

return {
  plans: planned.filter(Boolean).map((p) => ({ key: p.key, approved: p.review && p.review.verdict === 'APPROVE' })),
  builds: built.map((b) => ({ key: b.key, approved: b.review && b.review.verdict === 'APPROVE', issues: b.review && b.review.issues })),
  verify,
}
