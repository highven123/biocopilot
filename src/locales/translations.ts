
export const en = {
    header: {
        title: 'BioCopilot',
        connected: 'Connected',
        disconnected: 'Disconnected',
    },
    steps: {
        upload: 'Upload Data',
        mapping: 'Map Columns',
        visualize: 'Visualize',
    },
    upload: {
        title: 'Upload Gene Expression Data',
        hint: 'Drag & drop a CSV/TSV file here, or click to select',
        dropHint: 'Drop the file here ...',
        format: 'Required columns: Gene, LogFC',
        sample: 'File format example:',
        dataLoaded: 'Data Loaded',
    },
    pathway: {
        selectTitle: 'Select a Pathway',
        selectHint: 'Choose a KEGG pathway to visualize',
        searchPlaceholder: 'Search pathways...',
        visualizeTitle: 'Interactive Visualization',
        visualizeHint: 'Scroll to zoom, drag to pan. Hover nodes for details.',
        detailsTitle: 'Pathway Details',
        nodesCount: 'Nodes',
        edgesCount: 'Edges',
        interactiveVizTitle: 'Interactive Visualization',
        interactiveVizHint: 'Scroll to zoom, drag to pan. Hover nodes for details.',
    },
    actions: {
        export: 'Export to PPTX',
        save: 'Save Analysis',
        reset: 'Start Over',
        loadPrevious: 'Load Previous',
    },
    stats: {
        totalNodes: 'Total Nodes',
        upregulated: 'Upregulated',
        downregulated: 'Downregulated',
        unchanged: 'Unchanged',
    },
    ai: {
        config: 'AI Configuration',
        provider: 'AI Provider',
        apiKey: 'API Key',
        enterApiKey: 'Enter your API Key',
        baseUrl: 'Base URL',
        modelName: 'Model Name',
        helpTitle: 'How to get an API Key?',
        helpDesc: 'Please visit the official website of your provider to generate a key.',
        contactDev: 'For technical support or corporate keys, contact: bioviz@outlook.com',
        saveConfig: 'Save Configuration',
        cancel: 'Cancel',
        immediateEffect: 'Changes will take effect immediately. Ensure your provider service is reachable.',
        official: 'Official',
        customApi: 'Custom OpenAI-Compatible API'
    }
};

export const zh = {
    header: {
        title: 'BioCopilot',
        connected: '已连接',
        disconnected: '未连接',
    },
    steps: {
        upload: '上传数据',
        mapping: '列名映射',
        visualize: '可视化分析',
    },
    upload: {
        title: '上传基因表达数据',
        hint: '拖拽 CSV/TSV 文件到此处，或点击选择',
        dropHint: '松开鼠标以上传 ...',
        format: '需要包含列: Gene, LogFC',
        sample: '文件格式示例:',
        dataLoaded: '数据已加载'
    },
    pathway: {
        selectTitle: '选择通路',
        selectHint: '选择一个 KEGG 通路进行可视化',
        searchPlaceholder: '搜索通路...',
        visualizeTitle: '交互式可视化',
        visualizeHint: '滚动缩放，拖拽平移。悬停查看详情。',
        detailsTitle: '通路详情',
        nodesCount: '节点数',
        edgesCount: '边数',
        interactiveVizTitle: '交互式可视化',
        interactiveVizHint: '滚动缩放，拖拽平移。悬停查看详情。'
    },
    actions: {
        export: '导出 PPTX 报告',
        save: '保存分析结果',
        reset: '重新开始',
        loadPrevious: '加载历史记录',
    },
    stats: {
        totalNodes: '总节点数',
        upregulated: '上调基因',
        downregulated: '下调基因',
        unchanged: '无显著变化',
    },
    ai: {
        config: 'AI 智驾配置',
        provider: 'AI 服务商',
        apiKey: 'API 密钥',
        enterApiKey: '请输入您的 API Key',
        baseUrl: '接口地址 (Base URL)',
        modelName: '模型名称',
        helpTitle: '如何获取 API Key？',
        helpDesc: '请访问对应服务商官网申请 API 密钥。',
        contactDev: '如需技术支持或企业授权密钥，请联系：bioviz@outlook.com',
        saveConfig: '保存配置',
        cancel: '取消',
        immediateEffect: '配置将立即生效。请确保您的网络能够访问对应服务商。',
        official: '官网',
        customApi: '自定义 OpenAI 兼容接口'
    }
};
