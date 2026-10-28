if (window.Capacitor?.isNativePlatform?.()) document.documentElement.classList.add("native-app");

function showRuntimeError(error, location = "") {
  const message = error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error || "Unknown JavaScript error");
  let banner = document.getElementById("runtime-error-banner");
  if (!banner) {
    banner = document.createElement("pre");
    banner.id = "runtime-error-banner";
    banner.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;max-height:40vh;overflow:auto;margin:0;padding:10px;background:#b91c1c;color:#fff;font:12px/1.4 monospace;white-space:pre-wrap;border-radius:8px";
    document.body.appendChild(banner);
  }
  banner.textContent = `JavaScript error: ${message}${location ? `\n${location}` : ""}`;
}

window.addEventListener("error", (event) => {
  const location = event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : "";
  showRuntimeError(event.error || event.message, location);
});

window.addEventListener("unhandledrejection", (event) => {
  showRuntimeError(event.reason);
});

const repeatOptions = [
  { value: "once", label: "Only once" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
  { value: "monthly", label: "Every month" },
  { value: "two-months", label: "Every 2 months" },
  { value: "three-months", label: "Every 3 months" },
  { value: "six-months", label: "Every 6 months" },
  { value: "yearly", label: "Every year" },
];

const weekDays = [
  { short: "S", name: "Sunday" },
  { short: "M", name: "Monday" },
  { short: "T", name: "Tuesday" },
  { short: "W", name: "Wednesday" },
  { short: "T", name: "Thursday" },
  { short: "F", name: "Friday" },
  { short: "S", name: "Saturday" },
];

const modeHelp = {
  repeat: "Repeats on a fixed schedule, like every 3 months, whether or not you finished the task.",
  dynamic: "Waits until you mark the task done, then sets the next alarm that far from the day you finished it.",
};

const STORAGE_KEY = "daily-schedule-events";
const SHORT_UNIT_MS = { minute: 60000, hour: 3600000 };
function isShortUnit(unit) {
  return Object.hasOwn(SHORT_UNIT_MS, unit);
}
const ALARM_SOUNDS = [
  { id: "chime", label: "Chime", file: "alarm_chime.wav" },
  { id: "bell", label: "Bell", file: "alarm_bell.wav" },
  { id: "beep", label: "Beep", file: "alarm_beep.wav" },
  { id: "marimba", label: "Marimba", file: "alarm_marimba.wav" },
  { id: "digital", label: "Digital", file: "alarm_digital.wav" },
  { id: "dingdong", label: "Ding Dong", file: "alarm_dingdong.wav" },
  { id: "clock", label: "Alarm Clock", file: "alarm_clock.wav" },
  { id: "soft", label: "Soft", file: "alarm_soft.wav" },
];
const SOUND_KEY = "alarm-sound";
function getSoundId() {
  try {
    const saved = localStorage.getItem(SOUND_KEY);
    if (ALARM_SOUNDS.some((s) => s.id === saved)) return saved;
  } catch {}
  return "chime";
}
const channelFor = (soundId) => `alarm_${soundId}`;
const defaultSchedule = [
  { id: 1, time: "09:30", title: "Design review", detail: "Homepage exploration", duration: "45 min", accent: "blue-accent", repeat: "once", repeatDays: [] },
  { id: 2, time: "12:00", title: "Team lunch", detail: "Terrace café", duration: "1 hr", accent: "orange-accent", repeat: "once", repeatDays: [] },
  { id: 3, time: "15:30", title: "Product sync", detail: "Weekly planning", duration: "30 min", accent: "purple-accent", repeat: "weekly", repeatDays: ["Monday"] },
];

function loadSchedule() {
  try {
    const savedSchedule = localStorage.getItem(STORAGE_KEY);
    if (!savedSchedule) return defaultSchedule;

    const parsedSchedule = JSON.parse(savedSchedule);
    if (!Array.isArray(parsedSchedule)) return defaultSchedule;

    return parsedSchedule.map((item, index) => {
      const storedId = item.id == null ? Date.now() + index : Number(item.id);
      return {
        ...item,
        id: Number.isFinite(storedId) ? storedId : Date.now() + index,
        accent: item.accent || ["blue-accent", "orange-accent", "purple-accent"][index % 3],
        repeat: item.repeat || "once",
        repeatDays: Array.isArray(item.repeatDays) ? item.repeatDays : [],
        ...(item.repeat === "dynamic" ? {
          dueDate: item.dueDate || toISO(new Date()),
          interval: item.interval || { every: 3, unit: "month" },
          lastDone: item.lastDone ?? null,
        } : {}),
      };
    });
  } catch {
    return defaultSchedule;
  }
}

let schedule = loadSchedule();

const iconPaths = {
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
  mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  upload: '<path d="M12 16V4m0 0L8 8m4-4 4 4"/><path d="M5 14v5h14v-5"/>',
  spark: '<path d="m12 2 1.5 5.2L19 9l-5.5 1.8L12 16l-1.5-5.2L5 9l5.5-1.8L12 2ZM5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8L5 16Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  more: '<circle cx="12" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>',
  edit: '<path d="m14 5 5 5M4 20l3.5-.7L19 7.8a1.8 1.8 0 0 0 0-2.6l-.2-.2a1.8 1.8 0 0 0-2.6 0L4.7 16.5 4 20Z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
};

function icon(name, size = 20) {
  return `<svg aria-hidden="true" fill="none" height="${size}" width="${size}" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7">${iconPaths[name] || ""}</svg>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

let screen = "home";
let recording = false;
let editingId = null;
let openMenuId = null;
let draftDays = ["Monday"];
let draftMode = "once";

const $ = (id) => document.getElementById(id);

const root = document.documentElement;
let nativeKeyboardHeight = 0;
let baseInnerHeight = window.innerHeight;
let focusScrollTimer = null;

function setKeyboardHeight(height) {
  root.style.setProperty("--kb", `${height}px`);
  root.style.setProperty("--vvh", `${window.innerHeight}px`);
  root.classList.toggle("kb-open", height > 80);
}

function updateKeyboardHeight() {
  const viewport = window.visualViewport;
  const measured = viewport
    ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
    : 0;
  const resizedBy = Math.max(0, baseInnerHeight - window.innerHeight);
  const nativeRemaining = Math.max(0, nativeKeyboardHeight - resizedBy);
  if (!nativeKeyboardHeight && measured === 0) baseInnerHeight = Math.max(baseInnerHeight, window.innerHeight);
  setKeyboardHeight(Math.max(measured, nativeRemaining));
}

function resetPageScroll() {
  [
    document.scrollingElement,
    document.documentElement,
    document.body,
    document.querySelector(".page"),
    document.querySelector(".phone-shell"),
  ].forEach((element) => {
    if (!element) return;
    element.scrollTop = 0;
    element.scrollLeft = 0;
  });
  window.scrollTo(0, 0);
}

updateKeyboardHeight();
window.addEventListener("resize", updateKeyboardHeight);
window.addEventListener("orientationchange", () => {
  baseInnerHeight = window.innerHeight;
  updateKeyboardHeight();
});
window.visualViewport?.addEventListener("resize", updateKeyboardHeight);
window.visualViewport?.addEventListener("scroll", updateKeyboardHeight);

document.addEventListener("focusin", (event) => {
  const element = event.target;
  if (!(element instanceof HTMLElement) || !element.matches("input, select, textarea") || !element.closest(".schedule-modal, .welcome")) return;
  window.clearTimeout(focusScrollTimer);
  focusScrollTimer = window.setTimeout(() => {
    focusScrollTimer = null;
    if (document.activeElement !== element) return;
    const modal = element.closest(".schedule-modal");
    if (modal) {
      const form = element.closest("form");
      if (!form) return;
      const formRect = form.getBoundingClientRect();
      const inputRect = element.getBoundingClientRect();
      const targetTop = form.scrollTop + inputRect.top - formRect.top - (form.clientHeight - inputRect.height) / 2;
      form.scrollTo({ top: targetTop, behavior: "auto" });
      return;
    }
    const welcome = element.closest(".welcome");
    if (welcome) {
      const welcomeRect = welcome.getBoundingClientRect();
      const inputRect = element.getBoundingClientRect();
      const targetTop = welcome.scrollTop + inputRect.top - welcomeRect.top - (welcome.clientHeight - inputRect.height) / 2;
      welcome.scrollTo({ top: targetTop, behavior: "auto" });
    }
  }, 300);
});

document.addEventListener("focusout", () => {
  window.setTimeout(() => {
    if (document.activeElement.matches("input, select, textarea")) return;
    nativeKeyboardHeight = 0;
    setKeyboardHeight(0);
    resetPageScroll();
  }, 0);
});

try {
  if (window.Capacitor?.isNativePlatform?.()) {
    const capacitor = window.Capacitor;
    const keyboard = capacitor.Plugins?.Keyboard
      ?? (capacitor.isPluginAvailable?.("Keyboard") ? capacitor.registerPlugin?.("Keyboard") : null);
    if (keyboard?.addListener) {
      const listenKeyboard = (eventName, handler) => {
        try {
          const handle = keyboard.addListener(eventName, handler);
          if (handle && typeof handle.catch === "function") {
            handle.catch((error) => console.warn(`Keyboard ${eventName} listener failed:`, error));
          }
        } catch (error) {
          console.warn(`Keyboard ${eventName} listener failed:`, error);
        }
      };
      listenKeyboard("keyboardWillShow", (info) => {
        nativeKeyboardHeight = info.keyboardHeight;
        updateKeyboardHeight();
      });
      listenKeyboard("keyboardWillHide", () => {
        nativeKeyboardHeight = 0;
        updateKeyboardHeight();
        resetPageScroll();
      });
    }
  }
} catch (error) {
  console.warn("Keyboard initialization failed:", error);
}

const els = {
  list: $("schedule-list"),
  count: $("task-count"),
  modal: $("modal"),
  form: $("schedule-form"),
  title: $("f-title"),
  time: $("f-time"),
  repeat: $("f-repeat"),
  modes: $("repeat-modes"),
  repeatLabel: $("repeat-select-label"),
  weeklyPicker: $("weekly-picker"),
  endsMode: $("f-ends-mode"),
  endsNumber: $("f-ends-n"),
  endsLabel: $("ends-label"),
  weeklyDays: $("weekly-days"),
  eyebrow: $("modal-eyebrow"),
  modalTitle: $("modal-title"),
  save: $("save-btn"),
  addWrap: $("floating-add"),
  waveform: $("waveform"),
  record: $("record-btn"),
  timer: $("timer"),
};
const doneModal = $("done-modal");
const doneDate = $("done-date");

const monthSteps = { monthly: 1, "two-months": 2, "three-months": 3, "six-months": 6, yearly: 12 };
const repeatEveryValues = {
  daily: { every: 1, unit: "days" },
  weekly: { every: 1, unit: "weeks" },
  monthly: { every: 1, unit: "months" },
  "two-months": { every: 2, unit: "months" },
  "three-months": { every: 3, unit: "months" },
  "six-months": { every: 6, unit: "months" },
  yearly: { every: 1, unit: "years" },
};
const repeatEveryAllowed = {
  minute: Array.from({ length: 99 }, (_, index) => index + 1),
  hour: Array.from({ length: 99 }, (_, index) => index + 1),
  days: [1],
  weeks: [1],
  months: [1, 2, 3, 6],
  years: [1],
};
let previousRepeatEvery = 1;

function syncRepeatFromEvery() {
  const every = Number($("f-every-n").value);
  const unit = $("f-every-unit").value;
  if (isShortUnit(unit)) {
    els.repeat.value = "interval";
    return;
  }
  const repeat = Object.entries(repeatEveryValues).find(([, value]) => value.every === every && value.unit === unit)?.[0];
  if (!repeat) throw new Error(`Unsupported repeat interval: ${every} ${unit}.`);
  els.repeat.value = repeat;
}

function syncEveryFromRepeat(savedInterval = null) {
  const interval = els.repeat.value === "interval" ? savedInterval : repeatEveryValues[els.repeat.value];
  if (!interval) throw new Error(`Unsupported repeat value: ${els.repeat.value}.`);
  const number = $("f-every-n");
  const unit = $("f-every-unit");
  number.value = String(interval.every);
  unit.value = interval.unit;
  const allowed = repeatEveryAllowed[unit.value];
  number.min = String(allowed[0]);
  number.max = String(allowed[allowed.length - 1]);
  number.readOnly = allowed.length === 1;
  previousRepeatEvery = interval.every;
  refreshCustomDropdowns();
}

function toISO(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toHHMM(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function ceilToMinute(date) {
  const result = new Date(date);
  const hasRemainder = result.getSeconds() > 0 || result.getMilliseconds() > 0;
  result.setSeconds(0, 0);
  if (hasRemainder) result.setMinutes(result.getMinutes() + 1);
  return result;
}

function todayISO() {
  return toISO(new Date());
}

function computeStaticDefaults(n, unit) {
  const today = new Date();
  if (unit === "minute" || unit === "hour") {
    const time = ceilToMinute(new Date(Date.now() + n * SHORT_UNIT_MS[unit]));
    return { time: toHHMM(time), startDate: toISO(time) };
  }
  const start = unit === "days" ? addDays(today, n)
    : unit === "weeks" ? addDays(today, n * 7) : today;
  return { time: toHHMM(today), startDate: toISO(start) };
}

function computeDynamicDefaults(n, unit) {
  const today = new Date();
  if (unit === "minute" || unit === "hour") {
    const time = ceilToMinute(new Date(Date.now() + n * SHORT_UNIT_MS[unit]));
    return { time: toHHMM(time), dueDate: toISO(time) };
  }
  const due = unit === "day" ? addDays(today, n)
    : unit === "week" ? addDays(today, n * 7) : today;
  return { time: toHHMM(today), dueDate: toISO(due) };
}

function parseISO(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, count) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

function addMonths(date, count) {
  const target = new Date(date.getFullYear(), date.getMonth() + count, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

function occurrenceDate(item, n) {
  if (item.repeat === "interval") {
    const startAt = startAtOf(item);
    const period = item.interval.every * SHORT_UNIT_MS[item.interval.unit];
    const firstFuture = startAt > Date.now()
      ? startAt
      : startAt + Math.ceil((Date.now() - startAt) / period) * period;
    return new Date(firstFuture + (n - 1) * period);
  }
  const start = parseISO(item.startDate);
  if (item.repeat === "daily") return addDays(start, n - 1);
  if (item.repeat === "weekly" && item.repeatDays.length) {
    let found = 0;
    for (let i = 0; i < 7 * n; i++) {
      const date = addDays(start, i);
      if (item.repeatDays.includes(weekDays[date.getDay()].name) && ++found === n) return date;
    }
    return addDays(start, 7 * n);
  }
  if (item.repeat === "weekly") return addDays(start, (n - 1) * 7);
  if (monthSteps[item.repeat]) return addMonths(start, (n - 1) * monthSteps[item.repeat]);
  return start;
}

function startAtOf(item) {
  return new Date(`${item.startDate}T${item.time}:00`).getTime();
}

function isFinished(item) {
  if (item.repeat === "dynamic") return Boolean(item.endAfter) && (item.doneCount || 0) >= item.endAfter;
  if (item.repeat === "interval") return Boolean(item.endAfter) && Date.now() > occurrenceDate(item, item.endAfter).getTime();
  if (!item.endAfter || !item.startDate) return false;
  return toISO(new Date()) > toISO(occurrenceDate(item, item.endAfter));
}

function repeatSummary(repeat, days, endAfter = 0, interval = null) {
  let text;
  if (repeat === "dynamic") {
    const units = { minute: "minute", hour: "hour", day: "day", week: "week", month: "month", year: "year" };
    const unit = units[interval?.unit] || "month";
    const every = Number(interval?.every) || 3;
    text = `Every ${every} ${unit}${every === 1 ? "" : "s"} · after done`;
  } else if (repeat === "interval") {
    const unit = interval?.unit || "minute";
    const every = Number(interval?.every) || 1;
    text = `Every ${every} ${unit}${every === 1 ? "" : "s"}`;
  } else if (repeat === "weekly" && days.length) {
    text = `Every week · ${days.map((day) => day.slice(0, 3)).join(", ")}`;
  } else {
    const found = repeatOptions.find((option) => option.value === repeat);
    text = found ? found.label : "Only once";
  }
  return endAfter ? `${text} · ${endAfter} times` : text;
}

function shortDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parseISO(value));
}

function dueLabel(item) {
  if (isShortUnit(item.interval?.unit)) {
    const dueAt = new Date(`${item.dueDate}T${item.time}:00`).getTime();
    const remaining = dueAt - Date.now();
    const absolute = Math.abs(remaining);
    if (absolute < 3600000) {
      const minutes = Math.max(1, Math.ceil(absolute / 60000));
      return {
        text: remaining < 0 ? `Overdue · ${minutes} min` : `Due in ${minutes} min`,
        overdue: remaining < 0,
      };
    }
    if (absolute < 86400000) {
      const hours = Math.max(1, Math.ceil(absolute / 3600000));
      return {
        text: remaining < 0 ? `Overdue · ${hours} hr` : `Due in ${hours} hr`,
        overdue: remaining < 0,
      };
    }
  }
  const due = parseISO(item.dueDate);
  const today = parseISO(toISO(new Date()));
  const daysUntilDue = Math.round((Date.UTC(due.getFullYear(), due.getMonth(), due.getDate())
    - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
  if (daysUntilDue < 0) {
    const daysOverdue = Math.abs(daysUntilDue);
    return { text: `Overdue · ${daysOverdue} ${daysOverdue === 1 ? "day" : "days"}`, overdue: true };
  }
  if (daysUntilDue === 0) return { text: "Due today", overdue: false };
  if (daysUntilDue === 1) return { text: "Due tomorrow", overdue: false };
  return {
    text: `Due ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(due)}`,
    overdue: false,
  };
}

function formatTime(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const period = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function renderSchedule() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
  } catch {
    // The schedule still works for this page view when browser storage is unavailable.
  }
  const visibleSchedule = schedule.filter((item) => !isFinished(item));
  els.count.textContent = `${visibleSchedule.length} ${visibleSchedule.length === 1 ? "task" : "tasks"}`;
  const orderedSchedule = [...visibleSchedule].sort((first, second) => second.id - first.id);
  els.list.innerHTML = orderedSchedule.map((item) => {
    const due = item.repeat === "dynamic" ? dueLabel(item) : null;
    const startsLater = item.repeat !== "dynamic" && item.startDate > toISO(new Date());
    const detail = item.repeat === "dynamic" || item.repeat === "interval"
      ? repeatSummary(item.repeat, item.repeatDays, item.endAfter, item.interval)
      : startsLater ? `${item.detail} · Starts ${shortDate(item.startDate)}` : item.detail;
    return `
    <article class="schedule-item" data-id="${item.id}">
      <time>${escapeHtml(formatTime(item.time))}</time>
      <span class="schedule-accent ${item.accent}"></span>
      <span class="schedule-copy">
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(detail)}</small>
      </span>
      <span class="schedule-duration ${due ? `due-label${due.overdue ? " overdue-label" : ""}` : ""}">${escapeHtml(due ? due.text : item.duration)}</span>
      ${item.repeat === "dynamic" ? `<button class="mark-done-button" type="button" data-action="done" aria-label="Mark ${escapeHtml(item.title)} done">${icon("check", 15)}</button>` : "<span></span>"}
      <div class="event-menu-wrap">
        <button class="event-menu-trigger" type="button" data-action="menu" aria-label="More options for ${escapeHtml(item.title)}" aria-expanded="${openMenuId === item.id}">${icon("more", 18)}</button>
        ${openMenuId === item.id ? `
          <div class="event-menu" role="menu">
            ${item.repeat === "dynamic" ? `<button type="button" role="menuitem" data-action="done">${icon("check", 15)}Mark done</button>` : ""}
            <button type="button" role="menuitem" data-action="edit">${icon("edit", 15)}Edit</button>
            <button class="delete-option" type="button" role="menuitem" data-action="delete">${icon("trash", 15)}Delete</button>
          </div>` : ""}
      </div>
    </article>`;
  }).join("");
}

function renderWeekly() {
  els.weeklyDays.innerHTML = weekDays.map((day) => {
    const selected = draftDays.includes(day.name);
    return `<button class="${selected ? "selected" : ""}" type="button" aria-label="${day.name}" aria-pressed="${selected}" data-day="${day.name}">${day.short}</button>`;
  }).join("");
}

function setMode(mode) {
  closeOpenDropdown();
  draftMode = mode;
  hideModeHint();
  els.modes.querySelectorAll("button").forEach((button) => button.classList.toggle("selected", button.dataset.mode === mode));
  els.repeatLabel.hidden = mode !== "repeat";
  $("static-start-label").hidden = mode !== "repeat";
  els.weeklyPicker.hidden = mode !== "weekly";
  $("dynamic-due-label").hidden = mode !== "dynamic";
  $("dynamic-interval").hidden = mode !== "dynamic";
  $("f-due-date").required = mode === "dynamic";
  $("f-interval").required = mode === "dynamic";
  $("once-date-label").hidden = mode !== "once";
  els.endsLabel.hidden = mode === "once";
  if (mode === "repeat") applyStaticDefaults();
  if (mode === "dynamic") applyDynamicDefaults();
}

function showScreen(name) {
  screen = name;
  ["home", "compose", "audio"].forEach((screenName) => { $(`screen-${screenName}`).hidden = screenName !== name; });
  els.addWrap.hidden = name !== "home";
}

function renderWaveform() {
  const bars = [12, 22, 38, 58, 76, 90, 82, 72, 60, 46, 36, 27, 20, 14, 22, 30, 42, 56, 68, 60, 48, 36, 27, 19, 13];
  els.waveform.innerHTML = bars.map((height, index) => `<span style="height:${height}px;animation-delay:${index * -45}ms"></span>`).join("");
}

function setRecording(value) {
  recording = value;
  els.waveform.classList.toggle("is-active", recording);
  els.record.classList.toggle("recording", recording);
  els.record.setAttribute("aria-label", recording ? "Pause recording" : "Start recording");
  els.timer.textContent = recording ? "00:00:27" : "00:00:26";
}

function openModal(item) {
  closeOpenDropdown();
  hideModeHint();
  editingId = item ? item.id : null;
  userEditedTime = false;
  userEditedDate = false;
  userEditedDueDate = false;
  els.title.value = item ? item.title : "";
  els.time.value = item ? item.time : toHHMM(new Date());
  const today = todayISO();
  const onceDate = $("f-once-date");
  onceDate.value = item?.repeat === "once" ? item.startDate || today : today;
  if (item?.repeat === "once") onceDate.removeAttribute("min");
  else onceDate.min = today;
  $("f-start-date").value = item?.startDate || today;
  if (item) $("f-start-date").removeAttribute("min");
  else $("f-start-date").min = today;
  const mode = !item || item.repeat === "once" ? "once"
    : item.repeat === "dynamic" ? "dynamic"
    : item.repeat === "weekly" && item.repeatDays.length ? "weekly" : "repeat";
  els.repeat.value = mode === "repeat" ? item.repeat : "daily";
  setEndAfter(item?.endAfter || 0);
  $("f-due-date").value = item?.repeat === "dynamic" ? item.dueDate : toISO(new Date());
  if (item?.repeat === "dynamic") $("f-due-date").removeAttribute("min");
  else $("f-due-date").min = today;
  $("f-interval").value = item?.repeat === "dynamic" ? item.interval.every : 3;
  $("f-interval-unit").value = item?.repeat === "dynamic" ? item.interval.unit : "month";
  refreshCustomDropdowns();
  draftDays = item && item.repeatDays.length ? [...item.repeatDays] : ["Monday"];
  els.eyebrow.textContent = item ? "UPDATE SCHEDULE" : "ADD TO SCHEDULE";
  els.modalTitle.textContent = item ? "Edit Schedule" : "New Schedule";
  els.save.textContent = item ? "Save changes" : "Add";
  openMenuId = null;
  renderSchedule();
  renderWeekly();
  setMode(mode);
  els.modal.classList.add("is-open");
  els.title.focus({ preventScroll: true });
  syncEveryFromRepeat(item?.repeat === "interval" ? item.interval : null);
}

function openDoneModal(id) {
  const item = schedule.find((entry) => entry.id === id && entry.repeat === "dynamic");
  if (!item) return;
  openMenuId = null;
  renderSchedule();
  doneModal.dataset.eventId = String(id);
  doneDate.value = toISO(new Date());
  doneDate.max = toISO(new Date());
  doneModal.classList.add("is-open");
}

function markDynamicDoneNow(id) {
  const completedAt = Date.now();
  schedule = schedule.map((item) => {
    if (item.id !== id || item.repeat !== "dynamic" || !isShortUnit(item.interval?.unit)) return item;
    const dueAt = new Date(completedAt + item.interval.every * SHORT_UNIT_MS[item.interval.unit]);
    return {
      ...item,
      doneCount: (item.doneCount || 0) + 1,
      lastDone: toISO(new Date(completedAt)),
      dueDate: toISO(dueAt),
      time: `${String(dueAt.getHours()).padStart(2, "0")}:${String(dueAt.getMinutes()).padStart(2, "0")}`,
    };
  });
  openMenuId = null;
  renderSchedule();
  scheduleAll();
}

function closeDoneModal() {
  doneModal.classList.remove("is-open");
  delete doneModal.dataset.eventId;
}

function closeModal() {
  closeOpenDropdown();
  hideModeHint();
  els.modal.classList.remove("is-open");
  editingId = null;
  resetPageScroll();
}

document.querySelectorAll("[data-icon]").forEach((element) => {
  element.innerHTML = icon(element.dataset.icon, Number(element.dataset.size) || 20);
});

els.repeat.innerHTML = repeatOptions
  .filter((option) => option.value !== "once")
  .map((option) => `<option value="${option.value}">${option.label}</option>`).join("") +
  '<option value="interval">Interval</option>';
const customDropdowns = new Map();
let openCustomDropdown = null;

function closeOpenDropdown() {
  if (!openCustomDropdown) return;
  openCustomDropdown.close();
}

function refreshCustomDropdowns() {
  customDropdowns.forEach((dropdown) => dropdown.refresh());
}

function getEndAfter() {
  if (els.endsMode.value === "never") return 0;
  const value = Number(els.endsNumber.value);
  if (!Number.isFinite(value)) return 2;
  return Math.min(99, Math.max(2, Math.trunc(value)));
}

function setEndAfter(n) {
  if (!n) {
    els.endsMode.value = "never";
    els.endsNumber.value = "";
    els.endsNumber.readOnly = true;
  } else {
    const value = Number(n);
    els.endsMode.value = "times";
    els.endsNumber.value = String(Number.isFinite(value) ? Math.min(99, Math.max(2, Math.trunc(value))) : 2);
    els.endsNumber.readOnly = false;
  }
  refreshCustomDropdowns();
}

function makeDropdown(selectEl) {
  const wrapper = selectEl.closest(".select-wrap");
  if (!wrapper) throw new Error(`Custom dropdown requires a .select-wrap for #${selectEl.id}.`);

  selectEl.hidden = true;
  wrapper.classList.add("has-custom-dropdown");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "custom-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const label = document.createElement("span");
  const chevron = document.createElement("span");
  chevron.className = "custom-select-chevron";
  chevron.setAttribute("aria-hidden", "true");
  trigger.append(label, chevron);

  const list = document.createElement("div");
  list.className = "custom-select-list";
  list.id = `${selectEl.id}-options`;
  list.setAttribute("role", "listbox");
  list.hidden = true;
  trigger.setAttribute("aria-controls", list.id);
  wrapper.append(trigger, list);

  const refresh = () => {
    const selected = selectEl.selectedOptions[0];
    label.textContent = selected?.textContent ?? "";
    list.replaceChildren(...Array.from(selectEl.options, (option) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "custom-select-option";
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(option.value === selectEl.value));
      row.dataset.value = option.value;
      const text = document.createElement("span");
      text.textContent = option.textContent;
      row.append(text);
      if (option.value === selectEl.value) {
        const check = document.createElement("span");
        check.className = "custom-select-check";
        check.innerHTML = icon("check", 16);
        check.setAttribute("aria-hidden", "true");
        row.append(check);
      }
      return row;
    }));
  };

  const close = () => {
    list.hidden = true;
    list.classList.remove("opens-up", "no-space");
    trigger.setAttribute("aria-expanded", "false");
    if (openCustomDropdown === dropdown) openCustomDropdown = null;
  };

  const open = () => {
    if (openCustomDropdown && openCustomDropdown !== dropdown) openCustomDropdown.close();
    window.clearTimeout(focusScrollTimer);
    focusScrollTimer = null;
    openCustomDropdown = dropdown;
    refresh();
    list.classList.remove("opens-up");
    list.style.maxHeight = "200px";
    list.hidden = false;
    trigger.setAttribute("aria-expanded", "true");

    const form = wrapper.closest("form");
    if (form) {
      const getSpace = () => {
        const formRect = form.getBoundingClientRect();
        const triggerRect = trigger.getBoundingClientRect();
        return {
          below: formRect.bottom - triggerRect.bottom,
          above: triggerRect.top - formRect.top,
        };
      };
      let space = getSpace();
      const minimumRowsHeight = 140;
      const scrollForm = (direction, amount) => {
        const maxScroll = form.scrollHeight - form.clientHeight;
        if (direction === "down") {
          form.scrollTop += Math.max(0, Math.min(amount, maxScroll - form.scrollTop));
        } else {
          form.scrollTop -= Math.min(amount, form.scrollTop);
        }
      };

      if (space.above < 0) {
        scrollForm("up", -space.above);
        space = getSpace();
      } else if (space.below < 0) {
        scrollForm("down", -space.below);
        space = getSpace();
      }

      if (Math.max(space.below, space.above) < minimumRowsHeight) {
        if (space.below >= space.above) {
          scrollForm("down", Math.min(minimumRowsHeight - space.below, Math.max(0, space.above)));
          space = getSpace();
          if (Math.max(space.below, space.above) < minimumRowsHeight) {
            scrollForm("up", Math.min(minimumRowsHeight - space.above, Math.max(0, space.below)));
          }
        } else {
          scrollForm("up", Math.min(minimumRowsHeight - space.above, Math.max(0, space.below)));
          space = getSpace();
          if (Math.max(space.below, space.above) < minimumRowsHeight) {
            scrollForm("down", Math.min(minimumRowsHeight - space.below, Math.max(0, space.above)));
          }
        }
        space = getSpace();
      }

      const availableSpace = Math.min(200, Math.max(space.below, space.above));
      const listHeight = Math.max(0, availableSpace - 8);
      const listNeeds = Math.min(200, list.scrollHeight);
      const opensUp = space.below < listNeeds && space.above > space.below;
      list.style.maxHeight = `${listHeight}px`;
      list.classList.toggle("opens-up", opensUp);
      list.classList.toggle("no-space", availableSpace < 8);
    }

    const selectedOption = [...list.querySelectorAll('[role="option"]')].find((option) => option.dataset.value === selectEl.value);
    if (selectedOption) {
      const listTop = list.getBoundingClientRect().top;
      const optionTop = selectedOption.getBoundingClientRect().top;
      const optionBottom = selectedOption.getBoundingClientRect().bottom;
      if (optionTop < listTop) list.scrollTop -= listTop - optionTop;
      else if (optionBottom > listTop + list.clientHeight) list.scrollTop += optionBottom - listTop - list.clientHeight;
    }
  };

  const selectOption = (option) => {
    if (!option) return;
    selectEl.value = option.dataset.value;
    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    refresh();
    close();
    trigger.focus();
  };

  trigger.addEventListener("click", () => {
    if (list.hidden) open();
    else close();
  });
  trigger.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (list.hidden) open();
    const options = [...list.querySelectorAll('[role="option"]')];
    const selectedIndex = options.findIndex((option) => option.getAttribute("aria-selected") === "true");
    options[Math.max(0, selectedIndex)]?.focus();
  });
  list.addEventListener("click", (event) => {
    const option = event.target.closest('[role="option"]');
    if (option) selectOption(option);
  });
  list.addEventListener("keydown", (event) => {
    const options = [...list.querySelectorAll('[role="option"]')];
    const currentIndex = options.indexOf(event.target.closest('[role="option"]'));
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      trigger.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const offset = event.key === "ArrowDown" ? 1 : -1;
      options[Math.min(options.length - 1, Math.max(0, currentIndex + offset))]?.focus();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(options[currentIndex]);
    }
  });
  selectEl.addEventListener("change", refresh);

  const dropdown = { close, refresh, wrapper };
  customDropdowns.set(selectEl, dropdown);
  refresh();
  return dropdown;
}

