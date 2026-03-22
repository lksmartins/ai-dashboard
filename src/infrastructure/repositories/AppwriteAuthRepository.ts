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
    // createOAuth2Token is a node-appwrite server-side method that returns
    // a redirect URL string without triggering a browser redirect.
    // Only called from server actions — never from browser context.
    const account = this.account as unknown as {
      createOAuth2Token(provider: string, success: string, failure: string, scopes: string[]): Promise<string>
    }
    return account.createOAuth2Token('github', redirectTo, failureTo, ['repo'])
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
