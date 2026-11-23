/* S.u.G WALK R7: approved local video manifest. Empty until actual licensed files arrive.
 * Add a chapter only after confirming the source asset, rights, language and captions.
 * Expected: { src: './media/<safe-file>.mp4', approved: true, captionsReady: {ja:true,en:false,zh:false} }
 * This file does not fetch, upload, auto-play, or create content.
 */
(function(root){
 'use strict';
 const approved = Object.freeze({});
 const localVideoPattern = /^\.\/media\/[A-Za-z0-9_-]+\.mp4$/;
 function get(id) {
  const row=approved[id];
  if (!/^ch[1-5]$/.test(String(id)) || !row || row.approved!==true ||
      typeof row.src!=='string' || !localVideoPattern.test(row.src)) return null;
  return {src:row.src,captionsReady:row.captionsReady||{}};
 }
 root.SUGR7TourismMedia=Object.freeze({get,chapters:Object.keys(approved).filter(x=>!!get(x))});
})(typeof window!=='undefined'?window:globalThis);
