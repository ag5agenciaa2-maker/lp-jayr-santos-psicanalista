/* ============================================================
   Blog Engine - Jayr Santos Psicanalista
   Consome a API real (Cloudflare Worker + D1), sem hardcode de posts.
   ============================================================ */

const BLOG_API_BASE = "https://jayr-blog-api.ag5agenciaa2.workers.dev";

// Parser Markdown -> HTML (suporta headings, bold/itálico, blockquote,
// listas ul/ol com fechamento correto, links e parágrafos)
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

  container.innerHTML = '<p class="blog-loading">Carregando artigos...</p>';
  const data = await apiGet("/api/posts");

  if (!data || !data.posts || !data.posts.length) {
    container.innerHTML = "<p>Nenhum artigo publicado no momento.</p>";
    return;
  }

  container.innerHTML = data.posts.map(renderBlogCard).join("");
}

function renderBlogCard(post) {
  return `
    <article class="blog-card">
      <div class="blog-card__image-wrap">
        <a href="/blog/artigo?post=${encodeURIComponent(post.slug)}">
          <img src="${post.capa_url || '/assets/jayr-santos-psicanalista-atendimento-sobre.webp'}" alt="${post.titulo}" class="blog-card__image" loading="lazy" />
        </a>
      </div>
      <div class="blog-card__content">
        <div class="blog-card__meta">
          <span class="blog-card__tag">${post.tag || "Psicanálise"}</span>
          <time>${formatDate(post.publicado_em)}</time>
        </div>
        <h2 class="blog-card__title">
          <a href="/blog/artigo?post=${encodeURIComponent(post.slug)}">${post.titulo}</a>
        </h2>
        <p class="blog-card__excerpt">${post.descricao || ""}</p>
        <div class="blog-card__footer">
          <a href="/blog/artigo?post=${encodeURIComponent(post.slug)}" class="blog-card__link">Ler artigo completo <span>→</span></a>
        </div>
      </div>
    </article>
  `;
}

// ---- blog/[categoria]/index.html: lista de posts filtrados por categoria ----
async function renderCategoryList() {
  const container = document.getElementById("category-grid-container");
  if (!container) return;

  const tag = container.dataset.tag;
  container.innerHTML = '<p class="blog-loading">Carregando artigos...</p>';
  const data = await apiGet(`/api/posts?tag=${encodeURIComponent(tag)}`);

  if (!data || !data.posts || !data.posts.length) {
    container.innerHTML = '<p class="blog-empty">Ainda não há artigos publicados nesta categoria. Volte em breve.</p>';
    return;
  }

  container.innerHTML = data.posts.map(renderBlogCard).join("");
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

  bodyEl.innerHTML = markdownToHtml(post.corpo_md);

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

// ---- Comentários ----
async function initComments(slug) {
  const listEl = document.getElementById("comments-list");
  const form = document.getElementById("comment-form");
  const feedbackEl = document.getElementById("comment-feedback");
  if (!listEl) return;

  async function carregarComentarios() {
    const data = await apiGet(`/api/posts/${encodeURIComponent(slug)}/comentarios`);
    const comentarios = (data && data.comentarios) || [];

    if (!comentarios.length) {
      listEl.innerHTML = '<p class="article-comments__empty">Seja o primeiro a comentar.</p>';
      return;
    }

    listEl.innerHTML = comentarios.map(c => `
      <div class="comment-item">
        <div class="comment-item__head">
          <span class="comment-item__nome">${escapeHtml(c.nome)}</span>
          <span class="comment-item__data">${formatDate(c.criado_em)}</span>
        </div>
        <p class="comment-item__texto">${escapeHtml(c.texto)}</p>
      </div>
    `).join("");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  await carregarComentarios();

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = document.getElementById("c-nome").value.trim();
      const texto = document.getElementById("c-texto").value.trim();
      if (!nome || !texto) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const result = await apiPost(`/api/posts/${encodeURIComponent(slug)}/comentarios`, { nome, texto });

      if (feedbackEl) {
        feedbackEl.hidden = false;
        feedbackEl.textContent = result.ok
          ? "Comentário enviado! Ele aparecerá após moderação."
          : "Não foi possível enviar seu comentário. Tente novamente.";
      }
      if (result.ok) form.reset();
      if (submitBtn) submitBtn.disabled = false;
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderBlogList();
  renderCategoryList();
  renderSingleArticle();
});
