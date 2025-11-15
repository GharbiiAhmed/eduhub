import type React from "react"
import { Geist } from "next/font/google"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
