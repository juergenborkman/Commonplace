# Commonplace

A learning app meant to replace mindless scrolling with active learning. Eleven subjects
(Philosophy, History, Geography, The Arts, Sciences, Music, Sports, Literature, Architecture,
Cuisine, Law) each start with a full Foundations course, then branch into narrower areas
and prominent figures. Built-in spaced-repetition quizzes and a Discover feed of facts.

## How it's organized

- `src/app.html`: the app itself (layout, styles, and logic)
- `src/content.js`: the subjects and Discover facts
- `src/branches.js`: branch trees, prominent figures, and branch lessons
- `src/courses/*.js`: the Foundations courses, one file per subject (files load in name order)
- `build.py`: combines everything into `index.html`, the page the website serves

## Updating the site

1. Edit files in `src/`.
2. Run `python3 build.py` to rebuild `index.html`.
3. Commit and push. GitHub Pages republishes the site automatically.

Progress is saved in your browser on each device. Use **Export progress** and
**Import progress** at the bottom of the Today tab to move it between devices or copies.
