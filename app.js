const STORAGE_KEY = "controle-integrado-maio-v1";
const defaultCategories = ["Operacional", "Transporte", "Material", "Marketing", "Administrativo"];
const defaultLocations = ["Porto", "Lisboa", "Faro", "Braga", "Funchal"];
const defaultOperators = ["Ana Martins", "Rui Costa", "Sofia Reis", "Pedro Lima"];
const defaultPaymentMethods = ["Dinheiro", "Cartao", "Transferencia", "MB WAY"];
const defaultTheme = "green";
const availableThemes = ["green", "blue", "gray", "pink", "purple"];
const AUTH_SESSION_KEY = "controle-integrado-supabase-session";
const defaultAuth = {
  username: "admin",
  password: "admin123"
};

const currency = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR"
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
  income: [
    {
      id: createId(),
      clientName: "Cliente Norte",
      operatorName: "Ana Martins",
      date: `${currentYear}-05-03`,
      paymentMethod: "Transferencia",
      city: "Porto",
      amount: 2480,
      description: "Contrato mensal de suporte"
    },
    {
      id: createId(),
      clientName: "Loja Central",
      operatorName: "Rui Costa",
      date: `${currentYear}-05-08`,
      paymentMethod: "Cartao",
      city: "Lisboa",
      amount: 1850,
      description: "Servicos operacionais"
    },
    {
      id: createId(),
      clientName: "Grupo Atlantico",
      operatorName: "Sofia Reis",
      date: `${currentYear}-05-12`,
      paymentMethod: "MB WAY",
      city: "Faro",
      amount: 920,
      description: "Entrada de projeto especial"
    },
    {
      id: createId(),
      clientName: "Hotel Douro",
      operatorName: "Ana Martins",
      date: `${currentYear}-04-16`,
      paymentMethod: "Transferencia",
      city: "Porto",
      amount: 2100,
      description: "Servicos de abril"
    },
    {
      id: createId(),
      clientName: "Mercado Sul",
      operatorName: "Rui Costa",
      date: `${currentYear}-03-10`,
      paymentMethod: "Dinheiro",
      city: "Faro",
      amount: 1670,
      description: "Regularizacao de fatura"
    },
    {
      id: createId(),
      clientName: "Clinica Tejo",
      operatorName: "Sofia Reis",
      date: `${currentYear}-02-18`,
      paymentMethod: "Cartao",
      city: "Lisboa",
      amount: 2320,
      description: "Contrato operacional"
    },
    {
      id: createId(),
      clientName: "Empresa Minho",
      operatorName: "Pedro Lima",
      date: `${currentYear}-01-22`,
      paymentMethod: "Transferencia",
      city: "Braga",
      amount: 1480,
      description: "Servico pontual"
    },
    {
      id: createId(),
      clientName: "Madeira Prime",
      operatorName: "Ana Martins",
      date: `${currentYear - 1}-12-18`,
      paymentMethod: "Transferencia",
      city: "Funchal",
      amount: 1950,
      description: "Contrato de dezembro"
    }
  ],
  expenses: [
    {
      id: createId(),
      description: "Combustivel e deslocacoes",
      amount: 380,
      category: "Transporte",
      date: `${currentYear}-05-05`,
      paymentMethod: "Cartao",
      city: "Porto"
    },
    {
      id: createId(),
      description: "Materiais operacionais",
      amount: 540,
      category: "Material",
      date: `${currentYear}-05-09`,
      paymentMethod: "Transferencia",
      city: "Lisboa"
    },
    {
      id: createId(),
      description: "Publicidade local",
      amount: 260,
      category: "Marketing",
      date: `${currentYear}-05-13`,
      paymentMethod: "MB WAY",
      city: "Faro"
    },
    {
      id: createId(),
      description: "Equipa temporaria",
      amount: 730,
      category: "Operacional",
      date: `${currentYear}-04-17`,
      paymentMethod: "Transferencia",
      city: "Porto"
    },
    {
      id: createId(),
      description: "Material de campo",
      amount: 410,
      category: "Material",
      date: `${currentYear}-03-12`,
      paymentMethod: "Cartao",
      city: "Faro"
    },
    {
      id: createId(),
      description: "Licencas administrativas",
      amount: 510,
      category: "Administrativo",
      date: `${currentYear}-02-21`,
      paymentMethod: "Transferencia",
      city: "Lisboa"
    },
    {
      id: createId(),
      description: "Deslocacao tecnica",
      amount: 290,
      category: "Transporte",
      date: `${currentYear}-01-25`,
      paymentMethod: "Cartao",
      city: "Braga"
    },
    {
      id: createId(),
      description: "Apoio logistico",
      amount: 450,
      category: "Operacional",
      date: `${currentYear - 1}-12-20`,
      paymentMethod: "Transferencia",
      city: "Funchal"
    }
  ],
  categories: defaultCategories,
  locations: defaultLocations,
  operators: defaultOperators,
  paymentMethods: defaultPaymentMethods,
  theme: defaultTheme,
  auth: defaultAuth
};

