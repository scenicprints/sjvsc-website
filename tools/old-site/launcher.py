"""The old San Joaquin Valley Swiss Club site, in one file.

Everything the site was -- every page, every photograph, every PDF it offered
-- is carried inside this program, and so is the engine that draws it. It
borrows nothing from the computer it runs on. No browser has to be installed,
no runtime, no Edge, no Chrome. Copy the file to any Windows machine and it
opens.

That self-sufficiency is the whole point of an archive. A copy that leans on
software someone else maintains is a copy with a clock running on it.

Close the window to stop it.

                                  *

The pages are served to the window over a loopback address rather than handed
over as files. The server listens on 127.0.0.1 -- this machine talking to
itself, reachable by nothing else -- and dies with the window. It is there so
that links between pages, and the PDFs, behave exactly as they did on the
real site.
"""
import http.server
import os
import socket
import socketserver
import sys
import threading

TITLE = 'San Joaquin Valley Swiss Club — the old site, archived 13 November 2026'


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


def point_qt_at_its_own_parts():
    """Tell the web engine where it is.

    Qt's web engine runs its rendering in a separate helper executable and
    finds it by looking beside the Qt libraries. Packed into a single file
    that unpacks itself to a temporary folder at run time, that assumption
    breaks: the helper is there, but nothing has told Qt where "there" is,
    so the window never appears and nothing is printed.
    """
    base = getattr(sys, '_MEIPASS', None)
    if not base:
        return
    for folder in (os.path.join(base, 'PySide6'), base):
        helper = os.path.join(folder, 'QtWebEngineProcess.exe')
        if os.path.isfile(helper):
            os.environ['QTWEBENGINEPROCESS_PATH'] = helper
            break
    for name, rel in (('QTWEBENGINE_RESOURCES_PATH', 'resources'),
                      ('QTWEBENGINE_LOCALES_PATH', os.path.join('translations',
                                                                'qtwebengine_locales'))):
        for folder in (os.path.join(base, 'PySide6'), base):
            path = os.path.join(folder, rel)
            if os.path.isdir(path):
                os.environ[name] = path
                break


def main():
    point_qt_at_its_own_parts()
    if not os.path.isfile(os.path.join(site_root(), 'index.html')):
        import ctypes
        ctypes.windll.user32.MessageBoxW(
            None, 'The pages are missing from this program.\n\nExpected them at:\n'
            + site_root(), TITLE, 0x10)
        return 1

    port = serve()

    from PySide6.QtCore import QUrl, Qt
    from PySide6.QtGui import QKeySequence, QShortcut
    from PySide6.QtWidgets import QApplication, QMainWindow
    from PySide6.QtWebEngineWidgets import QWebEngineView

    app = QApplication(sys.argv)
    app.setApplicationName('SJVSC old site')

    window = QMainWindow()
    window.setWindowTitle(TITLE)
    window.resize(1280, 900)

    view = QWebEngineView()
    view.setUrl(QUrl('http://127.0.0.1:%d/index.html' % port))
    window.setCentralWidget(view)

    # The ordinary things a reader expects of a window showing pages.
    QShortcut(QKeySequence.Back, window, activated=view.back)
    QShortcut(QKeySequence.Forward, window, activated=view.forward)
    QShortcut(QKeySequence('Alt+Left'), window, activated=view.back)
    QShortcut(QKeySequence('Alt+Right'), window, activated=view.forward)
    QShortcut(QKeySequence('Ctrl+Home'), window,
              activated=lambda: view.setUrl(
                  QUrl('http://127.0.0.1:%d/index.html' % port)))
    QShortcut(QKeySequence.ZoomIn, window,
              activated=lambda: view.setZoomFactor(min(3.0, view.zoomFactor() + 0.1)))
    QShortcut(QKeySequence.ZoomOut, window,
              activated=lambda: view.setZoomFactor(max(0.3, view.zoomFactor() - 0.1)))
    QShortcut(QKeySequence('Ctrl+0'), window,
              activated=lambda: view.setZoomFactor(1.0))

    # Keep the title the archive's, not whatever the old page called itself,
    # so a window on a taskbar can never be mistaken for the live site.
    view.titleChanged.connect(lambda t: window.setWindowTitle(
        (t + '  —  ' if t else '') + 'archived copy, 13 November 2026'))

    window.show()
    window.raise_()
    window.activateWindow()
    return app.exec()


if __name__ == '__main__':
    # Packed with no console, a crash is silent: the window simply never
    # appears and there is nowhere for the reason to go. So it goes to a file
    # and then to the reader, rather than nowhere.
    try:
        sys.exit(main())
    except BaseException:
        import tempfile, traceback
        report = os.path.join(tempfile.gettempdir(), 'sjvsc-archive-error.log')
        try:
            with open(report, 'w', encoding='utf-8') as f:
                f.write(traceback.format_exc())
        except Exception:
            pass
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(
                None, 'The archive could not open.\n\nDetails were written to:\n'
                + report, TITLE, 0x10)
        except Exception:
            pass
        raise
