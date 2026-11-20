const SUPABASE_URL = "https://zohhimpltawkaflzxdxe.supabase.co";
const SUPABASE_KEY = "sb_publishable_1Ic64s3vJf3Q3eKr1w8fSQ_6oE_23gy";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = id => document.getElementById(id);
const app = $("app");
const authForm = $("authForm");
const loginTab = $("loginTab");
const registerTab = $("registerTab");
const role = $("role");
const username = $("username");
const password = $("password");
const className = $("className");
const classPassword = $("classPassword");
const teacherCode = $("teacherCode");
const teacherCodeField = $("teacherCodeField");
const classHint = $("classHint");
const submitBtn = $("submitBtn");
const message = $("message");

let mode = "login";
let currentUser = null;
let currentProfile = null;
let currentClass = null;
let realtimeChannel = null;
let presenceRefreshTimer = null;

const loadedChats = new Set();
const chatRenderState = new Map();

// ======================================
// ОПРЕДЕЛЕНИЕ УСТРОЙСТВА И ОРИЕНТАЦИИ
// ======================================

function isPhoneDevice() {
  if (typeof navigator === "undefined") return false;
  if (navigator.maxTouchPoints === 0) return false;
  const ua = navigator.userAgent || "";
  const isMobileUA = /Android.*Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini/i.test(ua);
  const minScreen = Math.min(window.screen?.width || 9999, window.screen?.height || 9999);
  return isMobileUA && minScreen <= 600;
}

function isPortraitScreen() {
  if (window.screen?.orientation?.type) {
    return window.screen.orientation.type.startsWith("portrait");
  }
  return window.innerHeight > window.innerWidth;
}

// ======================================
// SPLASH
// ======================================

const SPLASH_MIN_TIME = 900;
const splashStart = performance.now();

function hideSplash() {
  const splash = document.getElementById("splash");
  if (!splash) return;
  splash.classList.add("hide");
  setTimeout(() => splash.remove(), 600);
}

function finishSplash() {
  const elapsed = performance.now() - splashStart;
  setTimeout(hideSplash, Math.max(0, SPLASH_MIN_TIME - elapsed));
}

// ======================================
// ИКОНКИ
// ======================================

const ICONS = {
  attach: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
  send: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  sun: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  bell: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  gear: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
  logo: '<svg viewBox="0 0 32 32" width="24" height="24" fill="none"><path d="M9 5h14a7 7 0 0 1 7 7v8a7 7 0 0 1-7 7h-8l-7 5v-5a7 7 0 0 1-6-7v-8a7 7 0 0 1 7-7z" fill="#fff"/><circle cx="12" cy="16" r="1.7" fill="#10b981"/><circle cx="16" cy="16" r="1.7" fill="#10b981"/><circle cx="20" cy="16" r="1.7" fill="#10b981"/></svg>',
  emptyChat: '<svg viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="eg1" x1="20" y1="30" x2="120" y2="100"><stop stop-color="#10b981"/><stop offset="1" stop-color="#06b6d4"/></linearGradient><radialGradient id="eg2" cx="0.5" cy="0.5" r="0.5"><stop stop-color="#10b981" stop-opacity=".22"/><stop offset="1" stop-color="#06b6d4" stop-opacity="0"/></radialGradient></defs><circle cx="70" cy="60" r="55" fill="url(#eg2)"/><path d="M38 38h64a9 9 0 0 1 9 9v28a9 9 0 0 1-9 9H74l-14 12v-12H38a9 9 0 0 1-9-9V47a9 9 0 0 1 9-9z" fill="url(#eg1)"/><circle cx="56" cy="60" r="3.4" fill="#fff"/><circle cx="70" cy="60" r="3.4" fill="#fff"/><circle cx="84" cy="60" r="3.4" fill="#fff"/></svg>',
  checkSingle: '<svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;"><polyline points="2 7 5 10 12 3"/></svg>',
  checkDouble: '<svg viewBox="0 0 20 14" width="18" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;"><polyline points="1 7 4 10 11 3"/><polyline points="7 7 10 10 17 3"/></svg>',
  playBig: '<svg viewBox="0 0 24 24" width="44" height="44" fill="#fff"><path d="M8 5v14l11-7z"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  download: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>',
  exitFs: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>',
  volume: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
  muted: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
  pip: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><rect x="12" y="12" width="8" height="6" rx="1" fill="currentColor"/></svg>'
};

function icon(name, className = "") {
  const span = document.createElement("span");
  span.className = "icon" + (className ? " " + className : "");
  span.innerHTML = ICONS[name] || "";
  return span;
}

// ======================================
// ХЕЛПЕРЫ
// ======================================

function makeElement(tag, className = "", text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = String(text);
  return el;
}

function makeButton(text, className, callback) {
  const button = makeElement("button", className, text);
  button.type = "button";
  button.addEventListener("click", callback);
  return button;
}

function showMessage(text, type = "") {
  if (!message) return;
  message.textContent = text;
  message.className = "message";
  if (type) message.classList.add(type);
  if (type === "error") {
    message.classList.remove("shake");
    void message.offsetWidth;
    message.classList.add("shake");
  }
}

function setBusy(busy) {
  submitBtn.disabled = busy;
  submitBtn.textContent = busy ? "Подожди..." : mode === "login" ? "Войти" : "Зарегистрироваться";
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " Б";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
  return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
}

function formatVideoTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function setMode(nextMode) {
  mode = nextMode;
  loginTab.classList.toggle("active", mode === "login");
  registerTab.classList.toggle("active", mode === "register");
  loginTab.setAttribute("aria-selected", String(mode === "login"));
  registerTab.setAttribute("aria-selected", String(mode === "register"));
  password.autocomplete = mode === "login" ? "current-password" : "new-password";
  teacherCodeField.classList.toggle("hidden", mode !== "register" || role.value !== "teacher");
  teacherCode.required = mode === "register" && role.value === "teacher";
  classHint.textContent = mode === "register"
    ? role.value === "teacher"
      ? "Ты создашь новый класс с указанным названием и паролем."
      : "Введи название существующего класса и пароль, который сообщил учитель."
    : "Для входа укажи свой класс и его пароль.";
  setBusy(false);
  showMessage("");
}

loginTab.addEventListener("click", () => setMode("login"));
registerTab.addEventListener("click", () => setMode("register"));
role.addEventListener("change", () => setMode(mode));

function usernameEmail(name) {
  const normalized = name.trim().toLocaleLowerCase("ru-RU");
  if (!/^[a-zа-яё0-9_-]{3,24}$/u.test(normalized)) {
    throw new Error("Имя пользователя должно содержать от 3 до 24 символов.");
  }
  if (/^[a-z0-9_-]+$/.test(normalized)) return normalized + "@vachat.example.com";
  const bytes = new TextEncoder().encode(normalized);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return encoded + "@ru.vachat.example.com";
}

function readableError(error) {
  const text = error?.message || "Неизвестная ошибка";
  if (/invalid login credentials/i.test(text)) return "Неверное имя пользователя или пароль.";
  if (/user already registered/i.test(text)) return "Это имя уже зарегистрировано. Попробуй войти.";
  if (/email not confirmed/i.test(text)) return "Подтверди email.";
  if (/row-level security|permission denied/i.test(text)) return "Supabase запретил это действие.";
  return text;
}

function formatTime(value) {
  return new Date(value).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(value) {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return "Сегодня";
  if (sameDay(d, yesterday)) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function initials(name) { return (name || "?").trim().slice(0, 1).toUpperCase(); }

function avatarHue(name) {
  let h = 0;
  for (const ch of (name || "?")) h = (h * 31 + ch.codePointAt(0)) % 360;
  return h;
}

// ======================================
// ТЕМА
// ======================================

function getSavedTheme() {
  return localStorage.getItem("vachat_theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("vachat_theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#0b1220" : "#10b981");
}

applyTheme(getSavedTheme());

// ======================================
// МОДАЛЬНЫЕ
// ======================================

function openModal(title, content, buttons = []) {
  const overlay = makeElement("div", "va-modal-overlay");
  const modal = makeElement("div", "va-modal");
  const header = makeElement("div", "va-modal-header");
  header.append(makeElement("h2", "", title));
  const close = makeButton("", "va-modal-close", () => overlay.remove());
  close.append(icon("close"));
  header.append(close);
  const body = makeElement("div", "va-modal-body");
  body.append(content);
  const footer = makeElement("div", "va-modal-footer");
  buttons.forEach(b => footer.append(makeButton(b.text, b.className || "va-secondary-btn", () => b.callback(overlay))));
  modal.append(header, body);
  if (buttons.length) modal.append(footer);
  overlay.append(modal);
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { overlay.remove(); document.removeEventListener("keydown", esc); }
  });
  document.body.append(overlay);
  return { overlay, body, modal, close: () => overlay.remove() };
}

// ======================================
// ФАЙЛЫ
// ======================================

function chooseImage() {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.append(input);
    input.addEventListener("change", () => {
      const file = input.files?.[0] || null;
      input.remove();
      resolve(file);
    }, { once: true });
    input.click();
  });
}

function chooseChatMedia() {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";
    input.style.display = "none";
    document.body.append(input);
    input.addEventListener("change", () => {
      const file = input.files?.[0] || null;
      input.remove();
      resolve(file);
    }, { once: true });
    input.click();
  });
}

async function uploadImage(file, folder) {
  if (!file) return null;
  if (!file.type.startsWith("image/")) throw new Error("Можно загружать только изображения.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Изображение должно быть не больше 5 МБ.");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from("chat-media").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

async function uploadChatMedia(file, folder) {
  if (!file) return null;
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) throw new Error("Можно отправлять только изображения и видео.");
  const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxSize) throw new Error(isVideo ? "Видео должно быть не больше 50 МБ." : "Изображение должно быть не больше 5 МБ.");
  const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "") || (isVideo ? "mp4" : "jpg");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from("chat-media").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

