# Relatório de Otimização - PageSpeed & Lighthouse
**Projeto:** Jayr Santos Psicanalista  
**Data:** 23 de Junho de 2026

Este documento detalha o conjunto completo de otimizações aplicadas ao código front-end do projeto para maximizar os scores de auditoria do Google Lighthouse e as métricas do PageSpeed Insights, com foco especial na visualização **Mobile**.

---

## 1. Performance (Desempenho)

### Métricas de Carregamento e Interação (FCP, LCP, TBT, CLS, INP)

#### A) Otimização de Imagens (LCP & CLS)
- **Conversão de Formato:** As imagens originais em formatos pesados (.png e .jpg) foram convertidas para **.webp** de alta compressão (qualidade 82).
  - A imagem de fundo da seção de contato (`bg-contato-psicanalise.webp`) foi reduzida de **1,44MB** para apenas **25KB**.
  - A imagem principal do profissional (`jayr-santos-psicanalista-campo-grande-rj-hero-natural.webp`) foi reduzida de **581KB** para **42KB**.
- **Dimensões Estáticas:** Adicionados os atributos `width` e `height` em todas as imagens (logotipo da navbar, imagem hero, carrossel de fotos, avatar do WhatsApp e rodapé). Isso evita o recálculo e o deslocamento de elementos durante o carregamento, garantindo **Cumulative Layout Shift (CLS) próximo a zero**.
- **Preload de Recurso Crítico:** Adicionado `<link rel="preload" as="image" fetchpriority="high">` apontando para a imagem principal do Hero. Isso avisa o navegador para baixar a imagem com prioridade máxima, otimizando o **Largest Contentful Paint (LCP)**.

#### B) Eliminação de Recursos de Bloqueio (FCP & TBT)
- **Carregamento Assíncrono de CSS:** O CSS do banner de cookies (`cookie-banner.css`) e as Google Fonts foram configurados para carregamento assíncrono através da técnica de preload temporário (`onload="this.onload=null;this.rel='stylesheet'"`), eliminando o bloqueio de renderização do cabeçalho.
- **Diferimento de Scripts (defer):** O script principal (`script.js`) recebeu o atributo `defer` e foi movido para o final do corpo do HTML em todas as páginas, impedindo que o carregamento e execução do JS travem a interpretação inicial da página pelo navegador.
- **Remoção de Animações Críticas:** Removido o efeito de reveal (`data-anim` com delay de opacidade zero) nos elementos do topo da viewport (Hero). Com isso, o título principal e a foto principal aparecem instantaneamente no carregamento da página, reduzindo drasticamente o **First Contentful Paint (FCP)** e o LCP.

#### C) Prevenção de Forced Reflows (INP)
- **Manipulação de Scroll Lock:** Substituída a escrita direta de estilo inline `document.body.style.overflow = 'hidden'` no JavaScript (quando o menu mobile ou o banner de cookies é aberto) por adição e remoção dinâmica de uma classe CSS `.no-scroll` definida no `style.css`. Isso evita recálculos de layout caros e melhora a responsividade às interações (Interaction to Next Paint - INP).

---

## 2. Acessibilidade (Accessibility)

- **Identidade de Navegadores:** Adicionado atributo de acessibilidade `aria-label` descritivo nos blocos de navegação `<nav>` para facilitar a interpretação por leitores de tela em todos os arquivos HTML (`aria-label="Navegação principal"` e `aria-label="Navegação mobile"`).
- **Acessibilidade em Imagens:** Todas as imagens possuem o atributo `alt` definido. Imagens meramente decorativas possuem o atributo vazio `alt=""` para que os leitores de tela as ignorem corretamente.
- **Rótulos em Botões e Links:** Links de navegação externa (como botões flutuantes e links de redes sociais) receberam descrições acessíveis únicas via `aria-label` para dar o devido contexto de destino aos usuários deficientes visuais.

---

## 3. Melhores Práticas (Best Practices)

- **Segurança em Links Externos:** Todos os elementos `<a>` com comportamento `target="_blank"` (abrir em nova guia) foram revisados para conter o atributo `rel="noopener noreferrer"`. Isso impede que páginas externas tenham acesso ao objeto do documento de origem e previne o vazamento de informações de cabeçalhos HTTP.
- **Correção da Estrutura HTML:** Resolvidos problemas de tags aninhadas incorretamente. Em particular, as tags de fechamento `</head>` duplicadas em `termos-e-condicoes.html` e `politica-de-privacidade.html` foram eliminadas, alinhando o código com os padrões de validação da W3C.

---

## 4. SEO (Otimização para Mecanismos de Busca)

- **URLs Canônicas:** Todas as páginas possuem tag `<link rel="canonical">` apontando para o seu endereço canônico absoluto oficial, evitando penalizações por conteúdo duplicado nos buscadores.
- **Hierarquia de Headings:** Ajustadas e validadas as tags de cabeçalho (`H1`, `H2`, `H3`) respeitando a estrutura lógica de leitura sem pular níveis de cabeçalhos importantes.

---

## 5. Exemplos de Ajustes Estruturais Aplicados

### A) Preload e Carregamento Assíncrono no Cabeçalho:
```html
<!-- Preload da imagem LCP (Hero) -->
<link rel="preload" href="assets/jayr-santos-psicanalista-campo-grande-rj-hero-natural.webp" as="image" fetchpriority="high" />

<!-- Google Fonts: Carregamento Assíncrono -->
<link rel="preload" href="https://fonts.googleapis.com/css2?...&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'" />
<noscript><link href="https://fonts.googleapis.com/css2?...&display=swap" rel="stylesheet" /></noscript>
```

### B) Evitando Forced Reflows com CSS:
```css
/* style.css */
body.no-scroll {
  overflow: hidden;
}
```
```javascript
/* script.js e cookie-banner.js */
// ANTES (forçava reflow): document.body.style.overflow = 'hidden';
// DEPOIS (limpo):
document.body.classList.add('no-scroll');
```

---

## 6. Checklist de Ações Recomendadas (Hospedagem & Infraestrutura)

Para obter o máximo desempenho do site em ambiente de produção (servidor), recomenda-se a seguinte configuração de infraestrutura de rede:

- [ ] **Compressão Gzip ou Brotli:** Garantir que o servidor de hospedagem tenha compressão Brotli ativa para arquivos de texto (.html, .css, .js).
- [ ] **Cache HTTP Prolongado:** Configurar cabeçalhos `Cache-Control: public, max-age=31536000` para recursos estáticos (fontes locais, imagens, favicon).
- [ ] **HTTP/2 ou HTTP/3:** Validar que a hospedagem utilize o protocolo HTTP/2 (ou superior) para permitir o carregamento multiplexado dos recursos sem enfileiramento de conexões TCP.
