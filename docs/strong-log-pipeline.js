export const meta = {
  name: 'strong-log-upgrade',
  description: 'STRØNG·LOG: 4 фикса (чекбокс+персист формы, тоннаж гантелей ×2, минус-инпут, апгрейд программы). План→ревью и билд→ревью, каждый луп до APPROVE.',
  phases: [
    { title: 'Plan', detail: '4 планировщика параллельно, каждый цикл plan→review до APPROVE' },
    { title: 'Build', detail: 'разработчики последовательно (f4→f2→f1→f3), каждый цикл build→review до APPROVE' },
    { title: 'Verify', detail: 'npm run build + php -l + интеграционное ревью всего диффа' },
  ],
}

/* ---------- общий контекст кодовой базы ---------- */
const CTX = `
Проект STRØNG·LOG — личный трекер силовых. Стек: React 18 (Vite, JSX) + PHP8/MySQL бэкенд. Один пользователь. UI и комментарии — по-русски.
Рабочая директория — реальный репозиторий. Ветка claude/workout-app-fixes-o5st5x: НЕ переключать, НЕ коммитить и НЕ пушить (коммит сделает оркестратор в конце).
Ключевые файлы:
- src/data.js — источник истины по логике фронта: BUILTIN_TEMPLATES (4 встроенные программы h1t1/h1t2/h2t1/h2t2), CANON (словарь синоним→канон) + canon(), метрики (setLoad, exerciseVolume, sessionVolume, exerciseTop, exerciseE1rmBest, PR-функции), BW_EXERCISES = Set(["Подтягивания","Брусья"]), suggestForm(), большой export const CSS с стилями.
- src/App.jsx (~1820 строк) — UI. Компонент Log (строки ~547-932) рендерит форму логирования тренировки со стейтом form (массив упражнений { n, sets:[{weight,reps,hint,done}] }). App (строка ~216) рендерит вкладки условно: {tab === 'log' && <Log .../>} — поэтому Log РАЗМОНТИРУЕТСЯ при смене вкладки и весь локальный стейт form теряется (корень жалобы №1). Таймер отдыха RestTimer вынесен на уровень App, чтобы переживать смену вкладок.
- api/lib/Exercises.php — серверное ЗЕРКАЛО CANON (public const CANON) + normExercises(). HANDOFF §5: словарь дублируется в JS и PHP, держать синхронно.
Формат подхода в BUILTIN_TEMPLATES: { n:"Имя", s:[[weight, reps, hint?], ...] }. weight===0 => в форме пустое поле (плайометрия/пресс/подтягивания без помощи). Отрицательный weight => утяжелитель для BW-упражнений. Десятичный разделитель — точка (72.5).
Формат подхода в форме/сессии: { weight, reps, hint, done }. Сессии нормализуются canon() при загрузке и сохранении (normSession), поэтому ex.n в сессиях всегда КАНОНИЧЕСКИЙ.
setLoad(set, exName, bw): для BW (Подтягивания/Брусья) = Math.max(0, bw - w) (помощь вводится «+», утяжелитель «−»); иначе = w (введённый вес). exName сравнивается по каноническому имени как в BW_EXERCISES.
Команды проверки: npm run build (Vite). Если node_modules нет — сначала npm install. Для PHP: php -l api/lib/Exercises.php.
`

