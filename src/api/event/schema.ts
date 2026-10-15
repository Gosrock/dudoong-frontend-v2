import { z } from 'zod';

import { openEnum } from '../shared/open-enum';

export const TagGroupSchema = z.object({
  category: openEnum('TagCategory', ['EVENT_TYPE', 'GENRE', 'AREA', 'TEAM']),
  tags: z.array(z.object({ tagId: z.number(), name: z.string() })),
});

export const TagGroupsSchema = z.array(TagGroupSchema);
export type TagGroup = z.infer<typeof TagGroupSchema>;