function isVideoMedia(path) { return /\.(mp4|webm|mov|m4v|ogv)$/i.test(path || ""); }

const imageUrlCache = new Map();
const IMAGE_URL_CACHE_MS = 50 * 60 * 1000;
async function getImageUrl(path) {
  if (!path) return null;
  const cached = imageUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  imageUrlCache.delete(path);
  const promise = db.storage.from("chat-media").createSignedUrl(path, 3600)
    .then(({ data, error }) => { if (error) throw error; return data?.signedUrl || null; })
    .catch(error => { console.warn("Image URL error:", error.message); imageUrlCache.delete(path); return null; });
  imageUrlCache.set(path, { promise, expiresAt: Date.now() + IMAGE_URL_CACHE_MS });
  return promise;
}

async function makeAvatar(profile, sizeClass = "") {
  const avatar = makeElement("span", "avatar" + (sizeClass ? " " + sizeClass : ""));
  const name = profile?.username || "?";
  avatar.style.setProperty("--hue", avatarHue(name));
  if (profile?.avatar_path) {
    const url = await getImageUrl(profile.avatar_path);
    if (url) {
      const img = makeElement("img");
      img.src = url;
      img.alt = "Аватар " + name;
      img.loading = "lazy";
      img.decoding = "async";
      avatar.append(img);
      return avatar;
    }
  }
  avatar.textContent = initials(name);
  return avatar;
}

async function changeAvatar() {
  try {
    const file = await chooseImage();
    if (!file) return;
    const path = await uploadImage(file, `avatars/${currentUser.id}`);
    const { error } = await db.from("profiles").update({ avatar_path: path }).eq("id", currentUser.id);
    if (error) throw error;
    currentProfile.avatar_path = path;
    await showMessenger();
  } catch (error) {
    showMessage("Не удалось изменить аватарку: " + readableError(error), "error");
  }
}

// ======================================
// КАСТОМНЫЙ ПЛЕЕР С ПРЕДУПРЕЖДЕНИЕМ ПРИ ПЕРЕВОРОТЕ
// ======================================

const VIDEO_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function createVideoPlayer(url, label = "Видео") {
  const wrapper = makeElement("div", "va-player");
  wrapper.tabIndex = 0;

  const video = document.createElement("video");
  video.src = url;
  video.playsInline = true;
  video.preload = "metadata";
  video.setAttribute("aria-label", label);
  wrapper.append(video);

  const loading = makeElement("div", "vplayer-loading hidden");
  loading.innerHTML = '<div class="vplayer-spinner"></div>';
  wrapper.append(loading);

  const seekLeft = makeElement("div", "vplayer-seek-indicator left");
  seekLeft.innerHTML = "« 10";
  const seekRight = makeElement("div", "vplayer-seek-indicator right");
  seekRight.innerHTML = "10 »";
  wrapper.append(seekLeft, seekRight);

  const bigPlay = makeElement("button", "vplayer-big-play");
  bigPlay.type = "button";
  bigPlay.innerHTML = ICONS.playBig;
  bigPlay.setAttribute("aria-label", "Воспроизвести");
  wrapper.append(bigPlay);

  const warnOverlay = makeElement("div", "vplayer-warn hidden");
  warnOverlay.innerHTML = `
    <div class="vplayer-warn-card">
      <div class="vplayer-warn-icon">📱</div>
      <h4>Неудобная ориентация</h4>
      <p>Видео не совпадает с ориентацией экрана — смотреть может быть неудобно. Продолжить?</p>
      <div class="vplayer-warn-actions">
        <button type="button" class="vplayer-warn-cancel">Отмена</button>
        <button type="button" class="vplayer-warn-ok">Всё равно смотреть</button>
      </div>
    </div>
  `;
  wrapper.append(warnOverlay);

  const controls = makeElement("div", "vplayer-controls");
  const progress = makeElement("div", "vplayer-progress");
  const progressBuffer = makeElement("div", "vplayer-progress-buffer");
  const progressFilled = makeElement("div", "vplayer-progress-filled");
  const progressKnob = makeElement("div", "vplayer-progress-knob");
  progress.append(progressBuffer, progressFilled, progressKnob);
  controls.append(progress);

  const bottom = makeElement("div", "vplayer-bottom");
  const playBtn = makeElement("button", "vplayer-btn");
  playBtn.type = "button";
  playBtn.innerHTML = ICONS.play;
  playBtn.setAttribute("aria-label", "Воспроизвести / пауза");

  const timeEl = makeElement("span", "vplayer-time", "0:00 / 0:00");
  const spacer = makeElement("div", "vplayer-spacer");

  let muteBtn = null;
  if (!isPhoneDevice()) {
    muteBtn = makeElement("button", "vplayer-btn");
    muteBtn.type = "button";
    muteBtn.innerHTML = ICONS.volume;
    muteBtn.title = "Звук";
    muteBtn.addEventListener("click", e => {
      e.stopPropagation();
      video.muted = !video.muted;
      muteBtn.innerHTML = video.muted ? ICONS.muted : ICONS.volume;
    });
  }

  const speedBtn = makeElement("button", "vplayer-btn vplayer-speed", "1×");
  speedBtn.type = "button";
  speedBtn.title = "Скорость";

  const speedMenu = makeElement("div", "vplayer-speed-menu hidden");
  VIDEO_SPEEDS.forEach(s => {
    const item = makeButton(`${s}×`, "vplayer-speed-item" + (s === 1 ? " active" : ""), () => {
      video.playbackRate = s;
      speedBtn.textContent = `${s}×`;
      speedMenu.querySelectorAll(".vplayer-speed-item").forEach(el => el.classList.remove("active"));
      item.classList.add("active");
      speedMenu.classList.add("hidden");
    });
    speedMenu.append(item);
  });
  speedBtn.addEventListener("click", e => {
    e.stopPropagation();
    if (speedMenu.classList.contains("hidden")) {
      speedMenu.classList.remove("hidden");
      const closeHandler = ev => {
        if (!speedMenu.contains(ev.target) && !speedBtn.contains(ev.target)) {
          speedMenu.classList.add("hidden");
          document.removeEventListener("click", closeHandler);
        }
      };
      setTimeout(() => document.addEventListener("click", closeHandler), 0);
    } else speedMenu.classList.add("hidden");
  });

  const downloadBtn = makeElement("button", "vplayer-btn");
  downloadBtn.type = "button";
  downloadBtn.title = "Скачать";
  downloadBtn.innerHTML = ICONS.download;
  downloadBtn.addEventListener("click", async e => {
    e.stopPropagation();
    downloadBtn.disabled = true;
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "video." + (blob.type.includes("webm") ? "webm" : "mp4");
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
    } catch (err) { window.open(url, "_blank", "noopener"); }
    finally { downloadBtn.disabled = false; }
  });

  let pipBtn = null;
  if (document.pictureInPictureEnabled) {
    pipBtn = makeElement("button", "vplayer-btn");
    pipBtn.type = "button";
    pipBtn.title = "Картинка в картинке";
    pipBtn.innerHTML = ICONS.pip;
    pipBtn.addEventListener("click", async e => {
      e.stopPropagation();
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else await video.requestPictureInPicture();
      } catch (_) {}
    });
  }

  const fsBtn = makeElement("button", "vplayer-btn");
  fsBtn.type = "button";
  fsBtn.title = "Полный экран";
  fsBtn.innerHTML = ICONS.fullscreen;

  bottom.append(playBtn, timeEl, spacer);
  if (muteBtn) bottom.append(muteBtn);
  bottom.append(speedBtn, speedMenu, downloadBtn);
  if (pipBtn) bottom.append(pipBtn);
  bottom.append(fsBtn);
  controls.append(bottom);
  wrapper.append(controls);

  let isVertical = false;
  let warnDismissedFor = null; // "portrait" | "landscape" | null
  let hideTimer = null;

  function orientationKey() { return isPortraitScreen() ? "portrait" : "landscape"; }

  // Предупреждение когда видео не совпадает с ориентацией экрана на телефоне
  function hasOrientationMismatch() {
    if (!isPhoneDevice()) return false;
    if (!video.videoWidth || !video.videoHeight) return false; // нет данных
    const screenPortrait = isPortraitScreen();
    return screenPortrait !== isVertical;
  }

  function showWarnIfNeeded() {
    if (!hasOrientationMismatch()) return false;
    if (warnDismissedFor === orientationKey()) return false;
    if (!video.paused) video.pause();
    warnOverlay.classList.remove("hidden");
    return true;
  }

  // Слушаем переворот устройства — если пользователь смотрит и ориентации не совпадают,
  // предупреждение всплывёт снова (если для новой ориентации ещё не соглашался).
  let orientTimer = null;
  function onOrientationChange() {
    if (orientTimer) clearTimeout(orientTimer);
    orientTimer = setTimeout(() => {
      orientTimer = null;
      // Показываем при перевороте только если видео ещё активно смотрят/пытаются смотреть
      const isWatching = !video.paused || !warnOverlay.classList.contains("hidden");
      if (!isWatching) return;
      showWarnIfNeeded();
    }, 250);
  }
  window.addEventListener("orientationchange", onOrientationChange);
  window.addEventListener("resize", onOrientationChange);

  function showControls() {
    wrapper.classList.add("controls-visible");
    if (hideTimer) clearTimeout(hideTimer);
    if (!video.paused) hideTimer = setTimeout(() => wrapper.classList.remove("controls-visible"), 3000);
  }

  function updateTime() {
    timeEl.textContent = `${formatVideoTime(video.currentTime)} / ${formatVideoTime(video.duration)}`;
    const pct = video.duration ? (video.currentTime / video.duration) * 100 : 0;
    progressFilled.style.width = pct + "%";
    progressKnob.style.left = pct + "%";
    if (video.buffered.length) {
      const buffEnd = video.buffered.end(video.buffered.length - 1);
      const bPct = video.duration ? (buffEnd / video.duration) * 100 : 0;
      progressBuffer.style.width = bPct + "%";
    }
  }

  video.addEventListener("loadedmetadata", () => {
    isVertical = video.videoHeight > video.videoWidth * 1.15;
    updateTime();
  });
  video.addEventListener("timeupdate", updateTime);
  video.addEventListener("progress", updateTime);
  video.addEventListener("play", () => {
    playBtn.innerHTML = ICONS.pause;
    bigPlay.classList.add("hidden");
    wrapper.classList.add("is-playing");
    showControls();
  });
  video.addEventListener("pause", () => {
    playBtn.innerHTML = ICONS.play;
    if (video.currentTime === 0 || video.ended) bigPlay.classList.remove("hidden");
    wrapper.classList.remove("is-playing");
    wrapper.classList.add("controls-visible");
    if (hideTimer) clearTimeout(hideTimer);
  });
  video.addEventListener("ended", () => {
    bigPlay.classList.remove("hidden");
    playBtn.innerHTML = ICONS.play;
    wrapper.classList.add("controls-visible");
  });
  video.addEventListener("waiting", () => loading.classList.remove("hidden"));
  video.addEventListener("canplay", () => loading.classList.add("hidden"));
  video.addEventListener("playing", () => loading.classList.add("hidden"));

  function tryPlay() {
    if (hasOrientationMismatch() && warnDismissedFor !== orientationKey()) {
      warnOverlay.classList.remove("hidden");
      return;
    }
    video.play().catch(err => console.warn("play error", err));
  }

  function togglePlay() { if (video.paused) tryPlay(); else video.pause(); }

  function flashSeek(direction) {
    const el = direction === "left" ? seekLeft : seekRight;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 500);
  }
  function seekBy(delta) {
    if (!video.duration) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
    updateTime();
  }

  let tapTimer = null;
  video.addEventListener("click", e => {
    const rect = video.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (tapTimer) {
      clearTimeout(tapTimer); tapTimer = null;
      if (x < third) { seekBy(-10); flashSeek("left"); }
      else if (x > third * 2) { seekBy(10); flashSeek("right"); }
      else togglePlay();
    } else {
      tapTimer = setTimeout(() => { tapTimer = null; togglePlay(); }, 240);
    }
  });

  playBtn.addEventListener("click", e => { e.stopPropagation(); togglePlay(); });
  bigPlay.addEventListener("click", e => { e.stopPropagation(); tryPlay(); });
  controls.addEventListener("click", e => e.stopPropagation());

  warnOverlay.querySelector(".vplayer-warn-cancel").addEventListener("click", e => {
    e.stopPropagation();
    warnOverlay.classList.add("hidden");
  });
  warnOverlay.querySelector(".vplayer-warn-ok").addEventListener("click", e => {
    e.stopPropagation();
    warnDismissedFor = orientationKey();
    warnOverlay.classList.add("hidden");
    video.play().catch(() => {});
  });

  let isDragging = false;
  function seekTo(clientX) {
    const rect = progress.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (video.duration) video.currentTime = x * video.duration;
    updateTime();
  }
  progress.addEventListener("pointerdown", e => {
    isDragging = true; progress.setPointerCapture(e.pointerId); seekTo(e.clientX); e.stopPropagation();
  });
  progress.addEventListener("pointermove", e => { if (isDragging) seekTo(e.clientX); });
  progress.addEventListener("pointerup", e => {
    isDragging = false;
    try { progress.releasePointerCapture(e.pointerId); } catch (_) {}
  });
  progress.addEventListener("pointercancel", () => { isDragging = false; });

  function requestFs() {
    if (wrapper.requestFullscreen) {
      wrapper.requestFullscreen().catch(() => {
        if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      });
    } else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    else if (video.requestFullscreen) video.requestFullscreen();
  }
  fsBtn.addEventListener("click", e => {
    e.stopPropagation();
    if (document.fullscreenElement === wrapper) document.exitFullscreen?.();
    else requestFs();
  });
  document.addEventListener("fullscreenchange", () => {
    const isFs = document.fullscreenElement === wrapper;
    wrapper.classList.toggle("is-fullscreen", isFs);
    fsBtn.innerHTML = isFs ? ICONS.exitFs : ICONS.fullscreen;
  });

  wrapper.addEventListener("keydown", e => {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    switch (e.key) {
      case " ": case "k": case "K": e.preventDefault(); togglePlay(); break;
      case "ArrowLeft": e.preventDefault(); seekBy(-5); flashSeek("left"); break;
      case "ArrowRight": e.preventDefault(); seekBy(5); flashSeek("right"); break;
      case "f": case "F":
        e.preventDefault();
        if (document.fullscreenElement === wrapper) document.exitFullscreen?.();
        else requestFs();
        break;
      case "m": case "M":
        e.preventDefault();
        video.muted = !video.muted;
        if (muteBtn) muteBtn.innerHTML = video.muted ? ICONS.muted : ICONS.volume;
        break;
    }
  });

  wrapper.addEventListener("mouseenter", showControls);
  wrapper.addEventListener("mousemove", showControls);
  wrapper.addEventListener("touchstart", showControls, { passive: true });

  return wrapper;
}

