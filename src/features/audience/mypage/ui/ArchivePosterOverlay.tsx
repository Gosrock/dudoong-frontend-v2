'use client';

import { overlay } from 'overlay-kit';
import { useState } from 'react';

import { UNNAMED_EVENT } from '@/features/shared/event-labels';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { UploadedImage } from '@/ui/components/UploadedImage/UploadedImage';
import { Illustration } from '@/ui/illustrations/Illustration';

import * as p from '../ArchiveView.css';
import { savePosterImage } from '../model/poster-save';

/**
 * 아카이빙 포스터 크게 보기 + [이미지 저장](와이어 `503:16328` — Tomato 10-24 "CD 이미지 누르면 … 이미지 크게 보이고 이미지 다운로드").
 * 디자인이 없어 가장 단순하게 — 개발 공용 오버레이(PC 모달 · 모바일 바텀시트) + 이미지 + 버튼 하나(design-requests Q207 — 디자인 없음)
 */
export function openArchivePoster({ src, name }: { src: string; name: string | null }) {
  overlay.open(({ isOpen, close, unmount }) => (
    <ResponsiveOverlay
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      onExited={unmount}
      title={name ?? UNNAMED_EVENT}
      footer={<SaveButton src={src} name={name} />}
    >
      <UploadedImage
        src={src}
        alt={`${name ?? UNNAMED_EVENT} 포스터`}
        width={720}
        height={720}
        sizes="(min-width: 1024px) 480px, 100vw"
        className={p.viewerImage}
        // 못 불러오면 빈 시트 대신 자리표시(저장은 새 탭 열기로 넘어간다)
        fallback={<Illustration name="poster-placeholder" width={240} className={p.viewerImage} />}
      />
    </ResponsiveOverlay>
  ));
}

function SaveButton({ src, name }: { src: string; name: string | null }) {
  const [saving, setSaving] = useState(false);
  return (
    <Button
      variant="primary"
      size="lg"
      fullWidth
      loading={saving}
      onClick={async () => {
        setSaving(true);
        try {
          await savePosterImage(src, name);
        } finally {
          setSaving(false);
        }
      }}
    >
      이미지 저장
    </Button>
  );
}
