/* Jayr Blog API — Worker
   Login por e-mail/senha (PBKDF2-SHA256 via Web Crypto), CRUD de posts,
   upload de imagem para R2, comentários com moderação simples. */

const SESSION_DAYS = 7;

const ALLOWED_ORIGINS = [
  "https://www.jayrsantospsicanalista.ag5agencia.site",
  "https://jayrsantospsicanalista.ag5agencia.site",
  "https://www.jayrsantospsicalista.ag5agencia.site",
  "https://jayrsantospsicalista.ag5agencia.site",
  "https://lp-jayr-santos-psicanalista.pages.dev",
  "https://www.jayrsantospsicanalista.com",
  "https://jayrsantospsicanalista.com",
];

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || /^https:\/\/[a-z0-9]+\.lp-jayr-santos-psicanalista\.pages\.dev$/.test(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Vary": "Origin",
  };
}

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request) },
  });
}

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes.buffer;
}

async function pbkdf2Hash(senha, saltBuf, iteracoes) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBuf, iterations: iteracoes, hash: "SHA-256" },
    keyMaterial, 256
  );
  return bufToHex(bits);
}

async function verificarSenha(senha, hashArmazenado) {
  const [iterStr, saltHex, hashHex] = hashArmazenado.split(":");
  const iteracoes = parseInt(iterStr, 10);
  const saltBuf = hexToBuf(saltHex);
  const calculado = await pbkdf2Hash(senha, saltBuf, iteracoes);
  return calculado === hashHex;
}

function gerarToken() {
  return bufToHex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}