makeDropdown(els.repeat);
makeDropdown(els.endsMode);
makeDropdown($("f-interval-unit"));
makeDropdown($("f-every-unit"));

const repeatEveryNumber = $("f-every-n");
const repeatEveryUnit = $("f-every-unit");
const endsNumber = els.endsNumber;
let userEditedTime = false;
let userEditedDate = false;
let userEditedDueDate = false;

function applyStaticDefaults() {
  if (editingId !== null || draftMode !== "repeat") return;
  const defaults = computeStaticDefaults(Number(repeatEveryNumber.value), repeatEveryUnit.value);
  if (!userEditedTime) els.time.value = defaults.time;
  if (!userEditedDate) $("f-start-date").value = defaults.startDate;
}

function applyDynamicDefaults() {
  if (editingId !== null || draftMode !== "dynamic") return;
  const defaults = computeDynamicDefaults(Number($("f-interval").value), $("f-interval-unit").value);
  if (!userEditedTime) els.time.value = defaults.time;
  if (!userEditedDueDate) $("f-due-date").value = defaults.dueDate;
}

els.time.addEventListener("input", () => { userEditedTime = true; });
$("f-start-date").addEventListener("input", () => { userEditedDate = true; });
$("f-due-date").addEventListener("input", () => { userEditedDueDate = true; });
$("f-start-date").addEventListener("change", () => {
  const startDate = $("f-start-date");
  if (editingId === null && startDate.value < todayISO()) startDate.value = todayISO();
});
$("f-due-date").addEventListener("change", () => {
  const dueDate = $("f-due-date");
  if (editingId === null && dueDate.value < todayISO()) dueDate.value = todayISO();
});
$("f-start-date").addEventListener("invalid", (event) => {
  if (editingId !== null || draftMode !== "repeat" || $("f-start-date").value >= todayISO()) return;
  event.preventDefault();
  $("start-date-error").hidden = false;
});

