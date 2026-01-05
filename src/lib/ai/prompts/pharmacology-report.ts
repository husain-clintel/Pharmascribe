import type { Report, ExtractedContext } from '@/types'

export const PHARMACOLOGY_REPORT_SYSTEM_PROMPT = `You are an expert pharmacologist and regulatory writer generating IND (Investigational New Drug) Pharmacology Study Reports.

CRITICAL RULES:
1. Use scientifically accurate terminology
2. Report statistical values with appropriate precision
3. Include p-values and confidence intervals where applicable
4. Reference control groups consistently
5. Use proper units for pharmacodynamic endpoints
6. Distinguish between primary and secondary pharmacodynamics
7. Include safety pharmacology findings (cardiovascular, respiratory, CNS)

REPORT STRUCTURE (Pharmacology Study Report Format):

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
- 2. Materials and Methods
  - 2.1 Test System
  - 2.2 Test Article
  - 2.3 Study Design
  - 2.4 Endpoints and Measurements
  - 2.5 Statistical Analysis
- 3. Results
  - 3.1 Primary Pharmacodynamics
  - 3.2 Secondary Pharmacodynamics (if applicable)
  - 3.3 Safety Pharmacology (if applicable)
- 4. Discussion
- 5. Conclusions

BACK MATTER (Unnumbered):
- References
- Appendices (Individual animal data, supplementary analyses)`

export function generatePharmacologyReportPrompt(report: Report, context: ExtractedContext | null): string {
  return `Generate a Pharmacology Study Report based on the following study information:

STUDY METADATA:
- Study ID: ${report.studyId}
- Report Title: ${report.reportTitle}
- Species: ${report.species || 'Not specified'}
- Route of Administration: ${report.routeOfAdmin || 'Not specified'}
- Dose Level(s): ${report.doseLevel || 'Not specified'}
- Test Facility: ${report.testFacility || 'Not specified'}

AUTHOR INFORMATION:
- Prepared by: ${report.preparedBy || 'Not specified'}
- Reviewed by: ${report.reviewedBy || 'Not specified'}
- Approved by: ${report.approvedBy || 'Not specified'}

${context ? `
EXTRACTED DATA CONTEXT:
${JSON.stringify(context, null, 2)}
` : 'No data files were uploaded.'}

Generate a comprehensive pharmacology report draft. Return the response as a JSON object with this EXACT structure:

{
  "frontMatter": {
    "titlePage": {
      "title": "Pharmacology Study Report",
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
      "content": "Brief overview of study objectives and key pharmacodynamic findings..."
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
      "content": "Background on the therapeutic target, mechanism of action, and study rationale..."
    },
    {
      "id": "objectives",
      "title": "Objectives",
      "level": 2,
      "numbered": true,
      "number": "1.2",
      "content": "The objectives of this study were to evaluate..."
    },
    {
      "id": "methods",
      "title": "Materials and Methods",
      "level": 1,
      "numbered": true,
      "number": "2",
      "content": ""
    },
    {
      "id": "test-system",
      "title": "Test System",
      "level": 2,
      "numbered": true,
      "number": "2.1",
      "content": "Description of the animal model, species, strain, age, weight range..."
    },
    {
      "id": "test-article",
      "title": "Test Article",
      "level": 2,
      "numbered": true,
      "number": "2.2",
      "content": "Description of the test article, formulation, vehicle, and controls..."
    },
    {
      "id": "study-design",
      "title": "Study Design",
      "level": 2,
      "numbered": true,
      "number": "2.3",
      "content": "Description of the study design, dosing regimen, and group assignments..."
    },
    {
      "id": "endpoints",
      "title": "Endpoints and Measurements",
      "level": 2,
      "numbered": true,
      "number": "2.4",
      "content": "Description of pharmacodynamic endpoints and measurement methods..."
    },
    {
      "id": "statistics",
      "title": "Statistical Analysis",
      "level": 2,
      "numbered": true,
      "number": "2.5",
      "content": "Description of statistical methods used for data analysis..."
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
      "id": "primary-pd",
      "title": "Primary Pharmacodynamics",
      "level": 2,
      "numbered": true,
      "number": "3.1",
      "content": "Summary of primary pharmacodynamic results with efficacy data..."
    },
    {
      "id": "secondary-pd",
      "title": "Secondary Pharmacodynamics",
      "level": 2,
      "numbered": true,
      "number": "3.2",
      "content": "Summary of secondary pharmacodynamic findings if applicable..."
    },
    {
      "id": "safety-pharm",
      "title": "Safety Pharmacology",
      "level": 2,
      "numbered": true,
      "number": "3.3",
      "content": "Summary of safety pharmacology findings (CNS, cardiovascular, respiratory)..."
    },
    {
      "id": "discussion",
      "title": "Discussion",
      "level": 1,
      "numbered": true,
      "number": "4",
      "content": "Discussion of findings, mechanism interpretation, and implications..."
    },
    {
      "id": "conclusions",
      "title": "Conclusions",
      "level": 1,
      "numbered": true,
      "number": "5",
      "content": "Key conclusions from the study..."
    },
    {
      "id": "references",
      "title": "References",
      "level": 1,
      "numbered": false,
      "content": "1. Reference 1\\n2. Reference 2"
    },
    {
      "id": "appendices",
      "title": "Appendices",
      "level": 1,
      "numbered": false,
      "content": "Individual animal data tables to be included."
    }
  ],
  "tables": [
    {
      "id": "table-1",
      "number": 1,
      "caption": "Summary of Pharmacodynamic Parameters",
      "headers": ["Parameter", "Units", "Vehicle", "Low Dose", "High Dose"],
      "data": [
        ["Endpoint 1", "units", "Value ± SEM", "Value ± SEM", "Value ± SEM"],
        ["Endpoint 2", "units", "Value ± SEM", "Value ± SEM", "Value ± SEM"]
      ],
      "footnotes": ["Values are presented as Mean ± SEM.", "*p<0.05 vs vehicle"],
      "sectionId": "primary-pd"
    }
  ],
  "figures": [],
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
}`
}
