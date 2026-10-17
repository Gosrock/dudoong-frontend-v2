import { http, HttpResponse } from 'msw';

/** 가짜 S3. 실제 presigned URL처럼 다른 출처다 */
export const MOCK_S3_ORIGIN = 'https://s3.mock.dudoong.test';
const MOCK_IMAGE_ORIGIN = 'https://image.mock.dudoong.test';

const ok = <T>(data: T) => HttpResponse.json({ success: true, status: 200, data, timeStamp: '' });

let seq = 0;
/** 백엔드처럼 `{prefix}/{uuid}.{jpeg|png}` key를 만든다(JPG도 jpeg) */
function issue(prefix: string, extension: unknown) {
  seq += 1;
  const ext = extension === 'PNG' ? 'png' : 'jpeg';
  const key = `${prefix}/00000000-0000-4000-8000-${String(seq).padStart(12, '0')}.${ext}`;
  return {
    presignedUrl: `${MOCK_S3_ORIGIN}/${key}?X-Amz-Expires=180&X-Amz-Signature=mock`,
    key,
    url: `${MOCK_IMAGE_ORIGIN}/${key}`,
  };
}

async function readBody(request: Request) {
  return (await request.json().catch(() => ({}))) as { purpose?: unknown; extension?: unknown };
}

/**
 * 이미지 업로드 발급 3종(PH-15 · PE-10 · PM-3) + S3 PUT.
 * 기본 `handlers`(handlers.ts)에 포함된다.
 */
export const uploadHandlers = [
  http.post('*/api/v2/hosts/:hostId/images', async ({ request, params }) => {
    const body = await readBody(request);
    return ok({ purpose: body.purpose, ...issue(`host/${String(params.hostId)}`, body.extension) });
  }),
  http.post('*/api/v2/events/:eventId/images', async ({ request, params }) => {
    const body = await readBody(request);
    return ok({
      purpose: body.purpose,
      ...issue(`event/${String(params.eventId)}`, body.extension),
    });
  }),
  http.post('*/api/v2/me/images', async ({ request }) => {
    const body = await readBody(request);
    return ok(issue('user/1', body.extension));
  }),
  http.put(`${MOCK_S3_ORIGIN}/*`, () => new HttpResponse(null, { status: 200 })),
];
