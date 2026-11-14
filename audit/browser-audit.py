"""Browser audit (Chromium via Playwright). Usage: python3 audit/browser-audit.py
Serves the site locally, tests pages/viewports/interactions. External CDN requests (fonts, jsDelivr)
cannot be tested offline and are reported separately."""
import http.server, threading, socketserver, os, json, sys, tempfile
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def log_message(s,*a): pass
    def send_error(s,code,msg=None,explain=None):
        if code==404:
            b=open(os.path.join(ROOT,'404.html'),'rb').read(); s.send_response(404); s.send_header('Content-Type','text/html'); s.send_header('Content-Length',str(len(b))); s.end_headers(); s.wfile.write(b)
        else: super().send_error(code,msg,explain)
srv=socketserver.TCPServer(('127.0.0.1',0),H); port=srv.server_address[1]; threading.Thread(target=srv.serve_forever,daemon=True).start()
B=f'http://127.0.0.1:{port}'
PAGES=['index.html','mp3-to-wav.html','wav-to-mp3.html','wav-compressor.html','about.html','contact.html','privacy.html','terms.html']
VPS=[(320,568),(375,812),(430,932),(768,1024),(1366,768),(1920,1080)]
res=[]; 
def rec(area,name,ok,detail=''): res.append(dict(area=area,name=name,status='PASS' if ok else 'FAIL',detail=detail)); 
with sync_playwright() as p:
    br=p.chromium.launch(); 
    # status codes
    ctx=br.new_context(); pg=ctx.new_page()
    for f in PAGES: r=pg.goto(f'{B}/{f}'); rec('http',f'{f} 200',r.status==200,str(r.status))
    r=pg.goto(f'{B}/does-not-exist.html'); rec('http','missing page returns 404',r.status==404,str(r.status))
    # console errors (local only)
    for f in PAGES:
        errs=[]; pg=ctx.new_page(); pg.on('pageerror',lambda e,errs=errs:errs.append(str(e)))
        pg.on('console',lambda m,errs=errs:errs.append(m.text) if m.type=='error' and '127.0.0.1' in (m.location.get('url') or '') else None)
        pg.goto(f'{B}/{f}',wait_until='domcontentloaded'); pg.wait_for_timeout(300); rec('console',f'{f} no JS/local errors',not errs,'; '.join(errs)[:200]); pg.close()
    # viewports overflow
    for f in PAGES:
        for w,h in VPS:
            c=br.new_context(viewport=dict(width=w,height=h)); pg=c.new_page(); pg.goto(f'{B}/{f}',wait_until='domcontentloaded')
            ov=pg.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')
            rec('responsive',f'{f} @{w}x{h} no horizontal overflow',ov<=0,f'overflow {ov}px'); c.close()
    # mobile menu
    c=br.new_context(viewport=dict(width=375,height=812)); pg=c.new_page(); pg.goto(f'{B}/index.html',wait_until='domcontentloaded')
    t=pg.locator('.menu-toggle'); rec('nav','menu toggle visible on mobile',t.is_visible())
    rec('nav','nav hidden before toggle',not pg.locator('.nav-links a').first.is_visible())
    t.click(); rec('nav','menu opens + aria-expanded true',pg.locator('.nav-links a').first.is_visible() and t.get_attribute('aria-expanded')=='true')
    t.click(); rec('nav','menu closes + aria-expanded false',t.get_attribute('aria-expanded')=='false' and not pg.locator('.nav-links a').first.is_visible())
    c.close()
    # converter UI on 3 tool pages + index
    tmp=tempfile.mkdtemp(); 
    open(f'{tmp}/a.mp3','wb').write(b'ID3'+b'\0'*100); open(f'{tmp}/b.wav','wb').write(b'RIFF'+b'\0'*100); open(f'{tmp}/c.txt','wb').write(b'hi')
    for f in ['index.html','mp3-to-wav.html','wav-to-mp3.html','wav-compressor.html']:
        c=br.new_context(viewport=dict(width=375,height=812)); pg=c.new_page(); pg.goto(f'{B}/{f}',wait_until='domcontentloaded')
        cb=pg.locator('.convert-button'); rec('tool',f'{f} convert disabled when empty',cb.is_disabled())
        files=[f'{tmp}/b.wav',f'{tmp}/c.txt'] if 'compressor' in f else [f'{tmp}/a.mp3',f'{tmp}/b.wav']
        pg.set_input_files('.audio-file-input',files); rows=pg.locator('.file-row').count()
        rec('tool',f'{f} files listed',rows==(1 if 'compressor' in f else 2),f'{rows} rows')
        rec('tool',f'{f} convert enabled with files',cb.is_enabled())
        if 'compressor' in f: rec('tool','compressor rejects non-wav with notice',pg.locator('.notice.visible').count()==1)
        pg.locator('.remove-file').first.click(); rec('tool',f'{f} remove file works',pg.locator('.file-row').count()==rows-1)
        pg.locator('.clear-button').click(); rec('tool',f'{f} clear resets',pg.locator('.file-row').count()==0 and cb.is_disabled())
        fs=pg.locator('.format-select'); 
        if f=='index.html':
            fs.select_option('wav'); rec('tool','bitrate hidden for WAV',not pg.locator('.quality-field').is_visible()); fs.select_option('m4a'); rec('tool','bitrate shown for M4A',pg.locator('.quality-field').is_visible())
        c.close()
    # FAQ accordion
    c=br.new_context(); pg=c.new_page(); pg.goto(f'{B}/index.html',wait_until='domcontentloaded'); d=pg.locator('.faq-list details'); d.nth(0).locator('summary').click(); pg.wait_for_timeout(200); d.nth(1).locator('summary').click(); pg.wait_for_timeout(300)
    rec('faq','only one FAQ open at a time',pg.locator('.faq-list details[open]').count()==1); c.close()
    # accessibility DOM checks
    for f in PAGES:
        pg=br.new_page(); pg.goto(f'{B}/{f}',wait_until='domcontentloaded')
        bad=pg.evaluate('''()=>{const o=[];document.querySelectorAll('input,select,textarea').forEach(e=>{if(e.type==='hidden')return;const n=e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||(e.id&&document.querySelector('label[for="'+e.id+'"]'))||e.closest('label');if(!n)o.push((e.className||e.tagName))});
        document.querySelectorAll('button').forEach(e=>{if(!(e.textContent.trim()||e.getAttribute('aria-label')))o.push('button:'+e.className)});
        document.querySelectorAll('a').forEach(e=>{if(!(e.textContent.trim()||e.getAttribute('aria-label')))o.push('a:'+e.href)});return o}''')
        rec('a11y',f'{f} controls have accessible names',not bad,', '.join(bad)); 
        rec('a11y',f'{f} has main landmark + skip link',pg.locator('main#main').count()==1 and pg.locator('.skip-link').count()==1)
        hs=pg.evaluate('[...document.querySelectorAll("h1,h2,h3,h4")].map(h=>+h.tagName[1])'); skip=any(b-a>1 for a,b in zip(hs,hs[1:])); rec('a11y',f'{f} no skipped heading levels',not skip,str(hs)); pg.close()
    br.close()
tally={}
for r in res: tally[r['status']]=tally.get(r['status'],0)+1
for r in res:
    if r['status']=='FAIL': print('FAIL',r['area'],r['name'],r['detail'])
print(json.dumps(tally)); 
if os.environ.get('JSON_OUT'): json.dump(res,open(os.environ['JSON_OUT'],'w'),indent=1)
sys.exit(1 if tally.get('FAIL') else 0)
