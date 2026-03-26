import { readdir, readFile } from 'fs/promises'
import { join, extname } from 'path'

const AVATARS_DIR = join(process.cwd(), 'public', 'avatars')
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']

/**
 * Resolves an avatar image using a fallback chain:
 * 1. Try entityName (e.g., "Tim_Cook") → look for Tim_Cook*.png
 * 2. If not found, try entityOrg (e.g., "Apple") → look for Apple*.png
 * 3. If still not found → return null (no avatar, no flag in poster)
 */
export async function resolveAvatar(
  entityName: string | null,
  entityOrg: string | null,
): Promise<string | null> {
  const fromName = await findAvatarByName(entityName)
  if (fromName) return fromName

  if (entityOrg && entityOrg !== entityName) {
    const fromOrg = await findAvatarByName(entityOrg)
    if (fromOrg) return fromOrg
  }

  return null
}

async function findAvatarByName(name: string | null): Promise<string | null> {
  if (!name || !name.trim()) return null

  const searchName = name.trim().toLowerCase()

  try {
    const files = await readdir(AVATARS_DIR)

    const matches = files.filter((file) => {
      const ext = extname(file).toLowerCase()
      if (!IMAGE_EXTENSIONS.includes(ext)) return false
      const nameWithoutExt = file.slice(0, -ext.length).toLowerCase()
      return nameWithoutExt.startsWith(searchName) || nameWithoutExt === searchName
    })

    if (matches.length === 0) return null

    const chosen = matches[Math.floor(Math.random() * matches.length)]
    const filePath = join(AVATARS_DIR, chosen)
    const buffer = await readFile(filePath)
    const ext = extname(chosen).toLowerCase()
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'

    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}
