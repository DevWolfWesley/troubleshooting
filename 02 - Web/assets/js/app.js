let database = null;
let allItems = [];
let selectedCode = null;
let activeDiagnosticStepId = null;
let recentCodes = [];

const elements = {
  baseVersion: document.getElementById("baseVersion"),
  baseDate: document.getElementById("baseDate"),
  searchInput: document.getElementById("searchInput"),
  filterTipo: document.getElementById("filterTipo"),
  filterSistema: document.getElementById("filterSistema"),
  filterSeveridade: document.getElementById("filterSeveridade"),
  clearFilters: document.getElementById("clearFilters"),
  cardsContainer: document.getElementById("cardsContainer"),
  detailContainer: document.getElementById("detailContainer"),
  resultCount: document.getElementById("resultCount"),
  sortIndicator: document.querySelector(".panel-heading .mini-button"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const response = await fetch("./dados_troubleshooting.json");

    if (!response.ok) {
      throw new Error("Não foi possível carregar o arquivo dados_troubleshooting.json.");
    }

    database = await response.json();
    recentCodes = [];
    allItems = sortByCodeAsc(database.itens || []);

    renderMetadata();
    populateFilters();
    bindEvents();
    const initialItems = getCurrentFilteredItems();
    renderList(initialItems);

    if (initialItems.length > 0) {
      selectItem(initialItems[0].codigo, { trackRecent: false });
    }
  } catch (error) {
    showLoadError(error);
  }
}

function renderMetadata() {
  const metadata = database.metadata || {};
  const version = metadata.versao_base || "N/D";
  const baseDate = metadata.data_referencia_base || "";

  elements.baseVersion.textContent = version;
  elements.baseDate.textContent = baseDate ? formatDateShort(baseDate) : "--";
}

function populateFilters() {
  const listas = database.listas || {};

  fillSelect(elements.filterTipo, listas.tipo || []);
  fillSelect(elements.filterSistema, listas.sistema || []);
  fillSelect(elements.filterSeveridade, listas.severidade || []);
}

function fillSelect(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function bindEvents() {
  elements.searchInput.addEventListener("input", applyFilters);
  elements.filterTipo.addEventListener("change", applyFilters);
  elements.filterSistema.addEventListener("change", applyFilters);
  elements.filterSeveridade.addEventListener("change", applyFilters);

  elements.clearFilters.addEventListener("click", () => {
    elements.searchInput.value = "";
    elements.filterTipo.value = "";
    elements.filterSistema.value = "";
    elements.filterSeveridade.value = "";
    applyFilters();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== elements.searchInput) {
      event.preventDefault();
      elements.searchInput.focus();
    }
  });
}

function applyFilters() {
  const filtered = getCurrentFilteredItems();
  renderList(filtered);

  if (!filtered.some((item) => item.codigo === selectedCode)) {
    if (filtered.length > 0) {
      selectItem(filtered[0].codigo);
    } else {
      renderEmptyDetail();
    }
  }
}

function getCurrentFilteredItems() {
  const term = normalizeText(elements.searchInput.value);
  const tipo = elements.filterTipo.value;
  const sistema = elements.filterSistema.value;
  const severidade = elements.filterSeveridade.value;

  const filtered = allItems.filter((item) => {
    const matchesText = !term || normalizeText(item.search_text || "").includes(term);
    const matchesTipo = !tipo || item.identificacao?.tipo === tipo;
    const matchesSistema = !sistema || item.identificacao?.sistema === sistema;
    const matchesSeveridade = !severidade || item.classificacao?.severidade === severidade;

    return matchesText && matchesTipo && matchesSistema && matchesSeveridade;
  });

  return sortWithSessionRecents(filtered);
}

