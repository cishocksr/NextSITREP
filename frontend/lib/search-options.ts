import { SEARCH_RADII } from "./search";
import { CATEGORY_LABELS, type ResourceCategory } from "./types";
export const categoryOptions = (
  Object.keys(CATEGORY_LABELS) as ResourceCategory[]
).map((value) => ({ value, label: CATEGORY_LABELS[value] }));
export function searchRadiusOptions(additionalRadius?: number) {
  return Array.from(
    new Set<number>([
      ...SEARCH_RADII,
      ...(additionalRadius === undefined ? [] : [additionalRadius]),
    ]),
  )
    .sort((a, b) => a - b)
    .map((value) => ({ value: String(value), label: `${value} miles` }));
}
export const radiusOptions = searchRadiusOptions();
