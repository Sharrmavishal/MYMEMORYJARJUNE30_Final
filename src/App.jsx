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
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [currentEmotion, setCurrentEmotion] = useState('')
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  
  // Voice search state
  const [isListening, setIsListening] = useState(false)
  const [voiceSearchActive, setVoiceSearchActive] = useState(false)
  const [voiceSearchResults, setVoiceSearchResults] = useState([])
  
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
  
  // Refs
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recognitionRef = useRef(null)

  // Emotion options
  const emotions = [
    { key: 'happy', label: 'Happy', emoji: '😊', color: '#4CAF50' },
    { key: 'sad', label: 'Sad', emoji: '😢', color: '#2196F3' },
    { key: 'grateful', label: 'Grateful', emoji: '🙏', color: '#FF9800' },
    { key: 'excited', label: 'Excited', emoji: '🎉', color: '#E91E63' }
  ]

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setLoading(false)
      
      if (session?.user) {
        loadUserData(session.user.id)
        if (currentScreen === 'welcome') {
          setCurrentScreen('memories')
        }
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
      }
    } catch (error) {
      setAuthError('An unexpected error occurred')
    }
  }

  const handleSignOut = async () => {
    await authService.signOut()
    setCurrentScreen('welcome')
    setMemories([])
    setStories([])
    setFamilyMembers([])
  }

  // Recording functions
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
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async () => {
    if (!audioBlob) return

    setIsTranscribing(true)
    
    // Simulate transcription (replace with actual service)
    setTimeout(() => {
      setTranscript("This is a sample transcription of your recorded memory. In a real implementation, this would be the actual transcribed text from your audio recording.")
      setIsTranscribing(false)
    }, 2000)
  }

  const saveMemory = async () => {
    if (!user || !currentEmotion || !transcript) return

    try {
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
        setTranscript('')
        setAudioBlob(null)
        
        alert('Memory saved successfully!')
        setCurrentScreen('memories')
      }
    } catch (error) {
      console.error('Error saving memory:', error)
      alert('Failed to save memory')
    }
  }

  // Voice search functions
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice search not supported in this browser')
      return
    }

    const recognition = new webkitSpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      setVoiceSearchActive(true)
    }

    recognition.onresult = (event) => {
      const searchTerm = event.results[0][0].transcript.toLowerCase()
      const results = memories.filter(memory => 
        memory.transcript.toLowerCase().includes(searchTerm) ||
        memory.emotion.toLowerCase().includes(searchTerm)
      )
      setVoiceSearchResults(results)
    }

    recognition.onerror = () => {
      setIsListening(false)
      setVoiceSearchActive(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const clearVoiceSearch = () => {
    setVoiceSearchActive(false)
    setVoiceSearchResults([])
    setIsListening(false)
  }

  // Story generation functions
  const generateStory = async () => {
    if (selectedMemories.length === 0) return

    setIsGeneratingStory(true)
    
    // Simulate AI story generation
    setTimeout(() => {
      const storyText = `Once upon a time, there were precious moments that brought joy and meaning to life. ${selectedMemories.map(m => `There was a time filled with ${m.emotion} feelings, where ${m.transcript.substring(0, 100)}...`).join(' ')} These memories, woven together, tell the beautiful story of a life well-lived and moments well-cherished.`
      
      setGeneratedStory(storyText)
      setIsGeneratingStory(false)
    }, 3000)
  }

  const saveStory = async () => {
    if (!user || !generatedStory) return

    try {
      const story = {
        user_id: user.id,
        memory_ids: selectedMemories.map(m => m.id),
        story_text: generatedStory
      }

      const savedStory = await storyService.saveStory(story)
      if (savedStory) {
        setStories(prev => [savedStory, ...prev])
        setGeneratedStory('')
        setSelectedMemories([])
        alert('Story saved successfully!')
      }
    } catch (error) {
      console.error('Error saving story:', error)
      alert('Failed to save story')
    }
  }

  // Family management functions
  const addFamilyMember = async () => {
    if (!user || !newMemberEmail) return

    setIsAddingMember(true)
    try {
      const member = await familyService.addFamilyMember(user.id, newMemberEmail)
      if (member) {
        setFamilyMembers(prev => [member, ...prev])
        setNewMemberEmail('')
        alert('Family member added successfully!')
      }
    } catch (error) {
      console.error('Error adding family member:', error)
      alert('Failed to add family member')
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
      alert('Failed to update member access')
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
          <div style={{ fontSize: '80px', marginBottom: '30px' }}>🏺</div>
          <h1 style={{ 
            fontSize: '32px', 
            marginBottom: '20px',
            color: '#333',
            fontWeight: 'bold'
          }}>
            Memory Jar
          </h1>
          <p style={{ 
            fontSize: '18px', 
            color: '#666', 
            marginBottom: '40px',
            lineHeight: '1.6'
          }}>
            Transform precious moments into lasting digital treasures. Record stories 
            while you can, preserve them forever, and share them with loved ones.
          </p>
          
          {!user ? (
            <div>
              <div style={{ marginBottom: '30px' }}>
                <button
                  onClick={() => setAuthMode('signin')}
                  style={{
                    padding: '12px 24px',
                    margin: '0 10px',
                    backgroundColor: authMode === 'signin' ? '#667eea' : 'transparent',
                    color: authMode === 'signin' ? 'white' : '#667eea',
                    border: '2px solid #667eea',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthMode('signup')}
                  style={{
                    padding: '12px 24px',
                    margin: '0 10px',
                    backgroundColor: authMode === 'signup' ? '#667eea' : 'transparent',
                    color: authMode === 'signup' ? 'white' : '#667eea',
                    border: '2px solid #667eea',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  Sign Up
                </button>
              </div>
              
              <form onSubmit={handleAuth} style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
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
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
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
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                {authError && (
                  <p style={{ color: '#f44336', marginBottom: '20px', fontSize: '14px' }}>
                    {authError}
                  </p>
                )}
                
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setCurrentScreen('memories')}
              style={{
                padding: '16px 32px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Enter Memory Jar
            </button>
          )}
        </div>
      </div>
    )
  }

  // Navigation Header
  const renderHeader = () => (
    <div style={{
      backgroundColor: 'white',
      padding: '20px',
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '32px', marginRight: '15px' }}>🏺</span>
        <h1 style={{ fontSize: '24px', color: '#333', margin: 0 }}>Memory Jar</h1>
      </div>
      
      <div style={{ display: 'flex', gap: '15px' }}>
        <button
          onClick={() => setCurrentScreen('memories')}
          style={{
            padding: '10px 20px',
            backgroundColor: currentScreen === 'memories' ? '#667eea' : 'transparent',
            color: currentScreen === 'memories' ? 'white' : '#667eea',
            border: '2px solid #667eea',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Memories
        </button>
        <button
          onClick={() => setCurrentScreen('record')}
          style={{
            padding: '10px 20px',
            backgroundColor: currentScreen === 'record' ? '#4CAF50' : 'transparent',
            color: currentScreen === 'record' ? 'white' : '#4CAF50',
            border: '2px solid #4CAF50',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Record
        </button>
        <button
          onClick={() => setCurrentScreen('stories')}
          style={{
            padding: '10px 20px',
            backgroundColor: currentScreen === 'stories' ? '#9C27B0' : 'transparent',
            color: currentScreen === 'stories' ? 'white' : '#9C27B0',
            border: '2px solid #9C27B0',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Stories
        </button>
        <button
          onClick={() => setCurrentScreen('family')}
          style={{
            padding: '10px 20px',
            backgroundColor: currentScreen === 'family' ? '#FF9800' : 'transparent',
            color: currentScreen === 'family' ? 'white' : '#FF9800',
            border: '2px solid #FF9800',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Family
        </button>
        <button
          onClick={handleSignOut}
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            color: '#f44336',
            border: '2px solid #f44336',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )

  // Record Screen
  if (currentScreen === 'record') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        {renderHeader()}
        
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              fontSize: '28px', 
              marginBottom: '30px', 
              textAlign: 'center',
              color: '#333'
            }}>
              Record a New Memory
            </h2>
            
            {/* Emotion Selection */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '20px', color: '#333' }}>
                How are you feeling?
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '15px'
              }}>
                {emotions.map(({ key, label, emoji, color }) => (
                  <button
                    key={key}
                    onClick={() => setCurrentEmotion(key)}
                    style={{
                      padding: '30px 20px',
                      backgroundColor: currentEmotion === key ? color : 'white',
                      color: currentEmotion === key ? 'white' : '#333',
                      border: currentEmotion === key ? 'none' : `2px solid ${color}20`,
                      borderRadius: '16px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      transform: currentEmotion === key ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: currentEmotion === key 
                        ? `0 8px 20px ${color}40` 
                        : '0 2px 8px rgba(0,0,0,0.08)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      if (currentEmotion !== key) {
                        e.currentTarget.style.transform = 'scale(1.02)'
                        e.currentTarget.style.boxShadow = `0 4px 12px ${color}30`
                        e.currentTarget.style.borderColor = `${color}40`
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentEmotion !== key) {
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
                      transform: currentEmotion === key ? 'scale(1.1) rotate(5deg)' : 'scale(1)'
                    }}>{emoji}</div>
                    <span style={{
                      display: 'block',
                      fontSize: currentEmotion === key ? '18px' : '16px',
                      transition: 'font-size 0.3s ease'
                    }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recording Section */}
            <div style={{ marginBottom: '40px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '20px', color: '#333' }}>
                Record Your Memory
              </h3>
              
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={!currentEmotion}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    backgroundColor: currentEmotion ? '#f44336' : '#ccc',
                    color: 'white',
                    border: 'none',
                    fontSize: '48px',
                    cursor: currentEmotion ? 'pointer' : 'not-allowed',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s'
                  }}
                >
                  🎙️
                </button>
              ) : (
                <div>
                  <button
                    onClick={stopRecording}
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      backgroundColor: '#666',
                      color: 'white',
                      border: 'none',
                      fontSize: '48px',
                      cursor: 'pointer',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }}
                  >
                    ⏹️
                  </button>
                  <p style={{ marginTop: '20px', fontSize: '18px', color: '#f44336' }}>
                    Recording... Click to stop
                  </p>
                </div>
              )}
              
              {!currentEmotion && (
                <p style={{ marginTop: '15px', color: '#666', fontSize: '14px' }}>
                  Please select an emotion first
                </p>
              )}
            </div>

            {/* Audio Playback */}
            {audioBlob && (
              <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                <h4 style={{ marginBottom: '15px', color: '#333' }}>Your Recording</h4>
                <audio 
                  controls 
                  src={URL.createObjectURL(audioBlob)}
                  style={{ width: '100%', maxWidth: '400px' }}
                />
                <div style={{ marginTop: '15px' }}>
                  <button
                    onClick={transcribeAudio}
                    disabled={isTranscribing}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      marginRight: '10px'
                    }}
                  >
                    {isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}
                  </button>
                </div>
              </div>
            )}

            {/* Transcript */}
            {transcript && (
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ marginBottom: '15px', color: '#333' }}>Transcript</h4>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '15px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    resize: 'vertical'
                  }}
                  placeholder="Edit your transcript here..."
                />
              </div>
            )}

            {/* Save Button */}
            {currentEmotion && transcript && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={saveMemory}
                  style={{
                    padding: '16px 32px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '18px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
                  }}
                >
                  Save Memory
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Memories Screen
  if (currentScreen === 'memories') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        {renderHeader()}
        
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '30px'
          }}>
            <h2 style={{ fontSize: '28px', color: '#333', margin: 0 }}>
              Your Memories ({memories.length})
            </h2>
            
            {/* Voice Search */}
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
                onClick={voiceSearchActive ? clearVoiceSearch : startVoiceSearch}
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
                {voiceSearchActive ? '✕' : '🎤'}
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
          {voiceSearchActive && voiceSearchResults.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '15px', color: '#333' }}>
                Voice Search Results
              </h3>
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
                  const audio = new Audio(memory.audio_url)
                  audio.play()
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '24px', marginRight: '10px' }}>
                      {emotions.find(e => e.key === memory.emotion)?.emoji}
                    </span>
                    <span style={{ 
                      backgroundColor: emotions.find(e => e.key === memory.emotion)?.color,
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {memory.emotion}
                    </span>
                  </div>
                  <p style={{ margin: '0', color: '#333', lineHeight: '1.5' }}>
                    {memory.transcript}
                  </p>
                  <p style={{ 
                    margin: '10px 0 0 0', 
                    fontSize: '12px', 
                    color: '#666' 
                  }}>
                    {new Date(memory.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Memories Grid */}
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '20px'
            }}>
              {memories.map(memory => (
                <div key={memory.id} style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <span style={{ fontSize: '32px', marginRight: '15px' }}>
                      {emotions.find(e => e.key === memory.emotion)?.emoji}
                    </span>
                    <div>
                      <span style={{ 
                        backgroundColor: emotions.find(e => e.key === memory.emotion)?.color,
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        {memory.emotion}
                      </span>
                      <p style={{ 
                        margin: '5px 0 0 0', 
                        fontSize: '12px', 
                        color: '#666' 
                      }}>
                        {new Date(memory.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <p style={{ 
                    margin: '0 0 15px 0', 
                    color: '#333', 
                    lineHeight: '1.6',
                    fontSize: '15px'
                  }}>
                    {memory.transcript}
                  </p>
                  
                  {memory.audio_url && (
                    <audio 
                      controls 
                      src={memory.audio_url}
                      style={{ width: '100%', height: '40px' }}
                    />
                  )}
                  
                  {memory.blockchain_tx && (
                    <div style={{ 
                      marginTop: '10px',
                      padding: '8px',
                      backgroundColor: '#e8f5e8',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}>
                      <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                        ⛓️ Blockchain Verified
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Stories Screen
  if (currentScreen === 'stories') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        {renderHeader()}
        
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', marginBottom: '30px', color: '#333' }}>
            AI Generated Stories
          </h2>
          
          {/* Story Generation Section */}
          {memories.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              marginBottom: '30px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '20px', marginBottom: '20px', color: '#333' }}>
                Create New Story
              </h3>
              
              <p style={{ marginBottom: '20px', color: '#666' }}>
                Select memories to weave into an AI-generated story:
              </p>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '15px',
                marginBottom: '20px'
              }}>
                {memories.map(memory => (
                  <div 
                    key={memory.id}
                    onClick={() => {
                      setSelectedMemories(prev => 
                        prev.find(m => m.id === memory.id)
                          ? prev.filter(m => m.id !== memory.id)
                          : [...prev, memory]
                      )
                    }}
                    style={{
                      padding: '15px',
                      backgroundColor: selectedMemories.find(m => m.id === memory.id) 
                        ? '#e3f2fd' : '#f9f9f9',
                      border: selectedMemories.find(m => m.id === memory.id)
                        ? '2px solid #2196F3' : '2px solid transparent',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '20px', marginRight: '10px' }}>
                        {emotions.find(e => e.key === memory.emotion)?.emoji}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                        {memory.emotion}
                      </span>
                    </div>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '14px', 
                      color: '#666',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {memory.transcript}
                    </p>
                  </div>
                ))}
              </div>
              
              <div style={{ textAlign: 'center' }}>
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
                    fontWeight: '600'
                  }}
                >
                  {isGeneratingStory ? 'Generating Story...' : `Generate Story (${selectedMemories.length} memories)`}
                </button>
              </div>
              
              {generatedStory && (
                <div style={{ 
                  marginTop: '30px',
                  padding: '20px',
                  backgroundColor: '#f5f0ff',
                  borderRadius: '8px',
                  border: '1px solid #e1bee7'
                }}>
                  <h4 style={{ marginBottom: '15px', color: '#333' }}>Generated Story</h4>
                  <p style={{ 
                    lineHeight: '1.8', 
                    color: '#333',
                    fontSize: '16px',
                    marginBottom: '20px'
                  }}>
                    {generatedStory}
                  </p>
                  <button
                    onClick={saveStory}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Save Story
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Saved Stories */}
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
                  borderRadius: '12px',
                  padding: '25px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '15px' 
                  }}>
                    <span style={{ fontSize: '24px', marginRight: '10px' }}>📖</span>
                    <div>
                      <p style={{ 
                        margin: '0', 
                        fontSize: '12px', 
                        color: '#666' 
                      }}>
                        {new Date(story.created_at).toLocaleDateString()}
                      </p>
                      <p style={{ 
                        margin: '2px 0 0 0', 
                        fontSize: '12px', 
                        color: '#9C27B0',
                        fontWeight: 'bold'
                      }}>
                        {story.memory_ids.length} memories woven together
                      </p>
                    </div>
                  </div>
                  
                  <p style={{ 
                    margin: '0', 
                    color: '#333', 
                    lineHeight: '1.7',
                    fontSize: '15px'
                  }}>
                    {story.story_text}
                  </p>
                  
                  {story.audio_url && (
                    <div style={{ marginTop: '15px' }}>
                      <audio 
                        controls 
                        src={story.audio_url}
                        style={{ width: '100%', height: '40px' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    )
  }

  // Family Screen
  if (currentScreen === 'family') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        {renderHeader()}
        
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', marginBottom: '30px', color: '#333' }}>
            Family Circle
          </h2>
          
          {/* Add Family Member */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            marginBottom: '30px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '20px', marginBottom: '20px', color: '#333' }}>
              Invite Family Member
            </h3>
            
            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: '#333'
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
                  backgroundColor: newMemberEmail ? '#FF9800' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: newMemberEmail ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}
              >
                {isAddingMember ? 'Adding...' : 'Invite'}
              </button>
            </div>
          </div>
          
          {/* Family Members List */}
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
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '20px', marginBottom: '20px', color: '#333' }}>
                Family Members ({familyMembers.length})
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {familyMembers.map(member => (
                  <div key={member.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div>
                      <p style={{ 
                        margin: '0 0 5px 0', 
                        fontWeight: '600',
                        color: '#333',
                        fontSize: '16px'
                      }}>
                        {member.member_email}
                      </p>
                      <p style={{ 
                        margin: '0', 
                        fontSize: '12px', 
                        color: '#666' 
                      }}>
                        Added {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {['all', 'selected', 'none'].map(level => (
                        <button
                          key={level}
                          onClick={() => updateMemberAccess(member.id, level)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: member.access_level === level ? '#FF9800' : 'white',
                            color: member.access_level === level ? 'white' : '#FF9800',
                            border: '2px solid #FF9800',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'capitalize'
                          }}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}

export default App