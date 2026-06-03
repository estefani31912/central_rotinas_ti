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

// ─── ROTINA DE ACESSOS ───────────────────────────────────────────────────────
const accessStatusFields = [
  ["AD",         "adStatus"],
  ["E-mail",     "emailStatus"],
  ["Roteamento", "routingStatus"],
  ["Office",     "officeStatus"],
  ["MicroSIP",   "microsipStatus"],
  ["SAP",        "sapAccessStatus"],
  ["Zap",        "zapStatus"]
];

const accessHomeView    = document.querySelector("#accessHomeView");
const accessListView    = document.querySelector("#accessListView");
const accessFormView    = document.querySelector("#accessFormView");
const accessForm        = document.querySelector("#accessForm");
const accessId          = document.querySelector("#accessId");
const accessFormTitle   = document.querySelector("#accessFormTitle");
const accessSearch      = document.querySelector("#accessSearch");
const accessStatusFilter    = document.querySelector("#accessStatusFilter");
const accessSituationFilter = document.querySelector("#accessSituationFilter");
const accessSummary     = document.querySelector("#accessSummary");
const accessResults     = document.querySelector("#accessResults");
const passwordResetModal    = document.querySelector("#passwordResetModal");
const sapPasswordResetModal = document.querySelector("#sapPasswordResetModal");
const authCodeModal         = document.querySelector("#authCodeModal");
const passwordResetError    = document.querySelector("#passwordResetError");
const sapPasswordResetError = document.querySelector("#sapPasswordResetError");
const newPasswordValue      = document.querySelector("#newPasswordValue");
const confirmPasswordValue  = document.querySelector("#confirmPasswordValue");
const sapNewPasswordValue   = document.querySelector("#sapNewPasswordValue");
const sapConfirmPasswordValue = document.querySelector("#sapConfirmPasswordValue");
const generatedAuthCode     = document.querySelector("#generatedAuthCode");
const situationSelect       = document.querySelector("#situationSelect");
const accessSituationBadge  = document.querySelector("#accessSituationBadge");
const accessSectionsNormal  = document.querySelector("#accessSectionsNormal");
const accessSectionsDesligado = document.querySelector("#accessSectionsDesligado");
const situationNotice       = document.querySelector("#situationNotice");
const situationNoticeText   = document.querySelector("#situationNoticeText");
const classifyModal         = document.querySelector("#classifyModal");
const classifySearch        = document.querySelector("#classifySearch");
const classifyResults       = document.querySelector("#classifyResults");
const renameUserModal       = document.querySelector("#renameUserModal");
const renameUserValue       = document.querySelector("#renameUserValue");
const renameUserError       = document.querySelector("#renameUserError");

// ── Navegação de acessos ──────────────────────────────────────────────────────
function showAccessHomeView() {
  accessHomeView.hidden = false;
  accessListView.hidden = true;
  accessFormView.hidden = true;
}

function showAccessListView() {
  accessHomeView.hidden = false; // Mantém a toolbar
  accessHomeView.hidden = true;
  accessListView.hidden = false;
  accessFormView.hidden = true;
  updateSituationCounts();
  renderAccessResults();
}

function showAccessFormView() {
  accessHomeView.hidden = true;
  accessListView.hidden = true;
  accessFormView.hidden = false;
  applyAccessSituation(situationSelect.value || "Usuário novo");
}

function showAccessModule() {
  moduleHome.hidden       = true;
  accessModule.hidden     = false;
  formattingModule.hidden = true;
  showAccessHomeView();
  loadAccessRecords();
}

// ── Contadores de situação ────────────────────────────────────────────────────
function updateSituationCounts() {
  document.querySelector("#sitCountAll").textContent        = accessCache.length;
  document.querySelector("#sitCountAtivo").textContent      = accessCache.filter(r => r.situation === "Colaborador ativo").length;
  document.querySelector("#sitCountFerias").textContent     = accessCache.filter(r => r.situation === "Férias").length;
  document.querySelector("#sitCountRealocacao").textContent = accessCache.filter(r => r.situation === "Realocação").length;
  document.querySelector("#sitCountDesligado").textContent  = accessCache.filter(r => r.situation === "Desligado").length;
}