/* ---------- спецификации фич (авторитетные, чтобы агенты сходились быстро) ---------- */
const F1_SPEC = `
ЗАДАЧА 1 — чекбокс на уровне упражнения + сохранение прогресса тренировки между вкладками (src/App.jsx, при необходимости CSS в src/data.js).
Проблема: Log размонтируется при смене вкладки (App.jsx ~216: {tab === 'log' && <Log .../>}). Введённые веса/повторы и отметки «сделано» пропадают. Чекбокса на уровне упражнения нет — только на подходах (toggleDone, кнопка .ft-set-check).
Требования:
1) У КАЖДОГО упражнения в форме — свой чекбокс в шапке .ft-ex-h (рядом с номером .ft-ex-num / названием). Клик отмечает ВСЕ подходы этого упражнения done=true; повторный клик снимает у всех.
2) Когда вручную отмечены ВСЕ подходы упражнения — чекбокс упражнения автоматически «сделано». СОСТОЯНИЕ ВЫЧИСЛЯЕМОЕ: allDone = e.sets.length>0 && e.sets.every(s=>s.done). Единый источник истины — done у подходов; ОТДЕЛЬНОЕ поле done у упражнения НЕ вводить (иначе рассинхрон).
3) Прогресс незавершённой тренировки (tplId, date, form с введёнными weight/reps и флагами done, editingId) ПЕРЕЖИВАЕТ смену вкладок и перезагрузку страницы — сохранять в localStorage (кэш) под ключом "strong-log:draft". Восстанавливать при монтировании Log ВМЕСТО чистого suggestForm(). ОЧИЩАТЬ черновик после успешного commit() (иначе воскреснет после сейва).
Реализация:
- В Log: ленивый инициализатор useState для form/tplId/date/editingId, читающий "strong-log:draft" из localStorage (try/catch, версия схемы v:1). Если черновика нет/битый — как сейчас (tplId=templates[0].id, form=suggestForm(templates[0],sessions), editingId=null).
- useEffect с зависимостями [form,tplId,date,editingId]: пишет JSON-черновик в localStorage. Не писать во время статуса «checking»/до монтирования — достаточно обычного effect.
- В commit() после успешного addSession — localStorage.removeItem("strong-log:draft").
- toggleExDone(ei): const c=structuredClone(form); const cur=c[ei].sets; const allDone=cur.length>0 && cur.every(s=>s.done); cur.forEach(s=>{ s.done = !allDone; }); setForm(c). НЕ запускать таймер отдыха при массовом переключении (в отличие от одиночного toggleDone).
- Существующий toggleDone(ei,si) не менять (он стартует таймер отдыха при включении одного подхода).
- Чекбокс упражнения — <button> в .ft-ex-h; класс «вкл» когда allDone. Стиль в духе .ft-set-check; при необходимости добавить CSS-класс(ы) в export const CSS в src/data.js. aria-pressed, title по-русски.
- Свернутое упражнение уже показывает preview (веса/повторы) — данные видны и после восстановления черновика; убедиться, что preview и done-состояние корректны после restore.
Не сломать: startEdit (редактирование сохранённой тренировки — восстанавливать её exercises, done=false), pick (смена программы — форма = suggestForm(новый tpl), черновик обновляется), cancelEdit, addSet/delSet/delExercise/addExerciseToForm. Экспортируемый API data.js не менять (только, при желании, дополнить CSS).
ГРАНИЦЫ: не трогать логику тоннажа (задача 2) и ввод минуса (задача 3). set-row правит и задача 3 — писать аккуратно, не мешая.
`

const F2_SPEC = `
ЗАДАЧА 2 — корректный тоннаж для гантелей (учитывать ОБЕ гантели) — только в объёме/тоннаже (src/data.js).
Проблема: setLoad возвращает введённый вес как есть → одна гантель. Для парного жима 24×5 тоннаж=120, а должно 240 (обе гантели: 2×24×5).
Требование: в тоннаже/ОБЪЁМЕ учитывать ×2 для ПАРНЫХ гантельных упражнений. Метрики «рабочий вес»/e1RM/таблицу PR/hero НЕ менять — там остаётся введённый вес на ОДНУ гантель (так пользователь его вводит и узнаёт).
Реализация — src/data.js, рядом с BW_EXERCISES добавить:
  export const DUMBBELL_PAIR = new Set([
    "Жим гантелей на скамье 15°",
    "Жим гантелей сидя",
    "Разведение гантелей лёжа",
    "Махи гантелей в стороны",
    "Подъём гантелей хватом «молот»",
    "Болгарский сплит-присед с гантелями",
  ]);
  export const loadUnits = (exName) => (DUMBBELL_PAIR.has(exName) ? 2 : 1);
Изменить ТОЛЬКО exerciseVolume:
  export function exerciseVolume(ex, bw) {
    const units = loadUnits(ex.n);
    return ex.sets.reduce((v, s) => {
      const load = setLoad(s, ex.n, bw);
      return load == null ? v : v + load * units * (num(s.reps) || 0);
    }, 0);
  }
НЕ менять: setLoad, exerciseTop, exerciseE1rmBest, exercisePRList, e1rm. Одногантельные (Приседания с гантелью (гоблет), Выпрыгивания с гантелей) — НЕ в наборе (×1). Подтягивания/Брусья — units=1, формула bw−w уже верна: объём = (bw ∓ помощь/утяж) × повт.
Проверка: значения ключевать КАНОНИЧЕСКИМИ именами (ex.n в сессиях нормализован). npm run build должен проходить.
`

