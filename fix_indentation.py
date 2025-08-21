#!/usr/bin/env python3
"""
Fix indentation issues in app_factory.py
"""

def fix_indentation():
    """Fix indentation issues in app_factory.py"""
    
    # Read the file
    with open('backend/app_factory.py', 'r') as f:
        lines = f.readlines()
    
    # Fix specific problematic lines
    fixed_lines = []
    for i, line in enumerate(lines):
        # Fix line 1675 (is_open = False) - should be properly indented
        if i == 1674:  # 0-indexed
            line = '                    is_open = False\n'
        # Fix line 1725 (return jsonify) - should be properly indented
        elif i == 1724:  # 0-indexed
            line = '            return jsonify({\n'
        # Fix line 1730 (except Exception) - should be properly indented
        elif i == 1729:  # 0-indexed
            line = '        except Exception as e:\n'
        # Fix line 1732 (return jsonify in except) - should be properly indented
        elif i == 1731:  # 0-indexed
            line = '            return jsonify({\n'
        # Fix line 1748 (return jsonify) - should be properly indented
        elif i == 1747:  # 0-indexed
            line = '            return jsonify({\n'
        # Fix line 1750 (except Exception) - should be properly indented
        elif i == 1749:  # 0-indexed
            line = '        except Exception as e:\n'
        
        fixed_lines.append(line)
    
    # Write back to file
    with open('backend/app_factory.py', 'w') as f:
        f.writelines(fixed_lines)
    
    print('Fixed indentation issues in app_factory.py')

if __name__ == "__main__":
    fix_indentation()
