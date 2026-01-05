# IND Report Writer

AI-powered Next.js application for generating regulatory-compliant IND (Investigational New Drug) reports.

## Features

- **Multiple Report Types**: PK, Toxicology, CMC, Clinical Pharmacology, Bioanalytical, ADME
- **AI-Powered Generation**: Full automation using Google Gemini API
- **Interactive Refinement**: Chat interface for refining report content
- **Quality Control**: Automated QC agent for checking compliance and accuracy
- **Document Export**: Generate Word (.docx) documents with proper formatting
- **File Upload**: Support for CSV, Excel, PDF, and image files

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **Database**: PostgreSQL (Vercel Postgres)
- **File Storage**: Vercel Blob
- **AI**: Google Gemini API

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Vercel Postgres)
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
cd ind-report-writer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database URL and API keys.

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token |
| `GEMINI_API_KEY` | (Optional) Default Gemini API key |

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set up environment variables in Vercel dashboard or CLI.

4. Create PostgreSQL database:
```bash
vercel postgres create
```

## Usage

1. **Configure API Key**: Go to Settings and enter your Gemini API key
2. **Create Report**: Click "Create New Report" and select report type
3. **Enter Metadata**: Fill in study information
4. **Upload Files**: Upload data files (CSV, Excel, PDF, images)
5. **Generate**: Click "Generate Report" to create AI-powered draft
6. **Refine**: Use the chat interface to refine content
7. **QC Check**: Run quality control to identify issues
8. **Export**: Download as Word document

## Report Types

| Type | Description |
|------|-------------|
| PK Report | Pharmacokinetics analysis with NCA parameters |
| Toxicology | Preclinical safety and toxicity studies |
| CMC | Chemistry, Manufacturing, and Controls |
| Clinical Pharmacology | Human PK/PD studies |
| Bioanalytical | Method validation reports |
| ADME | Absorption, Distribution, Metabolism, Excretion |

## Formatting Standards

The application follows regulatory formatting standards:
- IMRAD format (Introduction, Methods, Results, Discussion)
- Times New Roman font
- Black text color
- Mean (%CV) statistics format
- Route-appropriate terminology (no "absorption" for IV)
- R-squared threshold for half-life reporting

## License

MIT
