import markdown
import os

def generate_html_docs():
    # Configuration
    input_files = [
        "docs/USER_MANUAL.md",
        "docs/QA_GUIDE.md"
    ]
    output_file = "BioViz_User_Manual.html"
    
    # CSS Styles
    css = """
    <style>
        :root {
            --primary-color: #2563eb;
            --bg-color: #f8fafc;
            --text-color: #1e293b;
            --sidebar-width: 280px;
        }
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background: var(--bg-color);
            margin: 0;
            display: flex;
        }
        /* Sidebar Navigation */
        #toc {
            width: var(--sidebar-width);
            height: 100vh;
            position: fixed;
            left: 0;
            top: 0;
            background: white;
            border-right: 1px solid #e2e8f0;
            overflow-y: auto;
            padding: 2rem 1.5rem;
            box-sizing: border-box;
        }
        #toc h3 {
            margin-top: 0;
            font-size: 1.2rem;
            color: var(--primary-color);
        }
        #toc ul {
            list-style: none;
            padding: 0;
        }
        #toc li {
            margin: 0.5rem 0;
        }
        #toc a {
            text-decoration: none;
            color: #64748b;
            font-size: 0.95rem;
            transition: color 0.2s;
        }
        #toc a:hover {
            color: var(--primary-color);
        }
        
        /* Main Content */
        #content {
            margin-left: var(--sidebar-width);
            padding: 2rem 4rem;
            max-width: 900px;
            background: white;
            min-height: 100vh;
            box-shadow: 0 0 50px rgba(0,0,0,0.05);
        }
        
        h1, h2, h3 { color: #0f172a; }
        h1 { border-bottom: 2px solid var(--primary-color); padding-bottom: 0.5rem; }
        h2 { margin-top: 2.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3rem; }
        
        code {
            background: #f1f5f9;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: 'Fira Code', monospace;
            font-size: 0.9em;
            color: #d63384;
        }
        pre {
            background: #1e1e1e; /* Dark theme for code blocks */
            color: #d4d4d4;
            padding: 1.5rem;
            border-radius: 8px;
            overflow-x: auto;
        }
        pre code {
            background: transparent;
            color: inherit;
            padding: 0;
        }
        
        blockquote {
            border-left: 4px solid var(--primary-color);
            margin: 0;
            padding-left: 1rem;
            color: #475569;
            background: #f8fafc;
            padding: 1rem;
            border-radius: 0 4px 4px 0;
        }
        
        .diagram-container {
            margin: 2rem 0;
            padding: 1rem;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: white;
            text-align: center;
        }
        .diagram-caption {
            font-size: 0.9rem;
            color: #64748b;
            margin-top: 0.5rem;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            #toc { display: none; }
            #content { margin-left: 0; padding: 1rem; }
        }
    </style>
    """

    # Mermaid JS
    mermaid_script = """
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
    </script>
    """

    # Custom Diagrams (Generated from "Code" Logic)
    workflow_diagram = """
    <div class="diagram-container">
        <div class="mermaid">
            graph LR
                A[Start: Upload Files] --> B{Parsing};
                B -->|Success| C[Map Columns];
                B -->|Error| B1[Fix Format/Template];
                C --> D[Select Context/Pathway];
                D --> E[Run Analysis];
                E --> F[Visualization];
                F --> G[Volcano Pot];
                F --> H[Pathway Map];
                F --> I[AI Insights];
                
                style A fill:#e0f2fe,stroke:#0284c7;
                style E fill:#dcfce7,stroke:#16a34a;
                style I fill:#f3e8ff,stroke:#9333ea;
        </div>
        <div class="diagram-caption">Figure 1: BioViz-Local Standard Analysis Workflow</div>
    </div>
    """

    tech_stack_diagram = """
    <div class="diagram-container">
        <div class="mermaid">
            sequenceDiagram
                participant User
                participant UI as React Frontend
                participant Tauri as Rust Core
                participant Py as Python Sidecar
                
                User->>UI: Upload CSV
                UI->>UI: Parse & Validate
                User->>UI: Click "Run Analysis"
                UI->>Tauri: Invoke Command
                Tauri->>Py: Send Data (JSON)
                Py->>Py: Stats Calculation (Pandas/Scipy)
                Py->>Py: Generate Static Assets
                Py-->>Tauri: Return Results
                Tauri-->>UI: Update State
                UI->>User: Show Interactive Plots
        </div>
        <div class="diagram-caption">Figure 2: System Architecture & Data Flow</div>
    </div>
    """

    # Combine Content
    full_content = ""
    toc_links = []
    
    # Process Manual
    for filepath in input_files:
        if not os.path.exists(filepath):
            print(f"Skipping missing file: {filepath}")
            continue
            
        with open(filepath, "r", encoding="utf-8") as f:
            text = f.read()
            html_fragment = markdown.markdown(text, extensions=['fenced_code', 'tables'])
            
            # Simple header extraction for TOC (Mock logic for now, just main sections)
            base_name = os.path.basename(filepath).replace(".md", "").replace("_", " ")
            toc_links.append(f"<li><a href='#{base_name}'>{base_name}</a></li>")
            
            full_content += f"<div id='{base_name}'>{html_fragment}</div><hr>"

    # Inject Diagrams into appropriate places (simple replacement for now)
    # We'll put the Workflow diagram after "Step 4" in Manual
    if "Step 4: 可视化" in full_content:
         full_content = full_content.replace("Step 4: 可视化 (Visualize)</h3>", "Step 4: 可视化 (Visualize)</h3>" + workflow_diagram)
    
    # Put Tech Stack diagram in "Product Intro" or near Installation
    if "核心价值" in full_content:
        full_content = full_content.replace("核心价值</h3>", "核心价值</h3>" + tech_stack_diagram)

    # HTML Shell
    html_template = f"""
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BioViz-Local Documentation</title>
        {css}
    </head>
    <body>
        <nav id="toc">
            <h3>📖 Documentation</h3>
            <ul>
                {''.join(toc_links)}
                <li><a href='#architecture'>System Architecture</a></li>
            </ul>
            <div style="margin-top: 2rem; font-size: 0.8rem; color: #94a3b8;">
                Generated by BioViz Agent<br>
                v2.0.0
            </div>
        </nav>
        
        <main id="content">
            {full_content}
            <div id="architecture" style="margin-top: 4rem;">
                <h2>System Architecture</h2>
                <p>Below is the technical data flow generated from the codebase logic:</p>
                {tech_stack_diagram}
            </div>
        </main>
        
        {mermaid_script}
    </body>
    </html>
    """
    
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(html_template)
    
    print(f"✅ Documentation generated: {output_file}")

if __name__ == "__main__":
    generate_html_docs()
