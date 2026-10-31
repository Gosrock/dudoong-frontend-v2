/**
 * 은행 목록(G10/T-7 `GET /api/v2/banks` — `V2BankResponse{code, name}`). 백엔드 `BankCode` enum(@432cce4, #797·#804) 그대로,
 * 금융결제원 3자리 코드 순. 티켓 입금 계좌(P12)·환불 계좌(P9) 공통. 비로그인 공개(#813).
 */
export type MockBank = { code: string; name: string };

export const banks: MockBank[] = [
  { code: '002', name: 'KDB산업은행' },
  { code: '003', name: 'IBK기업은행' },
  { code: '004', name: 'KB국민은행' },
  { code: '007', name: 'Sh수협은행' },
  { code: '011', name: 'NH농협은행' },
  { code: '012', name: '지역농·축협' },
  { code: '020', name: '우리은행' },
  { code: '023', name: 'SC제일은행' },
  { code: '027', name: '한국씨티은행' },
  { code: '031', name: 'iM뱅크' },
  { code: '032', name: '부산은행' },
  { code: '034', name: '광주은행' },
  { code: '035', name: '제주은행' },
  { code: '037', name: '전북은행' },
  { code: '039', name: '경남은행' },
  { code: '045', name: '새마을금고' },
  { code: '048', name: '신협' },
  { code: '050', name: '저축은행' },
  { code: '064', name: '산림조합' },
  { code: '071', name: '우체국' },
  { code: '081', name: '하나은행' },
  { code: '088', name: '신한은행' },
  { code: '089', name: '케이뱅크' },
  { code: '090', name: '카카오뱅크' },
  { code: '092', name: '토스뱅크' },
];
