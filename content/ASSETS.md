# 자산 기록

- 건축 모듈·관객·연주자·악기: 이 프로젝트에서 Three.js 기본 기하와 코드로 직접 구성.
- 천장 장식: 로비는 Canvas로 생성한 추상 장식, 황금홀은 독자적으로 그린 단순한 우의화다. 실제 천장화 사진을 앱 텍스처로 사용하지 않았다.
- 테스트 음원: `scripts/make-preview-audio.py`로 합성한 자체 테스트 선율. 실제 공연용 녹음과 구분.
- 글꼴: Google Fonts의 Noto Serif KR를 CSS로 요청하며 시스템 글꼴 대체를 지정. 운영 배포에서는 사용 조건 확인 후 자체 호스팅하거나 시스템 글꼴로 대체 가능.
- 산사의 코드·모델·음원 파일은 앱 자산으로 포함하지 않았다. 공개 클라이언트에서 확인한 조작·접속 설계를 참고했다.

## 현재 공연 프로그램 — 2026-11-01

약 1시간(59.6분) 모차르트 프로그램과 공연장 현장음. 모두 Wikimedia Commons에서 받았고, 파일 페이지에 표시된 사용 조건을 따른다. 설정 화면의 곡 정보에도 출처·라이선스 링크가 나온다.

- 순서: 객석 웅성거림 → 조율(악장 기립) → 지휘자 입장·인사 → 피가로의 결혼 서곡 → 마술피리 서곡 → 교향곡 35번 ‘하프너’ 전 악장 → 교향곡 40번 전 악장 → 앙코르: 교향곡 34번 피날레 → 인사·퇴장. 곡 사이에는 박수, 악장 사이에는 7초 정적.
- 변환: `scripts/build-program.py`로 FFmpeg/libmp3lame 320kbps CBR MP3. Musopen 녹음(피가로·마술피리·40번)은 무손실 FLAC 원본에서, 하프너·34번은 Ogg 원본(약 200–245kbps)에서 변환했다. 박수 구간은 하나의 박수 녹음에서 잘라 짧게 페이드했다.
- 저작자 표시가 필요한 현장음: 조율 녹음(CC BY 3.0), 객석 웅성거림(CC BY-SA 3.0, Beeld en Geluid).