els.endsMode.addEventListener("change", () => {
  const times = els.endsMode.value === "times";
  endsNumber.readOnly = !times;
  if (times && !endsNumber.value) endsNumber.value = "2";
  if (!times) endsNumber.value = "";
});

endsNumber.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
  event.preventDefault();
  const value = Number(endsNumber.value);
  const current = Number.isFinite(value) ? Math.trunc(value) : 2;
  const next = event.key === "ArrowUp" ? Math.min(99, current + 1) : Math.max(2, current - 1);
  endsNumber.value = String(Math.min(99, Math.max(2, next)));
});

endsNumber.addEventListener("blur", () => {
  if (els.endsMode.value !== "times") return;
  endsNumber.value = String(getEndAfter());
});

repeatEveryNumber.addEventListener("input", () => {
  const allowed = repeatEveryAllowed[repeatEveryUnit.value];
  const value = Number(repeatEveryNumber.value);
  if (!Number.isInteger(value) || !allowed.includes(value)) {
    const next = value > previousRepeatEvery
      ? allowed.find((number) => number >= value) ?? allowed[allowed.length - 1]
      : [...allowed].reverse().find((number) => number <= value) ?? allowed[0];
    repeatEveryNumber.value = String(next);
  }
  previousRepeatEvery = Number(repeatEveryNumber.value);
  syncRepeatFromEvery();
  applyStaticDefaults();
});

