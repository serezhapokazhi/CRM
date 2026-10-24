"""Сборка ролика одним проходом ffmpeg: нарезка, кадрирование, зумы, B-roll, субтитры, звук."""
import shutil
import sys
from pathlib import Path

from media import FONTS_DIR, FPS, fmt_time, probe, run_ffmpeg
from subtitles import build_ass, write_srt
from timeline import build_timeline, time_of_word

SIZES = {
    "vertical": {"draft": (540, 960), "1080": (1080, 1920), "4k": (2160, 3840)},
    "horizontal": {"draft": (960, 540), "1080": (1920, 1080), "4k": (3840, 2160)},
}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}


def _even(x):
    return max(2, int(round(x / 2)) * 2)


def _rgb(hex_color):
    h = hex_color.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def target_format(edl, src):
    fmt = edl.get("format", "auto")
    if fmt == "auto":
        fmt = "vertical" if src["height"] >= src["width"] else "horizontal"
    if fmt not in SIZES:
        sys.exit(f"Неизвестный формат «{fmt}»: используйте vertical, horizontal или auto")
    return fmt


def crop_expr(src, fw, fh, zoom, crop_x, crop_y, anchor_y):
    sw, sh = src["width"], src["height"]
    ta = fw / fh
    if sw / sh > ta:
        bw, bh = sh * ta, sh
    else:
        bw, bh = sw, sw / ta
    bx, by = (sw - bw) * crop_x, (sh - bh) * crop_y
    cw, ch = bw / zoom, bh / zoom
    cx, cy = bx + (bw - cw) * 0.5, by + (bh - ch) * anchor_y
    cw, ch = min(_even(cw), sw - sw % 2), min(_even(ch), sh - sh % 2)
    cx, cy = min(max(int(cx), 0), sw - cw), min(max(int(cy), 0), sh - ch)
    return f"crop={cw}:{ch}:{cx}:{cy},scale={fw}:{fh}:flags=bicubic,setsar=1"


