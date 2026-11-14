import cards from '../../shared/tarotCards.json';

const sampleFiles:Record<number,string>={16:'xvi-tower',17:'xvii-star',19:'xix-sun'};
export const tarotDeck=cards.map(card=>({
 card,
 src:`${import.meta.env.BASE_URL}images/tarot/${sampleFiles[card.id]?`samples/${sampleFiles[card.id]}`:`deck/${card.id}`}.webp`,
}));

function uniformIndex(size:number){
 const bound=2**32;
 const limit=bound-bound%size;
 const value=new Uint32Array(1);
 do{crypto.getRandomValues(value);}while(value[0]>=limit);
 return value[0]%size;
}

/** Three uniformly dealt, distinct cards. Each face-down position is equally likely to hold any card. */
export function dealTarot(){
 const remaining=[...tarotDeck];
 return Array.from({length:3},()=>remaining.splice(uniformIndex(remaining.length),1)[0]);
}