repeatEveryNumber.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
  event.preventDefault();
  const allowed = repeatEveryAllowed[repeatEveryUnit.value];
  const value = Number(repeatEveryNumber.value);
  const next = event.key === "ArrowUp"
    ? allowed.find((number) => number > value) ?? allowed[allowed.length - 1]
    : [...allowed].reverse().find((number) => number < value) ?? allowed[0];
  repeatEveryNumber.value = String(next);
  previousRepeatEvery = next;
  syncRepeatFromEvery();
  applyStaticDefaults();
});

repeatEveryUnit.addEventListener("change", () => {
  const allowed = repeatEveryAllowed[repeatEveryUnit.value];
  repeatEveryNumber.min = String(allowed[0]);
  repeatEveryNumber.max = String(allowed[allowed.length - 1]);
  repeatEveryNumber.readOnly = allowed.length === 1;
  repeatEveryNumber.style.opacity = allowed.length === 1 ? ".55" : "";
  repeatEveryNumber.value = String(allowed[0]);
  previousRepeatEvery = allowed[0];
  syncRepeatFromEvery();
  userEditedTime = false;
  userEditedDate = false;
  applyStaticDefaults();
});

const dynamicEveryNumber = $("f-interval");
const dynamicEveryUnit = $("f-interval-unit");

