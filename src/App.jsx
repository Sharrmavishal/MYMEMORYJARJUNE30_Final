import React, { useState, useEffect } from 'react'
import { supabase, authService, memoryService, storyService, familyService } from './lib/supabase'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [currentEmotion, setCurrentEmotion] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [memories, setMemories] = useState([])
  const [stories, setStories] = useState([])
  const [familyMembers, setFamilyMembers] = useState([])
  const [isListening, setIsListening] = useState(false)
  const [voiceSearchActive, setVoiceSearchActive] = useState(false)
  const [voiceSearchResults, setVoiceSearchResults] = useState([])

  const emotions = [
    { id: 'happy', label: 'Happy', emoji: '😊', color: '#4CAF50' },
    { id: 'sad', label: 'Sad', emoji: '😢', color: '#2196F3' },
    { id: 'grateful', label: 'Grateful', emoji: '🙏', color: '#FF9800' },
    { id: 'excited', label: 'Excited', emoji: '🎉', color: '#E91E63' }
  ]

  useEffect(() => {
    checkUser()
    
    const unsubscribe = authService.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      loadMemories()
      loadStories()
      loadFamilyMembers()
    }
  }, [user])

  const checkUser = async () => {
    const currentUser = await authService.getCurrentUser()
    setUser(currentUser)
    setLoading(false)
  }

  const loadMemories = async () => {
    if (!user) return
    const userMemories = await memoryService.getMemories(user.id)
    setMemories(userMemories)
  }

  const loadStories = async () => {
    if (!user) return
    const userStories = await storyService.getStories(user.id)
    setStories(userStories)
  }

  const loadFamilyMembers = async () => {
    if (!user) return
    const members = await familyService.getFamilyMembers(user.id)
    setFamilyMembers(members)
  }

  const handleSignUp = async (email, password) => {
    const { user: newUser, error } = await authService.signUp(email, password)
    if (error) {
      alert('Sign up failed: ' + error.message)
    } else {
      alert('Sign up successful! Please check your email to verify your account.')
    }
  }

  const handleSignIn = async (email, password) => {
    const { user: signedInUser, error } = await authService.signIn(email, password)
    if (error) {
      alert('Sign in failed: ' + error.message)
    }
  }

  const handleSignOut = async () => {
    await authService.signOut()
    setCurrentScreen('welcome')
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const chunks = []

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
          setIsRecording(false)
        }
      }, 30000)

      // Store recorder reference for manual stop
      window.currentRecorder = mediaRecorder
    } catch (error) {
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (window.currentRecorder && window.currentRecorder.state === 'recording') {
      window.currentRecorder.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async () => {
    if (!audioBlob) return

    // Simulate transcription - in real app, use speech-to-text service
    const mockTranscripts = {
      happy: "Today was such a wonderful day! I spent time with my grandchildren at the park, and we had the most amazing picnic. The weather was perfect, and seeing their faces light up when they saw the ducks made my heart so full.",
      sad: "I've been thinking about mom a lot today. It's been two years since she passed, but I still find myself wanting to call her when something good happens. I miss her wisdom and her warm hugs.",
      grateful: "I'm so thankful for my health and my family. Even though times have been tough lately, I realize how blessed I am to have people who care about me. Sometimes we forget to appreciate the simple things.",
      excited: "I can't believe it! After months of planning, we're finally going on that trip to Europe! I've been dreaming about visiting those old castles and trying authentic pasta in Italy. This is going to be the adventure of a lifetime!"
    }

    const transcript = mockTranscripts[currentEmotion] || "This is a sample transcription of your recorded memory."
    setTranscript(transcript)
  }

  const saveMemory = async () => {
    if (!user || !currentEmotion || !transcript) return

    const memory = {
      user_id: user.id,
      emotion: currentEmotion,
      transcript: transcript,
      audio_url: audioBlob ? URL.createObjectURL(audioBlob) : null
    }

    const savedMemory = await memoryService.saveMemory(memory)
    if (savedMemory) {
      await loadMemories()
      setCurrentScreen('memories')
      setCurrentEmotion('')
      setAudioBlob(null)
      setTranscript('')
    }
  }

  const generateStory = async (selectedMemoryIds) => {
    if (!user || selectedMemoryIds.length === 0) return

    const selectedMemories = memories.filter(m => selectedMemoryIds.includes(m.id))
    
    // Mock AI story generation
    const storyText = `Once upon a time, there was a person who experienced many beautiful moments in life. ${selectedMemories.map(m => m.transcript).join(' ')} These memories became the foundation of a life well-lived, filled with love, growth, and precious moments that would be treasured forever.`

    const story = {
      user_id: user.id,
      memory_ids: selectedMemoryIds,
      story_text: storyText
    }

    const savedStory = await storyService.saveStory(story)
    if (savedStory) {
      await loadStories()
      setCurrentScreen('stories')
    }
  }

  const addFamilyMember = async (email, accessLevel) => {
    if (!user || !email) return

    const member = await familyService.addFamilyMember(user.id, email, accessLevel)
    if (member) {
      await loadFamilyMembers()
    }
  }

  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice search is not supported in your browser. Try Chrome or Edge.')
      return
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    
    recognition.onstart = () => {
      setIsListening(true)
      setVoiceSearchActive(true)
      setVoiceSearchResults([])
    }
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase()
      
      const results = memories.filter(memory => 
        memory.transcript.toLowerCase().includes(transcript) ||
        memory.emotion.toLowerCase().includes(transcript)
      )
      
      setVoiceSearchResults(results)
      
      if (results.length === 1 && transcript.includes('play')) {
        const audio = new Audio(results[0].audio)
        audio.play()
      }
    }
    
    recognition.onerror = () => {
      setIsListening(false)
      alert('Voice search failed. Please try again.')
    }
    
    recognition.onend = () => {
      setIsListening(false)
    }
    
    recognition.start()
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Welcome to Memory Jar</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <input
              type="email"
              placeholder="Email"
              id="email"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                marginBottom: '10px'
              }}
            />
            <input
              type="password"
              placeholder="Password"
              id="password"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                const email = document.getElementById('email').value
                const password = document.getElementById('password').value
                handleSignIn(email, password)
              }}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                const email = document.getElementById('email').value
                const password = document.getElementById('password').value
                handleSignUp(email, password)
              }}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header Navigation */}
      <header style={{ 
        backgroundColor: 'white', 
        padding: '16px 20px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h1 style={{ margin: 0, color: '#333' }}>Memory Jar</h1>
          
          <nav style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentScreen('welcome')}
              style={{
                padding: '8px 20px',
                backgroundColor: currentScreen === 'welcome' ? '#4CAF50' : 'transparent',
                color: currentScreen === 'welcome' ? 'white' : '#555',
                border: currentScreen === 'welcome' ? 'none' : '1px solid transparent',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: currentScreen === 'welcome' ? '600' : '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => currentScreen !== 'welcome' && (e.target.style.backgroundColor = '#f5f5f5')}
              onMouseLeave={(e) => currentScreen !== 'welcome' && (e.target.style.backgroundColor = 'transparent')}
            >
              Home
            </button>
            <button
              onClick={() => setCurrentScreen('record')}
              style={{
                padding: '8px 20px',
                backgroundColor: currentScreen === 'record' ? '#4CAF50' : 'transparent',
                color: currentScreen === 'record' ? 'white' : '#555',
                border: currentScreen === 'record' ? 'none' : '1px solid transparent',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: currentScreen === 'record' ? '600' : '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => currentScreen !== 'record' && (e.target.style.backgroundColor = '#f5f5f5')}
              onMouseLeave={(e) => currentScreen !== 'record' && (e.target.style.backgroundColor = 'transparent')}
            >
              Record
            </button>
            <button
              onClick={() => setCurrentScreen('memories')}
              style={{
                padding: '8px 20px',
                backgroundColor: currentScreen === 'memories' ? '#4CAF50' : 'transparent',
                color: currentScreen === 'memories' ? 'white' : '#555',
                border: currentScreen === 'memories' ? 'none' : '1px solid transparent',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: currentScreen === 'memories' ? '600' : '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => currentScreen !== 'memories' && (e.target.style.backgroundColor = '#f5f5f5')}
              onMouseLeave={(e) => currentScreen !== 'memories' && (e.target.style.backgroundColor = 'transparent')}
            >
              Memories
            </button>
            <button
              onClick={() => setCurrentScreen('stories')}
              style={{
                padding: '8px 20px',
                backgroundColor: currentScreen === 'stories' ? '#4CAF50' : 'transparent',
                color: currentScreen === 'stories' ? 'white' : '#555',
                border: currentScreen === 'stories' ? 'none' : '1px solid transparent',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: currentScreen === 'stories' ? '600' : '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => currentScreen !== 'stories' && (e.target.style.backgroundColor = '#f5f5f5')}
              onMouseLeave={(e) => currentScreen !== 'stories' && (e.target.style.backgroundColor = 'transparent')}
            >
              Stories
            </button>
            <button
              onClick={() => setCurrentScreen('family')}
              style={{
                padding: '8px 20px',
                backgroundColor: currentScreen === 'family' ? '#4CAF50' : 'transparent',
                color: currentScreen === 'family' ? 'white' : '#555',
                border: currentScreen === 'family' ? 'none' : '1px solid transparent',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: currentScreen === 'family' ? '600' : '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => currentScreen !== 'family' && (e.target.style.backgroundColor = '#f5f5f5')}
              onMouseLeave={(e) => currentScreen !== 'family' && (e.target.style.backgroundColor = 'transparent')}
            >
              Family
            </button>
            <button
              onClick={() => setCurrentScreen('pricing')}
              style={{
                padding: '8px 20px',
                backgroundColor: currentScreen === 'pricing' ? '#9C27B0' : 'transparent',
                color: currentScreen === 'pricing' ? 'white' : '#555',
                border: currentScreen === 'pricing' ? 'none' : '1px solid transparent',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: currentScreen === 'pricing' ? '600' : '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => currentScreen !== 'pricing' && (e.target.style.backgroundColor = '#f5f5f5')}
              onMouseLeave={(e) => currentScreen !== 'pricing' && (e.target.style.backgroundColor = 'transparent')}
            >
              Pricing
            </button>
            <button
              onClick={handleSignOut}
              style={{
                padding: '6px 16px',
                backgroundColor: 'transparent',
                color: '#ff4444',
                border: '1px solid #ff4444',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#ff4444'; e.target.style.color = 'white'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#ff4444'; }}
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '40px 20px' 
      }}>
        {currentScreen === 'welcome' && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ marginBottom: '10px' }}>My Memory Jar</h1>
            <p style={{ fontSize: '18px', marginBottom: '30px', color: '#333' }}>Every Voice Tells a Story</p>

            <div style={{ 
              backgroundColor: '#f8f9fa',
              padding: '25px',
              borderRadius: '12px',
              marginBottom: '30px',
              textAlign: 'left'
            }}>
              <h3 style={{ marginTop: '0', marginBottom: '15px', color: '#2c3e50' }}>
                🎙️ Preserve Family Memories Forever
              </h3>
              <p style={{ marginBottom: '15px', lineHeight: '1.6', color: '#555' }}>
                Transform precious moments into lasting digital treasures. Record stories, 
                create AI-powered narratives, and share them with loved ones.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '8px' }}>
                  <strong style={{ color: '#4CAF50' }}>🏡 For Families</strong>
                  <p style={{ fontSize: '14px', marginTop: '5px', marginBottom: '0', color: '#666' }}>
                    Grandparents sharing wisdom, parents capturing milestones
                  </p>
                </div>
                <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '8px' }}>
                  <strong style={{ color: '#2196F3' }}>💝 For Caregivers</strong>
                  <p style={{ fontSize: '14px', marginTop: '5px', marginBottom: '0', color: '#666' }}>
                    Preserve stories before it's too late
                  </p>
                </div>
              </div>
              
              <p style={{ marginTop: '20px', marginBottom: '0', fontSize: '16px', color: '#333' }}>
                <strong>How it works:</strong> Choose an emotion → Record your story → AI transcribes & creates beautiful narratives → Share with family
              </p>
            </div>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setCurrentScreen('record')}
                style={{
                  padding: '15px 30px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Start Recording
              </button>
              <button
                onClick={() => setCurrentScreen('memories')}
                style={{
                  padding: '15px 30px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                View Memories
              </button>
            </div>
          </div>
        )}

        {currentScreen === 'record' && (
          <div>
            <h2>Record a Memory</h2>
            
            <div style={{ marginBottom: '30px' }}>
              <h3>How are you feeling?</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '15px',
                marginTop: '20px'
              }}>
                {emotions.map(({ id: emotion, label, emoji, color }) => (
                  <button
                    key={emotion}
                    onClick={() => setCurrentEmotion(emotion)}
                    style={{
                      padding: '30px 20px',
                      backgroundColor: currentEmotion === emotion ? color : 'white',
                      color: currentEmotion === emotion ? 'white' : '#333',
                      border: currentEmotion === emotion ? 'none' : `2px solid ${color}20`,
                      borderRadius: '16px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      transform: currentEmotion === emotion ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: currentEmotion === emotion 
                        ? `0 8px 20px ${color}40` 
                        : '0 2px 8px rgba(0,0,0,0.08)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      if (currentEmotion !== emotion) {
                        e.currentTarget.style.transform = 'scale(1.02)'
                        e.currentTarget.style.boxShadow = `0 4px 12px ${color}30`
                        e.currentTarget.style.borderColor = `${color}40`
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentEmotion !== emotion) {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
                        e.currentTarget.style.borderColor = `${color}20`
                      }
                    }}
                  >
                    <div style={{ 
                      fontSize: '36px', 
                      marginBottom: '12px',
                      transition: 'transform 0.3s ease',
                      transform: currentEmotion === emotion ? 'scale(1.1) rotate(5deg)' : 'scale(1)'
                    }}>{emoji}</div>
                    <span style={{
                      display: 'block',
                      fontSize: currentEmotion === emotion ? '18px' : '16px',
                      transition: 'font-size 0.3s ease'
                    }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {currentEmotion && (
              <div style={{ 
                backgroundColor: 'white', 
                padding: '30px', 
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3>Record Your Memory</h3>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      backgroundColor: isRecording ? '#ff4444' : '#4CAF50',
                      color: 'white',
                      border: 'none',
                      fontSize: '24px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                    }}
                  >
                    {isRecording ? '⏹️' : '🎤'}
                  </button>
                  <p style={{ marginTop: '10px' }}>
                    {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
                  </p>
                </div>

                {audioBlob && !transcript && (
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <button
                      onClick={transcribeAudio}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Transcribe Audio
                    </button>
                  </div>
                )}

                {transcript && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4>Transcript:</h4>
                    <div style={{ 
                      backgroundColor: '#f5f5f5', 
                      padding: '15px', 
                      borderRadius: '6px',
                      border: '1px solid #ddd'
                    }}>
                      {transcript}
                    </div>
                    <button
                      onClick={saveMemory}
                      style={{
                        marginTop: '15px',
                        padding: '12px 24px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      Save Memory
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentScreen === 'memories' && (
          <div>
            <h2>Your Memories</h2>
            <div style={{ 
              marginBottom: '30px',
              padding: '20px',
              backgroundColor: '#f0f8ff',
              borderRadius: '12px',
              border: '2px dashed #2196F3',
              position: 'relative'
            }}>
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
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '15px'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>🎤 Voice Search</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                    Try saying: "Play grandpa's war story" or "Show happy memories"
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (isListening) {
                      setIsListening(false)
                      setVoiceSearchActive(false)
                    } else {
                      startVoiceSearch()
                    }
                  }}
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
                  {isListening ? '⏹️' : '🎤'}
                </button>
              </div>
              
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
              
              {voiceSearchResults.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4>Search Results:</h4>
                  <p>{voiceSearchResults.length} memories found</p>
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
                      const audio = new Audio(memory.audio)
                      audio.play()
                    }}>
                      <span style={{ marginRight: '10px' }}>
                        {memory.emotion === 'happy' && '😊'}
                        {memory.emotion === 'sad' && '😢'}
                        {memory.emotion === 'grateful' && '🙏'}
                        {memory.emotion === 'excited' && '🎉'}
                      </span>
                      {memory.transcript.substring(0, 50)}...
                      <span style={{ marginLeft: '10px', color: '#2196F3' }}>▶️ Play</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '20px' 
            }}>
              {memories.map(memory => (
                <div key={memory.id} style={{ 
                  backgroundColor: 'white', 
                  padding: '20px', 
                  borderRadius: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <span style={{ fontSize: '24px', marginRight: '10px' }}>
                      {memory.emotion === 'happy' && '😊'}
                      {memory.emotion === 'sad' && '😢'}
                      {memory.emotion === 'grateful' && '🙏'}
                      {memory.emotion === 'excited' && '🎉'}
                    </span>
                    <span style={{ 
                      textTransform: 'capitalize', 
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      {memory.emotion}
                    </span>
                  </div>
                  <p style={{ 
                    marginBottom: '15px', 
                    lineHeight: '1.5',
                    color: '#666'
                  }}>
                    {memory.transcript}
                  </p>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#999',
                    marginBottom: '10px'
                  }}>
                    {new Date(memory.created_at).toLocaleDateString()}
                  </div>
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
                      ▶️ Play Audio
                    </button>
                  )}
                </div>
              ))}
            </div>

            {memories.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <p style={{ fontSize: '18px', color: '#666' }}>
                  No memories yet. Start by recording your first memory!
                </p>
                <button
                  onClick={() => setCurrentScreen('record')}
                  style={{
                    marginTop: '20px',
                    padding: '12px 24px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Record Memory
                </button>
              </div>
            )}
          </div>
        )}

        {currentScreen === 'stories' && (
          <div>
            <h2>AI Generated Stories</h2>
            
            {memories.length > 0 && (
              <div style={{ 
                backgroundColor: 'white', 
                padding: '20px', 
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                marginBottom: '30px'
              }}>
                <h3>Create New Story</h3>
                <p>Select memories to weave into a beautiful narrative:</p>
                <div style={{ marginBottom: '20px' }}>
                  {memories.map(memory => (
                    <label key={memory.id} style={{ 
                      display: 'block', 
                      marginBottom: '10px',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        style={{ marginRight: '10px' }}
                        onChange={(e) => {
                          const selectedIds = Array.from(
                            document.querySelectorAll('input[type="checkbox"]:checked')
                          ).map(cb => cb.value)
                          
                          if (selectedIds.length > 0) {
                            document.getElementById('generateStoryBtn').style.display = 'block'
                          } else {
                            document.getElementById('generateStoryBtn').style.display = 'none'
                          }
                        }}
                        value={memory.id}
                      />
                      <span style={{ marginRight: '10px' }}>
                        {memory.emotion === 'happy' && '😊'}
                        {memory.emotion === 'sad' && '😢'}
                        {memory.emotion === 'grateful' && '🙏'}
                        {memory.emotion === 'excited' && '🎉'}
                      </span>
                      {memory.transcript.substring(0, 100)}...
                    </label>
                  ))}
                </div>
                <button
                  id="generateStoryBtn"
                  onClick={() => {
                    const selectedIds = Array.from(
                      document.querySelectorAll('input[type="checkbox"]:checked')
                    ).map(cb => cb.value)
                    generateStory(selectedIds)
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#9C27B0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'none'
                  }}
                >
                  Generate Story
                </button>
              </div>
            )}

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
              gap: '20px' 
            }}>
              {stories.map(story => (
                <div key={story.id} style={{ 
                  backgroundColor: 'white', 
                  padding: '25px', 
                  borderRadius: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ marginBottom: '15px', color: '#333' }}>
                    Generated Story
                  </h3>
                  <p style={{ 
                    lineHeight: '1.6', 
                    marginBottom: '15px',
                    color: '#555'
                  }}>
                    {story.story_text}
                  </p>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#999',
                    marginBottom: '15px'
                  }}>
                    Created: {new Date(story.created_at).toLocaleDateString()}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666'
                  }}>
                    Based on {story.memory_ids.length} memories
                  </div>
                </div>
              ))}
            </div>

            {stories.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <p style={{ fontSize: '18px', color: '#666' }}>
                  No stories generated yet. Create your first story from your memories!
                </p>
              </div>
            )}
          </div>
        )}

        {currentScreen === 'family' && (
          <div>
            <h2>Family Circle</h2>
            
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3>Invite Family Member</h3>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input
                  type="email"
                  placeholder="Family member's email"
                  id="familyEmail"
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px'
                  }}
                />
                <select
                  id="accessLevel"
                  style={{
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px'
                  }}
                >
                  <option value="selected">Selected Memories</option>
                  <option value="all">All Memories</option>
                  <option value="none">No Access</option>
                </select>
                <button
                  onClick={() => {
                    const email = document.getElementById('familyEmail').value
                    const access = document.getElementById('accessLevel').value
                    if (email) {
                      addFamilyMember(email, access)
                      document.getElementById('familyEmail').value = ''
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Invite
                </button>
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '20px' 
            }}>
              {familyMembers.map(member => (
                <div key={member.id} style={{ 
                  backgroundColor: 'white', 
                  padding: '20px', 
                  borderRadius: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>{member.member_email}</strong>
                  </div>
                  <div style={{ 
                    marginBottom: '10px',
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    Access Level: <span style={{ 
                      textTransform: 'capitalize',
                      color: member.access_level === 'all' ? '#4CAF50' : 
                            member.access_level === 'selected' ? '#FF9800' : '#f44336'
                    }}>
                      {member.access_level}
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#999'
                  }}>
                    Invited: {new Date(member.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>

            {familyMembers.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <p style={{ fontSize: '18px', color: '#666' }}>
                  No family members invited yet. Start building your family circle!
                </p>
              </div>
            )}
          </div>
        )}

        {currentScreen === 'pricing' && (
          <div>
            <h2>Pricing Plans</h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '30px',
              marginTop: '30px'
            }}>
              <div style={{ 
                backgroundColor: 'white', 
                padding: '30px', 
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <h3 style={{ color: '#4CAF50', marginBottom: '10px' }}>Free</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px' }}>
                  $0<span style={{ fontSize: '16px', color: '#666' }}>/month</span>
                </div>
                <ul style={{ textAlign: 'left', marginBottom: '30px' }}>
                  <li>5 memories per month</li>
                  <li>Basic transcription</li>
                  <li>1 family member</li>
                  <li>Standard support</li>
                </ul>
                <button style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}>
                  Current Plan
                </button>
              </div>

              <div style={{ 
                backgroundColor: 'white', 
                padding: '30px', 
                borderRadius: '12px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                textAlign: 'center',
                border: '2px solid #9C27B0',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#9C27B0',
                  color: 'white',
                  padding: '5px 20px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  POPULAR
                </div>
                <h3 style={{ color: '#9C27B0', marginBottom: '10px' }}>Premium</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px' }}>
                  $9.99<span style={{ fontSize: '16px', color: '#666' }}>/month</span>
                </div>
                <ul style={{ textAlign: 'left', marginBottom: '30px' }}>
                  <li>Unlimited memories</li>
                  <li>AI-powered transcription</li>
                  <li>Unlimited family members</li>
                  <li>Story generation</li>
                  <li>Priority support</li>
                  <li>Blockchain backup</li>
                </ul>
                <button style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#9C27B0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}>
                  Upgrade Now
                </button>
              </div>

              <div style={{ 
                backgroundColor: 'white', 
                padding: '30px', 
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <h3 style={{ color: '#FF9800', marginBottom: '10px' }}>Family</h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px' }}>
                  $19.99<span style={{ fontSize: '16px', color: '#666' }}>/month</span>
                </div>
                <ul style={{ textAlign: 'left', marginBottom: '30px' }}>
                  <li>Everything in Premium</li>
                  <li>Up to 10 family accounts</li>
                  <li>Shared family timeline</li>
                  <li>Advanced privacy controls</li>
                  <li>Custom story themes</li>
                  <li>White-glove support</li>
                </ul>
                <button style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}>
                  Choose Family
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App