// 생성 파일 — 직접 고치지 말 것. node src/ui/icons/generate.mjs 로 다시 만든다.
// 원본: src/ui/icons/svg/*.svg (Figma 디자인 시스템 ic 세트 36:178 + 낱개 ic/ticket/filled/24 183:1130)

export type IconName =
  | 'add'
  | 'archiving'
  | 'backward'
  | 'blank'
  | 'calendar'
  | 'chat'
  | 'check'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'circle-check'
  | 'circle-reject'
  | 'circle-request'
  | 'clock'
  | 'close'
  | 'dashboard'
  | 'detail'
  | 'diagonal'
  | 'edit'
  | 'etc'
  | 'favorite'
  | 'forward'
  | 'gift'
  | 'gift-cancel'
  | 'gift-return'
  | 'home'
  | 'image-add'
  | 'info'
  | 'information'
  | 'instagram'
  | 'lightbulb'
  | 'location'
  | 'log-out'
  | 'mail'
  | 'menu'
  | 'minus'
  | 'more'
  | 'music'
  | 'notification'
  | 'notification-on'
  | 'open-chat'
  | 'order-detail'
  | 'panel-open'
  | 'people'
  | 'phone'
  | 'pop-out'
  | 'preview'
  | 'qr'
  | 'search'
  | 'settings'
  | 'ticket'
  | 'ticket-alert'
  | 'up'
  | 'up-down'
  | 'update';

export type IconVariant = 'outline' | 'filled';
export type IconSize = 12 | 16 | 20 | 24;

/** Figma에 있는 (name, variant, size) 조합만 허용한다. variant 기본값 'outline', size 기본값 24. */
export type IconSpec =
  | { name: 'add'; variant?: 'outline'; size: 12 }
  | { name: 'add'; variant?: 'outline'; size?: 24 }
  | { name: 'archiving'; variant?: 'outline'; size?: 24 }
  | { name: 'backward'; variant?: 'outline'; size?: 24 }
  | { name: 'blank'; variant?: 'outline'; size?: 24 }
  | { name: 'calendar'; variant?: 'outline'; size: 16 }
  | { name: 'calendar'; variant?: 'outline'; size?: 24 }
  | { name: 'chat'; variant?: 'outline'; size?: 24 }
  | { name: 'check'; variant?: 'outline'; size: 12 }
  | { name: 'check'; variant?: 'outline'; size?: 24 }
  | { name: 'chevron-down'; variant?: 'outline'; size: 12 }
  | { name: 'chevron-down'; variant?: 'outline'; size?: 24 }
  | { name: 'chevron-left'; variant?: 'outline'; size: 12 }
  | { name: 'chevron-left'; variant?: 'outline'; size: 16 }
  | { name: 'chevron-left'; variant?: 'outline'; size: 20 }
  | { name: 'chevron-left'; variant?: 'outline'; size?: 24 }
  | { name: 'chevron-right'; variant?: 'outline'; size: 12 }
  | { name: 'chevron-right'; variant?: 'outline'; size: 16 }
  | { name: 'chevron-right'; variant?: 'outline'; size: 20 }
  | { name: 'chevron-right'; variant?: 'outline'; size?: 24 }
  | { name: 'chevron-up'; variant?: 'outline'; size: 12 }
  | { name: 'chevron-up'; variant?: 'outline'; size?: 24 }
  | { name: 'circle-check'; variant: 'filled'; size?: 24 }
  | { name: 'circle-check'; variant?: 'outline'; size?: 24 }
  | { name: 'circle-reject'; variant: 'filled'; size?: 24 }
  | { name: 'circle-reject'; variant?: 'outline'; size?: 24 }
  | { name: 'circle-request'; variant: 'filled'; size?: 24 }
  | { name: 'circle-request'; variant?: 'outline'; size?: 24 }
  | { name: 'clock'; variant: 'filled'; size?: 24 }
  | { name: 'clock'; variant?: 'outline'; size: 16 }
  | { name: 'clock'; variant?: 'outline'; size?: 24 }
  | { name: 'close'; variant?: 'outline'; size: 12 }
  | { name: 'close'; variant?: 'outline'; size?: 24 }
  | { name: 'dashboard'; variant: 'filled'; size?: 24 }
  | { name: 'dashboard'; variant?: 'outline'; size?: 24 }
  | { name: 'detail'; variant?: 'outline'; size?: 24 }
  | { name: 'diagonal'; variant?: 'outline'; size?: 24 }
  | { name: 'edit'; variant?: 'outline'; size?: 24 }
  | { name: 'etc'; variant: 'filled'; size?: 24 }
  | { name: 'favorite'; variant?: 'outline'; size?: 24 }
  | { name: 'forward'; variant?: 'outline'; size?: 24 }
  | { name: 'gift-cancel'; variant?: 'outline'; size?: 24 }
  | { name: 'gift'; variant?: 'outline'; size?: 24 }
  | { name: 'gift-return'; variant?: 'outline'; size?: 24 }
  | { name: 'home'; variant: 'filled'; size?: 24 }
  | { name: 'home'; variant?: 'outline'; size?: 24 }
  | { name: 'image-add'; variant?: 'outline'; size?: 24 }
  | { name: 'info'; variant?: 'outline'; size?: 24 }
  | { name: 'information'; variant?: 'outline'; size: 16 }
  | { name: 'instagram'; variant?: 'outline'; size?: 24 }
  | { name: 'lightbulb'; variant?: 'outline'; size?: 24 }
  | { name: 'location'; variant?: 'outline'; size?: 24 }
  | { name: 'log-out'; variant?: 'outline'; size?: 24 }
  | { name: 'mail'; variant: 'filled'; size?: 24 }
  | { name: 'menu'; variant?: 'outline'; size?: 24 }
  | { name: 'minus'; variant?: 'outline'; size: 12 }
  | { name: 'more'; variant?: 'outline'; size: 12 }
  | { name: 'more'; variant?: 'outline'; size: 16 }
  | { name: 'more'; variant?: 'outline'; size: 20 }
  | { name: 'more'; variant?: 'outline'; size?: 24 }
  | { name: 'music'; variant?: 'outline'; size?: 24 }
  | { name: 'notification-on'; variant?: 'outline'; size?: 24 }
  | { name: 'notification'; variant?: 'outline'; size?: 24 }
  | { name: 'open-chat'; variant: 'filled'; size?: 24 }
  | { name: 'order-detail'; variant?: 'outline'; size?: 24 }
  | { name: 'panel-open'; variant?: 'outline'; size?: 24 }
  | { name: 'people'; variant?: 'outline'; size?: 24 }
  | { name: 'phone'; variant: 'filled'; size?: 24 }
  | { name: 'pop-out'; variant?: 'outline'; size?: 24 }
  | { name: 'preview'; variant?: 'outline'; size?: 24 }
  | { name: 'qr'; variant?: 'outline'; size?: 24 }
  | { name: 'search'; variant?: 'outline'; size?: 24 }
  | { name: 'settings'; variant: 'filled'; size?: 24 }
  | { name: 'settings'; variant?: 'outline'; size?: 24 }
  | { name: 'ticket-alert'; variant?: 'outline'; size?: 24 }
  | { name: 'ticket'; variant: 'filled'; size?: 24 }
  | { name: 'ticket'; variant?: 'outline'; size?: 24 }
  | { name: 'up-down'; variant?: 'outline'; size?: 24 }
  | { name: 'up'; variant?: 'outline'; size?: 24 }
  | { name: 'update'; variant?: 'outline'; size?: 24 };

export type IconEntry = {
  viewBox: string;
  body: string;
  /** 배지가 틀 밖으로 나가는 아이콘(ticket-alert) */
  overflow?: true;
  /** 강조색을 원래 색으로 유지하는 다색 아이콘 */
  multicolor?: true;
};

