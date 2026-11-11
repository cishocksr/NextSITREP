import LegalPage from "@/components/legal-page";
import { contactEmail } from "@/lib/contact";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata(
    "Privacy Policy",
    "Read how NextSITREP handles account information, saved resources, cookies, and requests about your data.",
    "/privacy",
  );
}

export default function PrivacyPage() {
  const email = contactEmail();
  return (
    <>
      <LegalPage
        title="Privacy Policy"
        lastUpdated="November 10, 2026"
        intro="This Privacy Policy explains what information NextSITREP may collect, how that information is used, and how users can request access, correction, or deletion of their data."
        sections={[
          {
            title: "Information We Collect",
            body: "NextSITREP may collect information you provide directly, along with limited technical and usage information needed to operate and improve the app.",
            items: [
              "Account information such as name, email address, branch of service, and ZIP code",
              "Saved resources, bookmarks, notes, preferences, and app settings",
              "Information submitted through account, search, and saved-resource forms",
              "Technical and application logs, which may include search ZIP codes, categories, keywords, and account or resource details",
            ],
          },
          {
            title: "How We Use Information",
            items: [
              "To provide and improve NextSITREP services",
              "To personalize saved resources and app features",
              "To maintain account security and prevent misuse",
              "To respond to support requests",
              "To analyze app performance and improve usability",
              "To communicate important updates or service notices",
            ],
          },
          {
            title: "Account Data",
            body: "Users may create accounts to save resources, notes, preferences, and personalized content. You are responsible for maintaining accurate account information and protecting your login credentials.",
          },
          {
            title: "Saved Resources and Notes",
            body: "NextSITREP may store saved resources, bookmarks, and notes associated with your account. Users should avoid storing sensitive information such as Social Security numbers, medical records, financial account details, or government identification numbers.",
          },
          {
            title: "Cookies and Local Storage",
            body: "We use cookies for authentication and request security. Browser storage helps coordinate session changes across tabs. Some features may not work correctly if cookies are disabled.",
          },
          {
            title: "Third-Party Services and APIs",
            body: "NextSITREP uses the VA Facilities API for facility information and OpenStreetMap Nominatim for ZIP-based geocoding. Searches send location information to these services. Review provider policies before using their services.",
          },
          {
            title: "Data Retention and Deletion Requests",
            body: "Account and privacy requests require a private contact channel and may require identity verification. The available contact information is shown below. NextSITREP does not currently provide a self-service account export or deletion tool.",
          },
          {
            title: "Security",
            body: "We use reasonable security measures to protect user information. However, no internet-based service can guarantee complete security.",
          },
          {
            title: "Changes to This Policy",
            body: "We may update this Privacy Policy periodically. Continued use of NextSITREP after updates means you accept the revised policy.",
          },
        ]}
      />
      <section
        className="mx-auto max-w-4xl px-6 pb-12"
        aria-labelledby="privacy-contact"
      >
        <h2
          id="privacy-contact"
          className="text-2xl font-semibold text-slate-900"
        >
          Private account and privacy requests
        </h2>
        <p className="mt-3 leading-7 text-slate-700">
          Contact{" "}
          <a href={`mailto:${email}`} className="text-blue-700 underline">
            {email}
          </a>{" "}
          about your account or privacy. Do not include passwords, medical
          records, government identification numbers, or financial account
          details. Do not post private account information in public repository
          issues.
        </p>
      </section>
    </>
  );
}
