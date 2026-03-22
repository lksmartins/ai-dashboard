export interface GitHubRepo {
  id: number
  fullName: string
  description: string | null
  private: boolean
  url: string
}

export interface IGitHubService {
  getUserRepos(accessToken: string): Promise<GitHubRepo[]>
}
