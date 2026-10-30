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
