/* Run from walk-r7-preview: node tourism-media-regression.test.js
 * Checks approval and URL guards without adding video or making network requests.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const raw=fs.readFileSync(path.join(__dirname,'tourism-media.js'),'utf8');
function load(rows){
 const src=raw.replace('const approved = Object.freeze({});','const approved = Object.freeze('+JSON.stringify(rows)+');');
 assert.notEqual(src,raw,'catalogue insertion must be found');
 const root={};vm.runInNewContext(src,{window:root});
 return root.SUGR7TourismMedia;
}
let passed=0;
function test(label,fn){fn();console.log('PASS',label);passed++;}
let cat=load({});
test('empty production catalog',()=>assert.equal(cat.chapters.length,0));
test('no fictitious video for ch1',()=>assert.equal(cat.get('ch1'),null));
test('unknown chapter returns null',()=>assert.equal(cat.get('ch6'),null));
cat=load({ch1:{approved:true,src:'./media/approved_clip-01.mp4',captionsReady:{ja:true}}});
test('approved local MP4 is exposed',()=>assert.equal(cat.get('ch1').src,'./media/approved_clip-01.mp4'));
test('captions flag preserved',()=>assert.equal(cat.get('ch1').captionsReady.ja,true));
test('nonexistent chapter rejected',()=>assert.equal(cat.get('ch2'),null));
test('unapproved asset rejected',()=>assert.equal(load({ch1:{approved:false,src:'./media/a.mp4'}}).get('ch1'),null));
test('remote HTTPS asset rejected',()=>assert.equal(load({ch1:{approved:true,src:'https://example.com/video.mp4'}}).get('ch1'),null));
test('path traversal rejected',()=>assert.equal(load({ch1:{approved:true,src:'./media/../private.mp4'}}).get('ch1'),null));
test('javascript path rejected',()=>assert.equal(load({ch1:{approved:true,src:'javascript:alert(1)'}}).get('ch1'),null));
test('non-mp4 rejected',()=>assert.equal(load({ch1:{approved:true,src:'./media/a.mov'}}).get('ch1'),null));
console.log('RESULT '+passed+'/'+passed+' tourism media contract tests passed');
