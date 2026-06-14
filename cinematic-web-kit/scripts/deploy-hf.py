#!/usr/bin/env python3
"""Deploy the site to a Hugging Face static Space.

HF's static server resolves some directory URLs but 401/404s others
(observed: depth-2 dirs and /contact/). The local/Vercel-style pretty URLs
stay in the repo; this script rewrites the DEPLOY COPY's internal links,
canonicals and sitemap to explicit /dir/index.html URLs, which serve reliably,
and swaps the absolute site domain to whichever Space it's deploying to so the
copy is self-consistent (og/canonical/twitter/sitemap/robots).

Usage:
  python3 scripts/deploy-hf.py                      # default repo
  python3 scripts/deploy-hf.py <user/space-name>    # a different/new Space
"""
import pathlib
import re
import shutil
import sys
import tempfile

DEFAULT_REPO = 'helwyr55/matt-deane-photography'
# The absolute origin currently baked into the repo's HTML/sitemap/robots/IPTC.
OLD_URL = 'https://helwyr55-matt-deane-photography.static.hf.space'
ROOT = pathlib.Path(__file__).resolve().parent.parent
INCLUDE = ['index.html', '404.html', 'sitemap.xml', 'robots.txt',
           'assets', 'photos', 'portfolio', 'prints', 'about', 'contact']

SPACE_README = '''---
title: Matt Deane Photography
emoji: \U0001F4F7
colorFrom: indigo
colorTo: yellow
sdk: static
pinned: false
---

# Matt Deane Photography

Landscape photography presented as a scroll-driven 3D drone flight — eight
photographs as waypoints over procedurally themed terrain, in a new order
every visit — plus a five-collection archive, prints & licensing, and contact.
Built with Three.js, GSAP and Lenis; no build step.
'''


def space_url(repo):
    """user/space-name -> https://user-space-name.static.hf.space"""
    return 'https://' + repo.replace('/', '-').lower() + '.static.hf.space'


def discover_dirs(tmp):
    """Every directory that has an index.html, longest path first so
    /portfolio/sea/ rewrites before /portfolio/."""
    dirs = sorted({str(p.parent.relative_to(tmp)) for p in tmp.rglob('index.html')
                   if p.parent != tmp},
                  key=lambda d: (-d.count('/'), d))
    return dirs


def rewrite(text, dirs, base_url):
    # pretty dir URLs -> explicit index.html (HF static-host quirk)
    for d in dirs:
        text = re.sub(r'(["\'>])/%s/(?=["\'#?<])' % re.escape(d),
                      r'\g<1>/%s/index.html' % d, text)
    # absolute domain -> this Space's domain (skip if deploying the canonical one)
    if base_url != OLD_URL:
        text = text.replace(OLD_URL, base_url)
    return text


def main():
    repo = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_REPO
    base_url = space_url(repo)
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='hf-deploy-'))
    try:
        for item in INCLUDE:
            src = ROOT / item
            if src.is_dir():
                shutil.copytree(src, tmp / item)
            else:
                shutil.copy2(src, tmp / item)
        (tmp / 'README.md').write_text(SPACE_README)

        dirs = discover_dirs(tmp)
        n = 0
        for f in list(tmp.rglob('*.html')) + list(tmp.rglob('*.js')) + [tmp / 'sitemap.xml']:
            s = f.read_text()
            r = rewrite(s, dirs, base_url)
            if r != s:
                f.write_text(r)
                n += 1
        print(f'target {repo} ({base_url}); {len(dirs)} dirs; rewrote {n} files')

        from huggingface_hub import HfApi
        api = HfApi()
        api.create_repo(repo, repo_type='space', space_sdk='static',
                        exist_ok=True, private=False)
        api.upload_folder(folder_path=str(tmp), repo_id=repo, repo_type='space',
                          commit_message='Deploy (index.html-resolved links, self-consistent domain)')
        print('deployed:', f'https://huggingface.co/spaces/{repo}')
        print('live:', base_url + '/')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
