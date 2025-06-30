import React, { useState, useEffect, useRef } from 'react'
import { supabase, authService, memoryService, storyService, familyService } from './lib/supabase'

function App() {
  // Authentication state
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState('signin') // 'signin' or 'signup'
  
  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  
  // App state
  const [currentScreen, setCurrentScreen] = useState('welcome') // 'welcome', 'memories', 'stories', 'family'
  const [selectedEmotion, setSelectedEmotion] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [memories, setMemories] = useState([])
  const [stories, setStories] = useState([])
  const [familyMembers, setFamilyMembers] = useState([])
  const [selectedMemories, setSelectedMemories] = useState([])
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  
  // Refs
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  // Load user data when authenticated
  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

  const loadUserData = async () => {
    if (!user) return
    
    const [memoriesData, storiesData, familyData] = await Promise.all([
      memoryService.getMemories(user.id),
      storyService.getStories(user.id),
      familyService.getFamilyMembers(user.id)
    ])
    
    setMemories(memoriesData)
    setStories(storiesData)
    setFamilyMembers(familyData)
  }

  // Authentication handlers
  const handleAuth = async (e) => {
    e.preventDefault()
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
      }
    } catch (error) {
      setAuthError('An unexpected error occurred')
    }
  }

  const handleSignOut = async () => {
    await authService.signOut()
    setCurrentScreen('welcome')
    setSelectedEmotion('')
    setTranscript('')
    setAudioBlob(null)
    setMemories([])
    setStories([])
    setFamilyMembers([])
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
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Transcription (mock implementation)
  const transcribeAudio = async () => {
    if (!audioBlob) return
    
    setIsTranscribing(true)
    
    // Mock transcription - in real app, you'd send to speech-to-text service
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const mockTranscripts = {
      happy: "Today was such a wonderful day! I spent time with my family at the park, and we had the most amazing picnic. The kids were laughing and playing, and I felt so grateful for these precious moments together.",
      sad: "I've been thinking about grandma a lot today. She used to tell the most beautiful stories about her childhood. I miss her voice and her warm hugs. These memories are so precious to me.",
      grateful: "I'm so thankful for all the love in my life. My family, my friends, even the small moments like morning coffee and sunset walks. Every day brings something to be grateful for.",
      excited: "I can't contain my excitement! We're planning a family reunion next month, and everyone will be there. It's been years since we've all been together. I can already imagine all the stories we'll share!"
    }
    
    setTranscript(mockTranscripts[selectedEmotion] || "This is a sample transcription of your recorded memory.")
    setIsTranscribing(false)
  }

  // Save memory to database
  const saveMemory = async () => {
    if (!user || !transcript || !selectedEmotion) return
    
    const memory = {
      user_id: user.id,
      emotion: selectedEmotion,
      transcript: transcript,
      audio_url: null // In real app, you'd upload audio file and store URL
    }
    
    const savedMemory = await memoryService.saveMemory(memory)
    if (savedMemory) {
      setMemories(prev => [savedMemory, ...prev])
      // Reset form
      setSelectedEmotion('')
      setTranscript('')
      setAudioBlob(null)
    }
  }

  // Story generation
  const generateStory = async () => {
    if (selectedMemories.length === 0) return
    
    setIsGeneratingStory(true)
    
    // Mock story generation - in real app, you'd call AI service
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const selectedMemoryData = memories.filter(m => selectedMemories.includes(m.id))
    const storyText = `Once upon a time, there were beautiful moments that shaped a family's journey together. ${selectedMemoryData.map(m => m.transcript).join(' ')} These memories, woven together, tell the story of love, growth, and the precious bonds that connect us all.`
    
    const story = {
      user_id: user.id,
      memory_ids: selectedMemories,
      story_text: storyText,
      audio_url: null // In real app, you'd generate audio narration
    }
    
    const savedStory = await storyService.saveStory(story)
    if (savedStory) {
      setStories(prev => [savedStory, ...prev])
      setSelectedMemories([])
    }
    
    setIsGeneratingStory(false)
  }

  // Family member management
  const addFamilyMember = async (e) => {
    e.preventDefault()
    if (!user || !newMemberEmail) return
    
    const member = await familyService.addFamilyMember(user.id, newMemberEmail)
    if (member) {
      setFamilyMembers(prev => [member, ...prev])
      setNewMemberEmail('')
    }
  }

  const updateMemberAccess = async (memberId, accessLevel) => {
    const updated = await familyService.updateFamilyMemberAccess(memberId, accessLevel)
    if (updated) {
      setFamilyMembers(prev => 
        prev.map(m => m.id === memberId ? { ...m, access_level: accessLevel } : m)
      )
    }
  }

  // Loading state
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

  // Authentication screen
  if (!user) {
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
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: 'bold', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '10px'
            }}>
              Memory Jar
            </h1>
            <p style={{ color: '#666', fontSize: '16px' }}>
              {authMode === 'signin' ? 'Welcome back!' : 'Create your account'}
            </p>
          </div>

          <form onSubmit={handleAuth}>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '15px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '10px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
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
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              />
            </div>

            {authError && (
              <div style={{ 
                color: '#e74c3c', 
                marginBottom: '20px', 
                padding: '10px',
                backgroundColor: '#fdf2f2',
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                {authError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '15px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                marginBottom: '15px'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
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
          </form>
        </div>
      </div>
    )
  }

  // Welcome screen
  if (currentScreen === 'welcome') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '40px'
        }}>
          <h1 style={{ 
            color: 'white', 
            fontSize: '24px', 
            fontWeight: 'bold',
            margin: 0
          }}>
            Memory Jar
          </h1>
          <button
            onClick={handleSignOut}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Welcome Content */}
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ 
              fontSize: '48px', 
              fontWeight: 'bold', 
              marginBottom: '20px',
              lineHeight: '1.2'
            }}>
              Welcome to Your Digital Memory Jar
            </h2>
            <p style={{ 
              fontSize: '20px', 
              opacity: 0.9, 
              lineHeight: '1.6',
              marginBottom: '20px'
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '20px', 
              borderRadius: '15px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎙️</div>
              <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Record Memories</h3>
              <p style={{ fontSize: '14px', opacity: 0.8 }}>Capture precious moments with voice recordings</p>
            </div>
            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '20px', 
              borderRadius: '15px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>📖</div>
              <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Create Stories</h3>
              <p style={{ fontSize: '14px', opacity: 0.8 }}>AI weaves your memories into beautiful narratives</p>
            </div>
          </div>

          <div style={{ 
            marginTop: '30px', 
            padding: '20px', 
            background: 'rgba(255,255,255,0.1)', 
            borderRadius: '15px',
            backdropFilter: 'blur(10px)'
          }}>
            <p style={{ fontSize: '16px', marginBottom: '15px' }}>
              <strong>How it works:</strong> Choose an emotion → Record your story → AI transcribes instantly → Create stories from your memories → Share with family
            </p>
          </div>

          {/* Navigation Buttons */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '20px', 
            marginTop: '40px' 
          }}>
            <button
              onClick={() => setCurrentScreen('memories')}
              style={{
                background: 'white',
                color: '#667eea',
                border: 'none',
                padding: '20px',
                borderRadius: '15px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-5px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              🎙️ Record Memories
            </button>
            <button
              onClick={() => setCurrentScreen('stories')}
              style={{
                background: 'white',
                color: '#667eea',
                border: 'none',
                padding: '20px',
                borderRadius: '15px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-5px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              📖 View Stories
            </button>
            <button
              onClick={() => setCurrentScreen('family')}
              style={{
                background: 'white',
                color: '#667eea',
                border: 'none',
                padding: '20px',
                borderRadius: '15px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-5px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              👨‍👩‍👧‍👦 Family Circle
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Memories screen
  if (currentScreen === 'memories') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <button
            onClick={() => setCurrentScreen('welcome')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Back
          </button>
          <h1 style={{ 
            color: 'white', 
            fontSize: '24px', 
            fontWeight: 'bold',
            margin: 0
          }}>
            Record Memories
          </h1>
          <button
            onClick={handleSignOut}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Sign Out
          </button>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Recording Interface */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>Share a Memory</h2>
            
            {/* Emotion Selection */}
            {!selectedEmotion && (
              <div>
                <p style={{ marginBottom: '20px', color: '#666' }}>How are you feeling about this memory?</p>
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
                        border: '2px solid #e1e5e9',
                        borderRadius: '15px',
                        background: 'white',
                        cursor: 'pointer',
                        fontSize: '16px',
                        transition: 'all 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.borderColor = '#667eea'
                        e.target.style.transform = 'translateY(-2px)'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.borderColor = '#e1e5e9'
                        e.target.style.transform = 'translateY(0)'
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>{emoji}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recording Controls */}
            {selectedEmotion && !transcript && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ marginBottom: '20px', color: '#666' }}>
                  Selected emotion: <strong style={{ color: '#667eea' }}>
                    {selectedEmotion.charAt(0).toUpperCase() + selectedEmotion.slice(1)}
                  </strong>
                </p>
                
                {!audioBlob && (
                  <div>
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        border: 'none',
                        background: isRecording 
                          ? 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        fontSize: '24px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        marginBottom: '20px'
                      }}
                      onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    >
                      {isRecording ? '⏹️' : '🎙️'}
                    </button>
                    <p style={{ color: '#666' }}>
                      {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
                    </p>
                  </div>
                )}

                {audioBlob && (
                  <div>
                    <div style={{ marginBottom: '20px' }}>
                      <audio controls style={{ width: '100%' }}>
                        <source src={URL.createObjectURL(audioBlob)} type="audio/wav" />
                      </audio>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button
                        onClick={transcribeAudio}
                        disabled={isTranscribing}
                        style={{
                          padding: '12px 24px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '25px',
                          cursor: isTranscribing ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          opacity: isTranscribing ? 0.7 : 1
                        }}
                      >
                        {isTranscribing ? 'Transcribing...' : 'Transcribe'}
                      </button>
                      <button
                        onClick={() => {
                          setAudioBlob(null)
                          setSelectedEmotion('')
                        }}
                        style={{
                          padding: '12px 24px',
                          background: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '25px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Start Over
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transcript Review */}
            {transcript && (
              <div>
                <h3 style={{ marginBottom: '15px', color: '#333' }}>Review Your Memory</h3>
                <div style={{
                  background: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  border: '1px solid #e1e5e9'
                }}>
                  <p style={{ lineHeight: '1.6', color: '#333', margin: 0 }}>
                    {transcript}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button
                    onClick={saveMemory}
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    Save Memory
                  </button>
                  <button
                    onClick={() => {
                      setTranscript('')
                      setAudioBlob(null)
                      setSelectedEmotion('')
                    }}
                    style={{
                      padding: '12px 24px',
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Saved Memories */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>Your Memories</h2>
            {memories.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
                No memories recorded yet. Start by recording your first memory above!
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {memories.map((memory) => (
                  <div
                    key={memory.id}
                    style={{
                      border: '1px solid #e1e5e9',
                      borderRadius: '10px',
                      padding: '20px',
                      background: '#f8f9fa'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{
                        background: '#667eea',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '15px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {memory.emotion.toUpperCase()}
                      </span>
                      <span style={{ color: '#666', fontSize: '12px' }}>
                        {new Date(memory.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ color: '#333', lineHeight: '1.5', margin: 0 }}>
                      {memory.transcript}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Stories screen
  if (currentScreen === 'stories') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <button
            onClick={() => setCurrentScreen('welcome')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Back
          </button>
          <h1 style={{ 
            color: 'white', 
            fontSize: '24px', 
            fontWeight: 'bold',
            margin: 0
          }}>
            Stories
          </h1>
          <button
            onClick={handleSignOut}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Sign Out
          </button>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Story Generation */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <h2>Your Family Stories</h2>
            <p style={{ color: '#666', marginBottom: '30px' }}>
              Weave your recorded memories into beautiful narratives
            </p>

            {memories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  You need to record some memories first before creating stories.
                </p>
                <button
                  onClick={() => setCurrentScreen('memories')}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  Record Memories
                </button>
              </div>
            ) : (
              <div>
                <h3 style={{ marginBottom: '15px', color: '#333' }}>Select Memories for Your Story</h3>
                <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                  {memories.map((memory) => (
                    <label
                      key={memory.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '15px',
                        border: selectedMemories.includes(memory.id) ? '2px solid #667eea' : '1px solid #e1e5e9',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        background: selectedMemories.includes(memory.id) ? '#f0f4ff' : '#f8f9fa'
                      }}
                    >
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                          <span style={{
                            background: '#667eea',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }}>
                            {memory.emotion.toUpperCase()}
                          </span>
                          <span style={{ color: '#666', fontSize: '12px' }}>
                            {new Date(memory.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ color: '#333', fontSize: '14px', lineHeight: '1.4', margin: 0 }}>
                          {memory.transcript.substring(0, 150)}...
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={generateStory}
                    disabled={selectedMemories.length === 0 || isGeneratingStory}
                    style={{
                      padding: '15px 30px',
                      background: selectedMemories.length === 0 || isGeneratingStory 
                        ? '#ccc' 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '25px',
                      cursor: selectedMemories.length === 0 || isGeneratingStory ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    {isGeneratingStory ? 'Creating Story...' : 'Create Story from Memories'}
                  </button>
                  <p style={{ color: '#666', fontSize: '12px', marginTop: '10px' }}>
                    Select at least one memory to create a story
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Generated Stories */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>Your Generated Stories</h2>
            {stories.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
                No stories created yet. Generate your first story above!
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>
                {stories.map((story) => (
                  <div
                    key={story.id}
                    style={{
                      border: '1px solid #e1e5e9',
                      borderRadius: '15px',
                      padding: '25px',
                      background: '#f8f9fa'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h3 style={{ color: '#333', margin: 0 }}>Family Story</h3>
                      <span style={{ color: '#666', fontSize: '12px' }}>
                        {new Date(story.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ color: '#333', lineHeight: '1.6', marginBottom: '15px' }}>
                      {story.story_text}
                    </p>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      <strong>Based on {story.memory_ids.length} memories</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Family screen
  if (currentScreen === 'family') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <button
            onClick={() => setCurrentScreen('welcome')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Back
          </button>
          <h1 style={{ 
            color: 'white', 
            fontSize: '24px', 
            fontWeight: 'bold',
            margin: 0
          }}>
            Family Circle
          </h1>
          <button
            onClick={handleSignOut}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Sign Out
          </button>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Add Family Member */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>Invite Family Members</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Share your memories and stories with family members by inviting them to your circle.
            </p>
            
            <form onSubmit={addFamilyMember} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="email"
                placeholder="Enter family member's email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                required
                style={{
                  flex: 1,
                  padding: '12px 15px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Invite
              </button>
            </form>
          </div>

          {/* Family Members List */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>Family Members</h2>
            {familyMembers.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
                No family members added yet. Invite your first family member above!
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {familyMembers.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '20px',
                      border: '1px solid #e1e5e9',
                      borderRadius: '10px',
                      background: '#f8f9fa'
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>
                        {member.member_email}
                      </p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                        Added {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <select
                        value={member.access_level}
                        onChange={(e) => updateMemberAccess(member.id, e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #e1e5e9',
                          borderRadius: '5px',
                          fontSize: '12px',
                          background: 'white'
                        }}
                      >
                        <option value="all">All Memories</option>
                        <option value="selected">Selected Only</option>
                        <option value="none">No Access</option>
                      </select>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        background: member.access_level === 'all' ? '#27ae60' : 
                                   member.access_level === 'selected' ? '#f39c12' : '#e74c3c',
                        color: 'white'
                      }}>
                        {member.access_level.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default App