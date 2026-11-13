"""The old San Joaquin Valley Swiss Club site, in one file.

Everything the site was -- every page, every photograph, every PDF it offered
-- is carried inside this program. Run it and it serves those files to your
own machine and opens them in your browser. Nothing is installed, nothing is
written to the computer it runs on, and nothing reaches the internet: unplug
the network and it behaves exactly the same.

Close the little black window to stop it.
"""
import http.server
import os
import socket
import socketserver
import sys
import threading
import webbrowser

TITLE = 'San Joaquin Valley Swiss Club - the old site, archived 13 Nov 2026'


def site_root():
    """Where the pages are.

    Frozen into one file, PyInstaller unpacks the payload to a temporary
    folder and points sys._MEIPASS at it. Run as a plain script, the pages
    sit next to this file.
    """
    base = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, 'site')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=site_root(), **kw)

    def log_message(self, fmt, *args):
        pass  # the window is for the reader, not for a request log

    def end_headers(self):
        # an archive should never be cached; the copy on disk is the truth
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def main():
    root = site_root()
    index = os.path.join(root, 'index.html')
    if not os.path.isfile(index):
        print('The pages are missing from this program. Expected them at:')
        print('  ' + root)
        input('\nPress Enter to close. ')
        return 1

    port = free_port()
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', port), Handler)
    url = 'http://127.0.0.1:%d/index.html' % port

    print('=' * 68)
    print(TITLE)
    print('=' * 68)
    print('')
    print('Opening in your browser:')
    print('  ' + url)
    print('')
    print('Every page is listed at:')
    print('  http://127.0.0.1:%d/_index.html' % port)
    print('')
    print('Nothing here is live and nothing goes to the internet.')
    print('Close this window when you have finished reading.')
    print('')

    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