def make_card_assets(work, W, H, ww, wh, style):
    """Фон с точками и маска со скруглёнными углами для «карточного» макета."""
    br, bg_, bb = _rgb(style["bg_color"])
    dr, dg, db = _rgb(style["dot_color"])
    step = max(8, round(min(W, H) * 0.022))
    dot = max(2, step // 8)
    cond = f"lt(mod(X,{step}),{dot})*lt(mod(Y,{step}),{dot})"
    run_ffmpeg(["-f", "lavfi", "-i", f"color=c=black:s={W}x{H}:d=1", "-frames:v", "1", "-vf",
                f"format=rgb24,geq=r='if({cond},{dr},{br})':g='if({cond},{dg},{bg_})':b='if({cond},{db},{bb})'",
                work / "bg.png"])
    r = round(min(ww, wh) * style.get("card_radius", 0.08))
    expr = (f"255*lte(pow(max(max({r}-X,X-(W-1-{r})),0),2)+"
            f"pow(max(max({r}-Y,Y-(H-1-{r})),0),2),{r * r})")
    run_ffmpeg(["-f", "lavfi", "-i", f"color=c=black:s={ww}x{wh}:d=1", "-frames:v", "1", "-vf",
                f"format=gray,geq=lum='{expr}'", work / "mask.png"])


def render(project, video, edl, transcript, style, out_path, quality="1080", stems=False):
    project = Path(project)
    work = project / "_render"
    work.mkdir(exist_ok=True)
    src = probe(video)
    if not src["has_audio"]:
        sys.exit("В исходнике нет звука — монтаж по речи невозможен.")
    words = transcript["words"]
    shots, mapping, total = build_timeline(edl, words, src["duration"], style)
    if not shots:
        sys.exit("После нарезки ничего не осталось — проверьте keep у фраз в edl.json")

    fmt = target_format(edl, src)
    W, H = SIZES[fmt][quality]
    card = style.get("layout") == "card"
    if card:
        ww = _even(W * style["card_width"])
        wh = _even(ww / style["card_aspect"])
        wx, wy = (W - ww) // 2, _even(H * style["card_y"])
        fw, fh = ww, wh
        make_card_assets(work, W, H, ww, wh, style)
    else:
        fw, fh = W, H

    inputs = [["-i", video]]
    n = len(shots)
    g = [f"[0:v]fps={FPS},split={n}" + "".join(f"[vs{k}]" for k in range(n)),
         f"[0:a]aresample=48000,asplit={n}" + "".join(f"[as{k}]" for k in range(n))]
    concat_in = ""
    for k, sh in enumerate(shots):
        s, e = sh["src_start"], sh["src_end"]
        crop = crop_expr(src, fw, fh, sh["zoom"], edl.get("crop_x", 0.5), edl.get("crop_y", 0.4),
                         style.get("zoom_anchor_y", 0.35))
        g.append(f"[vs{k}]trim=start={s:.4f}:end={e:.4f},setpts=PTS-STARTPTS,{crop}[v{k}]")
        fades = ""
        if sh["hard_in"]:
            fades += ",afade=t=in:d=0.012"
        if sh["hard_out"]:
            fades += f",afade=t=out:st={max(e - s - 0.012, 0):.4f}:d=0.012"
        g.append(f"[as{k}]atrim=start={s:.4f}:end={e:.4f},asetpts=PTS-STARTPTS{fades}[a{k}]")
        concat_in += f"[v{k}][a{k}]"
    g.append(f"{concat_in}concat=n={n}:v=1:a=1[vc0][ac]")

    # B-roll и картинки поверх речи, привязанные к словам.
    vlabel = "vc0"
    for b, br in enumerate(edl.get("broll", [])):
        t = time_of_word(br["at_word"], mapping)
        if t is None:
            continue
        dur = min(float(br.get("duration", 2.0)), total - t)
        path = Path(br["file"])
        path = path if path.is_absolute() else project / path
        if not path.exists():
            sys.exit(f"Нет файла B-roll: {path}")
        idx = len(inputs)
        if path.suffix.lower() in IMAGE_EXT:
            inputs.append(["-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", path])
        else:
            inputs.append(["-i", path])
        g.append(f"[{idx}:v]fps={FPS},trim=0:{dur:.3f},setpts=PTS-STARTPTS+{t:.3f}/TB,"
                 f"scale={fw}:{fh}:force_original_aspect_ratio=increase,crop={fw}:{fh},setsar=1,format=yuv420p[b{b}]")
        g.append(f"[{vlabel}][b{b}]overlay=0:0:eof_action=pass:enable='between(t,{t:.3f},{t + dur:.3f})'[vc{b + 1}]")
        vlabel = f"vc{b + 1}"

    if card:
        bg_i, mask_i = len(inputs), len(inputs) + 1
        for name in ("bg.png", "mask.png"):
            inputs.append(["-loop", "1", "-framerate", str(FPS), "-t", f"{total:.3f}", "-i", work / name])
        g.append(f"[{mask_i}:v]format=gray[mask]")
        g.append(f"[{vlabel}]format=yuva420p[vca]")
        g.append("[vca][mask]alphamerge[win]")
        g.append(f"[{bg_i}:v]format=yuv420p[bgv]")
        g.append(f"[bgv][win]overlay={wx}:{wy}:shortest=1[vb]")
        vlabel = "vb"

    srt = build_ass(work / "subs.ass", edl, words, mapping, style, W, H, total)
    fonts = work / "fonts"
    fonts.mkdir(exist_ok=True)
    for f in list(FONTS_DIR.glob("*.ttf")) + list(FONTS_DIR.glob("*.otf")):
        shutil.copy2(f, fonts / f.name)
    g.append(f"[{vlabel}]subtitles=subs.ass:fontsdir=fonts,format=yuv420p[vout]")

    voice_chain = "highpass=f=70"
    if style.get("denoise"):
        voice_chain += ",afftdn=nf=-25"
    voice_chain += ",loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo"
    want_stems = stems and quality != "draft"
    music = edl.get("music")
    if music:
        mpath = Path(music["file"])
        mpath = mpath if mpath.is_absolute() else project / mpath
        mi = len(inputs)
        inputs.append(["-stream_loop", "-1", "-i", mpath])
        g.append(f"[ac]{voice_chain},asplit=3[voice][vside][vstem]")
        if not want_stems:
            g.append("[vstem]anullsink")
        g.append(f"[{mi}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,"
                 f"atrim=0:{total:.3f},volume={music.get('volume_db', -18)}dB[mus]")
        g.append("[mus][vside]sidechaincompress=threshold=0.03:ratio=10:attack=15:release=350,asplit=2[duck][mstem]")
        g.append("[voice][duck]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aout]")
        if not want_stems:
            g.append("[mstem]anullsink")
    elif want_stems:
        g.append(f"[ac]{voice_chain},asplit=2[aout][vstem]")
    else:
        g.append(f"[ac]{voice_chain}[aout]")

    graph = work / "graph.txt"
    graph.write_text(";\n".join(g), encoding="utf-8")

    draft = quality == "draft"
    args = []
    for inp in inputs:
        args += inp
    args += ["-filter_complex_script", graph.name, "-map", "[vout]", "-map", "[aout]",
             "-c:v", "libx264", "-preset", "ultrafast" if draft else style.get("preset", "medium"),
             "-crf", "30" if draft else "18", "-pix_fmt", "yuv420p", "-r", str(FPS),
             "-c:a", "aac", "-b:a", "128k" if draft else "192k", "-movflags", "+faststart",
             Path(out_path).resolve()]
    out_path = Path(out_path)
    if want_stems:
        args += ["-map", "[vstem]", "-c:a", "pcm_s16le", out_path.with_name(out_path.stem + "_голос.wav").resolve()]
        if music:
            args += ["-map", "[mstem]", "-c:a", "pcm_s16le",
                     out_path.with_name(out_path.stem + "_музыка.wav").resolve()]

    print(f"→ Рендер {'черновика' if draft else 'финала'}: {W}x{H}, {fmt_time(total)} "
          f"(было {fmt_time(src['duration'])}), планов: {n}")
    run_ffmpeg(args, cwd=work)
    if not draft:
        write_srt(out_path.with_suffix(".srt"), srt)
    return {"duration": total, "source_duration": src["duration"], "shots": n, "size": (W, H),
            "format": fmt, "mapping": mapping}


def contact_sheets(video, out_dir, every=2.0):
    """Раскадровка черновика: кадры каждые N секунд, сеткой 4x3 — чтобы ассистент мог её посмотреть.

    Кадр k (слева направо, сверху вниз, с нуля) листа n — это момент ((n-1)*12 + k) * every секунд.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(exist_ok=True)
    for old in out_dir.glob("sheet_*.jpg"):
        old.unlink()
    run_ffmpeg(["-i", video, "-vf",
                f"fps=1/{every},scale=270:-2,tile=4x3:padding=4:color=white",
                "-q:v", "4", out_dir / "sheet_%02d.jpg"])
    return sorted(out_dir.glob("sheet_*.jpg"))
