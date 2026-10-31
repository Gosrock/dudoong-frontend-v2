'use client';

import { overlay } from 'overlay-kit';

import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { NoticeBox, OptionRow } from './TicketParts';
import * as s from './TicketParts.css';

/**
 * "티켓 옵션이란?" 가이드 — GUI `924:1281`(모바일 시트) · `956:3157`(PC 모달), #49. DS `ResponsiveOverlay`.
 * 본문 둘째 줄의 "입금자명"은 뺐다(🤖 약관 제19조⑥ 금지 규칙 — 옵션으로 입금 정보를 받는 안내로 읽힐 수 있다, implementation-log P12-V)
 */
export function openOptionGuide() {
  overlay.open(({ isOpen, close, unmount }) => (
    <ResponsiveOverlay
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      onExited={unmount}
      title="티켓 옵션이란?"
      footer={
        <Button size="lg" fullWidth onClick={close}>
          확인
        </Button>
      }
    >
      <div className={s.stack} data-testid="option-guide">
        <div>
          <Txt as="p" typography="bodyMd">
            티켓을 구매할 때 필요한 정보를 받거나, 추가 상품을 팔 수 있는 기능이에요. 옵션은
            티켓별로 추가할 수 있고, 원하는 옵션이 없다면 직접 만들 수 있어요.
          </Txt>
          <ul className={s.bullets}>
            <li>
              <Txt typography="bodyMd">주관식 질문으로 학번 등을 입력받을 수 있어요.</Txt>
            </li>
            <li>
              <Txt typography="bodyMd">
                선택형 질문으로 뒤풀이 참석 등의 옵션을 선택할 수 있어요.
              </Txt>
            </li>
            <li>
              <Txt typography="bodyMd">옵션 응답에 따라 가격을 인상할 수 있어요.</Txt>
            </li>
          </ul>
        </div>
        <Txt as="p" typography="labelSm" color={colors.textSecondaryLabel}>
          주관식 질문으로 정보 받기
        </Txt>
        <OptionRow name="예시1) 학번을 입력해 주세요" type="SUBJECTIVE" yesAdditionalPrice={null} />
        <Txt as="p" typography="labelSm" color={colors.textSecondaryLabel}>
          선택형 질문으로 추가 상품 팔기
        </Txt>
        <OptionRow name="예시2) 뒤풀이 참석" type="YES_NO" yesAdditionalPrice={1000} />
        <NoticeBox icon="important">판매가 시작되면 옵션 이름과 설명만 바꿀 수 있어요.</NoticeBox>
      </div>
    </ResponsiveOverlay>
  ));
}

/**
 * "관리자 승인이란?" — GUI `971:21949`(#47, DS `다이얼로그-버튼하나` = `Popup` 확인 버튼 하나). 문구는 GUI 그대로
 */
export function openApprovalGuide() {
  return openConfirm({
    title: '관리자 승인이란?',
    description:
      '관객의 주문을 관리자(마스터/매니저)가 승인해야 티켓 발급이 이루어져요. 관리자 승인은 공연 등록 후 예매자 관리 페이지에서 가능해요.',
    confirmLabel: '확인',
    cancelLabel: null,
  });
}
