'use client';

import Link from 'next/link';

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

import { HOST_ROLE_LABEL } from './model/member-rules';
import { useHostMembers } from './model/useHostMembers';
import { useInviteMembers } from './model/useInviteMembers';

/**
 * `/hosting/hosts/[hostId]/members` 멤버 관리 — 스타일 없는 최소 마크업(P10b-L). 초대 모달·역할 메뉴·양도 확인·권한 가이드 표 모양은 P10b-V.
 * 주소의 id가 숫자가 아니면 요청 없이 공용 404, 비멤버는 공용 403.
 */
export function HostMembersView({ hostId }: { hostId: string }) {
  const id = parseHostIdParam(hostId);
  return (
    <main>
      {id === null ? (
        <HostingNotFound />
      ) : (
        <AsyncBoundary holdOn={isSessionLost} rejected={HostingAccessRejected} resetKeys={[id]}>
          <HostMembers hostId={id} />
        </AsyncBoundary>
      )}
    </main>
  );
}

function HostMembers({ hostId }: { hostId: string }) {
  const m = useHostMembers(hostId);
  if (m.access === 'forbidden') return <HostingForbidden />;
  return (
    <>
      <h1>{m.hostName} 멤버</h1>
      <nav>
        <Link href={`/hosts/${hostId}`}>호스트 홈</Link>{' '}
        <Link href={`/hosting/hosts/${hostId}/settings`}>설정</Link>
      </nav>
      {m.actionError && <p role="alert">{m.actionError}</p>}
      <ul aria-label="멤버 목록">
        {m.members.map((member) => {
          const busy = m.pendingUserId !== null;
          const { changeRoleTo, remove, transfer } = member.actions;
          return (
            <li key={member.userId} data-testid="member-row">
              <span data-testid="member-name">{member.name ?? '이름 없음'}</span>
              {member.isMe && <span> (나)</span>}{' '}
              <span data-testid="member-role">{member.roleLabel}</span>{' '}
              {changeRoleTo && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void m.changeRole(member.userId, changeRoleTo)}
                >
                  {HOST_ROLE_LABEL[changeRoleTo]}(으)로 변경
                </button>
              )}
              {remove && (
                <button type="button" disabled={busy} onClick={() => void m.remove(member.userId)}>
                  삭제
                </button>
              )}
              {transfer && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void m.transferMaster(member.userId)}
                >
                  마스터 넘기기
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {m.canInvite && <InviteForm hostId={hostId} myRole={m.myRole} />}
      <PermissionGuide guide={m.permissionGuide} />
    </>
  );
}

function InviteForm({ hostId, myRole }: { hostId: string; myRole: ActorRole | null }) {
  const f = useInviteMembers(hostId, myRole);
  return (
    <form
      aria-label="멤버 초대"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void f.submit();
      }}
    >
      <h2>멤버 초대</h2>
      <p>초대하면 바로 멤버로 추가돼요</p>
      {f.rows.map((row, i) => {
        const error = f.serverErrors[i] ?? (f.attempted ? f.errors[i] : null);
        return (
          <div key={i} data-testid="invite-row">
            <input
              type="email"
              aria-label={`초대할 이메일 ${i + 1}`}
              value={row.email}
              onChange={(e) => f.setEmail(i, e.target.value)}
            />
            <select
              aria-label={`역할 ${i + 1}`}
              value={row.role}
              disabled={f.roleOptions.length < 2}
              onChange={(e) => f.setRole(i, e.target.value as AssignableHostRole)}
            >
              {f.roleOptions.map((role) => (
                <option key={role} value={role}>
                  {HOST_ROLE_LABEL[role]}
                </option>
              ))}
            </select>
            {f.canRemoveRow && (
              <button type="button" onClick={() => f.removeRow(i)}>
                줄 삭제
              </button>
            )}
            {error && <span role="alert">{error}</span>}
          </div>
        );
      })}
      {f.formError && <p role="alert">{f.formError}</p>}
      {f.canAddRow && (
        <button type="button" onClick={f.addRow}>
          줄 추가
        </button>
      )}
      <button type="submit" disabled={f.submitting}>
        초대하기
      </button>
    </form>
  );
}

function PermissionGuide({
  guide,
}: {
  guide: ReturnType<typeof useHostMembers>['permissionGuide'];
}) {
  const roles = ['GUEST', 'MANAGER', 'MASTER'] as const;
  return (
    <table aria-label="권한 가이드">
      <thead>
        <tr>
          <th>할 수 있는 일</th>
          {roles.map((r) => (
            <th key={r}>{HOST_ROLE_LABEL[r]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {guide.map((row) => (
          <tr key={row.label}>
            <td>{row.label}</td>
            {roles.map((r) => (
              <td key={r}>
                {row[r].allowed ? '○' : '—'}
                {row[r].note && ` (${row[r].note})`}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
