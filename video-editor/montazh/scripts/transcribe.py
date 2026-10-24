"""Распознавание речи локально (faster-whisper) с таймкодами каждого слова."""
import re
import sys
import time
from pathlib import Path

from media import load_json, run_ffmpeg, save_json

# Whisper любит «причёсывать» речь и выкидывать «эээ» и повторы.
# Подсказка в таком же «живом» стиле заставляет его писать дословно —
# это нужно, чтобы находить оговорки и неудачные дубли.
VERBATIM_PROMPT = "Эээ, ну, короче... Мы, мы начинаем. Ммм, так. Сегодня я расскажу — нет, стоп. Сегодня я расскажу про"


def build_prompt(script_path):
    if not script_path:
        return VERBATIM_PROMPT
    text = Path(script_path).read_text(encoding="utf-8")
    text = re.sub(r"\s+", " ", text).strip()
    # Whisper берёт из подсказки ~220 токенов, поэтому даём начало сценария
    # и отдельно — редкие слова (термины, имена, латиница), чтобы он их узнал.
    rare = sorted({w for w in re.findall(r"[A-Za-z][\w\-.]+|[А-ЯЁ][а-яё]{3,}", text)})
    terms = ", ".join(rare[:40])
    return f"{VERBATIM_PROMPT} {terms}. {text[:400]}"


def transcribe(video, project, model_name="large-v3-turbo", script_path=None):
    project = Path(project)
    audio = project / "audio.wav"
    print("→ Извлекаю звук…")
    run_ffmpeg(["-i", video, "-vn", "-ac", "1", "-ar", "16000", audio])

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("Не установлен faster-whisper. Запустите: python scripts/montazh.py setup")

    print(f"→ Загружаю модель распознавания «{model_name}» (первый раз скачивается, ~1.5 ГБ)…")
    model = WhisperModel(model_name, device="auto", compute_type="auto")
    print("→ Распознаю речь…")
    t0 = time.time()
    segments, info = model.transcribe(
        str(audio),
        language="ru",
        word_timestamps=True,
        initial_prompt=build_prompt(script_path),
        condition_on_previous_text=False,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 400},
    )
    words = []
    for seg in segments:
        for w in seg.words or []:
            text = w.word.strip()
            if not text:
                continue
            words.append({"i": len(words), "w": text, "s": round(w.start, 3),
                          "e": round(w.end, 3), "p": round(w.probability, 2)})
        print(f"   {seg.end:6.1f} c / {info.duration:.1f} c", end="\r")
    print(f"\n   готово за {time.time() - t0:.0f} c, слов: {len(words)}")
    data = {"model": model_name, "language": "ru", "duration": info.duration, "words": words}
    save_json(project / "transcript.json", data)
    return data


def load_transcript(project):
    return load_json(Path(project) / "transcript.json")
