#!/usr/bin/env python3
"""Figma를 **읽기만** 한다(REST). 디자이너 Q&A 스킬 design-context용. 코멘트를 달거나 노드를 고치지 않는다.

토큰(FIGMA_ACCESS_TOKEN) — 위에서부터 먼저 걸리는 것. 출력하지 않는다:
  환경 변수 FIGMA_ACCESS_TOKEN → ~/.dudoong-design-context.env → ~/.claude.json(figma-console MCP env)

  figma_read.py comments [gui|ds|wire] [--node ID [--deep]] [--query 말] [--since YYYY-MM-DD] [--all] [--limit N]
      코멘트 스레드(새것부터): 날짜 · 쓴 사람 · 열림/해결 · 프레임 이름 · 링크 · 본문 + 답글.
      기본은 열린 것만, --all이면 해결된 것도. 파일을 안 주면 gui. --query는 단어 모두 포함(AND).
      --node는 그 노드에 달린 것만, --deep을 더하면 그 노드 안 하위 노드에 달린 것까지
  figma_read.py devsync [--date YYYY-MM-DD] [--query 말]
      GUI 파일 "개발 싱크용" 페이지(794:3162)의 카드 리포트 — 날짜 섹션 · 카드별 글자
  figma_read.py node <node_id> [gui|ds|wire]
      노드 이름 · 종류 · Ready for dev 여부 · 링크(빠른 확인. 화면 전체 Ready 목록은 ../gui-implement/figma_nodes.py ready)

file: gui = GUI 화면 1Cn4WOu6TDaSajbFIuH6fO(기본) · wire = 와이어프레임 FUQb8ldGBp3uYUuXPV5FDC · ds = 디자인 시스템 0QD9tGSt8ZciDqe7ol2gYH
"""
import json, os, re, sys, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone, timedelta

FILES = {'gui': '1Cn4WOu6TDaSajbFIuH6fO', 'ds': '0QD9tGSt8ZciDqe7ol2gYH', 'wire': 'FUQb8ldGBp3uYUuXPV5FDC'}
DEVSYNC_PAGE = '794:3162'
KST = timezone(timedelta(hours=9))
HOME = os.path.expanduser('~')


def token():
    t = os.environ.get('FIGMA_ACCESS_TOKEN')
    if t:
        return t
    p = os.environ.get('DESIGN_CONTEXT_ENV') or os.path.join(HOME, '.dudoong-design-context.env')
    if os.path.exists(p):
        for line in open(p, encoding='utf-8'):
            if line.strip().startswith('FIGMA_ACCESS_TOKEN='):
                return line.split('=', 1)[1].strip().strip('"').strip("'")
    try:
        cfg = json.load(open(os.path.join(HOME, '.claude.json')))
        t = cfg.get('mcpServers', {}).get('figma-console', {}).get('env', {}).get('FIGMA_ACCESS_TOKEN')
        if t:
            return t
    except (OSError, ValueError):
        pass
    sys.exit('FIGMA_ACCESS_TOKEN이 없다 — ~/.dudoong-design-context.env에 넣는다(README.md)')


def get(path, timeout=120):
    req = urllib.request.Request('https://api.figma.com/v1' + path, headers={'X-Figma-Token': token()})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f'Figma 오류 {e.code}: {e.read().decode(errors="replace")[:300]}')


def opt(args, name, default=None):
    if name in args:
        i = args.index(name)
        val = args[i + 1] if i + 1 < len(args) else sys.exit(f'{name} 뒤에 값이 없다')
        del args[i:i + 2]
        return val
    return default


def file_key(args):
    for a in list(args):
        if a in FILES or re.fullmatch(r'[A-Za-z0-9]{20,}', a):
            args.remove(a)
            return FILES.get(a, a)
    return FILES['gui']


def link(key, node_id=None):
    return f'https://www.figma.com/design/{key}/' + (f'?node-id={node_id.replace(":", "-")}' if node_id else '')


def when(iso):
    return datetime.fromisoformat(iso.replace('Z', '+00:00')).astimezone(KST)


def node_names(key, ids):
    names = {}
    ids = sorted(set(i for i in ids if i))
    for i in range(0, len(ids), 80):
        q = urllib.parse.quote(','.join(ids[i:i + 80]))
        for nid, n in (get(f'/files/{key}/nodes?ids={q}&depth=1').get('nodes') or {}).items():
            names[nid] = (n or {}).get('document', {}).get('name') if n else None
    return names


