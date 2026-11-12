import { useEffect, useState } from 'react';

// 화면이 몇 개뿐이라 라우터 라이브러리 없이 해시로 처리한다.
// 정적 호스팅(GitHub Pages 등)에서 서버 설정 없이 동작한다.

export type Route =
  { name: 'home' } | { name: 'drill'; id: string } | { name: 'records' } | { name: 'settings' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  const parts = path.split('/').filter((p) => p.length > 0);
  const head = parts[0];
  const second = parts[1];
  if (head === 'drill' && second) {
    let id = second;
    try {
      id = decodeURIComponent(second);
    } catch {
      /* 잘못된 인코딩은 그대로 둔다 → 없는 동작으로 처리됨 */
    }
    return { name: 'drill', id };
  }
  if (head === 'records') return { name: 'records' };
  if (head === 'settings') return { name: 'settings' };
  return { name: 'home' };
}

export function routeHref(route: Route): string {
  switch (route.name) {
    case 'drill':
      return '#/drill/' + encodeURIComponent(route.id);
    case 'records':
      return '#/records';
    case 'settings':
      return '#/settings';
    default:
      return '#/';
  }
}

export function navigate(route: Route): void {
  window.location.hash = routeHref(route);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
