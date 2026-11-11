import type { BranchOfService, ResourceCategory } from "@/lib/types";

export const searchPaths: Array<{
  category: ResourceCategory;
  title: string;
  description: string;
  href: string;
  marker: string;
}> = [
  {
    category: "HEALTHCARE",
    title: "Healthcare and mental health",
    description: "Locate VA medical centers and clinics.",
    href: "/resources?category=HEALTHCARE",
    marker: "HC",
  },
  {
    category: "BENEFITS",
    title: "Benefits and claims",
    description: "Locate VA benefits offices for your questions.",
    href: "/resources?category=BENEFITS",
    marker: "VA",
  },
  {
    category: "HOUSING",
    title: "Housing support",
    description: "Locate benefits offices for housing questions.",
    href: "/resources?category=HOUSING",
    marker: "HS",
  },
  {
    category: "EDUCATION",
    title: "Education and training",
    description: "Locate benefits offices for education questions.",
    href: "/resources?category=EDUCATION",
    marker: "ED",
  },
];

export const quickActions = [
  {
    label: "Broad resource search",
    detail: "Search every category near your profile ZIP.",
    href: "/resources",
  },
  {
    label: "Nearby vet centers",
    detail: "Locate Vet Centers; verify services with the provider.",
    href: "/resources?category=VET_CENTER",
  },
  {
    label: "Saved resources",
    detail: "Open your saved list and notes.",
    href: "/saved",
  },
];

export const branchThemes: Record<
  BranchOfService,
  {
    initials: string;
    motto: string;
    border: string;
    eyebrow: string;
    panel: string;
    crest: string;
    crestRing: string;
    button: string;
  }
> = {
  ARMY: {
    initials: "AR",
    motto: "Soldier-focused support",
    border: "border-emerald-700",
    eyebrow: "text-emerald-700",
    panel: "from-emerald-950 via-stone-900 to-zinc-900",
    crest: "bg-emerald-700 text-white",
    crestRing: "ring-amber-300/70",
    button: "bg-emerald-700 hover:bg-emerald-800",
  },
  NAVY: {
    initials: "NV",
    motto: "Fleet-ready resources",
    border: "border-blue-800",
    eyebrow: "text-blue-700",
    panel: "from-blue-950 via-slate-900 to-zinc-950",
    crest: "bg-blue-800 text-white",
    crestRing: "ring-yellow-300/80",
    button: "bg-blue-700 hover:bg-blue-800",
  },
  AIR_FORCE: {
    initials: "AF",
    motto: "Airman-centered guidance",
    border: "border-sky-700",
    eyebrow: "text-sky-700",
    panel: "from-sky-950 via-slate-900 to-zinc-950",
    crest: "bg-sky-700 text-white",
    crestRing: "ring-slate-200/80",
    button: "bg-sky-700 hover:bg-sky-800",
  },
  MARINE_CORPS: {
    initials: "MC",
    motto: "Marine-focused next steps",
    border: "border-red-800",
    eyebrow: "text-red-700",
    panel: "from-red-950 via-zinc-900 to-stone-950",
    crest: "bg-red-800 text-white",
    crestRing: "ring-yellow-300/80",
    button: "bg-red-700 hover:bg-red-800",
  },
  COAST_GUARD: {
    initials: "CG",
    motto: "Coast Guard resource watch",
    border: "border-orange-600",
    eyebrow: "text-orange-700",
    panel: "from-blue-950 via-slate-900 to-orange-950",
    crest: "bg-orange-700 text-white",
    crestRing: "ring-blue-200/80",
    button: "bg-orange-700 hover:bg-orange-800",
  },
  SPACE_FORCE: {
    initials: "SF",
    motto: "Guardian mission support",
    border: "border-indigo-700",
    eyebrow: "text-indigo-700",
    panel: "from-indigo-950 via-zinc-950 to-cyan-950",
    crest: "bg-indigo-700 text-white",
    crestRing: "ring-cyan-200/80",
    button: "bg-indigo-700 hover:bg-indigo-800",
  },
};

export type BranchTheme = (typeof branchThemes)[BranchOfService];
