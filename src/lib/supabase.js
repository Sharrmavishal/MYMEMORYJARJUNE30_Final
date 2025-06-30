import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Database operations for memories
export const memoryService = {
  // Get all memories for current user
  async getMemories(userId) {
    if (!supabase) return []
    
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching memories:', error)
      return []
    }
    
    return data || []
  },

  // Save a new memory
  async saveMemory(memory) {
    if (!supabase) return null
    
    const { data, error } = await supabase
      .from('memories')
      .insert([memory])
      .select()
      .single()
    
    if (error) {
      console.error('Error saving memory:', error)
      return null
    }
    
    return data
  },

  // Update memory with blockchain transaction
  async updateMemoryBlockchain(memoryId, blockchainTx) {
    if (!supabase) return null
    
    const { data, error } = await supabase
      .from('memories')
      .update({ blockchain_tx: blockchainTx })
      .eq('id', memoryId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating memory blockchain:', error)
      return null
    }
    
    return data
  }
}

// Database operations for stories
export const storyService = {
  // Get all stories for current user
  async getStories(userId) {
    if (!supabase) return []
    
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching stories:', error)
      return []
    }
    
    return data || []
  },

  // Save a new story
  async saveStory(story) {
    if (!supabase) return null
    
    const { data, error } = await supabase
      .from('stories')
      .insert([story])
      .select()
      .single()
    
    if (error) {
      console.error('Error saving story:', error)
      return null
    }
    
    return data
  }
}

// Database operations for family members
export const familyService = {
  // Get family members for current user
  async getFamilyMembers(userId) {
    if (!supabase) return []
    
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching family members:', error)
      return []
    }
    
    return data || []
  },

  // Add family member
  async addFamilyMember(userId, memberEmail, accessLevel = 'selected') {
    if (!supabase) return null
    
    const { data, error } = await supabase
      .from('family_members')
      .insert([{
        user_id: userId,
        member_email: memberEmail,
        access_level: accessLevel
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Error adding family member:', error)
      return null
    }
    
    return data
  },

  // Update family member access
  async updateFamilyMemberAccess(memberId, accessLevel) {
    if (!supabase) return null
    
    const { data, error } = await supabase
      .from('family_members')
      .update({ access_level: accessLevel })
      .eq('id', memberId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating family member access:', error)
      return null
    }
    
    return data
  }
}

// Authentication helpers
export const authService = {
  // Sign up with email and password
  async signUp(email, password) {
    if (!supabase) return { user: null, error: 'Supabase not configured' }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    })
    
    return { user: data.user, error }
  },

  // Sign in with email and password
  async signIn(email, password) {
    if (!supabase) return { user: null, error: 'Supabase not configured' }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    return { user: data.user, error }
  },

  // Sign out
  async signOut() {
    if (!supabase) return { error: null }
    
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  async getCurrentUser() {
    if (!supabase) return null
    
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Listen to auth changes
  onAuthStateChange(callback) {
    if (!supabase) return () => {}
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
    return () => subscription.unsubscribe()
  }
}