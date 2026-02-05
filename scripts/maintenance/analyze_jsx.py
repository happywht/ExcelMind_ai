# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_jsx = False
jsx_brace_count = 0
jsx_paren_count = 0

for i, line in enumerate(lines, 1):
    # Check if we're entering return statement
    if 'return (' in line:
        in_jsx = True
        print(f"Line {i}: Entering JSX return")

    if in_jsx and i >= 798:
        # Count braces and parens in JSX
        for j, char in enumerate(line):
            if char == '{':
                jsx_brace_count += 1
            elif char == '}':
                jsx_brace_count -= 1
            elif char == '(':
                jsx_paren_count += 1
            elif char == ')':
                jsx_paren_count -= 1

        print(f"Line {i}: brace={jsx_brace_count}, paren={jsx_paren_count} | {line.rstrip()[:80]}")

        # Check for function end
        if line.strip() == '};':
            print(f"\nFunction ended at line {i}")
            break

print(f"\nFinal JSX counts: brace={jsx_brace_count}, paren={jsx_paren_count}")
