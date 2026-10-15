import { queryOptions } from '@tanstack/react-query';

import { api } from '../http';
import { TagGroupsSchema } from './schema';

/** GE-11 공연 태그 목록(공개). */
export const eventTagsQuery = () =>
  queryOptions({
    queryKey: ['tags'],
    queryFn: ({ signal }) => api.get('tags', TagGroupsSchema, { public: true, signal }),
  });
