/* Pages Function — /blog/[slug]/ atende DOIS tipos de conteúdo na mesma rota:
   1) Categoria (tabela `categorias`) — já existia, continua igual.
   2) Post NOVO publicado pelo painel admin (tabela `posts`) — SSR profissional
      com URL limpa, sem precisar cadastrar cada post numa whitelist manual
      (diferente dos posts antigos migrados do blog .com, que usam
      functions/[slug].js com OLD_SLUGS explícito).
   A Function tenta categoria primeiro; se não achar, tenta post; se nenhum
   dos dois existir, cai no fluxo normal do Pages (next()). */

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function isHtmlContent(str) {
  if (!str) return false;
  return /^\s*<(p|h[1-6]|ul|ol|blockquote|div|figure)[\s>]/i.test(str);
}

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

function renderPostBody(corpo) {
  return isHtmlContent(corpo) ? corpo : markdownToHtml(corpo);
}

/* ===== Shell comum (nav, footer, drawer, cookie banner, WA) — igual às demais páginas do blog ===== */
function pageShell({ headContent, bodyDataAttrs, headerContent, mainContent }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${headContent}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@400;500;600&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" /></noscript>

  <link rel="stylesheet" href="/style.css" />
  <link rel="stylesheet" href="/responsive-fixes.css" />
  <link rel="stylesheet" href="/blog/blog.css" />
  <link rel="preload" href="/cookie-banner.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="/cookie-banner.css" /></noscript>
</head>
<body ${bodyDataAttrs}>

  <!-- ===== NAVBAR ===== -->
  <nav class="nav" id="topo" aria-label="Navegação principal">
    <a href="/#topo" class="nav__brand">
      <span class="nav__mark"><img src="/assets/logo-jayr-santos-psicanalista.webp" alt="Logotipo oficial Jayr Santos Psicanalista" width="400" height="400" /></span>
      <span class="nav__name">
        <strong>Jayr Santos</strong>
        <em>Psicanalista</em>
      </span>
    </a>
    <div class="nav__links" data-desktop-nav>
      <a href="/#inicio">Início</a>
      <a href="/#servicos">Serviço</a>
      <a href="/#depoimentos">Depoimentos</a>
      <a href="/#sobre">Sobre</a>
      <a href="/blog" class="active">Blog</a>
      <a href="/#contato">Contato</a>
    </div>
    <button class="nav__burger" data-burger aria-label="Abrir menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </nav>

  ${headerContent}

  ${mainContent}

  <!-- ===== RODAPÉ ===== -->
  <footer class="footer" id="rodape">
    <div class="wrap footer__grid">

      <!-- Coluna 1: Marca -->
      <div class="footer-brand">
        <a href="/#topo" class="footer-brand__logo">
          <img src="/assets/logo-jayr-santos-psicanalista.webp" alt="Logotipo oficial Jayr Santos Psicanalista" width="400" height="400" loading="lazy" />
          <span><strong>Jayr Santos</strong><em>Psicanalista</em></span>
        </a>
        <p class="footer-brand__desc">Escuta atenta, acolhedora e ética. Um espaço seguro para quem deseja compreender seus conflitos internos, seus relacionamentos e sua história.</p>
        <div class="footer-brand__social">
          <a href="https://www.instagram.com/jayrsantospsicanalista/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
          </a>
        </div>
      </div>

      <!-- Coluna 2: Navegação -->
      <div class="footer-links">
        <h4>Navegação</h4>
        <ul>
          <li><a href="/#inicio">Início</a></li>
          <li><a href="/#servicos">Atendimento</a></li>
          <li><a href="/#sobre">Sobre o profissional</a></li>
          <li><a href="/#depoimentos">Depoimentos</a></li>
          <li><a href="/#faq">Dúvidas frequentes</a></li>
        </ul>
      </div>

      <!-- Coluna 3: Atendimentos -->
      <div class="footer-links">
        <h4>Atendimento</h4>
        <ul>
          <li><a href="/#servicos">Sessões Individuais</a></li>
          <li><a href="/#servicos">Sessões de Casais</a></li>
          <li><a href="/#acolhimento">Atendimento Online</a></li>
          <li><a href="/#localizacao">Atendimento Presencial</a></li>
        </ul>
      </div>

      <!-- Coluna 4: Contato -->
      <div class="footer-contact">
        <h4>Contato</h4>
        <ul>
          <li>
            <a href="https://maps.google.com/?cid=16796552829207652552" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>Jayr Santos Psicanalista</span>
            </a>
          </li>
          <li>
            <a href="https://www.google.com/maps/dir/?api=1&destination=West+Offices+-+Estr.+do+Mendanha%2C+789+-+Campo+Grande%2C+Rio+de+Janeiro+-+RJ%2C+23087-283" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>West Offices · Estr. do Mendanha, 789<br>Campo Grande, Rio de Janeiro – RJ</span>
            </a>
          </li>
          <li>
            <a href="https://wa.me/5521971666854" target="_blank" rel="noopener noreferrer" class="js-wa" data-wa-text="Olá, vim através do site e gostaria de agendar uma conversa.">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>
              <span>WhatsApp · (21) 97166-6854</span>
            </a>
          </li>
        </ul>
      </div>

    </div>

    <!-- Separador -->
    <div class="footer-divider"></div>

    <div class="wrap footer-bottom">
      <div class="footer-credits-left">
        <span>© Jayr Santos Psicanalista <span id="year">2026</span></span>
        <div class="footer-legal-links">
          <a href="#" id="ck-prefs-link" class="footer-legal-link--cookies">
            <span id="cookie-toggle" style="display:inline-flex; align-items:center; width:28px; height:14px; background:rgba(255,255,255,0.1); border-radius:10px; padding:2px; border:1px solid rgba(255,255,255,0.2); position:relative; font-size:8px; font-weight:bold;">
              <span style="color:#86EFAC; margin-left:2px;">✓</span>
              <span style="color:#FCA5A5; margin-left:auto; margin-right:2px;">✕</span>
              <span id="cookie-toggle-dot" style="position:absolute; left:15px; width:10px; height:10px; background:#2C5E93; border-radius:50%; box-shadow:0 0 5px rgba(0,0,0,0.3); transition:left 0.2s ease;"></span>
            </span>
            Cookies
          </a>
          <span class="footer-legal-links__sep">|</span>
          <a href="/termos-e-condicoes">Termos e Condições</a>
          <span class="footer-legal-links__sep">|</span>
          <a href="/politica-de-privacidade">Política de Privacidade</a>
        </div>
      </div>
      <div class="footer-credits-right">
        <span>Desenvolvido por <a href="https://www.ag5agencia.com.br" target="_blank" rel="noopener noreferrer">AG5 Agência</a></span>
      </div>
    </div>
  </footer>

  <!-- ===== MOBILE DRAWER (DRAWER PREMIUM) ===== -->
  <div class="drawer-overlay" id="drawerOverlay" aria-hidden="true"></div>
  <div class="drawer" id="mobileDrawer" aria-hidden="true">
    <div class="drawer__header">
      <a href="/#topo" class="drawer__brand">
        <img src="/assets/logo-jayr-santos-psicanalista-mobile.webp" alt="Logotipo oficial Jayr Santos Psicanalista" class="drawer__logo" width="200" height="200" loading="lazy" />
        <span class="drawer__brand-name">
          <strong>Jayr Santos</strong>
          <em>Psicanalista</em>
        </span>
      </a>
      <button class="drawer__close" id="drawerClose" aria-label="Fechar menu">&times;</button>
    </div>
    <nav class="drawer__nav" aria-label="Navegação mobile">
      <a href="/#inicio">Início</a>
      <a href="/#servicos">Serviço</a>
      <a href="/#depoimentos">Depoimentos</a>
      <a href="/#sobre">Sobre</a>
      <a href="/blog" class="active">Blog</a>
      <a href="/#contato">Contato</a>
    </nav>
  </div>

  <!-- ========== BANNER DE ACEITE (COOKIES LGPD) ========== -->
  <div id="ck-banner" class="ck-banner" role="dialog" aria-modal="true" aria-label="Aviso de cookies" aria-live="polite" aria-hidden="true">
    <div class="ck-banner__inner">
      <div class="ck-banner__content">
        <p class="ck-banner__text">
          Usamos cookies para melhorar sua experiência neste site e analisar o tráfego de forma anônima. Ao continuar, você concorda com a nossa <a href="/politica-de-privacidade" class="ck-banner__link">Política de Privacidade</a>.
        </p>
      </div>
      <div class="ck-banner__actions">
        <button id="ck-customize" class="ck-btn ck-btn--ghost">Personalizar</button>
        <button id="ck-reject" class="ck-btn ck-btn--outline">Rejeitar</button>
        <button id="ck-accept-all" class="ck-btn ck-btn--primary">Aceitar todos</button>
      </div>
    </div>
  </div>

  <!-- ========== MODAL DE PERSONALIZAÇÃO ========== -->
  <div id="ck-modal" class="ck-modal" role="dialog" aria-modal="true" aria-label="Personalizar preferências de cookies" aria-hidden="true">
    <div class="ck-modal__overlay" id="ck-modal-overlay"></div>
    <div class="ck-modal__box">
      <div class="ck-modal__header">
        <h2 class="ck-modal__title">Personalizar preferências de consentimento</h2>
        <button class="ck-modal__close" id="ck-modal-close" aria-label="Fechar modal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <div class="ck-modal__body">
        <p class="ck-modal__intro">
          Utilizamos cookies para ajudar você a navegar com eficiência e executar certas funções. Os cookies classificados como <strong>"Necessário"</strong> são essenciais para o funcionamento básico do site e não podem ser desativados.
        </p>
        <div class="ck-category">
          <div class="ck-category__header">
            <div class="ck-category__info">
              <h3 class="ck-category__name">Necessário</h3>
              <p class="ck-category__desc">Essenciais para o funcionamento do site. Não armazenam dados pessoalmente identificáveis.</p>
            </div>
            <span class="ck-category__badge">Sempre ativo</span>
          </div>
        </div>
        <div class="ck-category">
          <div class="ck-category__header">
            <div class="ck-category__info">
              <h3 class="ck-category__name">Funcional</h3>
              <p class="ck-category__desc">Ajudam a executar funcionalidades como compartilhamento em mídia social e recursos de terceiros.</p>
            </div>
            <label class="ck-toggle" aria-label="Ativar cookies funcionais">
              <input type="checkbox" id="ck-functional" name="functional">
              <span class="ck-toggle__slider"></span>
            </label>
          </div>
        </div>
        <div class="ck-category">
          <div class="ck-category__header">
            <div class="ck-category__info">
              <h3 class="ck-category__name">Analítico</h3>
              <p class="ck-category__desc">Usados para entender como os visitantes interagem com o site (visitantes, taxa de rejeição, etc.).</p>
            </div>
            <label class="ck-toggle" aria-label="Ativar cookies analíticos">
              <input type="checkbox" id="ck-analytics" name="analytics">
              <span class="ck-toggle__slider"></span>
            </label>
          </div>
        </div>
        <div class="ck-category">
          <div class="ck-category__header">
            <div class="ck-category__info">
              <h3 class="ck-category__name">Desempenho</h3>
              <p class="ck-category__desc">Analisam índices de desempenho do site para oferecer melhor navegação.</p>
            </div>
            <label class="ck-toggle" aria-label="Ativar cookies de desempenho">
              <input type="checkbox" id="ck-performance" name="performance">
              <span class="ck-toggle__slider"></span>
            </label>
          </div>
        </div>
        <div class="ck-category">
          <div class="ck-category__header">
            <div class="ck-category__info">
              <h3 class="ck-category__name">Publicidade</h3>
              <p class="ck-category__desc">Entregam anúncios personalizados com base nas páginas visitadas anteriormente.</p>
            </div>
            <label class="ck-toggle" aria-label="Ativar cookies de publicidade">
              <input type="checkbox" id="ck-advertising" name="advertising">
              <span class="ck-toggle__slider"></span>
            </label>
          </div>
        </div>
      </div>
      <div class="ck-modal__footer">
        <button id="ck-modal-save" class="ck-btn ck-btn--ghost">Salvar Preferências</button>
        <button id="ck-modal-accept-all" class="ck-btn ck-btn--primary">Aceitar todos</button>
      </div>
    </div>
  </div>

  <!-- WhatsApp Premium Experience (AG5 V4) -->
  <div class="wa-premium-container">
    <div id="wa-message-bubble" class="wa-bubble">
      <button class="wa-close" id="wa-close-btn" aria-label="Fechar balão de mensagem">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="14" height="14" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <div class="wa-content">
        <div class="wa-header">
          <div class="wa-avatar-wrapper">
            <img src="/assets/jayr-santos-psicanalista-campo-grande-rj-hero.webp" alt="Jayr Santos" class="wa-avatar" width="48" height="48" loading="lazy" />
          </div>
          <div class="wa-info">
            <span class="wa-name">Jayr Santos</span>
          </div>
        </div>
        <div id="wa-typing" class="wa-typing">
          <span></span><span></span><span></span>
        </div>
        <div id="wa-real-message" class="wa-message-text" style="display:none;">
          <p>Olá. Se quiser conversar sobre o que te trouxe até aqui, <strong>estou à disposição</strong>.</p>
        </div>
      </div>
    </div>

    <a href="https://wa.me/5521971666854?text=Ol%C3%A1%2C%20vim%20atrav%C3%A9s%20do%20site%20e%20gostaria%20de%20agendar%20uma%20conversa." class="wa-float-btn js-wa" data-wa-text="Olá, vim através do site e gostaria de agendar uma conversa." target="_blank" rel="noopener noreferrer" id="wa-main-btn" aria-label="Fale conosco pelo WhatsApp">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="30" height="30">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  </div>

  <script src="/cookie-banner.js" defer></script>
  <script src="/script.js" defer></script>
  <script src="/blog/blog.js" defer></script>
  <script src="https://control-blog.ag5agencia.site/r.js" data-c="jayr-santos-psicanalista" defer></script>
</body>
</html>`;
}

/* ===== Página de CATEGORIA ===== */
function renderCategoriaPage({ categoria, siteOrigin, requestUrl }) {
  const nomeEsc = escapeHtml(categoria.nome);
  const descricao = `Artigos sobre ${categoria.nome} por Jayr Santos Psicanalista em Campo Grande, RJ.`;
  const descEsc = escapeHtml(descricao);
  const imagemAbs = `${siteOrigin}/assets/jayr-santos-psicanalista-campo-grande-rj-hero.webp`;

  const headContent = `
  <title>${nomeEsc} | Blog Jayr Santos Psicanalista</title>
  <meta name="description" content="${descEsc}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${requestUrl}" />
  <link rel="icon" href="/assets/favicon-jayr-santos-psicanalista.ico" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${requestUrl}" />
  <meta property="og:title" content="${nomeEsc} | Blog Jayr Santos Psicanalista" />
  <meta property="og:description" content="${descEsc}" />
  <meta property="og:image" content="${imagemAbs}" />`;

  const headerContent = `
  <!-- ===== HERO DO BLOG ===== -->
  <header class="blog-hero">
    <div class="blog-hero__watermark" aria-hidden="true">Ψ</div>
    <div class="wrap">
      <p class="eyebrow" style="color: var(--areia); margin-bottom: 12px;"><span class="eyebrow__line" style="background: var(--areia);"></span><a href="/blog/" style="color: var(--areia); text-decoration: none;">Blog</a> · ${nomeEsc}</p>
      <h1 class="blog-hero__title">${nomeEsc}</h1>
      <p class="blog-hero__subtitle">Reflexões e artigos sobre ${nomeEsc.toLowerCase()} a partir da escuta psicanalítica.</p>
    </div>
  </header>`;

  const mainContent = `
  <!-- ===== ARTIGOS DA CATEGORIA ===== -->
  <main class="blog-section">
    <div class="wrap">
      <div id="category-grid-container" class="blog-grid" data-tag="${nomeEsc}">
        <!-- Renderizado dinamicamente via blog.js -->
      </div>
    </div>
  </main>

  <!-- ===== CTA FINAL ===== -->
  <section class="section" style="background: var(--noturno); color: var(--offwhite); text-align: center; padding: 60px 20px;">
    <div class="wrap" style="max-width: 700px;">
      <h2 style="font-family: var(--ff-title); font-size: 2rem; color: #fff; margin-bottom: 16px;">Gostaria de agendar uma conversa?</h2>
      <p style="color: var(--areia); margin-bottom: 28px; font-size: 1.1rem;">O atendimento presencial em Campo Grande (RJ) e online oferece um espaço ético, sigiloso e acolhedor.</p>
      <a href="https://wa.me/5521971666854?text=Ol%C3%A1%2C%20li%20o%20seu%20blog%20e%20gostaria%20de%20agendar%20uma%20conversa." class="btn btn--solid btn--lg js-wa" data-wa-text="Olá, li o seu blog e gostaria de agendar uma conversa." target="_blank" rel="noopener noreferrer">Falar pelo WhatsApp</a>
    </div>
  </section>`;

  return pageShell({ headContent, bodyDataAttrs: "", headerContent, mainContent });
}

function shareLinksHtml(requestUrl, tituloEsc) {
  const urlEnc = encodeURIComponent(requestUrl);
  const tituloEnc = encodeURIComponent(tituloEsc);
  return `
  <div class="article-share">
    <p class="article-share__title">Compartilhe esse post!</p>
    <div class="article-share__icons">
      <a href="https://twitter.com/intent/tweet?url=${urlEnc}&text=${tituloEnc}" target="_blank" rel="noopener noreferrer" class="article-share__icon" aria-label="Compartilhar no X">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${urlEnc}" target="_blank" rel="noopener noreferrer" class="article-share__icon" aria-label="Compartilhar no Facebook">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.02 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.878h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.92 8.437-9.94z"/></svg>
      </a>
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=${urlEnc}" target="_blank" rel="noopener noreferrer" class="article-share__icon" aria-label="Compartilhar no LinkedIn">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.114 20.452H3.558V9h3.556v11.452z"/></svg>
      </a>
      <a href="https://wa.me/?text=${tituloEnc}%20${urlEnc}" target="_blank" rel="noopener noreferrer" class="article-share__icon" aria-label="Compartilhar no WhatsApp">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>
      <a href="mailto:?subject=${tituloEnc}&body=${urlEnc}" class="article-share__icon" aria-label="Compartilhar por e-mail">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16v16H4z"/><path d="m22 6-10 7L2 6"/></svg>
      </a>
    </div>
  </div>`;
}

function relatedPostsHtml(relacionados, tagEsc, tagHref) {
  if (!relacionados || !relacionados.length) return "";
  return `
  <section class="article-related">
    <div class="wrap" style="max-width: 900px;">
      <h2 class="article-related__title">Artigos relacionados</h2>
      <div class="article-related__grid">
        ${relacionados.map(r => `
          <a href="${r.href}" class="article-related__card">
            <div class="article-related__image-wrap">
              <img src="${r.capa_url || '/assets/jayr-santos-psicanalista-atendimento-sobre.webp'}" alt="${escapeHtml(r.titulo)}" loading="lazy" />
            </div>
            <div class="article-related__content">
              <span class="article-related__tag">${tagEsc}</span>
              <h3 class="article-related__card-title">${escapeHtml(r.titulo)}</h3>
            </div>
          </a>
        `).join("")}
      </div>
    </div>
  </section>`;
}

/* ===== Página de POST NOVO (publicado pelo painel admin) ===== */
function renderPostPage({ post, siteOrigin, requestUrl, relacionados = [], tagSlug = "" }) {
  const capaUrl = (post.capa_url || "/assets/jayr-santos-psicanalista-atendimento-sobre.webp");
  const capaAbs = capaUrl.startsWith("http") ? capaUrl : `${siteOrigin}${capaUrl}`;
  const tituloEsc = escapeHtml(post.titulo);
  const descEsc = escapeHtml(post.descricao || `Artigo de Jayr Santos Psicanalista sobre ${post.tag || "psicanálise"}.`);
  const tagEsc = escapeHtml(post.tag || "Psicanálise");
  const corpoHtml = renderPostBody(post.corpo_md);
  const dataFormatada = formatDate(post.publicado_em);

  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "mainEntityOfPage": { "@type": "WebPage", "@id": requestUrl },
    "headline": post.titulo,
    "description": post.descricao || undefined,
    "image": [capaAbs],
    "datePublished": post.publicado_em,
    "dateModified": post.atualizado_em || post.publicado_em,
    "author": {
      "@type": "Person",
      "name": post.autor || "Jayr Santos",
      "jobTitle": "Psicanalista Clínico",
      "url": siteOrigin,
    },
    "publisher": {
      "@type": "Organization",
      "name": "Jayr Santos Psicanalista",
      "logo": { "@type": "ImageObject", "url": `${siteOrigin}/assets/logo-jayr-santos-psicanalista.webp` },
    },
  };

  const headContent = `
  <title>${tituloEsc} | Blog Jayr Santos Psicanalista</title>
  <meta name="description" content="${descEsc}" />
  <meta name="author" content="${escapeHtml(post.autor || "Jayr Santos")}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${requestUrl}" />
  <link rel="icon" href="/assets/favicon-jayr-santos-psicanalista.ico" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${requestUrl}" />
  <meta property="og:title" content="${tituloEsc} | Blog Jayr Santos Psicanalista" />
  <meta property="og:description" content="${descEsc}" />
  <meta property="og:image" content="${capaAbs}" />
  <meta property="article:author" content="${escapeHtml(post.autor || "Jayr Santos")}" />
  <meta property="article:section" content="${tagEsc}" />
  ${post.publicado_em ? `<meta property="article:published_time" content="${post.publicado_em}" />` : ""}
  <script type="application/ld+json">${JSON.stringify(schemaJson)}</script>`;

  const headerContent = `
  <!-- ===== HEADER DO ARTIGO ===== -->
  <header class="article-header">
    <div class="article-header__container">
      <a href="/blog" class="back-to-blog">← Voltar para o Blog</a>
      <div class="article-meta">
        <span class="blog-card__tag" style="background: rgba(255,255,255,0.15); color: #fff;">${tagEsc}</span>
        <time>${dataFormatada}</time>
      </div>
      <h1 class="article-title">${tituloEsc}</h1>
      <p class="article-description">${descEsc}</p>

      <div class="article-author-box">
        <img src="/assets/jayr-santos-psicanalista-atendimento-sobre.webp" alt="Jayr Santos Psicanalista" />
        <div class="article-author-info">
          <span class="article-author-name">${escapeHtml(post.autor || "Jayr Santos")}</span>
          <span class="article-author-role">Psicanalista Clínico em Campo Grande - RJ</span>
        </div>
      </div>
    </div>
  </header>

  <!-- ===== IMAGEM DE CAPA ===== -->
  <div class="article-cover">
    <img src="${capaAbs}" alt="${tituloEsc}" />
  </div>`;

  const mainContent = `
  <!-- ===== CORPO DO ARTIGO ===== -->
  <main class="article-body" id="article-body">
    ${corpoHtml}
  </main>

  <!-- ===== TÓPICOS ===== -->
  <div class="wrap" style="max-width: 760px; padding: 0 var(--pad-x);">
    <div class="article-topics">
      <span class="article-topics__label">Tópicos:</span>
      ${tagSlug ? `<a href="/blog/${escapeHtml(tagSlug)}" class="article-topics__badge">${tagEsc}</a>` : `<span class="article-topics__badge">${tagEsc}</span>`}
    </div>
  </div>

  <!-- ===== COMPARTILHAR ===== -->
  <div class="wrap" style="max-width: 760px; padding: 0 var(--pad-x);">
    ${shareLinksHtml(requestUrl, tituloEsc)}
  </div>

  <!-- ===== CTA FINAL DO ARTIGO ===== -->
  <div class="wrap" style="max-width: 760px; margin-bottom: 40px; padding: 0 var(--pad-x);">
    <div class="article-cta">
      <h3>Deseja iniciar o seu processo analítico?</h3>
      <p>A psicanálise oferece um espaço único para olhar para a sua história com acolhimento, sigilo e profundidade. Atendimentos presenciais em Campo Grande (RJ) e online.</p>
      <a href="https://wa.me/5521971666854?text=Ol%C3%A1%2C%20li%20o%20seu%20artigo%20e%20gostaria%20de%20agendar%20uma%20conversa." class="btn btn--solid btn--lg js-wa" data-wa-text="Olá, li o seu artigo e gostaria de agendar uma conversa." target="_blank" rel="noopener noreferrer">Agendar Sessão via WhatsApp</a>
    </div>
  </div>

  ${relatedPostsHtml(relacionados, tagEsc)}

  <!-- ===== COMENTÁRIOS ===== -->
  <div class="wrap" style="max-width: 760px; margin-bottom: 80px; padding: 0 var(--pad-x);">
    <section class="article-comments" aria-label="Comentários do artigo">
      <h3 class="article-comments__title">Comentários</h3>

      <div id="comments-list" class="article-comments__list">
        <p class="article-comments__empty">Carregando comentários...</p>
      </div>

      <h4 class="article-comments__form-title">Deixe um comentário</h4>
      <form id="comment-form" class="article-comments__form" novalidate>
        <p class="article-comments__notice">O seu endereço de e-mail não será publicado. Campos obrigatórios são marcados com *</p>
        <div class="field">
          <label for="c-nome">Nome *</label>
          <input type="text" id="c-nome" name="nome" required maxlength="100" placeholder="Seu nome" />
        </div>
        <div class="field">
          <label for="c-email">E-mail *</label>
          <input type="email" id="c-email" name="email" required maxlength="200" placeholder="seu@email.com" />
        </div>
        <div class="field">
          <label for="c-site">Telefone (opcional)</label>
          <input type="tel" id="c-site" name="site" maxlength="30" placeholder="(21) 90000-0000" />
        </div>
        <div class="field">
          <label for="c-texto">Comentário *</label>
          <textarea id="c-texto" name="texto" rows="3" required maxlength="2000" placeholder="Escreva seu comentário..."></textarea>
        </div>
        <label class="article-comments__save-check">
          <input type="checkbox" id="c-salvar" />
          Salvar meus dados neste navegador para a próxima vez que eu comentar.
        </label>
        <button type="submit" class="btn btn--solid">Enviar comentário</button>
        <p id="comment-feedback" class="article-comments__feedback" hidden></p>
      </form>
    </section>
  </div>`;

  return pageShell({
    headContent,
    bodyDataAttrs: `data-ssr="true" data-slug="${escapeHtml(post.slug)}"`,
    headerContent,
    mainContent,
  });
}

// Posts antigos migrados do blog .com preservam a URL na raiz do domínio
// (functions/[slug].js) — mesma lista, sincronizada manualmente entre os
// dois arquivos sempre que um post antigo específico for migrado.
const OLD_SLUGS = new Set([
  "prossiga-a-vida-nao-terminou",
]);

function urlDoPost(slug) {
  return OLD_SLUGS.has(slug) ? `/${slug}/` : `/blog/${slug}`;
}

export async function onRequestGet(context) {
  const { params, env, request } = context;
  const slug = params.categoria;

  const categoria = await env.DB.prepare(
    "SELECT id, nome, slug FROM categorias WHERE slug = ?"
  ).bind(slug).first();

  const url = new URL(request.url);
  const siteOrigin = url.origin;

  if (categoria) {
    const requestUrl = `${siteOrigin}/blog/${slug}/`;
    return new Response(renderCategoriaPage({ categoria, siteOrigin, requestUrl }), {
      headers: { "Content-Type": "text/html; charset=UTF-8" },
    });
  }

  const post = await env.DB.prepare(
    "SELECT * FROM posts WHERE slug = ? AND status = 'publicado'"
  ).bind(slug).first();

  if (post) {
    // Sem barra final: com blog/ já existindo como pasta física (blog/index.html),
    // o Pages só aciona esta Function em /blog/slug — /blog/slug/ (com barra) cai
    // no fallback de "diretório" antes de chegar aqui.
    const requestUrl = `${siteOrigin}/blog/${slug}`;

    const [{ results: relacionadosRaw }, categoriaDoPost] = await Promise.all([
      env.DB.prepare(
        `SELECT slug, titulo, capa_url, descricao FROM posts
         WHERE tag = ? AND status = 'publicado' AND slug != ?
         ORDER BY publicado_em DESC LIMIT 3`
      ).bind(post.tag, post.slug).all(),
      env.DB.prepare("SELECT slug FROM categorias WHERE nome = ?").bind(post.tag).first(),
    ]);

    const relacionados = relacionadosRaw.map(r => ({ ...r, href: urlDoPost(r.slug) }));
    const tagSlug = categoriaDoPost ? categoriaDoPost.slug : "";

    return new Response(renderPostPage({ post, siteOrigin, requestUrl, relacionados, tagSlug }), {
      headers: { "Content-Type": "text/html; charset=UTF-8" },
    });
  }

  return context.next();
}