dynamicEveryNumber.addEventListener("input", applyDynamicDefaults);
dynamicEveryNumber.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
  event.preventDefault();
  const value = Number(dynamicEveryNumber.value) || 1;
  dynamicEveryNumber.value = String(Math.min(99, Math.max(1, value + (event.key === "ArrowUp" ? 1 : -1))));
  applyDynamicDefaults();
});

dynamicEveryUnit.addEventListener("change", () => {
  userEditedTime = false;
  userEditedDueDate = false;
  applyDynamicDefaults();
});

document.addEventListener("click", (event) => {
  if (openCustomDropdown && !openCustomDropdown.wrapper.contains(event.target)) closeOpenDropdown();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && openCustomDropdown) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeOpenDropdown();
  }
}, true);

els.modes.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (button) setMode(button.dataset.mode);
});

const modeHint = $("mode-hint");

function hideModeHint() {
  modeHint.hidden = true;
  modeHint.textContent = "";
  els.modes.querySelectorAll(".help-btn").forEach((button) => button.setAttribute("aria-expanded", "false"));
}

els.modal.addEventListener("click", (event) => {
  const helpButton = event.target.closest(".help-btn");
  if (!helpButton) {
    hideModeHint();
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const isExpanded = helpButton.getAttribute("aria-expanded") === "true";
  hideModeHint();
  if (isExpanded) return;

  modeHint.textContent = modeHelp[helpButton.dataset.help];
  modeHint.hidden = false;
  helpButton.setAttribute("aria-expanded", "true");
});

els.list.addEventListener("click", (event) => {
  const actionElement = event.target.closest("[data-action]");
  const card = event.target.closest(".schedule-item");
  if (!actionElement || !card) {
    if (openMenuId !== null) { openMenuId = null; renderSchedule(); }
    return;
  }
  const id = Number(card.dataset.id);
  const action = actionElement.dataset.action;
  if (action === "menu") {
    openMenuId = openMenuId === id ? null : id;
    renderSchedule();
  } else if (action === "edit") {
    openModal(schedule.find((item) => item.id === id));
  } else if (action === "done") {
    const item = schedule.find((entry) => entry.id === id);
    if (item?.repeat === "dynamic" && isShortUnit(item.interval?.unit)) markDynamicDoneNow(id);
    else openDoneModal(id);
  } else if (action === "delete") {
    schedule = schedule.filter((item) => item.id !== id);
    openMenuId = null;
    renderSchedule();
    scheduleAll();
  }
});

els.weeklyDays.addEventListener("click", (event) => {
  const button = event.target.closest("[data-day]");
  if (!button) return;
  const day = button.dataset.day;
  draftDays = draftDays.includes(day) ? draftDays.filter((selectedDay) => selectedDay !== day) : [...draftDays, day];
  renderWeekly();
});

const onceDate = $("f-once-date");
const timeError = $("time-error");

onceDate.addEventListener("change", () => {
  if (editingId === null && onceDate.value < todayISO()) onceDate.value = todayISO();
});

els.form.addEventListener("input", (event) => {
  timeError.hidden = true;
  if (event.target.id === "f-start-date") $("start-date-error").hidden = true;
});

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = els.title.value.trim();
  if (!title) return;

  const repeat = draftMode === "dynamic" ? "dynamic"
    : draftMode === "once" ? "once" : draftMode === "weekly" ? "weekly" : els.repeat.value;
  const repeatDays = draftMode === "weekly" ? [...draftDays] : [];
  const endAfter = draftMode === "once" ? 0 : getEndAfter();
  const interval = draftMode === "dynamic"
    ? { every: Number($("f-interval").value), unit: $("f-interval-unit").value }
    : draftMode === "repeat" && isShortUnit($("f-every-unit").value)
      ? { every: Number($("f-every-n").value), unit: $("f-every-unit").value }
    : null;
  if (draftMode === "dynamic" && (!Number.isInteger(interval.every) || interval.every < 1 || interval.every > 99)) return;
  if (repeat === "interval" && (!Number.isInteger(interval?.every) || interval.every < 1 || interval.every > 99)) return;
  let startDate = draftMode === "once" ? onceDate.value
    : draftMode === "dynamic" ? undefined
      : draftMode === "repeat" ? ($("f-start-date").value || todayISO()) : todayISO();
  let time = els.time.value;
  const startDateError = $("start-date-error");
  startDateError.hidden = true;
  if (editingId === null && draftMode === "repeat" && startDate < todayISO()) {
    startDateError.hidden = false;
    return;
  }
  let fireAt;
  if (repeat === "once") {
    fireAt = new Date(`${startDate}T${time}:00`).getTime();
    if (!Number.isFinite(fireAt) || fireAt <= Date.now()) {
      timeError.hidden = false;
      return;
    }
  }
  const existingItem = editingId === null ? null : schedule.find((item) => item.id === editingId);
  const isFreshInterval = existingItem?.repeat !== "interval" || (!existingItem.endAfter && endAfter)
    || existingItem.startDate !== startDate || existingItem.time !== time;
  if (repeat === "interval" && isFreshInterval) {
    const period = interval.every * SHORT_UNIT_MS[interval.unit];
    const requestedStart = new Date(`${startDate}T${time}:00`).getTime();
    if (!Number.isFinite(requestedStart) || !period) return;
    if (requestedStart <= Date.now()) {
      const firstFuture = requestedStart + (Math.floor((Date.now() - requestedStart) / period) + 1) * period;
      const anchor = new Date(firstFuture);
      startDate = toISO(anchor);
      time = `${String(anchor.getHours()).padStart(2, "0")}:${String(anchor.getMinutes()).padStart(2, "0")}`;
    }
  }
  let detail = repeatSummary(repeat, repeatDays, endAfter, interval);
  if (draftMode === "repeat" && startDate > toISO(new Date())) {
    detail += ` · from ${shortDate(startDate)}`;
  }
  const dueDate = draftMode === "dynamic" ? $("f-due-date").value : undefined;
  if (editingId === null && draftMode === "dynamic" && dueDate < todayISO()) return;
  if (draftMode === "dynamic" && !dueDate) return;

  if (editingId !== null) {
    schedule = schedule.map((item) => {
      if (item.id !== editingId) return item;
      const autoLabel = item.duration === "Once" || item.duration === "Repeats";
      const updated = {
        ...item,
        fireAt: repeat === "once" ? fireAt : undefined,
        time,
        title,
        detail,
        repeat,
        repeatDays,
        endAfter,
        ...(startDate ? { startDate } : {}),
        duration: autoLabel ? (repeat === "once" ? "Once" : "Repeats") : item.duration,
      };
      if (draftMode === "dynamic") {
        delete updated.startDate;
        delete updated.fireAt;
        updated.doneCount = item.repeat === "dynamic" ? item.doneCount ?? 0 : 0;
        updated.dueDate = dueDate;
        updated.interval = interval;
        updated.lastDone = item.repeat === "dynamic" ? item.lastDone ?? null : null;
      } else {
        delete updated.doneCount;
        delete updated.dueDate;
        delete updated.lastDone;
        if (repeat === "interval") updated.interval = interval;
        else delete updated.interval;
      }
      return updated;
    });
  } else {
    const newItem = {
      id: Date.now(),
      time,
      title,
      detail,
      duration: repeat === "once" ? "Once" : "Repeats",
      accent: ["blue-accent", "orange-accent", "purple-accent"][schedule.length % 3],
      repeat,
      repeatDays,
    };
    if (repeat === "once") newItem.fireAt = fireAt;
    if (draftMode === "dynamic") {
      newItem.dueDate = dueDate;
      newItem.interval = interval;
      newItem.lastDone = null;
      newItem.endAfter = endAfter;
      newItem.doneCount = 0;
    } else {
      newItem.endAfter = endAfter;
      newItem.startDate = startDate;
      if (repeat === "interval") newItem.interval = interval;
    }
    schedule.push(newItem);
  }
  renderSchedule();
  scheduleAll();
  closeModal();
});

