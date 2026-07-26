/* ============================================================
   Blog Engine & Markdown Parser - Jayr Santos Psicanalista
   ============================================================ */

const BLOG_POSTS = [
  'primeiro-artigo',
  'psicanalise-e-relacionamentos'
];

// Utilitário para parse de Frontmatter em Markdown estático
function parseFrontmatter(markdownText) {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = markdownText.match(frontmatterRegex);

  if (!match) {
    return { data: {}, content: markdownText };
  }

  const yamlBlock = match[1];
  const content = match[2];
  const data = {};

  yamlBlock.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      // Remove aspas
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  });

  return { data, content };
}

// Utilitário simples para converter Markdown em HTML
function markdownToHtml(md) {
  let html = md;
  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  // Blockquotes
  html = html.replace(/^> (.*$)/gim, 'blockquote>$1</blockquote>');
  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // List items
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^[0-9]+\. (.*$)/gim, '<li>$1</li>');
  // Paragraphs
  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs.map(p => {
    p = p.trim();
    if (p.startsWith('<h') || p.startsWith('<blockquote') || p.startsWith('<li')) {
      return p;
    }
    return p ? `<p>${p}</p>` : '';
  }).join('\n');

  return html;
}

// Formatar data em PT-BR
function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  return dateStr;
}

// Carregar e renderizar a lista de artigos (blog.html)
async function renderBlogList() {
  const container = document.getElementById('blog-grid-container');
  if (!container) return;

  container.innerHTML = '<p class="blog-loading">Carregando artigos...</p>';
  let cardsHtml = '';

  for (const postSlug of BLOG_POSTS) {
    try {
      const response = await fetch(`content/blog/${postSlug}.md`);
      if (!response.ok) continue;
      const text = await response.text();
      const { data } = parseFrontmatter(text);

      const title = data.title || 'Artigo de Psicanálise';
      const slug = data.slug || postSlug;
      const date = formatDate(data.date);
      const description = data.description || '';
      const coverImage = data.coverImage || 'assets/jayr-santos-psicanalista-atendimento-sobre.webp';
      const tag = data.tags ? data.tags.replace(/\[|\]|"/g, '').split(',')[0] : 'Psicanálise';

      cardsHtml += `
        <article class="blog-card">
          <div class="blog-card__image-wrap">
            <a href="artigo.html?post=${slug}">
              <img src="${coverImage}" alt="${title}" class="blog-card__image" loading="lazy" />
            </a>
          </div>
          <div class="blog-card__content">
            <div class="blog-card__meta">
              <span class="blog-card__tag">${tag}</span>
              <time>${date}</time>
            </div>
            <h2 class="blog-card__title">
              <a href="artigo.html?post=${slug}">${title}</a>
            </h2>
            <p class="blog-card__excerpt">${description}</p>
            <div class="blog-card__footer">
              <a href="artigo.html?post=${slug}" class="blog-card__link">
                Ler artigo completo <span>→</span>
              </a>
            </div>
          </div>
        </article>
      `;
    } catch (e) {
      console.error('Erro ao carregar post:', e);
    }
  }

  container.innerHTML = cardsHtml || '<p>Nenhum artigo encontrado no momento.</p>';
}

// Carregar e renderizar o artigo individual (artigo.html)
async function renderSingleArticle() {
  const urlParams = new URLSearchParams(window.location.search);
  const postSlug = urlParams.get('post') || BLOG_POSTS[0];

  const titleEl = document.getElementById('article-title');
  const metaDateEl = document.getElementById('article-date');
  const descEl = document.getElementById('article-description');
  const coverImgEl = document.getElementById('article-cover-img');
  const bodyEl = document.getElementById('article-body');

  if (!bodyEl) return;

  try {
    const response = await fetch(`content/blog/${postSlug}.md`);
    if (!response.ok) {
      bodyEl.innerHTML = '<p>Artigo não encontrado.</p>';
      return;
    }

    const text = await response.text();
    const { data, content } = parseFrontmatter(text);

    const title = data.title || 'Artigo';
    const date = formatDate(data.date);
    const description = data.description || '';
    const coverImage = data.coverImage || 'assets/jayr-santos-psicanalista-atendimento-sobre.webp';
    const author = data.author || 'Jayr Santos';

    document.title = `${title} | Blog Jayr Santos Psicanalista`;

    if (titleEl) titleEl.textContent = title;
    if (metaDateEl) metaDateEl.textContent = date;
    if (descEl) descEl.textContent = description;
    if (coverImgEl) {
      coverImgEl.src = coverImage;
      coverImgEl.alt = title;
    }

    bodyEl.innerHTML = markdownToHtml(content);

    // Injeção de Schema.org JSON-LD para SEO Semântico (BlogPosting)
    injectSchemaOrg({
      title,
      description,
      datePublished: data.date,
      coverImage,
      author,
      slug: postSlug
    });

  } catch (e) {
    console.error('Erro ao carregar o artigo:', e);
    bodyEl.innerHTML = '<p>Erro ao carregar a publicação.</p>';
  }
}

// Função de Injeção de Schema.org JSON-LD (Rich Snippets)
function injectSchemaOrg(data) {
  const fullUrl = `${window.location.origin}/artigo.html?post=${data.slug}`;
  const imageUrl = data.coverImage.startsWith('http') ? data.coverImage : `${window.location.origin}/${data.coverImage}`;

  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": fullUrl
    },
    "headline": data.title,
    "description": data.description,
    "image": [imageUrl],
    "datePublished": data.datePublished || "2026-07-25",
    "author": {
      "@type": "Person",
      "name": data.author,
      "jobTitle": "Psicanalista Clínico",
      "url": window.location.origin
    },
    "publisher": {
      "@type": "Organization",
      "name": "Jayr Santos Psicanalista",
      "logo": {
        "@type": "ImageObject",
        "url": `${window.location.origin}/assets/logo-jayr-santos-psicanalista.webp`
      }
    }
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(schemaJson);
  document.head.appendChild(script);
}

// Inicializar na carga do DOM
document.addEventListener('DOMContentLoaded', () => {
  renderBlogList();
  renderSingleArticle();
});
