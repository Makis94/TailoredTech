const MAX_SUFFIX_ATTEMPTS = 1000;
const MAX_NAME_LENGTH = 255;

/** Strips any path components and control characters from an uploaded file's original name. */
export function sanitizeFileName(originalName: string): string {
  const basename = originalName.split(/[/\\]/).pop() ?? originalName;
  // eslint-disable-next-line no-control-regex
  const cleaned = basename.replace(/[\x00-\x1f]/g, '').trim();
  const truncated = cleaned.slice(0, MAX_NAME_LENGTH);
  return truncated.length > 0 ? truncated : 'Untitled';
}

/** Splits "report.final.pdf" into { base: "report.final", ext: ".pdf" }. Names with no extension get ext: "". */
export function splitNameExtension(name: string): {
  base: string;
  ext: string;
} {
  const lastDot = name.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === name.length - 1) {
    return { base: name, ext: '' };
  }
  return { base: name.slice(0, lastDot), ext: name.slice(lastDot) };
}

/**
 * Finds a free name by appending " (1)", " (2)", ... before the extension,
 * the same convention Google Drive/Finder/Explorer use. `isTaken` should
 * check uniqueness scoped to wherever the name will live (a folder's siblings).
 */
export async function resolveConflictFreeName(
  desiredName: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  if (!(await isTaken(desiredName))) return desiredName;

  const { base, ext } = splitNameExtension(desiredName);
  for (let attempt = 1; attempt <= MAX_SUFFIX_ATTEMPTS; attempt++) {
    const candidate = `${base} (${attempt})${ext}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error(
    `Could not find a free name for "${desiredName}" after ${MAX_SUFFIX_ATTEMPTS} attempts`,
  );
}
