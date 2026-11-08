import { Fragment } from 'react';

import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './LegalFooter.css';

/**
 * 회사 사업자 정보(약관 제4조① — 상호·대표자·주소·전화·이메일·사업자등록번호·통신판매업 신고번호).
 * 값은 v1 운영 전역 푸터 원문(`shared/ui/src/components/Footer/index.tsx` — `feda26a` · `release/ticket` 같음, Front #345) 그대로.
 * 상호·대표·전화·이메일은 이용약관 머리말 · 제35조②, 처리방침 11장과도 맞다. 바꾸거나 빼지 않는다(legal-copy A-3).
 * GUI 푸터(`1383:3438`, 2026-11-08)의 글자도 이 원문과 한 글자도 다르지 않다(Design Sync #205 대조).
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
 * SNS 바로가기(GUI `1383:3434` — DS `ic_github` filled · `ic_instagram` gray · `ic_open-chat` filled, 간격 8).
 * 목적지는 Figma에 없어 v1 운영 푸터(`feda26a`)의 주소를 그대로 쓴다 — 🤖 Claude 판단(2026-11-08, design-requests Q221 · Figma 코멘트 `1383:3434`).
 * 오픈채팅 아이콘은 v1 세 번째 아이콘처럼 두둥 카카오톡 채널로 간다.
 */
const SNS_LINKS = [
  {
    label: '두둥 GitHub',
    href: 'https://github.com/Gosrock',
    icon: <Icon name="github" variant="filled" />,
  },
  {
    label: '두둥 인스타그램',
    href: 'https://www.instagram.com/dudoong_official/',
    icon: <Icon name="instagram" variant="gray" />,
  },
  {
    label: '두둥 카카오톡 채널',
    href: 'http://pf.kakao.com/_xiaLWxj',
    icon: <Icon name="open-chat" variant="filled" />,
  },
] as const;

/**
 * 공연홈 맨 아래 푸터(GUI 공연홈 `759:22391`의 `1383:3429`, Design Sync #205) — 회색 판(`Background/grey`) · 안쪽 24 · 간격 12:
 * 저작권 줄 → 사업자 정보 세 줄 + 중개자 한 줄(A-3, 한 덩어리) → 처리방침 | 이용약관(밑줄, 새 창) → SNS 아이콘. 글자는 모두 Body/sm `text/secondary`.
 * 🤖 Claude 판단(2026-11-07): 약관이 말한 자리는 "서비스 첫 화면"이라 공연홈에만 둔다(GUI도 공연홈 프레임에만 있다).
 */
export function LegalFooter() {
  return (
    <footer className={s.footer}>
      <Flex direction="column" gap={3} className={s.inner}>
        <Txt as="p" typography="bodySm" color={colors.textSecondary}>
          © Dudoong All Rights Reserved
        </Txt>
        <Txt as="p" typography="bodySm" color={colors.textSecondary}>
          {BUSINESS_INFO_LINES.map((line) => (
            <Fragment key={line}>
              {line}
              <br />
            </Fragment>
          ))}
          {FOOTER_INTERMEDIARY_NOTICE}
        </Txt>
        <nav aria-label="약관">
          <Txt as="p" typography="bodySm" color={colors.textSecondary}>
            <a href="/meta/privacy" target="_blank" rel="noopener noreferrer" className={s.link}>
              개인정보 처리방침
            </a>
            <span aria-hidden className={s.separator}>
              |
            </span>
            <a href="/meta/term" target="_blank" rel="noopener noreferrer" className={s.link}>
              서비스 이용약관
            </a>
          </Txt>
        </nav>
        <Flex as="ul" gap={2} align="center" className={s.snsList}>
          {SNS_LINKS.map((sns) => (
            <li key={sns.href}>
              <a
                href={sns.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={sns.label}
                className={s.snsLink}
              >
                {sns.icon}
              </a>
            </li>
          ))}
        </Flex>
      </Flex>
    </footer>
  );
}
