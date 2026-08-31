/**
 * Los precios viajan en centavos (enteros) por la API para no arrastrar errores
 * de punto flotante. El formateo a string es responsabilidad de la UI.
 *
 * El signo se separa antes de dividir: con `Math.trunc(-50 / 100)` la parte
 * entera es `-0`, que se imprime como `0`, y el resultado quedaba en `$0.50`
 * —el mismo string que un precio positivo—. Hoy no hay precios negativos en el
 * catálogo, pero un ajuste o un reembolso es exactamente la clase de dato que
 * aparece después y no puede perder el signo en silencio.
 */
export function formatPrice(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const dollars = Math.trunc(absolute / 100).toLocaleString('en-US');
  const remainder = absolute % 100;
  return `${sign}$${dollars}.${String(remainder).padStart(2, '0')}`;
}
