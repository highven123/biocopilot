/**
 * BioViz Local - Python Build Script (Extreme Slim Edition)
 * 
 * Goal: Build a Python directory for INSTANT startup (no decompression)
 * Strategy: Aggressive module exclusion via PyInstaller
 * 
 * Usage: node scripts/build-python.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const ROOT_DIR = path.resolve(__dirname, '..');
const PYTHON_DIR = path.join(ROOT_DIR, 'python');
const BINARIES_DIR = path.join(ROOT_DIR, 'src-tauri', 'binaries');
const PYTHON_ENTRY = path.join(PYTHON_DIR, 'bio_engine.py');
const PYTHON_CMD = process.platform === 'win32' ? 'python' : 'python3';

/**
 * Get the target triple from rustc
 */
function getTargetTriple() {
    try {
        const rustcOutput = execSync('rustc -vV', { encoding: 'utf-8' });
        const hostLine = rustcOutput.split('\n').find(line => line.startsWith('host:'));

        if (!hostLine) {
            throw new Error('Could not find host line in rustc output');
        }

        const triple = hostLine.replace('host:', '').trim();
        console.log(`[build-python] Detected target triple: ${triple}`);
        return triple;
    } catch (error) {
        console.error('[build-python] Failed to get target triple:', error.message);
        console.error('[build-python] Make sure Rust is installed and rustc is in PATH');
        process.exit(1);
    }
}

/**
 * Get file extension based on platform
 */
function getExtension(targetTriple) {
    return targetTriple.includes('windows') ? '.exe' : '';
}

/**
 * Generate PyInstaller exclusion list
 * This is the CRITICAL part for size reduction
 */
function getExclusionList() {
    return [
        // === GUI Frameworks (Save ~30MB) ===
        'tkinter', '_tkinter', 'Tkinter',
        'PyQt5', 'PyQt6', 'PySide2', 'PySide6',
        'wx', 'wxPython',
        'curses',

        // === Misc Large Packages (Only if definitely not needed) ===
        'sklearn', 'scikit-learn',
        'langchain', 'langsmith', 'langserve',
        'chromadb', 'faiss', 'pinecone',
        'IPython', 'jupyter',
        'notebook', 'nbformat',
    ];
}

/**
 * Format size in MB
 */
function formatSize(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2);
}

/**
 * Rebuild the Cythonized core so PyInstaller never bundles a stale .so
 */
function rebuildCythonCore() {
    console.log('[build-python] Cleaning up all stale .so, .pyc and build artifacts...');
    try {
        // Clean Cython artifacts
        execSync(`rm -rf *.so *.pyd bio_core.c build/`, { cwd: PYTHON_DIR });
        // Clean PyInstaller artifacts
        if (fs.existsSync(path.join(PYTHON_DIR, 'dist'))) fs.rmSync(path.join(PYTHON_DIR, 'dist'), { recursive: true });

        execSync(`${PYTHON_CMD} setup.py build_ext --inplace`, {
            cwd: PYTHON_DIR,
            stdio: 'inherit',
        });
    } catch (error) {
        console.error('[build-python] Failed to rebuild bio_core:', error.message);
        process.exit(1);
    }
}

/**
 * Run PyInstaller with aggressive exclusions
 */
function buildPython() {
    console.log('[build-python] Building Python engine with PyInstaller...');
    console.log('[build-python] 🔥 EXTREME SLIM MODE: Excluding unused modules');

    if (!fs.existsSync(PYTHON_ENTRY)) {
        console.error(`[build-python] Python entry point not found: ${PYTHON_ENTRY}`);
        process.exit(1);
    }

    try {
        const sep = process.platform === 'win32' ? ';' : ':';
        const sourcePath = path.join(ROOT_DIR, 'assets', 'templates');
        const destPath = path.join('assets', 'templates');
        const addDataArg = `--add-data "${sourcePath}${sep}${destPath}"`;

        // Build exclusion arguments
        const exclusions = getExclusionList();
        const excludeArgs = exclusions.map(mod => `--exclude-module ${mod}`).join(' ');

        // Hidden imports needed for pkg_resources/setuptools vendored packages

        const hiddenImports = [
            'setuptools', 'pkg_resources', 'distutils',
            'jaraco.text', 'jaraco.functools', 'jaraco.context',
            'platformdirs', 'tomli', 'email', 'calendar',
            'secrets', 'gseapy', 'scipy', 'pandas', 'numpy',
            'certifi', 'anyio', 'sniffio', 'httpcore', 'httpx',
            'concurrent.futures', 'multiprocessing', 'unittest',
            'packaging', 'cryptography', 'pycryptodome',
            'matplotlib', 'psutil', 'openpyxl',
            // BioViz Agent Modules
            'agent_runtime', 'motia', 'workflow_registry',
            'narrative.deduplication', 'narrative.literature_rag',
            // Phase 3: Single-Cell Modules
            'singlecell', 'singlecell.sc_loader', 'singlecell.pathway_scorer',
            'singlecell.spatial_lr', 'singlecell.trajectory'
        ];

        const hiddenImportArgs = hiddenImports.map(mod => `--hidden-import ${mod}`).join(' ');

        console.log(`[build-python] Excluding ${exclusions.length} modules...`);
        console.log(`[build-python] Adding ${hiddenImports.length} hidden imports...`);


        const pyinstallerCmd = [
            'pyinstaller',
            '--noconfirm',
            '--onedir',
            '--clean',
            `--paths "${PYTHON_DIR}"`,  // Ensure local modules are found
            `--additional-hooks-dir "${PYTHON_DIR}"`,  // Use custom hooks
            '--collect-all jaraco.text',
            '--collect-all jaraco.functools',
            '--collect-all jaraco.context',
            '--collect-all setuptools',
            '--collect-submodules scipy',
            '--collect-all scipy',
            '--collect-submodules gseapy',
            '--collect-all gseapy',
            '--collect-all pandas',
            '--collect-all numpy',
            '--collect-all certifi',
            '--collect-all anyio',
            '--collect-all sniffio',
            '--collect-all matplotlib',
            '--collect-all psutil',
            '--collect-all openpyxl',
            addDataArg,
            excludeArgs,
            hiddenImportArgs,
            '--name bio-engine',
            `--distpath "${PYTHON_DIR}/dist"`,
            `--workpath "${PYTHON_DIR}/py-build"`,
            `"${PYTHON_ENTRY}"`
        ].join(' ');

        execSync(pyinstallerCmd, {
            cwd: PYTHON_DIR,
            stdio: 'inherit',
        });

        console.log('[build-python] PyInstaller build complete');
    } catch (error) {
        console.error('[build-python] PyInstaller failed:', error.message);
        process.exit(1);
    }
}

