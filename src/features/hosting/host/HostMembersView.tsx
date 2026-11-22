'use client';

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import Link from 'next/link';
import { overlay } from 'overlay-kit';
import { useId, useState } from 'react';

import type { AssignableHostRole } from '@/api/host/schema';
import type { HostRole } from '@/api/shared/common-schema';
import { HostingForbidden, HostingNotFound } from '@/features/hosting/access/HostingAccessRejected';
import { HostingBoundary } from '@/features/hosting/access/HostingBoundary';
import { HOST_ROLE_LABEL } from '@/features/hosting/shared/model/host-role';
import { parseHostIdParam } from '@/features/shared/host-home/model/host-home-rules';
import type { ActorRole } from '@/features/shared/permission/model/can';
import { hostHref } from '@/features/shared/routes';
import { Avatar } from '@/ui/components/Avatar/Avatar';
import { ResponsiveOverlay } from '@/ui/components/BottomSheet/ResponsiveOverlay';
import { Button } from '@/ui/components/Button/Button';
import { Dropdown } from '@/ui/components/Dropdown/Dropdown';
import { DropdownMenu, type DropdownMenuItem } from '@/ui/components/DropdownMenu/DropdownMenu';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { Fab } from '@/ui/components/Fab/Fab';
import { Header } from '@/ui/components/Header/Header';
import { InlineError } from '@/ui/components/InlineError/InlineError';
import { Input } from '@/ui/components/Input/Input';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as page from './HostManage.css';
import * as s from './HostMembers.css';
import { type PermissionGuideRow } from './model/member-rules';
import { type CancelInvitationResult, useHostInvitations } from './model/useHostInvitations';
import { type MemberActionResult, useHostMembers } from './model/useHostMembers';
import { useInviteMembers } from './model/useInviteMembers';

type Members = ReturnType<typeof useHostMembers>;
type MemberRow = Members['members'][number];

/**
 * 역할 글자 색(GUI `멤버 행` `1421:752`) — 마스터 `brand/primary` · 매니저 Teal 500(접근성 대비로 400 → 500, Design Sync #282) ·
 * 일반 `text/secondary-label`. 표시용 매핑이라 `can()`이 아니다(patterns §22 D10)
 */
const ROLE_COLOR: Record<HostRole, string> = {
  MASTER: colors.brandPrimary,
  MANAGER: colors.teal500,
  GUEST: colors.textSecondaryLabel,
  UNKNOWN: colors.textSecondaryLabel,
};

/**
 * `/hosting/hosts/[hostId]/members` 멤버 관리 — **GUI 근거**(모바일 2026-11-15 Design Sync #263~#266 · #268 · #269, 11-16 #282~#289):
 * 목록 `1421:755`(마스터) · `1452:54924`(매니저) · `1452:56114`(일반), ⋮ 메뉴 `1422:918`, 권한 변경 `1422:1121` · `1452:42791`,
 * 마스터 양도 `1422:1395`, 멤버 삭제 `1422:1695`, 권한 안내 시트 `1452:54461`, 초대 시트 `1422:1911` · `1423:4341` · `1467:5001`,
 * 이미 멤버 `1476:6806`, 초대 대기 `1452:56710` · `1452:57010`, 초대 취소 `1476:7882` · `1476:8144`(모든 초대 승인 방식 — #348 B71;
 * 미가입 이메일 · 링크 만들기 `1427:4143` · `1427:4357` · `1427:4566`은 이 흐름에서 생기지 않는다). PC(1024~, #296~#298): `1496:9302` · `1496:9535` · `1496:12051` 등 — 본문 960 가운데 ·
 * 머리 줄 오른쪽 [+ 멤버 초대하기](FAB 대신) · 아바타 40. 같은 DOM이고 무엇이 보일지는 CSS가 정한다.
 * 메뉴 항목·초대 역할·FAB는 `can()`(`memberActionsOf` · `canInvite`)이 정한다 — 역할 문자열을 여기서 비교하지 않는다.
 * 주소의 id가 숫자가 아니면 요청 없이 공용 404, 비멤버는 공용 403.
 */
export function HostMembersView({ hostId }: { hostId: string }) {
  const id = parseHostIdParam(hostId);
  if (id === null) return <HostingNotFound />;
  return (
    <HostingBoundary resetKeys={[id]}>
      <HostMembers hostId={id} />
    </HostingBoundary>
  );
}

