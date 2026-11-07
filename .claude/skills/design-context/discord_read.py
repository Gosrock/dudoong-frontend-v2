#!/usr/bin/env python3
"""디스코드 작업 기록 채널을 **읽기만** 한다(글을 올리는 기능은 없다). 디자이너 Q&A 스킬 design-context용.

설정(env 파일) — 위에서부터 먼저 걸리는 것:
  DESIGN_CONTEXT_ENV=PATH
  ~/.dudoong-design-context.env      (디자이너용 — README.md)
  ~/.dudoong-discord.env             (개발자 discord-log 설정을 그대로 쓸 때)
키: DISCORD_BOT_TOKEN(필수) · DISCORD_CHANNEL_ID(필수, #프론트). 토큰은 출력하지 않는다.

  discord_read.py check                                   # 채널·읽기 권한 확인
  discord_read.py threads [--query 말] [--since YYYY-MM-DD] [--limit N]
      # 스레드 목록(새것부터): 날짜 · id · 댓글 수 · 제목 · 링크. --query는 제목에서 찾는다(띄어쓰기로 나눈 말 모두 포함)
  discord_read.py read <thread_id> [--claude]             # 스레드 전체(오래된 것부터). --claude: "Claude 판단" 댓글만
  discord_read.py search <말> [--since YYYY-MM-DD] [--max-threads N]
      # 제목 + 본문에서 찾는다. 본문 검색은 스레드를 하나씩 읽는다(캐시 ~/.cache/dudoong-design-context/discord)

메시지 본문: 봇이 쓴 글은 늘 보인다. 사람이 쓴 댓글은 봇에 Message Content Intent가 켜져 있어야 보인다
(꺼져 있으면 "(본문 안 보임)"으로 나온다).
"""
import json, os, re, sys, time, urllib.error, urllib.request
from datetime import datetime, timezone, timedelta

API = 'https://discord.com/api/v10'
HOME = os.path.expanduser('~')
CACHE = os.path.join(HOME, '.cache', 'dudoong-design-context', 'discord')
KST = timezone(timedelta(hours=9))
DISCORD_EPOCH = 1420070400000
VIEW_CHANNEL = 1 << 10
READ_MESSAGE_HISTORY = 1 << 16
ADMINISTRATOR = 1 << 3


def env_path():
    for p in (os.environ.get('DESIGN_CONTEXT_ENV'),
              os.path.join(HOME, '.dudoong-design-context.env'),
              os.path.join(HOME, '.dudoong-discord.env')):
        if p and os.path.exists(p):
            return p
    sys.exit('설정 파일이 없다 — ~/.dudoong-design-context.env를 만든다(.claude/skills/design-context/README.md)')


def load_cfg():
    path, cfg = env_path(), {}
    for line in open(path, encoding='utf-8'):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            cfg[k.strip()] = v.strip().strip('"').strip("'")
    for key in ('DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID'):
        if not cfg.get(key):
            sys.exit(f'{key}가 {path}에 없다')
    cfg['_path'] = path
    return cfg


class DiscordError(Exception):
    def __init__(self, code, body):
        super().__init__(f'{code} {body[:200]}')
        self.code = code


def get(cfg, path):
    req = urllib.request.Request(API + path, headers={
        'Authorization': f"Bot {cfg['DISCORD_BOT_TOKEN']}",
        'User-Agent': 'DiscordBot (dudoong-design-context, 1.0)',
    })
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors='replace')
            if e.code == 429 and attempt < 4:
                try:
                    time.sleep(float(json.loads(body).get('retry_after', 1)) + 0.2)
                except ValueError:
                    time.sleep(2)
                continue
            raise DiscordError(e.code, body)


def snow_time(sid):
    return datetime.fromtimestamp(((int(sid) >> 22) + DISCORD_EPOCH) / 1000, KST)


def fmt(dt):
    return dt.strftime('%Y-%m-%d %H:%M')


def opt(args, name, default=None):
    if name in args:
        i = args.index(name)
        val = args[i + 1] if i + 1 < len(args) else sys.exit(f'{name} 뒤에 값이 없다')
        del args[i:i + 2]
        return val
    return default


def since_dt(s):
    return datetime.strptime(s, '%Y-%m-%d').replace(tzinfo=KST) if s else None


def channel(cfg):
    return get(cfg, f"/channels/{cfg['DISCORD_CHANNEL_ID']}")