// ======================================
// АВТОРИЗАЦИЯ
// ======================================

authForm.addEventListener("submit", async event => {
  event.preventDefault();
  showMessage("");
  setBusy(true);
  const name = username.value.trim();
  const pass = password.value;
  const selectedRole = role.value;
  const group = className.value.trim();
  const groupPass = classPassword.value;

  try {
    let authData;
    if (mode === "register") {
      const result = await db.auth.signUp({ email: usernameEmail(name), password: pass });
      if (result.error) throw result.error;
      authData = result.data;
      if (!authData.session || !authData.user) throw new Error("Аккаунт создан, но вход ещё не выполнен.");
      const { error } = await db.rpc("setup_profile", {
        p_username: name, p_role: selectedRole,
        p_teacher_code: selectedRole === "teacher" ? teacherCode.value : ""
      });
      if (error) throw error;
      currentProfile = { id: authData.user.id, username: name, role: selectedRole, avatar_path: null };
    } else {
      const result = await db.auth.signInWithPassword({ email: usernameEmail(name), password: pass });
      if (result.error) throw result.error;
      authData = result.data;
      const { data: profile, error } = await db.from("profiles").select("id, username, role, avatar_path").eq("id", authData.user.id).single();
      if (error) throw error;
      if (profile.role !== selectedRole) {
        await db.auth.signOut();
        throw new Error("Выбрана неверная роль для этого аккаунта.");
      }
      currentProfile = profile;
    }
    let classId;
    if (mode === "register" && selectedRole === "teacher") {
      const { data, error } = await db.rpc("create_class", { p_name: group, p_password: groupPass });
      if (error) throw error;
      classId = data;
    } else {
      const { data, error } = await db.rpc("join_class", { p_name: group, p_password: groupPass });
      if (error) throw error;
      classId = data;
    }
    currentUser = authData.user;
    currentClass = { id: classId, name: group };
    localStorage.setItem("vachat_class_id", classId);
    await showMessenger();
  } catch (error) {
    showMessage(readableError(error), "error");
  } finally {
    setBusy(false);
  }
});

// ======================================
// ПАСХАЛКА
// ======================================

function triggerEasterEgg() {
  const overlay = makeElement("div", "va-easter-overlay");
  const content = makeElement("div", "va-easter-content");
  const glow = makeElement("div", "va-easter-glow");
  const particles = makeElement("div", "va-easter-particles");
  for (let i = 0; i < 40; i++) {
    const p = makeElement("span", "va-easter-particle");
    p.style.setProperty("--angle", (Math.random() * 360) + "deg");
    p.style.setProperty("--distance", (160 + Math.random() * 260) + "px");
    p.style.setProperty("--delay", (Math.random() * 0.6) + "s");
    p.style.setProperty("--size", (3 + Math.random() * 5) + "px");
    particles.append(p);
  }
  const letterV = makeElement("div", "va-easter-letter va-easter-v", "V");
  const letterA = makeElement("div", "va-easter-letter va-easter-a", "A");
  content.append(glow, particles, letterV, letterA);
  overlay.append(content);
  document.body.append(overlay);
  function close() { overlay.classList.add("hide"); setTimeout(() => overlay.remove(), 600); }
  overlay.addEventListener("click", close);
  setTimeout(close, 4200);
}

// ======================================
// МЕССЕНДЖЕР
// ======================================

