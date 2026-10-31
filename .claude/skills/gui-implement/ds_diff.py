#!/usr/bin/env python3
"""디자인 시스템 파일(0QD9tGSt8ZciDqe7ol2gYH)의 두 버전을 비교한다(REST, 읽기만). 토큰은 출력하지 않는다.

  ds_diff.py versions [--limit 30]
      버전 목록(id · 시각 · 작성자 · 라벨). design-system.md 머리의 "동기화 기준 버전" 이후 것을 본다.
  ds_diff.py diff <기준 버전 id> [<새 버전 id>] [--out DIR]
      기준 판과 새 판(생략하면 지금 판)을 받아 비교한다. 파일 JSON은 DIR(기본: 현재 폴더)에 ds_<id>.json으로 둔다
      — 수 MB라 scratchpad를 준다. 출력(마크다운):
        페이지 이름·노드 수, 컴포넌트 세트/단독 컴포넌트 추가·삭제, 세트의 변형 추가·삭제·prop 선택지 변화,
        변형마다 바뀐 값(크기 · 채움 · 테두리 · 모서리 · 패딩 · 간격 · 글자 스타일 · 바인딩된 변수 id), 이펙트·텍스트 스타일 이름.
      변수(토큰) 값은 REST로 읽을 수 없다(Variables API는 Enterprise 전용, 2026-10-31 403) —
      스킬 gui-implement의 "디자인 시스템 변경" 절차대로 Desktop Bridge로 읽는다. 여기 나오는 {id}는 변수 id다.
"""
import json, os, sys, urllib.error, urllib.request

DS = '0QD9tGSt8ZciDqe7ol2gYH'
SKIP_PAGES = {'Sample GUI', 'Thumbnail'}


def token():
    cfg = json.load(open(os.path.expanduser('~/.claude.json')))
    t = cfg.get('mcpServers', {}).get('figma-console', {}).get('env', {}).get('FIGMA_ACCESS_TOKEN')
    if not t:
        sys.exit('FIGMA_ACCESS_TOKEN이 ~/.claude.json mcpServers.figma-console.env에 없다')
    return t


def get(path, timeout=300):
    req = urllib.request.Request('https://api.figma.com/v1' + path, headers={'X-Figma-Token': token()})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f'Figma 오류 {e.code}: {e.read().decode(errors="replace")[:300]}')


def fetch(version, out):
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, f'ds_{version or "now"}.json')
    if version and os.path.exists(path):
        return json.load(open(path))
    data = get(f'/files/{DS}' + (f'?version={version}' if version else ''))
    open(path, 'wb').write(data)
    return json.loads(data)


def index(d):
    idx = {}

    def w(n, page, par):
        n['_pg'], n['_par'] = page, par
        idx[n['id']] = n
        for c in n.get('children', []):
            w(c, page, n['id'])

    for p in d['document']['children']:
        w(p, p['name'].strip(), None)
    return idx


def hx(c):
    s = '#%02x%02x%02x' % (round(c['r'] * 255), round(c['g'] * 255), round(c['b'] * 255))
    return s + (f"@{c['a']:.2f}" if c.get('a', 1) < 1 else '')


def paint(ps):
    out = []
    for p in ps or []:
        if p.get('visible', True) is False:
            continue
        s = hx(p['color']) if 'color' in p else p['type'].lower()
        if p.get('opacity', 1) != 1:
            s += f"*{p['opacity']:.2f}"
        bv = (p.get('boundVariables') or {}).get('color')
        if isinstance(bv, dict) and 'id' in bv:
            s += '{' + bv['id'].replace('VariableID:', '') + '}'
        out.append(s)
    return ','.join(out)


def desc(x):
    b = x.get('absoluteBoundingBox') or {}
    bv = {}
    for k, v in (x.get('boundVariables') or {}).items():
        if k in ('fills', 'strokes'):
            continue
        if isinstance(v, dict) and 'id' in v:
            bv[k] = v['id'].replace('VariableID:', '')
    d = {
        '크기': f"{b.get('width', 0):g}×{b.get('height', 0):g}",
        '채움': paint(x.get('fills')),
        '테두리': paint(x.get('strokes')),
        '모서리': x.get('cornerRadius'),
        '패딩': tuple(x.get(k) for k in ('paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom')),
        '간격': x.get('itemSpacing'),
        '변수': bv,
        '보임': x.get('visible', True),
    }
    if x['type'] == 'TEXT':
        st = x.get('style', {})
        d['글자'] = f"{st.get('fontFamily')} {st.get('fontWeight')} {st.get('fontSize')} style={x.get('styles', {}).get('text', '-')}"
    return d


def flat(x, path=''):
    p = f"{path}/{x['name']}"
    rows = {p: desc(x)}
    seen = {}
    for c in x.get('children', []):
        seen[c['name']] = seen.get(c['name'], 0) + 1
        rows.update(flat(c, p + (f"#{seen[c['name']]}" if seen[c['name']] > 1 else '')))
    return rows


def short(path, root):
    return path[len(root) + 1:] or '(자신)'


def comp_diff(a, b):
    fa, fb = flat(a), flat(b)
    root = f"/{b['name']}"
    lines = []
    for k, v in fb.items():
        if k not in fa:
            lines.append(f"    + {short(k, root)}")
        elif fa[k] != v:
            ch = '; '.join(f"{kk} {fa[k].get(kk)} → {v.get(kk)}" for kk in v if fa[k].get(kk) != v.get(kk))
            lines.append(f"    ~ {short(k, root)}: {ch}")
    for k in fa:
        if k not in fb:
            lines.append(f"    - {short(k, root)}")
    return lines


