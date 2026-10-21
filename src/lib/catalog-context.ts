export const catalogCategories = ['tax', 'clients', 'future'] as const;
export type CatalogCategory = typeof catalogCategories[number];
export function catalogCategory(search: string): CatalogCategory | null {
  const value = new URLSearchParams(search).get('tools');
  return catalogCategories.includes(value as CatalogCategory) ? value as CatalogCategory : null;
}
export function catalogReturn(search: string) {
  const category = catalogCategory(search);
  return category ? `/?tools=${category}#all-tools` : '/#tools';
}