const F3_SPEC = `
ЗАДАЧА 3 — дать вводить «минус» в весе для BW-упражнений (Брусья/Подтягивания) на мобильной цифровой клавиатуре (src/App.jsx, CSS в src/data.js).
Проблема: поле веса подхода — <input type="number" inputMode="decimal"> (App.jsx ~875-878). На iOS/Android цифровая клавиатура не содержит «−», а утяжелитель для Брусьев вводится отрицательным (−10). Ввести минус нельзя.
Требование: для BW-упражнений (BW_EXERCISES.has(e.n)) дать удобный способ поставить/снять знак «−», не ломая цифровой ввод и раскладку. РЕКОМЕНДАЦИЯ: кнопка-тумблер «±» рядом с полем веса ТОЛЬКО для BW-упражнений; инвертирует знак текущего значения, работает и на пустом поле (→ "-"). Значение остаётся строкой; хранение/onChange не менять.
Реализация:
- Только для BW-упражнений: обёртка position:relative вокруг <input> веса, внутри неё кнопка «±» position:absolute слева, у input — левый padding, чтобы цифры не налезали. НЕ добавлять новую колонку в grid .ft-set-log (5 колонок: # / вес / повт / галочка / удалить) — чтобы не конфликтовать с задачей 1. Для НЕ-BW упражнений поле веса рендерить как раньше (без обёртки).
- toggleSign(ei,si): v = String(s.weight ?? ""); next = v.startsWith("-") ? v.slice(1) : ("-" + v); setCell(ei,si,"weight",next). Кнопка disabled когда s.done.
- Добавить CSS-классы (обёртка/кнопка ±) в export const CSS (src/data.js) в стиле проекта (лаймовый акцент C.accent, как .ft-set-check).
- inputMode оставить "decimal" (цифры удобнее), знак — кнопкой. (Допустимая альтернатива, если ± никак не вписать в раскладку: для BW-поля inputMode="text" — но ± предпочтительнее.)
ВАЖНО: задача 3 внедряется ПОСЛЕ задачи 1, которая уже поправила этот же участок (set-row + шапка упражнения). ОБЯЗАТЕЛЬНО перечитать актуальный src/App.jsx перед правкой и встроиться, не ломая чекбоксы/персист задачи 1.
`

