import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MISSING_HOST_ID } from '@/api/__mocks__/fixtures/host';
import { resetHostMockState } from '@/api/__mocks__/host.handlers';
import { installLoggedInFetch } from '@/test/login-fetch';
import { renderWithProviders } from '@/test/render';
import { recordRequests } from '@/test/requests';

import { HostMembersView } from './HostMembersView';
import { HostSettingsView } from './HostSettingsView';

/**
 * 실제 호스트 하위 화면(`/hosting/hosts/[hostId]/settings`·`/members`)의 403·404 판정(plan P10a "비멤버 403"을 P10b 라우트에서).
 * 라우트 자체(로그인 게이트·상태 코드)는 e2e `hosting-host.spec`.
 */

let restore: () => void;
beforeEach(() => {
  restore = installLoggedInFetch();
});
afterEach(() => {
  vi.restoreAllMocks();
  restore();
  resetHostMockState();
});

const VIEWS = [
  ['설정', HostSettingsView],
  ['멤버', HostMembersView],
] as const;

describe.each(VIEWS)('호스트 %s 화면 — 접근 판정', (_, View) => {
  it('비멤버(소음공작소 12)는 공용 403 안내, 돌아갈 곳은 공연준비 홈', async () => {
    renderWithProviders(<View hostId="12" />);
    expect(await screen.findByText('권한이 없어요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '공연준비 홈으로' })).toHaveAttribute(
      'href',
      '/hosting',
    );
  });

  it('없는 호스트(404 Host_404_1)는 공용 404 안내', async () => {
    renderWithProviders(<View hostId={String(MISSING_HOST_ID)} />);
    expect(await screen.findByText('찾을 수 없어요')).toBeInTheDocument();
  });

  it('주소의 id가 숫자가 아니면 요청 없이 공용 404', async () => {
    const sent = recordRequests();
    renderWithProviders(<View hostId="abc" />);
    expect(await screen.findByText('찾을 수 없어요')).toBeInTheDocument();
    expect(await sent.list()).toEqual([]);
  });

  it('멤버(고스락 마스터)는 화면을 그린다', async () => {
    renderWithProviders(<View hostId="11" />);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText('권한이 없어요')).not.toBeInTheDocument();
  });
});
