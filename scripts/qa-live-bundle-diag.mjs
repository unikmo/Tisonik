const origin='https://tisonik.com';
const html=await (await fetch(origin+'/contact/',{cache:'no-store'})).text();
const paths=[...html.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/g)].map(m=>m[1]);
console.log('SCRIPTS',paths);
for(const path of paths){
const asset=await (await fetch(new URL(path,origin),{cache:'no-store'})).text();
console.log('LIVE_BUNDLE_DIAG',JSON.stringify({path,size:asset.length,hasOldCurrentTargetReset:/currentTarget\.reset\(/.test(asset),currentTargetResetCount:(asset.match(/currentTarget\.reset\(/g)||[]).length,hasEnquiryText:asset.includes('safely recorded'),hasAPI:asset.includes('/api/pilot-requests'),hasFormReset:asset.includes('.reset()')}));
}
