# 온기·야경 재즈 음원 검증

## 권리와 개발 환경

2026-11-16에 제공받은 Wikimedia Commons 파일 페이지 18개의 Original file 링크와 권리 표시를 확인했다. 각 파일은 미 공군 실연·녹음으로 기재돼 있고 PD-USGov-Military-Air Force로 표시된다. 이 표시는 미국 내 공무상 제작물을 대상으로 한다. Commons 파일의 권리 안내도 미 공군의 설명을 근거로 삼는다. 해당 녹음에 들어간 작곡·편곡과 한국에서의 상업 스트리밍 권리는 18곡 모두 미확정이다. [Commons 공군 태그](https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Air_Force) · [미국 저작권법 제105조](https://www.copyright.gov/title17/92chap1.html#105) · [한국 저작권법](https://www.law.go.kr/법령/저작권법)

일부 Airmen of Note MP3 원본의 ID3에는 ASCAP/BMI가 기재돼 있고, Blue Shadows의 ID3 Free 문구에는 대상 국가·사용 범위가 명시돼 있지 않다. Altissimo가 다른 트랙 구성으로 발매한 Compositions에도 별도 음반 권리 표기가 있다. 이 표기들만으로 Commons 배포본에 적용되는 한국 권리 범위를 결정할 수 없다. [음반사 카탈로그](https://www.naxos.com/CatalogueDetail/?id=75442271992)

Commons에 표시된 권리 조건과 곡별 출처를 보존한다. 원본은 `archive/jazz-development/originals/`에 보관하며, 검증된 MP3는 기존 `public/audio/`와 `/api/audio/` 경로로 제공한다. 프로그램의 MP3 9개가 모두 준비된 빌드에서 선택할 수 있다.

## 편성 확인

- Airmen of Note는 미 공군의 정식 빅밴드다. 미 공군 발간 자료는 Compositions를 단원들이 작곡하고 녹음한 빅밴드 앨범으로 소개한다. 첫 곡의 실제 녹음을 가리키는 출판 악보는 색소폰 5, 금관 8, 리듬 4, 보컬 편성을 명시한다. Global Reach 2곡의 Commons 크레딧에는 트럼펫·트롬본·색소폰 섹션이 명시돼 있다. Blues for Mundy는 Airmen of Note와 Ernie Hensley 실연으로 기재되며, 녹음별 섹션 참여는 추가 청취 확인이 필요하다. [미 공군 빅밴드 기록](https://www.afdw.af.mil/News/Article-Display/Article/335878/usaf-band-takes-jazz-sound-to-the-airwaves/) · [Compositions 발간 자료](https://www.music.af.mil/Portals/33/Bands/USAF%20Band/PDFs/75th%20Anniversary%20Book/75%20Anniversary%20Part%203.pdf?ver=2017-04-11-112745-733) · [첫 곡 출판 악보](https://www.projazzcharts.com/products-and-services/steve-erickson/brand-new-day/)
- Shades of Blue는 미 공군 공식 소개에 따르면 18인 재즈 앙상블이다. 다섯 파일은 모두 Blue Shadows 앨범 실연으로 기재돼 있다. 해당 녹음별 브라스 섹션 참여를 확인할 세션 명단을 찾지 못했으며, 전곡 청취 확인이 남아 있다. [미 공군 Shades of Blue 소개](https://www.music.af.mil/Bands/US-Air-Force-Band-of-Mid-America/Ensembles/shadesofblue/)

## 파일별 확인

온기 9곡은 58분 30.520초, 야경 9곡은 59분 44.486초다. 길이는 디코딩한 PCM 샘플 수로 계산했다. 레벨은 FFmpeg EBU R128의 통합 LUFS와 디코딩 트루피크이며, 아래 권리 상태는 각 곡에 개별 적용된다.

| 프로그램·순서 | 곡 / 연주 | 작곡 · 편곡 | 실측 길이 · 원본 비트레이트 | 원본 LUFS / dBTP / 재생 감쇠 | 출처와 권리 |
| --- | --- | --- | --- | --- | --- |
| 온기 01 | It's a Brand New Day / Airmen of Note | Steve Erickson · Steve Erickson · 출판 악보 있음 | 5:16.447 · MP3 256.0 kbps | -12.6 / +0.4 / -6.4 dB | [Commons](https://commons.wikimedia.org/wiki/File:It's_a_Brand_New_Day_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/d/df/It%27s_a_Brand_New_Day_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 온기 02 | Little Dreamer, Big Dreams / Airmen of Note | Ben Patterson · 출판 악보 있음, 크레딧 별도 확인 | 5:55.239 · MP3 256.0 kbps | -10.9 / +0.6 / -8.1 dB | [Commons](https://commons.wikimedia.org/wiki/File:Little_Dreamer%2C_Big_Dreams_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/a/ad/Little_Dreamer%2C_Big_Dreams_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 온기 03 | Blues for Mundy / Airmen of Note · Ernie Hensley | Rick Whitehead · 별도 크레딧 미확인 | 4:38.413 · MP3 256.0 kbps | -12.7 / +1.4 / -6.3 dB | [Commons](https://commons.wikimedia.org/wiki/File:Blues_for_Mundy_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/5/53/Blues_for_Mundy_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 온기 04 | Sakura / Airmen of Note | 일본 전승곡 · Jeff Martin | 5:53.855 · MP3 256.0 kbps | -10.5 / +0.6 / -8.5 dB | [Commons](https://commons.wikimedia.org/wiki/File:Sakura_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/2/22/Sakura_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 온기 05 | Arirang / Airmen of Note | 한국 전승곡 · Ben Patterson | 7:37.900 · MP3 256.0 kbps | -14.0 / -0.4 / -5.0 dB | [Commons](https://commons.wikimedia.org/wiki/File:Arirang_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/d/d6/Arirang_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 온기 06 | Hickory and Twine / Airmen of Note | Alan Baylock · 별도 크레딧 미확인 | 5:57.042 · MP3 256.0 kbps | -11.9 / +0.8 / -7.1 dB | [Commons](https://commons.wikimedia.org/wiki/File:Hickory_and_Twine_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/b/bb/Hickory_and_Twine_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 온기 07 | Like Seamus / Shades of Blue | 미확인 · 미확인 | 6:20.644 · MP3 183.6 kbps | -17.4 / +1.7 / -2.7 dB | [Commons](https://commons.wikimedia.org/wiki/File:Like_Seamus_-_Shades_of_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/6/67/Like_Seamus_-_Shades_of_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 온기 08 | It Suits Me / Shades of Blue | 미확인 · 미확인 | 8:35.959 · MP3 188.8 kbps | -17.5 / +2.2 / -3.2 dB | [Commons](https://commons.wikimedia.org/wiki/File:It_Suits_Me_-_Shades_of_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/b/b4/It_Suits_Me_-_Shades_of_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 온기 09 | Everyday Adventures / Airmen of Note | Ben Patterson · 별도 크레딧 미확인 | 8:15.020 · MP3 256.0 kbps | -12.6 / +0.6 / -6.4 dB | [Commons](https://commons.wikimedia.org/wiki/File:Everyday_Adventures_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/1/11/Everyday_Adventures_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 야경 01 | Convergence / Airmen of Note | Jeff Martin · 별도 크레딧 미확인 | 6:06.968 · MP3 256.0 kbps | -11.7 / +0.4 / -7.3 dB | [Commons](https://commons.wikimedia.org/wiki/File:Convergence_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/e/e9/Convergence_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 야경 02 | Sunk in Dars / Airmen of Note | Tyler Kuebler · 별도 크레딧 미확인 | 6:51.742 · MP3 256.0 kbps | -12.2 / +0.7 / -6.8 dB | [Commons](https://commons.wikimedia.org/wiki/File:Sunk_in_Dars_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/5/5a/Sunk_in_Dars_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 야경 03 | Stole Back My Soul / Airmen of Note | Alan Baylock · 별도 크레딧 미확인 | 8:15.830 · MP3 256.0 kbps | -10.8 / +0.9 / -8.2 dB | [Commons](https://commons.wikimedia.org/wiki/File:Stole_Back_My_Soul_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/8/85/Stole_Back_My_Soul_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 야경 04 | Intensities in Ten Cities / Airmen of Note | Alan Baylock · 별도 크레딧 미확인 | 7:33.120 · MP3 256.0 kbps | -11.8 / +1.3 / -7.2 dB | [Commons](https://commons.wikimedia.org/wiki/File:Intensities_in_Ten_Cities_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/d/d3/Intensities_in_Ten_Cities_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 야경 05 | Trombone Detritus / Airmen of Note | Ben Patterson · 별도 크레딧 미확인 | 6:47.667 · MP3 256.0 kbps | -11.7 / +0.2 / -7.3 dB | [Commons](https://commons.wikimedia.org/wiki/File:Trombone_Detritus_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/7/79/Trombone_Detritus_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 야경 06 | Underground / Airmen of Note | Tyler Kuebler · 별도 크레딧 미확인 | 8:57.731 · MP3 256.0 kbps | -12.6 / +0.1 / -6.4 dB | [Commons](https://commons.wikimedia.org/wiki/File:Underground_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/8/88/Underground_-_Airmen_of_Note_-_United_States_Air_Force_Band.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 야경 07 | Peekaboo / Shades of Blue | 미확인 · 미확인 | 6:28.063 · MP3 203.8 kbps | -16.3 / +2.3 / -3.3 dB | [Commons](https://commons.wikimedia.org/wiki/File:Peekaboo_-_Shades_of_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/9/9f/Peekaboo_-_Shades_of_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 야경 08 | Kuri / Shades of Blue | 미확인 · 미확인 | 4:25.706 · MP3 171.7 kbps | -19.5 / -2.4 / +0.0 dB | [Commons](https://commons.wikimedia.org/wiki/File:Kuri_-_Shades_of_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/b/b8/Kuri_-_Shades_of_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3) · 미국 공군 PD 표시 / 한국 미확정 |
| 야경 09 | Scarecrow / Shades of Blue | 미확인 · 미확인 | 4:17.660 · MP3 195.8 kbps | -15.5 / +2.3 / -3.5 dB | [Commons](https://commons.wikimedia.org/wiki/File:Scarecrow_-_Shades_of_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3) · [원본 MP3](https://upload.wikimedia.org/wikipedia/commons/8/8b/Scarecrow_-_Shades_of_Blue_-_United_States_Air_Force_Band_of_Mid-America.mp3) · 미국 공군 PD 표시 / 한국 미확정 |

## 음질과 재생

원본 MP3를 보관했다. FFmpeg가 파일 끝 Lyrics3 태그를 오디오 패킷으로 읽으며 헤더 오류를 낸 경우 해당 꼬리 태그만 제거했다. 오디오를 재인코딩하지 않았고, 원본과 개발 서버용 파일의 float PCM SHA-256 일치를 확인했다. 곡별 고정 감쇠는 -19 LUFS와 -1 dBTP를 목표로 적용했다. 고정 감쇠 후 계산상 통합 레벨은 −20.7~−19.0 LUFS다. 압축기·리미터는 사용하지 않았다. 0 dBTP를 넘는 원본은 MP3 디코딩 후 트루피크 초과이며, 녹음 원본 클리핑 여부나 잡음의 청감 평가와는 구분한다. −55 dB 이하가 2초 이상 지속된 구간은 곡 끝의 2.1~4.1초뿐이었다. 실청취로 판단할 소편성 여부, 밸런스와 잡음 평가는 미완료다.

## 원본 MP3 SHA-256

```text
687911405f1c80d176deb9c6d148bf1f599f086229d185a03538846427f51635  jazz-its-a-brand-new-day.mp3
4379865851e523e6b67163fe06677e78c85c61f774f42de896825ee2d2294da7  jazz-little-dreamer-big-dreams.mp3
887d41d68254f2b8cc28759ba0a7bea6199672b4a3ac6efabda5d05ef68f7f1d  jazz-blues-for-mundy.mp3
8a3fdaf37385732764996e3ae0579053e6da9aeef693352cf7359bcb3c243859  jazz-sakura.mp3
9f4cb52d41a412a798a95655f4d033bba9341f22deaeb770e842cbae5db23aa2  jazz-arirang.mp3
bfbfbad9dc67a94a9e88469301d2d0d47137fe887abaf970c4a2e396c92232f4  jazz-hickory-and-twine.mp3
cb8644d6c0d5598936678abfdec458eac100565123542adab1d556fd9c4fa512  jazz-like-seamus.mp3
3b15b33cbfa526f7a2624b5ab5bcb88db28f2c38bda8871901e55c76799bbc05  jazz-it-suits-me.mp3
e243ebc7537a3506d324501a8f73bad5760e1d89efa93ae620290984667ebb57  jazz-everyday-adventures.mp3
940f748e0841efd8ca959d6374a35ac71934947e82df7064ac09ca398c7a4deb  jazz-convergence.mp3
6087d022e1e123e8f3331bf7ee6be27611fe7e13971d952de838a5e51e73b328  jazz-sunk-in-dars.mp3
f4f269ce25c311fd6ae4024286df7a17b306390e70ecf5dc4dbcc1d835cfa04a  jazz-stole-back-my-soul.mp3
5d6ff81e3840f564e21ed22fb06b364defc5b543ca873ab33195b08f562d158e  jazz-intensities-in-ten-cities.mp3
0138606c691ba19b4841597ffc0189592d19ef1f7c62a53660f4c8041fcccf22  jazz-trombone-detritus.mp3
c50f04997fd00af9a12d8556f4942ae827f861ce0b90c2e92e12f9319eeb2127  jazz-underground.mp3
f25fa6c12be84b8c66152f3d9a5eeb61867323ccce7cfa536723f937b6e43554  jazz-peekaboo.mp3
8a3620d0860f9648df7e9fd4e2c5c1ce7b9bb908b0ad4530bdfa3c119bbd92fd  jazz-kuri.mp3
2200a5609b02963ee7e48bc87aee63061739c2daedc16a0ad52a077a9b4f826e  jazz-scarecrow.mp3
```
