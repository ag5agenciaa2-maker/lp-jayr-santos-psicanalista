/* Pages Middleware — roda antes de qualquer asset estático ou function.
   Redireciona a raiz do domínio .com.br (sem www) para www, preservando
   path e query string. Não afeta o domínio .ag5agencia.site nem .pages.dev. */

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  if (url.hostname === "jayrsantospsicanalista.com.br") {
    url.hostname = "www.jayrsantospsicanalista.com.br";
    return Response.redirect(url.toString(), 301);
  }

  return next();
}
