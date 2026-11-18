const SUPABASE_URL = "https://zohhimpltawkaflzxdxe.supabase.co";
const SUPABASE_KEY = "sb_publishable_1Ic64s3vJf3Q3eKr1w8fSQ_6oE_23gy";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
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

// ======================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ======================================

function makeElement(tag, className = "", text = "") {
  const element = document.createElement(tag);

  if (className) element.className = className;

  if (text !== undefined && text !== null) {
    element.textContent = String(text);
  }

  return element;
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
}

function setBusy(busy) {
  submitBtn.disabled = busy;
  submitBtn.textContent = busy
    ? "Подожди..."
    : mode === "login"
      ? "Войти"
      : "Зарегистрироваться";
}

function setMode(nextMode) {
  mode = nextMode;

  loginTab.classList.toggle("active", mode === "login");
  registerTab.classList.toggle("active", mode === "register");

  password.autocomplete =
    mode === "login" ? "current-password" : "new-password";

  teacherCodeField.classList.toggle(
    "hidden",
    mode !== "register" || role.value !== "teacher"
  );

  teacherCode.required =
    mode === "register" && role.value === "teacher";

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
    throw new Error(
      "Имя пользователя должно содержать от 3 до 24 символов. Разрешены русские и английские буквы, цифры, _ и -."
    );
  }

  // Для латинских имён сохраняем прежний адрес, чтобы старые аккаунты
  // продолжали входить без изменений.
  if (/^[a-z0-9_-]+$/.test(normalized)) {
    return normalized + "@vachat.example.com";
  }

  // Кириллическое имя кодируем в безопасный ASCII-адрес.
  // Отдельный домен исключает пересечение с прежними латинскими аккаунтами.
  const bytes = new TextEncoder().encode(normalized);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  const encoded = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return encoded + "@ru.vachat.example.com";
}

function readableError(error) {
  const text = error?.message || "Неизвестная ошибка";

  if (/invalid login credentials/i.test(text)) {
    return "Неверное имя пользователя или пароль.";
  }

  if (/user already registered/i.test(text)) {
    return "Это имя уже зарегистрировано. Попробуй войти.";
  }

  if (/email not confirmed/i.test(text)) {
    return "Подтверди email или отключи обязательное подтверждение для тестового проекта.";
  }

  if (/row-level security|permission denied/i.test(text)) {
    return "Supabase запретил это действие. Проверь SQL-политики и права доступа.";
  }

  return text;
}

function formatTime(value) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function initials(name) {
  return (name || "?").trim().slice(0, 1).toUpperCase();
}

// ======================================
// ТЕМА ОФОРМЛЕНИЯ
// ======================================

function getSavedTheme() {
  return localStorage.getItem("vachat_theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("vachat_theme", theme);
}

applyTheme(getSavedTheme());

// ======================================
// МОДАЛЬНЫЕ ОКНА
// ======================================

function openModal(title, content, buttons = []) {
  const overlay = makeElement("div", "va-modal-overlay");
  const modal = makeElement("div", "va-modal");

  const header = makeElement("div", "va-modal-header");
  header.append(makeElement("h2", "", title));

  const close = makeButton("×", "va-modal-close", () => {
    overlay.remove();
  });

  header.append(close);

  const body = makeElement("div", "va-modal-body");
  body.append(content);

  const footer = makeElement("div", "va-modal-footer");

  buttons.forEach(button => {
    footer.append(
      makeButton(
        button.text,
        button.className || "va-secondary-btn",
        () => button.callback(overlay)
      )
    );
  });

  modal.append(header, body);

  if (buttons.length) {
    modal.append(footer);
  }

  overlay.append(modal);

  overlay.addEventListener("click", event => {
    if (event.target === overlay) overlay.remove();
  });

  document.addEventListener("keydown", function escapeHandler(event) {
    if (event.key === "Escape") {
      overlay.remove();
      document.removeEventListener("keydown", escapeHandler);
    }
  });

  document.body.append(overlay);

  return {
    overlay,
    body,
    modal,
    close: () => overlay.remove()
  };
}

// ======================================
// РАБОТА С ИЗОБРАЖЕНИЯМИ
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

// В чатах можно отправлять изображения и видео. Для аватарок
// по-прежнему используется отдельная функция uploadImage.
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

  if (!file.type.startsWith("image/")) {
    throw new Error("Можно загружать только изображения.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Изображение должно быть не больше 5 МБ.");
  }

  const extension = (
    file.name.split(".").pop() || "jpg"
  ).toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";

  const path = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await db.storage
    .from("chat-media")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;

  return path;
}

async function uploadChatMedia(file, folder) {
  if (!file) return null;

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    throw new Error("Можно отправлять только изображения и видео.");
  }

  const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(isVideo
      ? "Видео должно быть не больше 50 МБ."
      : "Изображение должно быть не больше 5 МБ.");
  }

  const extension = (
    file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")
  ).toLowerCase().replace(/[^a-z0-9]/g, "") || (isVideo ? "mp4" : "jpg");
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await db.storage
    .from("chat-media")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;
  return path;
}

function isVideoMedia(path) {
  return /\.(mp4|webm|mov|m4v|ogv)$/i.test(path || "");
}

// Кэшируем подписанные ссылки, чтобы при каждом обновлении списка
// не запрашивать одни и те же аватары повторно.
const imageUrlCache = new Map();
const IMAGE_URL_CACHE_MS = 50 * 60 * 1000;
async function getImageUrl(path) {
  if (!path) return null;

  const cached = imageUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  imageUrlCache.delete(path);

  const promise = db.storage
    .from("chat-media")
    .createSignedUrl(path, 3600)
    .then(({ data, error }) => {
      if (error) throw error;
      return data?.signedUrl || null;
    })
    .catch(error => {
      console.warn("Ошибка получения изображения:", error.message);
      imageUrlCache.delete(path);
      return null;
    });

  imageUrlCache.set(path, {
    promise,
    expiresAt: Date.now() + IMAGE_URL_CACHE_MS
  });
  return promise;
}

