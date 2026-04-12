'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import Header from '@/components/header'
import { createSupabaseBrowserClient } from '@/lib/supabase'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      const isPublicPath = pathname.startsWith('/dashboard/chat') || pathname.startsWith('/dashboard/practice') || pathname.startsWith('/dashboard/study-plan') || pathname.startsWith('/dashboard/stats')
      if (!session && !isPublicPath) {
        router.replace('/login')
        return
      }
      setReady(true)
    })
  }, [router, pathname])

  if (!ready) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64">
        <Header />
        <main className="flex-1 overflow-auto mt-16 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
