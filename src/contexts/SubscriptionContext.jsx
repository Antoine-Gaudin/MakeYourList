import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { PLAN_LIMITS } from '../lib/constants'

const SubscriptionContext = createContext(null)

export function SubscriptionProvider({ children }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchSubscription = useCallback(async () => {
    if (!user) { setSubscription(null); setLoading(false); return }
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()
    setSubscription(data || { plan: 'free', status: 'active' })
    setLoading(false)
  }, [user])

  useEffect(() => { fetchSubscription() }, [fetchSubscription])

  // Realtime sur les changements de subscription (quand Stripe webhook met à jour)
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`subscription-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'subscriptions',
        filter: `user_id=eq.${user.id}`
      }, () => fetchSubscription())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, fetchSubscription])

  const plan = (subscription?.status === 'active' || subscription?.status === 'trialing' || subscription?.status === 'past_due') ? (subscription?.plan || 'free') : 'free'
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free
  const isPro = plan === 'pro'
  const isStudent = plan === 'student'
  const isFree = plan === 'free'

  const canCreateProject = (currentCount) => currentCount < limits.projects
  const canCreateList = (currentCount) => currentCount < limits.lists
  const canCreateKanbanBoard = (currentCount) => currentCount < limits.kanbanBoards
  const canCreateDiagram = (currentCount) => currentCount < limits.diagrams
  const canInviteMember = (currentCount) => currentCount < limits.members

  return (
    <SubscriptionContext.Provider value={{
      subscription, plan, limits, loading,
      isPro, isStudent, isFree,
      canCreateProject, canCreateList, canCreateKanbanBoard, canCreateDiagram, canInviteMember,
      refreshSubscription: fetchSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) return { plan: 'free', limits: {}, isFree: true, canCreateList: () => true, canCreateKanbanBoard: () => true, canUse: () => false }
  return ctx
}
