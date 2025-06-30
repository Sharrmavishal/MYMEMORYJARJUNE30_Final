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
  const [playingAudio, setPlayingAudio] = useState(null)
  const [familyMembers, setFamilyMembers] = useState([])
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [activeIntegration, setActiveIntegration] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [voiceSearchActive, setVoiceSearchActive] = useState(false)
  const [voiceSearchResults, setVoiceSearchResults] = useState([])

  useEffect(() => {
    // Check initial auth state
    authService.getCurrentUser().then(user => {
      setUser(user)
      setLoading(false)
      if (user) {
        loadUserData(user.id)
      }
    })

    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        loadUserData(session.user.id)
      } else {
        setMemories([])
        setStories([])
        setFamilyMembers([])
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

  const handleAuth = async (email, password, isSignUp = false) => {
    try {
      const { user, error } = isSignUp 
        ? await authService.signUp(email, password)
        : await authService.signIn(email, password)
      
      if (error) {
        alert(error.message || 'Authentication failed')
        return
      }
      
      if (isSignUp) {
        alert('Account created! Please check your email to verify your account.')
      }
    } catch (error) {
      alert('Authentication failed: ' + error.message)
    }
  }

  const handleSignOut = async () => {
    await authService.signOut()
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

    // Simulate transcription (in real app, use speech-to-text service)
    const mockTranscripts = {
      happy: "Today was such a wonderful day! I spent time with my grandchildren at the park, and we had the most amazing picnic. The sun was shining, and everyone was laughing and playing together. These are the moments that make life so precious and meaningful.",
      sad: "I've been thinking a lot about mom lately. She passed away five years ago, but I still miss her every day. She had this way of making everyone feel special and loved. I wish I could hear her voice one more time and tell her how much she meant to me.",
      grateful: "I am so thankful for my family and all the blessings in my life. Even during difficult times, I'm reminded of how much love surrounds me. My children call me every week, my neighbors check on me, and I have a roof over my head and food on my table.",
      excited: "I can't believe it - my granddaughter just got accepted to college! She's going to be the first in our family to get a degree. I'm so proud of her hard work and determination. This is going to open so many doors for her future."
    }

    const transcriptText = mockTranscripts[currentEmotion] || "This is a sample transcription of your recorded memory."
    setTranscript(transcriptText)
  }

  const saveMemory = async () => {
    if (!user || !currentEmotion || !transcript) {
      alert('Please complete all fields before saving.')
      return
    }

    // Check memory limit for free users
    if (memories.length >= 5) {
      const userConfirmed = window.confirm(
        '🌟 You\'ve created 5 beautiful memories!\n\n' +
        'Upgrade to Premium to:\n' +
        '• Save unlimited memories\n' +
        '• Create unlimited AI stories\n' +
        '• Priority processing\n\n' +
        'Only $4.99/month\n\n' +
        'Click OK to see pricing options'
      )
      
      if (userConfirmed) {
        setCurrentScreen('pricing')
      }
      return
    }

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
      
      alert('Memory saved successfully! 🎉')
      setCurrentScreen('memories')
    } else {
      alert('Failed to save memory. Please try again.')
    }
  }

  const shareMemory = (memory) => {
    const shareText = `🎙️ Listen to this memory from My Memory Jar:\n\n"${memory.transcript.substring(0, 100)}..."\n\nShared with love ❤️`
    const shareUrl = `https://mymemoryjar.com/memory/${memory.id}`
    
    if (navigator.share) {
      navigator.share({
        title: 'My Memory Jar',
        text: shareText,
        url: shareUrl
      })
    } else {
      navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`)
      alert('Memory link copied to clipboard! 📋')
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
      const storyTemplates = [
        "In the tapestry of life, every thread tells a story. These memories weave together to create a beautiful narrative of love, growth, and the precious moments that define us. From joyful celebrations to quiet reflections, each memory adds depth and meaning to the story of a life well-lived.",
        "Time moves like a gentle river, carrying with it the treasures of our experiences. These collected memories are like precious stones gathered along the journey - each one unique, each one valuable, each one contributing to the rich story of a family's love and legacy.",
        "Every family has its own special magic, found in the moments shared, the stories told, and the love that binds generations together. These memories are the chapters of that ongoing story, written not in ink but in the heart, preserved not on paper but in the souls of those who matter most."
      ]
      
      const randomStory = storyTemplates[Math.floor(Math.random() * storyTemplates.length)]
      setGeneratedStory(randomStory)
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
      memory_ids: selectedMemories.map(m => m.id),
      story_text: generatedStory,
      audio_url: null // Would be populated with narrated audio
    }

    const savedStory = await storyService.saveStory(story)
    
    if (savedStory) {
      setStories(prev => [savedStory, ...prev])
      alert('Story saved successfully! 📚')
      
      // Reset
      setSelectedMemories([])
      setGeneratedStory('')
    } else {
      alert('Failed to save story. Please try again.')
    }
  }

  const shareStory = (story) => {
    const shareText = `📚 Read this beautiful story from My Memory Jar:\n\n"${story.story_text.substring(0, 150)}..."\n\nCreated with AI from family memories ✨`
    const shareUrl = `https://mymemoryjar.com/story/${story.id}`
    
    if (navigator.share) {
      navigator.share({
        title: 'My Memory Jar Story',
        text: shareText,
        url: shareUrl
      })
    } else {
      navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`)
      alert('Story link copied to clipboard! 📋')
    }
  }

  const playAudio = (audioUrl, memoryId) => {
    if (playingAudio === memoryId) {
      // Stop current audio
      setPlayingAudio(null)
      return
    }

    const audio = new Audio(audioUrl)
    audio.onended = () => setPlayingAudio(null)
    audio.play()
    setPlayingAudio(memoryId)
  }

  const addFamilyMember = async () => {
    if (!newMemberEmail.trim()) {
      alert('Please enter an email address.')
      return
    }

    if (!user) return

    const result = await familyService.addFamilyMember(user.id, newMemberEmail.trim())
    
    if (result) {
      setFamilyMembers(prev => [result, ...prev])
      setNewMemberEmail('')
      alert(`Family member ${newMemberEmail} added successfully! 👨‍👩‍👧‍👦`)
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
            width: '50px', 
            height: '50px', 
            border: '3px solid #ddd', 
            borderTop: '3px solid #4CAF50',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Loading My Memory Jar...</p>
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
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🏺</span>
            <span style={{ fontWeight: 'bold', fontSize: '18px' }}>My Memory Jar</span>
          </div>
          
          {user && (
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
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '40px 20px',
        minHeight: 'calc(100vh - 200px)'
      }}>
        {!user ? (
          /* Auth Screen */
          <div style={{ 
            backgroundColor: 'white', 
            padding: '40px', 
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '30px' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '20px' }}>🏺</span>
              <h1>Welcome to My Memory Jar</h1>
              <p style={{ color: '#666', fontSize: '16px' }}>
                Preserve your family's precious moments forever
              </p>
            </div>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <div style={{ 
                padding: '30px', 
                backgroundColor: '#f9f9f9', 
                borderRadius: '8px',
                minWidth: '250px'
              }}>
                <h3>Sign In</h3>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target)
                  handleAuth(formData.get('email'), formData.get('password'), false)
                }}>
                  <input 
                    name="email"
                    type="email" 
                    placeholder="Email" 
                    required
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      marginBottom: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                  <input 
                    name="password"
                    type="password" 
                    placeholder="Password" 
                    required
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      marginBottom: '20px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                  <button 
                    type="submit"
                    style={{ 
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    Sign In
                  </button>
                </form>
              </div>

              <div style={{ 
                padding: '30px', 
                backgroundColor: '#f9f9f9', 
                borderRadius: '8px',
                minWidth: '250px'
              }}>
                <h3>Create Account</h3>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target)
                  handleAuth(formData.get('email'), formData.get('password'), true)
                }}>
                  <input 
                    name="email"
                    type="email" 
                    placeholder="Email" 
                    required
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      marginBottom: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                  <input 
                    name="password"
                    type="password" 
                    placeholder="Password" 
                    required
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      marginBottom: '20px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                  <button 
                    type="submit"
                    style={{ 
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    Sign Up
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Welcome Screen */}
            {currentScreen === 'welcome' && (
              <div style={{ 
                backgroundColor: 'white', 
                padding: '40px', 
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '20px' }}>🏺</span>
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

                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '30px' }}>
                  <button 
                    onClick={() => setCurrentScreen('record')}
                    style={{ 
                      padding: '15px 30px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    🎙️ Start Recording
                  </button>
                  <button 
                    onClick={() => setCurrentScreen('memories')}
                    style={{ 
                      padding: '15px 30px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    📚 View Memories
                  </button>
                </div>

                <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f0f8ff', borderRadius: '8px' }}>
                  <h4>📊 Your Memory Stats</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '15px' }}>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>{memories.length}</div>
                      <div style={{ fontSize: '14px', color: '#666' }}>Memories</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>{stories.length}</div>
                      <div style={{ fontSize: '14px', color: '#666' }}>Stories</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9C27B0' }}>{familyMembers.length}</div>
                      <div style={{ fontSize: '14px', color: '#666' }}>Family Members</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Record Screen */}
            {currentScreen === 'record' && (
              <div style={{ 
                backgroundColor: 'white', 
                padding: '40px', 
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <h2>Record a Memory</h2>
                <p style={{ color: '#666', marginBottom: '30px' }}>
                  Choose how you're feeling, then record your story
                </p>

                {/* Emotion Selection */}
                <div style={{ marginBottom: '30px' }}>
                  <h3>How are you feeling?</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginTop: '15px' }}>
                    {[
                      { emotion: 'happy', emoji: '😊', label: 'Happy', color: '#4CAF50' },
                      { emotion: 'sad', emoji: '😢', label: 'Sad', color: '#2196F3' },
                      { emotion: 'grateful', emoji: '🙏', label: 'Grateful', color: '#FF9800' },
                      { emotion: 'excited', emoji: '🎉', label: 'Excited', color: '#E91E63' }
                    ].map(({ emotion, emoji, label, color }) => (
                      <button
                        key={emotion}
                        onClick={() => setCurrentEmotion(emotion)}
                        style={{
                          padding: '20px',
                          backgroundColor: currentEmotion === emotion ? color : '#f5f5f5',
                          color: currentEmotion === emotion ? 'white' : '#333',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          transition: 'all 0.3s'
                        }}
                      >
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>{emoji}</div>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recording Section */}
                {currentEmotion && (
                  <div style={{ marginBottom: '30px' }}>
                    <h3>Record Your Story</h3>
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px',
                      backgroundColor: '#f9f9f9',
                      borderRadius: '12px',
                      border: '2px dashed #ddd'
                    }}>
                      {!isRecording ? (
                        <button
                          onClick={startRecording}
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            backgroundColor: '#ff4444',
                            color: 'white',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                          }}
                        >
                          🎙️
                        </button>
                      ) : (
                        <div>
                          <button
                            onClick={stopRecording}
                            style={{
                              width: '80px',
                              height: '80px',
                              borderRadius: '50%',
                              backgroundColor: '#333',
                              color: 'white',
                              border: 'none',
                              fontSize: '24px',
                              cursor: 'pointer',
                              animation: 'pulse 1.5s ease-in-out infinite'
                            }}
                          >
                            ⏹️
                          </button>
                          <p style={{ marginTop: '20px', color: '#ff4444', fontSize: '18px' }}>
                            Recording... Click to stop
                          </p>
                        </div>
                      )}
                      
                      {!isRecording && !audioBlob && (
                        <p style={{ marginTop: '20px', color: '#666' }}>
                          Click the microphone to start recording
                        </p>
                      )}
                      
                      {audioBlob && !transcript && (
                        <div style={{ marginTop: '20px' }}>
                          <p style={{ color: '#4CAF50', marginBottom: '15px' }}>✅ Recording complete!</p>
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
                            📝 Transcribe Audio
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Transcript Section */}
                {transcript && (
                  <div style={{ marginBottom: '30px' }}>
                    <h3>Your Story</h3>
                    <div style={{ 
                      padding: '20px',
                      backgroundColor: '#f0f8ff',
                      borderRadius: '8px',
                      border: '1px solid #ddd'
                    }}>
                      <p style={{ lineHeight: '1.6', margin: 0 }}>{transcript}</p>
                    </div>
                    
                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                      <button
                        onClick={saveMemory}
                        style={{
                          padding: '15px 30px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '16px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        💾 Save Memory
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Memories Screen */}
            {currentScreen === 'memories' && (
              <div style={{ 
                backgroundColor: 'white', 
                padding: '40px', 
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
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
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '20px' }}>📭</span>
                    <p>No memories yet. Start by recording your first story!</p>
                    <button 
                      onClick={() => setCurrentScreen('record')}
                      style={{ 
                        padding: '10px 20px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginTop: '15px'
                      }}
                    >
                      Record First Memory
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '20px' }}>
                    {memories.map(memory => (
                      <div key={memory.id} style={{ 
                        padding: '20px',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '12px',
                        border: '1px solid #eee'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>
                              {memory.emotion === 'happy' && '😊'}
                              {memory.emotion === 'sad' && '😢'}
                              {memory.emotion === 'grateful' && '🙏'}
                              {memory.emotion === 'excited' && '🎉'}
                            </span>
                            <div>
                              <div style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{memory.emotion}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {new Date(memory.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '10px' }}>
                            {memory.audio_url && (
                              <button
                                onClick={() => playAudio(memory.audio_url, memory.id)}
                                style={{
                                  padding: '8px 12px',
                                  backgroundColor: playingAudio === memory.id ? '#ff4444' : '#2196F3',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                {playingAudio === memory.id ? '⏹️ Stop' : '▶️ Play'}
                              </button>
                            )}
                            <button
                              onClick={() => shareMemory(memory)}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              📤 Share
                            </button>
                          </div>
                        </div>
                        
                        <p style={{ lineHeight: '1.6', margin: 0, color: '#333' }}>
                          {memory.transcript}
                        </p>
                        
                        {memory.blockchain_tx && (
                          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                            🔗 Blockchain: {memory.blockchain_tx.substring(0, 20)}...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stories Screen */}
            {currentScreen === 'stories' && (
              <div style={{ 
                backgroundColor: 'white', 
                padding: '40px', 
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <h2>AI Stories</h2>
                <p style={{ color: '#666', marginBottom: '30px' }}>
                  Create beautiful narratives from your memories
                </p>

                {/* Story Creation */}
                <div style={{ marginBottom: '40px' }}>
                  <h3>Create New Story</h3>
                  
                  {memories.length === 0 ? (
                    <div style={{ 
                      padding: '30px',
                      backgroundColor: '#f9f9f9',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: '#666'
                    }}>
                      <p>You need memories to create stories.</p>
                      <button 
                        onClick={() => setCurrentScreen('record')}
                        style={{ 
                          padding: '10px 20px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        Record First Memory
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h4>Select memories to include:</h4>
                      <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                        {memories.map(memory => (
                          <label key={memory.id} style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            padding: '15px',
                            backgroundColor: selectedMemories.find(m => m.id === memory.id) ? '#e8f5e8' : '#f9f9f9',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: selectedMemories.find(m => m.id === memory.id) ? '2px solid #4CAF50' : '1px solid #eee'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedMemories.find(m => m.id === memory.id) !== undefined}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMemories(prev => [...prev, memory])
                                } else {
                                  setSelectedMemories(prev => prev.filter(m => m.id !== memory.id))
                                }
                              }}
                              style={{ marginRight: '15px' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                <span>
                                  {memory.emotion === 'happy' && '😊'}
                                  {memory.emotion === 'sad' && '😢'}
                                  {memory.emotion === 'grateful' && '🙏'}
                                  {memory.emotion === 'excited' && '🎉'}
                                </span>
                                <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                                  {memory.emotion}
                                </span>
                                <span style={{ fontSize: '12px', color: '#666' }}>
                                  {new Date(memory.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
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
                          backgroundColor: selectedMemories.length === 0 || isGeneratingStory ? '#ccc' : '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: selectedMemories.length === 0 || isGeneratingStory ? 'not-allowed' : 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold'
                        }}
                      >
                        {isGeneratingStory ? '✨ Creating Story...' : '✨ Generate AI Story'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Generated Story Preview */}
                {generatedStory && (
                  <div style={{ marginBottom: '40px' }}>
                    <h3>Generated Story</h3>
                    <div style={{ 
                      padding: '25px',
                      backgroundColor: '#f0f8ff',
                      borderRadius: '12px',
                      border: '1px solid #ddd',
                      marginBottom: '20px'
                    }}>
                      <p style={{ lineHeight: '1.8', margin: 0, fontSize: '16px' }}>
                        {generatedStory}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <button
                        onClick={saveStory}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold'
                        }}
                      >
                        💾 Save Story
                      </button>
                      
                      <button
                        onClick={() => {
                          setActiveIntegration('🎵 Generating narration...')
                          setTimeout(() => {
                            setActiveIntegration('')
                            alert('AI narration complete! In production, this would generate spoken audio of your story.')
                          }, 2000)
                        }}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#9C27B0',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold'
                        }}
                      >
                        🎵 Add Narration
                      </button>
                    </div>
                  </div>
                )}

                {/* Saved Stories */}
                <div>
                  <h3>Your Stories</h3>
                  {stories.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                      <span style={{ fontSize: '48px', display: 'block', marginBottom: '20px' }}>📚</span>
                      <p>No stories created yet. Generate your first AI story above!</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '20px' }}>
                      {stories.map(story => (
                        <div key={story.id} style={{ 
                          padding: '25px',
                          backgroundColor: '#f9f9f9',
                          borderRadius: '12px',
                          border: '1px solid #eee'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>
                                Story from {story.memory_ids.length} memories
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                Created {new Date(story.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                              {story.audio_url && (
                                <button
                                  onClick={() => playAudio(story.audio_url, story.id)}
                                  style={{
                                    padding: '8px 12px',
                                    backgroundColor: '#9C27B0',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                >
                                  🎵 Listen
                                </button>
                              )}
                              <button
                                onClick={() => shareStory(story)}
                                style={{
                                  padding: '8px 12px',
                                  backgroundColor: '#4CAF50',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                📤 Share
                              </button>
                            </div>
                          </div>
                          
                          <p style={{ lineHeight: '1.6', margin: 0, color: '#333' }}>
                            {story.story_text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Family Screen */}
            {currentScreen === 'family' && (
              <div style={{ 
                backgroundColor: 'white', 
                padding: '40px', 
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <h2>Family Circle</h2>
                <p style={{ color: '#666', marginBottom: '30px' }}>
                  Share your memories with loved ones
                </p>

                {/* Add Family Member */}
                <div style={{ marginBottom: '40px' }}>
                  <h3>Invite Family Member</h3>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
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
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '16px'
                        }}
                      />
                    </div>
                    <button
                      onClick={addFamilyMember}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      👨‍👩‍👧‍👦 Add Member
                    </button>
                  </div>
                </div>

                {/* Family Members List */}
                <div>
                  <h3>Family Members ({familyMembers.length})</h3>
                  {familyMembers.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px',
                      backgroundColor: '#f9f9f9',
                      borderRadius: '8px',
                      color: '#666'
                    }}>
                      <span style={{ fontSize: '48px', display: 'block', marginBottom: '20px' }}>👨‍👩‍👧‍👦</span>
                      <p>No family members added yet.</p>
                      <p style={{ fontSize: '14px' }}>
                        Invite family members to share your precious memories together.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '15px' }}>
                      {familyMembers.map(member => (
                        <div key={member.id} style={{ 
                          padding: '20px',
                          backgroundColor: '#f9f9f9',
                          borderRadius: '12px',
                          border: '1px solid #eee',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                              {member.member_email}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              Added {new Date(member.created_at).toLocaleDateString()} • 
                              Access: <span style={{ 
                                textTransform: 'capitalize',
                                color: member.access_level === 'all' ? '#4CAF50' : 
                                      member.access_level === 'selected' ? '#FF9800' : '#ff4444'
                              }}>
                                {member.access_level}
                              </span>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <select
                              value={member.access_level}
                              onChange={async (e) => {
                                const result = await familyService.updateFamilyMemberAccess(member.id, e.target.value)
                                if (result) {
                                  setFamilyMembers(prev => 
                                    prev.map(m => m.id === member.id ? { ...m, access_level: e.target.value } : m)
                                  )
                                }
                              }}
                              style={{
                                padding: '6px 10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}
                            >
                              <option value="all">All Memories</option>
                              <option value="selected">Selected Only</option>
                              <option value="none">No Access</option>
                            </select>
                            
                            <button
                              onClick={() => {
                                const shareText = `🏺 You've been invited to join My Memory Jar!\n\nView and share precious family memories together.\n\nhttps://mymemoryjar.com/invite/${member.id}`
                                
                                if (navigator.share) {
                                  navigator.share({
                                    title: 'My Memory Jar Invitation',
                                    text: shareText
                                  })
                                } else {
                                  navigator.clipboard.writeText(shareText)
                                  alert('Invitation link copied to clipboard! 📋')
                                }
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
                              📤 Invite
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Family Sharing Info */}
                <div style={{ 
                  marginTop: '40px',
                  padding: '20px',
                  backgroundColor: '#f0f8ff',
                  borderRadius: '8px'
                }}>
                  <h4 style={{ marginTop: '0', marginBottom: '15px' }}>🔒 Privacy & Sharing</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                    <li><strong>All Memories:</strong> Can view and listen to all your memories</li>
                    <li><strong>Selected Only:</strong> Can only access memories you specifically share</li>
                    <li><strong>No Access:</strong> Cannot view any memories (but stays in family circle)</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Pricing Screen */}
            {currentScreen === 'pricing' && (
              <div style={{ marginTop: '40px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Choose Your Memory Plan</h2>
                <p style={{ textAlign: 'center', color: '#666', marginBottom: '40px' }}>
                  Preserve your family's legacy forever
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '600px', margin: '0 auto' }}>
                  {/* Free Plan */}
                  <div style={{ 
                    padding: '30px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '12px',
                    textAlign: 'center',
                    position: 'relative'
                  }}>
                    <h3 style={{ marginTop: '0', marginBottom: '20px' }}>Free</h3>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '20px' }}>
                      $0
                      <span style={{ fontSize: '16px', fontWeight: 'normal' }}>/month</span>
                    </div>
                    <ul style={{ listStyle: 'none', padding: '0', marginBottom: '30px', textAlign: 'left' }}>
                      <li style={{ marginBottom: '10px' }}>✅ 5 memories</li>
                      <li style={{ marginBottom: '10px' }}>✅ AI transcription</li>
                      <li style={{ marginBottom: '10px' }}>✅ Family sharing</li>
                      <li style={{ marginBottom: '10px' }}>❌ Unlimited memories</li>
                      <li style={{ marginBottom: '10px' }}>❌ AI stories</li>
                      <li style={{ marginBottom: '10px' }}>❌ Voice narration</li>
                    </ul>
                    <button 
                      disabled
                      style={{ 
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '16px',
                        cursor: 'not-allowed'
                      }}
                    >
                      Current Plan
                    </button>
                  </div>
                  
                  {/* Premium Plan */}
                  <div style={{ 
                    padding: '30px',
                    backgroundColor: '#9C27B0',
                    color: 'white',
                    borderRadius: '12px',
                    textAlign: 'center',
                    position: 'relative',
                    transform: 'scale(1.05)',
                    boxShadow: '0 8px 20px rgba(156, 39, 176, 0.3)'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-15px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#FF6B6B',
                      color: 'white',
                      padding: '5px 20px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      MOST POPULAR
                    </div>
                    <h3 style={{ marginTop: '0', marginBottom: '20px' }}>Premium</h3>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '20px' }}>
                      $4.99
                      <span style={{ fontSize: '16px', fontWeight: 'normal' }}>/month</span>
                    </div>
                    <ul style={{ listStyle: 'none', padding: '0', marginBottom: '30px', textAlign: 'left' }}>
                      <li style={{ marginBottom: '10px' }}>✅ Unlimited memories</li>
                      <li style={{ marginBottom: '10px' }}>✅ AI transcription</li>
                      <li style={{ marginBottom: '10px' }}>✅ Family sharing</li>
                      <li style={{ marginBottom: '10px' }}>✅ AI story creation</li>
                      <li style={{ marginBottom: '10px' }}>✅ Voice narration</li>
                      <li style={{ marginBottom: '10px' }}>✅ Priority support</li>
                    </ul>
                    <button 
                      onClick={() => {
                        setActiveIntegration('💳 Connecting to RevenueCat...')
                        setTimeout(() => {
                          setActiveIntegration('')
                          alert('RevenueCat integration: In production, this would open the payment flow. Premium features would be unlocked after successful payment.')
                        }, 1500)
                      }}
                      style={{ 
                        width: '100%',
                        padding: '12px',
                        backgroundColor: 'white',
                        color: '#9C27B0',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Upgrade Now
                    </button>
                  </div>
                </div>
                
                <div style={{ 
                  marginTop: '40px',
                  padding: '20px',
                  backgroundColor: '#f0f8ff',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <h4 style={{ marginTop: '0', marginBottom: '10px' }}>💳 Powered by RevenueCat</h4>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '0' }}>
                    Secure payment processing • Cancel anytime • Family-friendly pricing
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Active Integration Overlay */}
        {activeIntegration && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '12px',
              textAlign: 'center',
              maxWidth: '400px'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                border: '3px solid #ddd',
                borderTop: '3px solid #4CAF50',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{activeIntegration}</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ 
        backgroundColor: 'white', 
        padding: '40px 20px',
        borderTop: '1px solid #eee',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '24px', marginRight: '10px' }}>🏺</span>
            <span style={{ fontWeight: 'bold', fontSize: '18px' }}>My Memory Jar</span>
          </div>
          
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Preserving family stories, one voice at a time
          </p>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '10px',
            flexWrap: 'wrap',
            marginTop: '20px'
          }}>
            <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
              🗄️ Supabase Database
            </span>
            <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
              🌐 Entri Domain
            </span>
            <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
              🤖 AI Transcription
            </span>
            <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
              📱 PWA Ready
            </span>
            <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
              🔗 Blockchain Storage
            </span>
            <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
              💳 RevenueCat
            </span>
          </div>
          
          <div style={{ marginTop: '30px', fontSize: '14px', color: '#999' }}>
            <p>© 2024 My Memory Jar. Made with ❤️ for families everywhere.</p>
          </div>
        </div>
      </footer>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

export default App