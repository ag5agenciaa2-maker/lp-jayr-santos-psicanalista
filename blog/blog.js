/* ============================================================
   Blog Engine - Jayr Santos Psicanalista
   Consome a API real (Cloudflare Worker + D1), sem hardcode de posts.
   ============================================================ */

const BLOG_API_BASE = "https://jayr-blog-api.ag5agenciaa2.workers.dev";

// Posts antigos migrados do blog .com preservam a URL original na raiz do
// domínio (ex: /prossiga-a-vida-nao-terminou/), via functions/[slug].js.
// Mantida em sincronia manual com OLD_SLUGS naquele arquivo — só cresce
// quando um post antigo específico é migrado, não é o caminho padrão.
const OLD_SLUGS = new Set([
  "prossiga-a-vida-nao-terminou",
  "quando-o-corpo-grita",
  "as-bets-e-a-dor-psiquica-uma-leitura-do-inconsciente-sobre-as-apostas-online",
  "quando-o-silencio-cansa-ansiedade-feminina-na-meia-idade",
  "quando-a-angustia-fala-a-escuta-psicanalitica-do-sofrimento",
]);

// Posts novos (publicados pelo painel a partir de agora) ganham URL limpa
// e SSR automáticos via functions/blog/[categoria].js — sem precisar de
// nenhuma lista manual. IMPORTANTE: sem barra final — com a pasta blog/
// já existindo fisicamente (blog/index.html), o Cloudflare Pages não
// aciona a Function dinâmica em /blog/algo/ (com barra), só em /blog/algo.
function urlDoPost(slug) {
  return OLD_SLUGS.has(slug) ? `/${encodeURIComponent(slug)}/` : `/blog/${encodeURIComponent(slug)}`;
}

// Detecta se o corpo já é HTML (editor WYSIWYG, posts novos) em vez de
// Markdown (posts antigos, formato legado) — evita reprocessar HTML como texto puro.
function isHtmlContent(str) {
  if (!str) return false;
  return /^\s*<(p|h[1-6]|ul|ol|blockquote|div|figure)[\s>]/i.test(str);
}

function renderPostBody(corpo) {
  return isHtmlContent(corpo) ? corpo : markdownToHtml(corpo);
}

