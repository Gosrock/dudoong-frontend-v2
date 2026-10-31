/** 프로세스가 요청을 받는지만 본다. 백엔드를 부르지 않는다(deploy-plan §6). */
export function GET() {
  return new Response('ok', { headers: { 'content-type': 'text/plain' } });
}
