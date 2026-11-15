const SUPABASE_URL = "https://zohhimpltawkaflzxdxe.supabase.co";
const SUPABASE_KEY = "sb_publishable_1Ic64s3vJf3Q3eKr1w8fSQ_6oE_23gy";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

const app = document.getElementById("app");
const authForm = document.getElementById("authForm");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const role = document.getElementById("role");
const username = document.getElementById("username");
const password = document.getElementById("password");
const className = document.getElementById("className");
const classPassword = document.getElementById("classPassword");
const teacherCode = document.getElementById("teacherCode");
const teacherCodeField = document.getElementById("teacherCodeField");
const classHint = document.getElementById("classHint");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");

let mode = "login";
let currentUser = null;
let currentClass = null;
let realtimeChannel = null;
let loadingMessages = false;

// Показываем сообщения об ошибках и успехе.
function showMessage(text, type = "") {
  message.textContent = text;
  message.className = "message";

  if (type) message.classList.add(type);
}

function setBusy(busy) {
  submitBtn.disabled = busy;
  submitBtn.textContent = busy
    ? "Подожди..."
    : mode === "login" ? "Войти" : "Зарегистрироваться";
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
  const username = name.trim().toLowerCase();

  if (!/^[a-z0-9_-]{3,24}$/.test(username)) {
    throw new Error(
      "Имя пользователя: от 3 до 24 символов. Используй английские буквы, цифры, _ или -."
    );
  }

  return username + "@vachat.example.com";
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

  return text;
}

// Регистрация или вход.
authForm.addEventListener("submit", async (event) => {
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

      const { error: profileError } = await db.rpc(
        "setup_profile",
        {
          p_username: name,
          p_role: selectedRole,
          p_teacher_code: selectedRole === "teacher"
            ? teacherCode.value
            : ""
        }
      );

      if (profileError) throw profileError;
    } else {
      const result = await db.auth.signInWithPassword({
        email: usernameEmail(name),
        password: pass
      });

      if (result.error) throw result.error;
      authData = result.data;

      // Проверяем роль из базы данных, а не только выбор в форме.
      const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("id, username, role")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.role !== selectedRole) {
        await db.auth.signOut();
        throw new Error("Выбрана неверная роль для этого аккаунта.");
      }
    }

    // Проверяем пароль класса на сервере и вступаем в класс.
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
    currentClass = { id: classId, name: group };

    localStorage.setItem("vachat_class_id", classId);

    await showMessenger();
  } catch (error) {
    showMessage(readableError(error), "error");
  } finally {
    setBusy(false);
  }
});

// Безопасное создание элементов с текстом.
function makeElement(tag, className, text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  return el;
}