// ── Situação → aparência do formulário ───────────────────────────────────────
function applyAccessSituation(situation) {
  const isDesligado = situation === "Desligado";
  const isFerias    = situation === "Férias";
  const isRealocacao = situation === "Realocação";

  // Correção de exibição: usamos display block/none para garantir que suma
  if (isDesligado) {
    accessSectionsNormal.style.display = "none";
    accessSectionsNormal.hidden = true;
    accessSectionsDesligado.style.display = "block";
    accessSectionsDesligado.hidden = false;
  } else {
    accessSectionsNormal.style.display = "block";
    accessSectionsNormal.hidden = false;
    accessSectionsDesligado.style.display = "none";
    accessSectionsDesligado.hidden = true;
  }

  // Badge
  const badgeMap = {
    "Férias":    { text: "🏖️ Em férias",    cls: "pending" },
    "Realocação":{ text: "🔄 Em realocação", cls: "pending" },
    "Desligado": { text: "🚪 Desligado",     cls: "removed" },
    "Usuário novo": { text: "🆕 Usuário novo", cls: "active" }
  };
  const badge = badgeMap[situation];
  if (badge) {
    accessSituationBadge.textContent = badge.text;
    accessSituationBadge.className   = `status ${badge.cls}`;
    accessSituationBadge.style.display = "";
  } else {
    accessSituationBadge.style.display = "none";
  }

  // Aviso para férias/realocação
  if (isFerias || isRealocacao) {
    situationNoticeText.textContent = isFerias
      ? "ℹ️ Para marcar um colaborador ativo como \"Em férias\", use o botão \"Classificar\" no card do usuário na tela de consulta."
      : "ℹ️ Para marcar um colaborador ativo como \"Em realocação\", use o botão \"Classificar\" no card do usuário na tela de consulta.";
    situationNotice.hidden = false;
  } else {
    situationNotice.hidden = true;
  }

  updateAccessConditionals();
}

// ── Conditionals (campos que aparecem/somem) ──────────────────────────────────
function updateAccessConditionals() {
  const situation = situationSelect?.value || "";
  const isDesligado = situation === "Desligado";

  // Primeiro, ocultamos TUDO que for condicional para limpar a tela
  document.querySelectorAll('[data-conditional]').forEach(b => {
    b.hidden = true;
    b.style.display = "none";
  });

  if (!isDesligado) {
    // Formulário NORMAL (Novo, Ativo, Férias, Realocação)
    const routingVal   = document.querySelector("#routingEnabled")?.value;
    const microsipVal  = document.querySelector("#usesMicrosip")?.value;
    const sapAccessVal = document.querySelector("#usesSapAccess")?.value;
    const zapVal       = document.querySelector("#zapEnabled")?.value;

    if (routingVal === "Sim") {
      document.querySelectorAll('[data-conditional="routing"]').forEach(b => { b.hidden = false; b.style.display = "grid"; });
    }
    if (microsipVal === "Sim") {
      document.querySelectorAll('[data-conditional="microsip"]').forEach(b => { b.hidden = false; b.style.display = "grid"; });
    }
    if (sapAccessVal === "Sim") {
      document.querySelectorAll('[data-conditional="sapAccess"]').forEach(b => { b.hidden = false; b.style.display = "grid"; });
    }
    if (zapVal === "Sim") {
      document.querySelectorAll('[data-conditional="zap"]').forEach(b => { b.hidden = false; b.style.display = "grid"; });
    }
  } else {
    // Formulário DESLIGADO
    const routingDesVal   = document.querySelector("#routingEnabledDes")?.value;
    const microsipDesVal  = document.querySelector("#usesMicrosipDes")?.value;
    const sapAccessDesVal = document.querySelector("#usesSapAccessDes")?.value;
    const zapDesVal       = document.querySelector("#zapEnabledDes")?.value;

    if (routingDesVal === "Sim") {
      document.querySelectorAll('[data-conditional="routingDes"]').forEach(b => { b.hidden = false; b.style.display = "grid"; });
    }
    if (microsipDesVal === "Sim") {
      document.querySelectorAll('[data-conditional="microsipDes"]').forEach(b => { b.hidden = false; b.style.display = "grid"; });
    }
    if (sapAccessDesVal === "Sim") {
      document.querySelectorAll('[data-conditional="sapAccessDes"]').forEach(b => { b.hidden = false; b.style.display = "grid"; });
    }
    if (zapDesVal === "Sim") {
      document.querySelectorAll('[data-conditional="zapDes"]').forEach(b => { b.hidden = false; b.style.display = "grid"; });
    }
  }
}

// ── Persistência ──────────────────────────────────────────────────────────────
function loadAccessRecords() {
  accessCache = JSON.parse(localStorage.getItem(accessStorageKey) || "[]");
  updateSituationCounts();
  renderAccessResults();
}

function persistAccessRecords() {
  localStorage.setItem(accessStorageKey, JSON.stringify(accessCache));
}

function isAccessFieldVisible(field) {
  if (field.disabled) return false;
  const section = field.closest(".access-sections");
  if (section && section.hidden) return false;
  const conditional = field.closest(".conditional-block");
  if (conditional && conditional.hidden) return false;
  return true;
}

function collectVisibleAccessData() {
  const data = {};
  accessForm.querySelectorAll("[name]").forEach((field) => {
    if (!field.name || !isAccessFieldVisible(field)) return;
    if (field.type === "checkbox") {
      data[field.name] = field.checked ? field.value : "Não";
      return;
    }
    if (field.type === "radio") {
      if (field.checked) data[field.name] = field.value;
      return;
    }

    const rawName = field.name.endsWith("[]") ? field.name.slice(0, -2) : field.name;
    const value = field.value.trim();

    if (field.name.endsWith("[]")) {
      if (!data[rawName]) data[rawName] = [];
      if (value) data[rawName].push(value);
      return;
    }

    if (data[rawName] !== undefined) {
      if (!Array.isArray(data[rawName])) {
        data[rawName] = [data[rawName]];
      }
      data[rawName].push(value);
      return;
    }

    data[rawName] = value;
  });
  return data;
}

