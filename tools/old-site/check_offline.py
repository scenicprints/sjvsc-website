"""Open the offline copy with no network and see whether it still stands up."""
import io, os, sys
from playwright.sync_api import sync_playwright

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'offline')
SHOTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots')
os.makedirs(SHOTS, exist_ok=True)

CHECK = ['index', 'club-history', 'schwingers-club', 'oktoberfest',
         'kids-swiss-camp', 'contact']

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    ctx = browser.new_context(viewport={'width': 1440, 'height': 1000})

    # nothing may reach the network: if the copy needs the internet, it fails here
    blocked = []

    def guard(route, request):
        if request.url.startswith('file://'):
            route.continue_()
        else:
            blocked.append(request.url)
            route.abort()

    ctx.route('**/*', guard)
    page = ctx.new_page()

    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)[:100]))

    for slug in CHECK:
        path = os.path.join(OUT, slug + '.html')
        page.goto('file:///' + path.replace('\\', '/'), wait_until='load')
        page.wait_for_timeout(1200)
        facts = page.evaluate("""() => {
            const imgs = [...document.querySelectorAll('img')];
            return {
              text: document.body.innerText.replace(/\\s+/g,' ').trim().length,
              imgs: imgs.length,
              broken: imgs.filter(i => i.complete && i.naturalWidth === 0).length,
              height: document.body.scrollHeight,
              links: [...document.querySelectorAll('a[href$=".html"]')].length,
              font: getComputedStyle(document.body).fontFamily.slice(0, 40)
            }
        }""")
        page.screenshot(path=os.path.join(SHOTS, slug + '.png'), full_page=False)
        print('%-22s text %5d  imgs %2d (%d broken)  %4dpx  links %2d  %s' % (
            slug, facts['text'], facts['imgs'], facts['broken'],
            facts['height'], facts['links'], facts['font']))

    print('')
    print('requests that tried to leave the machine: %d' % len(blocked))
    for u in sorted(set(blocked))[:10]:
        print('   ' + u[:110])
    print('page errors: %d' % len(errs))
    for e in errs[:5]:
        print('   ' + e)
    browser.close()
