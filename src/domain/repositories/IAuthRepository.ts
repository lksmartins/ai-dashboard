export interface AuthUser {
  id: string
  email: string | undefined
}

export interface IAuthRepository {
  getUser(): Promise<AuthUser | null>
  signInWithGitHub(redirectTo: string): Promise<string>
  signOut(): Promise<void>
}
