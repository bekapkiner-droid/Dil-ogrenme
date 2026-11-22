#!/usr/bin/env python3
"""Tek parça konuşma kaydını, kelime zamanlarına (Scribe words.json) göre ayrı mp3 dosyalarına keser.

Kullanım:
  python3 -I scripts/cut-audio.py KAYIT.mp3 words.json maddeler.txt audio/en

maddeler.txt: her satırda bir madde (kayıttaki sırayla). Madde birden çok kelime olabilir.
Dosya adı, maddenin sadeleştirilmiş hâlidir (slug): küçük harf, aksansız, boşluk yerine tire.
"""
import json, re, subprocess, sys, unicodedata, os


def slug(t):
    t = t.lower().replace('ß', 'ss')
    t = unicodedata.normalize('NFD', t)
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')


def norm_word(w):
    return slug(w).replace('-', '')


def main(src, words_json, items_txt, outdir):
    words = json.load(open(words_json))
    words = words['words'] if isinstance(words, dict) else words
    words = [w for w in words if w.get('type', 'word') == 'word']
    items = [l.strip() for l in open(items_txt, encoding='utf-8') if l.strip()]
    os.makedirs(outdir, exist_ok=True)
    i = 0
    clips = []
    for it in items:
        toks = it.split()
        seg = words[i:i + len(toks)]
        got = [norm_word(w['text']) for w in seg]
        want = [norm_word(t) for t in toks]
        if got != want:
            raise SystemExit(f'Uyuşmazlık: "{it}" beklenen {want}, gelen {got} (sıra {i})')
        prev_end = words[i - 1]['end'] if i > 0 else None
        next_start = words[i + len(toks)]['start'] if i + len(toks) < len(words) else None
        start, end = seg[0]['start'], seg[-1]['end']
        s = start - (min(0.03, (start - prev_end) / 2) if prev_end is not None else 0.03)
        e = end + (min(0.09, max(0.0, (next_start - end)) / 2 + 0.03) if next_start is not None else 0.12)
        s = max(0.0, s)
        clips.append((it, s, e))
        i += len(toks)
    if i != len(words):
        raise SystemExit(f'Kullanılmayan kelime var: {len(words) - i}')
    for it, s, e in clips:
        out = os.path.join(outdir, slug(it) + '.mp3')
        d = e - s
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{s:.3f}', '-t', f'{d:.3f}', '-i', src,
                        '-af', f'afade=t=in:d=0.01,afade=t=out:st={max(0, d - 0.04):.3f}:d=0.04',
                        '-ac', '1', '-ar', '24000', '-b:a', '48k', out], check=True)
    print(len(clips), 'dosya yazıldı:', outdir)


if __name__ == '__main__':
    if len(sys.argv) != 5:
        raise SystemExit(__doc__)
    main(*sys.argv[1:])
