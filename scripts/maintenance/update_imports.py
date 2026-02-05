import os

replacements = [
    ("../../services", "../../src/services"),
    ("../services", "../src/services"),
    ("../../types", "../../src/types"),
    ("../types", "../src/types"),
    ("../../config", "../../src/config"),
    ("../config", "../src/config"),
    ("../../utils", "../../src/utils"),
    ("../utils", "../src/utils"),
    # Add hooks, contexts if needed
    ("../../hooks", "../../src/hooks"),
    ("../hooks", "../src/hooks"),
    ("../../contexts", "../../src/contexts"),
    ("../contexts", "../src/contexts"),
]

target_dirs = ["server", "api", "tests", "scripts"]

def update_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return

    original_content = content
    # specific order: longer matches first is naturally handled if we iterate replacement list?
    # No, simple replace strings might overlap.
    # Ex: replaced "../../services" with "../../src/services".
    # Next, search "../services". Does "../../src/services" contain "../services"?
    # Yes: "../../src/services" -> "../src/services". WRONG.
    # So we must NOT match partially inside already replaced string, or use regex word boundaries, or just be careful.
    
    # Better approach: Use regex to match only specific relative paths.
    # But simple approach:
    # 1. Replace `../../` with `__DOUBLE_DOT__` temporarily? No.
    # Only `../` is the prefix.
    # Actually, if we replace `../services` -> `../src/services`.
    # `../../services` becomes `../src/services`. WRONG.
    # So we MUST replace `../../` ones FIRST.
    
    # My list has `../../` first.
    # `content.replace("../../services", "../../src/services")`
    # Then `content` has `../../src/services`.
    # Then `content.replace("../services", "../src/services")`.
    # Does `../../src/services` contain `../services`?
    # NO. It contains `../src/services`.
    # Wait. `../../services` -> `../../src/services`.
    # `../src/services` contains `../src/services`.
    # `../services` search string.
    # Does `../../src/services` contain `../services`? No.
    # So it seems safe given the target is different?
    # Wait. `../types` -> `../src/types`.
    # If I have `../../types` and I replace `../../types` -> `../../src/types`.
    # Then I replace `../types`.
    # `../../src/types` does NOT contain `../types`.
    # So the order `../../` then `../` is SAFE.
    
    for old, new in replacements:
        content = content.replace(old, new)

    if content != original_content:
        print(f"Updating {filepath}")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

for d in target_dirs:
    if not os.path.exists(d):
        continue
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx') or file.endswith('.js'):
                update_file(os.path.join(root, file))
