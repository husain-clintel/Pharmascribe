import type { Report, ExtractedContext } from '@/types'

export const PK_REPORT_SYSTEM_PROMPT = `You are an expert pharmacokineticist and regulatory writer generating IND (Investigational New Drug) BA/PK Memorandum reports.

CRITICAL RULES:
1. Route-Appropriate Terminology:
   - For IV administration: NEVER use "absorbed" or "absorption"
   - Use instead: "reached peak concentrations", "distributed", "achieved Cmax"
   - For SC/IM/Oral: OK to use "absorbed", "absorption phase", "bioavailability"

2. Use Mean Values in Narrative:
   - Use mean values (not ranges) for NCA parameters in narrative text
   - Ranges are only for individual animal data tables
   - Example: "Mean terminal half-life was approximately 20 hours"

3. Statistics Format:
   - Use Mean (%CV) format for summary statistics
   - Example: "1234 (25)" means mean of 1234 with 25% CV

4. R-squared Criterion:
   - Report terminal half-life (t½) only when R² ≥ 0.80
   - Use "NR" (Not Reported) when R² < 0.80

5. Dose-Normalized Values:
   - Use Cmax/D and AUClast/D for cross-dose comparisons
   - Units: ng/mL per mg/kg (Cmax/D), h·ng/mL per mg/kg (AUClast/D)

6. Animal ID Format:
   - Remove decimal points (8501.0 → 8501)

7. Matrix Clarity:
   - Always specify matrix: "plasma mRNA Cmax" not just "mRNA Cmax"

8. Number Formatting:
   - Use 3 significant figures
   - Include thousand separators for large numbers

REPORT STRUCTURE (BA/PK Memorandum Format):

FRONT MATTER (Unnumbered):
- Title Page
- Signatures Page
- Table of Contents
- List of Tables
- List of Figures

BODY:
- Executive Summary (unnumbered)
- 1. Introduction
  - 1.1 Background
  - 1.2 Objectives
  - 1.3 Regulatory Context
- 2. Methods
  - 2.1 Study Design
  - 2.2 Bioanalytical Methods
  - 2.3 Pharmacokinetic Data Analysis
- 3. Results
  - 3.1 Plasma Pharmacokinetics
  - 3.2 Tissue Distribution (if applicable)
- 4. Discussion
- 5. Conclusions

BACK MATTER (Unnumbered):
- References
- Appendices (Individual animal data)`

