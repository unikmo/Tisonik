const origin='https://tisonik.com';
const html=await (await fetch(origin+'/contact/',{cache:'no-store'})).text();
const pending=[...html.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/g)].map(m=>new URL(m[1],origin).href);
const seen=new Set();
while(pending.length&&seen.size<60){
  const url=pending.shift();if(seen.has(url))continue;seen.add(url);
  let code='';
  try{code=await (await fetch(url,{cache:'no-store'})).text();}catch{}
  for(const m of code.matchAll(/(?:\.{1,2}\/|\/assets\/)[\w./-]+\.js/g)){
    const next=new URL(m[0],url).href;
    if(next.startsWith(origin)&&!seen.has(next))pending.push(next);
  }
  const markers=['safely recorded','/api/pilot-requests','contact-submit','currentTarget.reset','Enquiry received'];
  if(markers.some(x=>code.includes(x))) {
    const pos=code.indexOf('safely recorded');
    const resetPos=code.indexOf('.reset()');
    console.log('CONTACT_CHUNK',JSON.stringify({url,size:code.length,markers:markers.filter(x=>code.includes(x)),nearReset:resetPos<0?'':code.slice(Math.max(0,resetPos-180),resetPos+60),nearSuccess:pos<0?'':code.slice(Math.max(0,pos-450),pos+100)}));
  }
}
console.log('BUNDLE_SCAN_COMPLETE',seen.size);
