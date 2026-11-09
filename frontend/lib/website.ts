/** Accept only absolute HTTP(S) provider links, including legacy saved records. */
export function websiteUrl(value: string | null): string | null {
  if (
    !value ||
    !/^https?:\/\//i.test(value) ||
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
    )
  )
    return null;
  try {
    const url = new URL(value);
    if (!url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
