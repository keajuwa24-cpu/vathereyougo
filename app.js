const AI_ERROR = "Nivli isn't working right now. Please try again later.";
const questions = [
  { title: "What will you mainly use Nivli for?", options: ["Everyday questions", "Coding and scripting", "School and learning", "Writing and creativity", "A bit of everything"] },
  { title: "How would you describe your experience with coding?", options: ["Beginner", "Intermediate", "Advanced", "I don't code yet"] },
  { title: "What kind of answers do you prefer?", options: ["Short and direct", "Detailed explanations", "Step-by-step guidance"] },
  { title: "What should Nivli prioritize?", options: ["Speed", "Accuracy and explanations", "Coding help", "Balanced performance"] }
];
const authScreen = document.querySelector("#auth-screen");
const onboardingScreen = document.querySelector("#onboarding-screen");
const chatScreen = document.querySelector("#chat-screen");
const sidebar = document.querySelector(".sidebar");
const mobileMenuButton = document.querySelector("#mobile-menu-button");
const sidebarBackdrop = document.querySelector("#sidebar-backdrop");
const onboardingContent = document.querySelector("#onboarding-content");
const onboardError = document.querySelector("#onboard-error");
const authNotice = document.querySelector("#auth-notice");
const messages = document.querySelector("#messages");
const chatWelcome = document.querySelector("#chat-welcome");
const input = document.querySelector("#message-input");
const form = document.querySelector("#chat-form");
const sendButton = document.querySelector("#send-button");
const voiceButton = document.querySelector("#voice-button");
const voiceStatus = document.querySelector("#voice-status");
const errorBanner = document.querySelector("#error-banner");
const retryButton = document.querySelector("#retry-button");
const errorText = document.querySelector("#error-text");
const errorDetail = document.querySelector("#error-detail");
const charCount = document.querySelector("#char-count");
const imageInput = document.querySelector("#image-input");
const attachmentStrip = document.querySelector("#attachment-strip");
let selectedImages = [];
let config = null;
let account = null;
let availableModels = [];
let activeModelId = "nollent-4";
let mode = "chat";
let history = [];
let busy = false;
let pending = null;
let conversationId = null;
let conversationMessages = [];
let conversationMemory = "";
let webSearchEnabled = false;
let conversationList = [];
let conversationSearch = "";
let activeGeneration = null;
let generationCounter = 0;
let activeRecognition = null;
let voiceDraft = "";

function toggleVoiceInput() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    voiceStatus.textContent = "Voice input is not supported by this browser.";
    return;
  }
  if (activeRecognition) {
    activeRecognition.stop();
    return;
  }
  const recognition = new Recognition();
  recognition.lang = navigator.language || "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  voiceDraft = input.value.trimEnd();
  recognition.onstart = () => {
    voiceButton.classList.add("is-listening");
    voiceButton.setAttribute("aria-label", "Stop voice input");
    voiceButton.title = "Stop voice input";
    input.placeholder = "Listening…";
    voiceStatus.textContent = "Listening for your message.";
  };
  recognition.onresult = event => {
    const transcript = [...event.results].map(result => result[0].transcript).join("").trim();
    input.value = `${voiceDraft}${voiceDraft && transcript ? " " : ""}${transcript}`;
    refreshInput();
  };
  recognition.onerror = event => {
    if (event.error !== "aborted" && event.error !== "no-speech") voiceStatus.textContent = `Voice input stopped: ${event.error}.`;
  };
  recognition.onend = () => {
    if (activeRecognition === recognition) activeRecognition = null;
    voiceButton.classList.remove("is-listening");
    voiceButton.setAttribute("aria-label", "Start voice input");
    voiceButton.title = "Dictate a message";
    input.placeholder = "Ask me anything…";
    if (voiceStatus.textContent === "Listening for your message.") voiceStatus.textContent = "Voice input finished.";
  };
  activeRecognition = recognition;
  try { recognition.start(); }
  catch { activeRecognition = null; voiceStatus.textContent = "Could not start voice input. Try again."; }
}
let gisPromise = null;
try { activeModelId = localStorage.getItem("luma-model-id") || activeModelId; } catch {}

