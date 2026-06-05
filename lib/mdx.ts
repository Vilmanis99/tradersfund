import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const postsDir = path.join(process.cwd(), 'content/posts')
const pagesDir = path.join(process.cwd(), 'content/pages')

export interface PostMeta {
  title: string
  slug: string
  date: string
  modified: string
  author: string
  excerpt: string
  categories: string[]
  tags: string[]
  type: 'post'
}

export interface PageMeta {
  title: string
  slug: string
  date: string
  description: string
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
