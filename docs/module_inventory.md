# BioCopilot 模块全清单（前端展示 + 后端隐藏）

> 目标：提供最完整的模块列表，覆盖前端可见功能、后端隐藏/算法模块，并说明优缺点与测试要点。
> 版本：基于当前仓库状态（含 Phase 1/2/3 变更）。

---

## 1. 前端展示功能（按界面与入口组织）

### 1.1 顶层模式与流程区
- **ANALYZER**
  - 作用：进入结构化分析模块区（DE/Sets/Multi/SC/Ref/Stats）。
  - 原理：切换 `rightPanelView` 到分析模块；右侧面板渲染对应组件。
  - 测试：切换后模块条可见、右侧面板正确显示。

- **Chat**
  - 作用：进入 AI 对话/解释区。
  - 原理：`AIChatPanel` 使用 `analysisContext` 渲染对话与实体点击。
  - 测试：消息可发送，AI 输出实体标签可点击。

- **Insight / Mapping / Synthesis（阶段导航）**
  - 作用：切换分析阶段与侧边面板内容。
  - 原理：切换 `workflowPhase`，控制右侧面板默认视图（Chat/Analyzer/Report）。
  - 测试：阶段切换后，右侧面板与工具条正确变化。

---

### 1.2 Analyzer 子模块（可见功能）

#### 1) DE（差异表达分析）
- **作用**：从 raw counts 计算差异表达，生成 log2FC/pvalue 并更新可视化。
- **原理**：前端 `DEAnalysisPanel` 调用后端 `DE_ANALYSIS` → 返回结果 + QC 报告 → 前端更新火山图与通路着色。
- **前端组件**：`src/components/DEAnalysisPanel.tsx`
- **关键输出**：`volcano_data`、`gene_map`、`qc_report`、`deMetadata`
- **测试**：
  - 分组后运行 -> 火山图/通路更新；
  - QC 区域出现（PCA+library size）；
  - `project_memory.db` 出现 `de_analyses` 记录。

#### 2) Sets（富集分析）
- **作用**：ORA/GSEA 富集分析 + 结果表 + UpSet 交集分析。
- **原理**：`EnrichmentPanel` 调用 `ENRICH_RUN`/`ENRICH_FUSION_RUN`，结果存入 `enrichmentResults`；UpSet 使用当前/融合/多组数据。
- **前端组件**：`src/components/EnrichmentPanel.tsx`
- **关键输出**：`enrichmentResults`、`enrichmentMetadata`
- **测试**：
  - ORA/GSEA 运行、结果表显示；
  - 通路点击跳转；
  - UpSet Source 切换 + 自定义集合可用。

#### 3) Multi（多样本）
- **作用**：多条件/时间点 logFC 切换，支持 UpSet 多组。
- **原理**：`LOAD_MULTI_SAMPLE` 读取多组结果；切换组后更新 `volcano_data`；并将数据上送 App 供 UpSet 使用。
- **前端组件**：`src/components/MultiSamplePanel.tsx`
- **测试**：
  - 多组切换统计变化；
  - UpSet Source=MultiSample 可用。

#### 4) SC（单细胞）
- **作用**：单细胞分析入口（轨迹、空间、通路评分）。
- **原理**：`AGENT_TASK` -> `sc_contextual`。
- **测试**：运行后返回 metadata/n_cells 等。

#### 5) Ref（图像/参考）
- **作用**：上传并分析图像证据（WB/IHC/Flow）。
- **原理**：`UPLOAD_IMAGE` / `ANALYZE_IMAGE`。
- **测试**：上传成功、分析结果返回。

#### 6) Stats（视图切换）
- **作用**：切换火山图/MA/Ranked。
- **原理**：切换 `chartViewMode`。
- **测试**：视图渲染正确，MA 无 mean 自动回退。

---

### 1.3 可视化主区

#### 1) Pathway 主画布
- **作用**：通路渲染 + 颜色映射。
- **原理**：`PathwayVisualizer` 渲染 ECharts；`COLOR_PATHWAY`/`VISUALIZE_PATHWAY` 更新。
- **测试**：节点颜色随 log2FC 更新；点击节点弹出 Evidence。

#### 2) Volcano / MA / Ranked 图
- **作用**：显著性/趋势/排序展示。
- **原理**：ECharts scatter/bar；阈值线可拖拽；hover tooltip 可点击外链。
- **测试**：拖拽阈值后筛选联动；tooltip 悬停显示、外链可点击。

#### 3) Data Table
- **作用**：基因级列表与点击联动。
- **测试**：点击行触发 Evidence 弹窗。

---

### 1.4 Evidence 与报告

