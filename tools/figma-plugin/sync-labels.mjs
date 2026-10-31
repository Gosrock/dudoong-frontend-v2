// 플러그인이 붙이는 라벨을 저장소에 만든다(gh CLI). 기본은 보여 주기만 하고, --apply일 때 만든다.
//   node tools/figma-plugin/sync-labels.mjs [--apply]
import { execFileSync } from 'node:child_process';

import { LABELS, REPO } from './src/core.mjs';

const repo = `${REPO.owner}/${REPO.name}`;
const apply = process.argv.includes('--apply');

for (const label of LABELS) {
  const args = [
    'label',
    'create',
    label.name,
    '--color',
    label.color,
    '--description',
    label.description,
    '--force',
    '-R',
    repo,
  ];
  if (apply) {
    execFileSync('gh', args, { stdio: 'inherit' });
  } else {
    console.log(`gh ${args.map((a) => JSON.stringify(a)).join(' ')}`);
  }
}
if (!apply) console.log('\n--apply로 실행하면 위 라벨을 만든다(같은 이름은 색·설명을 덮어쓴다).');