function HostMembers({ hostId }: { hostId: string }) {
  const members = useHostMembers(hostId);
  if (members.access === 'forbidden') return <HostingForbidden />;

  const openGuide = () =>
    overlay.open(({ isOpen, close, unmount }) => (
      <PermissionGuideSheet
        open={isOpen}
        onClose={close}
        onExited={unmount}
        guide={members.permissionGuide}
      />
    ));
  const openInvite = () =>
    overlay.open(({ isOpen, close, unmount }) => (
      <InviteSheet
        open={isOpen}
        onClose={close}
        onExited={unmount}
        hostId={hostId}
        myRole={members.myRole}
      />
    ));

  return (
    <main className={page.page}>
      <Header
        title="멤버"
        backHref={hostHref(hostId)}
        linkAs={Link}
        className={s.header}
        trailing={
          members.canInvite && (
            // PC 머리 줄 버튼(`1496:9302` `멤버 초대 버튼_데스크탑` — Primary medium + `ic_add` 18). 모바일은 아래 FAB
            <Button
              className={s.inviteButton}
              size="md"
              icon={<Icon name="add" />}
              onClick={openInvite}
            >
              멤버 초대하기
            </Button>
          )
        }
      />
      <div className={s.body}>
        <button type="button" className={s.guideChip} onClick={openGuide}>
          <Icon name="information" size={16} />
          <Txt typography="labelSm">멤버 권한에 대해서</Txt>
        </button>
        {members.actionError && (
          <p role="alert" className={s.note}>
            <Txt typography="bodySm" color={colors.textDangerLabel}>
              {members.actionError}
            </Txt>
          </p>
        )}
        <ul aria-label="멤버 목록" className={s.list}>
          {members.members.map((member) => (
            <MemberItem key={member.userId} member={member} m={members} />
          ))}
        </ul>
        <PendingInvitations hostId={hostId} myRole={members.myRole} />
      </div>
      {members.canInvite && (
        <Fab
          className={s.fab}
          aria-label="멤버 초대하기"
          icon={<Icon name="add" />}
          onClick={openInvite}
        />
      )}
    </main>
  );
}

/**
 * 확인 창 계약(patterns §6) — 실패(`false`)면 열린 채. 성공이면 토스트와 함께 닫히고, 이미 없는 멤버(`'missing'` — HOST_404_2)는
 * 다시 읽은 목록과 목록 위 안내가 답이라 토스트 없이 닫힌다(묶음 ③ 선물 랜딩과 같은 규칙). 그 밖 안내는 훅이 한다(공용 토스트)
 */
async function confirmed(action: Promise<MemberActionResult>, doneMessage: string) {
  const result = await action;
  if (result === true) toast(doneMessage);
  return result !== false;
}

/** 권한 변경 팝업에서 고를 수 있는 역할(`1452:42791` 열림 — 매니저 · 일반). 마스터는 양도로만 */
const ASSIGNABLE_ROLES: readonly AssignableHostRole[] = ['MANAGER', 'GUEST'];

function MemberItem({ member, m }: { member: MemberRow; m: Members }) {
  const name = member.name ?? '이름 없음';
  const { changeRoleTo, remove, transfer } = member.actions;

  const changeRole = (initial: AssignableHostRole) => {
    // 팝업 안 드롭다운의 지금 값 — 확인을 누를 때 읽는다
    const picked = { role: initial };
    void openConfirm({
      title: '멤버 권한 변경',
      description: '멤버의 권한이 다음과 같이 변경됩니다.',
      content: (
        <RoleChangeFields
          currentLabel={member.roleLabel}
          initial={initial}
          onChange={(role) => {
            picked.role = role;
          }}
        />
      ),
      confirmLabel: '변경하기',
      // 지금 역할을 그대로 고르면 요청 없이 닫는다(🤖 — 팝업 드롭다운에 지금 역할도 있다, `1452:42791`)
      onConfirm: () =>
        picked.role === member.role
          ? Promise.resolve(true)
          : confirmed(m.changeRole(member.userId, picked.role), '멤버의 권한을 변경하였습니다.'),
    });
  };

  const transferMaster = () => {
    void openConfirm({
      intent: 'delete', // 확인 버튼 빨강(Warning) — GUI `1422:1395`
      title: '마스터 권한을 양도하시겠어요?',
      description:
        '마스터는 1명만 지정할 수 있으며, 권한을 양도하면 현재 마스터는 매니저 권한으로 변경돼요.',
      confirmLabel: '양도하기',
      onConfirm: () => confirmed(m.transferMaster(member.userId), '마스터 권한을 양도하였습니다.'),
    });
  };

  const removeMember = () => {
    // 확인 버튼 보라(Primary) — GUI `1422:1695`(R1: 화면대로. #187 정리에서는 Warning이었다)
    void openConfirm({
      title: `${name}님을 멤버에서 삭제할까요?`,
      confirmLabel: '삭제하기',
      onConfirm: () => confirmed(m.remove(member.userId), '멤버를 삭제했어요.'),
    });
  };

  const items: DropdownMenuItem[] = [
    ...(changeRoleTo ? [{ label: '권한 변경', onSelect: () => changeRole(changeRoleTo) }] : []),
    ...(transfer ? [{ label: '마스터 양도', onSelect: transferMaster }] : []),
    ...(remove ? [{ label: '멤버 삭제', onSelect: removeMember }] : []),
  ];

  return (
    <li className={s.memberRow} data-testid="member-row">
      <div className={s.memberMain}>
        {/* 프로필 이미지 기본(#269 `1452:40909`)은 병렬 세션 몫 — 지금은 Avatar 캐릭터(grey) · 사진 */}
        <Avatar size={60} className={s.memberAvatar} src={member.profileImageUrl} />
        <div className={s.memberText}>
          <Txt typography="headingSmEmphasized" lines={1}>
            <span data-testid="member-name">{name}</span>
            {member.isMe && ' (나)'}
          </Txt>
          <span data-testid="member-role" data-role={member.role}>
            <Txt typography="bodySm" color={ROLE_COLOR[member.role]}>
              {member.roleLabel}
            </Txt>
          </span>
        </div>
      </div>
      {items.length > 0 && (
        <DropdownMenu
          align="end"
          trigger={
            <button
              type="button"
              className={s.menuButton}
              aria-label={`${name} 메뉴`}
              disabled={m.pendingUserId !== null}
            >
              <Icon name="more" />
            </button>
          }
          items={items}
        />
      )}
    </li>
  );
}

