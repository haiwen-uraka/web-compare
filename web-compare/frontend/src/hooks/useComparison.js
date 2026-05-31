import { useQuery } from '@tanstack/react-query'
import { getComparison } from '../api/comparisons'
import { POLL_INTERVAL_MS } from '../utils/constants'

export function useComparison(taskId) {
  return useQuery({
    queryKey: ['comparison', taskId],
    queryFn: () => getComparison(taskId),
    enabled: !!taskId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return POLL_INTERVAL_MS
      if (data.status === 'pending' || data.status === 'processing') {
        return POLL_INTERVAL_MS
      }
      return false
    },
  })
}
