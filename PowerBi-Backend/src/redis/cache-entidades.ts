/**
 * Nomes usados nas chaves de cache (`RedisService.chaveComGeracao`) — únicos, compartilhados
 * entre o service de domínio que lê o cache e o `SyncService`, que avança a geração
 * (`bumparGeracao`) depois de cada sincronização bem-sucedida. Ter isso num só lugar evita que
 * os dois lados divirjam silenciosamente (um usando `'venda'`, o outro `'vendas'`) e o cache
 * nunca invalidar de verdade.
 */
export const CACHE_ENTIDADES = {
  VENDA: 'venda',
  ITEM_VENDIDO: 'item-vendido',
  COMISSAO: 'comissao',
  ESTOQUE: 'estoque',
} as const
