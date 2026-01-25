# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

open_parens = []  # List of (line_num, col)
close_parens = []  # List of (line_num, col)

for i, line in enumerate(lines, 1):
    for j, char in enumerate(line):
        if char == '(':
            open_parens.append((i, j))
        elif char == ')':
            close_parens.append((i, j))

print(f"Total open parens: {len(open_parens)}")
print(f"Total close parens: {len(close_parens)}")
print(f"Difference: {len(open_parens) - len(close_parens)}")

if len(open_parens) > len(close_parens):
    print(f"\nFirst unclosed open paren:")
    line_num, col = open_parens[len(close_parens)]
    print(f"  Line {line_num}, col {col}")
    print(f"  Content: {lines[line_num-1].rstrip()}")
    # Show context
    if line_num > 1:
        print(f"  Previous line: {lines[line_num-2].rstrip()}")
    if line_num < len(lines):
        print(f"  Next line: {lines[line_num].rstrip()}")

# Show last 10 open parens
print("\nLast 10 open parens:")
for item in open_parens[-10:]:
    line_num, col = item
    prefix = "  " if lines[line_num-1].strip().startswith("export") else "    "
    print(f"{prefix}Line {line_num}, col {col}: {lines[line_num-1].lstrip()[:70]}")