const F4_SPEC = `
ЗАДАЧА 4 — апгрейд программы: заменить массивы упражнений во всех 4 BUILTIN_TEMPLATES (src/data.js) + добавить новые упражнения в канон (CANON в src/data.js И api/lib/Exercises.php СИНХРОННО).
Названия из списка пользователя сопоставлены с базой. Совпадающие с каноном — использовать как есть, синонимы для них НЕ добавлять. Новые — как новые канонические имена (добавляются самим фактом использования в шаблоне). В CANON добавить только маппинги вариантов написания.
CANON — добавить (и в data.js в объект CANON, и в Exercises.php в const CANON, одинаково), НЕ дублируя существующие ключи:
  "Обратная бабочка в тренажере"        => "Обратная бабочка в тренажёре"
  "Ягодичный мост в тренажере"          => "Ягодичный мост в тренажёре"
  "Сведение рук в тренажёре «бабочка»"  => "Сведение рук в тренажёре"
(Ключ "Сведения в тренажёре бабочка" уже есть — не трогать.)
Заменить ex у BUILTIN_TEMPLATES ТОЧНО на нижеследующее. Формат s:[[w,r],...]; w=0 => пусто; отрицательное => утяжелитель. id и builtin:true сохранить. Третий элемент (hint) НЕ указывать (в новом списке диапазонов нет).

h1t1 «Н1 · Т1», sub оставить "Грудь / спина / руки", ex по порядку:
  { n:"Максимальный блок-прыжок с места", s:[[0,4],[0,4],[0,4],[0,4]] }
  { n:"Жим штанги лёжа", s:[[20,15],[40,8],[55,5],[65,3],[72.5,1],[80,3],[70,8],[70,8]] }
  { n:"Подтягивания", s:[[0,7],[7,10],[7,10]] }
  { n:"Разведение гантелей лёжа", s:[[16,10],[16,10]] }
  { n:"Болгарский сплит-присед с гантелями", s:[[8,8],[8,8],[8,8]] }
  { n:"Махи гантелей в стороны", s:[[12,10],[12,10],[12,10]] }
  { n:"Обратная бабочка в тренажёре", s:[[10,12],[10,12]] }
  { n:"Подъём штанги на бицепс", s:[[25,12],[25,12]] }
  { n:"Мёртвый жук с сопротивлением", s:[[0,10],[0,10],[0,10]] }

h1t2 «Н1 · Т2», sub "Ноги / плечи / трицепс", ex:
  { n:"Пружинные прыжки на носках", s:[[0,15],[0,15],[0,15]] }
  { n:"Жим гантелей на скамье 15°", s:[[26,10],[26,10],[26,10]] }
  { n:"Тяга вертикального блока к груди", s:[[55,12],[55,12],[55,12]] }
  { n:"Брусья", s:[[-10,10],[-10,10],[-10,10]] }
  { n:"Ягодичный мост в тренажёре", s:[[40,10],[40,10],[40,10]] }
  { n:"Жим гантелей сидя", s:[[18,12],[18,12]] }
  { n:"Отведение руки в кроссовере на заднюю дельту", s:[[5,12],[5,12]] }
  { n:"Разгибание на трицепс на блоке (канат)", s:[[12.5,12],[12.5,12]] }
  { n:"Подъём коленей в висе с подкручиванием таза", s:[[0,10],[0,10],[0,10]] }

h2t1 «Н2 · Т1», sub "Грудь / спина / руки", ex:
  { n:"Максимальный блок-прыжок с места", s:[[0,4],[0,4],[0,4],[0,4]] }
  { n:"Жим штанги лёжа", s:[[20,15],[40,8],[55,5],[65,2],[70,8],[70,8],[70,8]] }
  { n:"Тяга горизонтального блока к поясу", s:[[55,12],[55,12],[55,12]] }
  { n:"Жим в тренажёре сидя на грудь", s:[[35,10],[35,10],[35,10]] }
  { n:"Жим ногами в тренажёре", s:[[100,10],[100,10],[100,10]] }
  { n:"Махи гантелей в стороны", s:[[12,10],[12,10],[12,10]] }
  { n:"Обратная бабочка в тренажёре", s:[[10,12],[10,12]] }
  { n:"Подъём гантелей хватом «молот»", s:[[10,12],[10,12]] }
  { n:"Подъём ног в висе", s:[[0,10],[0,10],[0,10]] }

h2t2 «Н2 · Т2», sub "Ноги / плечи / руки", ex:
  { n:"Прыжок после спрыгивания с платформы", s:[[0,4],[0,4],[0,4],[0,4]] }
  { n:"Жим гантелей на скамье 15°", s:[[26,10],[26,10],[26,10]] }
  { n:"Тяга горизонтального блока к поясу", s:[[55,12],[55,12],[55,12]] }
  { n:"Сведение рук в тренажёре", s:[[15,12],[15,12]] }
  { n:"Ягодичный мост в тренажёре", s:[[40,10],[40,10],[40,10]] }
  { n:"Жим гантелей сидя", s:[[18,12],[18,12]] }
  { n:"Отведение руки в кроссовере на заднюю дельту", s:[[5,12],[5,12]] }
  { n:"Разгибание на трицепс на блоке (канат)", s:[[12.5,12],[12.5,12]] }
  { n:"Мёртвый жук с сопротивлением", s:[[0,10],[0,10],[0,10]] }

Координация с задачей 2: «Болгарский сплит-присед с гантелями» — парное гантельное (задача 2 добавит его в DUMBBELL_PAIR). Одногантельных из старой программы (гоблет/выпрыгивания) в новой программе НЕТ.
Проверка: npm run build (JSX/JS валиден), php -l api/lib/Exercises.php.
`

