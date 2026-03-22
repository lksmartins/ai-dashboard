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
    // Construct the createOAuth2Session URL manually so the redirect_uri sent to
    // GitHub matches /account/sessions/oauth2/callback/... (the registered path).
    // createOAuth2Token uses a different callback path and would require a separate
    // GitHub OAuth app registration.
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
