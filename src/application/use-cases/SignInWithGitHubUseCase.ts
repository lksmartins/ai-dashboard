import { IAuthRepository } from '@/domain/repositories/IAuthRepository'

export class SignInWithGitHubUseCase {
  constructor(private readonly auth: IAuthRepository) {}

  async execute(redirectTo: string, failureTo: string): Promise<string> {
    return this.auth.signInWithGitHub(redirectTo, failureTo)
  }
}
