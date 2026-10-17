import type { Me } from '../../me/schema';
import { MOCK_IMAGE_ORIGIN } from '../respond';

/** GM-1 로그인한 mock 사용자. 고스락(11)의 마스터 */
export const me: Me = {
  userId: 1,
  name: '두둥이',
  email: 'dudoong@example.com',
  profileImageUrl: null,
  hosts: [
    {
      hostId: 11,
      name: '고스락',
      profileImageUrl: `${MOCK_IMAGE_ORIGIN}/host/11/profile.png`,
      myRole: 'MASTER',
    },
  ],
  hostCount: 1,
};
