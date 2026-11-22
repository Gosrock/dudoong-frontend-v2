import { describe, expect, it } from 'vitest';

import { optionAnswerView } from './option-answer';

describe('주문상세 옵션 답 표시(O-3 optionType · choices — #348 B67)', () => {
  it('YES_NO — [예][아니오] 버튼, 서버 "아니요"는 표시만 "아니오"(GUI 1175:19046)', () => {
    expect(optionAnswerView({ optionType: 'YES_NO', choices: ['예', '아니요'], answer: '아니요' })).toEqual({
      kind: 'choice',
      value: '아니요',
      choices: [
        { value: '예', label: '예' },
        { value: '아니요', label: '아니오' },
      ],
    });
  });

  it('MULTIPLE_CHOICE — 등록된 선택지 그대로', () => {
    expect(
      optionAnswerView({ optionType: 'MULTIPLE_CHOICE', choices: ['A석', 'B석', '아니요'], answer: 'B석' }),
    ).toEqual({
      kind: 'choice',
      value: 'B석',
      choices: [
        { value: 'A석', label: 'A석' },
        { value: 'B석', label: 'B석' },
        { value: '아니요', label: '아니요' },
      ],
    });
  });

  it.each([
    ['주관식', { optionType: 'SUBJECTIVE', choices: null, answer: '보컬' }, '보컬'],
    ['옵션 삭제(null)', { optionType: null, choices: null, answer: '예' }, '예'],
    ['필드 없음(2.5.15 이하)', { answer: '예' }, '예'],
    ['답이 지금 선택지에 없음', { optionType: 'MULTIPLE_CHOICE', choices: ['A석'], answer: 'C석' }, 'C석'],
    ['빈 답', { optionType: 'SUBJECTIVE', choices: null, answer: '  ' }, '—'],
    ['답 null', { optionType: 'YES_NO', choices: ['예', '아니요'], answer: null }, '—'],
  ] as const)('%s → 읽기 전용 입력칸', (_, a, text) => {
    expect(optionAnswerView(a)).toEqual({ kind: 'text', text });
  });
});
