import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { actAsRole } from '@/api/__mocks__/host-store';
import { resetHostingStore } from '@/api/__mocks__/hosting.handlers';
import { installLoggedInFetch } from '@/test/login-fetch';
import { renderWithProviders } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { EventScopeView } from './EventScopeView';

/**
 * 실제 공연 하위 화면(`/hosting/events/[eventId]/…` 레이아웃)의 403·404 판정(plan P10a "비멤버 403"을 P11 라우트에서)과
 * 등록 상태별 메뉴. 라우트 자체(로그인 게이트·상태 코드)는 e2e `hosting-event.spec`.
 */

let restore: () => void;
beforeEach(() => {
  resetHostingStore();
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
  resetHostMockState();
  resetHostingStore();
});

const menuLabels = () =>
  within(screen.getByRole('navigation', { name: '공연 메뉴' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent);

describe('공연 스코프 — 접근 판정', () => {
  it('비멤버(소음공작소 공연 102 — GE-3 403 HOST_400_2)는 공용 403 안내, 하위 화면을 그리지 않는다', async () => {
    renderWithProviders(
      <EventScopeView eventId="102">
        <p>하위 화면</p>
      </EventScopeView>,
    );
    expect(await screen.findByText('권한이 없어요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '공연준비 홈으로' })).toHaveAttribute(
      'href',
      '/hosting',
    );
    expect(screen.queryByText('하위 화면')).not.toBeInTheDocument();
  });

  it('없는 공연(404 Event_404_1)은 공용 404 안내', async () => {
    renderWithProviders(<EventScopeView eventId="999999">x</EventScopeView>);
    expect(await screen.findByText('찾을 수 없어요')).toBeInTheDocument();
  });

  it('주소의 id가 숫자가 아니면 요청 없이 공용 404', async () => {
    const sent = recordRequests();
    renderWithProviders(<EventScopeView eventId="abc">x</EventScopeView>);
    expect(await screen.findByText('찾을 수 없어요')).toBeInTheDocument();
    expect(await sent.list()).toEqual([]);
  });
});

describe('공연 스코프 — 메뉴 · 읽기 전용', () => {
  it('준비중 공연: 메뉴 4개, "공연 페이지 보기" 없음', async () => {
    renderWithProviders(
      <EventScopeView eventId="140">
        <p>하위 화면</p>
      </EventScopeView>,
    );
    expect(await screen.findByText('하위 화면')).toBeInTheDocument();
    expect(menuLabels()).toEqual(['대시보드', '기본 정보', '상세 정보', '티켓 관리']);
    expect(screen.queryByRole('link', { name: '공연 페이지 보기' })).not.toBeInTheDocument();
  });

  it('등록된 공연: 메뉴 6개 + "공연 페이지 보기"', async () => {
    renderWithProviders(<EventScopeView eventId="101">x</EventScopeView>);
    expect(await screen.findByRole('link', { name: '공연 페이지 보기' })).toHaveAttribute(
      'href',
      '/events/101',
    );
    expect(menuLabels()).toEqual([
      '대시보드',
      '기본 정보',
      '상세 정보',
      '티켓 관리',
      '예매자 관리',
      'QR 체크인',
    ]);
  });

  it('일반 멤버는 읽기 전용 안내', async () => {
    actAsRole(11, 'GUEST');
    renderWithProviders(<EventScopeView eventId="140">x</EventScopeView>);
    expect(await screen.findByTestId('read-only')).toHaveTextContent(
      '일반 멤버는 공연 정보를 볼 수만 있어요',
    );
  });
});
