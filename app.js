const STORAGE_KEY = "controle-integrado-maio-v1";
const defaultCategories = ["Operacional", "Transporte", "Material", "Marketing", "Administrativo"];
const defaultLocations = ["Porto", "Lisboa", "Faro", "Braga", "Funchal"];
const defaultOperators = ["Ana Martins", "Rui Costa", "Sofia Reis", "Pedro Lima"];
const defaultPaymentMethods = ["Dinheiro", "Cartao", "Transferencia", "MB WAY", "IBAN", "PayPal", "Revolut", "Wise"];
const defaultTheme = "green";
const availableThemes = ["green", "blue", "gray", "pink", "purple"];
const AUTH_SESSION_KEY = "controle-integrado-supabase-session";
const LAST_IMPORT_KEY = "controle-integrado-last-import";
const USER_THEME_KEY_PREFIX = "controle-integrado-theme";
const operatorEmojiMap = {
  "ðŸ˜ˆ": "Erick",
  "ðŸ˜»": "Xavier",
  "ðŸŒ³": "Tayane",
  "â¤ï¸": "Erica",
  "â™¥ï¸": "Erica",
  "â™¥": "Erica",
  "âœ¨": "Cachos",
  "ðŸ‘": "Duda",
  "ðŸ’™": "Ana"
};
const operatorSymbolMap = [
  { symbols: ["😈", "ðŸ˜ˆ"], name: "Erick" },
  { symbols: ["😻", "ðŸ˜»"], name: "Xavier" },
  { symbols: ["🌳", "ðŸŒ³"], name: "Tayane" },
  { symbols: ["❤️", "❤", "♥️", "♥", "â¤ï¸", "â™¥ï¸", "â™¥"], name: "Erica" },
  { symbols: ["✨", "âœ¨"], name: "Cachos" },
  { symbols: ["🍑", "ðŸ‘"], name: "Duda" },
  { symbols: ["💙", "ðŸ’™"], name: "Ana" }
];
const attendantLocationMap = {
  ray: "Porto",
  rai: "Porto",
  raine: "Porto",
  duda: "Guimaraes",
  bea: "Guimaraes",
  vit: "Brasil",
  vitoria: "Brasil",
  laura: "Porto",
  raquel: "Porto",
  gi: "Braga",
  gih: "Braga",
  mineira: "Leiria",
  larissa: "Porto",
  isa: "Leiria",
  isadora: "Leiria",
  kemy: "Braga",
  kemmy: "Braga",
  rosario: "Braga"
};
const attendantNameMap = {
  vit: "Vitoria",
  vitoria: "Vitoria",
  gi: "Gi",
  gih: "Gi",
  isa: "Isa",
  isadora: "Isa",
  rosario: "Rosario",
  kemy: "Kemy",
  kemmy: "Kemy",
  bea: "Bea",
  duda: "Duda",
  ray: "Ray",
  rai: "Ray",
  raine: "Ray",
  "vitã³ria": "Vitoria",
  "vitãria": "Vitoria",
  bm: "BM",
  iban: "Agencia",
  ibam: "Agencia",
  laura: "Laura",
  raquel: "Raquel",
  mineira: "Mineira",
  larissa: "Larissa"
};
const defaultAuth = {
  username: "admin",
  password: "admin123"
};

const currency = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR"
});

const brlCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const usdCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "long",
  year: "numeric"
});

const today = new Date();
const currentYear = today.getFullYear();

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const seedData = {
  income: [],
  expenses: [],
  categories: [],
  locations: [],
  operators: [],
  paymentMethods: [],
  theme: defaultTheme,
  auth: defaultAuth
};

let state = loadState();
let selectedWeeklyIds = null;
let importPreviewRecords = [];
let recentCurrentPage = 1;
let importCurrentPage = 1;
let weeklyCurrentPage = 1;
let monthlyCurrentPage = 1;
let expenseCurrentPage = 1;
let incomeCurrentPage = 1;
const RECORD_PAGE_SIZE = 20;
const INCOME_PAGE_SIZE = RECORD_PAGE_SIZE;

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
    return JSON.parse(JSON.stringify(seedData));
  }
  const parsed = JSON.parse(stored);
  return normalizeState(parsed);
}

async function saveState(scope = "all") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return saveRemoteState(scope);
}

async function loadRemoteState() {
  if (isSupabaseConfigured()) {
    return loadSupabaseState();
  }
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("API indisponivel");
    }
    const payload = await response.json();
    if (!payload.state) {
      await saveRemoteState();
      return state;
    }
    state = normalizeState(payload.state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  } catch {
    showToast("Base de dados indisponivel. Usando dados locais.");
    return state;
  }
}

async function saveRemoteState(scope = "all") {
  if (isSupabaseConfigured()) {
    return saveSupabaseState(scope);
  }
  try {
    await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state)
    });
    return true;
  } catch {
    // Mantem a aplicacao funcional offline; os dados ficam no navegador.
    return false;
  }
}

function getSupabaseConfig() {
  return window.SUPABASE_CONFIG || {};
}

function isSupabaseConfigured() {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey && !config.anonKey.includes("COLE_AQUI"));
}

function getSupabaseHeaders(extraHeaders = {}) {
  const config = getSupabaseConfig();
  const session = getAuthSession();
  const bearer = session?.access_token || config.anonKey;
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${bearer}`,
    ...extraHeaders
  };
}

async function loadSupabaseState() {
  const previousState = normalizeState(state);
  const normalizedState = await loadNormalizedSupabaseState();
  if (normalizedState) {
    const nextState = normalizeState(normalizedState);
    state = nextState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    showToast("Dados carregados das tabelas Supabase.");
    return state;
  }
  state = previousState;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  showToast("Nao foi possivel carregar o Supabase. Dados locais preservados.");
  return state;
}

async function saveSupabaseState(scope = "all") {
  if (await saveNormalizedSupabaseState(scope)) {
    return true;
  }
  showToast("Nao foi possivel salvar nas tabelas do Supabase.");
  return false;
}

async function supabaseRequest(path, options = {}) {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: getSupabaseHeaders(options.headers || {})
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function toSlugId(prefix, value) {
  return `${prefix}-${value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function incomeToRow(item) {
  return {
    id: item.id,
    client_name: item.clientName,
    operator_name: item.operatorName,
    entry_date: item.date,
    payment_method: item.paymentMethod,
    transfer_person: item.transferPerson || "",
    city: item.city,
    amount: Number(item.amount || 0),
    description: item.serviceType ? `[${item.serviceType}] ${item.description}` : item.description
  };
}

function rowToIncome(row) {
  const parsedDescription = stripServiceTypePrefix(row.description);
  return {
    id: row.id,
    clientName: row.client_name,
    operatorName: row.operator_name,
    date: row.entry_date,
    paymentMethod: row.payment_method,
    transferPerson: row.transfer_person || "",
    city: row.city,
    amount: Number(row.amount || 0),
    description: parsedDescription.description,
    serviceType: parsedDescription.serviceType
  };
}

function expenseToRow(item) {
  return {
    id: item.id,
    description: item.description,
    amount: Number(item.amount || 0),
    category: item.category,
    payment_date: item.date,
    payment_method: item.paymentMethod,
    transfer_person: item.transferPerson || "",
    city: item.city
  };
}

function rowToExpense(row) {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount || 0),
    category: row.category,
    date: row.payment_date,
    paymentMethod: row.payment_method,
    transferPerson: row.transfer_person || "",
    city: row.city
  };
}

async function loadSupabaseTable(path, fallback = []) {
  try {
    const pageSize = 1000;
    const rows = [];
    let offset = 0;
    while (true) {
      const separator = path.includes("?") ? "&" : "?";
      const batch = await supabaseRequest(`${path}${separator}limit=${pageSize}&offset=${offset}`);
      rows.push(...batch);
      if (batch.length < pageSize) {
        return rows;
      }
      offset += pageSize;
    }
  } catch (error) {
    console.error(`Falha ao carregar ${path} do Supabase.`, error);
    return fallback;
  }
}

async function loadNormalizedSupabaseState() {
  const [incomeRows, expenseRows, categoryRows, locationRows, operatorRows, paymentMethodRows, settingsRows] = await Promise.all([
    loadSupabaseTable("entradas?select=*&order=entry_date.asc", null),
    loadSupabaseTable("saidas?select=*&order=payment_date.asc", state.expenses.map(expenseToRow)),
    loadSupabaseTable("categorias?select=*&order=name.asc", state.categories.map((name) => ({ name }))),
    loadSupabaseTable("localidades?select=*&order=name.asc", state.locations.map((name) => ({ name }))),
    loadSupabaseTable("operacionais?select=*&order=name.asc", state.operators.map((name) => ({ name }))),
    loadSupabaseTable("metodos_pagamento?select=*&order=name.asc", state.paymentMethods.map((name) => ({ name }))),
    loadSupabaseTable("configuracoes?id=eq.1&select=*", [])
  ]);

  if (!incomeRows) {
    return null;
  }

  return {
    income: incomeRows.map(rowToIncome),
    expenses: expenseRows.map(rowToExpense),
    categories: categoryRows.map((row) => row.name),
    locations: locationRows.map((row) => row.name),
    operators: operatorRows.map((row) => row.name),
    paymentMethods: paymentMethodRows.map((row) => row.name),
    theme: settingsRows[0]?.theme || state.theme,
    auth: settingsRows[0]?.auth || state.auth
  };
}

async function insertRowsSafely(tableName, rows) {
  try {
    await supabaseRequest(tableName, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(rows)
    });
    return true;
  } catch (error) {
    console.error(`Falha ao inserir registros em ${tableName} no Supabase.`, error);
    return false;
  }
}

async function verifyRowsVisible(tableName, ids) {
  if (!ids.length) {
    return true;
  }
  try {
    const encodedIds = ids.map((id) => `"${id}"`).join(",");
    const rows = await supabaseRequest(`${tableName}?id=in.(${encodedIds})&select=id`);
    return rows.length === ids.length;
  } catch (error) {
    console.error(`Falha ao verificar registros em ${tableName} no Supabase.`, error);
    return false;
  }
}

async function upsertTableSafely(name, rows) {
  if (!rows.length) {
    return true;
  }
  try {
    await supabaseRequest(name, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(rows)
    });
    return true;
  } catch (error) {
    console.error(`Falha ao salvar tabela ${name} no Supabase.`, error);
    return false;
  }
}

async function saveSettingsSafely() {
  try {
    await supabaseRequest("configuracoes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({
        id: 1,
        theme: state.theme,
        auth: state.auth
      })
    });
    return true;
  } catch (error) {
    console.error("Falha ao salvar configuracoes no Supabase.", error);
    return false;
  }
}

async function saveNormalizedSupabaseState(scope = "all") {
  const tasks = {
    income: () => upsertTableSafely("entradas", state.income.map(incomeToRow)),
    expenses: () => upsertTableSafely("saidas", state.expenses.map(expenseToRow)),
    categories: () => upsertTableSafely("categorias", state.categories.map((name) => ({ id: toSlugId("cat", name), name }))),
    locations: () => upsertTableSafely("localidades", state.locations.map((name) => ({ id: toSlugId("loc", name), name }))),
    operators: () => upsertTableSafely("operacionais", state.operators.map((name) => ({ id: toSlugId("op", name), name }))),
    paymentMethods: () => upsertTableSafely("metodos_pagamento", state.paymentMethods.map((name) => ({ id: toSlugId("pay", name), name }))),
    settings: () => saveSettingsSafely()
  };

  if (scope !== "all" && tasks[scope]) {
    return tasks[scope]();
  }

  const results = await Promise.all(Object.values(tasks).map((task) => task()));
  return results.every(Boolean);
}

