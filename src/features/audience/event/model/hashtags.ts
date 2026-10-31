import type { Tag } from '@/api/event/schema';

export type Hashtag = { tagId: number; label: string };

/**
 * 공연 태그 → 해시태그(GUI `29:1017` 제목 아래 칩). 서버 순서(분류 순 → 분류 안 순서)를 지킨다.
 * 해시태그는 띄어쓰기가 없어야 하므로 공백을 지운다(`대학 동아리` → `#대학동아리`). 지운 뒤 같은 이름은 하나만 남긴다.
 */
export function toHashtags(tags: readonly Tag[]): Hashtag[] {
  const seen = new Set<string>();
  const out: Hashtag[] = [];
  for (const tag of tags) {
    const word = tag.name.replace(/\s+/g, '');
    if (word === '' || seen.has(word)) continue;
    seen.add(word);
    out.push({ tagId: tag.tagId, label: `#${word}` });
  }
  return out;
}
