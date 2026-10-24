"""Общие утилиты: поиск ffmpeg, запуск команд, чтение параметров видео, JSON."""
import functools
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
STYLES_DIR = SKILL_DIR / "styles"
FONTS_DIR = SKILL_DIR / "fonts"
FPS = 30


def _has_libass(exe):
    try:
        out = subprocess.run([exe, "-hide_banner", "-filters"], capture_output=True, text=True, timeout=30).stdout
    except (OSError, subprocess.SubprocessError):
        return False
    return " subtitles " in out


@functools.lru_cache(maxsize=1)
def ffmpeg_bin():
    env = os.environ.get("MONTAZH_FFMPEG")
    if env:
        return env
    system = shutil.which("ffmpeg")
    if system and _has_libass(system):
        return system
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
    if system:
        return system
    sys.exit("ffmpeg не найден. Запустите: python scripts/montazh.py setup")


def run_ffmpeg(args, cwd=None, quiet=True):
    cmd = [ffmpeg_bin(), "-hide_banner", "-y"] + [str(a) for a in args]
    if quiet:
        cmd[2:2] = ["-loglevel", "error", "-stats"]
    proc = subprocess.run(cmd, cwd=cwd, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace")
    if proc.returncode != 0:
        tail = "\n".join(proc.stderr.strip().splitlines()[-25:])
        sys.exit(f"Ошибка ffmpeg (код {proc.returncode}):\n{tail}")
    return proc


def probe(path):
    """Длительность, размер кадра с учётом поворота, fps и наличие звука."""
    proc = subprocess.run([ffmpeg_bin(), "-hide_banner", "-i", str(path)],
                          stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace")
    info = proc.stderr
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info)
    if not m:
        sys.exit(f"Не удалось прочитать файл: {path}")
    duration = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    video_line = next((l for l in info.splitlines() if "Video:" in l), "")
    size = re.search(r"[ ,](\d{2,5})x(\d{2,5})[ ,\[]", video_line)
    w, h = (int(size.group(1)), int(size.group(2))) if size else (0, 0)
    fps = re.search(r"([\d.]+) fps", video_line)
    rot = re.search(r"rotation of (-?[\d.]+) degrees", info) or re.search(r"rotate\s*:\s*(-?\d+)", info)
    if rot and abs(round(float(rot.group(1)))) % 180 == 90:
        w, h = h, w
    return {
        "duration": duration,
        "width": w,
        "height": h,
        "fps": float(fps.group(1)) if fps else None,
        "has_audio": "Audio:" in info,
        "has_video": bool(video_line),
    }


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def project_dir_for(video):
    video = Path(video).resolve()
    return video.parent / f"{video.stem}_montazh"


def load_style(name):
    path = Path(name)
    if not path.suffix:
        path = STYLES_DIR / f"{name}.json"
    if not path.exists():
        available = ", ".join(p.stem for p in sorted(STYLES_DIR.glob("*.json")))
        sys.exit(f"Стиль «{name}» не найден. Доступны: {available}")
    style = load_json(STYLES_DIR / "_base.json")
    style.update(load_json(path))
    style["name"] = path.stem
    return style


def fmt_time(t):
    m, s = divmod(max(t, 0), 60)
    return f"{int(m):02d}:{s:05.2f}"
