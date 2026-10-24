import { UnprocessableEntityException } from '@nestjs/common'
import { diferencaEmDias, hojeUtc } from './date.util'

/**
 * Valida que um intervalo `[inicio, fim]` pedido por um endpoint de leitura cabe dentro da
 * janela rolante mantida por este backend. Decisão registrada em `README.md` ("Decisões que
 * merecem revisão", item 2): o front passou a limitar os próprios filtros de período a no
 * máximo `janelaDias` — isto aqui é a defesa em profundidade do lado do backend, não o
 * mecanismo principal. Nunca confiar cegamente no client: se algo pedir um intervalo mais
 * largo (front desatualizado, chamada manual, bug), a resposta é um erro claro, não dado
 * incompleto silencioso.
 *
 * Função pura (sem `ConfigService`/DI) de propósito — testável isoladamente, sem subir o
 * módulo Nest inteiro (seção 11 do documento de padrões: utilitário puro sempre com teste
 * unitário dedicado).
 */
export function validarIntervaloDentroDaJanela(
  inicio: Date,
  fim: Date,
  janelaDias: number,
  hoje: Date = hojeUtc(),
): void {
  if (diferencaEmDias(fim, inicio) < 0) {
    throw new UnprocessableEntityException({
      code: 'INTERVALO_INVALIDO',
      message: '"fim" não pode ser anterior a "inicio".',
    })
  }

  const inicioMinimoPermitido = diferencaEmDias(hoje, inicio) > janelaDias

  if (inicioMinimoPermitido) {
    throw new UnprocessableEntityException({
      code: 'FORA_DA_JANELA_DISPONIVEL',
      message: `Este backend mantém apenas os últimos ${janelaDias} dias. Ajuste "inicio" para uma data mais recente.`,
    })
  }
}
