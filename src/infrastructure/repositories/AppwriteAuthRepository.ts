import { IAuthRepository, AuthUser } from '@/domain/repositories/IAuthRepository'

// Structural interface satisfied by both appwrite.Account and node-appwrite.Account
interface AccountService {
  get(): Promise<{ $id: string; email: string }>
  deleteSession(sessionId: string): Promise<object>
  getSession(sessionId: string): Promise<{ providerAccessToken: string }>
}

export class AppwriteAuthRepository implements IAuthRepository {
  constructor(private readonly account: AccountService) {}

  async getUser(): Promise<AuthUser | null> {
    try {
      const user = await this.account.get()
      return { id: user.$id, email: user.email }
    } catch {
      return null
    }
  }

  async signInWithGitHub(redirectTo: string, failureTo: string): Promise<string> {
    // Use createOAuth2Session. After GitHub authenticates, Appwrite sets the session
    // cookie on its own domain and redirects to redirectTo. The /auth/callback page
    // (client-side) then calls account.createJWT() — which works because the browser
    // sends the Appwrite domain cookie — and stores the JWT on the Next.js domain so
    // server components can authenticate via client.setJWT().
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!
    const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!
    const url = new URL(`${endpoint}/account/sessions/oauth2/github`)
    url.searchParams.set('project', project)
    url.searchParams.set('success', redirectTo)
    url.searchParams.set('failure', failureTo)
    url.searchParams.append('scopes[]', 'repo')
    return url.toString()
  }

  async signOut(): Promise<void> {
    try {
      await this.account.deleteSession('current')
    } catch {
      // session may already be gone
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const session = await this.account.getSession('current')
      return session.providerAccessToken ?? null
    } catch {
      return null
    }
  }
}
