export function iniciais(nome: string): string {
  return nome
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const CORES_AVATAR = ['#452C63', '#3FBF8F', '#F0A93B', '#3B82A9', '#8B6DB0', '#1E8E5A']

export function corAvatar(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return CORES_AVATAR[hash % CORES_AVATAR.length]
}
