import type Database from 'better-sqlite3'

export type ProfileChip = {
  slug: string
  title: string
  posterImagePath: string | null
  posterImageDataUrl: string
}

export type PublicProfile = {
  handle: string
  displayName: string
  chips: ProfileChip[]
}

export function setHandle(
  db: Database.Database,
  userId: string,
  handle: string,
): 'ok' | 'taken' {
  try {
    db.prepare('UPDATE users SET handle = ? WHERE id = ?').run(handle, userId)
    return 'ok'
  } catch (error) {
    if ((error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') return 'taken'
    throw error
  }
}

export function getProfileByHandle(
  db: Database.Database,
  handle: string,
): PublicProfile | null {
  const user = db.prepare('SELECT id, display_name, banned_at FROM users WHERE handle = ?').get(
    handle,
  ) as { id: string; display_name: string; banned_at: number | null } | undefined
  if (user === undefined || user.banned_at !== null) return null

  const chips = db
    .prepare(
      `SELECT slug, title, poster_image_path, poster_image_data_url
       FROM published_chips
       WHERE owner_user_id = ?
         AND is_public = 1
         AND moderation_status = 'visible'
       ORDER BY updated_at DESC`,
    )
    .all(user.id) as Array<{
    slug: string
    title: string
    poster_image_path: string | null
    poster_image_data_url: string
  }>

  return {
    handle,
    displayName: user.display_name,
    chips: chips.map((chip) => ({
      slug: chip.slug,
      title: chip.title,
      posterImagePath: chip.poster_image_path,
      posterImageDataUrl: chip.poster_image_data_url,
    })),
  }
}
