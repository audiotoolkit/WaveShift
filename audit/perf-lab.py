"""Lab-only LCP/CLS measurement via PerformanceObserver in Chromium against a local static server (no network throttling, no CDN)."""
import http.server,socketserver,threading,os,json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def log_message(s,*a): pass
srv=socketserver.TCPServer(('127.0.0.1',0),H); port=srv.server_address[1]; threading.Thread(target=srv.serve_forever,daemon=True).start()
out=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    for f in ['index.html','mp3-to-wav.html','wav-compressor.html']:
        for name,vp in [('mobile',dict(width=375,height=812)),('desktop',dict(width=1366,height=768))]:
            pg=b.new_context(viewport=vp).new_page()
            pg.add_init_script("window.__m={lcp:0,cls:0};new PerformanceObserver(l=>{for(const e of l.getEntries())window.__m.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__m.cls+=e.value}).observe({type:'layout-shift',buffered:true});")
            pg.goto(f'http://127.0.0.1:{port}/{f}',wait_until='load'); pg.wait_for_timeout(1500)
            m=pg.evaluate('window.__m'); sz=pg.evaluate("performance.getEntriesByType('resource').filter(r=>r.name.includes('127.0.0.1')).reduce((a,r)=>a+r.transferSize,0)")
            out.append(dict(page=f,viewport=name,lcp_ms=round(m['lcp']),cls=round(m['cls'],4),local_transfer_bytes=sz)); print(out[-1])
if os.environ.get('JSON_OUT'): json.dump(out,open(os.environ['JSON_OUT'],'w'),indent=1)
