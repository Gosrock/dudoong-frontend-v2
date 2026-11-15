'use client';

import { overlay } from 'overlay-kit';
import { type PointerEvent, useEffect, useRef, useState } from 'react';

import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import type { HostImageSlot } from '../model/host-settings-form';
import {
  clampOffset,
  clampZoom,
  CROP_ZOOM_MAX,
  CROP_ZOOM_MIN,
  cropRectOf,
  displayScaleOf,
  guideSizeOf,
  type Offset,
  outputNameOf,
  outputSizeOf,
  outputTypeOf,
  type Size,
} from '../model/image-crop';
import * as s from './ImageCropSheet.css';

/** 이미지 파일 고르기 — JPG · PNG(서버가 받는 것, api-contract §1) */
export const IMAGE_ACCEPT = 'image/jpeg,image/png';

const ZOOM_STEP = 0.1;

/**
 * "이미지 위치 조정"(GUI `1458:4961` 프로필 · `1476:8399` 커버, Design Sync #260) — 모바일 바텀시트 · PC 모달.
 * 어두운 자르기 칸(342 정사각, 모서리 12)에 사진을 깔고, 가이드(프로필 흰 원 290 · 커버 흰 직사각) 밖은 어둡게 한다.
 * 끌어서 옮기고, 아래 [− 막대 +](GUI 로컬 "확대 축소" `1452:40749`)로 1~3배. [다시 선택]은 파일을 다시 고르고, [적용]은 가이드 안을
 * 잘라 새 파일로 돌려준다(canvas — 의존성 없음). 닫으면(✕ · 뒤로가기 · 바깥) `null`.
 */
export function openImageCrop(file: File, slot: HostImageSlot): Promise<File | null> {
  return overlay.openAsync<File | null>(({ isOpen, close, unmount }) => (
    <ImageCropOverlay
      open={isOpen}
      initialFile={file}
      slot={slot}
      onResult={close}
      onExited={unmount}
    />
  ));
}

function ImageCropOverlay({
  open,
  initialFile,
  slot,
  onResult,
  onExited,
}: {
  open: boolean;
  initialFile: File;
  slot: HostImageSlot;
  onResult: (file: File | null) => void;
  onExited: () => void;
}) {
  const [file, setFile] = useState(initialFile);
  const [busy, setBusy] = useState(false);
  // 사진을 읽고 칸을 잰 파일(`CropArea`가 알린다) — 지금 파일과 같아야 [적용]을 누를 수 있다
  const [readyFile, setReadyFile] = useState<File | null>(null);
  const [failed, setFailed] = useState(false);
  const ready = readyFile === file;
  const crop = useRef<CropHandle | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  const apply = async () => {
    if (!crop.current || busy || !ready) return;
    setBusy(true);
    setFailed(false);
    try {
      onResult(await crop.current.toFile());
    } catch {
      // 그리기 실패(canvas · toBlob) — 자르지 않은 원본을 몰래 올리지 않는다. 시트를 열어 둔 채 안내(tap-review #272)
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(o) => !o && onResult(null)}
      onExited={onExited}
      title="이미지 위치 조정"
      sheetVariant="flat"
      dismissible={!busy}
      footer={
        <div className={s.buttons}>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={busy}
            onClick={() => picker.current?.click()}
          >
            다시 선택
          </Button>
          <Button variant="primary" size="lg" fullWidth disabled={busy || !ready} onClick={apply}>
            적용
          </Button>
        </div>
      }
    >
      <input
        ref={picker}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        onChange={(e) => {
          const next = e.target.files?.[0];
          e.target.value = '';
          if (next) {
            setFile(next);
            setFailed(false);
          }
        }}
      />
      <CropArea
        key={`${file.name}-${file.size}-${file.lastModified}`}
        file={file}
        slot={slot}
        handleRef={crop}
        onReady={setReadyFile}
      />
      {failed && (
        // 🤖 문구 — 그려진 실패 화면이 없다(Q232와 같은 곳)
        <p role="alert" className={s.error}>
          <Txt typography="bodySm" color={colors.textDangerLabel}>
            이미지를 자르지 못했어요. 다른 이미지를 선택해 주세요.
          </Txt>
        </p>
      )}
    </ResponsiveOverlay>
  );
}

type CropHandle = { toFile: () => Promise<File> };