function normalizeState(data) {
  const categories = new Set(Array.isArray(data.categories) ? data.categories : []);
  const locations = new Set(Array.isArray(data.locations) ? data.locations : []);
  const operators = new Set(Array.isArray(data.operators) ? data.operators : []);
  const paymentMethods = new Set(Array.isArray(data.paymentMethods) ? data.paymentMethods : []);
  return {
    income: data.income || [],
    expenses: data.expenses || [],
    categories: [...categories],
    locations: [...locations],
    operators: [...operators],
    paymentMethods: [...paymentMethods],
    theme: availableThemes.includes(data.theme) ? data.theme : defaultTheme,
    auth: {
      username: data.auth?.username || defaultAuth.username,
      password: data.auth?.password || defaultAuth.password
    }
  };
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function sum(items) {
  return items.reduce((total, item) => total + Number(item.amount || 0), 0);
}

function paginateItems(items, currentPage, pageSize = RECORD_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const pageStart = (page - 1) * pageSize;
  return {
    page,
    totalPages,
    pageStart,
    pageItems: items.slice(pageStart, pageStart + pageSize)
  };
}

function updatePagination(prefix, totalItems, pageStart, currentPage, totalPages, pageSize = RECORD_PAGE_SIZE) {
  const info = document.querySelector(`#${prefix}PaginationInfo`);
  const previousButton = document.querySelector(`#${prefix}PrevPage`);
  const nextButton = document.querySelector(`#${prefix}NextPage`);
  if (!info || !previousButton || !nextButton) {
    return;
  }
  const startLabel = totalItems ? pageStart + 1 : 0;
  const endLabel = Math.min(pageStart + pageSize, totalItems);
  info.textContent = `${startLabel}-${endLabel} de ${totalItems} registros`;
  previousButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= totalPages;
}

function isMayCurrentYear(item) {
  const date = parseLocalDate(item.date);
  return date.getFullYear() === currentYear && date.getMonth() === 4;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date) {
  return new Intl.DateTimeFormat("pt-PT", { month: "short" }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

function formatWhatsAppCurrency(value) {
  return `EUR ${Number(value || 0).toFixed(2)}`;
}

function formatWhatsAppMethodCurrency(method, value) {
  const currencyLabel = normalizeText(method) === "pix" ? "BRL" : "EUR";
  return `${currencyLabel} ${Number(value || 0).toFixed(2)}`;
}

function startOfWeek(date) {
  const local = new Date(date);
  const day = local.getDay();
  local.setDate(local.getDate() - day);
  local.setHours(0, 0, 0, 0);
  return local;
}

function toDateInputValue(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function getLastSixMonths() {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
    return {
      key: monthKey(date),
      label: monthLabel(date)
    };
  });
}

function getDashboardSelectedMonth() {
  const value = document.querySelector("#dashboardMonth")?.value;
  if (!value) {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }
  return new Date(year, month - 1, 1);
}

function syncDashboardPeriodControls() {
  const selectedPeriod = document.querySelector("#dashboardPeriod")?.value || "month";
  document.querySelector("#dashboardMonthField")?.classList.toggle("hidden", selectedPeriod !== "month");
  document.querySelector("#dashboardWeekField")?.classList.toggle("hidden", selectedPeriod !== "week");
}

function getDashboardPeriodRange() {
  const selectedPeriod = document.querySelector("#dashboardPeriod")?.value || "month";
  if (selectedPeriod === "week") {
    const weekValue = document.querySelector("#dashboardWeek")?.value;
    const selectedDate = weekValue ? parseLocalDate(weekValue) : today;
    const { start, end } = getDashboardWeekRange(selectedDate);
    return {
      period: "week",
      start,
      end,
      title: `Semana ${formatShortDate(start)} - ${formatShortDate(end)}`,
      balanceLabel: "Saldo semanal",
      incomeLabel: "Entradas semanais",
      expenseLabel: "Saidas semanais",
      help: `Entradas menos despesas de ${formatShortDate(start)} a ${formatShortDate(end)}`
    };
  }

  const start = getDashboardSelectedMonth();
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    period: "month",
    start,
    end,
    title: monthTitle(start),
    balanceLabel: "Saldo mensal",
    incomeLabel: "Entradas (balanco)",
    expenseLabel: "Saidas (despesas)",
    help: `Entradas menos despesas em ${monthTitle(start)}`
  };
}

function renderDashboard() {
  applyTheme(getActiveTheme());
  syncDashboardPeriodControls();
  const dashboardPeriod = getDashboardPeriodRange();
  const periodIncome = state.income.filter((item) => inRange(item, dashboardPeriod.start, dashboardPeriod.end));
  const periodExpenses = state.expenses.filter((item) => inRange(item, dashboardPeriod.start, dashboardPeriod.end));
  const incomeTotal = sum(periodIncome);
  const expenseTotal = sum(periodExpenses);

  document.querySelector("#dashboardPeriodTitle").textContent = dashboardPeriod.title;
  document.querySelector("#dashboardBalanceLabel").textContent = dashboardPeriod.balanceLabel;
  document.querySelector("#dashboardIncomeLabel").textContent = dashboardPeriod.incomeLabel;
  document.querySelector("#dashboardExpenseLabel").textContent = dashboardPeriod.expenseLabel;
  document.querySelector("#dashboardBalanceHelp").textContent = dashboardPeriod.help;
  document.querySelector("#monthlyBalance").textContent = currency.format(incomeTotal - expenseTotal);
  document.querySelector("#incomeTotal").textContent = currency.format(incomeTotal);
  document.querySelector("#expenseTotal").textContent = currency.format(expenseTotal);
  document.querySelector("#incomeCount").textContent = `${periodIncome.length} registros`;
  document.querySelector("#expenseCount").textContent = `${periodExpenses.length} registros`;

  const statusPanel = document.querySelector(".status-panel");
  if (dashboardPeriod.period === "week") {
    statusPanel?.classList.remove("hidden");
    renderWeeklyStatus(dashboardPeriod.start, dashboardPeriod.end);
  } else {
    statusPanel?.classList.add("hidden");
  }
  renderCities(periodIncome, periodExpenses);
  renderRecentRows(periodIncome, periodExpenses);
  renderExpenseRecentRows();
  renderCashFlowChart();
  renderWeeklyReport();
  renderMonthlyReport();
  renderAdminPanel();
  renderDynamicSelects();
  renderIncomeEntries();
  renderImportPreview();
  updateUndoImportButton();
}

function getCssColor(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function applyTheme(theme) {
  const selectedTheme = availableThemes.includes(theme) ? theme : defaultTheme;
  document.body.dataset.theme = selectedTheme;
  document.querySelectorAll(".theme-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.theme === selectedTheme);
  });
}

function renderDynamicSelects() {
  const paymentMethods = state.paymentMethods.length ? state.paymentMethods : defaultPaymentMethods;
  const locations = state.locations.length ? state.locations : defaultLocations;
  const paymentMethodOptions = ['<option value="">Selecionar</option>', ...paymentMethods.map((item) => `<option>${item}</option>`)].join("");
  document.querySelectorAll(".payment-method").forEach((select) => {
    const currentValue = select.value;
    select.innerHTML = paymentMethodOptions;
    if (paymentMethods.includes(currentValue)) {
      select.value = currentValue;
    }
    updateTransferPersonField(select);
  });

  const locationOptions = ['<option value="">Selecionar</option>', ...locations.map((item) => `<option>${item}</option>`)].join("");
  document.querySelectorAll(".location-select").forEach((select) => {
    const currentValue = select.value;
    select.innerHTML = locationOptions;
    if (locations.includes(currentValue)) {
      select.value = currentValue;
    }
  });

  const categorySelect = document.querySelector("#expenseCategory");
  if (categorySelect) {
    const currentValue = categorySelect.value;
    categorySelect.innerHTML = ['<option value="">Selecionar</option>', ...state.categories.map((item) => `<option>${item}</option>`)].join("");
    if (state.categories.includes(currentValue)) {
      categorySelect.value = currentValue;
    }
  }

  const operatorOptions = ['<option value="">Selecionar</option>', ...state.operators.map((item) => `<option>${item}</option>`)].join("");
  document.querySelectorAll(".operator-select").forEach((select) => {
    const currentValue = select.value;
    select.innerHTML = operatorOptions;
    if (state.operators.includes(currentValue)) {
      select.value = currentValue;
    }
  });
}

function getDashboardWeekRange(referenceDate = today) {
  const start = startOfWeek(referenceDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getWeekDateKeys(start, days = 8) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: toDateInputValue(date),
      label: `${formatShortDate(date)}`
    };
  });
}

function getKnownAttendanceGirls() {
  return [...new Set(state.income
    .filter((item) => (item.serviceType || inferServiceTypeFromDescription(item.description)) === "Atendimento")
    .map((item) => normalizeAttendantName(item.clientName))
    .filter((name) => {
      const normalized = normalizeText(name);
      return name && normalized !== "agencia" && normalized !== "nao identificado";
    }))]
    .sort((a, b) => a.localeCompare(b, "pt"));
}

function renderStatusCard(title, complete, okText, pendingText) {
  return `
    <article class="status-card ${complete ? "complete" : "pending"}">
      <strong>${title}</strong>
      <span>${complete ? "Completo" : "Pendente"}</span>
      <span>${complete ? okText : pendingText}</span>
    </article>
  `;
}

function renderWeeklyStatus(selectedStart, selectedEnd) {
  const container = document.querySelector("#weeklyStatusGrid");
  const range = document.querySelector("#weeklyStatusRange");
  if (!container || !range) {
    return;
  }

  const { start, end } = selectedStart && selectedEnd
    ? { start: selectedStart, end: selectedEnd }
    : getDashboardWeekRange();
  const weekIncome = state.income.filter((item) => inRange(item, start, end));
  const attendanceIncome = getIncomesByServiceType(weekIncome, "Atendimento");
  const onlineIncome = getIncomesByServiceType(weekIncome, "Online");
  const weekDays = getWeekDateKeys(start);
  const filledDays = new Set(weekIncome.map((item) => item.date));
  const missingDays = weekDays.filter((item) => !filledDays.has(item.key)).map((item) => item.label);
  const knownGirls = getKnownAttendanceGirls();
  const weekGirls = new Set(attendanceIncome.map((item) => normalizeAttendantName(item.clientName)));
  const missingGirls = knownGirls.filter((name) => !weekGirls.has(name));
  const onlineDays = new Set(onlineIncome.map((item) => item.date));
  const missingOnlineDays = weekDays.filter((item) => !onlineDays.has(item.key)).map((item) => item.label);

  range.textContent = `${formatShortDate(start)} - ${formatShortDate(end)}`;
  container.innerHTML = [
    renderStatusCard(
      "Dias preenchidos",
      missingDays.length === 0,
      "Todos os dias da semana possuem registros.",
      `Faltam: ${missingDays.join(", ") || "sem registros"}`
    ),
    renderStatusCard(
      "Atendimento por garota",
      knownGirls.length > 0 && missingGirls.length === 0,
      `${knownGirls.length} garotas registradas nesta semana.`,
      knownGirls.length ? `Faltam: ${missingGirls.join(", ") || "nenhuma"}` : "Sem garotas de atendimento no historico."
    ),
    renderStatusCard(
      "Chamada, foto ou video",
      missingOnlineDays.length === 0,
      "Online preenchido em todos os dias da semana.",
      `Faltam: ${missingOnlineDays.join(", ") || "sem registros"}`
    )
  ].join("");
}

function renderAdminPanel() {
  const categoryList = document.querySelector("#categoryList");
  const locationList = document.querySelector("#locationList");
  const operatorList = document.querySelector("#operatorList");
  const paymentMethodList = document.querySelector("#paymentMethodList");
  if (!categoryList || !locationList || !operatorList || !paymentMethodList) {
    return;
  }

  categoryList.innerHTML = state.categories.map((category) => `
    <div class="admin-item">
      <strong>${category}</strong>
      <button class="icon-button" type="button" data-remove-category="${category}">Remover</button>
    </div>
  `).join("");

  locationList.innerHTML = state.locations.map((location) => `
    <div class="admin-item">
      <strong>${location}</strong>
      <button class="icon-button" type="button" data-remove-location="${location}">Remover</button>
    </div>
  `).join("");

  operatorList.innerHTML = state.operators.map((operator) => `
    <div class="admin-item">
      <strong>${operator}</strong>
      <button class="icon-button" type="button" data-remove-operator="${operator}">Remover</button>
    </div>
  `).join("");

  paymentMethodList.innerHTML = state.paymentMethods.map((method) => `
    <div class="admin-item">
      <strong>${method}</strong>
      <button class="icon-button" type="button" data-remove-payment-method="${method}">Remover</button>
    </div>
  `).join("");
}

function renderCities(incomes, expenses) {
  const cities = new Map();

  [...incomes, ...expenses].forEach((item) => {
    const key = item.city.trim();
    if (!cities.has(key)) {
      cities.set(key, { income: 0, expense: 0 });
    }
    const target = cities.get(key);
    if (state.income.includes(item)) {
      target.income += Number(item.amount);
    } else {
      target.expense += Number(item.amount);
    }
  });

  const rows = [...cities.entries()]
    .sort((a, b) => b[1].income - b[1].expense - (a[1].income - a[1].expense))
    .map(([city, values]) => {
      const balance = values.income - values.expense;
      return `
        <article class="city-row">
          <header>
            <strong>${city}</strong>
            <b>${currency.format(balance)}</b>
          </header>
          <div class="city-values">
            <span>Entradas <b>${currency.format(values.income)}</b></span>
            <span>Saidas <b>${currency.format(values.expense)}</b></span>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelector("#cityList").innerHTML = rows || "<p>Nenhum valor registrado neste periodo.</p>";
}

function renderRecentRows(incomes = state.income, expenses = state.expenses) {
  const allRows = [
    ...incomes.map((item) => ({ ...item, type: "Entrada", amountType: "income", recordType: "income" })),
    ...expenses.map((item) => ({ ...item, type: "Saida", amountType: "expense", recordType: "expense" }))
  ]
    .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  const pagination = paginateItems(allRows, recentCurrentPage);
  recentCurrentPage = pagination.page;
  const rows = pagination.pageItems.map((item) => {
    const method = item.transferPerson ? `${item.paymentMethod} - ${item.transferPerson}` : item.paymentMethod;
    return `
      <tr>
        <td><span class="type-pill ${item.amountType}">${item.type}</span></td>
        <td>${item.description}</td>
        <td>${item.city}</td>
        <td>${method}</td>
        <td>${dateFormatter.format(parseLocalDate(item.date))}</td>
        <td class="money-cell">${currency.format(item.amount)}</td>
        <td>
          <div class="table-actions">
            <button class="table-action-button" type="button" data-edit-type="${item.recordType}" data-edit-id="${item.id}">Editar</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  document.querySelector("#recentRows").innerHTML = rows || `<tr><td colspan="7">Nenhum movimento neste periodo.</td></tr>`;
  updatePagination("recent", allRows.length, pagination.pageStart, recentCurrentPage, pagination.totalPages);
}

function renderExpenseRecentRows() {
  const container = document.querySelector("#expenseRecentRows");
  if (!container) {
    return;
  }

  const allRows = state.expenses
    .map((item, index) => ({ ...item, listIndex: index }))
    .sort((a, b) => {
      const dateDiff = parseLocalDate(b.date) - parseLocalDate(a.date);
      return dateDiff || b.listIndex - a.listIndex;
    });
  const pagination = paginateItems(allRows, expenseCurrentPage);
  expenseCurrentPage = pagination.page;
  const rows = pagination.pageItems.map((item) => `
      <tr>
        <td>${item.description}</td>
        <td>${item.category || "-"}</td>
        <td>${item.city || "Geral"}</td>
        <td>${dateFormatter.format(parseLocalDate(item.date))}</td>
        <td class="money-cell">${currency.format(item.amount)}</td>
        <td>
          <div class="table-actions">
            <button class="table-action-button" type="button" data-edit-type="expense" data-edit-id="${item.id}">Editar</button>
          </div>
        </td>
      </tr>
    `)
    .join("");

  container.innerHTML = rows || `<tr><td colspan="6">Nenhuma despesa registrada.</td></tr>`;
  updatePagination("expense", allRows.length, pagination.pageStart, expenseCurrentPage, pagination.totalPages);
}

function setFilterOptions(selector, values, placeholder) {
  const select = document.querySelector(selector);
  if (!select) {
    return;
  }
  const currentValue = select.value;
  const cleanValues = [...new Set(values.filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), "pt"));
  select.innerHTML = [`<option value="">${placeholder}</option>`, ...cleanValues.map((value) => `<option>${value}</option>`)].join("");
  if (cleanValues.includes(currentValue)) {
    select.value = currentValue;
  }
}

function setPaymentFilterOptions() {
  const select = document.querySelector("#incomeFilterPayment");
  if (!select) {
    return;
  }
  const currentValue = select.value;
  const methods = [...new Set(state.income.map((item) => item.paymentMethod).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), "pt"));
  const hasEmptyMethod = state.income.some((item) => !item.paymentMethod);
  select.innerHTML = [
    '<option value="">Todos</option>',
    ...(hasEmptyMethod ? ['<option value="__empty__">Sem metodo</option>'] : []),
    ...methods.map((value) => `<option>${value}</option>`)
  ].join("");
  if (currentValue === "__empty__" && hasEmptyMethod) {
    select.value = currentValue;
  } else if (methods.includes(currentValue)) {
    select.value = currentValue;
  }
}

