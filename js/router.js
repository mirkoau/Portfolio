let _onRoute = null;
let _currentRoute = null;

const routes = {
  index: { pattern: /^$|^#\/?$/ },
  project: { pattern: /^#\/work\/(.+)$/ },
};

function parseHash(hash) {
  const h = hash || '';
  const projectMatch = h.match(routes.project.pattern);
  if (projectMatch) return { view: 'project', projectId: projectMatch[1] };
  return { view: 'index' };
}

function handleRoute() {
  const route = parseHash(location.hash);
  // Skip if same route
  if (_currentRoute
    && _currentRoute.view === route.view
    && _currentRoute.projectId === route.projectId) return;
  const prev = _currentRoute;
  _currentRoute = route;
  if (_onRoute) _onRoute(route, prev);
}

export function navigate(hash, { replaceTrigger } = {}) {
  if (replaceTrigger) {
    history.replaceState(null, '', hash);
  } else {
    history.pushState(null, '', hash);
  }
  handleRoute();
}

export function currentRoute() {
  return _currentRoute || parseHash(location.hash);
}

export function resetRoute() {
  _currentRoute = parseHash(location.hash);
}

export function initRouter(onRoute) {
  _onRoute = onRoute;
  window.addEventListener('hashchange', handleRoute);
  // Parse initial hash on load
  handleRoute();
}
