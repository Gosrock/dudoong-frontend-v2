'use client';

import { overlay } from 'overlay-kit';
import { useEffect, useRef, useState } from 'react';

import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { Illustration } from '@/ui/illustrations/Illustration';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';
import { log } from '@/utils/log';

import { addressOf, loadDaumPostcode } from '../model/daum-postcode';
import { loadKakaoMaps } from '../model/kakao-geocoder';
import * as s from './PlaceParts.css';

/**
 * 주소 검색 창(Daum 우편번호 `embed`) — GUI PC 모달 `1592:16734`(480 · 모서리 16 · 제목 18 Bold + ✕) · 모바일 바텀시트 `1592:16559`
 * (Design Sync #314 · #315). 안쪽은 "카카오에서 제공하는 검색 화면이 그대로 들어가요" — 그 서비스를 담는 칸(`1592:16739` · `1592:16565`
 * 모서리 12 · 테두리 · 회색 바탕)만 그리고 검색 화면은 카카오 것 그대로. 고르면 주소 한 줄(도로명 우선), 닫으면 null
 */
export function openAddressSearch(): Promise<string | null> {
  return overlay.openAsync<string | null>(({ isOpen, close, unmount }) => (
    <ResponsiveOverlay
      open={isOpen}
      onOpenChange={(o) => !o && close(null)}
      onExited={unmount}
      title="주소 검색"
      titleSize="md2"
      // 모바일 시트: 막대 손잡이 + 머리 오른쪽 ✕(`1592:16560` · `1592:16563`) — 호스팅 시트 `flat`
      sheetVariant="flat"
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
 * 장소 아래 지도 미리보기(GUI `748:33492` 모바일 342×147 — #180, PC `748:34508` 600×144 → 147로 맞춤 Q210 — 디자이너 코멘트 "지도 프리뷰", Q3 해결).
 * 카카오맵 SDK `kakao.maps.Map` + 마커(Geocoder와 같은 SDK). 좌표가 없으면 GUI `1588:53077`(PC) · `748:33351` 모바일대로
 * 돋보기 일러스트 + "지도를 검색하면 지도가 보여요"(Design Sync #313 — 2026-11-08의 빈 회색 칸을 대신한다),
 * 지도 서비스를 불러오지 못하면(키 없음 · SDK 실패 · 좌표 찾기에서 이미 실패) GUI `1269:29539`·`1277:30239`대로 일러스트 + 문구(#181)
 */
export function KakaoMapPreview({
  latitude,
  longitude,
  unavailable = false,
}: {
  latitude: number | null;
  longitude: number | null;
  /** 주소 좌표 찾기에서 이미 SDK를 불러오지 못했다(#92-1) — 좌표가 없어도 빈 칸 대신 실패 안내 */
  unavailable?: boolean;
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
      {(has ? failed : unavailable) && <MapUnavailable />}
      {!has && !unavailable && <MapSearchHint />}
    </div>
  );
}

/** 주소를 고르기 전(GUI `1588:53077` — 세로 쌓기 간격 12, DS `img_지도 검색전` 91×70 + Label/md surface/strong-border, #313) */
function MapSearchHint() {
  return (
    <div className={s.overlayText} data-testid="place-map-empty">
      <Flex direction="column" gap={3} align="center">
        <Illustration name="map-search" />
        <Txt typography="labelMd" color={colors.surfaceStrongBorder}>
          지도를 검색하면 지도가 보여요
        </Txt>
      </Flex>
    </div>
  );
}

/** 지도 서비스를 못 불러올 때(GUI `1269:29539` 모바일 · `1277:30239` PC — 세로 쌓기 간격 12, 일러스트 91×70 + Label/md surface/strong-border) */
function MapUnavailable() {
  return (
    <div role="status" className={s.overlayText}>
      <Flex direction="column" gap={3} align="center">
        <Illustration name="map-unavailable" />
        <Txt typography="labelMd" color={colors.surfaceStrongBorder}>
          지도 서비스를 불러오지 못했어요.
        </Txt>
      </Flex>
    </div>
  );
}
