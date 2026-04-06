import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { PLAN_LIMITS } from '../lib/constants'

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(() => {
    try { return localStorage.getItem('ws_active_project') } catch { return null }
  })
  const [members, setMembers] = useState([])
  const [pendingInvitations, setPendingInvitations] = useState([])
  const [loading, setLoading] = useState(true)

  // Persist active project
  useEffect(() => {
    if (activeProjectId) localStorage.setItem('ws_active_project', activeProjectId)
  }, [activeProjectId])

  // Fetch projects (only accepted memberships)
  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]); setPendingInvitations([])
      setActiveProjectId(null)
      try { localStorage.removeItem('ws_active_project') } catch {}
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('project_members')
      .select('id, project_id, role, status, invited_by, joined_at, projects(id, name, description, color, owner_id, created_at)')
      .eq('user_id', user.id)

    const accepted = (data || []).filter(row => row.status === 'accepted')
    const pending = (data || []).filter(row => row.status === 'pending')

    // Fetch inviter/owner profiles for all rows
    const allInviterIds = [...new Set([...accepted, ...pending].map(r => r.invited_by).filter(Boolean))]
    let inviterMap = {}
    if (allInviterIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', allInviterIds)
      inviterMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
    }

    const list = accepted.map(row => ({ ...row.projects, myRole: row.role, joinedAt: row.joined_at, inviter: inviterMap[row.invited_by] || null }))

    // Auto-create a default project if user has none
    if (list.length === 0 && pending.length === 0) {
      const defaultName = 'Mon projet'
      const defaultColor = '#8b5cf6'
      const { data: newProject } = await supabase
        .from('projects')
        .insert({ name: defaultName, description: '', color: defaultColor, owner_id: user.id })
        .select()
        .single()
      if (newProject) {
        await supabase.from('project_members').insert({
          project_id: newProject.id,
          user_id: user.id,
          role: 'owner',
          invited_by: user.id,
          status: 'accepted'
        })
        list.push({ ...newProject, myRole: 'owner' })
      }
    }

    setProjects(list)

    setPendingInvitations(pending.map(row => ({
      id: row.id,
      project_id: row.project_id,
      role: row.role,
      project: row.projects,
      inviter: inviterMap[row.invited_by] || null
    })))

    // Auto-select first project if none active
    setActiveProjectId(prev => {
      if (!prev && list.length > 0) return list[0].id
      if (prev && !list.find(p => p.id === prev) && list.length > 0) return list[0].id
      return prev
    })

    setLoading(false)
  }, [user])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  // Fetch members of active project
  const fetchMembers = useCallback(async () => {
    if (!activeProjectId) { setMembers([]); return }
    const { data, error } = await supabase
      .from('project_members')
      .select('id, role, status, joined_at, user_id, profiles!project_members_user_id_fkey(id, email, display_name, avatar_url)')
      .eq('project_id', activeProjectId)
      .eq('status', 'accepted')
    if (error) console.error('fetchMembers error:', error)
    setMembers((data || []).map(m => ({ ...m, ...m.profiles })))
  }, [activeProjectId])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const activeProject = projects.find(p => p.id === activeProjectId) || null
  const myRole = activeProject?.myRole || null

  const createProject = async (name, description = '', color = '#8b5cf6') => {
    // Vérif limite plan
    const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', user.id).single()
    const userPlan = sub?.plan || 'free'
    const limit = (PLAN_LIMITS[userPlan] || PLAN_LIMITS.free).projects
    if (projects.length >= limit) {
      return { error: { message: `Limite de ${limit} projet${limit > 1 ? 's' : ''} atteinte. Passez en Pro pour en créer plus.` } }
    }
    const { data: project, error } = await supabase
      .from('projects')
      .insert({ name, description, color, owner_id: user.id })
      .select()
      .single()
    if (error) return { error }

    // Add self as owner member
    await supabase.from('project_members').insert({
      project_id: project.id,
      user_id: user.id,
      role: 'owner',
      invited_by: user.id,
      status: 'accepted'
    })

    await fetchProjects()
    setActiveProjectId(project.id)
    return { data: project }
  }

  const updateProject = async (id, updates) => {
    const { error } = await supabase.from('projects').update(updates).eq('id', id)
    if (!error) await fetchProjects()
    return { error }
  }

  const deleteProject = async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) {
      if (activeProjectId === id) {
        setActiveProjectId(null)
        try { localStorage.removeItem('ws_active_project') } catch {}
      }
      await fetchProjects()
    }
    return { error }
  }

  const inviteMember = async (email, role = 'viewer') => {
    if (!activeProjectId) return { error: { message: 'Aucun projet actif' } }

    // Vérif limite plan
    const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', user.id).single()
    const userPlan = sub?.plan || 'free'
    const memberLimit = (PLAN_LIMITS[userPlan] || PLAN_LIMITS.free).members
    if (members.length >= memberLimit) {
      return { error: { message: `Limite de ${memberLimit} membre${memberLimit > 1 ? 's' : ''} atteinte. Passez en Pro/Team pour inviter plus de membres.` } }
    }

    const { data, error } = await supabase.rpc('invite_member_by_email', {
      p_project_id: activeProjectId,
      p_email: email,
      p_role: role
    })

    if (error) return { error }
    if (data?.error) return { error: { message: data.error } }

    await fetchMembers()
    return { data: true }
  }

  const updateMemberRole = async (memberId, newRole) => {
    const { error } = await supabase.from('project_members').update({ role: newRole }).eq('id', memberId)
    if (!error) await fetchMembers()
    return { error }
  }

  const removeMember = async (memberId) => {
    const { error } = await supabase.from('project_members').delete().eq('id', memberId)
    if (!error) await fetchMembers()
    return { error }
  }

  const acceptInvitation = async (membershipId) => {
    const { data, error } = await supabase.rpc('accept_invitation', { p_member_id: membershipId })
    if (error) { console.error('acceptInvitation error:', error); return { error } }
    if (data?.error) return { error: { message: data.error } }
    await fetchProjects()
    await fetchMembers()
    return { data: true }
  }

  const declineInvitation = async (membershipId) => {
    const { data, error } = await supabase.rpc('decline_invitation', { p_member_id: membershipId })
    if (error) { console.error('declineInvitation error:', error); return { error } }
    if (data?.error) return { error: { message: data.error } }
    await fetchProjects()
    return { data: true }
  }

  // ======== ITEM-LEVEL SHARING ========
  const [sharedItems, setSharedItems] = useState([])

  const fetchSharedItems = useCallback(async () => {
    if (!user) { setSharedItems([]); return }
    const { data, error } = await supabase.rpc('get_my_shared_items')
    if (error) { console.error('fetchSharedItems error:', error); return }
    setSharedItems(data || [])
  }, [user])

  useEffect(() => { fetchSharedItems() }, [fetchSharedItems])

  const shareItemWithUser = async (itemType, itemId, email, role = 'viewer') => {
    const { data, error } = await supabase.rpc('share_item_with_user', {
      p_item_type: itemType, p_item_id: itemId, p_email: email, p_role: role
    })
    if (error) return { error }
    if (data?.error) return { error: { message: data.error } }
    return { data: true }
  }

  const unshareItem = async (shareId) => {
    const { data, error } = await supabase.rpc('unshare_item', { p_share_id: shareId })
    if (error) return { error }
    if (data?.error) return { error: { message: data.error } }
    return { data: true }
  }

  const getItemShares = async (itemType, itemId) => {
    const { data, error } = await supabase.rpc('get_item_shares', {
      p_item_type: itemType, p_item_id: itemId
    })
    if (error) { console.error('getItemShares error:', error); return [] }
    return data || []
  }

  // ======== SENT SHARES ========
  const [sentShares, setSentShares] = useState([])

  const fetchSentShares = useCallback(async () => {
    if (!user) { setSentShares([]); return }
    const { data, error } = await supabase.rpc('get_my_sent_shares')
    if (error) { console.error('fetchSentShares error:', error); return }
    setSentShares(data || [])
  }, [user])

  useEffect(() => { fetchSentShares() }, [fetchSentShares])

  const updateShareRole = async (shareId, newRole) => {
    const { data, error } = await supabase.rpc('update_share_role', {
      p_share_id: shareId, p_new_role: newRole
    })
    if (error) return { error }
    if (data?.error) return { error: { message: data.error } }
    setSentShares(prev => prev.map(s => s.id === shareId ? { ...s, role: newRole } : s))
    return { data: true }
  }

  return (
    <ProjectContext.Provider value={{
      projects, activeProject, activeProjectId, setActiveProjectId,
      members, myRole, loading, pendingInvitations,
      createProject, updateProject, deleteProject,
      inviteMember, updateMemberRole, removeMember,
      acceptInvitation, declineInvitation,
      refreshProjects: fetchProjects, refreshMembers: fetchMembers,
      sharedItems, fetchSharedItems, shareItemWithUser, unshareItem, getItemShares,
      sentShares, fetchSentShares, updateShareRole
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export const useProject = () => {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used within ProjectProvider')
  return ctx
}
