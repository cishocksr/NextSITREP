import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata(
    "Dashboard",
    "Access your NextSITREP resource search and saved locations.",
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
