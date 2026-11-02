import type { TicketFormField } from '../model/ticket-form';
import type { useTicketForm } from '../model/useTicketForm';

type TicketForm = ReturnType<typeof useTicketForm>;

/** 티켓 폼 섹션이 받는 조각 — 지금 값 · 칸 바꾸기 · 잠금(훅 반환 그대로) */
export type TicketSectionProps = {
  form: Pick<TicketForm, 'values' | 'set' | 'locks'>;
  /** 읽기 전용(고칠 수 없는 폼) */
  readOnly: boolean;
  /** 보일 칸 오류 — 서버 오류는 늘, 칸 오류는 [저장]을 누른 뒤 */
  err: (field: TicketFormField) => string | undefined;
};
