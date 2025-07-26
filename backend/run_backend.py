#!/usr/bin/env python3
"""
Run the simple backend API server
"""

import subprocess
import sys
import os

# Change to backend directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Run the simple API
subprocess.run([sys.executable, "simple_api.py"])