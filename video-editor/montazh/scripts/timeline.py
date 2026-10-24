"""Перевод монтажного листа в список кусков исходника и новые таймкоды слов."""
import math

from media import FPS


def _snap_down(t):
    return math.floor(t * FPS + 1e-6) / FPS


def _snap_up(t):
    return math.ceil(t * FPS - 1e-6) / FPS


def kept_words(edl, words):
    cut = set(edl.get("cut_words", []))
    out = []
    for ph in edl["phrases"]:
        if ph["keep"]:
            out.extend(i for i in range(ph["first"], ph["last"] + 1) if i not in cut)
    return sorted(set(out))


def build_timeline(edl, words, duration, style):
    """Возвращает shots — куски исходника по порядку — и новые времена слов.

    Паузы между словами длиннее max_pause сжимаются до pad_after + pad_before.
    Длинные куски дробятся на «планы» по shot_max секунд, чтобы чередовать зум.
    """
    pb, pa = style["pad_before"], style["pad_after"]
    max_pause = style["max_pause"]
    keep = kept_words(edl, words)
    keep_set = set(keep)

    spans = []  # [start, end, [word indices]]
    prev = None
    for i in keep:
        w = words[i]
        s, e = w["s"] - pb, w["e"] + pa
        if i > 0 and i - 1 not in keep_set:
            s = max(s, words[i - 1]["e"])  # не захватываем вырезанное слово
        if i + 1 < len(words) and i + 1 not in keep_set:
            e = min(e, words[i + 1]["s"])
        s, e = max(s, 0.0), min(e, duration)
        if spans and prev == i - 1 and w["s"] - words[prev]["e"] <= max_pause:
            spans[-1][1] = max(spans[-1][1], e)
            spans[-1][2].append(i)
        elif spans and s <= spans[-1][1]:
            spans[-1][1] = max(spans[-1][1], e)
            spans[-1][2].append(i)
        else:
            spans.append([s, e, [i]])
        prev = i

    # Привязка к сетке кадров, чтобы звук и картинка резались одинаково.
    snapped = []
    for s, e, idx in spans:
        s, e = _snap_down(s), _snap_up(e)
        if snapped and s <= snapped[-1][1]:
            snapped[-1][1] = max(snapped[-1][1], e)
            snapped[-1][2].extend(idx)
        elif e - s >= 2 / FPS:
            snapped.append([s, e, idx])

    phrase_of = {}
    for n, ph in enumerate(edl["phrases"]):
        for i in range(ph["first"], ph["last"] + 1):
            phrase_of[i] = n

    shots, mapping, offset = [], {}, 0.0
    shot_max = style.get("shot_max", 0) or 1e9
    for s, e, idx in snapped:
        cur_start, cur_phrase = s, phrase_of.get(idx[0])
        cut_points = []
        for i in idx[1:]:
            t = _snap_down(words[i]["s"] - min(pb, 0.04))
            new_phrase = phrase_of.get(i) != cur_phrase
            if t - cur_start >= 1.2 and (new_phrase or t - cur_start >= shot_max) and e - t >= 0.8:
                cut_points.append(t)
                cur_start, cur_phrase = t, phrase_of.get(i)
        bounds = [s] + cut_points + [e]
        for k in range(len(bounds) - 1):
            shots.append({"src_start": bounds[k], "src_end": bounds[k + 1],
                          "start": offset + bounds[k] - s,
                          "hard_in": k == 0, "hard_out": k == len(bounds) - 2})
        for i in idx:
            w = words[i]
            ns = offset + min(max(w["s"], s), e) - s
            ne = offset + min(max(w["e"], s), e) - s
            mapping[i] = (round(ns, 3), round(max(ne, ns + 0.05), 3))
        offset += e - s

    for n, shot in enumerate(shots):
        shot["zoom"] = 1.0 if n % 2 == 0 else style.get("zoom", 1.0)
    return shots, mapping, offset


def time_of_word(i, mapping):
    """Новое время слова; если слово вырезано — время ближайшего следующего."""
    i = int(i)
    if i in mapping:
        return mapping[i][0]
    later = [k for k in mapping if k > i]
    return mapping[min(later)][0] if later else None
