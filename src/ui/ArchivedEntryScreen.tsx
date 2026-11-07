import titleArtwork from '../assets/brand/pleee-title.png';

/** Saved welcome page; not part of the automatic hall entry flow. */
export function ArchivedEntryScreen({ready,onEnter}:{ready:boolean;onEnter:()=>void}){
 return (<section className="entry-screen" aria-label="음악당 입장" onClick={onEnter}>
   <svg className="entry-print-filter" width="0" height="0" aria-hidden="true" focusable="false">
    <defs><filter id="entry-print-grain" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
     <feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" seed="7" result="paperNoise"/>
     <feColorMatrix in="paperNoise" type="saturate" values="0"/>
     <feComponentTransfer result="printGrain">
      <feFuncR type="linear" slope=".28" intercept=".72"/><feFuncG type="linear" slope=".28" intercept=".72"/><feFuncB type="linear" slope=".28" intercept=".72"/><feFuncA type="linear" slope="0" intercept="1"/>
     </feComponentTransfer>
     <feBlend in="SourceGraphic" in2="printGrain" mode="multiply"/>
     <feComposite in2="SourceGraphic" operator="in"/>
    </filter></defs>
   </svg>
   <div className="entry-heading">
    <h1 className="entry-title-card">
     <img className="entry-title-art" src={titleArtwork} alt="플리 · 모두의 플레이리스트" width="1448" height="1086" fetchPriority="high"/>
    </h1>
   </div>
   <button className="entry-orb" aria-label="음악당 들어가기" onClick={e=>{e.stopPropagation();onEnter();}} disabled={!ready}>
    <svg className="tap-hand" viewBox="0 0 88 88" aria-hidden="true"><path className="tap-outline" d="M30 43V20c0-7 10-7 10 0v18-2c0-6 10-6 10 0v5-2c0-6 10-6 10 0v7-1c0-6 9-6 9 0v9c0 13-8 21-20 21h-4c-7 0-11-4-15-9L17 48c-5-6 2-12 7-7l6 6Z"/><path className="tap-rays" d="M35 7V3M23 12l-4-4M47 12l4-4M19 23h-5M51 23h5"/></svg>
   </button>
   <span className="entry-instruction">{ready?'탭하여 입장':'음악당을 준비하고 있어요'}</span>
  </section>);
}
