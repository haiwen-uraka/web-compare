import { useMutation } from '@tanstack/react-query'
import { createComparison } from '../api/comparisons'

export function useCreateComparison() {
  return useMutation({
    mutationFn: ({ _force, ...data }) => createComparison(data, { force: _force }),
  })
}