async function makeAvatar(profile) {
  const avatar = makeElement("span", "avatar");

  if (profile?.avatar_path) {
    const url = await getImageUrl(profile.avatar_path);

    if (url) {
      const img = makeElement("img");
      img.src = url;
      img.alt = "Аватар пользователя";
      img.loading = "lazy";
      img.decoding = "async";
      avatar.append(img);
      return avatar;
    }
  }

  avatar.textContent = initials(profile?.username);
  return avatar;
}

async function changeAvatar() {
  try {
    const file = await chooseImage();

    if (!file) return;

    const path = await uploadImage(
      file,
      `avatars/${currentUser.id}`
    );

    const { error } = await db
      .from("profiles")
      .update({ avatar_path: path })
      .eq("id", currentUser.id);

    if (error) throw error;

    currentProfile.avatar_path = path;

    await showMessenger();

  } catch (error) {
    showMessage(
      "Не удалось изменить аватарку: " + readableError(error),
      "error"
    );
  }
}

// ======================================
// РЕГИСТРАЦИЯ И ВХОД
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
      const result = await db.auth.signUp({
        email: usernameEmail(name),
        password: pass
      });

      if (result.error) throw result.error;

      authData = result.data;

      if (!authData.session || !authData.user) {
        throw new Error(
          "Аккаунт создан, но вход ещё не выполнен."
        );
      }

      const { error } = await db.rpc("setup_profile", {
        p_username: name,
        p_role: selectedRole,
        p_teacher_code: selectedRole === "teacher"
          ? teacherCode.value
          : ""
      });

      if (error) throw error;

      currentProfile = {
        id: authData.user.id,
        username: name,
        role: selectedRole,
        avatar_path: null
      };

    } else {
      const result = await db.auth.signInWithPassword({
        email: usernameEmail(name),
        password: pass
      });

      if (result.error) throw result.error;

      authData = result.data;

      const { data: profile, error } = await db
        .from("profiles")
        .select("id, username, role, avatar_path")
        .eq("id", authData.user.id)
        .single();

      if (error) throw error;

      if (profile.role !== selectedRole) {
        await db.auth.signOut();
        throw new Error("Выбрана неверная роль для этого аккаунта.");
      }

      currentProfile = profile;
    }

    let classId;

    if (mode === "register" && selectedRole === "teacher") {
      const { data, error } = await db.rpc("create_class", {
        p_name: group,
        p_password: groupPass
      });

      if (error) throw error;

      classId = data;

    } else {
      const { data, error } = await db.rpc("join_class", {
        p_name: group,
        p_password: groupPass
      });

      if (error) throw error;

      classId = data;
    }

    currentUser = authData.user;

    currentClass = {
      id: classId,
      name: group
    };

    localStorage.setItem("vachat_class_id", classId);

    await showMessenger();

  } catch (error) {
    showMessage(readableError(error), "error");

  } finally {
    setBusy(false);
  }
});

// ======================================
// ОСНОВНОЙ ИНТЕРФЕЙС
// ======================================

