# 환상 음원 출처와 보관

2026-11-16에 아래 6개 Wikimedia Commons 파일의 Original file, 연주자, 녹음 권리 표시를 확인했다. 연주는 모두 Musopen Symphony Orchestra이며, 개별 파일은 Musopen의 퍼블릭 도메인 선언을 녹음에 적용한다. 수록 작품은 오래된 작곡 원곡이다. Musopen의 자체 제작 공개 목록에서도 마술피리, 스코틀랜드 교향곡, 몰다우, 비창 교향곡, 러시아 부활절 서곡을 대조했다. [Musopen 공개 기록](https://musopen.org/nl/blog/musopen-kickstarter-project-1-complete/) · [Musopen 원본 프로젝트 보관본](https://archive.org/details/musopen-lossless-dvd)

FLAC 합계 59분 9.898초, 웹용 AAC 합계 59분 9.898초. 원본은 `archive/fantasy-audio-originals/`에 로컬 보관하며, 아래 SHA-256으로 다시 받은 파일을 확인할 수 있다. `public/audio/`의 M4A는 AAC-LC 256 kbps 목표 설정과 fast start로 인코딩했다. 표에는 실제 스트림 평균 비트레이트를 기록했다.

| 순서 | 곡 | AAC 길이 | 평균 kbps | 권리 | 출처 |
| --- | --- | ---: | ---: | --- | --- |
| 01 | 모차르트 — 마술피리 서곡 | 6:40.773 | 255.4 | Public Domain (Musopen) | [Commons](https://commons.wikimedia.org/wiki/File%3AMozart_-_Die_Zauberfl%C3%B6te%2C_K620_-_Overture_%28Musopen_Symphony%29.flac) · [원본 FLAC](https://upload.wikimedia.org/wikipedia/commons/c/c9/Mozart_-_Die_Zauberfl%C3%B6te%2C_K620_-_Overture_%28Musopen_Symphony%29.flac) |
| 02 | 멘델스존 — 스코틀랜드 교향곡 2악장 | 4:24.009 | 251.1 | Public Domain (Musopen) | [Commons](https://commons.wikimedia.org/wiki/File%3AMendelssohn_-_Symphony_No._3_in_A_minor%2C_Op._56_%27Scottish%27_-_II._Vivace_non_troppo_%28Musopen_Symphony%29.flac) · [원본 FLAC](https://upload.wikimedia.org/wikipedia/commons/3/30/Mendelssohn_-_Symphony_No._3_in_A_minor%2C_Op._56_%27Scottish%27_-_II._Vivace_non_troppo_%28Musopen_Symphony%29.flac) |
| 03 | 스메타나 — 몰다우 | 12:50.859 | 257.0 | Public Domain (Musopen) | [Commons](https://commons.wikimedia.org/wiki/File%3ASmetana_-_M%C3%A1_Vlast_-_Vltava_%28Musopen_Symphony%29.flac) · [원본 FLAC](https://upload.wikimedia.org/wikipedia/commons/3/39/Smetana_-_M%C3%A1_Vlast_-_Vltava_%28Musopen_Symphony%29.flac) |
| 04 | 차이콥스키 — 비창 교향곡 2악장 | 8:16.080 | 253.4 | Public Domain (Musopen) | [Commons](https://commons.wikimedia.org/wiki/File%3ATchaikovsky_-_Symphony_No._6_in_B_minor%2C_Op._74_%27Path%C3%A9tique%27_-_II._Allegro_con_grazia_%28Musopen_Symphony%29.flac) · [원본 FLAC](https://upload.wikimedia.org/wikipedia/commons/b/b3/Tchaikovsky_-_Symphony_No._6_in_B_minor%2C_Op._74_%27Path%C3%A9tique%27_-_II._Allegro_con_grazia_%28Musopen_Symphony%29.flac) |
| 05 | 림스키코르사코프 — 러시아 부활절 서곡 | 15:36.007 | 256.9 | Public Domain (Musopen) | [Commons](https://commons.wikimedia.org/wiki/File%3ARimsky_Korsakov_-_Russian_Easter_Festival_Overture%2C_Op._36_%28Musopen_Symphony%29.flac) · [원본 FLAC](https://upload.wikimedia.org/wikipedia/commons/2/21/Rimsky_Korsakov_-_Russian_Easter_Festival_Overture%2C_Op._36_%28Musopen_Symphony%29.flac) |
| 06 | 멘델스존 — 스코틀랜드 교향곡 4악장 | 11:22.170 | 251.6 | Public Domain (Musopen) | [Commons](https://commons.wikimedia.org/wiki/File%3AMendelssohn_-_Symphony_No._3_in_A_minor%2C_Op._56_%27Scottish%27_-_IV._Allegro_vivacissimo_-_Allegro_maestoso_assai_%28Musopen_Symphony%29.flac) · [원본 FLAC](https://upload.wikimedia.org/wikipedia/commons/3/38/Mendelssohn_-_Symphony_No._3_in_A_minor%2C_Op._56_%27Scottish%27_-_IV._Allegro_vivacissimo_-_Allegro_maestoso_assai_%28Musopen_Symphony%29.flac) |

Worker용 빌드는 25 MiB를 넘는 05번 M4A를 정적 파일 두 조각으로 저장한다. 기존 `/api/audio/` URL에서 두 조각을 하나의 파일로 스트리밍하며 범위 요청을 지원한다. [Cloudflare 정적 파일 한도](https://developers.cloudflare.com/workers/platform/limits/#static-assets)

## FLAC SHA-256

```text
d0482d54438d784ab6c0ff2d2279e10fa821f7b6fec9f7da43bfed5701cb25ac  fantasy-mozart-magic-flute.flac
6627e28d9a3341632155e772f644ab4fb2814d5297e840b34245f186470a1d93  fantasy-mendelssohn-scottish-2.flac
eaba28529d19169d1685f9fc047bd911ac42ee58184ef0655f359f6e8322a761  fantasy-smetana-moldau.flac
c666606075d788e1e887d638324dac623d639077fd6b33c3b73e50fc63cedfc4  fantasy-tchaikovsky-pathetique-2.flac
f6ea5c024e307cad413705f91dc0222b2f79ae6ce1c45d0089afc6313a675ba6  fantasy-rimsky-korsakov-russian-easter.flac
479235d413c5e94c7321dc2ba4e394024e27b59a6e4d5d8cda84c871ad0d5b6f  fantasy-mendelssohn-scottish-4.flac
```
