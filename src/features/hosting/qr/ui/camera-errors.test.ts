import { describe, expect, it } from 'vitest';

import { cameraProblemOf, cameraWaitHint } from './camera-errors';

describe('카메라 안내(이슈 #93 §5)', () => {
  it('켜는 중에는 권한 창 [허용] 안내, 오래 걸리면 다른 방법까지', () => {
    expect(cameraWaitHint(false).description).toContain('[허용]');
    expect(cameraWaitHint(true).description).toContain('[관객이 QR 스캔]');
  });

  it('권한 거부는 다시 켜기, 지원 안 함은 다시 켜기 없음', () => {
    expect(cameraProblemOf('permission-denied')).toMatchObject({
      title: '카메라 권한이 필요해요',
      canRetry: true,
    });
    expect(cameraProblemOf('insecure-context').canRetry).toBe(false);
  });
});
