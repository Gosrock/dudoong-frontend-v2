#!/usr/bin/env bash
# 프론트 v2를 스테이징(https://staging.dudoong.com)에 올린다.
#   1) main 브랜치 · 로컬 main == origin/main 인지 검사(아니면 멈춤)
#   2) 그 커밋의 Image 워크플로(:dev 빌드)가 성공했는지 검사(도는 중이면 기다림)
#   3) Gosrock/DuDoong-Deploy "Staging Power" start 실행 — 꺼져 있으면 켜고, 켜져 있으면 그대로 최신 :dev 배포
#   4) 실행이 끝날 때까지 보고 /healthz 확인
# 사용: bash .claude/skills/staging-deploy/staging_deploy.sh [--check]   (--check: 1·2만 검사하고 실행하지 않음)
set -euo pipefail

DEPLOY_REPO=Gosrock/DuDoong-Deploy
STAGING_URL=https://staging.dudoong.com
CHECK_ONLY=false
[ "${1:-}" = "--check" ] && CHECK_ONLY=true

fail() { echo "멈춤: $*" >&2; exit 1; }

# ── 1. 브랜치 · 원격과 같은지
cd "$(git rev-parse --show-toplevel)"
branch=$(git branch --show-current)
[ "$branch" = "main" ] || fail "지금 브랜치가 '$branch'다. main에서만 실행한다."
git fetch -q origin main
local_sha=$(git rev-parse main)
remote_sha=$(git rev-parse origin/main)
[ "$local_sha" = "$remote_sha" ] || fail "로컬 main(${local_sha:0:7})과 origin/main(${remote_sha:0:7})이 다르다. git pull 또는 push 뒤 다시."
echo "확인: main = origin/main = ${local_sha:0:7} ($(git log -1 --format=%s | cut -c1-60))"
[ -z "$(git status --porcelain)" ] || echo "참고: 커밋하지 않은 변경이 있다 — 배포에는 들어가지 않는다(원격 커밋 기준)."

# ── 2. 그 커밋의 :dev 이미지
for i in $(seq 1 40); do
  run=$(gh run list --workflow image.yml --branch main --commit "$local_sha" --limit 1 --json status,conclusion,url -q '.[0] | "\(.status) \(.conclusion) \(.url)"')
  [ -n "$run" ] || fail "커밋 ${local_sha:0:7}의 Image 워크플로 실행이 없다(:dev에 이 커밋이 없음)."
  read -r status conclusion url <<<"$run"
  if [ "$status" = "completed" ]; then
    [ "$conclusion" = "success" ] || fail "Image 워크플로가 $conclusion — $url"
    echo "확인: :dev 이미지 = ${local_sha:0:7} ($url)"
    break
  fi
  [ "$i" = 40 ] && fail "Image 워크플로가 20분 넘게 끝나지 않는다 — $url"
  echo "Image 빌드 중($status) — 30초 뒤 다시 본다"
  sleep 30
done

# main에 더 새 커밋이 들어가 :dev가 덮어써졌을 수 있다 — 위 fetch 이후 다시 한 번
git fetch -q origin main
[ "$(git rev-parse origin/main)" = "$local_sha" ] || fail "그사이 origin/main이 바뀌었다. git pull 뒤 다시."

$CHECK_ONLY && { echo "--check: 배포는 하지 않았다."; exit 0; }

# ── 3. Staging Power start
before=$(date -u +%Y-%m-%dT%H:%M:%SZ)
gh workflow run staging-power.yml -R "$DEPLOY_REPO" -f action=start
echo "실행 요청: $DEPLOY_REPO Staging Power start"
run_id=""
for i in $(seq 1 20); do
  sleep 6
  run_id=$(gh run list -R "$DEPLOY_REPO" --workflow staging-power.yml --event workflow_dispatch --limit 5 \
    --json databaseId,createdAt -q "[.[] | select(.createdAt >= \"$before\")] | last | .databaseId // empty")
  [ -n "$run_id" ] && break
done
[ -n "$run_id" ] || fail "실행을 찾지 못했다 — GitHub Actions 화면에서 확인."
echo "실행: https://github.com/$DEPLOY_REPO/actions/runs/$run_id"

# ── 4. 끝날 때까지 · 헬스체크
gh run watch "$run_id" -R "$DEPLOY_REPO" --exit-status --interval 20 >/dev/null || fail "Staging Power 실행 실패 — https://github.com/$DEPLOY_REPO/actions/runs/$run_id"
code=$(curl -s -o /dev/null -w '%{http_code}' "$STAGING_URL/healthz" || true)
[ "$code" = "200" ] || fail "$STAGING_URL/healthz = $code"
echo "끝: 스테이징에 ${local_sha:0:7} 배포, /healthz 200. 스테이징은 매일 02:00 KST에 자동으로 꺼진다."
