# 공연장 운영 대시보드

기존 공연장과 따로 실행합니다. 공개 공연장과 Cloudflare 배포에는 대시보드나 인증 정보가 포함되지 않습니다.

```sh
npm run ops
```

같은 컴퓨터에서 [http://127.0.0.1:5180](http://127.0.0.1:5180)을 엽니다. Node.js 22 이상이 필요합니다. 포트가 사용 중이면 `ops/.env`에 `OPS_PORT`를 지정하세요.

## Codex 설명

기간을 선택한 뒤 **Codex로 분석**을 누르면 관객의 재생과 감상에 어떤 영향이 관측됐는지, 영향이 불확실한 부분은 어떻게 확인할지 설명합니다. 이 컴퓨터의 Codex CLI와 기존 로그인을 사용합니다. CLI가 로그인되지 않았다면 터미널에서 `codex login`을 실행하세요. 실행 파일이 PATH에 없다면 `ops/.env`의 `OPS_CODEX_BIN`에 절대 경로를 지정한 뒤 대시보드를 다시 실행하세요.

버튼을 누를 때 방문·재생·사이트 상태의 선별된 집계와 조회 기간을 OpenAI로 전송합니다. 같은 조회 결과의 설명은 대시보드가 실행되는 동안 잠시 재사용합니다.

## 최초 연결

수집이 이미 설정돼 있다면 공연장에 추적 코드를 다시 설치할 필요는 없습니다. 이 화면이 각 서비스의 보고서를 읽을 수 있도록 조회 권한만 설정합니다.

```sh
cp -n ops/.env.example ops/.env
chmod 600 ops/.env
```

아래 값을 `ops/.env`에 채우고 `npm run ops`를 다시 실행합니다. 서비스 계정 JSON은 저장소 밖에 보관하고, 토큰이나 JSON 내용을 채팅에 붙여 넣지 마세요.

| 항목 | 설정 |
|---|---|
| Google Analytics | GA4 관리 화면에서 공연장 **속성 ID**(숫자)를 확인해 `GA4_PROPERTY_ID`에 넣습니다. `G-…` 측정 ID와 다릅니다. Google Cloud에서 Google Analytics Data API를 활성화하고 서비스 계정 이메일을 GA4 속성 액세스 관리의 **뷰어**로 추가합니다. 서비스 계정 키 JSON의 절대 경로를 `GOOGLE_APPLICATION_CREDENTIALS`에 지정합니다. |
| Cloudflare Workers | Cloudflare에서 대상 계정에만 **Account → Account Analytics → Read**를 부여한 API 토큰을 만들어 `CF_API_TOKEN`에 넣습니다. 운영 계정 ID와 대시보드에 표시되는 Worker 이름을 `CF_ACCOUNT_ID`, `CF_WORKER_NAME`에 넣습니다. 공연장 주소가 `*.workers.dev`여도 사용할 수 있습니다. |
| Cloudflare 도메인 HTTP (선택) | 자체 도메인을 Cloudflare에서 프록시하는 경우, 해당 Zone에 **Zone → Analytics → Read**를 추가하고 `CF_ZONE_ID`를 지정합니다. Zone 내 여러 사이트 중 공연장만 보려면 `CF_HOSTNAME`에 호스트를 넣습니다. `workers.dev`만 쓰는 경우에는 이 항목을 비워 둡니다. |
| Cloudflare Web Analytics (선택) | 계정 ID와 사이트 태그를 `CF_ACCOUNT_ID`, `CF_RUM_SITE_TAG`에 넣습니다. 설치용 비콘 토큰과 다릅니다. [Web Analytics 사이트 목록 API](https://developers.cloudflare.com/api/resources/rum/subresources/site_info/methods/list/)의 응답에서는 `site_tag`입니다. |
| 운영 상태 (선택) | 실제 공연장 HTTPS 주소의 출처(예: `https://your-venue.example.com`, 경로 제외)를 `OPS_SITE_URL`에 넣으면 대시보드에서 공연장의 `/api/health`를 확인합니다. |

공연장 전체에 해당하는 GA4 속성을 사용하세요. 여러 사이트가 같은 속성으로 수집되면 GA4 카드도 그 속성 전체를 보여줍니다. 방문 이벤트는 GA4에 실제 수집되는 이름 그대로 표시되며, 핵심 이벤트로 지정한 것만 핵심 이벤트 집계에 포함됩니다.

공식 설정 절차: [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart), [Cloudflare 조회 토큰](https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/).

## 운영자 방문 제외

이 기능이 적용된 공연장 주소 뒤에 `?visit-stats=off`를 붙여 한 번 엽니다. 이후 같은 브라우저 프로필에서는 방문·이용 시간·재생에 쓰이는 GA4 신호와 Cloudflare Web Analytics 신호를 보내지 않습니다. 다른 브라우저나 기기에서도 개별 설정이 필요합니다. `?visit-stats=on`으로 브라우저의 기본 통계 설정으로 돌아갈 수 있습니다.

적용 전 집계에는 소급되지 않습니다. Cloudflare의 HTTP 요청 수와 Worker 실행 수는 서버가 처리한 요청을 집계합니다.

## 숫자 읽는 법

- 첫 화면 상단에 GA4 활동한 방문자 수와 방문자당 평균 화면 이용 시간을 표시합니다. 그 아래에서 방문 흐름, 주요 유입 경로, 먼저 점검할 항목을 확인할 수 있습니다. 페이지·방문자 비교, Cloudflare, GA4 보고서는 상세 보고서에서 펼칩니다. 각 서비스의 날짜와 집계 단위는 상세에서 확인할 수 있습니다.
- **음악 감상은 얼마나 이어졌나요?**는 재생을 시작한 GA4 사용자 중 같은 방문에서 순서대로 누적 3분에 도달한 사용자 수를 보여줍니다. 기존 이벤트를 사용하며 건별 재생률과 단위가 다릅니다.
- **관객이 누른 공연장 기능**은 공연 선택, 좌석 지도, 음악 메뉴, 이동, 보기 모드 등 지정된 버튼의 실제 동작을 집계합니다. 새 이벤트는 공연장 배포 후부터 쌓입니다.
- GA4는 유입 소스·매체·UTM, 첫 방문 페이지, 참여와 주요 이벤트, 국가·기기·인구통계, 최근 30분 집계를 표시합니다. 구매·광고 수치는 GA4 속성에 해당 데이터가 들어올 때 표시합니다. 일부 인구통계·광고 집계는 Google이 개인정보 보호 기준에 따라 숨길 수 있습니다.
- Cloudflare Web Analytics는 유입 경로와 방문 환경, 페이지 로딩 단계, 기기·페이지·화면 요소별 성능과 등급 분포를 표시합니다. Worker 상세에서는 요청 수, 오류, 응답 시간, 상태 코드, 캐시 상태, 처리 위치 등을 볼 수 있습니다.
- 목록은 조회 기간에 집계된 상위 항목을 표시합니다. Cloudflare와 GA4에서 선택한 범위의 보고서를 새로 요청하며, 개별 방문 기록이나 원본 로그를 저장하지 않습니다.
- 첫 접속, 브라우저 새로고침, 기간 변경, 화면의 **새로고침** 버튼은 그 시점에 API를 다시 요청합니다. 조회 시각은 각 서비스에서 데이터가 수집된 시각과 다릅니다.
- 오늘 또는 최근 7·14·30일을 선택할 수 있으며 모든 기간은 오늘을 포함합니다. Cloudflare의 기간과 일별 추이는 한국시간 자정을 기준으로 집계합니다. GA4는 속성의 시간대를 따르며 현재 공연장 속성은 한국시간입니다. GA4 최근 30분 활성 사용자는 선택 기간과 관계없이 조회합니다. [GA4 데이터 처리 시간](https://support.google.com/analytics/answer/11198161?hl=ko) 때문에 일반 보고서의 오늘 수치는 나중에 바뀔 수 있습니다.
- GA4 활성 사용자, Cloudflare 도메인 요청, Worker 실행은 서로 다른 값입니다. 예를 들어 한 방문이 여러 요청을 만들 수 있습니다. Cloudflare 데이터셋은 플랜에 따라 사용 범위가 다르며 일부 집계는 표본 기반입니다.
- 운영 상태는 새로고침 시 이 컴퓨터에서 Worker API까지의 응답을 한 번 확인한 결과입니다. 이 수치로 기간 가동률이나 전체 3D 화면의 동작을 판단할 수는 없습니다.
- 연결 전이나 응답이 없을 때는 해당 영역에 상태를 표시합니다. 실제로 집계한 0과 구별됩니다.
