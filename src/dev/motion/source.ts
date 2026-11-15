/** Direct media only. Do not proxy arbitrary links through the concert Worker. */
export function videoURL(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error('완전한 http:// 또는 https:// 영상 주소를 입력해 주세요.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('인증 정보가 없는 HTTP(S) 영상 링크만 지원합니다.');
  if (/(^|\.)(youtube\.com|youtu\.be|instagram\.com|tiktok\.com|vimeo\.com)$/.test(url.hostname)) {
    throw new Error('이 주소는 영상 파일이 아닌 서비스 페이지입니다. 사용 권한이 있는 MP4를 내려받아 로컬 영상으로 선택해 주세요.');
  }
  return url.href;
}
