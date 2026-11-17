'use client';

import { useId, useRef, useState } from 'react';

import { imageExtensionOf } from '@/api/upload';
import { Button } from '@/ui/components/Button/Button';
import * as field from '@/ui/components/Input/Input.css';
import { Spinner } from '@/ui/components/Loader/Loader';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import { HOST_IMAGE_ERROR, HOST_IMAGE_GUIDE, hostImagePickOf } from '../model/host-image-rules';
import type { HostImageSlot } from '../model/host-settings-form';
import type { useHostSettings } from '../model/useHostSettings';
import * as s from './HostImageField.css';
import { IMAGE_ACCEPT, openImageCrop } from './ImageCropSheet';

const LABEL: Record<HostImageSlot, string> = { PROFILE: '프로필 이미지', COVER: '커버 이미지' };

type Image = ReturnType<typeof useHostSettings>['images'][HostImageSlot];

/**
 * 브라우저가 이 사진을 그릴 수 있는지(아이폰 HEIC — Safari는 읽고, 대부분은 못 읽는다). 읽으면 자르기에서 JPG로 바뀐다
 * (`outputTypeOf` — PNG가 아니면 JPEG, GUI `1525:13546` "HEIC는 가능하면 프론트에서 JPG로 자동 변환")
 */
async function canDecode(file: File): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(file);
    bitmap.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * 호스트 이미지 한 칸(GUI `741:31172` 미입력 · `1452:40541` 저장 가능 · `1524:13269` 업로드 중 · `1524:13380` 실패, Design Sync #260 · #278,
 * PC `1496:12683` · `1556:15393` · `1556:15548` — #294) — 제목(Heading/md2 - emphasized) → 미리보기 상자(채움 `surface/container` ·
 * 테두리 · 모서리 12, 프로필 160 정사각 · 커버 폭 가득 × 171 — 모바일 2:1) 가운데 [이미지 업로드](DS Button Secondary medium + `image-add`)
 * → 회색 안내(`1525:13517`) 또는 빨간 오류 + 빨간 테두리 → 이미지가 있으면 [기본 이미지로](Secondary small).
 * 올리는 중은 흰 60% 덮개 + 버튼 자리 스피너(`1524:13356` · `1524:13364`). 실패해도 [다시 올리기]는 없다 — 상자 안 [이미지 업로드]로 다시 고른다(#278 3).
 * 파일을 고르면 10MB · 형식을 먼저 보고(`hostImagePickOf`), "이미지 위치 조정"(`openImageCrop`)으로 자른 결과를 올린다(PH-15 → S3, 저장은 PH-4 — 훅).
 */
export function HostImageField({
  slot,
  image,
  readOnly,
}: {
  slot: HostImageSlot;
  image: Image;
  readOnly: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const label = LABEL[slot];
  const disabled = readOnly || image.uploading;
  // 못 불러온 주소는 그리지 않는다(깨진 이미지 아이콘 대신 빈 상자 — #92-5와 같은 처리). 주소가 바뀌면 다시 시도
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photo = image.url && image.url !== failedUrl ? image.url : null;

  const pick = async (file: File) => {
    const decision = hostImagePickOf(file, imageExtensionOf(file) !== null);
    if (decision.kind === 'error') {
      image.reject(decision.message);
      return;
    }
    if (decision.kind === 'heic' && !(await canDecode(file))) {
      image.reject(HOST_IMAGE_ERROR.heic);
      return;
    }
    const cropped = await openImageCrop(file, slot);
    if (cropped) void image.change(cropped);
  };

  return (
    <div className={s.root} role="group" aria-labelledby={titleId} data-testid={`image-${slot}`}>
      <span id={titleId} className={`${field.label} ${s.title}`}>
        {label}
      </span>
      <div className={s.preview[slot]} data-error={image.error ? '' : undefined}>
        {photo && (
          // 미리보기(업로드 출처 · 고른 파일) — 작은 칸이라 원본 그대로
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={s.photo}
            src={photo}
            alt={label}
            decoding="async"
            onError={() => setFailedUrl(photo)}
          />
        )}
        {/* 올리는 중 — 흰 60% 덮개(`1524:13356`) */}
        {image.uploading && <span className={s.uploadingCover} aria-hidden="true" />}
        {/* 일반 멤버(읽기 전용)는 누를 수 없게 둔다(Q53 — 모양은 같고 비활성). 올리는 중은 Disabled 버튼 위 스피너 20(`1524:13364`) */}
        <Button
          variant="secondary"
          size="md"
          icon={<Icon name="image-add" className={image.uploading ? s.hiddenLabel : undefined} />}
          className={s.upload}
          disabled={disabled}
          aria-busy={image.uploading || undefined}
          aria-label={`${label} 업로드`}
          onClick={() => input.current?.click()}
        >
          <span className={image.uploading ? s.hiddenLabel : undefined}>이미지 업로드</span>
        </Button>
        {image.uploading && (
          <span className={s.spinner}>
            <Spinner size="base" />
          </span>
        )}
        <input
          ref={input}
          type="file"
          accept={IMAGE_ACCEPT}
          hidden
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void pick(file);
          }}
        />
      </div>
      {/* 칸 아래 한 줄 — 오류면 빨간 글(`1524:13468`), 아니면 회색 안내(`1525:13517`). 둘 다 Label/sm */}
      {image.error ? (
        <span role="alert" className={s.note}>
          <Txt typography="labelSm" color={colors.statusError}>
            {image.error}
          </Txt>
        </span>
      ) : (
        <span className={s.note}>
          <Txt typography="labelSm" color={colors.textTertiary}>
            {HOST_IMAGE_GUIDE[slot]}
          </Txt>
        </span>
      )}
      {!readOnly && image.url && (
        <div className={s.actions}>
          <Button variant="secondary" size="sm" disabled={disabled} onClick={image.reset}>
            기본 이미지로
          </Button>
        </div>
      )}
    </div>
  );
}
