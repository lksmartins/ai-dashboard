import { IGitHubService, GitHubRepo } from '@/application/services/IGitHubService'

export class GitHubApiClient implements IGitHubService {
  async getUserRepos(accessToken: string): Promise<GitHubRepo[]> {
    const response = await fetch(
      'https://api.github.com/user/repos?sort=updated&per_page=100',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      }
    )

    if (!response.ok) throw new Error('Failed to fetch GitHub repositories')

    const data = await response.json()
    return data.map((repo: Record<string, unknown>) => ({
      id: repo.id,
      fullName: repo.full_name,
      description: repo.description ?? null,
      private: repo.private,
      url: repo.html_url,
    }))
  }
}
