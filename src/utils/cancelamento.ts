/**
 * Toda vez que `iniciar()` é chamado, cancela o `AbortSignal` da chamada anterior (se ainda
 * estiver em voo) antes de devolver um novo. Usado nas stores de período para que trocar o
 * filtro global não deixe a busca do período antigo terminando de drenar a fila de requisições
 * atrás da do período novo — a chamada mais recente sempre vence.
 */
export function criarSubstituidor(): () => AbortSignal {
  let atual: AbortController | null = null
  return function iniciar(): AbortSignal {
    atual?.abort()
    atual = new AbortController()
    return atual.signal
  }
}

export function eCancelamento(erro: unknown): boolean {
  return erro instanceof DOMException && erro.name === 'AbortError'
}
