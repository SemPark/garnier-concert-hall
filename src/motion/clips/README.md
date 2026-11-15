검토한 개발 도구 출력 JSON만 이 폴더에 넣는다. `id: "captain"`인 파일은 기존 선장춤을 대체한다.
원본 영상·랜드마크·MediaPipe 모델은 이 폴더에 넣지 않는다. 다른 ID는 재사용 가능한
`applyMotion(avatar, clip, seconds)` API로 재생하며, 새 공연장 동작 등록은 공유 dance 규약에서 수행한다.
