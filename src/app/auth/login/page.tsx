import { Button } from '@/components/ui/button'
import { signInWithGitHub } from '../actions'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold">AI Dashboard</h1>
        <form action={signInWithGitHub}>
          <Button type="submit">Sign in with GitHub</Button>
        </form>
      </div>
    </main>
  )
}
