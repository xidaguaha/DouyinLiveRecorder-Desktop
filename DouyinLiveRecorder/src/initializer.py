# -*- coding: utf-8 -*-
import os
import sys
import subprocess
import json
from pathlib import Path
execute_dir = os.path.split(os.path.realpath(sys.argv[0]))[0]
def is_tool_available(name: str) -> bool:
    try:
        subprocess.run([name, '--version'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False
def check_node():
    if not is_tool_available('node'):
        if sys.platform.startswith('win'):
            node_dir = Path(execute_dir) / 'node'
            if node_dir.exists():
                os.environ['PATH'] = str(node_dir) + os.pathsep + os.environ.get('PATH', '')
                return True
    return True