const FEATURES = [
  { key: 'f1', title: 'Чекбокс упражнения + персист формы', spec: F1_SPEC },
  { key: 'f2', title: 'Тоннаж гантелей ×2', spec: F2_SPEC },
  { key: 'f3', title: 'Минус в весе (BW)', spec: F3_SPEC },
  { key: 'f4', title: 'Апгрейд программы + канон', spec: F4_SPEC },
]

/* ---------- схемы ---------- */
const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    feature: { type: 'string' },
    summary: { type: 'string', description: 'Кратко суть плана' },
    files: { type: 'array', items: { type: 'string' } },
    steps: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          file: { type: 'string' },
          location: { type: 'string', description: 'функция/строки/якорь' },
          change: { type: 'string', description: 'что именно поменять' },
        },
        required: ['file', 'change'],
      },
    },
    risks: { type: 'string', description: 'риски и как не сломать соседние фичи' },
    selfCheck: { type: 'string', description: 'как проверить (build/поведение)' },
  },
  required: ['summary', 'steps'],
}
const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['APPROVE', 'REVISE'] },
    issues: { type: 'array', items: { type: 'string' }, description: 'конкретные проблемы, пусто если APPROVE' },
    notes: { type: 'string' },
  },
  required: ['verdict'],
}
const IMPL_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    buildOk: { type: 'boolean', description: 'npm run build прошёл' },
    phpOk: { type: 'boolean', description: 'php -l прошёл (если релевантно), иначе true' },
    notes: { type: 'string' },
  },
  required: ['summary', 'filesChanged', 'buildOk'],
}
const VERIFY_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    buildOk: { type: 'boolean' },
    phpOk: { type: 'boolean' },
    featuresPresent: { type: 'array', items: { type: 'string' }, description: 'какие из f1..f4 подтверждены в диффе' },
    issues: { type: 'array', items: { type: 'string' } },
    verdict: { type: 'string', enum: ['APPROVE', 'REVISE'] },
    summary: { type: 'string' },
  },
  required: ['buildOk', 'verdict', 'summary'],
}

