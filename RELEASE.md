# GitHub Actions 多平台构建指南

## 自动构建流程

当您推送一个版本标签（如 `v1.0.0`）时，GitHub Actions 会自动构建：
- **macOS**: Universal Binary（同时支持 Intel 和 Apple Silicon）
- **Windows**: MSI 和 EXE 安装程序

## 使用步骤

### 1. 推送到 GitHub（如果还没有）

```bash
# 初始化 git 仓库（如果还没有）
git init
git add .
git commit -m "Initial commit"

# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/BioViz-Local.git

# 推送代码
git push -u origin main
```

### 2. 创建版本标签

```bash
# 创建标签
git tag v1.0.0

# 推送标签到 GitHub
git push origin v1.0.0
```

### 3. 等待构建完成

1. 访问您的 GitHub 仓库
2. 点击 **Actions** 标签页
3. 查看构建进度
4. 构建完成后，会自动创建一个 **Draft Release**

### 4. 发布版本

1. 进入 **Releases** 标签页
2. 找到自动创建的草稿版本
3. 编辑发布说明（可选）
4. 点击 **Publish release**

## 手动触发构建

如果不想创建标签，也可以手动触发：

1. 访问 GitHub 仓库的 **Actions** 页面
2. 选择 **Release Build** 工作流
3. 点击 **Run workflow**
4. 选择分支并运行

## 生成的文件

构建完成后，会生成：

### macOS
- `BioViz Local_版本号_universal.dmg` - Universal Binary DMG 安装包

### Windows
- `BioViz Local_版本号_x64_en-US.msi` - MSI 安装程序
- `BioViz Local_版本号_x64-setup.exe` - EXE 安装程序（NSIS）

## 注意事项

### macOS 代码签名（可选）
如果需要代码签名，需要添加以下 GitHub Secrets：
- `APPLE_CERTIFICATE` - Base64 编码的证书
- `APPLE_CERTIFICATE_PASSWORD` - 证书密码
- `APPLE_ID` - Apple ID
- `APPLE_PASSWORD` - App-specific password
- `APPLE_TEAM_ID` - Team ID

### Windows 代码签名（可选）
如果需要代码签名，需要添加：
- `WINDOWS_CERTIFICATE` - Base64 编码的证书
- `WINDOWS_CERTIFICATE_PASSWORD` - 证书密码

## 本地构建命令

如果您想在本地测试构建：

```bash
# macOS Universal
npm run tauri build -- --target universal-apple-darwin

# Windows (需要在 Windows 上运行)
npm run tauri build

# macOS (仅当前架构)
npm run tauri build
```

## 故障排除

### Python 依赖问题
如果构建失败，检查 Python 依赖是否正确安装：
- 确保 `numpy`, `scipy`, `openpyxl` 已安装
- 检查 PyInstaller 版本兼容性

### Rust 编译错误
- 清除缓存：`cargo clean`
- 更新 Rust：`rustup update`

### GitHub Actions 超时
- 免费账户有 2000 分钟/月的限制
- macOS 构建消耗 10 倍时间credits
