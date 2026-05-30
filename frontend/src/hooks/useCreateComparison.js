import { useMutation } from '@tanstack/react-query'
import { createComparison } from '../api/comparisons'

export function useCreateComparison() {
  return useMutation({
    mutationFn: createComparison,
  })
}
