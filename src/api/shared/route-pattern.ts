/** 바로 다음 세그먼트가 토큰인 리소스. 토큰은 모양과 상관없이 가린다. */
const TOKEN_PARENTS = new Set(['gifts']);

/**
 * 로그용 라우트 패턴. id·토큰처럼 보이는 세그먼트를 `:param`으로 가리고 쿼리스트링은 버린다(tech-decisions §13).
 * 소문자 단어와 하이픈만으로 된 세그먼트(`events`, `ticket-items`)만 남기되, 토큰 리소스 바로 뒤는 항상 가린다.
 */
export function routePattern(path: string) {
  const segs = path.split('?')[0]!.split('/');
  return segs
    .map((seg, i) => {
      const prev = segs[i - 1];
      if (prev !== undefined && TOKEN_PARENTS.has(prev)) return ':param';
      return /^[a-z][a-z-]*$/.test(seg) ? seg : ':param';
    })
    .join('/');
}
