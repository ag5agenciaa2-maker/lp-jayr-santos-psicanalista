/* ============================================================
   Blog Engine & Markdown Parser - Jayr Santos Psicanalista
   ============================================================ */

// Artigos com Fallback Integrado (garante funcionamento local e online)
const FALLBACK_POSTS = {
  'primeiro-artigo': `---
title: "O que esperar da primeira sessão de psicanálise?"
slug: "o-que-esperar-da-primeira-sessao-de-psicanalise"
date: "2026-07-25"
description: "Descubra como funciona o primeiro contato no consultório de psicanálise, o papel da escuta atenta e como a fala livre ajuda a transformar angústias em autoconhecimento."
coverImage: "assets/jayr-santos-psicanalista-atendimento-sobre.webp"
author: "Jayr Santos"
tags:
  - "Psicanálise"
---

A decisão de iniciar a **psicanálise** é frequentemente acompanhada de dúvidas, expectativas e até uma certa apreensão. Afinal, o que acontece dentro do consultório de um psicanalista?

## A Palavra como Ferramenta de Transformação

Na clínica psicanalítica, o trabalho se fundamenta na *associação livre*. Isso significa que não há um roteiro pré-determinado, temas "proibidos" ou respostas prontas. Você é convidado a falar com liberdade sobre o que surgir na mente — memórias, angústias, sentimentos, sonhos ou situações do dia a dia.

> "A cura acontece pela fala. Ouça a si mesmo, reescreva sua história."

### Como Funciona o Primeiro Contato

1. **Acolhimento Ético:** O psicanalista oferece uma escuta atenta e qualificada em um ambiente seguro de absoluto sigilo.
2. **Compreensão dos Conflitos:** Investigamos as raízes das repetições e ansiedades que causam sofrimento.
3. **Definição do Setting:** Combinamos juntos o formato das sessões (presencial em Campo Grande, RJ ou online), horários e frequência.

## Atendimento Presencial e Online em Campo Grande - RJ

Seja no consultório presencial ou na modalidade online, o espaço analítico é preparado para proporcionar acolhimento e escuta profunda.

Se você sente que é o momento de dar esse passo e cuidar do seu bem-estar emocional, entre em contato para agendar uma conversa inicial.`,

  'psicanalise-e-relacionamentos': `---
title: "Psicanálise e Relacionamentos: Por que repetimos padrões afetuosos?"
slug: "psicanalise-e-relacionamentos-por-que-repetimos-padroes"
date: "2026-07-24"
description: "Entenda a visão psicanalítica sobre escolhas amorosas, a dinâmica do casal e como a análise ajuda a quebrar ciclos de repetição nos relacionamentos."
coverImage: "assets/jayr-santos-psicanalista-consultorio.webp"
author: "Jayr Santos"
tags:
  - "Terapia de Casal"
---

Você já teve a sensação de que está vivendo a mesma história amorosa repetidamente, apenas mudando as pessoas envolvidas? Na psicanálise, essa constatação não é incomum.

## O Inconsciente nas Escolhas Afetivas

Nossas escolhas amorosas raramente são puramente racionais. Elas são profundamente influenciadas por nossas primeiras experiências de afeto, cuidado e frustração na infância.

### Marcas que Deixamos e Levamos

* **Projeções no Outro:** Muitas vezes depositamos no parceiro expectativas e demandas não resolvidas do passado.
* **Medo da Vulnerabilidade:** Barreiras emocionais que construímos para nos proteger acabam impedindo a intimidade real.
* **Comunicação Interrompida:** O que não é dito em palavras frequentemente se transforma em sintomas e conflitos na convivência.

> "Compreender a própria história é o primeiro passo para construir relacionamentos mais maduros e genuínos."

## Como a Terapia Psicanalítica de Casal Pode Ajudar

A escuta psicanalítica para casais cria um espaço mediado onde ambos os parceiros podem se expressar sem julgamentos imediatos, reabrindo canais de diálogo e permitindo a reconstrução do vínculo.

Agende uma sessão para entender como a psicanálise pode auxiliar em seus relacionamentos.`
};

const BLOG_POSTS = Object.keys(FALLBACK_POSTS);

// Utilitário para parse de Frontmatter em Markdown
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
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/^> (.*$)/gim, 'blockquote>$1</blockquote>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^[0-9]+\. (.*$)/gim, '<li>$1</li>');

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

// Buscar o texto Markdown de um post (tentando fetch e usando fallback em caso de erro/file://)
async function fetchPostContent(slug) {
  try {
    const response = await fetch(`content/blog/${slug}.md`);
    if (response.ok) {
      const text = await response.text();
      // Valida se não retornou uma página HTML por engano (como index.html via 404)
      if (text && !text.trim().startsWith('<!') && !text.trim().startsWith('<html')) {
        return text;
      }
    }
  } catch (e) {
    // Modo file:// ou erro de rede
  }

  // Retorna o fallback se houver
  return FALLBACK_POSTS[slug] || null;
}

// Carregar e renderizar a lista de artigos (blog.html)
async function renderBlogList() {
  const container = document.getElementById('blog-grid-container');
  if (!container) return;

  container.innerHTML = '<p class="blog-loading">Carregando artigos...</p>';
  let cardsHtml = '';

  for (const postSlug of BLOG_POSTS) {
    const text = await fetchPostContent(postSlug);
    if (!text) continue;

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
          <a href="artigo.html?post=${postSlug}">
            <img src="${coverImage}" alt="${title}" class="blog-card__image" loading="lazy" />
          </a>
        </div>
        <div class="blog-card__content">
          <div class="blog-card__meta">
            <span class="blog-card__tag">${tag}</span>
            <time>${date}</time>
          </div>
          <h2 class="blog-card__title">
            <a href="artigo.html?post=${postSlug}">${title}</a>
          </h2>
          <p class="blog-card__excerpt">${description}</p>
          <div class="blog-card__footer">
            <a href="artigo.html?post=${postSlug}" class="blog-card__link">
              Ler artigo completo <span>→</span>
            </a>
          </div>
        </div>
      </article>
    `;
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

  const text = await fetchPostContent(postSlug);

  if (!text) {
    bodyEl.innerHTML = '<p>Artigo não encontrado.</p>';
    return;
  }

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