function slugify(str) {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

async function requireAuth(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const row = await env.DB.prepare(
    "SELECT s.usuario_id, s.expira_em FROM sessoes s WHERE s.token = ?"
  ).bind(token).first();
  if (!row) return null;
  if (new Date(row.expira_em) < new Date()) return null;
  return row.usuario_id;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    try {
      // ---- LOGIN ----
      if (path === "/api/login" && method === "POST") {
        const { email, senha } = await request.json();
        if (!email || !senha) return json({ error: "email e senha obrigatórios" }, 400, request);

        const user = await env.DB.prepare("SELECT id, senha_hash FROM usuarios WHERE email = ?")
          .bind(email).first();
        if (!user) return json({ error: "credenciais inválidas" }, 401, request);

        const ok = await verificarSenha(senha, user.senha_hash);
        if (!ok) return json({ error: "credenciais inválidas" }, 401, request);

        const token = gerarToken();
        const expira = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
        await env.DB.prepare("INSERT INTO sessoes (token, usuario_id, expira_em) VALUES (?, ?, ?)")
          .bind(token, user.id, expira).run();

        return json({ token, expira_em: expira }, 200, request);
      }

      // ---- CATEGORIAS PÚBLICAS ----
      // Só lista categorias com pelo menos 1 post publicado. "Outros Temas" sempre
      // por último (é categoria de "resto", não um tema planejado); as demais em A-Z.
      if (path === "/api/categorias" && method === "GET") {
        const { results } = await env.DB.prepare(
          `SELECT c.id, c.nome, c.slug, COUNT(p.id) AS total_posts
           FROM categorias c
           JOIN posts p ON p.tag = c.nome AND p.status = 'publicado'
           GROUP BY c.id
           ORDER BY (c.slug = 'outros-temas') ASC, c.nome ASC`
        ).all();
        return json({ categorias: results }, 200, request);
      }

      // ---- POSTS PÚBLICOS ----
      if (path === "/api/posts" && method === "GET") {
        const tag = url.searchParams.get("tag");
        const stmt = tag
          ? env.DB.prepare(
              "SELECT id, slug, titulo, descricao, capa_url, autor, tag, publicado_em FROM posts WHERE status = 'publicado' AND tag = ? ORDER BY publicado_em DESC"
            ).bind(tag)
          : env.DB.prepare(
              "SELECT id, slug, titulo, descricao, capa_url, autor, tag, publicado_em FROM posts WHERE status = 'publicado' ORDER BY publicado_em DESC"
            );
        const { results } = await stmt.all();
        return json({ posts: results }, 200, request);
      }

      const matchSlug = path.match(/^\/api\/posts\/([a-z0-9-]+)$/);
      if (matchSlug && method === "GET") {
        const slug = matchSlug[1];
        const post = await env.DB.prepare(
          "SELECT * FROM posts WHERE slug = ? AND status = 'publicado'"
        ).bind(slug).first();
        if (!post) return json({ error: "não encontrado" }, 404, request);
        return json({ post }, 200, request);
      }

      // ---- COMENTÁRIOS PÚBLICOS ----
      const matchComentarios = path.match(/^\/api\/posts\/([a-z0-9-]+)\/comentarios$/);
      if (matchComentarios && method === "GET") {
        const slug = matchComentarios[1];
        const post = await env.DB.prepare("SELECT id FROM posts WHERE slug = ?").bind(slug).first();
        if (!post) return json({ error: "não encontrado" }, 404, request);
        // email nunca é retornado ao público — só nome, texto, site e vínculo de resposta (parent_id)
        const { results } = await env.DB.prepare(
          "SELECT id, nome, site, texto, parent_id, criado_em FROM comentarios WHERE post_id = ? AND status = 'aprovado' ORDER BY criado_em ASC"
        ).bind(post.id).all();
        return json({ comentarios: results }, 200, request);
      }

      if (matchComentarios && method === "POST") {
        const slug = matchComentarios[1];
        const post = await env.DB.prepare("SELECT id FROM posts WHERE slug = ?").bind(slug).first();
        if (!post) return json({ error: "não encontrado" }, 404, request);

        const { nome, email, site, texto, parent_id } = await request.json();
        const emailValido = typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!nome || !emailValido || !texto || nome.length > 100 || email.length > 200 || texto.length > 2000) {
          return json({ error: "dados inválidos" }, 400, request);
        }
        if (site && (typeof site !== "string" || site.length > 30)) {
          return json({ error: "telefone inválido" }, 400, request);
        }

        let parentIdValido = null;
        if (parent_id !== undefined && parent_id !== null) {
          const parentComentario = await env.DB.prepare(
            "SELECT id FROM comentarios WHERE id = ? AND post_id = ?"
          ).bind(parent_id, post.id).first();
          if (!parentComentario) return json({ error: "comentário pai inválido" }, 400, request);
          parentIdValido = parentComentario.id;
        }

        await env.DB.prepare(
          "INSERT INTO comentarios (post_id, nome, email, site, texto, parent_id, status) VALUES (?, ?, ?, ?, ?, ?, 'pendente')"
        ).bind(post.id, nome.trim(), email.trim(), (site || "").trim() || null, texto.trim(), parentIdValido).run();
        return json({ ok: true, mensagem: "Comentário enviado para moderação" }, 201, request);
      }

      // ---- ROTAS ADMIN (autenticadas) ----
      if (path.startsWith("/api/admin/")) {
        const usuarioId = await requireAuth(request, env);
        if (!usuarioId) return json({ error: "não autorizado" }, 401, request);

        // Lista TODAS as categorias (mesmo sem posts) + contagem, para o admin
        // popular o <select> do formulário e decidir sobre exclusões com segurança.
        if (path === "/api/admin/categorias" && method === "GET") {
          const { results } = await env.DB.prepare(
            `SELECT c.id, c.nome, c.slug,
                    (SELECT COUNT(*) FROM posts p WHERE p.tag = c.nome) AS total_posts
             FROM categorias c
             ORDER BY (c.slug = 'outros-temas') ASC, c.nome ASC`
          ).all();
          return json({ categorias: results }, 200, request);
        }

        if (path === "/api/admin/categorias" && method === "POST") {
          const body = await request.json();
          const nome = (body.nome || "").trim();
          if (!nome || nome.length > 80) return json({ error: "nome de categoria inválido" }, 400, request);
          const slug = slugify(nome);
          if (!slug) return json({ error: "nome de categoria inválido" }, 400, request);

          const existente = await env.DB.prepare("SELECT id, nome, slug FROM categorias WHERE slug = ?").bind(slug).first();
          if (existente) return json({ ok: true, categoria: existente, ja_existia: true }, 200, request);

          const r = await env.DB.prepare(
            "INSERT INTO categorias (nome, slug) VALUES (?, ?)"
          ).bind(nome, slug).run();
          return json({ ok: true, categoria: { id: r.meta.last_row_id, nome, slug } }, 201, request);
        }

        const matchCategoriaAdmin = path.match(/^\/api\/admin\/categorias\/(\d+)$/);
        if (matchCategoriaAdmin && method === "PUT") {
          const id = matchCategoriaAdmin[1];
          const body = await request.json();
          const novoNome = (body.nome || "").trim();
          if (!novoNome || novoNome.length > 80) return json({ error: "nome de categoria inválido" }, 400, request);

          const atual = await env.DB.prepare("SELECT id, nome, slug FROM categorias WHERE id = ?").bind(id).first();
          if (!atual) return json({ error: "categoria não encontrada" }, 404, request);
          if (atual.slug === "outros-temas") return json({ error: "\"Outros Temas\" não pode ser renomeada" }, 400, request);

          const novoSlug = slugify(novoNome);
          if (!novoSlug) return json({ error: "nome de categoria inválido" }, 400, request);

          const conflito = await env.DB.prepare("SELECT id FROM categorias WHERE slug = ? AND id != ?").bind(novoSlug, id).first();
          if (conflito) return json({ error: "já existe uma categoria com esse nome" }, 400, request);

          await env.DB.prepare("UPDATE categorias SET nome = ?, slug = ? WHERE id = ?").bind(novoNome, novoSlug, id).run();
          // Propaga o novo nome para todos os posts que usavam o nome antigo da categoria.
          await env.DB.prepare("UPDATE posts SET tag = ? WHERE tag = ?").bind(novoNome, atual.nome).run();

          return json({ ok: true, categoria: { id: Number(id), nome: novoNome, slug: novoSlug } }, 200, request);
        }

        if (matchCategoriaAdmin && method === "DELETE") {
          const id = matchCategoriaAdmin[1];
          const atual = await env.DB.prepare("SELECT id, nome, slug FROM categorias WHERE id = ?").bind(id).first();
          if (!atual) return json({ error: "categoria não encontrada" }, 404, request);
          if (atual.slug === "outros-temas") return json({ error: "\"Outros Temas\" não pode ser excluída" }, 400, request);

          const outrosTemas = await env.DB.prepare("SELECT nome FROM categorias WHERE slug = 'outros-temas'").first();
          if (outrosTemas) {
            // Posts que usavam a categoria excluída migram para "Outros Temas" em vez de ficarem órfãos.
            await env.DB.prepare("UPDATE posts SET tag = ? WHERE tag = ?").bind(outrosTemas.nome, atual.nome).run();
          }

          await env.DB.prepare("DELETE FROM categorias WHERE id = ?").bind(id).run();
          return json({ ok: true }, 200, request);
        }

        if (path === "/api/admin/posts" && method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT * FROM posts ORDER BY atualizado_em DESC"
          ).all();
          return json({ posts: results }, 200, request);
        }

        if (path === "/api/admin/posts" && method === "POST") {
          const body = await request.json();
          const slug = (body.slug && slugify(body.slug)) || slugify(body.titulo);
          if (!body.titulo || !slug) return json({ error: "título obrigatório" }, 400, request);

          const status = body.status === "publicado" ? "publicado" : "rascunho";
          const publicadoEm = status === "publicado" ? new Date().toISOString() : null;

          const r = await env.DB.prepare(
            `INSERT INTO posts (slug, titulo, descricao, capa_url, autor, tag, corpo_md, status, publicado_em)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            slug, body.titulo, body.descricao || "", body.capa_url || "",
            body.autor || "Jayr Santos", body.tag || "Saúde Mental e Emoções",
            body.corpo_md || "", status, publicadoEm
          ).run();

          return json({ ok: true, id: r.meta.last_row_id, slug }, 201, request);
        }

        const matchAdminPost = path.match(/^\/api\/admin\/posts\/(\d+)$/);
        if (matchAdminPost && method === "PUT") {
          const id = matchAdminPost[1];
          const body = await request.json();
          const existente = await env.DB.prepare("SELECT status FROM posts WHERE id = ?").bind(id).first();
          if (!existente) return json({ error: "não encontrado" }, 404, request);

          const novoStatus = body.status === "publicado" ? "publicado" : "rascunho";
          const publicadoEm = novoStatus === "publicado" && existente.status !== "publicado"
            ? new Date().toISOString()
            : body.publicado_em || null;

          await env.DB.prepare(
            `UPDATE posts SET titulo=?, descricao=?, capa_url=?, autor=?, tag=?, corpo_md=?, status=?, publicado_em=?, atualizado_em=datetime('now')
             WHERE id=?`
          ).bind(
            body.titulo, body.descricao || "", body.capa_url || "",
            body.autor || "Jayr Santos", body.tag || "Saúde Mental e Emoções",
            body.corpo_md || "", novoStatus, publicadoEm, id
          ).run();

          return json({ ok: true }, 200, request);
        }

        if (matchAdminPost && method === "DELETE") {
          const id = matchAdminPost[1];
          await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
          return json({ ok: true }, 200, request);
        }

        if (path === "/api/admin/upload" && method === "POST") {
          const form = await request.formData();
          const file = form.get("file");
          if (!file) return json({ error: "arquivo obrigatório" }, 400, request);

          const ext = (file.name.split(".").pop() || "webp").toLowerCase();
          const key = `capas/${Date.now()}-${crypto.randomUUID()}.${ext}`;
          await env.IMAGENS.put(key, file.stream(), {
            httpMetadata: { contentType: file.type || "image/webp" },
          });

          const publicUrl = `${env.IMAGENS_PUBLIC_URL}/${key}`;
          return json({ ok: true, url: publicUrl }, 201, request);
        }

        if (path === "/api/admin/comentarios" && method === "GET") {
          const { results } = await env.DB.prepare(
            `SELECT c.id, c.nome, c.email, c.site, c.texto, c.parent_id, c.status, c.criado_em, p.titulo AS post_titulo, p.slug AS post_slug
             FROM comentarios c JOIN posts p ON p.id = c.post_id
             ORDER BY c.criado_em DESC`
          ).all();
          return json({ comentarios: results }, 200, request);
        }

        const matchComentarioAdmin = path.match(/^\/api\/admin\/comentarios\/(\d+)$/);
        if (matchComentarioAdmin && method === "PUT") {
          const id = matchComentarioAdmin[1];
          const { status } = await request.json();
          if (!["aprovado", "rejeitado"].includes(status)) {
            return json({ error: "status inválido" }, 400, request);
          }
          await env.DB.prepare("UPDATE comentarios SET status = ? WHERE id = ?").bind(status, id).run();
          return json({ ok: true }, 200, request);
        }

        if (matchComentarioAdmin && method === "DELETE") {
          const id = matchComentarioAdmin[1];
          // ON DELETE CASCADE na coluna parent_id remove junto as respostas deste comentário
          await env.DB.prepare("DELETE FROM comentarios WHERE id = ?").bind(id).run();
          return json({ ok: true }, 200, request);
        }
      }

      return json({ error: "rota não encontrada" }, 404, request);
    } catch (err) {
      return json({ error: "erro interno", detalhe: String(err) }, 500, request);
    }
  },
};
