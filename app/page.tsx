import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Code2, MessageCircle, BarChart3, BookOpen, TrendingUp, Brain } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Welcome to EduPilot</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Your AI-powered learning companion for coding and study planning
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link href="/dashboard/chat">Try AI Mentor</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/practice">Practice Coding</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/study-plan">Create Study Plan</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Sign In for Full Access</Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <MessageCircle className="w-8 h-8 mb-2" />
              <CardTitle>AI Mentor</CardTitle>
              <CardDescription>
                Get instant help with coding questions and study guidance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/dashboard/chat">Start Chat</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Code2 className="w-8 h-8 mb-2" />
              <CardTitle>Coding Practice</CardTitle>
              <CardDescription>
                Practice coding problems with AI feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/practice">Practice Now</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BookOpen className="w-8 h-8 mb-2" />
              <CardTitle>Study Plan</CardTitle>
              <CardDescription>
                Generate personalized study plans for any topic
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/study-plan">Create Plan</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="w-8 h-8 mb-2" />
              <CardTitle>Insights</CardTitle>
              <CardDescription>
                View learning analytics and progress insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/stats">View Insights</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="w-8 h-8 mb-2" />
              <CardTitle>Progress Tracking</CardTitle>
              <CardDescription>
                Monitor your learning progress and streaks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Sign In Required</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Brain className="w-8 h-8 mb-2" />
              <CardTitle>Memory System</CardTitle>
              <CardDescription>
                Review past conversations and learning history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Sign In Required</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
