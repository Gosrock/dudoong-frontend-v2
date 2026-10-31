type Level = 'info' | 'warn' | 'error';

/**
 * 구조화 stdout 로그. CloudWatch 가 그대로 수집한다(tech-decisions §13).
 * 계좌번호·입금자명·토큰은 넣지 않는다. 경로는 라우트 패턴(`gifts/:token`)으로 남긴다.
 */
export function log(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}
