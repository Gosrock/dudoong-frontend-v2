#!/usr/bin/env python3
"""Figma 화면 노드를 읽기만 한다(REST). 토큰은 ~/.claude.json의 figma-console MCP env에서 읽고 출력하지 않는다.

  figma_nodes.py ready [gui|wire|fileKey] [--contains <node_id>]
      Dev Mode "Ready for dev"(devStatus.type == READY_FOR_DEV) 노드 목록 — 페이지 · id · 프레임 이름 · 크기.
      --contains: 그 노드가 어느 Ready 프레임 안에 있는지(없으면 근거 아님). 파일 전체를 받는다(GUI 약 20MB, 수십 초).
  figma_nodes.py map <node_id> [gui|wire|fileKey]
      노드 안을 훑어 구현 전 매핑 표의 재료를 낸다.
        DS        — INSTANCE이고 메인 컴포넌트(또는 그 세트)의 key가 디자인 시스템 파일의 공개 컴포넌트에 있다
        외부      — INSTANCE이지만 다른 라이브러리(iOS 키트, lucide 등). DS에 같은 것이 있는지 찾는다
        로컬      — INSTANCE이고 메인 컴포넌트가 이 파일 안에 있다(remote=false). DS 컴포넌트가 아니다
      그리고 인스턴스 밖에서 직접 그린 것 — 채움·테두리가 있는 프레임(상자), 도형(가장 가까운 프레임 단위),
        글자 스타일이 안 걸린 글자.
      인스턴스 안은 들어가지 않는다(그 컴포넌트의 모양이다). 대신 DS 인스턴스가 모양을 덮어썼으면(overrides의
        fills·strokes·cornerRadius·fontSize 등) "DS + override"로 따로 적는다 — 아이콘(ic) 색만 바꾼 것은 뺀다(currentColor).
      wire 파일은 DS를 거의 안 써서 분류가 쓸모없다 — 와이어는 shot만 쓴다.

  figma_nodes.py shot <node_id> <out.png> [gui|wire|ds|fileKey] [--scale 2]
      노드를 PNG로 내려받는다(REST 이미지 내보내기). 시각 목표·QA 캡처 비교용 — 구현 자산으로 쓰지 않는다.
      out은 scratchpad에 둔다(저장소에 커밋하지 않는다).

file: gui = GUI 화면 1Cn4WOu6TDaSajbFIuH6fO(기본), wire = 와이어프레임 FUQb8ldGBp3uYUuXPV5FDC, ds = 0QD9tGSt8ZciDqe7ol2gYH
"""
import collections, json, os, sys, urllib.error, urllib.parse, urllib.request

FILES = {'gui': '1Cn4WOu6TDaSajbFIuH6fO', 'wire': 'FUQb8ldGBp3uYUuXPV5FDC', 'ds': '0QD9tGSt8ZciDqe7ol2gYH'}
DS_FILE = FILES['ds']
VISUAL = {'fills', 'strokes', 'strokeWeight', 'cornerRadius', 'fontSize', 'fontName', 'opacity', 'effects',
          'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing'}
LEAF = {'RECTANGLE', 'ELLIPSE', 'VECTOR', 'LINE', 'POLYGON', 'STAR', 'BOOLEAN_OPERATION', 'TEXT'}


def token():
    cfg = json.load(open(os.path.expanduser('~/.claude.json')))
    t = cfg.get('mcpServers', {}).get('figma-console', {}).get('env', {}).get('FIGMA_ACCESS_TOKEN')
    if not t:
        sys.exit('FIGMA_ACCESS_TOKEN이 ~/.claude.json mcpServers.figma-console.env에 없다')
    return t


def get(path, timeout=600):
    req = urllib.request.Request('https://api.figma.com/v1' + path, headers={'X-Figma-Token': token()})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f'Figma 오류 {e.code}: {e.read().decode(errors="replace")[:300]}')


def paint(ps):
    out = []
    for p in ps or []:
        if p.get('visible', True) is False or 'color' not in p:
            continue
        c = p['color']
        h = '#%02x%02x%02x' % (round(c['r'] * 255), round(c['g'] * 255), round(c['b'] * 255))
        bv = (p.get('boundVariables') or {}).get('color')
        out.append(h + ('(변수)' if bv else '(직접 값)'))
    return ','.join(out)


