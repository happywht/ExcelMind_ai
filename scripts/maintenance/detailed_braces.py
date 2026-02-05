# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

stack = []  # Stack to track opening braces

for i, line in enumerate(lines, 1):
    for j, char in enumerate(line):
        if char == '{':
            stack.append((i, j, 'open'))
        elif char == '}':
            if stack:
                last_open = stack.pop()
                if last_open[3] == 'close':
                    print(f"ERROR: Extra closing brace at line {i}, col {j}")
            else:
                print(f"ERROR: Unmatched closing brace at line {i}, col {j}")
                stack.append((i, j, 'close'))

print(f"\nStack size: {len(stack)}")
if stack:
    print("Unclosed braces:")
    for item in stack:
        print(f"  Line {item[0]}, col {item[1]}: {item[2]}")
