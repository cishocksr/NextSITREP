import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata(
    "Find Resources",
    "Search nearby VA healthcare facilities, benefits offices, and Vet Centers.",
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
