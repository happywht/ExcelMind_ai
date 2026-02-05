# -*- coding: utf-8 -*-

with open('components/DocumentSpace/DocumentSpace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

in_string = False
in_template = False
in_comment = False
string_char = None
paren_count = 0
brace_count = 0

for i, char in enumerate(content):
    # Track strings and templates
    if not in_comment:
        if char in ['"', "'", '`'] and not in_string:
            in_string = True
            string_char = char
        elif char == string_char and in_string:
            # Check for escaped quotes
            if i > 0 and content[i-1] != '\\':
                in_string = False
                string_char = None

    # Track comments
    if not in_string:
        if char == '/' and i+1 < len(content):
            if content[i+1] == '/' and not in_comment:
                in_comment = True  # Single line comment
            elif content[i+1] == '*' and not in_comment:
                in_comment = 'multi'  # Multi line comment
        if char == '\n' and in_comment is True:
            in_comment = False  # End single line comment
        if char == '*' and i+1 < len(content) and content[i+1] == '/' and in_comment == 'multi':
            in_comment = False  # End multi line comment

    # Count parentheses and braces (only outside strings and comments)
    if not in_string and not in_comment:
        if char == '(':
            paren_count += 1
        elif char == ')':
            paren_count -= 1
        elif char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1

        if paren_count < 0:
            print(f"Error: Unmatched ')' at position {i}")
            break
        if brace_count < 0:
            print(f"Error: Unmatched '}}' at position {i}")
            break

print(f"\nFinal counts: paren={paren_count}, brace={brace_count}")
