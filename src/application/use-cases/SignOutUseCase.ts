import { IAuthRepository } from '@/domain/repositories/IAuthRepository'

export class SignOutUseCase {
  constructor(private readonly auth: IAuthRepository) {}

  async execute(): Promise<void> {
    return this.auth.signOut()
  }
}