/** 권한 변경 팝업 본문(`1422:1121`) — [지금 권한(비활성 칸)] → [바꿀 권한 ▾] */
function RoleChangeFields({
  currentLabel,
  initial,
  onChange,
}: {
  currentLabel: string;
  initial: AssignableHostRole;
  onChange: (role: AssignableHostRole) => void;
}) {
  const [role, setRole] = useState(initial);
  return (
    <div className={s.roleChange} data-testid="role-change">
      <Input
        className={s.roleChangeField}
        aria-label="지금 권한"
        value={currentLabel}
        disabled
        readOnly
        showCount={false}
      />
      <Icon name="forward" />
      <Dropdown
        className={s.roleChangeField}
        aria-label="바꿀 권한"
        options={ASSIGNABLE_ROLES.map((r) => ({ value: r, label: HOST_ROLE_LABEL[r] }))}
        value={role}
        onValueChange={(v) => {
          if (!v) return;
          setRole(v as AssignableHostRole);
          onChange(v as AssignableHostRole);
        }}
      />
    </div>
  );
}

const GUIDE_ROLES = ['MASTER', 'MANAGER', 'GUEST'] as const;

/**
 * 권한 안내 시트 `1452:54461` "멤버 권한에 대해서" — 막대 손잡이 · 제목 16 · ✕, 표(머리 아래 진한 선 · 줄마다 옅은 선).
 * 행 데이터는 `PERMISSION_GUIDE`(`can()`에서 나옴, 문구는 이 시트). PC는 같은 내용의 모달
 */
