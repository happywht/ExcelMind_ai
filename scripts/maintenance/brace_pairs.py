# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

open_braces = []  # List of (line_num, col)
close_braces = []  # List of (line_num, col)

for i, line in enumerate(lines, 1):
    for j, char in enumerate(line):
        if char == '{':
            open_braces.append((i, j))
        elif char == '}':
            close_braces.append((i, j))

print(f"Total open braces: {len(open_braces)}")
print(f"Total close braces: {len(close_braces)}")
print(f"Difference: {len(open_braces) - len(close_braces)}")

if len(open_braces) > len(close_braces):
    print(f"\nFirst unclosed open brace:")
    line_num, col = open_braces[len(close_braces)]
    print(f"  Line {line_num}, col {col}")
    print(f"  Content: {lines[line_num-1].rstrip()}")
    # Show context
    if line_num > 1:
        print(f"  Previous line: {lines[line_num-2].rstrip()}")
else:
    print("\nAll braces matched!")

# Show last 10 open and close braces
print("\nLast 10 open braces:")
for item in open_braces[-10:]:
    print(f"  Line {item[0]}, col {item[1]}: {lines[item[0]-1].strip()[:60]}")

print("\nLast 10 close braces:")
for item in close_braces[-10:]:
    print(f"  Line {item[0]}, col {item[1]}: {lines[item[0]-1].strip()[:60]}")
