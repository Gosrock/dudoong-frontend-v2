'use client';

import { overlay } from 'overlay-kit';
import { useEffect, useRef, useState } from 'react';

import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { log } from '@/utils/log';

import { addressOf, loadDaumPostcode } from '../model/daum-postcode';
import { loadKakaoMaps } from '../model/kakao-geocoder';
import * as s from './PlaceParts.css';

/**
 * 주소 검색 창(Daum 우편번호 `embed`) — 디자인 없음. PC 모달 · 모바일 바텀시트(`ResponsiveOverlay`) 안에 띄운다.
 * 고르면 주소 한 줄(도로명 우선), 닫으면 null
 */
export function openAddressSearch(): Promise<string | null> {
  return overlay.openAsync<string | null>(({ isOpen, close, unmount }) => (
    <ResponsiveOverlay
      open={isOpen}
      onOpenChange={(o) => !o && close(null)}
      onExited={unmount}
      title="주소 검색"
    >
      <PostcodeEmbed onPick={(address) => close(address)} />
    </ResponsiveOverlay>
  ));
}

function PostcodeEmbed({ onPick }: { onPick: (address: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let cancelled = false;
    loadDaumPostcode()
      .then((Postcode) => {
        if (cancelled || !ref.current) return;
        ref.current.replaceChildren();
        new Postcode({
          width: '100%',
          height: '100%',
          oncomplete: (data) => {
            const address = addressOf(data);
            if (address) pick.current(address);
          },
        }).embed(ref.current, { autoClose: false });
        setState('ready');
      })
      .catch((e: unknown) => {
        log('warn', 'daum_postcode.failed', { error: e instanceof Error ? e.message : 'unknown' });
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <div className={s.postcode}>
      <div ref={ref} className={s.postcodeFrame} data-testid="postcode" />
      {state === 'loading' && (
        <Txt typography="bodyMd" color={colors.textSecondary} className={s.overlayText}>
          주소 검색을 불러오는 중
        </Txt>
      )}
      {state === 'error' && (
        <div role="alert" className={s.overlayText}>
          <Flex direction="column" gap={3} align="center">
            <Txt typography="bodyMd">주소 검색을 불러오지 못했어요.</Txt>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setState('loading');
                setAttempt((n) => n + 1);
              }}
            >
              다시 시도
            </Button>
          </Flex>
        </div>
      )}
    </div>
  );
}

/**
 * 장소 아래 지도 미리보기(GUI `748:33492` 342×144 · PC `748:34508` 600×144 — 디자이너 코멘트 "지도 프리뷰", Q3 해결).
 * 카카오맵 SDK `kakao.maps.Map` + 마커(Geocoder와 같은 SDK). 좌표가 없거나·키가 없거나·불러오지 못하면 회색 칸 + 안내(같은 크기)
 */
export function KakaoMapPreview({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const has = latitude !== null && longitude !== null;

  useEffect(() => {
    if (latitude === null || longitude === null) return;
    let cancelled = false;
    loadKakaoMaps()
      .then((maps) => {
        if (cancelled || !ref.current) return;
        if (!maps.Map || !maps.LatLng || !maps.Marker) throw new Error('kakao.maps.Map missing');
        const center = new maps.LatLng(latitude, longitude);
        ref.current.replaceChildren();
        const map = new maps.Map(ref.current, { center, level: 3 });
        new maps.Marker({ position: center, map });
        setFailed(false);
      })
      .catch((e: unknown) => {
        log('warn', 'kakao_map.failed', { error: e instanceof Error ? e.message : 'unknown' });
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  return (
    <div
      className={s.map}
      data-testid="place-map"
      data-lat={latitude ?? undefined}
      data-lng={longitude ?? undefined}
      role={has ? 'img' : undefined}
      aria-label={has ? '공연 장소 지도' : undefined}
    >
      <div ref={ref} className={s.mapCanvas} />
      {(!has || failed) && (
        <Txt typography="bodySm" color={colors.textSecondaryLabel} className={s.overlayText}>
          {has ? '지도를 불러오지 못했어요' : '주소를 검색하면 지도가 보여요'}
        </Txt>
      )}
    </div>
  );
}
