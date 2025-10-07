export function slugify(s: string) {
  return s
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // spaces to -
    .replace(/[^a-z0-9\-]/g, '');
}
