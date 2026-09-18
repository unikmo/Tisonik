import assert from 'node:assert/strict'

process.env.RESEND_API_KEY='test-key'
process.env.TISONIK_ENQUIRY_TO='private-recipient@example.test'
process.env.TISONIK_ENQUIRY_FROM='Tisonik <notifications@example.test>'

let requestBody, update
globalThis.fetch=async(_url,options)=>{requestBody=JSON.parse(options.body);return {ok:true}}

const enquiry={
  name:'Alex Morgan',
  work_email:'alex@hotelgroup.example',
  company:'Example Resort Group',
  role_title:'VP Guest Experience',
  message:'We would like to discuss a one-property pilot.',
  source_path:'/resort-pilot/',
  created_at:'2026-09-18T00:00:00.000Z',
}
const database={
  from:table=>{
    if(table==='pilot_requests')return {
      select:()=>({eq:()=>({single:async()=>({data:enquiry,error:null})})})
    }
    return {update:value=>{update=value;return {eq:async()=>({error:null})}}}
  }
}

const {deliverEnquiryNotification}=await import('../api/_lib/enquiry-notification.mjs')
const result=await deliverEnquiryNotification(database,'11111111-1111-1111-1111-111111111111')

assert.deepEqual(result,{configured:true,sent:true})
assert.equal(update.status,'sent')
assert.equal(requestBody.to[0],'private-recipient@example.test')
assert.equal(requestBody.reply_to,'alex@hotelgroup.example')
assert.match(requestBody.subject,/resort pilot/i)
assert.match(requestBody.text,/Example Resort Group/)
assert.match(requestBody.text,/one-property pilot/)
console.log('First-party enquiry email delivery contract passed.')
