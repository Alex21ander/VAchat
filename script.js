
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
let loadingMessages = false;

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
  const normalized = name.trim().toLowerCase();

  if (!/^[a-z0-9_-]{3,24}$/.test(normalized)) {
    throw new Error(
      "Имя пользователя: от 3 до 24 символов. Используй английские буквы, цифры, _ или -."
    );
  }

  return normalized + "@vachat.example.com";
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

async function getImageUrl(path) {
  if (!path) return null;

  const { data, error } = await db.storage
    .from("chat-media")
    .createSignedUrl(path, 3600);

  if (error) {
    console.warn("Ошибка получения изображения:", error.message);
    return null;
  }

  return data.signedUrl;
}

async function makeAvatar(profile) {
  const avatar = makeElement("span", "avatar");

  if (profile?.avatar_path) {
    const url = await getImageUrl(profile.avatar_path);

    if (url) {
      const img = makeElement("img");
      img.src = url;
      img.alt = "Аватар пользователя";
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

    showMessage("Аватарка обновлена.", "success");

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

  const logoutBtn = makeButton(
    "Выйти",
    "secondary-btn",
    logout
  );

  topbar.append(brand, identity, avatarBtn, logoutBtn);

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
      const file = await chooseImage();
      if (file) {
        selectedFile = file;
        status.textContent = "Прикреплено: " + file.name;
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

  async function refreshSidebar() {
    sidebar.replaceChildren(
      makeElement(
        "h2",
        "",
        activeMode === "personal" ? "Одноклассники" : "Мои чаты"
      )
    );

    if (activeMode !== "personal") {
      sidebar.append(
        sidebarButton(
          "Классный чат",
          "К",
          () => switchTab("class"),
          activeMode === "class"
        )
      );

      sidebar.append(
        makeButton(
          "+ Создать групповой чат",
          "create-chat-btn",
          createCustomChat
        )
      );

      sidebar.append(
        makeElement("p", "sidebar-caption", "Групповые чаты")
      );

      for (const chat of customChats) {
        sidebar.append(
          sidebarButton(
            chat.name,
            "Г",
            () => openCustomChat(chat),
            selectedGroup?.id === chat.id
          )
        );
      }

    } else {
      for (const person of classmates) {
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

        sidebar.append(button);
      }

      if (!classmates.length) {
        sidebar.append(
          makeElement("p", "empty-state", "В классе пока нет других участников.")
        );
      }
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
      .select("id, username, avatar_path")
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
  // ОТОБРАЖЕНИЕ СООБЩЕНИЙ
  // --------------------------------------

  async function renderMessages(rows, kind) {
    const fragment = document.createDocumentFragment();

    if (!rows?.length) {
      fragment.append(
        makeElement("p", "empty-state", "Пока сообщений нет. Напиши первое!")
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
        bubble.append(
          makeElement(
            "div",
            "message-author",
            item.profiles?.username ||
            (mine ? currentProfile.username : "Участник")
          )
        );
      }

      if (item.body) {
        bubble.append(
          makeElement("div", "message-body", item.body)
        );
      }

      if (item.image_path) {
        const url = await getImageUrl(item.image_path);

        if (url) {
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
            makeElement("p", "message-image-error", "Не удалось загрузить изображение.")
          );
        }
      }

      const footer = makeElement("div", "message-footer");

      footer.append(
        makeElement("time", "message-time", formatTime(item.created_at))
      );

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
      .select("id, user_id, body, image_path, created_at, profiles(username)")
      .eq("class_id", currentClass.id)
      .order("created_at", { ascending: true })
      .limit(150);

    if (error) throw error;

    await renderMessages(data, "class");
    status.textContent = "Общий чат класса";
  }

  async function loadPersonalMessages() {
    if (!selectedPerson) {
      showEmpty("Выбери одноклассника слева.");
      return;
    }

    const { data, error } = await db
      .from("private_messages")
      .select("id, sender_id, recipient_id, body, image_path, created_at")
      .eq("class_id", currentClass.id)
      .or(
        `and(sender_id.eq.${currentUser.id},recipient_id.eq.${selectedPerson.id}),and(sender_id.eq.${selectedPerson.id},recipient_id.eq.${currentUser.id})`
      )
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw error;

    await renderMessages(data, "personal");

    status.textContent =
      "Личная переписка · " + selectedPerson.username;
  }

  async function loadGroupMessages() {
    if (!selectedGroup) return;

    const { data, error } = await db
      .from("custom_chat_messages")
      .select("id, sender_id, body, image_path, created_at, profiles(username)")
      .eq("chat_id", selectedGroup.id)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw error;

    await renderMessages(data, "group");

    status.textContent =
      "Групповой чат · " + selectedGroup.name;
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
    const name = prompt("Как назвать групповой чат?");

    if (!name?.trim()) return;

    const namesText = prompt(
      "Введи имена участников через запятую.\nНапример: alex, maria, ivan"
    );

    if (!namesText?.trim()) return;

    try {
      status.textContent = "Создаём групповой чат...";

      const { data: memberships, error: membersError } = await db
        .from("class_members")
        .select("user_id")
        .eq("class_id", currentClass.id);

      if (membersError) throw membersError;

      const ids = [...new Set(
        (memberships || []).map(x => x.user_id)
      )];

      const { data: profiles, error: profilesError } = await db
        .from("profiles")
        .select("id, username")
        .in("id", ids);

      if (profilesError) throw profilesError;

      const names = [...new Set(
        namesText
          .split(",")
          .map(x => x.trim().toLowerCase())
          .filter(Boolean)
      )];

      const found = (profiles || []).filter(person =>
        names.includes(person.username.toLowerCase())
      );

      const missing = names.filter(name =>
        !(profiles || []).some(
          person => person.username.toLowerCase() === name
        )
      );

      if (missing.length) {
        throw new Error(
          "Не найдены пользователи: " + missing.join(", ")
        );
      }

      const { data: chat, error: chatError } = await db
        .from("custom_chats")
        .insert({
          class_id: currentClass.id,
          name: name.trim(),
          created_by: currentUser.id
        })
        .select("id, name, image_path, created_by, class_id")
        .single();

      if (chatError) throw chatError;

      const memberIds = [...new Set([
        currentUser.id,
        ...found.map(person => person.id)
      ])];

      const { error: insertError } = await db
        .from("custom_chat_members")
        .insert(
          memberIds.map(userId => ({
            chat_id: chat.id,
            user_id: userId
          }))
        );

      if (insertError) throw insertError;

      await loadCustomChats();
      await openCustomChat(chat);

    } catch (error) {
      status.textContent =
        "Не удалось создать чат: " + readableError(error);
    }
  }

  // --------------------------------------
  // УЧАСТНИКИ ГРУППЫ
  // --------------------------------------

  async function getGroupProfiles() {
    const { data: members, error } = await db
      .from("custom_chat_members")
      .select("user_id")
      .eq("chat_id", selectedGroup.id);

    if (error) throw error;

    const ids = (members || []).map(m => m.user_id);

    if (!ids.length) return [];

    const { data: profiles, error: profileError } = await db
      .from("profiles")
      .select("id, username")
      .in("id", ids)
      .order("username");

    if (profileError) throw profileError;

    return profiles || [];
  }

  async function showGroupMembers() {
    if (!selectedGroup) return;

    try {
      const profiles = await getGroupProfiles();

      const names = profiles.map(person =>
        person.username +
        (person.id === selectedGroup.created_by ? " (создатель)" : "")
      );

      alert(
        "Участники группы:\n\n" +
        (names.join("\n") || "Участников пока нет.")
      );

    } catch (error) {
      status.textContent =
        "Не удалось загрузить участников: " + readableError(error);
    }
  }

  async function manageGroupMembers() {
    if (!selectedGroup || selectedGroup.created_by !== currentUser.id) {
      return;
    }

    const action = prompt(
      "Управление участниками:\n\n" +
      "Напиши «добавить» или «удалить»."
    );

    if (!action) return;

    try {
      if (action.toLowerCase().startsWith("д")) {
        const name = prompt("Имя пользователя, которого добавить:");

        if (!name?.trim()) return;

        const { data: profile, error } = await db
          .from("profiles")
          .select("id, username")
          .ilike("username", name.trim())
          .maybeSingle();

        if (error) throw error;
        if (!profile) throw new Error("Пользователь не найден.");

        const { error: addError } = await db.rpc(
          "add_custom_chat_member",
          {
            p_chat_id: selectedGroup.id,
            p_user_id: profile.id
          }
        );

        if (addError) throw addError;

        status.textContent = "Участник добавлен.";

      } else if (action.toLowerCase().startsWith("у")) {
        const profiles = await getGroupProfiles();

        const name = prompt(
          "Кого удалить?\n" +
          profiles.map(p => p.username).join(", ")
        );

        if (!name?.trim()) return;

        const person = profiles.find(
          p => p.username.toLowerCase() === name.trim().toLowerCase()
        );

        if (!person) throw new Error("Участник не найден.");

        const { error: removeError } = await db.rpc(
          "remove_custom_chat_member",
          {
            p_chat_id: selectedGroup.id,
            p_user_id: person.id
          }
        );

        if (removeError) throw removeError;

        status.textContent = "Участник удалён.";

      } else {
        return;
      }

      await showGroupMembers();
      await loadCustomChats();

    } catch (error) {
      status.textContent =
        "Не удалось изменить участников: " + readableError(error);
    }
  }

  // --------------------------------------
  // НАСТРОЙКИ ГРУППЫ
  // --------------------------------------

  async function groupSettings() {
    if (!selectedGroup || selectedGroup.created_by !== currentUser.id) {
      return;
    }

    const action = prompt(
      "Настройки группы:\n\n" +
      "1 — изменить название\n" +
      "2 — изменить картинку\n" +
      "3 — добавить или удалить участников"
    );

    if (!action) return;

    try {
      if (action === "1") {
        const newName = prompt(
          "Новое название группы:",
          selectedGroup.name
        );

        if (!newName?.trim()) return;

        const { error } = await db.rpc("update_custom_chat", {
          p_chat_id: selectedGroup.id,
          p_name: newName.trim(),
          p_image_path: selectedGroup.image_path || null
        });

        if (error) throw error;

        selectedGroup.name = newName.trim();

      } else if (action === "2") {
        const file = await chooseImage();

        if (!file) return;

        const path = await uploadImage(
          file,
          `groups/${selectedGroup.id}/${currentUser.id}`
        );

        const { error } = await db.rpc("update_custom_chat", {
          p_chat_id: selectedGroup.id,
          p_name: selectedGroup.name,
          p_image_path: path
        });

        if (error) throw error;

        selectedGroup.image_path = path;

      } else if (action === "3") {
        await manageGroupMembers();
        return;

      } else {
        return;
      }

      await loadCustomChats();
      await openCustomChat(selectedGroup);

      status.textContent = "Настройки группы сохранены.";

    } catch (error) {
      status.textContent =
        "Не удалось изменить группу: " + readableError(error);
    }
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

        imagePath = await uploadImage(file, folder);
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

  await loadCustomChats();
  await refreshSidebar();
  await loadClassMessages();

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
        }
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
  if (realtimeChannel) {
    await db.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  await db.auth.signOut();

  currentUser = null;
  currentProfile = null;
  currentClass = null;
  loadingMessages = false;

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