export const icons: Record<string, IconEntry> = {
  'add/outline/12': {
    viewBox: '0 0 12 12',
    body: '<path d="M2.5 6H9.5M6 2.5V9.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'add/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M5 12H19M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'archiving/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/><path d="M11 3V11L14 8L17 11V3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'backward/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M12 5L5 12L12 19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'blank/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M9.34484 3.2501C9.34484 2.75304 9.74778 2.3501 10.2448 2.3501H13.7422C14.2393 2.3501 14.6422 2.75304 14.6422 3.2501C14.6422 3.74715 14.2393 4.1501 13.7422 4.1501H10.2448C9.74778 4.1501 9.34484 3.74715 9.34484 3.2501Z" fill="currentColor"/><path d="M7.64703 3.23579C7.66208 3.73262 7.27153 4.14758 6.7747 4.16264C5.9179 4.1886 5.56098 4.25649 5.30673 4.38724L5.29764 4.39192C4.91176 4.58486 4.59075 4.90691 4.37296 5.32224C4.24303 5.57633 4.17551 5.93372 4.14963 6.78772C4.13458 7.28455 3.71961 7.6751 3.22279 7.66005C2.72596 7.64499 2.33541 7.23003 2.35046 6.7332C2.37631 5.88016 2.43796 5.149 2.77352 4.49652L2.77626 4.49119C3.15355 3.76941 3.73717 3.16088 4.48817 2.78414C5.13947 2.45067 5.86917 2.38925 6.72018 2.36346C7.21701 2.34841 7.63197 2.73896 7.64703 3.23579Z" fill="currentColor"/><path d="M16.34 3.23579C16.3551 2.73896 16.7701 2.34841 17.2669 2.36346C18.1179 2.38925 18.8476 2.45067 19.4989 2.78413C20.2499 3.16088 20.8335 3.76942 21.2108 4.4912L21.2136 4.49651C21.5491 5.14899 21.6108 5.88016 21.6366 6.7332C21.6517 7.23003 21.2611 7.64499 20.7643 7.66005C20.2675 7.6751 19.8525 7.28455 19.8374 6.78772C19.8116 5.93372 19.744 5.57634 19.6141 5.32225C19.3963 4.90691 19.0753 4.58481 18.6895 4.39187L18.6803 4.3873C18.4261 4.25654 18.0692 4.1886 17.2124 4.16264C16.7155 4.14758 16.325 3.73262 16.34 3.23579Z" fill="currentColor"/><path d="M3.25005 9.34492C3.7471 9.34492 4.15004 9.74786 4.15004 10.2449V13.7423C4.15004 14.2394 3.7471 14.6423 3.25005 14.6423C2.75299 14.6423 2.35005 14.2394 2.35005 13.7423V10.2449C2.35005 9.74786 2.75299 9.34492 3.25005 9.34492Z" fill="currentColor"/><path d="M20.737 9.34492C21.2341 9.34492 21.637 9.74786 21.637 10.2449V13.7423C21.637 14.2394 21.2341 14.6423 20.737 14.6423C20.24 14.6423 19.837 14.2394 19.837 13.7423V10.2449C19.837 9.74786 20.24 9.34492 20.737 9.34492Z" fill="currentColor"/><path d="M20.7772 16.3401C21.2741 16.3552 21.6646 16.7702 21.6496 17.267C21.6237 18.12 21.5621 18.8512 21.2265 19.5037L21.2237 19.509C20.8464 20.2308 20.2628 20.8394 19.5117 21.2161C18.8604 21.5495 18.1308 21.6109 17.2798 21.6367C16.783 21.6518 16.3681 21.2612 16.353 20.7644C16.3379 20.2676 16.7285 19.8526 17.2253 19.8376C18.0821 19.8116 18.439 19.7437 18.6933 19.6129L18.7024 19.6083C19.0883 19.4153 19.4093 19.0933 19.6271 18.6779C19.757 18.4239 19.8245 18.0665 19.8504 17.2125C19.8654 16.7156 20.2804 16.3251 20.7772 16.3401Z" fill="currentColor"/><path d="M3.22279 16.3531C3.71961 16.338 4.13458 16.7286 4.14963 17.2254C4.17559 18.0822 4.24348 18.4392 4.37424 18.6934L4.37891 18.7025C4.57185 19.0884 4.8939 19.4094 5.30923 19.6272C5.56333 19.7571 5.92071 19.8246 6.7747 19.8505C7.27153 19.8656 7.66208 20.2805 7.64703 20.7774C7.63197 21.2742 7.21701 21.6647 6.72018 21.6497C5.86714 21.6238 5.13599 21.5622 4.48351 21.2266L4.47819 21.2239C3.75642 20.8466 3.14788 20.263 2.77113 19.512C2.43767 18.8607 2.37625 18.131 2.35046 17.2799C2.33541 16.7831 2.72596 16.3682 3.22279 16.3531Z" fill="currentColor"/><path d="M9.34484 20.7371C9.34484 20.2401 9.74778 19.8371 10.2448 19.8371H13.7422C14.2393 19.8371 14.6422 20.2401 14.6422 20.7371C14.6422 21.2342 14.2393 21.6371 13.7422 21.6371H10.2448C9.74778 21.6371 9.34484 21.2342 9.34484 20.7371Z" fill="currentColor"/>',
  },
  'calendar/outline/16': {
    viewBox: '0 0 16 16',
    body: '<path d="M5.33333 1.33334V4M10.6667 1.33334V4M2 6.66667H14M3.33333 2.66667H12.6667C13.403 2.66667 14 3.26362 14 4V13.3333C14 14.0697 13.403 14.6667 12.6667 14.6667H3.33333C2.59695 14.6667 2 14.0697 2 13.3333V4C2 3.26362 2.59695 2.66667 3.33333 2.66667Z" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'calendar/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'chat/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M18 3.5625C19.6569 3.5625 21 4.88267 21 6.51118V15.3572C21 16.9857 19.6569 18.3059 18 18.3059H7.37153C6.91572 18.3059 6.47358 18.4616 6.11835 18.7472L4.22461 20.2697C3.73491 20.6631 3 20.3206 3 19.6989V6.51118C3 4.88267 4.34315 3.5625 6 3.5625H18Z" fill="currentColor" stroke="currentColor" stroke-width="1.5"/><path d="M8.625 10.875C8.625 11.4963 8.12132 12 7.5 12C6.87868 12 6.375 11.4963 6.375 10.875C6.375 10.2537 6.87868 9.75 7.5 9.75C8.12132 9.75 8.625 10.2537 8.625 10.875Z" fill="white"/><path d="M13.125 10.875C13.125 11.4963 12.6213 12 12 12C11.3787 12 10.875 11.4963 10.875 10.875C10.875 10.2537 11.3787 9.75 12 9.75C12.6213 9.75 13.125 10.2537 13.125 10.875Z" fill="white"/><path d="M17.7757 10.875C17.7757 11.4963 17.272 12 16.6507 12C16.0294 12 15.5257 11.4963 15.5257 10.875C15.5257 10.2537 16.0294 9.75 16.6507 9.75C17.272 9.75 17.7757 10.2537 17.7757 10.875Z" fill="white"/>',
    multicolor: true,
  },
  'check/outline/12': {
    viewBox: '0 0 12 12',
    body: '<path d="M10 3L4.5 8.5L2 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'check/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'chevron-down/outline/12': {
    viewBox: '0 0 12 12',
    body: '<path d="M9 4.5L6 7.5L3 4.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'chevron-down/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M18 9L12 15L6 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'chevron-left/outline/12': {
    viewBox: '0 0 12 12',
    body: '<path d="M7.5 9L4.5 6L7.5 3" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'chevron-left/outline/16': {
    viewBox: '0 0 16 16',
    body: '<path d="M10 12L6 8L10 4" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'chevron-left/outline/20': {
    viewBox: '0 0 20 20',
    body: '<path d="M12.5 15L7.5 10L12.5 5" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'chevron-left/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'chevron-right/outline/12': {
    viewBox: '0 0 12 12',
    body: '<path d="M4.5 3L7.5 6L4.5 9" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'chevron-right/outline/16': {
    viewBox: '0 0 16 16',
    body: '<path d="M6 4L10 8L6 12" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'chevron-right/outline/20': {
    viewBox: '0 0 20 20',
    body: '<path d="M7.5 5L12.5 10L7.5 15" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'chevron-right/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'chevron-up/outline/12': {
    viewBox: '0 0 12 12',
    body: '<path d="M3 7.5L6 4.5L9 7.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'chevron-up/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M6 15L12 9L18 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'circle-check/filled/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1ZM15.707 9.29297C15.3165 8.90245 14.6835 8.90245 14.293 9.29297L11 12.5859L9.70703 11.293C9.31651 10.9024 8.68349 10.9025 8.29297 11.293C7.90244 11.6835 7.90244 12.3165 8.29297 12.707L10.293 14.707C10.6835 15.0975 11.3165 15.0976 11.707 14.707L15.707 10.707C16.0975 10.3165 16.0975 9.68349 15.707 9.29297Z" fill="currentColor"/>',
  },
  'circle-check/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M9 12L11 14L15 10M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'circle-reject/filled/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1ZM15.5352 8.46484C15.1446 8.07432 14.5116 8.07432 14.1211 8.46484L12 10.5859L9.87891 8.46484C9.48838 8.07432 8.85537 8.07432 8.46484 8.46484C8.07432 8.85537 8.07432 9.48838 8.46484 9.87891L10.5859 12L8.46484 14.1211C8.07432 14.5116 8.07432 15.1446 8.46484 15.5352C8.85537 15.9257 9.48838 15.9257 9.87891 15.5352L12 13.4141L14.1211 15.5352C14.5116 15.9257 15.1446 15.9257 15.5352 15.5352C15.9257 15.1446 15.9257 14.5116 15.5352 14.1211L13.4141 12L15.5352 9.87891C15.9257 9.48838 15.9257 8.85537 15.5352 8.46484Z" fill="currentColor"/>',
  },
  'circle-reject/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.17157 14.8284L12 12L14.8284 9.17157M9.17157 9.17157L14.8284 14.8284" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'circle-request/filled/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1ZM12 15C11.4477 15 11 15.4477 11 16C11 16.5523 11.4477 17 12 17H12.0098C12.5621 17 13.0098 16.5523 13.0098 16C13.0098 15.4477 12.5621 15 12.0098 15H12ZM12 7C11.4477 7 11 7.44772 11 8V12C11 12.5523 11.4477 13 12 13C12.5523 13 13 12.5523 13 12V8C13 7.44772 12.5523 7 12 7Z" fill="currentColor"/>',
  },
  'circle-request/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'clock/filled/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1ZM12 5C11.4477 5 11 5.44772 11 6V12C11 12.3788 11.214 12.7251 11.5527 12.8945L15.5527 14.8945C16.0467 15.1415 16.6475 14.9412 16.8945 14.4473C17.1415 13.9533 16.9412 13.3525 16.4473 13.1055L13 11.3818V6C13 5.44772 12.5523 5 12 5Z" fill="currentColor"/>',
  },
  'clock/outline/16': {
    viewBox: '0 0 16 16',
    body: '<g clip-path="url(#clock-outline-16-clip0_721_1983)"><path d="M8.00001 4V8L10.6667 9.33333M14.6667 8C14.6667 11.6819 11.6819 14.6667 8.00001 14.6667C4.31811 14.6667 1.33334 11.6819 1.33334 8C1.33334 4.3181 4.31811 1.33333 8.00001 1.33333C11.6819 1.33333 14.6667 4.3181 14.6667 8Z" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/></g><defs><clipPath id="clock-outline-16-clip0_721_1983"><rect width="16" height="16" fill="currentColor"/></clipPath></defs>',
  },
  'clock/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M12 6V12L16 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'close/outline/12': {
    viewBox: '0 0 12 12',
    body: '<path d="M3.52513 3.52514L8.47487 8.47488M8.47487 3.52514L3.52513 8.47488" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'close/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M7.05025 7.05026L16.9497 16.9498M16.9497 7.05026L7.05025 16.9498" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'dashboard/filled/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M9 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H9C9.55228 21 10 20.5523 10 20V4C10 3.44772 9.55228 3 9 3Z" fill="currentColor"/><path d="M20 3H15C14.4477 3 14 3.44772 14 4V9C14 9.55228 14.4477 10 15 10H20C20.5523 10 21 9.55228 21 9V4C21 3.44772 20.5523 3 20 3Z" fill="currentColor"/><path d="M20 14H15C14.4477 14 14 14.4477 14 15V20C14 20.5523 14.4477 21 15 21H20C20.5523 21 21 20.5523 21 20V15C21 14.4477 20.5523 14 20 14Z" fill="currentColor"/><path d="M9 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H9C9.55228 21 10 20.5523 10 20V4C10 3.44772 9.55228 3 9 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 3H15C14.4477 3 14 3.44772 14 4V9C14 9.55228 14.4477 10 15 10H20C20.5523 10 21 9.55228 21 9V4C21 3.44772 20.5523 3 20 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 14H15C14.4477 14 14 14.4477 14 15V20C14 20.5523 14.4477 21 15 21H20C20.5523 21 21 20.5523 21 20V15C21 14.4477 20.5523 14 20 14Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'dashboard/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M9 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H9C9.55228 21 10 20.5523 10 20V4C10 3.44772 9.55228 3 9 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 3H15C14.4477 3 14 3.44772 14 4V9C14 9.55228 14.4477 10 15 10H20C20.5523 10 21 9.55228 21 9V4C21 3.44772 20.5523 3 20 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 14H15C14.4477 14 14 14.4477 14 15V20C14 20.5523 14.4477 21 15 21H20C20.5523 21 21 20.5523 21 20V15C21 14.4477 20.5523 14 20 14Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'detail/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V7L15 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V8M14 2V6C14 6.53043 14.2107 7.03914 14.5858 7.41421C14.9609 7.78929 15.4696 8 16 8H20M2 13V12H8V13M5 12V18M4 18H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'diagonal/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M7 7H17V17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/><path d="M7 17L17 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'edit/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M18.1911 10.7149C18.4476 10.4584 18.651 10.1539 18.7898 9.81884C18.9286 9.48375 19 9.1246 19 8.7619C19 8.39921 18.9286 8.04006 18.7898 7.70497C18.651 7.36988 18.4476 7.06541 18.1911 6.80894C17.9347 6.55248 17.6303 6.34904 17.2952 6.21024C16.9601 6.07144 16.601 6 16.2384 6C15.8757 6 15.5166 6.07144 15.1815 6.21024C14.8465 6.34904 14.542 6.55248 14.2856 6.80894L7.77205 13.3258C7.46295 13.6347 7.23669 14.0166 7.11419 14.4362L6.026 18.1678C5.99337 18.2797 5.99142 18.3983 6.02034 18.5112C6.04926 18.6241 6.108 18.7272 6.1904 18.8096C6.2728 18.892 6.37584 18.9507 6.48872 18.9797C6.60161 19.0086 6.7202 19.0066 6.83207 18.974L10.5634 17.8857C10.9829 17.7632 11.3647 17.5369 11.6737 17.2278L18.1911 10.7149Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/><path d="M13.5 8.5L16.5 11.5" stroke-width="2" stroke="currentColor"/>',
  },
  'etc/filled/24': {
    viewBox: '0 0 24 24',
    body: '<circle cx="5.5" cy="12.5" r="1.5" fill="currentColor"/><circle cx="11.5" cy="12.5" r="1.5" fill="currentColor"/><circle cx="17.5" cy="12.5" r="1.5" fill="currentColor"/>',
  },
  'favorite/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M19 14C20.49 12.54 22 10.79 22 8.5C22 7.04131 21.4205 5.64236 20.3891 4.61091C19.3576 3.57946 17.9587 3 16.5 3C14.74 3 13.5 3.5 12 5C10.5 3.5 9.26 3 7.5 3C6.04131 3 4.64236 3.57946 3.61091 4.61091C2.57946 5.64236 2 7.04131 2 8.5C2 10.8 3.5 12.55 5 14L12 21L19 14Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'forward/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M12 5L19 12L12 19M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'gift-cancel/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M20.134 11.5V19.5C20.134 20.6046 19.2385 21.5 18.134 21.5H6.13397C5.02941 21.5 4.13397 20.6046 4.13397 19.5V11.5M20.134 11.5H4.13397M20.134 11.5C21.2385 11.5 22.134 10.6046 22.134 9.5V8.5C22.134 7.39543 21.2385 6.5 20.134 6.5H4.13397C3.02941 6.5 2.13397 7.39543 2.13397 8.5V9.5C2.13397 10.6046 3.02941 11.5 4.13397 11.5M12.134 21.5V6.5M12.134 6.5H16.634C17.297 6.5 17.9329 6.28929 18.4017 5.91421C18.8706 5.53914 19.134 5.03043 19.134 4.5C19.134 3.96957 18.8706 3.46086 18.4017 3.08579C17.9329 2.71071 17.297 2.5 16.634 2.5C13.134 2.5 12.134 6.5 12.134 6.5ZM12.134 6.5H7.63397C6.97093 6.5 6.33505 6.28929 5.86621 5.91421C5.39737 5.53914 5.13397 5.03043 5.13397 4.5C5.13397 3.96957 5.39737 3.46086 5.86621 3.08579C6.33505 2.71071 6.97093 2.5 7.63397 2.5C11.134 2.5 12.134 6.5 12.134 6.5Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/><path d="M22 3.41421L3.41421 22" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="#E84230"/>',
    multicolor: true,
  },
  'gift/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M20.134 11.5V19.5C20.134 20.6046 19.2385 21.5 18.134 21.5H6.13397C5.02941 21.5 4.13397 20.6046 4.13397 19.5V11.5M20.134 11.5H4.13397M20.134 11.5C21.2385 11.5 22.134 10.6046 22.134 9.5V8.5C22.134 7.39543 21.2385 6.5 20.134 6.5H4.13397C3.02941 6.5 2.13397 7.39543 2.13397 8.5V9.5C2.13397 10.6046 3.02941 11.5 4.13397 11.5M12.134 21.5V6.5M12.134 6.5H16.634C17.297 6.5 17.9329 6.28929 18.4017 5.91421C18.8706 5.53914 19.134 5.03043 19.134 4.5C19.134 3.96957 18.8706 3.46086 18.4017 3.08579C17.9329 2.71071 17.297 2.5 16.634 2.5C13.134 2.5 12.134 6.5 12.134 6.5ZM12.134 6.5H7.63397C6.97093 6.5 6.33505 6.28929 5.86621 5.91421C5.39737 5.53914 5.13397 5.03043 5.13397 4.5C5.13397 3.96957 5.39737 3.46086 5.86621 3.08579C6.33505 2.71071 6.97093 2.5 7.63397 2.5C11.134 2.5 12.134 6.5 12.134 6.5Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'gift-return/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M4.13398 11.5V19.5C4.13398 20.6046 5.02941 21.5 6.13398 21.5H12.134V6.5M4.13398 11.5H20.134C21.2386 11.5 22.134 10.6046 22.134 9.5V8.5C22.134 7.39543 21.2385 6.5 20.134 6.5H4.13398C3.02941 6.5 2.13398 7.39543 2.13398 8.5V9.5C2.13398 10.6046 3.02941 11.5 4.13398 11.5ZM12.134 6.5H16.634C17.297 6.5 17.9329 6.28929 18.4017 5.91421C18.8706 5.53914 19.134 5.03043 19.134 4.5C19.134 3.96957 18.8706 3.46086 18.4017 3.08579C17.9329 2.71071 17.297 2.5 16.634 2.5C13.134 2.5 12.134 6.5 12.134 6.5ZM12.134 6.5H7.63398C6.97094 6.5 6.33505 6.28929 5.86621 5.91421C5.39737 5.53914 5.13398 5.03043 5.13398 4.5C5.13398 3.96957 5.39737 3.46086 5.86621 3.08579C6.33505 2.71071 6.97094 2.5 7.63398 2.5C11.134 2.5 12.134 6.5 12.134 6.5Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/><path d="M16.5 21.5H19.5C21.1569 21.5 22.5 20.1569 22.5 18.5C22.5 16.8431 21.1569 15.5 19.5 15.5H16.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="#E84230"/><path d="M15.2036 15.0573C14.9321 15.29 14.9321 15.71 15.2036 15.9426L17.8059 18.1732C18.1841 18.4973 18.7683 18.2286 18.7683 17.7305V13.2695C18.7683 12.7714 18.1841 12.5027 17.8059 12.8268L15.2036 15.0573Z" fill="#E84230"/>',
    multicolor: true,
  },
  'home/filled/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M11.3861 2.47751L4.15818 8.09919C3.42742 8.66756 3 9.54148 3 10.4673V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H7.5C8.32843 22 9 21.3284 9 20.5V13.5C9 12.6716 9.67157 12 10.5 12H13.5C14.3284 12 15 12.6716 15 13.5V20.5C15 21.3284 15.6716 22 16.5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V10.4673C21 9.54148 20.5726 8.66756 19.8418 8.0992L12.6139 2.47751C12.2528 2.19665 11.7472 2.19665 11.3861 2.47751Z" fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'home/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M11.3861 2.47751L4.15818 8.09919C3.42742 8.66756 3 9.54148 3 10.4673V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H7.5C8.32843 22 9 21.3284 9 20.5V13.5C9 12.6716 9.67157 12 10.5 12H13.5C14.3284 12 15 12.6716 15 13.5V20.5C15 21.3284 15.6716 22 16.5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V10.4673C21 9.54148 20.5726 8.66756 19.8418 8.0992L12.6139 2.47751C12.2528 2.19665 11.7472 2.19665 11.3861 2.47751Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'image-add/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H12M16 5H22M19 2V8M21 14.9999L17.914 11.9139C17.5389 11.539 17.0303 11.3284 16.5 11.3284C15.9697 11.3284 15.4611 11.539 15.086 11.9139L6 20.9999M11 9C11 10.1046 10.1046 11 9 11C7.89543 11 7 10.1046 7 9C7 7.89543 7.89543 7 9 7C10.1046 7 11 7.89543 11 9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'info/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M12.5 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V7L15 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V13.5M14 2V6C14 6.53043 14.2107 7.03914 14.5858 7.41421C14.9609 7.78929 15.4696 8 16 8H20M13.378 15.6259C13.5752 15.4287 13.7317 15.1945 13.8384 14.9368C13.9452 14.6791 14.0001 14.4029 14.0001 14.1239C14.0001 13.845 13.9452 13.5687 13.8384 13.311C13.7317 13.0533 13.5752 12.8191 13.378 12.6219C13.1807 12.4247 12.9466 12.2682 12.6889 12.1614C12.4311 12.0547 12.1549 11.9998 11.876 11.9998C11.597 11.9998 11.3208 12.0547 11.0631 12.1614C10.8054 12.2682 10.5712 12.4247 10.374 12.6219L5.36398 17.6339C5.12622 17.8715 4.9522 18.1652 4.85798 18.4879L4.02098 21.3579C3.99588 21.444 3.99437 21.5352 4.01662 21.622C4.03887 21.7088 4.08404 21.7881 4.14742 21.8515C4.2108 21.9148 4.29006 21.96 4.37689 21.9823C4.46372 22.0045 4.55493 22.003 4.64098 21.9779L7.51098 21.1409C7.83364 21.0467 8.12735 20.8727 8.36498 20.6349L13.378 15.6259Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'information/outline/16': {
    viewBox: '0 0 16 16',
    body: '<g clip-path="url(#information-outline-16-clip0_513_2067)"><path d="M7.99999 10.6667L7.99999 8M7.99999 5.33333L7.99332 5.33333M1.33332 8C1.33332 4.3181 4.31809 1.33333 7.99999 1.33333C11.6819 1.33333 14.6667 4.3181 14.6667 8C14.6667 11.6819 11.6819 14.6667 7.99999 14.6667C4.31809 14.6667 1.33332 11.6819 1.33332 8Z" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/></g><defs><clipPath id="information-outline-16-clip0_513_2067"><rect width="16" height="16" fill="currentColor"/></clipPath></defs>',
  },
  'instagram/outline/24': {
    viewBox: '0 0 24 24',
    body: '<rect x="3" y="3" width="18" height="18" rx="5" stroke="url(#instagram-outline-24-paint0_linear_473_1613)" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="url(#instagram-outline-24-paint1_linear_473_1613)" stroke-width="2"/><circle cx="17" cy="7" r="1" fill="#EE07AE"/><defs><linearGradient id="instagram-outline-24-paint0_linear_473_1613" x1="-4.99965" y1="5.39791" x2="-1.50035" y2="25.1021" gradientUnits="userSpaceOnUse"><stop offset="0.00296149" stop-color="#9309E1"/><stop offset="0.216523" stop-color="#EA02C9"/><stop offset="0.558577" stop-color="#F6114F"/><stop offset="1" stop-color="#FDB203"/></linearGradient><linearGradient id="instagram-outline-24-paint1_linear_473_1613" x1="12" y1="7" x2="12" y2="15.5" gradientUnits="userSpaceOnUse"><stop stop-color="#CD0BAB"/><stop offset="0.524038" stop-color="#F40D59"/><stop offset="1" stop-color="#FB6A1B"/></linearGradient></defs>',
    multicolor: true,
  },
  'lightbulb/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M11.1338 15.5876C10.9399 15.6511 10.0685 15.5876 9.8091 15.5915C9.57625 15.5951 9.24911 15.6373 9.02379 15.6035C8.65225 15.5478 8.59078 15.0848 8.40913 14.768C8.21283 14.4257 8.06146 14.1803 7.77667 13.8913C7.48002 13.5902 7.1145 13.3224 6.79766 13.0492C6.46838 12.7597 6.17656 12.4306 5.92889 12.0696C5.54869 11.5223 5.26228 10.6577 5.18486 9.99563C5.07487 9.05504 5.12694 8.01354 5.47041 7.12367C5.63315 6.70203 5.7451 6.36697 5.96742 5.97123C7.83693 2.64355 12.741 2.07942 15.7947 4.02656C16.7113 4.60939 17.4968 5.37408 18.1021 6.27272C18.8842 7.41233 19.1772 8.8146 18.9162 10.1694C18.6569 11.5383 18.0308 12.5326 16.9278 13.3962C16.5805 13.6681 16.1725 13.9325 15.8764 14.2588C15.7142 14.4375 15.5298 14.6567 15.4022 14.8637C15.3036 15.0237 15.2177 15.3216 15.0629 15.4394C15.0092 15.4803 14.8262 15.5428 14.7579 15.5473C14.3312 15.5751 12.9594 15.6692 12.608 15.5925C12.4817 15.6253 11.4338 15.6196 11.2331 15.6217C11.2076 15.622 11.1586 15.6002 11.1338 15.5876Z" fill="#FBE27E"/><path d="M12.0858 11.4181C12.3258 11.0552 12.4831 10.6467 12.8159 10.3555C13.1834 10.0339 13.5803 9.8639 14.0753 9.89822C14.4588 9.92481 14.8343 10.0872 15.0964 10.3718C16.0973 11.6046 15.0875 13.1671 13.6679 13.3935C13.367 13.4415 13.087 13.4146 12.786 13.4254C12.7456 13.4269 12.7111 13.4334 12.6812 13.4591C12.6263 13.6148 12.6209 14.1526 12.6195 14.3419C12.6176 14.5998 12.5191 15.3821 12.608 15.5925C12.4817 15.6253 11.4338 15.6196 11.2331 15.6217C11.2076 15.622 11.1586 15.6002 11.1337 15.5876C11.1405 15.5761 11.147 15.5645 11.1533 15.5528C11.2577 15.3562 11.1953 14.4443 11.2088 14.1852C11.2189 13.992 11.2135 13.75 11.222 13.5522C11.2237 13.5115 11.209 13.3802 11.155 13.3732C10.7169 13.3027 10.2926 13.2992 9.88611 13.0918C9.40181 12.8446 8.94364 12.4517 8.77469 11.9168C8.6202 11.4277 8.58411 11.0115 8.80614 10.5419C9.22418 9.65758 10.1927 9.3833 11.0466 9.83682C11.6975 10.181 11.8788 10.7606 12.0858 11.4181Z" fill="#FABA0A"/><path d="M10.326 10.6068C10.5253 10.6366 10.7105 10.7679 10.8348 10.9221C10.9203 11.0302 10.9897 11.1499 11.0408 11.2776C11.1477 11.5452 11.2214 12.0168 11.2313 12.3087C11.2381 12.5107 10.7919 12.378 10.6584 12.3533C10.3868 12.2938 10.0814 12.1292 9.88227 11.9297C9.5937 11.6406 9.52227 11.0449 9.83816 10.7463C9.97686 10.6152 10.1457 10.6008 10.326 10.6068Z" fill="#FBE27E"/><path d="M14.07 10.8781C14.6244 10.9802 14.6824 11.6284 14.3718 12.0072C14.1158 12.3194 13.7662 12.4489 13.3758 12.5001C13.2597 12.506 12.9578 12.5172 12.8635 12.4734C12.742 12.329 13.0419 11.684 13.1221 11.535C13.3295 11.1491 13.5903 10.8477 14.07 10.8781Z" fill="#FBE27E"/><path d="M10.9895 4.29279C11.1699 4.30655 11.3146 4.33502 11.4455 4.4716C11.6126 4.6459 11.7446 4.84914 11.7426 5.09662C11.7377 5.47365 11.473 5.798 11.1028 5.8805C10.9063 5.92577 10.674 5.91123 10.4769 5.96226C10.0396 6.07553 9.55726 6.32581 9.25799 6.66456C8.92951 7.03638 8.81922 7.30399 8.26497 7.29722C7.7808 7.22786 7.47836 6.96212 7.4869 6.46221C7.49402 6.04539 7.92783 5.6085 8.22143 5.34178C8.80919 4.80784 9.59884 4.44309 10.3889 4.34599C10.6262 4.31776 10.7363 4.28399 10.9895 4.29279Z" fill="#FEF6E2"/><path d="M7.26553 7.5726C7.71485 7.56992 8.08244 7.92754 8.08927 8.37401C8.0961 8.82049 7.73963 9.18904 7.29043 9.19993C6.83535 9.21097 6.45854 8.85108 6.45161 8.39876C6.4447 7.94644 6.81032 7.57532 7.26553 7.5726Z" fill="#FEF6E2"/><path d="M15.0938 15.8353C15.1116 15.837 15.1294 15.8394 15.1471 15.8425C15.7103 15.9422 16.0081 16.4227 15.9087 16.9734C15.8618 17.2472 15.7067 17.4911 15.4779 17.6507C15.3091 17.7671 15.1499 17.8293 14.9455 17.8508C14.2481 17.9312 13.5311 17.8793 12.8315 17.9149C12.0852 17.9529 11.337 17.9776 10.5896 17.9827C10.08 17.9862 9.33003 18.0935 8.84492 18.0051C8.31918 17.8381 8.07388 17.4953 8.04672 16.9457C8.03818 16.7068 8.19502 16.4265 8.35897 16.2579C8.72025 15.8863 9.43226 15.9672 9.90461 15.9825L10.8793 16.0058C11.32 16.0157 11.7419 15.9977 12.1763 15.9971C12.9651 15.9961 13.7284 16.0571 14.5105 15.9125C14.6949 15.8784 14.907 15.8379 15.0938 15.8353Z" fill="#5B8FF5"/><path d="M14.3502 18.2658C14.5845 18.2822 14.7457 18.4464 14.8013 18.6695C14.8854 19.0069 14.8193 19.2571 14.6433 19.5496C14.512 19.7939 14.2032 20.093 13.9062 20.1386C13.0495 20.2704 12.1031 20.2609 11.2386 20.2691C10.681 20.2745 10.1102 20.3892 9.61919 20.0958C9.21136 19.7762 8.97728 19.4106 9.10711 18.8607C9.14326 18.7076 9.27237 18.5311 9.42174 18.466C9.59983 18.3885 9.87179 18.4345 10.0665 18.4136C10.6064 18.3781 11.1471 18.3809 11.6877 18.3724C11.9991 18.3677 12.3034 18.348 12.6137 18.3275C13.2082 18.3197 13.7563 18.3031 14.3502 18.2658Z" fill="#5B8FF5"/>',
    multicolor: true,
  },
  'location/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M20 10C20 16.4183 12 21.5 12 21.5C12 21.5 4 16.4183 4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/><path d="M15.25 9.75C15.25 11.5449 13.7949 13 12 13C10.2051 13 8.75 11.5449 8.75 9.75C8.75 7.95507 10.2051 6.5 12 6.5C13.7949 6.5 15.25 7.95507 15.25 9.75Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'log-out/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/><path d="M16 17L21 12L16 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/><path d="M21 12H9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'mail/filled/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M21 18C21 18.5523 20.5523 19 20 19H4C3.44772 19 3 18.5523 3 18V8.81934L10.4336 13.5439L10.4395 13.5479C10.9072 13.8408 11.4481 13.9961 12 13.9961C12.5519 13.9961 13.0928 13.8408 13.5605 13.5479L13.5664 13.5439L21 8.81934V18ZM20 5C20.5523 5 21 5.44771 21 6V6.4502L12.499 11.8525C12.3494 11.9463 12.1765 11.9961 12 11.9961C11.8235 11.9961 11.6496 11.9463 11.5 11.8525L3 6.4502V6C3 5.44772 3.44772 5 4 5H20Z" fill="currentColor"/>',
  },
  'menu/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M3 6H21M3 12H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'minus/outline/12': {
    viewBox: '0 0 12 12',
    body: '<path d="M2.5 6H9.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'more/outline/12': {
    viewBox: '0 0 12 12',
    body: '<path d="M6 6.5C6.27614 6.5 6.5 6.27614 6.5 6C6.5 5.72386 6.27614 5.5 6 5.5C5.72386 5.5 5.5 5.72386 5.5 6C5.5 6.27614 5.72386 6.5 6 6.5Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 3C6.27614 3 6.5 2.77614 6.5 2.5C6.5 2.22386 6.27614 2 6 2C5.72386 2 5.5 2.22386 5.5 2.5C5.5 2.77614 5.72386 3 6 3Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10C6.27614 10 6.5 9.77614 6.5 9.5C6.5 9.22386 6.27614 9 6 9C5.72386 9 5.5 9.22386 5.5 9.5C5.5 9.77614 5.72386 10 6 10Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'more/outline/16': {
    viewBox: '0 0 16 16',
    body: '<path d="M8.66668 8C8.66668 8.36819 8.3682 8.66667 8.00001 8.66667C7.63182 8.66667 7.33334 8.36819 7.33334 8C7.33334 7.63181 7.63182 7.33333 8.00001 7.33333C8.3682 7.33333 8.66668 7.63181 8.66668 8ZM8.66668 3.33333C8.66668 3.70152 8.3682 4 8.00001 4C7.63182 4 7.33334 3.70152 7.33334 3.33333C7.33334 2.96514 7.63182 2.66667 8.00001 2.66667C8.3682 2.66667 8.66668 2.96514 8.66668 3.33333ZM8.66668 12.6667C8.66668 13.0349 8.3682 13.3333 8.00001 13.3333C7.63182 13.3333 7.33334 13.0349 7.33334 12.6667C7.33334 12.2985 7.63182 12 8.00001 12C8.3682 12 8.66668 12.2985 8.66668 12.6667Z" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'more/outline/20': {
    viewBox: '0 0 20 20',
    body: '<path d="M10.8333 10C10.8333 10.4602 10.4602 10.8333 10 10.8333C9.53977 10.8333 9.16667 10.4602 9.16667 10C9.16667 9.53976 9.53977 9.16667 10 9.16667C10.4602 9.16667 10.8333 9.53976 10.8333 10ZM10.8333 4.16667C10.8333 4.6269 10.4602 5 10 5C9.53977 5 9.16667 4.6269 9.16667 4.16667C9.16667 3.70643 9.53977 3.33333 10 3.33333C10.4602 3.33333 10.8333 3.70643 10.8333 4.16667ZM10.8333 15.8333C10.8333 16.2936 10.4602 16.6667 10 16.6667C9.53977 16.6667 9.16667 16.2936 9.16667 15.8333C9.16667 15.3731 9.53977 15 10 15C10.4602 15 10.8333 15.3731 10.8333 15.8333Z" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'more/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'music/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M9 18V5L21 3V16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/><path d="M9 9L21 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/><path d="M9 18C9 19.6569 7.65685 21 6 21C4.34315 21 3 19.6569 3 18C3 16.3431 4.34315 15 6 15C7.65685 15 9 16.3431 9 18Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/><path d="M21 16C21 17.6569 19.6569 19 18 19C16.3431 19 15 17.6569 15 16C15 14.3431 16.3431 13 18 13C19.6569 13 21 14.3431 21 16Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'notification-on/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M6 9C6 7.4087 6.63214 5.88258 7.75736 4.75736C8.88258 3.63214 10.4087 3 12 3C13.5913 3 15.1174 3.63214 16.2426 4.75736C17.3679 5.88258 18 7.4087 18 9C18 13.1262 19.0424 15.5151 19.8983 16.7812C20.1754 17.191 19.8433 18 19.3486 18H4.65139C4.15668 18 3.82465 17.191 4.10171 16.7812C4.9576 15.5151 6 13.1262 6 9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 20.5C11.5 21.5 12.5 21.5 14 20.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="14" y="2" width="8" height="8" rx="4" fill="#E84230"/>',
    multicolor: true,
  },
  'notification/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M6 9C6 7.4087 6.63214 5.88258 7.75736 4.75736C8.88258 3.63214 10.4087 3 12 3C13.5913 3 15.1174 3.63214 16.2426 4.75736C17.3679 5.88258 18 7.4087 18 9C18 13.1262 19.0424 15.5151 19.8983 16.7812C20.1754 17.191 19.8433 18 19.3486 18H4.65139C4.15668 18 3.82465 17.191 4.10171 16.7812C4.9576 15.5151 6 13.1262 6 9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 20.5C11.5 21.5 12.5 21.5 14 20.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  },
  'open-chat/filled/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M9.85278 4.01057C10.0952 3.99792 10.338 3.99663 10.5805 4.00666C12.6967 4.09626 14.7313 4.87129 16.1968 6.44023C17.2989 7.62026 17.7351 9.01111 17.6432 10.6041C17.5402 12.3896 16.6282 13.8397 15.3102 15.0204C13.7364 16.4301 11.5872 17.1125 9.4968 17.1778C8.9314 17.1955 8.34639 17.0794 7.78564 17.0531L7.60395 17.1932C6.98005 17.6769 6.40068 18.2464 5.73403 18.6849C5.42434 18.8887 5.01824 19.1757 4.63005 19.1115C4.38215 19.0705 4.13982 18.7782 4.14956 18.5221C4.19155 17.9938 4.28396 17.4433 4.37139 16.9186C4.43594 16.5313 4.46455 16.0836 4.54963 15.7087C3.13672 14.813 2.10234 13.0323 2.00752 11.3662C1.92495 9.66462 2.52519 8.00049 3.67493 6.74336C5.30288 4.92964 7.4686 4.14245 9.85278 4.01057Z" fill="currentColor"/><path d="M18.9915 9.53273C19.1982 9.66071 19.4593 9.75639 19.6742 9.88046C20.4671 10.3382 21.1044 11.0598 21.5269 11.8644C21.9822 12.7315 22.0891 13.6601 21.9601 14.6201C21.7536 16.1567 20.7854 17.3848 19.5444 18.2492C19.5645 19.0004 19.7941 19.7087 19.8328 20.4471C19.8459 20.6967 19.384 21.0199 19.1927 20.9613C18.5286 20.758 17.3586 19.7517 16.9357 19.2553C16.8849 19.221 16.0945 19.2707 15.9541 19.2713C14.8717 19.2771 13.8018 19.0623 12.8009 18.652C12.5168 18.5354 12.1986 18.3515 11.9222 18.2088C13.5648 17.8877 15.4899 16.8588 16.6732 15.6731C17.7854 14.5587 18.6454 13.113 18.9196 11.5402C19.0178 10.9772 18.9885 10.1214 18.9915 9.53273Z" fill="currentColor"/>',
  },
  'order-detail/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M15 2H9C8.44772 2 8 2.44772 8 3V5C8 5.55228 8.44772 6 9 6H15C15.5523 6 16 5.55228 16 5V3C16 2.44772 15.5523 2 15 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 4H18C18.5304 4 19.0391 4.21071 19.4142 4.58579C19.7893 4.96086 20 5.46957 20 6V20C20 20.5304 19.7893 21.0391 19.4142 21.4142C19.0391 21.7893 18.5304 22 18 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 11H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 16H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 11H8.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 16H8.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'panel-open/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M9 21L9 3M19 21L5 21C3.89543 21 3 20.1046 3 19L3 5C3 3.89543 3.89543 3 5 3L19 3C20.1046 3 21 3.89543 21 5L21 19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'people/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M18 21C18 18.8783 17.1571 16.8434 15.6569 15.3431C14.1566 13.8429 12.1217 13 10 13M10 13C7.87827 13 5.84344 13.8429 4.34315 15.3431C2.84285 16.8434 2 18.8783 2 21M10 13C12.7614 13 15 10.7614 15 8C15 5.23858 12.7614 3 10 3C7.23858 3 5 5.23858 5 8C5 10.7614 7.23858 13 10 13ZM22 20C22 16.63 20 13.5 18 12C18.6575 11.5067 19.1832 10.859 19.5306 10.1142C19.8781 9.3694 20.0366 8.55042 19.9921 7.72975C19.9476 6.90908 19.7015 6.11204 19.2755 5.40915C18.8496 4.70626 18.2569 4.11921 17.55 3.69995" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'phone/filled/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M7.51367 3.00547C8.55699 2.93357 8.90895 3.58049 9.39352 4.34886C10.3564 5.87566 11.7916 7.59503 9.76516 9.01081C9.60054 9.12581 9.24157 9.41126 9.12893 9.5722L9.11613 9.59077C9.76078 11.2781 11.5168 13.2557 12.988 14.273C13.4793 14.6127 13.9065 14.8247 14.3822 15.1359C14.4317 15.0617 14.5347 14.9358 14.5968 14.8688C15.1211 14.2978 15.5554 13.6644 16.4056 13.6232C17.087 13.5901 17.6481 14.0906 18.2133 14.4185C18.9365 14.8381 19.6973 15.2709 20.3527 15.7882C20.6247 16.0029 20.856 16.5042 20.8671 16.8492C20.8984 17.706 20.0787 18.7468 19.5425 19.3427C19.0342 19.9341 18.4507 20.3067 17.6643 20.3869C15.6941 20.5879 13.3818 19.3911 11.7602 18.3833C11.414 18.1598 11.0239 17.9673 10.7016 17.712C9.13291 16.4695 7.72198 15.1884 6.5939 13.5232C5.37701 11.7269 4.37155 10.0449 4.05712 7.85647C3.70666 5.41726 5.00519 4.22342 6.95824 3.15825C7.12362 3.06904 7.32788 3.03 7.51367 3.00547Z" fill="currentColor"/>',
  },
  'pop-out/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M21 13V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H11M21 3L12 12M21 9V3H15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'preview/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M21 17V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V17M21 7V5C21 4.46957 20.7893 3.96086 20.4142 3.58579C20.0391 3.21071 19.5304 3 19 3H5C4.46957 3 3.96086 3.21071 3.58579 3.58579C3.21071 3.96086 3 4.46957 3 5V7M5 12C5 12 7.545 7 12 7C16.454 7 19 12 19 12C19 12 16.454 17 12 17C7.545 17 5 12 5 12ZM12 13C12.2652 13 12.5196 12.8946 12.7071 12.7071C12.8946 12.5196 13 12.2652 13 12C13 11.7348 12.8946 11.4804 12.7071 11.2929C12.5196 11.1054 12.2652 11 12 11C11.7348 11 11.4804 11.1054 11.2929 11.2929C11.1054 11.4804 11 11.7348 11 12C11 12.2652 11.1054 12.5196 11.2929 12.7071C11.4804 12.8946 11.7348 13 12 13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'qr/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M21 16H18C17.4696 16 16.9609 16.2107 16.5858 16.5858C16.2107 16.9609 16 17.4696 16 18V21M21 21V21.01M12 7V10C12 10.5304 11.7893 11.0391 11.4142 11.4142C11.0391 11.7893 10.5304 12 10 12H7M3 12H3.01M12 3H12.01M12 16V16.01M16 12H17M21 12V12.01M12 21V20M4 3H7C7.55228 3 8 3.44772 8 4V7C8 7.55228 7.55228 8 7 8H4C3.44772 8 3 7.55228 3 7V4C3 3.44772 3.44772 3 4 3ZM17 3H20C20.5523 3 21 3.44772 21 4V7C21 7.55228 20.5523 8 20 8H17C16.4477 8 16 7.55228 16 7V4C16 3.44772 16.4477 3 17 3ZM4 16H7C7.55228 16 8 16.4477 8 17V20C8 20.5523 7.55228 21 7 21H4C3.44772 21 3 20.5523 3 20V17C3 16.4477 3.44772 16 4 16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'search/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M11.6667 18.3333C15.3486 18.3333 18.3333 15.3486 18.3333 11.6667C18.3333 7.98477 15.3486 5 11.6667 5C7.98477 5 5 7.98477 5 11.6667C5 15.3486 7.98477 18.3333 11.6667 18.3333Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 20L16.375 16.375" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'settings/filled/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12Z" fill="#8E8D89"/><path d="M12.1708 4H11.8292C11.4175 4 11.0226 4.16857 10.7314 4.46863C10.4403 4.76869 10.2767 5.17565 10.2767 5.6V5.744C10.2764 6.02458 10.2046 6.30015 10.0683 6.54307C9.93206 6.78599 9.73622 6.98771 9.50044 7.128L9.16665 7.328C8.93063 7.46843 8.66291 7.54236 8.39038 7.54236C8.11786 7.54236 7.85014 7.46843 7.61412 7.328L7.49768 7.264C7.14143 7.05221 6.71819 6.99476 6.32087 7.10425C5.92355 7.21374 5.58463 7.48123 5.37849 7.848L5.20771 8.152C5.00221 8.51915 4.94646 8.95533 5.0527 9.3648C5.15894 9.77427 5.41849 10.1236 5.77438 10.336L5.89082 10.416C6.12547 10.5556 6.32058 10.7561 6.45676 10.9975C6.59294 11.2389 6.66545 11.5128 6.66708 11.792V12.2C6.66817 12.4819 6.59695 12.7592 6.46063 13.0036C6.32432 13.2481 6.12774 13.451 5.89082 13.592L5.77438 13.664C5.41849 13.8764 5.15894 14.2257 5.0527 14.6352C4.94646 15.0447 5.00221 15.4809 5.20771 15.848L5.37849 16.152C5.58463 16.5188 5.92355 16.7863 6.32087 16.8958C6.71819 17.0052 7.14143 16.9478 7.49768 16.736L7.61412 16.672C7.85014 16.5316 8.11786 16.4576 8.39038 16.4576C8.66291 16.4576 8.93063 16.5316 9.16665 16.672L9.50044 16.872C9.73622 17.0123 9.93206 17.214 10.0683 17.4569C10.2046 17.6998 10.2764 17.9754 10.2767 18.256V18.4C10.2767 18.8243 10.4403 19.2313 10.7314 19.5314C11.0226 19.8314 11.4175 20 11.8292 20H12.1708C12.5825 20 12.9774 19.8314 13.2686 19.5314C13.5597 19.2313 13.7233 18.8243 13.7233 18.4V18.256C13.7236 17.9754 13.7954 17.6998 13.9317 17.4569C14.0679 17.214 14.2638 17.0123 14.4996 16.872L14.8334 16.672C15.0694 16.5316 15.3371 16.4576 15.6096 16.4576C15.8821 16.4576 16.1499 16.5316 16.3859 16.672L16.5023 16.736C16.8586 16.9478 17.2818 17.0052 17.6791 16.8958C18.0764 16.7863 18.4154 16.5188 18.6215 16.152L18.7923 15.84C18.9978 15.4729 19.0535 15.0367 18.9473 14.6272C18.8411 14.2177 18.5815 13.8684 18.2256 13.656L18.1092 13.592C17.8723 13.451 17.6757 13.2481 17.5394 13.0036C17.4031 12.7592 17.3318 12.4819 17.3329 12.2V11.8C17.3318 11.5181 17.4031 11.2408 17.5394 10.9964C17.6757 10.7519 17.8723 10.549 18.1092 10.408L18.2256 10.336C18.5815 10.1236 18.8411 9.77427 18.9473 9.3648C19.0535 8.95533 18.9978 8.51915 18.7923 8.152L18.6215 7.848C18.4154 7.48123 18.0764 7.21374 17.6791 7.10425C17.2818 6.99476 16.8586 7.05221 16.5023 7.264L16.3859 7.328C16.1499 7.46843 15.8821 7.54236 15.6096 7.54236C15.3371 7.54236 15.0694 7.46843 14.8334 7.328L14.4996 7.128C14.2638 6.98771 14.0679 6.78599 13.9317 6.54307C13.7954 6.30015 13.7236 6.02458 13.7233 5.744V5.6C13.7233 5.17565 13.5597 4.76869 13.2686 4.46863C12.9774 4.16857 12.5825 4 12.1708 4Z" stroke="#F7F7F6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14.4C13.2862 14.4 14.3288 13.3255 14.3288 12C14.3288 10.6745 13.2862 9.6 12 9.6C10.7138 9.6 9.67121 10.6745 9.67121 12C9.67121 13.3255 10.7138 14.4 12 14.4Z" stroke="#F7F7F6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    multicolor: true,
  },
  'settings/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M12.22 2H11.78C11.2496 2 10.7409 2.21071 10.3658 2.58579C9.99072 2.96086 9.78 3.46957 9.78 4V4.18C9.77964 4.53073 9.68706 4.87519 9.51154 5.17884C9.33602 5.48248 9.08374 5.73464 8.78 5.91L8.35 6.16C8.04596 6.33554 7.70108 6.42795 7.35 6.42795C6.99893 6.42795 6.65404 6.33554 6.35 6.16L6.2 6.08C5.74107 5.81526 5.19584 5.74344 4.684 5.88031C4.17217 6.01717 3.73555 6.35154 3.47 6.81L3.25 7.19C2.98526 7.64893 2.91345 8.19416 3.05031 8.706C3.18717 9.21783 3.52154 9.65445 3.98 9.92L4.13 10.02C4.43228 10.1945 4.68362 10.4451 4.85905 10.7468C5.03448 11.0486 5.1279 11.391 5.13 11.74V12.25C5.1314 12.6024 5.03965 12.949 4.86405 13.2545C4.68844 13.5601 4.43521 13.8138 4.13 13.99L3.98 14.08C3.52154 14.3456 3.18717 14.7822 3.05031 15.294C2.91345 15.8058 2.98526 16.3511 3.25 16.81L3.47 17.19C3.73555 17.6485 4.17217 17.9828 4.684 18.1197C5.19584 18.2566 5.74107 18.1847 6.2 17.92L6.35 17.84C6.65404 17.6645 6.99893 17.5721 7.35 17.5721C7.70108 17.5721 8.04596 17.6645 8.35 17.84L8.78 18.09C9.08374 18.2654 9.33602 18.5175 9.51154 18.8212C9.68706 19.1248 9.77964 19.4693 9.78 19.82V20C9.78 20.5304 9.99072 21.0391 10.3658 21.4142C10.7409 21.7893 11.2496 22 11.78 22H12.22C12.7504 22 13.2591 21.7893 13.6342 21.4142C14.0093 21.0391 14.22 20.5304 14.22 20V19.82C14.2204 19.4693 14.3129 19.1248 14.4885 18.8212C14.664 18.5175 14.9163 18.2654 15.22 18.09L15.65 17.84C15.954 17.6645 16.2989 17.5721 16.65 17.5721C17.0011 17.5721 17.346 17.6645 17.65 17.84L17.8 17.92C18.2589 18.1847 18.8042 18.2566 19.316 18.1197C19.8278 17.9828 20.2645 17.6485 20.53 17.19L20.75 16.8C21.0147 16.3411 21.0866 15.7958 20.9497 15.284C20.8128 14.7722 20.4785 14.3356 20.02 14.07L19.87 13.99C19.5648 13.8138 19.3116 13.5601 19.136 13.2545C18.9604 12.949 18.8686 12.6024 18.87 12.25V11.75C18.8686 11.3976 18.9604 11.051 19.136 10.7455C19.3116 10.4399 19.5648 10.1862 19.87 10.01L20.02 9.92C20.4785 9.65445 20.8128 9.21783 20.9497 8.706C21.0866 8.19416 21.0147 7.64893 20.75 7.19L20.53 6.81C20.2645 6.35154 19.8278 6.01717 19.316 5.88031C18.8042 5.74344 18.2589 5.81526 17.8 6.08L17.65 6.16C17.346 6.33554 17.0011 6.42795 16.65 6.42795C16.2989 6.42795 15.954 6.33554 15.65 6.16L15.22 5.91C14.9163 5.73464 14.664 5.48248 14.4885 5.17884C14.3129 4.87519 14.2204 4.53073 14.22 4.18V4C14.22 3.46957 14.0093 2.96086 13.6342 2.58579C13.2591 2.21071 12.7504 2 12.22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'ticket-alert/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M13 5V7M13 17V19M13 11V13M2 9C2.79565 9 3.55871 9.31607 4.12132 9.87868C4.68393 10.4413 5 11.2044 5 12C5 12.7956 4.68393 13.5587 4.12132 14.1213C3.55871 14.6839 2.79565 15 2 15V17C2 17.5304 2.21071 18.0391 2.58579 18.4142C2.96086 18.7893 3.46957 19 4 19H20C20.5304 19 21.0391 18.7893 21.4142 18.4142C21.7893 18.0391 22 17.5304 22 17V15C21.2044 15 20.4413 14.6839 19.8787 14.1213C19.3161 13.5587 19 12.7956 19 12C19 11.2044 19.3161 10.4413 19.8787 9.87868C20.4413 9.31607 21.2044 9 22 9V7C22 6.46957 21.7893 5.96086 21.4142 5.58579C21.0391 5.21071 20.5304 5 20 5H4C3.46957 5 2.96086 5.21071 2.58579 5.58579C2.21071 5.96086 2 6.46957 2 7V9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="20" y="-4" width="8" height="8" rx="4" fill="#E84230"/>',
    overflow: true,
    multicolor: true,
  },
  'ticket/filled/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M20 4C20.7957 4 21.5585 4.3163 22.1211 4.87891C22.6837 5.44151 23 6.20435 23 7V9C23 9.55228 22.5523 10 22 10C21.4696 10 20.961 10.2109 20.5859 10.5859C20.2109 10.961 20 11.4696 20 12C20 12.5304 20.2109 13.039 20.5859 13.4141C20.961 13.7891 21.4696 14 22 14C22.5523 14 23 14.4477 23 15V17C23 17.7956 22.6837 18.5585 22.1211 19.1211C21.5585 19.6837 20.7957 20 20 20H4C3.20435 20 2.44151 19.6837 1.87891 19.1211C1.3163 18.5585 1 17.7956 1 17V15C1 14.4477 1.44772 14 2 14C2.53043 14 3.03899 13.7891 3.41406 13.4141C3.78913 13.039 4 12.5304 4 12C4 11.4696 3.78914 10.961 3.41406 10.5859C3.03899 10.2109 2.53043 10 2 10C1.44772 10 1 9.55228 1 9V7C1 6.20435 1.3163 5.44152 1.87891 4.87891C2.44152 4.3163 3.20435 4 4 4H20ZM13 16C12.4477 16 12 16.4477 12 17V18C12 18.5523 12.4477 19 13 19C13.5523 19 14 18.5523 14 18V17C14 16.4477 13.5523 16 13 16ZM13 10C12.4477 10 12 10.4477 12 11V13C12 13.5523 12.4477 14 13 14C13.5523 14 14 13.5523 14 13V11C14 10.4477 13.5523 10 13 10ZM13 5C12.4477 5 12 5.44772 12 6V7C12 7.55228 12.4477 8 13 8C13.5523 8 14 7.55228 14 7V6C14 5.44772 13.5523 5 13 5Z" fill="currentColor"/>',
  },
  'ticket/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M13 5V7M13 17V19M13 11V13M2 9C2.79565 9 3.55871 9.31607 4.12132 9.87868C4.68393 10.4413 5 11.2044 5 12C5 12.7956 4.68393 13.5587 4.12132 14.1213C3.55871 14.6839 2.79565 15 2 15V17C2 17.5304 2.21071 18.0391 2.58579 18.4142C2.96086 18.7893 3.46957 19 4 19H20C20.5304 19 21.0391 18.7893 21.4142 18.4142C21.7893 18.0391 22 17.5304 22 17V15C21.2044 15 20.4413 14.6839 19.8787 14.1213C19.3161 13.5587 19 12.7956 19 12C19 11.2044 19.3161 10.4413 19.8787 9.87868C20.4413 9.31607 21.2044 9 22 9V7C22 6.46957 21.7893 5.96086 21.4142 5.58579C21.0391 5.21071 20.5304 5 20 5H4C3.46957 5 2.96086 5.21071 2.58579 5.58579C2.21071 5.96086 2 6.46957 2 7V9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'up-down/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M7 15L12 20L17 15M7 9L12 4L17 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  'up/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M19 12L12 5L5 12M12 5L12 19" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
  'update/outline/24': {
    viewBox: '0 0 24 24',
    body: '<path d="M12 2V4M12 20V22M4.93018 4.92993L6.34018 6.33993M17.6602 17.6599L19.0702 19.0699M2 12H4M20 12H22M6.34018 17.6599L4.93018 19.0699M19.0702 4.92993L17.6602 6.33993M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"/>',
  },
};

