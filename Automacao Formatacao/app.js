// ─── CHECKLIST ────────────────────────────────────────────────────────────────
// reservaOnly: true  → este grupo só entra no progresso quando destino !== "reserva"
const checklistGroups = [
  {
    title: "Levantamento antes de formatar",
    items: [
      { text: "Verificar nome atual do computador no domínio" },
      { text: "Localizar ou confirmar chave do Windows" },
      { text: "Identificar sistema operacional instalado: Windows 10 ou Windows 11" },
      { text: "Verificar no AD os nomes das máquinas do setor" },
      { text: "Definir novo nome seguindo a sequência do setor" },
      { text: "Confirmar se o colaborador usa SAP", sapControl: true }
    ]
  },
  {
    title: "Preparação do pendrive",
    items: [
      { text: "Baixar a ISO do mesmo sistema operacional identificado" },
      { text: "Instalar a imagem do Windows no pendrive" },
      { text: "Ejetar o pendrive com segurança" },
      { text: "Desligar o computador que será formatado" },
      { text: "Conectar o pendrive no computador" }
    ]
  },
  {
    title: "BIOS e instalação do Windows",
    items: [
      { text: "Acessar a BIOS do computador" },
      { text: "Colocar o pendrive como primeiro item na ordem de boot" },
      { text: "Iniciar o computador pelo pendrive" },
      { text: "Informar chave de ativação quando solicitado" },
      { text: "Configurar nome, idioma e dados iniciais do Windows" },
      { text: "Concluir acesso à área de trabalho" }
    ]
  },
  {
    title: "Domínio e configurações iniciais",
    items: [
      { text: "Alterar nome do computador para o nome definido" },
      { text: "Adicionar computador ao domínio" },
      { text: "Reiniciar após entrada no domínio" },
      { text: "Acessar Z:\\Publica\\TI\\Programas\\PADRÃO" }
    ]
  },
  {
    title: "Programas padrão",
    items: [
      { text: "Instalar Magma" },
      { text: "Instalar 7-Zip" },
      { text: "Instalar Google Chrome" },
      { text: "Instalar Cylance" },
      { text: "Instalar Foxit PDF" },
      { text: "Instalar Office" },
      { text: "Instalar Lightshot" },
      { text: "Instalar VNC", legacy: ["Instalar VNC 64 bit"] },
      { text: "Instalar SAP", sap: true, legacy: ["Instalar SAP quando necessário"] }
    ]
  },
  {
    title: "Usuário do colaborador",
    reservaOnly: true,   // bloqueado quando destino === "reserva"
    items: [
      { text: "Entrar com o usuário do colaborador" },
      { text: "Instalar MicroSIP" },
      { text: "Ativar Office no usuário" },
      { text: "Instalar Add-ons do SAP no usuário", sap: true, legacy: ["Instalar Add-ons do SAP no usuário quando necessário"] },
      { text: "Validar acessos principais com o colaborador" }
    ]
  }
];

// ─── ESTADO GLOBAL ────────────────────────────────────────────────────────────
const storageKey       = "formatacao-checklist-v1";
const accessStorageKey = "rotina-acessos-v1";
const sessionKey       = "formatacao-admin-session";
const themeKey         = "formatacao-theme";
let jobsCache          = [];
let accessCache        = [];
let usingServerStorage = true;

// ─── ELEMENTOS ────────────────────────────────────────────────────────────────
const loginScreen        = document.querySelector("#loginScreen");
const loginForm          = document.querySelector("#loginForm");
const loginError         = document.querySelector("#loginError");
const loginButton        = document.querySelector("#loginButton");
const retryLogin         = document.querySelector("#retryLogin");
const adminPassword      = document.querySelector("#adminPassword");
const passwordToggle     = document.querySelector("#passwordToggle");
const appShell           = document.querySelector("#appShell");
const moduleHome         = document.querySelector("#moduleHome");
const formattingModule   = document.querySelector("#formattingModule");
const accessModule       = document.querySelector("#accessModule");
const biView             = document.querySelector("#biView");
const formattingListView = document.querySelector("#formattingListView");
const formattingFormView = document.querySelector("#formattingFormView");
const formatResults      = document.querySelector("#formatResults");
const filteredSummary    = document.querySelector("#filteredSummary");
const formatSearch       = document.querySelector("#formatSearch");
const statusFilter       = document.querySelector("#statusFilter");
const sapFilter          = document.querySelector("#sapFilter");
const form               = document.querySelector("#formatForm");
const checklist          = document.querySelector("#checklist");
const progressText       = document.querySelector("#progressText");
const adPattern          = document.querySelector("#adPattern");
const lastAdNumber       = document.querySelector("#lastAdNumber");
const newComputerName    = document.querySelector("#newComputerName");
const jobId              = document.querySelector("#jobId");
const jobCreatedAt       = document.querySelector("#jobCreatedAt");
const formTitle          = document.querySelector("#formTitle");
const saveButton         = document.querySelector("#saveButton");
const needsSap           = document.querySelector("#needsSap");
const destinoSelect      = document.querySelector("#destinoSelect");
const themeToggle        = document.querySelector("#themeToggle");
const historyModal       = document.querySelector("#historyModal");
const modalHistoryList   = document.querySelector("#modalHistoryList");
const modalSearch        = document.querySelector("#modalSearch");
const modalStatusFilter  = document.querySelector("#modalStatusFilter");
const modalSummary       = document.querySelector("#modalSummary");
const barChart           = document.querySelector("#barChart");
const accessForm         = document.querySelector("#accessForm");
const accessId           = document.querySelector("#accessId");
const accessFormTitle    = document.querySelector("#accessFormTitle");
const accessSearch       = document.querySelector("#accessSearch");
const accessStatusFilter = document.querySelector("#accessStatusFilter");
const accessSummary      = document.querySelector("#accessSummary");
const accessResults      = document.querySelector("#accessResults");
const passwordResetModal = document.querySelector("#passwordResetModal");
const authCodeModal      = document.querySelector("#authCodeModal");
const passwordResetError = document.querySelector("#passwordResetError");
const newPasswordValue   = document.querySelector("#newPasswordValue");
const confirmPasswordValue = document.querySelector("#confirmPasswordValue");
const generatedAuthCode  = document.querySelector("#generatedAuthCode");

