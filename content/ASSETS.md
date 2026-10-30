# 자산 기록

- 건축 모듈·관객·연주자·악기: 이 프로젝트에서 Three.js 기본 기하와 코드로 직접 구성.
- 천장 장식: 로비는 Canvas로 생성한 추상 장식, 황금홀은 독자적으로 그린 단순한 우의화다. 실제 천장화 사진을 앱 텍스처로 사용하지 않았다.
- 테스트 음원: `scripts/make-preview-audio.py`로 합성한 자체 테스트 선율. 실제 공연용 녹음과 구분.
- 글꼴: Google Fonts의 Noto Serif KR를 CSS로 요청하며 시스템 글꼴 대체를 지정. 운영 배포에서는 사용 조건 확인 후 자체 호스팅하거나 시스템 글꼴로 대체 가능.
- 산사의 코드·모델·음원 파일은 앱 자산으로 포함하지 않았다. 공개 클라이언트에서 확인한 조작·접속 설계를 참고했다.

## 현재 공연 음원 — 2026-10-30

- 곡: Wolfgang Amadeus Mozart, The Marriage of Figaro, K. 492 — Overture.
- 출처: [Wikimedia Commons / Musopen](https://commons.wikimedia.org/wiki/File:Mozart,_The_Marriage_of_Figaro_(overture).ogg).
- 원본 파일: https://upload.wikimedia.org/wikipedia/commons/e/e2/Mozart%2C_The_Marriage_of_Figaro_%28overture%29.ogg
- 파일 페이지에 표시된 사용 조건: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). 설정 화면에도 출처·라이선스 링크를 표시한다.
- 브라우저 호환성을 위해 원본 Ogg Vorbis를 FFmpeg/libmp3lame VBR 품질 2로 MP3 변환했다. 자르기·음량 조정은 하지 않았다.
- 재생 파일: `public/audio/mozart-figaro-overture.mp3`, 5,647,004바이트, 239.938292초.
- SHA-256: `b00101426081432d9608f5135fd9d689497f89be9d6963c4d04188d08801d3f5`.
- 이전 자체 합성 테스트 음원은 현재 재생 목록에서 제외했다.

## 황금홀 건축 참고 — 2026-10-30

- [Musikverein 공식 Great Hall 페이지](https://musikverein.at/en/vermietung/grosser-saal/)의 내부 사진과 공식 무대·객석 도면을 참고했다.
- 공식 길이 48.9m, 폭 19.1m, 높이 17.75m의 비율을 참고해 앱 공간은 길이 82 × 폭 32 × 높이 29.7 단위로 구성했다. 앱 좌표를 실제 미터로 표시하지 않는다.
- 파이프오르간, 직선 발코니, 아치형 창, 조각상 기둥, 천장 패널과 샹들리에는 직접 작성한 3D 기하로 구성했다. 공식 사진은 검토용이며 앱에 복사하지 않았다.
- 객석은 장식 좌석과 기존 선택 좌석 8개로 구성한 프로토타입이다. 공식 정원 전체를 구현한 좌석 예약 시스템은 아니다.
