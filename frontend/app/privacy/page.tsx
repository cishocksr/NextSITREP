import LegalPage from "@/components/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="June 7, 2026"
      intro="This Privacy Policy explains what information Veteran FOB may collect, how that information is used, and how users can request access, correction, or deletion of their data."
      sections={[
        {
          title: "Information We Collect",
          body: "Veteran FOB may collect information you provide directly, along with limited technical and usage information needed to operate and improve the app.",
          items: [
            "Account information such as name, email address, username, and profile details",
            "Saved resources, bookmarks, notes, preferences, and app settings",
            "Information submitted through forms, feedback, or support requests",
            "Usage information such as pages visited, interactions, device type, browser type, and approximate location when available",
          ],
        },
        {
          title: "How We Use Information",
          items: [
            "To provide and improve Veteran FOB services",
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
          body: "Veteran FOB may store saved resources, bookmarks, and notes associated with your account. Users should avoid storing sensitive information such as Social Security numbers, medical records, financial account details, or government identification numbers.",
        },
        {
          title: "Cookies and Local Storage",
          body: "We may use cookies, browser storage, or similar technologies to maintain login sessions, store preferences, improve performance, and support analytics. Some features may not work correctly if cookies are disabled.",
        },
        {
          title: "Third-Party Services and APIs",
          body: "Veteran FOB may rely on third-party providers, APIs, analytics tools, mapping services, or authentication services. Information shared with third parties is limited to what is necessary to provide app functionality.",
        },
        {
          title: "Data Retention and Deletion Requests",
          body: "Users may request access, correction, export, or deletion of their account information by contacting us. Deletion requests may require identity verification before processing.",
        },
        {
          title: "Security",
          body: "We use reasonable security measures to protect user information. However, no internet-based service can guarantee complete security.",
        },
        {
          title: "Changes to This Policy",
          body: "We may update this Privacy Policy periodically. Continued use of Veteran FOB after updates means you accept the revised policy.",
        },
      ]}
    />
  );
}
