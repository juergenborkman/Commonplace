"""Build Commonplace into one page.

    python3 build.py            -> writes index.html (the website, for GitHub Pages)
    python3 build.py --artifact -> writes commonplace.html (for the Claude artifact)

Source lives in src/: app.html (the app), content.js (subjects + facts),
branches.js (branch trees, prominent figures, branch lessons), courses/*.js
(Foundations courses; files load in name order).
"""
import glob, sys, os
here = os.path.dirname(os.path.abspath(__file__))
src = lambda p: open(os.path.join(here, 'src', p), encoding='utf-8').read()
app = src('app.html')
parts = ['const COURSES={};', src('content.js'), src('branches.js')]
for f in sorted(glob.glob(os.path.join(here, 'src', 'courses', '*.js'))):
    parts.append(open(f, encoding='utf-8').read())
built = app.replace('/*CONTENT*/', '\n'.join(parts))

if '--artifact' in sys.argv:
    out, name = built, 'commonplace.html'
else:
    i = built.index('<div id="app">')
    head, body = built[:i], built[i:]
    out = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
           '<meta name="description" content="Commonplace: learn something real instead of scrolling.">\n'
           '<meta name="theme-color" content="#2F43C9">\n'
           '<link rel="icon" href="icon.svg" type="image/svg+xml">\n'
           '<link rel="apple-touch-icon" href="icon-180.png">\n'
           '<link rel="manifest" href="manifest.webmanifest">\n'
           + head + '</head>\n<body>\n' + body + '\n</body>\n</html>\n')
    name = 'index.html'
open(os.path.join(here, name), 'w', encoding='utf-8').write(out)
print(name, len(out.encode()) // 1024, 'KB')
