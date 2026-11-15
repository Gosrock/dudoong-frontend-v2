#!/usr/bin/env python3
"""디자이너 공유 페이지 빌드 — screens.json을 template.html에 넣어 out/index.html을 만든다.

  python3 .claude/skills/designer-report/build.py          # 빌드 + 검사
검사: 화면 kind 값 · 필수 칸 · 같은 이름 중복 · asOf/freshSince 날짜 형식. 실패하면 0이 아닌 코드로 끝난다.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.path.join(HERE, 'screens.json'), encoding='utf-8'))
errs = []
date = re.compile(r'^\d{4}-\d{2}-\d{2}$')
for k in ('asOf', 'freshSince'):
    if not date.match(str(data.get(k, ''))):
        errs.append(f'{k} 날짜 형식(YYYY-MM-DD)이 아니다: {data.get(k)!r}')
names = set()
for s in data['screens']:
    for k in ('group', 'name', 'where', 'kind'):
        if not s.get(k):
            errs.append(f'{s.get("name", "?")}: {k} 비어 있음')
    if s.get('group') not in ('audience', 'hosting'):
        errs.append(f'{s["name"]}: group은 audience | hosting')
    if s.get('kind') not in ('gui', 'mix', 'wire', 'none'):
        errs.append(f'{s["name"]}: kind는 gui | mix | wire | none')
    if s.get('path') and not s['path'].startswith('/'):
        errs.append(f'{s["name"]}: path는 /로 시작')
    if s.get('updated') and not date.match(s['updated']):
        errs.append(f'{s["name"]}: updated 날짜 형식')
    if s['name'] in names:
        errs.append(f'{s["name"]}: 이름 중복')
    names.add(s['name'])
if errs:
    print('\n'.join(errs)); sys.exit(1)

tpl = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
payload = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
html = tpl.replace('/*__DATA__*/null', payload)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
out = os.path.join(HERE, 'out', 'index.html')
open(out, 'w', encoding='utf-8').write(html)
kinds = {k: sum(1 for s in data['screens'] if s['kind'] == k) for k in ('gui', 'mix', 'wire', 'none')}
fresh = [s['name'] for s in data['screens'] if s.get('updated') and s['updated'] >= data['freshSince']]
print(f'{out}\n화면 {len(data["screens"])} · {kinds} · 최근 바뀜 {fresh}')
