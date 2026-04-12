'use client'

import dynamic from 'next/dynamic'
import type { PracticeLanguage } from '@/lib/coding-problems'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[360px] rounded-md border border-border bg-muted animate-pulse" aria-hidden />
  ),
})

type Props = {
  value: string
  onChange: (value: string) => void
  language: PracticeLanguage
  className?: string
}

const MONACO_LANG: Record<PracticeLanguage, string> = {
  python: 'python',
  cpp: 'cpp',
}

export function PracticeCodeEditor({ value, onChange, language, className }: Props) {
  return (
    <div className={className}>
      <MonacoEditor
        height="360px"
        language={MONACO_LANG[language]}
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: language === 'python' ? 4 : 2,
          wordWrap: 'on',
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  )
}
