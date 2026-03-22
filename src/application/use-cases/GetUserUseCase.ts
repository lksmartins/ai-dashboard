import { IAuthRepository, AuthUser } from '@/domain/repositories/IAuthRepository'

export class GetUserUseCase {
  constructor(private readonly auth: IAuthRepository) {}

  async execute(): Promise<AuthUser | null> {
    return this.auth.getUser()
  }
}
