import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata(
    "Saved Resources",
    "Manage your saved locations and personal resource notes.",
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
