"""The old San Joaquin Valley Swiss Club site, in one file.

Everything the site was -- every page, every photograph, every PDF it offered
-- is carried inside this program. Run it and it opens in its own window:
no tabs, no address bar, its own entry on the taskbar.

Nothing is installed. Nothing is written to the computer it runs on except a
scratch folder that is deleted on the way out. Nothing reaches the internet:
unplug the network and it behaves the same.

Close the window to stop it.

                                  *

Two things are worth saying plainly about how this works.

The pages are served over a loopback address rather than opened as files,
because a file:// page cannot follow the old site's own links. The server
listens on 127.0.0.1 -- this machine talking to itself, reachable by nothing
else -- and dies with the window.

The window is drawn by the browser engine already on the machine, run in
"app mode", which is a window with the browser furniture taken off. That is a
deliberate choice over bundling a second engine: the archive stays small, it
starts immediately, and there is no third-party runtime inside it to rot. A
separate scratch profile is used so the window cannot see, touch or disturb
anything in your ordinary browsing.
"""
import atexit
import http.server
import os
import shutil
import socket
import socketserver
import subprocess
import sys
import tempfile
import threading

TITLE = 'San Joaquin Valley Swiss Club \u2014 the old site'


def site_root():
    base = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, 'site')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=site_root(), **kw)

    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def serve():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', port), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return port


def a_browser():
    """The first Chromium-based browser on this machine, if there is one.

    Edge ships with Windows, so on the machines this archive is meant for
    the first candidate almost always answers.
    """
    env = os.environ
    roots = [env.get('PROGRAMFILES(X86)', r'C:\Program Files (x86)'),
             env.get('PROGRAMFILES', r'C:\Program Files'),
             env.get('LOCALAPPDATA', '')]
    rel = [r'Microsoft\Edge\Application\msedge.exe',
           r'Google\Chrome\Application\chrome.exe',
           r'BraveSoftware\Brave-Browser\Application\brave.exe']
    for root in roots:
        if not root:
            continue
        for r in rel:
            p = os.path.join(root, r)
            if os.path.isfile(p):
                return p
    return None


def say(message):
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(None, message, TITLE, 0x40)
    except Exception:
        print(message)


def main():
    if not os.path.isfile(os.path.join(site_root(), 'index.html')):
        say('The pages are missing from this program.\n\nExpected them at:\n'
            + site_root())
        return 1

    url = 'http://127.0.0.1:%d/index.html' % serve()
    browser = a_browser()

    if not browser:
        # Nothing Chromium-based to make a window with, so fall back to
        # whatever opens web pages here rather than fail.
        import webbrowser
        say('Opening the archive in your usual browser.')
        webbrowser.open(url)
        try:
            input('Press Enter to close. ')
        except Exception:
            threading.Event().wait()
        return 0

    profile = tempfile.mkdtemp(prefix='sjvsc-archive-')
    atexit.register(shutil.rmtree, profile, True)

    # --app strips the tabs and the address bar. The separate profile keeps
    # this window away from the reader's own browsing entirely.
    proc = subprocess.Popen([
        browser,
        '--app=' + url,
        '--user-data-dir=' + profile,
        '--window-size=1280,900',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--disable-background-networking',
    ])
    proc.wait()
    return 0


if __name__ == '__main__':
    sys.exit(main())
