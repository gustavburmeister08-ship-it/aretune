const dynamicAppRoute = /^\/(?:profile|post|category|chat)\/[^/]+\/?$/;

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (!dynamicAppRoute.test(url.pathname)) {
    return context.next();
  }

  url.pathname = '/';
  return context.env.ASSETS.fetch(url);
}
