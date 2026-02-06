export const runtime = "nodejs";

function escapeHtmlAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const title = "Vault Preview Frame";

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtmlAttr(title)}</title>
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #0a0a0a; overflow: hidden; position: fixed; }
      #inner { width: 100%; height: 100%; border: 0; display: block; overflow: hidden; }
      .hint { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.6); font: 12px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    </style>
  </head>
  <body>
    <iframe
      id="inner"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
      referrerpolicy="no-referrer"
      title="Preview"
    ></iframe>
    <div id="hint" class="hint">Waiting for preview…</div>

    <script>
      (function () {
        const INNER = document.getElementById('inner');
        const HINT = document.getElementById('hint');
        const ALLOWED_ORIGIN = ${JSON.stringify(origin)};
        const PARENT = window.parent;

        function postToParent(msg) {
          try { PARENT && PARENT.postMessage(msg, ALLOWED_ORIGIN); } catch {}
        }

        function youtubeIdFromUrl(url) {
          try {
            const u = new URL(url, location.href);
            const host = (u.hostname || '').toLowerCase();
            // youtu.be/<id>
            if (host === 'youtu.be') {
              const id = u.pathname.split('/').filter(Boolean)[0];
              return id || null;
            }
            // youtube.com/watch?v=<id>
            if (host.endsWith('youtube.com')) {
              if (u.pathname === '/watch') return u.searchParams.get('v');
              // youtube.com/shorts/<id>
              const parts = u.pathname.split('/').filter(Boolean);
              if (parts[0] === 'shorts' && parts[1]) return parts[1];
              // youtube.com/embed/<id>
              if (parts[0] === 'embed' && parts[1]) return parts[1];
            }
          } catch {}
          return null;
        }

        function rewriteYouTubeIframes(doc) {
          if (!doc) return;
          const iframes = Array.from(doc.querySelectorAll('iframe[src]'));
          for (const iframe of iframes) {
            const src = iframe.getAttribute('src') || '';
            if (!src) continue;
            const id = youtubeIdFromUrl(src);
            if (!id) continue;

            const desired = 'https://www.youtube.com/embed/' + encodeURIComponent(id) + '?rel=0&modestbranding=1';
            if (iframe.src !== desired) {
              iframe.src = desired;
            }
            // Helpful defaults; safe if already set by user code.
            if (!iframe.getAttribute('allow')) {
              iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            }
            if (!iframe.getAttribute('allowfullscreen')) {
              iframe.setAttribute('allowfullscreen', '');
            }
          }
        }

        let observer = null;
        function attachFixups() {
          try {
            const doc = INNER && INNER.contentDocument;
            if (!doc) return;
            rewriteYouTubeIframes(doc);
            if (observer) observer.disconnect();
            observer = new MutationObserver(() => rewriteYouTubeIframes(doc));
            observer.observe(doc, { childList: true, subtree: true });
          } catch {}
        }

        // Forward console/error messages from inner preview up to the app.
        window.addEventListener('message', (event) => {
          // Only accept messages from same-origin parent.
          if (event.origin !== ALLOWED_ORIGIN) return;
          const data = event.data;
          if (!data || typeof data !== 'object') return;

          if (data.type === 'setPreviewHtml' && typeof data.html === 'string') {
            if (HINT) HINT.style.display = 'none';
            // Setting srcdoc resets the inner browsing context. Attach fixups after load.
            INNER.srcdoc = data.html;
            postToParent({ type: 'preview:accepted' });
            return;
          }
        });

        // Listen for messages coming from the INNER iframe (the rendered preview).
        // The preview runtime posts logs/errors to window.parent; here we forward them.
        window.addEventListener('message', (event) => {
          // Messages from inner have origin "null" (srcdoc) or same-origin.
          // We forward only structured messages we expect.
          const data = event.data;
          if (!data || typeof data !== 'object') return;
          if (data.type === 'console') {
            postToParent(data);
          }
        });

        INNER.addEventListener('load', () => {
          attachFixups();
          postToParent({ type: 'preview:loaded' });
        });
      })();
    </script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // Explicitly use credentialless cross-origin isolation for preview frame
      // This satisfies the parent's require-corp policy while still allowing
      // loading external assets (SVGs, images, etc.) without CORP headers
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Cross-Origin-Opener-Policy": "unsafe-none",
    },
  });
}

