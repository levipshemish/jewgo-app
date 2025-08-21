#!/usr/bin/env python3
"""
Fix specific problematic lines in app_factory.py
"""

def fix_specific_lines():
    """Fix specific problematic lines in app_factory.py"""
    
    # Read the file
    with open('backend/app_factory.py', 'r') as f:
        content = f.read()
    
    # Fix the specific problematic patterns
    fixes = [
        # Fix the disconnect function
        ('                            except Exception as e:\n            logger.error(f"Error handling disconnection: {e}")',
         '        except Exception as e:\n            logger.error(f"Error handling disconnection: {e}")'),
        
        # Fix the join_room function
        ('            except Exception as e:\n            logger.error(f"Error joining room: {e}")\n            emit(\'error\', {\'message\': \'Failed to join room\'})',
         '        except Exception as e:\n            logger.error(f"Error joining room: {e}")\n            emit(\'error\', {\'message\': \'Failed to join room\'})'),
        
        # Fix the leave_room function
        ('            except Exception as e:\n            logger.error(f"Error leaving room: {e}")\n            emit(\'error\', {\'message\': \'Failed to leave room\'})',
         '        except Exception as e:\n            logger.error(f"Error leaving room: {e}")\n            emit(\'error\', {\'message\': \'Failed to leave room\'})'),
        
        # Fix the restaurant status function
        ('                is_open = False\n                    if hours_structured:',
         '                is_open = False\n                if hours_structured:'),
        
        # Fix the performance stats function
        ('                return jsonify({\n                \'success\': True,\n                \'data\': stats\n            })\n\n            except Exception as e:',
         '            return jsonify({\n                \'success\': True,\n                \'data\': stats\n            })\n        except Exception as e:'),
        
        # Fix the cache clear function
        ('            return jsonify({\n                \'success\': True,\n                \'message\': \'Cache cleared successfully\'\n            })\n\n            except Exception as e:',
         '            return jsonify({\n                \'success\': True,\n                \'message\': \'Cache cleared successfully\'\n            })\n        except Exception as e:'),
    ]
    
    # Apply fixes
    for old_pattern, new_pattern in fixes:
        content = content.replace(old_pattern, new_pattern)
    
    # Write back to file
    with open('backend/app_factory.py', 'w') as f:
        f.write(content)
    
    print('Fixed specific problematic lines in app_factory.py')

if __name__ == "__main__":
    fix_specific_lines()
