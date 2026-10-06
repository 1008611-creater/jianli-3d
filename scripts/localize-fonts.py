"""从 Google Fonts 下载的 CSS 中抽出 latin 子集，本地化 woff2 并生成本地 CSS。

中文文案走系统字体回退（PingFang SC / Microsoft YaHei），
所以只保留 latin 子集即可，体积最小。
"""
import re
import urllib.request
from pathlib import Path

SRC = Path("bricolage_src.css")
OUT_DIR = Path("public/assets/fonts")
CSS_OUT = Path("src/styles/fonts.css")

OUT_DIR.mkdir(parents=True, exist_ok=True)

lines = SRC.read_text(encoding="utf-8").splitlines()
COMMENT = re.compile(r"^/\*\s*([\w-]+)\s*\*/$")

kept: list[str] = []
downloaded: list[tuple[str, int]] = []

i = 0
while i < len(lines):
    cm = COMMENT.match(lines[i].strip())
    is_face = i + 1 < len(lines) and lines[i + 1].strip() == "@font-face {"
    if not (cm and is_face):
        i += 1
        continue

    subset = cm.group(1)
    j = i + 1
    while j < len(lines) and lines[j].strip() != "}":
        j += 1
    block = "\n".join(lines[i + 1 : j + 1])
    i = j + 1

    if subset != "latin":
        continue

    weight_m = re.search(r"font-weight:\s*(\d+)", block)
    url_m = re.search(r"url\((https://[^)]+\.woff2)\)", block)
    if not (weight_m and url_m):
        continue

    name = f"bricolage-{weight_m.group(1)}.woff2"
    req = urllib.request.Request(url_m.group(1), headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()

    (OUT_DIR / name).write_bytes(data)
    downloaded.append((name, len(data)))
    kept.append(block.replace(url_m.group(1), f"/assets/fonts/{name}"))

header = (
    "/* Bricolage Grotesque — 本地自托管（仅 latin 子集，中文走系统字体回退）\n"
    "   来源：Google Fonts · SIL Open Font License 1.1 */\n"
)
CSS_OUT.write_text(header + "\n".join(kept) + "\n", encoding="utf-8")

for n, s in downloaded:
    print(f"  {n:28s} {s:>8,} B")
print(f"\n共 {len(downloaded)} 个字体，合计 {sum(s for _, s in downloaded):,} B")
print(f"→ {OUT_DIR}/")
print(f"→ {CSS_OUT}")
