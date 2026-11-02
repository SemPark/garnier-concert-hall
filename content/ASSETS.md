# 자산 기록

- 건축 모듈·관객·연주자·악기: 이 프로젝트에서 Three.js 기본 기하와 코드로 직접 구성.
- 천장 장식: 로비는 Canvas로 생성한 추상 장식, 황금홀은 독자적으로 그린 단순한 우의화다. 실제 천장화 사진을 앱 텍스처로 사용하지 않았다.
- 테스트 음원: `scripts/make-preview-audio.py`로 합성한 자체 테스트 선율. 실제 공연용 녹음과 구분.
- 글꼴: Google Fonts의 Noto Serif KR를 CSS로 요청하며 시스템 글꼴 대체를 지정. 운영 배포에서는 사용 조건 확인 후 자체 호스팅하거나 시스템 글꼴로 대체 가능.
- 산사의 코드·모델·음원 파일은 앱 자산으로 포함하지 않았다. 공개 클라이언트에서 확인한 조작·접속 설계를 참고했다.

## 현재 공연 프로그램 — 2026-11-02

모차르트의 저녁 공연 하나가 반복된다(약 64분). 모두 Wikimedia Commons에서 받았고, 파일 페이지에 표시된 사용 조건을 따른다.

- 모차르트의 저녁: 피가로의 결혼 서곡 → 클라리넷 협주곡 K.622 전 악장 → 교향곡 40번 전 악장 → 앙코르 아이네 클라이네 나흐트무지크 1악장.
- 곡 사이: 15초씩, 박수 없는 객석 웅성거림 녹음(Geroezemoes in een zaal)을 음악보다 작게(-36 LUFS) 만든 실내음. 관객이 박수를 누를 때만 박수 클립(`hall-clap.mp3`)을 재생한다.
- 변환: `scripts/build-program.py`로 FFmpeg/libmp3lame 192kbps CBR MP3(파일당 25MB 이하, Cloudflare 정적 파일 한도). 모든 곡을 같은 평균 음량(-20 LUFS)으로 맞추되 곡 안의 강약은 그대로 둔다(linear loudnorm). Musopen 녹음은 무손실 FLAC 원본, 나머지는 Ogg 원본(약 200–260kbps).
- 저작자 표시가 필요한 녹음: 클라리넷 협주곡·아이네 클라이네 나흐트무지크(CC BY-SA 2.0), 곡 사이 실내음(CC BY-SA 3.0, Beeld en Geluid).

원본 목록:
- Mozart - Le nozze di Figaro, K492 - Overture (Musopen Symphony).flac — [Public domain](https://commons.wikimedia.org/wiki/File:Mozart_-_Le_nozze_di_Figaro,_K492_-_Overture_(Musopen_Symphony).flac)
- Wolfgang Amadeus Mozart - Clarinet Concerto - 1. Allegro.ogg — [CC BY-SA 2.0](https://commons.wikimedia.org/wiki/File:Wolfgang_Amadeus_Mozart_-_Clarinet_Concerto_-_1._Allegro.ogg)
- Wolfgang Amadeus Mozart - Clarinet Concerto - 2. Adagio.ogg — [CC BY-SA 2.0](https://commons.wikimedia.org/wiki/File:Wolfgang_Amadeus_Mozart_-_Clarinet_Concerto_-_2._Adagio.ogg)
- Wolfgang Amadeus Mozart - Clarinet Concerto - 3. Allegro.ogg — [CC BY-SA 2.0](https://commons.wikimedia.org/wiki/File:Wolfgang_Amadeus_Mozart_-_Clarinet_Concerto_-_3._Allegro.ogg)
- Mozart - Symphony No. 40 in G minor, K550 - I. Molto allegro (Musopen Symphony).flac — [Public domain](https://commons.wikimedia.org/wiki/File:Mozart_-_Symphony_No._40_in_G_minor,_K550_-_I._Molto_allegro_(Musopen_Symphony).flac)
- Mozart - Symphony No. 40 in G minor, K550 - II. Andante (Musopen Symphony).flac — [Public domain](https://commons.wikimedia.org/wiki/File:Mozart_-_Symphony_No._40_in_G_minor,_K550_-_II._Andante_(Musopen_Symphony).flac)
- Mozart - Symphony No. 40 in G minor, K550 - III. Menuetto. Allegretto (Musopen Symphony).flac — [Public domain](https://commons.wikimedia.org/wiki/File:Mozart_-_Symphony_No._40_in_G_minor,_K550_-_III._Menuetto._Allegretto_(Musopen_Symphony).flac)
- Mozart - Symphony No. 40 in G minor, K550 - IV. Finale. Allegro assai (Musopen Symphony).flac — [Public domain](https://commons.wikimedia.org/wiki/File:Mozart_-_Symphony_No._40_in_G_minor,_K550_-_IV._Finale._Allegro_assai_(Musopen_Symphony).flac)
- Mozart - Eine kleine Nachtmusik - 1. Allegro.ogg — [CC BY-SA 2.0](https://commons.wikimedia.org/wiki/File:Mozart_-_Eine_kleine_Nachtmusik_-_1._Allegro.ogg)
- Geroezemoes in een zaal - SoundCloud - Beeld en Geluid.ogg — [CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Geroezemoes_in_een_zaal_-_SoundCloud_-_Beeld_en_Geluid.ogg)
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