function getCodeNumber(code) {
  const match = String(code || "").match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function compareByCodeAsc(a, b) {
  const na = getCodeNumber(a.codigo);
  const nb = getCodeNumber(b.codigo);

  if (na !== nb) return na - nb;

  return String(a.codigo || "").localeCompare(String(b.codigo || ""));
}

function sortByCodeAsc(items) {
  return [...items].sort(compareByCodeAsc);
}

function sortWithSessionRecents(items) {
  const base = sortByCodeAsc(items);

  if (!recentCodes.length) return base;

  return [...base].sort((a, b) => {
    const ia = recentCodes.indexOf(a.codigo);
    const ib = recentCodes.indexOf(b.codigo);
    const ra = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
    const rb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;

    if (ra !== rb) return ra - rb;

    return compareByCodeAsc(a, b);
  });
}

function updateSortIndicator() {
  if (!elements.sortIndicator) return;

  const iconElement = document.createElement("span");
  iconElement.className = "sort-icon";
  iconElement.textContent = "≡";

  const labelElement = document.createElement("span");
  labelElement.textContent = "Mais recentes";

  elements.sortIndicator.replaceChildren(iconElement, labelElement);
}

function renderList(items) {
  elements.cardsContainer.innerHTML = "";
  elements.resultCount.textContent = `${items.length} item(ns) encontrado(s)`;
  updateSortIndicator();

  if (items.length === 0) {
    elements.cardsContainer.innerHTML = `
      <article class="item-card">
        <div class="item-icon alert">${icon("search")}</div>
        <div class="item-body">
          <div class="item-code">Sem resultados</div>
          <div class="item-title">Nenhum item encontrado</div>
          <div class="card-meta">
            <span class="badge warning">Ajuste os filtros</span>
          </div>
        </div>
      </article>
    `;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    const isAlert = normalizeText(item.identificacao?.tipo).includes("alerta");
    const severityClass = getSeverityClass(item.classificacao?.severidade);

    card.className = `item-card ${item.codigo === selectedCode ? "active" : ""}`;
    card.addEventListener("click", () => selectItem(item.codigo));

    card.innerHTML = `
      <div class="item-icon ${isAlert ? "alert" : ""}">
        ${icon(isAlert ? "sensor" : "thermometer")}
      </div>

      <div class="item-body">
        <div class="item-code">${safe(item.codigo)}</div>
        <div class="item-title">${safe(item.conteudo?.mensagem_ihm_alerta)}</div>

        <div class="card-meta">
          <span class="badge info">${safe(item.identificacao?.tipo)}</span>
          <span class="badge">${safe(item.identificacao?.sistema)}</span>
          <span class="badge ${severityClass}">${safe(item.classificacao?.severidade)}</span>
        </div>
      </div>

      <div class="item-side">
        <span class="chevron">›</span>
      </div>
    `;

    elements.cardsContainer.appendChild(card);
  });
}

function selectItem(code, options = {}) {
  selectedCode = code;
  const item = allItems.find((entry) => entry.codigo === code);

  if (!item) {
    renderEmptyDetail();
    return;
  }

  if (options.trackRecent !== false) {
    recentCodes = [code, ...recentCodes.filter((recentCode) => recentCode !== code)].slice(0, 10);
  }

  const steps = getNormalizedSteps(item);
  const firstActionStep = steps.find((step) => !isSummaryStep(step)) || steps[0];
  activeDiagnosticStepId = firstActionStep?.id_passo || null;

  renderList(getCurrentFilteredItems());
  renderDetail(item);
}

