import { z } from 'zod';

import { EventDisplayStatusSchema } from '../event/schema';
import { EntranceStatsSchema } from '../issued-ticket/schema';
import { TicketPayTypeSchema } from '../ticket-item/schema';

/**
 * GD-1 등록 후 대시보드(P13a). 기준: 백엔드 `v2/operation/dto/response/V2DashboardResponse.kt`·`V2ReadDashboardUseCase`
 * (dev cb8d24e — 432cce4 이후 변경 없음). 일반 멤버 이상.
 */

export const DashboardOrdersSchema = z.object({
  pendingApprove: z.number().int(),
  approved: z.number().int(),
  refused: z.number().int(),
  /** 환불 요청(미완료) 주문 수 */
  refundRequested: z.number().int(),
});

export const DashboardTicketItemSchema = z.object({
  ticketItemId: z.number().int(),
  name: z.string().nullable(),
  payType: TicketPayTypeSchema.nullable(),
  /** 판매 매수(재고 감소 기준) */
  soldCount: z.number().int(),
  /** null = 무제한 */
  supplyCount: z.number().int().nullable(),
  /** 승인 대기 주문 수량 합(판매 매수와 별개) */
  pendingApproveCount: z.number().int(),
});
export type DashboardTicketItem = z.infer<typeof DashboardTicketItemSchema>;

export const DashboardSchema = z.object({
  orders: DashboardOrdersSchema,
  tickets: z.object({
    totalSoldCount: z.number().int(),
    /** 무제한 티켓이 하나라도 있으면 null */
    totalSupplyCount: z.number().int().nullable(),
    items: z.array(DashboardTicketItemSchema),
  }),
  /** 승인·결제 완료 주문 결제금액 합(원) */
  salesAmount: z.number().int(),
  /** 입장 현황 — 분모는 발급 수(`issuedCount`) */
  entranceStats: EntranceStatsSchema,
  displayStatus: EventDisplayStatusSchema,
  /** UPCOMING일 때만(당일 0) */
  dDay: z.number().int().nullable(),
  /** 공연 등록(최초 OPEN) 시각(#802). 준비중이면 null, 2026-10 이전 오픈 공연도 null */
  openedAt: z.string().nullable(),
});
export type Dashboard = z.infer<typeof DashboardSchema>;
