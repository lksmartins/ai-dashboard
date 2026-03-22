import { Button } from '@/components/ui/button'
import { signOut } from '@/app/auth/actions'

export default function Header() {
  return (
    <header className="border-b px-6 py-4 flex items-center justify-between">
      <h1 className="text-lg font-semibold">AI Dashboard</h1>
      <form action={signOut}>
        <Button variant="ghost" size="sm" type="submit">
          Sign out
        </Button>
      </form>
    </header>
  )
}