export function generateReportPrompt(report: Report, context: ExtractedContext | null): string {
  // Build detailed file information
  let dataInstructions = ''
  let figureFiles: any[] = []
  let ncaData: any = null
  let concentrationData: any = null
  let protocolData: any = null

  if (context && context.files) {
    context.files.forEach((file: any) => {
      if (file.fileType === 'FIGURE') {
        figureFiles.push(file)
      }
      if (file.fileType === 'NCA_PARAMETERS' && file.extractedData) {
        ncaData = file.extractedData
      }
      if (file.fileType === 'CONCENTRATION_DATA' && file.extractedData) {
        concentrationData = file.extractedData
      }
      if (file.fileType === 'PROTOCOL' && file.extractedData) {
        protocolData = file.extractedData
      }
    })

    dataInstructions = `

==============================================================================
CRITICAL: DATA EXTRACTION INSTRUCTIONS - READ CAREFULLY
==============================================================================

You MUST extract ACTUAL VALUES from the uploaded data files below and populate the tables.
DO NOT use placeholder text like "Value (CV)" or "XX.X (YY.Y)".
Parse the raw data and calculate/extract the real numbers.

UPLOADED FILES WITH RAW DATA:
${context.files.map((f: any, i: number) => `
================================================================================
FILE ${i + 1}: ${f.filename} (Type: ${f.fileType})
================================================================================
${f.extractedData ? JSON.stringify(f.extractedData, null, 2).slice(0, 8000) : 'No data extracted'}
`).join('\n')}

${ncaData ? `
==============================================================================
NCA PARAMETERS - EXTRACT THESE VALUES FOR TABLE 1:
==============================================================================
Look at the data above and find:
- Cmax values (maximum concentration) - use the Mean column or calculate from individual values
- Tmax values (time to max concentration) - use Mean or median
- AUClast values (area under curve to last timepoint)
- AUCinf values (area under curve extrapolated to infinity)
- t½ (terminal half-life) - ONLY include if R² ≥ 0.80, otherwise put "NR"
- %CV (coefficient of variation) - calculate as (SD/Mean)*100 or use if provided

For each parameter, format as: "Mean (CV%)"
Example: If Cmax mean is 1234 ng/mL with CV of 25%, write "1234 (25)"
Use 3 significant figures with thousand separators for large numbers.
` : ''}

${concentrationData ? `
==============================================================================
CONCENTRATION-TIME DATA AVAILABLE:
==============================================================================
Use this data to:
1. Describe the PK profile in the Results section (e.g., "Concentrations peaked at X hours post-dose")
2. Reference actual timepoints and concentration values in the narrative
3. Create an appendix table with individual animal concentration data if available
` : ''}

${protocolData ? `
==============================================================================
PROTOCOL INFORMATION:
==============================================================================
Use protocol details for:
- Study design section
- Dosing information
- Sample collection schedule
- Bioanalytical method description
` : ''}

${figureFiles.length > 0 ? `
==============================================================================
FIGURE FILES (${figureFiles.length} uploaded):
==============================================================================
${figureFiles.map((f: any, i: number) => `- Figure ${i + 1}: "${f.filename}" (ID: ${f.id || 'figure-' + (i+1)})`).join('\n')}

YOU MUST include these in the "figures" array with proper captions.
Each figure entry should have:
- id: use the filename without extension as ID
- number: sequential figure number
- filename: the exact filename
- caption: descriptive caption (e.g., "Mean Plasma Concentration-Time Profile Following Single IV Administration")
- sectionId: "plasma-pk" or appropriate section
` : ''}
`
  }

  return `Generate a BA/PK Memorandum report based on the following study information:

STUDY METADATA:
- Study ID: ${report.studyId}
- Report Title: ${report.reportTitle}
- Species: ${report.species || 'Not specified'}
- Route of Administration: ${report.routeOfAdmin || 'Not specified'}
- Dose Level(s): ${report.doseLevel || 'Not specified'}
- Analyte(s): ${report.analytes || 'Not specified'}
- Matrix/Matrices: ${report.matrices || 'Not specified'}
- Test Facility: ${report.testFacility || 'Not specified'}

AUTHOR INFORMATION:
- Prepared by: ${report.preparedBy || 'Not specified'}
- Reviewed by: ${report.reviewedBy || 'Not specified'}
- Approved by: ${report.approvedBy || 'Not specified'}
${dataInstructions}

==============================================================================
FINAL INSTRUCTIONS - CRITICAL
==============================================================================
1. Extract REAL VALUES from the uploaded data files and use them in tables
2. DO NOT use placeholders like "Value (CV)" - use actual numbers
3. Include ALL uploaded figures in the figures array
4. Write comprehensive narrative text using actual data values

Generate a complete report draft. Return the response as a JSON object with this structure:

{
  "frontMatter": {
    "titlePage": {
      "title": "BA/PK Memorandum",
      "subtitle": "${report.reportTitle}",
      "studyId": "${report.studyId}",
      "reportNumber": "${report.reportNumber || 'TBD'}",
      "effectiveDate": "${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}"
    },
    "signatures": {
      "preparedBy": "${report.preparedBy || 'TBD'}",
      "reviewedBy": "${report.reviewedBy || 'TBD'}",
      "approvedBy": "${report.approvedBy || 'TBD'}"
    }
  },
  "sections": [
    {
      "id": "exec-summary",
      "title": "Executive Summary",
      "level": 1,
      "numbered": false,
      "content": "Write a comprehensive executive summary with actual PK parameter values from the data..."
    },
    {
      "id": "introduction",
      "title": "Introduction",
      "level": 1,
      "numbered": true,
      "number": "1",
      "content": ""
    },
    {
      "id": "background",
      "title": "Background",
      "level": 2,
      "numbered": true,
      "number": "1.1",
      "content": "Background on the therapeutic and study rationale..."
    },
    {
      "id": "objectives",
      "title": "Objectives",
      "level": 2,
      "numbered": true,
      "number": "1.2",
      "content": "The objectives of this study were to..."
    },
    {
      "id": "methods",
      "title": "Methods",
      "level": 1,
      "numbered": true,
      "number": "2",
      "content": ""
    },
    {
      "id": "study-design",
      "title": "Study Design",
      "level": 2,
      "numbered": true,
      "number": "2.1",
      "content": "Description of the study design from the protocol..."
    },
    {
      "id": "bioanalytical",
      "title": "Bioanalytical Methods",
      "level": 2,
      "numbered": true,
      "number": "2.2",
      "content": "Description of the bioanalytical methods..."
    },
    {
      "id": "pk-analysis",
      "title": "Pharmacokinetic Data Analysis",
      "level": 2,
      "numbered": true,
      "number": "2.3",
      "content": "NCA was performed using Phoenix WinNonlin. Parameters included Cmax, Tmax, AUClast, AUCinf, and t½. Terminal half-life was reported only when R² exceeded 0.80."
    },
    {
      "id": "results",
      "title": "Results",
      "level": 1,
      "numbered": true,
      "number": "3",
      "content": ""
    },
    {
      "id": "plasma-pk",
      "title": "Plasma Pharmacokinetics",
      "level": 2,
      "numbered": true,
      "number": "3.1",
      "content": "Write detailed results using ACTUAL VALUES from the NCA data. Example: 'Following IV administration at 1 mg/kg, mean plasma Cmax was 1,234 ng/mL with concentrations declining with a mean t½ of 20.5 hours.' Reference Table 1 and any figures."
    },
    {
      "id": "discussion",
      "title": "Discussion",
      "level": 1,
      "numbered": true,
      "number": "4",
      "content": "Discussion of findings using actual values, comparisons, and implications..."
    },
    {
      "id": "conclusions",
      "title": "Conclusions",
      "level": 1,
      "numbered": true,
      "number": "5",
      "content": "Key conclusions with specific values from the study..."
    },
    {
      "id": "references",
      "title": "References",
      "level": 1,
      "numbered": false,
      "content": "1. Study Protocol\\n2. Bioanalytical Method Validation Report"
    },
    {
      "id": "appendices",
      "title": "Appendices",
      "level": 1,
      "numbered": false,
      "content": "Individual animal PK parameter data are presented in Appendix Table A1."
    }
  ],
  "tables": [
    {
      "id": "table-1",
      "number": 1,
      "caption": "Summary of Plasma PK Parameters Following ${report.routeOfAdmin || 'IV'} Administration of ${report.analytes || 'Test Article'} to ${report.species || 'Animals'}",
      "headers": ["Parameter", "Units", "${report.doseLevel || 'Dose Group'} Mean (%CV)"],
      "data": [
        ["Cmax", "ng/mL", "<<<EXTRACT ACTUAL VALUE FROM NCA DATA>>> (<<<CV>>>)"],
        ["Tmax", "h", "<<<EXTRACT ACTUAL VALUE>>>"],
        ["AUClast", "h·ng/mL", "<<<EXTRACT ACTUAL VALUE>>> (<<<CV>>>)"],
        ["AUCinf", "h·ng/mL", "<<<EXTRACT ACTUAL VALUE>>> (<<<CV>>>)"],
        ["t½", "h", "<<<EXTRACT IF R²≥0.80, else NR>>>"],
        ["CL", "mL/h/kg", "<<<EXTRACT ACTUAL VALUE>>> (<<<CV>>>)"],
        ["Vss", "mL/kg", "<<<EXTRACT ACTUAL VALUE>>> (<<<CV>>>)"]
      ],
      "footnotes": ["Values are presented as Mean (%CV), n=X animals per group.", "NR = Not Reported due to R² < 0.80.", "Abbreviations: Cmax, maximum concentration; Tmax, time to Cmax; AUClast, area under the concentration-time curve to last measurable timepoint; AUCinf, AUC extrapolated to infinity; t½, terminal half-life; CL, clearance; Vss, volume of distribution at steady state."],
      "sectionId": "plasma-pk"
    }
  ],
  "figures": [${figureFiles.length > 0 ? figureFiles.map((f: any, i: number) => `
    {
      "id": "${f.filename?.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || 'figure-' + (i+1)}",
      "number": ${i + 1},
      "filename": "${f.filename}",
      "caption": "Mean Plasma Concentration-Time Profile of ${report.analytes || 'Test Article'} Following ${report.routeOfAdmin || 'IV'} Administration to ${report.species || 'Animals'}${i > 0 ? ' (Linear Scale)' : ''}",
      "sectionId": "plasma-pk"
    }`).join(',') : ''}
  ],
  "appendixTables": [
    {
      "id": "appendix-table-1",
      "number": "A1",
      "caption": "Individual Animal Plasma PK Parameters",
      "headers": ["Animal ID", "Cmax (ng/mL)", "Tmax (h)", "AUClast (h·ng/mL)", "t½ (h)"],
      "data": "<<<EXTRACT INDIVIDUAL ANIMAL DATA FROM NCA FILE - each row is [AnimalID, Cmax, Tmax, AUClast, t½]>>>",
      "footnotes": ["NR = Not Reported due to R² < 0.80."],
      "sectionId": "appendices"
    }
  ],
  "metadata": {
    "studyId": "${report.studyId}",
    "reportNumber": "${report.reportNumber || ''}",
    "reportTitle": "${report.reportTitle}",
    "reportVersion": "1.0",
    "reportDate": "${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}",
    "hasToC": true,
    "hasLoT": true,
    "hasLoF": true
  }
}

REMEMBER: Replace ALL <<<PLACEHOLDER>>> markers with ACTUAL VALUES extracted from the uploaded data files!`
}