async function showMessenger() {
  if (presenceRefreshTimer) { clearInterval(presenceRefreshTimer); presenceRefreshTimer = null; }
  if (realtimeChannel) { await db.removeChannel(realtimeChannel); realtimeChannel = null; }

  app.replaceChildren();

  const shell = makeElement("section", "messenger");
  const topbar = makeElement("header", "topbar");
  const brand = makeElement("div", "brand");
  const brandIcon = makeElement("div", "brand-icon");
  brandIcon.innerHTML = ICONS.logo;
  brandIcon.style.cursor = "pointer";
  brandIcon.setAttribute("title", "VA Chat");

  let brandClicks = 0;
  let brandClickTimer = null;
  brandIcon.addEventListener("click", () => {
    brandClicks++;
    brandIcon.classList.remove("bump");
    void brandIcon.offsetWidth;
    brandIcon.classList.add("bump");
    if (brandClickTimer) clearTimeout(brandClickTimer);
    brandClickTimer = setTimeout(() => { brandClicks = 0; }, 1600);
    if (brandClicks >= 5) {
      brandClicks = 0;
      clearTimeout(brandClickTimer);
      triggerEasterEgg();
    }
  });
  brand.append(brandIcon);

  const brandText = makeElement("div");
  brandText.append(makeElement("h1", "", "VA Chat"), makeElement("p", "", "Школьный мессенджер"));
  brand.append(brandText);

  const identity = makeElement("div", "user-identity",
    currentProfile.username + " · " + (currentProfile.role === "teacher" ? "Учитель" : "Ученик"));

  const callsButton = makeButton("", "secondary-btn calls-open-btn", () => openCallsModal());
  callsButton.append(icon("bell"), document.createTextNode(currentProfile.role === "teacher" ? " Мои вызовы" : " Вызовы"));
  callsButton.setAttribute("aria-label", "Вызовы");

  const settingsBtn = makeButton("", "secondary-btn settings-btn", () => openSettingsModal());
  settingsBtn.append(icon("gear"), document.createTextNode(" Настройки"));
  settingsBtn.setAttribute("aria-label", "Настройки");

  topbar.append(brand, identity, callsButton, settingsBtn);

  const tabs = makeElement("div", "chat-tabs");
  const classTab = makeButton("Классный чат", "chat-tab active", () => switchTab("class"));
  const personalTab = makeButton("Личные сообщения", "chat-tab", () => switchTab("personal"));
  tabs.append(classTab, personalTab);

  const layout = makeElement("div", "chat-layout");
  const sidebar = makeElement("aside", "sidebar");
  const panel = makeElement("section", "chat-panel");
  const heading = makeElement("header", "chat-heading");
  const messages = makeElement("div", "chat-messages");
  const attachmentPreview = makeElement("div", "attachment-preview-wrap hidden");
  messages.setAttribute("aria-live", "polite");

  const status = makeElement("div", "status-line");
  const composer = makeElement("form", "composer");

  const textarea = makeElement("textarea");
  textarea.placeholder = "Напиши сообщение...";
  textarea.maxLength = 2000;
  textarea.setAttribute("aria-label", "Текст сообщения");

  const attachBtn = makeButton("", "attach-btn", async () => {
    const file = await chooseChatMedia();
    if (file) {
      selectedFile = file;
      const kind = file.type.startsWith("video/") ? "Видео" : "Изображение";
      status.textContent = `${kind} прикреплено: ${file.name}`;
      showAttachmentPreview(file);
    }
  });
  attachBtn.append(icon("attach"));
  attachBtn.setAttribute("title", "Прикрепить файл");

  const sendBtn = makeElement("button", "send-btn");
  sendBtn.type = "submit";
  sendBtn.append(icon("send"), makeElement("span", "send-text", "Отправить"));
  sendBtn.setAttribute("aria-label", "Отправить сообщение");

  composer.append(textarea, attachBtn, sendBtn);
  panel.append(heading, messages, attachmentPreview, composer, status);
  layout.append(sidebar, panel);
  shell.append(topbar, tabs, layout);
  app.append(shell);

  let activeMode = "class";
  let selectedPerson = null;
  let selectedGroup = null;
  let selectedFile = null;
  let selectedFileUrl = null;
  let classmates = [];
  let customChats = [];
  let presenceRows = [];
  let presencePanel = null;

  function showAttachmentPreview(file) {
    if (selectedFileUrl) URL.revokeObjectURL(selectedFileUrl);
    attachmentPreview.replaceChildren();
    const isVideo = file.type.startsWith("video/");
    const item = makeElement("div", "attachment-item");
    const thumb = makeElement("div", "attachment-thumb");
    selectedFileUrl = URL.createObjectURL(file);
    if (isVideo) {
      const video = document.createElement("video");
      video.src = selectedFileUrl;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      thumb.append(video);
      video.addEventListener("loadeddata", () => {
        try { video.currentTime = Math.min(0.5, (video.duration || 1) / 2); } catch (_) {}
      }, { once: true });
      const playBadge = makeElement("span", "attachment-play");
      playBadge.innerHTML = ICONS.play;
      thumb.append(playBadge);
    } else {
      const img = document.createElement("img");
      img.src = selectedFileUrl;
      img.alt = "Превью";
      thumb.append(img);
    }
    const info = makeElement("div", "attachment-info");
    info.append(
      makeElement("span", "attachment-name", file.name),
      makeElement("span", "attachment-size", `${formatBytes(file.size)} · ${isVideo ? "Видео" : "Фото"}`)
    );
    const removeBtn = makeButton("", "attachment-remove", () => {
      selectedFile = null;
      clearAttachmentPreview();
      status.textContent = "Вложение убрано";
    });
    removeBtn.append(icon("close"));
    removeBtn.setAttribute("aria-label", "Убрать вложение");
    item.append(thumb, info, removeBtn);
    attachmentPreview.append(item);
    attachmentPreview.classList.remove("hidden");
  }

  function clearAttachmentPreview() {
    attachmentPreview.replaceChildren();
    attachmentPreview.classList.add("hidden");
    if (selectedFileUrl) { URL.revokeObjectURL(selectedFileUrl); selectedFileUrl = null; }
  }

  async function openSettingsModal() {
    const content = makeElement("div", "settings-content");
    const profileSection = makeElement("section", "settings-section");
    profileSection.append(makeElement("h3", "settings-section-title", "Профиль"));
    const profileCard = makeElement("div", "settings-profile");
    const avatarWrap = makeElement("div", "settings-avatar-wrap");
    avatarWrap.append(await makeAvatar(currentProfile, "avatar-lg"));
    const avatarOverlay = makeElement("button", "settings-avatar-edit");
    avatarOverlay.type = "button";
    avatarOverlay.setAttribute("aria-label", "Изменить аватарку");
    avatarOverlay.textContent = "📷";
    avatarOverlay.addEventListener("click", async () => { closeSettings(); await changeAvatar(); });
    avatarWrap.append(avatarOverlay);
    const profileInfo = makeElement("div", "settings-profile-info");
    profileInfo.append(
      makeElement("div", "settings-profile-name", currentProfile.username),
      makeElement("div", "settings-profile-sub",
        (currentProfile.role === "teacher" ? "Учитель" : "Ученик") +
        (currentClass ? " · " + currentClass.name : ""))
    );
    profileCard.append(avatarWrap, profileInfo);
    profileSection.append(profileCard);

    const appearanceSection = makeElement("section", "settings-section");
    appearanceSection.append(makeElement("h3", "settings-section-title", "Внешний вид"));
    const themeRow = makeElement("div", "settings-row");
    const themeLeft = makeElement("div", "settings-row-left");
    const isDark = getSavedTheme() === "dark";
    const themeIconWrap = makeElement("div", "settings-row-icon");
    themeIconWrap.innerHTML = isDark ? ICONS.moon : ICONS.sun;
    themeLeft.append(themeIconWrap, makeElement("div", "settings-row-text", isDark ? "Тёмная тема" : "Светлая тема"));
    const themeToggle = makeElement("button", "settings-toggle" + (isDark ? " is-on" : ""));
    themeToggle.type = "button";
    themeToggle.setAttribute("role", "switch");
    themeToggle.setAttribute("aria-checked", String(isDark));
    themeToggle.innerHTML = '<span class="settings-toggle-knob"></span>';
    themeToggle.addEventListener("click", () => {
      const next = getSavedTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      const nowDark = next === "dark";
      themeToggle.classList.toggle("is-on", nowDark);
      themeToggle.setAttribute("aria-checked", String(nowDark));
      themeLeft.querySelector(".settings-row-text").textContent = nowDark ? "Тёмная тема" : "Светлая тема";
      themeIconWrap.innerHTML = nowDark ? ICONS.moon : ICONS.sun;
    });
    themeRow.append(themeLeft, themeToggle);
    appearanceSection.append(themeRow);

    const aboutSection = makeElement("section", "settings-section");
    aboutSection.append(makeElement("h3", "settings-section-title", "О приложении"));
    const aboutCard = makeElement("div", "settings-about");
    aboutCard.append(
      makeElement("div", "settings-about-brand", "VA Chat"),
      makeElement("p", "settings-about-text", "Школьный мессенджер для общения с классом. Версия 1.0")
    );
    aboutSection.append(aboutCard);

    const logoutWrap = makeElement("section", "settings-section");
    const logoutBtn = makeButton("", "settings-logout-btn", async () => { closeSettings(); await logout(); });
    logoutBtn.append(icon("logout"), document.createTextNode(" Выйти из аккаунта"));
    logoutWrap.append(logoutBtn);

    content.append(profileSection, appearanceSection, aboutSection, logoutWrap);
    const settingsModal = openModal("Настройки", content);
    function closeSettings() { settingsModal.close(); }
  }

  function setActiveTab(which) {
    classTab.classList.toggle("active", which === "class");
    personalTab.classList.toggle("active", which === "personal");
  }

  function setHeading(title, subtitle, extra = null) {
    heading.replaceChildren();
    if (layout.classList.contains("mobile-chat-open")) {
      const backBtn = makeButton("", "mobile-back-btn", showMobileChatList);
      backBtn.append(icon("back"));
      backBtn.setAttribute("aria-label", "Назад к списку чатов");
      heading.append(backBtn);
    }
    const titleBlock = makeElement("div", "chat-heading-title");
    titleBlock.append(makeElement("h2", "", title), makeElement("p", "", subtitle));
    heading.append(titleBlock);
    if (extra) heading.append(extra);
  }

  async function showMobileChatList() {
    selectedPerson = null; selectedGroup = null;
    layout.classList.remove("mobile-chat-open");
    setHeading(activeMode === "personal" ? "Личные сообщения" : "Мои чаты", "Выбери чат, чтобы открыть переписку");
    showEmpty("Выбери чат из списка, чтобы увидеть сообщения.");
    status.textContent = "Список чатов";
    await refreshSidebar();
  }

  function showEmpty(text) {
    const wrap = makeElement("div", "empty-block");
    const illustration = makeElement("div", "empty-illustration");
    illustration.innerHTML = ICONS.emptyChat;
    wrap.append(illustration, makeElement("p", "empty-state", text));
    messages.replaceChildren(wrap);
  }

  function showMessageSkeleton(count = 4) {
    const wrap = makeElement("div", "skeleton-messages");
    for (let i = 0; i < count; i++) {
      const item = makeElement("div", "skeleton-message" + (i % 2 ? " mine" : ""));
      item.innerHTML = `<div class="skeleton-avatar"></div><div class="skeleton-body"><div class="skeleton-line short"></div><div class="skeleton-line"></div></div>`;
      wrap.append(item);
    }
    messages.replaceChildren(wrap);
  }

  function sidebarButton(label, iconText, callback, active = false) {
    const button = makeButton("", "person-item" + (active ? " active" : ""), callback);
    button.append(makeElement("span", "avatar", iconText), makeElement("span", "person-name", label));
    return button;
  }

  function localDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function isPresentToday(row) {
    return Boolean(row && row.is_at_school && row.presence_date === localDateString());
  }

  async function loadPresence() {
    const { data, error } = await db.from("school_presence").select("user_id, is_at_school, presence_date");
    if (error) throw error;
    presenceRows = data || [];
  }

  async function setMyPresence(isAtSchool) {
    const today = localDateString();
    const existing = presenceRows.find(row => row.user_id === currentUser.id);
    let result;
    if (existing) {
      result = await db.from("school_presence").update({ is_at_school: isAtSchool, presence_date: today }).eq("user_id", currentUser.id);
    } else {
      result = await db.from("school_presence").insert({ user_id: currentUser.id, is_at_school: isAtSchool, presence_date: today });
    }
    if (result.error) throw result.error;
    await loadPresence();
    renderPresencePanel();
  }

  function renderPresencePanel() {
    if (!presencePanel) return;
    presencePanel.replaceChildren();
    presencePanel.append(makeElement("p", "sidebar-caption", "Присутствие в школе"));
    const ownRow = presenceRows.find(row => row.user_id === currentUser.id);
    const ownPresent = isPresentToday(ownRow);
    presencePanel.append(makeElement("div",
      "presence-own-status" + (ownPresent ? " is-present" : ""),
      ownPresent ? "● Сейчас ты в школе" : "● Сейчас ты не в школе"));

    const controls = makeElement("div", "presence-controls");
    const arriveButton = makeButton("Я в школе", "presence-btn presence-btn-in" + (ownPresent ? " active" : ""), async () => {
      arriveButton.disabled = true;
      try { await setMyPresence(true); }
      catch (error) { status.textContent = "Не удалось: " + readableError(error); }
      finally { arriveButton.disabled = false; }
    });
    const absentButton = makeButton("Не в школе", "presence-btn presence-btn-out" + (!ownPresent ? " active" : ""), async () => {
      absentButton.disabled = true;
      try { await setMyPresence(false); }
      catch (error) { status.textContent = "Не удалось: " + readableError(error); }
      finally { absentButton.disabled = false; }
    });
    controls.append(arriveButton, absentButton);
    presencePanel.append(controls);

    const list = makeElement("div", "presence-list");
    for (const person of classmates) {
      const row = presenceRows.find(item => item.user_id === person.id);
      const present = isPresentToday(row);
      const item = makeElement("div", "presence-person");
      const identity = makeElement("div", "presence-person-identity");
      identity.append(
        makeElement("span", "presence-person-name", person.username),
        makeElement("span", "presence-person-role" + (person.role === "teacher" ? " is-teacher" : ""), person.role === "teacher" ? "Учитель" : "Ученик")
      );
      item.append(identity, makeElement("span", "presence-pill" + (present ? " is-present" : ""), present ? "В школе" : "Не в школе"));
      list.append(item);
    }
    if (!classmates.length) list.append(makeElement("p", "presence-empty", "Пока нет других участников класса."));
    presencePanel.append(list);
  }

  async function openCreateCallModal(student) {
    const content = makeElement("div");
    content.append(makeElement("p", "call-modal-description", `Ученик: ${student.username}. Укажи, зачем нужно подойти.`));
    const field = makeElement("div", "va-field");
    field.append(makeElement("label", "", "Причина вызова"));
    const reason = makeElement("textarea", "", "");
    reason.rows = 4; reason.maxLength = 500;
    reason.placeholder = "Например: обсудить домашнее задание...";
    field.append(reason);
    content.append(field);
    const modal = openModal("Вызвать ученика", content, [{
      text: "Отправить вызов", className: "va-primary-btn",
      callback: async overlay => {
        const text = reason.value.trim();
        if (text.length < 3) { reason.focus(); status.textContent = "Напиши причину вызова."; return; }
        const send = overlay.querySelector(".va-primary-btn");
        if (send) send.disabled = true;
        try {
          const { error } = await db.from("teacher_calls").insert({ class_id: currentClass.id, teacher_id: currentUser.id, student_id: student.id, reason: text });
          if (error) throw error;
          modal.close();
          status.textContent = `Вызов для ${student.username} отправлен.`;
        } catch (error) {
          if (send) send.disabled = false;
          status.textContent = "Не удалось отправить вызов: " + readableError(error);
        }
      }
    }]);
    reason.focus();
  }

  async function loadMyCalls() {
    const column = currentProfile.role === "teacher" ? "teacher_id" : "student_id";
    const { data, error } = await db.from("teacher_calls")
      .select("id, class_id, teacher_id, student_id, reason, created_at, acknowledged_at")
      .eq(column, currentUser.id).eq("class_id", currentClass.id)
      .order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    return data || [];
  }

  async function openCallsModal() {
    const content = makeElement("div", "teacher-calls-list");
    const modal = openModal(currentProfile.role === "teacher" ? "Отправленные вызовы" : "Вызовы учителя", content);
    content.append(makeElement("p", "call-modal-description", "Здесь отображаются вызовы по текущему классу."));
    try {
      const calls = await loadMyCalls();
      if (!calls.length) { content.append(makeElement("p", "presence-empty", "Вызовов пока нет.")); return; }
      for (const call of calls) {
        const card = makeElement("article", "teacher-call-card");
        const otherId = currentProfile.role === "teacher" ? call.student_id : call.teacher_id;
        const other = classmates.find(p => p.id === otherId);
        const personName = other?.username || (currentProfile.role === "teacher" ? "Ученик" : "Учитель");
        card.append(
          makeElement("strong", "", currentProfile.role === "teacher" ? `Кому: ${personName}` : `От: ${personName}`),
          makeElement("p", "", call.reason),
          makeElement("time", "message-time", formatTime(call.created_at))
        );
        if (currentProfile.role === "student") {
          card.append(makeElement("span", call.acknowledged_at ? "call-acknowledged" : "call-pending", call.acknowledged_at ? "Отмечено как прочитанное" : "Ожидает подтверждения"));
          if (!call.acknowledged_at) {
            card.append(makeButton("Понятно", "va-primary-btn", async event => {
              const button = event?.currentTarget || null;
              if (button) button.disabled = true;
              try {
                const { data, error } = await db.rpc("acknowledge_teacher_call", { p_call_id: call.id });
                if (error) throw error;
                if (data !== true) throw new Error("Supabase не подтвердил изменение.");
                call.acknowledged_at = new Date().toISOString();
                modal.close();
                await openCallsModal();
              } catch (error) {
                if (button) button.disabled = false;
                status.textContent = "Не удалось подтвердить вызов: " + readableError(error);
              }
            }));
          }
        }
        content.append(card);
      }
    } catch (error) {
      content.append(makeElement("p", "message error", "Не удалось загрузить вызовы: " + readableError(error)));
    }
  }

  async function renderSidebarNow() {
    const sidebarContent = document.createDocumentFragment();
    sidebarContent.append(makeElement("h2", "", activeMode === "personal" ? "Одноклассники" : "Мои чаты"));
    const unreadKeys = activeMode === "personal"
      ? classmates.map(p => ["private", currentClass.id, p.id, `private:${p.id}`])
      : [["class", currentClass.id, null, `class:${currentClass.id}`],
         ...customChats.map(c => ["group", c.id, null, `group:${c.id}`])];
    const unreadValues = await Promise.all(unreadKeys.map(([type, id, peer]) =>
      countUnread(type, id, peer).catch(() => 0)
    ));
    const unreadCounts = new Map(unreadKeys.map((key, i) => [key[3], unreadValues[i]]));

    if (activeMode !== "personal") {
      const classButton = sidebarButton("Классный чат", "К", () => openClassChat(), activeMode === "class");
      addUnreadBadge(classButton, unreadCounts.get(`class:${currentClass.id}`) || 0);
      sidebarContent.append(classButton);
      sidebarContent.append(makeButton("+ Создать групповой чат", "create-chat-btn", createCustomChat));
      sidebarContent.append(makeElement("p", "sidebar-caption", "Групповые чаты"));
      const chatButtons = await Promise.all(customChats.map(async chat => {
        const button = makeButton("", "person-item" + (selectedGroup?.id === chat.id ? " active" : ""), () => openCustomChat(chat));
        button.append(await makeAvatar({ username: chat.name, avatar_path: chat.image_path }), makeElement("span", "person-name", chat.name));
        addUnreadBadge(button, unreadCounts.get(`group:${chat.id}`) || 0);
        return button;
      }));
      sidebarContent.append(...chatButtons);
    } else {
      const personRows = await Promise.all(classmates.map(async person => {
        const personRow = makeElement("div", "person-row-with-action");
        const button = makeButton("", "person-item" + (selectedPerson?.id === person.id ? " active" : ""), () => openPersonalChat(person));
        button.append(await makeAvatar(person), makeElement("span", "person-name", person.username));
        addUnreadBadge(button, unreadCounts.get(`private:${person.id}`) || 0);
        personRow.append(button);
        if (currentProfile.role === "teacher" && person.role === "student") {
          personRow.append(makeButton("Вызвать", "teacher-call-mini-btn", () => openCreateCallModal(person)));
        }
        return personRow;
      }));
      sidebarContent.append(...personRows);
      if (!classmates.length) sidebarContent.append(makeElement("p", "empty-state", "В классе пока нет других участников."));
    }
    if (!presencePanel) presencePanel = makeElement("section", "presence-panel");
    sidebarContent.append(presencePanel);
    renderPresencePanel();
    sidebar.replaceChildren(sidebarContent);
  }

  let sidebarRefreshPromise = null;
  let sidebarRefreshPending = false;
  async function refreshSidebar() {
    if (sidebarRefreshPromise) { sidebarRefreshPending = true; return sidebarRefreshPromise; }
    sidebarRefreshPromise = (async () => {
      do { sidebarRefreshPending = false; await renderSidebarNow(); } while (sidebarRefreshPending);
    })();
    try { await sidebarRefreshPromise; } finally { sidebarRefreshPromise = null; }
  }

  async function loadClassmates() {
    const { data: memberships, error } = await db.from("class_members").select("user_id").eq("class_id", currentClass.id);
    if (error) throw error;
    const ids = [...new Set((memberships || []).map(r => r.user_id).filter(id => id !== currentUser.id))];
    if (!ids.length) { classmates = []; return; }
    const { data, error: e } = await db.from("profiles").select("id, username, avatar_path, role").in("id", ids).order("username");
    if (e) throw e;
    classmates = data || [];
  }

  async function loadCustomChats() {
    const { data, error } = await db.from("custom_chats").select("id, name, image_path, created_by, class_id").eq("class_id", currentClass.id).order("created_at", { ascending: false });
    if (error) throw error;
    customChats = data || [];
  }

  async function getChatReadAt(type, chatId, peerId = null) {
    const { data, error } = await db.rpc("vachat_get_other_read_at", { p_type: type, p_chat_id: chatId, p_peer_id: peerId });
    if (error) throw error;
    return data || null;
  }

  async function markChatRead(type, chatId, peerId = null) {
    const values = { user_id: currentUser.id, chat_type: type, chat_id: chatId, peer_id: peerId, last_read_at: new Date().toISOString() };
    const { error } = await db.from("chat_read_states").upsert(values, { onConflict: "user_id,chat_type,chat_id,peer_id" });
    if (error) throw error;
  }

  async function countUnread(type, chatId, peerId = null) {
    let readQuery = db.from("chat_read_states").select("last_read_at")
      .eq("user_id", currentUser.id).eq("chat_type", type).eq("chat_id", chatId);
    if (peerId) readQuery = readQuery.eq("peer_id", peerId);
    else readQuery = readQuery.is("peer_id", null);
    const { data: state, error: stateError } = await readQuery.maybeSingle();
    if (stateError) throw stateError;
    let query;
    if (type === "class") query = db.from("messages").select("id", { count: "exact", head: true }).eq("class_id", chatId).neq("user_id", currentUser.id);
    else if (type === "group") query = db.from("custom_chat_messages").select("id", { count: "exact", head: true }).eq("chat_id", chatId).neq("sender_id", currentUser.id);
    else query = db.from("private_messages").select("id", { count: "exact", head: true }).eq("class_id", currentClass.id).eq("sender_id", peerId).eq("recipient_id", currentUser.id);
    if (state?.last_read_at) query = query.gt("created_at", state.last_read_at);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  function addUnreadBadge(container, count) {
    if (!count) return;
    container.append(makeElement("span", "unread-badge", count > 99 ? "99+" : String(count)));
  }

  let sidebarRefreshTimer = null;
  function scheduleSidebarRefresh() {
    if (sidebarRefreshTimer) clearTimeout(sidebarRefreshTimer);
    sidebarRefreshTimer = setTimeout(() => {
      sidebarRefreshTimer = null;
      refreshSidebar().catch(() => {});
    }, 220);
  }

  async function refreshUnreadBadges() {
    if (activeMode === "personal") return;
    scheduleSidebarRefresh();
  }

  function getChatRenderKey(kind) {
    if (kind === "class") return "class:" + currentClass.id;
    if (kind === "group") return "group:" + (selectedGroup?.id || "");
    if (kind === "personal") return "private:" + (selectedPerson?.id || "");
    return "";
  }

  function computeMessagesSignature(rows) {
    return (rows || []).map(m => `${m.id}|${m.created_at}|${m.body || ""}|${m.image_path || ""}|${m.sender_id || m.user_id || ""}`).join(",");
  }

  async function buildMessageBubble(item, kind, otherReadAt) {
    const mine = item.sender_id === currentUser.id || item.user_id === currentUser.id;
    const bubble = makeElement("article", "chat-message" + (mine ? " mine" : ""));
    bubble.dataset.createdAt = item.created_at;
    if (kind !== "personal") {
      const authorRow = makeElement("div", "message-author-row");
      const author = item.profiles || (mine ? currentProfile : null);
      authorRow.append(
        await makeAvatar(author || { username: "Участник" }),
        makeElement("div", "message-author", author?.username || "Участник")
      );
      bubble.append(authorRow);
    }
    if (item.body) bubble.append(makeElement("div", "message-body", item.body));
    if (item.image_path) {
      const url = await getImageUrl(item.image_path);
      if (url && isVideoMedia(item.image_path)) {
        bubble.append(createVideoPlayer(url, "Видео в сообщении"));
      } else if (url) {
        const img = makeElement("img", "message-image");
        img.src = url; img.alt = "Изображение"; img.loading = "lazy";
        img.addEventListener("click", () => window.open(url, "_blank", "noopener"));
        bubble.append(img);
      } else bubble.append(makeElement("p", "message-image-error", "Не удалось загрузить файл."));
    }
    const footer = makeElement("div", "message-footer");
    footer.append(makeElement("time", "message-time", formatTime(item.created_at)));
    if (mine) {
      const isRead = otherReadAt && new Date(otherReadAt) >= new Date(item.created_at);
      const receipt = makeElement("span", "read-receipt" + (isRead ? " is-read" : ""));
      receipt.innerHTML = isRead ? ICONS.checkDouble : ICONS.checkSingle;
      receipt.title = isRead ? "Прочитано" : "Отправлено";
      receipt.setAttribute("aria-label", isRead ? "Прочитано" : "Отправлено");
      footer.append(receipt);
    }
    const canDelete = mine
      || (kind === "class" && currentProfile.role === "teacher")
      || (kind === "group" && selectedGroup?.created_by === currentUser.id);
    if (canDelete) footer.append(makeButton("Удалить", "delete-message-btn", () => deleteMessage(item.id, kind)));
    bubble.append(footer);
    return bubble;
  }

  async function renderMessages(rows, kind) {
    const renderKey = getChatRenderKey(kind);
    const signature = computeMessagesSignature(rows);
    const prev = chatRenderState.get(renderKey);
    if (prev && prev.signature === signature) return;
    let otherReadAt = null;
    if (kind === "class") otherReadAt = await getChatReadAt("class", currentClass.id);
    else if (kind === "group" && selectedGroup) otherReadAt = await getChatReadAt("group", selectedGroup.id);
    else if (kind === "personal" && selectedPerson) otherReadAt = await getChatReadAt("private", currentClass.id, selectedPerson.id);

    if (!rows?.length) {
      const wrap = makeElement("div", "empty-block");
      const illustration = makeElement("div", "empty-illustration");
      illustration.innerHTML = ICONS.emptyChat;
      wrap.append(illustration, makeElement("p", "empty-state", "Пока сообщений нет. Напиши первое!"));
      messages.replaceChildren(wrap);
      chatRenderState.set(renderKey, { signature, count: 0, ids: "", lastDay: null, data: rows });
      return;
    }

    const prevIds = prev?.ids || "";
    const idsConcat = rows.map(m => String(m.id)).join(",");
    const canAppend = prev && prev.count > 0 && rows.length > prev.count
      && rows.slice(0, prev.count).map(m => String(m.id)).join(",") === prevIds;
    const wasAtBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 120;

    if (canAppend) {
      const newRows = rows.slice(prev.count);
      const fragment = document.createDocumentFragment();
      let lastDay = prev.lastDay ? new Date(prev.lastDay) : null;
      for (const item of newRows) {
        const itemDate = new Date(item.created_at);
        if (!lastDay || !sameDay(lastDay, itemDate)) {
          fragment.append(makeElement("div", "date-divider", dayLabel(item.created_at)));
        }
        lastDay = itemDate;
        fragment.append(await buildMessageBubble(item, kind, otherReadAt));
      }
      messages.append(fragment);
      if (wasAtBottom) messages.scrollTop = messages.scrollHeight;
      chatRenderState.set(renderKey, { signature, count: rows.length, ids: idsConcat, lastDay: rows[rows.length - 1].created_at, data: rows });
      return;
    }

    messages.classList.add("no-anim");
    const fragment = document.createDocumentFragment();
    let lastDay = null;
    for (const item of rows) {
      const itemDate = new Date(item.created_at);
      if (!lastDay || !sameDay(lastDay, itemDate)) {
        fragment.append(makeElement("div", "date-divider", dayLabel(item.created_at)));
      }
      lastDay = itemDate;
      fragment.append(await buildMessageBubble(item, kind, otherReadAt));
    }
    messages.replaceChildren(fragment);
    messages.scrollTop = messages.scrollHeight;
    requestAnimationFrame(() => messages.classList.remove("no-anim"));
    chatRenderState.set(renderKey, { signature, count: rows.length, ids: idsConcat, lastDay: rows[rows.length - 1].created_at, data: rows });
  }

  async function updateReadReceipts(kind) {
    let otherReadAt = null;
    if (kind === "class") otherReadAt = await getChatReadAt("class", currentClass.id);
    else if (kind === "group" && selectedGroup) otherReadAt = await getChatReadAt("group", selectedGroup.id);
    else if (kind === "personal" && selectedPerson) otherReadAt = await getChatReadAt("private", currentClass.id, selectedPerson.id);
    if (!otherReadAt) return;
    const otherTime = new Date(otherReadAt);
    messages.querySelectorAll(".chat-message.mine").forEach(bubble => {
      const createdAt = bubble.dataset.createdAt;
      if (!createdAt) return;
      const isRead = otherTime >= new Date(createdAt);
      const receipt = bubble.querySelector(".read-receipt");
      if (!receipt) return;
      const alreadyRead = receipt.classList.contains("is-read");
      if (isRead && !alreadyRead) {
        receipt.classList.add("is-read");
        receipt.innerHTML = ICONS.checkDouble;
        receipt.title = "Прочитано";
        receipt.setAttribute("aria-label", "Прочитано");
      } else if (!isRead && alreadyRead) {
        receipt.classList.remove("is-read");
        receipt.innerHTML = ICONS.checkSingle;
        receipt.title = "Отправлено";
        receipt.setAttribute("aria-label", "Отправлено");
      }
    });
  }

  async function loadClassMessages() {
    const key = "class:" + currentClass.id;
    if (!loadedChats.has(key)) showMessageSkeleton();
    const { data, error } = await db.from("messages")
      .select("id, user_id, body, image_path, created_at, profiles(username, avatar_path)")
      .eq("class_id", currentClass.id)
      .order("created_at", { ascending: true }).limit(150);
    if (error) throw error;
    loadedChats.add(key);
    await renderMessages(data, "class");
    await markChatRead("class", currentClass.id);
    status.textContent = "Общий чат класса";
    await refreshUnreadBadges();
  }

  async function loadPersonalMessages() {
    if (!selectedPerson) { showEmpty("Выбери одноклассника слева."); return; }
    const key = "private:" + selectedPerson.id;
    if (!loadedChats.has(key)) showMessageSkeleton();
    const { data, error } = await db.from("private_messages")
      .select("id, sender_id, recipient_id, body, image_path, created_at")
      .eq("class_id", currentClass.id)
      .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${selectedPerson.id}),and(sender_id.eq.${selectedPerson.id},recipient_id.eq.${currentUser.id})`)
      .order("created_at", { ascending: true }).limit(200);
    if (error) throw error;
    loadedChats.add(key);
    await renderMessages(data, "personal");
    await markChatRead("private", currentClass.id, selectedPerson.id);
    status.textContent = "Личная переписка · " + selectedPerson.username;
    await refreshSidebar();
  }

  async function loadGroupMessages() {
    if (!selectedGroup) return;
    const key = "group:" + selectedGroup.id;
    if (!loadedChats.has(key)) showMessageSkeleton();
    const { data, error } = await db.from("custom_chat_messages")
      .select("id, sender_id, body, image_path, created_at, profiles(username, avatar_path)")
      .eq("chat_id", selectedGroup.id)
      .order("created_at", { ascending: true }).limit(200);
    if (error) throw error;
    loadedChats.add(key);
    await renderMessages(data, "group");
    await markChatRead("group", selectedGroup.id);
    status.textContent = "Групповой чат · " + selectedGroup.name;
    await refreshUnreadBadges();
  }

  async function openClassChat() {
    selectedPerson = null; selectedGroup = null;
    activeMode = "class";
    setActiveTab("class");
    if (window.matchMedia("(max-width: 760px)").matches) layout.classList.add("mobile-chat-open");
    setHeading(currentClass.name, "Общий чат класса");
    textarea.placeholder = "Напиши сообщение...";
    await loadClassMessages();
  }

  async function openPersonalChat(person) {
    selectedPerson = person; selectedGroup = null;
    activeMode = "personal";
    layout.classList.add("mobile-chat-open");
    setActiveTab("personal");
    await refreshSidebar();
    setHeading(person.username, "Личная переписка");
    textarea.placeholder = "Сообщение для " + person.username + "...";
    await loadPersonalMessages();
  }

  async function openCustomChat(chat) {
    selectedGroup = chat; selectedPerson = null;
    activeMode = "group";
    layout.classList.add("mobile-chat-open");
    setActiveTab("");
    await refreshSidebar();
    const actions = makeElement("div", "heading-actions");
    actions.append(makeButton("Участники", "secondary-btn", showGroupMembers));
    if (chat.created_by === currentUser.id) actions.append(makeButton("Настройки группы", "secondary-btn", groupSettings));
    setHeading(chat.name, "Групповой чат", actions);
    textarea.placeholder = "Сообщение в группу...";
    await loadGroupMessages();
  }

  async function switchTab(which) {
    selectedPerson = null; selectedGroup = null;
    activeMode = which;
    layout.classList.remove("mobile-chat-open");
    setActiveTab(which);
    if (which === "class") {
      textarea.placeholder = "Напиши сообщение...";
      if (window.matchMedia("(max-width: 760px)").matches) layout.classList.add("mobile-chat-open");
      await refreshSidebar();
      setHeading(currentClass.name, "Общий чат класса");
      await loadClassMessages();
    } else {
      try {
        await loadClassmates();
        await refreshSidebar();
        setHeading("Личные сообщения", "Выбери собеседника слева");
        showEmpty("Выбери одноклассника слева, чтобы начать переписку.");
        status.textContent = "Личные сообщения";
      } catch (error) { status.textContent = "Ошибка загрузки списка: " + readableError(error); }
    }
  }

  async function createCustomChat() {
    try {
      await loadClassmates();
      const content = makeElement("div");
      const nameField = makeElement("div", "va-field");
      nameField.append(makeElement("label", "", "Название группы"));
      const nameInput = makeElement("input");
      nameInput.placeholder = "Например, Проект по математике";
      nameInput.maxLength = 60;
      nameField.append(nameInput);
      const search = makeElement("input", "member-search");
      search.placeholder = "Поиск участников...";
      const list = makeElement("div", "member-select-list");
      const checkboxes = [];
      for (const person of classmates) {
        const label = makeElement("label", "member-select-item");
        const checkbox = makeElement("input");
        checkbox.type = "checkbox";
        checkbox.value = person.id;
        label.append(checkbox, makeElement("span", "", person.username));
        list.append(label);
        checkboxes.push({ person, label, checkbox });
      }
      search.addEventListener("input", () => {
        const q = search.value.toLowerCase();
        checkboxes.forEach(i => { i.label.hidden = !i.person.username.toLowerCase().includes(q); });
      });
      content.append(nameField, search, list);
      openModal("Создать групповой чат", content, [
        { text: "Отмена", className: "va-secondary-btn", callback: o => o.remove() },
        {
          text: "Создать", className: "va-primary-btn",
          callback: async overlay => {
            const name = nameInput.value.trim();
            if (!name) { alert("Введи название группы."); return; }
            const selectedIds = checkboxes.filter(i => i.checkbox.checked).map(i => i.person.id);
            try {
              const { data: chat, error } = await db.from("custom_chats")
                .insert({ class_id: currentClass.id, name, created_by: currentUser.id })
                .select("id, name, image_path, created_by, class_id").single();
              if (error) throw error;
              const memberIds = [...new Set([currentUser.id, ...selectedIds])];
              const { error: e } = await db.from("custom_chat_members").insert(memberIds.map(userId => ({ chat_id: chat.id, user_id: userId })));
              if (e) throw e;
              overlay.remove();
              await loadCustomChats();
              await openCustomChat(chat);
            } catch (error) { alert("Не удалось создать группу: " + readableError(error)); }
          }
        }
      ]);
    } catch (error) { status.textContent = "Ошибка создания группы: " + readableError(error); }
  }

  async function getGroupProfiles() {
    const { data, error } = await db.rpc("get_custom_chat_members", { p_chat_id: selectedGroup.id });
    if (error) throw error;
    return data || [];
  }

  async function showGroupMembers() {
    if (!selectedGroup) return;
    try {
      const profiles = await getGroupProfiles();
      const list = makeElement("div", "member-list");
      if (!profiles.length) list.append(makeElement("p", "empty-state", "Участников пока нет."));
      for (const p of profiles) {
        const item = makeElement("div", "member-item");
        item.append(await makeAvatar(p));
        const info = makeElement("div", "member-info");
        info.append(
          makeElement("div", "member-name", p.username),
          makeElement("div", "member-caption", p.id === selectedGroup.created_by ? "Создатель группы" : "Участник")
        );
        item.append(info);
        list.append(item);
      }
      openModal("Участники группы", list);
    } catch (error) { status.textContent = "Не удалось загрузить участников: " + readableError(error); }
  }

  async function manageGroupMembers() {
    if (!selectedGroup || selectedGroup.created_by !== currentUser.id) return;
    try {
      await loadClassmates();
      const profiles = await getGroupProfiles();
      const currentIds = new Set(profiles.map(p => p.id));
      const content = makeElement("div");
      const search = makeElement("input", "member-search");
      search.placeholder = "Поиск пользователя...";
      const list = makeElement("div", "member-select-list");
      const checkboxes = [];
      for (const person of classmates) {
        const label = makeElement("label", "member-select-item");
        const checkbox = makeElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = currentIds.has(person.id);
        checkbox.value = person.id;
        label.append(checkbox, makeElement("span", "", person.username));
        list.append(label);
        checkboxes.push({ person, checkbox, label });
      }
      search.addEventListener("input", () => {
        const q = search.value.toLowerCase();
        checkboxes.forEach(i => { i.label.hidden = !i.person.username.toLowerCase().includes(q); });
      });
      content.append(search, list);
      openModal("Управление участниками", content, [
        { text: "Отмена", className: "va-secondary-btn", callback: o => o.remove() },
        {
          text: "Сохранить", className: "va-primary-btn",
          callback: async overlay => {
            try {
              const selectedIds = new Set(checkboxes.filter(i => i.checkbox.checked).map(i => i.person.id));
              for (const person of profiles) {
                if (person.id !== currentUser.id && !selectedIds.has(person.id)) {
                  const { error } = await db.rpc("remove_custom_chat_member", { p_chat_id: selectedGroup.id, p_user_id: person.id });
                  if (error) throw error;
                }
              }
              for (const id of selectedIds) {
                if (!currentIds.has(id)) {
                  const { error } = await db.rpc("add_custom_chat_member", { p_chat_id: selectedGroup.id, p_user_id: id });
                  if (error) throw error;
                }
              }
              overlay.remove();
              status.textContent = "Участники обновлены.";
              await showGroupMembers();
            } catch (error) { alert("Ошибка изменения участников: " + readableError(error)); }
          }
        }
      ]);
    } catch (error) { status.textContent = "Ошибка загрузки участников: " + readableError(error); }
  }

  async function groupSettings() {
    if (!selectedGroup || selectedGroup.created_by !== currentUser.id) return;
    const content = makeElement("div");
    const nameField = makeElement("div", "va-field");
    nameField.append(makeElement("label", "", "Название группы"));
    const nameInput = makeElement("input");
    nameInput.value = selectedGroup.name;
    nameInput.maxLength = 60;
    nameField.append(nameInput);
    const imageButton = makeButton("Изменить изображение группы", "va-secondary-btn", async () => {
      try {
        const file = await chooseImage();
        if (!file) return;
        const path = await uploadImage(file, `groups/${selectedGroup.id}/${currentUser.id}`);
        const { error } = await db.rpc("update_custom_chat", { p_chat_id: selectedGroup.id, p_name: nameInput.value.trim() || selectedGroup.name, p_image_path: path });
        if (error) throw error;
        selectedGroup.image_path = path;
        await loadCustomChats();
        await openCustomChat(selectedGroup);
        alert("Изображение группы обновлено.");
      } catch (error) { alert(readableError(error)); }
    });
    const membersButton = makeButton("Управление участниками", "va-secondary-btn", async () => { await manageGroupMembers(); });
    content.append(nameField, imageButton, membersButton);
    openModal("Настройки группы", content, [
      { text: "Закрыть", className: "va-secondary-btn", callback: o => o.remove() },
      {
        text: "Сохранить", className: "va-primary-btn",
        callback: async overlay => {
          try {
            const name = nameInput.value.trim();
            if (!name) { alert("Название группы не может быть пустым."); return; }
            const { error } = await db.rpc("update_custom_chat", { p_chat_id: selectedGroup.id, p_name: name, p_image_path: selectedGroup.image_path || null });
            if (error) throw error;
            selectedGroup.name = name;
            overlay.remove();
            await loadCustomChats();
            await openCustomChat(selectedGroup);
            status.textContent = "Настройки сохранены.";
          } catch (error) { alert(readableError(error)); }
        }
      }
    ]);
  }

  async function deleteMessage(id, kind) {
    if (!confirm("Удалить это сообщение?")) return;
    const table = kind === "class" ? "messages" : kind === "personal" ? "private_messages" : "custom_chat_messages";
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) { status.textContent = "Не удалось удалить сообщение: " + readableError(error); return; }
    if (kind === "class") await loadClassMessages();
    else if (kind === "personal") await loadPersonalMessages();
    else await loadGroupMessages();
  }

  composer.addEventListener("submit", async event => {
    event.preventDefault();
    const body = textarea.value.trim();
    const file = selectedFile;
    if (!body && !file) return;
    if (body.length > 2000) { status.textContent = "Сообщение слишком длинное."; return; }
    if (activeMode === "personal" && !selectedPerson) { status.textContent = "Сначала выбери собеседника."; return; }
    if (activeMode === "group" && !selectedGroup) { status.textContent = "Сначала выбери групповой чат."; return; }
    sendBtn.disabled = true;
    try {
      let imagePath = null;
      if (file) {
        let folder;
        if (activeMode === "class") folder = `class/${currentClass.id}/${currentUser.id}`;
        else if (activeMode === "group") folder = `groups/${selectedGroup.id}/${currentUser.id}`;
        else folder = `private/${currentClass.id}/${currentUser.id}/${selectedPerson.id}`;
        imagePath = await uploadChatMedia(file, folder);
      }
      let result;
      if (activeMode === "class") {
        result = await db.from("messages").insert({ class_id: currentClass.id, user_id: currentUser.id, body: body || null, image_path: imagePath });
      } else if (activeMode === "personal") {
        result = await db.from("private_messages").insert({ class_id: currentClass.id, sender_id: currentUser.id, recipient_id: selectedPerson.id, body: body || null, image_path: imagePath });
      } else {
        result = await db.from("custom_chat_messages").insert({ chat_id: selectedGroup.id, sender_id: currentUser.id, body: body || null, image_path: imagePath });
      }
      if (result.error) throw result.error;
      textarea.value = "";
      selectedFile = null;
      clearAttachmentPreview();
      if (activeMode === "class") await loadClassMessages();
      else if (activeMode === "personal") await loadPersonalMessages();
      else await loadGroupMessages();
    } catch (error) {
      status.textContent = "Ошибка отправки: " + readableError(error);
    } finally {
      sendBtn.disabled = false;
      textarea.focus();
    }
  });

  await Promise.all([loadClassmates(), loadCustomChats(), loadPresence()]);
  await refreshSidebar();

  if (window.matchMedia("(max-width: 760px)").matches) {
    layout.classList.remove("mobile-chat-open");
    setHeading("Мои чаты", "Выбери чат, чтобы открыть переписку");
    showEmpty("Выбери чат из списка, чтобы увидеть сообщения.");
    status.textContent = "Список чатов";
  } else {
    setHeading(currentClass.name, "Общий чат класса");
    await loadClassMessages();
  }

  presenceRefreshTimer = setInterval(() => renderPresencePanel(), 60 * 1000);

  realtimeChannel = db
    .channel("va-chat-" + currentClass.id + "-" + currentUser.id)
    .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: "class_id=eq." + currentClass.id }, () => {
      if (activeMode === "class") loadClassMessages().catch(error => { status.textContent = readableError(error); });
      else refreshUnreadBadges();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "private_messages", filter: "class_id=eq." + currentClass.id }, payload => {
      const item = payload.new || payload.old;
      if (activeMode === "personal" && selectedPerson && item && (
        (item.sender_id === currentUser.id && item.recipient_id === selectedPerson.id) ||
        (item.sender_id === selectedPerson.id && item.recipient_id === currentUser.id)
      )) loadPersonalMessages();
      else scheduleSidebarRefresh();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "custom_chat_messages" }, payload => {
      const item = payload.new || payload.old;
      if (activeMode === "group" && selectedGroup && item?.chat_id === selectedGroup.id) loadGroupMessages();
      else refreshUnreadBadges();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_read_states" }, payload => {
      const state = payload.new || payload.old;
      if (!state || state.user_id === currentUser.id) return;
      if (
        (state.chat_type === "class" && state.chat_id === currentClass.id && activeMode === "class") ||
        (state.chat_type === "group" && selectedGroup?.id === state.chat_id && activeMode === "group") ||
        (state.chat_type === "private" && selectedPerson?.id === state.user_id && state.peer_id === currentUser.id && activeMode === "personal")
      ) {
        if (activeMode === "class") updateReadReceipts("class");
        else if (activeMode === "group") updateReadReceipts("group");
        else if (activeMode === "personal") updateReadReceipts("personal");
      }
      scheduleSidebarRefresh();
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "teacher_calls", filter: "class_id=eq." + currentClass.id }, payload => {
      const call = payload.new;
      if (currentProfile.role === "student" && call?.student_id === currentUser.id) {
        status.textContent = "У тебя новый вызов от учителя. Открой «Вызовы».";
        openCallsModal();
      } else if (currentProfile.role === "teacher" && call?.teacher_id === currentUser.id) {
        status.textContent = "Вызов ученику отправлен.";
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "school_presence" }, () => {
      loadPresence().then(() => renderPresencePanel()).catch(error => {
        status.textContent = "Не удалось обновить присутствие: " + readableError(error);
      });
    })
    .subscribe(state => {
      if (state === "SUBSCRIBED") status.textContent = "Онлайн · " + currentProfile.username;
      else if (state === "CHANNEL_ERROR") status.textContent = "Не удалось подключить обновления чата.";
    });
}

// ======================================
// ВЫХОД / ИНИЦИАЛИЗАЦИЯ
// ======================================

async function logout() {
  if (presenceRefreshTimer) { clearInterval(presenceRefreshTimer); presenceRefreshTimer = null; }
  if (realtimeChannel) { await db.removeChannel(realtimeChannel); realtimeChannel = null; }
  await db.auth.signOut();
  currentUser = null; currentProfile = null; currentClass = null;
  localStorage.removeItem("vachat_class_id");
  location.reload();
}

async function init() {
  try {
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    if (!data.session) return;
    currentUser = data.session.user;
    const { data: profile, error: profileError } = await db.from("profiles")
      .select("id, username, role, avatar_path").eq("id", currentUser.id).single();
    if (profileError) throw profileError;
    currentProfile = profile;
    const savedClassId = localStorage.getItem("vachat_class_id");
    if (savedClassId) {
      const { data: membership, error: mErr } = await db.from("class_members")
        .select("class_id").eq("class_id", savedClassId).eq("user_id", currentUser.id).maybeSingle();
      if (mErr) throw mErr;
      if (membership) {
        const { data: savedClass, error: cErr } = await db.from("classes")
          .select("id, name").eq("id", savedClassId).single();
        if (cErr) throw cErr;
        currentClass = { id: savedClass.id, name: savedClass.name };
        await showMessenger();
        return;
      }
      localStorage.removeItem("vachat_class_id");
    }
    // Восстанавливаем auth-card из DOM (мог остаться если не было messenger)
    const existingCard = document.querySelector(".auth-card");
    if (existingCard && existingCard.parentElement !== app) app.append(existingCard);
    className.value = ""; classPassword.value = "";
    username.value = profile.username; role.value = profile.role;
    setMode("login");
    showMessage("Ты уже вошёл в аккаунт. Введи класс и пароль.", "success");
  } catch (error) {
    showMessage(readableError(error), "error");
  }
}

setMode("login");
init().finally(() => finishSplash());