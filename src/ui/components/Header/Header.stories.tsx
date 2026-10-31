import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Icon } from '../../icons/Icon';
import { Flex } from '../../primitives/Flex';
import { colors } from '../../theme/colors';
import { Avatar } from '../Avatar/Avatar';
import { Header, HeaderIconButton } from './Header';

const meta = {
  title: 'Components/Header',
  component: Header,
  args: { title: 'Title' },
  decorators: [
    (Story) => (
      <div style={{ width: 390, outline: `1px dashed ${colors.surfaceDefaultBorder}` }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Header>;
export default meta;

type Story = StoryObj<typeof meta>;

const menu = <HeaderIconButton icon={<Icon name="menu" />} aria-label="메뉴" />;
const bell = <HeaderIconButton icon={<Icon name="notification" />} aria-label="알림" />;
const profile = <Avatar size={32} color="grey" alt="내 프로필" />;

/** Figma `Default, leading icon=true, profile=true` */
export const DefaultLeadingProfile: Story = {
  args: {
    leading: menu,
    trailing: (
      <>
        {bell}
        {profile}
      </>
    ),
  },
};

/** Figma `Default, leading icon=false, profile=true` — 공연준비 제목형(GUI 336:13858, 화면 문구 "공연준비") */
export const DefaultProfile: Story = {
  args: {
    title: '공연준비',
    trailing: (
      <>
        {bell}
        {profile}
      </>
    ),
  },
};

/** Figma `only title, leading icon=false` — 가운데 제목 */
export const OnlyTitle: Story = { args: { align: 'center' } };

/** Figma `only title, leading icon=true` */
export const OnlyTitleLeading: Story = { args: { leading: menu } };

/** Figma `no title` — 슬롯만 */
export const NoTitle: Story = { args: { title: undefined, leading: menu, trailing: bell } };

/** Figma `Title+Backward` — 가운데 제목 + 뒤로가기 */
export const TitleBackward: Story = {
  args: { title: '주문 상세', align: 'center', onBack: fn() },
  play: async ({ canvasElement, args }) => {
    const back = within(canvasElement).getByRole('button', { name: '뒤로 가기' });
    back.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onBack).toHaveBeenCalledTimes(1);
    await expect(
      within(canvasElement).getByRole('heading', { level: 1, name: '주문 상세' }),
    ).toBeInTheDocument();
  },
};

/** 뒤로가기를 링크로(`backHref`). 앱에서는 `linkAs={Link}`(next/link)를 넘긴다 */
export const BackHref: Story = {
  args: { title: '공연 상세', align: 'center', backHref: '/' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link', { name: '뒤로 가기' })).toHaveAttribute(
      'href',
      '/',
    );
  },
};

/** Figma `Default, leading icon=true, profile=false` — 공연 전환형(▾ + 공연 이름, 메뉴 없음) */
export const EventSwitcher: Story = {
  args: {
    title: '대시보드',
    leading: menu,
    trailing: bell,
    switcher: { subtitle: '고스락 제 30회 정기공연', onClick: fn() },
  },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '대시보드' }));
    await expect(args.switcher?.onClick).toHaveBeenCalledTimes(1);
  },
};

/** 긴 제목은 1줄 말줄임(통일 — 디자이너 확인 대기) */
export const LongTitle: Story = {
  args: {
    title: '고스락 제 30회 정기공연 — 겨울밤의 락 페스티벌 앵콜 공연',
    align: 'center',
    onBack: fn(),
  },
};

/** GUI 로컬 `basic title` — 관객 로고 헤더(search / no search) */
export const AudienceLogo: Story = {
  render: () => (
    <Flex direction="column" gap={4}>
      <Header
        logo="audience"
        leading={menu}
        trailing={
          <>
            <HeaderIconButton icon={<Icon name="search" />} aria-label="검색" />
            <HeaderIconButton icon={<Icon name="ticket" />} aria-label="내 티켓" />
          </>
        }
      />
      <Header
        logo="audience"
        leading={menu}
        trailing={<HeaderIconButton icon={<Icon name="ticket" />} aria-label="내 티켓" />}
      />
    </Flex>
  ),
};

/** GUI 로컬 `host title` — 호스팅 로고 헤더(벨 없음) */
export const HostLogo: Story = {
  args: { logo: 'host', leading: menu },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('img', { name: '두둥 호스트' }),
    ).toBeInTheDocument();
  },
};
