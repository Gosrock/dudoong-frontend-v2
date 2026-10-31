'use client';

import type { CheckInTone } from '@/features/shared/checkin-result/model/checkin-result';
import { Button } from '@/ui/components/Button/Button';
import { Spinner } from '@/ui/components/Loader/Loader';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { HostScanState } from '../model/useHostScan';
import * as s from './QrCheckIn.css';

const TONE = {
  success: { icon: 'circle-check', color: colors.statusSuccess },
  warning: { icon: 'circle-request', color: colors.statusWarning },
  error: { icon: 'circle-reject', color: colors.statusError },
} as const satisfies Record<CheckInTone, { icon: string; color: string }>;

/** 티켓 QR이 아님 — 라이브러리가 아닌 화면 문구(P13b-L 잠정) */
const INVALID_QR = '티켓 QR이 아니에요';

type Props = {
  state: HostScanState;
  onRetry: () => void;
  onNext: () => void;
  /** 카메라를 켜지 못했으면 기다림 안내를 그리지 않는다 */
  cameraReady?: boolean;
};

/**
 * [호스트가 스캔] 판독 결과 — 카메라 위 아래쪽에 겹친다. 디자인 없음(design-requests "결과마다 아이콘 + 문구 한 줄 +
 * 다음 스캔 버튼" 기본안). `result` 5종 + 모르는 값 · 티켓 QR 아님 · 공연 상태(`Event_400_27`) · 네트워크·서버 실패.
 * 카메라는 멈추지 않는다 — 다음 티켓을 비추면 결과가 바뀐다. [다음 스캔]은 결과를 지운다.
 */
export function ScanResult({ state, onRetry, onNext, cameraReady = true }: Props) {
  return (
    <section
      aria-label="스캔 결과"
      aria-live="polite"
      data-status={state.status}
      data-result={state.status === 'result' ? state.view.result : undefined}
      className={s.resultDock}
    >
      <Body state={state} onRetry={onRetry} onNext={onNext} cameraReady={cameraReady} />
    </section>
  );
}

function Body({ state, onRetry, onNext, cameraReady }: Props) {
  switch (state.status) {
    case 'idle':
      if (!cameraReady) return null;
      return (
        <Txt typography="labelMd" className={s.hint}>
          티켓 QR을 카메라에 비춰 주세요
        </Txt>
      );
    case 'checking':
      return (
        <div className={s.resultCard}>
          <Flex align="center" gap={2}>
            <Spinner size="sm" />
            <Txt typography="headingSmEmphasized">확인하는 중</Txt>
          </Flex>
        </div>
      );
    case 'result': {
      const { view } = state;
      return (
        <Card tone={view.tone} title={view.title} description={view.description} onNext={onNext}>
          {view.ticket && (
            <dl className={s.ticketList} data-testid="scan-ticket">
              <dt>
                <Txt typography="labelMd" color={colors.textSecondary}>
                  이름
                </Txt>
              </dt>
              <dd>
                <Txt typography="labelLgEmphasized">{view.ticket.ownerName ?? '이름 없음'}</Txt>
              </dd>
              {view.ticket.ticketName && (
                <>
                  <dt>
                    <Txt typography="labelMd" color={colors.textSecondary}>
                      티켓
                    </Txt>
                  </dt>
                  <dd>
                    <Txt typography="labelLg">{view.ticket.ticketName}</Txt>
                  </dd>
                </>
              )}
              {view.ticket.issuedTicketNo && (
                <>
                  <dt>
                    <Txt typography="labelMd" color={colors.textSecondary}>
                      티켓 번호
                    </Txt>
                  </dt>
                  <dd>
                    <Txt typography="labelLg">{view.ticket.issuedTicketNo}</Txt>
                  </dd>
                </>
              )}
            </dl>
          )}
        </Card>
      );
    }
    case 'invalidQr':
      return <Card tone="error" title={INVALID_QR} description={null} onNext={onNext} />;
    case 'eventNotCheckable':
      return <Card tone="error" title={state.message} description={null} alert onNext={onNext} />;
    case 'failed':
      return (
        <Card
          tone="error"
          title={state.failure.message}
          description={null}
          alert
          onNext={onNext}
          onRetry={state.failure.canRetry ? onRetry : undefined}
        />
      );
  }
}

function Card({
  tone,
  title,
  description,
  alert,
  onNext,
  onRetry,
  children,
}: {
  tone: CheckInTone;
  title: string;
  description: string | null;
  alert?: boolean;
  onNext: () => void;
  onRetry?: () => void;
  children?: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <div className={s.resultCard} data-tone={tone} role={alert ? 'alert' : undefined}>
      <Flex align="flex-start" gap={2}>
        <span className={s.toneIcon} style={{ color: t.color }} aria-hidden>
          <Icon name={t.icon} variant="filled" />
        </span>
        <Flex direction="column" gap={1}>
          <Txt as="p" typography="headingSmEmphasized">
            {title}
          </Txt>
          {description && (
            <Txt as="p" typography="bodyMd" color={colors.textSecondary}>
              {description}
            </Txt>
          )}
        </Flex>
      </Flex>
      {children}
      <Flex gap={2} justify="flex-end">
        {onRetry && (
          <Button variant="primary" size="md" onClick={onRetry}>
            다시 시도
          </Button>
        )}
        <Button variant="secondary" size="md" onClick={onNext}>
          다음 스캔
        </Button>
      </Flex>
    </div>
  );
}
