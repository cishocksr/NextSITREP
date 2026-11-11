import type { ResourceCategory } from "./types";

export type ResourceGuide = {
  slug: string;
  title: string;
  description: string;
  introduction: string;
  category?: ResourceCategory;
  searchLabel?: string;
  sections: { title: string; body: string; steps?: string[] }[];
  sources: { label: string; href: string; detail: string }[];
  related: string[];
};

// Editorial review date, not the current request/build time.
export const GUIDE_REVIEWED = "November 10, 2026";
export const resourceGuides: ResourceGuide[] = [
  {
    slug: "healthcare",
    title: "VA Healthcare Facilities and Resources",
    description:
      "Learn where to start with VA healthcare and how to find nearby facilities. Verify services and eligibility with the provider.",
    introduction:
      "Finding a location and enrolling in healthcare are different steps. NextSITREP can help you locate VA healthcare facilities; official VA information explains how to apply and what services may be available.",
    category: "HEALTHCARE",
    searchLabel: "Search VA healthcare facilities",
    sections: [
      {
        title: "Start with official healthcare information",
        body: "Use the VA healthcare website to review enrollment, eligibility, and application options. NextSITREP does not enroll you, determine eligibility, or book appointments.",
        steps: [
          "Review VA’s current healthcare information using the official link below.",
          "Contact the facility to ask whether the service you need is offered at that location.",
          "Ask the provider about enrollment requirements, referrals, appointment availability, and any costs before visiting.",
        ],
      },
      {
        title: "Use location search for the next step",
        body: "With a free NextSITREP account, search by U.S. ZIP code and distance, then save a location and personal notes. Search results are VA facility listings, not confirmation of open appointments or a complete list of local healthcare providers.",
      },
      {
        title: "Looking for counseling?",
        body: "Vet Centers are a separate facility type in NextSITREP. Our counseling guide explains where to find official information and how to check whether a location offers appropriate services.",
      },
    ],
    sources: [
      {
        label: "VA healthcare: eligibility, enrollment, and services",
        href: "https://www.va.gov/health-care/",
        detail:
          "Official starting point for applying for and managing VA healthcare.",
      },
    ],
    related: ["mental-health", "benefits"],
  },
  {
    slug: "benefits",
    title: "VA Benefits Resources and Local Offices",
    description:
      "Find official VA benefits starting points and learn how NextSITREP can help you locate nearby benefits offices.",
    introduction:
      "If you need VA benefits assistance or disability claims information, begin with official guidance and qualified help. NextSITREP locates VA benefits offices; it does not prepare claims, determine eligibility, or represent you.",
    category: "BENEFITS",
    searchLabel: "Search VA benefits offices",
    sections: [
      {
        title: "Choose the benefit you need help with",
        body: "Disability compensation, education benefits, and housing assistance have different requirements and application processes. Use the official links in the relevant guide rather than assuming that a nearby office offers every service.",
      },
      {
        title: "Find help with a disability claim",
        body: "VA publishes guidance on accredited representatives and how to choose help. Check accreditation and ask about services and any fees directly. A NextSITREP office listing is not an endorsement of a representative.",
        steps: [
          "Read the official disability benefits information below.",
          "Use VA’s accredited-representative guidance if you need claims assistance.",
          "Contact an office or representative to confirm what help is available and what information to bring.",
        ],
      },
      {
        title: "What the category filters mean",
        body: "Education, housing, and financial-assistance searches currently locate VA benefits offices. Those labels do not mean that a listing is a school, shelter, lender, grant program, or source of available funding.",
      },
    ],
    sources: [
      {
        label: "VA disability compensation",
        href: "https://www.va.gov/disability/",
        detail: "Official application and benefits information.",
      },
      {
        label: "VA-accredited representative guidance",
        href: "https://www.va.gov/resources/va-accredited-representative-faqs/",
        detail:
          "Learn about different kinds of accredited claims assistance and questions to ask before choosing help.",
      },
    ],
    related: ["education", "housing", "financial-assistance"],
  },
  {
    slug: "mental-health",
    title: "Veteran Counseling and Vet Center Resources",
    description:
      "Explore official veteran counseling resources and learn how to find nearby Vet Centers through NextSITREP.",
    introduction:
      "For routine counseling questions, the official Vet Center website is a useful starting point. NextSITREP can help locate Vet Centers but is not a counseling service or a complete mental health provider directory.",
    category: "VET_CENTER",
    searchLabel: "Search nearby Vet Centers",
    sections: [
      {
        title: "Check the services at a specific location",
        body: "Read the official Vet Center information, then contact a location about its services, eligibility, appointment process, and availability. A nearby listing does not confirm that a particular service or appointment is available.",
      },
      {
        title: "Prepare for a first conversation",
        body: "Ask the provider how to get started and whether another VA healthcare service would be more appropriate. Avoid putting medical records or other sensitive information into saved resource notes.",
        steps: [
          "Review the official Vet Center information below.",
          "Contact a location to ask about the support you are looking for.",
          "Confirm where, when, and how the provider can help before traveling.",
        ],
      },
      {
        title: "Understand the directory’s limits",
        body: "NextSITREP does not assess symptoms, recommend treatment, or verify individual clinicians. It does not maintain a directory of peer groups or confirm that a Vet Center offers a particular peer-support activity. Use official provider guidance for your situation.",
      },
    ],
    sources: [
      {
        label: "Official Vet Center information and locations",
        href: "https://www.vetcenter.va.gov/",
        detail:
          "Review VA’s information about Vet Centers and how to contact them.",
      },
    ],
    related: ["healthcare", "benefits"],
  },
  {
    slug: "housing",
    title: "Veteran Housing Assistance Resources",
    description:
      "Find official starting points for veteran housing support, including homelessness assistance, and verify help directly with program providers.",
    introduction:
      "Housing assistance can mean help finding shelter, keeping a home, or understanding a VA-backed home loan. These are different needs. NextSITREP’s housing filter locates benefits offices; it does not show available beds or process housing applications.",
    category: "HOUSING",
    searchLabel: "Search benefits offices for housing questions",
    sections: [
      {
        title: "If you are homeless or at risk of losing housing",
        body: "Use the official VA Homeless Programs resource below to find current ways to request help. Contact the program directly about your location and circumstances. NextSITREP cannot confirm shelter capacity, reserve a bed, or guarantee housing placement.",
      },
      {
        title: "If you need home-loan or other housing information",
        body: "The VA housing assistance site explains official benefit options and application pathways. Read the specific program requirements before applying; finding a benefits office is not confirmation of loan eligibility or financial approval.",
      },
      {
        title: "Questions to ask a program",
        body: "Availability and geographic service areas differ. Ask the provider for current details.",
        steps: [
          "Does the program serve your current location?",
          "What eligibility requirements and documents apply?",
          "How do you request help, and what happens after that request?",
          "Are there costs, waiting lists, or other providers to contact?",
        ],
      },
    ],
    sources: [
      {
        label: "VA housing assistance",
        href: "https://www.va.gov/housing-assistance/",
        detail:
          "Official housing benefit information and application starting points.",
      },
      {
        label: "VA Homeless Programs",
        href: "https://department.va.gov/homeless/",
        detail:
          "Official pathways for veterans who are homeless or at risk of homelessness.",
      },
    ],
    related: ["financial-assistance", "benefits"],
  },
  {
    slug: "financial-assistance",
    title: "Veteran Financial Assistance Resources",
    description:
      "Find official starting points for veteran financial support and understand why eligibility and available funding must be checked directly.",
    introduction:
      "Financial help depends on the particular bill, benefit, or program. NextSITREP does not issue money, approve grants, or maintain a list of emergency funds. Its financial-assistance filter currently locates VA benefits offices.",
    category: "FINANCIAL_ASSISTANCE",
    searchLabel: "Search benefits offices for financial questions",
    sections: [
      {
        title: "Identify the kind of help you need",
        body: "For questions about disability compensation, start with VA’s disability information. For a VA healthcare copay bill, read VA’s financial-hardship guidance. Copay assistance is a specific pathway and should not be confused with a general cash grant.",
      },
      {
        title: "If housing is the immediate concern",
        body: "Use the housing guide’s official homelessness and housing links. A benefits-office search does not confirm access to rent assistance, emergency housing, or available funding.",
      },
      {
        title: "Check program terms before sharing information",
        body: "Use an official program website and confirm the organization you are contacting. Do not store financial account numbers, government identification numbers, or other sensitive documents in NextSITREP notes.",
        steps: [
          "Explain the specific expense or benefit question to the provider.",
          "Ask about eligibility, service area, application steps, and any deadlines.",
          "Ask whether assistance is currently available; NextSITREP cannot verify funding or promise approval.",
        ],
      },
    ],
    sources: [
      {
        label: "VA financial hardship assistance for healthcare copays",
        href: "https://www.va.gov/health-care/pay-copay-bill/financial-hardship/",
        detail:
          "Official options to discuss when you cannot afford VA healthcare copays; this is not a general grant program.",
      },
      {
        label: "VA disability compensation information",
        href: "https://www.va.gov/disability/",
        detail:
          "Official information about a separate benefit and its application process.",
      },
    ],
    related: ["housing", "benefits", "healthcare"],
  },
  {
    slug: "education",
    title: "VA Education Benefits Resources",
    description:
      "Find official VA education and training information and learn where to start with benefits questions.",
    introduction:
      "For GI Bill and other VA education questions, use official information to understand your options. NextSITREP helps locate benefits offices; its education category is not a directory of schools, training programs, or approved courses.",
    category: "EDUCATION",
    searchLabel: "Search benefits offices for education questions",
    sections: [
      {
        title: "Start with VA education and training",
        body: "Use the official VA education website to review benefit information, eligibility, and application steps. Check the current rules for your circumstances rather than assuming that an account or a local office listing confirms eligibility.",
      },
      {
        title: "Plan your questions before applying",
        body: "A school or training provider and VA may handle different parts of the process. Ask the relevant organization about the program and benefit you intend to use.",
        steps: [
          "Read the official information about the education benefit you are considering.",
          "Confirm the course or training program details directly with the provider.",
          "Ask VA how to apply and what documents or decisions are needed before relying on benefit payments.",
        ],
      },
      {
        title: "Connect education with career planning",
        body: "If you are deciding between training and employment options, also review VA’s careers and employment information. NextSITREP does not provide admissions, course approval, or career counseling.",
      },
    ],
    sources: [
      {
        label: "VA education and training benefits",
        href: "https://www.va.gov/education/",
        detail:
          "Official GI Bill and other education benefit information, including application starting points.",
      },
    ],
    related: ["employment", "benefits"],
  },
  {
    slug: "employment",
    title: "Veteran Employment and Transition Resources",
    description:
      "Explore official starting points for veteran career support and military transition. NextSITREP does not provide job placement.",
    introduction:
      "Career support can involve counseling, education, training, or job-search help. Start with official information about the support that matches your circumstances. NextSITREP does not list jobs or provide job placement.",
    sections: [
      {
        title: "Review official career-support options",
        body: "VA’s careers and employment website provides starting points for career services and related benefit information. Use it to learn which pathway may fit your needs and how to request support.",
      },
      {
        title: "Prepare a practical next step",
        body: "A useful first contact starts with the specific help you are seeking.",
        steps: [
          "Identify whether you need help exploring careers, finding training, or understanding a benefit.",
          "Read the official requirements and application information for that pathway.",
          "Contact the program about eligibility, services, geographic availability, and how to start.",
        ],
      },
      {
        title: "Use the right directory",
        body: "NextSITREP’s current search covers VA healthcare facilities, benefits offices, and Vet Centers. It has no employment filter, job feed, employer verification, or appointment system. Use official career resources directly rather than expecting job listings in a facility search.",
      },
    ],
    sources: [
      {
        label: "VA careers and employment",
        href: "https://www.va.gov/careers-employment/",
        detail:
          "Official starting points for career support, counseling, and related programs.",
      },
    ],
    related: ["education", "benefits"],
  },
];

export const PUBLIC_GUIDE_PATHS = resourceGuides.map(
  ({ slug }) => `/resources/${slug}`,
);
export function findGuide(slug: string) {
  return resourceGuides.find((guide) => guide.slug === slug);
}
