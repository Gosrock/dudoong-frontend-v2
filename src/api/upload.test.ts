import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from './__mocks__/server';
import { MOCK_S3_ORIGIN, uploadHandlers } from './__mocks__/upload-handlers';
import { ApiError } from './errors';
import {
  imageExtensionOf,
  UPLOAD_INVALID_EXTENSION,
  UPLOAD_PUT_FAILED,
  uploadImage,
} from './upload';

const png = () =>
  new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'cover.png', { type: 'image/png' });

describe('uploadImage', () => {
  it('발급 → S3 PUT → key·url을 돌려준다(호스트)', async () => {
    let issueBody: unknown;
    let put: { contentType: string | null; cookie: string | null; size: number } | undefined;
    // 앞에 둔 핸들러가 먼저 받는다. 값을 기록하고 undefined로 기본 핸들러에 넘긴다
    server.use(
      http.post('*/api/v2/hosts/:hostId/images', async ({ request }) => {
        issueBody = await request.clone().json();
        return undefined;
      }),
      http.put(`${MOCK_S3_ORIGIN}/*`, async ({ request }) => {
        put = {
          contentType: request.headers.get('content-type'),
          cookie: request.headers.get('cookie'),
          size: (await request.arrayBuffer()).byteLength,
        };
        return new HttpResponse(null, { status: 200 });
      }),
      ...uploadHandlers,
    );
    const result = await uploadImage({
      target: { kind: 'host', hostId: 7, purpose: 'COVER' },
      file: png(),
    });
    expect(issueBody).toEqual({ purpose: 'COVER', extension: 'PNG' });
    expect(put).toEqual({ contentType: 'image/png', cookie: null, size: 4 });
    expect(result.key).toMatch(/^host\/7\/[0-9a-f-]{36}\.png$/);
    expect(result.url).toContain(result.key);
  });

  it.each([
    [
      { kind: 'event', eventId: 3, purpose: 'POSTER' } as const,
      { purpose: 'POSTER', extension: 'JPEG' },
      /^event\/3\//,
    ],
    [{ kind: 'profile' } as const, { extension: 'JPEG' }, /^user\//],
  ])('공연·프로필 발급 경로와 본문 (%o)', async (target, body, keyPattern) => {
    let issueBody: unknown;
    let contentType: string | null = null;
    server.use(
      http.post('*/api/v2/:a/:b/images', async ({ request }) => {
        issueBody = await request.clone().json();
        return undefined;
      }),
      http.post('*/api/v2/me/images', async ({ request }) => {
        issueBody = await request.clone().json();
        return undefined;
      }),
      http.put(`${MOCK_S3_ORIGIN}/*`, ({ request }) => {
        contentType = request.headers.get('content-type');
        return new HttpResponse(null, { status: 200 });
      }),
      ...uploadHandlers,
    );
    const file = new File(['x'], 'photo.JPG', { type: 'image/jpeg' });
    const result = await uploadImage({ target, file });
    expect(issueBody).toEqual(body);
    expect(contentType).toBe('image/jpeg');
    expect(result.key).toMatch(keyPattern);
    expect(result.key).toMatch(/\.jpeg$/);
  });

  it('JPEG·JPG·PNG가 아니면 발급 요청 없이 UPLOAD_INVALID_EXTENSION', async () => {
    let issued = false;
    server.use(
      http.post('*/api/v2/me/images', () => {
        issued = true;
        return HttpResponse.json({});
      }),
    );
    const gif = new File(['x'], 'a.gif', { type: 'image/gif' });
    const error = await uploadImage({ target: { kind: 'profile' }, file: gif }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: UPLOAD_INVALID_EXTENSION });
    expect((error as ApiError).reason).not.toBe('');
    expect(issued).toBe(false);
  });

  it('S3 PUT이 실패하면(만료 403) UPLOAD_PUT_FAILED, URL은 메시지에 남지 않는다', async () => {
    server.use(
      http.put(
        `${MOCK_S3_ORIGIN}/*`,
        () => new HttpResponse('<Error>AccessDenied</Error>', { status: 403 }),
      ),
      ...uploadHandlers,
    );
    const error = await uploadImage({ target: { kind: 'profile' }, file: png() }).catch(
      (e: unknown) => e,
    );
    expect(error).toMatchObject({ status: 403, code: UPLOAD_PUT_FAILED });
    expect(String((error as Error).message)).not.toContain('Signature');
  });

  it('S3 연결 실패는 NETWORK', async () => {
    server.use(
      http.put(`${MOCK_S3_ORIGIN}/*`, () => HttpResponse.error()),
      ...uploadHandlers,
    );
    await expect(uploadImage({ target: { kind: 'profile' }, file: png() })).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK',
    });
  });

  it('발급 실패(분당 30회 초과 429)는 백엔드 에러 그대로, PUT하지 않는다', async () => {
    let putCalled = false;
    server.use(
      http.post('*/api/v2/me/images', () =>
        HttpResponse.json(
          {
            success: false,
            status: 429,
            code: 'GLOBAL_429_1',
            reason: '과도한 요청',
            timeStamp: '',
          },
          { status: 429 },
        ),
      ),
      http.put(`${MOCK_S3_ORIGIN}/*`, () => {
        putCalled = true;
        return new HttpResponse(null);
      }),
    );
    await expect(uploadImage({ target: { kind: 'profile' }, file: png() })).rejects.toMatchObject({
      status: 429,
      code: 'GLOBAL_429_1',
    });
    expect(putCalled).toBe(false);
  });
});

describe('imageExtensionOf', () => {
  it.each([
    [{ type: 'image/png', name: 'a.png' }, 'PNG'],
    [{ type: 'image/jpeg', name: 'a.jpg' }, 'JPEG'],
    [{ type: 'IMAGE/JPEG', name: 'a' }, 'JPEG'],
    // MIME이 비면 이름으로
    [{ type: '', name: 'a.JPG' }, 'JPEG'],
    [{ type: '', name: 'a.jpeg' }, 'JPEG'],
    [{ type: '', name: 'a.png' }, 'PNG'],
    [{ type: '', name: 'noext' }, null],
    [{ type: 'image/webp', name: 'a.png' }, null],
    [{ type: 'image/heic', name: 'a.heic' }, null],
    [{ type: 'image/gif', name: 'a.gif' }, null],
  ])('%o → %s', (file, expected) => {
    expect(imageExtensionOf(file)).toBe(expected);
  });
});