/**
 * Move, rename, and report binary size
 */
function moveAndRenameBinary(targetTriple) {
    // PyInstaller --onedir creates a directory with exactly the --name string.
    // It does NOT append .exe to the directory name on Windows.
    const sourceName = 'bio-engine';
    const targetName = `bio-engine-${targetTriple}`;

    const sourcePath = path.join(PYTHON_DIR, 'dist', sourceName);
    const targetPath = path.join(BINARIES_DIR, targetName);

    console.log(`[build-python] Moving binary: ${sourceName} -> ${targetName}`);

    // Ensure binaries directory exists
    if (!fs.existsSync(BINARIES_DIR)) {
        fs.mkdirSync(BINARIES_DIR, { recursive: true });
    }

    // Check if source exists
    if (!fs.existsSync(sourcePath)) {
        console.error(`[build-python] Source binary not found: ${sourcePath}`);
        process.exit(1);
    }

    // For onedir on macOS/Linux, we MUST resolve absolute symlinks produced by PyInstaller.
    // fs.cpSync doesn't handle this well for Tauri bundling requirements.
    // Instead, use native 'cp -RL' to flatten symlinks into actual file contents.
    console.log(`[build-python] Flattening symlinks and copying: ${sourcePath} -> ${targetPath}`);
    if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
    }

    try {
        if (process.platform !== 'win32') {
            execSync(`cp -RL "${sourcePath}" "${targetPath}"`);
        } else {
            // Windows: fs.cpSync is generally fine or use xcopy/robocopy
            fs.cpSync(sourcePath, targetPath, { recursive: true });
        }
    } catch (err) {
        console.error('[build-python] Failed to copy/flatten directory:', err.message);
        process.exit(1);
    }

    // Make executable on Unix
    if (!targetTriple.includes('windows')) {
        fs.chmodSync(targetPath, 0o755);
    }

    console.log(`[build-python] Directory ready at: ${targetPath}`);
    console.log('');
    console.log('='.repeat(60));
    console.log(`📦 ONEDIR BUILD READY (Instant startup enabled)`);
    console.log('='.repeat(60));

    console.log('✅ Done.');
}

/**
 * Clean up build artifacts
 */
function cleanup() {
    console.log('[build-python] Cleaning up build artifacts...');

    const artifactsToRemove = [
        path.join(PYTHON_DIR, 'build'),
        path.join(PYTHON_DIR, 'dist'),
        path.join(PYTHON_DIR, 'bio-engine.spec'),
    ];

    for (const artifact of artifactsToRemove) {
        if (fs.existsSync(artifact)) {
            if (fs.statSync(artifact).isDirectory()) {
                fs.rmSync(artifact, { recursive: true, force: true });
            } else {
                fs.unlinkSync(artifact);
            }
        }
    }

    console.log('[build-python] Cleanup complete');
}

// Main execution
function main() {
    console.log('='.repeat(60));
    console.log('[build-python] BioViz Python Sidecar Build (EXTREME SLIM)');
    console.log('='.repeat(60));

    const targetTriple = getTargetTriple();
    rebuildCythonCore(); // Ensure bio_core.cpython-*.so matches latest source
    buildPython();
    moveAndRenameBinary(targetTriple);
    cleanup();

    console.log('='.repeat(60));
    console.log('[build-python] Build complete!');
    console.log('='.repeat(60));
}

main();
