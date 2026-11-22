import { Txt } from '../../primitives/Txt';
import { colors } from '../../theme/colors';
import { vars } from '../../theme/tokens.css';
import * as s from './SalesCard.css';

/** 도넛 · 범례 색 자리 — 1~6은 판매량 순서 색, `other`는 「기타」 · 판매 0(회색) */
export type SalesCardTone = 1 | 2 | 3 | 4 | 5 | 6 | 'other';

export type SalesCardItem = {
  id: string | number;
  name: string;
  /** 판매 매수 */
  count: number;
  /** 색 자리 — 순서 · 묶음 규칙은 쓰는 쪽이 정한다(대시보드는 GUI 가이드 `1904:2952` — `salesLegendOf`) */
  tone: SalesCardTone;
  /** 판매 0 — 도넛에서 빠지고 범례에 흐리게 */
  faded?: boolean;
};

export type SalesCardProps = {
  /** 범례 순서 그대로 도넛을 12시에서 시계 방향으로 그린다(판매 0은 도넛에서 빠진다) */
  items: readonly SalesCardItem[];
  /** 총 판매 매수 — 도넛 가운데. 0이면 `판매 전` */
  soldCount: number;
  /** 판매 금액(원) */
  amount: number;
  title?: string;
  'data-testid'?: string;
};

export const salesToneColor = (tone: SalesCardTone) => vars.color.chart[tone];

const SIZE = 120;
const STROKE = 18;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
/** 조각 사이 틈(원둘레 위 길이) — Figma 조각마다 카드색 테두리 2 */
const GAP = 2;

/** 판매 매수 몫대로 원호를 나눈다. 12시에서 시작해 시계 방향(GUI 가이드 `1904:2952`) */
function Donut({ items, total }: { items: readonly SalesCardItem[]; total: number }) {
  const parts = items.filter((p) => p.count > 0);
  const gap = parts.length > 1 ? GAP : 0;
  const arcs = parts.map((p, i) => {
    const before = parts.slice(0, i).reduce((sum, q) => sum + q.count, 0);
    const length = (p.count / total) * CIRCUMFERENCE;
    return { item: p, length, offset: (before / total) * CIRCUMFERENCE };
  });
  return (
    <div className={s.donutBox}>
      <svg className={s.donut} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {arcs.map(({ item, length, offset }) => {
            const visible = Math.max(length - gap, 0);
            return (
              <circle
                key={item.id}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={salesToneColor(item.tone)}
                strokeWidth={STROKE}
                strokeDasharray={`${visible} ${CIRCUMFERENCE - visible}`}
                strokeDashoffset={-offset}
              />
            );
          })}
        </g>
      </svg>
      <span className={s.donutCount}>
        <Txt typography="headingLgEmphasized">{total.toLocaleString('ko-KR')}</Txt>
      </span>
    </div>
  );
}

/**
 * 대시보드 티켓 판매 카드 — GUI `티켓 판매 정보_v2`(`1905:3535`, Design Sync #335 · 2026-11-21 — `레이아웃=가로` / `세로`).
 * 판매 0이면 `판매 전`("아직 판매된 티켓이 없어요!"), 아니면 도넛(가운데 총 판매 매수) + 범례(티켓 이름 1줄 말줄임 · N장) + 총액.
 * 가로 / 세로는 카드 폭으로 정한다(좁은 2단 — 1133 `680:672` — 이면 세로). 숫자도 Pretendard(Q14).
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
          <div className={s.body}>
            <Donut items={items} total={soldCount} />
            <ul className={s.legend} aria-label="티켓별 판매">
              {items.map((item) => (
                <li key={item.id} className={s.legendItem} data-faded={item.faded || undefined}>
                  <span
                    className={s.dot}
                    style={{ background: salesToneColor(item.tone) }}
                    aria-hidden
                  />
                  <Txt
                    typography="labelSm"
                    color={item.faded ? colors.textTertiaryLabel : colors.textSecondaryLabel}
                    lines={1}
                    className={s.legendName}
                  >
                    {item.name}
                  </Txt>
                  <Txt
                    typography="labelSm"
                    color={item.faded ? colors.textTertiaryLabel : colors.textPrimaryLabel}
                    className={s.legendCount}
                  >
                    {item.count.toLocaleString('ko-KR')}장
                  </Txt>
                </li>
              ))}
            </ul>
          </div>
          <div className={s.total}>
            <Txt typography="bodyMd" color={colors.textSecondaryLabel}>
              총액
            </Txt>
            <Txt typography="headingMdEmphasized">{amount.toLocaleString('ko-KR')}</Txt>
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
