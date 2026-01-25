# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

stack = []  # Stack to track opening braces

for i, line in enumerate(lines, 1):
    for j, char in enumerate(line):
        if char == '{':
            stack.append((i, j))
        elif char == '}':
            if stack:
                stack.pop()
            else:
                print(f"ERROR: Unmatched closing brace at line {i}, col {j}")

print(f"\nUnclosed braces count: {len(stack)}")
if stack:
    print("Unclosed braces locations (first 10):")
    for item in stack[:10]:
        line_num, col = item
        print(f"  Line {line_num}, col {col}: {lines[line_num-1][col:col+50]}")
