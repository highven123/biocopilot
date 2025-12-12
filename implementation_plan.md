# Implementation Plan: Dynamic KEGG Pathway Search & Download

# Goal Description
Enable users to search for KEGG pathways by name (e.g., "Apoptosis") and download them directly into the application's template library without leaving the app. This requires fetching KGML data from KEGG, parsing/converting it to our JSON format, and saving it locally.

## User Review Required
> [!IMPORTANT]
> **KGML Parsing Limitations**: KEGG's KGML format is complex. The parser will focus on extracting Genes/Proteins and their interactions. Coordinate conversion from KGML (static image coordinates) to our visualization format should be straightforward, but node categorization (Kinase vs Receptor) might be generic ("Gene") as KGML doesn't explicitly label these functional categories like our manual templates do.

## Proposed Changes

### Python Backend
#### [MODIFY] [bio_core.py](file:///Users/haifeng/BioViz-Local/python/bio_core.py)
- New function `search_kegg_pathways(query)`: Calls `http://rest.kegg.jp/find/pathway/{query}`.
- New function `download_kegg_pathway(pathway_id)`: Calls `http://rest.kegg.jp/get/{id}/kgml`.
- New helper `parse_kgml_to_json(kgml_content)`:
    - Uses `xml.etree.ElementTree`.
    - Extracts `<entry>` (Nodes) and `<relation>` (Edges).
    - Maps coordinates.
    - Default category color mapping.
- Update `handle_analyze` (or add new handler) to expose these functions to `bio_engine.py`.

#### [MODIFY] [bio_engine.py](file:///Users/haifeng/BioViz-Local/python/bio_engine.py)
- Add command routing for `search_pathway` and `download_pathway`.

### Frontend
#### [MODIFY] [TemplatePicker.tsx](file:///Users/haifeng/BioViz-Local/src/components/TemplatePicker.tsx)
- Add a "Search Online" button.
- Add a search input field and results list (modal or expandable section).
- Handle `search_pathway` command invocation.
- Handle `download_pathway` command invocation.
- Auto-select the downloading template upon success.

#### [MODIFY] [entityTypes.ts](file:///Users/haifeng/BioViz-Local/src/entityTypes.ts)
- Add interfaces for `KeggSearchResult`.

## Verification Plan
### Automated Tests
- None (requires external API mocking).

### Manual Verification
1. Open app, go to Step 3 (Select Pathway).
2. Click "Search Online".
3. Type "Cell Cycle" -> Verify results appear.
4. Click "Download" on a result -> Verify "Success" message.
5. Verify the new template appears in the local list and visualizer loads it correctly.
