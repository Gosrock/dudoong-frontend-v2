import { useSuspenseQuery } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { errors, fail, ok } from '@/api/__mocks__/respond';
import { server } from '@/api/__mocks__/server';
import { hostMembersQuery, hostViewerQuery } from '@/api/host/queries';
import { api } from '@/api/http';
import { installLoggedInFetch } from '@/test/login-fetch';
import { renderWithProviders } from '@/test/render';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';

import { HostingAccessRejected, HostingForbidden } from './HostingAccessRejected';
import { hostingAccessOfRole } from './model/hosting-access';

/**
 * 비멤버 403 판정을 더미 하위 화면에서 돌린다(plan P10a 완료 기준 — 실제 `/hosting/hosts/[id]/…`는 P10b,
 * `/hosting/events/[id]/…`는 P11에서 확인). 라우트는 만들지 않고 화면 모양만 흉내 낸다:
 * 하위 화면 = `<AsyncBoundary rejected={HostingAccessRejected}>` + 멤버 전용 조회.
 */

let restore: () => void;
beforeEach(() => {
  restore = installLoggedInFetch();
});
afterEach(() => {
  restore();
  resetHostMockState();
});

/** 더미 공연 하위 화면 — GE-3 `GET /events/{id}/manage`(멤버 전용) 자리 */
function DummyEventScreen({ eventId }: { eventId: number }) {
  const { data } = useSuspenseQuery({
    queryKey: ['test', 'events', eventId, 'manage'],
    queryFn: () => api.get(`events/${eventId}/manage`, z.object({ eventId: z.number() })),
  });
  return <p>공연 관리 {data.eventId}</p>;
}

/** 더미 호스트 하위 화면 — 멤버 목록(GH-6, 비멤버 403) */
function DummyMembersScreen({ hostId }: { hostId: number }) {
  const { data } = useSuspenseQuery(hostMembersQuery(hostId));
  return <p>멤버 {data.length}명</p>;
}

/** 더미 호스트 설정 화면 — 공개 GH-3 viewer의 myRole로 판정(비멤버는 200 + myRole null) */
function DummySettingsScreen({ hostId }: { hostId: number }) {
  const { data } = useSuspenseQuery(hostViewerQuery(hostId));
  if (hostingAccessOfRole(data.myRole) === 'forbidden') return <HostingForbidden />;
  return <p>호스트 설정 {data.name}</p>;
}

const subRoute = (children: React.ReactNode) =>
  renderWithProviders(<AsyncBoundary rejected={HostingAccessRejected}>{children}</AsyncBoundary>);

describe('호스팅 하위 화면의 비멤버 판정', () => {
  it('공연: 멤버 전용 조회가 403(HOST_400_2)이면 공용 403 안내, 돌아갈 곳은 공연준비 홈', async () => {
    server.use(
      http.get('*/api/v2/events/77/manage', ({ request }) =>
        fail(request, 403, 'HOST_400_2', '해당 호스트에 대한 접근 권한이 없습니다.'),
      ),
    );
    subRoute(<DummyEventScreen eventId={77} />);
    expect(await screen.findByText('권한이 없어요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '공연준비 홈으로' })).toHaveAttribute(
      'href',
      '/hosting',
    );
  });

  it('공연: 없는·남의 공연(404)은 공용 404 안내', async () => {
    server.use(
      http.get('*/api/v2/events/78/manage', ({ request }) =>
        fail(request, 404, 'Event_404_1', '공연을 찾을 수 없습니다.'),
      ),
    );
    subRoute(<DummyEventScreen eventId={78} />);
    expect(await screen.findByText('찾을 수 없어요')).toBeInTheDocument();
    expect(screen.queryByText('권한이 없어요')).not.toBeInTheDocument();
  });

  it('공연: 5xx는 403·404가 아니라 다시 시도', async () => {
    server.use(http.get('*/api/v2/events/79/manage', ({ request }) => errors.serverError(request)));
    subRoute(<DummyEventScreen eventId={79} />);
    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('공연: 멤버면 화면을 그린다', async () => {
    server.use(http.get('*/api/v2/events/80/manage', () => ok({ eventId: 80 })));
    subRoute(<DummyEventScreen eventId={80} />);
    expect(await screen.findByText('공연 관리 80')).toBeInTheDocument();
  });

  it('호스트: 비멤버의 멤버 목록(GH-6 403 HOST_400_2)은 공용 403 안내', async () => {
    // mock 사용자는 소음공작소(12)의 멤버가 아니다
    subRoute(<DummyMembersScreen hostId={12} />);
    expect(await screen.findByText('권한이 없어요')).toBeInTheDocument();
  });

  it('호스트: 멤버(고스락 마스터)는 멤버 목록을 본다', async () => {
    subRoute(<DummyMembersScreen hostId={11} />);
    expect(await screen.findByText('멤버 4명')).toBeInTheDocument();
  });

  it('호스트: 공개 GH-3 viewer가 200 + myRole null이어도 403 안내', async () => {
    subRoute(<DummySettingsScreen hostId={12} />);
    expect(await screen.findByText('권한이 없어요')).toBeInTheDocument();
  });

  it('호스트: 멤버면 설정 화면', async () => {
    subRoute(<DummySettingsScreen hostId={11} />);
    expect(await screen.findByText('호스트 설정 고스락')).toBeInTheDocument();
  });
});
