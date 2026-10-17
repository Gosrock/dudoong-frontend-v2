import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from './__mocks__/server';
import { parseContentDispositionFilename } from './client';
import { ApiError } from './errors';
import { api } from './http';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);

describe('api.download', () => {
  it('래퍼 없는 xlsx를 Blob과 파일 이름으로 돌려준다', async () => {
    let search = '';
    server.use(
      http.get('*/api/v2/events/1/orders/export', ({ request }) => {
        search = new URL(request.url).search;
        return new HttpResponse(bytes, {
          headers: {
            'Content-Type': XLSX,
            'Content-Disposition': 'attachment; filename="orders-1.xlsx"',
          },
        });
      }),
    );
    const { blob, filename } = await api.download('events/1/orders/export', {
      searchParams: { status: 'APPROVED' },
    });
    expect(filename).toBe('orders-1.xlsx');
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
    expect(search).toBe('?status=APPROVED');
  });

  it('Content-Disposition이 없으면 filename null', async () => {
    server.use(
      http.get(
        '*/api/v2/x/export',
        () => new HttpResponse(bytes, { headers: { 'Content-Type': XLSX } }),
      ),
    );
    await expect(api.download('x/export')).resolves.toMatchObject({ filename: null });
  });

  it('실패 응답(JSON 에러 래퍼)은 ApiError', async () => {
    server.use(
      http.get('*/api/v2/events/1/orders/export', () =>
        HttpResponse.json(
          {
            success: false,
            status: 400,
            code: 'Order_400_19',
            reason: '엑셀로 내려받을 주문이 너무 많습니다.',
            timeStamp: '',
          },
          { status: 400 },
        ),
      ),
    );
    const error = await api.download('events/1/orders/export').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'Order_400_19',
      route: 'GET events/:param/orders/export',
    });
  });

  it('HTML 502는 NON_JSON, 200 성공 래퍼는 BAD_ENVELOPE', async () => {
    server.use(http.get('*/api/v2/a', () => new HttpResponse('<html>502</html>', { status: 502 })));
    await expect(api.download('a')).rejects.toMatchObject({ status: 502, code: 'NON_JSON' });
    server.use(
      http.get('*/api/v2/b', () =>
        HttpResponse.json({ success: true, status: 200, data: {}, timeStamp: '' }),
      ),
    );
    await expect(api.download('b')).rejects.toMatchObject({ status: 200, code: 'BAD_ENVELOPE' });
  });

  it('연결 실패는 URL 없는 NETWORK', async () => {
    server.use(http.get('*/api/v2/c', () => HttpResponse.error()));
    await expect(api.download('c')).rejects.toMatchObject({ status: 0, code: 'NETWORK' });
  });
});

describe('parseContentDispositionFilename', () => {
  it.each([
    ['attachment; filename="orders-1.xlsx"', 'orders-1.xlsx'],
    ['attachment; filename=orders-1.xlsx', 'orders-1.xlsx'],
    ['attachment;filename="a \\"b\\".xlsx"', 'a "b".xlsx'],
    ['attachment; filename="a; b.xlsx"', 'a; b.xlsx'],
    // RFC 5987: filename*가 filename보다 먼저
    [
      'attachment; filename="fallback.xlsx"; filename*=UTF-8\'\'%EC%A3%BC%EB%AC%B8%20%EB%AA%A9%EB%A1%9D.xlsx',
      '주문 목록.xlsx',
    ],
    ["attachment; filename*=utf-8'ko'%ED%8B%B0%EC%BC%93.xlsx", '티켓.xlsx'],
    ["attachment; filename*=ISO-8859-1''caf%E9.xlsx", 'café.xlsx'],
    // 잘못된 퍼센트 인코딩이면 filename으로
    ['attachment; filename*=UTF-8\'\'%E0%A4%A.xlsx; filename="ok.xlsx"', 'ok.xlsx'],
    // 경로는 지운다
    ['attachment; filename="../../etc/passwd"', 'passwd'],
    ['attachment; filename="..\\\\x.xlsx"', 'x.xlsx'],
    ['attachment; filename=".."', null],
    ['attachment', null],
    ['', null],
  ])('%s → %s', (header, expected) => {
    expect(parseContentDispositionFilename(header)).toBe(expected);
  });

  it('null이면 null', () => {
    expect(parseContentDispositionFilename(null)).toBeNull();
  });
});
