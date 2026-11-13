import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize, activeFeed, DAY} from '../stories-core.mjs';
import {collect} from '../scripts/fetch-stories.mjs';
const now=Date.parse('2026-11-13T12:00:00Z');
const item={id:'123',timestamp:new Date(now-1000).toISOString(),media_type:'IMAGE',media_url:'https://scontent.cdninstagram.com/a.jpg'};
test('24h boundary, invalid/future dates, duplicate and ordering',()=>{
 const older={...item,id:'124',timestamp:new Date(now-DAY+1).toISOString()};
 assert.deepEqual(normalize([item,older,item,{...item,id:'125',timestamp:new Date(now-DAY).toISOString()},{...item,id:'126',timestamp:'bad'},{...item,id:'127',timestamp:new Date(now+1).toISOString()}],now).map(x=>x.id),['124','123']);
});
test('empty and stale fail closed; expiry is derived, not trusted',()=>{
 assert.deepEqual(activeFeed({stories:[item]},now),[]);
 assert.deepEqual(activeFeed({fetched_at:new Date(now-1800000).toISOString(),stories:[item]},now),[]);
 assert.deepEqual(normalize([],now),[]);
 assert.equal(normalize([{...item,expires_at:'2099-01-01'}],now)[0].expires_at,new Date(now-1000+DAY).toISOString());
});
test('reject unsafe hosts, credentials and access tokens; missing video fallback',()=>{
 for(const url of ['javascript:alert(1)','https://evil.com/a','https://cdninstagram.com.evil.com/a','https://u:p@cdninstagram.com/a','https://cdninstagram.com/a?access_token=secret'])assert.equal(normalize([{...item,media_url:url}],now)[0].media_url,'');
 assert.equal(normalize([{...item,media_type:'VIDEO',media_url:null}],now)[0].media_url,'');
});
const env={INSTAGRAM_ACCESS_TOKEN:'TEST_SECRET_DO_NOT_PUBLISH',INSTAGRAM_USER_ID:'42',INSTAGRAM_LOGIN_MODE:'facebook',INSTAGRAM_API_VERSION:'v27.0'};
test('collector validates account, uses bearer header and safe paging, whitelists output',async()=>{
 const calls=[];const responses=[{id:'42',username:'ko_ji.sug'},{data:[{...item,secret:'private'}],paging:{next:'https://evil.test/?access_token=bad',cursors:{after:'cursor'}}},{data:[]}];
 const feed=await collect(env,async(u,o)=>{calls.push([String(u),o]);return {ok:true,json:async()=>responses.shift()};},now);
 assert.equal(feed.stories.length,1);assert.equal(calls.length,3);
 assert.ok(calls.every(([u,o])=>u.startsWith('https://graph.facebook.com/v27.0/')&&!u.includes(env.INSTAGRAM_ACCESS_TOKEN)&&o.headers.Authorization===`Bearer ${env.INSTAGRAM_ACCESS_TOKEN}`));
 assert.ok(calls[2][0].includes('after=cursor'));assert.ok(!JSON.stringify(feed).includes('private'));
});
test('wrong account, revoked token, missing config and invalid data reject',async()=>{
 await assert.rejects(collect({},()=>{},now),/CONFIG_REQUIRED/);
 await assert.rejects(collect(env,async()=>({ok:true,json:async()=>({id:'42',username:'other'})}),now),/ACCOUNT_MISMATCH/);
 await assert.rejects(collect(env,async()=>({ok:false,status:401}),now),/META_HTTP_401/);
 let n=0;await assert.rejects(collect(env,async()=>({ok:true,json:async()=>n++?{}:{id:'42',username:'ko_ji.sug'}}),now),/INVALID_RESPONSE/);
});

import {refreshInstagramToken} from '../scripts/refresh-instagram-token.mjs';
test('refresh saves rotated token without exposing it in result',async()=>{let saved;const result=await refreshInstagramToken({now,readSecret:async()=>({token:'OLD_TEST',issuedAt:now-2*DAY,expiresAt:now+DAY}),writeSecret:async s=>{saved=s},fetcher:async u=>{assert.equal(u.origin,'https://graph.instagram.com');return {ok:true,json:async()=>({access_token:'NEW_TEST',expires_in:5184000})}}});assert.equal(result.status,'refreshed');assert.equal(saved.token,'NEW_TEST');assert(!JSON.stringify(result).includes('NEW_TEST'));});
test('expired token requires reauthorization; young token is not refreshed',async()=>{for(const [issuedAt,expiresAt,status] of [[now-60*DAY,now,'reauthorization_required'],[now-1000,now+DAY,'not_due']]){const r=await refreshInstagramToken({now,readSecret:async()=>({token:'TEST',issuedAt,expiresAt}),writeSecret:()=>{throw Error()},fetcher:()=>{throw Error()}});assert.equal(r.status,status);}});
