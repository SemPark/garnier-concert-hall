// These suites exercise a browser-selected classical layout in a Node test process.
Object.defineProperty(globalThis, 'location', {
 configurable:true,
 value:{search:'?hall=classic'},
});
