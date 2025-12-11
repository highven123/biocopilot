# BioViz Local - KEGG Pathway Integration 🧬

## 📊 已完成功能

### 1. 三条经典 KEGG 通路模板
位于 `assets/templates/`:

| Pathway ID | Name | Description | Nodes |
|------------|------|-------------|-------|
| **hsa04210** | Apoptosis | 细胞凋亡信号通路 | 33 nodes |
| **hsa04115** | p53 signaling pathway | 肿瘤抑制通路 | 38 nodes |
| **hsa04110** | Cell cycle | 细胞周期调控通路 | 40 nodes |

### 2. Python 计算核心
- **`python/mapper.py`**: 基因表达映射和着色引擎
  - `load_pathway_template()`: 加载通路模板
  - `color_kegg_pathway()`: 应用基因表达着色
  - `get_pathway_statistics()`: 计算通路统计
  - 支持批量处理多个通路

### 3. 前端组件
- **`src/components/TemplatePicker.tsx`**: 通路选择器
  - 精美的卡片式选择界面
  - 实时预览和统计信息
  
- **`src/utils/pptxExport.ts`**: PPTX 导出工具
  - 单个通路导出
  - 批量导出多个通路
  - 集成统计信息

### 4. Python Sidecar 升级
`python/bio_engine.py` 新增命令:
- **`LOAD_PATHWAY`**: 加载通路模板
- **`COLOR_PATHWAY`**: 应用基因表达着色

## 🚀 使用流程

### 方式 A: 命令行测试
```bash
# 进入 python 目录
cd python

# 测试 mapper
python3 mapper.py
```

### 方式 B: 通过 Tauri 应用
```typescript
// 1. 加载通路模板
await sendCommand('LOAD_PATHWAY', { pathway_id: 'hsa04210' });

// 2. 应用基因表达着色
const geneExpression = {
  'TP53': 2.5,
  'BAX': 1.8,
  'BCL2': -1.5,
  // ... more genes
};

await sendCommand('COLOR_PATHWAY', {
  pathway_id: 'hsa04210',
  gene_expression: geneExpression
});

// 3. 导出到 PPTX
const chartInstance = echarts.getInstanceByDom(chartRef.current);
const imageUrl = captureEChartsAsDataURL(chartInstance);

await exportPathwayToPPTX({
  pathwayId: 'hsa04210',
  pathwayName: 'Apoptosis',
  imageDataUrl: imageUrl,
  statistics: stats
});
```

## 📋 数据格式

### 基因表达输入
```json
{
  "TP53": 2.5,      // 上调 (log2 fold change)
  "MDM2": 1.2,
  "BCL2": -1.5,     // 下调
  "BAX": 2.2
}
```

### 通路模板格式
```json
{
  "id": "hsa04210",
  "name": "Apoptosis",
  "nodes": [
    {
      "id": "TP53",
      "name": "p53",
      "x": 550,
      "y": 250,
      "color": "#95a5a6",
      "value": 1,
      "category": "tumor_suppressor"
    }
  ],
  "edges": [
    {
      "source": "TP53",
      "target": "BAX",
      "relation": "transcription"
    }
  ]
}
```

### 着色后的节点
```json
{
  "id": "TP53",
  "name": "p53",
  "x": 550,
  "y": 250,
  "color": "#ff0000",        // 红色 = 上调
  "value": 2.5,              // 节点大小
  "expression": 2.5,         // 原始表达值
  "category": "tumor_suppressor"
}
```

## 🎨 颜色编码规则

| 表达值 | 颜色 | 含义 |
|--------|------|------|
| > 0 | 红色渐变 | 上调 (upregulated) |
| = 0 | 白色 | 无变化 |
| < 0 | 蓝色渐变 | 下调 (downregulated) |
| 无数据 | 灰色 (#95a5a6) | 未检测 |

## 📦 依赖包 (需要安装)

### Python
```bash
# 如果要使用真实数据加载功能，需要安装:
pip install pandas openpyxl
```

### Frontend
```bash
# PPTX 导出功能
npm install pptxgenjs
npm install --save-dev @types/pptxgenjs
```

## 🔧 下一步集成

### 1. 在 App.tsx 中集成
```typescript
import { TemplatePicker } from './components/TemplatePicker';
import { exportPathwayToPPTX } from './utils/pptxExport';

// 在组件中使用
<TemplatePicker 
  onSelect={(pathwayId) => {
    // 加载并可视化通路
    loadAndVisualizePathway(pathwayId);
  }}
/>
```

### 2. 添加文件上传
允许用户上传包含基因表达数据的 Excel/CSV 文件

### 3. 实时着色
用户选择通路 + 上传数据 → 自动着色 → 导出 PPTX

## 📚 示例工作流

**完整的"7天发 Nature"流程**:

1. **拖入 Excel 文件** (包含基因表达数据)
2. **选择通路模板** (Apoptosis / p53 / Cell cycle)
3. **自动着色** (红色 = 上调, 蓝色 = 下调)
4. **查看统计** (上调基因数、下调基因数)
5. **导出 PPTX** (包含通路图 + 统计数据)
6. **发表论文** ✅

## ✅ 验证清单

- [x] 三个 KEGG 通路 JSON 模板
- [x] Python mapper.py 着色引擎
- [x] TemplatePicker 前端组件
- [x] PPTX 导出工具
- [x] bio_engine.py 命令支持
- [ ] 前端集成演示
- [ ] 文件上传功能
- [ ] 完整端到端测试

---

**放好了！** 🎉

现在你拥有了一套完整的 KEGG 通路可视化系统：
- ✅ 三条经典通路模板
- ✅ Python 计算引擎
- ✅ 前端组件库
- ✅ PPTX 导出能力

只需要集成到主 UI，就可以实现"拖 Excel → 选通路 → 导出 PPTX → 发 Paper"的完整工作流！