async function showMessenger() {
  if (presenceRefreshTimer) {
    clearInterval(presenceRefreshTimer);
    presenceRefreshTimer = null;
  }

  if (realtimeChannel) {
    await db.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  app.replaceChildren();

  const shell = makeElement("section", "messenger");
  const topbar = makeElement("header", "topbar");

  const brand = makeElement("div", "brand");
  brand.append(makeElement("div", "brand-icon", "💬"));

  const brandText = makeElement("div");
  brandText.append(
    makeElement("h1", "", "VA Chat"),
    makeElement("p", "", "Школьный мессенджер")
  );

  brand.append(brandText);

  const identity = makeElement(
    "div",
    "user-identity",
    currentProfile.username + " · " +
    (currentProfile.role === "teacher" ? "Учитель" : "Ученик")
  );

  const avatarBtn = makeButton(
    "Моя аватарка",
    "secondary-btn",
    changeAvatar
  );

  const themeBtn = makeButton(
    getSavedTheme() === "dark" ? "☀️ Светлая тема" : "🌙 Тёмная тема",
    "secondary-btn theme-toggle-btn",
    () => {
      const nextTheme = getSavedTheme() === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      themeBtn.textContent = nextTheme === "dark" ? "☀️ Светлая тема" : "🌙 Тёмная тема";
    }
  );

  const logoutBtn = makeButton(
    "Выйти",
    "secondary-btn",
    logout
  );

  topbar.append(brand, identity, avatarBtn, themeBtn, logoutBtn);

  const tabs = makeElement("div", "chat-tabs");

  const classTab = makeButton(
    "Классный чат",
    "chat-tab active",
    () => switchTab("class")
  );

  const personalTab = makeButton(
    "Личные сообщения",
    "chat-tab",
    () => switchTab("personal")
  );

  tabs.append(classTab, personalTab);

  const layout = makeElement("div", "chat-layout");
  const sidebar = makeElement("aside", "sidebar");
  const panel = makeElement("section", "chat-panel");
  const heading = makeElement("header", "chat-heading");
  const messages = makeElement("div", "chat-messages");

  messages.setAttribute("aria-live", "polite");

  const status = makeElement("div", "status-line");

  const composer = makeElement("form", "composer");

  const textarea = makeElement("textarea");
  textarea.placeholder = "Напиши сообщение...";
  textarea.maxLength = 2000;
  textarea.setAttribute("aria-label", "Текст сообщения");

  const attachBtn = makeButton(
    "📎",
    "attach-btn",
    async () => {
      const file = await chooseChatMedia();

      if (file) {
        selectedFile = file;
        const kind = file.type.startsWith("video/") ? "Видео" : "Изображение";
        status.textContent = `${kind} прикреплено: ${file.name}`;
      }
    }
  );

  const sendBtn = makeElement("button", "send-btn", "Отправить");
  sendBtn.type = "submit";

  composer.append(textarea, attachBtn, sendBtn);

  panel.append(heading, messages, composer, status);
  layout.append(sidebar, panel);
  shell.append(topbar, tabs, layout);
  app.append(shell);

  let activeMode = "class";
  let selectedPerson = null;
  let selectedGroup = null;
  let selectedFile = null;
  let classmates = [];
  let customChats = [];
  let presenceRows = [];
  let presencePanel = null;

  // --------------------------------------
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ИНТЕРФЕЙСА
  // --------------------------------------

  function setActiveTab(which) {
    classTab.classList.toggle("active", which === "class");
    personalTab.classList.toggle("active", which === "personal");
  }

  function setHeading(title, subtitle, extra = null) {
    heading.replaceChildren(
      makeElement("h2", "", title),
      makeElement("p", "", subtitle)
    );

    if (extra) heading.append(extra);
  }

  function showEmpty(text) {
    messages.replaceChildren(
      makeElement("p", "empty-state", text)
    );
  }

  function sidebarButton(label, icon, callback, active = false) {
    const button = makeButton(
      "",
      "person-item" + (active ? " active" : ""),
      callback
    );

    button.append(
      makeElement("span", "avatar", icon),
      makeElement("span", "person-name", label)
    );

    return button;
  }

  function localDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function isPresentToday(row) {
    return Boolean(
      row &&
      row.is_at_school &&
      row.presence_date === localDateString()
    );
  }

  async function loadPresence() {
    const { data, error } = await db
      .from("school_presence")
      .select("user_id, is_at_school, presence_date");

    if (error) throw error;
    presenceRows = data || [];
  }

  async function setMyPresence(isAtSchool) {
    const today = localDateString();
    const existing = presenceRows.find(
      row => row.user_id === currentUser.id
    );

    let result;

    if (existing) {
      result = await db
        .from("school_presence")
        .update({
          is_at_school: isAtSchool,
          presence_date: today
        })
        .eq("user_id", currentUser.id);
    } else {
      result = await db
        .from("school_presence")
        .insert({
          user_id: currentUser.id,
          is_at_school: isAtSchool,
          presence_date: today
        });
    }

    if (result.error) throw result.error;

    await loadPresence();
    renderPresencePanel();
  }

  function renderPresencePanel() {
    if (!presencePanel) return;

    presencePanel.replaceChildren();
    presencePanel.append(
      makeElement("p", "sidebar-caption", "Присутствие в школе")
    );

    const ownRow = presenceRows.find(
      row => row.user_id === currentUser.id
    );
    const ownPresent = isPresentToday(ownRow);

    const ownStatus = makeElement(
      "div",
      "presence-own-status" + (ownPresent ? " is-present" : ""),
      ownPresent ? "● Сейчас ты в школе" : "● Сейчас ты не в школе"
    );
    presencePanel.append(ownStatus);

    const controls = makeElement("div", "presence-controls");
    const arriveButton = makeButton(
      "Я в школе",
      "presence-btn presence-btn-in" + (ownPresent ? " active" : ""),
      async () => {
        arriveButton.disabled = true;
        try {
          await setMyPresence(true);
        } catch (error) {
          status.textContent = "Не удалось изменить присутствие: " + readableError(error);
        } finally {
          arriveButton.disabled = false;
        }
      }
    );
    const absentButton = makeButton(
      "Не в школе",
      "presence-btn presence-btn-out" + (!ownPresent ? " active" : ""),
      async () => {
        absentButton.disabled = true;
        try {
          await setMyPresence(false);
        } catch (error) {
          status.textContent = "Не удалось изменить присутствие: " + readableError(error);
        } finally {
          absentButton.disabled = false;
        }
      }
    );
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
        makeElement(
          "span",
          "presence-person-role" + (person.role === "teacher" ? " is-teacher" : ""),
          person.role === "teacher" ? "Учитель" : "Ученик"
        )
      );

      item.append(
        identity,
        makeElement(
          "span",
          "presence-pill" + (present ? " is-present" : ""),
          present ? "В школе" : "Не в школе"
        )
      );
      list.append(item);
    }

    if (!classmates.length) {
      list.append(
        makeElement("p", "presence-empty", "Пока нет других участников класса.")
      );
    }

    presencePanel.append(list);
  }

  async function openCreateCallModal(student) {
    const content = makeElement("div");
    const description = makeElement("p", "call-modal-description", `Ученик: ${student.username}. Укажи, зачем нужно подойти.`);
    const field = makeElement("div", "va-field");
    const label = makeElement("label", "", "Причина вызова");
    const reason = makeElement("textarea", "", "");
    reason.rows = 4;
    reason.maxLength = 500;
    reason.placeholder = "Например: обсудить домашнее задание...";
    field.append(label, reason);
    content.append(description, field);

    const modal = openModal("Вызвать ученика", content, [
      {
        text: "Отправить вызов",
        className: "va-primary-btn",
        callback: async overlay => {
          const text = reason.value.trim();
          if (text.length < 3) {
            reason.focus();
            status.textContent = "Напиши причину вызова (минимум 3 символа).";
            return;
          }
          const send = overlay.querySelector(".va-primary-btn");
          if (send) send.disabled = true;
          try {
            const { error } = await db.from("teacher_calls").insert({
              class_id: currentClass.id,
              teacher_id: currentUser.id,
              student_id: student.id,
              reason: text
            });
            if (error) throw error;
            modal.close();
            status.textContent = `Вызов для ${student.username} отправлен.`;
          } catch (error) {
            if (send) send.disabled = false;
            status.textContent = "Не удалось отправить вызов: " + readableError(error);
          }
        }
      }
    ]);
    reason.focus();
  }

  async function loadMyCalls() {
    const column = currentProfile.role === "teacher" ? "teacher_id" : "student_id";
    const { data, error } = await db
      .from("teacher_calls")
      .select("id, class_id, teacher_id, student_id, reason, created_at, acknowledged_at")
      .eq(column, currentUser.id)
      .eq("class_id", currentClass.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data || [];
  }

  async function openCallsModal() {
    const content = makeElement("div", "teacher-calls-list");
    const modal = openModal(currentProfile.role === "teacher" ? "Отправленные вызовы" : "Вызовы учителя", content);
    content.append(makeElement("p", "call-modal-description", "Здесь отображаются вызовы по текущему классу."));
    try {
      const calls = await loadMyCalls();
      if (!calls.length) {
        content.append(makeElement("p", "presence-empty", "Вызовов пока нет."));
        return;
      }
      for (const call of calls) {
        const card = makeElement("article", "teacher-call-card");
        const otherId = currentProfile.role === "teacher" ? call.student_id : call.teacher_id;
        const other = classmates.find(person => person.id === otherId);
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
              const { data, error } = await db.rpc(
                "acknowledge_teacher_call",
                { p_call_id: call.id }
              );

              if (error) throw error;

              if (data !== true) {
                throw new Error(
                  "Supabase не подтвердил изменение. Проверь SQL-функцию acknowledge_teacher_call."
                );
              }

              call.acknowledged_at = new Date().toISOString();
              modal.close();
              await openCallsModal();
            } catch (error) {
              if (button) button.disabled = false;
              status.textContent =
                "Не удалось подтвердить вызов: " + readableError(error);
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

  const callsButton = makeButton(
    currentProfile.role === "teacher" ? "Мои вызовы" : "Вызовы учителя",
    "secondary-btn calls-open-btn",
    openCallsModal
  );
  topbar.append(callsButton);

  async function renderSidebarNow() {
    const sidebarContent = document.createDocumentFragment();
    sidebarContent.append(
      makeElement("h2", "", activeMode === "personal" ? "Одноклассники" : "Мои чаты")
    );

    // Загружаем все счётчики параллельно, а не по одному для каждого чата.
    const unreadKeys = activeMode === "personal"
      ? classmates.map(person => ["private", currentClass.id, person.id, `private:${person.id}`])
      : [["class", currentClass.id, null, `class:${currentClass.id}`],
         ...customChats.map(chat => ["group", chat.id, null, `group:${chat.id}`])];
    const unreadValues = await Promise.all(unreadKeys.map(([type, id, peer]) =>
      countUnread(type, id, peer).catch(error => {
        console.warn("Не удалось получить счётчик непрочитанных:", error);
        return 0;
      })
    ));
    const unreadCounts = new Map(unreadKeys.map((key, index) => [key[3], unreadValues[index]]));

    if (activeMode !== "personal") {
      const classButton = sidebarButton(
        "Классный чат",
        "К",
        () => switchTab("class"),
        activeMode === "class"
      );
      addUnreadBadge(classButton, unreadCounts.get(`class:${currentClass.id}`) || 0);
      sidebarContent.append(classButton);

      sidebarContent.append(
        makeButton(
          "+ Создать групповой чат",
          "create-chat-btn",
          createCustomChat
        )
      );

      sidebarContent.append(
        makeElement("p", "sidebar-caption", "Групповые чаты")
      );

      const chatButtons = await Promise.all(customChats.map(async chat => {
        const button = makeButton(
          "",
          "person-item" +
          (selectedGroup?.id === chat.id ? " active" : ""),
          () => openCustomChat(chat)
        );
        button.append(
          await makeAvatar({ username: chat.name, avatar_path: chat.image_path }),
          makeElement("span", "person-name", chat.name)
        );
        addUnreadBadge(button, unreadCounts.get(`group:${chat.id}`) || 0);
        return button;
      }));
      sidebarContent.append(...chatButtons);

    } else {
      const personRows = await Promise.all(classmates.map(async person => {
        const personRow = makeElement("div", "person-row-with-action");
        const button = makeButton(
          "",
          "person-item" +
          (selectedPerson?.id === person.id ? " active" : ""),
          () => openPersonalChat(person)
        );
        button.append(
          await makeAvatar(person),
          makeElement("span", "person-name", person.username)
        );
        addUnreadBadge(button, unreadCounts.get(`private:${person.id}`) || 0);
        personRow.append(button);
        if (currentProfile.role === "teacher" && person.role === "student") {
          personRow.append(
            makeButton("Вызвать", "teacher-call-mini-btn", () => openCreateCallModal(person))
          );
        }
        return personRow;
      }));
      sidebarContent.append(...personRows);

      if (!classmates.length) {
        sidebarContent.append(
          makeElement(
            "p",
            "empty-state",
            "В классе пока нет других участников."
          )
        );
      }
    }

    if (!presencePanel) {
      presencePanel = makeElement("section", "presence-panel");
    }
    sidebarContent.append(presencePanel);
    renderPresencePanel();
    sidebar.replaceChildren(sidebarContent);
  }


  // Не допускаем параллельные перерисовки: повторные запросы объединяются.
  let sidebarRefreshPromise = null;
  let sidebarRefreshPending = false;
  async function refreshSidebar() {
    if (sidebarRefreshPromise) {
      sidebarRefreshPending = true;
      return sidebarRefreshPromise;
    }
    sidebarRefreshPromise = (async () => {
      do {
        sidebarRefreshPending = false;
        await renderSidebarNow();
      } while (sidebarRefreshPending);
    })();
    try {
      await sidebarRefreshPromise;
    } finally {
      sidebarRefreshPromise = null;
    }
  }

  // --------------------------------------
  // ЗАГРУЗКА СПИСКОВ
  // --------------------------------------

  async function loadClassmates() {
    const { data: memberships, error } = await db
      .from("class_members")
      .select("user_id")
      .eq("class_id", currentClass.id);

    if (error) throw error;

    const ids = [...new Set(
      (memberships || [])
        .map(row => row.user_id)
        .filter(id => id !== currentUser.id)
    )];

    if (!ids.length) {
      classmates = [];
      return;
    }

    const { data, error: profileError } = await db
      .from("profiles")
      .select("id, username, avatar_path, role")
      .in("id", ids)
      .order("username");

    if (profileError) throw profileError;

    classmates = data || [];
  }

  async function loadCustomChats() {
    const { data, error } = await db
      .from("custom_chats")
      .select("id, name, image_path, created_by, class_id")
      .eq("class_id", currentClass.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    customChats = data || [];
  }

  // --------------------------------------
  // НЕПРОЧИТАННЫЕ СООБЩЕНИЯ И ПРОЧТЕНИЕ
  // --------------------------------------

  async function getChatReadAt(type, chatId, peerId = null) {
    const { data, error } = await db.rpc("vachat_get_other_read_at", {
      p_type: type,
      p_chat_id: chatId,
      p_peer_id: peerId
    });
    if (error) throw error;
    return data || null;
  }

  async function markChatRead(type, chatId, peerId = null) {
    const values = {
      user_id: currentUser.id,
      chat_type: type,
      chat_id: chatId,
      peer_id: peerId,
      last_read_at: new Date().toISOString()
    };
    const { error } = await db
      .from("chat_read_states")
      .upsert(values, { onConflict: "user_id,chat_type,chat_id,peer_id" });
    if (error) throw error;
  }

  async function countUnread(type, chatId, peerId = null) {
    let readQuery = db.from("chat_read_states")
      .select("last_read_at")
      .eq("user_id", currentUser.id)
      .eq("chat_type", type)
      .eq("chat_id", chatId);

    if (peerId) readQuery = readQuery.eq("peer_id", peerId);
    else readQuery = readQuery.is("peer_id", null);

    const { data: state, error: stateError } = await readQuery.maybeSingle();
    if (stateError) throw stateError;

    let query;
    if (type === "class") {
      query = db.from("messages").select("id", { count: "exact", head: true })
        .eq("class_id", chatId).neq("user_id", currentUser.id);
    } else if (type === "group") {
      query = db.from("custom_chat_messages").select("id", { count: "exact", head: true })
        .eq("chat_id", chatId).neq("sender_id", currentUser.id);
    } else {
      query = db.from("private_messages").select("id", { count: "exact", head: true })
        .eq("class_id", currentClass.id)
        .eq("sender_id", peerId)
        .eq("recipient_id", currentUser.id);
    }

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
      refreshSidebar().catch(error => console.warn("Не удалось обновить список чатов:", error));
    }, 220);
  }

  async function refreshUnreadBadges() {
    if (activeMode === "personal") return;
    scheduleSidebarRefresh();
  }

  // --------------------------------------
  // ОТОБРАЖЕНИЕ СООБЩЕНИЙ
  // --------------------------------------

  async function renderMessages(rows, kind) {
    let otherReadAt = null;
    if (kind === "class") {
      otherReadAt = await getChatReadAt("class", currentClass.id);
    } else if (kind === "group" && selectedGroup) {
      otherReadAt = await getChatReadAt("group", selectedGroup.id);
    } else if (kind === "personal" && selectedPerson) {
      otherReadAt = await getChatReadAt("private", currentClass.id, selectedPerson.id);
    }

    const fragment = document.createDocumentFragment();

    if (!rows?.length) {
      fragment.append(
        makeElement(
          "p",
          "empty-state",
          "Пока сообщений нет. Напиши первое!"
        )
      );

      messages.replaceChildren(fragment);
      return;
    }

    for (const item of rows) {
      const mine =
        item.sender_id === currentUser.id ||
        item.user_id === currentUser.id;

      const bubble = makeElement(
        "article",
        "chat-message" + (mine ? " mine" : "")
      );

      if (kind !== "personal") {
        const authorRow = makeElement("div", "message-author-row");

        const author = item.profiles || (
          mine ? currentProfile : null
        );

        authorRow.append(
          await makeAvatar(author || { username: "Участник" }),
          makeElement(
            "div",
            "message-author",
            author?.username || "Участник"
          )
        );

        bubble.append(authorRow);
      }

      if (item.body) {
        bubble.append(
          makeElement("div", "message-body", item.body)
        );
      }

      if (item.image_path) {
        const url = await getImageUrl(item.image_path);

        if (url && isVideoMedia(item.image_path)) {
          const video = makeElement("video", "message-video");
          video.src = url;
          video.controls = true;
          video.playsInline = true;
          video.preload = "metadata";
          video.setAttribute("aria-label", "Видео в сообщении");
          bubble.append(video);
        } else if (url) {
          const img = makeElement("img", "message-image");
          img.src = url;
          img.alt = "Изображение в сообщении";
          img.loading = "lazy";

          img.addEventListener("click", () => {
            window.open(url, "_blank", "noopener");
          });

          bubble.append(img);
        } else {
          bubble.append(
            makeElement(
              "p",
              "message-image-error",
              "Не удалось загрузить файл."
            )
          );
        }
      }

      const footer = makeElement("div", "message-footer");

      footer.append(
        makeElement("time", "message-time", formatTime(item.created_at))
      );

      if (mine && otherReadAt && new Date(otherReadAt) >= new Date(item.created_at)) {
        footer.append(makeElement("span", "read-receipt", "✓✓ Прочитано"));
      }

      const canDelete =
        mine ||
        (kind === "class" && currentProfile.role === "teacher") ||
        (kind === "group" && selectedGroup?.created_by === currentUser.id);

      if (canDelete) {
        footer.append(
          makeButton(
            "Удалить",
            "delete-message-btn",
            () => deleteMessage(item.id, kind)
          )
        );
      }

      bubble.append(footer);
      fragment.append(bubble);
    }

    messages.replaceChildren(fragment);
    messages.scrollTop = messages.scrollHeight;
  }

  async function loadClassMessages() {
    const { data, error } = await db
      .from("messages")
      .select(
        "id, user_id, body, image_path, created_at, profiles(username, avatar_path)"
      )
      .eq("class_id", currentClass.id)
      .order("created_at", { ascending: true })
      .limit(150);

    if (error) throw error;

    await renderMessages(data, "class");
    await markChatRead("class", currentClass.id);
    status.textContent = "Общий чат класса";
    await refreshUnreadBadges();
  }

  async function loadPersonalMessages() {
    if (!selectedPerson) {
      showEmpty("Выбери одноклассника слева.");
      return;
    }

    const { data, error } = await db
      .from("private_messages")
      .select(
        "id, sender_id, recipient_id, body, image_path, created_at"
      )
      .eq("class_id", currentClass.id)
      .or(
        `and(sender_id.eq.${currentUser.id},recipient_id.eq.${selectedPerson.id}),and(sender_id.eq.${selectedPerson.id},recipient_id.eq.${currentUser.id})`
      )
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw error;

    await renderMessages(data, "personal");
    await markChatRead("private", currentClass.id, selectedPerson.id);

    status.textContent =
      "Личная переписка · " + selectedPerson.username;
    await refreshSidebar();
  }

  async function loadGroupMessages() {
    if (!selectedGroup) return;

    const { data, error } = await db
      .from("custom_chat_messages")
      .select(
        "id, sender_id, body, image_path, created_at, profiles(username, avatar_path)"
      )
      .eq("chat_id", selectedGroup.id)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw error;

    await renderMessages(data, "group");
    await markChatRead("group", selectedGroup.id);

    status.textContent =
      "Групповой чат · " + selectedGroup.name;
    await refreshUnreadBadges();
  }

  // --------------------------------------
  // ОТКРЫТИЕ ЧАТОВ
  // --------------------------------------

  async function openPersonalChat(person) {
    selectedPerson = person;
    selectedGroup = null;
    activeMode = "personal";

    setActiveTab("personal");

    await refreshSidebar();

    setHeading(person.username, "Личная переписка");

    textarea.placeholder =
      "Сообщение для " + person.username + "...";

    await loadPersonalMessages();
  }

  async function openCustomChat(chat) {
    selectedGroup = chat;
    selectedPerson = null;
    activeMode = "group";

    setActiveTab("");

    await refreshSidebar();

    const actions = makeElement("div", "heading-actions");

    actions.append(
      makeButton("Участники", "secondary-btn", showGroupMembers)
    );

    if (chat.created_by === currentUser.id) {
      actions.append(
        makeButton("Настройки группы", "secondary-btn", groupSettings)
      );
    }

    setHeading(chat.name, "Групповой чат", actions);

    textarea.placeholder = "Сообщение в группу...";

    await loadGroupMessages();
  }

  async function switchTab(which) {
    selectedPerson = null;
    selectedGroup = null;
    activeMode = which;

    setActiveTab(which);

    if (which === "class") {
      textarea.placeholder = "Напиши сообщение...";

      await refreshSidebar();

      setHeading(currentClass.name, "Общий чат класса");

      await loadClassMessages();

    } else {
      try {
        await loadClassmates();
        await refreshSidebar();

        setHeading(
          "Личные сообщения",
          "Выбери собеседника слева"
        );

        showEmpty(
          "Выбери одноклассника слева, чтобы начать переписку."
        );

        status.textContent = "Личные сообщения";

      } catch (error) {
        status.textContent =
          "Ошибка загрузки списка: " + readableError(error);
      }
    }
  }

  // --------------------------------------
  // СОЗДАНИЕ ГРУППЫ
  // --------------------------------------

  async function createCustomChat() {
    try {
      await loadClassmates();

      const content = makeElement("div");

      const nameField = makeElement("div", "va-field");
      nameField.append(
        makeElement("label", "", "Название группы")
      );

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

        const text = makeElement("span", "", person.username);

        label.append(checkbox, text);
        list.append(label);

        checkboxes.push({
          person,
          label,
          checkbox
        });
      }

      search.addEventListener("input", () => {
        const query = search.value.toLowerCase();

        checkboxes.forEach(item => {
          item.label.hidden =
            !item.person.username.toLowerCase().includes(query);
        });
      });

      content.append(nameField, search, list);

      openModal("Создать групповой чат", content, [
        {
          text: "Отмена",
          className: "va-secondary-btn",
          callback: overlay => overlay.remove()
        },
        {
          text: "Создать",
          className: "va-primary-btn",
          callback: async overlay => {
            const name = nameInput.value.trim();

            if (!name) {
              alert("Введи название группы.");
              return;
            }

            const selectedIds = checkboxes
              .filter(item => item.checkbox.checked)
              .map(item => item.person.id);

            try {
              const { data: chat, error } = await db
                .from("custom_chats")
                .insert({
                  class_id: currentClass.id,
                  name,
                  created_by: currentUser.id
                })
                .select(
                  "id, name, image_path, created_by, class_id"
                )
                .single();

              if (error) throw error;

              const memberIds = [
                ...new Set([currentUser.id, ...selectedIds])
              ];

              const { error: memberError } = await db
                .from("custom_chat_members")
                .insert(
                  memberIds.map(userId => ({
                    chat_id: chat.id,
                    user_id: userId
                  }))
                );

              if (memberError) throw memberError;

              overlay.remove();

              await loadCustomChats();
              await openCustomChat(chat);

            } catch (error) {
              alert(
                "Не удалось создать группу: " +
                readableError(error)
              );
            }
          }
        }
      ]);

    } catch (error) {
      status.textContent =
        "Ошибка создания группы: " + readableError(error);
    }
  }

  // --------------------------------------
  // УЧАСТНИКИ ГРУППЫ
  // --------------------------------------

  async function getGroupProfiles() {
    const { data, error } = await db.rpc(
      "get_custom_chat_members",
      {
        p_chat_id: selectedGroup.id
      }
    );

    if (error) throw error;

    return data || [];
  }

  async function showGroupMembers() {
    if (!selectedGroup) return;

    try {
      const profiles = await getGroupProfiles();

      const list = makeElement("div", "member-list");

      if (!profiles.length) {
        list.append(
          makeElement("p", "empty-state", "Участников пока нет.")
        );
      }

      for (const person of profiles) {
        const item = makeElement("div", "member-item");

        item.append(await makeAvatar(person));

        const info = makeElement("div", "member-info");

        info.append(
          makeElement("div", "member-name", person.username),
          makeElement(
            "div",
            "member-caption",
            person.id === selectedGroup.created_by
              ? "Создатель группы"
              : "Участник"
          )
        );

        item.append(info);
        list.append(item);
      }

      openModal("Участники группы", list);

    } catch (error) {
      status.textContent =
        "Не удалось загрузить участников: " + readableError(error);
    }
  }

  // --------------------------------------
  // УПРАВЛЕНИЕ УЧАСТНИКАМИ
  // --------------------------------------

  async function manageGroupMembers() {
    if (
      !selectedGroup ||
      selectedGroup.created_by !== currentUser.id
    ) {
      return;
    }

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

        const text = makeElement("span", "", person.username);

        label.append(checkbox, text);
        list.append(label);

        checkboxes.push({
          person,
          checkbox,
          label
        });
      }

      search.addEventListener("input", () => {
        const query = search.value.toLowerCase();

        checkboxes.forEach(item => {
          item.label.hidden =
            !item.person.username.toLowerCase().includes(query);
        });
      });
      content.append(search, list);

      openModal("Управление участниками", content, [
        {
          text: "Отмена",
          className: "va-secondary-btn",
          callback: overlay => overlay.remove()
        },
        {
          text: "Сохранить",
          className: "va-primary-btn",
          callback: async overlay => {
            try {
              const selectedIds = new Set(
                checkboxes
                  .filter(item => item.checkbox.checked)
                  .map(item => item.person.id)
              );

              for (const person of profiles) {
                if (
                  person.id !== currentUser.id &&
                  !selectedIds.has(person.id)
                ) {
                  const { error } = await db.rpc(
                    "remove_custom_chat_member",
                    {
                      p_chat_id: selectedGroup.id,
                      p_user_id: person.id
                    }
                  );

                  if (error) throw error;
                }
              }

              for (const id of selectedIds) {
                if (!currentIds.has(id)) {
                  const { error } = await db.rpc(
                    "add_custom_chat_member",
                    {
                      p_chat_id: selectedGroup.id,
                      p_user_id: id
                    }
                  );

                  if (error) throw error;
                }
              }

              overlay.remove();

              status.textContent = "Участники обновлены.";

              await showGroupMembers();

            } catch (error) {
              alert(
                "Ошибка изменения участников: " +
                readableError(error)
              );
            }
          }
        }
      ]);

    } catch (error) {
      status.textContent =
        "Ошибка загрузки участников: " + readableError(error);
    }
  }

  // --------------------------------------
  // НАСТРОЙКИ ГРУППЫ
  // --------------------------------------

  async function groupSettings() {
    if (
      !selectedGroup ||
      selectedGroup.created_by !== currentUser.id
    ) {
      return;
    }

    const content = makeElement("div");

    const nameField = makeElement("div", "va-field");
    nameField.append(
      makeElement("label", "", "Название группы")
    );

    const nameInput = makeElement("input");
    nameInput.value = selectedGroup.name;
    nameInput.maxLength = 60;

    nameField.append(nameInput);

    const imageButton = makeButton(
      "Изменить изображение группы",
      "va-secondary-btn",
      async () => {
        try {
          const file = await chooseImage();

          if (!file) return;

          const path = await uploadImage(
            file,
            `groups/${selectedGroup.id}/${currentUser.id}`
          );

          const { error } = await db.rpc("update_custom_chat", {
            p_chat_id: selectedGroup.id,
            p_name: nameInput.value.trim() || selectedGroup.name,
            p_image_path: path
          });

          if (error) throw error;

          selectedGroup.image_path = path;

          await loadCustomChats();
          await openCustomChat(selectedGroup);

          alert("Изображение группы обновлено.");

        } catch (error) {
          alert(readableError(error));
        }
      }
    );

    const membersButton = makeButton(
      "Управление участниками",
      "va-secondary-btn",
      async () => {
        await manageGroupMembers();
      }
    );

    content.append(nameField, imageButton, membersButton);

    openModal("Настройки группы", content, [
      {
        text: "Закрыть",
        className: "va-secondary-btn",
        callback: overlay => overlay.remove()
      },
      {
        text: "Сохранить",
        className: "va-primary-btn",
        callback: async overlay => {
          try {
            const name = nameInput.value.trim();

            if (!name) {
              alert("Название группы не может быть пустым.");
              return;
            }

            const { error } = await db.rpc("update_custom_chat", {
              p_chat_id: selectedGroup.id,
              p_name: name,
              p_image_path: selectedGroup.image_path || null
            });

            if (error) throw error;

            selectedGroup.name = name;

            overlay.remove();

            await loadCustomChats();
            await openCustomChat(selectedGroup);

            status.textContent = "Настройки сохранены.";

          } catch (error) {
            alert(readableError(error));
          }
        }
      }
    ]);
  }

  // --------------------------------------
  // УДАЛЕНИЕ СООБЩЕНИЙ
  // --------------------------------------

  async function deleteMessage(id, kind) {
    if (!confirm("Удалить это сообщение?")) return;

    const table = kind === "class"
      ? "messages"
      : kind === "personal"
        ? "private_messages"
        : "custom_chat_messages";

    const { error } = await db
      .from(table)
      .delete()
      .eq("id", id);

    if (error) {
      status.textContent =
        "Не удалось удалить сообщение: " + readableError(error);
      return;
    }

    if (kind === "class") {
      await loadClassMessages();
    } else if (kind === "personal") {
      await loadPersonalMessages();
    } else {
      await loadGroupMessages();
    }
  }

  // --------------------------------------
  // ОТПРАВКА СООБЩЕНИЙ И КАРТИНОК
  // --------------------------------------

  composer.addEventListener("submit", async event => {
    event.preventDefault();

    const body = textarea.value.trim();
    const file = selectedFile;

    if (!body && !file) return;

    if (body.length > 2000) {
      status.textContent = "Сообщение слишком длинное.";
      return;
    }

    if (activeMode === "personal" && !selectedPerson) {
      status.textContent = "Сначала выбери собеседника.";
      return;
    }

    if (activeMode === "group" && !selectedGroup) {
      status.textContent = "Сначала выбери групповой чат.";
      return;
    }

    sendBtn.disabled = true;

    try {
      let imagePath = null;

      if (file) {
        let folder;

        if (activeMode === "class") {
          folder = `class/${currentClass.id}/${currentUser.id}`;

        } else if (activeMode === "group") {
          folder = `groups/${selectedGroup.id}/${currentUser.id}`;

        } else {
          folder = `private/${currentClass.id}/${currentUser.id}/${selectedPerson.id}`;
        }

        imagePath = await uploadChatMedia(file, folder);
      }

      let result;

      if (activeMode === "class") {
        result = await db
          .from("messages")
          .insert({
            class_id: currentClass.id,
            user_id: currentUser.id,
            body: body || null,
            image_path: imagePath
          });

      } else if (activeMode === "personal") {
        result = await db
          .from("private_messages")
          .insert({
            class_id: currentClass.id,
            sender_id: currentUser.id,
            recipient_id: selectedPerson.id,
            body: body || null,
            image_path: imagePath
          });

      } else {
        result = await db
          .from("custom_chat_messages")
          .insert({
            chat_id: selectedGroup.id,
            sender_id: currentUser.id,
            body: body || null,
            image_path: imagePath
          });
      }

      if (result.error) throw result.error;

      textarea.value = "";
      selectedFile = null;

      if (activeMode === "class") {
        await loadClassMessages();

      } else if (activeMode === "personal") {
        await loadPersonalMessages();

      } else {
        await loadGroupMessages();
      }

    } catch (error) {
      status.textContent =
        "Ошибка отправки: " + readableError(error);

    } finally {
      sendBtn.disabled = false;
      textarea.focus();
    }
  });

  // --------------------------------------
  // ПЕРВОНАЧАЛЬНАЯ ЗАГРУЗКА
  // --------------------------------------

  // Эти три запроса независимы — выполняем одновременно, а не цепочкой.
  await Promise.all([
    loadClassmates(),
    loadCustomChats(),
    loadPresence()
  ]);
  await refreshSidebar();
  await loadClassMessages();

  // Если страница остаётся открытой через полночь,
  // вчерашняя отметка автоматически отображается как «Не в школе».
  presenceRefreshTimer = setInterval(() => {
    renderPresencePanel();
  }, 60 * 1000);

  // --------------------------------------
  // ОБНОВЛЕНИЯ В РЕАЛЬНОМ ВРЕМЕНИ
  // --------------------------------------

  realtimeChannel = db
    .channel("va-chat-" + currentClass.id + "-" + currentUser.id)

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: "class_id=eq." + currentClass.id
      },
      () => {
        if (activeMode === "class") {
          loadClassMessages().catch(error => {
            status.textContent = readableError(error);
          });
        } else {
          refreshUnreadBadges();
        }
      }
    )

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "private_messages",
        filter: "class_id=eq." + currentClass.id
      },
      payload => {
        const item = payload.new || payload.old;

        if (
          activeMode === "personal" &&
          selectedPerson &&
          item &&
          (
            (
              item.sender_id === currentUser.id &&
              item.recipient_id === selectedPerson.id
            ) ||
            (
              item.sender_id === selectedPerson.id &&
              item.recipient_id === currentUser.id
            )
          )
        ) {
          loadPersonalMessages();
        } else {
          scheduleSidebarRefresh();
        }
      }
    )

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "custom_chat_messages"
      },
      payload => {
        const item = payload.new || payload.old;

        if (
          activeMode === "group" &&
          selectedGroup &&
          item?.chat_id === selectedGroup.id
        ) {
          loadGroupMessages();
        } else {
          refreshUnreadBadges();
        }
      }
    )

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_read_states"
      },
      payload => {
        const state = payload.new || payload.old;
        if (!state || state.user_id === currentUser.id) return;

        if (
          (state.chat_type === "class" && state.chat_id === currentClass.id && activeMode === "class") ||
          (state.chat_type === "group" && selectedGroup?.id === state.chat_id && activeMode === "group") ||
          (state.chat_type === "private" && selectedPerson?.id === state.user_id && state.peer_id === currentUser.id && activeMode === "personal")
        ) {
          if (activeMode === "class") loadClassMessages();
          else if (activeMode === "group") loadGroupMessages();
          else if (activeMode === "personal") loadPersonalMessages();
        }
        scheduleSidebarRefresh();
      }
    )

    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "teacher_calls",
        filter: "class_id=eq." + currentClass.id
      },
      payload => {
        const call = payload.new;
        if (currentProfile.role === "student" && call?.student_id === currentUser.id) {
          status.textContent = "У тебя новый вызов от учителя. Открой «Вызовы учителя».";
          openCallsModal();
        } else if (currentProfile.role === "teacher" && call?.teacher_id === currentUser.id) {
          status.textContent = "Вызов ученику отправлен.";
        }
      }
    )

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "school_presence"
      },
      () => {
        loadPresence()
          .then(() => renderPresencePanel())
          .catch(error => {
            status.textContent = "Не удалось обновить присутствие: " + readableError(error);
          });
      }
    )

    .subscribe(state => {
      if (state === "SUBSCRIBED") {
        status.textContent = "Онлайн · " + currentProfile.username;

      } else if (state === "CHANNEL_ERROR") {
        status.textContent =
          "Не удалось подключить обновления чата.";
      }
    });
}

