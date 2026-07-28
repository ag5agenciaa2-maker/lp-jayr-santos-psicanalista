/* Pages Function — sitemap.xml gerado na hora, sempre atualizado.
   Antes era um arquivo estático que eu editava manualmente a cada página
   nova; agora todo post publicado e toda categoria com posts entram
   automaticamente, sem precisar lembrar de mexer aqui. */

const SITE = "http://www.jayrsantospsicanalista.ag5agencia.site";

const PAGINAS_FIXAS = [
  { loc: "/", changefreq: "monthly", priority: "1.0" },
  { loc: "/blog", changefreq: "weekly", priority: "0.7" },
  { loc: "/termos-e-condicoes", changefreq: "yearly", priority: "0.3" },
  { loc: "/politica-de-privacidade", changefreq: "yearly", priority: "0.3" },
];

// Posts antigos migrados do blog .com, servidos na raiz do domínio via
// functions/[slug].js — sincronizado manualmente com OLD_SLUGS de lá.
const OLD_SLUGS = new Set([
  "prossiga-a-vida-nao-terminou",
  "quando-o-corpo-grita",
  "as-bets-e-a-dor-psiquica-uma-leitura-do-inconsciente-sobre-as-apostas-online",
  "quando-o-silencio-cansa-ansiedade-feminina-na-meia-idade",
  "quando-a-angustia-fala-a-escuta-psicanalitica-do-sofrimento",
  "porque-repetimos-erros-que-nos-mesmos-reprovamos",
  "alem-do-vicio-e-do-controle-redescobrindo-o-nos",
  "transtorno-disformico-corporal-sob-o-olhar-da-psicanalise",
  "os-transtornos-alimentares-sob-o-olhar-da-psicanalise",
  "o-panico-sob-o-olhar-da-psicanalise",
  "o-amor-depois-da-tempestade-quando-a-crise-fortalece-o-casamento",
  "a-escolha-de-andar-a-dois",
]);

function xmlEscape(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toDateOnly(isoStr, fallback) {
  if (!isoStr) return fallback;
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return fallback;
  return d.toISOString().slice(0, 10);
}

export async function onRequestGet(context) {
  const { env } = context;
  const hoje = new Date().toISOString().slice(0, 10);

  const urls = PAGINAS_FIXAS.map(p => ({ ...p, lastmod: hoje }));

  const { results: categorias } = await env.DB.prepare(
    `SELECT c.slug, MAX(p.publicado_em) AS ultima_publicacao
     FROM categorias c
     JOIN posts p ON p.tag = c.nome AND p.status = 'publicado'
     GROUP BY c.id`
  ).all();

  categorias.forEach(c => {
    urls.push({
      loc: `/blog/${c.slug}`,
      changefreq: "weekly",
      priority: "0.6",
      lastmod: toDateOnly(c.ultima_publicacao, hoje),
    });
  });

  const { results: posts } = await env.DB.prepare(
    "SELECT slug, publicado_em, atualizado_em FROM posts WHERE status = 'publicado'"
  ).all();

  posts.forEach(p => {
    const lastmod = toDateOnly(p.atualizado_em || p.publicado_em, hoje);
    const loc = OLD_SLUGS.has(p.slug) ? `/${p.slug}` : `/blog/${p.slug}`;
    urls.push({ loc, changefreq: "monthly", priority: "0.65", lastmod });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${xmlEscape(SITE + u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=UTF-8" },
  });
}