$("done-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = Number(doneModal.dataset.eventId);
  const chosenDate = doneDate.value;
  if (!chosenDate || chosenDate > toISO(new Date())) return;
  schedule = schedule.map((item) => {
    if (item.id !== id || item.repeat !== "dynamic") return item;
    const interval = item.interval || { every: 3, unit: "month" };
    const completedOn = parseISO(chosenDate);
    const every = Number(interval.every) || 3;
    const due = interval.unit === "day" ? addDays(completedOn, every)
      : interval.unit === "week" ? addDays(completedOn, every * 7)
        : addMonths(completedOn, every * (interval.unit === "year" ? 12 : 1));
    return { ...item, doneCount: (item.doneCount || 0) + 1, lastDone: chosenDate, dueDate: toISO(due) };
  });
  renderSchedule();
  scheduleAll();
  closeDoneModal();
});

$("add-btn").addEventListener("click", () => openModal(null));
$("modal-close").addEventListener("click", closeModal);
els.modal.addEventListener("mousedown", (event) => { if (event.target === els.modal) closeModal(); });
$("done-close").addEventListener("click", closeDoneModal);
doneModal.addEventListener("mousedown", (event) => { if (event.target === doneModal) closeDoneModal(); });
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (doneModal.classList.contains("is-open")) closeDoneModal();
  else if (els.modal.classList.contains("is-open")) closeModal();
});

