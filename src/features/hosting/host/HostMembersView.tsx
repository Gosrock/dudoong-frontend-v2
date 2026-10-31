'use client';

import Link from 'next/link';
import { overlay } from 'overlay-kit';

import { isSessionLost } from '@/api/errors';
import type { AssignableHostRole } from '@/api/host/schema';
import {
  HostingAccessRejected,
  HostingForbidden,
  HostingNotFound,
} from '@/features/hosting/access/HostingAccessRejected';
import { parseHostIdParam } from '@/features/shared/host-home/model/host-home-rules';
import type { ActorRole } from '@/features/shared/permission/model/can';
import { AsyncBoundary } from '@/ui/components/AsyncBoundary/AsyncBoundary';
import { Avatar } from '@/ui/components/Avatar/Avatar';
import { Button } from '@/ui/components/Button/Button';
import { DataTable } from '@/ui/components/DataTable/DataTable';
import { Dropdown } from '@/ui/components/Dropdown/Dropdown';
import { DropdownMenu, type DropdownMenuItem } from '@/ui/components/DropdownMenu/DropdownMenu';
import { openConfirm } from '@/ui/components/EasyOverlay/EasyOverlay';
import { Header } from '@/ui/components/Header/Header';
import { Input } from '@/ui/components/Input/Input';
import { Modal } from '@/ui/components/Modal/Modal';
import { toast } from '@/ui/components/Toast/Toast';
import { Icon } from '@/ui/icons/Icon';
import { Spacing } from '@/ui/primitives/Spacing';
import { Txt } from '@/ui/primitives/Txt';
import { colors } from '@/ui/theme/colors';

import * as s from './HostManage.css';
import { HOST_ROLE_LABEL, type PermissionGuideRow } from './model/member-rules';
import { useHostMembers } from './model/useHostMembers';
import { useInviteMembers } from './model/useInviteMembers';

type Members = ReturnType<typeof useHostMembers>;
type MemberRow = Members['members'][number];

/**
 * `/hosting/hosts/[hostId]/members` 멤버 관리(plan P10b V) — **와이어 근거** `503:30866`(호스트_마스터v1.0 멤버 흐름):
 * "ⓘ 멤버 권한이란?" → 권한 가이드 `503:30950`(호스트 삭제 행 없음), 멤버 줄(아바타 · 이름 · 역할) + ⋮(권한 변경 · 마스터 양도 · 멤버 삭제),
 * 권한 변경 `503:31833`, 마스터 양도 `503:32075`, [+ 멤버 초대하기] → 초대 `503:32779`(한 명씩, 문구는 "바로 멤버로 추가됩니다").
 * 메뉴 항목은 `memberActionsOf`(`can()`)가 정한다 — 역할 문자열을 여기서 비교하지 않는다.
 * 주소의 id가 숫자가 아니면 요청 없이 공용 404, 비멤버는 공용 403.
 */
export function HostMembersView({ hostId }: { hostId: string }) {
  const id = parseHostIdParam(hostId);
  if (id === null) return <HostingNotFound />;
  return (
    <AsyncBoundary holdOn={isSessionLost} rejected={HostingAccessRejected} resetKeys={[id]}>
      <HostMembers hostId={id} />
    </AsyncBoundary>
  );
}

