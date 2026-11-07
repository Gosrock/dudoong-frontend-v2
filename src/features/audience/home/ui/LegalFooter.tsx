import { Fragment } from 'react';

import { Divider } from '@/ui/primitives/Divider';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './LegalFooter.css';

/**
 * 회사 사업자 정보(약관 제4조① — 상호·대표자·주소·전화·이메일·사업자등록번호·통신판매업 신고번호).
 * 값은 v1 운영 전역 푸터 원문(`shared/ui/src/components/Footer/index.tsx` — `feda26a` · `release/ticket` 같음, Front #345) 그대로.
 * 상호·대표·전화·이메일은 이용약관 머리말 · 제35조②, 처리방침 11장과도 맞다. 바꾸거나 빼지 않는다(legal-copy A-3).
 */
const BUSINESS_INFO_LINES = [
  '두둥스튜디오 | 서울시 강서구 강서로 266 129동 503호',
  '대표 : 이찬진 | TEL : 0507-0177-0711 | Email : support@dudoong.com',
  '사업자 번호 : 469-21-01595 | 통신판매업 신고번호 : 2022-서울강서-3669',
] as const;

/** 서비스 첫 화면 중개자 고지 — legal-copy A-3 원문(약관 제3조③ "서비스 첫 화면"). 바꾸거나 빼지 않는다 */
const FOOTER_INTERMEDIARY_NOTICE =
  '두둥은 통신판매중개자로서 공연의 당사자가 아니며, 공연의 개최·내용 등에 관한 의무와 책임은 각 공연의 호스트에게 있습니다.';

/**
 * 공연홈 맨 아래 푸터 — 사업자 정보 → 중개자 한 줄(A-3, v1과 같은 순서) → 처리방침 · 이용약관 링크(새 창).
 * FIGMA-CUSTOM: 디자인 없음(GUI 공연홈 `759:22391`에 푸터가 없다 — 사용자 결정 2026-11-07 "DS로 가장 단순하게", design-requests Q150).
 * 🤖 Claude 판단(2026-11-07): 약관이 말한 자리는 "서비스 첫 화면"이라 공연홈에만 둔다(셸 전역 푸터는 디자인 뒤 — v1은 전역).
 * v1의 로고 · SNS 링크 · 저작권 줄은 약관 근거가 아니라 넣지 않았다.
 */
export function LegalFooter() {
  return (
    <footer className={s.footer}>
      <Divider />
      <Flex direction="column" gap={3} paddingY={6} className={s.inner}>
        <Txt as="p" typography="labelSm" color={colors.textTertiaryLabel}>
          {BUSINESS_INFO_LINES.map((line, i) => (
            <Fragment key={line}>
              {i > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </Txt>
        <Txt as="p" typography="labelSm" color={colors.textTertiaryLabel}>
          {FOOTER_INTERMEDIARY_NOTICE}
        </Txt>
        <Flex as="nav" aria-label="약관" gap={4} wrap>
          <a href="/meta/privacy" target="_blank" rel="noopener noreferrer" className={s.link}>
            <Txt typography="labelSm" color={colors.textSecondaryLabel}>
              개인정보 처리방침
            </Txt>
          </a>
          <a href="/meta/term" target="_blank" rel="noopener noreferrer" className={s.link}>
            <Txt typography="labelSm" color={colors.textSecondaryLabel}>
              서비스 이용약관
            </Txt>
          </a>
        </Flex>
      </Flex>
    </footer>
  );
}
