'use client';

import { type IScannerError, Scanner } from '@yudiel/react-qr-scanner';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/ui/components/Button/Button';

import {
  CAMERA_SLOW_MS,
  type CameraProblem,
  cameraProblemOf,
  cameraWaitHint,
} from './camera-errors';
import { CameraNotice } from './CameraNotice';
import * as s from './QrCheckIn.css';
import { applySelfHostedZxing } from './zxing-wasm';

// 판독 엔진 wasm을 jsdelivr가 아니라 우리 출처에서 받는다(P14 보안 — CSP)
applySelfHostedZxing();

export type CameraPhase = 'starting' | 'live' | 'problem';

type Props = {
  /** 인식한 값 — 그대로 `submitScan`에 넘긴다(같은 값이 계속 보이면 라이브러리가 다시 부르지 않는다) */
  onScan: (value: string) => void;
  /** 카메라 단계 — 화면이 검정 바탕 · 가이드 · 안내 알약 · [전체화면 전환]을 영상이 나올 때(`live`)만 그린다 */
  onPhaseChange?: (phase: CameraPhase) => void;
};

/**
 * 카메라 스캐너(`@yudiel/react-qr-scanner`, plan P13b V). 뒤 카메라 · QR만 · 소리 없음 · 손전등·확대 버튼 없음 · 파인더 없음
 * (가이드는 화면이 Figma 모양으로 그린다).
 * 켜지 못하면(권한 거부·카메라 없음·사용 중·지원 안 함) 카메라 자리에 이유와 [다시 켜기]를 그린다(GUI `1360:23457` 등, #226 · #230).
 * 영상이 나오기 전(권한 창 대기 등)에는 "켜는 중" 안내를 겹친다(`1349:713` · 오래 걸리면 `1360:23377`, #225 · #229) —
 * 라이브러리는 권한 답을 오류 없이 기다린다(이슈 #93 §5).
 * 카메라가 없는 곳(Playwright·CI)은 여기서 실패 화면이 되고, 판독 값은 `scan-injection`으로 들어온다.
 */
export function CameraScanner({ onScan, onPhaseChange }: Props) {
  const [problem, setProblem] = useState<CameraProblem | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [started, setStarted] = useState(false);
  const [slow, setSlow] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 영상 재생 시작(`playing`)을 감싼 칸에서 캡처로 듣는다 — 미디어 이벤트는 거품이 일지 않지만 캡처 단계는 지난다
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || problem) return;
    setStarted(false);
    setSlow(false);
    const onPlaying = () => setStarted(true);
    el.addEventListener('playing', onPlaying, true);
    const timer = window.setTimeout(() => setSlow(true), CAMERA_SLOW_MS);
    return () => {
      el.removeEventListener('playing', onPlaying, true);
      window.clearTimeout(timer);
    };
  }, [attempt, problem]);

  const phase: CameraPhase = problem ? 'problem' : started ? 'live' : 'starting';
  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  if (problem) {
    return (
      <div className={s.cameraNotice} role="alert" data-testid="camera-problem">
        <CameraNotice
          icon="camera-disable"
          title={problem.title}
          description={problem.description}
        />
        {problem.canRetry && (
          <div className={s.noticeAction}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setProblem(null);
                setAttempt((n) => n + 1);
              }}
            >
              다시 켜기
            </Button>
          </div>
        )}
      </div>
    );
  }

  const hint = cameraWaitHint(slow);
  return (
    <div ref={wrapRef} className={s.scannerContainer}>
      {!started && (
        <div className={s.cameraNotice} role="status" data-testid="camera-waiting">
          <CameraNotice icon="camera" title={hint.title} description={hint.description} />
        </div>
      )}
      <Scanner
        key={attempt}
        onScan={(codes) => {
          const value = codes[0]?.rawValue;
          if (value) onScan(value);
        }}
        onError={(e: IScannerError) => setProblem(cameraProblemOf(e.kind))}
        constraints={{ facingMode: 'environment' }}
        formats={['qr_code']}
        sound={false}
        components={{ finder: false, torch: false, zoom: false, onOff: false }}
        classNames={{ container: s.scannerContainer, video: s.scannerVideo }}
      />
    </div>
  );
}
