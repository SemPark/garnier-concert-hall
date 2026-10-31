# 황금홀 표면·후면 로컬 수정 — 2026-10-31

참고: [Musikverein 공식 Great Hall](https://musikverein.at/en/vermietung/grosser-saal/)에 연결된 [Cupix 360](https://www.cupix360.at/cupix360/mv360/mv360_01/mv360_01.html).
전면, 측면, 후면, 후면 코너, 2층 문, 천장을 확대해서 비교했다.

- 2층: 난간 바로 위에서 시작하는 세로로 긴 목제 문, 흰 석재 문틀, 삼각 박공과 조각, 적갈색 세로 프레임. 공연 주최 측의 발코니 높이 사진도 확인했다. 난간에 가려진 상부만을 문 전체로 보던 오류를 고쳐 문 높이를3.75에서6.85로 늘려 상부 조각이 창문 아래 수평 코니스 바로 밑에 오도록 했다. 흰 문틀의 꺾인 모서리, 금빛 가로 장식과 박공·누운 조각까지 함께 높였다.
- 상부 창: 검은 격자가 있는 아치창과 사이의 금빛 세로 장식. 폭 대비 높이를 줄이고 창턱을 올렸다.
- 천장: 적갈색/짙은 바탕, 금빛 덩굴과 구슬 테두리, 중앙 회화와 옆의 타원·다각형 액자를 교대로 배치했다.
- 후면: 아치창 6개, 양끝 맹아치와 어두운 갤러리 개구부, 아래쪽 목제 이오니아 기둥 4개와 3개 출입구. 원본에 없는 후면 2층 박공 문 반복을 제거했다.
- 계단: 원본 파노라마에 긴 실내 V자 계단이 드러나지 않는다. 현재 앱의 걸어서 올라가는 경로는 유지하며, 보이는 형태를 원본의 목제 단차/가는 난간에 맞춰 얇은 목제 디딤판·황동 코·짙은 난간으로 변경했다. 위치까지 실측 복원한 것은 아니다.

`src/assets/hall`의 장식 SVG 7개는 원본 사진을 복사한 것이 아니라 위 구성에 맞춰 작성한 공통 이미지다. 공통 목재 WebP 1개(512×512, 28,792바이트)를 포함해 전체 약171 KB. 장식은 `scripts/hall-textures.py`로 재생성할 수 있다. 목재 사진 텍스처는 내장 이미지 생성 도구로 생성해 WebP로 압축했다. 각 파일은 하나의 텍스처와 재질로 캐시되며 여러 벽/천장에 공유한다. 반사·범프용 추가 맵이나 새 실시간 조명은 사용하지 않는다. 기존 거리별 렌더링과 캐릭터 코드는 유지한다.

로컬 검토 후 2026-10-31 사용자가 GitHub 업로드를 요청하여, 이 변경을 기존 main 브랜치와 GitHub Pages에 반영한다.

추가 참고: [Wiener Mozart Konzert의 공연장 갤러리](https://www.mozart.wien/de/the-concert-halls/goldener-saal).


목재 공유 범위: 홀 바닥, 무대 바닥과 다섯 단, 발코니 바닥의 윗면, 관객 의자 프레임·등받이·다리, 악단 의자 좌판·등받이, 오르간 연주대·벤치·페달, 문과 계단. 바닥은 월드 좌표 UV로 .9×4.8 앱 단위마다 반복하며, 의자에는 원래 Standard 재질을 유지한다. 이미지 요청은 1번이고 색조별 재질만 공유한다. 캐릭터 리그·동작·악기는 수정하지 않았다.

생성 프롬프트(내장 image_gen): seamless repeating diffuse/albedo European oak timber, warm honey-brown, fine vertical grain, uniform neutral illumination, no baked shadow/highlight, no plank seams, no objects/text/border, 1024 square. 최종 파일: `src/assets/hall/oak-grain.webp`.

재대조 후 측벽의 원본에 없는 크림색 문장 반복을 제거하고 낮은 나무 박스 전면과 적갈색 직물 무늬를 공통 이미지로 추가했다. 후면 3개 문에는 유리와 목제 격자를 넣었다. 2층 문의 승인된 높이와 기존 좌석·보행 경로는 유지했다.


목재 텍스처 최종 생성 프롬프트 (내장 image_gen 사용):
> Use case: photorealistic-natural. Asset type: seamless repeating diffuse/albedo wood texture for a lightweight web 3D concert hall. Create ONE square texture, edge to edge natural quarter-sawn European oak timber, medium warm honey-brown, fine predominantly vertical straight wood grain with subtle believable growth lines and medullary rays. Uniform neutral flat illumination, no shadows, no highlights baked in, no vignetting, no perspective, no plank boundaries or seams, no knots larger than a pinhead, no objects, no letters, no borders or labels. Photographic surface texture, restrained grain contrast, both horizontal and vertical boundaries must tile seamlessly. Intended to be reused on Golden Hall floor boards, small wooden chairs, wooden doors and organ console with color tinting. 1024 by 1024 square.

확인: 로컬 WebGL에서 모든 목재 재질의 텍스처 객체가 동일한 1개이며 512px 이미지 로딩 완료, WebGL 오류0. 브라우저 사진 비교와 87개 테스트 및 Pages 모드 빌드 통과. iPhone 실기기 성능 측정을 새로 했다는 의미는 아니다.


천장 추가 수정: 바탕과 가로 들보·세로 테두리에 공통 목재 이미지를 적용했다. 금색 몰딩과 기하학 장식은 유지한다. 단순 SVG 인물 그림 위에 고전 회화풍 뮤즈4종을 담은 `src/assets/hall/ceiling-muses.webp`(768×768,75,884바이트)를 적용했다. 13개 중앙 액자와 12개 측면 액자에서 같은 텍스처의 UV 영역만 바꾼다. 원본 사진 자체를 복사한 회화가 아니라 원본의 색감과 양식을 참고해 내장 image_gen으로 새로 만든 그림이다.

천장화 최종 프롬프트(내장 image_gen): Create a production texture atlas for a 3D reconstruction of Vienna Musikverein Golden Hall ceiling. Use the reference only for the ceiling fresco's historical painting style and colors, not its perspective, gilt frames, lamps or architecture. Output ONE square image, arranged as an EXACT clean 2 by 2 grid of FOUR equal square independent ceiling fresco paintings, filling all four quadrants edge to edge, no gaps, no grid lines, no labels, no borders. Each quadrant: a distinct elegant fully clothed classical female allegorical muse floating against a muted rich blue sky and soft pale clouds, with flowing long robes, realistically painted face, hands and fabric, subtle aged oil paint/tempera texture. Top left Music in burgundy robes holding a small lyre, top right Poetry in dusky purple holding a scroll, bottom left Dance in ochre and rose drapery, bottom right Harmony in muted teal and rose holding a laurel wreath. Full figures and all limbs stay safely inside each quadrant with generous blue sky surrounding the figure, suitable for a ceiling panel seen from below. Nineteenth-century European neoclassical decorative painting, solemn and refined, visually close to the referenced Golden Hall ceiling paintings, restrained warm colors, no photoreal modern person, no cartoon, no vector shapes, no frames or gold ornament, no lettering, no signatures. Flat orthographic scans of painted fresco artwork, no 3D perspective or lighting glare.
