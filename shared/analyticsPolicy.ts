export type AnalyticsMode='auto'|'ask'|'off';
export const ANALYTICS_MODE_PATH='/api/analytics-mode';

export function classifyAnalyticsCountry(
 country:unknown,automatic:ReadonlySet<string>,consent:ReadonlySet<string>,
):AnalyticsMode{
 if(typeof country!=='string'||!/^[A-Z]{2}$/.test(country))return 'off';
 if(consent.has(country))return 'ask';
 return automatic.has(country)?'auto':'off';
}
