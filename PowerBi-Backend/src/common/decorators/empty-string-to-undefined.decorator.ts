import { Transform } from 'class-transformer'

/**
 * `""` -> `undefined`, aplicado nos campos opcionais de filtro de query (seção 6 do documento
 * de padrões). Sem isso, um filtro "limpo" no client (ex.: campo de busca esvaziado) vira uma
 * busca literal por string vazia em vez de "sem filtro" — comportamentos bem diferentes.
 */
export function TransformEmptyStringToUndefined() {
  return Transform(({ value }: { value: unknown }) => (value === '' ? undefined : value))
}
