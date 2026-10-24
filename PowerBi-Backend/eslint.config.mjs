// Flat config (ESLint 9+). `eslint-config-prettier` desliga toda regra de formatação que o
// Prettier já cobre, pra lint e format nunca discordarem um do outro sobre a mesma linha.
import eslint from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**', 'generated/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },
  {
    // Mappers convertem payload cru (tipado `unknown` de propósito — mais estrito que o `any`
    // que o front usa pro mesmo propósito) com `String(campo ?? '')`. A regra tem razão que
    // isso pode virar "[object Object]" se a API devolver um objeto onde um escalar era
    // esperado — risco aceito conscientemente aqui (mesmo padrão já validado em produção pelo
    // front), não um descuido: um objeto inesperado nesse ponto é, de qualquer forma, uma
    // resposta da API fora do contrato conhecido, e vale mais não travar a sincronização por
    // causa de um campo decorativo do que sofisticar a coerção só pra calar o lint.
    files: ['**/*.mapper.ts'],
    rules: {
      '@typescript-eslint/no-base-to-string': 'off',
    },
  },
  {
    // Mocks de teste (`jest.fn()`, `.mock.calls[...]`) e o corpo de resposta do `supertest`
    // (`resposta.body`) são estruturalmente `any` — mais rígido aqui não pega bug real, só cria
    // ruído nos specs.
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
)