/* ---------- prompt builders ---------- */
function planPrompt(f, prevPlan, prevReview) {
  let revblk = ''
  if (prevReview && prevReview.verdict === 'REVISE') {
    revblk = `\n\nПРЕДЫДУЩИЙ ПЛАН ОТКЛОНЁН РЕВЬЮЕРОМ. Замечания (устрани все):\n- ${(prevReview.issues || []).join('\n- ')}\nПредыдущий план (summary): ${prevPlan ? prevPlan.summary : ''}`
  }
  return `${CTX}\n\nТы — планировщик. Составь КОНКРЕТНЫЙ план реализации задачи. НИЧЕГО НЕ РЕДАКТИРУЙ на диске — только читай нужные файлы (Read/Grep), чтобы сверить спецификацию с реальным кодом (точные функции/строки/якоря) и убедиться в полноте и отсутствии поломок соседних фич.\n\n${f.spec}${revblk}\n\nВерни план строго по схеме: files, пошаговые steps (file+location+change), risks, selfCheck. План должен быть достаточно точным, чтобы разработчик реализовал без домыслов.`
}
function planReviewPrompt(f, plan) {
  return `${CTX}\n\nТы — придирчивый ревьюер ПЛАНА. Проверь план против спецификации и реального кода (читай файлы Read/Grep, ничего не редактируй).\nКритерии APPROVE: (1) покрывает все требования задачи; (2) точен по файлам/функциям/строкам и соответствует реальному коду; (3) не ломает соседние фичи и существующее поведение (редактирование/смена программы/таймер отдыха/канонизация/метрики); (4) для задач с данными — значения точны; (5) есть внятная проверка.\nЕсли есть хоть одна конкретная проблема — verdict REVISE со списком issues. Иначе APPROVE.\n\nСПЕЦИФИКАЦИЯ:\n${f.spec}\n\nПЛАН НА РЕВЬЮ:\n${JSON.stringify(plan, null, 2)}`
}
function implPrompt(f, plan, prevReview) {
  let revblk = ''
  if (prevReview && prevReview.verdict === 'REVISE') {
    revblk = `\n\nТВОЯ ПРЕДЫДУЩАЯ РЕАЛИЗАЦИЯ ОТКЛОНЕНА РЕВЬЮЕРОМ. Замечания (исправь ВСЕ, не откатывая корректное):\n- ${(prevReview.issues || []).join('\n- ')}`
  }
  return `${CTX}\n\nТы — разработчик. РЕАЛИЗУЙ задачу в РЕАЛЬНЫХ файлах репозитория через Read + Edit/Write. Перед правкой ОБЯЗАТЕЛЬНО перечитай актуальное состояние файлов (их могли уже изменить предыдущие задачи пайплайна) и встройся, НЕ ломая уже сделанное (соседние фичи, чекбоксы/персист, тоннаж, канон, шаблоны).\n\n${f.spec}\n\nУТВЕРЖДЁННЫЙ ПЛАН:\n${JSON.stringify(plan, null, 2)}${revblk}\n\nПосле правок ОБЯЗАТЕЛЬНО проверь сборку: если нет node_modules — \`npm install\`; затем \`npm run build\` (из корня репо, покажи хвост вывода). Для задачи, затрагивающей api/lib/Exercises.php — \`php -l api/lib/Exercises.php\`. НЕ коммить и НЕ пушь, НЕ переключай ветку. Верни отчёт по схеме (buildOk по факту сборки).`
}
function buildReviewPrompt(f, plan, impl) {
  return `${CTX}\n\nТы — придирчивый код-ревьюер. Оцени ФАКТИЧЕСКИЕ изменения по этой задаче. Запусти \`git --no-pager diff\` (и при необходимости \`git --no-pager diff --cached\`) и читай изменённые файлы. Сопоставь со спецификацией и планом. Проверь: (1) все требования выполнены; (2) для данных — значения ТОЧНЫ (сверь числа/имена посимвольно со спецификацией); (3) синхронность CANON js↔php (для задачи 4); (4) не сломаны соседние фичи и существующее поведение; (5) сборка проходит — при сомнении сам запусти \`npm run build\` (и \`php -l api/lib/Exercises.php\` если релевантно). НИЧЕГО НЕ РЕДАКТИРУЙ сам — только вердикт.\nЕсли есть хоть одна конкретная проблема — REVISE с точными issues (файл/строка/что не так). Иначе APPROVE.\n\nСПЕЦИФИКАЦИЯ:\n${f.spec}\n\nОТЧЁТ РАЗРАБОТЧИКА:\n${JSON.stringify(impl, null, 2)}`
}

/* ---------- циклы до APPROVE ---------- */
const MAX_ITERS = 4

async function planLoop(f) {
  let plan = null, review = null
  for (let i = 1; i <= MAX_ITERS; i++) {
    plan = await agent(planPrompt(f, plan, review), { phase: 'Plan', label: `план/${f.key}#${i}`, schema: PLAN_SCHEMA })
    if (!plan) { log(`план ${f.key}: агент не вернул результат (итер ${i})`); continue }
    review = await agent(planReviewPrompt(f, plan), { phase: 'Plan', label: `план-ревью/${f.key}#${i}`, schema: REVIEW_SCHEMA })
    if (review && review.verdict === 'APPROVE') { log(`✅ план ${f.key} APPROVED за ${i} итер.`); break }
    log(`↻ план ${f.key} REVISE (итер ${i}): ${review ? (review.issues || []).length : '?'} замеч.`)
  }
  return { key: f.key, feature: f, plan, review }
}

