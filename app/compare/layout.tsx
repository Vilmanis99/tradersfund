import type { ReactNode } from 'react'

// Age gates must run again without a deployment. ISR is request-driven.
export const revalidate = 3600

export default function CompareLayout({ children }: { children: ReactNode }) {
  return children
}