adminPassword.type = "password";

// ─── UTILS ────────────────────────────────────────────────────────────────────
function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function padNumber(v) { return String(v).padStart(2, "0"); }

function applyTheme(theme) {
  document.body.classList.toggle("theme-light", theme === "light");
  document.body.classList.toggle("theme-dark",  theme !== "light");
  themeToggle.textContent = theme === "light" ? "Modo noturno" : "Modo claro";
  localStorage.setItem(themeKey, theme);
}

function suggestName() {
  const pattern    = adPattern.value.trim().toUpperCase();
  const lastNumber = Number(lastAdNumber.value);
  if (!pattern || Number.isNaN(lastNumber)) return;
  newComputerName.value = `${pattern}-${padNumber(lastNumber + 1)}`;
}

// ─── DESTINO / RESERVA ────────────────────────────────────────────────────────
function currentDestino() { return destinoSelect.value; }
function isReserva()      { return currentDestino() === "reserva"; }

/** Retorna true se o job foi salvo anteriormente como reserva */
function jobPassouPorReserva() {
  const id  = jobId.value;
  if (!id) return false;
  const job = jobsCache.find((j) => j.id === id);
  return !!(job && job.historicoReserva);
}

// ─── CHECKLIST HELPERS ───────────────────────────────────────────────────────
function sapEnabled() { return needsSap.value === "Sim"; }

/**
 * Itens que entram no cálculo de progresso.
 * Quando destino === "reserva", o grupo reservaOnly é excluído.
 */
function allConfiguredItems(needsSapValue = needsSap.value, destinoValue = currentDestino()) {
  return checklistGroups
    .flatMap((group) => (group.reservaOnly && destinoValue === "reserva") ? [] : group.items)
    .filter((item) => !item.sap || needsSapValue === "Sim");
}

function checkedItems() {
  return [...document.querySelectorAll("[data-check-item]:checked")].map((el) => el.value);
}

function progressFrom(items, needsSapValue = needsSap.value, destinoValue = currentDestino()) {
  const total = allConfiguredItems(needsSapValue, destinoValue).length;
  return total ? Math.round((items.length / total) * 100) : 0;
}

function updateProgress() {
  const current  = checkedItems();
  const progress = progressFrom(current);
  progressText.textContent = `${progress}% concluído`;

  checklistGroups.forEach((group, index) => {
    const blocked    = group.reservaOnly && isReserva();
    const stageItems = blocked ? [] : group.items.filter((item) => !item.sap || sapEnabled());
    const count      = stageItems.filter((item) => current.includes(item.text)).length;
    const label      = document.querySelector(`[data-stage-count="${index}"]`);
    if (label) label.textContent = blocked ? "bloqueado" : `${count}/${stageItems.length}`;
  });
}

// ─── RENDER CHECKLIST ─────────────────────────────────────────────────────────
function renderChecklist(itemsToRestore = checkedItems()) {
  const veioDeReserva = jobPassouPorReserva();

  checklist.innerHTML = checklistGroups.map((group, index) => {
    const blocked    = group.reservaOnly && isReserva();
    const stageItems = blocked ? [] : group.items.filter((item) => !item.sap || sapEnabled());

    // Cabeçalho + botão "Marcar todos"
    const markAllBtn = !blocked && stageItems.length
      ? `<button class="small-button mark-all-btn" type="button" data-stage-index="${index}">Marcar todos</button>`
      : "";

    let html = `
      <section class="stage${blocked ? " stage-blocked" : ""}">
        <header>
          <h3>${escapeHtml(group.title)}</h3>
          <div class="stage-header-right">
            ${markAllBtn}
            <span class="stage-count" data-stage-count="${index}">
              ${blocked ? "bloqueado" : `0/${stageItems.length}`}
            </span>
          </div>
        </header>
    `;

    if (blocked) {
      html += `
        <div class="stage-blocked-msg">
          ⏸ Este grupo será desbloqueado quando o computador sair da reserva.
        </div>
      </section>`;
      return html;
    }

    // Campo "Colaborador de destino" — só aparece no grupo reservaOnly
    // quando o job passou por reserva e agora está sendo entregue a um colaborador
    let extraField = "";
    if (group.reservaOnly && veioDeReserva && !isReserva()) {
      const savedColaborador = (() => {
        const job = jobsCache.find((j) => j.id === jobId.value);
        return job ? (job.colaboradorDestino || "") : "";
      })();
      extraField = `
        <div class="item-colaborador-destino">
          <span class="item-icon">👤</span>
          <div class="inner-label">
            <span class="inner-label-text">Colaborador de destino <em>(saindo da reserva)</em></span>
            <input
              type="text"
              id="colaboradorDestino"
              autocomplete="off"
              placeholder="Nome do colaborador que receberá este computador"
              value="${escapeHtml(savedColaborador)}"
            >
          </div>
        </div>
      `;
    }

    const items = stageItems.map((item) => {
      const legacyItems = item.legacy || [];
      const checked = itemsToRestore.includes(item.text) ||
                      legacyItems.some((l) => itemsToRestore.includes(l));
      return `
        <label class="item">
          <input type="checkbox" value="${escapeHtml(item.text)}" data-check-item ${checked ? "checked" : ""}>
          <span>${escapeHtml(item.text)}</span>
        </label>
      `;
    }).join("");

    html += `<div class="items">${extraField}${items}</div></section>`;
    return html;
  }).join("");

  updateProgress();
}