def cmd_diff(old_v, new_v, out):
    o, n = fetch(old_v, out), fetch(new_v, out)
    oi, ni = index(o), index(n)
    print(f"# 디자인 시스템 비교 — {old_v} ({o.get('lastModified')}) → {new_v or '지금'} ({n.get('lastModified')}, {n.get('version')})\n")

    print('## 페이지')
    op = {p['id']: p for p in o['document']['children']}
    for p in n['document']['children']:
        q = op.get(p['id'])
        if not q:
            print(f"+ {p['name'].strip()} `{p['id']}`")
        elif q['name'] != p['name'] or len(q.get('children', [])) != len(p.get('children', [])):
            print(f"~ {q['name'].strip()} → {p['name'].strip()} `{p['id']}` 최상위 노드 {len(q.get('children', []))} → {len(p.get('children', []))}")
    for i, q in op.items():
        if i not in {p['id'] for p in n['document']['children']}:
            print(f"- {q['name'].strip()} `{i}`")

    def comps(idx):
        sets = {i: x for i, x in idx.items() if x['type'] == 'COMPONENT_SET' and x['_pg'] not in SKIP_PAGES}
        solo = {i: x for i, x in idx.items() if x['type'] == 'COMPONENT' and x['_pg'] not in SKIP_PAGES
                and idx.get(x['_par'], {}).get('type') != 'COMPONENT_SET'}
        return sets, solo

    os_, oc = comps(oi)
    ns, nc = comps(ni)

    print('\n## 컴포넌트 세트')
    for i in sorted(ns.keys() - os_.keys(), key=lambda i: (ns[i]['_pg'], ns[i]['name'])):
        x = ns[i]
        props = {k: v.get('variantOptions') for k, v in (x.get('componentPropertyDefinitions') or {}).items()}
        print(f"+ [{x['_pg']}] {x['name']} `{i}` 변형 {len(x['children'])} {props}")
    for i in os_.keys() - ns.keys():
        print(f"- [{os_[i]['_pg']}] {os_[i]['name']} `{i}`")
    for i in sorted(os_.keys() & ns.keys(), key=lambda i: (ns[i]['_pg'], ns[i]['name'])):
        a, b = os_[i], ns[i]
        head = []
        if a['name'] != b['name']:
            head.append(f"이름 {a['name']} → {b['name']}")
        if a['_pg'] != b['_pg']:
            head.append(f"페이지 {a['_pg']} → {b['_pg']}")
        av = {c['name']: c for c in a['children']}
        bv = {c['name']: c for c in b['children']}
        if av.keys() - bv.keys():
            head.append(f"변형 삭제 {sorted(av.keys() - bv.keys())}")
        if bv.keys() - av.keys():
            head.append(f"변형 추가 {sorted(bv.keys() - av.keys())}")
        body = []
        for name in sorted(av.keys() & bv.keys()):
            ls = comp_diff(av[name], bv[name])
            if ls:
                body.append(f"  * {name}")
                body += ls[:8] + (['    …'] if len(ls) > 8 else [])
        if head or body:
            print(f"~ [{b['_pg']}] {b['name']} `{i}` 변형 {len(b['children'])}" + (': ' + ' ; '.join(head) if head else ''))
            for line in body:
                print(line)

    print('\n## 단독 컴포넌트')
    for i in sorted(nc.keys() - oc.keys()):
        b = nc[i]['absoluteBoundingBox']
        print(f"+ [{nc[i]['_pg']}] {nc[i]['name']} `{i}` {b['width']:g}×{b['height']:g}")
    for i in oc.keys() - nc.keys():
        print(f"- [{oc[i]['_pg']}] {oc[i]['name']} `{i}`")
    for i in sorted(oc.keys() & nc.keys()):
        ls = comp_diff(oc[i], nc[i])
        if ls:
            print(f"~ [{nc[i]['_pg']}] {nc[i]['name']} `{i}`")
            for line in ls[:10]:
                print(line)

    print('\n## 스타일(이름)')
    so, sn = o.get('styles', {}), n.get('styles', {})
    for k in sn.keys() - so.keys():
        print(f"+ {sn[k]['styleType']} {sn[k]['name']} `{k}`")
    for k in so.keys() - sn.keys():
        print(f"- {so[k]['styleType']} {so[k]['name']} `{k}`")
    for k in so.keys() & sn.keys():
        if so[k]['name'] != sn[k]['name']:
            print(f"~ {so[k]['name']} → {sn[k]['name']}")


def main(argv):
    out = argv[argv.index('--out') + 1] if '--out' in argv else '.'
    args = [a for i, a in enumerate(argv) if a != '--out' and (i == 0 or argv[i - 1] != '--out')]
    if args[:1] == ['versions']:
        limit = int(args[args.index('--limit') + 1]) if '--limit' in args else 30
        d = json.loads(get(f'/files/{DS}/versions?page_size={min(limit, 50)}'))
        print('| 버전 | 시각 | 작성자 | 라벨 |\n|---|---|---|---|')
        for v in d['versions'][:limit]:
            print(f"| `{v['id']}` | {v['created_at']} | {v.get('user', {}).get('handle')} | {v.get('label') or ''} |")
    elif args[:1] == ['diff'] and len(args) >= 2:
        cmd_diff(args[1], args[2] if len(args) > 2 else None, out)
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main(sys.argv[1:])
