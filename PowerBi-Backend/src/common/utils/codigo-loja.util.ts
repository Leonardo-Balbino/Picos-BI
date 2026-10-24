/** Preserva chaves históricas de Inhuma; outras lojas têm namespace próprio. */
export function codigoDaLoja(codigo: string, idLoja?: string): string {
  return !idLoja || idLoja === 'loja-inhuma' ? codigo : idLoja + '_' + codigo
}
