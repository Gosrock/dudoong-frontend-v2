'use client';

import dynamic from 'next/dynamic';
import { type ReactNode, useEffect, useState } from 'react';

import { HostingBoundary } from '@/features/hosting/access/HostingBoundary';
import { useEventScope } from '@/features/hosting/shared/model/useEventScope';
import { Logo } from '@/ui/brand/Logo';
import { Button } from '@/ui/components/Button/Button';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { Spinner } from '@/ui/components/Loader/Loader';
import { QrCode } from '@/ui/components/QrCode/QrCode';
import { Tab, TabList, TabPanel, Tabs } from '@/ui/components/Tabs/Tabs';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { formatCount } from '@/utils/money';

import { useCheckInStats } from './model/useCheckInStats';
import { useHostScan } from './model/useHostScan';
import { useSelfCheckInQr } from './model/useSelfCheckInQr';
import { CameraNotice } from './ui/CameraNotice';
import type { CameraPhase } from './ui/CameraScanner';
import * as s from './ui/QrCheckIn.css';
import { subscribeInjectedScan } from './ui/scan-injection';
import { ScanResult } from './ui/ScanResult';
import { TicketNoCheckIn } from './ui/TicketNoCheckIn';
import { useStageFullscreen } from './ui/useStageFullscreen';

// 카메라는 브라우저에서만 — 서버 렌더에서 MediaDevices·BarcodeDetector를 건드리지 않는다
const CameraScanner = dynamic(() => import('./ui/CameraScanner').then((m) => m.CameraScanner), {
  ssr: false,
  // 카메라 코드를 받는 동안 — 스피너만(GUI `1360:23251` · `1360:23028` "카메라 켜는중_스피너", #225 · #229)
  loading: () => (
    <span className={s.checkingSpinner}>
      <Spinner size="md" label="카메라를 켜는 중" />
    </span>
  ),
});

type Mode = 'host' | 'audience';

/** GUI `1360:25941` 문구 그대로(마침표 없음) */
const SELF_CHECK_IN_CAPTION = 'QR 코드를 스캔하면 입장이 완료됩니다';

/**
 * `/hosting/events/[eventId]/qr` QR 체크인(P13b-GUI — **GUI 근거**, Design Sync #215~#234). 모바일 `1360:13479` ·
 * 데스크탑 `1352:30715`(같은 DOM, CSS로), 결과 카드 `1362:1295`(매핑 가이드 `1411:7760` — `model/scan-card.ts`),
 * 전체화면 `1359:398` · `1352:30986` · 관객 `1360:27107`, 카메라 상태 `1349:713` 등, 공연 상태 `1360:25576` 등,
 * 티켓 번호 `1368:4838` 등.
 */
export function QrCheckInView({ eventId }: { eventId: string }) {
  return (
    <HostingBoundary resetKeys={[eventId]}>
      <QrCheckIn eventId={eventId} />
    </HostingBoundary>
  );
}

function QrCheckIn({ eventId }: { eventId: string }) {
  const [mode, setMode] = useState<Mode>('host');
  return (
    <section aria-labelledby="qr-title" className={s.page}>
      <h1 id="qr-title" className={s.desktopTitle}>
        <Txt typography="headingLgEmphasized">QR 체크인</Txt>
      </h1>
      <CheckInStats eventId={eventId} />
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        {/* 탭 — DS tab(밑줄 없음 · 두 폭 모두 16, gui 1360:13500). DS 덮어쓴 모양은 TabList `underline={false}` */}
        <TabList aria-label="체크인 방식" size="md" underline={false}>
          <Tab value="host">호스트가 QR 스캔</Tab>
          <Tab value="audience">관객이 QR 스캔</Tab>
        </TabList>
        <TabPanel value="host" className={s.panel}>
          <HostScan eventId={eventId} />
        </TabPanel>
        <TabPanel value="audience" className={s.panel}>
          <AudienceScan eventId={eventId} />
        </TabPanel>
      </Tabs>
      {mode === 'host' && <TicketNoCheckIn eventId={eventId} />}
    </section>
  );
}

