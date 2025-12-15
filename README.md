# BioViz Local (生物通路可视化分析系统)

BioViz Local 是一个**本地优先**、保护隐私的生物通路分析与可视化工具。它结合了现代 Web 技术 (React + Tauri) 与强大的 Python 分析引擎，通过本地 AI 智能体辅助，为您提供直观、深入的基因/蛋白质组学数据分析体验。

![BioViz Screenshot](https://raw.githubusercontent.com/highven123/BioViz-Local/main/screenshots/demo.png)

## ✨ 核心特性

*   **🔒 本地优先与隐私保护**：所有数据处理均在您本地计算机上完成，无需上传敏感的基因表达数据到云端服务器。
*   **🧬 交互式 KEGG 通路分析**：支持 KEGG 通路的高级渲染，能够将您的基因/蛋白质 log2 fold change 表达数据直接映射到通路图上，自动匹配节点颜色。
*   **🤖 上下文感知 AI 助手**：
    *   **Logic Lock 安全架构**：AI 操作严格受限，只有在用户授权后才能执行敏感操作。
    *   **深度分析**：AI 可以感知当前查看的通路和数据，提供基于真实数据的生物学洞察（如"分析糖酵解通路的表达模式"）。
    *   **工具调用**：AI 可自动执行数据查询、通路切换和统计分析。
*   **📊 多维度数据展示**：集成火山图 (Volcano Plot)、统计摘要面板和详细的数据表格。
*   **📝 报告导出**：支持导出高质量的 SVG/PNG 图片以及可编辑的 PPTX 演示文稿，方便学术发表。

## 🛠️ 技术栈

*   **Frontend**: React, TypeScript, Vite, TailwindCSS
*   **Backend (App)**: Tauri (Rust)
*   **Analysis Engine**: Python 3.11+, Pandas, NetworkX, BioPython
*   **AI Engine**: 集成 DeepSeek, OpenAI 或本地 Ollama 模型

## 🚀 快速开始

### 前置要求

确保您的系统已安装：
*   [Node.js](https://nodejs.org/) (v16+)
*   [Rust & Cargo](https://rustup.rs/) (用于构建桌面应用)
*   [Python 3.11+](https://www.python.org/) (用于分析引擎)

### 安装步骤

1.  **克隆仓库**
    ```bash
    git clone https://github.com/highven123/BioViz-Local.git
    cd BioViz-Local
    ```

2.  **安装前端依赖**
    ```bash
    npm install
    ```

3.  **设置 Python 环境**
    建议使用虚拟环境：
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    pip install -r python/requirements.txt
    ```

### 运行开发版

```bash
npm run tauri dev
```
此命令将同时启动前端开发服务器和 Tauri 窗口。

## 🤖 AI 配置

BioViz Local 支持多种 AI 模型。请在项目根目录创建 `.env` 文件或使用提供的 `setup-ai-env.sh` 脚本进行配置。

参考模板 (`.env.example`)：
```ini
# 选择 AI 提供商: deepseek, openai, 或 ollama
AI_PROVIDER=deepseek

# API 密钥 (本地 Ollama 不需要)
DEEPSEEK_API_KEY=your_api_key_here

# 模型名称
DEEPSEEK_MODEL=deepseek-chat
```

## 📖 使用指南

1.  **导入数据**：点击主页面的 "Import Data"，上传包含基因/蛋白质表达数据的 CSV/Excel 文件。
2.  **映射列名**：系统会自动尝试识别 Gene Name, Log2FC 和 P-value 列，您可以手动校正。
3.  **选择通路**：在左侧列表选择感兴趣的 KEGG 通路（如 "Glycolysis / Gluconeogenesis"）。
4.  **AI 交互**：点击右侧 "AI Chat"，尝试提问：
    *   "分析当前通路的表达情况"
    *   "为什么 PFKM 下调？"
    *   "导出这份分析报告"

## 📄 许可证

MIT License

---
*BioViz Local - 让生物信息学分析更简单、更安全、更智能。*
