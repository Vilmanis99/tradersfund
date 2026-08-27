export default function RussianLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="ru" data-locale="ru">
      {children}
    </div>
  )
}
