# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

brace_count = 0
paren_count = 0

for i in range(105, 135):  # Lines 106-135 (0-indexed)
    line = lines[i]
    line_num = i + 1

    for char in line:
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
        elif char == '(':
            paren_count += 1
        elif char == ')':
            paren_count -= 1

    print(f"Line {line_num}: brace={brace_count}, paren={paren_count} | {line.rstrip()}")
