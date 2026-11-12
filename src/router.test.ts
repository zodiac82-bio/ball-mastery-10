import { describe, expect, it } from 'vitest';
import { parseHash, routeHref } from './router';

describe('해시 라우팅', () => {
  it('빈 해시와 모르는 경로는 홈', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#/nope')).toEqual({ name: 'home' });
    expect(parseHash('#/drill')).toEqual({ name: 'home' });
  });

  it('동작 상세', () => {
    expect(parseHash('#/drill/tap-step')).toEqual({ name: 'drill', id: 'tap-step' });
    expect(parseHash('#drill/tap-step/')).toEqual({ name: 'drill', id: 'tap-step' });
  });

  it('기록·설정', () => {
    expect(parseHash('#/records')).toEqual({ name: 'records' });
    expect(parseHash('#/settings')).toEqual({ name: 'settings' });
  });

  it('routeHref와 parseHash는 서로 되돌린다', () => {
    const routes = [
      { name: 'home' as const },
      { name: 'drill' as const, id: 'drag-and-catch' },
      { name: 'records' as const },
      { name: 'settings' as const },
    ];
    for (const r of routes) expect(parseHash(routeHref(r))).toEqual(r);
  });

  it('깨진 인코딩에도 죽지 않는다', () => {
    expect(parseHash('#/drill/%E0%A4%A')).toEqual({ name: 'drill', id: '%E0%A4%A' });
  });
});
