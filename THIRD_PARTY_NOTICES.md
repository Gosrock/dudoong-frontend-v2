# Third-Party Notices

이 저장소에 포함된 서드파티 저작물과 라이선스 고지.

## 아이콘 (`src/ui/icons/svg/`)

디자인 시스템 `ic` 아이콘 세트의 상당수는 [Lucide](https://lucide.dev)(ISC) 아이콘을 바탕으로 하며,
그중 일부는 Lucide가 가져온 [Feather](https://feathericons.com)(MIT) 아이콘에서 유래한다.
24px outline 37종 중 26종이 Lucide/Feather와 좌표가 같고, 6종은 Lucide를 고친 것이다
(`.claude/docs/design-system.md` 결정 요약 · 아이콘 출처 표).

### Lucide — ISC License

Source: https://github.com/lucide-icons/lucide/blob/main/LICENSE

```
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

### Feather — MIT License

Source: https://github.com/feathericons/feather/blob/main/LICENSE

```
The MIT License (MIT)

Copyright (c) 2013-2023 Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## QR 판독 엔진 (`public/vendor/zxing-wasm/`)

`zxing_reader.wasm`은 [zxing-wasm](https://github.com/Sec-ant/zxing-wasm)(MIT) 배포 파일을 그대로 복사한 것이다(CSP 때문에 CDN 대신 자체 호스팅 — `src/features/hosting/qr/ui/zxing-wasm.ts`). wasm 안의 판독 코드는 [zxing-cpp](https://github.com/zxing-cpp/zxing-cpp)(Apache License 2.0)를 빌드한 것이다.

### zxing-wasm — MIT License

Source: https://github.com/Sec-ant/zxing-wasm/blob/main/LICENSE

```
MIT License

Copyright (c) 2023 Ze-Zheng Wu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### zxing-cpp — Apache License 2.0

Source: https://github.com/zxing-cpp/zxing-cpp/blob/master/LICENSE — 전문은 https://www.apache.org/licenses/LICENSE-2.0
