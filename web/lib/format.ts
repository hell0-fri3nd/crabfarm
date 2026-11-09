export const toInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export const toFirstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
