import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { env } from '@/lib/env'
import { CODING_PROBLEMS } from '@/lib/coding-problems'

let dbInstance: Database.Database | null = null

function defaultDbPath() {
  const dir = path.join(process.cwd(), 'database', 'data')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return path.join(dir, 'mentormind.db')
}

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance
  const file = env.DATABASE_URL?.replace('file:', '') ?? defaultDbPath()
  dbInstance = new Database(file)
  dbInstance.pragma('journal_mode = WAL')
  dbInstance.pragma('foreign_keys = ON')
  migrate(dbInstance)
  return dbInstance
}

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  definition: string,
) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!rows.some((r) => r.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

function migrate(db: Database.Database) {
  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql')
  const sql = fs.readFileSync(schemaPath, 'utf8')
  db.exec(sql)
  ensureColumn(db, 'coding_mistakes', 'topic', "TEXT DEFAULT 'General'")
  ensureColumn(db, 'coding_mistakes', 'problem_id', 'TEXT')
  // Create index on topic column after it's been ensured to exist
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_mistakes_topic ON coding_mistakes(user_id, topic)')
  } catch (e) {
    // Index may already exist, ignore
  }
  seedCodingProblems(db)
}

function seedCodingProblems(db: Database.Database) {
  try {
    // Check if problems already exist
    const result = db.prepare('SELECT COUNT(*) as cnt FROM coding_problems').get()
    const count = (result as { cnt: number }).cnt
    if (count > 0) return

    // Import at runtime to avoid module resolution issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // const module = require('@/lib/coding-problems')
    // const CODING_PROBLEMS = module.CODING_PROBLEMS

    if (!Array.isArray(CODING_PROBLEMS) || CODING_PROBLEMS.length === 0) {
      return
    }

    const insert = db.prepare(
      `INSERT INTO coding_problems (id, title, description, difficulty, topic, starter_code, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )

    const now = Date.now()
    for (const problem of CODING_PROBLEMS) {
      try {
        insert.run(
          problem.id,
          problem.title,
          problem.description,
          problem.difficulty,
          problem.topics?.[0] || 'General',
          problem.starterPython,
          now,
        )
      } catch (e) {
        // Ignore duplicate key errors
      }
    }
  } catch (e) {
    // Silently fail if seeding doesn't work - tables will be empty but valid
    if (e instanceof Error) {
      console.debug('[db] Failed to seed coding problems:', e.message)
    }
  }
}
