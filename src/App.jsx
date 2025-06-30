import React, { useState, useRef, useEffect } from 'react'
import { supabase, authService, memoryService, storyService, familyService } from './lib/supabase'

function App() {
  // State management
  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [memories, setMemories] = useState([])
  const [stories, setStories] = useState([])
  const [familyMembers, setFamilyMembers] = useState([])
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [selectedEmotion, setSelectedEmotion] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  
  // Story generation state
  const [selectedMemories, setSelectedMemories] = useState([])
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [generatedStory, setGeneratedStory] = useState('')
  
  // Family management state
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)
  
  // Auth form state
  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  
  // Refs
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
        
        if (currentUser) {
          await loadUserData(currentUser.id)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        await loadUserData(session.user.id)
        setCurrentScreen('dashboard')
      } else {
        setCurrentScreen('welcome')
        setMemories([])
        setStories([])
        setFamilyMembers([])
      }
    })

    return unsubscribe
  }, [])

  // Load user data
  const loadUserData = async (userId) => {
    try {
      const [memoriesData, storiesData, familyData] = await Promise.all([
        memoryService.getMemories(userId),
        storyService.getStories(userId),
        familyService.getFamilyMembers(userId)
      ])
      
      setMemories(memoriesData)
      setStories(storiesData)
      setFamilyMembers(familyData)
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  // Auth handlers
  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    try {
      let result
      if (authMode === 'signup') {
        result = await authService.signUp(email, password)
      } else {
        result = await authService.signIn(email, password)
      }

      if (result.error) {
        setAuthError(result.error.message)
      } else if (result.user) {
        setEmail('')
        setPassword('')
        setCurrentScreen('dashboard')
      }
    } catch (error) {
      setAuthError('An unexpected error occurred')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await authService.signOut()
      setCurrentScreen('welcome')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Recording functionality
  const startRecording = async () => {
    if (!selectedEmotion) {
      alert('Please select an emotion first!')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setAudioBlob(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(timerRef.current)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Simulate transcription (replace with actual service)
  const transcribeAudio = async () => {
    setIsTranscribing(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock transcription based on emotion
    const mockTranscripts = {
      happy: "Today was such a wonderful day! I spent time with my family and we laughed together. The sun was shining and everything felt perfect. These are the moments I want to remember forever.",
      sad: "I've been thinking about grandma a lot lately. She used to tell the most amazing stories about her childhood. I miss her voice and her warm hugs. But I'm grateful for all the memories we made together.",
      grateful: "I'm so thankful for all the blessings in my life. My family, my health, and even the small moments of joy. Sometimes we forget to appreciate what we have until it's gone.",
      excited: "I can't believe it's finally happening! We're going on that family trip we've been planning for months. The kids are so excited, and I can't wait to make new memories together."
    }
    
    const mockTranscript = mockTranscripts[selectedEmotion] || "This is a sample transcription of your recorded memory."
    setTranscript(mockTranscript)
    setIsTranscribing(false)
  }

  const saveMemory = async () => {
    if (!user || !transcript) return

    const memory = {
      user_id: user.id,
      emotion: selectedEmotion,
      transcript: transcript,
      audio_url: null, // Would upload audio file in real implementation
      created_at: new Date().toISOString()
    }

    const savedMemory = await memoryService.saveMemory(memory)
    if (savedMemory) {
      setMemories(prev => [savedMemory, ...prev])
      
      // Reset form
      setSelectedEmotion('')
      setAudioBlob(null)
      setTranscript('')
      setRecordingTime(0)
      
      alert('Memory saved successfully!')
      setCurrentScreen('dashboard')
    }
  }

  // Story generation
  const generateStory = async () => {
    if (selectedMemories.length === 0) {
      alert('Please select at least one memory to create a story!')
      return
    }

    setIsGeneratingStory(true)
    
    // Simulate AI story generation
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const selectedMemoryTexts = selectedMemories.map(id => {
      const memory = memories.find(m => m.id === id)
      return memory ? memory.transcript : ''
    }).filter(Boolean)

    const mockStory = `Once upon a time, in the tapestry of life, there were moments that shone brighter than others. ${selectedMemoryTexts.join(' ')} These memories, woven together, tell a story of love, growth, and the precious bonds that connect us all. Each moment, whether filled with joy or touched by sadness, contributes to the beautiful narrative of our lives. This is your story, preserved forever in the digital memory jar of your heart.`
    
    setGeneratedStory(mockStory)
    setIsGeneratingStory(false)
  }

  const saveStory = async () => {
    if (!user || !generatedStory) return

    const story = {
      user_id: user.id,
      memory_ids: selectedMemories,
      story_text: generatedStory,
      audio_url: null, // Would generate audio narration in real implementation
      created_at: new Date().toISOString()
    }

    const savedStory = await storyService.saveStory(story)
    if (savedStory) {
      setStories(prev => [savedStory, ...prev])
      
      // Reset form
      setSelectedMemories([])
      setGeneratedStory('')
      
      alert('Story saved successfully!')
      setCurrentScreen('dashboard')
    }
  }

  // Family management
  const addFamilyMember = async () => {
    if (!newMemberEmail.trim()) {
      alert('Please enter an email address!')
      return
    }

    setIsAddingMember(true)
    
    const member = await familyService.addFamilyMember(user.id, newMemberEmail.trim())
    if (member) {
      setFamilyMembers(prev => [member, ...prev])
      setNewMemberEmail('')
      alert('Family member added successfully!')
    } else {
      alert('Failed to add family member. They may already be in your circle.')
    }
    
    setIsAddingMember(false)
  }

  const updateMemberAccess = async (memberId, newAccessLevel) => {
    const updatedMember = await familyService.updateFamilyMemberAccess(memberId, newAccessLevel)
    if (updatedMember) {
      setFamilyMembers(prev => 
        prev.map(member => 
          member.id === memberId 
            ? { ...member, access_level: newAccessLevel }
            : member
        )
      )
    }
  }

  // Loading screen
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏺</div>
          <p>Loading Memory Jar...</p>
        </div>
      </div>
    )
  }

  // Welcome Screen
  if (currentScreen === 'welcome') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ 
          maxWidth: '500px', 
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🏺</div>
          <h1 style={{ 
            fontSize: '32px', 
            marginBottom: '10px', 
            color: '#333',
            fontWeight: '700'
          }}>
            Memory Jar
          </h1>
          <p style={{ 
            color: '#666', 
            marginBottom: '20px',
            fontSize: '18px',
            lineHeight: '1.6'
          }}>
            Transform precious moments into lasting digital treasures. Record stories 
            while you can, preserve them forever, and share them with loved ones.
          </p>
          
          <div style={{ 
            fontSize: '14px', 
            color: '#888', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'left'
          }}>
            <strong>How it works:</strong> Choose an emotion → Record your story → AI transcribes instantly → Create stories from your memories → Share with family
          </div>

          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#fff3cd', 
            borderRadius: '8px',
            borderLeft: '4px solid #ffc107'
          }}>
            <strong style={{ color: '#856404' }}>⏰ Don't wait:</strong>
            <span style={{ color: '#856404', marginLeft: '5px' }}>
              The average family has less than 5 minutes of recorded voices. Start preserving today.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
            <button
              onClick={() => setCurrentScreen('auth')}
              style={{
                padding: '15px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)'
              }}
            >
              Get Started
            </button>
            <button
              onClick={() => setCurrentScreen('demo')}
              style={{
                padding: '15px 20px',
                backgroundColor: 'transparent',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#667eea'
                e.target.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent'
                e.target.style.color = '#667eea'
              }}
            >
              View Demo
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Auth Screen
  if (currentScreen === 'auth') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ 
          maxWidth: '400px', 
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🏺</div>
            <h2 style={{ color: '#333', marginBottom: '10px' }}>
              {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              {authMode === 'signin' 
                ? 'Sign in to access your memories' 
                : 'Join thousands preserving family stories'
              }
            </p>
          </div>

          <form onSubmit={handleAuth}>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '15px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '10px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '15px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '10px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              />
            </div>

            {authError && (
              <div style={{ 
                color: '#e74c3c', 
                fontSize: '14px', 
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: '#fdf2f2',
                borderRadius: '8px',
                border: '1px solid #fecaca'
              }}>
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: authLoading ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: authLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                marginBottom: '20px'
              }}
            >
              {authLoading 
                ? 'Please wait...' 
                : (authMode === 'signin' ? 'Sign In' : 'Create Account')
              }
            </button>
          </form>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
                setAuthError('')
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'underline'
              }}
            >
              {authMode === 'signin' 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={() => setCurrentScreen('welcome')}
              style={{
                background: 'none',
                border: 'none',
                color: '#999',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ← Back to welcome
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Demo Screen
  if (currentScreen === 'demo') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '15px',
            padding: '30px',
            marginBottom: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h1 style={{ color: '#333', marginBottom: '10px' }}>🏺 Memory Jar Demo</h1>
              <p style={{ color: '#666' }}>Experience how families preserve their stories</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '10px',
                border: '2px solid #e9ecef'
              }}>
                <h3 style={{ color: '#333', marginBottom: '10px' }}>📱 Record Memories</h3>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Choose an emotion, record your voice, and let AI transcribe your story instantly.
                </p>
              </div>

              <div style={{ 
                padding: '20px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '10px',
                border: '2px solid #e9ecef'
              }}>
                <h3 style={{ color: '#333', marginBottom: '10px' }}>✨ AI Stories</h3>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Transform multiple memories into beautiful, coherent narratives with AI.
                </p>
              </div>

              <div style={{ 
                padding: '20px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '10px',
                border: '2px solid #e9ecef'
              }}>
                <h3 style={{ color: '#333', marginBottom: '10px' }}>👨‍👩‍👧‍👦 Family Sharing</h3>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Invite family members and control what memories they can access.
                </p>
              </div>
            </div>

            <div style={{ 
              marginTop: '30px',
              padding: '20px',
              backgroundColor: '#e8f5e8',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#2d5a2d', marginBottom: '10px' }}>Sample Memory</h3>
              <p style={{ 
                color: '#2d5a2d', 
                fontStyle: 'italic',
                lineHeight: '1.6',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                "Today was such a wonderful day! I spent time with my family and we laughed together. 
                The sun was shining and everything felt perfect. These are the moments I want to remember forever."
              </p>
              <div style={{ 
                marginTop: '15px',
                fontSize: '14px',
                color: '#5a7c5a'
              }}>
                <strong>Emotion:</strong> Happy • <strong>Recorded:</strong> 2 minutes ago
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button
                onClick={() => setCurrentScreen('auth')}
                style={{
                  padding: '15px 30px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginRight: '15px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
              >
                Start Your Memory Jar
              </button>
              <button
                onClick={() => setCurrentScreen('welcome')}
                style={{
                  padding: '15px 30px',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '2px solid #ddd',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f5f5f5'
                  e.target.style.borderColor = '#999'
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent'
                  e.target.style.borderColor = '#ddd'
                }}
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main Dashboard (authenticated users only)
  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>Please sign in to access your Memory Jar</p>
          <button 
            onClick={() => setCurrentScreen('auth')}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: 'white', 
        padding: '15px 20px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '32px', marginRight: '10px' }}>🏺</span>
            <h1 style={{ color: '#333', fontSize: '24px', fontWeight: '700' }}>Memory Jar</h1>
          </div>
          
          <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentScreen('dashboard')}
              style={{
                background: currentScreen === 'dashboard' ? '#e3f2fd' : 'none',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: currentScreen === 'dashboard' ? '#1976d2' : '#666',
                fontWeight: currentScreen === 'dashboard' ? '600' : '400'
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentScreen('record')}
              style={{
                background: currentScreen === 'record' ? '#e8f5e8' : 'none',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: currentScreen === 'record' ? '#2e7d32' : '#666',
                fontWeight: currentScreen === 'record' ? '600' : '400'
              }}
            >
              Record
            </button>
            <button
              onClick={() => setCurrentScreen('stories')}
              style={{
                background: currentScreen === 'stories' ? '#f3e5f5' : 'none',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: currentScreen === 'stories' ? '#7b1fa2' : '#666',
                fontWeight: currentScreen === 'stories' ? '600' : '400'
              }}
            >
              Stories
            </button>
            <button
              onClick={() => setCurrentScreen('family')}
              style={{
                background: currentScreen === 'family' ? '#fff3e0' : 'none',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: currentScreen === 'family' ? '#f57c00' : '#666',
                fontWeight: currentScreen === 'family' ? '600' : '400'
              }}
            >
              Family
            </button>
            
            <div style={{ 
              height: '30px', 
              width: '1px', 
              backgroundColor: '#ddd', 
              margin: '0 10px' 
            }}></div>
            
            <span style={{ color: '#666', fontSize: '14px' }}>
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              style={{
                background: 'none',
                border: '1px solid #ddd',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#666',
                fontSize: '14px'
              }}
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* Dashboard Screen */}
        {currentScreen === 'dashboard' && (
          <div>
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ color: '#333', marginBottom: '10px' }}>Welcome back! 👋</h2>
              <p style={{ color: '#666' }}>Here's what's in your Memory Jar</p>
            </div>

            {/* Stats Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '20px', 
              marginBottom: '40px' 
            }}>
              <div style={{ 
                backgroundColor: 'white', 
                padding: '25px', 
                borderRadius: '15px', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>🎙️</div>
                <h3 style={{ color: '#333', fontSize: '24px', margin: '0 0 5px 0' }}>
                  {memories.length}
                </h3>
                <p style={{ color: '#666', margin: 0 }}>Memories Recorded</p>
              </div>

              <div style={{ 
                backgroundColor: 'white', 
                padding: '25px', 
                borderRadius: '15px', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>📚</div>
                <h3 style={{ color: '#333', fontSize: '24px', margin: '0 0 5px 0' }}>
                  {stories.length}
                </h3>
                <p style={{ color: '#666', margin: 0 }}>Stories Created</p>
              </div>

              <div style={{ 
                backgroundColor: 'white', 
                padding: '25px', 
                borderRadius: '15px', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>👨‍👩‍👧‍👦</div>
                <h3 style={{ color: '#333', fontSize: '24px', margin: '0 0 5px 0' }}>
                  {familyMembers.length}
                </h3>
                <p style={{ color: '#666', margin: 0 }}>Family Members</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '30px', 
              borderRadius: '15px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ color: '#333', marginBottom: '20px' }}>Quick Actions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <button
                  onClick={() => setCurrentScreen('record')}
                  style={{
                    padding: '20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
                >
                  <span>🎙️</span> Record New Memory
                </button>

                <button
                  onClick={() => setCurrentScreen('stories')}
                  style={{
                    padding: '20px',
                    backgroundColor: '#9c27b0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#8e24aa'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#9c27b0'}
                >
                  <span>✨</span> Create AI Story
                </button>

                <button
                  onClick={() => setCurrentScreen('family')}
                  style={{
                    padding: '20px',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f57c00'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#ff9800'}
                >
                  <span>👨‍👩‍👧‍👦</span> Manage Family
                </button>
              </div>
            </div>

            {/* Recent Memories */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '30px', 
              borderRadius: '15px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#333', marginBottom: '20px' }}>Recent Memories</h3>
              
              {memories.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 40px',
                  backgroundColor: '#fafafa',
                  borderRadius: '16px',
                  border: '2px dashed #e0e0e0'
                }}>
                  <div style={{
                    fontSize: '64px',
                    marginBottom: '24px',
                    filter: 'grayscale(20%)',
                    animation: 'float 3s ease-in-out infinite'
                  }}>
                    🏺
                  </div>
                  <h3 style={{ 
                    margin: '0 0 12px 0',
                    color: '#333',
                    fontSize: '24px'
                  }}>
                    Your Memory Jar Awaits
                  </h3>
                  <p style={{ 
                    color: '#666',
                    fontSize: '16px',
                    lineHeight: '1.6',
                    maxWidth: '400px',
                    margin: '0 auto 24px'
                  }}>
                    Every family has stories worth preserving. Start filling your jar with precious moments that will last forever.
                  </p>
                  <button 
                    onClick={() => setCurrentScreen('record')}
                    style={{ 
                      padding: '14px 28px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)'
                      e.target.style.boxShadow = '0 6px 16px rgba(76, 175, 80, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)'
                      e.target.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)'
                    }}
                  >
                    🎙️ Record Your First Memory
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '15px' }}>
                  {memories.slice(0, 3).map((memory) => (
                    <div key={memory.id} style={{ 
                      padding: '20px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '10px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <span style={{ 
                          padding: '4px 12px', 
                          backgroundColor: getEmotionColor(memory.emotion), 
                          color: 'white', 
                          borderRadius: '20px', 
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {getEmotionEmoji(memory.emotion)} {memory.emotion}
                        </span>
                        <span style={{ color: '#999', fontSize: '12px' }}>
                          {new Date(memory.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ 
                        color: '#333', 
                        lineHeight: '1.6', 
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {memory.transcript}
                      </p>
                    </div>
                  ))}
                  
                  {memories.length > 3 && (
                    <div style={{ textAlign: 'center', marginTop: '15px' }}>
                      <button
                        onClick={() => setCurrentScreen('memories')}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: 'transparent',
                          color: '#666',
                          border: '2px solid #ddd',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        View All {memories.length} Memories
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Record Screen */}
        {currentScreen === 'record' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '40px', 
              borderRadius: '20px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <h2 style={{ color: '#333', marginBottom: '10px' }}>Record a Memory 🎙️</h2>
              <p style={{ color: '#666', marginBottom: '30px' }}>
                Choose how you're feeling and share your story
              </p>

              {/* Emotion Selection */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ color: '#333', marginBottom: '15px', fontSize: '18px' }}>How are you feeling?</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {[
                    { emotion: 'happy', emoji: '😊', color: '#4CAF50' },
                    { emotion: 'sad', emoji: '😢', color: '#2196F3' },
                    { emotion: 'grateful', emoji: '🙏', color: '#FF9800' },
                    { emotion: 'excited', emoji: '🎉', color: '#E91E63' }
                  ].map(({ emotion, emoji, color }) => (
                    <button
                      key={emotion}
                      onClick={() => setSelectedEmotion(emotion)}
                      style={{
                        padding: '15px',
                        backgroundColor: selectedEmotion === emotion ? color : '#f5f5f5',
                        color: selectedEmotion === emotion ? 'white' : '#333',
                        border: selectedEmotion === emotion ? `2px solid ${color}` : '2px solid #e0e0e0',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedEmotion !== emotion) {
                          e.target.style.backgroundColor = '#eeeeee'
                          e.target.style.borderColor = '#bdbdbd'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedEmotion !== emotion) {
                          e.target.style.backgroundColor = '#f5f5f5'
                          e.target.style.borderColor = '#e0e0e0'
                        }
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{emoji}</span>
                      {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recording Controls */}
              <div style={{ marginBottom: '30px' }}>
                {!isRecording && !audioBlob && (
                  <button
                    onClick={startRecording}
                    disabled={!selectedEmotion}
                    style={{
                      padding: '20px 40px',
                      backgroundColor: selectedEmotion ? '#f44336' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50px',
                      cursor: selectedEmotion ? 'pointer' : 'not-allowed',
                      fontSize: '18px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                      boxShadow: selectedEmotion ? '0 4px 15px rgba(244, 67, 54, 0.3)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedEmotion) {
                        e.target.style.backgroundColor = '#d32f2f'
                        e.target.style.transform = 'scale(1.05)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedEmotion) {
                        e.target.style.backgroundColor = '#f44336'
                        e.target.style.transform = 'scale(1)'
                      }
                    }}
                  >
                    🎙️ Start Recording
                  </button>
                )}

                {isRecording && (
                  <div>
                    <div style={{ 
                      fontSize: '48px', 
                      marginBottom: '20px',
                      animation: 'pulse 1.5s infinite'
                    }}>
                      🔴
                    </div>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: '600', 
                      color: '#f44336', 
                      marginBottom: '15px' 
                    }}>
                      Recording... {formatTime(recordingTime)}
                    </div>
                    <button
                      onClick={stopRecording}
                      style={{
                        padding: '15px 30px',
                        backgroundColor: '#666',
                        color: 'white',
                        border: 'none',
                        borderRadius: '25px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}
                    >
                      ⏹️ Stop Recording
                    </button>
                  </div>
                )}

                {audioBlob && !transcript && (
                  <div>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
                    <p style={{ color: '#4CAF50', marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
                      Recording Complete! ({formatTime(recordingTime)})
                    </p>
                    <button
                      onClick={transcribeAudio}
                      disabled={isTranscribing}
                      style={{
                        padding: '15px 30px',
                        backgroundColor: isTranscribing ? '#ccc' : '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '25px',
                        cursor: isTranscribing ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: '600',
                        marginRight: '10px'
                      }}
                    >
                      {isTranscribing ? '🔄 Transcribing...' : '📝 Transcribe Audio'}
                    </button>
                    <button
                      onClick={() => {
                        setAudioBlob(null)
                        setRecordingTime(0)
                      }}
                      style={{
                        padding: '15px 30px',
                        backgroundColor: 'transparent',
                        color: '#666',
                        border: '2px solid #ddd',
                        borderRadius: '25px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}
                    >
                      🗑️ Discard
                    </button>
                  </div>
                )}
              </div>

              {/* Transcript Display */}
              {transcript && (
                <div style={{ 
                  marginBottom: '30px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '10px',
                  border: '2px solid #e9ecef',
                  textAlign: 'left'
                }}>
                  <h4 style={{ color: '#333', marginBottom: '15px' }}>📝 Transcript:</h4>
                  <p style={{ 
                    color: '#555', 
                    lineHeight: '1.6', 
                    margin: 0,
                    fontSize: '16px'
                  }}>
                    {transcript}
                  </p>
                  
                  <div style={{ 
                    marginTop: '20px', 
                    display: 'flex', 
                    gap: '10px', 
                    justifyContent: 'center' 
                  }}>
                    <button
                      onClick={saveMemory}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
                    >
                      💾 Save Memory
                    </button>
                    <button
                      onClick={() => {
                        setTranscript('')
                        setAudioBlob(null)
                        setRecordingTime(0)
                      }}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: 'transparent',
                        color: '#666',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}
                    >
                      🔄 Record Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stories Screen */}
        {currentScreen === 'stories' && (
          <div>
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ color: '#333', marginBottom: '10px' }}>AI Stories ✨</h2>
              <p style={{ color: '#666' }}>Transform your memories into beautiful narratives</p>
            </div>

            {/* Story Generation */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '30px', 
              borderRadius: '15px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ color: '#333', marginBottom: '20px' }}>Create New Story</h3>
              
              {memories.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '10px',
                  color: '#666'
                }}>
                  <span style={{ fontSize: '48px', display: 'block', marginBottom: '15px' }}>🎙️</span>
                  <p>You need to record some memories first!</p>
                  <button
                    onClick={() => setCurrentScreen('record')}
                    style={{
                      marginTop: '15px',
                      padding: '12px 24px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  >
                    Record Your First Memory
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    Select memories to weave into a story:
                  </p>
                  
                  <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                    {memories.map((memory) => (
                      <label key={memory.id} style={{ 
                        display: 'flex',
                        alignItems: 'flex-start',
                        padding: '15px',
                        backgroundColor: selectedMemories.includes(memory.id) ? '#e8f5e8' : '#f8f9fa',
                        borderRadius: '8px',
                        border: selectedMemories.includes(memory.id) ? '2px solid #4CAF50' : '2px solid #e9ecef',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedMemories.includes(memory.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMemories(prev => [...prev, memory.id])
                            } else {
                              setSelectedMemories(prev => prev.filter(id => id !== memory.id))
                            }
                          }}
                          style={{ marginRight: '12px', marginTop: '2px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              backgroundColor: getEmotionColor(memory.emotion), 
                              color: 'white', 
                              borderRadius: '12px', 
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              {getEmotionEmoji(memory.emotion)} {memory.emotion}
                            </span>
                            <span style={{ color: '#999', fontSize: '12px' }}>
                              {new Date(memory.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p style={{ 
                            color: '#333', 
                            margin: 0, 
                            fontSize: '14px',
                            lineHeight: '1.5',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {memory.transcript}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={generateStory}
                    disabled={selectedMemories.length === 0 || isGeneratingStory}
                    style={{
                      padding: '15px 30px',
                      backgroundColor: selectedMemories.length === 0 || isGeneratingStory ? '#ccc' : '#9c27b0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: selectedMemories.length === 0 || isGeneratingStory ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {isGeneratingStory ? '✨ Generating Story...' : `✨ Generate Story (${selectedMemories.length} memories)`}
                  </button>
                </div>
              )}

              {/* Generated Story Display */}
              {generatedStory && (
                <div style={{ 
                  marginTop: '30px',
                  padding: '25px',
                  backgroundColor: '#f3e5f5',
                  borderRadius: '10px',
                  border: '2px solid #e1bee7'
                }}>
                  <h4 style={{ color: '#7b1fa2', marginBottom: '15px' }}>✨ Your Generated Story:</h4>
                  <p style={{ 
                    color: '#333', 
                    lineHeight: '1.8', 
                    margin: '0 0 20px 0',
                    fontSize: '16px',
                    fontStyle: 'italic'
                  }}>
                    {generatedStory}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={saveStory}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#7b1fa2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#6a1b9a'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#7b1fa2'}
                    >
                      💾 Save Story
                    </button>
                    <button
                      onClick={() => {
                        setGeneratedStory('')
                        setSelectedMemories([])
                      }}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: 'transparent',
                        color: '#666',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}
                    >
                      🔄 Generate New
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Saved Stories */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '30px', 
              borderRadius: '15px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#333', marginBottom: '20px' }}>Your Stories</h3>
              
              {stories.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 40px',
                  backgroundColor: '#f5f0ff',
                  borderRadius: '16px',
                  border: '2px dashed #e1bee7'
                }}>
                  <div style={{
                    fontSize: '64px',
                    marginBottom: '24px',
                    filter: 'grayscale(10%)',
                    animation: 'float 3s ease-in-out infinite 0.5s'
                  }}>
                    ✨
                  </div>
                  <h3 style={{ 
                    margin: '0 0 12px 0',
                    color: '#333',
                    fontSize: '24px'
                  }}>
                    No Stories Yet
                  </h3>
                  <p style={{ 
                    color: '#666',
                    fontSize: '16px',
                    lineHeight: '1.6',
                    maxWidth: '400px',
                    margin: '0 auto'
                  }}>
                    Your memories are waiting to become beautiful narratives. Create your first AI-generated story from the memories above.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                  {stories.map((story) => (
                    <div key={story.id} style={{ 
                      padding: '25px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '10px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <span style={{ 
                          padding: '4px 12px', 
                          backgroundColor: '#7b1fa2', 
                          color: 'white', 
                          borderRadius: '20px', 
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          ✨ AI Story
                        </span>
                        <span style={{ color: '#999', fontSize: '12px' }}>
                          {new Date(story.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ 
                        color: '#333', 
                        lineHeight: '1.7', 
                        margin: '0 0 15px 0',
                        fontSize: '15px'
                      }}>
                        {story.story_text}
                      </p>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#666',
                        padding: '10px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '6px'
                      }}>
                        <strong>Based on {story.memory_ids.length} memories</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Family Screen */}
        {currentScreen === 'family' && (
          <div>
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ color: '#333', marginBottom: '10px' }}>Family Circle 👨‍👩‍👧‍👦</h2>
              <p style={{ color: '#666' }}>Share your memories with loved ones</p>
            </div>

            {/* Add Family Member */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '30px', 
              borderRadius: '15px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ color: '#333', marginBottom: '20px' }}>Invite Family Member</h3>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block', 
                    color: '#666', 
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="family@example.com"
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      fontSize: '16px',
                      transition: 'border-color 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#ff9800'}
                    onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
                  />
                </div>
                <button
                  onClick={addFamilyMember}
                  disabled={!newMemberEmail.trim() || isAddingMember}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: !newMemberEmail.trim() || isAddingMember ? '#ccc' : '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: !newMemberEmail.trim() || isAddingMember ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isAddingMember ? '⏳ Adding...' : '➕ Add Member'}
                </button>
              </div>
              
              <p style={{ 
                color: '#666', 
                fontSize: '14px', 
                marginTop: '15px',
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                margin: '15px 0 0 0'
              }}>
                💡 <strong>Tip:</strong> Family members will receive an invitation to join your Memory Jar and can access memories based on the permissions you set.
              </p>
            </div>

            {/* Family Members List */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '30px', 
              borderRadius: '15px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#333', marginBottom: '20px' }}>Family Members</h3>
              
              {familyMembers.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 40px',
                  backgroundColor: '#fff8e1',
                  borderRadius: '16px',
                  border: '2px dashed #ffe082'
                }}>
                  <div style={{
                    fontSize: '64px',
                    marginBottom: '24px',
                    filter: 'grayscale(0%)',
                    animation: 'float 3s ease-in-out infinite 1s'
                  }}>
                    🤗
                  </div>
                  <h3 style={{ 
                    margin: '0 0 12px 0',
                    color: '#333',
                    fontSize: '24px'
                  }}>
                    Share the Love
                  </h3>
                  <p style={{ 
                    color: '#666',
                    fontSize: '16px',
                    lineHeight: '1.6',
                    maxWidth: '400px',
                    margin: '0 auto'
                  }}>
                    Memories are better when shared. Invite your loved ones to join your family circle and preserve stories together.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '15px' }}>
                  {familyMembers.map((member) => (
                    <div key={member.id} style={{ 
                      padding: '20px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '10px',
                      border: '1px solid #e9ecef',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ 
                          fontWeight: '600', 
                          color: '#333', 
                          marginBottom: '5px',
                          fontSize: '16px'
                        }}>
                          {member.member_email}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#666'
                        }}>
                          Added {new Date(member.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <select
                          value={member.access_level}
                          onChange={(e) => updateMemberAccess(member.id, e.target.value)}
                          style={{
                            padding: '6px 12px',
                            border: '2px solid #e1e5e9',
                            borderRadius: '6px',
                            fontSize: '14px',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="all">All Memories</option>
                          <option value="selected">Selected Only</option>
                          <option value="none">No Access</option>
                        </select>
                        
                        <span style={{ 
                          padding: '4px 8px', 
                          backgroundColor: getAccessLevelColor(member.access_level), 
                          color: 'white', 
                          borderRadius: '12px', 
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {getAccessLevelEmoji(member.access_level)} {member.access_level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add CSS animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>
    </div>
  )
}

// Helper functions
function getEmotionColor(emotion) {
  const colors = {
    happy: '#4CAF50',
    sad: '#2196F3',
    grateful: '#FF9800',
    excited: '#E91E63'
  }
  return colors[emotion] || '#666'
}

function getEmotionEmoji(emotion) {
  const emojis = {
    happy: '😊',
    sad: '😢',
    grateful: '🙏',
    excited: '🎉'
  }
  return emojis[emotion] || '💭'
}

function getAccessLevelColor(level) {
  const colors = {
    all: '#4CAF50',
    selected: '#FF9800',
    none: '#f44336'
  }
  return colors[level] || '#666'
}

function getAccessLevelEmoji(level) {
  const emojis = {
    all: '🔓',
    selected: '🔐',
    none: '🔒'
  }
  return emojis[level] || '🔒'
}

export default App