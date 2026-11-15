#!/usr/bin/env python3
"""디자이너 공유 페이지 빌드 — screens.json + timeline.json + git log → out/index.html 한 페이지(탭 #screens 화면별 현황 · #timeline 작업기록).

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
kinds = {k: sum(1 for s in data['screens'] if s['kind'] == k) for k in ('gui', 'mix', 'wire', 'none')}
fresh = [s['name'] for s in data['screens'] if s.get('updated') and s['updated'] >= data['freshSince']]
print(f'화면 {len(data["screens"])} · {kinds} · 최근 바뀜 {fresh}')


# ─── 작업기록(timeline) ───────────────────────────────
import subprocess
from datetime import date as _date, timedelta

tl = json.load(open(os.path.join(HERE, 'timeline.json'), encoding='utf-8'))
terrs = []
for k in ('asOf',):
    if not date.match(str(tl.get(k, ''))):
        terrs.append(f'timeline {k} 날짜 형식')
prev = ''
for d in tl['days']:
    for k in ('date', 'title', 'tags', 'points'):
        if not d.get(k):
            terrs.append(f'timeline {d.get("date", "?")}: {k} 비어 있음')
    if not date.match(d['date']) or (d.get('until') and not date.match(d['until'])):
        terrs.append(f'timeline {d["date"]}: 날짜 형식')
    if d['date'] <= prev:
        terrs.append(f'timeline {d["date"]}: 날짜는 오래된 것부터 차례로')
    prev = d.get('until') or d['date']
    for t in d['tags']:
        if t not in tl['tags']:
            terrs.append(f'timeline {d["date"]}: 모르는 tag {t}')
if terrs:
    print('\n'.join(terrs)); sys.exit(1)

root = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True, cwd=HERE).stdout.strip()
log = subprocess.run(['git', 'log', 'main', '--date=format:%Y-%m-%d', '--format=%cd\t%s'],
                     capture_output=True, text=True, cwd=root).stdout.splitlines()
prefix = re.compile(r'^(docs|feat|fix|chore|test|ci|refactor|perf|style)(\([^)]*\))?:\s*')
by_day = {}
for line in log:
    d, subj = line.split('\t', 1)
    if subj.startswith('Merge '):
        continue
    by_day.setdefault(d, []).append(prefix.sub('', subj))
covered = set()
for d in tl['days']:
    start = _date.fromisoformat(d['date'])
    end = _date.fromisoformat(d.get('until') or d['date'])
    items = []
    cur = start
    while cur <= end:
        items += list(reversed(by_day.get(cur.isoformat(), [])))
        covered.add(cur.isoformat())
        cur += timedelta(days=1)
    d['items'] = items
missing = sorted(k for k in by_day if k >= tl['days'][0]['date'] and k not in covered)
if missing:
    print('작업기록에 빠진 날짜(timeline.json에 칸을 더하거나 until로 묶는다):', ', '.join(missing)); sys.exit(1)
tl['workDays'] = sum(1 for k in by_day if k >= tl['days'][0]['date'])
tl['totalItems'] = sum(len(d['items']) for d in tl['days'])
html = html.replace('/*__TIMELINE__*/null', json.dumps(tl, ensure_ascii=False).replace('</', '<\\/'))
open(out, 'w', encoding='utf-8').write(html)
print(f'작업기록 {len(tl["days"])}칸 · 작업한 날 {tl["workDays"]} · 원문 {tl["totalItems"]}개\n{out}  (#screens · #timeline)')
