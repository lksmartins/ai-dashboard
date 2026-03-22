'use client'

import { useState, useEffect } from 'react'
import { GitHubRepo } from '@/application/services/IGitHubService'
import { GitHubApiClient } from '@/infrastructure/github/GitHubApiClient'

export function useGitHubRepos(accessToken: string | null) {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const fetch = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await new GitHubApiClient().getUserRepos(accessToken)
        setRepos(result)
      } catch {
        setError('Failed to fetch repositories')
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [accessToken])

  return { repos, loading, error }
}