// ─── MARCAR TODOS ─────────────────────────────────────────────────────────────
function handleMarkAll(stageIndex) {
  const group      = checklistGroups[stageIndex];
  if (!group) return;
  const stageItems = group.items.filter((item) => !item.sap || sapEnabled());
  const values     = stageItems.map((item) => item.text);

  document.querySelectorAll("[data-check-item]").forEach((cb) => {
    if (values.includes(cb.value)) cb.checked = true;
  });

  updateProgress();
}

// ─── STATUS ───────────────────────────────────────────────────────────────────
function statusFor(job) {
  if (job.destino === "reserva" && job.progress === 100) return "Em reserva";
  if (job.progress === 100) return "Concluída";
  if (job.progress >= 70)  return "Em finalização";
  return "Em andamento";
}

function statusClass(job) {
  if (job.destino === "reserva" && job.progress === 100) return "reserva";
  if (job.progress === 100) return "done";
  if (job.progress < 70)   return "pending";
  return "";
}

// ─── CARDS ────────────────────────────────────────────────────────────────────
function renderJobCard(job) {
  const date  = new Date(job.createdAt).toLocaleDateString("pt-BR");
  const title = job.newComputerName || job.currentComputerName || "Sem identificação";

  const reservaBadge = job.historicoReserva
    ? `<span class="badge-reserva">Passou por reserva</span>`
    : "";

  const colaboradorDestino = job.colaboradorDestino
    ? `<span>Entregue para: <strong>${escapeHtml(job.colaboradorDestino)}</strong></span>`
    : "";

  return `
    <article class="history-card">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(job.collaborator || "Colaborador não informado")} — ${escapeHtml(job.department || "Setor não informado")}</span>
      <span>${escapeHtml(job.os || "SO não informado")} — ${date}</span>
      <span>SAP: ${escapeHtml(job.needsSap || "não informado")}</span>
      <span>Técnico: ${escapeHtml(job.technician || "não informado")}</span>
      ${colaboradorDestino}
      <span class="status ${statusClass(job)}">${statusFor(job)} — ${job.progress}%</span>
      ${reservaBadge}
      <div class="history-actions">
        <button class="small-button"                type="button" data-edit-job="${escapeHtml(job.id)}">Abrir</button>
        <button class="small-button finish-button"  type="button" data-finish-job="${escapeHtml(job.id)}">Finalizar</button>
        <button class="small-button delete-button"  type="button" data-delete-job="${escapeHtml(job.id)}">Excluir</button>
      </div>
    </article>
  `;
}

// ─── FILTROS DE CONSULTA ──────────────────────────────────────────────────────
function searchableText(job) {
  return [
    job.collaborator, job.department, job.technician, job.needsSap,
    job.currentComputerName, job.newComputerName, job.os,
    job.windowsKey, job.notes, job.colaboradorDestino,
    ...(job.checkedItems || [])
  ].join(" ").toLowerCase();
}

function hasActiveFilters() {
  return !!(formatSearch.value.trim() || statusFilter.value || sapFilter.value);
}

function applyStatusFilter(job, status) {
  if (!status) return true;
  if (status === "done")    return job.progress === 100 && job.destino !== "reserva";
  if (status === "reserva") return job.destino === "reserva" && job.progress === 100;
  if (status === "open")    return job.progress !== 100;
  return true;
}

function filteredJobs() {
  const query  = formatSearch.value.trim().toLowerCase();
  const status = statusFilter.value;
  const sap    = sapFilter.value;

  return jobsCache.filter((job) => {
    const matchesQuery  = !query || searchableText(job).includes(query);
    const matchesStatus = applyStatusFilter(job, status);
    const matchesSap    = !sap || job.needsSap === sap;
    return matchesQuery && matchesStatus && matchesSap;
  });
}

function renderFilteredJobs() {
  if (!hasActiveFilters()) {
    filteredSummary.textContent = "Use os filtros acima para buscar formatações.";
    formatResults.innerHTML     = "";
    return;
  }
  const results = filteredJobs();
  filteredSummary.textContent = `${results.length} de ${jobsCache.length} formatações encontradas`;
  formatResults.innerHTML     = results.length
    ? results.map(renderJobCard).join("")
    : `<p class="empty">Nenhuma formatação encontrada com esses filtros.</p>`;
}

