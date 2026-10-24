#!/usr/bin/env python3
"""Монтаж экспертных роликов через AI-ассистента.

Команды:
  setup                         установить зависимости, шрифты и модель распознавания
  prepare  ВИДЕО [--script F]   распознать речь и собрать черновой монтажный лист
  draft    ВИДЕО [--style S]    быстрый черновик 540p + раскадровка + отчёт
  render   ВИДЕО --approved     финальный рендер (только после «ОК» человека)
  styles                        список стилей
  frame    ВИДЕО ВРЕМЯ          кадр черновика в момент ВРЕМЯ (сек) — для проверки
  sheet    ВИДЕО                раскадровка любого видео (референсы стиля)
"""
import argparse
import subprocess
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from autocut import autocut  # noqa: E402
from media import (FONTS_DIR, SKILL_DIR, STYLES_DIR, ffmpeg_bin, load_json, load_style,  # noqa: E402
                   probe, project_dir_for, run_ffmpeg, save_json)
from render import contact_sheets, render  # noqa: E402
from report import write_report  # noqa: E402
from transcribe import load_transcript, transcribe  # noqa: E402

FONT_URLS = {
    "Montserrat-Black.ttf": "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Black.ttf",
    "Montserrat-ExtraBold.ttf": "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-ExtraBold.ttf",
    "Montserrat-SemiBold.ttf": "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-SemiBold.ttf",
    "IBMPlexMono-SemiBold.ttf": "https://github.com/google/fonts/raw/main/ofl/ibmplexmono/IBMPlexMono-SemiBold.ttf",
}

try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


def cmd_setup(args):
    print("→ Устанавливаю Python-пакеты…")
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-r", str(SKILL_DIR / "requirements.txt")], check=True)
    print(f"   ffmpeg: {ffmpeg_bin()}")
    FONTS_DIR.mkdir(exist_ok=True)
    for name, url in FONT_URLS.items():
        dest = FONTS_DIR / name
        if dest.exists() and dest.stat().st_size > 10000:
            continue
        try:
            urllib.request.urlretrieve(url, dest)
            print(f"   шрифт {name} ✓")
        except Exception as e:  # шрифт не критичен — будет системный
            dest.unlink(missing_ok=True)
            print(f"   шрифт {name} не скачался ({e}); положите .ttf в {FONTS_DIR} вручную")
    if not args.skip_model:
        print(f"→ Скачиваю модель распознавания «{args.model}»…")
        from faster_whisper import WhisperModel
        WhisperModel(args.model, device="auto", compute_type="auto")
    print("Готово ✓")


def _paths(video):
    video = Path(video).resolve()
    if not video.exists():
        sys.exit(f"Файл не найден: {video}")
    project = project_dir_for(video)
    return video, project


def _load(project):
    if not (project / "edl.json").exists():
        sys.exit("Сначала выполните: montazh.py prepare ВИДЕО")
    return load_json(project / "edl.json"), load_transcript(project)


def cmd_prepare(args):
    video, project = _paths(args.video)
    project.mkdir(exist_ok=True)
    src = probe(video)
    save_json(project / "project.json", {"source": str(video), **src})
    if args.script:
        (project / "script.txt").write_text(Path(args.script).read_text(encoding="utf-8"), encoding="utf-8")
    if args.reuse and (project / "transcript.json").exists():
        transcript = load_transcript(project)
    else:
        transcript = transcribe(video, project, args.model, args.script)
    edl = autocut(transcript)
    edl["style"] = args.style
    if args.format:
        edl["format"] = args.format
    save_json(project / "edl.json", edl)
    report, total = write_report(project, edl, transcript, load_style(edl["style"]), src["duration"])
    (project / "transcript.txt").write_text(
        "\n".join(f"[{w['i']}] {w['w']}" for w in transcript["words"]), encoding="utf-8")
    print(f"\nПроект: {project}\n  edl.json — монтажный лист (его правит ассистент)\n"
          f"  report.md — отчёт\n  transcript.txt — слова с номерами\n"
          f"Длительность: {src['duration']:.1f} c → {total:.1f} c")