function PermissionGuideSheet({
  open,
  onClose,
  onExited,
  guide,
}: {
  open: boolean;
  onClose: () => void;
  onExited: () => void;
  guide: readonly PermissionGuideRow[];
}) {
  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(o) => !o && onClose()}
      onExited={onExited}
      title="멤버 권한에 대해서"
      sheetVariant="flat"
    >
      <table className={s.guideTable}>
        <VisuallyHidden asChild>
          <caption>권한 가이드</caption>
        </VisuallyHidden>
        <thead>
          <tr>
            <th scope="col" className={`${s.guideHead} ${s.guideLabelCol}`}>
              <Txt typography="labelSm">권한</Txt>
            </th>
            {GUIDE_ROLES.map((role) => (
              <th
                key={role}
                scope="col"
                className={`${s.guideHead} ${role === 'GUEST' ? s.guideGuestCol : s.guideRoleCol}`}
              >
                <Txt typography="labelSm">{HOST_ROLE_LABEL[role]}</Txt>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {guide.map((row) => (
            <tr key={row.label}>
              <th scope="row" className={`${s.guideCell} ${s.guideLabelCol}`}>
                <Txt
                  typography="labelMd"
                  color={colors.textSecondaryLabel}
                  className={s.guideLabel}
                >
                  {row.label}
                </Txt>
              </th>
              {GUIDE_ROLES.map((role) => (
                <td
                  key={role}
                  className={`${s.guideCell} ${role === 'GUEST' ? s.guideGuestCol : s.guideRoleCol}`}
                >
                  {row[role].note ? (
                    <Txt typography="labelSm">{row[role].note}</Txt>
                  ) : row[role].allowed ? (
                    <span role="img" aria-label="가능" className={s.check}>
                      <Icon name="circle-check" />
                    </span>
                  ) : (
                    <span role="img" aria-label="불가" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ResponsiveOverlay>
  );
}

/**
 * 초대 시트 설명(`1469:5793` 외 — Design Sync #283 · #284). Figma 그대로 — 모든 초대가 상대 수락 뒤 멤버가 된다(B71 · #348, DEC-042)
 */
const INVITE_DESCRIPTION = '카카오톡에 가입한 이메일로 적어주세요.\n상대방 승인 후 멤버로 추가돼요.';

/**
 * 초대 시트(`1422:1911` · 매니저 `1423:4341` · 역할 열림 `1467:5001`, PC 모달 `1496:11298`) — 이메일 + 역할(기본 "일반", 매니저는
 * "일반" 고정) + [초대하기]. **모든 초대는 H-16**(가입한 이메일도 — #348 B71): 보내면 시트를 닫고 토스트 "초대장을 보냈어요"(`1452:56710`),
 * 줄은 "초대 대기"에 생긴다. 미가입 이메일 · 링크 만들기 장면(`1427:4143` · `1427:4357` · `1427:4566`)은 이 흐름에서 생기지 않는다.
 * 줄 아래 빨간 사유(간격 8): 이미 멤버(`HOST_400_15`, `1476:6806`) · 초대 한도(`HOST_400_21`, `1476:7242`). 같은 이메일에 대기 초대가 있으면
 * 분홍 안내(`1476:7459` — 다시 초대하면 이전 링크는 무효)
 */
function InviteSheet({
  open,
  onClose,
  onExited,
  hostId,
  myRole,
}: {
  open: boolean;
  onClose: () => void;
  onExited: () => void;
  hostId: string;
  myRole: ActorRole | null;
}) {
  const inviteForm = useInviteMembers(hostId, myRole);
  const invitations = useHostInvitations(hostId, myRole);
  const errorId = useId();
  const row = inviteForm.rows[0]!;
  const error =
    inviteForm.serverErrors[0] ?? (inviteForm.attempted ? inviteForm.errors[0] : null);
  const formId = 'host-invite-form';
  const busy = inviteForm.submitting;
  const reinvite = !error && invitations.hasPendingFor(row.email);

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(o) => !o && !busy && onClose()}
      onExited={onExited}
      dismissible={!busy}
      sheetVariant="flat"
      titleSize="md2"
      descriptionStyle="body"
      title="멤버 초대하기"
      description={<span className={s.preLine}>{INVITE_DESCRIPTION}</span>}
      footer={
        <Button
          type="submit"
          form={formId}
          size="lg"
          fullWidth
          // 서버가 막은 이메일(이미 멤버 · 한도)은 고치기 전까지 다시 보내지 않는다(`1476:6806` — [초대하기] 비활성)
          disabled={!row.email.trim() || Boolean(inviteForm.serverErrors[0])}
          loading={inviteForm.submitting}
        >
          초대하기
        </Button>
      }
    >
      <form
        id={formId}
        aria-label="멤버 초대"
        className={s.inviteForm}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void inviteForm.submit().then((ok) => {
            if (!ok) return;
            onClose();
            toast('초대장을 보냈어요');
          });
        }}
      >
        {/* 칸 줄 + 사유(`1476:6806` — 간격 8) */}
        <div className={s.inviteField}>
          <div className={s.inviteRow} data-testid="invite-row">
            <Input
              className={s.inviteEmail}
              type="email"
              aria-label="초대할 이메일"
              placeholder="dudoong@email.com"
              showCount={false}
              invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              {...inviteForm.form.register('rows.0.email')}
            />
            <Dropdown
              className={s.inviteRole}
              aria-label="역할"
              options={inviteForm.roleOptions.map((role) => ({
                value: role,
                label: HOST_ROLE_LABEL[role],
              }))}
              value={row.role}
              disabled={inviteForm.roleOptions.length < 2}
              onValueChange={(v) => v && inviteForm.setRole(0, v as AssignableHostRole)}
            />
          </div>
          {error && (
            <p id={errorId} role="alert" className={`${s.note} ${s.preLine}`}>
              <Txt typography="labelMd" color={colors.textDangerLabel}>
                {error}
              </Txt>
            </p>
          )}
        </div>
        {reinvite && (
          // GUI `1476:7459` "이전 링크 무효 안내" — 분홍 상자. 같은 이메일 대기 초대는 다시 보내면 무효가 된다(H-16)
          <p className={s.dangerBox} data-testid="invite-reinvite-notice">
            <Txt typography="labelSm" color={colors.textDangerLabel}>
              이미 보낸 초대가 있어요. 다시 초대하면 이전 링크는 쓸 수 없게 돼요.
            </Txt>
          </p>
        )}
      </form>
    </ResponsiveOverlay>
  );
}

/**
 * "초대 대기"(H-17, `1452:56710` · `1452:57010`) — 매니저 이상. 모든 초대(가입한 이메일 포함 — #348 B71)가 수락 · 거절 · 만료 전까지 있다.
 * 줄마다 [취소](H-18, 매니저는 일반 초대만 — `can()`). 초대 이메일로 가입한 계정의 닉네임이 있으면 아바타 + 이름 + 역할(`1476:7882` 첫 줄 —
 * 멤버 행과 같은 모양), 없으면 이메일 + "역할 · 만료까지"(`초대 대기 행` `1468:5362`). 링크(토큰)는 다시 받을 수 없어 목록에 없다.
 * 서버에 API가 없으면(운영 2.5.3 404) 숨기고, 그 밖 실패는 이 자리만 `InlineError`.
 */
function PendingInvitations({ hostId, myRole }: { hostId: string; myRole: ActorRole | null }) {
  const inv = useHostInvitations(hostId, myRole);
  if (inv.status === 'hidden' || inv.status === 'pending') return null;
  if (inv.status === 'error') {
    return (
      <section aria-label="초대 대기" className={s.pending}>
        <InlineError message="초대 대기 목록을 불러오지 못했어요" onRetry={inv.retry} />
      </section>
    );
  }
  if (inv.rows.length === 0 && !inv.actionError) return null;

  const cancel = (invitationId: number) => {
    // 확인 버튼 보라(Primary) · [닫기] — GUI `1476:7882`(R1: 화면대로. #187 정리에서는 Warning이었다)
    void openConfirm({
      title: '초대를 취소할까요?',
      description: '보낸 초대 링크는 더 이상 쓸 수 없어요.',
      cancelLabel: '닫기',
      confirmLabel: '초대 취소',
      onConfirm: () => cancelled(inv.cancel(invitationId)),
    });
  };

  return (
    <section aria-label="초대 대기" data-testid="pending-invitations" className={s.pending}>
      <Txt as="h2" typography="headingMdEmphasized">
        초대 대기
      </Txt>
      {inv.actionError && (
        <p role="alert" className={s.note}>
          <Txt typography="bodySm" color={colors.textDangerLabel}>
            {inv.actionError}
          </Txt>
        </p>
      )}
      <ul aria-label="초대 대기 목록" className={s.pendingList}>
        {inv.rows.map((row) => (
          <li
            key={row.invitationId}
            className={s.pendingRow}
            data-testid="invitation-row"
            data-kind={row.name ? 'name' : 'email'}
          >
            {row.name ? (
              <div className={s.memberMain}>
                <Avatar size={60} className={s.memberAvatar} src={row.profileImageUrl} />
                <div className={s.memberText}>
                  <Txt typography="headingSmEmphasized" lines={1}>
                    {row.name}
                  </Txt>
                  <Txt typography="bodySm" color={colors.textSecondaryLabel}>
                    {row.roleLabel}
                  </Txt>
                </div>
              </div>
            ) : (
              <div className={s.memberText}>
                <Txt typography="headingSm" lines={1}>
                  {row.email}
                </Txt>
                <Txt typography="labelMd" color={colors.textSecondaryLabel}>
                  {row.roleLabel} · {row.expiresAt}까지
                </Txt>
              </div>
            )}
            {row.cancelable && (
              <Button
                variant="secondary"
                size="sm"
                // 이름 줄도 이메일로 부른다 — 같은 닉네임이 여럿일 수 있다
                aria-label={`${row.email} 초대 취소`}
                disabled={inv.pendingId !== null}
                onClick={() => cancel(row.invitationId)}
              >
                취소
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 확인 창 계약(patterns §6) — 실패(`false`)면 열린 채. 이미 없는 초대(`'missing'`)는 목록 위 안내가 답이라 토스트 없이 닫힌다 */
async function cancelled(action: Promise<CancelInvitationResult>) {
  const result = await action;
  if (result === true) toast('초대를 취소했어요.');
  return result !== false;
}
