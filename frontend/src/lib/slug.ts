/**
 * Turns a course title into something that reads well in a URL.
 *
 * Deliberately aggressive: anything that is not a letter, a digit or a hyphen
 * goes. A slug ends up in a link people copy and paste, so it is worth being
 * boring about what may appear in one.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    // strip accents, so "Café" becomes "cafe" rather than losing the word
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