def cmd_draft(args):
    video, project = _paths(args.video)
    edl, transcript = _load(project)
    style = load_style(args.style or edl["style"])
    out = project / "draft.mp4"
    info = render(project, video, edl, transcript, style, out, quality="draft")
    sheets = contact_sheets(out, project / "frames", every=args.every)
    report, _ = write_report(project, edl, transcript, style, info["source_duration"])
    print(f"\nЧерновик: {out}\nОтчёт: {report}\nРаскадровка (кадр каждые {args.every} c, 12 на лист):")
    for s in sheets:
        print(f"  {s}")


def cmd_render(args):
    if not args.approved:
        sys.exit("Финальный рендер запускается только после подтверждения человека: добавьте --approved")
    video, project = _paths(args.video)
    edl, transcript = _load(project)
    style = load_style(args.style or edl["style"])
    if args.format:
        edl["format"] = args.format
    quality = "4k" if args.res.lower() == "4k" else "1080"
    out = Path(args.out) if args.out else video.parent / f"{video.stem}_{style['name']}_{quality}.mp4"
    info = render(project, video, edl, transcript, style, out, quality=quality, stems=args.stems)
    edl["approved"] = True
    save_json(project / "edl.json", edl)
    print(f"\nГотово ✓ {out}\n  {info['size'][0]}x{info['size'][1]}, {info['duration']:.1f} c, "
          f"субтитры для площадок: {out.with_suffix('.srt')}")


def cmd_styles(_args):
    for p in sorted(STYLES_DIR.glob("*.json")):
        if p.stem.startswith("_"):
            continue
        print(f"{p.stem:10s} {load_json(p).get('description', '')}")


def cmd_frame(args):
    video, project = _paths(args.video)
    draft = project / "draft.mp4"
    if not draft.exists():
        sys.exit("Сначала сделайте черновик: montazh.py draft ВИДЕО")
    out = project / "frames" / f"frame_{args.time:.1f}.jpg"
    out.parent.mkdir(exist_ok=True)
    run_ffmpeg(["-ss", f"{args.time}", "-i", draft, "-frames:v", "1", "-q:v", "3", out])
    print(out)


def cmd_sheet(args):
    """Раскадровка любого видео — например, ролика-референса для подбора стиля."""
    video = Path(args.video).resolve()
    out_dir = video.parent / f"{video.stem}_кадры"
    for s in contact_sheets(video, out_dir, every=args.every):
        print(s)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("setup")
    p.add_argument("--model", default="large-v3-turbo")
    p.add_argument("--skip-model", action="store_true")
    p.set_defaults(func=cmd_setup)

    p = sub.add_parser("prepare")
    p.add_argument("video")
    p.add_argument("--script", help="сценарий .txt — точнее выбор дублей и написание терминов")
    p.add_argument("--style", default="classic")
    p.add_argument("--format", choices=["auto", "vertical", "horizontal"])
    p.add_argument("--model", default="large-v3-turbo", help="small — быстрее на слабом ноутбуке")
    p.add_argument("--reuse", action="store_true", help="не распознавать заново, взять готовый transcript.json")
    p.set_defaults(func=cmd_prepare)

    p = sub.add_parser("draft")
    p.add_argument("video")
    p.add_argument("--style")
    p.add_argument("--every", type=float, default=2.0)
    p.set_defaults(func=cmd_draft)

    p = sub.add_parser("render")
    p.add_argument("video")
    p.add_argument("--approved", action="store_true")
    p.add_argument("--style")
    p.add_argument("--format", choices=["auto", "vertical", "horizontal"])
    p.add_argument("--res", default="1080", help="1080 или 4k")
    p.add_argument("--out")
    p.add_argument("--stems", action="store_true", help="отдельно дорожки голоса и музыки (.wav)")
    p.set_defaults(func=cmd_render)

    p = sub.add_parser("styles")
    p.set_defaults(func=cmd_styles)

    p = sub.add_parser("frame")
    p.add_argument("video")
    p.add_argument("time", type=float)
    p.set_defaults(func=cmd_frame)

    p = sub.add_parser("sheet")
    p.add_argument("video")
    p.add_argument("--every", type=float, default=1.0)
    p.set_defaults(func=cmd_sheet)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
