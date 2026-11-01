'use client';

import { overlay } from 'overlay-kit';

import type { EventDetail } from '@/api/event/schema';
import { shareKakaoFeed } from '@/features/shared/kakao-share/model/kakao-sdk';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { copyText } from '@/utils/copy-text';

import { eventShareTemplate } from '../model/event-share';
import { eventPageUrl, eventTitle } from '../model/event-summary';

const COPIED = '공연 주소를 복사했어요';
const FAILED = '공유하지 못했어요. 잠시 후 다시 시도해 주세요.';

async function copyEventUrl(url: string) {
  toast((await copyText(url)) ? COPIED : FAILED);
}

/** 카카오 공유창 — SDK가 실패하면 주소를 복사한다(patterns §14) */
async function shareKakao(event: EventDetail, url: string) {
  const result = await shareKakaoFeed(eventShareTemplate(event, url));
  if (result === 'shared') return;
  await copyEventUrl(url);
}

/** 기본 공유 시트(`navigator.share`)가 있는 브라우저인지 — 시트를 연 뒤(브라우저)에만 부른다 */
const canNativeShare = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/**
 * 공유 버튼(모바일 포스터 위 · PC 정사각 버튼 — Q22 기본안). 이슈 #106 §7 ⭐ — 카카오톡만 열려 카톡을 안 쓰면 공유할 수 없었다.
 * 고르는 시트: [카카오톡] · [링크 복사] · [다른 앱으로 공유](`navigator.share`가 있을 때만).
 * FIGMA-CUSTOM: 와이어(121:1216)의 공유 버튼은 바로 카카오 공유 — 선택 시트는 디자인 없음 → DS ResponsiveOverlay + Button.
 * 🤖 Claude 판단(2026-11-02), design-requests Q83. 되돌리려면 `shareEvent`가 `shareKakao`를 바로 부르게 한다
 */
export function shareEvent(event: EventDetail) {
  const url = eventPageUrl(window.location.origin, event.eventId);
  overlay.open(({ isOpen, close, unmount }) => {
    const run = (action: () => Promise<void>) => () => {
      close();
      void action();
    };
    return (
      <ResponsiveOverlay
        open={isOpen}
        onOpenChange={(o) => !o && close()}
        onExited={unmount}
        title="공유하기"
      >
        <Flex direction="column" gap={2}>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon={<Icon name="open-chat" variant="filled" />}
            onClick={run(() => shareKakao(event, url))}
          >
            카카오톡
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon={<Icon name="link" />}
            onClick={run(() => copyEventUrl(url))}
          >
            링크 복사
          </Button>
          {canNativeShare() && (
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={run(async () => {
                try {
                  await navigator.share({ title: eventTitle(event), url });
                } catch (e) {
                  // 사용자가 닫은 것(AbortError)은 조용히. 그 밖은 주소 복사로
                  if (e instanceof DOMException && e.name === 'AbortError') return;
                  await copyEventUrl(url);
                }
              })}
            >
              다른 앱으로 공유
            </Button>
          )}
        </Flex>
      </ResponsiveOverlay>
    );
  });
}