export function generateChatPrompt(
  report: Report & { uploadedFiles?: any[]; extractedContext?: any },
  message: string,
  chatHistory: { role: string; content: string }[]
): string {
  const historyText = chatHistory
    .slice(-10)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n')

  // Build file context from uploaded files
  let fileContext = ''
  if (report.uploadedFiles && report.uploadedFiles.length > 0) {
    fileContext = `
SOURCE FILES AND DATA:
The following files were uploaded and contain the source data for this report. Use this information to answer questions accurately.

${report.uploadedFiles.map((file: any, index: number) => `
--- File ${index + 1}: ${file.filename} (${file.fileType}) ---
${file.extractedData ? JSON.stringify(file.extractedData, null, 2).slice(0, 3000) : 'No extracted data available'}
`).join('\n')}
`
  }

  // Include extracted context if available
  let extractedContextStr = ''
  if (report.extractedContext) {
    extractedContextStr = `
EXTRACTED STUDY DATA CONTEXT:
${JSON.stringify(report.extractedContext, null, 2).slice(0, 2000)}
`
  }

  // Get section IDs for reference
  const content = report.content as any
  const sectionList = content?.sections?.map((s: any) => `  - "${s.id}": ${s.title}`).join('\n') || 'No sections available'
  const tableList = content?.tables?.map((t: any) => `  - "${t.id}": Table ${t.number} - ${t.caption}`).join('\n') || 'No tables yet'
  const existingTableCount = content?.tables?.length || 0

  return `You are an expert pharmacokineticist helping refine a BA/PK Memorandum report. You can DIRECTLY MODIFY the report content.

==============================================================================
AVAILABLE SECTIONS (use these exact IDs when modifying):
==============================================================================
${sectionList}

==============================================================================
EXISTING TABLES:
==============================================================================
${tableList}

==============================================================================
CRITICAL: HOW TO MAKE CHANGES
==============================================================================

**FOR SECTION TEXT CHANGES:**
\`\`\`json
{
  "changes": {
    "sections": [
      {
        "id": "exec-summary",
        "content": "The complete new content for this section."
      }
    ]
  }
}
\`\`\`

**FOR ADDING A NEW TABLE (CRITICAL - use this format, NOT markdown!):**
\`\`\`json
{
  "changes": {
    "newTables": [
      {
        "id": "table-new-${existingTableCount + 1}",
        "number": ${existingTableCount + 1},
        "caption": "Descriptive Table Caption Here",
        "headers": ["Column 1", "Column 2", "Column 3"],
        "data": [
          ["Row 1 Col 1", "Row 1 Col 2", "Row 1 Col 3"],
          ["Row 2 Col 1", "Row 2 Col 2", "Row 2 Col 3"]
        ],
        "footnotes": ["Optional footnote 1", "Optional footnote 2"],
        "sectionId": "plasma-pk"
      }
    ]
  }
}
\`\`\`

**FOR UPDATING AN EXISTING TABLE:**
\`\`\`json
{
  "changes": {
    "tables": [
      {
        "id": "table-1",
        "caption": "Updated caption",
        "headers": ["New Header 1", "New Header 2"],
        "data": [["new data", "values"]]
      }
    ]
  }
}
\`\`\`

==============================================================================
CRITICAL FORMATTING RULES
==============================================================================
1. NEVER put tables as markdown text in section content - always use the JSON table format above
2. Tables must have: id, number, caption, headers (array), data (2D array of strings)
3. Each row in "data" must be an array of strings matching the headers length
4. Use "sectionId" to link table to a section (e.g., "plasma-pk", "results")

EXAMPLES:
- "Add a table showing dose levels" → Use "newTables" JSON format
- "Update Table 1 data" → Use "tables" JSON format with existing table id
- "Improve the executive summary" → Use "sections" JSON format

==============================================================================
WRITING RULES
==============================================================================
1. For IV routes: NEVER use "absorbed" - use "distributed", "reached peak"
2. Use MEAN values in narrative (not ranges)
3. Always specify matrix (plasma/tissue)
4. Use Mean (%CV) format for statistics
5. Report t½ only when R² ≥ 0.80

==============================================================================
CURRENT REPORT DETAILS
==============================================================================
Study ID: ${report.studyId}
Title: ${report.reportTitle}
Route: ${report.routeOfAdmin || 'Not specified'}
Species: ${report.species || 'Not specified'}
Dose Level(s): ${report.doseLevel || 'Not specified'}
Analyte(s): ${report.analytes || 'Not specified'}
Status: ${report.status}
${fileContext}${extractedContextStr}
==============================================================================
CURRENT REPORT CONTENT
==============================================================================
${JSON.stringify(content?.sections?.map((s: any) => ({ id: s.id, title: s.title, content: s.content?.slice(0, 500) + (s.content?.length > 500 ? '...' : '') })), null, 2)}

${historyText ? `==============================================================================
PREVIOUS CONVERSATION
==============================================================================
${historyText}
` : ''}
==============================================================================
USER REQUEST
==============================================================================
${message}

==============================================================================
YOUR RESPONSE
==============================================================================
First, provide a brief explanation of what you're doing.
Then, if the user is asking for ANY changes to the report content, you MUST include the JSON block with the exact format shown above.
The JSON block is REQUIRED for changes to be applied - without it, no changes will be saved.`
}

