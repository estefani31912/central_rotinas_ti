const http = require("http");
const fs   = require("fs");
const path = require("path");
const os   = require("os");

const root = __dirname;
const port = 5173;

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL     = "https://wuvjoezjvnlrnkhswtqm.supabase.co";
const SUPABASE_KEY     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dmpvZXpqdm5scm5raHN3dHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI1OTAxMywiZXhwIjoyMDk0ODM1MDEzfQ.yQBqC8wHIEmSKdSfZVse9dreGgZv9AmyY6AFMEUM2jc";
const TABLE            = "historico_formatacoes";
const BASE_HEADERS     = {
  "Content-Type":  "application/json",
  "apikey":        SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`
};

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

// ─── REFERÊNCIA DOS GRUPOS DO CHECKLIST ───────────────────────────────────────
const GRUPOS = [
  ["Verificar nome atual do computador no domínio","Localizar ou confirmar chave do Windows","Identificar sistema operacional instalado: Windows 10 ou Windows 11","Verificar no AD os nomes das máquinas do setor","Definir novo nome seguindo a sequência do setor","Confirmar se o colaborador usa SAP"],
  ["Baixar a ISO do mesmo sistema operacional identificado","Instalar a imagem do Windows no pendrive","Ejetar o pendrive com segurança","Desligar o computador que será formatado","Conectar o pendrive no computador"],
  ["Acessar a BIOS do computador","Colocar o pendrive como primeiro item na ordem de boot","Iniciar o computador pelo pendrive","Informar chave de ativação quando solicitado","Configurar nome, idioma e dados iniciais do Windows","Concluir acesso à área de trabalho"],
  ["Alterar nome do computador para o nome definido","Adicionar computador ao domínio","Reiniciar após entrada no domínio","Acessar Z:\\Publica\\TI\\Programas\\PADRÃO"],
  ["Instalar Magma","Instalar 7-Zip","Instalar Google Chrome","Instalar Cylance","Instalar Foxit PDF","Instalar Office","Instalar Lightshot","Instalar VNC","Instalar SAP"],
  ["Entrar com o usuário do colaborador","Instalar MicroSIP","Ativar Office no usuário","Instalar Add-ons do SAP no usuário","Validar acessos principais com o colaborador"]
];

function filterGroup(checkedItems, groupIndex) {
  const ref = GRUPOS[groupIndex] || [];
  return checkedItems.filter((item) => ref.includes(item));
}

// ─── MAPEAMENTO JS → BANCO ────────────────────────────────────────────────────
function toRow(job) {
  const checked = job.checkedItems || [];
  return {
    ...(job._dbId ? { id: job._dbId } : {}),
    colaborador:               job.collaborator        || null,
    setor:                     job.department          || null,
    tecnico_responsavel:       job.technician          || null,
    necessita_sap:             job.needsSap            || null,
    padrao_ad:                 job.adPattern           || null,
    ultimo_numero_encontrado:  String(job.lastAdNumber || ""),
    novo_nome_sugerido:        job.newComputerName     || null,
    nome_antigo_dominio:       job.currentComputerName || null,
    sistema_operacional:       job.os                  || null,
    chave_windows:             job.windowsKey          || null,
    observacoes:               job.notes               || null,
    progress:                  job.progress            ?? 0,
    destino:                   job.destino             || null,
    historico_reserva:         job.historicoReserva    || false,
    colaborador_destino:       job.colaboradorDestino  || null,
    checked_items:             checked,
    updated_at:                job.updatedAt           || new Date().toISOString(),
    chk_levantamento:          filterGroup(checked, 0),
    chk_preparacao_pendrive:   filterGroup(checked, 1),
    chk_bios_instalacao:       filterGroup(checked, 2),
    chk_dominio_configuracoes: filterGroup(checked, 3),
    chk_programas_padrao:      filterGroup(checked, 4),
    chk_usuario_colaborador:   filterGroup(checked, 5)
  };
}

// ─── MAPEAMENTO BANCO → JS ────────────────────────────────────────────────────
function fromRow(row) {
  const checkedItems = [
    ...(row.chk_levantamento          || []),
    ...(row.chk_preparacao_pendrive   || []),
    ...(row.chk_bios_instalacao       || []),
    ...(row.chk_dominio_configuracoes || []),
    ...(row.chk_programas_padrao      || []),
    ...(row.chk_usuario_colaborador   || [])
  ];

  return {
    id:                  String(row.id),
    _dbId:               row.id,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at || row.created_at,
    collaborator:        row.colaborador              || "",
    department:          row.setor                   || "",
    technician:          row.tecnico_responsavel      || "",
    needsSap:            row.necessita_sap            || "",
    adPattern:           row.padrao_ad               || "",
    lastAdNumber:        row.ultimo_numero_encontrado || "",
    newComputerName:     row.novo_nome_sugerido       || "",
    currentComputerName: row.nome_antigo_dominio      || "",
    os:                  row.sistema_operacional      || "",
    windowsKey:          row.chave_windows            || "",
    notes:               row.observacoes              || "",
    progress:            row.progress                 ?? 0,
    destino:             row.destino                  || "",
    historicoReserva:    row.historico_reserva        || false,
    colaboradorDestino:  row.colaborador_destino      || "",
    checkedItems
  };
}

// ─── HTTP HELPER (sem dependências externas) ──────────────────────────────────
function supabaseFetch(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(urlPath, SUPABASE_URL);
    const lib     = require("https");
    const body    = options.body ? Buffer.from(options.body, "utf8") : null;

    const headers = {
      ...BASE_HEADERS,
      ...(options.extraHeaders || {}),
      ...(body ? { "Content-Length": body.length } : {})
    };

    const req = lib.request(
      {
        hostname: fullUrl.hostname,
        path:     fullUrl.pathname + fullUrl.search,
        method:   options.method || "GET",
        headers
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── OPERAÇÕES SUPABASE ───────────────────────────────────────────────────────
async function getAllJobs() {
  const res = await supabaseFetch(
    `/rest/v1/${TABLE}?select=*&order=created_at.desc`,
    { method: "GET" }
  );
  if (res.status !== 200) throw new Error(`Supabase GET falhou: ${res.status} — ${JSON.stringify(res.body)}`);
  return (res.body || []).map(fromRow);
}

async function upsertJobs(jobs) {
  const rows = jobs.map(toRow);
  const res  = await supabaseFetch(
    `/rest/v1/${TABLE}`,
    {
      method:       "POST",
      extraHeaders: { "Prefer": "resolution=merge-duplicates,return=representation" },
      body:         JSON.stringify(rows)
    }
  );
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Supabase upsert falhou: ${res.status} — ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

// ─── SERVIDOR HTTP ────────────────────────────────────────────────────────────
function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": mime[".json"], "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

function serveStatic(req, res) {
  const url      = new URL(req.url, "http://localhost");
  const safePath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(root, safePath));

  if (!filePath.startsWith(root)) { res.writeHead(403); res.end("Forbidden"); return; }

  fs.readFile(filePath, (error, data) => {
    if (error) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {

  if (req.url === "/api/jobs" && req.method === "GET") {
    try {
      const jobs = await getAllJobs();
      sendJson(res, 200, jobs);
    } catch (err) {
      console.error("[GET /api/jobs]", err.message);
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (req.url === "/api/jobs" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; if (body.length > 5_000_000) req.destroy(); });
    req.on("end", async () => {
      try {
        const jobs = JSON.parse(body || "[]");
        if (!Array.isArray(jobs)) { sendJson(res, 400, { error: "Formato inválido." }); return; }
        await upsertJobs(jobs);
        sendJson(res, 200, { ok: true });
      } catch (err) {
        console.error("[POST /api/jobs]", err.message);
        sendJson(res, 500, { error: err.message });
      }
    });
    return;
  }

  serveStatic(req, res);
});

server.listen(port, "0.0.0.0", () => {
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => `http://${i.address}:${port}/`);

  console.log(`\n✅ Servidor rodando`);
  console.log(`   Local : http://localhost:${port}/`);
  console.log(`   Rede  : ${ips.join(", ")}`);
  console.log(`   Banco : Supabase → ${TABLE}\n`);
});
