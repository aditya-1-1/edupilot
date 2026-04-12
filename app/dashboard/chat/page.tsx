'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ApiRequestError,
  apiJson,
  getOrCreateChatSessionId,
  resetChatSession,
} from '@/lib/api'
import { Loader2 } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string; at: number }

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<string>('')

  useEffect(() => {
    sessionRef.current = getOrCreateChatSessionId()
  }, [])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setError(null)
    const userMsg: Msg = { role: 'user', content: trimmed, at: Date.now() }
    setMessages((m) => [...m, userMsg])
    setLoading(true)
    try {
      const data = await apiJson<{
        reply: string
        sessionId: string
        hindsightUsed: number
      }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmed,
          sessionId: sessionRef.current || undefined,
        }),
      })
      sessionRef.current = data.sessionId
      if (typeof window !== 'undefined') {
        localStorage.setItem('mentormind_chat_session_id', data.sessionId)
      }
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.reply, at: Date.now() },
      ])
    } catch (e) {
      const msg = e instanceof ApiRequestError ? e.message : 'Request failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = input
    setInput('')
    void sendMessage(t)
  }

  const runPromptAction = (fn: () => string | null) => {
    const raw = fn()
    if (raw) void sendMessage(raw)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">AI Mentor</h1>
        <p className="text-muted-foreground mt-1">Chat with your personalized study assistant</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex-1 bg-card rounded-lg border border-border mb-4 p-6 flex flex-col min-h-[420px]">
        <div className="flex-1 overflow-auto space-y-4 mb-6">
          {messages.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">
              Ask anything about your studies or coding. Memories from past chats personalize replies.
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={`${msg.at}-${i}`}
              className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                  AI
                </div>
              )}
              <div
                className={
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-lg p-4 max-w-[85%] md:max-w-md'
                    : 'bg-muted rounded-lg p-4 max-w-[85%] md:max-w-2xl'
                }
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs opacity-70 mt-2">
                  {new Date(msg.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                  U
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-4 items-center text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking…
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            disabled={loading}
            autoComplete="off"
          />
          <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={loading}>
            Send
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            runPromptAction(() => {
              const topic = window.prompt('Quiz topic?')
              return topic ? `Generate a short quiz outline for: ${topic}` : null
            })
          }
          disabled={loading}
        >
          Generate Quiz
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            runPromptAction(() => {
              const topic = window.prompt('Topic to explain?')
              return topic ? `Explain this clearly and give a small example: ${topic}` : null
            })
          }
          disabled={loading}
        >
          Explain Topic
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            runPromptAction(() => {
              const topic = window.prompt('What should the study plan cover?')
              return topic
                ? `Outline a 1-week study plan for: ${topic}. Keep it concise.`
                : null
            })
          }
          disabled={loading}
        >
          Create Study Plan
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => {
            resetChatSession()
            sessionRef.current = getOrCreateChatSessionId()
            setMessages([])
            setError(null)
          }}
        >
          New chat
        </Button>
      </div>
    </div>
  )
}
