/* ============================================================
   Painel do Blog - Jayr Santos Psicanalista
   SPA: login por e-mail/senha, dashboard, CRUD de posts com editor
   WYSIWYG (Quill), busca/filtro, moderação de comentários em árvore.
   Fala direto com o Worker (jayr-blog-api).
   ============================================================ */

const API_BASE = "https://jayr-blog-api.ag5agenciaa2.workers.dev";
const TOKEN_KEY = "jayr_blog_token";

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

async function apiFetch(path, opts = {}) {
  const headers = Object.assign({}, opts.headers || {});
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, Object.assign({}, opts, { headers }));
  if (res.status === 401) {
    clearToken();
    showLogin();
    throw new Error("Sessão expirada");
  }
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

function slugify(str) {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function showLogin() {
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("panel-screen").style.display = "none";
}

function showPanel() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("panel-screen").style.display = "block";
  carregarCategorias();
  carregarDashboard();
  carregarPosts();
  carregarComentarios();
}

// ---- Login ----
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const senha = document.getElementById("login-senha").value;
  const errorEl = document.getElementById("login-error");
  errorEl.hidden = true;

  const res = await apiFetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  }).catch(() => null);

  if (!res || !res.ok) {
    errorEl.textContent = "E-mail ou senha inválidos.";
    errorEl.hidden = false;
    return;
  }

  setToken(res.data.token);
  showPanel();
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  showLogin();
});

// ---- Navegação (sidebar) ----
function goToTab(tab) {
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  const navBtn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
  if (navBtn) navBtn.classList.add("active");
  const panel = document.getElementById(`tab-${tab}`);
  if (panel) panel.classList.add("active");
}

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => goToTab(btn.dataset.tab));
});
document.querySelectorAll("[data-goto-tab]").forEach(btn => {
  btn.addEventListener("click", () => goToTab(btn.dataset.gotoTab));
});

