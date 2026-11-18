import {classifyAnalyticsCountry} from '../shared/analyticsPolicy';

// Explicit allowlists: new/unknown countries fail closed. Consent wins on overlap.
const AUTOMATIC=new Set(['KR']);
const CONSENT=new Set([
 'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
 'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH',
]);

// USPS state codes (50 states + DC, not US territories). Enable automatic
// collection for known non-CA locations only once this policy is approved.
const US_CONSENT=new Set(['CA']);
const US_STATES=new Set([
 'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
 'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
 'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]);
const NO_US_AUTOMATIC=new Set<string>();
const US_AUTOMATIC_APPROVED=true;

export function analyticsModeResponse(request:{
 method:string;headers:Headers;cf?:unknown,
},usAutomatic=US_AUTOMATIC_APPROVED):Response{
 const headers={'Cache-Control':'private, no-store','CDN-Cache-Control':'no-store'};
 if(request.method!=='GET')return new Response(null,{status:405,headers:{...headers,Allow:'GET'}});
 const privacy=request.headers.get('Sec-GPC')==='1'||request.headers.get('DNT')==='1';
 const cf=typeof request.cf==='object'&&request.cf!==null?request.cf:null;
 const country=cf&&'country' in cf?cf.country:null;
 const state=cf&&'regionCode' in cf?cf.regionCode:null;
 const mode=privacy?'off':country==='US'
  ?classifyAnalyticsCountry(state,usAutomatic?US_STATES:NO_US_AUTOMATIC,US_CONSENT)
  :classifyAnalyticsCountry(country,AUTOMATIC,CONSENT);
 return Response.json({mode},{headers});
}