def cmd_comments(args):
    node = opt(args, '--node')
    q = opt(args, '--query')
    since = opt(args, '--since')
    limit = int(opt(args, '--limit', '30'))
    show_all = '--all' in args
    deep = '--deep' in args
    args = [a for a in args if a not in ('--all', '--deep')]
    key = file_key(args)
    cs = get(f'/files/{key}/comments?as_md=true').get('comments', [])
    roots = [c for c in cs if not c.get('parent_id')]
    replies = {}
    for c in cs:
        if c.get('parent_id'):
            replies.setdefault(c['parent_id'], []).append(c)
    node_of = lambda c: (c.get('client_meta') or {}).get('node_id')
    if node:
        node = node.replace('-', ':')
        targets = {node}
        if deep:
            sub = (get(f'/files/{key}/nodes?ids={urllib.parse.quote(node)}', timeout=300).get('nodes') or {}).get(node)
            stack = [sub['document']] if sub else []
            while stack:
                n = stack.pop()
                targets.add(n['id'])
                stack.extend(n.get('children', []))
        roots = [c for c in roots if node_of(c) in targets]
    if not show_all:
        roots = [c for c in roots if not c.get('resolved_at')]
    if since:
        s = datetime.strptime(since, '%Y-%m-%d').replace(tzinfo=KST)
        roots = [c for c in roots if when(c['created_at']) >= s or any(when(r['created_at']) >= s for r in replies.get(c['id'], []))]
    if q:
        words = q.lower().split()
        def text_of(c):
            return ' '.join([c.get('message', '')] + [r.get('message', '') for r in replies.get(c['id'], [])]).lower()
        roots = [c for c in roots if all(w in text_of(c) for w in words)]
    roots.sort(key=lambda c: c['created_at'], reverse=True)
    roots = roots[:limit]
    names = node_names(key, [node_of(c) for c in roots])
    for c in roots:
        nid = node_of(c)
        state = '해결됨' if c.get('resolved_at') else '열림'
        who = (c.get('user') or {}).get('handle', '?')
        print(f"■ {when(c['created_at']):%Y-%m-%d %H:%M} · {who} · {state} · {names.get(nid) or '(노드 없음)'} {nid or ''}")
        print(f"  {link(key, nid) if nid else link(key)}")
        print('  ' + c.get('message', '').strip().replace('\n', '\n  '))
        for r in sorted(replies.get(c['id'], []), key=lambda r: r['created_at']):
            rw = (r.get('user') or {}).get('handle', '?')
            print(f"    ↳ {when(r['created_at']):%Y-%m-%d %H:%M} · {rw}: " + r.get('message', '').strip().replace('\n', '\n      '))
        print()
    print(f'({len(roots)}개 · {"해결 포함" if show_all else "열린 것만"})')


def texts(n, out):
    if n.get('type') == 'TEXT' and n.get('characters', '').strip():
        out.append(n['characters'].strip())
    for ch in n.get('children', []):
        texts(ch, out)
    return out


def cmd_devsync(args):
    date = opt(args, '--date')
    q = opt(args, '--query')
    key = FILES['gui']
    page = (get(f'/files/{key}/nodes?ids={urllib.parse.quote(DEVSYNC_PAGE)}', timeout=300).get('nodes') or {}).get(DEVSYNC_PAGE)
    if not page:
        sys.exit('개발 싱크용 페이지(794:3162)를 못 찾았다')
    sections = page['document'].get('children', [])
    shown = 0
    for sec in sorted(sections, key=lambda s: s.get('name', ''), reverse=True):
        if date and date not in sec.get('name', ''):
            continue
        cards = []
        for ch in sec.get('children', []):
            body = texts(ch, [])
            if not body:
                continue
            joined = ' / '.join(body)
            if q and not all(w in joined.lower() for w in q.lower().split()):
                continue
            cards.append((ch, body))
        if not cards:
            continue
        shown += 1
        print(f"# {sec.get('name')}  {link(key, sec['id'])}")
        for ch, body in cards:
            print(f"  ■ {ch.get('name')}  {link(key, ch['id'])}")
            for line in body:
                print('    ' + line.replace('\n', '\n    '))
        print()
    print(f'({shown}개 섹션)')


def cmd_node(args):
    if not args:
        sys.exit('node <node_id> [gui|ds|wire]')
    nid = args.pop(0).replace('-', ':')
    key = file_key(args)
    n = (get(f'/files/{key}/nodes?ids={urllib.parse.quote(nid)}&depth=1').get('nodes') or {}).get(nid)
    if not n:
        sys.exit(f'노드 {nid}가 없다(지워졌거나 다시 만들어졌을 수 있다 — 이름으로 다시 찾는다)')
    d = n['document']
    dev = (d.get('devStatus') or {}).get('type')
    print(f"{d.get('name')} · {d.get('type')} · {'Ready for dev' if dev == 'READY_FOR_DEV' else (dev or 'Dev 상태 없음(상위 프레임이 Ready일 수 있다)')}")
    print(link(key, nid))


def main(argv):
    if not argv or argv[0] in ('-h', '--help', 'help'):
        print(__doc__); return
    cmd, args = argv[0], argv[1:]
    {'comments': cmd_comments, 'devsync': cmd_devsync, 'node': cmd_node}.get(
        cmd, lambda a: sys.exit(f'모르는 명령: {cmd}\n{__doc__}'))(args)


if __name__ == '__main__':
    main(sys.argv[1:])
