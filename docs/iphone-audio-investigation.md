# iPhone 13 Pro 화면·음악 끊김 조사

## 장치와 검사 한계

Apple 공식 사양은 A15 Bionic, 6코어 CPU(성능 2+효율 4), 5코어 GPU, 2532×1170 화면, 최대 120Hz ProMotion이다. 이 사양만으로 현재 장면의 프레임 예산을 초과한다고 판정할 수 없다. 60FPS의 프레임 예산은 약 16.7ms다. 사용자 기기에서 CPU 처리·GPU 실행·음원 이벤트를 함께 봐야 한다.

- https://support.apple.com/en-ie/111871
- https://developer.chrome.com/docs/web-platform/blink (iOS Chrome은 WebKit 사용)
- https://webkit.org/web-inspector/timelines-tab/
- https://html.spec.whatwg.org/multipage/media.html#dom-media-currenttime

사용자는 Mac mini의 공개/로컬 사이트는 정상이며 iPhone 13 Pro Chrome에서는 와이파이와 셀룰러 모두 끊긴다고 보고했다. iOS 버전은 아직 미확인이다. Ego Chromium의 모바일 화면·CPU 제한은 iPhone의 A15 GPU나 WebKit 재현이 아니다. 개발 도구에서 연결된 iPhone을 검사할 devicectl도 사용할 수 없으므로 실기기 성능 해결을 주장하지 않는다.

## 재현된 음원 제어 결함 (기존 da0aa9e)

공개 GitHub Pages 주소에 접속하여 실제 HTMLMediaElement의 currentTime 설정과 waiting / seeking / seeked / playing 이벤트를 기록했다. 페이지 로드 후 통신 지연 400ms, 다운로드/업로드 각각 64,000 bytes/s를 설정했다. 모바일 390×844, DPR 3, 터치 경로다. 이 통신 조건은 원인 분리를 위한 실험이며 사용자의 실제 네트워크라고 가정하지 않는다.

16초 관찰에서 재생 위치를 총 5회 설정했다:

| 페이지 시작 후(ms) | 이동 목표(초) | 이전 이동 진행 중 | readyState |
| ---: | ---: | --- | ---: |
| 3106 | 27.507 | 아니오 | 4 |
| 3271 | 27.672 | 예 | 1 |
| 3838 | 28.239 | 예 | 1 |
| 4406 | 28.806 | 예 | 1 |
| 4572 | 28.973 | 아니오 | 4 |

첫 이동이 완료되기도 전에 3회 덮어썼고, seeked/canplay 직후 다시 이동했다. 기존 코드는 waiting/stalled/seeked/canplay를 모두 강제 보정 요청으로 처리하고, 매 렌더 프레임에서 0.15초/0.55초 오차 기준으로 currentTime을 다시 설정했다. 버퍼링 상태·이미 진행 중인 탐색을 확인하지 않았다. HTML 표준상 currentTime 설정은 실제 탐색을 시작하므로, 이것은 단순한 표시 값 업데이트가 아니다.

이 실험에서 장면은 30FPS를 유지했고, 5회의 탐색과 관련된 waiting 이벤트가 확인됐다. 음원의 재생 제어 결함은 재현되었지만, 사용자의 모든 끊김이 이 원인이라는 결론은 아니다.

음원 자체는 5,647,004 bytes, 239.938292초, 48kHz stereo MP3, 평균 약 188kbps이며 ffmpeg 전체 디코딩 검사에 오류가 없었다. 공개 URL의 Range bytes=1000000-1001023 요청은 206 / Content-Length 1024 / Content-Range bytes 1000000-1001023/5647004로 정상 응답했다. 사용자 네트워크 전체의 정상 동작까지 입증하는 검사는 아니다.

## 수정과 실기기 진단

- 초기 입장·곡 변경·다시 활성화할 때 한 번 정렬한다.
- 진행 중인 탐색을 덮어쓰지 않고, 버퍼링 이벤트나 seeked/canplay가 새로운 탐색을 요청하지 않게 한다.
- 재생이 안정된 뒤에도 2초 이상의 오차가 3초 이상 유지되고 목표 위치가 버퍼에 있는 경우만 재정렬한다. 재정렬 간격은 최소 15초다. 재생 속도는 변경하지 않는다.
- 음원 제어를 렌더 루프에서 분리해 100ms 타이머로 구동한다. 타이머도 메인 스레드에서 실행되므로 독립 스레드라고 주장하지 않는다. HTMLMediaElement가 연속 재생하도록 불필요한 탐색을 제거하는 것이 핵심이다.
- 화질·모델·해상도·프레임 제한은 이번 음원 수정에서 추가 축소하지 않는다.
- 설정의 `끊김 진단 · 30초`로 동일 기기에서 정상 화면, 그리기만 중지, 3D 갱신 없이 음악만 재생을 각각 10초 비교한다. 재생 시간·버퍼·waiting/seeking 이벤트, 렌더 FPS, 샘플링한 JS 처리/렌더 제출 시간, 지원되는 경우 long task를 기록한다. GPU 실행 시간을 직접 측정한 값은 아니다.
- 결과는 기기에만 생성하며 자동 업로드하지 않는다. 복사하여 공유할 수 있다. 진단 후 원래 장면으로 돌아오고 화질 설정도 변경하지 않는다.
