/**
 * Session Export/Import Utilities
 * Uses Tauri native dialog for reliable file saving
 */

import { save, open, ask } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { translate } from '../i18n';

export interface AnalysisSession {
  pathway: any;
  statistics: any;
  volcano_data: any[];
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  sourceFilePath: string;
  appVersion?: string;
  aiModel?: string;
  [key: string]: any;
}

export async function exportSessionAsJSON(analysis: AnalysisSession): Promise<boolean> {
  const baseName = analysis.sourceFilePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'session';
  const defaultName = `${baseName}_session.json`;



  try {

    const filePath = await save({
      title: translate('Save Analysis Session'),
      defaultPath: defaultName,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });


    if (!filePath) {

      return false; // User cancelled
    }

    const jsonData = JSON.stringify(analysis, null, 2);

    await writeTextFile(filePath, jsonData);

    return true;
  } catch (error) {
    console.error('[Export] Failed to export JSON:', error);
    alert(translate('Export failed: {error}', { error: String(error) }));
    return false;
  }
}

export async function exportSessionAsMarkdown(analysis: AnalysisSession): Promise<boolean> {
  const t = translate;

  const baseName = analysis.sourceFilePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'session';
  const defaultName = `${baseName}_report.md`;


  let markdown = `# ${t('BioCopilot Analysis Session')}\n\n`;
  markdown += `**${t('Date')}**: ${new Date().toLocaleString()}\n`;
  markdown += `**${t('Dataset')}**: ${analysis.sourceFilePath}\n`;
  markdown += `**${t('Pathway')}**: ${analysis.pathway?.title || analysis.pathway?.id || t('Unknown')}\n\n`;

  if (analysis.statistics) {
    const stats = analysis.statistics;
    markdown += `## ${t('Statistics')}\n\n`;
    markdown += `- ${t('Total Genes')}: ${stats.total_nodes || 0}\n`;
    markdown += `- ${t('Upregulated')}: ${stats.upregulated || 0}\n`;
    markdown += `- ${t('Downregulated')}: ${stats.downregulated || 0}\n\n`;
  }

  if (analysis.enrichmentResults && analysis.enrichmentResults.length > 0) {
    markdown += `## ${t('Enrichment Analysis (ORA)')}\n\n`;
    markdown += `| ${t('Term')} | ${t('Adj. P-value')} | ${t('Overlap')} |\n`;
    markdown += `| :--- | :--- | :--- |\n`;
    analysis.enrichmentResults.slice(0, 10).forEach((res: any) => {
      markdown += `| ${res.term} | ${res.adjusted_p_value.toExponential(2)} | ${res.overlap} |\n`;
    });
    markdown += `\n`;
  }

  if (analysis.gseaResults && (analysis.gseaResults.up.length > 0 || analysis.gseaResults.down.length > 0)) {
    markdown += `## ${t('GSEA Results')}\n\n`;
    markdown += `| ${t('Term')} | ${t('NES')} | ${t('FDR')} | ${t('Status')} |\n`;
    markdown += `| :--- | :--- | :--- | :--- |\n`;
    const allGsea = [
      ...analysis.gseaResults.up.slice(0, 5).map((r: any) => ({ ...r, status: 'UP' })),
      ...analysis.gseaResults.down.slice(0, 5).map((r: any) => ({ ...r, status: 'DOWN' }))
    ];
    allGsea.forEach(res => {
      markdown += `| ${res.term} | ${res.nes.toFixed(2)} | ${res.fdr.toExponential(2)} | ${res.status} |\n`;
    });
    markdown += `\n`;
  }

  if (analysis.chatHistory && analysis.chatHistory.length > 0) {
    markdown += `## ${t('AI Conversation')}\n\n`;
    analysis.chatHistory.forEach(msg => {
      const role = msg.role === 'user' ? `👤 **${t('User')}**` : `🤖 **${t('AI')}**`;
      markdown += `### ${role}\n${msg.content}\n\n---\n\n`;
    });
  } else {
    markdown += `## ${t('AI Conversation')}\n\n${t('No conversation history.')}\n\n`;
  }

  try {
    const filePath = await save({
      title: translate('Save Analysis Report'),
      defaultPath: defaultName,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });

    if (!filePath) {
      return false; // User cancelled
    }

    await writeTextFile(filePath, markdown);
    return true;
  } catch (error) {
    console.error('Failed to export Markdown:', error);
    alert(translate('Export failed: {error}', { error: String(error) }));
    return false;
  }
}

