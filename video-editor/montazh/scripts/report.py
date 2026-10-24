"""Отчёт о монтаже для человека: что оставлено, что вырезано и почему."""
from pathlib import Path

from media import fmt_time
from timeline import build_timeline


def write_report(project, edl, transcript, style, source_duration):
    words = transcript["words"]
    _, mapping, total = build_timeline(edl, words, source_duration, style)
    cut = set(edl.get("cut_words", []))
    kept = [p for p in edl["phrases"] if p["keep"]]
    removed = [p for p in edl["phrases"] if not p["keep"]]

    out = [
        "# Монтажный лист",
        "",
        f"- Исходник: **{fmt_time(source_duration)}** → после монтажа: **{fmt_time(total)}**",
        f"- Фраз оставлено: {len(kept)}, вырезано: {len(removed)}; "
        f"вырезано отдельных слов (паразиты, заикания): {len(cut)}",
        f"- Стиль: `{edl.get('style')}`, формат: `{edl.get('format')}`",
        "",
        "Чтобы вернуть кусок, скажите ассистенту: «верни P07». Чтобы убрать — «убери P12».",
        "",
        "| ID | Время в исходнике | | Текст | Причина |",
        "|---|---|---|---|---|",
    ]
    for p in edl["phrases"]:
        mark = "✅" if p["keep"] else "❌"
        text = " ".join(
            f"~~{words[i]['w']}~~" if (p["keep"] and i in cut) else
            edl.get("word_fixes", {}).get(str(i), words[i]["w"])
            for i in range(p["first"], p["last"] + 1)
        )
        reason = p.get("reason") or p.get("note", "")
        out.append(f"| {p['id']} | {fmt_time(p['start'])}–{fmt_time(p['end'])} | {mark} | {text} | {reason} |")

    soft = [i for i in edl.get("soft_fillers", []) if i in mapping]
    if soft:
        out += ["", "## Возможные слова-паразиты (оставлены, можно убрать)", ""]
        out.append(", ".join(f"`{words[i]['w']}` (слово {i}, {fmt_time(words[i]['s'])})" for i in soft))

    unsure = [w for w in words if w["p"] < 0.5 and w["i"] in mapping and str(w["i"]) not in edl.get("word_fixes", {})]
    if unsure:
        out += ["", "## Проверить написание в субтитрах (распознано неуверенно)", ""]
        out.append(", ".join(f"`{w['w']}` (слово {w['i']})" for w in unsure))

    if edl.get("titles"):
        out += ["", "## Плашки с текстом", ""]
        for t in edl["titles"]:
            out.append(f"- «{t['text']}» — на слове {t['at_word']} ({words[int(t['at_word'])]['w']}), {t.get('duration', 2.5)} c")
    if edl.get("broll"):
        out += ["", "## B-roll", ""]
        for b in edl["broll"]:
            out.append(f"- `{b['file']}` — на слове {b['at_word']} ({words[int(b['at_word'])]['w']}), {b.get('duration', 2.0)} c")

    path = Path(project) / "report.md"
    path.write_text("\n".join(out) + "\n", encoding="utf-8")
    return path, total