function createAliasRow(value = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "alias-row";
  wrapper.innerHTML = `
    <input name="aliasReceiver[]" autocomplete="off" placeholder="alias@empresa.com" value="${escapeHtml(value)}">
    <button class="secondary alias-remove" type="button" aria-label="Remover alias">✕</button>
  `;
  return wrapper;
}

function renderAliasFields(values = [""]) {
  const container = document.querySelector("#aliasInputs");
  if (!container) return;
  container.innerHTML = "";
  const aliasValues = Array.isArray(values) ? values : [values];
  const sanitized = aliasValues.filter((value) => value !== undefined && value !== null && String(value).trim() !== "");
  if (!sanitized.length) sanitized.push("");
  sanitized.forEach((value) => {
    container.appendChild(createAliasRow(value));
  });
}

function getAliasValues() {
  return Array.from(document.querySelectorAll("input[name='aliasReceiver[]']")).map((input) => input.value.trim()).filter(Boolean);
}

function addAliasField() {
  const container = document.querySelector("#aliasInputs");
  if (!container) return;
  container.appendChild(createAliasRow(""));
}

function removeAliasField(button) {
  const row = button.closest(".alias-row");
  const container = document.querySelector("#aliasInputs");
  if (!row || !container) return;
  if (container.querySelectorAll(".alias-row").length <= 1) {
    row.querySelector("input").value = "";
    return;
  }
  row.remove();
}

function toggleChecklist(button, fieldName) {
  if (!button) return;
  const pressed = button.getAttribute("aria-pressed") === "true";
  const newState = !pressed;
  button.setAttribute("aria-pressed", newState ? "true" : "false");
  button.textContent = newState ? "☑ Verificado" : "☐ Verificado";
  if (accessForm && accessForm.elements[fieldName]) {
    accessForm.elements[fieldName].value = newState ? "Sim" : "Não";
  }
}