export const iconList = [
  { name: 'add', variant: 'outline', size: 12 },
  { name: 'add', variant: 'outline', size: 24 },
  { name: 'archiving', variant: 'outline', size: 24 },
  { name: 'backward', variant: 'outline', size: 24 },
  { name: 'blank', variant: 'outline', size: 24 },
  { name: 'calendar', variant: 'outline', size: 16 },
  { name: 'calendar', variant: 'outline', size: 24 },
  { name: 'chat', variant: 'outline', size: 24 },
  { name: 'check', variant: 'outline', size: 12 },
  { name: 'check', variant: 'outline', size: 24 },
  { name: 'chevron-down', variant: 'outline', size: 12 },
  { name: 'chevron-down', variant: 'outline', size: 24 },
  { name: 'chevron-left', variant: 'outline', size: 12 },
  { name: 'chevron-left', variant: 'outline', size: 16 },
  { name: 'chevron-left', variant: 'outline', size: 20 },
  { name: 'chevron-left', variant: 'outline', size: 24 },
  { name: 'chevron-right', variant: 'outline', size: 12 },
  { name: 'chevron-right', variant: 'outline', size: 16 },
  { name: 'chevron-right', variant: 'outline', size: 20 },
  { name: 'chevron-right', variant: 'outline', size: 24 },
  { name: 'chevron-up', variant: 'outline', size: 12 },
  { name: 'chevron-up', variant: 'outline', size: 24 },
  { name: 'circle-check', variant: 'filled', size: 24 },
  { name: 'circle-check', variant: 'outline', size: 24 },
  { name: 'circle-reject', variant: 'filled', size: 24 },
  { name: 'circle-reject', variant: 'outline', size: 24 },
  { name: 'circle-request', variant: 'filled', size: 24 },
  { name: 'circle-request', variant: 'outline', size: 24 },
  { name: 'clock', variant: 'filled', size: 24 },
  { name: 'clock', variant: 'outline', size: 16 },
  { name: 'clock', variant: 'outline', size: 24 },
  { name: 'close', variant: 'outline', size: 12 },
  { name: 'close', variant: 'outline', size: 24 },
  { name: 'dashboard', variant: 'filled', size: 24 },
  { name: 'dashboard', variant: 'outline', size: 24 },
  { name: 'detail', variant: 'outline', size: 24 },
  { name: 'diagonal', variant: 'outline', size: 24 },
  { name: 'edit', variant: 'outline', size: 24 },
  { name: 'etc', variant: 'filled', size: 24 },
  { name: 'favorite', variant: 'outline', size: 24 },
  { name: 'forward', variant: 'outline', size: 24 },
  { name: 'gift-cancel', variant: 'outline', size: 24 },
  { name: 'gift', variant: 'outline', size: 24 },
  { name: 'gift-return', variant: 'outline', size: 24 },
  { name: 'home', variant: 'filled', size: 24 },
  { name: 'home', variant: 'outline', size: 24 },
  { name: 'image-add', variant: 'outline', size: 24 },
  { name: 'info', variant: 'outline', size: 24 },
  { name: 'information', variant: 'outline', size: 16 },
  { name: 'instagram', variant: 'outline', size: 24 },
  { name: 'lightbulb', variant: 'outline', size: 24 },
  { name: 'location', variant: 'outline', size: 24 },
  { name: 'log-out', variant: 'outline', size: 24 },
  { name: 'mail', variant: 'filled', size: 24 },
  { name: 'menu', variant: 'outline', size: 24 },
  { name: 'minus', variant: 'outline', size: 12 },
  { name: 'more', variant: 'outline', size: 12 },
  { name: 'more', variant: 'outline', size: 16 },
  { name: 'more', variant: 'outline', size: 20 },
  { name: 'more', variant: 'outline', size: 24 },
  { name: 'music', variant: 'outline', size: 24 },
  { name: 'notification-on', variant: 'outline', size: 24 },
  { name: 'notification', variant: 'outline', size: 24 },
  { name: 'open-chat', variant: 'filled', size: 24 },
  { name: 'order-detail', variant: 'outline', size: 24 },
  { name: 'panel-open', variant: 'outline', size: 24 },
  { name: 'people', variant: 'outline', size: 24 },
  { name: 'phone', variant: 'filled', size: 24 },
  { name: 'pop-out', variant: 'outline', size: 24 },
  { name: 'preview', variant: 'outline', size: 24 },
  { name: 'qr', variant: 'outline', size: 24 },
  { name: 'search', variant: 'outline', size: 24 },
  { name: 'settings', variant: 'filled', size: 24 },
  { name: 'settings', variant: 'outline', size: 24 },
  { name: 'ticket-alert', variant: 'outline', size: 24 },
  { name: 'ticket', variant: 'filled', size: 24 },
  { name: 'ticket', variant: 'outline', size: 24 },
  { name: 'up-down', variant: 'outline', size: 24 },
  { name: 'up', variant: 'outline', size: 24 },
  { name: 'update', variant: 'outline', size: 24 },
] as const satisfies readonly IconSpec[];