// ─── MODAL HISTÓRICO ──────────────────────────────────────────────────────────
function sortedByDate(jobs) {
  return [...jobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderModalHistory() {
  const query  = modalSearch.value.trim().toLowerCase();
  const status = modalStatusFilter.value;

  const results = sortedByDate(jobsCache).filter((job) => {
    const matchesQuery  = !query || searchableText(job).includes(query);
    const matchesStatus = applyStatusFilter(job, status);
    return matchesQuery && matchesStatus;
  });

  modalSummary.textContent   = `${results.length} de ${jobsCache.length} formatações`;
  modalHistoryList.innerHTML = results.length
    ? results.map(renderJobCard).join("")
    : `<p class="empty">Nenhuma formatação encontrada.</p>`;
}

function openHistoryModal() {
  modalSearch.value       = "";
  modalStatusFilter.value = "";
  renderModalHistory();
  historyModal.hidden          = false;
  document.body.style.overflow = "hidden";
}

function closeHistoryModal() {
  historyModal.hidden          = true;
  document.body.style.overflow = "";
}

// ─── GRÁFICO DE BARRAS ────────────────────────────────────────────────────────
function renderBarChart() {
  if (!jobsCache.length) {
    barChart.innerHTML = `<span class="bar-empty">Nenhum dado disponível para exibir o gráfico.</span>`;
    return;
  }

  const now    = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year:  d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", ""),
      count: 0
    });
  }

  jobsCache.forEach((job) => {
    const d      = new Date(job.createdAt);
    const bucket = months.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
    if (bucket) bucket.count++;
  });

  const maxCount = Math.max(...months.map((m) => m.count), 1);
  barChart.innerHTML = months.map((m) => {
    const heightPx = Math.max(4, Math.round((m.count / maxCount) * 140));
    return `
      <div class="bar-col">
        <span class="bar-value">${m.count || ""}</span>
        <div class="bar-rect" style="height:${heightPx}px"></div>
        <span class="bar-label">${escapeHtml(m.label)}</span>
      </div>
    `;
  }).join("");
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function renderDashboard() {
  const now       = new Date();
  const monthJobs = jobsCache.filter((job) => {
    const d = new Date(job.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const doneJobs = jobsCache.filter((job) => job.progress === 100 && job.destino !== "reserva");
  const resvJobs = jobsCache.filter((job) => job.destino === "reserva" && job.progress === 100);
  const average  = jobsCache.length
    ? Math.round(jobsCache.reduce((sum, job) => sum + job.progress, 0) / jobsCache.length)
    : 0;

  document.querySelector("#totalJobs").textContent   = jobsCache.length;
  document.querySelector("#monthJobs").textContent   = monthJobs.length;
  document.querySelector("#doneJobs").textContent    = doneJobs.length;
  document.querySelector("#resvJobs").textContent    = resvJobs.length;
  document.querySelector("#avgProgress").textContent = `${average}%`;

  renderBarChart();
  renderFilteredJobs();
}

// ─── LOGIN / AUTH ─────────────────────────────────────────────────────────────
function setLoginState(message = "", loading = false, canRetry = false) {
  loginError.textContent  = message;
  loginButton.disabled    = loading;
  loginButton.textContent = loading ? "Carregando..." : "Entrar";
  retryLogin.hidden       = !canRetry;
}

function withTimeout(promise, ms = 7000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Tempo limite excedido.")), ms))
  ]);
}

async function loadJobs() {
  try {
    const response = await withTimeout(fetch("/api/jobs", { cache: "no-store" }));
    if (!response.ok) throw new Error("API indisponível");
    jobsCache          = await response.json();
    usingServerStorage = true;

    const localJobs = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!jobsCache.length && localJobs.length) {
      jobsCache = localJobs;
      await persistJobs();
    }
  } catch {
    jobsCache          = JSON.parse(localStorage.getItem(storageKey) || "[]");
    usingServerStorage = false;
  }
  renderDashboard();
}

async function persistJobs() {
  if (usingServerStorage) {
    const response = await fetch("/api/jobs", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(jobsCache)
    });
    if (!response.ok) throw new Error("Não foi possível salvar no servidor.");
  } else {
    localStorage.setItem(storageKey, JSON.stringify(jobsCache));
  }
}

function showApp() {
  setLoginState("", false, false);
  loginScreen.hidden        = true;
  loginScreen.style.display = "none";
  appShell.hidden           = false;
  appShell.removeAttribute("hidden");
  appShell.style.display    = "block";
  renderChecklist([]);
  showModuleHome();
  loadAccessRecords();
  loadJobs();
}

function logout() {
  try { sessionStorage.removeItem(sessionKey); } catch { /* ignore */ }
  appShell.hidden            = true;
  appShell.style.display     = "none";
  loginScreen.hidden         = false;
  loginScreen.style.display  = "grid";
  loginForm.reset();
  showModuleHome();
}

function attemptLogin() {
  const username = String(loginForm.elements.username.value || "").trim().toLowerCase();
  const password = String(loginForm.elements.password.value || "").trim();

  adminPassword.type = "password";
  passwordToggle.setAttribute("aria-label", "Mostrar senha");

  if (username === "admin" && password === "admin") {
    setLoginState("Login correto, abrindo sistema...", true, false);
    showApp();
    try { sessionStorage.setItem(sessionKey, "active"); } catch { /* ignore */ }
    return;
  }
  setLoginState("Usuário ou senha incorretos.", false, false);
}

// ─── NAVEGAÇÃO ────────────────────────────────────────────────────────────────
function hideAllFormattingViews() {
  biView.hidden             = true;
  formattingListView.hidden = true;
  formattingFormView.hidden = true;
}

function showModuleHome() {
  moduleHome.hidden       = false;
  formattingModule.hidden = true;
  accessModule.hidden     = true;
  hideAllFormattingViews();
}

function showBiView() {
  moduleHome.hidden       = true;
  formattingModule.hidden = false;
  accessModule.hidden     = true;
  hideAllFormattingViews();
  biView.hidden = false;
  renderDashboard();
}

function showAccessModule() {
  moduleHome.hidden       = true;
  formattingModule.hidden = true;
  accessModule.hidden     = false;
  hideAllFormattingViews();
  updateAccessConditionals();
  renderAccessResults();
}

function showFormattingList() {
  moduleHome.hidden       = true;
  formattingModule.hidden = false;
  hideAllFormattingViews();
  formattingListView.hidden = false;
  renderFilteredJobs();
}

function showFormattingForm() {
  moduleHome.hidden       = true;
  formattingModule.hidden = false;
  hideAllFormattingViews();
  formattingFormView.hidden = false;
}

function startNewFormatting() {
  resetForm();
  showFormattingForm();
}

