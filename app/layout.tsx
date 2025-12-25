import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
})

export const metadata: Metadata = {
  description:
    'リアルタイムで盛り上がる、新しいビンゴ体験。アプリ不要、URLを共有するだけで誰でも参加できます。',
  title: 'Bingify - すべての画面を、熱狂の会場に。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} antialiased`}>{children}</body>
    </html>
  )
}