def ds_keys():
    keys = set()
    for kind in ('components', 'component_sets'):
        keys |= {m['key'] for m in get(f'/files/{DS_FILE}/{kind}')['meta'][kind]}
    return keys


def cmd_ready(key, contains=None):
    d = get(f'/files/{key}')
    print(f"# {d['name']} lastModified {d['lastModified']} version {d['version']}")
    rows = []

    found = []

    def walk(n, page, ready):
        ds = n.get('devStatus')
        if ds:
            bb = n.get('absoluteBoundingBox') or {}
            rows.append((page, n['id'], n['name'], ds.get('type'), int(bb.get('width', 0)), int(bb.get('height', 0))))
            if ds.get('type') == 'READY_FOR_DEV':
                ready = (n['id'], n['name'])
        if contains and n['id'] == contains:
            found.append((n['name'], page, ready))
        for c in n.get('children', []):
            walk(c, page, ready)

    for p in d['document']['children']:
        walk(p, p['name'], None)
    if contains:
        if not found:
            sys.exit(f'노드 {contains}가 파일에 없다 — 지워졌거나 id가 바뀌었다')
        name, page, ready = found[0]
        print(f'`{contains}` {name} (페이지 {page}) → ' + (f'Ready 프레임 `{ready[0]}` {ready[1]} 안 — 근거다' if ready else 'Ready 프레임 밖 — GUI 근거가 아니다'))
        return
    print('| 페이지 | 노드 | 프레임 이름 | devStatus | 크기 |\n|---|---|---|---|---|')
    for page, nid, name, st, w, h in rows:
        print(f'| {page} | `{nid}` | {name} | {st} | {w}×{h} |')
    print(f'\n{sum(1 for r in rows if r[3] == "READY_FOR_DEV")}개 READY_FOR_DEV (devStatus 있는 노드 {len(rows)}개)')