// ─── FORM ─────────────────────────────────────────────────────────────────────
function formDataObject() {
  const data  = Object.fromEntries(new FormData(form).entries());
  const items = checkedItems();
  const now   = new Date().toISOString();

  // Campo fora do form (renderizado dinamicamente)
  const colaboradorDestinoEl = document.querySelector("#colaboradorDestino");
  const colaboradorDestino   = colaboradorDestinoEl ? colaboradorDestinoEl.value.trim() : "";

  // Histórico de reserva: marcado se o job já esteve ou está agora em reserva
  const existingJob      = jobsCache.find((j) => j.id === (data.id || ""));
  const historicoReserva = !!(existingJob?.historicoReserva || existingJob?.destino === "reserva" || data.destino === "reserva");

  return {
    ...data,
    id:                data.id || (globalThis.crypto?.randomUUID
                         ? globalThis.crypto.randomUUID()
                         : `${Date.now()}-${Math.random()}`),
    createdAt:         data.createdAt || now,
    updatedAt:         now,
    checkedItems:      items,
    progress:          progressFrom(items, data.needsSap, data.destino),
    colaboradorDestino: colaboradorDestino || existingJob?.colaboradorDestino || "",
    historicoReserva
  };
}

function resetForm() {
  form.reset();
  jobId.value          = "";
  jobCreatedAt.value   = "";
  formTitle.textContent  = "Nova formatação";
  saveButton.textContent = "Salvar formatação";
  renderChecklist([]);
}

function setEditMode(job) {
  formTitle.textContent  = job ? "Editar formatação" : "Nova formatação";
  saveButton.textContent = job ? "Atualizar formatação" : "Salvar formatação";
}

function loadJob(job) {
  resetForm();

  Object.entries(job).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field && typeof value !== "object") field.value = value;
  });

  if (!job.needsSap) {
    const hasSapItem = job.checkedItems?.some((item) => item.toLowerCase().includes("sap"));
    needsSap.value = hasSapItem ? "Sim" : "";
  }

  renderChecklist(job.checkedItems || []);
  setEditMode(job);
  showFormattingForm();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function saveCurrentJob() {
  const current       = formDataObject();
  const existingIndex = jobsCache.findIndex((job) => job.id === current.id);

  if (existingIndex >= 0) {
    current.createdAt        = jobsCache[existingIndex].createdAt;
    jobsCache[existingIndex] = current;
  } else {
    jobsCache.unshift(current);
  }

  await persistJobs();
  renderDashboard();
  resetForm();
  showFormattingList();
}

async function deleteJob(jobIdToDelete) {
  if (!jobsCache.some((item) => item.id === jobIdToDelete)) return;
  if (!confirm("Deseja excluir este registro de formatação?")) return;

  jobsCache = jobsCache.filter((item) => item.id !== jobIdToDelete);
  await persistJobs();
  if (jobId.value === jobIdToDelete) resetForm();
  renderDashboard();
  renderModalHistory();
}

async function finishJob(jobIdToFinish) {
  const job = jobsCache.find((item) => item.id === jobIdToFinish);
  if (!job) return;

  job.checkedItems = allConfiguredItems(job.needsSap, job.destino).map((item) => item.text);
  job.progress     = 100;
  job.updatedAt    = new Date().toISOString();
  await persistJobs();

  if (jobId.value === jobIdToFinish) loadJob(job);
  renderDashboard();
  renderModalHistory();
}

function handleRecordAction(event) {
  const editButton   = event.target.closest("[data-edit-job]");
  const finishButton = event.target.closest("[data-finish-job]");
  const deleteButton = event.target.closest("[data-delete-job]");

  if (editButton) {
    const job = jobsCache.find((item) => item.id === editButton.dataset.editJob);
    if (job) { closeHistoryModal(); loadJob(job); }
  }
  if (finishButton) {
    finishJob(finishButton.dataset.finishJob).catch((e) =>
      alert(e.message || "Não foi possível finalizar o registro."));
  }
  if (deleteButton) {
    deleteJob(deleteButton.dataset.deleteJob).catch((e) =>
      alert(e.message || "Não foi possível excluir o registro."));
  }
}

// ─── EXPORT XLSX ──────────────────────────────────────────────────────────────
// ─── ROTINA DE ACESSOS ───────────────────────────────────────────────────────
const accessStatusFields = [
  ["AD", "adStatus"],
  ["E-mail", "emailStatus"],
  ["Roteamento", "routingStatus"],
  ["Office", "officeStatus"],
  ["MicroSIP", "microsipStatus"],
  ["SAP", "sapAccessStatus"],
  ["Zap", "zapStatus"]
];

function loadAccessRecords() {
  accessCache = JSON.parse(localStorage.getItem(accessStorageKey) || "[]");
  renderAccessResults();
}

function persistAccessRecords() {
  localStorage.setItem(accessStorageKey, JSON.stringify(accessCache));
}

