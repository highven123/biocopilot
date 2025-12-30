import os
import sys
import logging
from pathlib import Path
from datetime import datetime

# ==================================================================================
# CRITICAL FIX FOR PACKAGED APP IPC
# Force stdout/stderr to be unbuffered IMMEDIATELY before any imports/logging
# ==================================================================================
try:
    # FORCE UTF-8 ENCODING FOR ALL STREAMS ON ALL PLATFORMS
    # This prevents 'gbk' or other legacy encoding crashes (e.g. emojis 🔥)
    if hasattr(sys.stdin, 'reconfigure'):
        sys.stdin.reconfigure(encoding='utf-8', line_buffering=True)
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)
except Exception as e:
    # Safety fallback for older Python or restricted environments
    print(f">>> [BioEngine] Warning: Could not reconfigure streams: {e}", file=sys.stderr, flush=True)

print(">>> [BioEngine] BOOTSTRAP VERIFICATION (FINAL 4 - DEBUG CMD) <<<", file=sys.stderr, flush=True)


# Force PyInstaller to include these for pkg_resources compatibility
try:
    import pkg_resources
    import jaraco.text
    import jaraco.functools
    import jaraco.context
except ImportError:
    pass

# Diagnostic module loading for packaged app
print(">>> [BioEngine] Diagnostic: Loading core scientific modules...", file=sys.stderr, flush=True)
for mod_name in ['numpy', 'pandas', 'scipy', 'openai', 'gseapy', 'cryptography', 'httpx', 'certifi']:
    try:
        __import__(mod_name)
        print(f">>> [BioEngine] OK: {mod_name} loaded", file=sys.stderr, flush=True)
    except ImportError as e:
        print(f">>> [BioEngine] FAIL: {mod_name} failed to load: {e}", file=sys.stderr, flush=True)

# Setup file logging for packaged app
def setup_logging():
    """Setup file logging to user's home directory."""
    log_dir = Path.home() / ".bioviz_local" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    
    log_file = log_dir / f"bio-engine_{datetime.now().strftime('%Y%m%d')}.log"
    
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler(sys.stderr)
        ]
    )
    logging.info(f"=== BioViz Engine Starting ===")
    logging.info(f"Python version: {sys.version}")
    logging.info(f"Executable: {sys.executable}")
    logging.info(f"Working directory: {os.getcwd()}")
    logging.info(f"Log file: {log_file}")
    return log_file

setup_logging()


# ==============================================================================
# CRITICAL FIX: Runtime Module Path
# Ensure custom modules (agent_runtime, motia, workflow_registry, narrative)
# are discoverable by adding the python directory to sys.path
# ==============================================================================
# Determine the directory containing this script
if hasattr(sys, '_MEIPASS'):
    # Running as PyInstaller bundle - modules should be in the bundle
    bundle_dir = sys._MEIPASS
    logging.info(f"Running in PyInstaller bundle: {bundle_dir}")
    # Add bundle directory to path (should already be there, but ensure it)
    if bundle_dir not in sys.path:
        sys.path.insert(0, bundle_dir)
else:
    # Running from source - add the python directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    logging.info(f"Running from source: {script_dir}")
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)

# Log sys.path for debugging
logging.info(f"Python sys.path: {sys.path[:3]}...")  # Log first 3 entries

# Check if running in packaged app (PyInstaller)
is_packaged = hasattr(sys, '_MEIPASS')

try:
    import bio_core
    logging.info("bio_core imported successfully")
except ImportError as e:
    logging.error(f"Failed to import bio_core: {e}")
    # Try adding current directory to path just in case
    sys.path.append(os.getcwd())
    try:
        import bio_core
        logging.info("bio_core imported successfully after path fix")
    except ImportError as e2:
        # Fallback: Create a dummy bio_core with just the run method if it's missing (for bootstrapping)
        # This is CRITICAL if bio_core itself has import errors due to missing scipy/etc
        logging.error(f"FATAL: Failed to import bio_core: {e2}")
        print(f"FATAL: Failed to import bio_core: {e2}", file=sys.stderr)
        # We don't exit yet, we might still be able to run SYS_CHECK if we import it manually
        # sys.exit(1) (Removed to allow pure diagnostic mode)

try:
    import sys_check
except ImportError:
    logging.warning("sys_check module not found")
    sys_check = None

def handle_sys_check():
    """Run system check isolation mode."""
    if sys_check:
        report = sys_check.perform_system_check()
        print(f"JSON_START{json.dumps(report)}JSON_END", flush=True)
    else:
        print(f"JSON_START{{'status': 'error', 'message': 'sys_check module missing'}}JSON_END", flush=True)

# Patch bio_core.run if we can mod it, OR just intercept the command here?
# Since bio_core.run() reads stdin loop, we're better off adding a special case handled here 
# OR trusting bio_core imports. 
# 
# ACTUALLY: The best way is to let bio_core handle it. I will modify bio_core.py next.
# But if bio_core fails to load due to missing deps (scipy), we need a fallback here.



if __name__ == "__main__":
    try:
        logging.info("Starting main execution")
        if hasattr(bio_core, 'run'):
            logging.info("Calling bio_core.run()")
            bio_core.run()
        elif hasattr(bio_core, 'main'):
            logging.info("Calling bio_core.main()")
            bio_core.main()
        else:
            logging.error("bio_core module has no run() or main() function")
            print("bio_core module has no run() or main() function", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        logging.exception(f"Fatal error in main execution: {e}")
        print(f"Fatal error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        logging.info("=== BioViz Engine Exiting ===")