async function showMessenger() {
  if (realtimeChannel) {
    await db.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  app.innerHTML = "";

  const shell = makeElement("section", "messenger");
  const topbar = makeElement("header", "topbar");
  const brand = makeElement("div", "brand");
  const brandIcon = makeElement("div", "brand-icon", "💬");
  const brandText = document.createElement("div");
  brandText.append(
    makeElement("h1", "", "VA Chat"),
    makeElement("p", "", "Школьный мессенджер")
  );
  brand.append(brandIcon, brandText);

  const logoutBtn = makeElement("button", "secondary-btn", "Выйти");
  logoutBtn.type = "button";
  logoutBtn.addEventListener("click", logout);
  topbar.append(brand, logoutBtn);

  const tabs = makeElement("div", "chat-tabs");
  const classTab = makeElement("button", "chat-tab active", "Классный чат");
  const personalTab = makeElement("button", "chat-tab", "Личные сообщения");
  classTab.type = personalTab.type = "button";
  tabs.append(classTab, personalTab);

  const layout = makeElement("div", "chat-layout");
  const sidebar = makeElement("aside", "sidebar");
  sidebar.append(makeElement("h2", "", "Мои чаты"));

  const classItem = makeElement("button", "class-item active");
  classItem.type = "button";
  classItem.append(
    makeElement("span", "avatar", "К"),
    makeElement("span", "person-name", "Классный чат")
  );
  sidebar.append(classItem);

  const panel = makeElement("section", "chat-panel");
  const heading = makeElement("header", "chat-heading");
  heading.append(
    makeElement("h2", "", currentClass.name),
    makeElement("p", "", "Общий чат класса")
  );

  const messages = makeElement("div", "chat-messages");
  messages.setAttribute("aria-live", "polite");
  const status = makeElement("div", "status-line", "Подключение к чату...");

  const composer = makeElement("form", "composer");
  const textarea = makeElement("textarea", "");
  textarea.placeholder = "Напиши сообщение...";
  textarea.maxLength = 2000;
  textarea.required = true;
  textarea.setAttribute("aria-label", "Текст сообщения");
  const sendBtn = makeElement("button", "send-btn", "Отправить");
  sendBtn.type = "submit";
  composer.append(textarea, sendBtn);

  panel.append(heading, messages, composer, status);
  layout.append(sidebar, panel);
  shell.append(topbar, tabs, layout);
  app.append(shell);

  let activeMode = "class";
  let selectedPerson = null;
  let memberButtons = [];

  function setActiveTab(mode) {
    activeMode = mode;
    classTab.classList.toggle("active", mode === "class");
    personalTab.classList.toggle("active", mode === "personal");
  }

  function showEmpty(text) {
    messages.replaceChildren(makeElement("p", "empty-state", text));
  }

  async function loadPersonalMessages() {
    if (!selectedPerson) {
      showEmpty("Выбери одноклассника слева, чтобы начать переписку.");
      return;
    }

    status.textContent = "Загружаем переписку...";
    try {
      const { data, error } = await db
        .from("private_messages")
        .select("id, sender_id, recipient_id, body, created_at")
        .eq("class_id", currentClass.id)
        .or(
          `and(sender_id.eq.${currentUser.id},recipient_id.eq.${selectedPerson.id}),and(sender_id.eq.${selectedPerson.id},recipient_id.eq.${currentUser.id})`
        )
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;

      const fragment = document.createDocumentFragment();
      if (!data.length) {
        fragment.append(makeElement(
          "p", "empty-state", "Это начало вашей переписки. Напиши первое сообщение!"
        ));
      }

      for (const item of data) {
        const bubble = makeElement(
          "article",
          "chat-message" + (item.sender_id === currentUser.id ? " mine" : "")
        );
        bubble.append(
          makeElement("div", "", item.body),
          makeElement(
            "time",
            "message-time",
            new Date(item.created_at).toLocaleString("ru-RU", {
              hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit"
            })
          )
        );
        fragment.append(bubble);
      }

      messages.replaceChildren(fragment);
      messages.scrollTop = messages.scrollHeight;
      status.textContent = "Личная переписка · " + selectedPerson.username;
    } catch (error) {
      status.textContent = "Не удалось загрузить переписку: " + readableError(error);
    }
  }

  async function openPersonalChat(person) {
    selectedPerson = person;
    for (const button of memberButtons) {
      button.classList.toggle("active", button.dataset.userId === person.id);
    }

    heading.replaceChildren(
      makeElement("h2", "", person.username),
      makeElement("p", "", "Личная переписка")
    );
    composer.classList.remove("hidden");
    textarea.placeholder = "Сообщение для " + person.username + "...";
    await loadPersonalMessages();
  }

  async function loadClassmates() {
    sidebar.replaceChildren(
      makeElement("h2", "", "Одноклассники")
    );
    memberButtons = [];
    showEmpty("Выбери одноклассника слева, чтобы начать переписку.");

    try {
      const { data: memberships, error: membersError } = await db
        .from("class_members")
        .select("user_id")
        .eq("class_id", currentClass.id);

      if (membersError) throw membersError;

      const ids = [...new Set((memberships || [])
        .map(row => row.user_id)
        .filter(id => id !== currentUser.id))];

      if (!ids.length) {
        showEmpty("Пока в классе нет других участников.");
        return;
      }

      const { data: profiles, error: profilesError } = await db
        .from("profiles")
        .select("id, username")
        .in("id", ids)
        .order("username", { ascending: true });

      if (profilesError) throw profilesError;

      for (const person of profiles || []) {
        const button = makeElement("button", "person-item");
        button.type = "button";
        button.dataset.userId = person.id;
        button.append(
          makeElement("span", "avatar", (person.username || "?").slice(0, 1).toUpperCase()),
          makeElement("span", "person-name", person.username || "Ученик")
        );
        button.addEventListener("click", () => openPersonalChat(person));
        memberButtons.push(button);
        sidebar.append(button);
      }

      if (!profiles?.length) {
        showEmpty("Не удалось найти профили одноклассников.");
      }
    } catch (error) {
      status.textContent = "Не удалось загрузить список класса: " + readableError(error);
    }
  }

  classTab.addEventListener("click", async () => {
    setActiveTab("class");
    selectedPerson = null;
    sidebar.replaceChildren(makeElement("h2", "", "Мои чаты"), classItem);
    classItem.classList.add("active");
    heading.replaceChildren(
      makeElement("h2", "", currentClass.name),
      makeElement("p", "", "Общий чат класса")
    );
    composer.classList.remove("hidden");
    textarea.placeholder = "Напиши сообщение...";
    await loadMessages(messages, status);
  });

  personalTab.addEventListener("click", async () => {
    setActiveTab("personal");
    classItem.classList.remove("active");
    composer.classList.remove("hidden");
    textarea.placeholder = "Сначала выбери собеседника...";
    heading.replaceChildren(
      makeElement("h2", "", "Личные сообщения"),
      makeElement("p", "", "Переписки с одноклассниками")
    );
    await loadClassmates();
  });

  classItem.addEventListener("click", () => classTab.click());

  composer.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = textarea.value.trim();
    if (!body) return;

    if (activeMode === "personal" && !selectedPerson) {
      status.textContent = "Сначала выбери одноклассника.";
      return;
    }

    sendBtn.disabled = true;
    try {
      let result;
      if (activeMode === "class") {
        result = await db.from("messages").insert({
          class_id: currentClass.id,
          user_id: currentUser.id,
          body
        });
      } else {
        result = await db.from("private_messages").insert({
          class_id: currentClass.id,
          sender_id: currentUser.id,
          recipient_id: selectedPerson.id,
          body
        });
      }

      if (result.error) throw result.error;
      textarea.value = "";
      if (activeMode === "class") {
        await loadMessages(messages, status);
      } else {
        await loadPersonalMessages();
      }
    } catch (error) {
      status.textContent = "Ошибка отправки: " + readableError(error);
    } finally {
      sendBtn.disabled = false;
      textarea.focus();
    }
  });

  await loadMessages(messages, status);

  realtimeChannel = db
    .channel("va-chat-" + currentClass.id + "-" + currentUser.id)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: "class_id=eq." + currentClass.id
      },
      () => {
        if (activeMode === "class") loadMessages(messages, status);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "private_messages",
        filter: "class_id=eq." + currentClass.id
      },
      (payload) => {
        const item = payload.new;
        if (
          activeMode === "personal" &&
          selectedPerson &&
          (
            (item.sender_id === currentUser.id && item.recipient_id === selectedPerson.id) ||
            (item.sender_id === selectedPerson.id && item.recipient_id === currentUser.id)
          )
        ) {
          loadPersonalMessages();
        }
      }
    )
    .subscribe((state) => {
      if (state === "SUBSCRIBED") {
        status.textContent = "Онлайн · " + currentUser.email.split("@")[0];
      } else if (state === "CHANNEL_ERROR") {
        status.textContent = "Не удалось подключить обновления чата.";
      }
    });
}