function applyTheme(value) {
  if (value === "system") value = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = value;
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.innerHTML = value === "dark"
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/></svg>';
    const next = value === "dark" ? "light" : "dark";
    button.setAttribute("aria-label", `Switch to ${next} mode`);
    button.title = `Switch to ${next} mode`;
  });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = value === "dark" ? "#050407" : (customSurface || "#ffffff");
}
let initialTheme;
try { initialTheme = localStorage.getItem("luma-theme"); } catch {}
if (!["light", "dark", "system"].includes(initialTheme)) initialTheme = "system";
let customAccent = "#8b5cf6";
try { customAccent = localStorage.getItem("nivli-custom-accent") || customAccent; } catch {}
function applyCustomAccent(value) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) value = "#8b5cf6";
  customAccent = value;
  document.documentElement.style.setProperty("--custom-accent", value);
  try { localStorage.setItem("nivli-custom-accent", value); } catch {}
}
applyCustomAccent(customAccent);
let customGlow = customAccent;
try { customGlow = localStorage.getItem("nivli-custom-glow") || customGlow; } catch {}
function applyCustomGlow(value) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) value = customAccent;
  customGlow = value;
  document.documentElement.style.setProperty("--custom-glow", value);
  try { localStorage.setItem("nivli-custom-glow", value); } catch {}
}
applyCustomGlow(customGlow);
let customSurface = "#ffffff";
try { customSurface = localStorage.getItem("nivli-custom-surface") || customSurface; } catch {}
function applyCustomSurface(value) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) value = "#ffffff";
  customSurface = value;
  document.documentElement.style.setProperty("--custom-surface", value);
  if (document.documentElement.dataset.theme === "light") { const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = value; }
  try { localStorage.setItem("nivli-custom-surface", value); } catch {}
}
applyCustomSurface(customSurface);
applyTheme(initialTheme);
document.querySelectorAll("[data-theme-toggle]").forEach((button) => button.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("luma-theme", next); } catch {}
  applyTheme(next);
}));
let enterToSend = true;
try { enterToSend = localStorage.getItem("luma-enter-to-send") !== "false"; } catch {}
let textSize = "normal";
try { textSize = localStorage.getItem("luma-text-size") || "normal"; } catch {}
let personalization = { useMemory: false, memory: "", aboutYou: "", responseInstructions: "", contextDepth: 16, responseStyle: "auto" };
document.documentElement.dataset.textSize = textSize;

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) }
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}
function show(screen) {
  authScreen.hidden = screen !== "auth";
  onboardingScreen.hidden = screen !== "onboarding";
  chatScreen.hidden = screen !== "chat";
}
function closeMobileSidebar() {
  sidebar?.classList.remove("mobile-open");
  if (sidebarBackdrop) sidebarBackdrop.hidden = true;
  mobileMenuButton?.setAttribute("aria-expanded", "false");
  mobileMenuButton?.setAttribute("aria-label", "Open navigation");
}
mobileMenuButton?.addEventListener("click", () => {
  const open = !sidebar.classList.contains("mobile-open");
  sidebar.classList.toggle("mobile-open", open);
  sidebarBackdrop.hidden = !open;
  mobileMenuButton.setAttribute("aria-expanded", String(open));
  mobileMenuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
});
sidebarBackdrop?.addEventListener("click", closeMobileSidebar);
sidebar?.addEventListener("click", event => {
  if (event.target.closest("[data-new-chat], [data-mode], .history-item, .history-action, .plans-nav-link")) closeMobileSidebar();
});
document.addEventListener("keydown", event => { if (event.key === "Escape") closeMobileSidebar(); });
window.addEventListener("resize", () => { if (window.innerWidth > 720) closeMobileSidebar(); });
function showOnboardingError(message) {
  onboardError.textContent = message;
  onboardError.hidden = !message;
}
function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
  return gisPromise;
}
async function renderAuth() {
  show("auth");
  document.querySelector("#google-button").replaceChildren();
  const disabled = document.querySelector("#google-disabled");
  disabled.hidden = Boolean(config?.googleClientId);
  disabled.disabled = true;
  if (!config?.googleClientId) {
    authNotice.textContent = "Google sign-in isn't configured yet. Add GOOGLE_CLIENT_ID to the existing private .env.txt file (or .env) to enable it.";
    return;
  }
  authNotice.textContent = "";
  try {
    await loadGoogleIdentity();
    window.google.accounts.id.initialize({ client_id: config.googleClientId, callback: handleGoogleCredential, auto_select: false });
    window.google.accounts.id.renderButton(document.querySelector("#google-button"), { type: "standard", theme: document.documentElement.dataset.theme === "dark" ? "filled_black" : "outline", size: "large", shape: "pill", text: "continue_with", width: 280, logo_alignment: "left" });
  } catch {
    authNotice.textContent = "Google sign-in couldn't load. Check your connection and try again.";
  }
}
async function handleGoogleCredential(result) {
  authNotice.textContent = "Signing you in…";
  try {
    const data = await api("/api/auth/google", { method: "POST", body: JSON.stringify({ credential: result.credential }) });
    account = data.account;
    routeAccount();
  } catch (error) {
    authNotice.textContent = error.message;
  }
}
async function refreshModelStatus() {
  const badge = document.querySelector("#model-badge");
  const label = document.querySelector("#model-label");
  if (!badge || !label) return;
  try {
    const status = await api("/api/model-status");
    label.textContent = availableModels.find(model => model.id === activeModelId)?.name || "Nivli AI";
    badge.title = status.ready ? `Connected to ${status.model}` : status.model;
    badge.classList.toggle("model-unavailable", !status.ready);
  } catch {
    label.textContent = availableModels.find(model => model.id === activeModelId)?.name || "Nivli AI";
    badge.title = "Could not check the Ollama Cloud connection";
    badge.classList.add("model-unavailable");
  }
}
function updateModelPicker() {
  const current = availableModels.find(model => model.id === activeModelId) || availableModels[0];
  const name = document.querySelector("#selected-model-name");
  const headerName = document.querySelector("#model-label");
  const options = document.querySelector("#model-options");
  if (!current || !name || !options) return;
  activeModelId = current.id;
  name.textContent = current.name;
  if (headerName) headerName.textContent = current.name;
  options.replaceChildren();
  for (const model of availableModels) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `model-option${model.id === activeModelId ? " selected" : ""}`;
    button.setAttribute("aria-pressed", String(model.id === activeModelId));
    const check = document.createElement("span");
    check.className = "model-option-check";
    check.textContent = model.id === activeModelId ? "✓" : "";
    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = model.name;
    const description = document.createElement("small");
    description.textContent = model.description;
    copy.append(title, description);
    button.append(check, copy);
    button.addEventListener("click", () => {
      activeModelId = model.id;
      try { localStorage.setItem("luma-model-id", activeModelId); } catch {}
      updateModelPicker();
      document.querySelector("#model-menu").hidden = true;
      document.querySelector("#model-picker-button").setAttribute("aria-expanded", "false");
      refreshModelStatus();
    });
    options.append(button);
  }
}
async function loadModelChoices() {
  try {
    const result = await api("/api/models");
    availableModels = Array.isArray(result.models) ? result.models : [];
    if (!availableModels.some(model => model.id === activeModelId)) activeModelId = "nollent-4";
    updateModelPicker();
  } catch { availableModels = []; }
}
function routeAccount() {
  if (!account) return renderAuth();
  if (account.complete) enterChat();
  else renderOnboarding();
}
function enterChat() {
  renderAccount();
  loadModelChoices();
  refreshModelStatus();
  show("chat");
  setMode("chat");
  resetChat();
  loadConversationList();
  loadPreferences();
}
function renderAccount() {
  const label = account.username || account.name || "Nivli";
  document.querySelector("#profile-name").textContent = label;
  document.querySelector("#menu-username").textContent = `@${account.username || ""}`;
  document.querySelector("#profile-email").textContent = account.email || "";
  document.querySelector("#menu-email").textContent = account.email || "";
  const image = document.querySelector("#profile-picture");
  if (account.picture) {
    image.src = account.picture;
    image.hidden = false;
    document.querySelector("#profile-avatar").hidden = true;
  } else {
    image.hidden = true;
    document.querySelector("#profile-avatar").hidden = false;
  }
}
function saveOnboarding(values) {
  return api("/api/onboarding", { method: "PATCH", body: JSON.stringify(values) }).then((result) => {
    account = result.account;
    return result.account;
  });
}
function renderOnboarding() {
  show("onboarding");
  showOnboardingError("");
  const step = Number(account.step) || 0;
  onboardingContent.replaceChildren();
  if (step === 0) {
    onboardingContent.innerHTML = '<div class="welcome-step"><p class="eyebrow">WELCOME TO NIVLI</p><h1>Make this space<br><em>feel like yours.</em></h1><p>We’ll ask a few short questions so Nivli can shape its answers around the way you like to work. You can skip any question.</p><button class="primary-button" id="begin-setup">Let’s get started <span>→</span></button></div>';
    document.querySelector("#begin-setup").addEventListener("click", async () => {
      try { await saveOnboarding({ step: 1 }); renderOnboarding(); } catch (error) { showOnboardingError(error.message); }
    });
    return;
  }
  if (step >= 1 && step <= 4) return renderQuestion(step);
  if (step === 5) return renderUsername();
  if (step >= 6) {
    onboardingContent.innerHTML = '<div class="welcome-step finish-step"><div class="finish-check">✓</div><p class="eyebrow">ALL SET</p><h1>You’re all set!<br><em>Welcome to Nivli.</em></h1><p>Your space is ready when you are.</p><button class="primary-button" id="enter-nivli">Enter Nivli <span>→</span></button></div>';
    document.querySelector("#enter-nivli").addEventListener("click", enterChat);
  }
}
function renderQuestion(step) {
  const index = step - 1;
  const question = questions[index];
  const selected = account.answers?.[index] || "";
  const wrap = document.createElement("div");
  wrap.className = "question-step";
  const progress = document.createElement("div");
  progress.className = "progress-header";
  progress.innerHTML = `<span>GETTING TO KNOW YOU</span><span>${index + 1} <i>/ 4</i></span>`;
  const track = document.createElement("div");
  track.className = "progress-track";
  const fill = document.createElement("span");
  fill.style.width = `${(index + 1) * 25}%`;
  track.append(fill);
  const title = document.createElement("h2");
  title.textContent = question.title;
  const hint = document.createElement("p");
  hint.className = "question-hint";
  hint.textContent = "Choose what feels right, or skip this one.";
  const options = document.createElement("div");
  options.className = "answer-options";
  question.options.forEach((option, optionIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `answer-option${option === selected ? " selected" : ""}`;
    button.setAttribute("aria-pressed", String(option === selected));
    const marker = document.createElement("span");
    marker.className = "option-marker";
    marker.textContent = String.fromCharCode(65 + optionIndex);
    const label = document.createElement("span");
    label.textContent = option;
    button.append(marker, label);
    button.addEventListener("click", () => {
      account.answers = { ...account.answers, [index]: option };
      options.querySelectorAll(".answer-option").forEach((item) => {
        item.classList.remove("selected");
        item.setAttribute("aria-pressed", "false");
      });
      button.classList.add("selected");
      button.setAttribute("aria-pressed", "true");
    });
    options.append(button);
  });
  const actions = document.createElement("div");
  actions.className = "step-actions";
  const back = document.createElement("button");
  back.className = "back-button";
  back.type = "button";
  back.textContent = "← Back";
  back.addEventListener("click", async () => {
    try { await saveOnboarding({ step: step - 1 }); renderOnboarding(); } catch (error) { showOnboardingError(error.message); }
  });
  const next = document.createElement("button");
  next.className = "primary-button";
  next.type = "button";
  next.innerHTML = 'Continue <span>→</span>';
  next.addEventListener("click", async () => {
    try {
      await saveOnboarding({ step: step + 1, answers: { [index]: account.answers?.[index] || "" } });
      renderOnboarding();
    } catch (error) { showOnboardingError(error.message); }
  });
  actions.append(back, next);
  wrap.append(progress, track, title, hint, options, actions);
  onboardingContent.append(wrap);
}
function renderUsername() {
  const wrap = document.createElement("div");
  wrap.className = "username-step";
  wrap.innerHTML = '<div class="progress-header"><span>ONE LAST THING</span><span>4 <i>/ 4</i></span></div><div class="progress-track"><span style="width:100%"></span></div><h2>Choose your Nivli username.</h2><p class="question-hint">This helps make your space yours. Use 3–20 letters, numbers, or underscores.</p><label class="username-field"><span>@</span><input id="username-input" type="text" minlength="3" maxlength="20" autocomplete="nickname" spellcheck="false" placeholder="yourname"></label><p class="availability" id="availability" aria-live="polite"></p><div class="step-actions"><button class="back-button" id="username-back" type="button">← Back</button><button class="primary-button" id="finish-setup" type="button" disabled>Finish setup <span>→</span></button></div>';
  onboardingContent.append(wrap);
  const field = wrap.querySelector("#username-input");
  const availability = wrap.querySelector("#availability");
  const finish = wrap.querySelector("#finish-setup");
  field.value = account.username || "";
  let timer;
  let available = false;
  let checked = "";
  function check() {
    const value = field.value.trim();
    available = false;
    checked = "";
    finish.disabled = true;
    if (!/^[A-Za-z0-9_]{3,20}$/.test(value)) {
      availability.textContent = value ? "Use 3–20 letters, numbers, or underscores." : "";
      availability.className = "availability";
      return;
    }
    availability.textContent = "Checking availability…";
    availability.className = "availability checking";
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const data = await api(`/api/onboarding/username-available?username=${encodeURIComponent(value)}`);
        if (field.value.trim() !== value) return;
        available = data.available;
        checked = value;
        availability.textContent = available ? "That username is available." : "That username is already taken.";
        availability.className = `availability ${available ? "available" : "taken"}`;
        finish.disabled = !available;
      } catch {
        availability.textContent = "Could not check right now. Try again.";
        availability.className = "availability taken";
      }
    }, 260);
  }
  field.addEventListener("input", check);
  check();
  wrap.querySelector("#username-back").addEventListener("click", async () => {
    try { await saveOnboarding({ step: 4 }); renderOnboarding(); } catch (error) { showOnboardingError(error.message); }
  });
  finish.addEventListener("click", async () => {
    if (!available || checked !== field.value.trim()) return;
    finish.disabled = true;
    try {
      account = await saveOnboarding({ step: 5, username: checked });
      account = (await api("/api/onboarding/complete", { method: "POST", body: "{}" })).account;
      renderOnboarding();
    } catch (error) {
      showOnboardingError(error.message);
      finish.disabled = false;
      check();
    }
  });
}
function timeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "Early bird";
  if (hour >= 11 && hour < 17) return "Afternoon pause";
  if (hour >= 17 && hour < 22) return "Evening thoughts";
  return "Night owl hours";
}
function updateTimeGreeting() {
  const label = timeGreeting();
  document.querySelector("#welcome-eyebrow").textContent = label.toUpperCase();
  const heading = document.querySelector("#welcome-heading");
  const accent = document.createElement("em");
  accent.textContent = account?.username || "you";
  heading.replaceChildren(document.createTextNode(`${label},`), document.createElement("br"), accent);
  document.querySelector("#welcome-copy").textContent = mode === "chat"
    ? "A little room for questions, ideas, and whatever is on your mind."
    : "Tell me what you’re building, learning, or fixing today.";
}
function renderConversationList() {
  const list = document.querySelector("#history-list");
  list.replaceChildren();
  const filtered = conversationList.filter(conversation => `${conversation.title || ""} ${conversation.preview || ""}`.toLocaleLowerCase().includes(conversationSearch));
  if (!conversationList.length || !filtered.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = conversationSearch ? "No chats match that search." : "Your conversations will appear here.";
    list.append(empty);
    return;
  }
  for (const conversation of filtered) {
    const row = document.createElement("div");
    row.className = "history-row";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-item";
    button.classList.toggle("active", conversation.id === conversationId);
    button.setAttribute("aria-current", conversation.id === conversationId ? "page" : "false");
    const icon = document.createElement("span");
    icon.className = "history-item-icon";
    icon.textContent = conversation.mode === "script" ? "⌘" : "◦";
    const text = document.createElement("span");
    text.className = "history-item-text";
    const title = document.createElement("strong");
    title.textContent = conversation.title || "New conversation";
    const date = document.createElement("small");
    date.textContent = new Date(conversation.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    text.append(title, date);
    button.append(icon, text);
    button.addEventListener("click", () => openConversation(conversation.id));
    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "history-action history-rename";
    rename.title = "Rename conversation";
    rename.setAttribute("aria-label", `Rename ${conversation.title || "conversation"}`);
    rename.textContent = "✎";
    rename.addEventListener("click", async () => {
      const value = window.prompt("Rename conversation", conversation.title || "New conversation");
      if (value === null || !value.trim() || value.trim() === conversation.title) return;
      try {
        await api(`/api/conversations/${encodeURIComponent(conversation.id)}`, { method: "PATCH", body: JSON.stringify({ title: value.trim() }) });
        await loadConversationList();
      } catch (error) { window.alert(error.message || "That conversation couldn’t be renamed. Please try again."); }
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "history-action history-delete";
    remove.title = "Delete conversation";
    remove.setAttribute("aria-label", `Delete ${conversation.title || "conversation"}`);
    remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg>';
    remove.addEventListener("click", async () => {
      if (!window.confirm(`Delete “${conversation.title || "New conversation"}”? This cannot be undone.`)) return;
      remove.disabled = true;
      try {
        await api(`/api/conversations/${encodeURIComponent(conversation.id)}`, { method: "DELETE" });
        if (conversationId === conversation.id) resetChat();
        await loadConversationList();
      } catch (error) {
        window.alert(error.message || "That conversation could not be deleted. Please try again.");
        remove.disabled = false;
      }
    });
    row.append(button, rename, remove);
    list.append(row);
  }
}
async function loadConversationList() {
  try {
    const result = await api("/api/conversations");
    conversationList = result.conversations || [];
    renderConversationList();
  } catch {
    const list = document.querySelector("#history-list");
    list.replaceChildren();
    const error = document.createElement("p");
    error.className = "history-empty";
    error.textContent = "Chat history couldn’t be loaded.";
    list.append(error);
  }
}
async function openConversation(id) {
  try {
    const result = await api(`/api/conversations/${encodeURIComponent(id)}`);
    const conversation = result.conversation;
    if (conversation.modelId && availableModels.some(model => model.id === conversation.modelId)) {
      activeModelId = conversation.modelId;
      try { localStorage.setItem("luma-model-id", activeModelId); } catch {}
      updateModelPicker();
      refreshModelStatus();
    }
    selectedImages = [];
    renderSelectedImages();
    setMode(conversation.mode);
    conversationId = conversation.id;
    conversationMessages = conversation.messages.map(item => ({ ...item }));
    conversationMemory = conversation.memory || "";
    messages.replaceChildren();
    errorBanner.hidden = true;
    chatWelcome.hidden = conversation.messages.length > 0;
    const latestMessage = conversation.messages.at(-1);
    conversation.messages.forEach((item) => item.role === "user"
      ? addUserMessage(item.text, item.images || [], item.turnId, item.createdAt || 0)
      : addAssistantMessage(item.text, item.sources || [], item.turnId, { incomplete: item.incomplete === true, canRegenerate: item === latestMessage }));
    const last = conversation.messages.at(-1);
    const hasReply = last && conversation.messages.some((item) => item.role === "model" && item.turnId === last.turnId);
    if (last?.role === "user" && !hasReply) {
      history = conversation.messages.slice(0, -1).map(({ role, text, images }) => ({ role, text, ...(images ? { images } : {}) }));
      pending = { message: last.text, images: last.images || [], mode: conversation.mode, modelId: conversation.modelId || activeModelId, conversationId: conversation.id, turnId: last.turnId };
      errorText.textContent = AI_ERROR;
      errorBanner.hidden = false;
    } else {
      history = conversation.messages.map(({ role, text, images }) => ({ role, text, ...(images ? { images } : {}) }));
      pending = null;
    }
    renderConversationList();
  } catch {
    const list = document.querySelector("#history-list");
    const error = document.createElement("p");
    error.className = "history-empty";
    error.textContent = "That conversation couldn’t be opened. Please try again.";
    list.prepend(error);
  }
}
function setMode(nextMode) {
  if (activeGeneration) activeGeneration.abort();
  activeGeneration = null;
  generationCounter++;
  busy = false;
  input.disabled = false;
  mode = nextMode;
  conversationId = null;
  conversationMessages = [];
  history = [];
  pending = null;
  messages.replaceChildren();
  errorBanner.hidden = true;
  if (errorDetail) errorDetail.hidden = true;
  document.querySelectorAll("[data-mode]").forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
  document.querySelector("#mode-label").textContent = mode === "chat" ? "Chat Mode" : "Script Mode";
  const modeDescriptionText = document.querySelector("#mode-description");
  if (modeDescriptionText) modeDescriptionText.textContent = mode === "chat" ? "Everyday questions, ideas, and writing." : "Create, explain, and debug scripts.";
  const modeAction = document.querySelector("#switch-mode-button strong");
  const modeDescription = document.querySelector("#switch-mode-button small");
  if (modeAction) modeAction.textContent = mode === "chat" ? "Switch to Script Mode" : "Switch to Chat Mode";
  if (modeDescription) modeDescription.textContent = mode === "chat" ? "Get help with code and scripts" : "Return to everyday questions and ideas";
  updateTimeGreeting();
  document.querySelector("#suggestions").hidden = mode === "script";
  chatWelcome.hidden = false;
  input.placeholder = mode === "chat" ? "Ask me anything…" : "Describe the script you need…";
  renderConversationList();
  refreshInput();
}
function renderAssistantReply(target, text) {
  const parts = text.split(/```([^\n`]*)\n([\s\S]*?)```/g);
  for (let i = 0; i < parts.length; i += 3) {
    const prose = parts[i];
    if (prose) {
      const paragraph = document.createElement("p");
      paragraph.className = "reply-prose";
      prose.split("\n").forEach((line, index) => {
        if (index) paragraph.append(document.createElement("br"));
        paragraph.append(document.createTextNode(line));
      });
      target.append(paragraph);
    }
    if (i + 2 < parts.length) {
      const language = parts[i + 1].trim();
      const codeText = parts[i + 2].replace(/\n$/, "");
      const box = document.createElement("div");
      box.className = "code-block";
      const head = document.createElement("div");
      head.className = "code-head";
      const lang = document.createElement("span");
      lang.textContent = language || "code";
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "copy-code";
      copy.textContent = "Copy code";
      copy.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(codeText); copy.textContent = "Copied"; setTimeout(() => copy.textContent = "Copy code", 1300); }
        catch { copy.textContent = "Copy unavailable"; setTimeout(() => copy.textContent = "Copy code", 1500); }
      });
      head.append(lang, copy);
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = codeText;
      pre.append(code);
      box.append(head, pre);
      target.append(box);
    }
  }
}
function addUserMessage(text, images = [], turnId = null, createdAt = Date.now()) {
  const row = document.createElement("div");
  row.className = "message user";
  if (turnId) row.dataset.turnId = turnId;
  const bubble = document.createElement("div");
  bubble.className = "message-content";
  bubble.textContent = text;
  if (images.length) {
    const gallery = document.createElement("div");
    gallery.className = "message-images";
    for (const image of images) {
      const preview = document.createElement("img");
      preview.src = image.data;
      preview.alt = image.name || "Attached image";
      preview.loading = "lazy";
      gallery.append(preview);
    }
    bubble.append(gallery);
  }
  row.append(bubble);
  const actions = document.createElement("div"); actions.className = "user-message-actions";
  const time = document.createElement("time"); time.className = "message-time";
  const timeValue = Number(createdAt);
  if (Number.isFinite(timeValue) && timeValue > 0) { time.dateTime = new Date(timeValue).toISOString(); time.textContent = new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(timeValue); }
  const iconButton = (label, icon) => { const button = document.createElement("button"); button.type = "button"; button.className = "message-action-button"; button.setAttribute("aria-label", label); button.title = label; button.innerHTML = icon; return button; };
  const copy = iconButton("Copy message", '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>');
  copy.addEventListener("click", async () => { try { await navigator.clipboard.writeText(text); copy.title = "Copied"; copy.setAttribute("aria-label", "Copied"); setTimeout(() => { copy.title = "Copy message"; copy.setAttribute("aria-label", "Copy message"); }, 1200); } catch {} });
  const edit = iconButton("Edit and resend message", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4.5-1 10.8-10.8a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z"/></svg>');
  edit.addEventListener("click", () => { input.value = text; input.focus(); input.setSelectionRange(input.value.length, input.value.length); refreshInput(); });
  actions.append(time, copy, edit); row.append(actions);
  messages.append(row);
  row.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function appendAssistantExtras(row, content, text, sources, turnId, { incomplete = false, canRegenerate = true } = {}) {
  const validSources = (Array.isArray(sources) ? sources : []).filter(source => { try { const url = new URL(source.url); return ["http:", "https:"].includes(url.protocol); } catch { return false; } }).slice(0, 5);
  if (validSources.length) {
    const list = document.createElement("div"); list.className = "source-list";
    const heading = document.createElement("strong"); heading.textContent = "Sources"; list.append(heading);
    validSources.forEach((source, index) => { const link = document.createElement("a"); link.href = source.url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = "[" + (index + 1) + "] " + source.title; list.append(link); });
    content.append(list);
  }
  if (incomplete) {
    const stopped = document.createElement("small"); stopped.className = "reply-stopped"; stopped.textContent = "Stopped early"; content.append(stopped);
  }
  const actions = document.createElement("div"); actions.className = "assistant-actions";
  const iconButton = (label, icon) => { const button = document.createElement("button"); button.type = "button"; button.className = "message-action-button"; button.setAttribute("aria-label", label); button.title = label; button.innerHTML = icon; return button; };
  const copy = iconButton("Copy response", '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>');
  copy.addEventListener("click", async () => { try { await navigator.clipboard.writeText(text); copy.title = "Copied"; copy.setAttribute("aria-label", "Copied"); setTimeout(() => { copy.title = "Copy response"; copy.setAttribute("aria-label", "Copy response"); }, 1200); } catch {} });
  const feedback = (kind, label, icon) => { const button = iconButton(label, icon); button.addEventListener("click", () => { actions.querySelectorAll("[data-feedback]").forEach(other => { other.classList.remove("selected"); other.removeAttribute("aria-pressed"); }); if (button.dataset.feedback !== kind || !button.classList.contains("selected")) { button.classList.add("selected"); button.setAttribute("aria-pressed", "true"); button.dataset.feedback = kind; } }); button.dataset.feedback = kind; return button; };
  const like = feedback("like", "Helpful response", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3Zm0 0 5-8c2 0 3 1 3 3l-1 5h5a2 2 0 0 1 2 2l-2 7a2 2 0 0 1-2 2H7"/></svg>');
  const dislike = feedback("dislike", "Unhelpful response", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14V3H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3Zm0 0 5 8c2 0 3-1 3-3l-1-5h5a2 2 0 0 0 2-2l-2-7a2 2 0 0 0-2-2H7"/></svg>');
  const speak = iconButton("Read response aloud", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Zm4 4a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"/></svg>');
  speak.addEventListener("click", () => { if (!("speechSynthesis" in window)) { speak.title = "Speech is not supported in this browser"; return; } if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); speak.title = "Read response aloud"; speak.setAttribute("aria-label", "Read response aloud"); return; } const utterance = new SpeechSynthesisUtterance(text); utterance.onend = () => { speak.title = "Read response aloud"; speak.setAttribute("aria-label", "Read response aloud"); }; window.speechSynthesis.speak(utterance); speak.title = "Stop reading"; speak.setAttribute("aria-label", "Stop reading"); });
  actions.append(copy, like, dislike, speak);
  const more = document.createElement("div"); more.className = "message-more-wrap";
  const moreButton = iconButton("More response actions", '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>'); moreButton.setAttribute("aria-expanded", "false");
  const menu = document.createElement("div"); menu.className = "message-more-menu"; menu.hidden = true;
  more.hidden = !canRegenerate || !turnId;
  moreButton.addEventListener("click", () => { menu.hidden = !menu.hidden; moreButton.setAttribute("aria-expanded", String(!menu.hidden)); });
  more.append(moreButton, menu); actions.append(more);
  if (canRegenerate && turnId) {
    const regenerate = document.createElement("button"); regenerate.type = "button"; regenerate.textContent = "Regenerate response"; regenerate.setAttribute("aria-label", "Regenerate assistant reply");
    regenerate.addEventListener("click", () => regenerateAssistantReply(turnId));
    regenerate.addEventListener("click", () => { menu.hidden = true; moreButton.setAttribute("aria-expanded", "false"); });
    menu.append(regenerate);
  }
  row.append(actions);
}
function addAssistantMessage(text, sources = [], turnId = null, options = {}) {
  const row = document.createElement("div");
  row.className = "message assistant";
  if (turnId) row.dataset.turnId = turnId;
  const content = document.createElement("div");
  content.className = "message-content assistant-content";
  renderAssistantReply(content, text);
  row.append(content);
  appendAssistantExtras(row, content, text, sources, turnId, options);
  messages.append(row);
  row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  return row;
}
function addStreamingAssistant(turnId) {
  const row = document.createElement("div"); row.className = "message assistant streaming-message"; row.dataset.turnId = turnId;
  const content = document.createElement("div"); content.className = "message-content assistant-content streaming-content";
  const cursor = document.createElement("span"); cursor.className = "stream-cursor"; cursor.setAttribute("aria-hidden", "true");
  content.append(cursor); row.append(content); messages.append(row); row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  return { row, content, cursor };
}
function finishStreamingAssistant(streaming, text, sources, turnId, options = {}) {
  if (!streaming) return addAssistantMessage(text, sources, turnId, options);
  streaming.cursor.remove(); streaming.content.replaceChildren(); renderAssistantReply(streaming.content, text);
  appendAssistantExtras(streaming.row, streaming.content, text, sources, turnId, options);
  streaming.row.classList.remove("streaming-message");
  return streaming.row;
}
function addTyping() {
  const row = document.createElement("div");
  row.className = "message assistant";
  row.innerHTML = '<div class="message-content"><div class="typing" aria-label="Nivli is thinking"><span></span><span></span><span></span></div><span class="thinking-label"></span></div>';
  row.querySelector(".thinking-label").textContent = mode === "script" ? "Nivli is reviewing your request…" : "Nivli is thinking…";
  messages.append(row);
  row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  return row;
}
async function consumeChatStream(payload, signal, onEvent) {
  const response = await fetch("/api/chat", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal });
  if (!response.ok) {
    let data = {};
    try { data = await response.json(); } catch {}
    const error = new Error(data.error || "Request failed."); error.status = response.status; error.data = data; throw error;
  }
  if (!response.body) throw new Error("This browser could not open a streaming response.");
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = "";
  const consumeBlock = block => {
    const data = block.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
    if (data) onEvent(JSON.parse(data));
  };
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/); buffer = blocks.pop() || "";
    for (const block of blocks) consumeBlock(block);
    if (done) break;
  }
  if (buffer.trim()) consumeBlock(buffer);
}
function regenerateAssistantReply(turnId) {
  const userMessage = [...conversationMessages].reverse().find(item => item.role === "user" && item.turnId === turnId);
  if (!userMessage || !conversationId || busy) return;
  const request = { message: userMessage.text, images: userMessage.images || [], mode, modelId: activeModelId, conversationId, turnId, webSearch: webSearchEnabled, chatMemory: conversationMemory, regenerate: true };
  pending = request;
  const existing = [...messages.querySelectorAll(".message.assistant[data-turn-id]")].find(row => row.dataset.turnId === turnId);
  existing?.remove();
  conversationMessages = conversationMessages.filter(item => !(item.role === "model" && item.turnId === turnId));
  errorBanner.hidden = true;
  sendMessage(request.message, true, true);
}
async function sendMessage(value, retry = false, regenerate = false) {
  const images = retry ? (pending?.images || []) : selectedImages;
  const message = value.trim() || (images.length ? "Please analyze the attached image(s)." : "");
  if (!message || busy) return;
  chatWelcome.hidden = true;
  errorBanner.hidden = true;
  if (errorDetail) errorDetail.hidden = true;
  const sentMode = retry ? pending.mode : mode;
  const turnId = retry ? pending.turnId : crypto.randomUUID();
  const selectedConversationId = retry ? pending.conversationId : conversationId;
  const selectedModelId = retry ? (pending.modelId || activeModelId) : activeModelId;
  const sentWebSearch = retry ? Boolean(pending.webSearch) : webSearchEnabled;
  const sentChatMemory = retry ? (pending.chatMemory || "") : conversationMemory;
  const requestState = retry ? { ...pending, regenerate } : { message, images, mode: sentMode, modelId: selectedModelId, conversationId: selectedConversationId, turnId, webSearch: sentWebSearch, chatMemory: sentChatMemory, regenerate: false };
  pending = requestState;
  if (!retry) {
    addUserMessage(message, images, turnId);
    conversationMessages.push({ role: "user", text: message, turnId, createdAt: Date.now(), ...(images.length ? { images } : {}) });
  } else if (regenerate) {
    const oldReply = [...messages.querySelectorAll(".message.assistant[data-turn-id]")].find(row => row.dataset.turnId === turnId);
    oldReply?.remove();
    conversationMessages = conversationMessages.filter(item => !(item.role === "model" && item.turnId === turnId));
  }
  busy = true;
  input.value = "";
  if (!retry) { selectedImages = []; renderSelectedImages(); }
  input.disabled = true;
  refreshInput();
  const typing = addTyping();
  const controller = new AbortController();
  const requestNumber = ++generationCounter;
  activeGeneration = controller;
  let streaming = null;
  let reply = "";
  let sources = [];
  try {
    await consumeChatStream({ message, mode: sentMode, conversationId: requestState.conversationId, turnId, images, model: selectedModelId, webSearch: sentWebSearch, chatMemory: sentChatMemory, regenerate: requestState.regenerate }, controller.signal, event => {
      if (event.type === "meta") { conversationId = event.conversationId; requestState.conversationId = event.conversationId; }
      else if (event.type === "delta") {
        typing.remove();
        if (!streaming) streaming = addStreamingAssistant(turnId);
        reply += event.content;
        streaming.content.insertBefore(document.createTextNode(event.content), streaming.cursor);
        streaming.row.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else if (event.type === "done") { sources = event.sources || []; }
      else if (event.type === "error") { const error = new Error(event.error || AI_ERROR); error.data = event; throw error; }
    });
    if (requestNumber !== generationCounter) return;
    typing.remove();
    if (!reply.trim()) throw new Error("Nivli finished without a reply. Please try again.");
    finishStreamingAssistant(streaming, reply, sources, turnId, { canRegenerate: true });
    conversationMessages.push({ role: "model", text: reply, turnId, ...(sources.length ? { sources } : {}) });
    history.push({ role: "user", text: message, ...(images.length ? { images } : {}) }, { role: "model", text: reply });
    pending = null;
    await loadConversationList();
  } catch (error) {
    if (requestNumber !== generationCounter) return;
    typing.remove();
    if (controller.signal.aborted) {
      if (reply.trim()) {
        finishStreamingAssistant(streaming, reply, sources, turnId, { incomplete: true, canRegenerate: true });
        conversationMessages.push({ role: "model", text: reply, turnId, incomplete: true, ...(sources.length ? { sources } : {}) });
        pending = null;
      } else {
        pending = { ...requestState, regenerate: requestState.regenerate || regenerate };
        errorText.textContent = "Stopped before the reply began. You can retry when you’re ready.";
        if (errorDetail) errorDetail.hidden = true;
        errorBanner.hidden = false;
      }
      loadConversationList();
    } else if (error.status === 401 || error.status === 403) {
      pending = null;
      try {
        const me = await api("/api/me");
        account = me.account;
        if (account && !account.complete) renderOnboarding();
        else if (!account) renderAuth();
      } catch { renderAuth(); }
    } else if (error.status === 400) {
      pending = null;
      errorText.textContent = error.message;
      if (errorDetail) errorDetail.hidden = true;
      errorBanner.hidden = false;
    } else {
      conversationId = error.data?.conversationId || selectedConversationId;
      requestState.conversationId = conversationId;
      requestState.regenerate = requestState.regenerate || Boolean(reply.trim());
      pending = requestState;
      if (reply.trim()) {
        finishStreamingAssistant(streaming, reply, sources, turnId, { incomplete: true, canRegenerate: true });
        conversationMessages.push({ role: "model", text: reply, turnId, incomplete: true, ...(sources.length ? { sources } : {}) });
      }
      errorText.textContent = ["MODEL_SETUP_REQUIRED", "WEB_SEARCH_UNAVAILABLE"].includes(error.data?.code) ? error.message : AI_ERROR;
      if (errorDetail) {
        errorDetail.textContent = error.data?.detail || "";
        errorDetail.hidden = !error.data?.detail;
      }
      errorBanner.hidden = false;
      await loadConversationList();
    }
  } finally {
    if (requestNumber === generationCounter) {
      busy = false;
      activeGeneration = null;
      input.disabled = false;
      refreshInput();
      input.focus();
    }
  }
}
function refreshInput() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  sendButton.querySelector(".send-icon").hidden = busy;
  sendButton.querySelector(".stop-icon").hidden = !busy;
  sendButton.disabled = busy ? false : (!input.value.trim() && !selectedImages.length);
  sendButton.setAttribute("aria-label", busy ? "Stop generating" : "Send message");
  sendButton.title = busy ? "Stop generating" : "Send message";
  charCount.textContent = input.value.length ? `${input.value.length}/4000` : "";
}
function resetChat() {
  if (activeGeneration) activeGeneration.abort();
  activeGeneration = null;
  generationCounter++;
  busy = false;
  input.disabled = false;
  conversationId = null;
  conversationMessages = [];
  conversationMemory = "";
  webSearchEnabled = false;
  updateWebSearchButton();
  history = [];
  pending = null;
  messages.replaceChildren();
  selectedImages = [];
  renderSelectedImages();
  errorBanner.hidden = true;
  chatWelcome.hidden = false;
  updateTimeGreeting();
  document.querySelector("#profile-menu").hidden = true;
  renderConversationList();
  refreshInput();
}
document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => { setMode(button.dataset.mode); resetChat(); }));
document.querySelectorAll("[data-new-chat]").forEach((button) => button.addEventListener("click", (event) => { event.preventDefault(); resetChat(); }));
document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => sendMessage(button.dataset.prompt)));
document.querySelector("#history-refresh").addEventListener("click", loadConversationList);
document.querySelector("#history-search").addEventListener("input", event => { conversationSearch = event.target.value.trim().toLocaleLowerCase(); renderConversationList(); });
input.addEventListener("input", refreshInput);
voiceButton.addEventListener("click", toggleVoiceInput);
input.addEventListener("keydown", (event) => { if (enterToSend && event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
form.addEventListener("submit", (event) => { event.preventDefault(); if (activeRecognition) activeRecognition.stop(); if (busy) activeGeneration?.abort(); else sendMessage(input.value); });
retryButton.addEventListener("click", () => { if (pending) sendMessage(pending.message, true, Boolean(pending.regenerate)); });

function renderSelectedImages() {
  attachmentStrip.replaceChildren();
  attachmentStrip.hidden = selectedImages.length === 0;
  for (const [index, image] of selectedImages.entries()) {
    const item = document.createElement("div");
    item.className = "attachment-preview";
    const preview = document.createElement("img");
    preview.src = image.data;
    preview.alt = "";
    const name = document.createElement("span");
    name.textContent = image.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${image.name}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => { selectedImages.splice(index, 1); renderSelectedImages(); refreshInput(); });
    item.append(preview, name, remove);
    attachmentStrip.append(item);
  }
}

function showError(message) {
  errorText.textContent = message;
  errorBanner.hidden = false;
}

document.querySelector("#tools-button").addEventListener("click", (event) => {
  event.stopPropagation();
  const menu = document.querySelector("#tools-menu");
  menu.hidden = !menu.hidden;
  document.querySelector("#tools-button").setAttribute("aria-expanded", String(!menu.hidden));
  document.querySelector("#model-menu").hidden = true;
  document.querySelector("#model-picker-button").setAttribute("aria-expanded", "false");
});
document.querySelector("#attach-images-button").addEventListener("click", () => { document.querySelector("#tools-menu").hidden = true; imageInput.click(); });
const textFileInput = document.querySelector("#text-file-input");
document.querySelector("#attach-text-button").addEventListener("click", () => { document.querySelector("#tools-menu").hidden = true; textFileInput.click(); });
textFileInput.addEventListener("change", async () => {
  const file = textFileInput.files?.[0];
  textFileInput.value = "";
  if (!file) return;
  if (file.size > 12000) { showError("Choose a text or code file under 12 KB."); return; }
  try {
    const contents = await file.text();
    if (contents.length > 3000) { showError("That file is too long to attach here. Keep text or code files under 3,000 characters."); return; }
    const fence = String.fromCharCode(96).repeat(3);
    const addition = `Please review this file (${file.name}):\n\n${fence}\n${contents}\n${fence}`;
    if ((input.value + (input.value ? "\n\n" : "") + addition).length > 4000) { showError("There isn’t enough room in the message for that file. Start a new message or use a smaller file."); return; }
    input.value = `${input.value}${input.value ? "\n\n" : ""}${addition}`;
    input.focus();
    refreshInput();
  } catch { showError("That file couldn’t be read. Please choose it again."); }
});
document.querySelector("#insert-code-button").addEventListener("click", () => {
  const addition = "```\n\n```";
  if ((input.value + addition).length > 4000) return showError("There isn’t enough room in the message for a code block.");
  input.value += `${input.value ? "\n\n" : ""}${addition}`;
  document.querySelector("#tools-menu").hidden = true;
  input.focus();
  refreshInput();
});
document.querySelector("#switch-mode-button").addEventListener("click", () => {
  setMode(mode === "chat" ? "script" : "chat");
  resetChat();
  document.querySelector("#tools-menu").hidden = true;
});
document.querySelector("#model-picker-button").addEventListener("click", (event) => {
  event.stopPropagation();
  const menu = document.querySelector("#model-menu");
  menu.hidden = !menu.hidden;
  document.querySelector("#model-picker-button").setAttribute("aria-expanded", String(!menu.hidden));
  document.querySelector("#tools-menu").hidden = true;
  document.querySelector("#tools-button").setAttribute("aria-expanded", "false");
});
async function loadPreferences() {
  try { const result = await api("/api/preferences"); personalization = result.preferences || personalization; } catch {}
  renderPersonalizationSettings();
}
function renderPersonalizationSettings() {
  const toggle = document.querySelector("#memory-enabled-setting");
  const field = document.querySelector("#memory-setting");
  const chatField = document.querySelector("#chat-memory-setting");
  const depth = document.querySelector("#context-depth-setting");
  const style = document.querySelector("#response-style-setting");
  const aboutYou = document.querySelector("#custom-about-setting");
  const responseInstructions = document.querySelector("#custom-response-setting");
  if (!toggle || !field || !chatField || !depth || !style || !aboutYou || !responseInstructions) return;
  toggle.checked = personalization.useMemory; field.value = personalization.memory; depth.value = String(personalization.contextDepth); style.value = personalization.responseStyle || "auto";
  aboutYou.value = personalization.aboutYou || "";
  responseInstructions.value = personalization.responseInstructions || "";
  chatField.value = conversationMemory; chatField.disabled = !conversationId;
  chatField.placeholder = conversationId ? "Only Nivli in this chat will use this note." : "Start a conversation to add a chat-only memory.";
  updateComposerContextLabel();
}
function updateComposerContextLabel() {
  const contextLabel = document.querySelector("#composer-context-label");
  if (contextLabel) contextLabel.textContent = webSearchEnabled ? "Always search · sources included" : "Auto-search current questions · settings";
}
function updateWebSearchButton() {
  const button = document.querySelector("#toggle-web-search-button");
  if (!button) return;
  button.setAttribute("aria-pressed", String(webSearchEnabled));
  button.querySelector("strong").textContent = webSearchEnabled ? "Use automatic search" : "Always search the web";
  button.querySelector("small").textContent = webSearchEnabled ? "Current questions are already searched automatically" : "Search every message and attach source links";
  updateComposerContextLabel();
}
async function savePersonalization() {
  const button = document.querySelector("#save-memory-setting");
  const status = document.querySelector("#memory-save-status");
  const memory = document.querySelector("#memory-setting").value.trim();
  const chatMemory = document.querySelector("#chat-memory-setting").value.trim();
  const aboutYou = document.querySelector("#custom-about-setting").value.trim();
  const responseInstructions = document.querySelector("#custom-response-setting").value.trim();
  if ([memory, chatMemory, aboutYou, responseInstructions].some(value => value.length > 1200)) { status.textContent = "Keep each note or instruction under 1,200 characters."; return; }
  button.disabled = true; status.textContent = "Saving…";
  try {
    const result = await api("/api/preferences", { method: "PATCH", body: JSON.stringify({ useMemory: document.querySelector("#memory-enabled-setting").checked, memory, aboutYou, responseInstructions, contextDepth: Number(document.querySelector("#context-depth-setting").value), responseStyle: document.querySelector("#response-style-setting").value }) });
    personalization = result.preferences;
    if (conversationId) {
      const chatResult = await api("/api/conversations/" + encodeURIComponent(conversationId) + "/memory", { method: "PATCH", body: JSON.stringify({ memory: chatMemory }) });
      conversationMemory = chatResult.memory;
      if (pending) pending.chatMemory = conversationMemory;
      status.textContent = "Saved custom instructions, account memory, and this chat’s memory.";
    } else { status.textContent = "Saved custom instructions and account memory. Chat-only memory is available after you start a conversation."; }
    updateComposerContextLabel();
  } catch (error) { status.textContent = error.message || "Could not save. Try again."; }
  finally { button.disabled = false; }
}
const settingsDescriptions = {
  general: "Choose how Nivli behaves in your chats.",
  appearance: "Make Nivli more comfortable to read.",
  personalization: "Control response style, chat context, and saved memories.",
  account: "View the account connected to Nivli."
};
function setSettingsPanel(category) {
  const tab = document.querySelector(`[data-settings-tab="${category}"]`);
  const panel = document.querySelector(`[data-settings-panel="${category}"]`);
  if (!tab || !panel) return;
  document.querySelectorAll("[data-settings-tab]").forEach(button => {
    const active = button === tab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  document.querySelectorAll("[data-settings-panel]").forEach(section => { section.hidden = section !== panel; });
  document.querySelector("#settings-title").textContent = tab.querySelector("span").textContent;
  document.querySelector("#settings-description").textContent = settingsDescriptions[category];
  document.querySelector(".settings-content").scrollTop = 0;
}
document.querySelectorAll("[data-settings-tab]").forEach(button => button.addEventListener("click", () => setSettingsPanel(button.dataset.settingsTab)));
document.querySelector("#settings-search").addEventListener("input", event => {
  const query = event.target.value.trim().toLocaleLowerCase();
  const tabs = [...document.querySelectorAll("[data-settings-tab]")];
  const visible = tabs.filter(tab => tab.textContent.toLocaleLowerCase().includes(query));
  tabs.forEach(tab => { tab.hidden = !visible.includes(tab); });
  document.querySelector("#settings-no-results").hidden = visible.length > 0;
  if (visible.length && !visible.some(tab => tab.classList.contains("active"))) setSettingsPanel(visible[0].dataset.settingsTab);
  if (!visible.length) {
    document.querySelectorAll("[data-settings-panel]").forEach(panel => { panel.hidden = true; });
    document.querySelector("#settings-title").textContent = "No results";
    document.querySelector("#settings-description").textContent = "Try a different settings search.";
  }
});
function openSettings() {
  profileMenu.hidden = true;
  document.querySelector("#profile-button").setAttribute("aria-expanded", "false");
  const accountName = account?.name || account?.username || "Nivli account";
  document.querySelector("#settings-account-name").textContent = accountName;
  document.querySelector("#settings-account-avatar").textContent = accountName.trim().charAt(0).toLocaleUpperCase() || "N";
  document.querySelector("#settings-account-label").textContent = (account?.username ? "@" + account.username + " · " : "") + (account?.email || "Signed in with Google");
  document.querySelector("#text-size-setting").value = textSize;
  document.querySelector("#enter-send-setting").checked = enterToSend;
  renderPersonalizationSettings();
  document.querySelector("#memory-save-status").textContent = "Account memory is sent only when enabled; chat memory is sent only in this conversation.";
  document.querySelectorAll("[data-setting-theme]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.settingTheme === (localStorage.getItem("luma-theme") || "system"))));
  document.querySelector("#settings-search").value = "";
  document.querySelectorAll("[data-settings-tab]").forEach(button => { button.hidden = false; });
  document.querySelector("#settings-no-results").hidden = true;
  setSettingsPanel("general");
  document.querySelector("#settings-dialog").showModal();
}
document.querySelector("#open-settings").addEventListener("click", openSettings);
document.querySelector("#settings-close").addEventListener("click", () => document.querySelector("#settings-dialog").close());
document.querySelector("#save-memory-setting").addEventListener("click", savePersonalization);
document.querySelector("#clear-memory-setting").addEventListener("click", async () => {
  if (!window.confirm("Clear your custom instructions, saved account memory, and this conversation’s memory?")) return;
  document.querySelector("#memory-setting").value = "";
  document.querySelector("#chat-memory-setting").value = "";
  document.querySelector("#custom-about-setting").value = "";
  document.querySelector("#custom-response-setting").value = "";
  await savePersonalization();
});
document.querySelector("#toggle-web-search-button").addEventListener("click", () => {
  webSearchEnabled = !webSearchEnabled;
  if (pending) pending.webSearch = webSearchEnabled;
  updateWebSearchButton();
  document.querySelector("#tools-menu").hidden = true;
  document.querySelector("#tools-button").setAttribute("aria-expanded", "false");
});
document.querySelector("#settings-dialog").addEventListener("click", event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
document.querySelectorAll("[data-setting-theme]").forEach(button => button.addEventListener("click", () => {
  const preference = button.dataset.settingTheme;
  try { localStorage.setItem("luma-theme", preference); } catch {}
  applyTheme(preference);
  document.querySelectorAll("[data-setting-theme]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
}));
const accentInput = document.querySelector("#custom-accent-setting");
if (accentInput) { accentInput.value = customAccent; ["input", "change"].forEach(type => accentInput.addEventListener(type, event => applyCustomAccent(event.target.value))); }
const surfaceInput = document.querySelector("#custom-surface-setting");
if (surfaceInput) { surfaceInput.value = customSurface; ["input", "change"].forEach(type => surfaceInput.addEventListener(type, event => applyCustomSurface(event.target.value))); }
const glowInput = document.querySelector("#custom-glow-setting");
if (glowInput) { glowInput.value = customGlow; ["input", "change"].forEach(type => glowInput.addEventListener(type, event => applyCustomGlow(event.target.value))); }
document.querySelector("#text-size-setting").addEventListener("change", event => {
  textSize = event.target.value;
  document.documentElement.dataset.textSize = textSize;
  try { localStorage.setItem("luma-text-size", textSize); } catch {}
});
document.querySelector("#enter-send-setting").addEventListener("change", event => {
  enterToSend = event.target.checked;
  try { localStorage.setItem("luma-enter-to-send", String(enterToSend)); } catch {}
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".popover-anchor")) {
    document.querySelector("#tools-menu").hidden = true;
    document.querySelector("#model-menu").hidden = true;
    document.querySelector("#tools-button").setAttribute("aria-expanded", "false");
    document.querySelector("#model-picker-button").setAttribute("aria-expanded", "false");
  }
});
async function addImageFiles(files) {
  const incoming = [...files];
  if (selectedImages.length + incoming.length > 3) { showError("Attach up to 3 images per message."); return; }
  for (const file of incoming) {
    if (!/^(image\/(jpeg|png|webp))$/.test(file.type)) { showError("Choose a JPEG, PNG, or WebP image."); continue; }
    if (file.size > 2 * 1024 * 1024) { showError("Each image must be under 2 MB."); continue; }
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      selectedImages.push({ name: file.name, type: file.type, data });
    } catch { showError("That image couldn’t be read. Please choose it again."); }
  }
  renderSelectedImages();
  refreshInput();
}
imageInput.addEventListener("change", async () => {
  await addImageFiles(imageInput.files);
  imageInput.value = "";
});
form.addEventListener("paste", async (event) => {
  const items = [...(event.clipboardData?.items || [])];
  const imageItems = items.filter((item) => item.type.startsWith("image/"));
  if (!imageItems.length) return;
  const files = imageItems.map((item, index) => {
    const file = item.getAsFile();
    if (!file) return null;
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1] || "png";
    return new File([file], `pasted-image-${index + 1}.${extension}`, { type: file.type });
  }).filter(Boolean);
  if (!files.length) return;
  event.preventDefault();
  await addImageFiles(files);
});
document.addEventListener("keydown", (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !chatScreen.hidden) { event.preventDefault(); resetChat(); } });
const profileButton = document.querySelector("#profile-button");
const profileMenu = document.querySelector("#profile-menu");
profileButton.addEventListener("click", () => { profileMenu.hidden = !profileMenu.hidden; profileButton.setAttribute("aria-expanded", String(!profileMenu.hidden)); });
document.addEventListener("click", (event) => { if (!event.target.closest(".profile-wrap")) { profileMenu.hidden = true; profileButton.setAttribute("aria-expanded", "false"); } });
document.querySelectorAll("[data-signout]").forEach(button => button.addEventListener("click", async () => {
  try { await api("/api/auth/signout", { method: "POST", body: "{}" }); account = null; history = []; conversationId = null; conversationList = []; renderAuth(); }
  catch { window.alert("Sign-out could not be confirmed. Please try again."); }
}));
async function boot() {
  try {
    [config] = await Promise.all([api("/api/config")]);
    const me = await api("/api/me");
    account = me.account;
    if (account) {
      if (account.complete) enterChat();
      else renderOnboarding();
    } else renderAuth();
  } catch {
    config = config || { googleClientId: null };
    authNotice.textContent = "Nivli couldn't check sign-in right now. Please refresh the page.";
    renderAuth();
  }
}
setInterval(updateTimeGreeting, 60000);
boot();

