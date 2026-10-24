import { ApiProperty } from '@nestjs/swagger'
import type { Type } from '@nestjs/common'

export interface Paginado<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/**
 * Fábrica de DTO de resposta paginada — gera uma classe nomeada por entidade (ex.:
 * `PaginadoProdutoResponseDto`) pra o Swagger não colidir schemas de domínios diferentes que
 * usassem o mesmo nome genérico. Reaproveitada por todo endpoint paginado, nunca reimplementada
 * campo a campo em cada domínio.
 */
export function PaginatedResponseDto<T>(ItemDto: Type<T>): Type<Paginado<T>> {
  class PaginatedResponseDtoClass implements Paginado<T> {
    @ApiProperty({ type: [ItemDto] })
    items!: T[]

    @ApiProperty()
    total!: number

    @ApiProperty()
    page!: number

    @ApiProperty()
    pageSize!: number
  }

  Object.defineProperty(PaginatedResponseDtoClass, 'name', { value: `Paginado${ItemDto.name}` })
  return PaginatedResponseDtoClass
}
