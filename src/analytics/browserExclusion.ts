const preferenceKey = 'pleee-visit-stats';
const parameter = 'visit-stats';

export function browserAnalyticsExcluded(browser: Pick<Window, 'location' | 'localStorage' | 'history'> = window) {
 const url = new URL(browser.location.href);
 const requested = url.searchParams.get(parameter);
 try {
  const storage = browser.localStorage;
  if (requested === 'off') storage.setItem(preferenceKey, 'off');
  else if (requested === 'on') storage.removeItem(preferenceKey);
  const excluded = storage.getItem(preferenceKey) === 'off';
  if (requested === 'off' || requested === 'on') {
   url.searchParams.delete(parameter);
   try { browser.history.replaceState(browser.history.state, '', url); }
   catch { /* The preference still applies if the URL cannot be updated. */ }
  }
  return excluded;
 } catch {
  // The explicit exclusion still applies to this page when persistent storage is disabled.
  return requested === 'off';
 }
}
