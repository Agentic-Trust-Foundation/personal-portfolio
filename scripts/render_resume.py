#!/usr/bin/env python3
"""Build a static Novorésumé-style HTML and PDF from canonical content/profile.json.
Run explicitly during editing; Vercel only serves the checked-in static PDF.
Usage: python scripts/render_resume.py --root .
Requires Python playwright + a local Chromium installation. Never run on deployment.
"""
import argparse, html, json, re, shutil, sys
from pathlib import Path
from urllib.parse import quote

def h(text):return html.escape(str(text),quote=True)
def page_title(text):return f'<h2 class="ncv-section-title">{h(text)}</h2>'
def job(j):
    li=''.join('<li>'+h(x)+'</li>' for x in j['bullets'])
    return (f'<article class="ncv-job"><h3>{h(j["title"])}</h3>'
            f'<p class="ncv-job-company">{h(j["company"])}</p>'
            f'<p class="ncv-job-date">{h(j["dates"])} &nbsp; | &nbsp; {h(j["location"])}</p>'
            f'<div class="ncv-job-label">Achievements / Tasks</div>'
            f'<ul class="ncv-list">{li}</ul></article>')
def footer(n):
    return f'<footer class="ncv-footer"><span></span><span>Personal CV · HTML edition</span><span>Page {n} of 2</span></footer>'
# Based on public icons' SVG paths from the user's exported file, no JS or external resources.
icon_data={
 'mail':'<svg viewBox="0 0 24 24" class="ncv-contact-icon" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 8 10-8"/></svg>',
 'phone':'<svg viewBox="0 0 24 24" class="ncv-contact-icon" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
 'loc':'<svg viewBox="0 0 24 24" class="ncv-contact-icon" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
 'li':'<svg viewBox="0 0 24 24" class="ncv-contact-icon" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 10v8M7 7v.02M11 18v-8h4a3 3 0 0 1 3 3v5M11 13v5"/></svg>',
}
def markup(p):
    contact=(f'<div class="ncv-contact">'
      f'<a class="ncv-contact-line" href="mailto:{h(p["email"])}">{icon_data["mail"]}<span>{h(p["email"])}</span></a>'
      f'<a class="ncv-contact-line" href="tel:{re.sub("[^0-9+]", "",p["phone"])}">{icon_data["phone"]}<span>{h(p["phone"])}</span></a>'
      f'<div class="ncv-contact-line">{icon_data["loc"]}<span>{h(p["location"])}</span></div>'
      f'<a class="ncv-contact-line" href="{h(p["linkedinUrl"])}">{icon_data["li"]}<span>{h(p["linkedin"])}</span></a></div>')
    head=(f'<header class="ncv-header"><div class="ncv-heading">'
          f'<h1 class="ncv-name">{h(p["name"])}</h1><p class="ncv-role">{h(p["role"])}</p>'
          f'<p class="ncv-summary">{h(p["introduction"])}</p>'
          f'<p class="ncv-summary">{h(p["direction"])}</p></div>{contact}</header>')
    skills=''.join(f'<span class="ncv-skill-chip"><strong>{h(x["title"])}: </strong>{h(", ".join(x["items"]))}</span>' for x in p['skills'])
    p1=(head + '<section class="ncv-section">'+page_title('Skills')+f'<div class="ncv-skill-tags">{skills}</div></section>'
        +'<section class="ncv-section">'+page_title('Work Experience') + ''.join(job(x) for x in p['experience'][:3])+'</section>')
    cert=''.join('<div class="ncv-cert-item">'+h(x)+'</div>' for x in p['training'])
    education=''.join('<div class="ncv-education-item"><strong>'+h(x['title'])+'</strong><div>'+h(x['school'])+'</div><div class="ncv-education-meta">'+h(x['dates'])+' | Tehran</div></div>' for x in p['education'])
    langs=''.join('<div class="ncv-language-item"><strong>• '+h(x['name'])+'</strong><em>'+h(x['level'])+'</em></div>' for x in p['languages'])
    projects=''.join('<article class="ncv-project"><h3>'+h(x['name'])+'</h3><div class="ncv-project-sub">'+h(x['title'])+' <span class="ncv-project-state"> · '+h(x['status'])+'</span></div><p>'+h(x['description'])+'</p></article>' for x in p['projects'])
    p2=('<section class="ncv-section">'+page_title('Work Experience')+''.join(job(x) for x in p['experience'][3:])+'</section>'
        +'<section class="ncv-section">'+page_title('Certificates & Training')+'<div class="ncv-two-col">'+cert+'</div></section>'
        +'<section class="ncv-section">'+page_title('Education')+'<div class="ncv-two-col">'+education+'</div></section>'
        +'<section class="ncv-section">'+page_title('Languages')+'<div class="ncv-language-grid">'+langs+'</div></section>'
        +'<section class="ncv-section">'+page_title('Personal Projects')+'<div class="ncv-projects">'+projects+'</div></section>')
    return (f'<div class="ncv-shell"><nav class="ncv-toolbar">'
            '<a href="#">← Back to terminal</a><div class="ncv-tools">'
            '<a href="resume.pdf" class="ncv-download" download>Download PDF ↓</a></div></nav>'
            f'<main class="ncv-stack"><div class="ncv-page-frame"><article class="ncv-paper ncv-page1">{p1}{footer(1)}</article></div>'
            f'<div class="ncv-page-frame"><article class="ncv-paper ncv-page2">{p2}{footer(2)}</article></div></main></div>')

