import { setMockSession } from '../../e2e/support/auth';
import { hostingSets, resetHostingStore } from '../../src/api/__mocks__/hosting.handlers';
import { envelope, expect, http, HttpResponse, scenario } from '../scenario';

/**
 * 공연준비 홈 `/hosting` · 호스트 만들기 `/hosting/new/hosts` · 비멤버 403(plan P10a 완료 기준 V).
 * 근거는 **와이어**(GUI Ready for dev 없음) — 공연 탭 `424:11664`·`529:35358`, 호스트 탭 `424:9715`, 빈 상태 `487:15070`·`487:15360`,
 * 검색 `529:35512`·`531:12320`·`531:12470`, 호스트 만들기 `495:14815`, 만든 뒤 `495:14931`. 캡처는 이 와이어와 구조·문구·동작만 비교한다.
 *
 * 범주 검토
 * - 크롤러: 해당 없음 — 보호 화면(로그인 게이트 안, 서버 조회 없음)
 * - 권한: 비로그인 → 로그인은 e2e `hosting.spec.ts`(P10a-L). 여기서는 역할별 배지·⋮(일반 멤버에게 없음)·비멤버 403
 * - 반응형: 모든 시나리오가 mobile · desktop — [+ 새 … 만들기]가 모바일 오른쪽 아래 고정 ↔ PC 탭 줄 오른쪽(같은 DOM)
 */

