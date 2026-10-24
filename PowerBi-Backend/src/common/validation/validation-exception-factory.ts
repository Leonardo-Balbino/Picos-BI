import { BadRequestException, ValidationError } from '@nestjs/common'

/**
 * `exceptionFactory` do `ValidationPipe` global (seção 6 do documento de padrões) — converte
 * os erros do `class-validator` no formato único de erro do projeto, achatando erros de
 * objetos aninhados em `fields` com notação de ponto (ex.: `endereco.cep`).
 */
export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  const fields = achatarErros(errors)
  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Um ou mais campos são inválidos.',
    fields,
  })
}

function achatarErros(errors: ValidationError[], prefixo = ''): Record<string, string> {
  const fields: Record<string, string> = {}

  for (const erro of errors) {
    const caminho = prefixo ? `${prefixo}.${erro.property}` : erro.property

    if (erro.constraints) {
      // Pega só a primeira mensagem de constraint por campo — o client só precisa de uma
      // frase acionável, não da lista inteira de regras que falharam.
      fields[caminho] = Object.values(erro.constraints)[0]
    }

    if (erro.children?.length) {
      Object.assign(fields, achatarErros(erro.children, caminho))
    }
  }

  return fields
}
