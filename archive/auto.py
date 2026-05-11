import json
import re
from pathlib import Path


INPUT_FILE = r"I:\pro\lore\lore.txt"
OUTPUT_FILE = r"I:\pro\lore\data.json"


def parse_furru_doc():
    # baca file
    text = Path(INPUT_FILE).read_text(encoding="utf-8")

    # buang marker pembuka/penutup kalau ada
    text = text.replace("~~~ Furru.docx", "")
    text = text.replace("~~~", "")
    text = text.strip()

    # split tiap block
    chunks = re.split(r"\n_{3,}\s*\n", text)

    data = []

    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk:
            continue

        lines = [
            line.rstrip()
            for line in chunk.splitlines()
            if line.strip()
        ]

        # minimal: REG-ID + title
        if len(lines) < 2:
            continue

        reg_id = lines[0]
        title = lines[1]
        content = "\n".join(lines[2:]).strip()

        data.append({
            "reg_id": reg_id,
            "title": title,
            "content": content
        })

    # bikin folder kalau belum ada
    Path(OUTPUT_FILE).parent.mkdir(parents=True, exist_ok=True)

    # save json
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

    print(f"done -> {OUTPUT_FILE}")
    print(f"entries: {len(data)}")


if __name__ == "__main__":
    parse_furru_doc()