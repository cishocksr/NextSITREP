// Public support address confirmed by the owner; deployments may override it.
export function contactEmail(): string {
  const email =
    process.env.NEXTSITREP_CONTACT_EMAIL?.trim() || "help@nextsitrep.org";
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || /[?&#%]/.test(email))
    throw new Error("NEXTSITREP_CONTACT_EMAIL must be a plain email address");
  return email;
}
