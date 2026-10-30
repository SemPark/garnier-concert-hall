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

## 2026-10-30 — 공개 주소 모바일 화질·연산 최적화

- Ego Lite로 실제 GitHub Pages에서 수정 전후를 확인했다. Apple M4 Chromium, 모바일 390×844 / DPR 3 / CPU 4배 제한이며 실제 iPhone Safari 검사는 아니다.
- 기본 버퍼 390×844 → 624×1350, antialias 활성화. 원거리 악기 외곽선과 샹들리에 실루엣을 유지했다.
- 고정 몸통·다리·악기의 반복 행렬 업로드 제거. 머리·팔은 30Hz로 갱신하고, 비금속 표면 조명 계산을 단순화했다. 위 기록의 기존 4Hz 단원 갱신과 자동 0.85배 해상도 정책은 대체됐다.
- 설정에서 선명하게 / 균형 / 가볍게 및 현재 FPS·버퍼 해상도 확인 가능. 모바일 가로 넘침 없음.
- 공개 홀 전체·근접·이동 구간 모두 약 75FPS로 테스트 장비 상한에 도달. 아이폰에서의 프레임 저하를 재현하지 못했으므로 해결 완료나 FPS 향상을 주장하지 않는다. 초기 셰이더 준비 시 긴 작업은 남아 있다.
- 타입 검사, 31개 테스트, Pages 빌드 및 배포 통과. 상세 수치와 제약은 docs/mobile-public-performance.md 참조.

## iPhone 13 Pro Chrome 후속 최적화

- 모바일 기본 목표 30FPS / 선명하게 목표 60FPS, 기본 비율 1.25 및 가장자리 보정 유지. 화질 선택 저장.
- 카메라 밖 인스턴스 제외, 카메라 회전·화면 비율 변경 시 재검사. 모바일 메뉴 블러 합성 제거.
- Ego 공개 사이트 터치 경로에서 홀·단원·악기와 이동 확인. 근접 시 삼각형 303,652 → 89,518. 데스크톱 측정이며 실제 아이폰 FPS를 의미하지 않는다.
- 실제 iPhone 13 Pro Chrome 성능 재확인은 남아 있다. 상세 조건은 docs/mobile-public-performance.md.

## 2층 계단 출구·바닥·착석 시점 수정

- 계단 입구와 뒤쪽 연결 통로에 난간 개구부를 추가해 이동 경로가 장식 벽을 관통하지 않도록 했다.
- 2층 바닥을 겹치지 않는 다섯 판으로 연결하고, 계단 상부는 실제 구멍으로 비웠다. 클릭 이동 판도 같은 바닥 데이터로 생성한다.
- 2층 좌석의 초기 무대 방향은 유지하면서 드래그·줌을 적용한다. 무대 전체 전환도 1층과 같이 사용할 수 있다.
- 타입 검사, 43개 테스트, Pages 빌드 통과. 양옆 계단의 개구부, 바닥 판 중복, 연결 통로 개방, 양쪽 좌석 카메라 조작 및 전체 좌석 접근 경로를 검사했다.
- Ego 공개 사이트에서 계단 상승, 우측 2층 착석·드래그·줌·무대 전체 전환, 후면 연결 통로를 통한 좌측 2층 착석을 확인했다.
