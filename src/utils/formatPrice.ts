/**
 * Los precios viajan en centavos (enteros) por la API para no arrastrar errores
 * de punto flotante. El formateo a string es responsabilidad de la UI.
 */
export function formatPrice(cents: number): string {
  const dollars = Math.trunc(cents / 100);
  const remainder = Math.abs(cents % 100);
  const grouped = dollars.toLocaleString('en-US');
  return `$${grouped}.${String(remainder).padStart(2, '0')}`;
}
