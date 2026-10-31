'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { isSessionLost } from '@/api/errors';
import { HostingAccessRejected } from '@/features/hosting/access/HostingAccessRejected';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Button } from '@/ui/components/Button/Button';
import { EmptyState } from '@/ui/components/EmptyState/EmptyState';
import { Spinner } from '@/ui/components/Loader/Loader';
import { QrCode } from '@/ui/components/QrCode/QrCode';
import { Tab, TabList, TabPanel, Tabs } from '@/ui/components/Tabs/Tabs';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { useCheckInStats } from './model/useCheckInStats';
import { useHostScan } from './model/useHostScan';
import { useSelfCheckInQr } from './model/useSelfCheckInQr';
import * as s from './ui/QrCheckIn.css';
import { subscribeInjectedScan } from './ui/scan-injection';
import { ScanResult } from './ui/ScanResult';
import { useStageFullscreen } from './ui/useStageFullscreen';

// 카메라는 브라우저에서만 — 서버 렌더에서 MediaDevices·BarcodeDetector를 건드리지 않는다
const CameraScanner = dynamic(() => import('./ui/CameraScanner').then((m) => m.CameraScanner), {
  ssr: false,
  loading: () => <Spinner size="md" label="카메라를 켜는 중" />,
});

type Mode = 'host' | 'audience';

/** 와이어 `424:11976` 문구 그대로 */
const SELF_CHECK_IN_CAPTION = 'QR 코드를 스캔하면 입장이 완료됩니다.';

/**
 * `/hosting/events/[eventId]/qr` QR 체크인(P13b-V — **와이어 근거**, GUI 페이지 `724:5257` 비어 있음).
 * 와이어 `424:11941`(호스트가 스캔) · `424:11976`(관객이 스캔) · 전체화면 `108:4656`·`108:4693`.
 * 결과 화면 · 카메라 권한 거부 · 네트워크 실패는 디자인 없음 → DS 컴포넌트로만(Figma 코멘트).
 */
