import LegalPage from "@/components/legal-page";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="June 7, 2026"
      intro="These Terms of Service explain the rules and responsibilities for using VeteransConnect. By using the app, you agree to these terms."
      sections={[
        {
          title: "Eligibility",
          body: "You must be at least 18 years old or have permission from a parent or legal guardian to use VeteransConnect.",
        },
        {
          title: "User Responsibilities",
          items: [
            "Provide accurate account information",
            "Use the platform lawfully and responsibly",
            "Verify important information directly with official providers",
            "Use care when making healthcare, housing, benefits, legal, or financial decisions",
          ],
        },
        {
          title: "Acceptable Use",
          body: "You agree not to misuse VeteransConnect or interfere with the operation, security, or availability of the platform.",
          items: [
            "Do not misrepresent your identity",
            "Do not attempt unauthorized access to systems or accounts",
            "Do not upload malicious code or harmful content",
            "Do not harass, threaten, or abuse others",
            "Do not use the service for unlawful activities",
            "Do not scrape, copy, or misuse platform data at scale without permission",
          ],
        },
        {
          title: "Account Security",
          body: "You are responsible for maintaining the confidentiality of your login credentials and for activity that occurs under your account.",
        },
        {
          title: "Resource Availability and Accuracy",
          body: "Resources, benefits programs, eligibility requirements, office hours, healthcare availability, housing assistance, and contact information may change without notice. VeteransConnect does not guarantee that listed information is complete, accurate, current, or available.",
        },
        {
          title: "No Professional Advice",
          body: "VeteransConnect is for informational purposes only. Use of the app does not create a medical, legal, financial, counseling, case management, or professional relationship.",
        },
        {
          title: "Limitation of Liability",
          body: "To the maximum extent permitted by law, VeteransConnect and its operators are not liable for decisions made using information found through the platform, inaccurate or outdated information, unavailable resources, service interruptions, or indirect damages.",
        },
        {
          title: "Termination",
          body: "We reserve the right to suspend or terminate accounts that violate these terms or misuse the platform.",
        },
        {
          title: "Changes to These Terms",
          body: "We may update these Terms periodically. Continued use of VeteransConnect after updates means you accept the revised terms.",
        },
      ]}
    />
  );
}
