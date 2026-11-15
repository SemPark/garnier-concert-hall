import {useId} from 'react';
import type {TarotCard} from './TarotCardFrame';

/** A shared, resolution-independent botanical frame. The illustration stays a separate image. */
export function TarotFrameOrnament({card}:{card:TarotCard}){
 const id=useId().replace(/:/g,'');
 const ref=(name:string)=>`#${id}-${name}`;
 return <svg className="tarot-frame-ornament" viewBox="0 0 600 1000" fill="none" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="600" y2="1000" gradientUnits="userSpaceOnUse">
    <stop stopColor="#fbf3df"/><stop offset=".52" stopColor="#e9ddbf"/><stop offset="1" stopColor="#f7edda"/>
   </linearGradient>
   <linearGradient id={`${id}-petal`} x1="0" y1="-35" x2="8" y2="18" gradientUnits="userSpaceOnUse">
    <stop stopColor="#f7eee9"/><stop offset=".65" stopColor="#dcd4df"/><stop offset="1" stopColor="#a7a6ba"/>
   </linearGradient>
   <g id={`${id}-leaf`} stroke="#747861" strokeWidth="1.2">
    <path d="M0 0C-19-8-24-27-15-42C0-38 10-16 0 0Z" fill="#aeb69a"/>
    <path d="M0 0Q-12-22-15-42M-6-13-17-18M-9-23-3-29"/>
   </g>
   <g id={`${id}-flower`} stroke="#787180" strokeWidth="1.15">
    {[0,60,120,180,240,300].map(angle=><g key={angle} transform={`rotate(${angle})`}>
     <path d="M0 5C-8-1-23-9-23-21C-24-33-13-39-5-35C1-44 14-37 16-27C20-15 7-3 0 5Z" fill={`url(${ref('petal')})`}/>
     <path d="M0 0Q-8-16-7-29M-3-6Q-16-17-17-25M2-7Q8-19 8-28" strokeWidth=".7" opacity=".65"/>
    </g>)}
    <circle r="10" fill="#d7c195"/>
    {[0,45,90,135,180,225,270,315].map(angle=><g key={angle} transform={`rotate(${angle})`}><path d="M0-5V-12"/><circle cy="-12" r="1.6" fill="#867061"/></g>)}
    <circle r="4" fill="#8e7b72"/>
   </g>
   <g id={`${id}-lily`} stroke="#88806c" strokeWidth="1.2" strokeLinejoin="round">
    <path d="M0 7C-17-4-28-13-34-34C-17-33-4-24 0-5C-6-23-4-39 6-52C17-35 17-17 5-2C18-24 30-29 43-27C35-9 23 3 7 7C26 4 35 11 39 23C23 24 11 18 3 11C-2 25-13 31-28 28C-26 12-17 5 0 7Z" fill="#f3edd9"/>
    <path d="M2 8Q-15-14-27-27M3 5Q8-21 6-42M5 8Q23-10 34-21M4 10Q22 13 31 19M1 10Q-14 14-21 23" strokeWidth=".8"/>
    <path d="M2 9-8-12M3 9 7-14M4 9 17-7" stroke="#a58b50"/>
    <g fill="#b59854"><ellipse cx="-8" cy="-12" rx="2" ry="4" transform="rotate(-24 -8 -12)"/><ellipse cx="7" cy="-14" rx="2" ry="4"/><ellipse cx="17" cy="-7" rx="2" ry="4" transform="rotate(30 17 -7)"/></g>
   </g>
   <g id={`${id}-vine`} strokeLinecap="round" strokeLinejoin="round">
    <path d="M35 802C74 731 2 692 33 629S74 539 32 472S4 366 35 307S64 213 31 160" stroke="#e7dbb5" strokeWidth="8"/>
    <path d="M35 802C74 731 2 692 33 629S74 539 32 472S4 366 35 307S64 213 31 160" stroke="#7f806e" strokeWidth="1.4"/>
    <path d="M29 733C-4 718 12 685 29 699C40 709 23 722 20 711M39 584C73 567 55 537 42 552C31 564 45 573 49 562M29 420C-2 400 9 370 27 383C40 392 27 409 19 397M40 252C71 236 51 202 38 217C27 229 41 239 47 227" stroke="#eadbb3" strokeWidth="5"/>
    <path d="M29 733C-4 718 12 685 29 699C40 709 23 722 20 711M39 584C73 567 55 537 42 552C31 564 45 573 49 562M29 420C-2 400 9 370 27 383C40 392 27 409 19 397M40 252C71 236 51 202 38 217C27 229 41 239 47 227" stroke="#7f806e" strokeWidth="1.2"/>
    <use href={ref('leaf')} transform="translate(34 770) rotate(32) scale(.85)"/>
    <use href={ref('leaf')} transform="translate(30 659) rotate(-42) scale(.8)"/>
    <use href={ref('leaf')} transform="translate(38 521) rotate(30) scale(.9)"/>
    <use href={ref('leaf')} transform="translate(29 339) rotate(-45) scale(.75)"/>
    <use href={ref('leaf')} transform="translate(36 190) rotate(38) scale(.8)"/>
    {[289,451,612,781].map(y=><g key={y}><circle cx="26" cy={y} r="5" fill="#f3ead7" stroke="#777b80" strokeWidth="1"/><circle cx="24.5" cy={y-1.5} r="1.4" fill="#fff9eb"/></g>)}
   </g>
   <g id={`${id}-top-scroll`} stroke="#808074" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M37 110C43 41 142 26 218 39C191 51 177 73 173 103C148 99 111 109 76 134C80 110 96 88 120 78C147 67 163 77 154 91C146 104 128 95 134 86C112 85 91 112 93 128C135 116 170 113 202 119C189 90 213 60 237 43L244 27C142 9 64 26 37 110Z" fill="#c1ccd0"/>
    <path d="M70 87C99 52 153 41 204 43M103 121Q159 101 188 110M170 61C155 49 177 37 181 48C185 58 173 60 172 53"/>
    <path d="M67 52Q117 16 168 31" stroke="#f6eed9" strokeWidth="3"/>
   </g>
  </defs>
  {/* The open centre reveals the complete 2:3 illustration, without an oval crop. */}
  <path fill={`url(${ref('paper')})`} fillRule="evenodd" d="M40 4H560Q596 4 596 40V960Q596 996 560 996H40Q4 996 4 960V40Q4 4 40 4ZM56 122V854H544V122Z"/>
  <path fill="#b8c4ca" fillRule="evenodd" d="M42 20H558Q580 20 580 42V958Q580 980 558 980H42Q20 980 20 958V42Q20 20 42 20ZM56 122V854H544V122Z"/>
  <rect x="10" y="10" width="580" height="980" rx="31" stroke="#81765e" strokeWidth="2.2"/>
  <rect x="19" y="19" width="562" height="962" rx="25" stroke="#727c7e" strokeWidth="1.3"/>
  <rect x="53" y="119" width="494" height="738" stroke="#f4e8c7" strokeWidth="9"/>
  <rect x="53" y="119" width="494" height="738" stroke="#827961" strokeWidth="1.4"/>
  <use href={ref('vine')}/><use href={ref('vine')} transform="translate(600) scale(-1 1)"/>
  <use href={ref('top-scroll')}/><use href={ref('top-scroll')} transform="translate(600) scale(-1 1)"/>
  <path d="M209 30Q300 12 391 30C367 46 355 74 360 105Q300 119 240 105C245 74 233 46 209 30Z" fill={`url(${ref('paper')})`} stroke="#827961" strokeWidth="1.8"/>
  <path d="M224 34Q300 21 376 34M249 100Q300 109 351 100" stroke="#b6a27a" strokeWidth="1"/>
  <text x="300" y="82" textAnchor="middle" className="tarot-frame-number">{card.number}</text>
  <g>
   <use href={ref('leaf')} transform="translate(71 85) rotate(-65) scale(1.25)"/>
   <use href={ref('leaf')} transform="translate(74 100) rotate(42) scale(1.1)"/>
   <use href={ref('flower')} transform="translate(63 83) scale(1.03)"/>
   <use href={ref('flower')} transform="translate(129 114) scale(.48) rotate(20)"/>
   <use href={ref('leaf')} transform="translate(528 109) rotate(66) scale(1.2)"/>
   <use href={ref('leaf')} transform="translate(536 73) rotate(-34) scale(.9)"/>
   <use href={ref('lily')} transform="translate(531 94) rotate(-12) scale(.96)"/>
   <use href={ref('flower')} transform="translate(467 114) scale(.48) rotate(20)"/>
   <use href={ref('flower')} transform="translate(30 480) scale(.48)"/>
   <use href={ref('flower')} transform="translate(570 354) scale(.48)"/>
  </g>
  <path d="M22 927C83 829 187 838 300 863C413 838 517 829 578 927L578 959Q300 905 22 959Z" fill="#c1ccd0" stroke="#7f806e" strokeWidth="1.5"/>
  <path d="M40 931C86 870 153 868 204 883M560 931C514 870 447 868 396 883" stroke="#f1e5c5" strokeWidth="7"/>
  <path d="M40 931C86 870 153 868 204 883M560 931C514 870 447 868 396 883" stroke="#7f806e" strokeWidth="1.2"/>
  <use href={ref('leaf')} transform="translate(57 897) rotate(-48) scale(1.15)"/>
  <use href={ref('leaf')} transform="translate(61 848) rotate(42) scale(1.25)"/>
  <use href={ref('flower')} transform="translate(46 843) scale(1.05) rotate(15)"/>
  <use href={ref('flower')} transform="translate(70 898) scale(.72)"/>
  <use href={ref('leaf')} transform="translate(546 879) rotate(60) scale(1.1)"/>
  <use href={ref('leaf')} transform="translate(545 843) rotate(-35) scale(1.05)"/>
  <use href={ref('lily')} transform="translate(549 840) rotate(18) scale(1.05)"/>
  <use href={ref('lily')} transform="translate(531 908) rotate(-24) scale(.7)"/>
  {/* Folded title ribbon, all lettering remains live text from the approved catalogue. */}
  <path d="M106 879L46 897L64 925L45 954L129 942L145 913M494 879L554 897L536 925L555 954L471 942L455 913" fill="#ded0af" stroke="#81765e" strokeWidth="1.8"/>
  <path d="M106 879L129 942L146 920M494 879L471 942L454 920" fill="#a6997f" stroke="#81765e" strokeWidth="1.3"/>
  <path d="M96 876Q300 832 504 876L489 936Q300 901 111 936Z" fill={`url(${ref('paper')})`} stroke="#81765e" strokeWidth="2"/>
  <path d="M108 882Q300 844 492 882M119 927Q300 896 481 927" stroke="#c7b68b" strokeWidth="1"/>
  <text x="300" y="902" textAnchor="middle" className="tarot-frame-title" fontSize={card.nameEn.length>18?25:card.nameEn.length>13?29:35}>{card.nameEn.toUpperCase()}</text>
  <g stroke="#838270" strokeWidth="1.3" fill="#e3d4ab">
   <path d="M269 966C241 945 209 950 204 964C200 977 221 981 226 969C230 958 214 956 215 965C230 955 247 966 252 976Z"/>
   <path d="M331 966C359 945 391 950 396 964C400 977 379 981 374 969C370 958 386 956 385 965C370 955 353 966 348 976Z"/>
   <path d="M300 952L312 967L300 982L288 967Z" fill="#f2e9d3"/>
   <circle cx="276" cy="966" r="4" fill="#f6edda"/><circle cx="324" cy="966" r="4" fill="#f6edda"/>
  </g>
 </svg>;
}