export function generateQCPrompt(report: Report): string {
  return `You are a QC specialist reviewing a BA/PK Memorandum report. Check for these issues:

Report Content:
${JSON.stringify(report.content, null, 2)}

Study Metadata:
- Study ID: ${report.studyId}
- Species: ${report.species}
- Route: ${report.routeOfAdmin}
- Dose Level(s): ${report.doseLevel}
- Analyte(s): ${report.analytes}

QC CHECKLIST:

1. TERMINOLOGY (CRITICAL)
   - IV routes: NO "absorbed/absorption" - use "distributed", "reached peak"
   - SC/IM/Oral: OK to use "absorbed"
   - Matrix always specified (plasma/tissue)

2. DATA FORMAT
   - Mean (%CV) format for summary stats
   - Mean values in narrative (not ranges)
   - 3 significant figures
   - Animal IDs without decimals

3. SCIENTIFIC ACCURACY
   - t½ reported only when R² ≥ 0.80
   - Dose-normalized params for cross-dose comparisons
   - Consistent parameter names and units

4. STRUCTURE
   - All required sections present
   - Proper heading numbering (1, 1.1, 1.1.1)
   - TOC, LOT, LOF markers present

5. COMPLETENESS
   - Executive Summary has key findings
   - Methods describes all analyses
   - All referenced tables/figures exist

Return a JSON array of issues:
[
  {
    "category": "DATA_ACCURACY|FORMATTING|TERMINOLOGY|CONSISTENCY|CALCULATIONS|COMPLETENESS|REGULATORY",
    "severity": "CRITICAL|MAJOR|MINOR|INFO",
    "section": "section-id or section name",
    "issue": "Description of the issue",
    "suggestion": "How to fix it"
  }
]`
}
