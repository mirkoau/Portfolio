// id restricted to [a-z0-9-]: stops path traversal + junk reaching fetch()/innerHTML.
// Anything else (incl. in-page anchors like #work) is the index view.
const PROJECT = /^#\/work\/([a-z0-9-]+)$/;

let current = null;

export function parseHash(hash) {
  const m = hash.match(PROJECT);
  return m ? { view: 'project', projectId: m[1] } : { view: 'index' };
}

export function initRouter(onRoute) {
  const handle = () => {
    const route = parseHash(location.hash);
    if (current && current.view === route.view && current.projectId === route.projectId) return;
    const prev = current;
    current = route;
    onRoute(route, prev);
    // Umami auto-tracks pushState only; hash routes need a manual hit
    if (prev) window.umami?.track();
  };
  addEventListener('hashchange', handle);
  handle();
}
