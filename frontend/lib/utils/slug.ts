export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function eaterySlug(name: string, id: string | number): string {
  return `${slugify(name)}-${id}`;
}