function renderDetail(item) {
  const isAlert = normalizeText(item.identificacao?.tipo).includes("alerta");
  const severityClass = getSeverityClass(item.classificacao?.severidade);

  elements.detailContainer.className = "";

  elements.detailContainer.innerHTML = `
    <div class="detail-header">
      <div class="detail-main-icon ${isAlert ? "alert" : ""}">
        ${icon(isAlert ? "sensor" : "thermometer")}
      </div>

      <div class="detail-title">
        <div class="detail-tags">
          <span class="badge info">${safe(item.identificacao?.tipo)}</span>
          <span class="badge">${safe(item.identificacao?.sistema)}</span>
          <span class="badge ${severityClass}">${safe(item.classificacao?.severidade)}</span>
          <span class="badge">${safe(item.classificacao?.prioridade)}</span>
        </div>

        <h2>${safe(item.codigo)} — ${safe(item.conteudo?.mensagem_ihm_alerta)}</h2>
        <p>${safe(item.conteudo?.descricao_resumida)}</p>
      </div>
    </div>

    <div class="info-strip">
      <div class="info-cell">
        <div class="info-icon">${icon("module")}</div>
        <div>
          <span>Subsistema</span>
          <strong>${safe(item.identificacao?.subsistema)}</strong>
        </div>
      </div>

      <div class="info-cell">
        <div class="info-icon purple">${icon("origin")}</div>
        <div>
          <span>Origem</span>
          <strong>${safe(item.identificacao?.origem)}</strong>
        </div>
      </div>
    </div>

    <div class="content-columns cummins-layout">
      <div class="detail-left">
        <div class="ces-grid">
          <article class="neon-card cause">
            <span>🔗 Causa provável / condição de disparo</span>
            <p>${safe(item.conteudo?.causa)}</p>
          </article>

          <article class="neon-card effect">
            <span>♙ Efeito na máquina/operação</span>
            <p>${safe(item.conteudo?.efeito_maquina_operacao)}</p>
          </article>

          <article class="neon-card solution">
            <span>🔧 Solução macro</span>
            <p>${safe(item.conteudo?.solucao)}</p>
          </article>
        </div>

        <div class="compact-grid">
          <article class="compact-card">
            <span>✓ Critério de validação</span>
            <p>${safe(item.conteudo?.validacao_apos_solucao)}</p>
          </article>

          <article class="compact-card">
            <span>🛠 Ferramentas necessárias</span>
            <p>${safe(item.conteudo?.ferramentas_necessarias)}</p>
          </article>
        </div>

        ${renderCumminsTroubleshooting(item)}
        ${renderAttachments(item.anexos || [])}
      </div>
    </div>
  `;
}

function renderCumminsTroubleshooting(item) {
  const steps = getNormalizedSteps(item);

  if (!steps.length) {
    return `
      <section class="diagnostic-section">
        <h3 class="section-title">${icon("pulse")} Diagnóstico guiado</h3>
        <p>Nenhum passo de diagnóstico cadastrado para este item.</p>
      </section>
    `;
  }

  const hasCumminsModel = steps.some((step) => step.acao || step.condicoes || step.especificacao_pergunta || step.proximo_passo_sim || step.reparo_correcao);

  if (!hasCumminsModel) {
    return renderLegacyDiagnosticSteps(steps);
  }

  return renderInteractiveDiagnosticFlow(item, steps);
}

