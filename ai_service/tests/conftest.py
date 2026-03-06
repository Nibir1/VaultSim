# ai_service/tests/conftest.py

# Purpose: Pytest configuration to resolve paths dynamically for testing.
# Author: Nahasat Nibir (Lead Cloud Architect)

import sys
from pathlib import Path

# Add src and src/api to sys.path to resolve internal and gRPC imports during tests
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "api"))