$("compose-back").addEventListener("click", () => showScreen("home"));
$("audio-back").addEventListener("click", () => { showScreen("home"); setRecording(false); });
els.record.addEventListener("click", () => setRecording(!recording));
$("cancel-btn").addEventListener("click", () => setRecording(false));

$("schedule-date").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date());

renderWaveform();
renderSchedule();
showScreen("home");
window.setInterval(() => {
  if (schedule.some((item) => item.repeat === "dynamic" && isShortUnit(item.interval?.unit))) renderSchedule();
}, 30000);

/* ---------- Close the 3-dot menu on outside click or scroll ---------- */
function closeMenu() {
  if (openMenuId === null) return;
  openMenuId = null;
  renderSchedule();
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".event-menu-wrap")) closeMenu();
});

// scroll doesn't bubble, so listen in the capture phase
document.addEventListener("scroll", closeMenu, true);
document.addEventListener("wheel", closeMenu, { passive: true });
document.addEventListener("touchmove", closeMenu, { passive: true });

/* ---------- PWA: register the service worker outside native apps ---------- */
const isNative = window.Capacitor?.isNativePlatform?.();

if (!isNative && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.warn("Service worker failed:", error);
    });
  });
}

/* ---------- Alarms (Capacitor Local Notifications, Android app only) ---------- */
const LN = window.Capacitor?.Plugins?.LocalNotifications;
const weekdayNumber = { Sunday: 1, Monday: 2, Tuesday: 3, Wednesday: 4, Thursday: 5, Friday: 6, Saturday: 7 };

async function setupNotifications() {
  if (!isNative || !LN) return;
  await LN.requestPermissions();
  try { await LN.deleteChannel({ id: "alarms" }); } catch {}
  for (const s of ALARM_SOUNDS) {
    await LN.createChannel({
      id: channelFor(s.id),
      name: `Alarm sound: ${s.label}`,
      description: `Schedule alarms that play the ${s.label} sound`,
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: s.file,
    });
  }
  const exact = await LN.checkExactNotificationSetting();
  if (exact.exact_alarm !== "granted") await LN.changeExactNotificationSetting();
}

function nextOccurrence(hour, minute) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  if (date <= new Date()) date.setDate(date.getDate() + 1);
  return date;
}

// Future ring times for events that have a start date, using the existing occurrenceDate() rules.
function upcomingOccurrences(item, hour, minute, limit) {
  const times = [];
  const max = item.endAfter || 400;
  for (let n = 1; n <= max && times.length < limit; n++) {
    const when = occurrenceDate(item, n);
    when.setHours(hour, minute, 0, 0);
    if (when > new Date()) times.push(when);
  }
  return times;
}

async function scheduleAll() {
  if (!isNative || !LN) return;
  try {
    const pending = await LN.getPending();
    if (pending.notifications.length) await LN.cancel({ notifications: pending.notifications });

    const notifications = [];
    let changed = false;
    for (const item of schedule) {
      if (isFinished(item)) continue;
      const [hour, minute] = item.time.split(":").map(Number);
      const base = (Math.abs(item.id) % 20000000) * 100; // Android needs 32-bit notification IDs
      let n = 0;
      const add = (when, notificationId = base + n++) => notifications.push({
        id: notificationId, title: item.title, body: item.detail, channelId: channelFor(getSoundId()),
        schedule: { ...when, allowWhileIdle: true },
      });
      const hasStart = Boolean(item.startDate);

      if (item.repeat === "dynamic") {
        const dueAt = parseISO(item.dueDate);
        dueAt.setHours(hour, minute, 0, 0);
        if (Number.isNaN(dueAt.getTime())) {
          console.warn(`Skipping alarm for ${item.title}: invalid due date.`);
          continue;
        }
        if (isShortUnit(item.interval?.unit)) {
          if (dueAt > new Date()) add({ at: dueAt });
        } else if (dueAt > new Date()) add({ at: dueAt });
        else add({ at: nextOccurrence(hour, minute), every: "day" });
      } else if (item.repeat === "interval") {
        const every = Number(item.interval?.every);
        const unitMs = SHORT_UNIT_MS[item.interval?.unit];
        const startAt = startAtOf(item);
        if (!Number.isInteger(every) || every < 1 || !unitMs || !Number.isFinite(startAt)) {
          console.warn(`Skipping alarm for ${item.title}: invalid interval.`);
          continue;
        }
        const period = every * unitMs;
        const firstOccurrence = Math.max(1, Math.floor((Date.now() - startAt) / period) + 2);
        let scheduled = 0;
        for (let occurrence = firstOccurrence; scheduled < 24; occurrence++) {
          if (item.endAfter && occurrence > item.endAfter) break;
          add({ at: new Date(startAt + (occurrence - 1) * period) }, base + occurrence);
          scheduled++;
        }
      } else if (item.repeat === "once") {
        // Remember the first ring time so reopening the app never re-arms a one-time alarm that already rang.
        if (item.fireAt === undefined) { item.fireAt = nextOccurrence(hour, minute).getTime(); changed = true; }
        if (item.fireAt > Date.now()) add({ at: new Date(item.fireAt) });
      } else if (hasStart && item.endAfter) {
        // "Ends after N times": schedule each remaining occurrence individually.
        upcomingOccurrences(item, hour, minute, 50).forEach((at) => add({ at }));
      } else if (item.repeat === "daily" && item.startDate > toISO(new Date())) {
        const first = parseISO(item.startDate);
        first.setHours(hour, minute, 0, 0);
        add({ at: first, every: "day" });
      } else if (item.repeat === "daily") {
        add({ at: nextOccurrence(hour, minute), every: "day" });
      } else if (item.repeat === "weekly" && item.repeatDays.length) {
        item.repeatDays.forEach((day) => add({ on: { weekday: weekdayNumber[day], hour, minute } }));
      } else if (item.repeat === "weekly") {
        const [first] = hasStart ? upcomingOccurrences(item, hour, minute, 1) : [];
        add({ at: first || nextOccurrence(hour, minute), every: "week" });
      } else if (monthSteps[item.repeat]) {
        // Month-based repeats: schedule the next 24 occurrences; reopening the app refreshes them.
        if (hasStart) upcomingOccurrences(item, hour, minute, 24).forEach((at) => add({ at }));
        else add({ at: nextOccurrence(hour, minute), every: item.repeat === "yearly" ? "year" : "month" });
      }
    }
    if (changed) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule)); } catch {}
    }
    if (notifications.length) await LN.schedule({ notifications });
  } catch (error) {
    console.warn("Could not schedule alarms:", error);
  }
}

let alarmsStarted = false;
function startAlarms() {
  if (alarmsStarted) return;
  alarmsStarted = true;
  setupNotifications().then(scheduleAll).catch((error) => console.warn("Notification setup failed:", error));
}

/* ---------- Profile (Settings) ---------- */
const palette = [
  "linear-gradient(145deg, #374151, #64a3c7)",
  "linear-gradient(145deg, #7c3aed, #c084fc)",
  "linear-gradient(145deg, #ea580c, #fbbf24)",
  "linear-gradient(145deg, #059669, #6ee7b7)",
  "linear-gradient(145deg, #db2777, #f9a8d4)",
];

let profile = { name: "Jhon Dong", job: "Graphics Designer", color: 0, photo: "" };
try {
  const savedProfile = JSON.parse(localStorage.getItem("profile") || "{}");
  if (savedProfile && typeof savedProfile === "object") {
    profile = {
      name: typeof savedProfile.name === "string" ? savedProfile.name : profile.name,
      job: typeof savedProfile.job === "string" ? savedProfile.job : profile.job,
      color: Number.isInteger(savedProfile.color) && palette[savedProfile.color] ? savedProfile.color : profile.color,
      photo: typeof savedProfile.photo === "string" ? savedProfile.photo : profile.photo,
    };
  }
} catch {}
let draftColor = profile.color;
let draftPhoto = profile.photo;
let draftSound = getSoundId();

