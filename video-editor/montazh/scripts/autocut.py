"""Черновой монтажный лист: паузы, слова-паразиты, оговорки и неудачные дубли."""
import re
from difflib import SequenceMatcher

HARD_FILLERS = {"э", "ээ", "эээ", "ээээ", "эм", "эмм", "ээм", "м", "мм", "ммм", "хм", "хмм",
                "а-а", "э-э", "м-м", "э-э-э", "ам", "аа"}
SOFT_FILLERS = {"ну", "вот", "короче", "типа", "значит", "собственно", "как бы", "в общем"}
RESTART_MARKERS = {"стоп", "заново", "дубль", "сначала", "переснимем"}
# Слова, которые часто повторяют специально («очень-очень»), их не трогаем.
REPEAT_OK = {"очень", "да", "нет", "много", "всё", "все", "быстро", "долго", "ещё", "еще"}

PHRASE_GAP = 0.7     # пауза, после которой начинается новая фраза, сек
RETAKE_LOOKAHEAD = 4  # сколько следующих фраз сравнивать при поиске дубля
RETAKE_SIMILARITY = 0.6


def norm(word):
    w = word.lower().replace("ё", "е")
    return re.sub(r"[^\w\-]", "", w).strip("-")


def split_phrases(words):
    phrases, cur = [], []
    for w in words:
        if cur and (w["s"] - cur[-1]["e"] > PHRASE_GAP or re.search(r"[.!?…]$", cur[-1]["w"])):
            phrases.append(cur)
            cur = []
        cur.append(w)
    if cur:
        phrases.append(cur)
    return [{
        "id": f"P{n + 1:02d}",
        "first": ph[0]["i"],
        "last": ph[-1]["i"],
        "start": ph[0]["s"],
        "end": ph[-1]["e"],
        "text": " ".join(w["w"] for w in ph),
        "keep": True,
        "reason": "",
    } for n, ph in enumerate(phrases)]


def _content(words, ph):
    return [n for n in (norm(words[i]["w"]) for i in range(ph["first"], ph["last"] + 1))
            if n and n not in HARD_FILLERS]


def autocut(transcript):
    words = transcript["words"]
    phrases = split_phrases(words)
    cut_words, notes = [], []

    for idx, ph in enumerate(phrases):
        content = _content(words, ph)
        if not content:
            ph["keep"], ph["reason"] = False, "только «эээ»/паразиты"
            continue
        if any(n in RESTART_MARKERS for n in content):
            if len(content) <= 4:
                ph["keep"], ph["reason"] = False, "маркер пересъёмки («стоп/заново»)"
                continue
            ph["note"] = "есть слово «стоп/заново» — проверить, не дубль ли"
        for nxt in phrases[idx + 1: idx + 1 + RETAKE_LOOKAHEAD]:
            other = _content(words, nxt)
            if len(content) < 2 or not other:
                continue
            head = other[:len(content) + 3]
            similar = SequenceMatcher(None, content, head).ratio() >= RETAKE_SIMILARITY
            false_start = len(content) <= 4 and other[:len(content)] == content
            if similar or false_start:
                ph["keep"], ph["reason"] = False, f"неудачный дубль → оставлен {nxt['id']}"
                break

    for ph in phrases:
        if not ph["keep"]:
            continue
        idxs = list(range(ph["first"], ph["last"] + 1))
        for k, i in enumerate(idxs):
            n = norm(words[i]["w"])
            if n in HARD_FILLERS:
                cut_words.append(i)
            elif k + 1 < len(idxs) and n and n == norm(words[idxs[k + 1]]["w"]) and n not in REPEAT_OK:
                cut_words.append(i)  # заикание: «мы мы»
            elif n in SOFT_FILLERS:
                notes.append(i)

    emphasis = [w["i"] for w in words if re.search(r"\d", w["w"])]
    return {
        "version": 1,
        "approved": False,
        "style": "classic",
        "format": "auto",
        "crop_x": 0.5,
        "crop_y": 0.4,
        "phrases": phrases,
        "cut_words": cut_words,
        "soft_fillers": notes,
        "word_fixes": {},
        "emphasis": emphasis,
        "titles": [],
        "broll": [],
        "music": None,
    }