function CheckInStats({ eventId }: { eventId: string }) {
  const stats = useCheckInStats(eventId);
  const v = stats.stats;
  const num = (n: number | undefined) => (n === undefined ? '–' : formatCount(n));
  const ratio = v && v.issuedCount > 0 ? Math.min(v.enteredCount / v.issuedCount, 1) : 0;
  return (
    <section aria-label="체크인 통계" data-testid="checkin-stats">
      <Flex direction="column" gap={4}>
        <dl className={s.statGrid}>
          <StatBox label="전체 티켓" value={num(v?.issuedCount)} testId="checkin-stat-issued" />
          <StatBox label="입장 완료" value={num(v?.enteredCount)} testId="checkin-stat-entered" />
          <StatBox
            label="미입장"
            value={num(v?.notEnteredCount)}
            testId="checkin-stat-not-entered"
          />
        </dl>
        <Flex direction="column" gap={2}>
          <div
            className={s.track}
            role="progressbar"
            aria-label="입장률"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={v?.entranceRate ?? 0}
          >
            <div className={s.fill} style={{ width: `${ratio * 100}%` }} />
          </div>
          <Flex justify="flex-end" align="center" gap={2}>
            {stats.refreshFailed && (
              <span data-testid="checkin-stats-stale">
                <Txt typography="labelMd" color={colors.textSecondary}>
                  통계를 새로 고치지 못했어요 ·
                </Txt>
              </span>
            )}
            <span data-testid="checkin-stats-rate">
              <Txt typography="bodyMd">{v ? `${v.entranceRate}% 입장 완료` : '\u00a0'}</Txt>
            </span>
          </Flex>
        </Flex>
        {stats.status === 'error' && (
          <Flex align="center" justify="space-between" gap={2} role="alert">
            <Txt typography="bodyMd" color={colors.textDangerLabel}>
              통계를 불러오지 못했어요
            </Txt>
            <Button variant="secondary" size="sm" onClick={stats.retry}>
              통계 다시 시도
            </Button>
          </Flex>
        )}
      </Flex>
    </section>
  );
}

/** 통계 칸 — 라벨(`Label/md` 회색) 위, 숫자 아래(모바일 18 · PC 24). `dd`가 먼저면 읽는 순서가 어색해 `dt`를 먼저 둔다 */
function StatBox({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className={s.statBox}>
      <dt>
        <Txt typography="labelMd" color={colors.textSecondary}>
          {label}
        </Txt>
      </dt>
      <dd className={s.statValue}>
        <span data-testid={testId}>
          <Txt typography="headingMd2Emphasized" className={s.statNumber}>
            {value}
          </Txt>
        </span>
      </dd>
    </div>
  );
}

function HostScan({ eventId }: { eventId: string }) {
  const scan = useHostScan(eventId);
  const { ref: stageRef, open: full, enter, close } = useStageFullscreen();
  const { submitScan } = scan;
  const [phase, setPhase] = useState<CameraPhase>('starting');
  const blocked = scan.blockMessage !== null;

  // 판독 값 주입(카메라 없는 테스트) — 카메라와 같은 길로 submitScan
  useEffect(() => {
    if (blocked) return;
    return subscribeInjectedScan((value) => void submitScan(value));
  }, [blocked, submitScan]);

  if (scan.blockMessage) {
    return <BlockedStage message={scan.blockMessage} testId="host-scan-blocked" />;
  }
  const live = phase === 'live';
  const status = scan.state.status;
  // 결과 카드가 떠 있으면 가이드 · 알약 · [전체화면 전환]을 내린다(확인 중은 가이드만 남김 — `1365:1892` · `1362:2224`).
  // 전체화면은 가이드 · [✕]를 그대로 둔다(`1367:4189`)
  const showGuide = live && (full || status === 'idle' || status === 'checking');
  const showHint = live && status === 'idle';
  return (
    <div
      ref={stageRef}
      className={[full ? s.stageFullscreen : s.stage, live && s.stageDark]
        .filter(Boolean)
        .join(' ')}
      data-testid="host-scan"
      data-camera={phase}
      data-fullscreen={full || undefined}
    >
      <CameraScanner onScan={submitScan} onPhaseChange={setPhase} />
      {showGuide && <ScanGuide fullscreen={full} />}
      {showHint && (
        <Txt
          typography="labelLgEmphasized"
          className={full ? `${s.hint} ${s.hintFullscreen}` : s.hint}
        >
          티켓 QR을 카메라에 비춰 주세요
        </Txt>
      )}
      {full ? (
        <CloseFullscreen onClick={close} />
      ) : (
        live && status === 'idle' && <FullscreenButton onClick={enter} />
      )}
      <ScanResult state={scan.state} onRetry={scan.retry} onNext={scan.reset} fullscreen={full} />
    </div>
  );
}

