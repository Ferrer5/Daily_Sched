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

const STORAGE_KEY = "daily-schedule-events";
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

    return parsedSchedule.map((item, index) => ({
      ...item,
      id: item.id ?? Date.now() + index,
      accent: item.accent || ["blue-accent", "orange-accent", "purple-accent"][index % 3],
      repeat: item.repeat || "once",
      repeatDays: Array.isArray(item.repeatDays) ? item.repeatDays : [],
    }));
  } catch {
    return defaultSchedule;
  }
}

let schedule = loadSchedule();

const iconPaths = {
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
  mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  upload: '<path d="M12 16V4m0 0L8 8m4-4 4 4"/><path d="M5 14v5h14v-5"/>',
  spark: '<path d="m12 2 1.5 5.2L19 9l-5.5 1.8L12 16l-1.5-5.2L5 9l5.5-1.8L12 2ZM5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8L5 16Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
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
  weeklyDays: $("weekly-days"),
  eyebrow: $("modal-eyebrow"),
  modalTitle: $("modal-title"),
  save: $("save-btn"),
  addWrap: $("floating-add"),
  waveform: $("waveform"),
  record: $("record-btn"),
  timer: $("timer"),
};

function repeatSummary(repeat, days) {
  if (repeat === "weekly" && days.length) {
    return `Every week · ${days.map((day) => day.slice(0, 3)).join(", ")}`;
  }
  const found = repeatOptions.find((option) => option.value === repeat);
  return found ? found.label : "Only once";
}

function renderSchedule() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
  } catch {
    // The schedule still works for this page view when browser storage is unavailable.
  }
  els.count.textContent = `${schedule.length} ${schedule.length === 1 ? "task" : "tasks"}`;
  const orderedSchedule = [...schedule].sort((first, second) => first.time.localeCompare(second.time));
  els.list.innerHTML = orderedSchedule.map((item) => `
    <article class="schedule-item" data-id="${item.id}">
      <time>${escapeHtml(item.time)}</time>
      <span class="schedule-accent ${item.accent}"></span>
      <span class="schedule-copy">
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.detail)}</small>
      </span>
      <span class="schedule-duration">${escapeHtml(item.duration)}</span>
      <div class="event-menu-wrap">
        <button class="event-menu-trigger" type="button" data-action="menu" aria-label="More options for ${escapeHtml(item.title)}" aria-expanded="${openMenuId === item.id}">${icon("more", 18)}</button>
        ${openMenuId === item.id ? `
          <div class="event-menu" role="menu">
            <button type="button" role="menuitem" data-action="edit">${icon("edit", 15)}Edit</button>
            <button class="delete-option" type="button" role="menuitem" data-action="delete">${icon("trash", 15)}Delete</button>
          </div>` : ""}
      </div>
    </article>`).join("");
}

function renderWeekly() {
  els.weeklyDays.innerHTML = weekDays.map((day) => {
    const selected = draftDays.includes(day.name);
    return `<button class="${selected ? "selected" : ""}" type="button" aria-label="${day.name}" aria-pressed="${selected}" data-day="${day.name}">${day.short}</button>`;
  }).join("");
}

function setMode(mode) {
  draftMode = mode;
  els.modes.querySelectorAll("button").forEach((button) => button.classList.toggle("selected", button.dataset.mode === mode));
  els.repeatLabel.hidden = mode !== "repeat";
  els.weeklyPicker.hidden = mode !== "weekly";
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
  editingId = item ? item.id : null;
  els.title.value = item ? item.title : "";
  els.time.value = item ? item.time : "09:00";
  const mode = !item || item.repeat === "once" ? "once"
    : item.repeat === "weekly" && item.repeatDays.length ? "weekly" : "repeat";
  els.repeat.value = mode === "repeat" ? item.repeat : "daily";
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
}

function closeModal() {
  els.modal.classList.remove("is-open");
  editingId = null;
}

document.querySelectorAll("[data-icon]").forEach((element) => {
  element.innerHTML = icon(element.dataset.icon, Number(element.dataset.size) || 20);
});

els.repeat.innerHTML = repeatOptions
  .filter((option) => option.value !== "once")
  .map((option) => `<option value="${option.value}">${option.label}</option>`).join("");

els.modes.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (button) setMode(button.dataset.mode);
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
  } else if (action === "delete") {
    schedule = schedule.filter((item) => item.id !== id);
    openMenuId = null;
    renderSchedule();
  }
});

els.weeklyDays.addEventListener("click", (event) => {
  const button = event.target.closest("[data-day]");
  if (!button) return;
  const day = button.dataset.day;
  draftDays = draftDays.includes(day) ? draftDays.filter((selectedDay) => selectedDay !== day) : [...draftDays, day];
  renderWeekly();
});

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = els.title.value.trim();
  if (!title) return;

  const repeat = draftMode === "once" ? "once" : draftMode === "weekly" ? "weekly" : els.repeat.value;
  const repeatDays = draftMode === "weekly" ? [...draftDays] : [];
  const detail = repeatSummary(repeat, repeatDays);

  if (editingId !== null) {
    schedule = schedule.map((item) => item.id === editingId ? { ...item, time: els.time.value, title, detail, repeat, repeatDays } : item);
  } else {
    schedule.push({
      id: Date.now(),
      time: els.time.value,
      title,
      detail,
      duration: repeat === "once" ? "Once" : "Repeats",
      accent: ["blue-accent", "orange-accent", "purple-accent"][schedule.length % 3],
      repeat,
      repeatDays,
    });
  }
  renderSchedule();
  closeModal();
});

$("add-btn").addEventListener("click", () => openModal(null));
$("modal-close").addEventListener("click", closeModal);
els.modal.addEventListener("mousedown", (event) => { if (event.target === els.modal) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && els.modal.classList.contains("is-open")) closeModal(); });

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

/* ---------- PWA: register the service worker ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.warn("Service worker failed:", error);
    });
  });
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

const profileModal = $("profile-modal");
const pName = $("p-name");
const pJob = $("p-job");

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
}

function renderPreview() {
  paintAvatar($("preview-avatar"), pName.value, draftColor, draftPhoto);
  $("remove-photo").hidden = !draftPhoto;
  $("color-picker").innerHTML = palette.map((background, index) =>
    `<button type="button" class="${index === draftColor ? "selected" : ""}" data-color="${index}" aria-label="Color ${index + 1}" style="background:${background}"></button>`
  ).join("");
}

function openProfile() {
  pName.value = profile.name;
  pJob.value = profile.job;
  draftColor = profile.color;
  draftPhoto = profile.photo;
  renderPreview();
  profileModal.classList.add("is-open");
}

function closeProfile() {
  profileModal.classList.remove("is-open");
}

$("settings-btn").addEventListener("click", openProfile);
$("profile-close").addEventListener("click", closeProfile);
profileModal.addEventListener("mousedown", (event) => { if (event.target === profileModal) closeProfile(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeProfile(); });

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
  renderProfile();
  closeProfile();
});

renderProfile();

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