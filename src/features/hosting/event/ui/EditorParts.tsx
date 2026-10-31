'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useId } from 'react';

import { Button } from '@/ui/components/Button/Button';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { Icon } from '@/ui/icons/Icon';
import { Flex } from '@/ui/primitives/Flex';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './EditorParts.css';

/**
 * 폼 칸 묶음 — GUI 기본 정보(`748:33471` 등): 제목 `Heading/md2 - emphasized` + 필수 `*`(`text/danger-label`) + 안내 `Body/md`,
 * 위아래 16 · 칸 사이 10(→ 8). `legend`가 아니라 제목 + `role="group"`(칸마다 aria-label을 따로 단다)
 */
export function FormSection({
  title,
  required,
  description,
  children,
  testId,
}: {
  title: string;
  required?: boolean;
  description?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  const id = useId();
  return (
    <section className={s.section} aria-labelledby={id} data-testid={testId}>
      <Flex direction="column" gap={1}>
        <Txt as="h2" typography="headingMd2Emphasized">
          <span id={id}>{title}</span>
          {required && (
            <Txt color={colors.textDangerLabel} typography="headingMd2Emphasized">
              <span aria-hidden>*</span>
              <span className={s.visuallyHidden}> (필수)</span>
            </Txt>
          )}
        </Txt>
        {description && (
          <Txt as="p" typography="bodyMd" className={s.preLine}>
            {description}
          </Txt>
        )}
      </Flex>
      {children}
    </section>
  );
}

/** 칸 아래 오류 한 줄 */
export function FieldError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className={s.fieldError}>
      <Txt typography="bodySm" color={colors.textDangerLabel}>
        {children}
      </Txt>
    </p>
  );
}

/**
 * 하단 고정 바 [미리보기][저장하기] — 모바일 `748:33553`(primary 2 Large 121 + Primary Large, 좌우 24 · 위아래 36),
 * PC `748:34686`(오른쪽 정렬 primary 2 medium + Primary medium 229, 위 테두리 `surface/default-border`).
 * 미리보기는 저장할 수 있을 때만 연다(plan P11 V — 코멘트 Nemin 09-20)
 */
export function EditorBottomBar({
  canPreview,
  onPreview,
  canSave,
  saving,
  formId,
}: {
  canPreview: boolean;
  onPreview: () => void;
  canSave: boolean;
  saving: boolean;
  /** 저장 버튼이 제출할 폼 */
  formId: string;
}) {
  return (
    <div className={s.bottomBar}>
      <div className={s.bottomInner}>
        <Button
          variant="tonal"
          className={s.previewButton}
          icon={<Icon name="preview" />}
          disabled={!canPreview}
          onClick={onPreview}
        >
          미리보기
        </Button>
        <Button
          type="submit"
          form={formId}
          className={s.saveButton}
          disabled={!canSave}
          loading={saving}
        >
          저장하기
        </Button>
      </div>
    </div>
  );
}

/**
 * 저장하지 않은 변경이 있으면 떠나기 전에 묻는다(이탈 경고 — 디자인 없음, DS `Popup`).
 * - 새로고침·탭 닫기: 브라우저 기본 확인(`beforeunload`)
 * - 화면 안 링크(사이드바·체크리스트·헤더 등 같은 출처 `<a>`): 누르기를 가로채 확인 뒤 `router.push`
 * 브라우저 뒤로가기는 막지 않는다(App Router에 이동 차단 API가 없다 — 오버레이 뒤로가기 규칙과 겹치지 않게).
 */
export function useLeaveGuard(dirty: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!(a instanceof HTMLAnchorElement) || a.target === '_blank' || a.hasAttribute('download'))
        return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      e.stopPropagation();
      void openConfirm({
        title: '저장하지 않고 나갈까요?',
        description: '바꾼 내용이 저장되지 않아요.',
        confirmLabel: '나가기',
      }).then((ok) => {
        if (ok) router.push(url.pathname + url.search + url.hash);
      });
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty, router]);
}
