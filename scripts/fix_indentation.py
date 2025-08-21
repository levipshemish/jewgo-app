#!/usr/bin/env python3
"""
Fix indentation issues in app_factory.py
"""

import re

def fix_indentation():
    """Fix indentation issues in app_factory.py"""
    
    # Read the file
    with open('backend/app_factory.py', 'r') as f:
        content = f.read()
    
    # Fix specific indentation patterns
    fixes = [
        # Fix except blocks that are misaligned
        (r'(\s+)except Exception as e:', r'        except Exception as e:'),
        # Fix try blocks that are missing proper indentation
        (r'(\s+)if room_id:\s*\n(\s+)except Exception as e:', r'        if room_id:\n            pass\n        except Exception as e:'),
        # Fix other misaligned blocks
        (r'(\s+)is_open = False\s*\n(\s+)if hours_structured:', r'        is_open = False\n        if hours_structured:'),
        (r'(\s+)return jsonify\(\{\s*\n(\s+)except Exception as e:', r'        return jsonify({\n            pass\n        except Exception as e:'),
    ]
    
    # Apply fixes
    for pattern, replacement in fixes:
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    
    # Write back to file
    with open('backend/app_factory.py', 'w') as f:
        f.write(content)
    
    print("Indentation fixes applied to app_factory.py")

if __name__ == "__main__":
    fix_indentation()