// Parser Markdown -> HTML (suporta headings, bold/itálico, blockquote,
// listas ul/ol com fechamento correto, links e parágrafos)
// Mantido para exibir corretamente os posts publicados antes do editor WYSIWYG.
function markdownToHtml(md) {
  if (!md) return "";
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const htmlParts = [];
  let inUl = false;
  let inOl = false;
  let paragraphBuffer = [];

  function flushParagraph() {
    if (paragraphBuffer.length) {
      htmlParts.push(`<p>${inlineFormat(paragraphBuffer.join(" "))}</p>`);
      paragraphBuffer = [];
    }
  }

  function closeLists() {
    if (inUl) { htmlParts.push("</ul>"); inUl = false; }
    if (inOl) { htmlParts.push("</ol>"); inOl = false; }
  }

  function inlineFormat(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) { flushParagraph(); closeLists(); continue; }

    if (/^### /.test(line)) { flushParagraph(); closeLists(); htmlParts.push(`<h3>${inlineFormat(line.slice(4))}</h3>`); continue; }
    if (/^## /.test(line)) { flushParagraph(); closeLists(); htmlParts.push(`<h2>${inlineFormat(line.slice(3))}</h2>`); continue; }
    if (/^# /.test(line)) { flushParagraph(); closeLists(); htmlParts.push(`<h1>${inlineFormat(line.slice(2))}</h1>`); continue; }

    if (/^> /.test(line)) { flushParagraph(); closeLists(); htmlParts.push(`<blockquote>${inlineFormat(line.slice(2))}</blockquote>`); continue; }

    if (/^[*-] /.test(line)) {
      flushParagraph();
      if (inOl) { htmlParts.push("</ol>"); inOl = false; }
      if (!inUl) { htmlParts.push("<ul>"); inUl = true; }
      htmlParts.push(`<li>${inlineFormat(line.slice(2))}</li>`);
      continue;
    }

    if (/^\d+\. /.test(line)) {
      flushParagraph();
      if (inUl) { htmlParts.push("</ul>"); inUl = false; }
      if (!inOl) { htmlParts.push("<ol>"); inOl = true; }
      htmlParts.push(`<li>${inlineFormat(line.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }

    closeLists();
    paragraphBuffer.push(line);
  }
  flushParagraph();
  closeLists();

  return htmlParts.join("\n");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

async function apiGet(path) {
  const res = await fetch(`${BLOG_API_BASE}${path}`);
  if (!res.ok) return null;
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${BLOG_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
}

// ---- blog/index.html: lista de posts publicados (recentes, todas as categorias) ----
async function renderBlogList() {
  const container = document.getElementById("blog-grid-container");
  if (!container) return;

  const sortSelect = document.getElementById("blog-sort-select");

  async function carregar() {
    const ordenar = sortSelect ? sortSelect.value : "recentes";
    container.innerHTML = '<p class="blog-loading">Carregando artigos...</p>';
    const data = await apiGet(`/api/posts?ordenar=${encodeURIComponent(ordenar)}`);

    if (!data || !data.posts || !data.posts.length) {
      container.innerHTML = "<p>Nenhum artigo publicado no momento.</p>";
      return;
    }

    container.innerHTML = data.posts.map(renderBlogCard).join("");
  }

  if (sortSelect) sortSelect.addEventListener("change", carregar);
  await carregar();
}

// ---- blog/index.html: grid "Explore por tema" — categorias vêm do banco (admin cria dinamicamente) ----
async function renderBlogCategorias() {
  const container = document.getElementById("blog-categories-container");
  if (!container) return;

  const data = await apiGet("/api/categorias");
  const categorias = (data && data.categorias) || [];

  if (!categorias.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = categorias.map(c => `
    <a href="/blog/${encodeURIComponent(c.slug)}/" class="blog-categories__card">
      <span class="blog-categories__name">${escapeHtml(c.nome)}</span>
      <span class="blog-categories__arrow">→</span>
    </a>
  `).join("");
}

function renderBlogCard(post) {
  const href = urlDoPost(post.slug);
  return `
    <article class="blog-card">
      <div class="blog-card__image-wrap">
        <a href="${href}">
          <img src="${post.capa_url || '/assets/jayr-santos-psicanalista-atendimento-sobre.webp'}" alt="${post.titulo}" class="blog-card__image" loading="lazy" />
        </a>
      </div>
      <div class="blog-card__content">
        <div class="blog-card__meta">
          <span class="blog-card__tag">${post.tag || "Psicanálise"}</span>
          <time>${formatDate(post.publicado_em)}</time>
        </div>
        <h2 class="blog-card__title">
          <a href="${href}">${post.titulo}</a>
        </h2>
        <p class="blog-card__excerpt">${post.descricao || ""}</p>
        <div class="blog-card__footer">
          <a href="${href}" class="blog-card__link">Ler artigo completo <span>→</span></a>
          <span class="blog-card__comments">${comentariosIconHtml()} ${Number(post.total_comentarios) || 0}</span>
        </div>
      </div>
    </article>
  `;
}

function comentariosIconHtml() {
  return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
}

// ---- blog/[categoria]/index.html: lista de posts filtrados por categoria ----
async function renderCategoryList() {
  const container = document.getElementById("category-grid-container");
  if (!container) return;

  const tag = container.dataset.tag;
  const sortSelect = document.getElementById("blog-sort-select");

  async function carregar() {
    const ordenar = sortSelect ? sortSelect.value : "recentes";
    container.innerHTML = '<p class="blog-loading">Carregando artigos...</p>';
    const data = await apiGet(`/api/posts?tag=${encodeURIComponent(tag)}&ordenar=${encodeURIComponent(ordenar)}`);

    if (!data || !data.posts || !data.posts.length) {
      container.innerHTML = '<p class="blog-empty">Ainda não há artigos publicados nesta categoria. Volte em breve.</p>';
      return;
    }

    container.innerHTML = data.posts.map(renderBlogCard).join("");
  }

  if (sortSelect) sortSelect.addEventListener("change", carregar);
  await carregar();
}

// ---- artigo.html: post individual + comentários ----
async function renderSingleArticle() {
  const bodyEl = document.getElementById("article-body");
  if (!bodyEl) return;

  // Páginas SSR (posts antigos servidos via Pages Function, URL limpa na raiz)
  // já vêm com o HTML do artigo pronto — só falta inicializar os comentários.
  if (document.body.dataset.ssr === "true") {
    const slug = document.body.dataset.slug;
    if (slug) initComments(slug);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("post");

  if (!slug) {
    bodyEl.innerHTML = "<p>Artigo não encontrado.</p>";
    return;
  }

  const data = await apiGet(`/api/posts/${encodeURIComponent(slug)}`);
  if (!data || !data.post) {
    bodyEl.innerHTML = "<p>Artigo não encontrado.</p>";
    return;
  }

  const post = data.post;

  document.title = `${post.titulo} | Blog Jayr Santos Psicanalista`;
  const titleEl = document.getElementById("article-title");
  const dateEl = document.getElementById("article-date");
  const descEl = document.getElementById("article-description");
  const tagEl = document.getElementById("article-tag");
  const coverEl = document.getElementById("article-cover-img");

  if (titleEl) titleEl.textContent = post.titulo;
  if (dateEl) dateEl.textContent = formatDate(post.publicado_em);
  if (descEl) descEl.textContent = post.descricao || "";
  if (tagEl) tagEl.textContent = post.tag || "Psicanálise";
  if (coverEl) {
    coverEl.src = post.capa_url || "/assets/jayr-santos-psicanalista-atendimento-sobre.webp";
    coverEl.alt = post.titulo;
  }

  bodyEl.innerHTML = renderPostBody(post.corpo_md);

  injectSchemaOrg(post, slug);
  initComments(slug);
}

function injectCanonical(fullUrl) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = fullUrl;
}

function injectSchemaOrg(post, slug) {
  const fullUrl = `${window.location.origin}/blog/artigo?post=${encodeURIComponent(slug)}`;
  injectCanonical(fullUrl);
  const imageUrl = (post.capa_url || "").startsWith("http")
    ? post.capa_url
    : `${window.location.origin}${post.capa_url || "/assets/jayr-santos-psicanalista-atendimento-sobre.webp"}`;

  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "mainEntityOfPage": { "@type": "WebPage", "@id": fullUrl },
    "headline": post.titulo,
    "description": post.descricao,
    "image": [imageUrl],
    "datePublished": post.publicado_em,
    "dateModified": post.atualizado_em || post.publicado_em,
    "author": {
      "@type": "Person",
      "name": post.autor || "Jayr Santos",
      "jobTitle": "Psicanalista Clínico",
      "url": window.location.origin,
    },
    "publisher": {
      "@type": "Organization",
      "name": "Jayr Santos Psicanalista",
      "logo": { "@type": "ImageObject", "url": `${window.location.origin}/assets/logo-jayr-santos-psicanalista.webp` },
    },
  };

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.text = JSON.stringify(schemaJson);
  document.head.appendChild(script);
}

// ---- Comentários (árvore de respostas, estilo WordPress) ----
const COMMENT_STORAGE_KEY = "jayr-blog-comment-author";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function loadSavedAuthor() {
  try {
    const raw = localStorage.getItem(COMMENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveAuthor(nome, email, site) {
  try {
    localStorage.setItem(COMMENT_STORAGE_KEY, JSON.stringify({ nome, email, site }));
  } catch (e) { /* localStorage indisponível — ignora silenciosamente */ }
}

function clearSavedAuthor() {
  try { localStorage.removeItem(COMMENT_STORAGE_KEY); } catch (e) { /* ignora */ }
}

function commentFormFields(idPrefix, saved) {
  const nome = saved ? escapeHtml(saved.nome) : "";
  const email = saved ? escapeHtml(saved.email) : "";
  const site = saved ? escapeHtml(saved.site) : "";
  return `
    <p class="article-comments__notice">O seu endereço de e-mail não será publicado. Campos obrigatórios são marcados com *</p>
    <div class="field">
      <label for="${idPrefix}-nome">Nome *</label>
      <input type="text" id="${idPrefix}-nome" required maxlength="100" value="${nome}" placeholder="Seu nome" />
    </div>
    <div class="field">
      <label for="${idPrefix}-email">E-mail *</label>
      <input type="email" id="${idPrefix}-email" required maxlength="200" value="${email}" placeholder="seu@email.com" />
    </div>
    <div class="field">
      <label for="${idPrefix}-site">Telefone (opcional)</label>
      <input type="tel" id="${idPrefix}-site" maxlength="30" value="${site}" placeholder="(21) 90000-0000" />
    </div>
    <div class="field">
      <label for="${idPrefix}-texto">Comentário *</label>
      <textarea id="${idPrefix}-texto" rows="3" required maxlength="2000" placeholder="Escreva seu comentário..."></textarea>
    </div>
    <label class="article-comments__save-check">
      <input type="checkbox" id="${idPrefix}-salvar" ${saved ? "checked" : ""} />
      Salvar meus dados neste navegador para a próxima vez que eu comentar.
    </label>
  `;
}

async function submitComment({ slug, parentId, idPrefix, container, onSuccess }) {
  const nome = document.getElementById(`${idPrefix}-nome`).value.trim();
  const email = document.getElementById(`${idPrefix}-email`).value.trim();
  const site = document.getElementById(`${idPrefix}-site`).value.trim();
  const texto = document.getElementById(`${idPrefix}-texto`).value.trim();
  const salvar = document.getElementById(`${idPrefix}-salvar`).checked;

  if (!nome || !email || !texto) return { ok: false, mensagem: "Preencha os campos obrigatórios." };

  const body = { nome, email, texto };
  if (site) body.site = site;
  if (parentId) body.parent_id = parentId;

  const result = await apiPost(`/api/posts/${encodeURIComponent(slug)}/comentarios`, body);

  if (result.ok) {
    if (salvar) saveAuthor(nome, email, site);
    else clearSavedAuthor();
  }

  return result;
}

function renderCommentNode(comment, childrenByParent, slug, depth) {
  const filhos = childrenByParent.get(comment.id) || [];

  return `
    <div class="comment-item" data-comment-id="${comment.id}" style="margin-left: ${Math.min(depth, 4) * 28}px;">
      <div class="comment-item__head">
        <span class="comment-item__nome">${escapeHtml(comment.nome)}</span>
        <span class="comment-item__data">${formatDate(comment.criado_em)}</span>
      </div>
      <p class="comment-item__texto">${escapeHtml(comment.texto)}</p>
      <button type="button" class="comment-item__reply-btn" data-reply-to="${comment.id}">Comentar</button>
      <div class="comment-item__reply-form" id="reply-form-${comment.id}" hidden></div>
      ${filhos.map(f => renderCommentNode(f, childrenByParent, slug, depth + 1)).join("")}
    </div>
  `;
}

async function initComments(slug) {
  const listEl = document.getElementById("comments-list");
  const form = document.getElementById("comment-form");
  const feedbackEl = document.getElementById("comment-feedback");
  if (!listEl) return;

  async function carregarComentarios() {
    const data = await apiGet(`/api/posts/${encodeURIComponent(slug)}/comentarios`);
    const comentarios = (data && data.comentarios) || [];

    const countEl = document.getElementById("comments-count");
    if (countEl) {
      countEl.textContent = comentarios.length
        ? `(${comentarios.length})`
        : "";
    }

    if (!comentarios.length) {
      listEl.innerHTML = '<p class="article-comments__empty">Seja o primeiro a comentar.</p>';
      return;
    }

    const childrenByParent = new Map();
    const raizes = [];
    comentarios.forEach(c => {
      if (c.parent_id) {
        if (!childrenByParent.has(c.parent_id)) childrenByParent.set(c.parent_id, []);
        childrenByParent.get(c.parent_id).push(c);
      } else {
        raizes.push(c);
      }
    });

    listEl.innerHTML = raizes.map(c => renderCommentNode(c, childrenByParent, slug, 0)).join("");
    listEl.querySelectorAll("[data-reply-to]").forEach(btn => {
      btn.addEventListener("click", () => toggleReplyForm(btn.dataset.replyTo));
    });
  }

  function toggleReplyForm(parentId) {
    const box = document.getElementById(`reply-form-${parentId}`);
    if (!box) return;

    if (!box.hidden) { box.hidden = true; box.innerHTML = ""; return; }

    // Fecha qualquer outro formulário de resposta aberto
    listEl.querySelectorAll(".comment-item__reply-form").forEach(el => { el.hidden = true; el.innerHTML = ""; });

    const idPrefix = `reply-${parentId}`;
    const saved = loadSavedAuthor();
    box.hidden = false;
    box.innerHTML = `
      <form class="article-comments__form article-comments__form--reply" data-parent-id="${parentId}">
        ${commentFormFields(idPrefix, saved)}
        <div class="article-comments__form-actions">
          <button type="submit" class="btn btn--solid">Comentar</button>
          <button type="button" class="btn btn--ghost" data-cancel-reply>Cancelar</button>
        </div>
        <p class="article-comments__feedback" hidden></p>
      </form>
    `;

    const replyForm = box.querySelector("form");
    box.querySelector("[data-cancel-reply]").addEventListener("click", () => { box.hidden = true; box.innerHTML = ""; });
    replyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = replyForm.querySelector('button[type="submit"]');
      const replyFeedback = replyForm.querySelector(".article-comments__feedback");
      if (submitBtn) submitBtn.disabled = true;

      const result = await submitComment({ slug, parentId: Number(parentId), idPrefix });

      replyFeedback.hidden = false;
      replyFeedback.textContent = result.ok
        ? "Resposta enviada! Ela aparecerá após moderação."
        : "Não foi possível enviar sua resposta. Tente novamente.";
      if (result.ok) replyForm.reset();
      if (submitBtn) submitBtn.disabled = false;
    });
  }

  await carregarComentarios();

  // Pré-preenche o formulário principal com dados salvos, se houver
  if (form) {
    const saved = loadSavedAuthor();
    if (saved) {
      const nomeEl = document.getElementById("c-nome");
      const emailEl = document.getElementById("c-email");
      const siteEl = document.getElementById("c-site");
      const salvarEl = document.getElementById("c-salvar");
      if (nomeEl) nomeEl.value = saved.nome || "";
      if (emailEl) emailEl.value = saved.email || "";
      if (siteEl) siteEl.value = saved.site || "";
      if (salvarEl) salvarEl.checked = true;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const result = await submitComment({ slug, parentId: null, idPrefix: "c" });

      if (feedbackEl) {
        feedbackEl.hidden = false;
        feedbackEl.textContent = result.ok
          ? "Comentário enviado! Ele aparecerá após moderação."
          : (result.data && result.data.error) || "Não foi possível enviar seu comentário. Tente novamente.";
      }
      if (result.ok) {
        const texto = document.getElementById("c-texto");
        if (texto) texto.value = "";
      }
      if (submitBtn) submitBtn.disabled = false;
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderBlogList();
  renderBlogCategorias();
  renderCategoryList();
  renderSingleArticle();
});
