import { createContext, useContext } from 'react'

export const PageSearchContext = createContext('')

export function usePageSearch() {
  return useContext(PageSearchContext)
}