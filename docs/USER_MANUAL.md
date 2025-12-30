# BioCopilot-Local 用户手册 v2.0

> **核心理念**：让生物信息学分析更简单、更安全、更智能。从原始数据到高质量证据，只需四步。

---

## 📚 目录

1.  **产品简介**
    *   核心价值
    *   适用场景
2.  **安装与配置**
    *   系统要求
    *   安装步骤
    *   AI 模型配置
    *   许可激活 (Pro)
3.  **快速入门：四步分析法**
    *   Step 1: 导入数据 (Inventory)
    *   Step 2: 映射列 (Mapping)
    *   Step 3: 选择通路 (Context)
    *   Step 4: 可视化与洞察 (Insight)
4.  **功能模块深度解析**
    *   📊 **Data Import Wizard (数据导入向导)**：智能识别与清洗
    *   🗺️ **Pathway Visualizer (通路可视化)**：动态渲染与表达量映射
    *   🌋 **Volcano Plot & Stats (统计分析)**：交互式火山图与双向筛选
    *   🤖 **AI Assistant (智能助手)**：AI 驱动的洞察与智能操作
    *   🧪 **Enrichment Analysis (富集分析)**：一键运行 ORA/GSEA
    *   📉 **DE Analysis (差异表达)**：从 Count 矩阵到火山图
5.  **高级操作**
    *   多样本/时间序列表达分析
    *   导出高质量图表与报告
    *   项目管理与历史回溯
6.  **附录**
    *   快捷键
    *   数据隐私声明

---

## 1. 产品简介

**BioCopilot-Local** 是一款专注于隐私保护的本地化生物通路可视化与分析工具。它结合了现代 Web 技术 (React + Tauri) 的流畅交互与 Python 分析引擎的强大算力，旨在为生命科学研究者提供"所见即所得"的分析体验。

### 核心价值
*   **🔒 隐私优先**：所有数据处理均在本地完成，核心业务逻辑不依赖云端。AI 功能采用"逻辑锁"架构，仅在显式授权下运行。
*   **🧬 交互式 KEGG**：告别静态图片。动态渲染 KEGG 通路，支持缩放、拖拽，并将表达量数据实时映射到节点颜色。
*   **🤖 上下文感知 AI**：不仅仅是聊天机器人。AI 理解当前的通路和数据上下文，能自动执行分析任务（如"运行 GSEA"）。
*   **📊 一站式证据链**：从火山图筛选差异基因，到通路定位，再到 AI 生成解释报告，形成完整的科研证据链。

### 适用场景
*   **RNA-seq / Proteomics 数据分析**：快速查看差异表达基因在代谢通路或信号通路中的分布。
*   **机制探索**：利用 AI 助手快速查询基因功能、互作关系及潜在的上下游调控。
*   **学术图表制作**：导出矢量级 (SVG) 通路图或可编辑的 PPTX 报告。

---

## 2. 安装与配置

### 系统要求
*   **操作系统**：macOS (Apple Silicon/Intel), Windows 10/11, Linux
*   **环境依赖**：
    *   Node.js v16+ (前端运行环境)
    *   Python 3.11+ (分析引擎核心)
    *   Rust (仅用于自行编译桌面客户端)

### 安装步骤

#### 方式 A：预编译包 (推荐)
1.  下载适合您系统的安装包 (`.dmg`, `.exe`, `.deb`)。
2.  双击运行安装。
3.  **首次启动**：程序会自动检测环境。如果缺少 `python` 或相关库，会提示安装或配置路径。

#### 方式 B：源码运行 (开发者模式)
1.  克隆仓库：`git clone https://github.com/highven123/BioCopilot-Local.git`
2.  安装前端依赖：`cd BioCopilot-Local && npm install`
3.  配置 Python：
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r python/requirements.txt
    ```
4.  启动：`npm run tauri dev`

### AI 模型配置
BioCopilot 支持多种 AI 后端。请在项目根目录创建 `.env` 文件进行配置：

```ini
# 选择 AI 提供商: deepseek, openai, ollama (本地)
AI_PROVIDER=deepseek

