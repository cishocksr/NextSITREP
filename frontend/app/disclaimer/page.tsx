import LegalPage from "@/components/legal-page";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata(
    "Disclaimer",
    "Understand NextSITREP’s independent status, informational purpose, and the need to verify details with official providers.",
    "/disclaimer",
  );
}

export default function DisclaimerPage() {
  return (
    <LegalPage
      title="Disclaimer"
      lastUpdated="June 7, 2026"
      intro="NextSITREP is an informational platform designed to help users discover veterans-related resources. It is not a substitute for official guidance or professional advice."
      sections={[
        {
          title: "Not an Official Government Service",
          body: "NextSITREP is not operated by, endorsed by, sponsored by, or officially affiliated with the U.S. Department of Veterans Affairs, the federal government, state governments, or veterans service organizations unless explicitly stated.",
        },
        {
          title: "Not Professional Advice",
          body: "Information provided through NextSITREP is for informational purposes only and should not be considered medical, legal, financial, benefits, counseling, or case management advice.",
        },
        {
          title: "Verify Information Independently",
          body: "Programs, benefits, eligibility requirements, office hours, healthcare availability, housing options, and contact information may change. Users should verify details directly with official providers or agencies.",
        },
        {
          title: "No Guarantee of Availability",
          items: [
            "Eligibility",
            "Acceptance into programs",
            "Availability of services",
            "Funding availability",
            "Appointment availability",
            "Geographic availability",
          ],
        },
        {
          title: "Emergency Warning",
          body: "NextSITREP is not an emergency service. If you are experiencing an emergency, call 911 immediately. For veteran crisis support, call 988 and press 1, text 838255, or contact the Veterans Crisis Line.",
        },
      ]}
    />
  );
}
