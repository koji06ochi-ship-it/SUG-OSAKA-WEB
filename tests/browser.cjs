const {chromium,webkit}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const results=[];
 for(const [name,engine,viewport] of [['desktop-chromium',chromium,{width:1440,height:1000}],['mobile-chromium',chromium,{width:390,height:844}]]){
  let browser;try{browser=await engine.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});}catch(e){results.push({name,status:'unavailable',error:e.message.split('\n')[0]});continue;}
  const context=await browser.newContext({viewport,isMobile:name.startsWith('mobile'),hasTouch:name.startsWith('mobile')});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const now=Date.now();let mode='active';
  const make=(id,type,age)=>({id,media_type:type,timestamp:new Date(now-age).toISOString(),media_url:`https://test.cdninstagram.com/${type==='VIDEO'?'video.mp4':'image.png'}`});
  await page.route('https://**/*',async route=>{
   const u=route.request().url();
   if(u.includes('/stories-data/stories.json'))return route.fulfill({json:{fetched_at:new Date(now).toISOString(),stories:mode==='empty'?[]:mode==='expired'?[make('3','IMAGE',86400001)]:[make('1','IMAGE',10000),make('2','VIDEO',5000)]},headers:{'access-control-allow-origin':'*'}});
   if(u.includes('test.cdninstagram.com'))return route.fulfill({path:u.endsWith('mp4')?'/tmp/sug-story-fixtures/video.mp4':'assets/logo.png',contentType:u.endsWith('mp4')?'video/mp4':'image/png'});
   return route.abort();
  });
  await page.goto('http://127.0.0.1:8765/');
  await page.locator('#sug-stories').waitFor({state:'visible'});
  await page.locator('#sug-stories').scrollIntoViewIfNeeded();
  await page.screenshot({path:`docs/${name}-entry.png`});
  await page.locator('.sug-story-entry').click();
  await page.waitForFunction(()=>document.querySelector('.sug-story-stage img')?.naturalWidth>0);
  assert.equal(await page.locator('[data-count]').textContent(),'1 / 2');
  await page.screenshot({path:`docs/${name}-viewer.png`});
  await page.locator('[data-next]').click();
  await page.waitForFunction(()=>document.querySelector('.sug-story-stage video')?.readyState>=2);
  assert.equal(await page.locator('video').last().getAttribute('playsinline'),'');
  await page.locator('[data-close]').click();
  assert.equal(await page.locator('#sug-story-viewer').getAttribute('open'),null);
  assert.equal(await page.evaluate(()=>document.activeElement.className),'sug-story-entry');
  for(const state of ['empty','expired']){mode=state;await page.reload();await page.waitForTimeout(300);assert.equal(await page.locator('#sug-stories').isVisible(),false);}
  mode='active';await page.reload();await page.locator('.sug-story-entry').click();
  await page.clock.install({time:now});await page.clock.fastForward(86400000);
  assert.equal(await page.locator('#sug-stories').isVisible(),false);
  assert.equal(await page.locator('#sug-story-viewer').getAttribute('open'),null);
  assert.equal(await page.locator('.sug-contact-form').count(),1);
  assert.equal(await page.locator('#price').count(),1);
  assert.ok(await page.locator('a[href="apps-tools.html"]').count()>0);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  assert.equal(overflow,false);assert.deepEqual(errors,[]);
  results.push({name,status:'passed',checks:['image fixture rendered','video fixture decoded','navigation','close and focus','no post hidden','24h expired hidden','open viewer expiry','form price apps link present','no horizontal overflow','no JS exception'],real_instagram:false,iphone_device:false});
  await browser.close();
 }
 fs.writeFileSync('docs/browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status!=='passed'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
