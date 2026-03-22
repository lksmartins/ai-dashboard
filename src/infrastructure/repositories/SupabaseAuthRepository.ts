import { SupabaseClient } from '@supabase/supabase-js'
import { IAuthRepository, AuthUser } from '@/domain/repositories/IAuthRepository'

export class SupabaseAuthRepository implements IAuthRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getUser(): Promise<AuthUser | null> {
    const { data: { user } } = await this.client.auth.getUser()
    if (!user) return null
    return { id: user.id, email: user.email }
  }

  async signInWithGitHub(redirectTo: string): Promise<string> {
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo, scopes: 'repo' },
    })

    if (error) throw error
    return data.url!
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut()
    if (error) throw error
  }
}
