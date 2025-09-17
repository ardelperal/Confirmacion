import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '../styles/print.css'
import { Toaster } from 'react-hot-toast'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Catequesis de Confirmación',
  description: 'Curso de Confirmación para jóvenes de 12-13 años',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Navigation />
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}