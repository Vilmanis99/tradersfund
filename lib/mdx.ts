import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const postsDir = path.join(process.cwd(), 'content/posts')
const pagesDir = path.join(process.cwd(), 'content/pages')

export interface PostMeta {
  title: string
  /** Optional search-result title; the visible article H1 remains `title`. */
  seoTitle?: string
  slug: string
  date: string
  modified: string
  author: string
  excerpt: string
  /** Optional search-result description; the visible deck remains `excerpt`. */
  seoDescription?: string
  categories: string[]
  tags: string[]
  type: 'post'
}

export interface PageMeta {
  title: string
  /** Optional search-result title; the visible page H1 remains `title`. */
  seoTitle?: string
  slug: string
  /** Original publication date. */
  date: string
  /** Optional last substantive editorial update. */
  modified?: string
  description: string
  /** Optional search-result description; the visible deck remains `description`. */
  seoDescription?: string
  type: 'page'
}

export interface PostData extends PostMeta {
  content: string
}

export interface PageData extends PageMeta {
  content: string
}

function readMdx(filePath: string) {
  const raw = fs.readFileSync(filePath, 'utf-8')
  return matter(raw)
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(postsDir)) return []
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md') && !f.startsWith('_'))
  const posts = files.map(file => {
    const { data } = readMdx(path.join(postsDir, file))
    return data as PostMeta
  })
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** Full post records for server-only relevance work such as related links. */
export function getAllPostData(): PostData[] {
  if (!fs.existsSync(postsDir)) return []
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md') && !f.startsWith('_'))
  const posts = files.map(file => {
    const { data, content } = readMdx(path.join(postsDir, file))
    return { ...(data as PostMeta), content }
  })
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPostBySlug(slug: string): PostData | null {
  const filePath = path.join(postsDir, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null
  const { data, content } = readMdx(filePath)
  return { ...(data as PostMeta), content }
}

export function getAllPages(): PageMeta[] {
  if (!fs.existsSync(pagesDir)) return []
  const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.md') && !f.startsWith('_'))
  return files.map(file => {
    const { data } = readMdx(path.join(pagesDir, file))
    return data as PageMeta
  })
}

export function getPageBySlug(slug: string): PageData | null {
  const filePath = path.join(pagesDir, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null
  const { data, content } = readMdx(filePath)
  return { ...(data as PageMeta), content }
}

export function getPostsByCategory(category: string): PostMeta[] {
  return getAllPosts().filter(p =>
    p.categories?.some(c => c.toLowerCase() === category.toLowerCase())
  )
}

export function getAllCategories(): string[] {
  const posts = getAllPosts()
  const cats = new Set<string>()
  posts.forEach(p => p.categories?.forEach(c => cats.add(c)))
  return Array.from(cats).sort()
}
