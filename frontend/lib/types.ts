// ─── Auth ────────────────────────────────────────────────────────────────────

export type BranchOfService =
  | "ARMY"
  | "NAVY"
  | "AIR_FORCE"
  | "MARINE_CORPS"
  | "COAST_GUARD"
  | "SPACE_FORCE";

export const BRANCH_LABELS: Record<BranchOfService, string> = {
  ARMY: "Army",
  NAVY: "Navy",
  AIR_FORCE: "Air Force",
  MARINE_CORPS: "Marine Corps",
  COAST_GUARD: "Coast Guard",
  SPACE_FORCE: "Space Force",
};

export interface UserRegistrationRequest {
  firstName: string;
  lastName: string;
  email: string;
  branchOfService: BranchOfService;
  zipCode: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  branchOfService: BranchOfService;
}

// ─── Resources ───────────────────────────────────────────────────────────────

export type ResourceCategory =
  | "HEALTHCARE"
  | "BENEFITS"
  | "EDUCATION"
  | "HOUSING"
  | "FINANCIAL_ASSISTANCE"
  | "VET_CENTER";

export const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  HEALTHCARE: "Healthcare",
  BENEFITS: "Benefits",
  EDUCATION: "Education",
  HOUSING: "Housing",
  FINANCIAL_ASSISTANCE: "Financial Assistance",
  VET_CENTER: "Vet Center",
};

export const CATEGORY_COLORS: Record<ResourceCategory, string> = {
  HEALTHCARE: "bg-red-100 text-red-800",
  BENEFITS: "bg-blue-100 text-blue-800",
  EDUCATION: "bg-green-100 text-green-800",
  HOUSING: "bg-amber-100 text-amber-800",
  FINANCIAL_ASSISTANCE: "bg-purple-100 text-purple-800",
  VET_CENTER: "bg-teal-100 text-teal-800",
};

export interface ResourceSearchResult {
  externalId: string;
  sourceApi: string;
  name: string;
  description: string | null;
  category: ResourceCategory;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  distanceMiles: number | null;
  isSaved: boolean;
}

export interface SaveResourceRequest {
  externalId: string;
  sourceApi: string;
  name: string;
  description: string | null;
  category: ResourceCategory;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  notes: string | null;
}

export interface SavedResourceResponse {
  id: string;
  externalId: string;
  sourceApi: string;
  name: string;
  description: string | null;
  category: ResourceCategory;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  notes: string | null;
  savedAt: string;
  updatedAt: string;
}

export interface UpdateNotesRequest {
  notes: string;
}

// ─── Search Params ────────────────────────────────────────────────────────────

export interface ResourceSearchParams {
  zipCode: string;
  category?: ResourceCategory | "";
  keyword?: string;
  radius?: number;
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  status: number;
  message: string;
}