function renderInteractiveDiagnosticFlow(item, steps) {
  const activeStep = steps.find((step) => step.id_passo === activeDiagnosticStepId) || steps.find((step) => !isSummaryStep(step)) || steps[0];

  return `
    <section class="interactive-diagnosis-section">
      <h3 class="section-title">${icon("pulse")} Diagnóstico guiado</h3>

      <div class="interactive-diagnosis-grid">
        <aside class="step-index-panel">
          <span class="index-title">Roteiro</span>
          ${steps.filter((step) => !isSummaryStep(step)).map((step) => `
            <button
              type="button"
              class="step-index-button ${step.id_passo === activeStep.id_passo ? "active" : ""}"
              onclick="goToDiagnosticStep('${safeAttr(step.id_passo)}')"
            >
              <strong>${safe(step.nivel || step.id_passo)}</strong>
              <span class="step-index-copy">${safe(step.titulo_passo)}</span>
              ${(step.proximo_passo_sim || step.proximo_passo_nao) ? `
                <span class="step-index-chips">
                  ${step.proximo_passo_sim ? `<span class="route-chip yes">SIM: ${safe(step.proximo_passo_sim)}</span>` : ""}
                  ${step.proximo_passo_nao ? `<span class="route-chip no">NÃO: ${safe(step.proximo_passo_nao)}</span>` : ""}
                </span>
              ` : ""}
            </button>
          `).join("")}
        </aside>

        <article class="step-detail-card">
          <div class="step-detail-header">
            <div>
              <span class="step-kicker">${safe(activeStep.nivel)}</span>
              <h4>${safe(activeStep.titulo_passo)}</h4>
            </div>
            <span class="step-id-large">${safe(activeStep.id_passo)}</span>
          </div>

          <div class="context-safety-grid">
            <div class="condition-box">
              <span>Condições</span>
              <p>${safe(activeStep.condicoes)}</p>
            </div>

            <div class="safety-box">
              <span>Segurança</span>
              <p>${safe(activeStep.seguranca)}</p>
            </div>
          </div>

          <div class="action-spec-grid">
            <div>
              <span>Ação</span>
              <p>${safe(activeStep.acao)}</p>
            </div>
            <div>
              <span>Especificação / pergunta</span>
              <p>${safe(activeStep.especificacao_pergunta)}</p>
            </div>
          </div>

          <div class="decision-grid">
            <article class="decision-card yes">
              <span>Se SIM / OK</span>
              <small class="decision-instruction">Executar antes de avançar</small>
              <p>${safe(activeStep.se_sim_ok)}</p>
              <button type="button" onclick="handleNextStep('${safeAttr(activeStep.proximo_passo_sim)}')">
                ${activeStep.proximo_passo_sim ? `Após executar, ir para: ${safe(activeStep.proximo_passo_sim)}` : "Após executar, concluir"}
              </button>
            </article>

            <article class="decision-card no">
              <span>Se NÃO / NOK</span>
              <small class="decision-instruction">Executar antes de avançar</small>
              <p>${safe(activeStep.se_nao_nok)}</p>
              <button type="button" onclick="handleNextStep('${safeAttr(activeStep.proximo_passo_nao)}')">
                ${activeStep.proximo_passo_nao ? `Após executar, ir para: ${safe(activeStep.proximo_passo_nao)}` : "Após executar, concluir"}
              </button>
            </article>
          </div>

          <div class="repair-card">
            <span>Reparo / correção</span>
            <p>${safe(activeStep.reparo_correcao)}</p>
          </div>

          <div class="support-grid">
            <div>
              <span>Ferramentas</span>
              <p>${safe(activeStep.ferramentas)}</p>
            </div>
            <div>
              <span>Observações</span>
              <p>${safe(activeStep.observacoes)}</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  `;
}

function getNormalizedSteps(item) {
  const rawSteps = item.diagnostico_guiado || [];

  return rawSteps.map((step, index) => ({
    codigo_item: step.codigo_item || step.id_falha_alerta || step["Código Item"] || step["ID Falha/Alerta"] || item.codigo,
    id_passo: step.id_passo || step["ID Passo"] || `PASSO-${index + 1}`,
    ordem: Number(step.ordem || step["Ordem"] || index + 1),
    nivel: step.nivel || step["Nível"] || step.ordem || step["Ordem"] || `Passo ${index + 1}`,
    titulo_passo: step.titulo_passo || step["Título do passo"] || step.pergunta_teste || step["Pergunta/Teste"] || "Passo de diagnóstico",
    condicoes: step.condicoes || step["Condições"] || "Não informado",
    acao: step.acao || step["Ação"] || step.pergunta_teste || step["Pergunta/Teste"] || "Não informado",
    especificacao_pergunta: step.especificacao_pergunta || step["Especificação / Pergunta"] || step.resposta_esperada || step["Resposta esperada"] || "Não informado",
    se_sim_ok: step.se_sim_ok || step["Se SIM / OK"] || step.se_ok || step["Se OK"] || "Não informado",
    se_nao_nok: step.se_nao_nok || step["Se NÃO / NOK"] || step.se_nao_ok || step["Se não OK"] || "Não informado",
    proximo_passo_sim: step.proximo_passo_sim || step["Próximo passo SIM"] || "",
    proximo_passo_nao: step.proximo_passo_nao || step.proximo_passo_não || step["Próximo passo NÃO"] || "",
    reparo_correcao: step.reparo_correcao || step["Reparo / Correção"] || "Não informado",
    ferramentas: step.ferramentas || step["Ferramentas"] || "Não informado",
    seguranca: step.seguranca || step["Segurança"] || "Não informado",
    observacoes: step.observacoes || step["Observações"] || "Não informado",
  })).sort((a, b) => a.ordem - b.ordem);
}

