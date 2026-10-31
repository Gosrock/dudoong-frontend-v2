'use client';

import { useEffect, useRef } from 'react';

import { palette } from '../../theme/palette';
import * as s from './QrCode.css';

export type QrCodeProps = {
  /** 인코딩할 값 그대로(가공하지 않는다 — patterns §17) */
  value: string;
  /** 그림 해상도(px). 화면 크기는 부모 폭을 채운다 — 감싸는 쪽이 폭을 정한다 */
  size?: number;
  /** 스크린 리더 이름(예: "셀프 체크인 QR") */
  label: string;
  className?: string;
  'data-testid'?: string;
};

/**
 * QR 그림(`qr-code-styling`, plan §3 "QR 생성"). 라이브러리가 DOM을 써서 effect 안에서 불러온다(patterns §17).
 * 검정 모듈 · 흰 바탕 · 바깥 여백 없음 — 둘레 여백(quiet zone)은 놓는 쪽이 흰 바탕으로 둔다.
 * 디자인 시스템에 QR 컴포넌트는 없다(와이어 `108:4693`은 회색 자리만).
 */
export function QrCode({
  value,
  size = 240,
  label,
  className,
  'data-testid': testId,
}: QrCodeProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    const el = ref.current;
    if (!el) return;
    el.replaceChildren();
    void import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (disposed) return;
      new QRCodeStyling({
        type: 'svg',
        width: size,
        height: size,
        margin: 0,
        data: value,
        qrOptions: { errorCorrectionLevel: 'M' },
        dotsOptions: { color: palette.common.black, type: 'square' },
        backgroundOptions: { color: palette.common.white },
      }).append(el);
    });
    return () => {
      disposed = true;
      el.replaceChildren();
    };
  }, [value, size]);
  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      data-value={value}
      data-testid={testId}
      className={[s.root, className].filter(Boolean).join(' ')}
    />
  );
}
