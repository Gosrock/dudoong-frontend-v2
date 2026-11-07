'use client';

import { useEffect, useId } from 'react';

import { toast } from '@/ui/components/Toast/Toast';
import { Toggle } from '@/ui/components/Toggle/Toggle';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { useMarketingSetting } from '../model/useMarketingSetting';
import * as s from './mypage.css';

/**
 * 마이페이지 알림 설정 — 마케팅 수신 동의를 언제든 철회(처리방침 10장① · v1-additions E-1). 문구는 legal-copy B-6 원문,
 * 바꾸면 처리 결과 통지 토스트(B-7 — 전송자 · 일자 · 처리 내용, 정보통신망법 제50조⑧), 실패면 토글은 서버 값 그대로(낙관 갱신 없음).
 * FIGMA-CUSTOM: 디자인 없음(와이어 · GUI 마이페이지에 알림 설정이 없다). DS Toggle 한 줄(design-requests Q153).
 * 🤖 Claude 판단(2026-11-07): 철회 수단은 법적 의무라 디자인 전에 붙인다.
 */
export function MarketingSetting() {
  const m = useMarketingSetting();
  const titleId = useId();
  const helperId = useId();
  const { notice, dismiss } = m;

  useEffect(() => {
    if (!notice) return;
    toast(notice.message, { id: 'marketing-setting' });
    dismiss();
  }, [notice, dismiss]);

  return (
    <section aria-labelledby={`${titleId}-section`}>
      <Flex direction="column" gap={3} paddingX={5} paddingY={4}>
        <Txt as="h2" typography="headingSmEmphasized">
          <span id={`${titleId}-section`}>알림 설정</span>
        </Txt>
        <Flex align="center" gap={4}>
          <Flex direction="column" gap={1} className={s.grow}>
            <Txt typography="labelLg" color={colors.textPrimaryLabel}>
              <span id={titleId}>이벤트·혜택 정보 받기</span>
            </Txt>
            <Txt typography="labelSm" color={colors.textSecondaryLabel}>
              <span id={helperId}>새 공연 소식과 이벤트 혜택을 보내드려요</span>
            </Txt>
          </Flex>
          <Toggle
            aria-labelledby={titleId}
            aria-describedby={helperId}
            checked={m.value ?? false}
            disabled={m.value === undefined || m.pending}
            onCheckedChange={(next) => void m.set(next)}
          />
        </Flex>
        <Txt as="p" typography="labelSm" color={colors.textTertiaryLabel}>
          예매·취소·환불 안내는 설정과 관계없이 보내드려요.
        </Txt>
      </Flex>
    </section>
  );
}
