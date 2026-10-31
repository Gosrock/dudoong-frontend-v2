import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import { vars } from '../../theme/tokens.css';
import * as s from './SalesCard.css';

export type SalesCardItem = {
  id: string | number;
  name: string;
  /** 판매 매수 */
  count: number;
};

export type SalesCardProps = {
  /** 티켓 종류별 판매 — 도넛 몫과 범례 순서 */
  items: readonly SalesCardItem[];
  /** 총 판매 매수. 0이면 `판매 전` */
  soldCount: number;
  /** 판매 금액(원) */
  amount: number;
  title?: string;
  'data-testid'?: string;
};

/** 도넛·범례 색 — Figma 3개(직접 값) + 4번째부터는 팔레트로 이음(Figma 코멘트) */
const CHART_COLORS = Object.values(vars.color.chart);
export const salesColorOf = (index: number) => CHART_COLORS[index % CHART_COLORS.length]!;

const SIZE = 104;
const STROKE = 18;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
/** 조각 사이 틈(원둘레 위 길이) — Figma 도넛의 흰 틈 */
const GAP = 4;

/** 판매 매수 몫대로 원호를 나눈다. 12시에서 시작해 반시계로(Figma — 첫 티켓이 왼쪽) */
function Donut({ items, total }: { items: readonly SalesCardItem[]; total: number }) {
  const parts = items
    .map((item, i) => ({ item, color: salesColorOf(i) }))
    .filter((p) => p.item.count > 0);
  const gap = parts.length > 1 ? GAP : 0;
  // 각 조각의 시작 위치 = 앞 조각 길이의 합
  const arcs = parts.map((p, i) => {
    const before = parts.slice(0, i).reduce((sum, q) => sum + q.item.count, 0);
    const length = (p.item.count / total) * CIRCUMFERENCE;
    return { ...p, length, offset: (before / total) * CIRCUMFERENCE };
  });
  return (
    <svg className={s.donut} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
      {/* 12시 시작 + 좌우 뒤집기 = 반시계 */}
      <g transform={`translate(${SIZE} 0) scale(-1 1) rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
        {arcs.map(({ item, color, length, offset }) => {
          const visible = Math.max(length - gap, 0);
          return (
            <circle
              key={item.id}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeDasharray={`${visible} ${CIRCUMFERENCE - visible}`}
              strokeDashoffset={-offset}
            />
          );
        })}
      </g>
    </svg>
  );
}

/**
 * 대시보드 티켓 판매 카드 — 디자인 시스템 `티켓 판매 정보`(`627:1864`). 판매 0이면 `판매 전`("아직 판매된 티켓이 없어요!"),
 * 아니면 도넛 + 범례(티켓 이름 1줄 말줄임) + 판매 장수 · 총액. 숫자도 Pretendard(Q14).
 */
export function SalesCard({
  items,
  soldCount,
  amount,
  title = '티켓 판매 정보',
  'data-testid': testId,
}: SalesCardProps) {
  const selling = soldCount > 0;
  return (
    <section className={s.card} aria-label={title} data-testid={testId}>
      <Txt as="h2" typography="headingMd2Emphasized">
        {title}
      </Txt>
      {selling ? (
        <>
          <div className={s.chartRow}>
            <Donut items={items} total={soldCount} />
            <ul className={s.legend} aria-label="티켓별 판매">
              {items.map((item, i) => (
                <li key={item.id} className={s.legendItem}>
                  <span className={s.dot} style={{ background: salesColorOf(i) }} aria-hidden />
                  <Txt typography="labelSm" color={colors.textSecondaryLabel} lines={1}>
                    {item.name}
                  </Txt>
                  <VisuallyHidden>{` ${item.count}매`}</VisuallyHidden>
                </li>
              ))}
            </ul>
          </div>
          <div className={s.totals}>
            <span className={s.total}>
              <Txt typography="labelMd" color={colors.textSecondaryLabel}>
                판매 장수
              </Txt>
              <Txt typography="headingLgEmphasized">{soldCount.toLocaleString('ko-KR')}</Txt>
            </span>
            <span className={s.total}>
              <Txt typography="labelMd" color={colors.textSecondaryLabel}>
                총액
              </Txt>
              <Txt typography="headingLgEmphasized">{amount.toLocaleString('ko-KR')}</Txt>
            </span>
          </div>
        </>
      ) : (
        <div className={s.empty}>
          <Txt as="p" typography="bodyMd" color={colors.textTertiaryLabel}>
            아직 판매된 티켓이 없어요!
          </Txt>
        </div>
      )}
    </section>
  );
}