function accessDataObject() {
  const data = Object.fromEntries(new FormData(accessForm).entries());
  const now = new Date().toISOString();
  const existing = accessCache.find((item) => item.id === data.id);

  if (data.routingEnabled !== "Sim") {
    data.routingStatus = "Não se aplica";
    data.formerEmail = "";
    data.aliasReceiver = "";
    data.forwardFrom = "";
    data.forwardTo = "";
  }
  if (data.usesMicrosip !== "Sim") {
    data.microsipStatus = "Não se aplica";
    data.microsipExtension = "";
    data.microsipPassword = "";
  }
  if (data.usesSapAccess !== "Sim") {
    data.sapAccessStatus = "Não se aplica";
    data.sapCode = "";
    data.sapLicense = "";
    data.sapPassword = "";
    data.sapChangePassword = "";
  }
  if (data.zapEnabled !== "Sim") {
    data.zapStatus = "Não se aplica";
    data.zapLogin = "";
    data.zapPassword = "";
  }

  return {
    ...data,
    id: data.id || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
}

function resetAccessForm() {
  accessForm.reset();
  accessId.value = "";
  accessFormTitle.textContent = "Novo controle de acesso";
  document.querySelector("#saveAccessButton").textContent = "Salvar acesso";
  updateAccessConditionals();
}

function loadAccessRecord(record) {
  resetAccessForm();
  Object.entries(record).forEach(([key, value]) => {
    const field = accessForm.elements[key];
    if (field && typeof value !== "object") field.value = value;
  });
  if (!record.routingEnabled && (record.formerEmail || record.aliasReceiver || record.forwardFrom || record.forwardTo)) accessForm.elements.routingEnabled.value = "Sim";
  if (!record.usesMicrosip && (record.microsipExtension || record.microsipPassword)) accessForm.elements.usesMicrosip.value = "Sim";
  if (!record.usesSapAccess && (record.sapCode || record.sapLicense || record.sapPassword || record.sapChangePassword)) accessForm.elements.usesSapAccess.value = "Sim";
  if (!record.zapEnabled && (record.zapLogin || record.zapPassword)) accessForm.elements.zapEnabled.value = "Sim";
  accessFormTitle.textContent = "Editar controle de acesso";
  document.querySelector("#saveAccessButton").textContent = "Atualizar acesso";
  updateAccessConditionals();
  showAccessModule();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function saveAccessRecord() {
  const current = accessDataObject();
  const existingIndex = accessCache.findIndex((item) => item.id === current.id);
  if (existingIndex >= 0) accessCache[existingIndex] = current;
  else accessCache.unshift(current);
  persistAccessRecords();
  resetAccessForm();
  renderAccessResults();
}

function accessSearchText(record) {
  return Object.values(record).join(" ").toLowerCase();
}

function accessMatchesStatus(record, status) {
  if (!status) return true;
  return accessStatusFields.some(([, field]) => record[field] === status);
}

function filteredAccessRecords() {
  const query = accessSearch.value.trim().toLowerCase();
  const status = accessStatusFilter.value;
  return accessCache.filter((record) => {
    return (!query || accessSearchText(record).includes(query)) && accessMatchesStatus(record, status);
  });
}

function tagClass(status) {
  if (status === "Ativo") return "active";
  if (status === "Pendente") return "pending";
  if (status === "Removido") return "removed";
  return "";
}

function renderAccessCard(record) {
  const tags = accessStatusFields
    .map(([label, field]) => `<span class="access-tag ${tagClass(record[field])}">${label}: ${escapeHtml(record[field] || "N/A")}</span>`)
    .join("");
  return `
    <article class="history-card">
      <strong>${escapeHtml(record.employee || "Usuário não informado")}</strong>
      <span>Setor: ${escapeHtml(record.sector || "não informado")}</span>
      <span>Situação: ${escapeHtml(record.situation || "não informada")}</span>
      <span>E-mail: ${escapeHtml(record.newEmail || record.officeEmail || "não informado")}</span>
      <span>Ramal: ${escapeHtml(record.microsipExtension || "não informado")} | SAP: ${escapeHtml(record.sapCode || "não informado")}</span>
      <div class="access-tags">${tags}</div>
      <div class="history-actions">
        <button class="small-button" type="button" data-edit-access="${escapeHtml(record.id)}">Abrir</button>
        <button class="small-button finish-button" type="button" data-remove-access="${escapeHtml(record.id)}">Remover acessos</button>
        <button class="small-button delete-button" type="button" data-delete-access="${escapeHtml(record.id)}">Excluir</button>
      </div>
    </article>
  `;
}

function renderAccessResults() {
  if (!accessResults) return;
  const results = filteredAccessRecords();
  accessSummary.textContent = `${results.length} de ${accessCache.length} usuários encontrados`;
  accessResults.innerHTML = results.length
    ? results.map(renderAccessCard).join("")
    : "<p class=\"empty\">Nenhum acesso encontrado com esses filtros.</p>";
}

function removeAllAccess(recordId) {
  const record = accessCache.find((item) => item.id === recordId);
  if (!record) return;
  if (!confirm("Deseja marcar todos os acessos deste usuário como removidos?")) return;
  accessStatusFields.forEach(([, field]) => { record[field] = "Removido"; });
  record.updatedAt = new Date().toISOString();
  persistAccessRecords();
  renderAccessResults();
}

function deleteAccessRecord(recordId) {
  if (!accessCache.some((item) => item.id === recordId)) return;
  if (!confirm("Deseja excluir este controle de acesso?")) return;
  accessCache = accessCache.filter((item) => item.id !== recordId);
  persistAccessRecords();
  if (accessId.value === recordId) resetAccessForm();
  renderAccessResults();
}

function handleAccessAction(event) {
  const editButton = event.target.closest("[data-edit-access]");
  const removeButton = event.target.closest("[data-remove-access]");
  const deleteButton = event.target.closest("[data-delete-access]");
  if (editButton) {
    const record = accessCache.find((item) => item.id === editButton.dataset.editAccess);
    if (record) loadAccessRecord(record);
  }
  if (removeButton) removeAllAccess(removeButton.dataset.removeAccess);
  if (deleteButton) deleteAccessRecord(deleteButton.dataset.deleteAccess);
}

function updateAccessConditionals() {
  const visibility = {
    routing: accessForm.elements.routingEnabled?.value === "Sim",
    microsip: accessForm.elements.usesMicrosip?.value === "Sim",
    sapAccess: accessForm.elements.usesSapAccess?.value === "Sim",
    zap: accessForm.elements.zapEnabled?.value === "Sim"
  };

  Object.entries(visibility).forEach(([key, visible]) => {
    document.querySelectorAll(`[data-conditional="${key}"]`).forEach((block) => {
      block.hidden = !visible;
    });
  });
}

function togglePasswordField(button) {
  const input = button.closest(".password-wrap")?.querySelector("input");
  if (!input) return;
  const hidden = input.type === "password";
  input.type = hidden ? "text" : "password";
  button.setAttribute("aria-label", hidden ? "Ocultar senha" : "Mostrar senha");
}

function openPasswordResetModal() {
  passwordResetError.textContent = "";
  newPasswordValue.value = "";
  confirmPasswordValue.value = "";
  passwordResetModal.hidden = false;
}

function closePasswordResetModal() {
  passwordResetModal.hidden = true;
}

function applyPasswordReset() {
  const newPassword = newPasswordValue.value.trim();
  const confirmPassword = confirmPasswordValue.value.trim();

  if (!newPassword || !confirmPassword) {
    passwordResetError.textContent = "Preencha e confirme a nova senha.";
    return;
  }

  if (newPassword !== confirmPassword) {
    passwordResetError.textContent = "As senhas não conferem.";
    return;
  }

  accessForm.elements.emailResetPassword.value = newPassword;
  closePasswordResetModal();
}

function openAuthCodeModal() {
  generatedAuthCode.value = "";
  authCodeModal.hidden = false;
}

function closeAuthCodeModal() {
  authCodeModal.hidden = true;
}

function generateInternalAuthCode() {
  const segments = Array.from({ length: 2 }, () => {
    return Math.random().toString(36).slice(2, 6).toUpperCase();
  });
  generatedAuthCode.value = `INT-${segments.join("-")}`;
}

function applyAuthCode() {
  if (!generatedAuthCode.value) generateInternalAuthCode();
  accessForm.elements.authCodes.value = generatedAuthCode.value;
  closeAuthCodeModal();
}

function groupByDepartment(jobs) {
  return jobs.reduce((groups, job) => {
    const dept = job.department || "Setor não informado";
    groups[dept] = groups[dept] || [];
    groups[dept].push(job);
    return groups;
  }, {});
}

// Cores (ARGB sem #)
const COR_TITULO_BG   = "FF114b7a";
const COR_TITULO_FG   = "FFFFFFFF";
const COR_SETOR_BG    = "FF24551f";
const COR_SETOR_FG    = "FFFFFFFF";
const COR_HEADER_BG   = "FF24551f";
const COR_HEADER_FG   = "FFFFFFFF";
const COR_LINHA_PAR   = "FFdfeeda";
const COR_DETALHE_BG  = "FFFFFFFF";
const COR_BORDA       = "FFb8c7b0";

function xlsxCell(value, opts = {}) {
  const cell = { v: String(value ?? ""), t: "s" };
  const fill  = opts.bg ? { fgColor: { rgb: opts.bg }, patternType: "solid" } : undefined;
  const font  = { name: "Arial", sz: opts.sz || 10, bold: !!opts.bold, color: opts.fg ? { rgb: opts.fg } : undefined };
  const alignment = { wrapText: !!opts.wrap, horizontal: opts.center ? "center" : "left", vertical: "top" };
  const border = {
    top:    { style: "thin", color: { rgb: COR_BORDA } },
    bottom: { style: "thin", color: { rgb: COR_BORDA } },
    left:   { style: "thin", color: { rgb: COR_BORDA } },
    right:  { style: "thin", color: { rgb: COR_BORDA } }
  };
  cell.s = { font, alignment, border, ...(fill ? { fill } : {}) };
  return cell;
}

function exportSheet() {
  if (!jobsCache.length) { alert("Ainda não há registros para exportar."); return; }
  if (typeof XLSX === "undefined") { alert("Biblioteca de exportação ainda não carregou. Aguarde um momento e tente novamente."); return; }

  const wb  = XLSX.utils.book_new();
  const ws  = {};
  const cols = ["#","Colaborador","Nome antigo","Novo nome","Sistema","SAP","Técnico","Progresso","Status","Itens marcados","Entregue para"];
  let row = 0; // índice base-0

  // Linha de título
  ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = xlsxCell("Relatório de Formatações", { bold: true, sz: 14, bg: COR_TITULO_BG, fg: COR_TITULO_FG });
  for (let c = 1; c < cols.length; c++) {
    ws[XLSX.utils.encode_cell({ r: row, c })] = xlsxCell("", { bg: COR_TITULO_BG });
  }
  row++;

  const grouped = groupByDepartment(jobsCache);

  Object.entries(grouped).forEach(([dept, jobs]) => {
    // Linha de setor
    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = xlsxCell(`● ${dept}`, { bold: true, sz: 12, bg: COR_SETOR_BG, fg: COR_SETOR_FG });
    for (let c = 1; c < cols.length; c++) {
      ws[XLSX.utils.encode_cell({ r: row, c })] = xlsxCell("", { bg: COR_SETOR_BG });
    }
    row++;

    // Cabeçalho
    cols.forEach((col, c) => {
      ws[XLSX.utils.encode_cell({ r: row, c })] = xlsxCell(col, { bold: true, bg: COR_HEADER_BG, fg: COR_HEADER_FG, center: true });
    });
    row++;

    // Linhas dos jobs
    jobs.forEach((job, i) => {
      const totalItems = allConfiguredItems(job.needsSap, job.destino).length;
      const isPar      = i % 2 === 1;
      const rowBg      = isPar ? COR_LINHA_PAR : undefined;

      const valores = [
        i + 1,
        job.collaborator        || "",
        job.currentComputerName || "",
        job.newComputerName     || "",
        job.os                  || "",
        job.needsSap            || "",
        job.technician          || "",
        `${job.progress}%`,
        statusFor(job),
        `${job.checkedItems?.length || 0}/${totalItems}`,
        job.colaboradorDestino  || ""
      ];

      valores.forEach((val, c) => {
        ws[XLSX.utils.encode_cell({ r: row, c })] = xlsxCell(val, {
          bg: rowBg,
          center: [0, 5, 7, 9].includes(c)
        });
      });
      row++;

      // Linha de detalhe (checklist + observações)
      const detalhe = [
        `Checklist: ${(job.checkedItems || []).join(" | ")}`,
        `Observações: ${job.notes || "-"}`
      ].join("   |   ");

      ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = xlsxCell("", { bg: COR_DETALHE_BG });
      ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = xlsxCell(detalhe, { bg: COR_DETALHE_BG, sz: 9, wrap: true });
      for (let c = 2; c < cols.length; c++) {
        ws[XLSX.utils.encode_cell({ r: row, c })] = xlsxCell("", { bg: COR_DETALHE_BG });
      }
      row++;
    });

    // Linha em branco entre setores
    for (let c = 0; c < cols.length; c++) {
      ws[XLSX.utils.encode_cell({ r: row, c })] = xlsxCell("");
    }
    row++;
  });

  // Dimensões da planilha
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row - 1, c: cols.length - 1 } });

  // Largura das colunas
  ws["!cols"] = [
    { wch: 4  }, // #
    { wch: 22 }, // Colaborador
    { wch: 18 }, // Nome antigo
    { wch: 18 }, // Novo nome
    { wch: 12 }, // Sistema
    { wch: 6  }, // SAP
    { wch: 16 }, // Técnico
    { wch: 10 }, // Progresso
    { wch: 16 }, // Status
    { wch: 12 }, // Itens
    { wch: 22 }, // Entregue para
  ];

  // Merge da linha de título e de cada setor
  ws["!merges"] = ws["!merges"] || [];

  XLSX.utils.book_append_sheet(wb, ws, "Formatações");

  const now      = new Date();
  const datestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  XLSX.writeFile(wb, `relatorio-formatacoes-${datestamp}.xlsx`);
}