def all_threads(cfg, since=None):
    """채널의 스레드 전부(열림 + 보관), 새것부터."""
    ch = channel(cfg)
    gid, cid = ch['guild_id'], cfg['DISCORD_CHANNEL_ID']
    found = {}
    for t in get(cfg, f'/guilds/{gid}/threads/active').get('threads', []):
        if t.get('parent_id') == cid:
            found[t['id']] = t
    before = None
    while True:
        q = '?limit=100' + (f'&before={before}' if before else '')
        page = get(cfg, f'/channels/{cid}/threads/archived/public{q}')
        ts = page.get('threads', [])
        for t in ts:
            found.setdefault(t['id'], t)
        if not page.get('has_more') or not ts:
            break
        before = ts[-1]['thread_metadata']['archive_timestamp']
        if since and datetime.fromisoformat(before.replace('Z', '+00:00')) < since:
            break  # 보관 시각이 since보다 이르면 그 뒤는 더 오래된 것
    out = sorted(found.values(), key=lambda t: int(t['id']), reverse=True)
    if since:
        out = [t for t in out if last_activity(t) >= since]
    return gid, out


def last_activity(t):
    lm = t.get('last_message_id')
    return snow_time(lm) if lm else snow_time(t['id'])


def link(gid, cid, mid=None):
    return f'https://discord.com/channels/{gid}/{cid}' + (f'/{mid}' if mid else '')