const profileModal = $("profile-modal");
const pName = $("p-name");
const pJob = $("p-job");
const soundDropdown = $("sound-dropdown");
const soundList = $("sound-list");
const soundTrigger = $("sound-trigger");
const soundTriggerText = $("sound-trigger-text");
const previewAudio = new Audio();

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function paintAvatar(element, name, color, photo) {
  element.textContent = photo ? "" : initials(name);
  element.style.background = photo ? `center / cover url("${photo}")` : palette[color];
}

function renderProfile() {
  $("profile-name").textContent = profile.name;
  $("profile-job").textContent = profile.job;
  paintAvatar($("avatar"), profile.name, profile.color, profile.photo);
  $("zoom-profile-name").textContent = profile.name;
  $("zoom-profile-job").textContent = profile.job;
  paintAvatar($("zoomed-avatar"), profile.name, profile.color, profile.photo);
}

/* ---------- First-launch welcome ---------- */
function needsOnboarding() {
  try {
    return localStorage.getItem("onboarded") === null && localStorage.getItem("profile") === null;
  } catch {
    return false;
  }
}

const welcome = $("welcome");
const wName = $("w-name");
const wJob = $("w-job");
const wSubmit = $("w-submit");

function showWelcome() {
  welcome.hidden = false;
  wName.focus({ preventScroll: true });
}

wName.addEventListener("input", () => { wSubmit.disabled = !wName.value.trim(); });

$("welcome-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = wName.value.trim();
  if (!name) return;
  profile = { name, job: wJob.value.trim(), color: profile.color, photo: profile.photo };
  try {
    localStorage.setItem("profile", JSON.stringify(profile));
    localStorage.setItem("onboarded", "1");
  } catch {}
  renderProfile();
  welcome.hidden = true;
  resetPageScroll();
  startAlarms();
});

function renderPreview() {
  paintAvatar($("preview-avatar"), pName.value, draftColor, draftPhoto);
  $("remove-photo").hidden = !draftPhoto;
  $("color-picker").innerHTML = palette.map((background, index) =>
    `<button type="button" class="${index === draftColor ? "selected" : ""}" data-color="${index}" aria-label="Color ${index + 1}" style="background:${background}"></button>`
  ).join("");
}

function renderSoundList() {
  soundList.innerHTML = ALARM_SOUNDS.map((sound) => {
    const selected = sound.id === draftSound;
    const soundIcon = selected
      ? `<span class="sound-icon">${icon("check", 16)}</span>`
      : `<button type="button" class="sound-icon" data-preview="${sound.id}" aria-label="Preview ${sound.label}">${icon("play", 16)}</button>`;
    return `<div class="sound-row" role="option" tabindex="0" aria-selected="${selected}" data-sound="${sound.id}"><span>${sound.label}</span>${soundIcon}</div>`;
  }).join("");
}

function setSoundListOpen(open) {
  soundList.hidden = !open;
  soundTrigger.setAttribute("aria-expanded", String(open));
  if (open) {
    soundList.querySelector(`[data-sound="${draftSound}"]`)?.scrollIntoView({ block: "nearest" });
  }
}

function openProfile() {
  pName.value = profile.name;
  pJob.value = profile.job;
  draftSound = getSoundId();
  soundTriggerText.textContent = ALARM_SOUNDS.find((sound) => sound.id === draftSound).label;
  setSoundListOpen(false);
  draftColor = profile.color;
  draftPhoto = profile.photo;
  renderPreview();
  renderSoundList();
  profileModal.classList.add("is-open");
}

function closeProfile() {
  setSoundListOpen(false);
  previewAudio.pause();
  previewAudio.currentTime = 0;
  profileModal.classList.remove("is-open");
  resetPageScroll();
}

$("settings-btn").addEventListener("click", openProfile);
$("profile-close").addEventListener("click", closeProfile);
profileModal.addEventListener("mousedown", (event) => { if (event.target === profileModal) closeProfile(); });
const avatarZoom = $("avatar-zoom");
function openAvatarZoom() {
  avatarZoom.classList.add("is-open");
}
function closeAvatarZoom() {
  avatarZoom.classList.remove("is-open");
}

$("profile-trigger").addEventListener("click", openAvatarZoom);
$("avatar-zoom-close").addEventListener("click", closeAvatarZoom);
avatarZoom.addEventListener("click", (event) => { if (event.target === avatarZoom) closeAvatarZoom(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!soundList.hidden) {
      setSoundListOpen(false);
      event.stopPropagation();
      return;
    }
    closeProfile();
    closeAvatarZoom();
  }
});

pName.addEventListener("input", renderPreview);
$("color-picker").addEventListener("click", (event) => {
  const button = event.target.closest("[data-color]");
  if (!button) return;
  draftColor = Number(button.dataset.color);
  renderPreview();
});

$("profile-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = pName.value.trim();
  if (!name) return;
  profile = { name, job: pJob.value.trim(), color: draftColor, photo: draftPhoto };
  try { localStorage.setItem("profile", JSON.stringify(profile)); } catch {}
  try { localStorage.setItem(SOUND_KEY, draftSound); } catch {}
  scheduleAll();
  renderProfile();
  closeProfile();
});

renderProfile();

function playSoundPreview(soundId) {
  const sound = ALARM_SOUNDS.find((item) => item.id === soundId);
  if (!sound) return;
  previewAudio.pause();
  previewAudio.currentTime = 0;
  previewAudio.src = "sounds/" + sound.file;
  previewAudio.play().catch(() => {});
}

soundDropdown.addEventListener("click", (event) => {
  const preview = event.target.closest("[data-preview]");
  if (preview && soundDropdown.contains(preview)) {
    event.stopPropagation();
    playSoundPreview(preview.dataset.preview);
    return;
  }
  if (event.target.closest("#sound-trigger")) {
    setSoundListOpen(soundList.hidden);
    return;
  }
  const row = event.target.closest(".sound-row");
  if (!row || !soundDropdown.contains(row)) return;
  draftSound = row.dataset.sound;
  soundTriggerText.textContent = ALARM_SOUNDS.find((sound) => sound.id === draftSound).label;
  renderSoundList();
  playSoundPreview(draftSound);
  setSoundListOpen(false);
});

soundList.addEventListener("keydown", (event) => {
  const row = event.target.closest(".sound-row");
  if (!row || !soundList.contains(row) || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  draftSound = row.dataset.sound;
  soundTriggerText.textContent = ALARM_SOUNDS.find((sound) => sound.id === draftSound).label;
  renderSoundList();
  playSoundPreview(draftSound);
  setSoundListOpen(false);
});

document.addEventListener("click", (event) => {
  if (!soundDropdown.contains(event.target)) setSoundListOpen(false);
});

$("preview-avatar").addEventListener("click", () => $("p-photo").click());

$("p-photo").addEventListener("change", (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file || !file.type.startsWith("image/")) return;

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const size = 256;
    const cropSize = Math.min(image.width, image.height);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(url);
      return;
    }
    context.drawImage(image, (image.width - cropSize) / 2, (image.height - cropSize) / 2, cropSize, cropSize, 0, 0, size, size);
    draftPhoto = canvas.toDataURL("image/jpeg", 0.85);
    URL.revokeObjectURL(url);
    renderPreview();
  };
  image.onerror = () => URL.revokeObjectURL(url);
  image.src = url;
});

$("remove-photo").addEventListener("click", () => {
  draftPhoto = "";
  renderPreview();
});

if (needsOnboarding()) showWelcome();
else startAlarms();