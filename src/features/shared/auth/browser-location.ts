/**
 * 하드 이동의 단일 지점. 세션 상실·다른 탭 로그아웃·로그아웃은 캐시를 버리려고 문서를 새로 읽는다(라우터 이동이 아니다).
 * 테스트는 이 객체의 메서드를 `vi.spyOn`으로 바꾼다(jsdom의 `location` 메서드는 바꿀 수 없다).
 */
export const browserLocation = {
  assign: (url: string) => window.location.assign(url),
  reload: () => window.location.reload(),
  /** 지금 주소의 `경로?쿼리` — `redirect` 값으로 쓴다(해시는 버린다) */
  currentPath: () => `${window.location.pathname}${window.location.search}`,
};
