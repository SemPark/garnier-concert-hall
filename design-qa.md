# Golden Hall — visual QA

Date: 2026-10-30

Reference: https://musikverein.at/en/vermietung/grosser-saal/

Scope: stylized native 3D reconstruction of the hall's proportions and architectural features, retaining the established characters and concert controls. Not a photogrammetric or pixel-identical copy of its sculpture and paintings.

## Compared evidence

- Official Dieter Nagl hall photograph, viewed at its official image URL in the browser.
- `artifacts/golden-hall-overview.png` — rear gallery view, 1440×900.
- `artifacts/golden-hall-stage.png` — orchestra view.
- `artifacts/golden-hall-walking.png` — rear entrance view.
- `artifacts/golden-hall-mobile.png` — 390×844.

## Findings

- P0/P1/P2: none remaining within this reconstruction scope.
- Long rectangular proportions, bilateral galleries, tall arched windows, rear organ, gilded supports, coffered painted ceiling and repeated crystal pendants are present.
- Full-hall and closer-concert views avoid making either architectural appreciation or orchestra viewing depend on a single camera distance.
- Center and side aisles remain accessible through the dense rows. Actual entrance-to-seat movement, sitting and standing passed in the browser.
- Mobile controls remained on screen without horizontal overflow. Audio continued playing with no reported media error.
- Repeated static chairs and building pieces are instanced. Desktop observation was about 43–48fps; this is not a device performance guarantee.
- P3 follow-up: more detailed sculpted relief, individually varied painted panels and curved wooden chair backs. These details are visibly simplified rather than claimed to be original building assets.

Validation: type checks, 18 unit tests, production build and real local-server integration suite passed.

final result: passed

## 2026-10-30 — 전체 좌석과 렌더링 최적화

- 1층 22열 × 16석 = 352석, 양옆 발코니 104석을 합쳐 456석 모두 선택·착석 가능.
- 앞 8석 별도 블록 제거. 모든 1층 열은 동일한 x 좌표와 2.1 간격을 사용.
- 층·열 선택 패널에서 필요한 열만 표시. 의자 자체 클릭용 프록시는 화면에 그리지 않음.
- 1층 전체 접근 경로, 발코니 전체 착석·반환, 색상 인스턴싱과 동적 변환을 테스트.
- 정적 모델을 색상 인스턴스로 합침. 단원 원본 리그는 장면에서 분리해 중복 변환을 제거하고 20Hz로 갱신.
- 기본 픽셀 비율 1, 저사양 0.8, 지속적으로 느릴 때 0.85. 실시간 그림자 맵 제거, 구·원통 분할 축소. 장식 모델은 그대로 유지하되 표면이 조금 각져 보일 수 있음.
- 걷기 시점의 음악 메뉴는 왼쪽 위 38px 버튼으로 접힘. 모바일 좌석 패널이 음악 버튼보다 위에 표시되도록 수정.
- 후면 출입문이 걷기 카메라를 가리는 문제 수정. 발코니는 난간 바깥쪽을 바라보는 대신 무대 중심을 감상하는 카메라 사용.
- 동일한 데스크톱 장면 진단에서 렌더 호출 약 141 → 70, 삼각형 약 224만 → 79만. 기기별 프레임 속도를 보장하는 수치는 아님.
- 타입 검사, 단위 테스트 23개, 로컬 Worker 통합 테스트(좌석 경합·재접속·20개 연결·음원 부분 요청) 통과.

## 2026-10-30 — 앞쪽 착석·실제 2층 보행·거리별 LOD

- 모든 의자의 접근점을 로컬 앞쪽으로 이동. 좌석 앞 0.4 이내 및 같은 높이에서만 착석하며 뒤쪽 요청을 거부한다.
- 후면 양쪽에 48단 계단, 넓어진 양옆 발코니 보행 통로, 후면 연결 통로를 추가. 높이 기반 경로 탐색과 방향키 이동으로 올라가고 내려온다.
- 2층 즉시 이동 제거. 계단을 올라 통로에서 좌석 앞까지 걸어가 앉고, 일어나도 같은 층에 머문다.
- 중간 계단에서 방향 전환, 2층 좌석 104개 접근·착석·반환, 전 좌석 앞쪽 접근, 층을 건너뛰는 요청 거부를 검사한다.
- 원거리 구·원통·튜브·악기 몸통을 단순화하고, 멀리 있는 줄·키·장식 구슬 등 작은 요소는 생략. 가까워지면 원래 지오메트리로 복원하며 근거리 경계에 히스테리시스를 둔다.
- 정적 LOD는 200ms마다 갱신. 단원 동작은 거리별 20/10/4Hz. 로비에서 공연장 셰이더와 지오메트리를 미리 준비한다.
- 동일 1188×927, 픽셀 비율 1, 고정 홀 전경에서 직접 토글 비교: 전체 디테일 790,708 triangles / 76 calls → LOD 199,732 triangles / 63 calls. 약 75% 감소. 이 테스트 PC에서는 양쪽 모두 약 75FPS로 주사율 상한에 도달했으므로 기기별 FPS 상승을 보장하지 않는다.
- 브라우저에서 계단 상승·하강, 2층 착석·일어나기·WASD 이동을 확인. 서버 통합 검사에도 실제 계단과 2층 착석·하강을 추가해 통과.
