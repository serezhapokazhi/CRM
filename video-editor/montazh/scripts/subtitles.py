"""Субтитры по словам (ASS) и заголовки-плашки, плюс SRT для соцсетей."""
import re

from timeline import time_of_word

PUNCT_KEEP = "?!"


def ass_color(hex_color, alpha=0):
    h = hex_color.lstrip("#")
    r, g, b = h[0:2], h[2:4], h[4:6]
    return f"&H{alpha:02X}{b}{g}{r}".upper()


def inline_color(hex_color):
    h = hex_color.lstrip("#")
    return f"&H{h[4:6]}{h[2:4]}{h[0:2]}&".upper()


def ass_time(t):
    t = max(t, 0)
    cs = int(round(t * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def _escape(text):
    return text.replace("\\", "/").replace("{", "(").replace("}", ")")


def display_word(i, words, edl, style):
    text = edl.get("word_fixes", {}).get(str(i), words[i]["w"])
    if style.get("strip_punct", True):
        text = re.sub(rf"[^\w\-{PUNCT_KEEP}%]+$", "", text)
        text = re.sub(r"^[^\w\-«\"]+", "", text)
    return text.upper() if style.get("uppercase") else text


def caption_chunks(order, words, mapping, style):
    chunks, cur, chars = [], [], 0
    for i in order:
        if cur:
            prev = cur[-1]
            gap = mapping[i][0] - mapping[prev][1]
            raw = words[prev]["w"]
            if (len(cur) >= style["max_words"] or chars + len(words[i]["w"]) > style["max_chars"]
                    or gap > 0.45 or re.search(r"[.!?…]$", raw)
                    or (raw.endswith(",") and len(cur) >= 2)):
                chunks.append(cur)
                cur, chars = [], 0
        cur.append(i)
        chars += len(words[i]["w"]) + 1
    if cur:
        chunks.append(cur)
    return chunks


def build_ass(path, edl, words, mapping, style, W, H, total):
    scale = min(W, H) / 1080
    order = sorted(mapping)
    font = style["font"]
    size = round(style["font_size"] * scale)
    outline = style["outline"] * scale
    margin_v = round(H * (1 - style["position_y"]))
    title_size = round(style["title_size"] * scale)
    box = 3 if style.get("caption_box") else 1

    lines = [
        "[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}",
        "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, "
        "Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Caption,{font},{size},{ass_color(style['text_color'])},&H000000FF,"
        f"{ass_color(style['outline_color'], style.get('box_alpha', 0) if box == 3 else 0)},{ass_color('#000000', 160)},-1,0,0,0,100,100,0,0,{box},"
        f"{outline:.1f},{style['shadow'] * scale:.1f},2,{round(W * 0.08)},{round(W * 0.08)},{margin_v},1",
        f"Style: Title,{style.get('title_font', font)},{title_size},{ass_color(style['title_color'])},&H000000FF,"
        f"{ass_color(style['title_box_color'])},&H00000000,-1,0,0,0,100,100,0,0,3,"
        f"{round(18 * scale)},0,8,{round(W * 0.08)},{round(W * 0.08)},{round(H * style['title_y'])},1",
        "", "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]

    emphasis = {int(i) for i in edl.get("emphasis", [])}
    hl = inline_color(style["highlight_color"])
    accent = inline_color(style.get("accent_color", style["highlight_color"]))
    base = inline_color(style["text_color"])
    pop = style.get("pop", True)
    srt = []

    chunks = caption_chunks(order, words, mapping, style)
    for c, chunk in enumerate(chunks):
        texts = [_escape(display_word(i, words, edl, style)) for i in chunk]
        start = mapping[chunk[0]][0]
        end = mapping[chunk[-1]][1] + 0.25
        if c + 1 < len(chunks):
            end = min(end, mapping[chunks[c + 1][0]][0])
        end = min(end, total)
        srt.append((start, end, " ".join(display_word(i, words, edl, style) for i in chunk)))
        for k, i in enumerate(chunk):
            ws = start if k == 0 else mapping[i][0]
            we = end if k == len(chunk) - 1 else mapping[chunk[k + 1]][0]
            if we <= ws:
                continue
            parts = []
            for j, (wi, t) in enumerate(zip(chunk, texts)):
                if j == k and style.get("karaoke", True):
                    grow = style.get("active_scale", 100)
                    parts.append(f"{{\\c{hl}\\fscx{grow}\\fscy{grow}}}{t}{{\\c{base}\\fscx100\\fscy100}}")
                elif wi in emphasis:
                    parts.append(f"{{\\c{accent}}}{t}{{\\c{base}}}")
                else:
                    parts.append(t)
            anim = "{\\fscx80\\fscy80\\t(0,90,\\fscx100\\fscy100)}" if pop and k == 0 else ""
            lines.append(f"Dialogue: 0,{ass_time(ws)},{ass_time(we)},Caption,,0,0,0,,{anim}{' '.join(parts)}")

    for t in edl.get("titles", []):
        ts = time_of_word(t["at_word"], mapping)
        if ts is None:
            continue
        te = min(ts + float(t.get("duration", 2.5)), total)
        text = _escape(t["text"].upper() if style.get("title_uppercase") else t["text"])
        lines.append(f"Dialogue: 1,{ass_time(ts)},{ass_time(te)},Title,,0,0,0,,{{\\fad(120,120)}}{text}")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    return srt


def write_srt(path, items):
    def ts(t):
        ms = int(round(t * 1000))
        h, ms = divmod(ms, 3600000)
        m, ms = divmod(ms, 60000)
        s, ms = divmod(ms, 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    with open(path, "w", encoding="utf-8") as f:
        for n, (s, e, text) in enumerate(items, 1):
            f.write(f"{n}\n{ts(s)} --> {ts(e)}\n{text}\n\n")
