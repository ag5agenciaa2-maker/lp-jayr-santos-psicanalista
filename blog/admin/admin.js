/* ============================================================
   Painel do Blog - Jayr Santos Psicanalista
   SPA simples: login por e-mail/senha, CRUD de posts, moderação
   de comentários. Fala direto com o Worker (jayr-blog-api).
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

// ---- Tabs ----
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ---- Lista de posts ----
async function carregarPosts() {
  const container = document.getElementById("posts-list");
  container.innerHTML = "<p class=\"empty-state\">Carregando...</p>";

  const res = await apiFetch("/api/admin/posts").catch(() => null);
  if (!res || !res.ok) { container.innerHTML = "<p class=\"empty-state\">Erro ao carregar artigos.</p>"; return; }

  const posts = res.data.posts || [];
  if (!posts.length) { container.innerHTML = "<p class=\"empty-state\">Nenhum artigo ainda. Crie o primeiro na aba \"Novo Artigo\".</p>"; return; }

  container.innerHTML = posts.map(p => `
    <div class="post-row">
      <div class="post-row__info">
        <strong>${p.titulo}</strong>
        <span class="post-row__meta">
          <span class="badge badge--${p.status}">${p.status === "publicado" ? "Publicado" : "Rascunho"}</span>
          ${p.publicado_em ? " · " + formatDate(p.publicado_em) : ""}
        </span>
      </div>
      <div class="post-row__actions">
        <button class="btn btn--ghost" data-action="editar" data-id="${p.id}">Editar</button>
        <button class="btn btn--danger" data-action="remover" data-id="${p.id}">Remover</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll('[data-action="editar"]').forEach(btn => {
    btn.addEventListener("click", () => editarPost(btn.dataset.id, posts));
  });
  container.querySelectorAll('[data-action="remover"]').forEach(btn => {
    btn.addEventListener("click", () => removerPost(btn.dataset.id));
  });
}

function editarPost(id, posts) {
  const post = posts.find(p => String(p.id) === String(id));
  if (!post) return;

  document.querySelector('[data-tab="novo"]').click();
  document.getElementById("editor-title").textContent = "Editar artigo";
  document.getElementById("post-id").value = post.id;
  document.getElementById("post-titulo").value = post.titulo;
  document.getElementById("post-slug").value = post.slug;
  document.getElementById("post-descricao").value = post.descricao || "";
  document.getElementById("post-tag").value = post.tag || "Saúde Mental e Emoções";
  document.getElementById("post-capa-url").value = post.capa_url || "";
  document.getElementById("post-corpo").value = post.corpo_md || "";

  const preview = document.getElementById("image-preview");
  if (post.capa_url) { preview.src = post.capa_url; preview.style.display = "block"; }
  else { preview.style.display = "none"; }

  document.getElementById("cancel-edit-btn").hidden = false;
}

async function removerPost(id) {
  if (!confirm("Remover este artigo definitivamente?")) return;
  const res = await apiFetch(`/api/admin/posts/${id}`, { method: "DELETE" }).catch(() => null);
  if (res && res.ok) carregarPosts();
}

document.getElementById("cancel-edit-btn").addEventListener("click", () => {
  resetPostForm();
});

function resetPostForm() {
  document.getElementById("editor-title").textContent = "Novo artigo";
  document.getElementById("post-form").reset();
  document.getElementById("post-id").value = "";
  document.getElementById("post-capa-url").value = "";
  document.getElementById("post-tag").value = "Saúde Mental e Emoções";
  document.getElementById("image-preview").style.display = "none";
  document.getElementById("cancel-edit-btn").hidden = true;
}

// ---- Upload de imagem de capa ----
document.getElementById("post-capa").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const feedback = document.getElementById("post-feedback");
  feedback.hidden = false;
  feedback.textContent = "Enviando imagem...";

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
  const tag = document.getElementById("post-tag").value.trim() || "Saúde Mental e Emoções";
  const capaUrl = document.getElementById("post-capa-url").value;
  const corpoMd = document.getElementById("post-corpo").value;

  if (!titulo || !corpoMd) return;

  const payload = {
    titulo,
    slug: slugInput || slugify(titulo),
    descricao,
    tag,
    capa_url: capaUrl,
    corpo_md: corpoMd,
    status,
  };

  const feedback = document.getElementById("post-feedback");
  feedback.hidden = false;
  feedback.textContent = "Salvando...";

  const res = id
    ? await apiFetch(`/api/admin/posts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    : await apiFetch("/api/admin/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

  if (res && res.ok) {
    feedback.hidden = true;
    resetPostForm();
    document.querySelector('[data-tab="posts"]').click();
    carregarPosts();
  } else {
    feedback.textContent = (res && res.data && res.data.error) || "Erro ao salvar artigo.";
  }
});

// ---- Comentários (moderação) ----
async function carregarComentarios() {
  const container = document.getElementById("comments-admin-list");
  container.innerHTML = "<p class=\"empty-state\">Carregando...</p>";

  const res = await apiFetch("/api/admin/comentarios").catch(() => null);
  if (!res || !res.ok) { container.innerHTML = "<p class=\"empty-state\">Erro ao carregar comentários.</p>"; return; }

  const comentarios = res.data.comentarios || [];
  if (!comentarios.length) { container.innerHTML = "<p class=\"empty-state\">Nenhum comentário ainda.</p>"; return; }

  container.innerHTML = comentarios.map(c => `
    <div class="comment-row">
      <div class="comment-row__meta">
        <strong>${c.nome}</strong> em "<em>${c.post_titulo}</em>" · ${formatDate(c.criado_em)} ·
        <span class="badge badge--${c.status === 'aprovado' ? 'publicado' : 'rascunho'}">${c.status}</span>
      </div>
      <p class="comment-row__texto">${c.texto}</p>
      <div class="comment-row__actions">
        ${c.status !== "aprovado" ? `<button class="btn" data-action="aprovar" data-id="${c.id}">Aprovar</button>` : ""}
        ${c.status !== "rejeitado" ? `<button class="btn btn--danger" data-action="rejeitar" data-id="${c.id}">Rejeitar</button>` : ""}
      </div>
    </div>
  `).join("");

  container.querySelectorAll('[data-action="aprovar"]').forEach(btn => {
    btn.addEventListener("click", () => moderarComentario(btn.dataset.id, "aprovado"));
  });
  container.querySelectorAll('[data-action="rejeitar"]').forEach(btn => {
    btn.addEventListener("click", () => moderarComentario(btn.dataset.id, "rejeitado"));
  });
}

async function moderarComentario(id, status) {
  const res = await apiFetch(`/api/admin/comentarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  }).catch(() => null);
  if (res && res.ok) carregarComentarios();
}

// ---- Inicialização ----
if (getToken()) {
  showPanel();
} else {
  showLogin();
}
