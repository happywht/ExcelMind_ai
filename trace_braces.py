# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

brace_count = 0
prev_brace_count = 0

for i, line in enumerate(lines, 1):
    prev_brace_count = brace_count

    for char in line:
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1

    # Print lines where brace_count changes
    if brace_count != prev_brace_count:
        print(f"Line {i}: {prev_brace_count} -> {brace_count} | {line.rstrip()[:100]}")

print(f"\nFinal brace_count: {brace_count}")