def generate(root,pdf_path,html_path,preview_dir):
    profile=json.loads((root/'content/profile.json').read_text(encoding='utf-8'))
    css=(root/'app/resume/novoresume.css').read_text(encoding='utf-8')
    for name in ['resume-circuit-top.svg','resume-circuit-bottom.svg']:
        svg=(root/'public'/name).read_text(encoding='utf-8')
        # File:// and standalone HTML both work; the SVG source is bundled locally.
        css=css.replace(f"url('/{name}')", f"url('data:image/svg+xml,{quote(svg)}')")
    # Local output only, do not treat any scripts from saved Novoresume app as executable.
    html_page='<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>'+h(profile['name'])+' — CV</title><style>'+css+'</style></head><body>'+markup(profile)+'</body></html>'
    html_path.parent.mkdir(parents=True,exist_ok=True)
    html_path.write_text(html_page,encoding='utf-8')
    from playwright.sync_api import sync_playwright
    with sync_playwright() as play:
        browser=play.chromium.launch(headless=True, executable_path=shutil.which('chromium') or None, args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1050,'height':1250},device_scale_factor=1)
        page.set_content(html_page, wait_until='load')
        page.locator('.ncv-paper').first.wait_for()
        heights=page.locator('.ncv-paper').evaluate_all('(els) => els.map(el=>({client:el.clientHeight, scroll:el.scrollHeight, width:el.clientWidth}))')
        # Render each A4 screen page exactly as seen.
        preview_dir.mkdir(parents=True,exist_ok=True)
        for i in (0,1):
            page.locator('.ncv-page-frame').nth(i).screenshot(path=str(preview_dir/f'page-{i+1}.png'))
        page.emulate_media(media='print')
        pdf_path.parent.mkdir(parents=True,exist_ok=True)
        page.pdf(path=str(pdf_path), format='A4', print_background=True, margin={'top':'0mm','right':'0mm','bottom':'0mm','left':'0mm'}, prefer_css_page_size=True)
        browser.close()
    import fitz
    pdf=fitz.open(str(pdf_path));count=len(pdf);pdf.close()
    print('HTML:',html_path,'PDF:',pdf_path,'pages=',count,'heights=',heights)
    if count!=2: raise RuntimeError('Expected exactly 2 PDF pages, got '+str(count))
    if any(e['scroll']-e['client']>2 for e in heights):
        raise RuntimeError('Resume content overflows A4 paper: '+str(heights))

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--root',default='.')
    ap.add_argument('--html')
    ap.add_argument('--pdf')
    ap.add_argument('--previews')
    args=ap.parse_args();root=Path(args.root).resolve()
    generate(root,Path(args.pdf or root/'public/resume.pdf'),Path(args.html or root/'resume-standalone.html'),Path(args.previews or root/'resume-previews'))