/** 스캔 가이드 네 모서리(`1360:13502` — 흰 꺾쇠). 꾸밈 */
function ScanGuide({ fullscreen }: { fullscreen: boolean }) {
  return (
    <div className={fullscreen ? `${s.guide} ${s.guideFullscreen}` : s.guide} aria-hidden>
      <span className={s.guideCorner.tl} />
      <span className={s.guideCorner.tr} />
      <span className={s.guideCorner.bl} />
      <span className={s.guideCorner.br} />
    </div>
  );
}

/** 공연 상태로 막힘 — 회색 자리에 카메라 금지 아이콘 + 회색 제목(`1360:25870` "QR 체크인_불가", #227 · #228 · #231 · #232) */
function BlockedStage({
  message,
  hint,
  testId,
}: {
  message: ReactNode;
  hint?: string | null;
  testId?: string;
}) {
  return (
    <div className={s.stage}>
      <div className={s.cameraNotice} role="status" data-testid={testId}>
        <CameraNotice icon="camera-disable" title={message} description={hint} muted />
      </div>
    </div>
  );
}

function AudienceScan({ eventId }: { eventId: string }) {
  const selfQr = useSelfCheckInQr(eventId);
  const { event } = useEventScope(eventId);
  const { ref: stageRef, open: full, enter, close } = useStageFullscreen();
  if (selfQr.status === 'blocked') {
    return (
      <section aria-label="셀프 체크인 QR" data-status="blocked">
        <BlockedStage
          message={<span data-testid="self-check-in-guidance">{selfQr.guidance}</span>}
          hint={selfQr.hint}
        />
      </section>
    );
  }
  return (
    <section
      ref={stageRef}
      aria-label="셀프 체크인 QR"
      data-status={selfQr.status}
      data-fullscreen={full || undefined}
      className={full ? s.stageFullscreen : s.stage}
    >
      {full ? (
        <CloseFullscreen onClick={close} />
      ) : (
        selfQr.status === 'ready' && <FullscreenButton onClick={enter} />
      )}
      {selfQr.status === 'pending' && (
        <span className={s.checkingSpinner}>
          <Spinner size="md" label="QR을 불러오는 중" />
        </span>
      )}
      {selfQr.status === 'error' && (
        <div role="alert">
          <EmptyState
            description="QR을 불러오지 못했어요"
            action={
              <Button variant="secondary" size="md" onClick={selfQr.retry}>
                QR 다시 시도
              </Button>
            }
          />
        </div>
      )}
      {selfQr.qrUrl &&
        (full ? (
          // 관객 전체화면(`1360:27107`) — 로고 · 공연 이름 · 큰 QR · 안내
          <div className={s.audienceFull}>
            <Logo height={62} title="" />
            <h2 className={s.audienceTitle}>{event.name}</h2>
            <div className={`${s.qrCard} ${s.qrCardLarge}`}>
              <div className={s.qrImageLarge}>
                <QrCode
                  value={selfQr.qrUrl}
                  size={480}
                  label="셀프 체크인 QR"
                  data-testid="self-check-in-qr"
                />
              </div>
            </div>
            <Txt as="p" typography="heading2xl" className={s.audienceCaption}>
              {SELF_CHECK_IN_CAPTION}
            </Txt>
          </div>
        ) : (
          <Flex direction="column" align="center" gap={3}>
            <div className={s.qrCard}>
              <div className={s.qrImage}>
                <QrCode
                  value={selfQr.qrUrl}
                  size={480}
                  label="셀프 체크인 QR"
                  data-testid="self-check-in-qr"
                />
              </div>
            </div>
            <Txt as="p" typography="labelLg" align="center" className={s.qrCaption}>
              {SELF_CHECK_IN_CAPTION}
            </Txt>
          </Flex>
        ))}
    </section>
  );
}

/** [전체화면 전환] — 자리 오른쪽 위 흰 원 + ⤢(`1360:25996` 모바일 44 · `1349:797` PC 56) */
function FullscreenButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={s.cornerButton} aria-label="전체화면 전환" onClick={onClick}>
      <Icon name="expand" />
    </button>
  );
}

/** 전체화면 닫기 — 흰 원 + ✕(`1359:404` · `1352:30986`) */
function CloseFullscreen({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className={`${s.cornerButton} ${s.cornerButtonFullscreen}`}
      aria-label="전체화면 닫기"
      onClick={onClick}
    >
      <Icon name="close" />
    </button>
  );
}
