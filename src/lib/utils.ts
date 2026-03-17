import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Generates a deterministic invite code from an org slug.
 * Format: "CMS-XXXXXX" where X is an uppercase alphanumeric character.
 * Because org slugs are globally unique, the derived code is also unique.
 *
 * @example
 * generateOrgInviteCode("acme-corp")  // "CMS-ACMECO"
 * generateOrgInviteCode("my-org")     // "CMS-MYORG0"
 */
export const generateOrgInviteCode = (slug: string): string => {
  const sanitized = slug.replace(/-/g, "").toUpperCase();
  const code = sanitized.slice(0, 6).padEnd(6, "0");
  return `CMS-${code}`;
};

export const formatDate = (date: Date | string): string => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
};