export function QrCheckInView({ eventId }: { eventId: string }) {
  return (
    <AsyncBoundary holdOn={isSessionLost} rejected={HostingAccessRejected} resetKeys={[eventId]}>
      <QrCheckIn eventId={eventId} />
    </AsyncBoundary>
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
      {/* FIGMA-CUSTOM: 모드 전환(wire 424:11950 "호스트가 QR 스캔 | 관객이 QR 스캔" 세그먼트) 커스텀 → DS Tabs(밑줄형). 예매자 관리와 같다. Figma 코멘트 2026-11-01 */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabList aria-label="체크인 방식" size="responsive">
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
    </section>
  );
}

function CheckInStats({ eventId }: { eventId: string }) {
  const st = useCheckInStats(eventId);
  const v = st.stats;
  const num = (n: number | undefined) => (n === undefined ? '–' : n.toLocaleString('ko-KR'));
  const ratio = v && v.issuedCount > 0 ? Math.min(v.enteredCount / v.issuedCount, 1) : 0;
  return (
    <section aria-label="체크인 통계" data-testid="checkin-stats">
      <Flex direction="column" gap={2}>
        <dl className={s.statGrid}>
          <StatBox label="전체 티켓" value={num(v?.issuedCount)} testId="checkin-stat-issued" />
          <StatBox label="입장 완료" value={num(v?.enteredCount)} testId="checkin-stat-entered" />
          <StatBox
            label="미입장"
            value={num(v?.notEnteredCount)}
            testId="checkin-stat-not-entered"
          />
        </dl>
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
          {st.refreshFailed && (
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
        {st.status === 'error' && (
          <div role="alert" className={s.statsError}>
            <Txt typography="bodyMd" color={colors.textDangerLabel}>
              통계를 불러오지 못했어요
            </Txt>
            <Button variant="secondary" size="sm" onClick={st.retry}>
              통계 다시 시도
            </Button>
          </div>
        )}
      </Flex>
    </section>
  );
}

function StatBox({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className={s.statBox}>
      <dd className={s.statValue}>
        <span data-testid={testId}>
          <Txt typography="headingLgEmphasized">{value}</Txt>
        </span>
      </dd>
      <dt>
        <Txt typography="labelMd" color={colors.textSecondary}>
          {label}
        </Txt>
      </dt>
    </div>
  );
}

function HostScan({ eventId }: { eventId: string }) {
  const h = useHostScan(eventId);
  const { ref: stageRef, open: full, enter, close } = useStageFullscreen();
  const { submitScan } = h;
  const [cameraProblem, setCameraProblem] = useState(false);
  const blocked = h.blockMessage !== null;

  // 판독 값 주입(카메라 없는 테스트) — 카메라와 같은 길로 submitScan
  useEffect(() => {
    if (blocked) return;
    return subscribeInjectedScan((value) => void submitScan(value));
  }, [blocked, submitScan]);

  if (h.blockMessage) {
    return (
      <div className={s.stage}>
        <div role="status" data-testid="host-scan-blocked">
          <EmptyState description={h.blockMessage} />
        </div>
      </div>
    );
  }
  return (
    <>
      <div
        ref={stageRef}
        className={full ? s.stageFullscreen : s.stage}
        data-testid="host-scan"
        data-fullscreen={full || undefined}
      >
        {full && <CloseFullscreen onClick={close} />}
        <CameraScanner onScan={submitScan} onProblemChange={setCameraProblem} />
        <ScanResult
          state={h.state}
          onRetry={h.retry}
          onNext={h.reset}
          cameraReady={!cameraProblem}
        />
      </div>
      <FullscreenButton onClick={enter} />
    </>
  );
}

function AudienceScan({ eventId }: { eventId: string }) {
  const q = useSelfCheckInQr(eventId);
  const { ref: stageRef, open: full, enter, close } = useStageFullscreen();
  return (
    <>
      <section
        ref={stageRef}
        aria-label="셀프 체크인 QR"
        data-status={q.status}
        data-fullscreen={full || undefined}
        className={full ? `${s.stageFullscreen} ${s.stageLight}` : s.stage}
      >
        {full && <CloseFullscreen onClick={close} />}
        {q.status === 'blocked' && (
          <div role="status">
            <EmptyState
              title={<span data-testid="self-check-in-guidance">{q.guidance}</span>}
              description={q.hint}
            />
          </div>
        )}
        {q.status === 'pending' && <Spinner size="md" label="QR을 불러오는 중" />}
        {q.status === 'error' && (
          <div role="alert">
            <EmptyState
              description="QR을 불러오지 못했어요"
              action={
                <Button variant="secondary" size="md" onClick={q.retry}>
                  QR 다시 시도
                </Button>
              }
            />
          </div>
        )}
        {q.qrUrl && (
          <Flex direction="column" align="center" gap={5}>
            <div className={s.qrCard}>
              <div className={full ? s.qrImageLarge : s.qrImage}>
                <QrCode
                  value={q.qrUrl}
                  size={480}
                  label="셀프 체크인 QR"
                  data-testid="self-check-in-qr"
                />
              </div>
            </div>
            <Txt
              as="p"
              typography={full ? 'headingMd' : 'bodyMd'}
              align="center"
              className={s.qrCaption}
            >
              {SELF_CHECK_IN_CAPTION}
            </Txt>
          </Flex>
        )}
      </section>
      {q.status === 'ready' && <FullscreenButton onClick={enter} />}
    </>
  );
}

function FullscreenButton({ onClick }: { onClick: () => void }) {
  return (
    <div className={s.fullscreenRow}>
      <Button variant="dark" size="md" onClick={onClick}>
        전체화면 전환
      </Button>
    </div>
  );
}

function CloseFullscreen({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="secondary"
      size="md"
      className={s.closeFullscreen}
      icon={<Icon name="chevron-left" />}
      aria-label="전체화면 닫기"
      onClick={onClick}
    />
  );
}