export async function exportSession(analysis: AnalysisSession): Promise<void> {


  if (!analysis) {
    alert(translate('No analysis data to export!'));
    return;
  }

  try {
    // Ask user to choose format
    const saveAsJson = await ask(translate('Choose export format:\n\n• JSON - Re-importable analysis\n• Markdown - Human-readable report'), {
      title: translate('Export analysis report'),
      kind: 'info',
      okLabel: translate('JSON'),
      cancelLabel: translate('Markdown')
    });



    if (saveAsJson) {
      const success = await exportSessionAsJSON(analysis);
      if (success) {
        alert(translate('Session saved successfully!'));
      }
    } else {
      const success = await exportSessionAsMarkdown(analysis);
      if (success) {
        alert(translate('Report saved successfully!'));
      }
    }
  } catch (error) {
    console.error('[Export] Error in exportSession:', error);
    alert(translate('Export error: {error}', { error: String(error) }));
  }


}

export async function importSession(): Promise<AnalysisSession | null> {
  try {
    const filePath = await open({
      title: translate('Import Analysis Session'),
      filters: [{ name: 'JSON', extensions: ['json'] }],
      multiple: false
    });

    if (!filePath || Array.isArray(filePath)) {
      return null;
    }

    const text = await readTextFile(filePath);
    const imported = JSON.parse(text) as AnalysisSession;
    return imported;
  } catch (error) {
    alert(translate('Failed to import session: {error}', { error: String(error) }));
    return null;
  }
}


function generateMaterialsAndMethods(analysis: AnalysisSession): string {
  const t = translate;
  const config = analysis.config || {};
  const stats = analysis.statistics || {};
  const method = analysis.deMetadata?.method || (config.analysisMethods && config.analysisMethods[0]) || t('Auto-detected statistical test');
  const pathwayName = analysis.pathway?.title || analysis.pathway?.name || t('Target Pathway');
  const geneCount = stats.total_nodes || t('N/A');
  const enrichmentMeta = analysis.enrichmentMetadata || {};
  const geneSetSource = enrichmentMeta.gene_set_source || t('N/A');
  const geneSetVersion = enrichmentMeta.gene_set_version || t('N/A');
  const geneSetHash = enrichmentMeta.gene_set_hash || t('N/A');
  const enrichMethod = enrichmentMeta.method || 'ORA/GSEA';

  return `
    <h3>${t('Data Preprocessing')}</h3>
    <p>${t('Gene expression data was imported from')} <em>${analysis.sourceFilePath.split(/[\\/]/).pop()}</em>. 
    ${t('The dataset was effectively mapped to')} <strong>${geneCount}</strong> ${t('unique entities within the')} <strong>${pathwayName}</strong> ${t('context')}.</p>

    <h3>${t('Differential Expression Analysis')}</h3>
    <p>${t('Differential expression was assessed using')} <strong>${method}</strong> ${t('method')}. 
    ${t('Significant features were identified based on a Log2 Fold Change threshold and standard P-value significance cutoffs')}.</p>

    <h3>${t('Enrichment & Visualization')}</h3>
    <p>${t('Pathway topology and enrichment analysis were performed using BioCopilot v2.0 algorithms')} (<strong>${enrichMethod}</strong>). 
    ${t('Gene set source')}: <strong>${geneSetSource}</strong> (${t('version')} <strong>${geneSetVersion}</strong>, ${t('hash')} <strong>${geneSetHash}</strong>). 
    ${t('Visualizations include Volcano plots for significance distribution and interactive pathway mapping')}.</p>
    `;
}