def cmd_map(node_id, key):
    d = get(f'/files/{key}/nodes?ids={urllib.parse.quote(node_id)}')
    entry = d['nodes'].get(node_id)
    if not entry:
        sys.exit(f'노드 {node_id}가 없다 — 지워졌거나 id가 바뀌었다. 프레임 이름으로 다시 찾는다')
    root, comps, sets = entry['document'], entry.get('components', {}), entry.get('componentSets', {})
    dsk = ds_keys()
    ds = root.get('devStatus', {}).get('type')
    print(f"# {root['name']} `{node_id}` {root['type']} devStatus={ds or '없음'}")
    if ds != 'READY_FOR_DEV':
        print('(이 노드 자체에는 Ready for dev가 없다 — 조상 프레임이 Ready인지 `ready`로 확인)')

    inst = collections.OrderedDict()  # (분류, 컴포넌트) -> [노드, ...]
    overridden = []  # DS 인스턴스인데 모양을 덮어쓴 것
    boxes = []  # 채움·테두리가 있는 프레임(인스턴스 아님) — 직접 그린 상자
    shapes = collections.OrderedDict()  # 가장 가까운 프레임 -> 도형 Counter
    texts = [0, []]  # 글자 스타일이 걸린 수, 안 걸린 글자 노드

    def painted(n):
        vis = lambda ps: any(p.get('visible', True) and p.get('opacity', 1) > 0 for p in ps or [])
        return vis(n.get('fills')) or vis(n.get('strokes'))

    def walk(n, frame):
        if n.get('visible') is False:
            return
        t = n['type']
        label = f"{n['name']} `{n['id']}`"
        if t == 'INSTANCE':
            c = comps.get(n.get('componentId'), {})
            s = sets.get(c.get('componentSetId'), {})
            name = s.get('name') or c.get('name') or '?'
            if c.get('key') in dsk or s.get('key') in dsk:
                kind = 'DS'
            elif c.get('remote'):
                kind = '외부'
            else:
                kind = '로컬'
            variant = c.get('name') if s else ''
            inst.setdefault((kind, name), []).append(label + (f' ({variant})' if variant else ''))
            if kind == 'DS':
                fields = set()
                for o in n.get('overrides', []):
                    fields |= set(o.get('overriddenFields', [])) & VISUAL
                if name == 'ic':
                    fields -= {'fills', 'strokes'}
                if fields:
                    overridden.append(f"{label} {name}" + (f' ({variant})' if variant else '') + f" — {', '.join(sorted(fields))}")
            return
        if t == 'TEXT':
            if n.get('styles', {}).get('text'):
                texts[0] += 1
            else:
                texts[1].append(f"{label} \"{n.get('characters', '')[:20]}\"")
            return
        if t in LEAF:
            shapes.setdefault(frame, collections.Counter())[t] += 1
            return
        if t in ('FRAME', 'GROUP', 'COMPONENT') and painted(n):
            bb = n.get('absoluteBoundingBox') or {}
            boxes.append(f"{label} {int(bb.get('width', 0))}×{int(bb.get('height', 0))}"
                         + (f" r{n['cornerRadius']:g}" if n.get('cornerRadius') else '')
                         + (f" 채움 {paint(n.get('fills'))}" if paint(n.get('fills')) else '')
                         + (f" 테두리 {paint(n.get('strokes'))}" if paint(n.get('strokes')) else ''))
        here = label if t in ('FRAME', 'GROUP', 'SECTION', 'COMPONENT') else frame
        for c in n.get('children', []):
            walk(c, here)

    for c in root.get('children', []):
        walk(c, f"{root['name']} `{node_id}`")

    print('\n## 인스턴스\n| 분류 | 컴포넌트 | 수 | 노드(앞 3개) |\n|---|---|---|---|')
    for (kind, name), nodes in sorted(inst.items(), key=lambda kv: ('DS', '외부', '로컬').index(kv[0][0])):
        print(f"| {kind} | {name} | {len(nodes)} | {' · '.join(nodes[:3])} |")
    print('\n## DS + override(인스턴스가 모양을 덮어씀 — 변형으로 되는지 본다)')
    for o in overridden:
        print(f'- {o}')
    print('\n## 직접 그린 상자(채움·테두리가 있는 프레임, 인스턴스 아님)')
    for b in boxes:
        print(f'- {b}')
    print('\n## 직접 그린 도형\n| 프레임 | 도형 |\n|---|---|')
    for frame, cnt in shapes.items():
        print(f"| {frame} | {', '.join(f'{k} {v}' for k, v in cnt.most_common())} |")
    print(f'\n## 글자 — 글자 스타일 걸림 {texts[0]}, 안 걸림 {len(texts[1])}')
    for t in texts[1][:30]:
        print(f'- {t}')
    n_ds = sum(len(v) for (k, _), v in inst.items() if k == 'DS')
    n_all = sum(len(v) for v in inst.values())
    print(f'\nDS 인스턴스 {n_ds}/{n_all}(override {len(overridden)}) · 직접 그린 상자 {len(boxes)} · 도형 묶음 {len(shapes)} · 스타일 없는 글자 {len(texts[1])}')


def cmd_shot(node_id, out, key, scale):
    r = get(f'/images/{key}?ids={urllib.parse.quote(node_id)}&format=png&scale={scale}')
    url = (r.get('images') or {}).get(node_id)
    if not url:
        sys.exit(f'이미지가 없다: {r.get("err") or node_id}')
    with urllib.request.urlopen(url, timeout=180) as resp, open(out, 'wb') as f:
        f.write(resp.read())
    print(out)


def main(argv):
    if not argv:
        sys.exit(__doc__)
    if argv[0] == 'ready':
        contains = argv[argv.index('--contains') + 1] if '--contains' in argv else None
        rest = [a for a in argv[1:] if a not in ('--contains', contains)]
        cmd_ready(FILES.get(rest[0], rest[0]) if rest else FILES['gui'], contains)
    elif argv[0] == 'map' and len(argv) >= 2:
        cmd_map(argv[1], FILES.get(argv[2], argv[2]) if len(argv) > 2 else FILES['gui'])
    elif argv[0] == 'shot' and len(argv) >= 3:
        rest = argv[3:]
        scale = rest[rest.index('--scale') + 1] if '--scale' in rest else '2'
        files = [a for a in rest if a not in ('--scale', scale)]
        cmd_shot(argv[1], argv[2], FILES.get(files[0], files[0]) if files else FILES['gui'], scale)
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main(sys.argv[1:])