def messages(cfg, thread):
    """스레드 메시지 전부(오래된 것부터). last_message_id가 같으면 캐시를 쓴다."""
    tid = thread['id'] if isinstance(thread, dict) else thread
    last = thread.get('last_message_id') if isinstance(thread, dict) else None
    path = os.path.join(CACHE, f'{tid}.json')
    try:
        c = json.load(open(path, encoding='utf-8'))
        if last and c.get('last') == last:
            return c['messages']
    except (OSError, ValueError):
        pass
    msgs, before = [], None
    while True:
        page = get(cfg, f'/channels/{tid}/messages?limit=100' + (f'&before={before}' if before else ''))
        msgs.extend(page)
        if len(page) < 100:
            break
        before = page[-1]['id']
    msgs.sort(key=lambda m: int(m['id']))
    slim = [{'id': m['id'], 'author': (m.get('author') or {}).get('global_name') or (m.get('author') or {}).get('username'),
             'bot': (m.get('author') or {}).get('bot', False), 'content': m.get('content', ''),
             'files': [a.get('filename') for a in m.get('attachments', [])],
             'type': m.get('type', 0)} for m in msgs]
    os.makedirs(CACHE, mode=0o700, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({'last': last or (slim[-1]['id'] if slim else None), 'messages': slim}, f, ensure_ascii=False)
    return slim


def is_claude(text):
    return 'Claude 판단' in text


def body(m):
    text = m['content'].strip()
    if not text and m['files']:
        text = '(첨부만)'
    elif not text and m['type'] in (0, 19):
        text = '(본문 안 보임 — 봇에 Message Content Intent가 꺼져 있을 수 있다)'
    if m['files']:
        text += '\n  [첨부] ' + ', '.join(m['files'])
    return text


def cmd_check(cfg):
    print(f"설정 파일: {cfg['_path']}")
    me = get(cfg, '/users/@me')
    print(f"봇: {me.get('username')}")
    try:
        ch = channel(cfg)
    except DiscordError as e:
        sys.exit(f'채널을 읽지 못했다({e.code}) — 채널 id가 틀렸거나 봇이 그 채널을 볼 수 없다')
    gid = ch['guild_id']
    print(f"채널: #{ch.get('name')}")
    member = get(cfg, f"/guilds/{gid}/members/{me['id']}")
    roles = {r['id']: r for r in get(cfg, f'/guilds/{gid}/roles')}
    perms = int(roles[gid]['permissions'])
    for rid in member.get('roles', []):
        if rid in roles:
            perms |= int(roles[rid]['permissions'])
    if not perms & ADMINISTRATOR:
        ow = {o['id']: o for o in ch.get('permission_overwrites', [])}
        if gid in ow:
            perms = (perms & ~int(ow[gid]['deny'])) | int(ow[gid]['allow'])
        allow = deny = 0
        for rid in member.get('roles', []):
            if rid in ow:
                deny |= int(ow[rid]['deny']); allow |= int(ow[rid]['allow'])
        perms = (perms & ~deny) | allow
        if me['id'] in ow:
            perms = (perms & ~int(ow[me['id']]['deny'])) | int(ow[me['id']]['allow'])
    else:
        perms = -1
    ok = True
    for bit, name in ((VIEW_CHANNEL, 'VIEW_CHANNEL 채널 보기'), (READ_MESSAGE_HISTORY, 'READ_MESSAGE_HISTORY 지난 글 읽기')):
        has = perms == -1 or bool(perms & bit)
        ok &= has
        print(f"  {'✓' if has else '✗'} {name}")
    _, ts = all_threads(cfg)
    print(f'스레드: {len(ts)}개')
    print('결과: 읽을 준비 됨' if ok else '결과: ✗ 권한을 서버 관리자에게 요청한다')


def cmd_threads(cfg, args):
    q = opt(args, '--query')
    since = since_dt(opt(args, '--since'))
    limit = int(opt(args, '--limit', '40'))
    gid, ts = all_threads(cfg, since)
    if q:
        words = q.lower().split()
        ts = [t for t in ts if all(w in t['name'].lower() for w in words)]
    for t in ts[:limit]:
        print(f"{fmt(snow_time(t['id']))} · 마지막 {fmt(last_activity(t))} · {t['id']} · 댓글 {t.get('message_count', '?')} · {t['name']}")
        print(f"    {link(gid, t['id'])}")
    print(f'({min(len(ts), limit)} / {len(ts)}개)')


def cmd_read(cfg, args):
    claude_only = '--claude' in args
    args = [a for a in args if a != '--claude']
    if not args:
        sys.exit('read <thread_id>')
    tid = args[0]
    t = get(cfg, f'/channels/{tid}')
    gid = t.get('guild_id')
    print(f"# {t.get('name')}  ({fmt(snow_time(tid))} 시작)\n{link(gid, tid)}\n")
    for m in messages(cfg, t):
        if m['type'] not in (0, 19, 21):  # 일반 · 답글 · 스레드 시작 글
            continue
        if m['type'] == 21 and not m['content'].strip() and not m['files']:
            continue  # 스레드 시작 글의 빈 사본
        text = body(m)
        if claude_only and not is_claude(text):
            continue
        mark = ' 🤖' if is_claude(text) else ''
        print(f"── {fmt(snow_time(m['id']))} · {m['author']}{mark} · {link(gid, tid, m['id'])}")
        print(text + '\n')


def cmd_search(cfg, args):
    since = since_dt(opt(args, '--since'))
    max_threads = int(opt(args, '--max-threads', '80'))
    if not args:
        sys.exit('search <말>')
    words = ' '.join(args).lower().split()
    gid, ts = all_threads(cfg, since)
    hits = 0
    for t in ts[:max_threads]:
        title_hit = all(w in t['name'].lower() for w in words)
        lines = []
        for m in messages(cfg, t):
            text = m['content']
            low = (t['name'] + ' ' + text).lower()
            if text and all(w in low for w in words) and any(w in text.lower() for w in words):
                snippet = re.sub(r'\s+', ' ', text)
                i = max(0, min(snippet.lower().find(w) for w in words if w in snippet.lower()) - 60)
                mark = ' 🤖' if is_claude(text) else ''
                lines.append(f"    {fmt(snow_time(m['id']))}{mark} …{snippet[i:i + 220]}…\n      {link(gid, t['id'], m['id'])}")
        if title_hit or lines:
            hits += 1
            print(f"■ {t['name']}  ({fmt(snow_time(t['id']))} · {t['id']})\n  {link(gid, t['id'])}")
            print('\n'.join(lines[:6]) + (f'\n    … 외 {len(lines) - 6}건' if len(lines) > 6 else ''))
    scanned = min(len(ts), max_threads)
    print(f'\n({hits}개 스레드에서 찾음 · {scanned}/{len(ts)}개 훑음' + (' — 더 오래된 것은 --max-threads를 늘린다' if scanned < len(ts) else '') + ')')


def main(argv):
    if not argv or argv[0] in ('-h', '--help', 'help'):
        print(__doc__); return
    cfg = load_cfg()
    cmd, args = argv[0], argv[1:]
    try:
        if cmd == 'check':
            cmd_check(cfg)
        elif cmd == 'threads':
            cmd_threads(cfg, args)
        elif cmd == 'read':
            cmd_read(cfg, args)
        elif cmd == 'search':
            cmd_search(cfg, args)
        else:
            sys.exit(f'모르는 명령: {cmd}\n{__doc__}')
    except DiscordError as e:
        sys.exit(f'디스코드 요청 실패: {e}')


if __name__ == '__main__':
    main(sys.argv[1:])
