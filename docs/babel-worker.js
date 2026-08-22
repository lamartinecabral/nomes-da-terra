/*
 * The GitHub Pages app is intentionally served without a build step.  This
 * worker makes TypeScript modules look like normal JavaScript modules to the
 * browser before they are evaluated.
 */
const BABEL_URL =
  "https://cdn.jsdelivr.net/npm/@babel/standalone@7.29.7/babel.min.js";

self.addEventListener("install", (event) => {
  console.log("install");
  event.waitUntil(
    (async () => {
      // Babel Standalone exposes `Babel` on the worker global when loaded with
      // importScripts.  Loading it during install also makes activation wait
      // until the transformer is ready.
      if (!self.Babel) importScripts(BABEL_URL);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  console.log("activate");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (
    url.origin !== self.location.origin ||
    !/\.(?:ts|tsx|jsx)$/i.test(url.pathname)
  ) {
    return;
  }

  event.respondWith(transpile(event.request));
});

async function transpile(request) {
  const response = await fetch(request);
  if (!response.ok) return response;

  const source = await response.text();
  const result = self.Babel.transform(source, {
    filename: new URL(request.url).pathname,
    sourceType: "module",
    presets: ["react", "typescript"],
  });

  const headers = new Headers(response.headers);
  headers.set("content-type", "text/javascript; charset=utf-8");
  // The fetched body has already been decoded by fetch; forwarding these
  // metadata headers would describe the original TypeScript response.
  headers.delete("content-encoding");
  headers.delete("content-length");

  return new Response(result.code, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
