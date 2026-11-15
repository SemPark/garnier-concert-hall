# 공연장 개발 규칙

## 프로젝트 구조

- React·TypeScript·Three.js 앱이다. `src/main.tsx`는 UI 진입점, `src/World.ts`는 렌더링·카메라·이동·공간 전환, `src/scene/`과 `src/orchestra/`는 장면과 연주를 담당한다.
- `shared/`는 좌석·충돌·공연 타임라인·통신 규약을 공유한다. `src/navigation/`과 `src/controls/`는 길찾기와 입력, `src/audio/`와 `content/`는 음원 재생과 프로그램을 담당한다.
- `src/network/Presence.ts`는 서버 연결, `LocalConcert.ts`는 단독 감상 상태를 담당한다. Cloudflare Worker 진입점은 `server/worker.ts`이며, SQLite Durable Object인 `server/VenueRoom.ts`가 방과 좌석 상태를 관리한다.

## 작업과 검증

- 파일과 내용은 `rg --files`, `rg`로 먼저 찾는다. 대용량 파일과 로그는 필요한 범위만 읽고, 확인한 파일은 변경되었거나 다시 확인할 필요가 있을 때만 읽는다.
- 요청 범위에서 작업하고 기존 미커밋 변경을 보존한다. 좌석 수는 `shared/venue.ts`의 `SEATS`와 `CAPACITY`를 사용한다. 좌석·이동·통신을 바꿀 때는 공유 규칙과 클라이언트·서버 동작을 함께 확인한다.
- 렌더링 품질은 `src/scene/quality.ts`에서 관리한다. 성능 비교는 같은 장면·시점·해상도·기기 조건에서 수행한다. 여러 관객이 함께 보는 연출은 공유 공연 시계를 사용한다.
- 로컬 실행은 `npm run dev`(Vite 5173, Worker 8787), iPhone 확인은 `npm run dev:iphone`(Vite 5174, Worker 8788)을 사용한다. 상세 개발 기준은 [CODEX.md](./CODEX.md)를 참고한다.
- 코드 변경 후 `npm run check`와 변경 기능의 정상 진입 경로를 확인한다. 테스트는 `node --import tsx --test tests/<파일>.test.ts`로 관련 범위부터 실행한다. 전체 단위 테스트는 `npm test`, 통합 테스트는 로컬 Worker 실행 후 `npm run test:integration`을 사용한다.
- 푸시와 운영 배포는 사용자가 요청한 범위에서 진행한다. 배포 전 대상 브랜치와 Worker를 확인한다.
- 작업을 이어갈 때만 [진행상황.md](./진행상황.md)를 읽고, 작업 종료 시 요청에 따라 최신화한다. 최신 상태를 30줄 내외로 유지하며 날짜별 이력은 누적하지 않는다. 중요한 결정·설정·수치·미해결 문제와 실제 확인한 결과를 남긴다.