원본 목록:
- Mozart - Le nozze di Figaro, K492 - Overture (Musopen Symphony).flac — [Public domain](https://commons.wikimedia.org/wiki/File:Mozart_-_Le_nozze_di_Figaro,_K492_-_Overture_(Musopen_Symphony).flac) · Wolfgang Amadeus Mozart
- Mozart - Die Zauberflöte, K620 - Overture (Musopen Symphony).flac — [Public domain](https://commons.wikimedia.org/wiki/File:Mozart_-_Die_Zauberfl%C3%B6te,_K620_-_Overture_(Musopen_Symphony).flac) · Wolfgang Amadeus Mozart
- Mozart - Symphony No. 40 in G minor, K550 - I. Molto allegro (Musopen Symphony).flac — [Public domain](https://commons.wikimedia.org/wiki/File:Mozart_-_Symphony_No._40_in_G_minor,_K550_-_I._Molto_allegro_(Musopen_Symphony).flac) · Wolfgang Amadeus Mozart
- Mozart - Symphony No. 40 in G minor, K550 - II. Andante (Musopen Symphony).flac — [Public domain](https://commons.wikimedia.org/wiki/File:Mozart_-_Symphony_No._40_in_G_minor,_K550_-_II._Andante_(Musopen_Symphony).flac) · Wolfgang Amadeus Mozart
- Mozart - Symphony No. 40 in G minor, K550 - III. Menuetto. Allegretto (Musopen Symphony).flac — [Public domain](https://commons.wikimedia.org/wiki/File:Mozart_-_Symphony_No._40_in_G_minor,_K550_-_III._Menuetto._Allegretto_(Musopen_Symphony).flac) · Wolfgang Amadeus Mozart
- Mozart - Symphony No. 40 in G minor, K550 - IV. Finale. Allegro assai (Musopen Symphony).flac — [Public domain](https://commons.wikimedia.org/wiki/File:Mozart_-_Symphony_No._40_in_G_minor,_K550_-_IV._Finale._Allegro_assai_(Musopen_Symphony).flac) · Wolfgang Amadeus Mozart
- Symphony no. 35 in D 'Haffner' K. 385 I. Allegro con spirito (Mozart) European Archive.ogg — [Public domain](https://commons.wikimedia.org/wiki/File:Symphony_no._35_in_D_%27Haffner%27_K._385_I._Allegro_con_spirito_(Mozart)_European_Archive.ogg) · European Archives
- Symphony no. 35 in D 'Haffner' K. 385 II. Andante (Mozart) European Archive.ogg — [Public domain](https://commons.wikimedia.org/wiki/File:Symphony_no._35_in_D_%27Haffner%27_K._385_II._Andante_(Mozart)_European_Archive.ogg) · European Archives
- Symphony no. 35 in D 'Haffner' K. 385 III. Minuetto (Mozart) European Archive.ogg — [Public domain](https://commons.wikimedia.org/wiki/File:Symphony_no._35_in_D_%27Haffner%27_K._385_III._Minuetto_(Mozart)_European_Archive.ogg) · European Archives
- Symphony no. 35 in D 'Haffner' K. 385 IV. Finale Presto (Mozart) European Archive.ogg — [Public domain](https://commons.wikimedia.org/wiki/File:Symphony_no._35_in_D_%27Haffner%27_K._385_IV._Finale_Presto_(Mozart)_European_Archive.ogg) · European Archives
- Mozart Symphony No.34 C major III. Finale (Allegro vivace) (Mozart) European Archive.ogg — [Public domain](https://commons.wikimedia.org/wiki/File:Mozart_Symphony_No.34_C_major_III._Finale_(Allegro_vivace)_(Mozart)_European_Archive.ogg) · European Archives
- 47383 gelo-papas orchestra-tuning3.wav — [CC BY 3.0](https://commons.wikimedia.org/wiki/File:47383_gelo-papas_orchestra-tuning3.wav) · gelo_papas
- Sound Effects - Applause after a concert.ogg — [CC0](https://commons.wikimedia.org/wiki/File:Sound_Effects_-_Applause_after_a_concert.ogg) · Amada44
- Slow starting applause.ogg — [Public domain](https://commons.wikimedia.org/wiki/File:Slow_starting_applause.ogg) · stephan
- Algemene sfeer van de Kleine Doelenzaal bij aanvang concert - SoundCloud - Beeld en Geluid.ogg — [CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Algemene_sfeer_van_de_Kleine_Doelenzaal_bij_aanvang_concert_-_SoundCloud_-_Beeld_en_Geluid.ogg) · Beeld en Geluid

## 황금홀 건축 참고 — 2026-10-30

- [Musikverein 공식 Great Hall 페이지](https://musikverein.at/en/vermietung/grosser-saal/)의 내부 사진과 공식 무대·객석 도면을 참고했다.
- 공식 길이 48.9m, 폭 19.1m, 높이 17.75m의 비율을 참고해 앱 공간은 길이 82 × 폭 32 × 높이 29.7 단위로 구성했다. 앱 좌표를 실제 미터로 표시하지 않는다.
- 파이프오르간, 직선 발코니, 아치형 창, 조각상 기둥, 천장 패널과 샹들리에는 직접 작성한 3D 기하로 구성했다. 공식 사진은 검토용이며 앱에 복사하지 않았다.
- 객석은 장식 좌석과 기존 선택 좌석 8개로 구성한 프로토타입이다. 공식 정원 전체를 구현한 좌석 예약 시스템은 아니다.
