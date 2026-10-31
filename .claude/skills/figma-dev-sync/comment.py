#!/usr/bin/env python3
"""Figma 노드에 코멘트를 단다(REST). 토큰은 ~/.claude.json의 figma-console MCP env에서 읽고 출력하지 않는다.

  comment.py post <gui|ds|fileKey> <node_id> [--date YYYY-MM-DD --key 카드key] < 본문
      새 코멘트를 달고 id를 출력한다. --date·--key를 주면 기록부(~/.dudoong-figma-sync.json)에 남긴다
  comment.py clear <YYYY-MM-DD>     # 그 날짜 리포트로 단 코멘트를 모두 지운다(같은 날짜 다시 실행 전에)
  comment.py delete <gui|ds|fileKey> <comment_id>
"""
import json, os, sys, urllib.request, urllib.error

FILES = {'gui': '1Cn4WOu6TDaSajbFIuH6fO', 'ds': '0QD9tGSt8ZciDqe7ol2gYH'}
LEDGER = os.path.expanduser('~/.dudoong-figma-sync.json')


def ledger():
    try:
        return json.load(open(LEDGER))
    except (OSError, ValueError):
        return {}


def save_ledger(d):
    with open(LEDGER, 'w') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)


def token():
    cfg = json.load(open(os.path.expanduser('~/.claude.json')))
    t = cfg.get('mcpServers', {}).get('figma-console', {}).get('env', {}).get('FIGMA_ACCESS_TOKEN')
    if not t:
        sys.exit('FIGMA_ACCESS_TOKEN이 ~/.claude.json mcpServers.figma-console.env에 없다')
    return t


def call(method, path, body=None):
    req = urllib.request.Request(
        'https://api.figma.com/v1' + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'X-Figma-Token': token(), 'Content-Type': 'application/json'},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read()
            return r.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors='replace')[:300]
        if e.code == 403:
            msg += '\n(토큰에 Comments 쓰기 권한이 없을 수 있다)'
        sys.exit(f'Figma 오류 {e.code}: {msg}')


def main(argv):
    if len(argv) >= 2 and argv[0] == 'clear':
        d = ledger(); rows = d.pop(argv[1], [])
        for r in rows:
            try:
                call('DELETE', f"/files/{r['file']}/comments/{r['id']}")
            except SystemExit as e:
                print(f"건너뜀 {r['id']}: {e}", file=sys.stderr)
        save_ledger(d)
        print(f'지움 {len(rows)}건')
        return
    if len(argv) < 3:
        sys.exit(__doc__)
    cmd, f, target = argv[0], argv[1], argv[2]
    key = FILES.get(f, f)
    opts = dict(zip(argv[3::2], argv[4::2]))
    if cmd == 'post':
        msg = sys.stdin.read().strip()
        if not msg:
            sys.exit('본문이 비었다')
        _, d = call('POST', f'/files/{key}/comments',
                    {'message': msg, 'client_meta': {'node_id': target, 'node_offset': {'x': 0, 'y': 0}}})
        cid = d.get('id')
        if opts.get('--date'):
            led = ledger()
            led.setdefault(opts['--date'], []).append({'file': key, 'id': cid, 'node': target, 'key': opts.get('--key')})
            save_ledger(led)
        print(cid)
    elif cmd == 'delete':
        call('DELETE', f'/files/{key}/comments/{target}')
        print('deleted')
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main(sys.argv[1:])
