'use client';

import { AudienceErrorView } from '@/features/audience/shell/AudienceErrorView';

/** 관객 화면의 렌더·서버 조회 오류 — 셸(레이아웃)은 남기고 본문만 공용 에러 화면으로 바꾼다(P4s-V) */
export default function AudienceError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <AudienceErrorView retry={retry} />;
}