function isSummaryStep(step) {
  return normalizeText(step.nivel).includes("resumo") || normalizeText(step.id_passo).includes("-p0");
}

function goToDiagnosticStep(stepId) {
  if (!stepId) return;

  const item = allItems.find((entry) => entry.codigo === selectedCode);
  if (!item) return;

  const steps = getNormalizedSteps(item);
  const step = steps.find((entry) => normalizeText(entry.id_passo) === normalizeText(stepId));

  if (!step) {
    showResolutionMessage(stepId);
    return;
  }

  activeDiagnosticStepId = step.id_passo;
  renderDetail(item);
  const panel = document.querySelector(".interactive-diagnosis-section");
  panel?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleNextStep(nextStep) {
  const normalized = normalizeText(nextStep);

  if (!nextStep || normalized.includes("concluir") || normalized.includes("reparo concluido")) {
    showResolutionMessage("Reparo concluído. Registrar evidências e liberar máquina.");
    return;
  }

  if (normalized.includes("reavaliar") || normalized.includes("manutencao especializada") || normalized.includes("engenharia")) {
    showResolutionMessage(nextStep);
    return;
  }

  goToDiagnosticStep(nextStep);
}

function showResolutionMessage(message) {
  const item = allItems.find((entry) => entry.codigo === selectedCode);
  if (!item) return;

  const container = document.createElement("div");
  container.className = "resolution-toast";
  container.innerHTML = `
    <strong>Encaminhamento</strong>
    <p>${safe(message)}</p>
  `;

  document.body.appendChild(container);
  setTimeout(() => container.classList.add("show"), 10);
  setTimeout(() => {
    container.classList.remove("show");
    setTimeout(() => container.remove(), 250);
  }, 4200);
}

function renderLegacyDiagnosticSteps(steps) {
  const sorted = [...steps].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));

  return `
    <section class="diagnostic-section">
      <h3 class="section-title">${icon("pulse")} Diagnóstico guiado</h3>
      <div class="timeline">
        ${sorted.map((step) => `
          <article class="step-card">
            <div class="step-head">
              <strong class="step-number">Passo ${safe(step.ordem)}</strong>
              <span class="step-id">${safe(step.id_passo)}</span>
            </div>
            <p><strong>Pergunta/Teste:</strong> ${safe(step.acao)}</p>
            <p><strong>Resposta esperada:</strong> ${safe(step.especificacao_pergunta)}</p>
            <p><strong>Se OK:</strong> ${safe(step.se_sim_ok)}</p>
            <p><strong>Se não OK:</strong> ${safe(step.se_nao_nok)}</p>
            <p><strong>Ferramentas:</strong> ${safe(step.ferramentas)}</p>
            <p><strong>Observações:</strong> ${safe(step.observacoes)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderAttachments(attachments) {
  if (!attachments.length) {
    return `
      <section class="attachments-panel">
        <h3 class="section-title">${icon("paperclip")} Anexos e referências</h3>
        <p>Nenhum anexo cadastrado.</p>
      </section>
    `;
  }

  return `
    <section class="attachments-panel">
      <h3 class="section-title">${icon("paperclip")} Anexos e referências</h3>
      <div class="attachments-table-wrap">
        <table class="attachments-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Arquivo</th>
              <th>Abrir</th>
            </tr>
          </thead>
          <tbody>
            ${attachments.map(renderAttachmentRow).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderAttachmentRow(attachment) {
  const path = attachment.arquivo_caminho_relativo || "";
  const href = path ? `./${String(path).replace(/\\/g, "/")}` : "";
  const description = attachment.descricao || attachment.observacao || attachment.observacoes || "";

  return `
    <tr>
      <td>${safe(attachment.titulo)}</td>
      <td>${safe(attachment.tipo)}</td>
      <td>${safe(description)}</td>
      <td class="attachment-file-cell" title="${safeAttr(path)}">${safe(path)}</td>
      <td class="attachment-action-cell">
        ${href
          ? `<a href="${safeAttr(href)}" target="_blank" rel="noopener" class="attachment-open-button" title="Abrir anexo" aria-label="Abrir anexo">↗</a>`
          : `<span class="attachment-open-button disabled" title="Arquivo não informado" aria-label="Arquivo não informado">↗</span>`}
      </td>
    </tr>
  `;
}

function renderEmptyDetail() {
  selectedCode = null;
  activeDiagnosticStepId = null;
  elements.detailContainer.className = "detail-empty";
  elements.detailContainer.innerHTML = `
    <div class="empty-orb"></div>
    <h2>Nenhum item selecionado</h2>
    <p>Selecione um item da lista para visualizar os detalhes.</p>
  `;
}

function showLoadError(error) {
  elements.cardsContainer.innerHTML = "";
  elements.resultCount.textContent = "Erro ao carregar base";

  elements.detailContainer.className = "";
  elements.detailContainer.innerHTML = `
    <div class="load-error">
      <h2>Erro ao carregar dados</h2>
      <p>${safe(error.message)}</p>
      <p>Verifique se o arquivo <strong>dados_troubleshooting.json</strong> está na mesma pasta do index.html.</p>
    </div>
  `;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function safe(value) {
  if (value === null || value === undefined || value === "") {
    return "Não informado";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeAttr(value) {
  return safe(value).replaceAll("`", "");
}

function formatDateShort(value) {
  if (!value) return "--";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function getSeverityClass(severity) {
  const normalized = normalizeText(severity);
  if (normalized.includes("critica")) return "danger";
  if (normalized.includes("alta")) return "warning";
  if (normalized.includes("media")) return "warning";
  return "info";
}

function icon(name) {
  const icons = {
    thermometer: `<svg viewBox="0 0 24 24"><path d="M14 14.76V5a4 4 0 10-8 0v9.76A6 6 0 1014 14.76z"/><path d="M10 5v10"/><path d="M10 19a2 2 0 100-4 2 2 0 000 4z"/></svg>`,
    sensor: `<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0116 0"/><path d="M7 12a5 5 0 0110 0"/><path d="M10 12a2 2 0 014 0"/><path d="M12 14v5"/><path d="M8 19h8"/></svg>`,
    search: `<svg viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35m1.35-5.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"/></svg>`,
    module: `<svg viewBox="0 0 24 24"><path d="M7 7h10v10H7z"/><path d="M4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3"/></svg>`,
    origin: `<svg viewBox="0 0 24 24"><path d="M12 3l8 4v10l-8 4-8-4V7z"/><path d="M12 12l8-5"/><path d="M12 12v9"/><path d="M12 12L4 7"/></svg>`,
    trend: `<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 7-8"/><path d="M14 7h6v6"/></svg>`,
    pulse: `<svg viewBox="0 0 24 24"><path d="M3 12h4l2-7 4 14 2-7h6"/></svg>`,
    paperclip: `<svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 115.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>`,
    file: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>`,
    image: `<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 13l2.5-2.5L14 14l2-2 4 4"/><path d="M8.5 8.5h.01"/></svg>`,
    history: `<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 109-9"/><path d="M3 3v6h6"/><path d="M12 7v5l3 3"/></svg>`,
    table: `<svg viewBox="0 0 24 24"><path d="M3 5h18v14H3z"/><path d="M3 10h18M9 5v14M15 5v14"/></svg>`,
  };
  return icons[name] || icons.file;
}
