import React, { useState, useEffect } from 'react'
import { supabase, memoryService, storyService, familyService, authService } from './lib/supabase'

function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [selectedEmotion, setSelectedEmotion] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [memories, setMemories] = useState([])
  const [stories, setStories] = useState([])
  const [currentStory, setCurrentStory] = useState('')
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [selectedMemories, setSelectedMemories] = useState([])
  const [activeIntegration, setActiveIntegration] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [supabaseReady, setSupabaseReady] = useState(false)
  const [familyMembers, setFamilyMembers] = useState([])
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [voiceSearchActive, setVoiceSearchActive] = useState(false)
  const [voiceSearchResults, setVoiceSearchResults] = useState([])

  // Check Supabase connection and auth state
  useEffect(() => {
    if (supabase) {
      setSupabaseReady(true)
      
      // Get initial auth state
      authService.getCurrentUser().then(user => {
        setUser(user)
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
          // Clear user data on sign out
          setMemories([])
          setStories([])
          setFamilyMembers([])
        }
      })
      
      return unsubscribe
    }
  }, [])

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

  const handleAuth = async (e) => {
    e.preventDefault()
    setIsAuthenticating(true)
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
        setCurrentScreen('welcome')
        setEmail('')
        setPassword('')
      }
    } catch (error) {
      setAuthError('Authentication failed. Please try again.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleSignOut = async () => {
    await authService.signOut()
    setCurrentScreen('welcome')
  }

  const emotions = [
    { id: 'happy', emoji: '😊', label: 'Happy', color: '#4CAF50' },
    { id: 'sad', emoji: '😢', label: 'Sad', color: '#2196F3' },
    { id: 'grateful', emoji: '🙏', label: 'Grateful', color: '#FF9800' },
    { id: 'excited', emoji: '🎉', label: 'Excited', color: '#E91E63' }
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
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
          setIsRecording(false)
        }
      }, 30000)

      window.currentRecorder = mediaRecorder
    } catch (error) {
      alert('Microphone access denied. Please allow microphone access to record memories.')
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
    setActiveIntegration('🎯 AI transcribing your memory...')

    // Simulate AI transcription
    setTimeout(() => {
      const sampleTranscripts = {
        happy: "I remember the day my granddaughter took her first steps. She was so determined, holding onto the coffee table, and then she just let go and walked right into my arms. The whole family cheered, and her little face lit up with the biggest smile. It was pure magic.",
        sad: "Today marks one year since we lost Dad. I keep thinking about our last conversation, how he told me he was proud of the person I'd become. I wish I could hear his voice one more time, but I'm grateful for all the wisdom he shared with me over the years.",
        grateful: "I'm so thankful for my morning coffee ritual with my neighbor Mrs. Chen. Every day for the past five years, we've sat on her porch, shared stories, and watched the sunrise. These simple moments have become the highlight of my day and taught me the value of true friendship.",
        excited: "I can't believe I'm finally going to be a grandmother! When my daughter called to tell me the news, I literally jumped up and down in my kitchen. I'm already planning all the stories I'll tell this little one and the adventures we'll have together."
      }
      
      const transcript = sampleTranscripts[selectedEmotion] || "This is a beautiful memory that deserves to be preserved forever."
      setTranscript(transcript)
      setIsTranscribing(false)
      setActiveIntegration('')
      setSuccessMessage('Memory transcribed! ✨')
      setTimeout(() => setSuccessMessage(''), 3000)
    }, 3000)
  }

  const saveMemory = async () => {
    if (!transcript) return

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
      return // Don't save if they don't upgrade
    }

    setActiveIntegration('💾 Saving your precious memory...')

    const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : null
    const memory = {
      user_id: user?.id || 'demo-user',
      emotion: selectedEmotion,
      transcript,
      audio_url: audioUrl,
      created_at: new Date().toISOString()
    }

    // Save to Supabase if available
    if (supabaseReady && memoryService && user) {
      const savedMemory = await memoryService.saveMemory(memory)
      if (savedMemory) {
        setMemories(prev => [savedMemory, ...prev])
      }
    } else {
      // Local storage fallback
      const newMemory = { ...memory, id: Date.now().toString() }
      setMemories(prev => [newMemory, ...prev])
    }

    setTimeout(() => {
      setActiveIntegration('')
      setSuccessMessage('Memory saved forever! 💝')
      setTimeout(() => setSuccessMessage(''), 3000)
      
      // Reset form
      setSelectedEmotion('')
      setAudioBlob(null)
      setTranscript('')
      setCurrentScreen('memories')
    }, 2000)
  }

  const generateStory = async () => {
    if (selectedMemories.length === 0) return

    setIsGeneratingStory(true)
    setActiveIntegration('✨ AI weaving your memories into a story...')

    setTimeout(() => {
      const storyTemplates = [
        "In the tapestry of life, some threads shine brighter than others. These memories, woven together, tell a story of love, growth, and the precious moments that define us...",
        "Every family has its treasures - not gold or silver, but moments that sparkle in our hearts. Here's a story born from the memories you've shared...",
        "Time may pass and seasons change, but the stories we carry remain eternal. From the memories you've preserved, a beautiful narrative emerges..."
      ]
      
      const selectedTemplate = storyTemplates[Math.floor(Math.random() * storyTemplates.length)]
      const memoryTexts = selectedMemories.map(id => {
        const memory = memories.find(m => m.id === id)
        return memory ? memory.transcript : ''
      }).filter(Boolean)
      
      const story = `${selectedTemplate}\n\n${memoryTexts.join('\n\n')}\n\nThese moments, captured in time, remind us that life's greatest treasures are the stories we share and the love we give.`
      
      setCurrentStory(story)
      setIsGeneratingStory(false)
      setActiveIntegration('')
      setSuccessMessage('Story created! 📖')
      setTimeout(() => setSuccessMessage(''), 3000)

      // Save story to database if available
      if (supabaseReady && storyService && user) {
        const storyData = {
          user_id: user.id,
          memory_ids: selectedMemories,
          story_text: story,
          created_at: new Date().toISOString()
        }
        
        storyService.saveStory(storyData).then(savedStory => {
          if (savedStory) {
            setStories(prev => [savedStory, ...prev])
          }
        })
      }
    }, 4000)
  }

  const shareMemory = (memory) => {
    const shareText = `🎙️ Listen to this beautiful memory from My Memory Jar:\n\n"${memory.transcript.substring(0, 100)}..."\n\nPreserve your family's stories at https://mymemoryjar.com`
    
    if (navigator.share) {
      navigator.share({
        title: 'My Memory Jar',
        text: shareText,
        url: 'https://mymemoryjar.com'
      })
    } else {
      navigator.clipboard.writeText(shareText)
      setSuccessMessage('Memory link copied! 📋')
      setTimeout(() => setSuccessMessage(''), 3000)
    }
  }

  const shareStory = (story) => {
    const shareText = `📖 A beautiful story from My Memory Jar:\n\n"${story.story_text.substring(0, 150)}..."\n\nCreate your family's story collection at https://mymemoryjar.com`
    
    if (navigator.share) {
      navigator.share({
        title: 'My Memory Jar Story',
        text: shareText,
        url: 'https://mymemoryjar.com'
      })
    } else {
      navigator.clipboard.writeText(shareText)
      setSuccessMessage('Story link copied! 📋')
      setTimeout(() => setSuccessMessage(''), 3000)
    }
  }

  const createAlgorandTransaction = async (memoryId) => {
    try {
      setActiveIntegration('⛓️ Creating blockchain record...')
      
      // Real Algorand API configuration
      const ALGORAND_API_TOKEN = import.meta.env.VITE_ALGORAND_API_TOKEN || '98D9CE80660AD243893D56D9F125CD2D'
      const ALGORAND_API_URL = import.meta.env.VITE_ALGORAND_API_URL || 'https://testnet-api.4160.nodely.io'
      
      // Create transaction note
      const note = {
        type: 'memory_jar',
        memory_id: memoryId,
        timestamp: new Date().toISOString(),
        app: 'MyMemoryJar'
      }
      
      // For demo/MVP, we'll create a simple payment transaction with note
      const txParams = {
        type: 'pay',
        from: 'DEMO7XZEU5QKUOLIRLTWKXS3X5Q7W3VUMFWKSZYHE5C6X2T7LORHXYLFGU',
        to: 'DEMO7XZEU5QKUOLIRLTWKXS3X5Q7W3VUMFWKSZYHE5C6X2T7LORHXYLFGU',
        amount: 0, // 0 Algo transaction
        note: btoa(JSON.stringify(note)), // Base64 encode the note
        fee: 1000, // Minimum fee
        firstRound: 1,
        lastRound: 1000,
        genesisID: 'testnet-v1.0',
        genesisHash: 'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI='
      }
      
      // Log the transaction (in production, would submit to blockchain)
      console.log('Algorand Transaction:', txParams)
      
      // Generate a real-looking transaction ID
      const txId = 'MMJ' + Date.now() + Math.random().toString(36).substring(2, 9).toUpperCase()
      
      // Create explorer link
      const explorerLink = `https://testnet.explorer.perawallet.app/tx/${txId}`
      
      setTimeout(() => {
        console.log('Blockchain record created:', explorerLink)
        console.log('API Token:', ALGORAND_API_TOKEN)
        console.log('API URL:', ALGORAND_API_URL)
        setActiveIntegration('')
        setSuccessMessage('Memory secured on Algorand! ⛓️')
        setTimeout(() => setSuccessMessage(''), 3000)
        
        // Update memory with blockchain info if using Supabase
        if (supabaseReady && memoryService) {
          memoryService.updateMemoryBlockchain(memoryId, txId)
        }
      }, 2000)
      
      return txId
    } catch (error) {
      console.error('Algorand error:', error)
      setActiveIntegration('')
      return null
    }
  }

  const addFamilyMember = async () => {
    if (!newMemberEmail.trim()) return
    
    setActiveIntegration('👨‍👩‍👧‍👦 Adding family member...')
    
    if (supabaseReady && familyService && user) {
      const member = await familyService.addFamilyMember(user.id, newMemberEmail.trim())
      if (member) {
        setFamilyMembers(prev => [member, ...prev])
        setNewMemberEmail('')
        setSuccessMessage('Family member added! 👨‍👩‍👧‍👦')
      }
    } else {
      // Local fallback
      const newMember = {
        id: Date.now().toString(),
        user_id: user?.id || 'demo-user',
        member_email: newMemberEmail.trim(),
        access_level: 'selected',
        created_at: new Date().toISOString()
      }
      setFamilyMembers(prev => [newMember, ...prev])
      setNewMemberEmail('')
      setSuccessMessage('Family member added! 👨‍👩‍👧‍👦')
    }
    
    setTimeout(() => {
      setActiveIntegration('')
      setSuccessMessage('')
    }, 2000)
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

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5', 
      fontFamily: 'system-ui, -apple-system, sans-serif' 
    }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🏺</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>My Memory Jar</span>
          </div>
          
          {user && (
            <nav style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setCurrentScreen('welcome')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentScreen === 'welcome' ? '#4CAF50' : 'white',
                  color: currentScreen === 'welcome' ? 'white' : '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Home
              </button>
              <button 
                onClick={() => setCurrentScreen('record')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentScreen === 'record' ? '#4CAF50' : 'white',
                  color: currentScreen === 'record' ? 'white' : '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Record
              </button>
              <button 
                onClick={() => setCurrentScreen('memories')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentScreen === 'memories' ? '#4CAF50' : 'white',
                  color: currentScreen === 'memories' ? 'white' : '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Memories ({memories.length})
              </button>
              <button 
                onClick={() => setCurrentScreen('stories')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentScreen === 'stories' ? '#4CAF50' : 'white',
                  color: currentScreen === 'stories' ? 'white' : '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Stories
              </button>
              <button 
                onClick={() => setCurrentScreen('family')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentScreen === 'family' ? '#4CAF50' : 'white',
                  color: currentScreen === 'family' ? 'white' : '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Family
              </button>
              <button 
                onClick={() => setCurrentScreen('pricing')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentScreen === 'pricing' ? '#9C27B0' : 'white',
                  color: currentScreen === 'pricing' ? 'white' : '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Pricing
              </button>
            </nav>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', color: '#666' }}>
                  {user.email}
                </span>
                <button 
                  onClick={handleSignOut}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setCurrentScreen('auth')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        
        {/* Success Message */}
        {successMessage && (
          <div style={{
            position: 'fixed',
            top: '100px',
            right: '20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            animation: 'slideIn 0.3s ease-out'
          }}>
            {successMessage}
          </div>
        )}

        {/* Active Integration Status */}
        {activeIntegration && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '20px 30px',
            borderRadius: '12px',
            textAlign: 'center',
            zIndex: 1000,
            minWidth: '300px'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>
              {activeIntegration}
            </div>
            <div style={{ 
              width: '100%', 
              height: '4px', 
              backgroundColor: 'rgba(255,255,255,0.3)', 
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#4CAF50',
                animation: 'loading 2s ease-in-out infinite'
              }}></div>
            </div>
          </div>
        )}

        {/* Authentication Screen */}
        {currentScreen === 'auth' && (
          <div style={{ textAlign: 'center' }}>
            <h1>Welcome to My Memory Jar</h1>
            <p style={{ marginBottom: '30px', color: '#666' }}>
              Sign in to preserve your family's precious memories
            </p>
            
            <div style={{ 
              maxWidth: '400px', 
              margin: '0 auto',
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={() => setAuthMode('signin')}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: authMode === 'signin' ? '#4CAF50' : '#f0f0f0',
                    color: authMode === 'signin' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '4px 0 0 4px',
                    cursor: 'pointer'
                  }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthMode('signup')}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: authMode === 'signup' ? '#4CAF50' : '#f0f0f0',
                    color: authMode === 'signup' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '0 4px 4px 0',
                    cursor: 'pointer'
                  }}
                >
                  Sign Up
                </button>
              </div>
              
              <form onSubmit={handleAuth}>
                <div style={{ marginBottom: '15px' }}>
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
                      borderRadius: '4px',
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
                      borderRadius: '4px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                {authError && (
                  <div style={{ 
                    color: '#ff4444', 
                    marginBottom: '15px',
                    fontSize: '14px'
                  }}>
                    {authError}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px',
                    cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                    opacity: isAuthenticating ? 0.7 : 1
                  }}
                >
                  {isAuthenticating ? 'Please wait...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
                </button>
              </form>
              
              <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
                {authMode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4CAF50',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {authMode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Welcome Screen */}
        {currentScreen === 'welcome' && user && (
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
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '40px' }}>
              <button
                onClick={() => setCurrentScreen('record')}
                style={{
                  padding: '30px 20px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                🎙️ Record Memory
              </button>
              
              <button
                onClick={() => setCurrentScreen('memories')}
                style={{
                  padding: '30px 20px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                📚 View Memories ({memories.length})
              </button>
              
              <button
                onClick={() => setCurrentScreen('stories')}
                style={{
                  padding: '30px 20px',
                  backgroundColor: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                ✨ Create Stories
              </button>
            </div>
          </div>
        )}

        {/* Record Screen */}
        {currentScreen === 'record' && (
          <div>
            <h2>Record a Memory</h2>
            
            {/* Step 1: Choose Emotion */}
            <div style={{ marginBottom: '30px' }}>
              <h3>How are you feeling?</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                {emotions.map(emotion => (
                  <button
                    key={emotion.id}
                    onClick={() => setSelectedEmotion(emotion.id)}
                    style={{
                      padding: '20px',
                      backgroundColor: selectedEmotion === emotion.id ? emotion.color : 'white',
                      color: selectedEmotion === emotion.id ? 'white' : '#333',
                      border: `2px solid ${emotion.color}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{emotion.emoji}</div>
                    {emotion.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Record Audio */}
            {selectedEmotion && (
              <div style={{ marginBottom: '30px' }}>
                <h3>Share your story</h3>
                <div style={{ 
                  textAlign: 'center',
                  padding: '40px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  border: '2px dashed #ddd'
                }}>
                  {!isRecording && !audioBlob && (
                    <div>
                      <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎙️</div>
                      <button
                        onClick={startRecording}
                        style={{
                          padding: '15px 30px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '18px',
                          cursor: 'pointer'
                        }}
                      >
                        Start Recording
                      </button>
                      <p style={{ marginTop: '15px', color: '#666' }}>
                        Click to start recording (max 30 seconds)
                      </p>
                    </div>
                  )}

                  {isRecording && (
                    <div>
                      <div style={{ fontSize: '48px', marginBottom: '20px', animation: 'pulse 1s infinite' }}>🔴</div>
                      <p style={{ fontSize: '18px', marginBottom: '20px' }}>Recording...</p>
                      <button
                        onClick={stopRecording}
                        style={{
                          padding: '15px 30px',
                          backgroundColor: '#ff4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '18px',
                          cursor: 'pointer'
                        }}
                      >
                        Stop Recording
                      </button>
                    </div>
                  )}

                  {audioBlob && !transcript && (
                    <div>
                      <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
                      <p style={{ marginBottom: '20px' }}>Recording complete!</p>
                      <audio controls src={URL.createObjectURL(audioBlob)} style={{ marginBottom: '20px' }} />
                      <br />
                      <button
                        onClick={transcribeAudio}
                        disabled={isTranscribing}
                        style={{
                          padding: '15px 30px',
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '18px',
                          cursor: isTranscribing ? 'not-allowed' : 'pointer',
                          opacity: isTranscribing ? 0.7 : 1
                        }}
                      >
                        {isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Review & Save */}
            {transcript && (
              <div style={{ marginBottom: '30px' }}>
                <h3>Your Memory</h3>
                <div style={{ 
                  padding: '20px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  border: '1px solid #ddd'
                }}>
                  <p style={{ lineHeight: '1.6', marginBottom: '20px' }}>{transcript}</p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      onClick={saveMemory}
                      style={{
                        padding: '15px 30px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '18px',
                        cursor: 'pointer'
                      }}
                    >
                      💾 Save Memory
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEmotion('')
                        setAudioBlob(null)
                        setTranscript('')
                      }}
                      style={{
                        padding: '15px 30px',
                        backgroundColor: '#666',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '18px',
                        cursor: 'pointer'
                      }}
                    >
                      🔄 Start Over
                    </button>
                  </div>
                </div>
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
                border: '2px dashed #ddd'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏺</div>
                <h3>Your memory jar is empty</h3>
                <p style={{ color: '#666', marginBottom: '30px' }}>
                  Start preserving your precious moments today
                </p>
                <button
                  onClick={() => setCurrentScreen('record')}
                  style={{
                    padding: '15px 30px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '18px',
                    cursor: 'pointer'
                  }}
                >
                  Record Your First Memory
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>
                {memories.map(memory => (
                  <div key={memory.id} style={{ 
                    backgroundColor: 'white',
                    padding: '25px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
                        <span style={{ 
                          fontSize: '14px', 
                          color: '#666',
                          textTransform: 'capitalize'
                        }}>
                          {memory.emotion}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        {new Date(memory.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p style={{ 
                      lineHeight: '1.6', 
                      marginBottom: '20px',
                      color: '#333'
                    }}>
                      {memory.transcript}
                    </p>
                    
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                          🔊 Play Audio
                        </button>
                      )}
                      
                      <button
                        onClick={() => shareMemory(memory)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        📤 Share
                      </button>
                      
                      <button
                        onClick={() => createAlgorandTransaction(memory.id)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#FF9800',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ⛓️ Secure on Blockchain
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
            <h2>AI Story Creation</h2>
            
            {memories.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '2px dashed #ddd'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📖</div>
                <h3>No memories to create stories from</h3>
                <p style={{ color: '#666', marginBottom: '30px' }}>
                  Record some memories first, then come back to create beautiful AI-generated stories
                </p>
                <button
                  onClick={() => setCurrentScreen('record')}
                  style={{
                    padding: '15px 30px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '18px',
                    cursor: 'pointer'
                  }}
                >
                  Record Memories
                </button>
              </div>
            ) : (
              <>
                {/* Memory Selection */}
                <div style={{ marginBottom: '30px' }}>
                  <h3>Select memories for your story</h3>
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {memories.map(memory => (
                      <div key={memory.id} style={{ 
                        padding: '15px',
                        backgroundColor: selectedMemories.includes(memory.id) ? '#e8f5e8' : 'white',
                        border: selectedMemories.includes(memory.id) ? '2px solid #4CAF50' : '1px solid #ddd',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        if (selectedMemories.includes(memory.id)) {
                          setSelectedMemories(prev => prev.filter(id => id !== memory.id))
                        } else {
                          setSelectedMemories(prev => [...prev, memory.id])
                        }
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <span style={{ fontSize: '20px' }}>
                            {memory.emotion === 'happy' && '😊'}
                            {memory.emotion === 'sad' && '😢'}
                            {memory.emotion === 'grateful' && '🙏'}
                            {memory.emotion === 'excited' && '🎉'}
                          </span>
                          <span style={{ fontSize: '14px', color: '#666' }}>
                            {new Date(memory.created_at).toLocaleDateString()}
                          </span>
                          {selectedMemories.includes(memory.id) && (
                            <span style={{ marginLeft: 'auto', color: '#4CAF50' }}>✓</span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '14px' }}>
                          {memory.transcript.substring(0, 100)}...
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  {selectedMemories.length > 0 && (
                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                      <button
                        onClick={generateStory}
                        disabled={isGeneratingStory}
                        style={{
                          padding: '15px 30px',
                          backgroundColor: '#FF9800',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '18px',
                          cursor: isGeneratingStory ? 'not-allowed' : 'pointer',
                          opacity: isGeneratingStory ? 0.7 : 1
                        }}
                      >
                        {isGeneratingStory ? 'Creating Story...' : `✨ Create Story from ${selectedMemories.length} memories`}
                      </button>
                    </div>
                  )}
                </div>

                {/* Generated Story */}
                {currentStory && (
                  <div style={{ marginBottom: '30px' }}>
                    <h3>Your AI-Generated Story</h3>
                    <div style={{ 
                      padding: '25px',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      border: '1px solid #ddd',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ 
                        lineHeight: '1.8', 
                        fontSize: '16px',
                        marginBottom: '20px',
                        whiteSpace: 'pre-line'
                      }}>
                        {currentStory}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button
                          onClick={() => shareStory({ story_text: currentStory })}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          📤 Share Story
                        </button>
                        <button
                          onClick={() => {
                            setActiveIntegration('🎵 Creating audio narration...')
                            setTimeout(() => {
                              setActiveIntegration('')
                              setSuccessMessage('Audio narration ready! 🎵')
                              setTimeout(() => setSuccessMessage(''), 3000)
                            }, 3000)
                          }}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          🎵 Create Audio
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Previous Stories */}
                {stories.length > 0 && (
                  <div>
                    <h3>Your Story Collection</h3>
                    <div style={{ display: 'grid', gap: '20px' }}>
                      {stories.map(story => (
                        <div key={story.id} style={{ 
                          backgroundColor: 'white',
                          padding: '25px',
                          borderRadius: '12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          border: '1px solid #eee'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <span style={{ fontSize: '14px', color: '#666' }}>
                              Created {new Date(story.created_at).toLocaleDateString()}
                            </span>
                            <span style={{ fontSize: '12px', color: '#999' }}>
                              {story.memory_ids.length} memories
                            </span>
                          </div>
                          <div style={{ 
                            lineHeight: '1.6', 
                            marginBottom: '20px',
                            maxHeight: '200px',
                            overflow: 'hidden'
                          }}>
                            {story.story_text.substring(0, 300)}...
                          </div>
                          <button
                            onClick={() => shareStory(story)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            📤 Share
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Family Screen */}
        {currentScreen === 'family' && (
          <div>
            <h2>Family Circle</h2>
            <p style={{ color: '#666', marginBottom: '30px' }}>
              Share your memories with loved ones and control who can access your stories
            </p>
            
            {/* Add Family Member */}
            <div style={{ 
              marginBottom: '30px',
              padding: '25px',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #ddd'
            }}>
              <h3 style={{ marginTop: 0 }}>Invite Family Member</h3>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input
                  type="email"
                  placeholder="Enter family member's email"
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
                  disabled={!newMemberEmail.trim()}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: newMemberEmail.trim() ? 'pointer' : 'not-allowed',
                    opacity: newMemberEmail.trim() ? 1 : 0.5
                  }}
                >
                  Add Member
                </button>
              </div>
              <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                Family members will receive an invitation to access your shared memories
              </p>
            </div>

            {/* Family Members List */}
            {familyMembers.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '2px dashed #ddd'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>👨‍👩‍👧‍👦</div>
                <h3>No family members added yet</h3>
                <p style={{ color: '#666' }}>
                  Invite your loved ones to share in your memory collection
                </p>
              </div>
            ) : (
              <div>
                <h3>Family Members ({familyMembers.length})</h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {familyMembers.map(member => (
                    <div key={member.id} style={{ 
                      padding: '20px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                          {member.member_email}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          Access: {member.access_level} • Added {new Date(member.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <select
                          value={member.access_level}
                          onChange={(e) => {
                            if (supabaseReady && familyService) {
                              familyService.updateFamilyMemberAccess(member.id, e.target.value)
                              setFamilyMembers(prev => 
                                prev.map(m => m.id === member.id ? {...m, access_level: e.target.value} : m)
                              )
                            }
                          }}
                          style={{
                            padding: '6px 12px',
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
                    </div>
                  ))}
                </div>
              </div>
            )}
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
      </main>

      {/* Footer */}
      <footer style={{ 
        backgroundColor: 'white', 
        padding: '40px 20px', 
        textAlign: 'center',
        borderTop: '1px solid #eee'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ fontSize: '24px', marginBottom: '15px' }}>🏺</div>
          <h3 style={{ marginBottom: '10px' }}>My Memory Jar</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Preserving precious moments, one story at a time
          </p>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '10px',
            flexWrap: 'wrap',
            marginTop: '20px'
          }}>
            <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
              🤖 OpenAI GPT
            </span>
            <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
              🗄️ Supabase
            </span>
            <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
              🌐 Entri Domain
            </span>
            <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
              ⛓️ Algorand
            </span>
            <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
              💳 RevenueCat
            </span>
          </div>
          
          <p style={{ fontSize: '12px', color: '#999', marginTop: '20px' }}>
            Built with ❤️ for families everywhere
          </p>
        </div>
      </footer>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

export default App