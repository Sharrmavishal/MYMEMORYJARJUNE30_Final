import React, { useState, useEffect, useRef } from 'react'
import { supabase, authService, memoryService, storyService, familyService } from './lib/supabase'

function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [memories, setMemories] = useState([])
  const [stories, setStories] = useState([])
  const [familyMembers, setFamilyMembers] = useState([])
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false)
  const [selectedEmotion, setSelectedEmotion] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  
  // Story generation states
  const [selectedMemories, setSelectedMemories] = useState([])
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [generatedStory, setGeneratedStory] = useState('')
  
  // Family sharing states
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)
  
  // Audio playback states
  const [playingAudio, setPlayingAudio] = useState(null)
  const audioRef = useRef(null)
  
  // Recording refs
  const mediaRecorderRef = useRef(null)
  const recordingIntervalRef = useRef(null)

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
      setLoading(false)
      
      if (currentUser) {
        loadUserData(currentUser.id)
      }
    }

    initAuth()

    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        loadUserData(session.user.id)
      } else {
        setMemories([])
        setStories([])
        setFamilyMembers([])
      }
    })

    return unsubscribe
  }, [])

  // Load user data
  const loadUserData = async (userId) => {
    const [memoriesData, storiesData, familyData] = await Promise.all([
      memoryService.getMemories(userId),
      storyService.getStories(userId),
      familyService.getFamilyMembers(userId)
    ])
    
    setMemories(memoriesData)
    setStories(storiesData)
    setFamilyMembers(familyData)
  }

  // Auth handlers
  const handleSignUp = async (email, password) => {
    const { user, error } = await authService.signUp(email, password)
    if (error) {
      alert('Sign up failed: ' + error.message)
    } else {
      alert('Check your email for verification link!')
    }
  }

  const handleSignIn = async (email, password) => {
    const { user, error } = await authService.signIn(email, password)
    if (error) {
      alert('Sign in failed: ' + error.message)
    }
  }

  const handleSignOut = async () => {
    await authService.signOut()
    setCurrentScreen('welcome')
  }

  // Recording handlers
  const startRecording = async () => {
    if (!selectedEmotion) {
      alert('Please select an emotion first')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      const chunks = []
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data)
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      alert('Could not access microphone: ' + error.message)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(recordingIntervalRef.current)
    }
  }

  const transcribeAudio = async () => {
    if (!audioBlob) return
    
    setIsTranscribing(true)
    
    // Simulate transcription (replace with actual API call)
    setTimeout(() => {
      const mockTranscripts = {
        happy: "Today was such a wonderful day! I spent time with my family and we laughed so much. The kids were playing in the garden and their joy was infectious. These are the moments I want to remember forever.",
        sad: "I've been thinking about grandma a lot today. She used to tell the most amazing stories about her childhood. I wish I had recorded more of them. Her voice was so warm and comforting.",
        grateful: "I'm so thankful for all the little things in life. The morning coffee, the sound of rain, and especially the people who love me. Sometimes we forget to appreciate what we have.",
        excited: "I can't believe it's finally happening! After months of planning, we're going on that family trip. The kids are so excited, and honestly, so am I. This is going to be amazing!"
      }
      
      setTranscript(mockTranscripts[selectedEmotion] || "This is a sample transcription of your recorded memory.")
      setIsTranscribing(false)
    }, 2000)
  }

  const saveMemory = async () => {
    if (!transcript || !user) return
    
    const memory = {
      user_id: user.id,
      emotion: selectedEmotion,
      transcript: transcript,
      audio_url: null, // In real app, upload audio and store URL
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
    }
  }

  // Story generation handlers
  const generateStory = async () => {
    if (selectedMemories.length === 0) {
      alert('Please select at least one memory to create a story')
      return
    }
    
    setIsGeneratingStory(true)
    
    // Simulate AI story generation
    setTimeout(() => {
      const selectedMemoryTexts = selectedMemories.map(id => {
        const memory = memories.find(m => m.id === id)
        return memory?.transcript || ''
      }).join(' ')
      
      const storyTemplate = `Once upon a time, there were moments that shaped a life. ${selectedMemoryTexts} These memories, woven together, tell a story of love, growth, and the beautiful tapestry of human experience. Each moment, whether filled with joy or touched by sadness, contributed to the rich narrative of a life well-lived.`
      
      setGeneratedStory(storyTemplate)
      setIsGeneratingStory(false)
    }, 3000)
  }

  const saveStory = async () => {
    if (!generatedStory || !user) return
    
    const story = {
      user_id: user.id,
      memory_ids: selectedMemories,
      story_text: generatedStory,
      audio_url: null, // In real app, generate audio narration
      created_at: new Date().toISOString()
    }
    
    const savedStory = await storyService.saveStory(story)
    if (savedStory) {
      setStories(prev => [savedStory, ...prev])
      setSelectedMemories([])
      setGeneratedStory('')
      alert('Story saved successfully!')
    }
  }

  // Family sharing handlers
  const addFamilyMember = async () => {
    if (!newMemberEmail || !user) return
    
    setIsAddingMember(true)
    const member = await familyService.addFamilyMember(user.id, newMemberEmail)
    
    if (member) {
      setFamilyMembers(prev => [member, ...prev])
      setNewMemberEmail('')
      alert('Family member added successfully!')
    }
    
    setIsAddingMember(false)
  }

  // Audio playback handlers
  const playAudio = (audioUrl, id) => {
    if (playingAudio === id) {
      audioRef.current?.pause()
      setPlayingAudio(null)
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.play()
        setPlayingAudio(id)
      }
    }
  }

  // Format time helper
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading...</div>
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
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏺</div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            marginBottom: '15px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Memory Jar
          </h1>
          
          <p style={{ 
            fontSize: '16px', 
            color: '#666', 
            marginBottom: '20px',
            lineHeight: '1.6'
          }}>
            Transform precious moments into lasting digital treasures. Record stories 
            while you can, preserve them forever, and share them with loved ones.
          </p>

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

          <div style={{ 
            fontSize: '14px', 
            color: '#888', 
            marginBottom: '30px',
            lineHeight: '1.5'
          }}>
            <strong>How it works:</strong> Choose an emotion → Record your story → AI transcribes instantly → Create stories from your memories → Share with family
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
            <button
              onClick={() => setCurrentScreen('auth')}
              style={{
                padding: '15px 25px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
            >
              Get Started
            </button>
            
            <button
              onClick={() => setCurrentScreen('demo')}
              style={{
                padding: '15px 25px',
                background: 'transparent',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#667eea'
                e.target.style.color = 'white'
                e.target.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = '#667eea'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              View Demo
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{ 
          maxWidth: '800px', 
          margin: '0 auto',
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>🏺 Memory Jar Demo</h1>
            <p style={{ color: '#666' }}>See how families preserve their precious moments</p>
          </div>

          <div style={{ display: 'grid', gap: '30px' }}>
            {/* Demo Memory Card */}
            <div style={{ 
              border: '1px solid #e0e0e0', 
              borderRadius: '12px', 
              padding: '20px',
              background: '#f8f9fa'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ fontSize: '24px', marginRight: '10px' }}>😊</span>
                <div>
                  <strong>Happy Memory</strong>
                  <div style={{ fontSize: '12px', color: '#666' }}>Recorded 2 days ago</div>
                </div>
              </div>
              <p style={{ color: '#333', lineHeight: '1.6', marginBottom: '15px' }}>
                "Today was such a wonderful day! I spent time with my family and we laughed so much. 
                The kids were playing in the garden and their joy was infectious. These are the moments 
                I want to remember forever."
              </p>
              <button style={{
                padding: '8px 16px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}>
                ▶️ Play Audio
              </button>
            </div>

            {/* Demo Story Card */}
            <div style={{ 
              border: '1px solid #e0e0e0', 
              borderRadius: '12px', 
              padding: '20px',
              background: '#f0f8ff'
            }}>
              <h3 style={{ marginBottom: '15px' }}>📖 Generated Story</h3>
              <p style={{ color: '#333', lineHeight: '1.6', fontStyle: 'italic' }}>
                "Once upon a time, there were moments that shaped a life. A wonderful day spent with 
                family, laughter echoing through the garden as children played. These memories, woven 
                together, tell a story of love, growth, and the beautiful tapestry of human experience..."
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button
              onClick={() => setCurrentScreen('welcome')}
              style={{
                padding: '12px 30px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                marginRight: '15px'
              }}
            >
              ← Back to Home
            </button>
            <button
              onClick={() => setCurrentScreen('auth')}
              style={{
                padding: '12px 30px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Start Creating Memories
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Auth Screen
  if (currentScreen === 'auth') {
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleSubmit = async (e) => {
      e.preventDefault()
      if (isSignUp) {
        await handleSignUp(email, password)
      } else {
        await handleSignIn(email, password)
      }
    }

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
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🏺</div>
            <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p style={{ color: '#666' }}>
              {isSignUp ? 'Start preserving your memories' : 'Sign in to your memory jar'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            <button
              type="submit"
              style={{
                padding: '15px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
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
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main App (when user is logged in)
  if (user) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        {/* Navigation */}
        <nav style={{ 
          background: 'white', 
          padding: '15px 20px', 
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '24px', marginRight: '10px' }}>🏺</span>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>Memory Jar</h1>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentScreen('record')}
              style={{
                padding: '8px 16px',
                background: currentScreen === 'record' ? '#667eea' : 'transparent',
                color: currentScreen === 'record' ? 'white' : '#667eea',
                border: '1px solid #667eea',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Record
            </button>
            <button
              onClick={() => setCurrentScreen('memories')}
              style={{
                padding: '8px 16px',
                background: currentScreen === 'memories' ? '#667eea' : 'transparent',
                color: currentScreen === 'memories' ? 'white' : '#667eea',
                border: '1px solid #667eea',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Memories
            </button>
            <button
              onClick={() => setCurrentScreen('stories')}
              style={{
                padding: '8px 16px',
                background: currentScreen === 'stories' ? '#667eea' : 'transparent',
                color: currentScreen === 'stories' ? 'white' : '#667eea',
                border: '1px solid #667eea',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Stories
            </button>
            <button
              onClick={() => setCurrentScreen('family')}
              style={{
                padding: '8px 16px',
                background: currentScreen === 'family' ? '#667eea' : 'transparent',
                color: currentScreen === 'family' ? 'white' : '#667eea',
                border: '1px solid #667eea',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Family
            </button>
            <button
              onClick={handleSignOut}
              style={{
                padding: '8px 16px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Record Screen */}
          {currentScreen === 'record' && (
            <div>
              <h2>Record a Memory</h2>
              <p style={{ color: '#666', marginBottom: '30px' }}>
                Choose an emotion and record your story
              </p>

              {/* Emotion Selection */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px' }}>How are you feeling?</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px' }}>
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
                        border: selectedEmotion === emotion ? '3px solid #667eea' : '2px solid #e0e0e0',
                        borderRadius: '12px',
                        background: selectedEmotion === emotion ? '#f0f4ff' : 'white',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{emoji}</div>
                      <div style={{ fontWeight: '500' }}>{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recording Controls */}
              <div style={{ 
                background: 'white', 
                padding: '30px', 
                borderRadius: '12px', 
                textAlign: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                {!isRecording && !audioBlob && (
                  <button
                    onClick={startRecording}
                    disabled={!selectedEmotion}
                    style={{
                      padding: '20px 40px',
                      background: selectedEmotion ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50px',
                      fontSize: '18px',
                      fontWeight: '600',
                      cursor: selectedEmotion ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      margin: '0 auto'
                    }}
                  >
                    🎤 Start Recording
                  </button>
                )}

                {isRecording && (
                  <div>
                    <div style={{ fontSize: '48px', marginBottom: '20px', color: '#dc3545' }}>🔴</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
                      {formatTime(recordingTime)}
                    </div>
                    <button
                      onClick={stopRecording}
                      style={{
                        padding: '15px 30px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ⏹️ Stop Recording
                    </button>
                  </div>
                )}

                {audioBlob && !transcript && (
                  <div>
                    <div style={{ fontSize: '32px', marginBottom: '20px' }}>✅</div>
                    <p style={{ marginBottom: '20px' }}>Recording complete! Duration: {formatTime(recordingTime)}</p>
                    <button
                      onClick={transcribeAudio}
                      disabled={isTranscribing}
                      style={{
                        padding: '15px 30px',
                        background: isTranscribing ? '#ccc' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: isTranscribing ? 'not-allowed' : 'pointer',
                        marginRight: '15px'
                      }}
                    >
                      {isTranscribing ? '🔄 Transcribing...' : '📝 Transcribe'}
                    </button>
                    <button
                      onClick={() => {
                        setAudioBlob(null)
                        setRecordingTime(0)
                      }}
                      style={{
                        padding: '15px 30px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      🔄 Record Again
                    </button>
                  </div>
                )}

                {transcript && (
                  <div>
                    <h3 style={{ marginBottom: '15px' }}>Transcription</h3>
                    <div style={{ 
                      background: '#f8f9fa', 
                      padding: '20px', 
                      borderRadius: '8px', 
                      marginBottom: '20px',
                      textAlign: 'left',
                      lineHeight: '1.6'
                    }}>
                      {transcript}
                    </div>
                    <button
                      onClick={saveMemory}
                      style={{
                        padding: '15px 30px',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginRight: '15px'
                      }}
                    >
                      💾 Save Memory
                    </button>
                    <button
                      onClick={() => {
                        setAudioBlob(null)
                        setTranscript('')
                        setRecordingTime(0)
                      }}
                      style={{
                        padding: '15px 30px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      🔄 Start Over
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Memories Screen */}
          {currentScreen === 'memories' && (
            <div>
              <h2>Your Memories</h2>
              <p style={{ color: '#666', marginBottom: '30px' }}>
                All your recorded moments in one place
              </p>

              {memories.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px',
                  background: 'white',
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>📝</div>
                  <h3 style={{ marginBottom: '10px' }}>No memories yet</h3>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    Start by recording your first memory
                  </p>
                  <button
                    onClick={() => setCurrentScreen('record')}
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Record First Memory
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                  {memories.map((memory) => (
                    <div key={memory.id} style={{ 
                      background: 'white', 
                      padding: '25px', 
                      borderRadius: '12px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                        <span style={{ fontSize: '24px', marginRight: '12px' }}>
                          {memory.emotion === 'happy' && '😊'}
                          {memory.emotion === 'sad' && '😢'}
                          {memory.emotion === 'grateful' && '🙏'}
                          {memory.emotion === 'excited' && '🎉'}
                        </span>
                        <div>
                          <strong style={{ textTransform: 'capitalize' }}>{memory.emotion} Memory</strong>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {new Date(memory.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <p style={{ 
                        color: '#333', 
                        lineHeight: '1.6', 
                        marginBottom: '15px' 
                      }}>
                        {memory.transcript}
                      </p>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {memory.audio_url && (
                          <button
                            onClick={() => playAudio(memory.audio_url, memory.id)}
                            style={{
                              padding: '8px 16px',
                              background: playingAudio === memory.id ? '#dc3545' : '#667eea',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              cursor: 'pointer'
                            }}
                          >
                            {playingAudio === memory.id ? '⏸️ Pause' : '▶️ Play'}
                          </button>
                        )}
                        {memory.blockchain_tx && (
                          <span style={{ 
                            padding: '8px 12px',
                            background: '#28a745',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}>
                            🔗 Blockchain Verified
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stories Screen */}
          {currentScreen === 'stories' && (
            <div>
              <h2>Your Family Stories</h2>
              <p style={{ color: '#666', marginBottom: '30px' }}>
                Weave your recorded memories into beautiful narratives
              </p>

              {/* Story Generation Section */}
              <div style={{ 
                background: 'white', 
                padding: '30px', 
                borderRadius: '12px',
                marginBottom: '30px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ marginBottom: '20px' }}>Create New Story</h3>
                
                {memories.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p style={{ color: '#666', marginBottom: '15px' }}>
                      You need some memories first to create stories
                    </p>
                    <button
                      onClick={() => setCurrentScreen('record')}
                      style={{
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Record Memories
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ marginBottom: '20px', color: '#666' }}>
                      Select memories to weave into a story:
                    </p>
                    
                    <div style={{ display: 'grid', gap: '15px', marginBottom: '25px' }}>
                      {memories.map((memory) => (
                        <label key={memory.id} style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start',
                          padding: '15px',
                          border: selectedMemories.includes(memory.id) ? '2px solid #667eea' : '1px solid #e0e0e0',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: selectedMemories.includes(memory.id) ? '#f0f4ff' : '#f8f9fa'
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
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '18px', marginRight: '8px' }}>
                                {memory.emotion === 'happy' && '😊'}
                                {memory.emotion === 'sad' && '😢'}
                                {memory.emotion === 'grateful' && '🙏'}
                                {memory.emotion === 'excited' && '🎉'}
                              </span>
                              <strong style={{ textTransform: 'capitalize' }}>{memory.emotion}</strong>
                              <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
                                {new Date(memory.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p style={{ color: '#555', fontSize: '14px', lineHeight: '1.4' }}>
                              {memory.transcript.substring(0, 150)}
                              {memory.transcript.length > 150 && '...'}
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
                        background: selectedMemories.length > 0 && !isGeneratingStory ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: selectedMemories.length > 0 && !isGeneratingStory ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {isGeneratingStory ? '🤖 Generating Story...' : '✨ Generate Story'}
                    </button>

                    {generatedStory && (
                      <div style={{ marginTop: '25px' }}>
                        <h4 style={{ marginBottom: '15px' }}>Generated Story</h4>
                        <div style={{ 
                          background: '#f0f8ff', 
                          padding: '20px', 
                          borderRadius: '8px', 
                          marginBottom: '20px',
                          lineHeight: '1.6',
                          fontStyle: 'italic'
                        }}>
                          {generatedStory}
                        </div>
                        <button
                          onClick={saveStory}
                          style={{
                            padding: '12px 24px',
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          💾 Save Story
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Saved Stories */}
              <div>
                <h3 style={{ marginBottom: '20px' }}>Saved Stories</h3>
                {stories.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    background: 'white',
                    borderRadius: '12px'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>📚</div>
                    <h4 style={{ marginBottom: '10px' }}>No stories yet</h4>
                    <p style={{ color: '#666' }}>
                      Create your first story from your memories above
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '20px' }}>
                    {stories.map((story) => (
                      <div key={story.id} style={{ 
                        background: 'white', 
                        padding: '25px', 
                        borderRadius: '12px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                          <span style={{ fontSize: '24px', marginRight: '12px' }}>📖</span>
                          <div>
                            <strong>Family Story</strong>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              Created {new Date(story.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <p style={{ 
                          color: '#333', 
                          lineHeight: '1.6', 
                          marginBottom: '15px',
                          fontStyle: 'italic'
                        }}>
                          {story.story_text}
                        </p>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Based on {story.memory_ids.length} memories
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
              <h2>Family Circle</h2>
              <p style={{ color: '#666', marginBottom: '30px' }}>
                Share your memories and stories with loved ones
              </p>

              {/* Add Family Member */}
              <div style={{ 
                background: 'white', 
                padding: '30px', 
                borderRadius: '12px',
                marginBottom: '30px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ marginBottom: '20px' }}>Invite Family Member</h3>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
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
                        fontSize: '16px'
                      }}
                    />
                  </div>
                  <button
                    onClick={addFamilyMember}
                    disabled={!newMemberEmail || isAddingMember}
                    style={{
                      padding: '12px 24px',
                      background: newMemberEmail && !isAddingMember ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: newMemberEmail && !isAddingMember ? 'pointer' : 'not-allowed',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isAddingMember ? 'Adding...' : 'Invite'}
                  </button>
                </div>
              </div>

              {/* Family Members List */}
              <div>
                <h3 style={{ marginBottom: '20px' }}>Family Members</h3>
                {familyMembers.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    background: 'white',
                    borderRadius: '12px'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>👨‍👩‍👧‍👦</div>
                    <h4 style={{ marginBottom: '10px' }}>No family members yet</h4>
                    <p style={{ color: '#666' }}>
                      Invite your loved ones to share in your memory collection
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {familyMembers.map((member) => (
                      <div key={member.id} style={{ 
                        background: 'white', 
                        padding: '20px', 
                        borderRadius: '12px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '24px', marginRight: '15px' }}>👤</span>
                          <div>
                            <strong>{member.member_email}</strong>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              Added {new Date(member.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <select
                            value={member.access_level}
                            onChange={(e) => familyService.updateFamilyMemberAccess(member.id, e.target.value)}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #e0e0e0',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          >
                            <option value="all">All Memories</option>
                            <option value="selected">Selected Only</option>
                            <option value="none">No Access</option>
                          </select>
                          <span style={{ 
                            padding: '6px 12px',
                            background: member.access_level === 'all' ? '#28a745' : 
                                       member.access_level === 'selected' ? '#ffc107' : '#dc3545',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '12px',
                            textTransform: 'capitalize'
                          }}>
                            {member.access_level}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Audio element for playback */}
        <audio
          ref={audioRef}
          onEnded={() => setPlayingAudio(null)}
          style={{ display: 'none' }}
        />
      </div>
    )
  }

  return null
}

export default App