// ─── LISTENERS ────────────────────────────────────────────────────────────────
loginForm.addEventListener("submit",  (e) => { e.preventDefault(); attemptLogin(); });
loginButton.addEventListener("click", (e) => { e.preventDefault(); attemptLogin(); });
retryLogin.addEventListener("click",  attemptLogin);

checklist.addEventListener("change", updateProgress);

// Botão "Marcar todos" delegado no container do checklist
checklist.addEventListener("click", (e) => {
  const btn = e.target.closest(".mark-all-btn");
  if (btn) handleMarkAll(Number(btn.dataset.stageIndex));
});

adPattern.addEventListener("input",    suggestName);
lastAdNumber.addEventListener("input", suggestName);
needsSap.addEventListener("change",    () => renderChecklist());
destinoSelect.addEventListener("change", () => renderChecklist());

formatSearch.addEventListener("input",    renderFilteredJobs);
statusFilter.addEventListener("change",   renderFilteredJobs);
sapFilter.addEventListener("change",      renderFilteredJobs);
modalSearch.addEventListener("input",     renderModalHistory);
modalStatusFilter.addEventListener("change", renderModalHistory);
accessSearch.addEventListener("input", renderAccessResults);
accessStatusFilter.addEventListener("change", renderAccessResults);
accessForm.addEventListener("change", updateAccessConditionals);
accessForm.addEventListener("click", (e) => {
  const button = e.target.closest(".field-password-toggle");
  if (button) togglePasswordField(button);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  try { await saveCurrentJob(); } catch (err) { alert(err.message); }
});

accessForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveAccessRecord();
});

formatResults.addEventListener("click",    handleRecordAction);
modalHistoryList.addEventListener("click", handleRecordAction);
accessResults.addEventListener("click", handleAccessAction);

document.querySelector("#openFormattingModule").addEventListener("click", showBiView);
document.querySelector("#openAccessModule").addEventListener("click",     showAccessModule);
document.querySelector("#backToModules").addEventListener("click",        showModuleHome);
document.querySelector("#backToModulesFromAccess").addEventListener("click", showModuleHome);
document.querySelector("#backToBi").addEventListener("click",             showBiView);
document.querySelector("#goToConsulta").addEventListener("click",         showFormattingList);
document.querySelector("#biNewFormatting").addEventListener("click",      startNewFormatting);
document.querySelector("#newFormattingFromList").addEventListener("click", startNewFormatting);
document.querySelector("#backToFormattingList").addEventListener("click", showFormattingList);
document.querySelector("#clearForm").addEventListener("click",            resetForm);
document.querySelector("#clearAccessForm").addEventListener("click",      resetAccessForm);
document.querySelector("#newAccessRecord").addEventListener("click",      resetAccessForm);
document.querySelector("#openPasswordReset").addEventListener("click",    openPasswordResetModal);
document.querySelector("#closePasswordReset").addEventListener("click",   closePasswordResetModal);
document.querySelector("#applyPasswordReset").addEventListener("click",   applyPasswordReset);
document.querySelector("#openAuthCodeModal").addEventListener("click",    openAuthCodeModal);
document.querySelector("#closeAuthCodeModal").addEventListener("click",   closeAuthCodeModal);
document.querySelector("#generateAuthCode").addEventListener("click",     generateInternalAuthCode);
document.querySelector("#applyAuthCode").addEventListener("click",        applyAuthCode);
document.querySelector("#openHistoryModal").addEventListener("click",     openHistoryModal);
document.querySelector("#closeHistoryModal").addEventListener("click",    closeHistoryModal);
document.querySelector("#exportSheet").addEventListener("click",          exportSheet);
document.querySelector("#logoutButton").addEventListener("click",         logout);

historyModal.addEventListener("click", (e) => { if (e.target === historyModal) closeHistoryModal(); });

passwordToggle.addEventListener("click", () => {
  togglePasswordField(passwordToggle);
});

themeToggle.addEventListener("click", () => {
  applyTheme(document.body.classList.contains("theme-light") ? "dark" : "light");
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
applyTheme(localStorage.getItem(themeKey) || "dark");
loginForm.reset();
adminPassword.type = "password";

try {
  if (sessionStorage.getItem(sessionKey) === "active") showApp();
} catch {
  appShell.hidden            = true;
  appShell.style.display     = "none";
  loginScreen.hidden         = false;
  loginScreen.style.display  = "grid";
}
