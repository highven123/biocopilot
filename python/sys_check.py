
import sys
import os
import shutil
import platform
import socket
import logging
from pathlib import Path
import json

def check_ram_gb():
    """Get total RAM in GB. Uses platform-specific methods if psutil is missing."""
    try:
        import psutil
        return round(psutil.virtual_memory().total / (1024**3), 2)
    except ImportError:
        # Fallback for Mac
        if sys.platform == 'darwin':
            try:
                import subprocess
                cmd = ['sysctl', '-n', 'hw.memsize']
                mem_bytes = int(subprocess.check_output(cmd).decode().strip())
                return round(mem_bytes / (1024**3), 2)
            except Exception:
                return -1
        return -1

def check_disk_space_gb(path="."):
    """Get free disk space in GB."""
    try:
        total, used, free = shutil.disk_usage(path)
        return round(free / (1024**3), 2)
    except Exception:
        return -1

def check_network(host="www.kegg.jp", port=443, timeout=3):
    """Check connectivity to critical services."""
    try:
        socket.create_connection((host, port), timeout=timeout)
        return True
    except OSError:
        return False

def check_dependencies():
    """Check critical python dependencies."""
    required = ['pandas', 'numpy', 'scipy', 'statsmodels']
    missing = []
    for pkg in required:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    return missing

def perform_system_check():
    """Run all checks and return a dict report."""
    
    # 1. RAM Check (Require > 4GB recommended)
    ram_gb = check_ram_gb()
    ram_status = "OK" if ram_gb >= 4 else "WARN" if ram_gb > 0 else "UNKNOWN"
    
    # 2. Disk Check (Require > 2GB free)
    disk_free_gb = check_disk_space_gb()
    disk_status = "OK" if disk_free_gb >= 2 else "WARN"
    
    # 3. Connectivity
    # Check NCBI/KEGG (primary scientific data sources)
    kegg_ok = check_network("www.kegg.jp")
    ncbi_ok = check_network("www.ncbi.nlm.nih.gov")
    network_status = "OK" if (kegg_ok or ncbi_ok) else "OFFLINE"
    
    # 4. Binary/Sidecar integrity
    # (In this context, bio-engine IS the sidecar, so we check if key paths exist)
    assets_ok = True
    assets_path = Path(__file__).parent.parent / "src-tauri" / "binaries"
    # Logic is handled by the wrapper scripts usually, here we just report
    
    # 5. Dependency integrity
    missing_deps = check_dependencies()
    deps_status = "OK" if not missing_deps else "CRITICAL"

    report = {
        "ram": {"total_gb": ram_gb, "status": ram_status, "threshold": 4},
        "disk": {"free_gb": disk_free_gb, "status": disk_status, "threshold": 2},
        "network": {
            "kegg_accessible": kegg_ok,
            "ncbi_accessible": ncbi_ok,
            "status": network_status
        },
        "dependencies": {
            "missing": missing_deps,
            "status": deps_status
        },
        "timestamp": str(datetime.now())
    }
    
    return report

if __name__ == "__main__":
    from datetime import datetime
    print(json.dumps(perform_system_check(), indent=2))