scenario(
  'HH-1',
  '공연 탭 — 카드에 상태 칩·정보 줄, 준비중 공연에만 ⋮',
  {
    kind: '정상',
    summary:
      '기본 탭은 공연. 카드는 포스터 + 상태 칩 + 공연명 + 호스트 · 날짜 · 시각 · 장소(접두어 없음). ⋮는 준비중 + 매니저 이상만. [+ 새 공연 만들기]는 모바일 오른쪽 아래, PC는 탭 줄 오른쪽.',
    basis: ['plan P10a V 범위 · GUI 카드 문구', 'gui-screens §2 공연준비 홈', '와이어 424:11664'],
  },
  async ({ page, step }) => {
    resetHostingStore();
    await setMockSession(page, 'loggedIn');
    await step('공연준비 홈에 들어가면 공연 탭에 공연 카드 4개가 보인다', async () => {
      await page.goto('/hosting');
      await expect(page.getByRole('tab', { name: '공연' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(page.getByTestId('my-event')).toHaveCount(4);
    });
    await step('준비중 카드에는 "준비중" 칩과 ⋮가 있고, 지난 공연 카드에는 ⋮가 없다', async () => {
      const prep = page
        .getByTestId('my-event')
        .filter({ hasText: '고스락 신입 환영 공연(준비중)' });
      await expect(prep.getByText('준비중', { exact: true })).toBeVisible();
      await expect(prep.getByRole('button', { name: '공연 메뉴' })).toBeVisible();
      const past = page.getByTestId('my-event').filter({ hasText: '지난 공연' });
      await expect(past.getByRole('button', { name: '공연 메뉴' })).toHaveCount(0);
    });
    await step('[+ 새 공연 만들기]는 간편 공연 만들기로 간다', async () => {
      await expect(page.getByRole('link', { name: '새 공연 만들기' })).toHaveAttribute(
        'href',
        '/hosting/new/events',
      );
    });
  },
);

scenario(
  'HH-2',
  '호스트 탭 — 카드마다 내 역할 배지(마스터 · 일반)',
  {
    kind: '권한',
    summary: '호스트별 myRole이 다르면 배지도 다르다. 일반 멤버(GUEST)는 "일반".',
    basis: [
      'plan P10a 완료 기준 V "카드에 호스트별 myRole 배지"',
      '와이어 424:9715',
      'design-system §3 옛 Tag → tag_v2',
    ],
    mocks: [...hostingSets.mixedRoles],
  },
  async ({ page, step }) => {
    resetHostingStore();
    await setMockSession(page, 'loggedIn');
    await step('호스트 탭을 누르면 주소에 ?tab=hosts가 남고 호스트 카드가 보인다', async () => {
      await page.goto('/hosting');
      await page.getByRole('tab', { name: '호스트' }).click();
      await expect(page).toHaveURL('/hosting?tab=hosts');
      await expect(page.getByTestId('my-host')).toHaveCount(2);
    });
    await step('카드마다 역할 배지가 "마스터" · "일반"으로 다르다', async () => {
      await expect(page.getByTestId('my-role')).toHaveText(['마스터', '일반']);
      await expect(page.getByTestId('my-host').first().getByText('등록된 공연')).toBeVisible();
    });
  },
);

scenario(
  'HH-3',
  '소속 호스트가 없으면 두 탭 모두 빈 상태 + 만들기 버튼',
  {
    kind: '빈 상태',
    summary:
      '호스트 탭 "두둥! 등록한 호스트가 없어요." + [새 호스트 만들기](와이어 487:15360), 공연 탭 "두둥! 등록한 공연이 없어요" + [새 공연 만들기](487:15070). 빈 상태에서는 고정 버튼을 감춘다.',
    basis: ['와이어 487:15360 · 487:15070', 'design-requests Q50'],
    mocks: [...hostingSets.noMembership],
  },
  async ({ page, step }) => {
    resetHostingStore();
    await setMockSession(page, 'loggedIn');
    await step('호스트 탭이 빈 상태와 [새 호스트 만들기] 하나만 보인다', async () => {
      await page.goto('/hosting?tab=hosts');
      const empty = page.getByTestId('hosting-empty');
      await expect(empty).toContainText('두둥! 등록한 호스트가 없어요.');
      await expect(page.getByRole('link', { name: '새 호스트 만들기' })).toHaveCount(1);
    });
    await step('공연 탭도 빈 상태와 [새 공연 만들기] 하나만 보인다', async () => {
      await page.getByRole('tab', { name: '공연' }).click();
      await expect(page.getByTestId('hosting-empty')).toContainText('두둥! 등록한 공연이 없어요');
      await expect(page.getByRole('link', { name: '새 공연 만들기' })).toHaveCount(1);
    });
  },
);

scenario(
  'HH-4',
  '검색 — 지금 탭을 찾고, 없으면 "해당하는 … 없어요"',
  {
    kind: '빈 상태',
    summary:
      '돋보기를 누르면 ← + 검색칸이 탭 위에 열린다(와이어 529:35512). 결과 없음 문구는 탭마다(531:12320 · 531:12470).',
    basis: ['와이어 531:12572 공연준비 검색', 'plan P10a L 검색'],
  },
  async ({ page, step }) => {
    resetHostingStore();
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting');
    await expect(page.getByTestId('my-event')).toHaveCount(4);
    await step('돋보기를 누르고 "정기공연"을 치면 공연 2개만 남는다', async () => {
      await page.getByRole('button', { name: '검색 열기' }).click();
      await page.getByRole('searchbox', { name: '검색' }).fill('정기공연');
      await expect(page.getByTestId('my-event')).toHaveCount(2);
    });
    await step('없는 말을 치면 "두둥! 해당하는 공연이 없어요."', async () => {
      await page.getByRole('searchbox', { name: '검색' }).fill('없는 공연');
      await expect(page.getByTestId('hosting-empty')).toHaveText('두둥! 해당하는 공연이 없어요.');
    });
    await step('호스트 탭으로 바꿔도 검색어가 남고 "두둥! 해당하는 호스트가 없어요."', async () => {
      await page.getByRole('tab', { name: '호스트' }).click();
      await expect(page.getByTestId('hosting-empty')).toHaveText('두둥! 해당하는 호스트가 없어요.');
    });
    await step('←를 누르면 검색칸이 닫히고 전체 목록으로 돌아온다', async () => {
      await page.getByRole('button', { name: '검색 닫기' }).click();
      await expect(page.getByRole('searchbox', { name: '검색' })).toHaveCount(0);
      await expect(page.getByTestId('my-host')).toHaveCount(1);
    });
  },
);

scenario(
  'HH-5',
  '다음 페이지를 못 읽으면 기존 카드를 두고 하단에서 다시 시도',
  {
    kind: '에러',
    summary:
      '호스트 24개(10개씩). 2쪽이 5xx면 1쪽 카드는 남고 목록 아래 [다시 시도]. 전역 토스트 없음.',
    basis: ['patterns §12 무한 스크롤', 'plan P10a L 무한 스크롤'],
    mocks: [...hostingSets.nextPageError, ...hostingSets.manyHosts],
  },
  async ({ page, step }) => {
    resetHostingStore();
    await setMockSession(page, 'loggedIn');
    await step('호스트 탭 첫 10개가 보인다', async () => {
      await page.goto('/hosting?tab=hosts');
      await expect(page.getByTestId('my-host')).toHaveCount(10);
    });
    await step('맨 아래로 내리면 "더 불러오지 못했어요." + [다시 시도]', async () => {
      await page.getByTestId('my-host').last().scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, 2000);
      await expect(page.getByText('더 불러오지 못했어요.')).toBeVisible();
      await expect(page.getByTestId('my-host')).toHaveCount(10);
    });
  },
);

scenario(
  'HH-6',
  '준비중 공연을 ⋮ → 삭제 → 확인하면 목록에서 사라진다',
  {
    kind: '정상',
    summary: 'DE-9. 확인 팝업 뒤에만 지운다(디자인 없음 — Figma 코멘트로 물음).',
    basis: ['plan P10a GUI ⋮ 규칙', 'plan P11 DE-9', 'patterns §6 오버레이'],
  },
  async ({ page, mockApi, step }) => {
    resetHostingStore();
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting');
    const prep = page.getByTestId('my-event').filter({ hasText: '고스락 신입 환영 공연(준비중)' });
    await step('⋮를 누르면 [삭제] 메뉴가 열린다', async () => {
      await prep.getByRole('button', { name: '공연 메뉴' }).click();
      await expect(page.getByRole('menuitem', { name: '삭제' })).toBeVisible();
    });
    await step('[삭제]를 누르면 확인 팝업이 뜬다', async () => {
      await page.getByRole('menuitem', { name: '삭제' }).click();
      await expect(page.getByRole('alertdialog')).toContainText('공연을 삭제할까요?');
    });
    await step('확인하면 카드가 사라지고 DE-9를 한 번 보낸다', async () => {
      await page.getByRole('alertdialog').getByRole('button', { name: '삭제' }).click();
      await expect(prep).toHaveCount(0);
      expect(
        mockApi
          .calls()
          .filter((c) => c.method === 'DELETE')
          .map((c) => c.path),
      ).toEqual(['/api/v2/events/140']);
    });
  },
);

scenario(
  'HH-7',
  '호스트 만들기 — 연락처 유형 6종과 유형별 placeholder, 만들면 호스트 탭 + 토스트',
  {
    kind: '정상',
    summary:
      '유형 드롭다운 6종(유튜브 포함, Q8). placeholder: 전화 "-없이 입력해 주세요" · 이메일 "example@dudoong.com"(Q49) · 인스타 "@dudoong" · 오픈채팅 "URL" · 유튜브 "URL" · 기타 "URL 혹은 텍스트 입력". [만들기](Q19) 뒤 공연준비 홈 호스트 탭 + "새 호스트를 만들었습니다!"(와이어 495:14931).',
    basis: [
      'plan P10a 완료 기준 V "연락처 유형 6종 · placeholder"',
      '와이어 495:14815 · 495:14931',
      'design-requests Q8 · Q19 · Q49',
    ],
  },
  async ({ page, mockApi, step }) => {
    resetHostingStore();
    await setMockSession(page, 'loggedIn');
    const type = page.getByRole('combobox', { name: '연락처 유형 1' });
    const value = page.getByLabel('연락처 1', { exact: true });
    await step('호스트 만들기에 들어가면 이름 · 소개글 · 대표 연락처 칸이 보인다', async () => {
      await page.goto('/hosting/new/hosts');
      await expect(page.getByRole('heading', { name: '새 호스트 만들기' })).toBeVisible();
      await expect(page.getByLabel('호스트 이름')).toBeVisible();
    });
    await step('유형 드롭다운을 열면 6종이 서버 순서로 보인다', async () => {
      await type.click();
      await expect(page.getByRole('option')).toHaveText([
        '전화번호',
        '이메일',
        '인스타그램',
        '오픈채팅방',
        '유튜브',
        '기타',
      ]);
      await page.keyboard.press('Escape');
    });
    await step('유형을 고를 때마다 입력칸 placeholder가 바뀐다', async () => {
      const cases: [string, string][] = [
        ['전화번호', '-없이 입력해 주세요'],
        ['이메일', 'example@dudoong.com'],
        ['인스타그램', '@dudoong'],
        ['오픈채팅방', 'URL'],
        ['기타', 'URL 혹은 텍스트 입력'],
        ['유튜브', 'URL'],
      ];
      for (const [label, placeholder] of cases) {
        await type.click();
        await page.getByRole('option', { name: label }).click();
        await expect(value).toHaveAttribute('placeholder', placeholder);
      }
    });
    await step('채우고 [만들기]를 누르면 호스트 탭으로 가고 토스트가 뜬다', async () => {
      await page.getByLabel('호스트 이름').fill('새 밴드');
      await value.fill('https://youtube.com/@newband');
      await page.getByRole('button', { name: '만들기', exact: true }).click();
      await expect(page).toHaveURL('/hosting?tab=hosts');
      await expect(page.getByText('새 호스트를 만들었습니다!')).toBeVisible();
      await expect(page.getByTestId('my-host').first()).toContainText('새 밴드');
      expect(
        mockApi
          .calls()
          .filter((c) => c.method === 'POST')
          .map((c) => c.path),
      ).toEqual(['/api/v2/hosts']);
    });
  },
);

scenario(
  'HH-8',
  '호스트 만들기 — 빈 칸은 요청 없이 칸 아래 오류, 연락처 형식 오류(HOST_400_16)는 연락처 영역',
  {
    kind: '에러',
    summary:
      '[만들기]를 누른 뒤부터 칸 오류를 보인다. 서버 HOST_400_16은 어느 줄인지 몰라 연락처 영역 전체 오류, 이동·토스트 없음.',
    basis: ['patterns §24 P10a', 'error-codes HOST_400_16', 'plan P10a L'],
    mocks: [
      http.post('*/api/v2/hosts', () =>
        HttpResponse.json(envelope.error(400, 'HOST_400_16', '연락처 형식이 올바르지 않습니다.'), {
          status: 400,
        }),
      ),
    ],
  },
  async ({ page, mockApi, step }) => {
    resetHostingStore();
    await setMockSession(page, 'loggedIn');
    await page.goto('/hosting/new/hosts');
    await step('빈 채로 [만들기]를 누르면 요청 없이 이름 · 연락처 오류가 보인다', async () => {
      await page.getByRole('button', { name: '만들기', exact: true }).click();
      await expect(page.getByText('호스트 이름을 입력해 주세요')).toBeVisible();
      await expect(page.getByText('연락처 유형을 골라 주세요')).toBeVisible();
      expect(mockApi.calls().filter((c) => c.method === 'POST')).toEqual([]);
    });
    await step(
      '채워서 보냈는데 서버가 HOST_400_16이면 연락처 영역 오류가 보이고 머문다',
      async () => {
        await page.getByLabel('호스트 이름').fill('새 밴드');
        await page.getByRole('combobox', { name: '연락처 유형 1' }).click();
        await page.getByRole('option', { name: '전화번호' }).click();
        await page.getByLabel('연락처 1', { exact: true }).fill('0101234');
        await page.getByRole('button', { name: '만들기', exact: true }).click();
        await expect(page.getByRole('alert').filter({ hasText: '연락처' }).last()).toBeVisible();
        await expect(page).toHaveURL('/hosting/new/hosts');
      },
    );
  },
);

scenario(
  'HH-9',
  '비멤버가 호스트 관리 화면에 들어오면 403 안내 + 공연준비 홈으로',
  {
    kind: '권한',
    summary:
      'GH-6 403(HOST_400_2) → 공용 403 안내(P2 ForbiddenView + 호스팅 문구). 403 화면 디자인은 없다.',
    basis: ['plan P10a 완료 기준 V "비멤버 403 안내 화면"', 'patterns §11', 'api-contract §1 403'],
  },
  async ({ page, step }) => {
    resetHostingStore();
    await setMockSession(page, 'loggedIn');
    await step(
      '남의 호스트 멤버 화면을 열면 "권한이 없어요"와 [공연준비 홈으로]가 보인다',
      async () => {
        await page.goto('/hosting/hosts/12/members');
        const view = page.getByTestId('hosting-forbidden');
        await expect(view).toContainText('권한이 없어요');
        await expect(view.getByRole('link', { name: '공연준비 홈으로' })).toHaveAttribute(
          'href',
          '/hosting',
        );
      },
    );
  },
);
