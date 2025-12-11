import React, { useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs';
import PptxGenJS from 'pptxgenjs';
import './PathwayVisualizer.css';

// Helper for dynamic terminology
const getTerm = (type: string | undefined, key: string): string => {
    const t = type || 'gene';
    const terms: Record<string, Record<string, string>> = {
        gene: { entity: 'Gene', value: 'Expression', up: 'Upregulated', down: 'Downregulated' },
        protein: { entity: 'Protein', value: 'Abundance', up: 'Increased', down: 'Decreased' },
        cell: { entity: 'Cell Type', value: 'Frequency', up: 'Expanded', down: 'Depleted' }
    };
    return terms[t]?.[key] || terms.gene[key];
};

interface PathwayNode {
    id: string;
    name: string;
    x: number;
    y: number;
    color?: string;
    value?: number;
    expression?: number;
    hit_name?: string;
}

interface PathwayEdge {
    source: string;
    target: string;
    relation?: string;
}

// ... (previous interfaces)

interface PathwayVisualizerProps {
    nodes: PathwayNode[];
    edges: PathwayEdge[];
    title?: string;
    theme?: 'dark' | 'light';
    pathwayId?: string;
    dataType?: 'gene' | 'protein' | 'cell';
    onNodeClick?: (geneName: string) => void;
    selectedNodeNames?: string[]; // New prop for highlighting
}

export const PathwayVisualizer: React.FC<PathwayVisualizerProps> = ({
    nodes,
    edges,
    title,
    theme = 'dark',
    pathwayId,
    dataType = 'gene',
    onNodeClick,
    selectedNodeNames = []
}) => {
    const isDark = theme === 'dark';
    const textColor = isDark ? '#eee' : '#333';
    const bgColor = isDark ? '#1a1a24' : '#ffffff';
    const chartRef = useRef<ReactECharts>(null);

    // Custom Click Handler
    const onChartClick = (params: any) => {
        if (params.dataType === 'node') {
            if (!onNodeClick) return;

            // 优先使用模板中的节点 id（通常是基因符号），
            // 如果没有 id，则退回到 name，并处理多基因逗号分隔的情况。
            const raw = (params.data && (params.data.hit_name || params.data.id || params.data.name)) || params.name;
            if (!raw) return;
            const primary = String(raw).split(',')[0].trim();
            if (!primary) return;

            onNodeClick(primary);
        }
    };

    // PPTX Styling Constants
    const accentColor = '5DADE2';
    const bodyColor = 'EEEEEE';

    // Edge Color Mapping
    const RELATION_COLORS: Record<string, string> = {
        'activation': '#2ecc71',      // Green
        'inhibition': '#e74c3c',      // Red
        'phosphorylation': '#f39c12', // Orange
        'dephosphorylation': '#9b59b6', // Purple
        'expression': '#3498db',      // Blue
        'repression': '#e74c3c',      // Red
        'binding': '#95a5a6',         // Gray
        'indirect effect': '#95a5a6',
        'missing interaction': '#7f8c8d'
    };

    // Dynamic color palette for auto-assigned relations
    const PALETTE = ['#e17055', '#00cec9', '#6c5ce7', '#fdcb6e', '#d63031', '#0984e3', '#b2bec3'];

    // Helper to get color for a relation
    const getRelationColor = (relation: string, usedColors: Record<string, string>) => {
        const key = relation.toLowerCase().split(/[+/]/)[0].trim();
        // Check predefined
        for (const definedKey in RELATION_COLORS) {
            if (key.includes(definedKey)) return RELATION_COLORS[definedKey];
        }
        // Check if already assigned a dynamic color
        if (usedColors[key]) return usedColors[key];

        // Assign new color
        const nextColor = PALETTE[Object.keys(usedColors).length % PALETTE.length];
        usedColors[key] = nextColor;
        return nextColor;
    };

    // Helper to calculate luminance for contrast
    const getLuminance = (hexColor: string): number => {
        // Remove # if present
        const hex = hexColor.replace('#', '');

        // Convert to RGB
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;

        // Apply gamma correction
        const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
        const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
        const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

        // Calculate luminance
        return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
    };

    // Helper to get contrasting text color
    const getContrastColor = (bgColor: string): string => {
        try {
            const luminance = getLuminance(bgColor);
            // If background is light (luminance > 0.5), use dark text
            return luminance > 0.5 ? '#000000' : '#ffffff';
        } catch {
            // Fallback to white text if color parsing fails
            return '#ffffff';
        }
    };

    const option = useMemo(() => {
        // Create Map for quick node lookup
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const usedRelationsStringMap: Record<string, string> = {};

        // Check if we have an active selection
        const hasSelection = selectedNodeNames.length > 0;

        // Format nodes for ECharts
        const graphNodes = nodes.map(node => {
            // Determine if this node is selected
            // Use hit_name first (exact match), then name (split by comma)
            let isSelected = false;
            if (hasSelection) {
                if (node.hit_name && selectedNodeNames.includes(node.hit_name)) {
                    isSelected = true;
                } else if (node.name) {
                    const parts = node.name.split(',').map(s => s.trim());
                    if (parts.some(p => selectedNodeNames.includes(p))) {
                        isSelected = true;
                    }
                }
            } else {
                isSelected = true; // If no selection, everything is "active"
            }

            // Base symbol size (expression-based)
            const baseSize = 28 + (node.value ? Math.min(Math.abs(node.value) * 3, 12) : 0);

            // Visual enhancement logic - size-based contrast, keep original colors
            const symbolSize = hasSelection
                ? (isSelected ? baseSize * 1.5 : baseSize * 0.7)  // Selected: bigger, unselected: smaller
                : baseSize;
            const opacity = hasSelection && !isSelected ? 0.3 : 1.0;  // Slightly transparent for unselected
            const borderColor = isDark ? '#fff' : '#333';
            const borderWidth = 1;

            // Keep original color for all nodes
            const nodeColor = node.color || (isDark ? '#95a5a6' : '#bdc3c7');

            return {
                id: node.id,
                name: node.name,
                x: node.x,
                y: node.y,
                fixed: true,
                hit_name: node.hit_name,
                symbolSize: symbolSize,
                itemStyle: {
                    color: nodeColor,
                    borderColor: borderColor,
                    borderWidth: borderWidth,
                    shadowBlur: 5,
                    shadowColor: 'rgba(0, 0, 0, 0.3)',
                    opacity: opacity
                },
                label: {
                    show: true,
                    formatter: (params: any) => params.name,
                    color: hasSelection && !isSelected ? '#666' : getContrastColor(nodeColor),
                    fontSize: isSelected && hasSelection ? 11 : 10,
                    fontWeight: isSelected && hasSelection ? 'bold' : 'normal',
                    position: 'inside',
                    width: 45,
                    overflow: 'break',
                    lineHeight: 11,
                    opacity: opacity
                },
                value: node.expression,
                tooltip: {
                    formatter: (params: any) => {
                        const val = params.data.value;
                        const valStr = val !== undefined && val !== null ? val.toFixed(3) : 'N/A';
                        return `
            <div style="text-align: left;">
              <b>${params.name}</b><br/>
              Expression (LogFC): ${valStr}<br/>
              ID: ${params.data.id}
            </div>
          `;
                    }
                }
            };
        });

        // Format edges with conditional coloring
        const graphLinks = edges.map(edge => {
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);

            // Check visibility based on selection
            let isSourceSelected = true;
            let isTargetSelected = true;

            if (hasSelection) {
                const checkNode = (n: PathwayNode | undefined) => {
                    if (!n) return false;
                    if (n.hit_name && selectedNodeNames.includes(n.hit_name)) return true;
                    const parts = n.name.split(',').map(s => s.trim());
                    return parts.some(p => selectedNodeNames.includes(p));
                };
                isSourceSelected = checkNode(sourceNode);
                isTargetSelected = checkNode(targetNode);
            }

            const isEdgeDimmed = hasSelection && (!isSourceSelected || !isTargetSelected);
            const edgeOpacity = isEdgeDimmed ? 0.1 : 1; // Very faint if not relevant

            const isRelevant = (sourceNode?.value !== undefined && sourceNode.value !== null) ||
                (targetNode?.value !== undefined && targetNode.value !== null);

            let color = '#555';
            if (isRelevant && edge.relation) {
                color = getRelationColor(edge.relation, usedRelationsStringMap);
            }

            return {
                source: edge.source,
                target: edge.target,
                label: {
                    show: !!edge.relation && !isEdgeDimmed, // Hide label if dimmed
                    formatter: edge.relation,
                    fontSize: 10,
                    color: isRelevant ? color : '#777',
                    opacity: edgeOpacity
                },
                lineStyle: {
                    curveness: 0.2,
                    color: isRelevant ? color : '#444',
                    width: isRelevant ? 2.5 : 1,
                    opacity: isEdgeDimmed ? 0.1 : (isRelevant ? 1 : 0.4)
                },
                symbol: ['none', 'arrow'],
                symbolSize: isRelevant ? 10 : 6
            };
        });

        // Generate Edge Legend Graphics
        const legendItems = Object.keys(usedRelationsStringMap).sort();
        const legendGraphic: any[] = legendItems.map((rel, index) => {
            const color = usedRelationsStringMap[rel];
            return {
                type: 'group',
                bottom: 20 + (index * 20),
                right: 20,
                children: [
                    {
                        type: 'line',
                        left: 0,
                        top: 'middle',
                        shape: { x1: 0, y1: 0, x2: 25, y2: 0 },
                        style: { stroke: color, lineWidth: 2 }
                    },
                    {
                        type: 'text',
                        left: 30,
                        top: 'middle',
                        style: {
                            text: rel.charAt(0).toUpperCase() + rel.slice(1),
                            fill: textColor,
                            font: '12px sans-serif'
                        }
                    }
                ]
            };
        });

        // Add Edge Legend Title
        if (legendItems.length > 0) {
            legendGraphic.push({
                type: 'text',
                bottom: 20 + (legendItems.length * 20),
                right: 20,
                style: {
                    text: 'Interaction Types',
                    fill: textColor,
                    font: 'bold 12px sans-serif'
                }
            });
        }

        // Add Node Color Legend (Scientific RdBu) -- BOTTOM LEFT
        const colorScale = ['#4393C3', '#92c5de', '#f7f7f7', '#f4a582', '#d6604d']; // Blue to Red

        legendGraphic.push({
            type: 'group',
            left: 20,
            bottom: 20,
            children: [
                {
                    type: 'text',
                    left: 0,
                    top: -20,
                    style: {
                        text: 'Expression (LogFC)',
                        fill: textColor,
                        font: 'bold 12px sans-serif'
                    }
                },
                ...colorScale.map((color, i) => ({
                    type: 'rect',
                    left: i * 20,
                    top: 0,
                    shape: { width: 20, height: 10 },
                    style: { fill: color }
                })),
                {
                    type: 'text',
                    left: 0,
                    top: 15,
                    style: { text: '-2', fill: textColor, font: '10px sans-serif' }
                },
                {
                    type: 'text',
                    left: 45,
                    top: 15,
                    style: { text: '0', fill: textColor, font: '10px sans-serif' }
                },
                {
                    type: 'text',
                    left: 90,
                    top: 15,
                    style: { text: '+2', fill: textColor, font: '10px sans-serif' }
                }
            ]
        });

        return {
            backgroundColor: 'transparent',
            title: {
                text: title || 'Pathway Visualization',
                left: 'center',
                textStyle: {
                    color: textColor,
                    fontSize: 16
                }
            },
            tooltip: {
                trigger: 'item',
                backgroundColor: isDark ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: isDark ? '#333' : '#ddd',
                textStyle: {
                    color: textColor
                }
            },
            graphic: legendGraphic, // Add custom legend
            series: [
                {
                    type: 'graph',
                    layout: 'none', // Use x/y provided in data
                    data: graphNodes.map(n => ({ ...n, fixed: true })), // Ensure everything is fixed
                    links: graphLinks,
                    roam: true, // Keep zoom/pan, but nodes shouldn't move relative to each other
                    draggable: false, // Prevent dragging nodes
                    animation: false, // Disable all animations to prevent "flying" effect
                    lineStyle: {
                        opacity: 0.9,
                        width: 1,
                        curveness: 0.1
                    }
                }
            ]
        } as EChartsOption;
    }, [nodes, edges, title, isDark, textColor, selectedNodeNames]);

    const handleResetView = () => {
        const chart = chartRef.current?.getEchartsInstance();
        if (chart) {
            chart.dispatchAction({
                type: 'restore'
            });
        }
    };

    const handleExportSVG = async () => {
        const chart = chartRef.current?.getEchartsInstance();
        if (!chart) return;

        try {
            // Use publication-ready dark background for SVG export
            const svgUrl = chart.getDataURL({
                type: 'svg',
                pixelRatio: 2,
                backgroundColor: '#0f172a' // Dark slate background for publication
            });

            let svgContent: string;
            const dataIndex = svgUrl.indexOf(',') + 1;
            const data = svgUrl.slice(dataIndex);

            if (svgUrl.startsWith('data:image/svg+xml;base64,')) {
                svgContent = atob(data);
            } else if (svgUrl.startsWith('data:image/svg+xml;charset=utf-8,')) {
                svgContent = decodeURIComponent(data);
            } else {
                // Fallback or error handling for unexpected format
                // If it doesn't look like a standard data URL, try to use it as is if it looks like SVG
                // But mostly it will be a data URL.
                console.warn('Unexpected SVG data URL format:', svgUrl.substring(0, 50) + '...');
                svgContent = decodeURIComponent(data); // Try decoding anyway
            }

            const suggestedName = `pathway-${title || 'viz'}-${Date.now()}.svg`;

            const filePath = await save({
                defaultPath: suggestedName,
                filters: [{
                    name: 'SVG Image',
                    extensions: ['svg']
                }]
            });

            if (filePath) {
                await writeTextFile(filePath, svgContent);
                alert('SVG exported successfully!');
            }
        } catch (err) {
            console.error('Export failed:', err);
            alert(`Export failed: ${err}`);
        }
    };

    const handleExportPPTX = async () => {
        const chart = chartRef.current?.getEchartsInstance();
        if (!chart) return;

        try {
            // Manual SVG to PNG conversion for reliable rasterization
            // ECharts with renderer='svg' may typically export SVG data even when requesting PNG, or fail to render via getDataURL directly in some contexts.

            // 1. Get SVG Data URL
            const svgDataUrl = chart.getDataURL({
                type: 'svg',
                backgroundColor: '#000000',
                excludeComponents: ['toolbox']
            });

            // 2. Convert to PNG via Canvas
            const convertSvgToPng = (url: string, width: number, height: number): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        // Use 2x resolution for good quality without excessive memory usage
                        const scale = 2;
                        canvas.width = width * scale;
                        canvas.height = height * scale;

                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            reject(new Error("Failed to get canvas context"));
                            return;
                        }

                        // Fill background explicitly
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                        resolve(canvas.toDataURL('image/png'));
                    };
                    img.onerror = () => reject(new Error("Failed to load SVG for conversion"));
                    img.src = url;
                });
            };

            let imgUrl = '';
            try {
                imgUrl = await convertSvgToPng(svgDataUrl, chart.getWidth(), chart.getHeight());
            } catch (e) {
                console.warn("SVG to PNG conversion failed, falling back to direct capture", e);
                // Fallback (might be black/empty but worth a shot)
                imgUrl = chart.getDataURL({
                    type: 'png',
                    pixelRatio: 2,
                    backgroundColor: '#000000',
                    excludeComponents: ['toolbox']
                });
            }

            // Calculate statistics for the report
            const totalNodes = nodes.length;
            const upRegulated = nodes.filter(n => n.expression !== undefined && n.expression !== null && n.expression > 0).length;
            const downRegulated = nodes.filter(n => n.expression !== undefined && n.expression !== null && n.expression < 0).length;

            const pptx = new PptxGenJS();
            pptx.layout = 'LAYOUT_16x9';

            // Define Dark Theme Master
            pptx.defineSlideMaster({
                title: 'DARK_THEME',
                background: { color: '000000' },
                objects: [
                    { rect: { x: 0, y: 0, w: '100%', h: 0.1, fill: { color: 'E74C3C' } } } // Red accent line at top
                ],
                slideNumber: { x: '95%', y: '95%', color: '888888', fontSize: 10 }
            });

            // Common Text Styles
            const titleStyle = { x: 0.5, y: 0.5, w: 9, fontSize: 28, bold: true, color: 'FFFFFF', align: 'center' as const };
            const subTitleStyle = { x: 0.5, y: 3.5, w: 9, fontSize: 16, color: 'AAAAAA', align: 'center' as const };
            const sectionTitleStyle = { x: 0.5, y: 0.4, w: 9, fontSize: 24, bold: true, color: 'FFFFFF' };

            // --- SLIDE 1: Title Slide ---
            const titleSlide = pptx.addSlide({ masterName: 'DARK_THEME' }); // Renamed slide1 to titleSlide for clarity
            titleSlide.addText('BioViz Local', { ...titleStyle, y: 2.5, fontSize: 36, color: '5DADE2' });
            titleSlide.addText('KEGG Pathway Analysis Report', { ...titleStyle, y: 3.2, fontSize: 24 });
            titleSlide.addText('Pathway ID: ' + (pathwayId || 'Unknown'), { x: 0.5, y: 3.9, w: 9, fontSize: 18, color: accentColor, align: 'center' }); // Adjusted y
            titleSlide.addText('Generated: ' + new Date().toLocaleString(), { ...subTitleStyle, y: 4.5 }); // Adjusted y
            titleSlide.addText('Generated by BioViz Local', { x: 0.5, y: 5.0, w: 9, fontSize: 14, color: '#666666', align: 'center' });


            // --- SLIDE 2: Methodology (New "Research" Requirement) ---
            const methodSlide = pptx.addSlide({ masterName: 'DARK_THEME' });
            methodSlide.addText('Methodology', sectionTitleStyle);
            methodSlide.addText([
                { text: 'Gene expression data was mapped to KEGG Pathway ', options: { fontSize: 18, color: bodyColor } },
                { text: '[' + (pathwayId || 'hsa00000') + ']', options: { fontSize: 18, color: accentColor, bold: true } },
                { text: '. Color coding represents Log2 Fold Change (Red=Up, Blue=Down). Data processing and visualization were performed by ', options: { fontSize: 18, color: bodyColor } },
                { text: 'BioViz Local v0.1', options: { fontSize: 18, color: accentColor, bold: true } },
                { text: '.', options: { fontSize: 18, color: bodyColor } }
            ], { x: 1.0, y: 1.5, w: 8.0, h: 3.0, lineSpacing: 30 });

            // --- SLIDE 3: Pathway Visualization ---
            const slide2 = pptx.addSlide({ masterName: 'DARK_THEME' });
            slide2.addText(title || 'Pathway Map', sectionTitleStyle);
            if (imgUrl && imgUrl.length > 100) {
                slide2.addImage({
                    data: imgUrl,
                    x: 0.2, y: 1.0, w: 9.6, h: 4.5,
                    sizing: { type: 'contain', w: 9.6, h: 4.5 }
                });
            } else {
                slide2.addText("Image capture failed. Please ensure the chart is fully visible.", { x: 0.5, y: 2.0, color: 'FF0000', align: 'center' });
            }

            // --- SLIDE 4: Summary Statistics ---
            const slide3 = pptx.addSlide({ masterName: 'DARK_THEME' });
            slide3.addText('Summary Statistics', sectionTitleStyle);

            slide3.addTable([
                [
                    { text: 'Metric', options: { fill: { color: accentColor }, color: 'FFFFFF', bold: true } },
                    { text: 'Count', options: { fill: { color: accentColor }, color: 'FFFFFF', bold: true } },
                    { text: 'Percentage', options: { fill: { color: accentColor }, color: 'FFFFFF', bold: true } }
                ],
                [
                    { text: 'Total Nodes', options: { fill: { color: '2d2d3a' }, color: bodyColor } },
                    { text: totalNodes.toString(), options: { fill: { color: '2d2d3a' }, color: bodyColor } },
                    { text: '100%', options: { fill: { color: '2d2d3a' }, color: bodyColor } }
                ],
                [
                    { text: getTerm(dataType, 'up'), options: { fill: { color: '2d2d3a' }, color: '#ff6b6b' } },
                    { text: upRegulated.toString(), options: { fill: { color: '2d2d3a' }, color: '#ff6b6b' } },
                    { text: ((upRegulated / totalNodes) * 100).toFixed(1) + '%', options: { fill: { color: '2d2d3a' }, color: '#ff6b6b' } }
                ],
                [
                    { text: getTerm(dataType, 'down'), options: { fill: { color: '2d2d3a' }, color: '#4ecdc4' } },
                    { text: downRegulated.toString(), options: { fill: { color: '2d2d3a' }, color: '#4ecdc4' } },
                    { text: ((downRegulated / totalNodes) * 100).toFixed(1) + '%', options: { fill: { color: '2d2d3a' }, color: '#4ecdc4' } }
                ]
            ], { x: 1.5, y: 1.5, w: 7.0 });

            // --- SLIDE 5: Key Findings ---
            const slide4 = pptx.addSlide({ masterName: 'DARK_THEME' });
            slide4.addText('Key Findings', sectionTitleStyle);
            const findings = [
                upRegulated + ' ' + getTerm(dataType, 'entity').toLowerCase() + 's are ' + getTerm(dataType, 'up').toLowerCase() + '.',
                downRegulated + ' ' + getTerm(dataType, 'entity').toLowerCase() + 's are ' + getTerm(dataType, 'down').toLowerCase() + '.',
                (totalNodes - upRegulated - downRegulated) + ' items show no significant change or were not detected.',
                'Pathway Coverage: ' + (100 * nodes.filter(n => n.expression !== undefined && n.expression !== null).length / nodes.length).toFixed(1) + '% of total pathway nodes.'
            ];
            slide4.addText(findings.join('\n\n'), { x: 1.0, y: 1.5, w: 8.0, h: 3.5, fontSize: 16, color: bodyColor, bullet: true, lineSpacing: 40 });

            // --- SLIDE 6: Gene Expression Details (Zebra Striped) ---
            const slide5 = pptx.addSlide({ masterName: 'DARK_THEME' });
            slide5.addText(getTerm(dataType, 'value') + ' Details', sectionTitleStyle);

            const sortedNodes = [...nodes]
                .filter(n => n.expression !== undefined && n.expression !== null)
                .sort((a, b) => Math.abs(b.expression || 0) - Math.abs(a.expression || 0))
                .slice(0, 40);

            const tableData = [
                [
                    { text: getTerm(dataType, 'entity'), options: { fill: { color: accentColor }, color: 'FFFFFF', bold: true } },
                    { text: getTerm(dataType, 'value'), options: { fill: { color: accentColor }, color: 'FFFFFF', bold: true } },
                    { text: 'Status', options: { fill: { color: accentColor }, color: 'FFFFFF', bold: true } }
                ],
                ...sortedNodes.map((n, i) => {
                    // Zebra striping: Alternate row colors
                    const rowBg = i % 2 === 0 ? '2d2d3a' : '1a1a24'; // Dark alternate
                    const val = n.expression || 0;
                    return [
                        { text: n.name, options: { fill: { color: rowBg }, color: bodyColor } },
                        { text: val.toFixed(2), options: { fill: { color: rowBg }, color: val > 0 ? '#ff6b6b' : '#4ecdc4' } },
                        { text: val > 0 ? 'High' : 'Low', options: { fill: { color: rowBg }, color: val > 0 ? '#ff6b6b' : '#4ecdc4' } }
                    ];
                })
            ];

            if (sortedNodes.length > 0) {
                slide5.addTable(tableData, { x: 0.5, y: 1.2, w: 9.0, autoPage: true, margin: 0.5, fontSize: 12 });
            } else {
                slide5.addText("No mapping data available.", { x: 3, y: 3, color: 'FFFFFF' });
            }

            // --- LAST SLIDE: References ---
            const refSlide = pptx.addSlide({ masterName: 'DARK_THEME' });
            refSlide.addText('References & Acknowledgements', sectionTitleStyle);

            refSlide.addText([
                { text: '1. Kanehisa, M. and Goto, S.; KEGG: Kyoto Encyclopedia of Genes and Genomes. Nucleic Acids Res. 28, 27-30 (2000).', options: { fontSize: 14, color: bodyColor, breakLine: true } },
                { text: '2. BioViz Local: An advanced, secure, and beautiful pathway visualization tool.', options: { fontSize: 14, color: bodyColor, breakLine: true } },
                { text: '\n\nGitHub Repository:', options: { fontSize: 14, color: accentColor, bold: true, breakLine: true } },
                { text: 'https://github.com/bioviz/local', options: { fontSize: 14, color: '#4ecdc4', underline: { style: 'sng' }, hyperlink: { url: 'https://github.com/bioviz/local' } } }
            ], { x: 1.0, y: 1.5, w: 8.0, h: 4.0, lineSpacing: 25 });
            // Save
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const suggestedName = 'pathway-report-' + (title || 'viz') + '-' + timestamp + '.pptx';

            const pptxData = await pptx.write({ outputType: 'base64' }) as string;
            const binaryString = atob(pptxData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const filePath = await save({
                defaultPath: suggestedName,
                filters: [{ name: 'PowerPoint Presentation', extensions: ['pptx'] }]
            });

            if (filePath) {
                await writeFile(filePath, bytes);
                alert('Detailed PPTX Report exported successfully!');
            }

        } catch (err) {
            console.error('PPTX Export failed:', err);
            alert('PPTX Export failed: ' + err);
        }
    };

    return (
        <div className="pathway-visualizer" style={{
            height: '600px',
            width: '100%',
            background: bgColor,
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
            position: 'relative'
        }}>
            {/* Toolbar */}
            <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                zIndex: 1000,
                display: 'flex',
                gap: '8px'
            }}>
                <button onClick={handleResetView} className="viz-tool-btn" title="Reset View">
                    🔄 Reset
                </button>
                <button onClick={handleExportSVG} className="viz-tool-btn svg" title="Export as SVG">
                    📥 SVG
                </button>
                <button onClick={handleExportPPTX} className="viz-tool-btn pptx" title="Export as PowerPoint">
                    📊 PPTX
                </button>
            </div>

            <ReactECharts
                ref={chartRef}
                option={option}
                style={{ height: '100%', width: '100%' }}
                onEvents={{ 'click': onChartClick }}
                opts={{ renderer: 'svg' }} // Use SVG for vector export support
            />
        </div>
    );
};