// ---- Editor WYSIWYG (Quill) ----
const quill = new Quill("#editor-quill", {
  theme: "snow",
  placeholder: "Escreva o conteúdo do artigo…",
  modules: {
    toolbar: [
      [{ header: [2, 3, false] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote", "link"],
      ["clean"],
    ],
  },
});

// Mantém o textarea hidden (post-corpo) sempre sincronizado com o HTML do editor
const postCorpoEl = document.getElementById("post-corpo");
quill.on("text-change", () => {
  const html = quill.root.innerHTML;
  postCorpoEl.value = html === "<p><br></p>" ? "" : html;
});

// ---- Dados em cache (para busca/filtro sem refetch) ----
let todosPosts = [];
let todosComentarios = [];
let todasCategorias = [];

// ---- Categorias (compartilhadas com a home do blog via /api/categorias) ----
const NOVA_CATEGORIA_VALUE = "__nova__";

async function carregarCategorias() {
  const res = await apiFetch("/api/admin/categorias").catch(() => null);
  todasCategorias = (res && res.ok && res.data.categorias) || [];
  popularSelectCategorias();
  renderizarCategoriasExtra();
  renderizarCategoriasAdmin();
}

// Checkboxes de categorias adicionais — todas exceto a principal já selecionada.
function renderizarCategoriasExtra(selecionadas) {
  const container = document.getElementById("post-categorias-extra");
  if (!container) return;
  const principal = document.getElementById("post-tag").value;
  const jaSelecionadas = selecionadas || [];
  const opcoes = todasCategorias.filter(c => c.nome !== principal);

  if (!opcoes.length) {
    container.innerHTML = '<span class="categorias-extra-empty">Crie mais categorias para poder marcar aqui.</span>';
    return;
  }

  container.innerHTML = opcoes.map(c => `
    <label>
      <input type="checkbox" value="${escapeAttr(c.nome)}" ${jaSelecionadas.includes(c.nome) ? "checked" : ""} />
      ${escapeHtml(c.nome)}
    </label>
  `).join("");
}

function categoriasExtraSelecionadas() {
  const container = document.getElementById("post-categorias-extra");
  if (!container) return [];
  return [...container.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cb.value);
}

function popularSelectCategorias(selecionar) {
  const select = document.getElementById("post-tag");
  const atual = selecionar || select.value;
  select.innerHTML = todasCategorias.map(c => `<option value="${escapeAttr(c.nome)}">${escapeHtml(c.nome)}</option>`).join("")
    + `<option value="${NOVA_CATEGORIA_VALUE}">+ Adicionar nova categoria…</option>`;
  if (atual && todasCategorias.some(c => c.nome === atual)) select.value = atual;
  else if (todasCategorias.length) select.value = todasCategorias[0].nome;
}

// Seleciona a categoria de um post no <select>, mesmo que ela não exista mais
// na lista atual de categorias (post antigo, categoria removida etc).
function selecionarCategoriaNoForm(tag) {
  const select = document.getElementById("post-tag");
  if (tag && !todasCategorias.some(c => c.nome === tag)) {
    const opt = document.createElement("option");
    opt.value = tag;
    opt.textContent = `${tag} (categoria não listada)`;
    select.insertBefore(opt, select.firstChild);
  }
  select.value = tag || (todasCategorias[0] ? todasCategorias[0].nome : "");
}

document.getElementById("post-tag").addEventListener("change", (e) => {
  const campoNova = document.getElementById("nova-categoria-field");
  const inputNova = document.getElementById("nova-categoria-nome");
  if (e.target.value === NOVA_CATEGORIA_VALUE) {
    campoNova.hidden = false;
    inputNova.focus();
  } else {
    campoNova.hidden = true;
    inputNova.value = "";
  }
  const selecionadasAntes = categoriasExtraSelecionadas();
  renderizarCategoriasExtra(selecionadasAntes.filter(c => c !== e.target.value));
});

// Contador de caracteres do resumo/meta description — ideal 120-160, o Google
// costuma truncar depois disso nos resultados de busca.
const descricaoEl = document.getElementById("post-descricao");
const descricaoCountEl = document.getElementById("post-descricao-count");
function atualizarContadorDescricao() {
  const len = descricaoEl.value.length;
  descricaoCountEl.textContent = `${len}/160`;
  descricaoCountEl.classList.toggle("is-warning", len > 0 && len < 120);
  descricaoCountEl.classList.toggle("is-over", len > 160);
}
descricaoEl.addEventListener("input", atualizarContadorDescricao);

// Cria a categoria (se for nova) e devolve o nome final a usar no post.
// Retorna null se o usuário escolheu "nova categoria" mas não preencheu o nome.
async function resolverCategoriaParaSalvar() {
  const select = document.getElementById("post-tag");
  if (select.value !== NOVA_CATEGORIA_VALUE) return select.value;

  const nome = document.getElementById("nova-categoria-nome").value.trim();
  if (!nome) return null;

  const res = await apiFetch("/api/admin/categorias", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  }).catch(() => null);

  if (!res || !res.ok) return null;

  await carregarCategorias();
  popularSelectCategorias(res.data.categoria.nome);
  document.getElementById("nova-categoria-field").hidden = true;
  document.getElementById("nova-categoria-nome").value = "";
  return res.data.categoria.nome;
}

// ---- Aba Categorias: listar, editar, excluir ----
function renderizarCategoriasAdmin() {
  const container = document.getElementById("categorias-admin-list");
  if (!container) return;

  if (!todasCategorias.length) { container.innerHTML = "<p class=\"empty-state\">Nenhuma categoria ainda.</p>"; return; }

  container.innerHTML = todasCategorias.map(c => {
    const fixa = c.slug === "outros-temas";
    return `
    <div class="categoria-row ${fixa ? "categoria-row--fixa" : ""}" data-id="${c.id}">
      <div class="categoria-row__info">
        <strong>${escapeHtml(c.nome)}</strong>
        <span class="categoria-row__meta">
          ${c.total_posts} artigo${c.total_posts === 1 ? "" : "s"}
          ${fixa ? " · categoria fixa, recebe artigos de categorias excluídas" : ""}
        </span>
      </div>
      <div class="categoria-row__actions">
        ${fixa ? "" : `
          <button class="btn btn--ghost btn--sm" data-action="editar-categoria" data-id="${c.id}">Editar</button>
          <button class="btn btn--danger btn--sm" data-action="excluir-categoria" data-id="${c.id}">Excluir</button>
        `}
      </div>
    </div>
  `;
  }).join("");

  container.querySelectorAll('[data-action="editar-categoria"]').forEach(btn => {
    btn.addEventListener("click", () => iniciarEdicaoCategoria(btn.dataset.id));
  });
  container.querySelectorAll('[data-action="excluir-categoria"]').forEach(btn => {
    btn.addEventListener("click", () => excluirCategoria(btn.dataset.id));
  });
}

function iniciarEdicaoCategoria(id) {
  const categoria = todasCategorias.find(c => String(c.id) === String(id));
  if (!categoria) return;
  const row = document.querySelector(`.categoria-row[data-id="${id}"]`);
  if (!row) return;

  row.innerHTML = `
    <form class="categoria-row__edit-form" data-id="${id}">
      <input type="text" value="${escapeAttr(categoria.nome)}" maxlength="80" required />
      <button type="submit" class="btn btn--sm">Salvar</button>
      <button type="button" class="btn btn--ghost btn--sm" data-action="cancelar-edicao">Cancelar</button>
    </form>
  `;

  row.querySelector("[data-action=\"cancelar-edicao\"]").addEventListener("click", () => renderizarCategoriasAdmin());
  row.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const novoNome = e.target.querySelector("input").value.trim();
    if (!novoNome) return;

    const res = await apiFetch(`/api/admin/categorias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoNome }),
    }).catch(() => null);

    if (res && res.ok) {
      await carregarCategorias();
      carregarPosts();
      carregarDashboard();
    } else {
      alert((res && res.data && res.data.error) || "Erro ao renomear categoria.");
      renderizarCategoriasAdmin();
    }
  });
}

async function excluirCategoria(id) {
  const categoria = todasCategorias.find(c => String(c.id) === String(id));
  if (!categoria) return;

  const aviso = categoria.total_posts > 0
    ? `Excluir "${categoria.nome}"? Os ${categoria.total_posts} artigo(s) dessa categoria serão movidos para "Outros Temas".`
    : `Excluir a categoria "${categoria.nome}"?`;
  if (!confirm(aviso)) return;

  const res = await apiFetch(`/api/admin/categorias/${id}`, { method: "DELETE" }).catch(() => null);
  if (res && res.ok) {
    await carregarCategorias();
    carregarPosts();
    carregarDashboard();
  } else {
    alert((res && res.data && res.data.error) || "Erro ao excluir categoria.");
  }
}

// ---- Dashboard ----
async function carregarDashboard() {
  const container = document.getElementById("dashboard-content");

  const [resPosts, resComentarios] = await Promise.all([
    apiFetch("/api/admin/posts").catch(() => null),
    apiFetch("/api/admin/comentarios").catch(() => null),
  ]);

  const posts = (resPosts && resPosts.ok && resPosts.data.posts) || [];
  const comentarios = (resComentarios && resComentarios.ok && resComentarios.data.comentarios) || [];

  const publicados = posts.filter(p => p.status === "publicado");
  const rascunhos = posts.filter(p => p.status === "rascunho");
  const pendentes = comentarios.filter(c => c.status === "pendente");
  const aprovados = comentarios.filter(c => c.status === "aprovado");

  const contagemPorTag = {};
  publicados.forEach(p => { contagemPorTag[p.tag] = (contagemPorTag[p.tag] || 0) + 1; });
  const tagMaisAtiva = Object.entries(contagemPorTag).sort((a, b) => b[1] - a[1])[0];

  const recentes = [...posts].sort((a, b) => new Date(b.atualizado_em || 0) - new Date(a.atualizado_em || 0)).slice(0, 5);
  const comentariosRecentes = [...comentarios].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)).slice(0, 5);

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card stat-card--ok">
        <div class="stat-card__label">Artigos publicados</div>
        <div class="stat-card__value">${publicados.length}</div>
        <div class="stat-card__sub">${rascunhos.length} em rascunho</div>
      </div>
      <div class="stat-card ${pendentes.length ? "stat-card--warn" : "stat-card--ok"}">
        <div class="stat-card__label">Comentários pendentes</div>
        <div class="stat-card__value">${pendentes.length}</div>
        <div class="stat-card__sub">${aprovados.length} aprovados no total</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Categoria mais ativa</div>
        <div class="stat-card__value" style="font-size:1.3rem;">${tagMaisAtiva ? escapeHtml(tagMaisAtiva[0]) : "—"}</div>
        <div class="stat-card__sub">${tagMaisAtiva ? `${tagMaisAtiva[1]} artigo(s)` : "Nenhum artigo publicado ainda"}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Total de artigos</div>
        <div class="stat-card__value">${posts.length}</div>
        <div class="stat-card__sub">Publicados + rascunhos</div>
      </div>
    </div>

    <h2 class="dash-section-title">Artigos recentes</h2>
    <div class="dash-list">
      ${recentes.length ? recentes.map(p => `
        <div class="dash-list-item">
          <span class="dash-list-item__title">${escapeHtml(p.titulo)}</span>
          <span class="dash-list-item__meta">
            <span class="badge badge--${p.status}">${p.status === "publicado" ? "Publicado" : "Rascunho"}</span>
            ${formatDate(p.atualizado_em)}
          </span>
        </div>
      `).join("") : `<div class="dash-list-item"><span class="dash-list-item__meta">Nenhum artigo ainda.</span></div>`}
    </div>

    <h2 class="dash-section-title">Comentários recentes</h2>
    <div class="dash-list">
      ${comentariosRecentes.length ? comentariosRecentes.map(c => `
        <div class="dash-list-item">
          <span class="dash-list-item__title">${escapeHtml(c.nome)} <span style="font-weight:400; color:#999;">em "${escapeHtml(c.post_titulo)}"</span></span>
          <span class="dash-list-item__meta">
            <span class="badge badge--${c.status}">${c.status}</span>
            ${formatDate(c.criado_em)}
          </span>
        </div>
      `).join("") : `<div class="dash-list-item"><span class="dash-list-item__meta">Nenhum comentário ainda.</span></div>`}
    </div>
  `;

  // Badge de pendentes na sidebar
  const badge = document.getElementById("sidebar-pendentes-badge");
  if (pendentes.length) {
    badge.textContent = pendentes.length;
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

// ---- Lista de posts ----
async function carregarPosts() {
  const container = document.getElementById("posts-list");
  container.innerHTML = "<p class=\"empty-state\">Carregando…</p>";

  const res = await apiFetch("/api/admin/posts").catch(() => null);
  if (!res || !res.ok) { container.innerHTML = "<p class=\"empty-state\">Erro ao carregar artigos.</p>"; return; }

  todosPosts = res.data.posts || [];
  popularFiltroTags();
  renderizarPosts();
}

function popularFiltroTags() {
  const select = document.getElementById("posts-filter-tag");
  const atual = select.value;
  const tags = [...new Set(todosPosts.map(p => p.tag).filter(Boolean))].sort();
  select.innerHTML = `<option value="">Todas as categorias</option>` + tags.map(t => `<option value="${escapeAttr(t)}">${escapeHtml(t)}</option>`).join("");
  select.value = atual;
}

function renderizarPosts() {
  const container = document.getElementById("posts-list");
  const busca = document.getElementById("posts-search").value.trim().toLowerCase();
  const filtroStatus = document.getElementById("posts-filter-status").value;
  const filtroTag = document.getElementById("posts-filter-tag").value;

  const filtrados = todosPosts.filter(p => {
    if (busca && !p.titulo.toLowerCase().includes(busca)) return false;
    if (filtroStatus && p.status !== filtroStatus) return false;
    if (filtroTag && p.tag !== filtroTag) return false;
    return true;
  });

  if (!todosPosts.length) { container.innerHTML = "<p class=\"empty-state\">Nenhum artigo ainda. Crie o primeiro na aba \"Novo Artigo\".</p>"; return; }
  if (!filtrados.length) { container.innerHTML = "<p class=\"empty-state\">Nenhum artigo encontrado com esses filtros.</p>"; return; }

  container.innerHTML = filtrados.map(p => `
    <div class="post-row">
      <div class="post-row__info">
        <strong>${escapeHtml(p.titulo)}</strong>
        <span class="post-row__meta">
          <span class="badge badge--${p.status}">${p.status === "publicado" ? "Publicado" : "Rascunho"}</span>
          <span class="post-row__tag">${escapeHtml(p.tag || "Sem categoria")}</span>
          ${p.publicado_em ? formatDate(p.publicado_em) : "Não publicado"}
        </span>
      </div>
      <div class="post-row__actions">
        <button class="btn btn--ghost btn--sm" data-action="editar" data-id="${p.id}">Editar</button>
        <button class="btn btn--danger btn--sm" data-action="remover" data-id="${p.id}">Remover</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll('[data-action="editar"]').forEach(btn => {
    btn.addEventListener("click", () => editarPost(btn.dataset.id));
  });
  container.querySelectorAll('[data-action="remover"]').forEach(btn => {
    btn.addEventListener("click", () => removerPost(btn.dataset.id));
  });
}

document.getElementById("posts-search").addEventListener("input", renderizarPosts);
document.getElementById("posts-filter-status").addEventListener("change", renderizarPosts);
document.getElementById("posts-filter-tag").addEventListener("change", renderizarPosts);

function editarPost(id) {
  const post = todosPosts.find(p => String(p.id) === String(id));
  if (!post) return;

  goToTab("novo");
  document.getElementById("editor-title").textContent = "Editar artigo";
  document.getElementById("post-id").value = post.id;
  document.getElementById("post-titulo").value = post.titulo;
  document.getElementById("post-slug").value = post.slug;
  document.getElementById("post-descricao").value = post.descricao || "";
  atualizarContadorDescricao();
  selecionarCategoriaNoForm(post.tag);
  const extras = (post.categorias_extra || "").split(",").map(s => s.trim()).filter(Boolean);
  renderizarCategoriasExtra(extras);
  document.getElementById("post-tags").value = post.tags || "";
  document.getElementById("post-capa-url").value = post.capa_url || "";

  const corpo = post.corpo_md || "";
  const isHtml = /^\s*<(p|h[1-6]|ul|ol|blockquote|div)[\s>]/i.test(corpo);
  quill.root.innerHTML = isHtml ? corpo : `<p>${escapeHtml(corpo).replace(/\n/g, "</p><p>")}</p>`;
  postCorpoEl.value = quill.root.innerHTML;

  const preview = document.getElementById("image-preview");
  if (post.capa_url) { preview.src = post.capa_url; preview.style.display = "block"; }
  else { preview.style.display = "none"; }

  document.getElementById("cancel-edit-btn").hidden = false;
}

async function removerPost(id) {
  if (!confirm("Remover este artigo definitivamente?")) return;
  const res = await apiFetch(`/api/admin/posts/${id}`, { method: "DELETE" }).catch(() => null);
  if (res && res.ok) { carregarPosts(); carregarDashboard(); }
}

document.getElementById("cancel-edit-btn").addEventListener("click", () => {
  resetPostForm();
});

function resetPostForm() {
  document.getElementById("editor-title").textContent = "Novo artigo";
  document.getElementById("post-form").reset();
  document.getElementById("post-id").value = "";
  document.getElementById("post-tags").value = "";
  document.getElementById("post-capa-url").value = "";
  popularSelectCategorias();
  renderizarCategoriasExtra();
  document.getElementById("nova-categoria-field").hidden = true;
  document.getElementById("nova-categoria-nome").value = "";
  document.getElementById("image-preview").style.display = "none";
  document.getElementById("cancel-edit-btn").hidden = true;
  quill.setContents([]);
  postCorpoEl.value = "";
  atualizarContadorDescricao();
}

// ---- Upload de imagem de capa ----
document.getElementById("post-capa").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const feedback = document.getElementById("post-feedback");
  feedback.hidden = false;
  feedback.textContent = "Enviando imagem…";

  const form = new FormData();
  form.append("file", file);

  const token = getToken();
  const res = await fetch(`${API_BASE}/api/admin/upload`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
    body: form,
  });
  const data = await res.json().catch(() => null);

  if (res.ok && data && data.url) {
    document.getElementById("post-capa-url").value = data.url;
    const preview = document.getElementById("image-preview");
    preview.src = data.url;
    preview.style.display = "block";
    feedback.hidden = true;
  } else {
    feedback.hidden = false;
    feedback.textContent = "Erro ao enviar imagem.";
  }
});

// ---- Salvar post (publicar/rascunho) ----
document.getElementById("post-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitter = e.submitter;
  const status = submitter ? submitter.dataset.status : "rascunho";

  const id = document.getElementById("post-id").value;
  const titulo = document.getElementById("post-titulo").value.trim();
  const slugInput = document.getElementById("post-slug").value.trim();
  const descricao = document.getElementById("post-descricao").value.trim();
  const capaUrl = document.getElementById("post-capa-url").value;
  const corpoMd = postCorpoEl.value;
  const tagsInput = document.getElementById("post-tags").value.trim();
  const tags = tagsInput
    ? tagsInput.split(",").map(t => t.trim()).filter(Boolean).join(",")
    : "";

  if (!titulo || !corpoMd) return;

  const feedback = document.getElementById("post-feedback");

  const tag = await resolverCategoriaParaSalvar();
  if (!tag) {
    feedback.hidden = false;
    feedback.textContent = "Escolha uma categoria ou informe o nome da nova categoria.";
    return;
  }

  const categoriasExtra = categoriasExtraSelecionadas().join(",");

  const payload = {
    titulo,
    slug: slugInput || slugify(titulo),
    descricao,
    tag,
    tags,
    categorias_extra: categoriasExtra,
    capa_url: capaUrl,
    corpo_md: corpoMd,
    status,
  };

  feedback.hidden = false;
  feedback.textContent = "Salvando…";

  const res = id
    ? await apiFetch(`/api/admin/posts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    : await apiFetch("/api/admin/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

  if (res && res.ok) {
    feedback.hidden = true;
    resetPostForm();
    goToTab("posts");
    carregarPosts();
    carregarDashboard();
  } else {
    feedback.hidden = false;
    feedback.textContent = (res && res.data && res.data.error) || "Erro ao salvar artigo.";
  }
});

// ---- Comentários (moderação) ----
async function carregarComentarios() {
  const container = document.getElementById("comments-admin-list");
  container.innerHTML = "<p class=\"empty-state\">Carregando…</p>";

  const res = await apiFetch("/api/admin/comentarios").catch(() => null);
  if (!res || !res.ok) { container.innerHTML = "<p class=\"empty-state\">Erro ao carregar comentários.</p>"; return; }

  todosComentarios = res.data.comentarios || [];
  renderizarComentarios();
}

function trechoCitado(texto, max) {
  const limpo = String(texto || "").replace(/\s+/g, " ").trim();
  return limpo.length > max ? `${limpo.slice(0, max)}…` : limpo;
}

function renderizarComentarios() {
  const container = document.getElementById("comments-admin-list");
  const busca = document.getElementById("comments-search").value.trim().toLowerCase();
  const filtroStatus = document.getElementById("comments-filter-status").value;

  if (!todosComentarios.length) { container.innerHTML = "<p class=\"empty-state\">Nenhum comentário ainda.</p>"; return; }

  const porId = new Map(todosComentarios.map(c => [c.id, c]));

  const filtrados = todosComentarios.filter(c => {
    if (filtroStatus && c.status !== filtroStatus) return false;
    if (busca) {
      const alvo = `${c.nome} ${c.email || ""} ${c.texto}`.toLowerCase();
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });

  if (!filtrados.length) { container.innerHTML = "<p class=\"empty-state\">Nenhum comentário encontrado com esses filtros.</p>"; return; }

  container.innerHTML = filtrados.map(c => {
    const pai = c.parent_id ? porId.get(c.parent_id) : null;
    const replyQuoteHtml = c.parent_id
      ? (pai
          ? `<div class="comment-row__reply-quote">
               <span class="comment-row__reply-quote-label">↳ em resposta a <strong>${escapeHtml(pai.nome)}</strong>:</span>
               <p class="comment-row__reply-quote-texto">"${escapeHtml(trechoCitado(pai.texto, 160))}"</p>
             </div>`
          : `<div class="comment-row__reply-quote comment-row__reply-quote--orfao">↳ resposta a um comentário removido (#${c.parent_id})</div>`)
      : "";
    return `
    <div class="comment-row">
      <div class="comment-row__top">
        <span>em "<em>${escapeHtml(c.post_titulo)}</em>" · ${formatDate(c.criado_em)}</span>
        <span class="badge badge--${c.status}">${escapeHtml(c.status)}</span>
      </div>
      ${replyQuoteHtml}
      <div class="comment-row__contato">
        <span class="comment-row__contato-item"><strong>Nome:</strong> ${escapeHtml(c.nome)}</span>
        <span class="comment-row__contato-item"><strong>E-mail:</strong> ${c.email ? `<a href="mailto:${escapeAttr(c.email)}">${escapeHtml(c.email)}</a>` : "—"}</span>
        <span class="comment-row__contato-item"><strong>Telefone:</strong> ${c.site ? escapeHtml(c.site) : "—"}</span>
      </div>
      <p class="comment-row__texto">${escapeHtml(c.texto).replace(/\n/g, "<br>")}</p>
      <div class="comment-row__actions">
        ${c.status !== "aprovado" ? `<button class="btn btn--sm" data-action="aprovar" data-id="${c.id}">Aprovar</button>` : ""}
        ${c.status !== "rejeitado" ? `<button class="btn btn--ghost btn--sm" data-action="rejeitar" data-id="${c.id}">Rejeitar</button>` : ""}
        <button class="btn btn--danger btn--sm" data-action="excluir" data-id="${c.id}">Excluir</button>
      </div>
    </div>
  `;
  }).join("");

  container.querySelectorAll('[data-action="aprovar"]').forEach(btn => {
    btn.addEventListener("click", () => moderarComentario(btn.dataset.id, "aprovado"));
  });
  container.querySelectorAll('[data-action="rejeitar"]').forEach(btn => {
    btn.addEventListener("click", () => moderarComentario(btn.dataset.id, "rejeitado"));
  });
  container.querySelectorAll('[data-action="excluir"]').forEach(btn => {
    btn.addEventListener("click", () => excluirComentario(btn.dataset.id));
  });
}

document.getElementById("comments-search").addEventListener("input", renderizarComentarios);
document.getElementById("comments-filter-status").addEventListener("change", renderizarComentarios);

async function moderarComentario(id, status) {
  const res = await apiFetch(`/api/admin/comentarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  }).catch(() => null);
  if (res && res.ok) { carregarComentarios(); carregarDashboard(); }
}

async function excluirComentario(id) {
  if (!confirm("Excluir este comentário definitivamente? Se houver respostas a ele, também serão excluídas.")) return;
  const res = await apiFetch(`/api/admin/comentarios/${id}`, { method: "DELETE" }).catch(() => null);
  if (res && res.ok) { carregarComentarios(); carregarDashboard(); }
}

// ---- Inicialização ----
if (getToken()) {
  showPanel();
} else {
  showLogin();
}