// ── Form data ─────────────────────────────────────────────────────────────────
function accessDataObject() {
  const data = collectVisibleAccessData();
  const now  = new Date().toISOString();
  const existing = accessCache.find((item) => item.id === data.id);

  let situation = data.situation || "";
  
  // Se for Usuário novo ao salvar pela primeira vez, vira Colaborador ativo
  if (!data.id && situation === "Usuário novo") {
    situation = "Colaborador ativo";
  }

  const isDesligado = situation === "Desligado";

  if (isDesligado) {
    data.routingEnabled = document.querySelector("#routingEnabledDes")?.value || "Não";
    data.usesMicrosip   = document.querySelector("#usesMicrosipDes")?.value || "Não";
    data.usesSapAccess  = document.querySelector("#usesSapAccessDes")?.value || "Não";
    data.zapEnabled     = document.querySelector("#zapEnabledDes")?.value || "Não";
  } else {
    data.routingEnabled = document.querySelector("#routingEnabled")?.value || "Não";
    data.usesMicrosip   = document.querySelector("#usesMicrosip")?.value || "Não";
    data.usesSapAccess  = document.querySelector("#usesSapAccess")?.value || "Não";
    data.zapEnabled     = document.querySelector("#zapEnabled")?.value || "Não";
  }

  // Sincronizar status somente quando o usuário NÃO ativou o recurso.
  // (Evita sobrescrever valores preenchidos.)
  if (String(data.routingEnabled).trim() !== "Sim") { data.routingStatus = "Não se aplica"; }
  if (String(data.usesMicrosip).trim()   !== "Sim") { data.microsipStatus = "Não se aplica"; }
  if (String(data.usesSapAccess).trim()  !== "Sim") { data.sapAccessStatus = "Não se aplica"; }
  if (String(data.zapEnabled).trim()     !== "Sim") { data.zapStatus = "Não se aplica"; }

  // Garante que o ID seja mantido ou gerado
  const finalId = data.id || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

  return {
    ...data,
    id: finalId,
    situation,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
}

function resetAccessForm() {
  accessForm.reset();
  accessId.value = "";
  accessFormTitle.textContent = "Novo controle de acesso";
  document.querySelector("#saveAccessButton").textContent = "Salvar acesso";
  accessSituationBadge.style.display = "none";
  situationNotice.hidden = true;
  accessSectionsNormal.hidden    = false;
  accessSectionsDesligado.hidden = true;
  renderAliasFields([""]);
  updateAccessConditionals();
}

function loadAccessRecord(record) {
  resetAccessForm();
  const situation = record.situation || "";
  accessForm.elements.situation.value = situation;
  applyAccessSituation(situation);

  const aliasValues = record.aliasReceiver
    ? Array.isArray(record.aliasReceiver)
      ? record.aliasReceiver
      : [record.aliasReceiver]
    : [];
  renderAliasFields(aliasValues.length ? aliasValues : [""]);

  accessForm.querySelectorAll("[name]").forEach((field) => {
    if (!field.name || !isAccessFieldVisible(field) || field.name.endsWith("[]")) return;
    const rawName = field.name.endsWith("[]") ? field.name.slice(0, -2) : field.name;
    if (typeof record[rawName] === "undefined") return;
    field.value = record[rawName];
  });

  // Retrocompatibilidade: detecta se tinha campos
  const isDesligado = situation === "Desligado";

  if (!record.routingEnabled && (record.formerEmail || record.aliasReceiver)) {
    const field = document.querySelector(isDesligado ? "#routingEnabledDes" : "#routingEnabled");
    if (field) field.value = "Sim";
  }
  if (!record.usesMicrosip  && (record.microsipExtension)) {
    const field = document.querySelector(isDesligado ? "#usesMicrosipDes" : "#usesMicrosip");
    if (field) field.value = "Sim";
  }
  if (!record.usesSapAccess && (record.sapCode || record.sapLicense)) {
    const field = document.querySelector(isDesligado ? "#usesSapAccessDes" : "#usesSapAccess");
    if (field) field.value = "Sim";
  }
  if (!record.zapEnabled    && (record.zapLogin)) {
    const field = document.querySelector(isDesligado ? "#zapEnabledDes" : "#zapEnabled");
    if (field) field.value = "Sim";
  }

  accessFormTitle.textContent = "Editar controle de acesso";
  document.querySelector("#saveAccessButton").textContent = "Atualizar acesso";
  updateAccessConditionals();
  showAccessFormView();
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Apply checklist button states (Magma/Cylance/CRM)
  const applyCheck = (btnId, fieldName, recordVal) => {
    const btn = document.querySelector(btnId);
    const val = recordVal === "Sim";
    if (btn) {
      btn.setAttribute("aria-pressed", val ? "true" : "false");
      btn.textContent = val ? "☑ Verificado" : "☐ Verificado";
    }
    if (accessForm.elements[fieldName]) accessForm.elements[fieldName].value = val ? "Sim" : "Não";
  };

  applyCheck("#magmaChecked", "magmaChecked", record.magmaChecked);
  applyCheck("#cylanceChecked", "cylanceChecked", record.cylanceChecked);
  applyCheck("#crmChecked", "crmChecked", record.crmChecked);
}

function saveAccessRecord() {
  const current = accessDataObject();
  const idx = accessCache.findIndex((item) => item.id === current.id);
  if (idx >= 0) accessCache[idx] = current;
  else accessCache.unshift(current);
  persistAccessRecords();
  updateSituationCounts();
  resetAccessForm();
  showAccessListView();
}

// ── Busca / filtros ───────────────────────────────────────────────────────────
function accessSearchText(record) { return Object.values(record).join(" ").toLowerCase(); }

function accessMatchesStatus(record, status) {
  if (!status) return true;
  return accessStatusFields.some(([, field]) => record[field] === status);
}

function filteredAccessRecords() {
  const query    = accessSearch.value.trim().toLowerCase();
  const status   = accessStatusFilter.value;
  const situation = accessSituationFilter.value;
  return accessCache.filter((record) => {
    const matchesQuery    = !query    || accessSearchText(record).includes(query);
    const matchesStatus   = accessMatchesStatus(record, status);
    const matchesSituation = !situation || record.situation === situation;
    return matchesQuery && matchesStatus && matchesSituation;
  });
}

// ── Cards de resultado ────────────────────────────────────────────────────────
function tagClass(status) {
  if (status === "Ativo")    return "active";
  if (status === "Pendente") return "pending";
  if (status === "Removido") return "removed";
  return "";
}

function situationBadgeHtml(situation) {
  const map = {
    "Férias":         `<span class="badge-reserva" style="background:var(--amber-soft);color:var(--amber)">🏖️ Férias</span>`,
    "Realocação":     `<span class="badge-reserva" style="background:var(--blue-soft);color:var(--blue)">🔄 Realocação</span>`,
    "Desligado":      `<span class="badge-reserva" style="background:color-mix(in srgb,var(--red) 15%,transparent);color:var(--red)">🚪 Desligado</span>`,
    "Usuário novo":   `<span class="badge-reserva" style="background:var(--mint);color:var(--green)">🆕 Usuário novo</span>`
  };
  return map[situation] || "";
}

function renderAccessCard(record) {
  const displayEmail = record.newEmail || record.officeEmail || "não informado";
  const aliasSummary = record.aliasReceiver
    ? Array.isArray(record.aliasReceiver)
      ? record.aliasReceiver.filter(Boolean).join(", ")
      : record.aliasReceiver
    : "—";
  const usageSummary = `Roteamento: ${escapeHtml(record.routingEnabled || "Não")} | Ramal: ${escapeHtml(record.usesMicrosip || "Não")} | SAP: ${escapeHtml(record.usesSapAccess || "Não")} | Responder: ${escapeHtml(record.zapEnabled || "Não")}`;
  const securitySummary = `Magma: ${escapeHtml(record.magmaStatus || "Não se aplica")} (${escapeHtml(record.magmaChecked || "Não")}) | Cylance: ${escapeHtml(record.cylanceStatus || "Não se aplica")} (${escapeHtml(record.cylanceChecked || "Não")}) | CRM verificado: ${escapeHtml(record.crmChecked || "Não")}`;
  
  const tags = accessStatusFields
    .map(([label, field]) => {
      const val = record[field] || "N/A";
      return `<span class="access-tag ${tagClass(val)}">${label}: ${escapeHtml(val)}</span>`;
    })
    .join("");

  const isActive   = record.situation === "Colaborador ativo";
  const classifyBtns = isActive
    ? `<button class="small-button" type="button" data-classify-access="${escapeHtml(record.id)}" data-classify-to="Férias">🏖️ Férias</button>
       <button class="small-button" type="button" data-classify-access="${escapeHtml(record.id)}" data-classify-to="Realocação">🔄 Realocação</button>`
    : (record.situation === "Férias" || record.situation === "Realocação")
      ? `<button class="small-button finish-button" type="button" data-classify-access="${escapeHtml(record.id)}" data-classify-to="Colaborador ativo">↩ Retornar como ativo</button>`
      : "";

  return `
    <article class="history-card">
      <strong>${escapeHtml(record.employee || "Usuário não informado")}</strong>
      ${situationBadgeHtml(record.situation)}
      <span>Setor: ${escapeHtml(record.sector || "não informado")}</span>
      <span>E-mail: ${escapeHtml(displayEmail)}</span>
      <span>Aliases: ${escapeHtml(aliasSummary)}</span>
      <span>${escapeHtml(usageSummary)}</span>
      <span>${escapeHtml(securitySummary)}</span>
      <span>Ramal: ${escapeHtml(record.microsipExtension || "—")} | SAP: ${escapeHtml(record.sapCode || "—")}</span>
      <div class="access-tags">${tags}</div>
      <div class="history-actions">
        <button class="small-button"        type="button" data-edit-access="${escapeHtml(record.id)}">Abrir</button>
        ${classifyBtns}
        <button class="small-button finish-button" type="button" data-remove-access="${escapeHtml(record.id)}">Remover acessos</button>
        <button class="small-button delete-button" type="button" data-delete-access="${escapeHtml(record.id)}">Excluir</button>
      </div>
    </article>
  `;
}

function renderAccessResults() {
  if (!accessResults) return;

  const hasAnyFilter = !!(
    accessSearch.value.trim() ||
    accessSituationFilter.value ||
    accessStatusFilter.value
  );

  // Mostra “vazio” até o usuário buscar/filtrar (evita usuários aparecerem antes da pesquisa)
  if (!hasAnyFilter) {
    accessSummary.textContent = "";
    accessResults.innerHTML = `<div style="text-align:center;padding:60px;color:var(--muted)">
      <p style="font-size:18px">Digite algo na busca ou selecione uma situação para ver os resultados.</p>
    </div>`;
    return;
  }

  const results = filteredAccessRecords();
  accessSummary.textContent = `${results.length} usuário(s) encontrado(s)`;
  accessResults.innerHTML = results.length
    ? results.map(renderAccessCard).join("")
    : `<p class="empty">Nenhum acesso encontrado com esses filtros.</p>`;
}


// ── Ações dos cards ───────────────────────────────────────────────────────────
function removeAllAccess(recordId) {
  const record = accessCache.find((item) => item.id === recordId);
  if (!record) return;
  if (!confirm("Deseja marcar todos os acessos deste usuário como removidos?")) return;
  
  // Marca todos os status como Removido
  accessStatusFields.forEach(([, field]) => { 
    record[field] = "Removido"; 
  });

  // Se o formulário de edição deste registro estiver aberto, atualiza os campos na tela também
  if (accessId.value === recordId) {
    accessStatusFields.forEach(([, field]) => {
      if (accessForm.elements[field]) accessForm.elements[field].value = "Removido";
    });
  }

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
  updateSituationCounts();
  renderAccessResults();
}

function classifyRecord(recordId, newSituation) {
  const record = accessCache.find((item) => item.id === recordId);
  if (!record) return;
  record.situation = newSituation;
  record.updatedAt = new Date().toISOString();
  persistAccessRecords();
  updateSituationCounts();
  renderAccessResults();
}

function handleAccessAction(event) {
  const editBtn     = event.target.closest("[data-edit-access]");
  const removeBtn   = event.target.closest("[data-remove-access]");
  const deleteBtn   = event.target.closest("[data-delete-access]");
  const classifyBtn = event.target.closest("[data-classify-access]");
  const sitCard     = event.target.closest("[data-sit-filter]");

  if (editBtn)     { const r = accessCache.find(i => i.id === editBtn.dataset.editAccess);     if (r) loadAccessRecord(r); }
  if (removeBtn)   removeAllAccess(removeBtn.dataset.removeAccess);
  if (deleteBtn)   deleteAccessRecord(deleteBtn.dataset.deleteAccess);
  if (classifyBtn) classifyRecord(classifyBtn.dataset.classifyAccess, classifyBtn.dataset.classifyTo);
  if (sitCard) {
    accessSituationFilter.value = sitCard.dataset.sitFilter;
    renderAccessResults();
  }
}

// ── Modais auxiliares ─────────────────────────────────────────────────────────
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
function closePasswordResetModal() { passwordResetModal.hidden = true; }

function applyPasswordReset() {
  const newPassword     = newPasswordValue.value.trim();
  const confirmPassword = confirmPasswordValue.value.trim();
  if (!newPassword || !confirmPassword) { passwordResetError.textContent = "Preencha e confirme a nova senha."; return; }
  if (newPassword !== confirmPassword)  { passwordResetError.textContent = "As senhas não conferem."; return; }
  accessForm.elements.emailResetPassword.value = newPassword;
  closePasswordResetModal();
}

function openSapPasswordResetModal() {
  sapPasswordResetError.textContent = "";
  sapNewPasswordValue.value = "";
  sapConfirmPasswordValue.value = "";
  sapPasswordResetModal.hidden = false;
}

function closeSapPasswordResetModal() { sapPasswordResetModal.hidden = true; }

function applySapPasswordReset() {
  const newPassword     = sapNewPasswordValue.value.trim();
  const confirmPassword = sapConfirmPasswordValue.value.trim();
  if (!newPassword || !confirmPassword) { sapPasswordResetError.textContent = "Preencha e confirme a nova senha SAP."; return; }
  if (newPassword !== confirmPassword)  { sapPasswordResetError.textContent = "As senhas não conferem."; return; }
  accessForm.elements.sapChangePassword.value = newPassword;
  closeSapPasswordResetModal();
}

function openAuthCodeModal()  { generatedAuthCode.value = ""; authCodeModal.hidden = false; }
function closeAuthCodeModal() { authCodeModal.hidden = true; }

function generateInternalAuthCode() {
  const digits = Array.from({ length: 8 }, () => String(Math.floor(Math.random() * 10)));
  generatedAuthCode.value = digits.join("");
}

// ── Modal de renomeação de usuário ────────────────────────────────────────────
function openRenameUserModal() {
  renameUserError.textContent = "";
  renameUserValue.value = "";
  renameUserModal.hidden = false;
}

function closeRenameUserModal() {
  renameUserModal.hidden = true;
}

function applyRenameUser() {
  const newName = renameUserValue.value.trim();
  if (!newName) {
    renameUserError.textContent = "Digite um novo nome de usuário.";
    return;
  }
  accessForm.elements.adRename.value = newName;
  closeRenameUserModal();
}

function applyAuthCode() {
  if (!generatedAuthCode.value) generateInternalAuthCode();
  accessForm.elements.authCodes.value = generatedAuthCode.value;
  closeAuthCodeModal();
}

// ── Modal de classificação (Férias / Realocação via consulta) ─────────────────
let _classifyTargetSituation = "";

function openClassifyModal(situation) {
  _classifyTargetSituation = situation;
  document.querySelector("#classifyModalEyebrow").textContent = situation;
  document.querySelector("#classifyModalTitle").textContent   = `Marcar colaborador como "${situation}"`;
  document.querySelector("#classifyModalNote").textContent    =
    `Selecione um colaborador ativo abaixo para classificá-lo como "${situation}".`;
  classifySearch.value = "";
  renderClassifyResults();
  classifyModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeClassifyModal() { classifyModal.hidden = true; document.body.style.overflow = ""; }

function renderClassifyResults() {
  const query = classifySearch.value.trim().toLowerCase();
  const ativos = accessCache.filter(r =>
    r.situation === "Colaborador ativo" &&
    (!query || accessSearchText(r).includes(query))
  );
  classifyResults.innerHTML = ativos.length
    ? ativos.map(r => `
        <article class="history-card" style="cursor:pointer" data-classify-pick="${escapeHtml(r.id)}">
          <strong>${escapeHtml(r.employee || "Sem nome")}</strong>
          <span>${escapeHtml(r.sector || "Setor não informado")}</span>
          <span>${escapeHtml(r.newEmail || "—")}</span>
        </article>`).join("")
    : `<p class="empty">Nenhum colaborador ativo encontrado.</p>`;
}

classifyResults.addEventListener("click", (e) => {
  const card = e.target.closest("[data-classify-pick]");
  if (!card) return;
  classifyRecord(card.dataset.classifyPick, _classifyTargetSituation);
  closeClassifyModal();
});

classifySearch.addEventListener("input", renderClassifyResults);
classifyModal.addEventListener("click", (e) => { if (e.target === classifyModal) closeClassifyModal(); });
document.querySelector("#closeClassifyModal").addEventListener("click", closeClassifyModal);

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
  const isAccessModule = !accessModule.hidden;
  const dataToExport = isAccessModule ? accessCache : jobsCache;

  if (!dataToExport.length) { alert("Ainda não há registros para exportar."); return; }
  if (typeof XLSX === "undefined") { alert("Biblioteca de exportação ainda não carregou."); return; }

  const wb  = XLSX.utils.book_new();
  const ws  = {};
  let row = 0;
  let cols = [];

  if (isAccessModule) {
    cols = ["#", "Colaborador", "Setor", "Situação", "E-mail", "Ramal", "SAP", "AD", "Office", "Responder", "Roteamento"];
    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = xlsxCell("Relatório de Acessos", { bold: true, sz: 14, bg: COR_TITULO_BG, fg: COR_TITULO_FG });
    for (let c = 1; c < cols.length; c++) ws[XLSX.utils.encode_cell({ r: row, c })] = xlsxCell("", { bg: COR_TITULO_BG });
    row++;

    cols.forEach((col, c) => ws[XLSX.utils.encode_cell({ r: row, c })] = xlsxCell(col, { bold: true, bg: COR_HEADER_BG, fg: COR_HEADER_FG, center: true }));
    row++;

    dataToExport.forEach((rec, i) => {
      const valores = [
        i + 1, rec.employee || "", rec.sector || "", rec.situation || "", 
        rec.newEmail || rec.officeEmail || "", rec.microsipExtension || "", rec.sapCode || "",
        rec.adStatus || "", rec.officeStatus || "", rec.zapStatus || "", rec.routingStatus || ""
      ];
      valores.forEach((val, c) => ws[XLSX.utils.encode_cell({ r: row, c })] = xlsxCell(val, { bg: i % 2 === 1 ? COR_LINHA_PAR : undefined }));
      row++;
    });
  } else {
    cols = ["#","Colaborador","Nome antigo","Novo nome","Sistema","SAP","Técnico","Progresso","Status","Itens marcados","Entregue para"];
    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = xlsxCell("Relatório de Formatações", { bold: true, sz: 14, bg: COR_TITULO_BG, fg: COR_TITULO_FG });
    for (let c = 1; c < cols.length; c++) ws[XLSX.utils.encode_cell({ r: row, c })] = xlsxCell("", { bg: COR_TITULO_BG });
    row++;

    const grouped = groupByDepartment(jobsCache);
    Object.entries(grouped).forEach(([dept, jobs]) => {
      ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = xlsxCell(`● ${dept}`, { bold: true, sz: 12, bg: COR_SETOR_BG, fg: COR_SETOR_FG });
      for (let c = 1; c < cols.length; c++) ws[XLSX.utils.encode_cell({ r: row, c })] = xlsxCell("", { bg: COR_SETOR_BG });
      row++;

      cols.forEach((col, c) => ws[XLSX.utils.encode_cell({ r: row, c })] = xlsxCell(col, { bold: true, bg: COR_HEADER_BG, fg: COR_HEADER_FG, center: true }));
      row++;

      jobs.forEach((job, i) => {
        const totalItems = allConfiguredItems(job.needsSap, job.destino).length;
        const valores = [i + 1, job.collaborator || "", job.currentComputerName || "", job.newComputerName || "", job.os || "", job.needsSap || "", job.technician || "", `${job.progress}%`, statusFor(job), `${job.checkedItems?.length || 0}/${totalItems}`, job.colaboradorDestino || ""];
        valores.forEach((val, c) => ws[XLSX.utils.encode_cell({ r: row, c })] = xlsxCell(val, { bg: i % 2 === 1 ? COR_LINHA_PAR : undefined }));
        row++;
      });
    });
  }

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

  const sheetName = isAccessModule ? "Acessos" : "Formatações";
  const fileName = isAccessModule ? "relatorio-acessos" : "relatorio-formatacoes";
  
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const now      = new Date();
  const datestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  XLSX.writeFile(wb, `${fileName}-${datestamp}.xlsx`);
}

// ─── LISTENERS ────────────────────────────────────────────────────────────────
loginForm.addEventListener("submit",  (e) => { e.preventDefault(); attemptLogin(); });
loginButton.addEventListener("click", (e) => { e.preventDefault(); attemptLogin(); });
retryLogin.addEventListener("click",  attemptLogin);

checklist.addEventListener("change", updateProgress);
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

accessSearch?.addEventListener("input",            renderAccessResults);
accessStatusFilter?.addEventListener("change",     renderAccessResults);
accessSituationFilter?.addEventListener("change",  renderAccessResults);
accessForm?.addEventListener("change", updateAccessConditionals);

// Listeners para condicionais (Normal e Desligado)
document.querySelector("#routingEnabled")?.addEventListener("change", updateAccessConditionals);
document.querySelector("#usesMicrosip")?.addEventListener("change", updateAccessConditionals);
document.querySelector("#usesSapAccess")?.addEventListener("change", updateAccessConditionals);
document.querySelector("#zapEnabled")?.addEventListener("change", updateAccessConditionals);
document.querySelector("#routingEnabledDes")?.addEventListener("change", updateAccessConditionals);
document.querySelector("#usesMicrosipDes")?.addEventListener("change", updateAccessConditionals);
document.querySelector("#usesSapAccessDes")?.addEventListener("change", updateAccessConditionals);
document.querySelector("#zapEnabledDes")?.addEventListener("change", updateAccessConditionals);

document.addEventListener("click", (e) => {
  const button = e.target.closest(".field-password-toggle");
  if (button) { togglePasswordField(button); return; }

  // Delegated handler: aliases add/remove and checklist toggles
  const addAliasBtn = e.target.closest("#addAliasButton");
  if (addAliasBtn) { e.preventDefault(); addAliasField(); return; }

  const aliasRemove = e.target.closest(".alias-remove");
  if (aliasRemove) { e.preventDefault(); removeAliasField(aliasRemove); return; }

  const checkBtn = e.target.closest(".check-button");
  if (checkBtn) {
    e.preventDefault();
    const id = checkBtn.id || "";
    const fieldName = id === "magmaChecked" ? "magmaChecked" : id === "cylanceChecked" ? "cylanceChecked" : id === "crmChecked" ? "crmChecked" : null;
    toggleChecklist(checkBtn, fieldName);
    return;
  }
});
situationSelect.addEventListener("change", () => applyAccessSituation(situationSelect.value));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  try { await saveCurrentJob(); } catch (err) { alert(err.message); }
});

accessForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  saveAccessRecord();
});

formatResults.addEventListener("click",    handleRecordAction);
modalHistoryList.addEventListener("click", handleRecordAction);
accessResults?.addEventListener("click",    handleAccessAction);

document.querySelector("#openFormattingModule").addEventListener("click", showBiView);
document.querySelector("#openAccessModule").addEventListener("click",     showAccessModule);
document.querySelector("#backToModules").addEventListener("click",        showModuleHome);
document.querySelector("#backToModulesFromAccess").addEventListener("click", showModuleHome);
document.querySelector("#backToAccessList").addEventListener("click",     showAccessListView);
document.querySelector("#backToAccessHome")?.addEventListener("click", showAccessHomeView);
document.querySelector("#newAccessBtn").addEventListener("click", () => { resetAccessForm(); showAccessFormView(); });
document.querySelector("#goToAccessSearch")?.addEventListener("click", showAccessListView);
document.querySelector("#goToAccessNew")?.addEventListener("click", () => { resetAccessForm(); showAccessFormView(); });
document.querySelector("#backToBi").addEventListener("click",             showBiView);
document.querySelector("#goToConsulta").addEventListener("click",         showFormattingList);
document.querySelector("#biNewFormatting").addEventListener("click",      startNewFormatting);
document.querySelector("#newFormattingFromList").addEventListener("click", startNewFormatting);
document.querySelector("#backToFormattingList").addEventListener("click", showFormattingList);
document.querySelector("#clearForm").addEventListener("click",            resetForm);
document.querySelector("#clearAccessForm").addEventListener("click",      resetAccessForm);
document.querySelector("#openPasswordReset").addEventListener("click",    openPasswordResetModal);
document.querySelector("#closePasswordReset").addEventListener("click",   closePasswordResetModal);
document.querySelector("#applyPasswordReset").addEventListener("click",   applyPasswordReset);
document.querySelector("#openSapPasswordReset")?.addEventListener("click", openSapPasswordResetModal);
document.querySelector("#closeSapPasswordReset")?.addEventListener("click", closeSapPasswordResetModal);
document.querySelector("#applySapPasswordReset")?.addEventListener("click", applySapPasswordReset);
document.querySelector("#openAuthCodeModal").addEventListener("click",    openAuthCodeModal);
document.querySelector("#closeAuthCodeModal").addEventListener("click",   closeAuthCodeModal);
document.querySelector("#generateAuthCode").addEventListener("click",     generateInternalAuthCode);
document.querySelector("#applyAuthCode").addEventListener("click",        applyAuthCode);
document.querySelector("#addAliasButton")?.addEventListener("click",      addAliasField);
document.querySelector("#aliasInputs")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".alias-remove");
  if (btn) removeAliasField(btn);
});
document.querySelector("#magmaChecked")?.addEventListener("click", (e) => { e.preventDefault(); toggleChecklist(e.currentTarget, 'magmaChecked'); });
document.querySelector("#cylanceChecked")?.addEventListener("click", (e) => { e.preventDefault(); toggleChecklist(e.currentTarget, 'cylanceChecked'); });
document.querySelector("#crmChecked")?.addEventListener("click", (e) => { e.preventDefault(); toggleChecklist(e.currentTarget, 'crmChecked'); });
document.querySelector("#openRenameUser")?.addEventListener("click", (e) => { e.preventDefault(); openRenameUserModal(); });
document.querySelector("#closeRenameUserModal")?.addEventListener("click",   closeRenameUserModal);
document.querySelector("#applyRenameUser")?.addEventListener("click",       applyRenameUser);
document.querySelector("#openHistoryModal").addEventListener("click",     openHistoryModal);
document.querySelector("#closeHistoryModal").addEventListener("click",    closeHistoryModal);
document.querySelector("#exportSheet").addEventListener("click",          exportSheet);
document.querySelector("#logoutButton").addEventListener("click",         logout);

historyModal.addEventListener("click", (e) => { if (e.target === historyModal) closeHistoryModal(); });
passwordResetModal.addEventListener("click", (e) => { if (e.target === passwordResetModal) closePasswordResetModal(); });
sapPasswordResetModal?.addEventListener("click", (e) => { if (e.target === sapPasswordResetModal) closeSapPasswordResetModal(); });
authCodeModal.addEventListener("click", (e) => { if (e.target === authCodeModal) closeAuthCodeModal(); });
renameUserModal?.addEventListener("click", (e) => { if (e.target === renameUserModal) closeRenameUserModal(); });

passwordToggle.addEventListener("click", () => { togglePasswordField(passwordToggle); });
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
