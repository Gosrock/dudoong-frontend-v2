import { z } from 'zod';

// NEXT_PUBLIC_* 는 리터럴로 하나씩 참조해야 빌드 때 인라인된다(tech-decisions §12).
const schema = z.object({
  NEXT_PUBLIC_KAKAO_JS_KEY: z
    .string({ error: 'NEXT_PUBLIC_KAKAO_JS_KEY 가 없다(.env.example 참고)' })
    .min(1, 'NEXT_PUBLIC_KAKAO_JS_KEY 가 비어 있다'),
});

export const clientEnv = schema.parse({
  NEXT_PUBLIC_KAKAO_JS_KEY: process.env.NEXT_PUBLIC_KAKAO_JS_KEY,
});