function HostMembers({ hostId }: { hostId: string }) {
  const m = useHostMembers(hostId);
  if (m.access === 'forbidden') return <HostingForbidden />;

  const openGuide = () =>
    overlay.open(({ isOpen, close, unmount }) => (
      <PermissionGuideModal
        open={isOpen}
        onClose={close}
        onExited={unmount}
        guide={m.permissionGuide}
      />
    ));
  const openInvite = () =>
    overlay.open(({ isOpen, close, unmount }) => (
      <InviteModal
        open={isOpen}
        onClose={close}
        onExited={unmount}
        hostId={hostId}
        myRole={m.myRole}
      />
    ));

  return (
    <main className={s.page}>
      <Header title="멤버" backHref={`/hosts/${hostId}`} linkAs={Link} />
      <div className={s.members}>
        <Button
          variant="secondary"
          size="sm"
          className={s.guideButton}
          icon={<Icon name="information" size={16} />}
          onClick={openGuide}
        >
          멤버 권한이란?
        </Button>
        <Spacing size={3} />
        {m.actionError && (
          <p role="alert" className={s.note}>
            <Txt typography="bodySm" color={colors.textDangerLabel}>
              {m.actionError}
            </Txt>
          </p>
        )}
        <ul aria-label="멤버 목록" className={s.memberList}>
          {m.members.map((member) => (
            <MemberItem key={member.userId} member={member} m={m} />
          ))}
        </ul>
      </div>
      {m.canInvite && (
        <Button
          variant="dark"
          className={s.inviteButton}
          icon={<Icon name="add" />}
          onClick={openInvite}
        >
          멤버 초대하기
        </Button>
      )}
    </main>
  );
}

