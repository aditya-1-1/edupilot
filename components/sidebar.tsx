'use client'

import Link from 'next/link'
import Image from "next/image";
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageCircle,
  BookOpen,
  TrendingUp,
  Brain,
  Code2,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const sidebarItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/stats', label: 'Insights', icon: BarChart3 },
  { href: '/dashboard/chat', label: 'AI Mentor', icon: MessageCircle },
  { href: '/dashboard/study-plan', label: 'Study Plan', icon: BookOpen },
  { href: '/dashboard/progress', label: 'Progress', icon: TrendingUp },
  { href: '/dashboard/memory', label: 'Memory', icon: Brain },
  { href: '/dashboard/practice', label: 'Coding Practice', icon: Code2 },
] as const

function navActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href || pathname === `${href}/`
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden">
          <Image
            src="/logo.png"
            alt="MentorMind"
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
        <h1 className="text-lg font-bold text-sidebar-foreground">EduPilot</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <ul className="space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = navActive(pathname, item.href, 'exact' in item ? item.exact : false)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}

    </aside>
  )
}
