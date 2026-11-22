import type { OrderOptionAnswer } from '@/api/order/schema';

/**
 * 주문상세 옵션 답 표시(O-3 `optionAnswers[]` — `optionType` · `choices`는 Api 2.5.16, #348 B67).
 * - 객관식(`YES_NO` · `MULTIPLE_CHOICE`)이고 답이 지금 선택지에 있으면 선택지 버튼(고른 것만 살아 있음)
 * - 주관식 · 옵션 삭제(`optionType` null) · 선택지 없음 · 답이 지금 선택지에 없음(주문 뒤 옵션이 바뀜 — 종류 · 선택지는 지금 옵션 기준)이면
 *   입력칸(읽기 전용, 빈 답은 "—")
 * 버튼 글자는 서버 선택지 그대로 — `YES_NO`는 "예" · "아니요"(맞춤법 · 서버 값 기준, GUI `1175:19046`의 "아니오" 대신 — #378 백엔드 답)
 */
export type OptionAnswerView =
  | { kind: 'choice'; value: string; choices: { value: string; label: string }[] }
  | { kind: 'text'; text: string };

export function optionAnswerView(
  a: Pick<OrderOptionAnswer, 'optionType' | 'answer'> & { choices?: readonly string[] | null },
): OptionAnswerView {
  const choices = a.choices ?? [];
  const objective = a.optionType === 'YES_NO' || a.optionType === 'MULTIPLE_CHOICE';
  if (objective && a.answer !== null && choices.includes(a.answer)) {
    return {
      kind: 'choice',
      value: a.answer,
      choices: choices.map((c) => ({ value: c, label: c })),
    };
  }
  return { kind: 'text', text: a.answer?.trim() ? a.answer : '—' };
}
