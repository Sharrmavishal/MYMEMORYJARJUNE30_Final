import React, { useState, useEffect } from 'react'
import { supabase, authService, memoryService, storyService, familyService } from './lib/supabase'

function App() {
  const [user, setUser] = useState(null)
  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [currentEmotion, setCurrentEmotion] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [memories, setMemories] = useState([])
  const [stories, setStories] = useState([])
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [selectedMemories, setSelectedMemories] = useState([])
  const [familyMembers, setFamilyMembers] = useState([])
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [shareableLink, setShareableLink] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [voiceSearchActive, setVoiceSearchActive] = useState(false)
  const [voiceSearchResults, setVoiceSearchResults] = useState([])

  const emotions = [
    { emotion: 'happy', emoji: '😊', label: 'Happy', color: '#4CAF50' },
    { emotion: 'sad', emoji: '😢', label: 'Sad', color: '#2196F3' },
    { emotion: 'grateful', emoji: '🙏', label: 'Grateful', color: '#FF9800' },
    { emotion: 'excited', emoji: '🎉', label: 'Excited', color: '#9C27B0' }
  ]

  useEffect(() => {
    // Check for existing session
    authService.getCurrentUser().then(user => {
      if (user) {
        setUser(user)
        setCurrentScreen('record')
        loadUserData(user.id)
      }
    })

    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        setCurrentScreen('record')
        loadUserData(session.user.id)
      } else {
        setUser(null)
        setCurrentScreen('welcome')
      }
    })

    return unsubscribe
  }, [])

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

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')

    try {
      let result
      if (isSignUp) {
        result = await authService.signUp(email, password)
      } else {
        result = await authService.signIn(email, password)
      }

      if (result.error) {
        setAuthError(result.error.message)
      } else if (result.user) {
        setUser(result.user)
        setCurrentScreen('record')
        if (!isSignUp) {
          loadUserData(result.user.id)
        }
      }
    } catch (error) {
      setAuthError('Authentication failed. Please try again.')
    }
  }

  const handleSignOut = async () => {
    await authService.signOut()
    setUser(null)
    setCurrentScreen('welcome')
    setMemories([])
    setStories([])
    setFamilyMembers([])
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

      // Auto-stop after 60 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
          setIsRecording(false)
        }
      }, 60000)

      // Store recorder reference to stop manually
      window.currentRecorder = mediaRecorder
    } catch (error) {
      alert('Microphone access denied. Please allow microphone access to record.')
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

    setIsTranscribing(true)
    
    // Simulate transcription (replace with actual service)
    setTimeout(() => {
      const sampleTranscripts = {
        happy: "Today was such a wonderful day! I spent time with my grandchildren at the park, and we had the most amazing picnic. The sun was shining, and everyone was laughing and playing together. These are the moments that make life so beautiful and meaningful.",
        sad: "I've been thinking a lot about mom lately. It's been a year since she passed, and I still miss her voice, her laugh, and the way she used to make everything better with just a hug. I wish I could tell her about all the things happening in my life.",
        grateful: "I want to take a moment to appreciate all the blessings in my life. My family's health, the roof over our heads, and the simple joy of sharing meals together. Sometimes we forget to acknowledge how much we truly have to be thankful for.",
        excited: "I can hardly contain my excitement! Tomorrow is my daughter's wedding day, and after months of planning, everything is finally coming together. I'm so proud of the woman she's become and can't wait to see her walk down the aisle."
      }
      
      setTranscript(sampleTranscripts[currentEmotion] || "This is a sample transcription of your recorded memory.")
      setIsTranscribing(false)
    }, 2000)
  }

  const saveMemory = async () => {
    if (!user || !currentEmotion || !transcript) return

    const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : null
    
    const memory = {
      user_id: user.id,
      emotion: currentEmotion,
      transcript: transcript,
      audio_url: audioUrl
    }

    const savedMemory = await memoryService.saveMemory(memory)
    
    if (savedMemory) {
      setMemories(prev => [savedMemory, ...prev])
      
      // Reset form
      setCurrentEmotion('')
      setAudioBlob(null)
      setTranscript('')
      
      alert('Memory saved successfully!')
    }
  }

  const shareMemory = (memory) => {
    const shareUrl = `https://mymemoryjar.com/memory/${memory.id}`
    setShareableLink(shareUrl)
    
    if (navigator.share) {
      navigator.share({
        title: 'My Memory',
        text: memory.transcript.substring(0, 100) + '...',
        url: shareUrl
      })
    } else {
      navigator.clipboard.writeText(shareUrl)
      alert('Share link copied to clipboard!')
    }
  }

  const generateStory = async () => {
    if (selectedMemories.length === 0) {
      alert('Please select at least one memory to create a story.')
      return
    }

    setIsGeneratingStory(true)

    // Simulate AI story generation
    setTimeout(() => {
      const selectedMemoryData = memories.filter(m => selectedMemories.includes(m.id))
      const emotions = selectedMemoryData.map(m => m.emotion)
      const transcripts = selectedMemoryData.map(m => m.transcript)

      let storyText = "Once upon a time, in the tapestry of life, there were moments that defined a journey filled with "

      if (emotions.includes('happy')) {
        storyText += "joy and laughter, "
      }
      if (emotions.includes('sad')) {
        storyText += "reflection and growth, "
      }
      if (emotions.includes('grateful')) {
        storyText += "appreciation and thankfulness, "
      }
      if (emotions.includes('excited')) {
        storyText += "anticipation and celebration, "
      }

      storyText += "creating a beautiful narrative of human experience.\n\n"
      storyText += transcripts.join('\n\n')
      storyText += "\n\nThese memories, woven together, tell the story of a life well-lived, full of emotion, connection, and meaning. Each moment captured here represents not just an event, but a piece of the heart that makes us who we are."

      const newStory = {
        user_id: user.id,
        memory_ids: selectedMemories,
        story_text: storyText,
        audio_url: null
      }

      storyService.saveStory(newStory).then(savedStory => {
        if (savedStory) {
          setStories(prev => [savedStory, ...prev])
          setSelectedMemories([])
          setIsGeneratingStory(false)
          alert('Story generated successfully!')
        }
      })
    }, 3000)
  }

  const addFamilyMember = async () => {
    if (!newMemberEmail.trim()) {
      alert('Please enter an email address.')
      return
    }

    const member = await familyService.addFamilyMember(user.id, newMemberEmail.trim())
    
    if (member) {
      setFamilyMembers(prev => [member, ...prev])
      setNewMemberEmail('')
      alert('Family member added successfully!')
    } else {
      alert('Failed to add family member. They may already be in your family circle.')
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

  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ 
          maxWidth: '500px', 
          width: '100%',
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
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
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px'
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
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            {authError && (
              <div style={{ 
                color: '#ff4444', 
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: '#fff5f5',
                borderRadius: '4px',
                border: '1px solid #ffebee'
              }}>
                {authError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '15px'
              }}
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'transparent',
                color: '#4CAF50',
                border: '1px solid #4CAF50',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
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
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, color: '#333' }}>My Memory Jar</h1>
          
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
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        
        {/* Record Screen */}
        {currentScreen === 'record' && (
          <div>
            <h2>Record a Memory</h2>
            <p style={{ marginBottom: '30px', color: '#666' }}>
              Choose how you're feeling, then record your story
            </p>

            {/* Emotion Selection */}
            <div style={{ marginBottom: '40px' }}>
              <h3>How are you feeling?</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginTop: '20px'
              }}>
                {emotions.map(({ emotion, emoji, label, color }) => (
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

            {/* Recording Section */}
            {currentEmotion && (
              <div style={{ 
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                <h3>Record Your Story</h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Press the microphone to start recording (max 60 seconds)
                </p>

                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      disabled={!currentEmotion}
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        backgroundColor: currentEmotion ? '#ff4444' : '#ccc',
                        color: 'white',
                        border: 'none',
                        fontSize: '40px',
                        cursor: currentEmotion ? 'pointer' : 'not-allowed',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                        transition: 'all 0.3s'
                      }}
                    >
                      🎤
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        backgroundColor: '#333',
                        color: 'white',
                        border: 'none',
                        fontSize: '40px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }}
                    >
                      ⏹️
                    </button>
                  )}
                </div>

                {isRecording && (
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <p style={{ color: '#ff4444', fontSize: '18px', fontWeight: 'bold' }}>
                      Recording... Speak now!
                    </p>
                  </div>
                )}

                {audioBlob && !isRecording && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ color: '#4CAF50', marginBottom: '10px' }}>✅ Recording complete!</p>
                    <audio controls src={URL.createObjectURL(audioBlob)} style={{ width: '100%' }} />
                    
                    <button
                      onClick={transcribeAudio}
                      disabled={isTranscribing}
                      style={{
                        marginTop: '15px',
                        padding: '12px 24px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isTranscribing ? 'not-allowed' : 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      {isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}
                    </button>
                  </div>
                )}

                {transcript && (
                  <div style={{ marginTop: '20px' }}>
                    <h4>Transcript:</h4>
                    <div style={{ 
                      backgroundColor: '#f5f5f5',
                      padding: '15px',
                      borderRadius: '8px',
                      marginBottom: '20px'
                    }}>
                      <p>{transcript}</p>
                    </div>

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
                        fontWeight: 'bold'
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

        {/* Memories Screen */}
        {currentScreen === 'memories' && (
          <div>
            <h2>Your Memories</h2>
            <div style={{ 
              marginBottom: '30px',
              padding: '20px',
              backgroundColor: '#f0f8ff',
              borderRadius: '12px',
              border: '2px dashed #2196F3'
            }}>
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
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: isListening ? '#ff4444' : '#2196F3',
                    color: 'white',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s'
                  }}
                >
                  {isListening ? '⏹️' : '🎤'}
                </button>
              </div>
              
              {isListening && (
                <div style={{ 
                  textAlign: 'center',
                  padding: '20px',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}>
                  <p style={{ fontSize: '18px', color: '#2196F3' }}>
                    Listening...
                  </p>
                </div>
              )}
              
              {voiceSearchResults.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4>Search Results:</h4>
                  <p>{voiceSearchResults.length} memories found</p>
                  {voiceSearchResults.map(memory => (
                    <div key={memory.id} style={{ 
                      padding: '10px',
                      marginTop: '10px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      cursor: 'pointer'
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

            {memories.length === 0 ? (
              <div style={{ 
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                <p style={{ fontSize: '18px', color: '#666' }}>No memories yet.</p>
                <button
                  onClick={() => setCurrentScreen('record')}
                  style={{
                    marginTop: '20px',
                    padding: '12px 24px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Record Your First Memory
                </button>
              </div>
            ) : (
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
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '15px'
                    }}>
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
                      color: '#555'
                    }}>
                      {memory.transcript.substring(0, 150)}...
                    </p>
                    
                    {memory.audio_url && (
                      <audio 
                        controls 
                        src={memory.audio_url}
                        style={{ width: '100%', marginBottom: '15px' }}
                      />
                    )}
                    
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <small style={{ color: '#999' }}>
                        {new Date(memory.created_at).toLocaleDateString()}
                      </small>
                      
                      <button
                        onClick={() => shareMemory(memory)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Share
                      </button>
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
            <h2>AI-Generated Stories</h2>
            <p style={{ marginBottom: '30px', color: '#666' }}>
              Create beautiful narratives from your memories
            </p>

            {/* Story Generation */}
            <div style={{ 
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3>Create New Story</h3>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                Select memories to weave into a story
              </p>

              <div style={{ marginBottom: '20px' }}>
                <h4>Select Memories:</h4>
                {memories.length === 0 ? (
                  <p style={{ color: '#999' }}>No memories available. Record some memories first!</p>
                ) : (
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '15px',
                    marginTop: '15px'
                  }}>
                    {memories.map(memory => (
                      <label key={memory.id} style={{ 
                        display: 'flex',
                        alignItems: 'flex-start',
                        padding: '15px',
                        backgroundColor: selectedMemories.includes(memory.id) ? '#e8f5e8' : '#f5f5f5',
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
                          style={{ marginRight: '10px', marginTop: '2px' }}
                        />
                        <div>
                          <div style={{ marginBottom: '5px' }}>
                            <span style={{ fontSize: '18px', marginRight: '8px' }}>
                              {memory.emotion === 'happy' && '😊'}
                              {memory.emotion === 'sad' && '😢'}
                              {memory.emotion === 'grateful' && '🙏'}
                              {memory.emotion === 'excited' && '🎉'}
                            </span>
                            <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                              {memory.emotion}
                            </span>
                          </div>
                          <p style={{ 
                            margin: 0,
                            fontSize: '14px',
                            color: '#666',
                            lineHeight: '1.4'
                          }}>
                            {memory.transcript.substring(0, 100)}...
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={generateStory}
                disabled={selectedMemories.length === 0 || isGeneratingStory}
                style={{
                  padding: '12px 24px',
                  backgroundColor: selectedMemories.length > 0 ? '#9C27B0' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: selectedMemories.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {isGeneratingStory ? 'Generating Story...' : 'Generate Story'}
              </button>
            </div>

            {/* Stories List */}
            {stories.length === 0 ? (
              <div style={{ 
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                <p style={{ fontSize: '18px', color: '#666' }}>No stories created yet.</p>
              </div>
            ) : (
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
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                  }}>
                    <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>
                      Generated Story
                    </h4>
                    
                    <div style={{ 
                      backgroundColor: '#f8f9fa',
                      padding: '20px',
                      borderRadius: '8px',
                      marginBottom: '15px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      lineHeight: '1.6'
                    }}>
                      <p style={{ margin: 0, whiteSpace: 'pre-line' }}>
                        {story.story_text}
                      </p>
                    </div>
                    
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <small style={{ color: '#999' }}>
                        {new Date(story.created_at).toLocaleDateString()}
                      </small>
                      
                      <button
                        onClick={() => {
                          const shareUrl = `https://mymemoryjar.com/story/${story.id}`
                          if (navigator.share) {
                            navigator.share({
                              title: 'My Story',
                              text: story.story_text.substring(0, 100) + '...',
                              url: shareUrl
                            })
                          } else {
                            navigator.clipboard.writeText(shareUrl)
                            alert('Story link copied to clipboard!')
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#9C27B0',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Share Story
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Family Screen */}
        {currentScreen === 'family' && (
          <div>
            <h2>Family Circle</h2>
            <p style={{ marginBottom: '30px', color: '#666' }}>
              Share your memories with loved ones
            </p>

            {/* Add Family Member */}
            <div style={{ 
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3>Invite Family Member</h3>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
                <button
                  onClick={addFamilyMember}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  Invite
                </button>
              </div>
            </div>

            {/* Family Members List */}
            {familyMembers.length === 0 ? (
              <div style={{ 
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                <p style={{ fontSize: '18px', color: '#666' }}>No family members added yet.</p>
              </div>
            ) : (
              <div style={{ 
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                overflow: 'hidden'
              }}>
                <h3 style={{ padding: '20px', margin: 0, borderBottom: '1px solid #eee' }}>
                  Family Members
                </h3>
                {familyMembers.map(member => (
                  <div key={member.id} style={{ 
                    padding: '20px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                        {member.member_email}
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                        Access Level: <span style={{ textTransform: 'capitalize' }}>{member.access_level}</span>
                      </p>
                    </div>
                    
                    <select
                      value={member.access_level}
                      onChange={(e) => familyService.updateFamilyMemberAccess(member.id, e.target.value)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="all">All Memories</option>
                      <option value="selected">Selected Only</option>
                      <option value="none">No Access</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pricing Screen */}
        {currentScreen === 'pricing' && (
          <div>
            <h2>Pricing Plans</h2>
            <p style={{ marginBottom: '40px', color: '#666', textAlign: 'center' }}>
              Choose the perfect plan for preserving your family memories
            </p>

            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '30px',
              maxWidth: '1000px',
              margin: '0 auto'
            }}>
              {/* Free Plan */}
              <div style={{ 
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                textAlign: 'center',
                border: '2px solid transparent'
              }}>
                <h3 style={{ marginTop: 0, color: '#333' }}>Free</h3>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#4CAF50', marginBottom: '10px' }}>
                  $0<span style={{ fontSize: '18px', fontWeight: 'normal' }}>/month</span>
                </div>
                <ul style={{ textAlign: 'left', marginBottom: '30px', paddingLeft: '20px' }}>
                  <li>5 memories per month</li>
                  <li>Basic transcription</li>
                  <li>1 AI story per month</li>
                  <li>Share with 2 family members</li>
                </ul>
                <button style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}>
                  Current Plan
                </button>
              </div>

              {/* Premium Plan */}
              <div style={{ 
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                textAlign: 'center',
                border: '2px solid #9C27B0',
                position: 'relative',
                transform: 'scale(1.05)'
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
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  POPULAR
                </div>
                <h3 style={{ marginTop: '10px', color: '#333' }}>Premium</h3>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#9C27B0', marginBottom: '10px' }}>
                  $9.99<span style={{ fontSize: '18px', fontWeight: 'normal' }}>/month</span>
                </div>
                <ul style={{ textAlign: 'left', marginBottom: '30px', paddingLeft: '20px' }}>
                  <li>Unlimited memories</li>
                  <li>Advanced AI transcription</li>
                  <li>Unlimited AI stories</li>
                  <li>Share with unlimited family</li>
                  <li>Voice search</li>
                  <li>Blockchain backup</li>
                  <li>Priority support</li>
                </ul>
                <button style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#9C27B0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}>
                  Upgrade Now
                </button>
              </div>

              {/* Family Plan */}
              <div style={{ 
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                textAlign: 'center',
                border: '2px solid transparent'
              }}>
                <h3 style={{ marginTop: 0, color: '#333' }}>Family</h3>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#FF9800', marginBottom: '10px' }}>
                  $19.99<span style={{ fontSize: '18px', fontWeight: 'normal' }}>/month</span>
                </div>
                <ul style={{ textAlign: 'left', marginBottom: '30px', paddingLeft: '20px' }}>
                  <li>Everything in Premium</li>
                  <li>Up to 6 family accounts</li>
                  <li>Shared family timeline</li>
                  <li>Advanced privacy controls</li>
                  <li>Family collaboration tools</li>
                  <li>Dedicated family support</li>
                </ul>
                <button style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}>
                  Choose Family
                </button>
              </div>
            </div>

            {/* Features Comparison */}
            <div style={{ 
              marginTop: '60px',
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ textAlign: 'center', marginBottom: '30px' }}>Why Choose Premium?</h3>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎤</div>
                  <h4>Voice Search</h4>
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    Find memories instantly with natural voice commands
                  </p>
                </div>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔗</div>
                  <h4>Blockchain Backup</h4>
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    Permanent, tamper-proof storage on Algorand blockchain
                  </p>
                </div>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>👨‍👩‍👧‍👦</div>
                  <h4>Unlimited Sharing</h4>
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    Connect with your entire extended family network
                  </p>
                </div>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>🤖</div>
                  <h4>Advanced AI</h4>
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    Better transcription and unlimited story generation
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Screen for logged in users */}
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

            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '40px'
            }}>
              <div style={{ 
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎤</div>
                <h3>Record Memories</h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Capture precious moments with high-quality audio recording
                </p>
                <button
                  onClick={() => setCurrentScreen('record')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  Start Recording
                </button>
              </div>

              <div style={{ 
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📚</div>
                <h3>View Memories</h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Browse and listen to your collection of recorded memories
                </p>
                <button
                  onClick={() => setCurrentScreen('memories')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  View Memories
                </button>
              </div>

              <div style={{ 
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>✨</div>
                <h3>Create Stories</h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Let AI weave your memories into beautiful narratives
                </p>
                <button
                  onClick={() => setCurrentScreen('stories')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#9C27B0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  Generate Stories
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ 
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              marginBottom: '40px'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Your Memory Collection</h3>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '20px',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' }}>
                    {memories.length}
                  </div>
                  <div style={{ color: '#666' }}>Memories</div>
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#9C27B0' }}>
                    {stories.length}
                  </div>
                  <div style={{ color: '#666' }}>Stories</div>
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2196F3' }}>
                    {familyMembers.length}
                  </div>
                  <div style={{ color: '#666' }}>Family Members</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ 
        backgroundColor: 'white',
        padding: '40px 20px',
        borderTop: '1px solid #eee',
        marginTop: '60px'
      }}>
        <div style={{ 
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#333' }}>My Memory Jar</h3>
          <p style={{ color: '#666', marginBottom: '30px' }}>
            Preserving family stories for future generations
          </p>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '10px',
            flexWrap: 'wrap',
            marginTop: '20px'
          }}>
            <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
              ⚡ Powered by Vite
            </span>
            <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
              ⚛️ Built with React
            </span>
            <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
              🗄️ Supabase Database
            </span>
            <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
              🌐 Entri Domain
            </span>
          </div>
          
          <div style={{ 
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid #eee',
            color: '#999',
            fontSize: '14px'
          }}>
            <p>© 2024 My Memory Jar. Made with ❤️ for families everywhere.</p>
          </div>
        </div>
      </footer>

      {/* Share Link Modal */}
      {shareableLink && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3>Share Your Memory</h3>
            <p style={{ marginBottom: '15px' }}>Copy this link to share:</p>
            <input
              type="text"
              value={shareableLink}
              readOnly
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '20px'
              }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareableLink)
                  alert('Link copied!')
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Copy Link
              </button>
              <button
                onClick={() => setShareableLink('')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ccc',
                  color: '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default App