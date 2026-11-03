# 자산 기록

- 건축 모듈·관객·연주자·악기: 이 프로젝트에서 Three.js 기본 기하와 코드로 직접 구성.
- 천장 장식: 로비는 Canvas로 생성한 추상 장식, 황금홀은 독자적으로 그린 단순한 우의화다. 실제 천장화 사진을 앱 텍스처로 사용하지 않았다.
- 테스트 음원: `scripts/make-preview-audio.py`로 합성한 자체 테스트 선율. 실제 공연용 녹음과 구분.
- 글꼴: Google Fonts의 Noto Serif KR를 CSS로 요청하며 시스템 글꼴 대체를 지정. 운영 배포에서는 사용 조건 확인 후 자체 호스팅하거나 시스템 글꼴로 대체 가능.
- 산사의 코드·모델·음원 파일은 앱 자산으로 포함하지 않았다. 공개 클라이언트에서 확인한 조작·접속 설계를 참고했다.

## 현재 공연 프로그램 — 2026-11-03

크리스마스 음악회 하나가 반복된다(약 20분). 오케스트라만 연주하는 곡만 넣었고, 합창·독창·피아노 독주가 있는 곡(‘저 들 밖에’, ‘천사 찬송하기를’, ‘오 거룩한 밤’, ‘고요한 밤’)은 뺐다. 차이콥스키 호두까기 인형 모음곡(1950년대 Decca 녹음)은 음질이 낮아 뺐다.

- 순서: 코렐리 ‘크리스마스 협주곡’ 합주 협주곡 G단조 Op.6 No.8(Advent Chamber Orchestra, CC BY-SA 2.0, 두 파일) → 서울시립교향악단 캐럴(2020; CC BY-SA 3.0, 마지막 곡 4.0): 기쁘다 구주 오셨네 → 오 베들레헴 작은 골 → 천사들의 노래가 → 저 들 밖에 한밤중에 → 징글벨 → 고요한 밤 → 오 거룩한 밤 → 앙코르 우리 모두 즐거운 성탄을.
- 곡 사이: 10초씩 음악만 쉬는 무음. 공간 소리(빈 콘서트홀의 공기 소리, `lobby-ambience.mp3`)는 로비와 공연장 모두에서 음악 아래에 계속 아주 작게(설정의 ‘공간 소리’ 1~10, 기본 5, 기본 5에서 로비와 공연장 모두 0.09(음악 100 기준), 10은 그 두 배) 반복된다. 관객이 박수를 누를 때만 박수 클립(`hall-clap.mp3`)을 재생한다.
- 변환: `scripts/build-program.py`로 FFmpeg/libmp3lame 192kbps CBR MP3, 모든 곡 같은 평균 음량(-20 LUFS, 곡 안의 강약 유지).

원본 목록:
- Corelli - Concerto Grosso in G minor - Christmas Concerto - part 1.ogg — [CC BY-SA 2.0](https://commons.wikimedia.org/wiki/File:Corelli_-_Concerto_Grosso_in_G_minor_-_Christmas_Concerto_-_part_1.ogg)
- Corelli - Concerto Grosso in G minor - Christmas Concerto - part 2.ogg — [CC BY-SA 2.0](https://commons.wikimedia.org/wiki/File:Corelli_-_Concerto_Grosso_in_G_minor_-_Christmas_Concerto_-_part_2.ogg)
- S^ulPO2020 Joy To The World.wav — [CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:S%5EulPO2020_Joy_To_The_World.wav)
- S^ulPO2020 O Little Town Of Bethlehem.wav — [CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:S%5EulPO2020_O_Little_Town_Of_Bethlehem.wav)
- S^ulPO2020 Jingle Bell.wav — [CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:S%5EulPO2020_Jingle_Bell.wav)
- S^ulPO2020 Angels We Have Heard on High.wav — [CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:S%5EulPO2020_Angels_We_Have_Heard_on_High.wav)
- S^ulPO2020 The First Noel.wav — [CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:S%5EulPO2020_The_First_Noel.wav)
- S^ulPO2020 Silent Night.wav — [CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:S%5EulPO2020_Silent_Night.wav)
- S^ulPO2020 Oh Holy Night.wav — [CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:S%5EulPO2020_Oh_Holy_Night.wav)
- S^ulPO2020 We Wish You a Merry Christmas.wav — [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:S%5EulPO2020_We_Wish_You_a_Merry_Christmas.wav)
- Algemene sfeer van een lege concertzaal - SoundCloud - Beeld en Geluid.ogg — [CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Algemene_sfeer_van_een_lege_concertzaal_-_SoundCloud_-_Beeld_en_Geluid.ogg)
- Sound Effects - Applause after a concert.ogg — [CC0](https://commons.wikimedia.org/wiki/File:Sound_Effects_-_Applause_after_a_concert.ogg)

## 황금홀 건축 참고 — 2026-10-30

- [Musikverein 공식 Great Hall 페이지](https://musikverein.at/en/vermietung/grosser-saal/)의 내부 사진과 공식 무대·객석 도면을 참고했다.
- 공식 길이 48.9m, 폭 19.1m, 높이 17.75m의 비율을 참고해 앱 공간은 길이 82 × 폭 32 × 높이 29.7 단위로 구성했다. 앱 좌표를 실제 미터로 표시하지 않는다.
- 파이프오르간, 직선 발코니, 아치형 창, 조각상 기둥, 천장 패널과 샹들리에는 직접 작성한 3D 기하로 구성했다. 공식 사진은 검토용이며 앱에 복사하지 않았다.
- 객석은 장식 좌석과 기존 선택 좌석 8개로 구성한 프로토타입이다. 공식 정원 전체를 구현한 좌석 예약 시스템은 아니다.

## Palais Garnier — Grand Escalier ceiling photograph

- Photo: **Diego Delso**, “Ópera, París, Francia, 2022-10-31, DD 54-56 HDR”.
- Source: https://commons.wikimedia.org/wiki/File:Ópera,_París,_Francia,_2022-10-31,_DD_54-56_HDR.jpg
- Photographer: https://delso.photo/
- License: **CC BY-SA 4.0**, https://creativecommons.org/licenses/by-sa/4.0/
- Local file: `src/assets/hall/garnier-stair-ceiling.webp` (4596px JPEG resized to 2048px and converted to WebP).
- Mapped onto the lobby ceiling as a photographic surface; this texture adaptation remains CC BY-SA 4.0. The auditorium fresco is unchanged.

## AUREA startup preview

- `public/lobby-preview.webp`: a 1600×1000 render of this application's lobby, generated from its current Three.js scene.
- The render includes the Diego Delso ceiling photograph credited above; the preview is distributed under CC BY-SA 4.0 with the same source attribution in the settings panel.