/** 자르기 칸 + 확대 막대. 사진 크기 · 칸 폭은 그린 뒤에 잰다 */
function CropArea({
  file,
  slot,
  handleRef,
  onReady,
}: {
  file: File;
  slot: HostImageSlot;
  handleRef: { current: CropHandle | null };
  /** 사진을 읽고 칸 폭을 잰 뒤 한 번 — 그 전에는 [적용]을 막는다 */
  onReady: (file: File) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; from: Offset } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // 외부 자원(blob 주소)을 만들고 정리하는 쌍 — 렌더 중에 만들면 Strict Mode 두 번 실행에서 해제된 주소가 남는다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBoxWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const guide = guideSizeOf(slot, boxWidth);
  const ready = natural !== null && boxWidth > 0;
  const scale = ready ? displayScaleOf(natural, guide, zoom) : 1;
  const shown = ready ? clampOffset(natural, guide, zoom, offset) : { x: 0, y: 0 };

  const toFile = async () => {
    const img = imgRef.current;
    if (!img || !natural) throw new Error('image not ready');
    const rect = cropRectOf(natural, guide, zoom, offset);
    const out = outputSizeOf(slot, rect);
    const canvas = document.createElement('canvas');
    canvas.width = out.width;
    canvas.height = out.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    const type = outputTypeOf(file);
    if (type === 'image/jpeg') {
      // JPEG은 투명이 없다 — 빈 곳은 흰색
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
    }
    ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, out.width, out.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
    if (!blob) throw new Error('toBlob failed');
    return new File([blob], outputNameOf(file, type), { type });
  };

  useEffect(() => {
    if (ready) onReady(file);
  }, [ready, file, onReady]);

  // [적용]이 부르는 자르기 — 그린 뒤 지금 값으로 바꿔 둔다
  useEffect(() => {
    handleRef.current = { toFile };
  });

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!ready) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: shown };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !natural) return;
    setOffset(
      clampOffset(natural, guide, zoom, {
        x: d.from.x + (e.clientX - d.x),
        y: d.from.y + (e.clientY - d.y),
      }),
    );
  };
  const endDrag = () => {
    drag.current = null;
  };
  const changeZoom = (next: number) => {
    const z = clampZoom(next);
    setZoom(z);
    if (natural) setOffset((o) => clampOffset(natural, guide, z, o));
  };

  const fill = ((zoom - CROP_ZOOM_MIN) / (CROP_ZOOM_MAX - CROP_ZOOM_MIN)) * 100;

  return (
    <div className={s.root}>
      <div
        ref={boxRef}
        className={s.box}
        // 시트 끌어 닫기(vaul)와 사진 끌기가 겹치지 않게
        data-vaul-no-drag=""
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="img"
        aria-label="자를 영역 — 끌어서 위치를 옮겨요"
      >
        {src && (
          // 고른 파일 미리보기(blob 주소) — next/image가 필요 없다
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            className={s.photo}
            onLoad={(e) =>
              setNatural({
                width: e.currentTarget.naturalWidth,
                height: e.currentTarget.naturalHeight,
              })
            }
            style={
              ready
                ? {
                    width: natural.width * scale,
                    height: natural.height * scale,
                    transform: `translate(-50%, -50%) translate(${shown.x}px, ${shown.y}px)`,
                  }
                : { visibility: 'hidden' }
            }
          />
        )}
        {ready && (
          <div
            className={slot === 'PROFILE' ? s.guideCircle : s.guideRect}
            style={{ width: guide.width, height: guide.height }}
            aria-hidden
          />
        )}
      </div>
      <div className={s.zoom}>
        <button
          type="button"
          className={s.zoomButton}
          aria-label="축소"
          onClick={() => changeZoom(zoom - ZOOM_STEP)}
        >
          {/* Figma도 `ic minus` 12를 24 틀에 늘려 쓴다(`1452:40741` — 선 2 · 길이 14) */}
          <Icon name="minus" size={12} className={s.zoomIcon} />
        </button>
        <input
          type="range"
          className={s.slider}
          min={CROP_ZOOM_MIN}
          max={CROP_ZOOM_MAX}
          step={0.01}
          value={zoom}
          aria-label="확대 배율"
          style={{ ['--fill' as string]: `${fill}%` }}
          onChange={(e) => changeZoom(Number(e.target.value))}
        />
        <button
          type="button"
          className={s.zoomButton}
          aria-label="확대"
          onClick={() => changeZoom(zoom + ZOOM_STEP)}
        >
          <Icon name="add" />
        </button>
      </div>
    </div>
  );
}
