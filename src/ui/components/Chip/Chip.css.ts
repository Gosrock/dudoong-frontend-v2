import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../theme/tokens.css';
import { typography } from '../../theme/typography.css';

/**
 * Figma Tag 페이지 5종(design-system §3).
 * - 모서리 6(Ticket state · Concert state · money option)은 토큰에 없어 `radius[2]`(8)로 옮겼다(디자이너 확인, §4 표).
 * - tag(12)·role chip(`Radius/7`)은 높이의 절반이라 알약.
 * - 좌우 패딩 10은 토큰에 없어 8(`space[2]`) 또는 12(`space[3]`)로 옮겼다. Figma 고정 폭(72)은 최소 폭으로 둔다.
 */
export const chip = recipe({
  base: [
    typography.labelSm,
    {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      height: 24,
      padding: `0 ${vars.space[3]}`,
      border: '1px solid transparent',
      whiteSpace: 'nowrap',
    },
  ],
  variants: {
    variant: {
      /** Ticket state chip 72×24 */
      status: { minWidth: 72, borderRadius: vars.radius[2] },
      /** tag(공연 태그·티켓 수) 72×24, 알약 */
      tag: { borderRadius: vars.radius.full },
      /** role chip 57×24, Label/md, 알약 */
      role: [typography.labelMd, { padding: `0 ${vars.space[2]}`, borderRadius: vars.radius.full }],
      /** Concert state chip — 높이 22, 내용 폭 */
      concert: { height: 22, padding: `0 ${vars.space[2]}`, borderRadius: vars.radius[2] },
      /** money option chip 72×24 */
      money: {
        minWidth: 72,
        borderRadius: vars.radius[2],
        background: vars.color.brand.onPrimaryContainer,
        color: vars.color.text.inverse,
      },
    },
    tone: {
      // status
      brand: { background: vars.color.brand.primarySubtle, color: vars.color.brand.primary },
      muted: {
        background: vars.color.interaction.disabledBg,
        color: vars.color.interaction.disabledText,
      },
      accent: { background: vars.color.chip.giftPendingBg, color: vars.color.brand.accent },
      success: { background: vars.color.status.successSubtle, color: vars.color.status.success },
      /** 임시 `chip/neutral`(토큰 없음): 환불 요청·환불 완료·입장 완료 — 디자이너 색 요청(§5) */
      neutral: {
        background: vars.color.surface.container,
        borderColor: vars.color.surface.defaultBorder,
        color: vars.color.text.secondary,
      },
      /** 임시 `chip/danger`(토큰 없음): 거절·취소 — 글자 Coral + 테두리, 배경 없음 */
      danger: {
        background: 'transparent',
        borderColor: vars.color.text.dangerLabel,
        color: vars.color.text.dangerLabel,
      },
      // tag
      default: {
        background: vars.color.surface.defaultLabel,
        color: vars.color.text.secondaryLabel,
      },
      plain: { background: vars.color.background.normal, color: vars.color.text.primaryLabel },
      // role
      master: { background: vars.color.role.masterBg, color: vars.color.role.masterText },
      manager: { background: vars.color.role.managerBg, color: vars.color.role.managerText },
      // concert(Figma `300:1067` small, 2026-10-25 — 색이 모두 의미 색이 됐다)
      ready: { background: vars.color.status.successSubtle, color: vars.color.status.success },
      dday: { background: vars.color.brand.accentSubtle, color: vars.color.brand.accent },
      ing: { background: vars.color.brand.accent, color: vars.color.brand.accentSubtle },
      past: {
        background: vars.color.interaction.disabledBg,
        color: vars.color.surface.strongBorder,
      },
    },
  },
});