function getIncomeFilterValues() {
  return {
    girl: document.querySelector("#incomeFilterGirl")?.value || "",
    operator: document.querySelector("#incomeFilterOperator")?.value || "",
    city: document.querySelector("#incomeFilterCity")?.value || "",
    payment: document.querySelector("#incomeFilterPayment")?.value || "",
    mbWayPerson: document.querySelector("#incomeFilterMbWayPerson")?.value || ""
  };
}

function renderIncomeEntries() {
  const container = document.querySelector("#incomeRows");
  if (!container) {
    return;
  }

  setFilterOptions("#incomeFilterGirl", state.income.map((item) => normalizeAttendantName(item.clientName)), "Todas");
  setFilterOptions("#incomeFilterOperator", state.income.map((item) => item.operatorName), "Todos");
  setFilterOptions("#incomeFilterCity", state.income.map((item) => item.city), "Todas");
  setPaymentFilterOptions();

  const filters = getIncomeFilterValues();
  const filteredRows = state.income
    .filter((item) => !filters.girl || normalizeAttendantName(item.clientName) === filters.girl)
    .filter((item) => !filters.operator || item.operatorName === filters.operator)
    .filter((item) => !filters.city || item.city === filters.city)
    .filter((item) => {
      if (filters.payment === "__empty__") {
        return !item.paymentMethod;
      }
      return !filters.payment || item.paymentMethod === filters.payment;
    })
    .filter((item) => {
      if (!filters.mbWayPerson) {
        return true;
      }
      const isMbWay = normalizeText(item.paymentMethod).replace(/\s+/g, "") === "mbway";
      const hasPerson = Boolean(getResolvedPaymentPerson(item));
      if (filters.mbWayPerson === "missing") {
        return isMbWay && !hasPerson;
      }
      if (filters.mbWayPerson === "filled") {
        return isMbWay && hasPerson;
      }
      return true;
    })
    .map((item, index) => ({ ...item, listIndex: index }))
    .sort((a, b) => {
      const dateDiff = parseLocalDate(b.date) - parseLocalDate(a.date);
      return dateDiff || b.listIndex - a.listIndex;
    });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / INCOME_PAGE_SIZE));
  incomeCurrentPage = Math.min(Math.max(1, incomeCurrentPage), totalPages);
  const pageStart = (incomeCurrentPage - 1) * INCOME_PAGE_SIZE;
  const pageRows = filteredRows.slice(pageStart, pageStart + INCOME_PAGE_SIZE);

  container.innerHTML = pageRows.length
    ? pageRows.map((item) => {
      const method = item.transferPerson ? `${item.paymentMethod} - ${item.transferPerson}` : item.paymentMethod;
      return `
        <tr>
          <td>${normalizeAttendantName(item.clientName) || "-"}</td>
          <td>${item.operatorName || "-"}</td>
          <td>${item.city || "-"}</td>
          <td>${method || "Sem metodo"}</td>
          <td>${dateFormatter.format(parseLocalDate(item.date))}</td>
          <td class="money-cell">${currency.format(item.amount)}</td>
          <td>${item.description || "-"}</td>
          <td>
            <div class="table-actions">
              <button class="table-action-button" type="button" data-edit-type="income" data-edit-id="${item.id}">Editar</button>
            </div>
          </td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="8">Nenhuma entrada encontrada com estes filtros.</td></tr>`;

  const info = document.querySelector("#incomePaginationInfo");
  const previousButton = document.querySelector("#incomePrevPage");
  const nextButton = document.querySelector("#incomeNextPage");
  if (info && previousButton && nextButton) {
    const startLabel = filteredRows.length ? pageStart + 1 : 0;
    const endLabel = Math.min(pageStart + INCOME_PAGE_SIZE, filteredRows.length);
    info.textContent = `${startLabel}-${endLabel} de ${filteredRows.length} registros`;
    previousButton.disabled = incomeCurrentPage <= 1;
    nextButton.disabled = incomeCurrentPage >= totalPages;
  }
}

function renderCashFlowChart() {
  const canvas = document.querySelector("#cashFlowChart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 380 * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = 380;
  const months = getLastSixMonths();
  const data = months.map((month) => {
    const income = sum(state.income.filter((item) => monthKey(parseLocalDate(item.date)) === month.key));
    const expense = sum(state.expenses.filter((item) => monthKey(parseLocalDate(item.date)) === month.key));
    return { ...month, income, expense, balance: income - expense };
  });

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfb";
  ctx.fillRect(0, 0, width, height);

  const padding = { top: 30, right: 20, bottom: 54, left: 54 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(1000, ...data.map((item) => Math.max(item.income, item.expense)));

  ctx.strokeStyle = "#dfe8e3";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#66736d";
  ctx.font = "12px Segoe UI, Arial";

  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    const value = maxValue - (maxValue / 4) * i;
    ctx.fillText(currency.format(value).replace(",00", ""), 8, y + 4);
  }

  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(26, groupWidth / 4);

  data.forEach((item, index) => {
    const x = padding.left + index * groupWidth + groupWidth / 2;
    const incomeHeight = (item.income / maxValue) * chartHeight;
    const expenseHeight = (item.expense / maxValue) * chartHeight;
    const baseY = padding.top + chartHeight;

    ctx.fillStyle = getCssColor("--green");
    ctx.fillRect(x - barWidth - 3, baseY - incomeHeight, barWidth, incomeHeight);
    ctx.fillStyle = "#b8483f";
    ctx.fillRect(x + 3, baseY - expenseHeight, barWidth, expenseHeight);

    ctx.fillStyle = "#17211d";
    ctx.textAlign = "center";
    ctx.fillText(item.label, x, height - 25);
    ctx.fillStyle = item.balance >= 0 ? getCssColor("--green") : "#b8483f";
    ctx.fillText(currency.format(item.balance).replace(",00", ""), x, height - 8);
  });

  ctx.textAlign = "left";
  ctx.fillStyle = getCssColor("--green");
  ctx.fillRect(width - 190, 18, 12, 12);
  ctx.fillStyle = "#17211d";
  ctx.fillText("Entradas", width - 172, 28);
  ctx.fillStyle = "#b8483f";
  ctx.fillRect(width - 100, 18, 12, 12);
  ctx.fillStyle = "#17211d";
  ctx.fillText("Saidas", width - 82, 28);
}

function getWeekRange() {
  const weekStartInput = document.querySelector("#weekStart");
  const selectedDate = weekStartInput?.value ? parseLocalDate(weekStartInput.value) : today;
  const start = startOfWeek(selectedDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getMonthRange() {
  const input = document.querySelector("#monthStart");
  const value = input?.value || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [year, month] = value.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end, year, month };
}

function getPreviousMonthRange(year, month) {
  const start = new Date(year, month - 2, 1);
  const end = new Date(year, month - 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function getPreviousWeekRange(start) {
  const previousStart = new Date(start);
  previousStart.setDate(start.getDate() - 7);
  const previousEnd = new Date(previousStart);
  previousEnd.setDate(previousStart.getDate() + 7);
  previousEnd.setHours(23, 59, 59, 999);
  return { start: previousStart, end: previousEnd };
}

function getIncomeVariation(currentValue, previousValue) {
  if (!previousValue && currentValue > 0) {
    return { label: "Variacao de entradas", text: "Sem base anterior", className: "positive" };
  }
  if (!previousValue && !currentValue) {
    return { label: "Variacao de entradas", text: "0,0% vs. periodo anterior", className: "neutral" };
  }
  const percent = ((currentValue - previousValue) / previousValue) * 100;
  const sign = percent > 0 ? "+" : "";
  return {
    label: "Variacao de entradas",
    text: `${sign}${percent.toFixed(1).replace(".", ",")}% vs. periodo anterior`,
    className: percent >= 0 ? "positive" : "negative"
  };
}

function monthTitle(date) {
  return new Intl.DateTimeFormat("pt-PT", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function inRange(item, start, end) {
  const date = parseLocalDate(item.date);
  return date >= start && date <= end;
}

function renderWeeklyReport() {
  const { start, end } = getWeekRange();
  const previousWeek = getPreviousWeekRange(start);
  const weekIncomeAll = state.income.filter((item) => inRange(item, start, end));
  const weekExpensesAll = state.expenses.filter((item) => inRange(item, start, end));
  const previousWeekIncome = state.income.filter((item) => inRange(item, previousWeek.start, previousWeek.end));
  const weekRecords = [
    ...weekIncomeAll.map((item) => ({ ...item, recordType: "income" })),
    ...weekExpensesAll.map((item) => ({ ...item, recordType: "expense" }))
  ].sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

  if (!selectedWeeklyIds) {
    selectedWeeklyIds = new Set(weekRecords.map((item) => item.id));
  }

  const validIds = new Set(weekRecords.map((item) => item.id));
  selectedWeeklyIds = new Set([...selectedWeeklyIds].filter((id) => validIds.has(id)));

  const weekIncome = weekIncomeAll.filter((item) => selectedWeeklyIds.has(item.id));
  const weekExpenses = weekExpensesAll.filter((item) => selectedWeeklyIds.has(item.id));
  const incomeTotal = sum(weekIncome);
  const expenseTotal = sum(weekExpenses);
  const balance = incomeTotal - expenseTotal;
  const incomeVariation = getIncomeVariation(incomeTotal, sum(previousWeekIncome));
  const attendanceTotal = weekIncome.length;

  document.querySelector("#weeklySummary").innerHTML = `
    <div><span>Saldo semanal</span><strong>${currency.format(balance)}</strong></div>
    <div><span>Entradas semanal</span><strong>${currency.format(incomeTotal)}</strong></div>
    <div><span>Saidas semanal</span><strong>${currency.format(expenseTotal)}</strong></div>
    <div class="variation-card ${incomeVariation.className}"><span>${incomeVariation.label}</span><strong>${incomeVariation.text}</strong></div>
  `;

  renderWeeklyRecords(weekRecords);
  const dailyTotals = getDailyWeeklyTotals(start, weekIncome, weekExpenses);
  const paymentTotals = getPaymentMethodTotals(weekIncome, weekExpenses);
  const accountPaymentTotals = getAccountPaymentTotals(weekIncome);
  const mbWayAccountTotals = getMbWayAccountTotals(weekIncome);
  const presentialIncome = getIncomesByServiceType(weekIncome, "Atendimento");
  const onlineIncome = getIncomesByServiceType(weekIncome, "Online");
  const presentialTotals = getAttendantTotals(presentialIncome);
  const onlineTotals = getAttendantTotals(onlineIncome);
  const fineTotals = getFineTotals(weekIncome);
  const operatorCountTotals = getOperatorCountTotals(weekIncome);
  const locationTotals = getLocationTotals(weekIncome);
  const categoryTotals = getCategoryTotals(weekExpenses);
  renderPaymentBreakdown(paymentTotals);
  renderAttendantBreakdown("#presentialBreakdown", presentialTotals, "Sem presencial");
  renderAttendantBreakdown("#onlineBreakdown", onlineTotals, "Sem online");
  renderFineBreakdown("#fineBreakdown", fineTotals, "Sem multas");
  renderOperatorCountBreakdown("#operatorCountBreakdown", operatorCountTotals, "Sem operacionais");
  renderSimpleBreakdown("#locationBreakdown", locationTotals, "Sem localidade");
  renderCategoryBreakdown("#categoryBreakdown", categoryTotals, "Sem categoria");
  renderWeeklyChart(dailyTotals);

  document.querySelector("#weeklyReport").value = [
    "Acompanhamento de Atendimentos",
    "",
    `*RELATORIO SEMANAL - ${formatShortDate(start)} - ${formatShortDate(end)}*`,
    "",
    "💰 *Financeiro:*",
    `- Entradas: ${formatWhatsAppCurrency(incomeTotal)}`,
    `- Saidas: ${formatWhatsAppCurrency(expenseTotal)}`,
    `- Saldo Liquido: ${formatWhatsAppCurrency(balance)}`,
    `- ${incomeVariation.label}: ${incomeVariation.text}`,
    "",
    "📅 *Performance Diaria:*",
    ...dailyTotals.map((item) => `- ${item.label} (${formatShortDate(item.date)}): ${formatWhatsAppCurrency(item.balance)}`),
    "",
    "💳 *Metodos de Pagamento:*",
    ...paymentTotals.map((item) =>
      `- ${item.method}: Entradas ${formatWhatsAppMethodCurrency(item.method, item.income)} | Saidas ${formatWhatsAppMethodCurrency(item.method, item.expense)} | Saldo ${formatWhatsAppMethodCurrency(item.method, item.balance)}`
    ),
    "",
    "💶 *Detalhes de Valores por Conta:*",
    ...formatAccountPaymentLines(accountPaymentTotals),
    "",
    "📲 *Detalhes de Valores por MB WAY:*",
    ...formatMbWayAccountLines(mbWayAccountTotals),
    "",
    "🏢 *Presencial:*",
    ...presentialTotals.map((item) =>
      `- ${item.name}: ${formatWhatsAppCurrency(item.total)} (${item.count} atendimentos)`
    ),
    "",
    "🌐 *Online:*",
    ...onlineTotals.map((item) =>
      `- ${item.name}: ${formatWhatsAppCurrency(item.total)} (${item.count} atendimentos)`
    ),
    "",
    "🏢 *Multas:*",
    ...fineTotals.map((item) =>
      `- ${item.name}: ${formatWhatsAppCurrency(item.total)} (${item.reason})`
    ),
    "",
    "👥 *Operacionais:*",
    ...operatorCountTotals.map((item) =>
      `- ${item.name}: ${item.count} registros`
    ),
    "",
    "📍 *Localidades:*",
    ...locationTotals.map((item) =>
      `- ${item.name}: ${formatWhatsAppCurrency(item.total)} (${item.count} atendimentos)`
    ),
    "",
    "🧾 *Categorias de Despesa:*",
    ...categoryTotals.map((item) =>
      `- ${item.name}: ${formatWhatsAppCurrency(item.total)} (${item.count} despesas)`
    ),
    "",
    "📈 *Resumo:*",
    `- Total Atendimentos: ${attendanceTotal}`
  ].join("\n");
}

function getPaymentMethodTotals(incomes, expenses) {
  const methods = state.paymentMethods.length ? state.paymentMethods : defaultPaymentMethods;
  const totals = new Map(methods.map((method) => [method, { method, income: 0, expense: 0, balance: 0 }]));

  incomes.forEach((item) => {
    const method = totals.has(item.paymentMethod) ? item.paymentMethod : "Outros";
    if (!totals.has(method)) {
      totals.set(method, { method, income: 0, expense: 0, balance: 0 });
    }
    totals.get(method).income += Number(item.amount || 0);
  });

  expenses.forEach((item) => {
    const method = totals.has(item.paymentMethod) ? item.paymentMethod : "Outros";
    if (!totals.has(method)) {
      totals.set(method, { method, income: 0, expense: 0, balance: 0 });
    }
    totals.get(method).expense += Number(item.amount || 0);
  });

  return [...totals.values()].map((item) => ({
    ...item,
    balance: item.income - item.expense
  }));
}

function getAccountPaymentTotals(incomes) {
  const totals = new Map();
  incomes
    .filter((item) => paymentNeedsPerson(item.paymentMethod))
    .forEach((item) => {
      const method = item.paymentMethod || "Nao informado";
      const rawPerson = String(item.transferPerson || "").trim() || inferAccountPersonFromDescription(item.description, item.paymentMethod);
      const person = rawPerson ? normalizeAccountPersonName(rawPerson) : "Sem pessoa informada";
      const key = `${method}::${normalizeText(person).trim()}`;
      if (!totals.has(key)) {
        totals.set(key, { method, person, total: 0, count: 0, missingDetails: [] });
      }
      const target = totals.get(key);
      target.total += Number(item.amount || 0);
      target.count += 1;
      if (!rawPerson) {
        target.missingDetails.push(`${formatShortDate(parseLocalDate(item.date))} - ${formatWhatsAppCurrency(item.amount)} - ${item.description || "sem descricao"}`);
      }
    });
  return [...totals.values()].sort((a, b) =>
    a.method.localeCompare(b.method, "pt") ||
    b.total - a.total ||
    a.person.localeCompare(b.person, "pt")
  );
}

function getMbWayAccountTotals(incomes) {
  const totals = new Map();
  incomes
    .filter((item) => normalizeText(item.paymentMethod).replace(/\s+/g, "") === "mbway")
    .forEach((item) => {
      const rawPerson = String(item.transferPerson || "").trim() || inferAccountPersonFromDescription(item.description, item.paymentMethod);
      const person = rawPerson ? normalizeAccountPersonName(rawPerson) : "Sem pessoa informada";
      const accountNumber = getMbWayAccountNumber(item.description);
      const accountLabel = accountNumber ? `${person} MB WAY ${accountNumber}` : `${person} MB WAY`;
      const key = normalizeText(accountLabel).replace(/\s+/g, "");
      if (!totals.has(key)) {
        totals.set(key, { accountLabel, total: 0, count: 0 });
      }
      const target = totals.get(key);
      target.total += Number(item.amount || 0);
      target.count += 1;
    });
  return [...totals.values()].sort((a, b) =>
    b.total - a.total ||
    a.accountLabel.localeCompare(b.accountLabel, "pt")
  );
}

function formatAccountPaymentLines(totals) {
  if (!totals.length) {
    return ["- Sem valores por conta no periodo."];
  }
  return [
    "- Metodo | Pessoa/Conta | Valor | Registros",
    ...totals.flatMap((item) => [
      `- ${item.method} | ${item.person} | ${formatWhatsAppCurrency(item.total)} | ${item.count}`,
      ...item.missingDetails.map((detail) => `  > ${detail}`)
    ])
  ];
}

function formatMbWayAccountLines(totals) {
  if (!totals.length) {
    return ["- Sem valores MB WAY no periodo."];
  }
  return totals.map((item) =>
    `- ${item.accountLabel} - Total: ${formatWhatsAppCurrency(item.total)} - ${item.count} registros`
  );
}

function getResolvedPaymentPerson(item) {
  const rawPerson = String(item.transferPerson || "").trim() || inferAccountPersonFromDescription(item.description, item.paymentMethod);
  return rawPerson ? normalizeAccountPersonName(rawPerson) : "";
}

function normalizeAccountPersonName(name) {
  const cleanName = String(name || "").trim();
  const knownNames = [
    "Erica",
    "Erick",
    "Raul",
    "Gabriel",
    "Adriano",
    "Alexia",
    "Laura",
    "Duda",
    "Vitoria",
    "Gi",
    "Gih",
    "Kemy",
    "Larissa",
    "Isa",
    "Wise",
    "PayPal"
  ];
  const normalized = normalizeText(cleanName).trim();
  return knownNames.find((item) => normalizeText(item) === normalized) || cleanName.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function inferAccountPersonFromDescription(description, method) {
  const normalizedMethod = normalizeText(method).replace(/\s+/g, "");
  const normalizedDescription = normalizeText(description);
  if (normalizedMethod === "mbway") {
    const knownMbWayAccounts = {
      183: "Gabriel",
      306: "Adriano",
      431: "Raul",
      652: "Erica",
      896: "Erica",
      994: "Raul"
    };
    const accountNumber = getMbWayAccountNumber(description);
    if (accountNumber && knownMbWayAccounts[accountNumber]) {
      return knownMbWayAccounts[accountNumber];
    }
  }
  return "";
}

function getMbWayAccountNumber(description) {
  const normalized = normalizeText(description);
  const afterMethod = normalized.match(/\b(?:mbway|mb)\b\s*(?:[\p{L}]+\s*)?(\d{2,6})\b/u);
  return afterMethod ? afterMethod[1] : "";
}

function renderPaymentBreakdown(paymentTotals) {
  const container = document.querySelector("#paymentBreakdown");
  container.innerHTML = paymentTotals.map((item) => `
    <article class="payment-card">
      <strong>${item.method}</strong>
      <span>Entradas: ${currency.format(item.income)}</span>
      <span>Saidas: ${currency.format(item.expense)}</span>
      <span>Saldo: ${currency.format(item.balance)}</span>
    </article>
  `).join("");
}

function getAttendantTotals(incomes) {
  const totals = new Map();
  incomes.forEach((item) => {
    const name = normalizeAttendantName(item.clientName) || "Sem garota";
    if (!totals.has(name)) {
      totals.set(name, { name, total: 0, count: 0 });
    }
    const target = totals.get(name);
    target.total += Number(item.amount || 0);
    target.count += 1;
  });
  return [...totals.values()].sort((a, b) => b.total - a.total);
}

function getIncomesByServiceType(incomes, serviceType) {
  return incomes.filter((item) => (item.serviceType || inferServiceTypeFromDescription(item.description)) === serviceType);
}

function getLocationTotals(incomes) {
  const totals = new Map();
  incomes.forEach((item) => {
    const name = item.city || "Sem localidade";
    if (!totals.has(name)) {
      totals.set(name, { name, total: 0, count: 0 });
    }
    const target = totals.get(name);
    target.total += Number(item.amount || 0);
    target.count += 1;
  });
  return [...totals.values()].sort((a, b) => b.total - a.total);
}

function getCategoryTotals(expenses) {
  const totals = new Map();
  expenses.forEach((item) => {
    const name = item.category || "Sem categoria";
    if (!totals.has(name)) {
      totals.set(name, { name, total: 0, count: 0 });
    }
    const target = totals.get(name);
    target.total += Number(item.amount || 0);
    target.count += 1;
  });
  return [...totals.values()].sort((a, b) => b.total - a.total);
}

function isFineIncome(item) {
  return /\bmulta\b/i.test(normalizeText(item.description));
}

function getFineTarget(item) {
  const prefixMatch = String(item.description || "").match(/^\[Multa:\s*([^\]]+)\]/i);
  if (prefixMatch) {
    return normalizeAttendantName(prefixMatch[1].trim()) || "Agencia";
  }
  const clientName = normalizeAttendantName(item.clientName);
  if (normalizeText(clientName) !== "agencia") {
    return clientName || "Agencia";
  }
  return getFineTargetFromLine(item.description, "") || "Agencia";
}

function getFineReason(item) {
  const normalizedDescription = normalizeText(item.description);
  if (normalizedDescription.includes("perdeu cliente")) {
    return "perdeu cliente";
  }
  return "multa";
}

function getFineTotals(incomes) {
  const totals = new Map();
  incomes.filter(isFineIncome).forEach((item) => {
    const name = getFineTarget(item);
    const reason = getFineReason(item);
    const key = `${name}|${reason}`;
    if (!totals.has(key)) {
      totals.set(key, { name, reason, total: 0, count: 0 });
    }
    const target = totals.get(key);
    target.total += Number(item.amount || 0);
    target.count += 1;
  });
  return [...totals.values()].sort((a, b) => b.total - a.total);
}

function getOperatorCountTotals(incomes) {
  const totals = new Map();
  incomes.forEach((item) => {
    const name = item.operatorName || "Nao identificado";
    if (!totals.has(name)) {
      totals.set(name, { name, count: 0 });
    }
    totals.get(name).count += 1;
  });
  return [...totals.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt"));
}

function getServiceTypeTotals(incomes) {
  const totals = new Map([
    ["Atendimento", { name: "Atendimento por garota", total: 0, count: 0 }],
    ["Online", { name: "Online", total: 0, count: 0 }]
  ]);
  incomes.forEach((item) => {
    const key = item.serviceType || inferServiceTypeFromDescription(item.description);
    const target = totals.get(key) || totals.get("Atendimento");
    target.total += Number(item.amount || 0);
    target.count += 1;
  });
  return [...totals.values()];
}

function renderAttendantBreakdown(selector, attendantTotals, emptyTitle = "Sem registros") {
  const container = document.querySelector(selector);
  container.innerHTML = attendantTotals.length
    ? attendantTotals.map((item) => `
      <article class="payment-card">
        <strong>${item.name}</strong>
        <span>Valor: ${currency.format(item.total)}</span>
        <span>Atendimentos: ${item.count}</span>
      </article>
    `).join("")
    : `<article class="payment-card"><strong>${emptyTitle}</strong><span>Nenhuma entrada no periodo.</span></article>`;
}

function renderSimpleBreakdown(selector, items, emptyTitle = "Sem registros") {
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }
  container.innerHTML = items.length
    ? items.map((item) => `
      <article class="payment-card">
        <strong>${item.name}</strong>
        <span>Valor: ${currency.format(item.total)}</span>
        <span>Atendimentos: ${item.count}</span>
      </article>
    `).join("")
    : `<article class="payment-card"><strong>${emptyTitle}</strong><span>Nenhuma entrada no periodo.</span></article>`;
}

function renderCategoryBreakdown(selector, items, emptyTitle = "Sem categoria") {
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }
  container.innerHTML = items.length
    ? items.map((item) => `
      <article class="payment-card">
        <strong>${item.name}</strong>
        <span>Valor: ${currency.format(item.total)}</span>
        <span>Despesas: ${item.count}</span>
      </article>
    `).join("")
    : `<article class="payment-card"><strong>${emptyTitle}</strong><span>Nenhuma despesa no periodo.</span></article>`;
}

function renderFineBreakdown(selector, items, emptyTitle = "Sem multas") {
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }
  container.innerHTML = items.length
    ? items.map((item) => `
      <article class="payment-card">
        <strong>${item.name}</strong>
        <span>Valor: ${currency.format(item.total)}</span>
        <span>Motivo: ${item.reason}</span>
      </article>
    `).join("")
    : `<article class="payment-card"><strong>${emptyTitle}</strong><span>Nenhuma multa no periodo.</span></article>`;
}

function renderOperatorCountBreakdown(selector, items, emptyTitle = "Sem operacionais") {
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }
  container.innerHTML = items.length
    ? items.map((item) => `
      <article class="payment-card">
        <strong>${item.name}</strong>
        <span>Registros: ${item.count}</span>
      </article>
    `).join("")
    : `<article class="payment-card"><strong>${emptyTitle}</strong><span>Nenhum registro no periodo.</span></article>`;
}

function renderMonthlyReport() {
  const { start, end, year, month } = getMonthRange();
  const previous = getPreviousMonthRange(year, month);
  const monthIncome = state.income.filter((item) => inRange(item, start, end));
  const monthExpenses = state.expenses.filter((item) => inRange(item, start, end));
  const previousIncome = state.income.filter((item) => inRange(item, previous.start, previous.end));
  const previousExpenses = state.expenses.filter((item) => inRange(item, previous.start, previous.end));
  const incomeTotal = sum(monthIncome);
  const expenseTotal = sum(monthExpenses);
  const balance = incomeTotal - expenseTotal;
  const previousBalance = sum(previousIncome) - sum(previousExpenses);
  const balanceDifference = balance - previousBalance;
  const positiveDifference = Math.max(0, balance) - Math.max(0, previousBalance);
  const incomeVariation = getIncomeVariation(incomeTotal, sum(previousIncome));
  const attendanceTotal = monthIncome.length;
  const paymentTotals = getPaymentMethodTotals(monthIncome, monthExpenses);
  const accountPaymentTotals = getAccountPaymentTotals(monthIncome);
  const mbWayAccountTotals = getMbWayAccountTotals(monthIncome);
  const presentialIncome = getIncomesByServiceType(monthIncome, "Atendimento");
  const onlineIncome = getIncomesByServiceType(monthIncome, "Online");
  const presentialTotals = getAttendantTotals(presentialIncome);
  const onlineTotals = getAttendantTotals(onlineIncome);
  const fineTotals = getFineTotals(monthIncome);
  const operatorCountTotals = getOperatorCountTotals(monthIncome);
  const locationTotals = getLocationTotals(monthIncome);
  const categoryTotals = getCategoryTotals(monthExpenses);
  const monthRecords = [
    ...monthIncome.map((item) => ({ ...item, type: "Entrada", amountType: "income", recordType: "income", detail: normalizeAttendantName(item.clientName) })),
    ...monthExpenses.map((item) => ({ ...item, type: "Saida", amountType: "expense", recordType: "expense", detail: item.category }))
  ].sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

  document.querySelector("#monthlyReportSummary").innerHTML = `
    <div><span>Saldo mensal</span><strong>${currency.format(balance)}</strong></div>
    <div><span>Entradas mensal</span><strong>${currency.format(incomeTotal)}</strong></div>
    <div><span>Saidas mensal</span><strong>${currency.format(expenseTotal)}</strong></div>
    <div class="variation-card ${incomeVariation.className}"><span>${incomeVariation.label}</span><strong>${incomeVariation.text}</strong></div>
  `;

  document.querySelector("#monthlyComparison").innerHTML = `
    <article class="payment-card">
      <strong>${currency.format(previousBalance)}</strong>
      <span>Saldo do mes anterior</span>
    </article>
    <article class="payment-card">
      <strong>${currency.format(balanceDifference)}</strong>
      <span>Diferenca total de saldo</span>
    </article>
    <article class="payment-card">
      <strong>${currency.format(positiveDifference)}</strong>
      <span>Diferenca do saldo positivo</span>
    </article>
  `;

  document.querySelector("#monthlyPaymentBreakdown").innerHTML = paymentTotals.map((item) => `
    <article class="payment-card">
      <strong>${item.method}</strong>
      <span>Entradas: ${currency.format(item.income)}</span>
      <span>Saidas: ${currency.format(item.expense)}</span>
      <span>Saldo: ${currency.format(item.balance)}</span>
    </article>
  `).join("");
  renderAttendantBreakdown("#monthlyPresentialBreakdown", presentialTotals, "Sem presencial");
  renderAttendantBreakdown("#monthlyOnlineBreakdown", onlineTotals, "Sem online");
  renderFineBreakdown("#monthlyFineBreakdown", fineTotals, "Sem multas");
  renderOperatorCountBreakdown("#monthlyOperatorCountBreakdown", operatorCountTotals, "Sem operacionais");
  renderSimpleBreakdown("#monthlyLocationBreakdown", locationTotals, "Sem localidade");
  renderCategoryBreakdown("#monthlyCategoryBreakdown", categoryTotals, "Sem categoria");

  const monthlyPagination = paginateItems(monthRecords, monthlyCurrentPage);
  monthlyCurrentPage = monthlyPagination.page;
  document.querySelector("#monthlyRows").innerHTML = monthlyPagination.pageItems.length
    ? monthlyPagination.pageItems.map((item) => {
      const method = item.transferPerson ? `${item.paymentMethod} - ${item.transferPerson}` : item.paymentMethod;
      return `
        <tr>
          <td><span class="type-pill ${item.amountType}">${item.type}</span></td>
          <td>${item.description}</td>
          <td>${item.detail || "-"}</td>
          <td>${item.city}</td>
          <td>${method}</td>
          <td>${dateFormatter.format(parseLocalDate(item.date))}</td>
          <td class="money-cell">${currency.format(item.amount)}</td>
          <td>
            <div class="table-actions">
              <button class="table-action-button" type="button" data-edit-type="${item.recordType}" data-edit-id="${item.id}">Editar</button>
            </div>
          </td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="8">Nenhum movimento encontrado neste mes.</td></tr>`;
  updatePagination("monthly", monthRecords.length, monthlyPagination.pageStart, monthlyCurrentPage, monthlyPagination.totalPages);

  document.querySelector("#monthlyReport").value = [
    "Acompanhamento de Atendimentos",
    "",
    `*RELATORIO MENSAL - ${monthTitle(start).toUpperCase()}*`,
    "",
    "💰 *Financeiro acumulado:*",
    `- Entradas: ${formatWhatsAppCurrency(incomeTotal)}`,
    `- Saidas: ${formatWhatsAppCurrency(expenseTotal)}`,
    `- Saldo Liquido: ${formatWhatsAppCurrency(balance)}`,
    `- ${incomeVariation.label}: ${incomeVariation.text}`,
    "",
    "📈 *Comparativo com mes anterior:*",
    `- Saldo mes anterior: ${formatWhatsAppCurrency(previousBalance)}`,
    `- Diferenca total de saldo: ${formatWhatsAppCurrency(balanceDifference)}`,
    `- Diferenca do saldo positivo: ${formatWhatsAppCurrency(positiveDifference)}`,
    "",
    "💳 *Metodos de Pagamento:*",
    ...paymentTotals.map((item) =>
      `- ${item.method}: Entradas ${formatWhatsAppMethodCurrency(item.method, item.income)} | Saidas ${formatWhatsAppMethodCurrency(item.method, item.expense)} | Saldo ${formatWhatsAppMethodCurrency(item.method, item.balance)}`
    ),
    "",
    "💶 *Detalhes de Valores por Conta:*",
    ...formatAccountPaymentLines(accountPaymentTotals),
    "",
    "📲 *Detalhes de Valores por MB WAY:*",
    ...formatMbWayAccountLines(mbWayAccountTotals),
    "",
    "🏢 *Presencial:*",
    ...presentialTotals.map((item) =>
      `- ${item.name}: ${formatWhatsAppCurrency(item.total)} (${item.count} atendimentos)`
    ),
    "",
    "🌐 *Online:*",
    ...onlineTotals.map((item) =>
      `- ${item.name}: ${formatWhatsAppCurrency(item.total)} (${item.count} atendimentos)`
    ),
    "",
    "🏢 *Multas:*",
    ...fineTotals.map((item) =>
      `- ${item.name}: ${formatWhatsAppCurrency(item.total)} (${item.reason})`
    ),
    "",
    "👥 *Operacionais:*",
    ...operatorCountTotals.map((item) =>
      `- ${item.name}: ${item.count} registros`
    ),
    "",
    "📍 *Localidades:*",
    ...locationTotals.map((item) =>
      `- ${item.name}: ${formatWhatsAppCurrency(item.total)} (${item.count} atendimentos)`
    ),
    "",
    "🧾 *Categorias de Despesa:*",
    ...categoryTotals.map((item) =>
      `- ${item.name}: ${formatWhatsAppCurrency(item.total)} (${item.count} despesas)`
    ),
    "",
    "📌 *Resumo:*",
    `- Total Atendimentos: ${attendanceTotal}`
  ].join("\n");
}

function csvCell(value) {
  const text = String(value - "");
  return `"${text.replaceAll('"', '""')}"`;
}

function csvNumber(value) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getMonthlyIncomeDetailTotals(incomes) {
  const totals = new Map();
  incomes.forEach((item) => {
    const method = item.paymentMethod || "Nao informado";
    const person = paymentNeedsPerson(method) ? item.transferPerson || "-" : "";
    const detail = {
      girl: normalizeAttendantName(item.clientName) || "Sem garota",
      city: item.city || "Sem localidade",
      method,
      person,
      operator: item.operatorName || "Nao identificado"
    };
    const key = JSON.stringify(detail);
    if (!totals.has(key)) {
      totals.set(key, { ...detail, total: 0, count: 0 });
    }
    const target = totals.get(key);
    target.total += Number(item.amount || 0);
    target.count += 1;
  });
  return [...totals.values()].sort((a, b) =>
    a.girl.localeCompare(b.girl, "pt") ||
    a.city.localeCompare(b.city, "pt") ||
    a.method.localeCompare(b.method, "pt") ||
    a.operator.localeCompare(b.operator, "pt")
  );
}

function exportMonthlyCsv() {
  const { start, end, year, month } = getMonthRange();
  const monthIncome = state.income.filter((item) => inRange(item, start, end));
  const monthExpenses = state.expenses.filter((item) => inRange(item, start, end));
  const incomeTotal = sum(monthIncome);
  const expenseTotal = sum(monthExpenses);
  const balance = incomeTotal - expenseTotal;
  const attendanceCount = getIncomesByServiceType(monthIncome, "Atendimento").length;
  const onlineCount = getIncomesByServiceType(monthIncome, "Online").length;
  const incomeDetailTotals = getMonthlyIncomeDetailTotals(monthIncome);
  const categoryTotals = getCategoryTotals(monthExpenses);

  const rows = [
    [`RELATORIO MENSAL - ${monthTitle(start).toUpperCase()}`],
    [],
    ["Resumo"],
    ["Total entradas", "Total saidas", "Saldo do mes", "Atendimentos", "Chamadas/Foto/Video"],
    [csvNumber(incomeTotal), csvNumber(expenseTotal), csvNumber(balance), attendanceCount, onlineCount],
    [],
    ["Entradas por detalhe"],
    ["Garota", "Localidade", "Metodo de pagamento", "Pessoa MB WAY/IBAN/Transferencia", "Operacional", "Total", "Quantidade"],
    ...incomeDetailTotals.map((item) => [
      item.girl,
      item.city,
      item.method,
      item.person,
      item.operator,
      csvNumber(item.total),
      item.count
    ]),
    [],
    ["Despesas por categoria"],
    ["Categoria", "Total", "Quantidade"],
    ...categoryTotals.map((item) => [item.name, csvNumber(item.total), item.count])
  ];

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\n")}`;
  downloadTextFile(`relatorio-mensal-${year}-${String(month).padStart(2, "0")}.csv`, csv, "text/csv;charset=utf-8");
  showToast("CSV mensal exportado.");
}

function renderWeeklyRecords(records) {
  const container = document.querySelector("#weeklyRecords");
  if (!records.length) {
    container.innerHTML = "<p>Nenhum registro encontrado para esta semana.</p>";
    updatePagination("weekly", 0, 0, 1, 1);
    return;
  }

  const pagination = paginateItems(records, weeklyCurrentPage);
  weeklyCurrentPage = pagination.page;
  container.innerHTML = pagination.pageItems.map((item) => {
    const isIncome = item.recordType === "income";
    const title = isIncome ? item.clientName : item.description;
    const method = item.transferPerson ? `${item.paymentMethod} - ${item.transferPerson}` : item.paymentMethod;
    const meta = isIncome
      ? `Entrada â€¢ ${item.city} â€¢ ${method}`
      : `Saida â€¢ ${item.category} â€¢ ${item.city} â€¢ ${method}`;
    return `
      <label class="record-check">
        <input type="checkbox" data-weekly-record="${item.id}" ${selectedWeeklyIds.has(item.id) ? "checked" : ""} />
        <span>
          <strong>${dateFormatter.format(parseLocalDate(item.date))} Â· ${title} Â· ${currency.format(item.amount)}</strong>
          <span>${meta}</span>
          <span class="record-inline-actions">
            <button class="table-action-button record-edit-button" type="button" data-edit-type="${item.recordType}" data-edit-id="${item.id}">Editar data e valor</button>
          </span>
        </span>
      </label>
    `;
  }).join("");
  updatePagination("weekly", records.length, pagination.pageStart, weeklyCurrentPage, pagination.totalPages);
}

function getDailyWeeklyTotals(start, incomes, expenses) {
  const dayNames = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];
  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = toDateInputValue(date);
    const income = sum(incomes.filter((item) => item.date === key));
    const expense = sum(expenses.filter((item) => item.date === key));
    return {
      date,
      label: dayNames[index],
      income,
      expense,
      balance: income - expense
    };
  });
}

function renderWeeklyChart(data) {
  const canvas = document.querySelector("#weeklyChart");
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 340 * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = 340;
  const padding = { top: 28, right: 16, bottom: 58, left: 54 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxAbs = Math.max(100, ...data.map((item) => Math.abs(item.balance)));
  const zeroY = padding.top + chartHeight / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfb";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#dfe8e3";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#8fa29a";
  ctx.beginPath();
  ctx.moveTo(padding.left, zeroY);
  ctx.lineTo(width - padding.right, zeroY);
  ctx.stroke();

  const slotWidth = chartWidth / data.length;
  const barWidth = Math.min(34, slotWidth * 0.5);
  ctx.font = "12px Segoe UI, Arial";
  ctx.textAlign = "center";

  data.forEach((item, index) => {
    const x = padding.left + index * slotWidth + slotWidth / 2;
    const barHeight = (Math.abs(item.balance) / maxAbs) * (chartHeight / 2 - 14);
    const y = item.balance >= 0 ? zeroY - barHeight : zeroY;

    ctx.fillStyle = item.balance >= 0 ? getCssColor("--green") : "#b8483f";
    ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);

    ctx.fillStyle = "#17211d";
    ctx.fillText(item.label.slice(0, 3), x, height - 34);
    ctx.fillStyle = "#66736d";
    ctx.fillText(formatShortDate(item.date), x, height - 16);
  });

  ctx.textAlign = "left";
  ctx.fillStyle = "#66736d";
  ctx.fillText(`Topo: ${formatWhatsAppCurrency(maxAbs)}`, 10, padding.top + 4);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 8000);
}

async function getJuneApiDiagnostic() {
  try {
    const rows = await supabaseRequest("entradas?select=id,amount&entry_date=gte.2026-06-01&entry_date=lte.2026-06-30");
    const total = sum(rows.map((row) => ({ amount: row.amount })));
    return `API junho: ${rows.length} registros / ${currency.format(total)}`;
  } catch (error) {
    console.error("Falha no diagnostico de junho.", error);
    return "API junho: erro ao consultar";
  }
}

function isAuthenticated() {
  return Boolean(getAuthSession()?.access_token);
}

function getAuthSession() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function getCurrentUserThemeKey() {
  const session = getAuthSession();
  const userKey = session?.user?.id || session?.user?.email || "local";
  return `${USER_THEME_KEY_PREFIX}:${userKey}`;
}

function getStoredUserTheme() {
  const theme = localStorage.getItem(getCurrentUserThemeKey());
  return availableThemes.includes(theme) ? theme : null;
}

function getActiveTheme() {
  return getStoredUserTheme() || state.theme || defaultTheme;
}

function saveUserTheme(theme) {
  if (!availableThemes.includes(theme)) {
    return;
  }
  localStorage.setItem(getCurrentUserThemeKey(), theme);
}

function setAuthenticated(session) {
  if (session?.access_token) {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    document.body.classList.add("authenticated");
  } else {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    document.body.classList.remove("authenticated");
  }
}

async function refreshApplication() {
  const button = document.querySelector("#refreshAppButton");
  if (button) {
    button.disabled = true;
    button.textContent = "Atualizando...";
  }
  await loadRemoteState();
  renderDashboard();
  if (button) {
    button.disabled = false;
    button.textContent = "Atualizar";
  }
  const diagnostic = isSupabaseConfigured() ? await getJuneApiDiagnostic() : "Supabase nao configurado";
  showToast(`${state.income.length} entradas carregadas. ${diagnostic}`);
}

async function verifyAuthSession() {
  if (!isSupabaseConfigured() || !isAuthenticated()) {
    setAuthenticated(null);
    return false;
  }
  try {
    await fetch(`${getSupabaseConfig().url}/auth/v1/user`, {
      headers: getSupabaseHeaders()
    }).then((response) => {
      if (!response.ok) {
        throw new Error("Sessao invalida");
      }
      return response.json();
    });
    document.body.classList.add("authenticated");
    return true;
  } catch {
    setAuthenticated(null);
    return false;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formToObject(form);
  if (!isSupabaseConfigured()) {
    showToast("Configure o Supabase antes de fazer login.");
    return;
  }
  try {
    const response = await fetch(`${getSupabaseConfig().url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: getSupabaseConfig().anonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: data.email.trim(),
        password: data.password
      })
    });
    if (!response.ok) {
      throw new Error("Login invalido");
    }
    const session = await response.json();
    setAuthenticated(session);
    form.reset();
    await loadRemoteState();
    renderDashboard();
    showToast("Login efetuado.");
  } catch {
    showToast("Email ou senha incorretos.");
    return;
  }
}

async function addUniqueItem(listName, value) {
  const cleanValue = value.trim();
  if (!cleanValue) {
    return false;
  }
  const alreadyExists = state[listName].some((item) => item.toLowerCase() === cleanValue.toLowerCase());
  if (alreadyExists) {
    return false;
  }
  state[listName].push(cleanValue);
  state[listName].sort((a, b) => a.localeCompare(b, "pt"));
  const saved = await saveState(listName);
  renderDashboard();
  return saved ? "saved" : "local";
}

async function removeItem(listName, value) {
  state[listName] = state[listName].filter((item) => item !== value);
  await saveState(listName);
  renderDashboard();
}

async function editMovementDateAndAmount(type, id) {
  const listName = type === "income" ? "income" : "expenses";
  const item = state[listName].find((record) => record.id === id);
  if (!item) {
    showToast("Movimento nao encontrado.");
    return;
  }

  if (type === "income") {
    const newClientName = window.prompt("Nome da garota:", normalizeAttendantName(item.clientName) || "");
    if (newClientName === null) return;
    if (!newClientName.trim()) {
      showToast("Nome da garota invalido.");
      return;
    }

    const newOperatorName = window.prompt("Nome do operacional:", item.operatorName || "");
    if (newOperatorName === null) return;
    if (!newOperatorName.trim()) {
      showToast("Nome do operacional invalido.");
      return;
    }

    const newPaymentMethod = window.prompt("Metodo de pagamento:", item.paymentMethod || "");
    if (newPaymentMethod === null) return;
    if (!newPaymentMethod.trim()) {
      showToast("Metodo de pagamento invalido.");
      return;
    }

    let newTransferPerson = "";
    if (paymentNeedsPerson(newPaymentMethod)) {
      newTransferPerson = window.prompt("Pessoa/conta associada:", item.transferPerson || "");
      if (newTransferPerson === null) return;
    }

    const newCity = window.prompt("Localidade:", item.city || "");
    if (newCity === null) return;
    if (!newCity.trim()) {
      showToast("Localidade invalida.");
      return;
    }

    const newDescription = window.prompt("Descricao:", item.description || "");
    if (newDescription === null) return;
    if (!newDescription.trim()) {
      showToast("Descricao invalida.");
      return;
    }

    item.clientName = normalizeAttendantName(newClientName.trim());
    item.operatorName = newOperatorName.trim();
    item.paymentMethod = newPaymentMethod.trim();
    item.transferPerson = paymentNeedsPerson(item.paymentMethod) ? normalizeAccountPersonName(newTransferPerson.trim()) : "";
    item.city = newCity.trim();
    item.description = newDescription.trim();
    addMissingListValues("operators", [item.operatorName]);
    addMissingListValues("paymentMethods", [item.paymentMethod]);
    addMissingListValues("locations", [item.city]);
  }

  if (type === "expense") {
    const newDescription = window.prompt("Descricao da despesa:", item.description || "");
    if (newDescription === null) return;

    const newCategory = window.prompt("Categoria:", item.category || "");
    if (newCategory === null) return;
    if (!newCategory.trim()) {
      showToast("Categoria invalida.");
      return;
    }

    const newCity = window.prompt("Localidade associada (opcional):", item.city || "Geral");
    if (newCity === null) return;

    item.description = newDescription.trim();
    item.category = newCategory.trim();
    item.city = newCity.trim() || "Geral";
    item.paymentMethod = item.paymentMethod || "Nao informado";
    item.transferPerson = "";
    addMissingListValues("categories", [item.category]);
    if (item.city !== "Geral") {
      addMissingListValues("locations", [item.city]);
    }
  }

  const newDate = window.prompt("Nova data do movimento (AAAA-MM-DD):", item.date);
  if (newDate === null) {
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || Number.isNaN(parseLocalDate(newDate).getTime())) {
    showToast("Data invalida. Use o formato AAAA-MM-DD.");
    return;
  }

  const newAmountText = window.prompt("Novo valor em euro:", String(item.amount).replace(".", ","));
  if (newAmountText === null) {
    return;
  }
  const newAmount = Number(newAmountText.replace(",", "."));
  if (!Number.isFinite(newAmount) || newAmount < 0) {
    showToast("Valor invalido.");
    return;
  }

  item.date = newDate;
  item.amount = newAmount;
  await saveState(listName);
  selectedWeeklyIds = null;
  renderDashboard();
  showToast("Movimento atualizado.");
}

async function deleteMovement(type, id) {
  showToast("Apagar movimentos foi desativado por seguranca. Use backup/SQL revisado para remover dados.");
}

function addMissingListValues(listName, values) {
  values
    .filter(Boolean)
    .forEach((value) => {
      const exists = state[listName].some((item) => item.toLowerCase() === value.toLowerCase());
      if (!exists) {
        state[listName].push(value);
      }
    });
  state[listName].sort((a, b) => a.localeCompare(b, "pt"));
}

function getLastImportIds() {
  try {
    const value = JSON.parse(localStorage.getItem(LAST_IMPORT_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function setLastImportIds(ids) {
  localStorage.setItem(LAST_IMPORT_KEY, JSON.stringify(ids));
  updateUndoImportButton();
}

function updateUndoImportButton() {
  const button = document.querySelector("#undoLastImport");
  if (!button) {
    return;
  }
  button.disabled = true;
  button.title = "Desativado por seguranca para evitar remocao acidental de entradas.";
}

function formatDateDash(value) {
  const date = parseLocalDate(value);
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear()
  ].join("-");
}

function isAttendanceIncome(item) {
  return (item.serviceType || inferServiceTypeFromDescription(item.description)) === "Atendimento";
}

function getIncomeServiceType(item) {
  return item.serviceType || inferServiceTypeFromDescription(item.description);
}

function getComparableText(value) {
  return normalizeText(value).replace(/\s+/g, " ").trim();
}

function getImportDuplicateWarning(item) {
  const itemServiceType = getIncomeServiceType(item);
  const itemGirl = getComparableText(normalizeAttendantName(item.clientName));
  const exists = state.income.some((income) => {
    if (income.date !== item.date || getIncomeServiceType(income) !== itemServiceType) {
      return false;
    }

    const incomeGirl = getComparableText(normalizeAttendantName(income.clientName));
    if (incomeGirl !== itemGirl) {
      return false;
    }

    if (itemServiceType === "Atendimento") {
      return true;
    }

    return Number(income.amount || 0) === Number(item.amount || 0) &&
      getComparableText(income.paymentMethod) === getComparableText(item.paymentMethod) &&
      getComparableText(income.transferPerson) === getComparableText(item.transferPerson) &&
      getComparableText(income.description) === getComparableText(item.description);
  });

  if (!exists) {
    return "";
  }

  return itemServiceType === "Atendimento"
    ? `Ja existe registro para essa garota na data ${formatDateDash(item.date)}.`
    : `Ja existe registro online semelhante para essa garota na data ${formatDateDash(item.date)}.`;
}

async function saveSelectedImportRows() {
  let selectedRows = importPreviewRecords.filter((item) => item.selected && !item.importOnly);
  if (!selectedRows.length) {
    showToast("Nenhum movimento selecionado.");
    return;
  }

  if (isSupabaseConfigured()) {
    await loadRemoteState();
    selectedRows = selectedRows.map((item) => ({
      ...item,
      warning: getImportDuplicateWarning(item)
    }));
  }

  const warnings = selectedRows.map((item) => item.warning).filter(Boolean);
  if (warnings.length && !window.confirm(`${warnings[0]}\nDeseja guardar mesmo assim?`)) {
    return;
  }
  const rowsToSave = selectedRows.map(({ selected, importOnly, currencyCode, warning, ...item }) => item);
  const incomeSaved = isSupabaseConfigured()
    ? await insertRowsSafely("entradas", rowsToSave.map(incomeToRow))
    : false;

  if (isSupabaseConfigured() && !incomeSaved) {
    showToast("Erro ao gravar entradas no Supabase. Nada foi guardado.");
    return;
  }
  if (isSupabaseConfigured() && !await verifyRowsVisible("entradas", rowsToSave.map((item) => item.id))) {
    showToast("Supabase gravou, mas a API nao devolveu os registros. Verifique as politicas RLS.");
    return;
  }

  state.income.push(...rowsToSave);
  addMissingListValues("operators", selectedRows.map((item) => item.operatorName).filter((name) => name !== "Nao identificado"));
  addMissingListValues("paymentMethods", selectedRows.map((item) => item.paymentMethod));
  addMissingListValues("locations", selectedRows.map((item) => item.city));

  const localIncomeSaved = isSupabaseConfigured() ? true : await saveState("income");
  const operatorsSaved = await saveState("operators");
  const paymentMethodsSaved = await saveState("paymentMethods");
  const locationsSaved = await saveState("locations");
  const allSaved = localIncomeSaved && operatorsSaved && paymentMethodsSaved && locationsSaved;
  setLastImportIds(selectedRows.map((item) => item.id));
  importPreviewRecords = [];
  importCurrentPage = 1;
  document.querySelector("#whatsappImportText").value = "";
  selectedWeeklyIds = null;
  renderDashboard();
  showToast(allSaved
    ? `${selectedRows.length} registros guardados no Supabase.`
    : "Importacao guardada apenas neste navegador.");
}

async function undoLastImport() {
  showToast("Desfazer importacao foi desativado por seguranca. Remocoes agora devem ser feitas por SQL revisado.");
}

function getAdminSaveMessage(result, label) {
  if (result === "saved") {
    return `${label}: gravado no Supabase.`;
  }
  if (result === "local") {
    return `${label}: gravado apenas neste navegador. Verifique a tabela no Supabase.`;
  }
  return `${label} ja existe.`;
}

function paymentNeedsPerson(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
  return normalized && normalized !== "dinheiro";
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseWhatsappDate(value) {
  const match = value.trim().match(/^(?:dia\s*)?(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?$/i);
  if (!match) {
    return null;
  }
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const parsedYear = match[3]
    ? Number(match[3].length === 2 ? `20${match[3]}` : match[3])
    : currentYear;
  return `${parsedYear}-${month}-${day}`;
}

function stripListPrefix(value) {
  return value
    .replace(/^[\s\u2060]*\d+[\.\)]?\s*/u, "")
    .replace(/^\s*[-â€¢]\s*/u, "")
    .trim();
}

function getOperatorFromLine(line) {
  const found = operatorSymbolMap.find((item) => item.symbols.some((symbol) => line.includes(symbol)));
  if (found) {
    return found.name;
  }
  const codePoints = [...line].map((char) => char.codePointAt(0));
  if (codePoints.includes(0x1F608)) return "Erick";
  if (codePoints.includes(0x1F63B)) return "Xavier";
  if (codePoints.includes(0x1F333)) return "Tayane";
  if (codePoints.includes(0x2764) || codePoints.includes(0x2665)) return "Erica";
  if (codePoints.includes(0x2728)) return "Cachos";
  if (codePoints.includes(0x1F351)) return "Duda";
  if (codePoints.includes(0x1F499)) return "Ana";
  return "Nao identificado";
}

function getPaymentMethodFromLine(line) {
  const normalized = normalizeText(line);
  if (/\bpix\b/.test(normalized)) {
    return "Pix";
  }
  if (/\bpay\s*pal\b|\bpaypal\b|\bpay\s*p\b/.test(normalized)) {
    return "PayPal";
  }
  if (/\bwise\b/.test(normalized)) {
    return "Wise";
  }
  if (/\brevolut\b/.test(normalized)) {
    return "Revolut";
  }
  if (/\biban\b|\bibam\b|\bib\b/.test(normalized)) {
    return "IBAN";
  }
  if (/\bmbway\b|\bmb\b|\bmb(?=\p{L})/u.test(normalized)) {
    return "MB WAY";
  }
  if (/\bdin\b|\bdinh\b|\bdinheiro\b/.test(normalized)) {
    return "Dinheiro";
  }
  return "";
}

function getTransferPersonFromLine(line, method) {
  if (!paymentNeedsPerson(method)) {
    return "";
  }
  const withoutEmoji = line.replace(/[ðŸ˜ˆðŸ˜»ðŸŒ³â¤ï¸â™¥âœ¨ðŸ‘ðŸ’™]/gu, " ");
  const match = withoutEmoji.match(/\b(?:mbway|mb|iban|ibam|ib|revolut|wise|pay\s*pal|paypal|pay\s*p)\b\s*([\p{L}]+)/iu);
  return match ? match[1].trim() : "";
}

function getImportPersonFromLine(line, method) {
  if (!paymentNeedsPerson(method) && method !== "Pix") {
    return "";
  }
  const inferredPerson = inferAccountPersonFromDescription(line, method);
  if (inferredPerson) {
    return inferredPerson;
  }
  const withoutEmoji = line.replace(/[^\p{L}\p{N}\s]/gu, " ");
  const match = withoutEmoji.match(/\b(?:mbway|mb|iban|ibam|ib|revolut|wise|pay\s*pal|paypal|pay\s*p|pix)\b\s*([\p{L}]+)/iu);
  return match ? match[1].trim() : "";
}

function stripServiceTypePrefix(description = "") {
  const match = String(description).match(/^\[(Atendimento|Online)\]\s*(.*)$/i);
  if (!match) {
    return {
      description,
      serviceType: inferServiceTypeFromDescription(description)
    };
  }
  const serviceType = normalizeText(match[1]) === "online" ? "Online" : "Atendimento";
  return {
    description: match[2],
    serviceType
  };
}

function inferServiceTypeFromDescription(description = "") {
  return /\b(chamada|video|foto|gp)\b/i.test(normalizeText(description)) ? "Online" : "Atendimento";
}

function getAttendantFromLine(line, fallbackAttendant) {
  const withoutEmoji = line.replace(/[ðŸ˜ˆðŸ˜»ðŸŒ³â¤ï¸â™¥âœ¨ðŸ‘ðŸ’™]/gu, " ");
  const match = withoutEmoji.match(/\b(?:chamada|video|foto|gp)\s+([\p{L}]+)/iu);
  return normalizeAttendantName(match ? match[1].trim() : fallbackAttendant);
}

function normalizeAttendantName(name) {
  const cleanName = String(name || "").trim();
  const key = normalizeText(cleanName);
  if (key.replace(/\s+/g, "") === "agencia" || key.includes("ag") && key.includes("ncia")) {
    return "Agencia";
  }
  if (key.includes("vit") && key.includes("ria")) {
    return "Vitoria";
  }
  if (key === "iban" || key === "ibam" || key === "ib") {
    return "Agencia";
  }
  return attendantNameMap[key] || normalizeAccountPersonName(cleanName);
}

function getLocationForAttendant(attendant, fallbackCity) {
  const key = normalizeText(attendant).trim();
  return attendantLocationMap[key] || fallbackCity || "Nao identificado";
}

function getMainAmountFromLine(line) {
  const mainPart = line.split(/caixinha|caixa|\u{1F381}/iu)[0];
  const match = mainPart.match(/(?:US\$|USD|R\$|\$|\u20AC)?\s*(\d+(?:[,.]\d{1,2})?)\s*(?:USD|\$|\u20AC)?/iu);
  return match ? Number(match[1].replace(",", ".")) : null;
}

function isPixLine(line, paymentMethod) {
  return paymentMethod === "Pix" || /\bpix\b/i.test(normalizeText(line));
}

function isUsdLine(line) {
  return /(?:\bUSD\b|US\$|\$)/i.test(line) && !/R\$/i.test(line);
}

function formatImportAmount(item) {
  if (item.currencyCode === "BRL") {
    return brlCurrency.format(item.amount);
  }
  if (item.currencyCode === "USD") {
    return usdCurrency.format(item.amount);
  }
  return currency.format(item.amount);
}

function isFineLine(line) {
  return /\bmulta\b/i.test(normalizeText(line));
}

function getFineTargetFromLine(line, fallbackAttendant) {
  const normalizedLine = normalizeText(line);
  const candidates = [
    fallbackAttendant,
    ...Object.values(attendantNameMap),
    ...state.income.map((item) => item.clientName),
    ...importPreviewRecords.map((item) => item.clientName)
  ]
    .map(normalizeAttendantName)
    .filter((name) => name && normalizeText(name) !== "agencia");
  const found = candidates.find((name) => normalizedLine.includes(normalizeText(name)));
  return found || normalizeAttendantName(fallbackAttendant) || "Agencia";
}

function parseWhatsappImportText(text, attendant, city, importType = "attendance") {
  const records = [];
  let currentDate = toDateInputValue(today);

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.replace(/\u2060/g, "").trim();
    if (!line) {
      return;
    }
    const parsedDate = parseWhatsappDate(line);
    if (parsedDate) {
      currentDate = parsedDate;
      return;
    }
    if (line.startsWith("*")) {
      return;
    }

    const cleanedLine = stripListPrefix(line);
    const amount = getMainAmountFromLine(cleanedLine);
    if (!amount) {
      return;
    }

    const paymentMethod = getPaymentMethodFromLine(cleanedLine);
    const pixLine = isPixLine(cleanedLine, paymentMethod);
    const usdLine = isUsdLine(cleanedLine);
    const importOnlyLine = pixLine || usdLine;
    const fineLine = importType === "attendance" && isFineLine(cleanedLine);
    const fineTarget = fineLine ? getFineTargetFromLine(cleanedLine, attendant) : "";
    const operatorName = fineLine ? "Agencia" : getOperatorFromLine(cleanedLine);
    const lineAttendant = importType === "call" ? getAttendantFromLine(cleanedLine, "") : attendant;
    const serviceType = importType === "call" ? "Online" : "Atendimento";
    const finalAttendant = importType === "call" ? lineAttendant || "Agencia" : attendant || "Nao identificado";
    const finalCity = importType === "call" ? "Online" : city;
    const record = {
      id: createId(),
      selected: true,
      clientName: finalAttendant,
      operatorName,
      date: currentDate,
      paymentMethod,
      transferPerson: getImportPersonFromLine(cleanedLine, paymentMethod),
      city: finalCity,
      amount,
      currencyCode: pixLine ? "BRL" : usdLine ? "USD" : "EUR",
      importOnly: importOnlyLine,
      serviceType,
      description: fineLine ? `[Multa: ${fineTarget}] ${cleanedLine}` : cleanedLine
    };
    if (importOnlyLine) {
      record.selected = false;
      record.warning = pixLine
        ? "Pix em real: valor apenas para conferencia, nao sera salvo como entrada."
        : "Valor em dolar: apenas para conferencia, nao sera salvo como entrada.";
    }
    if (!importOnlyLine && !fineLine) {
      record.warning = getImportDuplicateWarning(record);
    }
    records.push(record);
  });

  return records;
}

function renderImportPreview() {
  const tbody = document.querySelector("#importPreviewRows");
  const saveButton = document.querySelector("#saveImportRows");
  const selectedCount = importPreviewRecords.filter((item) => item.selected && !item.importOnly).length;
  const brlOnlyCount = importPreviewRecords.filter((item) => item.currencyCode === "BRL").length;
  const usdOnlyCount = importPreviewRecords.filter((item) => item.currencyCode === "USD").length;
  const separatedCurrencyText = [
    brlOnlyCount ? `${brlOnlyCount} Pix em real apenas para conferencia.` : "",
    usdOnlyCount ? `${usdOnlyCount} valor em dolar apenas para conferencia.` : ""
  ].filter(Boolean).join(" ");
  document.querySelector("#importStatus").textContent = importPreviewRecords.length
    ? `${importPreviewRecords.length} movimentos detectados. ${selectedCount} selecionados para guardar.${separatedCurrencyText ? ` ${separatedCurrencyText}` : ""}`
    : "Nenhum movimento detectado.";
  saveButton.disabled = selectedCount === 0;

  const pagination = paginateItems(importPreviewRecords, importCurrentPage);
  importCurrentPage = pagination.page;
  tbody.innerHTML = pagination.pageItems.length
    ? pagination.pageItems.map((item, pageIndex) => {
      const index = pagination.pageStart + pageIndex;
      return `
      <tr>
        <td><input class="import-checkbox" type="checkbox" data-import-index="${index}" ${item.selected ? "checked" : ""} ${item.importOnly ? "disabled" : ""} /></td>
        <td>${item.date}</td>
        <td>${item.clientName || "-"}</td>
        <td>${item.city || "-"}</td>
        <td>${item.operatorName}</td>
        <td>${item.paymentMethod || "-"}</td>
        <td>${item.transferPerson || "-"}</td>
        <td class="money-cell">${formatImportAmount(item)}</td>
        <td>${item.description}${item.warning ? `<span class="import-warning">${item.warning}</span>` : ""}</td>
      </tr>
    `;
    }).join("")
    : `<tr><td colspan="9">Cole o texto do WhatsApp e clique em processar.</td></tr>`;
  updatePagination("import", importPreviewRecords.length, pagination.pageStart, importCurrentPage, pagination.totalPages);
}

function updateTransferPersonField(select) {
  const form = select.closest("form");
  const wrapper = form.querySelector(".transfer-person");
  const input = wrapper.querySelector("input");
  const shouldShow = paymentNeedsPerson(select.value);
  wrapper.classList.toggle("hidden", !shouldShow);
  input.required = shouldShow;
  if (!shouldShow) {
    input.value = "";
  }
}

function getReportFileName(extension) {
  const { start, end } = getWeekRange();
  return `relatorio-semanal-${formatShortDate(start).replace("/", "-")}-${formatShortDate(end).replace("/", "-")}.${extension}`;
}

function getReportText() {
  return document.querySelector("#weeklyReport").value;
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line) {
    lines.push(line);
  }
  return lines;
}

function getPageStyles() {
  return Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");
}

function cloneReportForExport() {
  const source = document.querySelector(".report-panel");
  const clone = source.cloneNode(true);
  clone.classList.add("report-export-surface");
  clone.querySelectorAll("canvas").forEach((canvas, index) => {
    const sourceCanvas = source.querySelectorAll("canvas")[index];
    const image = document.createElement("img");
    image.src = sourceCanvas.toDataURL("image/png");
    image.alt = canvas.getAttribute("aria-label") || "Grafico do relatorio";
    image.style.width = "100%";
    image.style.display = "block";
    canvas.replaceWith(image);
  });
  clone.querySelectorAll("textarea").forEach((textarea, index) => {
    const sourceTextarea = source.querySelectorAll("textarea")[index];
    textarea.textContent = sourceTextarea.value;
    textarea.value = sourceTextarea.value;
  });
  clone.querySelectorAll("input").forEach((input, index) => {
    const sourceInput = source.querySelectorAll("input")[index];
    if (!sourceInput) {
      return;
    }
    input.setAttribute("value", sourceInput.value);
    if (sourceInput.checked) {
      input.setAttribute("checked", "checked");
    } else {
      input.removeAttribute("checked");
    }
  });
  return clone;
}

async function renderReportPanelToCanvas() {
  const source = document.querySelector(".report-panel");
  const clone = cloneReportForExport();
  const width = Math.ceil(source.getBoundingClientRect().width);
  const height = Math.ceil(Math.max(source.scrollHeight, source.getBoundingClientRect().height));
  clone.style.width = `${width}px`;
  clone.style.maxWidth = "none";
  clone.style.boxSizing = "border-box";

  const html = `
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <style>
          ${getPageStyles()}
          body { margin: 0; background: #f5f7f3; padding: 24px; box-sizing: border-box; }
          .report-export-surface { box-shadow: none; }
        </style>
      </head>
      <body>${clone.outerHTML}</body>
    </html>
  `;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width + 48}" height="${height + 48}">
      <foreignObject width="100%" height="100%">${html}</foreignObject>
    </svg>
  `;

  const image = new Image();
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = svgUrl;
  });

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = (width + 48) * scale;
  canvas.height = (height + 48) * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#f5f7f3";
  ctx.fillRect(0, 0, width + 48, height + 48);
  ctx.drawImage(image, 0, 0);
  URL.revokeObjectURL(svgUrl);
  return canvas;
}

async function downloadWeeklyReportImage() {
  try {
    const canvas = await renderReportPanelToCanvas();
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = getReportFileName("png");
    link.click();
    showToast("Imagem do ecra do relatorio gerada.");
  } catch {
    showToast("Nao foi possivel gerar a imagem neste navegador.");
  }
}

function printWeeklyReportPdf() {
  const clone = cloneReportForExport();
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) {
    showToast("Permita pop-ups para gerar o PDF.");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="pt">
      <head>
        <meta charset="UTF-8" />
        <title>${getReportFileName("pdf")}</title>
        <style>
          ${getPageStyles()}
          body {
            background: #f5f7f3;
            color: #17211d;
            font-family: "Segoe UI", Arial, sans-serif;
            margin: 0;
            padding: 32px;
          }
          .report-export-surface {
            box-shadow: none;
            margin: 0 auto;
          }
          @media print {
            body {
              background: #ffffff;
              padding: 12mm;
            }
            .report-export-surface {
              border: 0;
              max-width: none;
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        ${clone.outerHTML}
        <script>
          window.addEventListener("load", () => {
            window.print();
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
  showToast("Ecra do relatorio pronto para salvar em PDF.");
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function handleIncomeSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formToObject(form);
  if (!paymentNeedsPerson(data.paymentMethod)) {
    data.transferPerson = "";
  }
  const record = {
    id: createId(),
    ...data,
    amount: Number(data.amount)
  };
  const saved = isSupabaseConfigured()
    ? await insertRowsSafely("entradas", [incomeToRow(record)])
    : true;
  if (!saved) {
    showToast("Erro ao gravar entrada no Supabase. Nada foi guardado.");
    return;
  }
  if (isSupabaseConfigured() && !await verifyRowsVisible("entradas", [record.id])) {
    showToast("Entrada nao ficou visivel pela API. Verifique as politicas RLS.");
    return;
  }
  state.income.push(record);
  if (isSupabaseConfigured()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    await saveState("income");
  }
  form.reset();
  setDefaultDates();
  document.querySelectorAll(".payment-method").forEach(updateTransferPersonField);
  renderDashboard();
  showToast("Entrada gravada no Supabase.");
}

async function handleExpenseSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formToObject(form);
  const record = {
    id: createId(),
    ...data,
    description: data.description.trim(),
    paymentMethod: "Nao informado",
    transferPerson: "",
    city: data.city || "Geral",
    amount: Number(data.amount)
  };
  const saved = isSupabaseConfigured()
    ? await insertRowsSafely("saidas", [expenseToRow(record)])
    : true;
  if (!saved) {
    showToast("Erro ao gravar saida no Supabase. Nada foi guardado.");
    return;
  }
  if (isSupabaseConfigured() && !await verifyRowsVisible("saidas", [record.id])) {
    showToast("Saida nao ficou visivel pela API. Verifique as politicas RLS.");
    return;
  }
  state.expenses.push(record);
  if (isSupabaseConfigured()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    await saveState("expenses");
  }
  form.reset();
  setDefaultDates();
  document.querySelectorAll(".payment-method").forEach(updateTransferPersonField);
  renderDashboard();
  showToast("Saida gravada no Supabase.");
}

function setDefaultDates() {
  document.querySelectorAll('#incomeForm input[type="date"], #expenseForm input[type="date"]').forEach((input) => {
    input.valueAsDate = today;
  });
  const weekStartInput = document.querySelector("#weekStart");
  if (weekStartInput && !weekStartInput.value) {
    weekStartInput.value = toDateInputValue(startOfWeek(today));
  }
  const monthStartInput = document.querySelector("#monthStart");
  if (monthStartInput && !monthStartInput.value) {
    monthStartInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  }
  const dashboardMonthInput = document.querySelector("#dashboardMonth");
  if (dashboardMonthInput && !dashboardMonthInput.value) {
    dashboardMonthInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  }
  const dashboardWeekInput = document.querySelector("#dashboardWeek");
  if (dashboardWeekInput && !dashboardWeekInput.value) {
    dashboardWeekInput.value = toDateInputValue(startOfWeek(today));
  }
}

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.tab}`).classList.add("active");
    renderCashFlowChart();
    renderWeeklyReport();
    renderMonthlyReport();
  });
});

document.querySelector("#incomeForm").addEventListener("submit", handleIncomeSubmit);
document.querySelector("#expenseForm").addEventListener("submit", handleExpenseSubmit);
document.querySelector("#loginForm").addEventListener("submit", handleLogin);
document.querySelector("#dashboardPeriod").addEventListener("change", () => {
  recentCurrentPage = 1;
  syncDashboardPeriodControls();
  renderDashboard();
});
document.querySelector("#dashboardMonth").addEventListener("change", () => {
  recentCurrentPage = 1;
  renderDashboard();
});
document.querySelector("#dashboardWeek").addEventListener("change", (event) => {
  if (event.currentTarget.value) {
    event.currentTarget.value = toDateInputValue(startOfWeek(parseLocalDate(event.currentTarget.value)));
  }
  recentCurrentPage = 1;
  renderDashboard();
});
document.querySelector("#logoutButton").addEventListener("click", () => {
  setAuthenticated(null);
  showToast("Sessao encerrada.");
});
document.querySelector("#refreshAppButton").addEventListener("click", refreshApplication);
document.querySelector("#recentPrevPage").addEventListener("click", () => {
  recentCurrentPage = Math.max(1, recentCurrentPage - 1);
  renderDashboard();
});
document.querySelector("#recentNextPage").addEventListener("click", () => {
  recentCurrentPage += 1;
  renderDashboard();
});
document.querySelector("#recentRows").addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-id]");
  if (button) {
    editMovementDateAndAmount(button.dataset.editType, button.dataset.editId);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-id]");
  if (deleteButton) {
    deleteMovement(deleteButton.dataset.deleteType, deleteButton.dataset.deleteId);
  }
});
document.querySelector("#monthlyRows").addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-id]");
  if (button) {
    editMovementDateAndAmount(button.dataset.editType, button.dataset.editId);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-id]");
  if (deleteButton) {
    deleteMovement(deleteButton.dataset.deleteType, deleteButton.dataset.deleteId);
  }
});
document.querySelector("#monthlyPrevPage").addEventListener("click", () => {
  monthlyCurrentPage = Math.max(1, monthlyCurrentPage - 1);
  renderMonthlyReport();
});
document.querySelector("#monthlyNextPage").addEventListener("click", () => {
  monthlyCurrentPage += 1;
  renderMonthlyReport();
});
document.querySelector("#expenseRecentRows").addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-id]");
  if (button) {
    editMovementDateAndAmount(button.dataset.editType, button.dataset.editId);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-id]");
  if (deleteButton) {
    deleteMovement(deleteButton.dataset.deleteType, deleteButton.dataset.deleteId);
  }
});
document.querySelector("#expensePrevPage").addEventListener("click", () => {
  expenseCurrentPage = Math.max(1, expenseCurrentPage - 1);
  renderExpenseRecentRows();
});
document.querySelector("#expenseNextPage").addEventListener("click", () => {
  expenseCurrentPage += 1;
  renderExpenseRecentRows();
});
document.querySelector("#incomeRows").addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-id]");
  if (button) {
    editMovementDateAndAmount(button.dataset.editType, button.dataset.editId);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-id]");
  if (deleteButton) {
    deleteMovement(deleteButton.dataset.deleteType, deleteButton.dataset.deleteId);
  }
});
["#incomeFilterGirl", "#incomeFilterOperator", "#incomeFilterCity", "#incomeFilterPayment", "#incomeFilterMbWayPerson"].forEach((selector) => {
  document.querySelector(selector).addEventListener("change", () => {
    incomeCurrentPage = 1;
    renderIncomeEntries();
  });
});
document.querySelector("#clearIncomeFilters").addEventListener("click", () => {
  ["#incomeFilterGirl", "#incomeFilterOperator", "#incomeFilterCity", "#incomeFilterPayment", "#incomeFilterMbWayPerson"].forEach((selector) => {
    document.querySelector(selector).value = "";
  });
  incomeCurrentPage = 1;
  renderIncomeEntries();
});
document.querySelector("#incomePrevPage").addEventListener("click", () => {
  incomeCurrentPage = Math.max(1, incomeCurrentPage - 1);
  renderIncomeEntries();
});
document.querySelector("#incomeNextPage").addEventListener("click", () => {
  incomeCurrentPage += 1;
  renderIncomeEntries();
});
document.querySelector("#categoryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const added = await addUniqueItem("categories", formToObject(form).category);
  form.reset();
  showToast(getAdminSaveMessage(added, "Categoria"));
});
document.querySelector("#locationForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const added = await addUniqueItem("locations", formToObject(form).location);
  form.reset();
  showToast(getAdminSaveMessage(added, "Localidade"));
});
document.querySelector("#operatorForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const added = await addUniqueItem("operators", formToObject(form).operator);
  form.reset();
  showToast(getAdminSaveMessage(added, "Operacional"));
});
document.querySelector("#paymentMethodForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const added = await addUniqueItem("paymentMethods", formToObject(form).paymentMethod);
  form.reset();
  showToast(getAdminSaveMessage(added, "Metodo de pagamento"));
});
document.querySelector("#categoryList").addEventListener("click", async (event) => {
  const category = event.target.dataset.removeCategory;
  if (!category) {
    return;
  }
  await removeItem("categories", category);
  showToast("Categoria removida.");
});
document.querySelector("#locationList").addEventListener("click", async (event) => {
  const location = event.target.dataset.removeLocation;
  if (!location) {
    return;
  }
  await removeItem("locations", location);
  showToast("Localidade removida.");
});
document.querySelector("#operatorList").addEventListener("click", async (event) => {
  const operator = event.target.dataset.removeOperator;
  if (!operator) {
    return;
  }
  await removeItem("operators", operator);
  showToast("Operacional removido.");
});
document.querySelector("#paymentMethodList").addEventListener("click", async (event) => {
  const method = event.target.dataset.removePaymentMethod;
  if (!method) {
    return;
  }
  await removeItem("paymentMethods", method);
  showToast("Metodo de pagamento removido.");
});
document.querySelector("#processWhatsappImport").addEventListener("click", () => {
  const importType = document.querySelector("#importType").value;
  const attendant = document.querySelector("#importAttendant").value.trim();
  const city = document.querySelector("#importCity").value;
  const text = document.querySelector("#whatsappImportText").value;
  if (importType === "attendance" && !attendant) {
    showToast("Informe o nome da garota.");
    return;
  }
  if (importType === "attendance" && !city) {
    showToast("Selecione a localidade.");
    return;
  }
  importPreviewRecords = parseWhatsappImportText(text, attendant, city, importType);
  importCurrentPage = 1;
  renderImportPreview();
  showToast(importPreviewRecords.length ? "Texto processado." : "Nenhum movimento encontrado.");
});
document.querySelector("#clearWhatsappImport").addEventListener("click", () => {
  importPreviewRecords = [];
  importCurrentPage = 1;
  document.querySelector("#whatsappImportText").value = "";
  renderImportPreview();
});
document.querySelector("#importPreviewRows").addEventListener("change", (event) => {
  const index = Number(event.target.dataset.importIndex);
  if (!Number.isInteger(index) || !importPreviewRecords[index]) {
    return;
  }
  if (importPreviewRecords[index].importOnly) {
    importPreviewRecords[index].selected = false;
    renderImportPreview();
    return;
  }
  importPreviewRecords[index].selected = event.target.checked;
  renderImportPreview();
});
document.querySelector("#saveImportRows").addEventListener("click", saveSelectedImportRows);
document.querySelector("#undoLastImport").addEventListener("click", undoLastImport);
document.querySelector("#importPrevPage").addEventListener("click", () => {
  importCurrentPage = Math.max(1, importCurrentPage - 1);
  renderImportPreview();
});
document.querySelector("#importNextPage").addEventListener("click", () => {
  importCurrentPage += 1;
  renderImportPreview();
});
document.querySelector("#themeOptions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-theme]");
  if (!button) {
    return;
  }
  saveUserTheme(button.dataset.theme);
  applyTheme(getActiveTheme());
  renderCashFlowChart();
  renderWeeklyReport();
  showToast("Tema atualizado para este usuario.");
});
document.querySelectorAll(".payment-method").forEach((select) => {
  select.addEventListener("change", () => updateTransferPersonField(select));
  updateTransferPersonField(select);
});
document.querySelector("#weekStart").addEventListener("change", (event) => {
  event.currentTarget.value = toDateInputValue(startOfWeek(parseLocalDate(event.currentTarget.value)));
  selectedWeeklyIds = null;
  weeklyCurrentPage = 1;
  renderWeeklyReport();
});
document.querySelector("#monthStart").addEventListener("change", () => {
  monthlyCurrentPage = 1;
  renderMonthlyReport();
});
document.querySelector("#selectWeekRecords").addEventListener("click", () => {
  const { start, end } = getWeekRange();
  selectedWeeklyIds = new Set([
    ...state.income.filter((item) => inRange(item, start, end)).map((item) => item.id),
    ...state.expenses.filter((item) => inRange(item, start, end)).map((item) => item.id)
  ]);
  renderWeeklyReport();
});
document.querySelector("#checkAllWeekRecords").addEventListener("click", () => {
  const { start, end } = getWeekRange();
  selectedWeeklyIds = new Set([
    ...state.income.filter((item) => inRange(item, start, end)).map((item) => item.id),
    ...state.expenses.filter((item) => inRange(item, start, end)).map((item) => item.id)
  ]);
  renderWeeklyReport();
});
document.querySelector("#uncheckAllWeekRecords").addEventListener("click", () => {
  selectedWeeklyIds = new Set();
  renderWeeklyReport();
});
document.querySelector("#weeklyRecords").addEventListener("change", (event) => {
  const recordId = event.target.dataset.weeklyRecord;
  if (!recordId) {
    return;
  }
  if (!selectedWeeklyIds) {
    selectedWeeklyIds = new Set();
  }
  if (event.target.checked) {
    selectedWeeklyIds.add(recordId);
  } else {
    selectedWeeklyIds.delete(recordId);
  }
  renderWeeklyReport();
});
document.querySelector("#weeklyPrevPage").addEventListener("click", () => {
  weeklyCurrentPage = Math.max(1, weeklyCurrentPage - 1);
  renderWeeklyReport();
});
document.querySelector("#weeklyNextPage").addEventListener("click", () => {
  weeklyCurrentPage += 1;
  renderWeeklyReport();
});
document.querySelector("#weeklyRecords").addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-id]");
  if (button) {
    event.preventDefault();
    editMovementDateAndAmount(button.dataset.editType, button.dataset.editId);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-id]");
  if (deleteButton) {
    event.preventDefault();
    deleteMovement(deleteButton.dataset.deleteType, deleteButton.dataset.deleteId);
  }
});
document.querySelector("#copyReport").addEventListener("click", async () => {
  const report = document.querySelector("#weeklyReport");
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(report.value);
  } else {
    report.focus();
    report.select();
    document.execCommand("copy");
  }
  showToast("Relatorio copiado.");
});
document.querySelector("#copyMonthlyReport").addEventListener("click", async () => {
  const report = document.querySelector("#monthlyReport");
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(report.value);
  } else {
    report.focus();
    report.select();
    document.execCommand("copy");
  }
  showToast("Relatorio mensal copiado.");
});
document.querySelector("#exportMonthlyCsv").addEventListener("click", exportMonthlyCsv);
document.querySelector("#downloadReportImage").addEventListener("click", downloadWeeklyReportImage);
document.querySelector("#printReportPdf").addEventListener("click", printWeeklyReportPdf);

window.addEventListener("resize", () => {
  renderCashFlowChart();
  renderWeeklyReport();
  renderMonthlyReport();
});

document.querySelector("#todayLabel").textContent = dateFormatter.format(today);

async function initializeApp() {
  setDefaultDates();
  applyTheme(getActiveTheme());
  const authenticated = await verifyAuthSession();
  if (authenticated) {
    await loadRemoteState();
    renderDashboard();
  }
}

initializeApp();

