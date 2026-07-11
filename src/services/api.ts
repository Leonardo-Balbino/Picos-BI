/**
 * Lê JSON local com latência simulada. Amanhã troca por fetch('/api/...')
 * sem tocar nos componentes ou nos gráficos.
 */
export async function apiGet<T>(resource: string): Promise<T> {
  await new Promise((r) => setTimeout(r, 250))
  const data = await import(`../mocks/${resource}.json`)
  return structuredClone(data.default) as T
}