async function loadMessages(container, status) {
  if (loadingMessages || !currentClass) return;
  loadingMessages = true;

  try {
    const { data, error } = await db
      .from("messages")
      .select("id, user_id, body, created_at, profiles(username)")
      .eq("class_id", currentClass.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) throw error;

    const fragment = document.createDocumentFragment();

    if (!data.length) {
      fragment.append(
        makeElement(
          "p",
          "empty-state",
          "Пока сообщений нет. Напиши первое сообщение своему классу!"
        )
      );
    }

    for (const item of data) {
      const bubble = makeElement(
        "article",
        "chat-message" +
          (item.user_id === currentUser.id ? " mine" : "")
      );

      bubble.append(
        makeElement(
          "div",
          "message-author",
          item.profiles?.username || "Участник класса"
        ),
        makeElement("div", "", item.body),
        makeElement(
          "time",
          "message-time",
          new Date(item.created_at).toLocaleString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit"
          })
        )
      );

      fragment.append(bubble);
    }

    container.replaceChildren(fragment);
    container.scrollTop = container.scrollHeight;
    status.textContent = "Сообщения загружены.";
  } catch (error) {
    status.textContent = "Не удалось загрузить сообщения: " + readableError(error);
  } finally {
    loadingMessages = false;
  }
}

async function logout() {
  if (realtimeChannel) {
    await db.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  await db.auth.signOut();

  currentUser = null;
  currentClass = null;
  loadingMessages = false;

  localStorage.removeItem("vachat_class_id");

  location.reload();
}

// Восстанавливаем сессию после обновления страницы.
async function init() {
  try {
    const { data, error } = await db.auth.getSession();

    if (error) throw error;

    if (!data.session) return;

    currentUser = data.session.user;

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id, username, role")
      .eq("id", currentUser.id)
      .single();

    if (profileError) throw profileError;

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

    app.innerHTML = "";
    app.append(authForm.closest(".auth-card"));

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