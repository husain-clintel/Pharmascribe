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
    name: "Pharmascribe",
    url: "https://www.pharmascribeai.com",
    logo: "https://www.pharmascribeai.com/icon-512.png",
    description: "AI-powered regulatory writing assistant for pharmaceutical and biotech companies. Generate FDA-compliant IND reports in minutes.",
    founder: {
      "@type": "Person",
      name: "Husain Attarwala, PhD",
      jobTitle: "Founder & Developer",
      description: "Pharmaceutical industry veteran with 25+ IND submissions and contributions to 7 FDA-approved drugs",
      sameAs: "https://www.linkedin.com/in/husainattarwala/",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: "https://www.pharmascribeai.com",
    },
  }

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Pharmascribe",
    description: "Transform your study data into regulatory-compliant IND reports in minutes with AI-powered document generation. Supports PK, toxicology, CMC, and other report types.",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Regulatory Writing Software",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free demo available",
    },
    featureList: [
      "AI-powered report generation",
      "Automatic metadata extraction from protocols",
      "NCA parameter analysis",
      "Interactive AI chat for refinement",
      "Automated QC checks",
      "Word document export",
    ],
    screenshot: "https://www.pharmascribeai.com/icon-512.png",
  }

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Pharmascribe - AI Regulatory Writing Assistant",
    description: "Transform your study data into regulatory-compliant IND reports in minutes with AI-powered document generation.",
    url: "https://www.pharmascribeai.com",
    isPartOf: {
      "@type": "WebSite",
      name: "Pharmascribe",
      url: "https://www.pharmascribeai.com",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.pharmascribeai.com/reports?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
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
    </>
  )
}
