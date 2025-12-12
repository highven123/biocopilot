# Windows Build Guide (Manual) / Windows 手动打包指南

Since you are not using GitHub Actions, follow these steps to build the Windows executable (`.exe`) directly on your Windows machine.

由于您不使用 GitHub Actions，请按照以下步骤直接在 Windows 机器上构建 `.exe` 可安装程序。

## 1. Prerequisites / 环境准备

Before you begin, ensure you have the following installed on your Windows system:
开始之前，请确保您的 Windows 系统已安装以下软件：

### A. Microsoft Visual Studio Build Tools (Critical)
1. Download **Visual Studio 2022 Build Tools**.
2. Run the installer.
3. Select the **"Desktop development with C++"** workload.
4. Ensures the following components are selected (usually default):
   - MSVC v143 - VS 2022 C++ x64/x86 build tools
   - Windows 11 (or 10) SDK

### B. Rust
1. Download `rustup-init.exe` from [rust-lang.org](https://www.rust-lang.org/tools/install).
2. Run it and follow the onscreen instructions (default options are usually fine).
3. Verify installation in PowerShell:
   ```powershell
   rustc --version
   cargo --version
   ```

### C. Node.js
1. Download and install Node.js (LTS version) from [nodejs.org](https://nodejs.org/).
2. Verify installation:
   ```powershell
   node -v
   npm -v
   ```

### D. Python
1. Download Python 3.13 (or 3.11+) from [python.org](https://www.python.org/).
2. **IMPORTANT**: During installation, check the box **"Add Python to PATH"**.
3. Verify installation:
   ```powershell
   python --version
   pip --version
   ```

---

## 2. Install Dependencies / 安装依赖

Open **PowerShell** or **Command Prompt** in the project directory.
在项目根目录下打开 **PowerShell** 或 **命令行**。

### A. Install Python Dependencies (安装 Python 库)
```powershell
pip install pyinstaller cython setuptools openpyxl numpy scipy
```

### B. Install Node.js Dependencies (安装 Node.js 库)
```powershell
npm install
```

---

## 3. Build Process / 打包流程

You must perform these two steps in order.
请务必按顺序执行以下两个步骤。

### Step 1: Build Python Backend (Step 1: 构建 Python 后端)
This compiles the Python code and prepares the sidecar executable.
此步骤编译 Python 代码并准备 sidecar 可执行文件。

```powershell
npm run build:python
```
*Wait for it to finish. You should see "Build complete!"*
*等待完成，您应该看到 "Build complete!"*

### Step 2: Build Windows Installer (Step 2: 构建 Windows 安装包)
This packages the React frontend and the Rust shell into an `.exe` installer.
此步骤将 React 前端和 Rust 外壳打包成 `.exe` 安装程序。

```powershell
npm run tauri build
```

---

## 4. Locate Output / 找到输出文件

Once the build finishes successfully, your installer will be located here:
打包成功后，安装程序可以在以下位置找到：

**Path:**
`src-tauri/target/release/bundle/nsis/BioViz Local_1.0.0_x64-setup.exe`

You can verify the file works by running it on your Windows machine.
您可以直接运行该文件来测试安装。
