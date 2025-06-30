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
  const [selectedMemories, setSelectedMemories] = useState([])
  const [generatedStory, setGeneratedStory] = useState('')
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [familyMembers, setFamilyMembers] = useState([])
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [voiceSearchActive, setVoiceSearchActive] = useState(false)
  const [voiceSearchResults, setVoiceSearchResults] = useState([])

  // Authentication state management
  useEffect(() => {
    const initAuth = async () => {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
      setLoading(false)
    }

    initAuth()

    const unsubscribe = authService.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })

    return unsubscribe
  }, [])

  // Load user data when authenticated
  useEffect(() => {
    if (user) {
      loadMemories()
      loadStories()
      loadFamilyMembers()
    }
  }, [user])

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

  const emotions = [
    { emotion: 'happy', emoji: '😊', label: 'Happy', color: '#4CAF50' },
    { emotion: 'sad', emoji: '😢', label: 'Sad', color: '#2196F3' },
    { emotion: 'grateful', emoji: '🙏', label: 'Grateful', color: '#FF9800' },
    { emotion: 'excited', emoji: '🎉', label: 'Excited', color: '#E91E63' }
  ]

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const chunks = []

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' })
        setAudioBlob(blob)
        
        // Simulate transcription (in real app, use speech-to-text service)
        setTimeout(() => {
          setTranscript("This is a simulated transcription of your recorded memory. In a real application, this would be the actual transcribed text from your audio recording.")
        }, 1000)
      }

      mediaRecorder.start()
      setIsRecording(true)

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
          setIsRecording(false)
          stream.getTracks().forEach(track => track.stop())
        }
      }, 30000)

      // Store recorder reference for manual stop
      window.currentRecorder = { mediaRecorder, stream }
    } catch (error) {
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (window.currentRecorder) {
      window.currentRecorder.mediaRecorder.stop()
      window.currentRecorder.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  const saveMemory = async () => {
    if (!user || !currentEmotion || !transcript) {
      alert('Please select an emotion and record audio first.')
      return
    }

    // Create audio URL (in real app, upload to storage)
    const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : null

    const memory = {
      user_id: user.id,
      emotion: currentEmotion,
      transcript: transcript,
      audio_url: audioUrl
    }

    const savedMemory = await memoryService.saveMemory(memory)
    if (savedMemory) {
      alert('Memory saved successfully!')
      setCurrentEmotion('')
      setTranscript('')
      setAudioBlob(null)
      loadMemories()
    } else {
      alert('Failed to save memory. Please try again.')
    }
  }

  const generateStory = async () => {
    if (selectedMemories.length === 0) {
      alert('Please select at least one memory to generate a story.')
      return
    }

    setIsGeneratingStory(true)
    
    // Simulate AI story generation
    setTimeout(() => {
      const selectedMemoryTexts = selectedMemories.map(id => {
        const memory = memories.find(m => m.id === id)
        return memory ? memory.transcript : ''
      }).join(' ')

      const story = `Once upon a time, there were precious moments that shaped a family's journey. ${selectedMemoryTexts} These memories, woven together, tell a beautiful story of love, growth, and the bonds that connect us across time. Each moment, whether filled with joy, reflection, gratitude, or excitement, adds another thread to the rich tapestry of family history that will be treasured for generations to come.`
      
      setGeneratedStory(story)
      setIsGeneratingStory(false)
    }, 3000)
  }

  const saveStory = async () => {
    if (!user || !generatedStory) {
      alert('No story to save.')
      return
    }

    const story = {
      user_id: user.id,
      memory_ids: selectedMemories,
      story_text: generatedStory
    }

    const savedStory = await storyService.saveStory(story)
    if (savedStory) {
      alert('Story saved successfully!')
      setGeneratedStory('')
      setSelectedMemories([])
      loadStories()
    } else {
      alert('Failed to save story. Please try again.')
    }
  }

  const addFamilyMember = async () => {
    if (!user || !newMemberEmail) {
      alert('Please enter an email address.')
      return
    }

    const member = await familyService.addFamilyMember(user.id, newMemberEmail)
    if (member) {
      alert('Family member added successfully!')
      setNewMemberEmail('')
      loadFamilyMembers()
    } else {
      alert('Failed to add family member. They may already be added.')
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
        padding: '20px'
      }}>
        <div style={{ 
          maxWidth: '800px', 
          margin: '0 auto',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
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

          <AuthForm onSignUp={handleSignUp} onSignIn={handleSignIn} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
        padding: '16px 20px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, color: '#333' }}>My Memory Jar</h1>
          
          <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
        {currentScreen === 'welcome' && (
          <div style={{ textAlign: 'center' }}>
            <h2>Welcome back, {user.email}!</h2>
            <p style={{ fontSize: '18px', color: '#666', marginBottom: '40px' }}>
              Ready to capture more precious memories?
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginTop: '40px'
            }}>
              <div style={{ 
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎙️</div>
                <h3>Record Memories</h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Capture precious moments with voice recordings
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
                    fontSize: '16px'
                  }}
                >
                  Start Recording
                </button>
              </div>

              <div style={{ 
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📚</div>
                <h3>Create Stories</h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Generate beautiful narratives from your memories
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
                    fontSize: '16px'
                  }}
                >
                  View Stories
                </button>
              </div>

              <div style={{ 
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>👨‍👩‍👧‍👦</div>
                <h3>Family Circle</h3>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Share memories with your loved ones
                </p>
                <button
                  onClick={() => setCurrentScreen('family')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#FF9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Manage Family
                </button>
              </div>
            </div>
          </div>
        )}

        {currentScreen === 'record' && (
          <div>
            <h2>Record a Memory</h2>
            <p style={{ color: '#666', marginBottom: '30px' }}>
              Choose how you're feeling, then record your story
            </p>

            {/* Emotion Selection */}
            <div style={{ marginBottom: '30px' }}>
              <h3>How are you feeling?</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
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
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <h3>Record Your Story</h3>
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
                      boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                      transition: 'all 0.3s'
                    }}
                  >
                    {isRecording ? '⏹️' : '🎙️'}
                  </button>
                  <p style={{ marginTop: '10px', color: '#666' }}>
                    {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
                  </p>
                </div>

                {transcript && (
                  <div style={{ 
                    backgroundColor: '#f5f5f5',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                  }}>
                    <h4>Transcript:</h4>
                    <p>{transcript}</p>
                  </div>
                )}

                {transcript && (
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
                      width: '100%'
                    }}
                  >
                    Save Memory
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {currentScreen === 'memories' && (
          <div>
            <h2>Your Memories</h2>
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
              @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
              }
            `}</style>
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
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
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
                    <p style={{ color: '#666', marginBottom: '15px' }}>
                      {memory.transcript}
                    </p>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '14px',
                      color: '#999'
                    }}>
                      <span>
                        {new Date(memory.created_at).toLocaleDateString()}
                      </span>
                      {memory.audio_url && (
                        <button
                          onClick={() => {
                            const audio = new Audio(memory.audio_url)
                            audio.play()
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ▶️ Play
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentScreen === 'stories' && (
          <div>
            <h2>AI Generated Stories</h2>
            <p style={{ color: '#666', marginBottom: '30px' }}>
              Create beautiful narratives from your memories
            </p>

            {/* Story Generation */}
            <div style={{ 
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              marginBottom: '30px'
            }}>
              <h3>Create New Story</h3>
              
              {memories.length > 0 ? (
                <>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    Select memories to include in your story:
                  </p>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '15px',
                    marginBottom: '20px'
                  }}>
                    {memories.map(memory => (
                      <label key={memory.id} style={{ 
                        display: 'flex',
                        alignItems: 'flex-start',
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
                              setSelectedMemories([...selectedMemories, memory.id])
                            } else {
                              setSelectedMemories(selectedMemories.filter(id => id !== memory.id))
                            }
                          }}
                          style={{ marginRight: '10px', marginTop: '2px' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                            <span style={{ fontSize: '16px', marginRight: '8px' }}>
                              {memory.emotion === 'happy' && '😊'}
                              {memory.emotion === 'sad' && '😢'}
                              {memory.emotion === 'grateful' && '🙏'}
                              {memory.emotion === 'excited' && '🎉'}
                            </span>
                            <span style={{ fontSize: '12px', color: '#666', textTransform: 'capitalize' }}>
                              {memory.emotion}
                            </span>
                          </div>
                          <p style={{ 
                            fontSize: '14px', 
                            color: '#333',
                            margin: 0,
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
                      padding: '12px 24px',
                      backgroundColor: selectedMemories.length === 0 || isGeneratingStory ? '#ccc' : '#9C27B0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: selectedMemories.length === 0 || isGeneratingStory ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      marginRight: '10px'
                    }}
                  >
                    {isGeneratingStory ? 'Generating Story...' : 'Generate Story'}
                  </button>

                  {generatedStory && (
                    <div style={{ 
                      marginTop: '20px',
                      padding: '20px',
                      backgroundColor: '#f5f0ff',
                      borderRadius: '8px',
                      border: '1px solid #e1bee7'
                    }}>
                      <h4>Generated Story:</h4>
                      <p style={{ lineHeight: '1.6', color: '#333' }}>{generatedStory}</p>
                      <button
                        onClick={saveStory}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#9C27B0',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          marginTop: '10px'
                        }}
                      >
                        Save Story
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                  You need to record some memories first before creating stories.
                  <br />
                  <button
                    onClick={() => setCurrentScreen('record')}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      marginTop: '10px'
                    }}
                  >
                    Record Memories
                  </button>
                </p>
              )}
            </div>

            {/* Saved Stories */}
            <h3>Your Stories</h3>
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
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '15px'
                    }}>
                      <h4 style={{ margin: 0, color: '#9C27B0' }}>
                        Story #{story.id.substring(0, 8)}
                      </h4>
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        {new Date(story.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ 
                      color: '#333',
                      lineHeight: '1.6',
                      marginBottom: '15px'
                    }}>
                      {story.story_text}
                    </p>
                    <div style={{ 
                      fontSize: '12px',
                      color: '#666',
                      borderTop: '1px solid #eee',
                      paddingTop: '10px'
                    }}>
                      Based on {story.memory_ids.length} memories
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentScreen === 'family' && (
          <div>
            <h2>Family Circle</h2>
            <p style={{ color: '#666', marginBottom: '30px' }}>
              Share your memories with loved ones
            </p>

            {/* Add Family Member */}
            <div style={{ 
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              marginBottom: '30px'
            }}>
              <h3>Invite Family Member</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
                <button
                  onClick={addFamilyMember}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#FF9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Invite
                </button>
              </div>
            </div>

            {/* Family Members List */}
            <h3>Family Members</h3>
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
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <h4 style={{ margin: 0, color: '#333' }}>
                        {member.member_email}
                      </h4>
                      <span style={{ 
                        fontSize: '12px',
                        padding: '4px 8px',
                        backgroundColor: member.access_level === 'all' ? '#4CAF50' : 
                                       member.access_level === 'selected' ? '#FF9800' : '#f44336',
                        color: 'white',
                        borderRadius: '12px',
                        textTransform: 'capitalize'
                      }}>
                        {member.access_level}
                      </span>
                    </div>
                    <p style={{ 
                      fontSize: '14px',
                      color: '#666',
                      margin: '0 0 10px 0'
                    }}>
                      Added {new Date(member.created_at).toLocaleDateString()}
                    </p>
                    <select
                      value={member.access_level}
                      onChange={async (e) => {
                        const updated = await familyService.updateFamilyMemberAccess(
                          member.id, 
                          e.target.value
                        )
                        if (updated) {
                          loadFamilyMembers()
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="all">Access to all memories</option>
                      <option value="selected">Access to selected memories</option>
                      <option value="none">No access</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentScreen === 'pricing' && (
          <div>
            <h2>Pricing Plans</h2>
            <p style={{ color: '#666', marginBottom: '40px', textAlign: 'center' }}>
              Choose the perfect plan for your family's memory preservation needs
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
                padding: '40px 30px',
                borderRadius: '16px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                textAlign: 'center',
                border: '2px solid #f0f0f0'
              }}>
                <h3 style={{ color: '#4CAF50', marginBottom: '10px' }}>Free</h3>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#333', marginBottom: '10px' }}>
                  $0
                  <span style={{ fontSize: '18px', color: '#666' }}>/month</span>
                </div>
                <p style={{ color: '#666', marginBottom: '30px' }}>Perfect for getting started</p>
                
                <ul style={{ 
                  listStyle: 'none', 
                  padding: 0, 
                  textAlign: 'left',
                  marginBottom: '30px'
                }}>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Up to 10 memories</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Basic AI story generation</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ 2 family members</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Voice search</li>
                </ul>
                
                <button style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}>
                  Current Plan
                </button>
              </div>

              {/* Premium Plan */}
              <div style={{ 
                backgroundColor: 'white',
                padding: '40px 30px',
                borderRadius: '16px',
                boxShadow: '0 8px 20px rgba(156, 39, 176, 0.15)',
                textAlign: 'center',
                border: '2px solid #9C27B0',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#9C27B0',
                  color: 'white',
                  padding: '6px 20px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  MOST POPULAR
                </div>
                
                <h3 style={{ color: '#9C27B0', marginBottom: '10px' }}>Premium</h3>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#333', marginBottom: '10px' }}>
                  $9.99
                  <span style={{ fontSize: '18px', color: '#666' }}>/month</span>
                </div>
                <p style={{ color: '#666', marginBottom: '30px' }}>For growing families</p>
                
                <ul style={{ 
                  listStyle: 'none', 
                  padding: 0, 
                  textAlign: 'left',
                  marginBottom: '30px'
                }}>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Unlimited memories</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Advanced AI story generation</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Unlimited family members</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Voice search & commands</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Audio story narration</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Blockchain preservation</li>
                </ul>
                
                <button style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#9C27B0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}>
                  Upgrade Now
                </button>
              </div>

              {/* Family Plan */}
              <div style={{ 
                backgroundColor: 'white',
                padding: '40px 30px',
                borderRadius: '16px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                textAlign: 'center',
                border: '2px solid #f0f0f0'
              }}>
                <h3 style={{ color: '#FF9800', marginBottom: '10px' }}>Family</h3>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#333', marginBottom: '10px' }}>
                  $19.99
                  <span style={{ fontSize: '18px', color: '#666' }}>/month</span>
                </div>
                <p style={{ color: '#666', marginBottom: '30px' }}>For large families</p>
                
                <ul style={{ 
                  listStyle: 'none', 
                  padding: 0, 
                  textAlign: 'left',
                  marginBottom: '30px'
                }}>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Everything in Premium</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Multiple family circles</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Advanced sharing controls</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Priority support</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Custom story themes</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Export & backup tools</li>
                </ul>
                
                <button style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}>
                  Choose Family
                </button>
              </div>
            </div>

            <div style={{ 
              textAlign: 'center',
              marginTop: '40px',
              padding: '30px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ color: '#333', marginBottom: '15px' }}>🔒 All Plans Include</h3>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginTop: '20px'
              }}>
                <div>
                  <strong style={{ color: '#4CAF50' }}>🔐 Secure Storage</strong>
                  <p style={{ fontSize: '14px', color: '#666', margin: '5px 0 0 0' }}>
                    End-to-end encryption
                  </p>
                </div>
                <div>
                  <strong style={{ color: '#2196F3' }}>☁️ Cloud Backup</strong>
                  <p style={{ fontSize: '14px', color: '#666', margin: '5px 0 0 0' }}>
                    Never lose your memories
                  </p>
                </div>
                <div>
                  <strong style={{ color: '#FF9800' }}>📱 Mobile Access</strong>
                  <p style={{ fontSize: '14px', color: '#666', margin: '5px 0 0 0' }}>
                    Access anywhere, anytime
                  </p>
                </div>
                <div>
                  <strong style={{ color: '#9C27B0' }}>🎯 AI Powered</strong>
                  <p style={{ fontSize: '14px', color: '#666', margin: '5px 0 0 0' }}>
                    Smart story generation
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// Auth Form Component
function AuthForm({ onSignUp, onSignIn }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isSignUp) {
      onSignUp(email, password)
    } else {
      onSignIn(email, password)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        marginBottom: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        padding: '4px'
      }}>
        <button
          onClick={() => setIsSignUp(false)}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: !isSignUp ? 'white' : 'transparent',
            color: !isSignUp ? '#333' : '#666',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: !isSignUp ? 'bold' : 'normal'
          }}
        >
          Sign In
        </button>
        <button
          onClick={() => setIsSignUp(true)}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: isSignUp ? 'white' : 'transparent',
            color: isSignUp ? '#333' : '#666',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: isSignUp ? 'bold' : 'normal'
          }}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isSignUp ? 'Create Account' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}

export default App