async function buildLoop(f, plan) {
  let impl = null, review = null
  for (let i = 1; i <= MAX_ITERS; i++) {
    impl = await agent(implPrompt(f, plan, review), { phase: 'Build', label: `билд/${f.key}#${i}`, agentType: 'general-purpose', schema: IMPL_SCHEMA })
    if (!impl) { log(`билд ${f.key}: агент не вернул результат (итер ${i})`); continue }
    review = await agent(buildReviewPrompt(f, plan, impl), { phase: 'Build', label: `билд-ревью/${f.key}#${i}`, agentType: 'general-purpose', schema: REVIEW_SCHEMA })
    if (review && review.verdict === 'APPROVE') { log(`✅ билд ${f.key} APPROVED за ${i} итер.`); break }
    log(`↻ билд ${f.key} REVISE (итер ${i}): ${review ? (review.issues || []).slice(0,3).join(' | ') : '?'}`)
  }
  return { key: f.key, impl, review }
}

/* ============================ RUN ============================ */
phase('Plan')
log('Планирование 4 задач параллельно, каждая — цикл plan→review до APPROVE…')
const planned = await parallel(FEATURES.map((f) => () => planLoop(f)))
const planByKey = {}
planned.filter(Boolean).forEach((p) => { planByKey[p.key] = p })

phase('Build')
log('Разработка последовательно в порядке f4→f2→f1→f3 (общие файлы), каждая — цикл build→review до APPROVE…')
const buildOrder = ['f4', 'f2', 'f1', 'f3']
const built = []
for (const key of buildOrder) {
  const p = planByKey[key]
  if (!p || !p.plan) { log(`⚠ нет утверждённого плана для ${key} — пропускаю`); continue }
  const r = await buildLoop(p.feature, p.plan)
  built.push(r)
}

phase('Verify')
log('Финальная проверка: сборка + php -l + интеграционное ревью всего диффа…')
let verify = null
for (let i = 1; i <= 2; i++) {
  verify = await agent(
    `${CTX}\n\nТы — финальный интегратор-верификатор. Проверь ВЕСЬ результат пайплайна (4 задачи).\nШаги: (1) если нет node_modules — \`npm install\`; (2) \`npm run build\` — должно собраться без ошибок (покажи хвост); (3) \`php -l api/lib/Exercises.php\`; (4) \`git --no-pager diff --stat\` и просмотр ключевых мест; (5) подтверди присутствие каждой фичи:\n  f1 — чекбокс упражнения в шапке + toggleExDone + черновик "strong-log:draft" в localStorage (restore при монтировании Log, remove в commit);\n  f2 — DUMBBELL_PAIR + loadUnits + ×units в exerciseVolume (и НЕ тронуты setLoad/exerciseTop/PR);\n  f3 — кнопка «±»/минус для BW-полей веса;\n  f4 — 4 обновлённых BUILTIN_TEMPLATES (сверь состав/числа с ТЗ) + новые CANON-маппинги СИНХРОННО в data.js и Exercises.php.\n(6) убедись, что фичи не конфликтуют друг с другом (особенно set-row: f1+f3). Если что-то нарушено и это МЕЛКОЕ — можешь поправить сам (Edit) и перепроверить сборку; крупное — только зафиксируй в issues. НЕ коммить, НЕ пушь.\nВерни отчёт по схеме. verdict APPROVE только если build+php ок и все 4 фичи на месте и не конфликтуют.`,
    { phase: 'Verify', label: `verify#${i}`, agentType: 'general-purpose', schema: VERIFY_SCHEMA }
  )
  if (verify && verify.verdict === 'APPROVE') break
  if (verify) log(`↻ verify REVISE (итер ${i}): ${(verify.issues || []).slice(0,4).join(' | ')}`)
}

return {
  plans: planned.filter(Boolean).map((p) => ({ key: p.key, approved: p.review && p.review.verdict === 'APPROVE', summary: p.plan && p.plan.summary })),
  builds: built.map((b) => ({ key: b.key, approved: b.review && b.review.verdict === 'APPROVE', issues: b.review && b.review.issues })),
  verify,
}