function MemberItem({ member, m }: { member: MemberRow; m: Members }) {
  const name = member.name ?? '이름 없음';
  const { changeRoleTo, remove, transfer } = member.actions;

  const changeRole = (to: AssignableHostRole) => {
    let ok = false;
    void openConfirm({
      title: '멤버 권한 변경',
      description: '멤버의 권한이 다음과 같이 변경됩니다.',
      content: (
        <div className={s.roleChange} data-testid="role-change">
          <Txt typography="labelLg">{member.roleLabel}</Txt>
          <Icon name="forward" />
          <Txt typography="labelLg">{HOST_ROLE_LABEL[to]}</Txt>
        </div>
      ),
      confirmLabel: '변경하기',
      // 실패 안내는 훅이 한다(HOST_404_2는 목록 위 안내, 그 밖은 공용 토스트) — 실패해도 닫는다
      onConfirm: async () => {
        ok = await m.changeRole(member.userId, to);
      },
    }).then((closed) => closed && ok && toast('멤버의 권한을 변경하였습니다.'));
  };

  const transferMaster = () => {
    let ok = false;
    void openConfirm({
      title: '마스터 권한을 양도하시겠어요?',
      description:
        '*마스터는 1명만 지정할 수 있으며, 권한을 양도하면 현재 마스터는 매니저 권한으로 변경됩니다.',
      content: (
        <Txt typography="bodyMd" color={colors.textPrimary}>
          받는 멤버: {name}
        </Txt>
      ),
      confirmLabel: '양도하기',
      onConfirm: async () => {
        ok = await m.transferMaster(member.userId);
      },
    }).then((closed) => closed && ok && toast('마스터 권한을 양도하였습니다.'));
  };

  const removeMember = () => {
    let ok = false;
    // 디자인 없음(와이어는 ⋮ "멤버 삭제" 항목만) — DS Popup으로 확인을 받는다(🤖)
    void openConfirm({
      title: `${name}님을 멤버에서 삭제할까요?`,
      description: '삭제하면 이 호스트의 공연을 관리할 수 없어요.',
      confirmLabel: '삭제하기',
      onConfirm: async () => {
        ok = await m.remove(member.userId);
      },
    }).then((closed) => closed && ok && toast('멤버를 삭제했어요'));
  };

  const items: DropdownMenuItem[] = [
    ...(changeRoleTo ? [{ label: '권한 변경', onSelect: () => changeRole(changeRoleTo) }] : []),
    ...(transfer ? [{ label: '마스터 양도', onSelect: transferMaster }] : []),
    ...(remove ? [{ label: '멤버 삭제', danger: true, onSelect: removeMember }] : []),
  ];

  return (
    <li className={s.memberRow} data-testid="member-row">
      <Avatar size={45} src={member.profileImageUrl} />
      <div className={s.memberText}>
        <Txt typography="headingSmEmphasized" lines={1}>
          <span data-testid="member-name">{name}</span>
          {member.isMe && (
            <Txt typography="bodySm" color={colors.textSecondaryLabel}>
              {' '}
              (나)
            </Txt>
          )}
        </Txt>
        {/* 와이어는 마스터·매니저만 역할을 적고 일반은 비워 둔다. 화면 읽기 프로그램에는 "일반"도 읽힌다 */}
        <span data-testid="member-role" data-role={member.role}>
          {member.role === 'GUEST' ? (
            <span className={s.visuallyHidden}>{member.roleLabel}</span>
          ) : (
            <Txt typography="bodySm" color={colors.textSecondaryLabel}>
              {member.roleLabel}
            </Txt>
          )}
        </span>
      </div>
      {items.length > 0 && (
        <DropdownMenu
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

const GUIDE_ROLES = ['MASTER', 'MANAGER', 'GUEST'] as const;

/** 권한 가이드 `503:30950` "멤버 권한에 대해서" — 표 데이터는 `PERMISSION_GUIDE`(`can()`에서 나옴, "호스트 삭제" 행 없음) */
function PermissionGuideModal({
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
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      onExited={onExited}
      title="멤버 권한에 대해서"
    >
      <DataTable
        caption="권한 가이드"
        data={guide}
        getRowId={(row) => row.label}
        columns={[
          { id: 'label', header: '권한', cell: (row) => row.label },
          ...GUIDE_ROLES.map((role) => ({
            id: role,
            header: HOST_ROLE_LABEL[role],
            align: 'center' as const,
            cell: (row: PermissionGuideRow) =>
              row[role].note ? (
                <Txt typography="labelSm">{row[role].note}</Txt>
              ) : row[role].allowed ? (
                <span role="img" aria-label="가능" className={s.check}>
                  <Icon name="circle-check" />
                </span>
              ) : (
                <span role="img" aria-label="불가" />
              ),
          })),
        ]}
      />
    </Modal>
  );
}

/** 초대 `503:32779` — 이메일 1칸 + 역할(기본 "일반", 매니저는 "일반" 고정) + [초대하기]. 초대는 즉시 멤버라 문구를 바꿨다(plan P10b) */
function InviteModal({
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
  const f = useInviteMembers(hostId, myRole);
  const row = f.rows[0]!;
  const error = f.serverErrors[0] ?? (f.attempted ? f.errors[0] : null) ?? f.formError;
  const formId = 'host-invite-form';

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && !f.submitting && onClose()}
      onExited={onExited}
      dismissible={!f.submitting}
      title="멤버 초대하기"
      description="초대하면 바로 멤버로 추가됩니다."
      footer={
        <Button
          type="submit"
          form={formId}
          size="lg"
          fullWidth
          disabled={!row.email.trim()}
          loading={f.submitting}
        >
          초대하기
        </Button>
      }
    >
      <form
        id={formId}
        aria-label="멤버 초대"
        noValidate
        className={s.inviteForm}
        onSubmit={(e) => {
          e.preventDefault();
          void f.submit().then((ok) => {
            if (!ok) return;
            onClose();
            toast('멤버를 초대했어요');
          });
        }}
      >
        <div className={s.inviteRow} data-testid="invite-row">
          <Input
            className={s.inviteEmail}
            type="email"
            aria-label="초대할 이메일"
            placeholder="dudoong@email.com"
            showCount={false}
            value={row.email}
            onChange={(e) => f.setEmail(0, e.target.value)}
            error={error ?? undefined}
          />
          <Dropdown
            className={s.inviteRole}
            aria-label="역할"
            options={f.roleOptions.map((role) => ({ value: role, label: HOST_ROLE_LABEL[role] }))}
            value={row.role}
            disabled={f.roleOptions.length < 2}
            onValueChange={(v) => v && f.setRole(0, v as AssignableHostRole)}
          />
        </div>
      </form>
    </Modal>
  );
}