export async function exportSessionAsInteractiveHtml(analysis: AnalysisSession): Promise<boolean> {
  if (!analysis) {
    alert(translate('No analysis data to export!'));
    return false;
  }

  const t = translate;
  const baseName = analysis.sourceFilePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'session';
  const defaultName = `${baseName}_lab_report.html`;
  const htmlLang = (typeof localStorage !== 'undefined' && localStorage.getItem('bioviz_language')) || 'en';
  const reportI18n = {
    reportTitle: t('BioCopilot Analysis Report'),
    generatedOn: t('Generated on'),
    materialsMethods: t('Materials & Methods'),
    citations: t('Citations & Dependencies'),
    analysisResults: t('Analysis Results'),
    topDE: t('Top Differentially Expressed Genes'),
    gene: t('Gene'),
    log2fc: t('Log2FC'),
    negLog10P: t('-log10(P)'),
    status: t('Status'),
    enrichmentAnalysis: t('Enrichment Analysis'),
    term: t('Term'),
    score: t('Score'),
    fdrOrP: t('FDR / P'),
    overlap: t('Overlap'),
    evidenceAudit: t('Evidence Audit'),
    differentialExpression: t('Differential Expression'),
    enrichment: t('Enrichment'),
    distributionSnapshot: t('Distribution Snapshot (Optional)'),
    aiLog: t('AI Interpretation Log'),
    verifiedBy: t('Verified by'),
    aiModel: t('AI Model'),
    database: t('Database'),
    reportGenerated: t('Report Generated'),
    privacyNote: t('Ensure data privacy before sharing.'),
    dataset: t('Dataset'),
    pathway: t('Pathway'),
    significantGenes: t('Significant Genes'),
    totalFeatures: t('Total Features'),
    unknown: t('Unknown'),
    na: t('N/A'),
    none: t('None'),
    noSignificantFeatures: t('No significant features found.'),
    noEnrichmentData: t('No enrichment data available.'),
    noDistributionData: t('No distribution data available.'),
    aiInsight: t('AI Insight'),
    userQuery: t('User Query'),
    noConversation: t('No AI conversation recorded.'),
    showingOra: t('Showing top 10 results from ORA analysis.'),
    showingGsea: t('Showing top 10 results from GSEA (Title, NES, FDR).'),
    noEnrichmentPerformed: t('No enrichment analysis was performed.'),
    method: t('Method'),
    warning: t('Warning'),
    completed: t('Completed'),
    geneSetSource: t('Gene Set Source'),
    version: t('Version'),
    dbHash: t('DB Hash'),
    downloadDate: t('Download Date'),
    software: t('Software'),
    total: t('Total'),
    upDown: t('Up/Down'),
    log2fcMin: t('Log2FC Min'),
    log2fcMax: t('Log2FC Max'),
    log2fcMedian: t('Log2FC Median'),
    pMin: t('P Min'),
    pMedian: t('P Median'),
    distributionStatus: t('Status'),
  };

  // Inject generated methods
  const methodsHtml = generateMaterialsAndMethods(analysis);

  // We append the methods to the analysis object temporarily for the template (or just inject via string)
  // Actually, we can just inject it into the HTML body directly.

  const safeJson = JSON.stringify(analysis).replace(/</g, '\\u003c');

  const html = `<!doctype html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8" />
  <title>${t('BioCopilot Report')} • ${baseName}</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #1e293b;
      --muted: #64748b;
      --border: #e2e8f0;
      --primary: #2563eb;
      --card-bg: #ffffff;
    }
    @media (prefers-color-scheme: dark) {
      /* Optional: keep dark mode support if system pref, but default to light for "Paper" feel? */
      /* actually, let's enforce light mode for the file to ensure printability */
    }
    
    body { 
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
      background: var(--bg); 
      color: var(--text); 
      margin: 0; 
      padding: 40px; 
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
    }

    @media print {
      body { padding: 0; max-width: 100%; }
      .no-print { display: none; }
      .card { border: none !important; box-shadow: none !important; padding: 0 !important; margin-bottom: 30px !important; }
    }

    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #0f172a; }
    h2 { font-size: 20px; font-weight: 700; margin-top: 30px; margin-bottom: 16px; border-bottom: 2px solid var(--border); padding-bottom: 8px; }
    h3 { font-size: 16px; font-weight: 600; margin-top: 20px; margin-bottom: 8px; color: #334155; }
    
    .header-meta { margin-bottom: 40px; color: var(--muted); font-size: 14px; }
    
    .card { 
      background: var(--card-bg); 
      border: 1px solid var(--border); 
      border-radius: 12px; 
      padding: 24px; 
      margin-bottom: 24px; 
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); 
    }

    table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px; }
    th { text-align: left; padding: 12px 8px; border-bottom: 2px solid var(--border); background: #f8fafc; font-weight: 600; color: #475569; }
    td { padding: 10px 8px; border-bottom: 1px solid var(--border); color: #334155; }
    tr:last-child td { border-bottom: none; }

    .pill { 
      display: inline-flex; align-items: center; gap: 6px; 
      padding: 4px 10px; border-radius: 99px; 
      background: #f1f5f9; color: #475569; 
      font-size: 12px; font-weight: 500;
      border: 1px solid #e2e8f0;
      margin-right: 8px; margin-bottom: 8px;
    }
    
    .chat-msg { margin-bottom: 16px; padding: 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .chat-role { font-weight: 600; font-size: 12px; margin-bottom: 4px; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px; }

    .audit-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 20px;
      font-size: 13px;
      color: #475569;
    }

    .audit-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
    }

    .audit-label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94a3b8;
      margin-bottom: 4px;
    }

    .audit-optional {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px dashed #e2e8f0;
    }

    .audit-optional summary {
      cursor: pointer;
      font-size: 13px;
      color: #475569;
      margin-bottom: 10px;
    }
    
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid var(--border); text-align: center; color: var(--muted); font-size: 12px; }
  </style>
</head>
<body>

  <header>
    <h1>${t('BioCopilot Analysis Report')}</h1>
    <div class="header-meta">
      ${t('Generated on')} ${new Date().toLocaleString()} • BioCopilot v2.0
    </div>
    <div id="meta-pills"></div>
  </header>

  <section class="card">
    <h2>${t('Materials & Methods')}</h2>
    <div id="methods-content">${methodsHtml}</div>
    <h3>${t('Citations & Dependencies')}</h3>
    <ul style="font-size: 13px; color: #64748b; padding-left: 20px;">
        <li><strong>BioCopilot</strong> (2025). ${t('AI-driven biological data visualization.')}</li>
        <li><strong>KEGG Database</strong>: ${t('Kyoto Encyclopedia of Genes and Genomes.')}</li>
        <li><strong>${t('Python Data Stack')}</strong>: Pandas, SciPy, NumPy.</li>
    </ul>
  </section>

  <section class="card">
    <h2>${t('Analysis Results')}</h2>
    <h3>${t('Top Differentially Expressed Genes')}</h3>
    <table id="volcano-table">
      <thead><tr><th>${t('Gene')}</th><th>${t('Log2FC')}</th><th>${t('-log10(P)')}</th><th>${t('Status')}</th></tr></thead>
      <tbody id="volcano-body"></tbody>
    </table>
  </section>

  <section class="card">
    <h2>${t('Enrichment Analysis')}</h2>
    <table id="enrich-table">
      <thead><tr><th>${t('Term')}</th><th>${t('Score')}</th><th>${t('FDR / P')}</th><th>${t('Overlap')}</th></tr></thead>
      <tbody id="enrich-body"></tbody>
    </table>
    <p class="muted" id="enrich-note" style="margin-top: 10px; font-size:13px; color:#64748b;"></p>
  </section>

  <section class="card">
    <h2>${t('Evidence Audit')}</h2>
    <h3>${t('Differential Expression')}</h3>
    <div id="audit-de" class="audit-grid"></div>
    <h3>${t('Enrichment')}</h3>
    <div id="audit-enrich" class="audit-grid"></div>
    <details class="audit-optional">
      <summary>${t('Distribution Snapshot (Optional)')}</summary>
      <div id="audit-distribution" class="audit-grid"></div>
    </details>
  </section>

  <section class="card no-print">
    <h2>${t('AI Interpretation Log')}</h2>
    <div id="chat-log"></div>
  </section>

  <div class="footer">
    ${t('Verified by')} BioCopilot v${analysis.appVersion || '2.0.0'} • ${t('AI Model')}: ${analysis.aiModel || t('Standard')} • ${t('Database')}: KEGG 2021 Human<br/>
    ${t('Report Generated')}: ${new Date().toLocaleString()} • ${t('Ensure data privacy before sharing.')}
  </div>

  <script id="session-data" type="application/json">${safeJson}</script>
  <script>
    const dataEl = document.getElementById('session-data');
    const data = dataEl ? JSON.parse(dataEl.textContent || '{}') : {};
    const i18n = ${JSON.stringify(reportI18n)};
    const esc = (v) => String(v ?? '').replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

    // Meta Pills
    const pillHost = document.getElementById('meta-pills');
    const pills = [
      { label: i18n.dataset, value: data.sourceFilePath ? data.sourceFilePath.split(/[\\\\/]/).pop() : i18n.unknown },
      { label: i18n.pathway, value: data.pathway?.title || data.pathway?.name || i18n.na },
      { label: i18n.significantGenes, value: (data.volcano_data || []).filter(d => d.status && d.status !== 'ns').length },
      { label: i18n.totalFeatures, value: (data.volcano_data || []).length }
    ];
    pillHost.innerHTML = pills.map(p => '<span class="pill"><strong>' + esc(p.label) + ':</strong> ' + esc(p.value) + '</span>').join('');

    // Volcano Table
    const volcano = Array.isArray(data.volcano_data) ? data.volcano_data.slice(0, 20) : [];
    const volcanoRows = volcano.map(row => {
      // Simple coloring for status
      const style = row.status === 'up' ? 'color:#dc2626;font-weight:600' : (row.status === 'down' ? 'color:#2563eb;font-weight:600' : '');
      return '<tr><td style="'+style+'">' + esc(row.gene) + '</td><td>' + (typeof row.x === 'number' ? row.x.toFixed(2) : esc(row.x)) + '</td><td>' + (typeof row.y === 'number' ? row.y.toFixed(2) : esc(row.y)) + '</td><td>' + esc(row.status || '-') + '</td></tr>';
    }).join('');
    document.getElementById('volcano-body').innerHTML = volcanoRows || '<tr><td colspan="4" style="color:#94a3b8;text-align:center;padding:20px;">' + esc(i18n.noSignificantFeatures) + '</td></tr>';

    // Enrichment Table
    const enrichBody = document.getElementById('enrich-body');
    const enrichNote = document.getElementById('enrich-note');
    const enrichRows = [];
    if (Array.isArray(data.enrichmentResults) && data.enrichmentResults.length) {
      data.enrichmentResults.slice(0, 10).forEach(r => {
        enrichRows.push('<tr><td>' + esc(r.term || r.pathway_name) + '</td><td>' + esc(r.nes || r.odds_ratio || '') + '</td><td>' + esc(r.adjusted_p_value || r.fdr || r.p_value || '') + '</td><td>' + esc(r.overlap || r.overlap_ratio || '') + '</td></tr>');
      });
      enrichNote.textContent = i18n.showingOra;
    } else if (data.gseaResults && (data.gseaResults.up?.length || data.gseaResults.down?.length)) {
      const combined = [...(data.gseaResults.up || []), ...(data.gseaResults.down || [])];
      combined.sort((a,b) => Math.abs(b.nes) - Math.abs(a.nes)).slice(0, 10).forEach(r => {
         enrichRows.push('<tr><td>' + esc(r.term || r.pathway_name) + '</td><td>' + esc(r.nes || '') + '</td><td>' + esc(r.fdr || r.p_value || '') + '</td><td>' + esc(r.overlap || r.overlap_ratio || '') + '</td></tr>');
      });
      enrichNote.textContent = i18n.showingGsea;
    } else {
      enrichNote.textContent = i18n.noEnrichmentPerformed;
    }
    enrichBody.innerHTML = enrichRows.join('') || '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px;">' + esc(i18n.noEnrichmentData) + '</td></tr>';

    // Evidence Audit
    const auditDE = document.getElementById('audit-de');
    const auditEnrich = document.getElementById('audit-enrich');
    const deMeta = data.deMetadata || {};
    const enrichMeta = data.enrichmentMetadata || {};
    const deItems = [
      { label: i18n.method, value: deMeta.method || i18n.na },
      { label: i18n.warning, value: deMeta.warning || i18n.none },
      { label: i18n.completed, value: deMeta.completed_at || i18n.na }
    ];
    const enrichItems = [
      { label: i18n.method, value: enrichMeta.method || i18n.na },
      { label: i18n.geneSetSource, value: enrichMeta.gene_set_source || i18n.na },
      { label: i18n.version, value: enrichMeta.gene_set_version || i18n.na },
      { label: i18n.dbHash, value: enrichMeta.gene_set_hash || i18n.na },
      { label: i18n.downloadDate, value: enrichMeta.gene_set_download_date || i18n.na },
      { label: i18n.software, value: enrichMeta.software_version || i18n.na }
    ];
    auditDE.innerHTML = deItems.map(i => '<div class="audit-item"><span class="audit-label">' + esc(i.label) + '</span>' + esc(i.value) + '</div>').join('');
    auditEnrich.innerHTML = enrichItems.map(i => '<div class="audit-item"><span class="audit-label">' + esc(i.label) + '</span>' + esc(i.value) + '</div>').join('');

    const distHost = document.getElementById('audit-distribution');
    if (distHost && Array.isArray(data.volcano_data) && data.volcano_data.length) {
      const xs = data.volcano_data.map(d => d.x).filter(v => typeof v === 'number' && !Number.isNaN(v));
      const ps = data.volcano_data.map(d => d.pvalue).filter(v => typeof v === 'number' && !Number.isNaN(v));
      const median = (vals) => {
        if (!vals.length) return null;
        const sorted = [...vals].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      };
      const up = data.volcano_data.filter(d => (d.status || '').toLowerCase() === 'up').length;
      const down = data.volcano_data.filter(d => (d.status || '').toLowerCase() === 'down').length;
      const distItems = [
        { label: i18n.total, value: data.volcano_data.length },
        { label: i18n.upDown, value: up + '/' + down },
        { label: i18n.log2fcMin, value: xs.length ? Math.min(...xs).toFixed(3) : i18n.na },
        { label: i18n.log2fcMax, value: xs.length ? Math.max(...xs).toFixed(3) : i18n.na },
        { label: i18n.log2fcMedian, value: xs.length ? median(xs)?.toFixed(3) : i18n.na },
        { label: i18n.pMin, value: ps.length ? Math.min(...ps).toExponential(2) : i18n.na },
        { label: i18n.pMedian, value: ps.length ? median(ps)?.toExponential(2) : i18n.na }
      ];
      distHost.innerHTML = distItems.map(i => '<div class="audit-item"><span class="audit-label">' + esc(i.label) + '</span>' + esc(i.value) + '</div>').join('');
    } else if (distHost) {
      distHost.innerHTML = '<div class="audit-item"><span class="audit-label">' + esc(i18n.distributionStatus) + '</span>' + esc(i18n.noDistributionData) + '</div>';
    }

    // Chat Log
    const chat = Array.isArray(data.chatHistory) ? data.chatHistory : [];
    const chatHost = document.getElementById('chat-log');
    chatHost.innerHTML = chat.length ? chat.map(c => {
      const isAI = c.role === 'assistant';
      return '<div class="chat-msg"><div class="chat-role">' + (isAI ? esc(i18n.aiInsight) : esc(i18n.userQuery)) + '</div>' + esc(c.content || '').replace(/\\n/g, '<br/>') + '</div>';
    }).join('') : '<div style="color:#94a3b8;font-style:italic;">' + esc(i18n.noConversation) + '</div>';

  </script>
</body>
</html>`;

  try {
    const filePath = await save({
      title: translate('Export Lab Report'),
      defaultPath: defaultName,
      filters: [{ name: translate('HTML Report'), extensions: ['html'] }]
    });

    if (!filePath) {
      return false;
    }

    await writeTextFile(filePath, html);
    return true;
  } catch (error) {
    console.error('[Export] Failed to export HTML:', error);
    alert(translate('Failed to export HTML: {error}', { error: String(error) }));
    return false;
  }
}
