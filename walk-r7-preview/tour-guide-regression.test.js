/* Run from walk-r7-preview: node tour-guide-regression.test.js
 * Tests UI localization with an isolated DOM stub: no browser permissions or network.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync(require('node:path').join(__dirname,'tour-guide.js'),'utf8');
class Elem {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attrs={};this.listeners={};this.style={};this._text='';this.value='';}
 append(...els){this.children.push(...els);}
 replaceChildren(...els){this.children=[...els];}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,cb){this.listeners[k]=cb;}
 dispatch(k){if(this.listeners[k])this.listeners[k]();}
 get options(){return this.children;}
 set textContent(v){this._text=String(v);}
 get textContent(){return this._text;}
}
const doc={createElement:(tag)=>new Elem(tag)};
const win={};
vm.runInNewContext(code,{document:doc,window:win});
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS',name);}
check('guide loads with six spots',()=>assert.equal(win.SUGR7TourGuide.locationsCount,6));
check('eight translated phrases exist',()=>assert.equal(win.SUGR7TourGuide.phrasesCount,8));
const root=new Elem('main');
win.SUGR7TourGuide.open({root,lang:'ja',nearestName:'大阪城'});
const [intro,note,controls,output,read,status,title,phraseSel,translated,translate,stop,warning]=root.children;
const lang=controls.children[0],spot=controls.children[1];
check('root has controls',()=>assert.equal(lang.tagName,'select'));
check('selected real spot',()=>assert.equal(spot.value,'castle'));
check('Japanese guidance',()=>assert.ok(output.textContent.includes('大阪城')));
check('Japanese phrase label',()=>assert.ok(title.textContent.includes('定型文')));
lang.value='en';lang.dispatch('change');
check('English interface',()=>assert.ok(intro.textContent.includes('Explore')));
check('English button',()=>assert.equal(read.textContent,'Read sightseeing guide'));
check('English translated phrase',()=>assert.equal(translated.textContent,'Hello.'));
check('English option labels',()=>assert.equal(phraseSel.options[0].textContent,'Hello.'));
phraseSel.value='1';phraseSel.dispatch('change');
check('phrase selection translates',()=>assert.equal(translated.textContent,'Could you show me the way?'));
lang.value='zh';lang.dispatch('change');
check('Chinese interface',()=>assert.ok(intro.textContent.includes('大阪')));
check('Chinese phrase with retained selection',()=>assert.equal(translated.textContent,'请问怎么走？'));
check('no network or AI backend activated',()=>assert.equal(win.SUGR7AIChat,undefined));
console.log('RESULT '+checks+'/'+checks+' isolated guide tests passed');
