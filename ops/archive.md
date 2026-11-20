# 일별 분석 보관

Node.js 22.13 이상에서 GA4와 Google Search Console의 일별 집계를 SQLite 파일에 보관합니다. 기본 경로는 `~/.concert-hall/analytics.sqlite`입니다. 다른 경로를 쓰려면 대시보드와 가져오기 명령 양쪽에 동일한 `OPS_ARCHIVE_PATH` 환경 변수를 지정하세요. 파일은 자동 만료되지 않습니다.

### 무료 CSV 가져오기

1. Search Console의 검색 실적에서 대상 사이트와 기간을 선택하고 CSV로 내보냅니다. 압축을 풀고 날짜별 표를 선택하세요. GA4에서는 공연장 속성의 날짜별 전체 집계 표를 CSV로 내보냅니다.
2. 첫 행에는 날짜와 필요한 지표 열만 남깁니다. 날짜는 YYYY-MM-DD 또는 YYYYMMDD 형식입니다. 날짜당 한 행만 허용합니다. 범위 합계 행과 추가 차원 열을 제거하세요. 같은 출처에 여러 속성이나 다른 필터의 집계를 섞으면 해당 날짜의 값이 덮어써집니다.
3. 프로젝트 루트에서 아래 명령을 실행합니다. 가져오기는 로컬 파일만 사용합니다.

```sh
node ops/archive.mjs gsc "/path/to/Dates.csv"
node ops/archive.mjs ga4 "/path/to/ga4-daily.csv"
```

| 출처 | 지원 열 이름 |
| --- | --- |
| GA4 | Date, Active users, Sessions, Views, Event count |
| Search Console | Date, Clicks, Impressions, CTR, Position |

날짜, 활성 사용자, 세션수, 조회수, 이벤트 수, 클릭수, 노출수, 클릭률, 평균 게재순위 등 한국어 제목도 지원합니다. CTR은 백분율(예: 2.5%) 또는 비율(0.025) 형식입니다. 빈 값은 건너뛰며 0은 측정값으로 보관합니다. 기존 날짜를 다시 가져오면 제공한 지표만 갱신됩니다. 내보내지 않은 날짜와 열은 비어 있습니다. Google 서비스에서 조회 가능한 기간 안에 정기적으로 가져오면 로컬에서 더 오래 보관할 수 있습니다.

### Search Console 검색어 보고서

Search Console 검색 실적에서 공연장 속성과 기간을 선택하고 내보낸 파일 중 `Queries.csv` 또는 검색어 표를 사용합니다. 내보내기에 적용된 실제 시작·마지막 날짜를 함께 입력하세요.

```sh
node ops/search-queries.mjs 2026-11-01 2026-11-07 "/path/to/Queries.csv"
```

검색어와 클릭수·노출수·CTR·평균 게재순위를 로컬에 보관합니다. 대시보드에서 같은 시작일과 마지막 날짜를 선택하면 **공유·홍보**에 조회됩니다. 날짜별 내역을 포함하지 않는 검색어 표이므로 부분 기간으로 나누거나 겹치는 기간을 더하지 않습니다. 같은 기간을 다시 가져오면 기존 표를 교체합니다. 같은 속성과 같은 검색 필터로 내보낸 파일을 사용하세요. 기본 저장 위치는 `~/.concert-hall/search-queries.sqlite`이며 대시보드와 CLI 양쪽의 `OPS_SEARCH_QUERIES_PATH`로 변경할 수 있습니다.

### 업데이트 전후 비교

실제 배포·음악·홍보·측정 변경을 기록하려면 로컬 `~/.concert-hall/changes.json`에 배열로 저장합니다. 각 항목은 실제 날짜 `date`(YYYY-MM-DD), `kind`(배포, 음악, 홍보, 측정 중 하나), `label`(변경 내용)을 갖습니다. `OPS_CHANGES_FILE`로 경로 변경이 가능합니다. 해당 날짜가 포함된 기간을 선택하면 **업데이트 비교**에서 변경일 전후 각 7일 동안 보관한 날짜의 평균 세션 수와 관측 일수를 보여줍니다. 변경일 자체는 제외합니다.
