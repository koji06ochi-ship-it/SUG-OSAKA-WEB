/* S.u.G WALK R7: offline tour guide and fixed-phrase interpreter.
   No AI API is called, no credentials are stored, and no live travel times are fabricated. */
(function(){
'use strict';
const locations=[
 {key:'hachikenya',name:'八軒家浜',terms:['八軒家浜','八軒家'],descriptions:{
 ja:'八軒家浜は大川沿いの水辺エリアです。天満橋周辺から水辺の散策を楽しめます。船の運航状況や乗り場は公式案内をご確認ください。',
 en:'Hachikenyahama is a riverside area along the Okawa River near Temmabashi. Enjoy a walk beside the water. Check official information for boat services and boarding points.',
 zh:'八轩家滨位于大川沿岸，靠近天满桥。适合沿河散步。乘船地点及运行情况请查看官方公告。'}},
 {key:'hall',name:'大阪市中央公会堂',terms:['大阪市中央公会堂','中央公会堂'],descriptions:{
 ja:'大阪市中央公会堂は中之島にある歴史的な公共建築です。見学や催しの案内は施設の公式情報で確認してください。',
 en:'Osaka City Central Public Hall is a historic civic building on Nakanoshima. Check its official website for visits and events.',
 zh:'大阪市中央公会堂是位于中之岛的历史性公共建筑。参观与活动信息请查看官方网站。'}},
 {key:'castle',name:'大阪城',terms:['大阪城'],descriptions:{
 ja:'大阪城は大阪を代表する歴史的名所です。大阪城公園とあわせて散策できます。入館情報は公式サイトで確認してください。',
 en:'Osaka Castle is one of the city’s best-known historic landmarks. You can also explore Osaka Castle Park. Check the official site for admission information.',
 zh:'大阪城是大阪著名的历史地标，也可以游览大阪城公园。入馆信息请查看官方网站。'}},
 {key:'mint',name:'造幣博物館',terms:['造幣博物館','造幣局'],descriptions:{
 ja:'造幣博物館では貨幣の歴史に関する展示を紹介しています。公開日や見学条件は造幣局の公式案内で確認してください。',
 en:'The Mint Museum introduces the history of coins and currency. Check the Japan Mint’s official information for visiting days and conditions.',
 zh:'造币博物馆介绍钱币相关的历史。开放日期与参观条件请查看日本造币局官方信息。'}},
 {key:'park',name:'扇町公園',terms:['扇町公園'],descriptions:{
 ja:'扇町公園は大阪市北区の都市公園です。周辺には扇町駅や関西テレビがあります。',
 en:'Ogimachi Park is an urban park in Osaka’s Kita Ward, near Ogimachi Station and Kansai Television.',
 zh:'扇町公园位于大阪市北区，附近有扇町站和关西电视台。'}},
 {key:'nakanoshima',name:'中之島公園',terms:['中之島公園'],descriptions:{
 ja:'中之島公園は川に囲まれた中之島の都市公園です。水辺の風景を楽しめます。',
 en:'Nakanoshima Park is an urban park on an island between rivers, known for its waterfront setting.',
 zh:'中之岛公园位于河流环绕的中之岛，可欣赏滨水景色。'}}
];
const phrases=[
 {ja:'こんにちは',en:'Hello.',zh:'你好。'},
 {ja:'道を教えてください',en:'Could you show me the way?',zh:'请问怎么走？'},
 {ja:'近くの駅はどこですか？',en:'Where is the nearest station?',zh:'最近的车站在哪里？'},
 {ja:'船乗り場はどこですか？',en:'Where is the boat boarding point?',zh:'乘船地点在哪里？'},
 {ja:'おすすめの食事はありますか？',en:'Do you recommend somewhere to eat?',zh:'有什么推荐的餐厅吗？'},
 {ja:'一緒に歩きませんか？',en:'Would you like to walk together?',zh:'要一起散步吗？'},
 {ja:'ありがとうございます',en:'Thank you.',zh:'谢谢。'},
 {ja:'助けてください',en:'Please help me.',zh:'请帮帮我。'}
];
const languageNames={ja:'日本語',en:'English',zh:'中文'};
const voices={ja:'ja-JP',en:'en-US',zh:'zh-CN'};
function item(tag,text){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;}
function button(text,act){const b=item('button',text);b.type='button';b.style.cssText='background:#1e142d;color:#fff;border:1px solid #ff007f;border-radius:9px;padding:10px;font-size:13px;margin:4px 0;';b.addEventListener('click',act);return b;}
function speak(text,language){
 if(!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined')return false;
 speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=voices[language];u.rate=0.93;speechSynthesis.speak(u);return true;
}
function open(opts){
 const root=opts.root;if(!root)return;
 root.replaceChildren();
 const heading=item('p','観光案内：登録済みスポットの説明を3言語で表示します。音声は端末の読み上げ機能を使用します。');root.append(heading);
 const note=item('p','実AIの自由会話・自由文翻訳は未接続です。運行時刻や料金などの最新情報は表示しません。');note.style.cssText='font-size:12px;color:#ffd0e9';root.append(note);
 const controls=item('div');const lang=item('select');lang.setAttribute('aria-label','案内言語');lang.style.cssText='width:100%;padding:10px;background:#171427;color:white;border:1px solid #ff007f;border-radius:8px';
 for(const [id,label] of Object.entries(languageNames)){const o=item('option',label);o.value=id;lang.append(o);}
 lang.value=languageNames[opts.lang]?opts.lang:'ja';controls.append(lang);
 const spot=item('select');spot.setAttribute('aria-label','観光スポット');spot.style.cssText=lang.style.cssText+';margin-top:8px';
 locations.forEach(l=>{const o=item('option',l.name);o.value=l.key;spot.append(o);});
 const nearest=opts.nearestName||'';
 const match=locations.find(l=>l.terms.some(t=>nearest.includes(t)));if(match)spot.value=match.key;
 controls.append(spot);root.append(controls);
 const output=item('div');output.style.cssText='border:1px solid #70415f;border-radius:12px;padding:12px;margin:10px 0;white-space:pre-wrap;line-height:1.55';root.append(output);
 const speakBtn=button('案内を読み上げる',()=>{if(!speak(output.textContent,lang.value))status.textContent='この端末は読み上げ非対応です。';});root.append(speakBtn);
 const status=item('p');status.style.cssText='font-size:12px';root.append(status);
 function update(){const l=locations.find(p=>p.key===spot.value);output.textContent=l.descriptions[lang.value]||l.descriptions.ja;}
 lang.addEventListener('change',()=>{update();drawPhrases();});spot.addEventListener('change',update);update();
 const title=item('h3','定型文通訳（3言語）');title.style.marginTop='18px';root.append(title);
 const phraseSel=item('select');phraseSel.setAttribute('aria-label','通訳する定型文');phraseSel.style.cssText=lang.style.cssText;
 phrases.forEach((p,i)=>{const o=item('option',p.ja);o.value=String(i);phraseSel.append(o);});root.append(phraseSel);
 const translated=item('div');translated.style.cssText='padding:12px;margin:10px 0;border:1px solid #70415f;border-radius:10px;white-space:pre-wrap';root.append(translated);
 function drawPhrases(){const p=phrases[Number(phraseSel.value)]||phrases[0];translated.textContent=p[lang.value];}
 phraseSel.addEventListener('change',drawPhrases);drawPhrases();
 root.append(button('翻訳した定型文を読み上げる',()=>{if(!speak(translated.textContent,lang.value))status.textContent='読み上げは利用できません。';}));
 root.append(button('読み上げ停止',()=>{if('speechSynthesis' in window)speechSynthesis.cancel();}));
 const warning=item('p','※定型文は事前翻訳です。任意の文章のAI翻訳ではありません。');warning.style.cssText='font-size:11px;opacity:.8';root.append(warning);
 if(window.SUGR7Auth)window.SUGR7Auth.mount(root,lang.value);
 if(window.SUGR7AIChat)window.SUGR7AIChat.mount(root,lang.value);
}
window.SUGR7TourGuide={open,locationsCount:locations.length,phrasesCount:phrases.length};
})();