# API Key (Ollama 不需要)
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_MODEL=deepseek-v3.2-exp
```

### 许可激活 (Pro 功能)
部分高级功能（如 PPTX 导出、批量分析）需要 Pro 许可。
1.  点击主界面右上角的 ⚙️ 或系统状态图标。
2.  选择 "License Info"。
3.  输入激活码并验证。

---

## 3. 快速入门：四步分析法

启动 BioCopilot 后，您将看到直观的 **Analysis Workflow** 面板。只需四步即可获得结果。

### Step 1: 导入数据 (Import)
*   点击 **Upload** 区域或直接拖拽文件。
*   **支持格式**：`.csv`, `.txt` (制表符分隔), `.xlsx`。
*   **数据类型**：Gene Expression (默认), Protein Abundance, Flow Cytometry。
*   **模板下载**：界面提供标准 CSV 模板下载，建议初次使用时参考。

### Step 2: 映射列 (Map)
系统会自动尝试识别列名。如果无法识别，请手动指定：
*   **Entity / Gene Column**：包含基因名（Symbol 或 ID）的列。
*   **Value / Log2FC Column**：包含变化倍数或是数值的列。
    *   *高级*：如果上传的是 Raw Counts 矩阵，勾选 "Raw Matrix Mode"，系统会自动计算 Log2FC。
*   **P-value Column (可选)**：如果提供，火山图将支持显著性筛选；若未提供，所有点均视为显著。

### Step 3: 选择通路 (Context)
*   从下拉列表或搜索框中选择目标 KEGG 通路（例如 `hsa00010 Glycolysis`）。
*   系统已内置常用通路库，支持离线搜索。

### Step 4: 可视化 (Visualize)
*   点击 **Run Analysis**。
*   系统将：
    1.  解析数据并统计显著性。
    2.  下载/加载指定的 KEGG 通路图。
    3.  将您的基因数据"着色"到通路节点上（🔴 上调，🔵 下调）。
    4.  生成交互式火山图。

---

## 4. 功能模块深度解析

### 📊 Data Import Wizard (数据导入向导)
*   **智能清洗**：自动处理表头空格、重复行和非标准字符。
*   **Raw Matrix 模式**：
    *   自动识别 `Ctrl_*` 和 `Exp_*` 列。
    *   内置轻量级差异计算（T-test），即时生成 FoldChange。
*   **配置记忆**：自动保存上次使用的列映射设置，下次分析同一类文件时无需重复配置。

### 🗺️ Pathway Visualizer (通路可视化)
*   **交互操作**：
    *   **缩放**：滚轮缩放 (0.5x - 4x)，按住左键拖拽平移。
    *   **点击节点**：高亮节点，并在右侧弹出 "Evidence Popup" 显示该基因的详细数据（Log2FC, P-value）。
*   **图层控制**：
    *   **Reset View**：一键复位。
    *   **Color Scale**：通过右上角设置，调整颜色映射范围（例如 -2 到 +2）。

### 🌋 Volcano Plot & Stats (统计分析)
*   **双向交互**：
    *   **图 → 表**：用鼠标在火山图上框选区域，下方的 Data Table 会自动过滤显示选中基因。
    *   **表 → 图**：点击表格某一行，火山图上对应点会高亮闪烁。
*   **阈值控制**：拖动滑块实时调整 P-value 和 Log2FC 阈值，观察显著基因数量变化。

### 🤖 AI Assistant (智能助手)
位于右侧的可折叠面板，您的科研副驾驶。
*   **Chat Mode (对话模式)**：
    *   "分析此通路的表达模式" —— AI 总结通路整体变化趋势。
    *   "PFKM 基因起什么作用？" —— 查询单基因功能。
*   **Smart Skills (快捷技能)**：
    *   点击 **Analyze**：自动生成完整的文本报告。
    *   点击 **Suggest**：根据当前数据推荐值得关注的下游通路。
*   **Logic Lock**：所有 AI 操作（尤其是涉及代码执行或联网查询的）都会先弹窗请求确认，确保安全。

### 🧪 Enrichment Analysis (富集分析)
位于右侧面板 Tabs 中的 **Enrichment** 选项卡。
*   **ORA (Over-Representation Analysis)**：基于超几何分布，快速找出显著富集的通路/功能集。
*   **GSEA (Gene Set Enrichment Analysis)**：基于全基因列表排序，发现微小但协调一致的变化趋势。
*   **多种数据库**：内置 KEGG, GO, Reactome 等常用基因集。

### 📉 DE Analysis (差异表达)
位于右侧面板 Tabs 中的 **DE Analysis** 选项卡。
*   专为 Raw Counts 数据设计。
*   **PyDESeq2 集成**：在本地运行工业标准的 DESeq2 算法。
*   **分组管理**：交互式点选样本进行分组（Control vs Treatment）。
*   **结果联动**：分析完成后，结果自动同步到火山图和通路映射中。

---

## 5. 高级操作

### 多样本/时间序列表达分析
如果您上传的数据包含多个条件（如 Time 0h, 2h, 4h）：
1.  在 **Multi-Sample Panel** 中，选择要对比的列。
2.  系统会自动生成热图 (Heatmap) 或趋势图 (Trend Plot)。
3.  点击特定基因，查看其在不同时间点的变化曲线。

### 导出高质量图表与报告
*   **图片导出**：在工具栏点击 `PNG` 或 `SVG`。SVG 为矢量格式，可用 Adobe Illustrator 无损编辑。
*   **PPTX 导出**：生成包含通过路图、火山图和AI解读结论的可编辑 PPT 幻灯片。
*   **数据导出**：`Data` 按钮可导出清洗后的 CSV 结果表。

### 项目管理与历史回溯
*   点击左上角 **Project** 菜单及其历史记录。
*   系统自动保存最近的分析会话（包含配置、数据和 AI 对话记录）。
*   **Project Memory**：支持基于 SQLite 的历史检索，找回两周前做过的分析。

---

## 6. 附录

### 快捷键
*   `Cmd/Ctrl + ,`：打开设置
*   `Cmd/Ctrl + Shift + I`：打开开发者工具 (调试用)
*   `Esc`：关闭所有弹窗

### 数据隐私声明
BioCopilot-Local 承诺：
1.  **不上传原始数据**：您的 CSV/Excel 文件仅在本地内存中处理。
2.  **透明的 AI 调用**：发送给 AI 模型的仅限于 Prompt 文本和统计摘要（如"由 50 个基因上调"），不会发送完整的基因组数据，除非用户在 Prompt 中明文粘贴。
3.  **本地日志**：运行日志存储在用户本地目录，仅用于排查故障。
