const API = 'https://publica.cnpj.ws/cnpj/';
const SUFRAMA_API = 'https://open.cnpja.com/office/';
const $ = (selector) => document.querySelector(selector);
const form = $('#searchForm');
const input = $('#document');
const result = $('#result');
const loading = $('#loading');
const errorState = $('#errorState');
const toast = $('#toast');
const dialog = $('#helpDialog');
const historyDialog = $('#historyDialog');
const HISTORY_KEY = 'atlas-cnpj-history-v1';
let currentCnpj = '';

function onlyNumbers(value) { return value.replace(/\D/g, ''); }
function normalizeCnpj(value) { return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14); }
function formatCnpj(value) {
  const v = normalizeCnpj(value);
  let formatted = v.slice(0, 2);
  if (v.length > 2) formatted += `.${v.slice(2, 5)}`;
  if (v.length > 5) formatted += `.${v.slice(5, 8)}`;
  if (v.length > 8) formatted += `/${v.slice(8, 12)}`;
  if (v.length > 12) formatted += `-${v.slice(12, 14)}`;
  return formatted;
}
function calculateCnpjDigit(base, weights) {
  const sum = [...base].reduce((total, char, index) => total + (char.charCodeAt(0) - 48) * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}
function isValidCnpj(value) {
  const cnpj = normalizeCnpj(value);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^([0-9])\1{13}$/.test(cnpj)) return false;
  const first = calculateCnpjDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calculateCnpjDigit(`${cnpj.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.slice(12) === `${first}${second}`;
}
function formatCnae(value) {
  const v = String(value || '').padStart(7, '0');
  return `${v.slice(0, 2)}.${v.slice(2, 4)}-${v.slice(4, 5)}-${v.slice(5)}`;
}
function formatDate(value) {
  if (!value) return 'Não informado';
  const [year, month, day] = value.split('-');
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(Number(year), Number(month) - 1, Number(day)));
}
function formatDateTime(value) {
  if (!value) return 'Não informado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return text(value);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
function money(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0); }
function text(value, fallback = 'Não informado') { return value === null || value === undefined || value === '' ? fallback : String(value); }
function escapeHtml(value) { return text(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function initials(name) { return text(name, 'E').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
function set(id, value) { document.getElementById(id).textContent = value; }
function taxRegime(data) {
  const history = data.regime_tributario || data.regimes_tributarios;
  if (Array.isArray(history) && history.length) {
    const latest = [...history].sort((a, b) => Number(b.ano || 0) - Number(a.ano || 0))[0];
    const description = latest.forma_de_tributacao || latest.descricao;
    if (description) return latest.ano ? `${description} (${latest.ano})` : description;
  }
  const record = data.simples;
  if (!record) return 'Não informado pela fonte';
  const yes = (value) => value === true || String(value).toUpperCase() === 'S';
  const no = (value) => value === false || String(value).toUpperCase() === 'N';
  const isMei = yes(record.mei) || yes(record.optante_mei);
  const isSimples = yes(record.simples) || yes(record.optante_simples);
  if (isMei) return 'MEI — Simples Nacional';
  if (isSimples) return 'Simples Nacional';
  if (no(record.simples) || no(record.optante_simples)) return 'Não optante pelo Simples Nacional';
  return 'Não informado pela fonte';
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}
async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast('Informação copiada.');
  } catch {
    showToast(value);
  }
}
function addCopyButtons() {
  const selector = [
    '.company-title h2', '.company-title p', '.status-line > span',
    '.summary-grid strong', '.summary-grid small', '.details dd',
    '.activity b', '.activity p', '.state-registration:not(.state-registration-header) > strong',
    '.state-registration:not(.state-registration-header) > span', '.state-registration:not(.state-registration-header) > small',
    '.partner b', '.partner p', '.location-card h3', '.location-card p',
    '.contact-card b', '.source-card b', '.source-card em', '.suframa-details dd',
    '.suframa-registration strong', '.suframa-registration dd', '.suframa-incentive span',
    '.history-item dd'
  ].join(',');
  document.querySelectorAll(selector).forEach((element) => {
    element.querySelector(':scope > .field-copy')?.remove();
    const value = element.innerText.trim();
    if (!value) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'field-copy';
    button.textContent = 'Copiar';
    button.setAttribute('aria-label', `Copiar ${value}`);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      copyText(value);
    });
    element.classList.add('copyable-value');
    element.appendChild(button);
  });
}

function getHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function updateHistoryCount() {
  set('historyCount', String(getHistory().length));
}

function saveHistory(data) {
  const establishment = data.estabelecimento || {};
  const cnpj = normalizeCnpj(establishment.cnpj || '');
  if (!cnpj) return;
  const record = {
    cnpj,
    legalName: text(data.razao_social),
    tradeName: text(establishment.nome_fantasia),
    consultedAt: new Date().toISOString()
  };
  try {
    const history = getHistory().filter((item) => item.cnpj !== cnpj);
    localStorage.setItem(HISTORY_KEY, JSON.stringify([record, ...history].slice(0, 25)));
    updateHistoryCount();
  } catch {
    showToast('O navegador não permitiu salvar o histórico.');
  }
}

function renderHistory() {
  const history = getHistory();
  const list = $('#historyList');
  list.innerHTML = history.length ? history.map((item) => `<article class="history-item"><div class="history-item-head"><strong>${escapeHtml(item.tradeName === 'Não informado' ? item.legalName : item.tradeName)}</strong><button class="primary" type="button" data-history-cnpj="${escapeHtml(item.cnpj)}">Consultar novamente</button></div><dl><div><dt>CNPJ</dt><dd>${escapeHtml(formatCnpj(item.cnpj))}</dd></div><div><dt>Razão social</dt><dd>${escapeHtml(item.legalName)}</dd></div><div><dt>Nome fantasia</dt><dd>${escapeHtml(item.tradeName)}</dd></div><div><dt>Consultado em</dt><dd>${escapeHtml(formatDateTime(item.consultedAt))}</dd></div></dl></article>`).join('') : '<p class="history-empty">Nenhuma consulta foi salva neste navegador.</p>';
  list.querySelectorAll('[data-history-cnpj]').forEach((button) => button.addEventListener('click', () => {
    input.value = formatCnpj(button.dataset.historyCnpj);
    historyDialog.close();
    form.requestSubmit();
  }));
  $('#clearHistoryButton').disabled = !history.length;
  addCopyButtons();
}

function openHistory(event) {
  event?.preventDefault();
  renderHistory();
  historyDialog.showModal();
}

function resetSuframa() {
  $('#suframaResult').hidden = true;
  $('#suframaRegistrationsList').innerHTML = '';
  $('#suframaFeedback').hidden = false;
  $('#suframaFeedback').className = 'suframa-feedback';
  $('#suframaFeedback').textContent = 'Consultando cadastro SUFRAMA…';
  set('suframaSourceStatus', 'Consultando…');
}

function render(data) {
  const establishment = data.estabelecimento || {};
  currentCnpj = formatCnpj(establishment.cnpj || '');
  saveHistory(data);
  resetSuframa();
  const active = String(establishment.situacao_cadastral).toUpperCase() === 'ATIVA';
  set('companyMonogram', initials(establishment.nome_fantasia || data.razao_social).slice(0, 2));
  set('statusBadge', text(establishment.situacao_cadastral).toUpperCase());
  $('#statusBadge').classList.toggle('inactive', !active);
  set('statusDate', `Situação desde ${formatDate(establishment.data_situacao_cadastral)}`);
  set('companyName', text(data.razao_social));
  set('companyMeta', `${currentCnpj} · ${text(establishment.tipo)} · ${text(establishment.cidade?.nome)}, ${text(establishment.estado?.sigla)}`);
  set('summaryStatus', text(establishment.situacao_cadastral));
  $('#summaryStatus').classList.toggle('positive', active);
  set('summaryStatusDate', `Desde ${formatDate(establishment.data_situacao_cadastral)}`);
  set('summaryCapital', money(data.capital_social));
  set('summarySize', text(data.porte?.descricao));
  set('summaryBranch', text(establishment.tipo));
  set('summaryNature', text(data.natureza_juridica?.descricao));
  set('summaryNatureCode', data.natureza_juridica?.id ? `Código ${data.natureza_juridica.id}` : 'Código não informado');
  set('legalName', text(data.razao_social));
  set('tradeName', text(establishment.nome_fantasia));
  set('openingDate', formatDate(establishment.data_inicio_atividade));
  set('taxRegime', taxRegime(data));
  set('ibgeCode', text(establishment.cidade?.ibge_id));

  const activities = [establishment.atividade_principal, ...(establishment.atividades_secundarias || [])].filter(Boolean);
  $('#activitiesList').innerHTML = activities.slice(0, 8).map((item, index) => `<div class="activity ${index === 0 ? 'primary-activity' : ''}"><span>${index === 0 ? 'Principal' : 'Secundária'}</span><div><b>${escapeHtml(item.subclasse || formatCnae(item.id))}</b><p>${escapeHtml(item.descricao)}</p></div></div>`).join('');

  const registrations = establishment.inscricoes_estaduais || [];
  set('icmsContributor', registrations.some((item) => item.ativo) ? 'Sim' : 'Não');
  set('sintegraSourceStatus', registrations.length ? `${registrations.length} encontrada${registrations.length === 1 ? '' : 's'}` : 'Sem inscrição informada');
  const registrationsHeader = '<div class="state-registration state-registration-header" role="row"><span role="columnheader">Inscrição estadual</span><span role="columnheader">UF</span><span role="columnheader">Tipo</span><span role="columnheader">Situação</span><span role="columnheader">Atualização</span></div>';
  const registrationsRows = registrations.length ? registrations.map((item) => {
    const isPrincipal = item.estado?.sigla === establishment.estado?.sigla;
    return `<div class="state-registration" role="row"><strong role="cell">${escapeHtml(item.inscricao_estadual)}</strong><span role="cell">${escapeHtml(item.estado?.sigla)}</span><span role="cell" class="registration-type" title="Classificação calculada pela UF do estabelecimento">${isPrincipal ? 'Principal' : 'Outra UF'}</span><span role="cell" class="registration-active ${item.ativo ? '' : 'registration-inactive'}">${item.ativo ? 'Ativa' : 'Inativa'}</span><small role="cell">Atualizada em ${formatDate(String(item.atualizado_em || '').slice(0, 10))}</small></div>`;
  }).join('') : '';
  $('#stateRegistrationsList').innerHTML = registrations.length ? registrationsHeader + registrationsRows : '<p class="unavailable">Nenhuma inscrição estadual foi informada pelo SINTEGRA para este estabelecimento.</p>';
  $('#stateRegistrationsList').setAttribute('role', registrations.length ? 'table' : 'group');

  const partners = data.socios || [];
  set('partnersCount', `${partners.length} ${partners.length === 1 ? 'integrante' : 'integrantes'}`);
  $('#partnersList').innerHTML = partners.length ? partners.map((item) => `<div class="partner"><span>${escapeHtml(initials(item.nome))}</span><div><b>${escapeHtml(item.nome)}</b><p>${escapeHtml(item.qualificacao_socio?.descricao)}</p></div></div>`).join('') : '<p class="unavailable">Nenhum integrante informado pela fonte.</p>';

  const street = [establishment.tipo_logradouro, establishment.logradouro, establishment.numero].filter(Boolean).join(' ');
  const locality = [establishment.complemento, establishment.bairro, `${text(establishment.cidade?.nome)} — ${text(establishment.estado?.sigla)}`, establishment.cep].filter(Boolean).map(escapeHtml).join('<br>');
  const mapAddress = [street, establishment.bairro, establishment.cidade?.nome, establishment.estado?.sigla, establishment.cep, 'Brasil'].filter(Boolean).join(', ');
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapAddress)}`;
  set('addressStreet', text(street));
  $('#addressLocality').innerHTML = locality;
  $('#mapLink').href = mapsUrl;
  $('#mapPreviewLink').href = mapsUrl;
  $('#mapFrame').src = `https://www.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed&z=16`;
  const rawPhone = [establishment.ddd1, establishment.telefone1].filter(Boolean).join('');
  const phone = text(rawPhone);
  set('phoneValue', phone);
  $('#phoneLink').href = rawPhone ? `tel:+55${onlyNumbers(rawPhone)}` : '#';
  const email = text(establishment.email);
  set('emailValue', email);
  $('#emailLink').href = establishment.email ? `mailto:${establishment.email}` : '#';
  addCopyButtons();
}

async function consultSuframa(cnpj) {
  const feedback = $('#suframaFeedback');
  try {
    const response = await fetch(SUFRAMA_API + encodeURIComponent(cnpj), { headers: { Accept: 'application/json' } });
    if (normalizeCnpj(currentCnpj) !== cnpj) return;
    if (response.status === 429) throw new Error('O limite gratuito da consulta SUFRAMA foi atingido. Aguarde um minuto e tente novamente.');
    if (!response.ok) throw new Error('A fonte SUFRAMA está temporariamente indisponível.');
    const data = await response.json();
    const registrations = Array.isArray(data.suframa) ? data.suframa : [];
    set('suframaExists', registrations.length ? 'Sim' : 'Não');
    set('suframaCount', String(registrations.length));
    set('suframaCnpj', formatCnpj(data.taxId || cnpj));
    set('suframaUpdatedAt', formatDateTime(data.updated));
    set('suframaSourceStatus', registrations.length ? `${registrations.length} encontrada${registrations.length === 1 ? '' : 's'}` : 'Nenhuma inscrição');
    feedback.textContent = registrations.length ? 'Cadastro SUFRAMA encontrado automaticamente.' : 'Nenhuma inscrição SUFRAMA foi encontrada para este CNPJ.';
    feedback.classList.add(registrations.length ? 'success' : 'warning');
    $('#suframaResult').hidden = false;
    $('#suframaRegistrationsList').innerHTML = registrations.map((registration) => {
      const active = String(registration.status?.text || '').toLowerCase() === 'ativa';
      const incentives = Array.isArray(registration.incentives) ? registration.incentives : [];
      return `<article class="suframa-registration"><div class="suframa-registration-head"><strong>${escapeHtml(registration.number)}</strong><span class="registration-active ${active ? '' : 'registration-inactive'}">${escapeHtml(registration.status?.text)}</span></div><dl class="details"><div><dt>Data do cadastro</dt><dd>${formatDate(registration.since)}</dd></div><div><dt>Projeto aprovado</dt><dd>${registration.approved ? 'Sim' : 'Não'}</dd></div><div><dt>Data de aprovação</dt><dd>${formatDate(registration.approvalDate)}</dd></div><div><dt>Incentivos fiscais</dt><dd>${incentives.length}</dd></div></dl>${incentives.length ? `<div class="suframa-incentives">${incentives.map((item) => `<div class="suframa-incentive"><span>${escapeHtml(item.tribute)} · ${escapeHtml(item.benefit)}</span><small>${escapeHtml(item.purpose)} · ${escapeHtml(item.basis)}</small></div>`).join('')}</div>` : ''}</article>`;
    }).join('');
    addCopyButtons();
  } catch (error) {
    if (normalizeCnpj(currentCnpj) !== cnpj) return;
    feedback.textContent = error instanceof TypeError ? 'Não foi possível acessar a consulta SUFRAMA agora.' : error.message;
    feedback.classList.add('error');
    set('suframaSourceStatus', 'Consulta indisponível');
    addCopyButtons();
  }
}

async function consult(cnpj) {
  result.hidden = true;
  errorState.hidden = true;
  loading.hidden = false;
  try {
    const response = await fetch(API + encodeURIComponent(cnpj), { headers: { Accept: 'application/json' } });
    if (response.status === 404) throw new Error('CNPJ não encontrado na base pública.');
    if (response.status === 429) throw new Error('O limite gratuito de 3 consultas por minuto foi atingido. Aguarde um minuto e tente novamente.');
    if (!response.ok) throw new Error('A fonte gratuita está temporariamente indisponível. Tente novamente em instantes.');
    render(await response.json());
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    consultSuframa(cnpj);
  } catch (error) {
    set('errorMessage', error instanceof TypeError ? 'Não foi possível acessar a fonte gratuita agora. Verifique sua conexão e tente novamente.' : error.message);
    errorState.hidden = false;
    errorState.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } finally {
    loading.hidden = true;
  }
}

input.addEventListener('input', () => { input.value = formatCnpj(input.value); });
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const cnpj = normalizeCnpj(input.value);
  if (!isValidCnpj(cnpj)) { showToast('Digite um CNPJ válido, numérico ou alfanumérico.'); input.focus(); return; }
  consult(cnpj);
});
document.querySelectorAll('[data-cnpj]').forEach((button) => button.addEventListener('click', () => { input.value = button.dataset.cnpj; form.requestSubmit(); }));
$('#copyButton').addEventListener('click', async () => {
  await copyText(currentCnpj);
});
$('#printButton').addEventListener('click', () => window.print());
$('#helpButton').addEventListener('click', () => dialog.showModal());
$('#historyButton').addEventListener('click', openHistory);
$('#historyNavLink').addEventListener('click', openHistory);
$('#historyCloseButton').addEventListener('click', () => historyDialog.close());
$('#clearHistoryButton').addEventListener('click', () => {
  if (!window.confirm('Deseja apagar todo o histórico salvo neste navegador?')) return;
  localStorage.removeItem(HISTORY_KEY);
  updateHistoryCount();
  renderHistory();
  showToast('Histórico apagado.');
});
$('.dialog-close').addEventListener('click', () => dialog.close());
$('.dialog-ok').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
historyDialog.addEventListener('click', (event) => { if (event.target === historyDialog) historyDialog.close(); });
updateHistoryCount();
