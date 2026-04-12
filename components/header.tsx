'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

function profileFromSession(session: Session): User {
  const u = session.user
  const meta = u.user_metadata as Record<string, unknown> | undefined
  const fullName =
    (typeof meta?.full_name === 'string' && meta.full_name) ||
    (typeof meta?.name === 'string' && meta.name) ||
    null
  const avatarUrl =
    (typeof meta?.avatar_url === 'string' && meta.avatar_url) || null
  return {
    id: u.id,
    email: u.email ?? '',
    fullName,
    avatarUrl,
  }
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      // Get user data from our database
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (userData) {
        setUser({
          id: userData.id,
          email: userData.email,
          fullName: userData.full_name,
          avatarUrl: userData.avatar_url,
        })
      } else {
        setUser(profileFromSession(session))
      }
      setLoading(false)
    }

    loadUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (_event === 'SIGNED_OUT') {
          setUser(null)
        } else if (session) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (userData) {
            setUser({
              id: userData.id,
              email: userData.email,
              fullName: userData.full_name,
              avatarUrl: userData.avatar_url,
            })
          } else {
            setUser(profileFromSession(session))
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  if (loading) {
    return (
      <header className="fixed top-0 left-64 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-8 z-40">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search topics, sessions..."
              className="pl-10 bg-muted border-transparent focus:border-primary"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-muted rounded-md animate-pulse" />
          <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
        </div>
      </header>
    )
  }

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-8 z-40">
      {/* Search bar */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search topics, sessions..."
            className="pl-10 bg-muted border-transparent focus:border-primary"
          />
        </div>
      </div>

      {/* Right side icons */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
        </Button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName || user.email} />
                  <AvatarFallback>
                    {(user.fullName && user.fullName.charAt(0).toUpperCase()) || (user.email && user.email.charAt(0).toUpperCase()) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.fullName || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" onClick={() => router.push('/login')}>
            Sign In
          </Button>
        )}
      </div>
    </header>
  )
}
