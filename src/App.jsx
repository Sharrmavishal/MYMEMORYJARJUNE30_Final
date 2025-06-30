import React, { useState, useEffect, useRef } from 'react'
import { supabase, authService, memoryService, storyService, familyService } from './lib/supabase'

function App() {
  // State management
  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [memories, setMemories] = useState([])
  const [stories, setStories] = useState([])
  const [familyMembers, setFamilyMembers] = useState([])
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [selectedEmotion, setSelectedEmotion] = useState('')
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  
  // Story generation states
  const [selectedMemories, setSelectedMemories] = useState([])
  const [generatedStory, setGeneratedStory] = useState('')
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  
  // Voice search states
  const [isListening, setIsListening] = useState(false)
  const [voiceSearchQuery, setVoiceSearchQuery] = useState('')
  const [voiceSearchResults, setVoiceSearchResults] = useState([])
  const [voiceSearchActive, setVoiceSearchActive] = useState(false)
  
  // Family management states
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)
  
  // Auth form states
  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  
  // Refs
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recognitionRef = useRef(null)
  const voiceRecognitionRef = useRef(null)

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        await loadUserData(session.user.id)
      } else {
        setUser(null)
        setMemories([])
        setStories([])
        setFamilyMembers([])
      }
      setLoading(false)
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

  // Authentication handlers
  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    try {
      let result
      if (authMode === 'signin') {
        result = await authService.signIn(email, password)
      } else {
        result = await authService.signUp(email, password)
      }

      if (result.error) {
        setAuthError(result.error.message)
      } else if (result.user) {
        setCurrentScreen('memories')
      }
    } catch (error) {
      setAuthError('An unexpected error occurred')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    await authService.signOut()
    setCurrentScreen('welcome')
  }

  // Recording functionality
  const startRecording = async () => {
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
      startSpeechRecognition()
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      stopSpeechRecognition()
    }
  }

  // Speech recognition
  const startSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition()
      recognitionRef.current = recognition
      
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + ' ' + finalTranscript)
        }
      }

      recognition.start()
    }
  }

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  // Voice search functionality
  const startVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition()
      voiceRecognitionRef.current = recognition
      
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
        setVoiceSearchActive(true)
      }

      recognition.onresult = (event) => {
        const query = event.results[0][0].transcript
        setVoiceSearchQuery(query)
        performVoiceSearch(query)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognition.start()
    } else {
      alert('Voice search not supported in this browser')
    }
  }

  const performVoiceSearch = (query) => {
    const results = memories.filter(memory => 
      memory.transcript.toLowerCase().includes(query.toLowerCase()) ||
      memory.emotion.toLowerCase().includes(query.toLowerCase())
    )
    setVoiceSearchResults(results)
  }

  const clearVoiceSearch = () => {
    setVoiceSearchActive(false)
    setVoiceSearchQuery('')
    setVoiceSearchResults([])
  }

  // Save memory
  const saveMemory = async () => {
    if (!selectedEmotion || !transcript || !user) {
      alert('Please select an emotion and record your story')
      return
    }

    setIsTranscribing(true)
    
    try {
      // In a real app, you'd upload the audio file to storage
      const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : null
      
      const memory = {
        user_id: user.id,
        emotion: selectedEmotion,
        transcript: transcript.trim(),
        audio_url: audioUrl
      }

      const savedMemory = await memoryService.saveMemory(memory)
      
      if (savedMemory) {
        setMemories(prev => [savedMemory, ...prev])
        
        // Reset form
        setSelectedEmotion('')
        setTranscript('')
        setAudioBlob(null)
        
        alert('Memory saved successfully!')
        setCurrentScreen('memories')
      } else {
        alert('Failed to save memory')
      }
    } catch (error) {
      console.error('Error saving memory:', error)
      alert('Error saving memory')
    } finally {
      setIsTranscribing(false)
    }
  }

  // Story generation
  const generateStory = async () => {
    if (selectedMemories.length === 0) {
      alert('Please select at least one memory to create a story')
      return
    }

    setIsGeneratingStory(true)
    
    try {
      // Simulate AI story generation
      const memoryTexts = selectedMemories.map(id => {
        const memory = memories.find(m => m.id === id)
        return memory ? memory.transcript : ''
      }).filter(Boolean)

      // Simple story generation (in real app, this would call an AI service)
      const story = `Once upon a time, there were beautiful moments filled with ${selectedMemories.map(id => {
        const memory = memories.find(m => m.id === id)
        return memory ? memory.emotion : ''
      }).join(', ')} emotions. ${memoryTexts.join(' ')} These precious memories remind us of the joy and love that fills our lives, creating a tapestry of experiences that will be treasured forever.`

      setGeneratedStory(story)
      
      // Save story to database
      const storyData = {
        user_id: user.id,
        memory_ids: selectedMemories,
        story_text: story
      }

      const savedStory = await storyService.saveStory(storyData)
      
      if (savedStory) {
        setStories(prev => [savedStory, ...prev])
      }
      
    } catch (error) {
      console.error('Error generating story:', error)
      alert('Error generating story')
    } finally {
      setIsGeneratingStory(false)
    }
  }

  // Family management
  const addFamilyMember = async () => {
    if (!newMemberEmail.trim()) {
      alert('Please enter an email address')
      return
    }

    setIsAddingMember(true)
    
    try {
      const member = await familyService.addFamilyMember(user.id, newMemberEmail.trim())
      
      if (member) {
        setFamilyMembers(prev => [member, ...prev])
        setNewMemberEmail('')
        alert('Family member added successfully!')
      } else {
        alert('Failed to add family member')
      }
    } catch (error) {
      console.error('Error adding family member:', error)
      alert('Error adding family member')
    } finally {
      setIsAddingMember(false)
    }
  }

  const updateMemberAccess = async (memberId, accessLevel) => {
    try {
      const updated = await familyService.updateFamilyMemberAccess(memberId, accessLevel)
      
      if (updated) {
        setFamilyMembers(prev => 
          prev.map(member => 
            member.id === memberId 
              ? { ...member, access_level: accessLevel }
              : member
          )
        )
      }
    } catch (error) {
      console.error('Error updating member access:', error)
      alert('Error updating member access')
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
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '20px',
            animation: 'spin 2s linear infinite'
          }}>
            🏺
          </div>
          <p style={{ fontSize: '18px', color: '#666' }}>Loading Memory Jar...</p>
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
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '60px 40px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            fontSize: '80px', 
            marginBottom: '30px',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>
            🏺
          </div>
          
          <h1 style={{ 
            fontSize: '36px', 
            marginBottom: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            Memory Jar
          </h1>
          
          <p style={{ 
            fontSize: '18px', 
            color: '#666', 
            lineHeight: '1.6',
            marginBottom: '40px'
          }}>
            Transform precious moments into lasting digital treasures. Record stories 
            while you can, preserve them forever, and share them with loved ones.
          </p>
          
          <p style={{ 
            fontSize: '16px', 
            color: '#888', 
            marginBottom: '40px',
            lineHeight: '1.5'
          }} dangerouslySetInnerHTML={{
            __html: "<strong>How it works:</strong> Choose an emotion → Record your story → AI transcribes instantly → Create stories from your memories → Share with family"
          }} />
          
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button
              onClick={() => setCurrentScreen('auth')}
              style={{
                padding: '15px 30px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                transition: 'all 0.3s ease'
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
          </div>
        </div>
        
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
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
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏺</div>
            <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>
              {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p style={{ color: '#666', margin: 0 }}>
              {authMode === 'signin' ? 'Sign in to access your memories' : 'Join Memory Jar today'}
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
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
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
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {authError && (
              <div style={{ 
                color: '#f44336', 
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: '#ffebee',
                borderRadius: '5px',
                fontSize: '14px'
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
                fontWeight: 'bold',
                cursor: authLoading ? 'not-allowed' : 'pointer',
                marginBottom: '20px'
              }}
            >
              {authLoading ? 'Please wait...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
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
              {authMode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
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

  // Main App Layout (for authenticated users)
  if (!user) {
    setCurrentScreen('welcome')
    return null
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        padding: '20px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '32px' }}>🏺</span>
            <h1 style={{ margin: 0, color: '#333', fontSize: '24px' }}>Memory Jar</h1>
          </div>
          
          <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentScreen('memories')}
              style={{
                padding: '10px 20px',
                backgroundColor: currentScreen === 'memories' ? '#2196F3' : 'transparent',
                color: currentScreen === 'memories' ? 'white' : '#666',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Memories
            </button>
            <button
              onClick={() => setCurrentScreen('record')}
              style={{
                padding: '10px 20px',
                backgroundColor: currentScreen === 'record' ? '#4CAF50' : 'transparent',
                color: currentScreen === 'record' ? 'white' : '#666',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Record
            </button>
            <button
              onClick={() => setCurrentScreen('stories')}
              style={{
                padding: '10px 20px',
                backgroundColor: currentScreen === 'stories' ? '#9C27B0' : 'transparent',
                color: currentScreen === 'stories' ? 'white' : '#666',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Stories
            </button>
            <button
              onClick={() => setCurrentScreen('family')}
              style={{
                padding: '10px 20px',
                backgroundColor: currentScreen === 'family' ? '#FF9800' : 'transparent',
                color: currentScreen === 'family' ? 'white' : '#666',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Family
            </button>
            <button
              onClick={handleSignOut}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        
        {/* Memories Screen */}
        {currentScreen === 'memories' && (
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '30px'
            }}>
              <h2 style={{ margin: 0, color: '#333', fontSize: '28px' }}>
                Your Memories ({memories.length})
              </h2>
              
              {/* Voice Search Button */}
              <div style={{ position: 'relative' }}>
                <style>{`
                  @keyframes gentlePulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 6px 20px rgba(33, 150, 243, 0.3); }
                    50% { transform: scale(1.05); box-shadow: 0 8px 25px rgba(33, 150, 243, 0.4); }
                  }
                  @keyframes ripple {
                    0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 0 20px rgba(255, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
                  }
                `}</style>
                <button
                  onClick={startVoiceSearch}
                  disabled={isListening}
                  title="Voice Search"
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    backgroundColor: isListening ? '#ff4444' : '#2196F3',
                    color: 'white',
                    border: 'none',
                    fontSize: '28px',
                    cursor: 'pointer',
                    boxShadow: isListening 
                      ? '0 0 0 0 rgba(255, 68, 68, 0.4)' 
                      : '0 6px 20px rgba(33, 150, 243, 0.3)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    animation: !isListening && !voiceSearchActive ? 'gentlePulse 3s ease-in-out infinite' : 'none'
                  }}
                >
                  🎤
                </button>
                
                {isListening && (
                  <>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '70px',
                      height: '70px',
                      borderRadius: '50%',
                      border: '3px solid #ff4444',
                      animation: 'ripple 1.5s ease-out infinite'
                    }}></div>
                    <div style={{ 
                      textAlign: 'center',
                      padding: '20px',
                      marginTop: '10px'
                    }}>
                      <p style={{ 
                        fontSize: '18px', 
                        color: '#ff4444',
                        fontWeight: '600',
                        margin: '0'
                      }}>
                        Listening...
                      </p>
                      <p style={{ 
                        fontSize: '14px', 
                        color: '#666',
                        margin: '5px 0 0 0'
                      }}>
                        Speak clearly into your microphone
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Voice Search Results */}
            {voiceSearchActive && (
              <div style={{ 
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <h3 style={{ margin: 0, color: '#333' }}>
                    Voice Search: "{voiceSearchQuery}"
                  </h3>
                  <button
                    onClick={clearVoiceSearch}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '20px',
                      cursor: 'pointer',
                      color: '#666'
                    }}
                  >
                    ✕
                  </button>
                </div>
                
                {voiceSearchResults.length > 0 ? (
                  <div>
                    <p style={{ color: '#666', marginBottom: '15px' }}>
                      Found {voiceSearchResults.length} matching memories:
                    </p>
                    {voiceSearchResults.map(memory => (
                      <div key={memory.id} style={{ 
                        padding: '15px',
                        marginTop: '10px',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: '1px solid #e0e0e0',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                      onClick={() => {
                        if (memory.audio_url) {
                          const audio = new Audio(memory.audio_url)
                          audio.play()
                        }
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '10px'
                        }}>
                          <span style={{ 
                            fontSize: '24px',
                            marginRight: '15px'
                          }}>
                            {memory.emotion === 'happy' ? '😊' : 
                             memory.emotion === 'sad' ? '😢' : 
                             memory.emotion === 'grateful' ? '🙏' : '🎉'}
                          </span>
                          <div style={{ flex: 1 }}>
                            <p style={{ 
                              margin: '0 0 8px 0',
                              fontSize: '16px',
                              lineHeight: '1.5',
                              color: '#333'
                            }}>
                              {memory.transcript}
                            </p>
                            <p style={{ 
                              margin: 0,
                              fontSize: '14px',
                              color: '#666'
                            }}>
                              {new Date(memory.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : voiceSearchQuery && (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>
                    No memories found matching "{voiceSearchQuery}"
                  </p>
                )}
              </div>
            )}

            {/* Memories List */}
            {memories.length > 0 ? (
              <div style={{ display: 'grid', gap: '20px' }}>
                {memories.map(memory => (
                  <div key={memory.id} style={{ 
                    backgroundColor: 'white',
                    padding: '25px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '15px'
                    }}>
                      <span style={{ 
                        fontSize: '32px',
                        marginRight: '20px'
                      }}>
                        {memory.emotion === 'happy' ? '😊' : 
                         memory.emotion === 'sad' ? '😢' : 
                         memory.emotion === 'grateful' ? '🙏' : '🎉'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ 
                          margin: '0 0 10px 0',
                          fontSize: '18px',
                          lineHeight: '1.6',
                          color: '#333'
                        }}>
                          {memory.transcript}
                        </p>
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <p style={{ 
                            margin: 0,
                            fontSize: '14px',
                            color: '#666'
                          }}>
                            {new Date(memory.created_at).toLocaleDateString()} • {memory.emotion}
                          </p>
                          {memory.audio_url && (
                            <button
                              onClick={() => {
                                const audio = new Audio(memory.audio_url)
                                audio.play()
                              }}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              🔊 Play
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* Record Screen */}
        {currentScreen === 'record' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '40px', color: '#333', fontSize: '28px' }}>
              Record a Memory
            </h2>

            {/* Emotion Selection */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ marginBottom: '20px', color: '#333' }}>How are you feeling?</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                {[
                  { emotion: 'happy', emoji: '😊', label: 'Happy' },
                  { emotion: 'sad', emoji: '😢', label: 'Sad' },
                  { emotion: 'grateful', emoji: '🙏', label: 'Grateful' },
                  { emotion: 'excited', emoji: '🎉', label: 'Excited' }
                ].map(({ emotion, emoji, label }) => (
                  <button
                    key={emotion}
                    onClick={() => setSelectedEmotion(emotion)}
                    style={{
                      padding: '20px',
                      backgroundColor: selectedEmotion === emotion ? '#e3f2fd' : 'white',
                      border: selectedEmotion === emotion ? '2px solid #2196F3' : '2px solid #e0e0e0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recording Section */}
            <div style={{ 
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              textAlign: 'center',
              marginBottom: '30px'
            }}>
              <div style={{ marginBottom: '30px' }}>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!selectedEmotion}
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    backgroundColor: isRecording ? '#f44336' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    fontSize: '32px',
                    cursor: !selectedEmotion ? 'not-allowed' : 'pointer',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s ease',
                    opacity: !selectedEmotion ? 0.5 : 1
                  }}
                >
                  {isRecording ? '⏹️' : '🎙️'}
                </button>
              </div>
              
              <p style={{ 
                fontSize: '18px', 
                color: isRecording ? '#f44336' : '#666',
                margin: '0 0 10px 0'
              }}>
                {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
              </p>
              
              {!selectedEmotion && (
                <p style={{ fontSize: '14px', color: '#f44336', margin: 0 }}>
                  Please select an emotion first
                </p>
              )}
            </div>

            {/* Transcript Display */}
            {transcript && (
              <div style={{ 
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                marginBottom: '30px'
              }}>
                <h4 style={{ marginBottom: '15px', color: '#333' }}>Your Story:</h4>
                <p style={{ 
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: '#333',
                  margin: 0,
                  minHeight: '60px',
                  padding: '15px',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '8px'
                }}>
                  {transcript}
                </p>
              </div>
            )}

            {/* Save Button */}
            {transcript && selectedEmotion && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={saveMemory}
                  disabled={isTranscribing}
                  style={{
                    padding: '15px 40px',
                    backgroundColor: isTranscribing ? '#ccc' : '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: isTranscribing ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)'
                  }}
                >
                  {isTranscribing ? 'Saving...' : '💾 Save Memory'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stories Screen */}
        {currentScreen === 'stories' && (
          <div>
            <h2 style={{ marginBottom: '30px', color: '#333', fontSize: '28px' }}>
              AI Generated Stories
            </h2>

            {/* Story Generation Section */}
            {memories.length > 0 && (
              <div style={{ 
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                marginBottom: '30px'
              }}>
                <h3 style={{ marginBottom: '20px', color: '#333' }}>Create New Story</h3>
                <p style={{ marginBottom: '20px', color: '#666' }}>
                  Select memories to weave into a beautiful narrative:
                </p>
                
                <div style={{ 
                  display: 'grid', 
                  gap: '15px',
                  marginBottom: '20px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {memories.map(memory => (
                    <label key={memory.id} style={{ 
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '15px',
                      padding: '15px',
                      backgroundColor: selectedMemories.includes(memory.id) ? '#e8f5e8' : '#f9f9f9',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: selectedMemories.includes(memory.id) ? '2px solid #4CAF50' : '2px solid transparent'
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
                        style={{ marginTop: '2px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                          <span style={{ fontSize: '20px' }}>
                            {memory.emotion === 'happy' ? '😊' : 
                             memory.emotion === 'sad' ? '😢' : 
                             memory.emotion === 'grateful' ? '🙏' : '🎉'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {new Date(memory.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ 
                          margin: 0,
                          fontSize: '14px',
                          color: '#333',
                          lineHeight: '1.4'
                        }}>
                          {memory.transcript.substring(0, 100)}...
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  onClick={generateStory}
                  disabled={selectedMemories.length === 0 || isGeneratingStory}
                  style={{
                    padding: '12px 30px',
                    backgroundColor: selectedMemories.length === 0 || isGeneratingStory ? '#ccc' : '#9C27B0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: selectedMemories.length === 0 || isGeneratingStory ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isGeneratingStory ? 'Generating...' : '✨ Generate Story'}
                </button>
              </div>
            )}

            {/* Generated Story Display */}
            {generatedStory && (
              <div style={{ 
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                marginBottom: '30px'
              }}>
                <h3 style={{ marginBottom: '20px', color: '#333' }}>Your Generated Story</h3>
                <div style={{ 
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  borderLeft: '4px solid #9C27B0'
                }}>
                  <p style={{ 
                    fontSize: '16px',
                    lineHeight: '1.8',
                    color: '#333',
                    margin: 0,
                    fontStyle: 'italic'
                  }}>
                    {generatedStory}
                  </p>
                </div>
              </div>
            )}

            {/* Saved Stories */}
            {stories.length > 0 ? (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#333' }}>Saved Stories</h3>
                <div style={{ display: 'grid', gap: '20px' }}>
                  {stories.map(story => (
                    <div key={story.id} style={{ 
                      backgroundColor: 'white',
                      padding: '25px',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '15px'
                      }}>
                        <span style={{ fontSize: '24px' }}>📖</span>
                        <span style={{ fontSize: '14px', color: '#666' }}>
                          {new Date(story.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ 
                        fontSize: '16px',
                        lineHeight: '1.8',
                        color: '#333',
                        margin: 0,
                        fontStyle: 'italic'
                      }}>
                        {story.story_text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* Family Screen */}
        {currentScreen === 'family' && (
          <div>
            <h2 style={{ marginBottom: '30px', color: '#333', fontSize: '28px' }}>
              Family Circle
            </h2>

            {/* Add Family Member */}
            <div style={{ 
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ marginBottom: '20px', color: '#333' }}>Invite Family Member</h3>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block',
                    marginBottom: '8px',
                    color: '#333',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="Enter family member's email"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button
                  onClick={addFamilyMember}
                  disabled={!newMemberEmail.trim() || isAddingMember}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: !newMemberEmail.trim() || isAddingMember ? '#ccc' : '#FF9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: !newMemberEmail.trim() || isAddingMember ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isAddingMember ? 'Adding...' : '+ Add'}
                </button>
              </div>
            </div>

            {/* Family Members List */}
            {familyMembers.length > 0 ? (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#333' }}>Family Members</h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {familyMembers.map(member => (
                    <div key={member.id} style={{ 
                      backgroundColor: 'white',
                      padding: '20px',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <p style={{ 
                          margin: '0 0 5px 0',
                          fontSize: '16px',
                          fontWeight: '500',
                          color: '#333'
                        }}>
                          {member.member_email}
                        </p>
                        <p style={{ 
                          margin: 0,
                          fontSize: '14px',
                          color: '#666'
                        }}>
                          Added {new Date(member.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <select
                          value={member.access_level}
                          onChange={(e) => updateMemberAccess(member.id, e.target.value)}
                          style={{
                            padding: '8px 12px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            backgroundColor: 'white'
                          }}
                        >
                          <option value="all">All Memories</option>
                          <option value="selected">Selected Only</option>
                          <option value="none">No Access</option>
                        </select>
                        
                        <span style={{ 
                          fontSize: '20px',
                          color: member.access_level === 'all' ? '#4CAF50' : 
                                 member.access_level === 'selected' ? '#FF9800' : '#f44336'
                        }}>
                          {member.access_level === 'all' ? '👨‍👩‍👧‍👦' : 
                           member.access_level === 'selected' ? '👥' : '🚫'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
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
            )}
          </div>
        )}
      </main>
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}

export default App