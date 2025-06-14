#!/usr/bin/env python3
"""
Ada Interaction Engine - Main Entry Point

This is the main entry point for the Ada Interaction Engine, a dual-path voice and chat
interaction system with dynamic UI generation. This file simply delegates to the modular
server architecture defined in the app package.

Usage:
    python main.py

Environment Variables:
    See app/config.py for all supported environment variables.
    Basic configuration can be provided in a .env file.
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure basic logging until app configuration takes over
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

def main():
    """Main entry point for the Ada Interaction Engine"""
    try:
        # Add the current directory to the path to ensure imports work correctly
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        
        # Import the server module from the app package
        from app.server import run
        
        # Run the server
        logger.info("Starting Ada Interaction Engine")
        run()
        
    except ImportError as e:
        logger.error(f"Failed to import required modules: {e}")
        logger.error("Make sure you have installed all dependencies with: pip install -e .")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to start Ada Interaction Engine: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
