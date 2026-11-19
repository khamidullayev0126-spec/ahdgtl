const {chromium}=require("playwright");
const [,, img, title, sub, out] = process.argv;
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1080,height:1920}});
 await p.setContent(`<html><head><style>
 body{margin:0;width:1080px;height:1920px;background:radial-gradient(900px 700px at 50% 0%,#12324a 0%,#0A1020 60%);font-family:-apple-system,"Segoe UI",Roboto,sans-serif;color:#E8EEFC;overflow:hidden}
 h1{margin:110px 70px 0;font-size:76px;line-height:1.1;font-weight:800;text-align:center}
 h1 b{color:#22C55E}
 p{margin:26px 90px 0;font-size:38px;line-height:1.35;color:#8B97B5;text-align:center}
 .ph{position:absolute;left:50%;top:500px;transform:translateX(-50%);width:720px;border-radius:64px;padding:18px;background:#1b2740;box-shadow:0 40px 120px rgba(0,0,0,.6),0 0 0 3px #24314F}
 .ph img{display:block;width:100%;border-radius:48px}
 </style></head><body><h1>${title}</h1><p>${sub}</p><div class="ph"><img src="data:image/jpeg;base64,${require("fs").readFileSync(img).toString("base64")}"></div></body></html>`);
 await p.waitForTimeout(300); await p.screenshot({path:out}); await b.close();
})();
