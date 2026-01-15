"use client"

interface OrganizationData {
  name: string
  url: string
  logo: string
  description: string
  sameAs?: string[]
}

interface SoftwareApplicationData {
  name: string
  description: string
  applicationCategory: string
  operatingSystem: string
  offers?: {
    price: string
    priceCurrency: string
  }
}

interface WebPageData {
  name: string
  description: string
  url: string
}

export function OrganizationSchema({ data }: { data: OrganizationData }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: data.name,
    url: data.url,
    logo: data.logo,
    description: data.description,
    sameAs: data.sameAs || [],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function SoftwareApplicationSchema({ data }: { data: SoftwareApplicationData }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: data.name,
    description: data.description,
    applicationCategory: data.applicationCategory,
    operatingSystem: data.operatingSystem,
    offers: data.offers ? {
      "@type": "Offer",
      price: data.offers.price,
      priceCurrency: data.offers.priceCurrency,
    } : undefined,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function WebPageSchema({ data }: { data: WebPageData }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.name,
    description: data.description,
    url: data.url,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function FAQSchema({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Combined schema for the homepage
export function HomePageStructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ARIA",
    url: "https://aria.clintel.ai",
    logo: "https://aria.clintel.ai/logo.png",
    description: "AI Regulatory IND Assistant for pharmaceutical and biotech companies. Generate FDA-compliant IND reports in minutes.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "info@clintel.ai",
    },
  }

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ARIA",
    description: "Transform your study data into regulatory-compliant IND reports in minutes with AI-powered document generation. Supports PK, toxicology, CMC, and other report types.",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Regulatory Writing Software",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free demo available - no signup required",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "AI-powered IND report generation",
      "Automatic metadata extraction from protocols",
      "NCA parameter analysis and summary statistics",
      "Interactive AI chat for iterative refinement",
      "Automated QC checks for regulatory compliance",
      "Microsoft Word document export",
      "Support for PK, toxicology, CMC, and more report types",
    ],
    screenshot: "https://aria.clintel.ai/logo.png",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      ratingCount: "1",
      bestRating: "5",
      worstRating: "1",
    },
  }

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "ARIA - AI Regulatory IND Assistant",
    description: "Transform your study data into regulatory-compliant IND reports in minutes with AI-powered document generation.",
    url: "https://aria.clintel.ai",
    isPartOf: {
      "@type": "WebSite",
      name: "ARIA",
      url: "https://aria.clintel.ai",
    },
    mainEntity: {
      "@type": "SoftwareApplication",
      name: "ARIA",
    },
  }

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Generate an IND Report with ARIA",
    description: "Generate FDA-compliant regulatory reports in 4 simple steps using AI",
    totalTime: "PT10M",
    step: [
      {
        "@type": "HowToStep",
        name: "Upload Data",
        text: "Upload your CSV tables with NCA parameters, concentration-time data, and figures",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "AI Generation",
        text: "AI analyzes your data and generates a complete regulatory-compliant report draft",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Refine with Chat",
        text: "Use the AI chat interface to refine and revise sections interactively",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "QC & Export",
        text: "Run automated QC checks and export to Microsoft Word format",
        position: 4,
      },
    ],
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What types of reports can ARIA generate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ARIA can generate PK (Pharmacokinetics) reports, Toxicology reports, CMC (Chemistry, Manufacturing & Controls), Clinical Pharmacology, Bioanalytical Method Validation, ADME studies, and Pharmacology reports.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need to sign up to try ARIA?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No, you can try the full demo with sample theophylline PK study data without signing up. Just click 'Try Demo' on the homepage.",
        },
      },
      {
        "@type": "Question",
        name: "What format does ARIA export reports in?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ARIA exports publication-quality reports in Microsoft Word (.docx) format, following FDA formatting guidelines and IMRAD structure.",
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  )
}
