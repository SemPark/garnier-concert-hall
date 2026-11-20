import {browserAnalyticsExcluded} from './browserExclusion';

if (!browserAnalyticsExcluded()) {
 const beacon = document.createElement('script');
 beacon.defer = true;
 beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
 beacon.setAttribute('data-cf-beacon', JSON.stringify({token:'cb5b0e6cfc554953b7d9be34b67f2fdc'}));
 document.head.append(beacon);
}
