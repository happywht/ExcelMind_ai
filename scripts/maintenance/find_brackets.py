# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

paren_count = 0
brace_count = 0
bracket_count = 0

for i, line in enumerate(lines, 1):
    for j, char in enumerate(line):
        if char == '(':
            paren_count += 1
        elif char == ')':
            paren_count -= 1
        elif char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
        elif char == '[':
            bracket_count += 1
        elif char == ']':
            bracket_count -= 1

    if paren_count < 0 or brace_count < 0 or bracket_count < 0:
        print(f"Line {i}: Unbalanced! paren={paren_count}, brace={brace_count}, bracket={bracket_count}")
        print(f"Content: {line.rstrip()}")
        break

    # Print status every 100 lines
    if i % 100 == 0:
        print(f"Line {i}: paren={paren_count}, brace={brace_count}, bracket={bracket_count}")

print(f"\nFinal: paren={paren_count}, brace={brace_count}, bracket={bracket_count}")
