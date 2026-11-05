const PAGE = `&lt;!doctype html&gt;
&lt;html lang="en"&gt;&lt;head&gt;&lt;meta charset="utf-8"&gt;&lt;meta name="viewport" content="width=device-width,initial-scale=1"&gt;&lt;title&gt;AI Creative Studio&lt;/title&gt;&lt;style&gt;
*{box-sizing:border-box}body{margin:0;background:#0b1020;color:#f5f7ff;font:16px Inter,system-ui,Arial}.wrap{max-width:900px;margin:7vh auto;padding:24px}.card{background:#151d33;border:1px solid #2b3858;border-radius:20px;padding:28px;box-shadow:0 20px 60px #0005}h1{margin:0 0 8px;font-size:34px}p{color:#aebbd4;line-height:1.6}.tag{color:#aafe69;font-weight:700}input,button{font:inherit;border-radius:12px;padding:15px;border:1px solid #394968}input{width:100%;background:#0c1428;color:white;margin:16px 0}button{background:#aafe69;color:#10200c;font-weight:800;border:0;cursor:pointer;width:100%}button:disabled{opacity:.5}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#0b1428;padding:18px;border-radius:12px;color:#e8efff}.small{font-size:13px;color:#8796b5}.result{margin-top:22px}a{color:#aafe69}&lt;/style&gt;&lt;/head&gt;&lt;body&gt;&lt;main class="wrap"&gt;&lt;section class="card"&gt;&lt;div class="tag"&gt;AI CREATIVE STUDIO&lt;/div&gt;&lt;h1&gt;Brand to Creative Ideas&lt;/h1&gt;&lt;p&gt;Paste a public Instagram brand profile URL. AI will study the available public brand information and create fresh campaign directions in its visual language.&lt;/p&gt;&lt;form id="f"&gt;&lt;input id="url" type="url" required placeholder="https://www.instagram.com/brandname/"&gt;&lt;button id="go"&gt;Research brand &amp; generate ideas&lt;/button&gt;&lt;/form&gt;&lt;p class="small"&gt;Uses public profile information only. Instagram may limit automated access; if blocked, add the brand bio and sample post captions in the result request.&lt;/p&gt;&lt;div id="out" class="result"&gt;&lt;/div&gt;&lt;/section&gt;&lt;/main&gt;&lt;script&gt;
const f=document.getElementById('f'),b=document.getElementById('go'),out=document.getElementById('out');
f.addEventListener('submit',async e=&gt;{e.preventDefault();b.disabled=true;b.textContent='Researching…';out.innerHTML='&lt;p&gt;Analysing brand information and creating concepts…&lt;/p&gt;';try{const r=await fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:document.getElementById('url').value})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');out.innerHTML='&lt;h2&gt;Brand research &amp; creative directions&lt;/h2&gt;&lt;pre&gt;&lt;/pre&gt;';out.querySelector('pre').textContent=d.result||JSON.stringify(d,null,2)}catch(err){out.innerHTML='&lt;p&gt;&lt;/p&gt;';out.querySelector('p').textContent=err.message}finally{b.disabled=false;b.textContent='Research brand &amp; generate ideas'}});
&lt;/script&gt;&lt;/body&gt;&lt;/html&gt;`;

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*'}})}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(request.method==='OPTIONS')return new Response(null,{headers:{'access-control-allow-origin':'*','access-control-allow-methods':'POST,GET,OPTIONS','access-control-allow-headers':'content-type'}});
  if(url.pathname==='/')return new Response(PAGE,{headers:{'content-type':'text/html; charset=utf-8'}});
  if(url.pathname==='/api/analyze'&&request.method==='POST'){
   try{
    const body=await request.json();const profile=String(body.url||'').trim();
    if(!/^https?:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?/.test(profile))return json({error:'Please enter a valid public Instagram profile URL.'},400);
    let pageText='Instagram profile could not be fetched. Use the URL and provide cautious, clearly labelled ideas without claiming verified visual observations.';
    try{const res=await fetch(profile,{headers:{'User-Agent':'Mozilla/5.0 (compatible; CreativeStudio/1.0)','Accept':'text/html'}});if(res.ok){const html=await res.text();const title=(html.match(/&lt;title[^&gt;]*&gt;([\s\S]*?)&lt;\/title&gt;/i)||[])[1]||'';const desc=(html.match(/&lt;meta[^&gt;]+name=["']description["'][^&gt;]+content=["']([^"']*)/i)||[])[1]||'';const og=(html.match(/&lt;meta[^&gt;]+property=["']og:description["'][^&gt;]+content=["']([^"']*)/i)||[])[1]||'';pageText=('Title: '+title+' Description: '+desc+' Profile metadata: '+og+' URL: '+profile).slice(0,5000)}}
    catch(e){}
    if(!env.AI)return json({error:'Workers AI binding named AI is missing. Add the AI binding in Cloudflare Worker Settings.'},500);
    const prompt='You are a senior Indian brand strategist and art director. Analyze this public Instagram brand profile information. Separate verified observations from assumptions; never pretend you saw posts if page data is unavailable. Identify likely industry, audience, tone, visual language, palette, typography/layout cues if supported. Then create 5 original festive/seasonal campaign concepts that feel consistent with the brand, not copies. For each give: concept name, visual scene/composition, brand-fit rationale, short copy direction, and a detailed image-generation prompt. Preserve observed brand colors and style; do not invent brand facts. Make output practical for a graphic designer. PROFILE DATA: '+pageText;
    const ai=await env.AI.run('@cf/meta/llama-3.1-8b-instruct',{messages:[{role:'system',content:'You are an expert brand research and creative direction assistant.'},{role:'user',content:prompt}],max_tokens:1800});
    return json({result:ai.response||JSON.stringify(ai),source:pageText});
   }catch(e){return json({error:e.message||'Unexpected server error'},500)}
  }
  return new Response('Not found',{status:404});
 }
};