#### 1) Evidence Popup
- **作用**：展示基因证据 + 审计快照 + 原始分布摘要。
- **原理**：点击 gene 或 AI 实体触发；审计快照由 `LIST_ENRICHMENT_AUDITS` 取得。
- **测试**：弹窗显示 log2FC/pvalue，审计字段与分布摘要完整。

#### 2) AI Narrative / Insights
- **作用**：生成机制叙事与综合洞察。
- **原理**：`AGENT_TASK` workflow；支持 Evidence 标签。
- **测试**：可生成叙事；实体点击联动 Evidence。

#### 3) 报告导出
- **作用**：HTML/PPTX/JSON 输出，含审计与分布摘要。
- **原理**：`sessionExport`/`pptxExport`。
- **测试**：HTML Evidence Audit 与 Distribution Snapshot 正常显示。

---

## 2. 后端隐藏模块（算法/服务）

### 2.1 核心命令与路由（bio_core.py）
- **ANALYZE / COLOR_PATHWAY / VISUALIZE_PATHWAY**
  - 负责通路渲染、颜色映射、统计生成。
- **DE_ANALYSIS**
  - 差异分析入口，已加审计落库。
- **ENRICH_RUN / ENRICH_FUSION_RUN**
  - v2.0 富集框架入口。
- **LIST_ENRICHMENT_AUDITS / LIST_PROJECTS / LIST_PATHWAYS_FREQ**
  - 项目记忆与审计查询。

### 2.2 差异分析算法（python/de_analysis.py）
- **t-test**：快速近似
- **PyDESeq2**：完整 DESeq2 统计
- **QC**：Library Size 统计 + PCA（sklearn）
- **优势**：具备标准统计链路与 QC
- **不足**：对数据格式/样本量较敏感，计算成本高

### 2.3 富集分析算法（python/enrichment/**）
- **ORA/GSEA**：主统计方法
- **GeneSetSourceManager**：Reactome/WikiPathways/GO 本地缓存
- **ReproducibilityLogger**：元数据版本/参数/哈希审计
- **优势**：可复现、元数据完整
- **不足**：KEGG 需用户自备 GMT（许可限制）

### 2.4 通路适配器（python/pathway/**）
- **KEGGAdapter / ReactomeAdapter / WikiPathwaysAdapter / GOAdapter**
- **功能**：生成可视化模板 + 自动布局
- **优势**：多来源支持
- **不足**：GO 无原生图，需要布局推断

### 2.5 AI 工作流与 RAG（python/agent_runtime.py, workflow_registry.py）
- **Narrative / LiteratureScan / Pattern Discovery**
- **Evidence 结构化输出**（实体标签）
- **优势**：解释性强
- **不足**：结果依赖 LLM 质量与上下文完整性

### 2.6 项目记忆（python/project_manager.py）
- **projects / project_genes / enrichment_audits / de_analyses**
- **优势**：审计与追溯
- **不足**：暂无操作级 History 回滚

---

## 3. 后端隐藏“优缺点”速览

### 优点
- 统计链路较完整（DE + ORA/GSEA + QC + 审计）。
- 证据链闭环：实体可点击 + 审计元数据可追溯。
- 多来源通路适配（KEGG/Reactome/Wiki/GO）。

### 缺点/风险
- KEGG 许可依赖（需用户自备 GMT）。
- 多样本 UpSet 仍是原型（交互有限、最多 4 组）。
- QC/PCA 为 best-effort，需更强可视化与报告细化。

---

## 4. 推荐测试清单（重点排查）

1) **DE 全流程**：counts → DE_ANALYSIS → 火山图/通路更新 → QC 报告 → de_analyses 落库
2) **Enrichment 全流程**：ENRICH_RUN → 结果表 → UpSet 切换 → enrichment_audits 落库
3) **Evidence 闭环**：AI 输出实体 → 弹窗 → 审计快照/分布摘要 → 外链可点
4) **MultiSample**：切换组 → volcano_data 更新 → UpSet Source=MultiSample 可用
5) **导出**：HTML Evidence Audit + Distribution Snapshot

---

## 5. 常见被问及的问题（简答版）

- **为什么 KEGG 不能直接用？**
  许可限制，需用户自备 GMT。

- **DESeq2 是否等价于 R 版本？**
  PyDESeq2 复刻 R 实现，但可能存在小差异，需注明。

- **证据链如何保证可追溯？**
  通过审计元数据（版本、参数、哈希）+ Evidence Popup。

- **能否复现每一步操作？**
  目前是审计级追溯，尚未实现操作级 History 回滚。

---

如果你需要，我可以继续补一份“命令级 API 列表（入参/出参/异常）”作为技术审计附件。
