import { useQuery } from '@tanstack/react-query'
import { listComparisons } from '../api/comparisons'
import { HISTORY_POLL_INTERVAL_MS } from '../utils/constants'

export function useComparisonHistory() {
  return useQuery({
    queryKey: ['comparisons'],
    queryFn: listComparisons,
    refetchInterval: HISTORY_POLL_INTERVAL_MS,
  })
}