let state = loadState();
let selectedWeeklyIds = null;

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
    return JSON.parse(JSON.stringify(seedData));
  }
  const parsed = JSON.parse(stored);
  return normalizeState(parsed);
}

async function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return saveRemoteState();
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

async function saveRemoteState() {
  if (isSupabaseConfigured()) {
    return saveSupabaseState();
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
    let shouldSavePreservedLists = false;
    if (!nextState.operators.length && previousState.operators.length) {
      nextState.operators = previousState.operators;
      shouldSavePreservedLists = true;
    }
    if (!nextState.paymentMethods.length && previousState.paymentMethods.length) {
      nextState.paymentMethods = previousState.paymentMethods;
      shouldSavePreservedLists = true;
    }
    state = nextState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (shouldSavePreservedLists) {
      await saveRemoteState();
    }
    showToast("Dados carregados das tabelas Supabase.");
    return state;
  }
  state = previousState;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  showToast("Nao foi possivel carregar o Supabase. Dados locais preservados.");
  return state;
}

async function saveSupabaseState() {
  if (await saveNormalizedSupabaseState()) {
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
    description: item.description
  };
}

function rowToIncome(row) {
  return {
    id: row.id,
    clientName: row.client_name,
    operatorName: row.operator_name,
    date: row.entry_date,
    paymentMethod: row.payment_method,
    transferPerson: row.transfer_person || "",
    city: row.city,
    amount: Number(row.amount || 0),
    description: row.description
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

async function loadNormalizedSupabaseState() {
  try {
    const [incomeRows, expenseRows, categoryRows, locationRows, operatorRows, paymentMethodRows, settingsRows] = await Promise.all([
      supabaseRequest("entradas?select=*&order=entry_date.asc"),
      supabaseRequest("saidas?select=*&order=payment_date.asc"),
      supabaseRequest("categorias?select=*&order=name.asc"),
      supabaseRequest("localidades?select=*&order=name.asc"),
      supabaseRequest("operacionais?select=*&order=name.asc"),
      supabaseRequest("metodos_pagamento?select=*&order=name.asc"),
      supabaseRequest("configuracoes?id=eq.1&select=*")
    ]);

    if (!settingsRows.length && !incomeRows.length && !expenseRows.length && !categoryRows.length && !locationRows.length && !operatorRows.length && !paymentMethodRows.length) {
      return {
        income: [],
        expenses: [],
        categories: [],
        locations: [],
        operators: [],
        paymentMethods: [],
        theme: state.theme,
        auth: state.auth
      };
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
  } catch {
    return null;
  }
}

async function replaceTable(tableName, rows) {
  await supabaseRequest(`${tableName}?id=neq.__never__`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" }
  });
  if (!rows.length) {
    return;
  }
  await supabaseRequest(tableName, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(rows)
  });
}

async function saveNormalizedSupabaseState() {
  try {
    await replaceTable("entradas", state.income.map(incomeToRow));
    await replaceTable("saidas", state.expenses.map(expenseToRow));
    await replaceTable("categorias", state.categories.map((name) => ({ id: toSlugId("cat", name), name })));
    await replaceTable("localidades", state.locations.map((name) => ({ id: toSlugId("loc", name), name })));
    await replaceTable("operacionais", state.operators.map((name) => ({ id: toSlugId("op", name), name })));
    await replaceTable("metodos_pagamento", state.paymentMethods.map((name) => ({ id: toSlugId("pay", name), name })));
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
  } catch {
    console.error("Falha ao salvar estado normalizado no Supabase.");
    return false;
  }
}

function normalizeState(data) {
  const categories = new Set(Array.isArray(data.categories) ? data.categories : defaultCategories);
  const locations = new Set(Array.isArray(data.locations) ? data.locations : defaultLocations);
  const operators = new Set(Array.isArray(data.operators) ? data.operators : defaultOperators);
  const paymentMethods = new Set(Array.isArray(data.paymentMethods) ? data.paymentMethods : defaultPaymentMethods);
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
  return `€${Number(value || 0).toFixed(2)}`;
}

function startOfWeek(date) {
  const local = new Date(date);
  const day = local.getDay() || 7;
  local.setDate(local.getDate() - day + 1);
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

function renderDashboard() {
  applyTheme(state.theme);
  const mayIncome = state.income.filter(isMayCurrentYear);
  const mayExpenses = state.expenses.filter(isMayCurrentYear);
  const incomeTotal = sum(mayIncome);
  const expenseTotal = sum(mayExpenses);

  document.querySelector("#monthlyBalance").textContent = currency.format(incomeTotal - expenseTotal);
  document.querySelector("#incomeTotal").textContent = currency.format(incomeTotal);
  document.querySelector("#expenseTotal").textContent = currency.format(expenseTotal);
  document.querySelector("#incomeCount").textContent = `${mayIncome.length} registros`;
  document.querySelector("#expenseCount").textContent = `${mayExpenses.length} registros`;

  renderCities(mayIncome, mayExpenses);
  renderRecentRows();
  renderCashFlowChart();
  renderWeeklyReport();
  renderMonthlyReport();
  renderAdminPanel();
  renderDynamicSelects();
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
  const paymentMethodOptions = ['<option value="">Selecionar</option>', ...state.paymentMethods.map((item) => `<option>${item}</option>`)].join("");
  document.querySelectorAll(".payment-method").forEach((select) => {
    const currentValue = select.value;
    select.innerHTML = paymentMethodOptions;
    if (state.paymentMethods.includes(currentValue)) {
      select.value = currentValue;
    }
    updateTransferPersonField(select);
  });

  const locationOptions = ['<option value="">Selecionar</option>', ...state.locations.map((item) => `<option>${item}</option>`)].join("");
  document.querySelectorAll(".location-select").forEach((select) => {
    const currentValue = select.value;
    select.innerHTML = locationOptions;
    if (state.locations.includes(currentValue)) {
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

  document.querySelector("#cityList").innerHTML = rows || "<p>Nenhum valor registrado em maio.</p>";
}

function renderRecentRows() {
  const rows = [
    ...state.income.map((item) => ({ ...item, type: "Entrada", amountType: "income", recordType: "income" })),
    ...state.expenses.map((item) => ({ ...item, type: "Saida", amountType: "expense", recordType: "expense" }))
  ]
    .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date))
    .slice(0, 8)
    .map((item) => {
      const method = item.transferPerson ? `${item.paymentMethod} - ${item.transferPerson}` : item.paymentMethod;
      return `
        <tr>
          <td><span class="type-pill ${item.amountType}">${item.type}</span></td>
          <td>${item.description}</td>
          <td>${item.city}</td>
          <td>${method}</td>
          <td>${dateFormatter.format(parseLocalDate(item.date))}</td>
          <td class="money-cell">${currency.format(item.amount)}</td>
          <td><button class="table-action-button" type="button" data-edit-type="${item.recordType}" data-edit-id="${item.id}">Editar</button></td>
        </tr>
      `;
    })
    .join("");

  document.querySelector("#recentRows").innerHTML = rows;
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
  end.setDate(start.getDate() + 6);
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
  const weekIncomeAll = state.income.filter((item) => inRange(item, start, end));
  const weekExpensesAll = state.expenses.filter((item) => inRange(item, start, end));
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
  const attendanceTotal = weekIncome.length;

  document.querySelector("#weeklySummary").innerHTML = `
    <div><span>Saldo semanal</span><strong>${currency.format(balance)}</strong></div>
    <div><span>Entradas semanal</span><strong>${currency.format(incomeTotal)}</strong></div>
    <div><span>Saidas semanal</span><strong>${currency.format(expenseTotal)}</strong></div>
  `;

  renderWeeklyRecords(weekRecords);
  const dailyTotals = getDailyWeeklyTotals(start, weekIncome, weekExpenses);
  const paymentTotals = getPaymentMethodTotals(weekIncome, weekExpenses);
  const attendantTotals = getAttendantTotals(weekIncome);
  renderPaymentBreakdown(paymentTotals);
  renderAttendantBreakdown("#attendantBreakdown", attendantTotals);
  renderWeeklyChart(dailyTotals);

  document.querySelector("#weeklyReport").value = [
    "Acompanhamento para Cliente",
    "",
    `📊 *RELATÓRIO SEMANAL - ${formatShortDate(start)} - ${formatShortDate(end)}*`,
    "",
    "💰 *Financeiro:*",
    `• Entradas: ${formatWhatsAppCurrency(incomeTotal)}`,
    `• Saídas: ${formatWhatsAppCurrency(expenseTotal)}`,
    `• Saldo Líquido: ${formatWhatsAppCurrency(balance)}`,
    "",
    "📅 *Performance Diária:*",
    ...dailyTotals.map((item) => `• ${item.label} (${formatShortDate(item.date)}): ${formatWhatsAppCurrency(item.balance)}`),
    "",
    "💳 *Métodos de Pagamento:*",
    ...paymentTotals.map((item) =>
      `• ${item.method}: Entradas ${formatWhatsAppCurrency(item.income)} | Saídas ${formatWhatsAppCurrency(item.expense)} | Saldo ${formatWhatsAppCurrency(item.balance)}`
    ),
    "",
    "👩 *Atendentes:*",
    ...attendantTotals.map((item) =>
      `• ${item.name}: ${formatWhatsAppCurrency(item.total)} (${item.count} atendimentos)`
    ),
    "",
    "📈 *Resumo:*",
    `• Total Atendimentos: ${attendanceTotal}`
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
    const name = item.clientName || "Sem atendente";
    if (!totals.has(name)) {
      totals.set(name, { name, total: 0, count: 0 });
    }
    const target = totals.get(name);
    target.total += Number(item.amount || 0);
    target.count += 1;
  });
  return [...totals.values()].sort((a, b) => b.total - a.total);
}

function renderAttendantBreakdown(selector, attendantTotals) {
  const container = document.querySelector(selector);
  container.innerHTML = attendantTotals.length
    ? attendantTotals.map((item) => `
      <article class="payment-card">
        <strong>${item.name}</strong>
        <span>Valor: ${currency.format(item.total)}</span>
        <span>Atendimentos: ${item.count}</span>
      </article>
    `).join("")
    : `<article class="payment-card"><strong>Sem atendentes</strong><span>Nenhuma entrada no periodo.</span></article>`;
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
  const attendanceTotal = monthIncome.length;
  const paymentTotals = getPaymentMethodTotals(monthIncome, monthExpenses);
  const attendantTotals = getAttendantTotals(monthIncome);
  const monthRecords = [
    ...monthIncome.map((item) => ({ ...item, type: "Entrada", amountType: "income", recordType: "income", detail: item.clientName })),
    ...monthExpenses.map((item) => ({ ...item, type: "Saida", amountType: "expense", recordType: "expense", detail: item.category }))
  ].sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

  document.querySelector("#monthlyReportSummary").innerHTML = `
    <div><span>Saldo mensal</span><strong>${currency.format(balance)}</strong></div>
    <div><span>Entradas mensal</span><strong>${currency.format(incomeTotal)}</strong></div>
    <div><span>Saidas mensal</span><strong>${currency.format(expenseTotal)}</strong></div>
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
  renderAttendantBreakdown("#monthlyAttendantBreakdown", attendantTotals);

  document.querySelector("#monthlyRows").innerHTML = monthRecords.length
    ? monthRecords.map((item) => {
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
          <td><button class="table-action-button" type="button" data-edit-type="${item.recordType}" data-edit-id="${item.id}">Editar</button></td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="8">Nenhum movimento encontrado neste mes.</td></tr>`;

  document.querySelector("#monthlyReport").value = [
    "Acompanhamento para Cliente",
    "",
    `📊 *RELATÓRIO MENSAL - ${monthTitle(start).toUpperCase()}*`,
    "",
    "💰 *Financeiro acumulado:*",
    `• Entradas: ${formatWhatsAppCurrency(incomeTotal)}`,
    `• Saídas: ${formatWhatsAppCurrency(expenseTotal)}`,
    `• Saldo Líquido: ${formatWhatsAppCurrency(balance)}`,
    "",
    "📈 *Comparativo com mês anterior:*",
    `• Saldo mês anterior: ${formatWhatsAppCurrency(previousBalance)}`,
    `• Diferença total de saldo: ${formatWhatsAppCurrency(balanceDifference)}`,
    `• Diferença do saldo positivo: ${formatWhatsAppCurrency(positiveDifference)}`,
    "",
    "💳 *Métodos de Pagamento:*",
    ...paymentTotals.map((item) =>
      `• ${item.method}: Entradas ${formatWhatsAppCurrency(item.income)} | Saídas ${formatWhatsAppCurrency(item.expense)} | Saldo ${formatWhatsAppCurrency(item.balance)}`
    ),
    "",
    "👩 *Atendentes:*",
    ...attendantTotals.map((item) =>
      `• ${item.name}: ${formatWhatsAppCurrency(item.total)} (${item.count} atendimentos)`
    ),
    "",
    "📌 *Resumo:*",
    `• Total Atendimentos: ${attendanceTotal}`
  ].join("\n");
}

function renderWeeklyRecords(records) {
  const container = document.querySelector("#weeklyRecords");
  if (!records.length) {
    container.innerHTML = "<p>Nenhum registro encontrado para esta semana.</p>";
    return;
  }

  container.innerHTML = records.map((item) => {
    const isIncome = item.recordType === "income";
    const title = isIncome ? item.clientName : item.description;
    const method = item.transferPerson ? `${item.paymentMethod} - ${item.transferPerson}` : item.paymentMethod;
    const meta = isIncome
      ? `Entrada • ${item.city} • ${method}`
      : `Saida • ${item.category} • ${item.city} • ${method}`;
    return `
      <label class="record-check">
        <input type="checkbox" data-weekly-record="${item.id}" ${selectedWeeklyIds.has(item.id) ? "checked" : ""} />
        <span>
          <strong>${dateFormatter.format(parseLocalDate(item.date))} · ${title} · ${currency.format(item.amount)}</strong>
          <span>${meta}</span>
        </span>
      </label>
    `;
  }).join("");
}

function getDailyWeeklyTotals(start, incomes, expenses) {
  const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  return Array.from({ length: 7 }, (_, index) => {
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
  setTimeout(() => toast.classList.remove("show"), 2200);
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

function setAuthenticated(session) {
  if (session?.access_token) {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    document.body.classList.add("authenticated");
  } else {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    document.body.classList.remove("authenticated");
  }
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
  const saved = await saveState();
  renderDashboard();
  return saved ? "saved" : "local";
}

async function removeItem(listName, value) {
  state[listName] = state[listName].filter((item) => item !== value);
  await saveState();
  renderDashboard();
}

async function editMovementDateAndAmount(type, id) {
  const listName = type === "income" ? "income" : "expenses";
  const item = state[listName].find((record) => record.id === id);
  if (!item) {
    showToast("Movimento nao encontrado.");
    return;
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
  await saveState();
  selectedWeeklyIds = null;
  renderDashboard();
  showToast("Movimento atualizado.");
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
  return normalized === "transferencia" || normalized === "mbway";
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

function handleIncomeSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formToObject(form);
  if (!paymentNeedsPerson(data.paymentMethod)) {
    data.transferPerson = "";
  }
  state.income.push({
    id: createId(),
    ...data,
    amount: Number(data.amount)
  });
  saveState();
  form.reset();
  setDefaultDates();
  document.querySelectorAll(".payment-method").forEach(updateTransferPersonField);
  renderDashboard();
  showToast("Entrada registrada com sucesso.");
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formToObject(form);
  if (!paymentNeedsPerson(data.paymentMethod)) {
    data.transferPerson = "";
  }
  state.expenses.push({
    id: createId(),
    ...data,
    amount: Number(data.amount)
  });
  saveState();
  form.reset();
  setDefaultDates();
  document.querySelectorAll(".payment-method").forEach(updateTransferPersonField);
  renderDashboard();
  showToast("Saida registrada com sucesso.");
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
document.querySelector("#logoutButton").addEventListener("click", () => {
  setAuthenticated(null);
  showToast("Sessao encerrada.");
});
document.querySelector("#recentRows").addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-id]");
  if (!button) {
    return;
  }
  editMovementDateAndAmount(button.dataset.editType, button.dataset.editId);
});
document.querySelector("#monthlyRows").addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-id]");
  if (!button) {
    return;
  }
  editMovementDateAndAmount(button.dataset.editType, button.dataset.editId);
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
document.querySelector("#themeOptions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-theme]");
  if (!button) {
    return;
  }
  state.theme = button.dataset.theme;
  saveState();
  applyTheme(state.theme);
  renderCashFlowChart();
  renderWeeklyReport();
  showToast("Tema atualizado.");
});
document.querySelectorAll(".payment-method").forEach((select) => {
  select.addEventListener("change", () => updateTransferPersonField(select));
  updateTransferPersonField(select);
});
document.querySelector("#weekStart").addEventListener("change", (event) => {
  event.currentTarget.value = toDateInputValue(startOfWeek(parseLocalDate(event.currentTarget.value)));
  selectedWeeklyIds = null;
  renderWeeklyReport();
});
document.querySelector("#monthStart").addEventListener("change", renderMonthlyReport);
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
  applyTheme(state.theme);
  const authenticated = await verifyAuthSession();
  if (authenticated) {
    await loadRemoteState();
    renderDashboard();
  }
}

initializeApp();
