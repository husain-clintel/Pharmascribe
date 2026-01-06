const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
const fs = require('fs');
const path = require('path');

async function generateProtocol() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: "STUDY PROTOCOL",
              bold: true,
              size: 32
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Single-Dose Pharmacokinetic Study of Theophylline",
              bold: true,
              size: 28
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Following Intravenous Administration in Healthy Adult Subjects",
              size: 24
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),

        // Study Info Table
        new Paragraph({
          children: [
            new TextRun({ text: "Protocol Number: ", bold: true }),
            new TextRun({ text: "THEO-PK-2024-001" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Sponsor: ", bold: true }),
            new TextRun({ text: "PharmaCo Research Inc." })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Test Facility: ", bold: true }),
            new TextRun({ text: "ABC Clinical Research Center" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Test Facility Study Number: ", bold: true }),
            new TextRun({ text: "CRC-2024-0156" })
          ],
          spacing: { after: 400 }
        }),

        // Section 1
        new Paragraph({
          text: "1. INTRODUCTION AND BACKGROUND",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Theophylline is a methylxanthine drug used in the treatment of respiratory diseases such as chronic obstructive pulmonary disease (COPD) and asthma. It acts as a bronchodilator and has been used clinically for decades. Understanding its pharmacokinetic profile is essential for optimal dosing and therapeutic drug monitoring."
            })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "This study is designed to characterize the pharmacokinetic profile of theophylline following a single intravenous dose administration in healthy adult subjects under controlled conditions."
            })
          ],
          spacing: { after: 200 }
        }),

        // Section 2
        new Paragraph({
          text: "2. STUDY OBJECTIVES",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "2.1 Primary Objective",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "To characterize the pharmacokinetic profile of theophylline following a single 320 mg intravenous dose administration in healthy adult subjects."
            })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "2.2 Secondary Objectives",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• To evaluate the safety and tolerability of theophylline" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• To determine key pharmacokinetic parameters including Cmax, Tmax, AUC, t½, CL, and Vd" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• To assess inter-subject variability in pharmacokinetic parameters" })
          ],
          spacing: { after: 200 }
        }),

        // Section 3
        new Paragraph({
          text: "3. STUDY DESIGN",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Study Type: ", bold: true }),
            new TextRun({ text: "Open-label, single-dose pharmacokinetic study" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Number of Subjects: ", bold: true }),
            new TextRun({ text: "12 healthy adult volunteers (6 male, 6 female)" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Age Range: ", bold: true }),
            new TextRun({ text: "18-55 years" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "BMI Range: ", bold: true }),
            new TextRun({ text: "18.5-30.0 kg/m²" })
          ],
          spacing: { after: 200 }
        }),

        // Section 4
        new Paragraph({
          text: "4. TEST ARTICLE",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Drug Name: ", bold: true }),
            new TextRun({ text: "Theophylline" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Formulation: ", bold: true }),
            new TextRun({ text: "Solution for injection (25 mg/mL)" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Dose: ", bold: true }),
            new TextRun({ text: "320 mg (administered as 12.8 mL IV infusion)" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Route of Administration: ", bold: true }),
            new TextRun({ text: "Intravenous (IV)" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Infusion Duration: ", bold: true }),
            new TextRun({ text: "20 minutes" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Dosing Regimen: ", bold: true }),
            new TextRun({ text: "Single dose on Day 1" })
          ],
          spacing: { after: 200 }
        }),

        // Section 5
        new Paragraph({
          text: "5. SAMPLE COLLECTION",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Blood samples (4 mL) for pharmacokinetic analysis will be collected into EDTA tubes at the following timepoints:"
            })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• Pre-dose (0 h)" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• 0.25, 0.5, 1, 2, 4, 8, 12, and 24 hours post-dose" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Total blood volume: ", bold: true }),
            new TextRun({ text: "36 mL per subject" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Matrix: ", bold: true }),
            new TextRun({ text: "Plasma" })
          ],
          spacing: { after: 200 }
        }),

        // Section 6
        new Paragraph({
          text: "6. BIOANALYTICAL METHODS",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Plasma theophylline concentrations will be determined using a validated LC-MS/MS method."
            })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Analyte: ", bold: true }),
            new TextRun({ text: "Theophylline" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Matrix: ", bold: true }),
            new TextRun({ text: "Human plasma (EDTA)" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "LLOQ: ", bold: true }),
            new TextRun({ text: "0.1 mg/L" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Calibration Range: ", bold: true }),
            new TextRun({ text: "0.1 - 20.0 mg/L" })
          ],
          spacing: { after: 200 }
        }),

        // Section 7
        new Paragraph({
          text: "7. PHARMACOKINETIC ANALYSIS",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Non-compartmental analysis (NCA) will be performed using Phoenix WinNonlin (version 8.3). The following pharmacokinetic parameters will be calculated:"
            })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• Cmax - Maximum observed plasma concentration" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• Tmax - Time to maximum plasma concentration" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• AUClast - Area under the concentration-time curve to last measurable concentration" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• AUCinf - Area under the concentration-time curve extrapolated to infinity" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• t½ - Terminal elimination half-life (reported only when R² ≥ 0.80)" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• CL - Total body clearance" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "• Vz - Volume of distribution during terminal phase" })
          ],
          spacing: { after: 200 }
        }),

        // Section 8
        new Paragraph({
          text: "8. STUDY SCHEDULE",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Screening: ", bold: true }),
            new TextRun({ text: "Day -28 to Day -1" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Check-in: ", bold: true }),
            new TextRun({ text: "Day -1 (evening)" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Dosing: ", bold: true }),
            new TextRun({ text: "Day 1 (morning, after overnight fast)" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Discharge: ", bold: true }),
            new TextRun({ text: "Day 2 (after 24-hour sample collection)" })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Follow-up: ", bold: true }),
            new TextRun({ text: "Day 7 ± 2 days (safety follow-up)" })
          ],
          spacing: { after: 400 }
        }),

        // Signatures
        new Paragraph({
          text: "SIGNATURES",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Study Director: ", bold: true }),
            new TextRun({ text: "Jane Smith, PhD" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Principal Investigator: ", bold: true }),
            new TextRun({ text: "John Doe, MD" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Sponsor Representative: ", bold: true }),
            new TextRun({ text: "Sarah Johnson, PharmD" })
          ],
          spacing: { after: 100 }
        }),
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '..', 'public', 'sample-data', 'theophylline_study_protocol.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log('Protocol generated at:', outputPath);
}

generateProtocol().catch(console.error);