// ======================================
// ВЫХОД ИЗ АККАУНТА
// ======================================

async function logout() {
  if (presenceRefreshTimer) {
    clearInterval(presenceRefreshTimer);
    presenceRefreshTimer = null;
  }

  if (realtimeChannel) {
    await db.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  await db.auth.signOut();

  currentUser = null;
  currentProfile = null;
  currentClass = null;

  localStorage.removeItem("vachat_class_id");

  location.reload();
}

// ======================================
// ВОССТАНОВЛЕНИЕ СЕССИИ
// ======================================

async function init() {
  try {
    const { data, error } = await db.auth.getSession();

    if (error) throw error;
    if (!data.session) return;

    currentUser = data.session.user;

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id, username, role, avatar_path")
      .eq("id", currentUser.id)
      .single();

    if (profileError) throw profileError;

    currentProfile = profile;

    const savedClassId = localStorage.getItem("vachat_class_id");

    if (savedClassId) {
      const { data: membership, error: membershipError } = await db
        .from("class_members")
        .select("class_id")
        .eq("class_id", savedClassId)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (membershipError) throw membershipError;

      if (membership) {
        const { data: savedClass, error: classError } = await db
          .from("classes")
          .select("id, name")
          .eq("id", savedClassId)
          .single();

        if (classError) throw classError;

        currentClass = {
          id: savedClass.id,
          name: savedClass.name
        };

        await showMessenger();
        return;
      }

      localStorage.removeItem("vachat_class_id");
    }

    app.replaceChildren(authForm.closest(".auth-card"));

    className.value = "";
    classPassword.value = "";
    username.value = profile.username;
    role.value = profile.role;

    setMode("login");

    showMessage(
      "Ты уже вошёл в аккаунт. Введи название класса и пароль, чтобы открыть чат.",
      "success"
    );

  } catch (error) {
    showMessage(readableError(error), "error");
  }
}

setMode("login");
init();