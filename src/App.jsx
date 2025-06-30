import { useState, useEffect } from 'react'
import { supabase, memoryService, storyService, familyService, authService } from './lib/supabase'

function App() {
  const [selectedEmotion, setSelectedEmotion] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState(null)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [memories, setMemories] = useState([])
  const [showTimeline, setShowTimeline] = useState(false)
  const [showStoryStudio, setShowStoryStudio] = useState(false)
  const [selectedMemories, setSelectedMemories] = useState([])
  const [generatedStory, setGeneratedStory] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [shareLinks, setShareLinks] = useState({})
  const [storyAudio, setStoryAudio] = useState(null)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [activeIntegration, setActiveIntegration] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [supabaseReady, setSupabaseReady] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [familyMembers, setFamilyMembers] = useState([])
  const [isListening, setIsListening] = useState(false)
  const [voiceSearchActive, setVoiceSearchActive] = useState(false)
  const [voiceSearchResults, setVoiceSearchResults] = useState([])
  
  const prompts = {
    happy: [
      "What made you smile today?",
      "Share your proudest moment",
      "Describe your happiest memory"
    ],
    sad: [
      "What's weighing on your heart?",
      "Share a lesson from a difficult time",
      "What do you wish you could say?"
    ],
    grateful: [
      "What are you thankful for today?",
      "Who has made a difference in your life?",
      "What small blessing surprised you?"
    ],
    excited: [
      "What are you looking forward to?",
      "Share your biggest dream",
      "What adventure awaits you?"
    ]
  }

  // Initialize Supabase and load data
  const initSupabase = async () => {
    try {
      // Check if we have Supabase credentials
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
      
      if (!supabaseUrl || !supabaseKey) {
        console.log('Supabase not configured - using local storage')
        // Load from localStorage for demo
        const savedMemories = localStorage.getItem('memories')
        if (savedMemories) {
          setMemories(JSON.parse(savedMemories))
        }
        return
      }
      
      console.log('Supabase ready:', supabaseUrl)
      setSupabaseReady(true)
      
      // Get current user
      const user = await authService.getCurrentUser()
      if (user) {
        setCurrentUser(user)
        await loadUserData(user.id)
      } else {
        // For demo purposes, create a mock user ID
        const mockUserId = localStorage.getItem('mockUserId') || 'demo-user-' + Date.now()
        localStorage.setItem('mockUserId', mockUserId)
        setCurrentUser({ id: mockUserId, email: 'demo@example.com' })
        await loadUserData(mockUserId)
      }
      
    } catch (error) {
      console.error('Supabase init error:', error)
      // Fallback to localStorage
      const savedMemories = localStorage.getItem('memories')
      if (savedMemories) {
        setMemories(JSON.parse(savedMemories))
      }
    }
  }

  // Load user data from Supabase
  const loadUserData = async (userId) => {
    try {
      if (supabaseReady && supabase) {
        // Load memories from Supabase
        const userMemories = await memoryService.getMemories(userId)
        if (userMemories.length > 0) {
          // Convert Supabase format to app format
          const formattedMemories = userMemories.map(memory => ({
            id: memory.id,
            emotion: memory.emotion,
            transcript: memory.transcript,
            audio: memory.audio_url,
            date: new Date(memory.created_at).toLocaleString(),
            blockchainTx: memory.blockchain_tx
          }))
          setMemories(formattedMemories)
        }

        // Load family members
        const userFamilyMembers = await familyService.getFamilyMembers(userId)
        setFamilyMembers(userFamilyMembers)
      } else {
        // Fallback to localStorage
        const savedMemories = localStorage.getItem('memories')
        if (savedMemories) {
          setMemories(JSON.parse(savedMemories))
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      // Fallback to localStorage
      const savedMemories = localStorage.getItem('memories')
      if (savedMemories) {
        setMemories(JSON.parse(savedMemories))
      }
    }
  }

  // Initialize on component mount
  useEffect(() => {
    initSupabase()
  }, [])

  // Save to localStorage when memories change (fallback)
  useEffect(() => {
    if (memories.length > 0) {
      localStorage.setItem('memories', JSON.stringify(memories))
    }
  }, [memories])

  // Listen to auth changes
  useEffect(() => {
    if (supabaseReady && supabase) {
      const unsubscribe = authService.onAuthStateChange((event, session) => {
        if (session?.user) {
          setCurrentUser(session.user)
          loadUserData(session.user.id)
        } else {
          setCurrentUser(null)
          setMemories([])
          setFamilyMembers([])
        }
      })
      
      return unsubscribe
    }
  }, [supabaseReady])
  
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    const chunks = []
    
    recorder.ondataavailable = (e) => chunks.push(e.data)
    
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const url = URL.createObjectURL(blob)
      setRecordedAudio(url)
      transcribeAudio(blob)
    }
    
    recorder.start()
    setMediaRecorder(recorder)
    setIsRecording(true)
  }

  const stopRecording = () => {
    mediaRecorder?.stop()
    setIsRecording(false)
  }

  const transcribeAudio = async (audioBlob) => {
    setActiveIntegration('🎙️ Transcribing with OpenAI...')
    setIsTranscribing(true)
    setTranscript('')
    
    try {
      // Check if we have API key (for demo, we'll use mock)
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY || ''
      
      if (!apiKey) {
        // Demo mode - enhanced mock transcription
        const mockTranscripts = [
          "Today was incredible. I spent the afternoon with my grandchildren at the park, watching them play on the swings. Their laughter reminded me of when my own children were young. These simple moments are what life is all about.",
          "I'm feeling grateful for my family's support during this difficult time. Even though we're facing challenges, we're facing them together. That's what makes us strong.",
          "I can't contain my excitement! My daughter just told me she's expecting. I'm going to be a grandparent again! The joy of watching our family grow is indescribable.",
          "Sometimes I feel the weight of the years, but then I remember all the beautiful memories we've created. Each wrinkle tells a story, each gray hair a lesson learned."
        ]
        
        setTimeout(() => {
          const randomTranscript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)]
          setTranscript(randomTranscript)
          setIsTranscribing(false)
          setActiveIntegration('')
        }, 2000)
        return
      }
      
      // Real API implementation
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('model', 'whisper-1')
      formData.append('language', 'en')
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Transcription failed')
      }
      
      const data = await response.json()
      setTranscript(data.text || 'Could not transcribe audio')
    } catch (error) {
      console.error('Transcription error:', error)
      setTranscript('Transcription failed. Please try again.')
    } finally {
      setIsTranscribing(false)
      setActiveIntegration('')
    }
  }

  const saveMemory = async () => {
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

    const newMemory = {
      id: Date.now(),
      emotion: selectedEmotion,
      audio: recordedAudio,
      transcript: transcript,
      date: new Date().toLocaleString()
    }

    // Try to save to Supabase first
    if (supabaseReady && supabase && currentUser) {
      try {
        const supabaseMemory = {
          user_id: currentUser.id,
          emotion: selectedEmotion,
          transcript: transcript,
          audio_url: recordedAudio,
          created_at: new Date().toISOString()
        }

        const savedMemory = await memoryService.saveMemory(supabaseMemory)
        if (savedMemory) {
          // Update local state with Supabase data
          newMemory.id = savedMemory.id
          newMemory.blockchainTx = savedMemory.blockchain_tx
        }
      } catch (error) {
        console.error('Error saving to Supabase:', error)
        // Continue with local storage fallback
      }
    }

    // Update local state
    setMemories([...memories, newMemory])
    setShowTimeline(true)
    setCurrentScreen('memories')
    setSuccessMessage('Memory Preserved! 🎉')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const generateStory = async () => {
    setActiveIntegration('✨ Creating story with GPT-4...')
    setIsGenerating(true)
    
    try {
      const selectedMems = memories.filter(m => selectedMemories.includes(m.id))
      const emotions = selectedMems.map(m => m.emotion).join(' and ')
      
      // Check if we have API key (for demo, we'll use enhanced mock)
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY || ''
      
      if (!apiKey) {
        // Demo mode - create meaningful story based on selected memories
        const memoryTexts = selectedMems.map(m => m.transcript).join(' ')
        const hasGrandchildren = memoryTexts.toLowerCase().includes('grandchild')
        const hasFamily = memoryTexts.toLowerCase().includes('family')
        
        let story = ''
        if (hasGrandchildren) {
          story = `In the tapestry of life, few threads shine as brightly as the moments shared between generations. Your ${emotions} memories paint a portrait of a life enriched by the laughter of grandchildren and the wisdom of years well-lived. From park swings to bedtime stories, each memory becomes a gift passed down through time. These precious moments remind us that love transcends age, and that in the eyes of our grandchildren, we find both our past and our future reflected back at us.`
        } else if (hasFamily) {
          story = `Family is the anchor that grounds us and the wind that lifts our spirits. Through ${emotions} times, your memories reveal the unbreakable bonds that define who we are. Whether celebrating triumphs or weathering storms together, each shared experience adds another layer to your family's unique story. These memories serve as reminders that we are never alone, that love multiplies when divided among those we hold dear.`
        } else {
          story = `Life is a collection of moments, each one a brushstroke on the canvas of our existence. Your ${emotions} memories weave together to tell a story of resilience, joy, and human connection. In sharing these experiences, you've created something timeless - a legacy of emotions and wisdom that will echo through the hearts of those who hear them. Every memory preserved is a gift to the future, a reminder that every life has profound meaning.`
        }
        
        setTimeout(async () => {
          setGeneratedStory(story)
          
          // Try to save story to Supabase
          if (supabaseReady && supabase && currentUser) {
            try {
              const supabaseStory = {
                user_id: currentUser.id,
                memory_ids: selectedMemories.map(id => id.toString()),
                story_text: story,
                created_at: new Date().toISOString()
              }
              await storyService.saveStory(supabaseStory)
            } catch (error) {
              console.error('Error saving story to Supabase:', error)
            }
          }
          
          setIsGenerating(false)
          setActiveIntegration('')
          setSuccessMessage('Story Created! ✨')
          setTimeout(() => setSuccessMessage(''), 3000)
        }, 3000)
        return
      }
      
      // Real API implementation
      const prompt = `Create a beautiful, cohesive narrative (200-250 words) that weaves together these ${emotions} family memories into a meaningful story. Make it emotional and suitable for sharing with family. Focus on themes of legacy, love, and connection. Memories: ${selectedMems.map(m => m.transcript).join('; ')}`
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 400
        })
      })
      
      if (!response.ok) {
        throw new Error('Story generation failed')
      }
      
      const data = await response.json()
      const story = data.choices[0].message.content || 'Could not generate story'
      setGeneratedStory(story)
      
      // Save to Supabase
      if (supabaseReady && supabase && currentUser) {
        try {
          const supabaseStory = {
            user_id: currentUser.id,
            memory_ids: selectedMemories.map(id => id.toString()),
            story_text: story,
            created_at: new Date().toISOString()
          }
          await storyService.saveStory(supabaseStory)
        } catch (error) {
          console.error('Error saving story to Supabase:', error)
        }
      }
      
    } catch (error) {
      console.error('Story generation error:', error)
      setGeneratedStory('Story generation failed. Please try again.')
    } finally {
      setIsGenerating(false)
      setActiveIntegration('')
      setSuccessMessage('Story Created! ✨')
      setTimeout(() => setSuccessMessage(''), 3000)
    }
  }

  const shareMemory = (memoryId) => {
    const link = `https://mymemoryjar.com/share/${memoryId}`
    setShareLinks({ ...shareLinks, [memoryId]: link })
    navigator.clipboard.writeText(link)
    alert('Share link copied to clipboard!')
    setSuccessMessage('Shared Successfully! 💝')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const addFamilyMember = async (email) => {
    if (!currentUser) return

    try {
      if (supabaseReady && supabase) {
        const newMember = await familyService.addFamilyMember(currentUser.id, email, 'selected')
        if (newMember) {
          setFamilyMembers([...familyMembers, newMember])
          setSuccessMessage('Family member added! 👨‍👩‍👧‍👦')
          setTimeout(() => setSuccessMessage(''), 3000)
          return
        }
      }
      
      // Fallback for demo
      const mockMember = {
        id: Date.now(),
        user_id: currentUser.id,
        member_email: email,
        access_level: 'selected',
        created_at: new Date().toISOString()
      }
      setFamilyMembers([...familyMembers, mockMember])
      setSuccessMessage('Family member added! 👨‍👩‍👧‍👦')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error adding family member:', error)
      alert('Failed to add family member. Please try again.')
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
  
  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
      
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderBottom: '1px solid #ddd',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100
      }}>
        <h2 style={{ margin: 0, cursor: 'pointer' }} onClick={() => setCurrentScreen('welcome')}>
          My Memory Jar {supabaseReady && <span style={{ fontSize: '12px', color: '#4CAF50' }}>🗄️</span>}
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
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
            My Memories
          </button>
          <button 
            onClick={() => setCurrentScreen('story')}
            style={{
              padding: '8px 16px',
              backgroundColor: currentScreen === 'story' ? '#4CAF50' : 'white',
              color: currentScreen === 'story' ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create Story
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
        </div>
      </div>

      {activeIntegration && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '20px',
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 200,
          fontSize: '14px'
        }}>
          {activeIntegration}
        </div>
      )}

      {successMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '15px 30px',
          borderRadius: '25px',
          boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
          zIndex: 300,
          fontSize: '16px',
          animation: 'slideDown 0.3s ease-out'
        }}>
          {successMessage}
        </div>
      )}

      <div style={{ height: '70px' }}></div>
      
      {currentScreen === 'welcome' && (
        <>
          <h1>My Memory Jar</h1>
          <p>Every Voice Tells a Story</p>
          {currentUser && (
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              Welcome back! {supabaseReady ? '🗄️ Connected to database' : '💾 Using local storage'}
            </p>
          )}
          
          <div>
            <button onClick={() => {
              setSelectedEmotion('happy')
              setCurrentScreen('record')
            }}>😊 Happy</button>
            <button onClick={() => {
              setSelectedEmotion('sad')
              setCurrentScreen('record')
            }}>😢 Sad</button>
            <button onClick={() => {
              setSelectedEmotion('grateful')
              setCurrentScreen('record')
            }}>🙏 Grateful</button>
            <button onClick={() => {
              setSelectedEmotion('excited')
              setCurrentScreen('record')
            }}>🎉 Excited</button>
          </div>
        </>
      )}
      
      {currentScreen === 'record' && (
        <>
          <p>Selected: {selectedEmotion}</p>
          
          {selectedEmotion && (
            <div style={{ marginTop: '20px' }}>
              <h3>Choose a prompt or record freely:</h3>
              <button>{prompts[selectedEmotion][0]}</button>
              <button>{prompts[selectedEmotion][1]}</button>
              <button>{prompts[selectedEmotion][2]}</button>
              <button>Record Freely</button>
            </div>
          )}
          
          <button 
            onClick={() => isRecording ? stopRecording() : startRecording()}
            style={{ 
              fontSize: '24px', 
              padding: '20px', 
              marginTop: '20px',
              backgroundColor: isRecording ? '#ff4444' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer'
            }}
          >
            {isRecording ? '⏹️ Stop' : '🎤 Record'}
          </button>
          
          {recordedAudio && (
            <div style={{ marginTop: '20px' }}>
              <h3>Your Memory:</h3>
              <audio controls src={recordedAudio} style={{ width: '100%' }} />
              <button 
                onClick={() => {
                  if (transcript) saveMemory()
                  setRecordedAudio(null)
                  setSelectedEmotion(null)
                  setTranscript('')
                  setShowTimeline(false)
                }}
                style={{ marginTop: '10px' }}
              >
                Record Another
              </button>
            </div>
          )}

          {isTranscribing && (
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <div style={{ 
                display: 'inline-block',
                animation: 'pulse 1.5s ease-in-out infinite' 
              }}>
                <span style={{ fontSize: '30px' }}>🎙️</span>
              </div>
            </div>
          )}

          {transcript && (
            <div style={{ 
              marginTop: '20px', 
              padding: '20px', 
              background: selectedEmotion === 'happy' ? 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)' :
                          selectedEmotion === 'sad' ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' :
                          selectedEmotion === 'grateful' ? 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)' :
                          'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                fontSize: '40px',
                opacity: '0.2'
              }}>
                {selectedEmotion === 'happy' && '😊'}
                {selectedEmotion === 'sad' && '😢'}
                {selectedEmotion === 'grateful' && '🙏'}
                {selectedEmotion === 'excited' && '🎉'}
              </div>
              <h3 style={{ marginBottom: '10px', color: '#333' }}>Your Memory</h3>
              <p style={{ 
                fontSize: '18px', 
                lineHeight: '1.6',
                color: '#444',
                fontFamily: 'Georgia, serif'
              }}>{transcript}</p>
            </div>
          )}

          {transcript && !showTimeline && (
            <button 
              onClick={saveMemory}
              style={{ marginTop: '10px', padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Save Memory
            </button>
          )}
        </>
      )}

      {currentScreen === 'story' && (
        <>
          {memories.length < 2 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              backgroundColor: '#f5f5f5',
              borderRadius: '12px',
              marginTop: '20px'
            }}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>📚</div>
              <h3 style={{ marginBottom: '10px', color: '#666' }}>Need more memories</h3>
              <p style={{ marginBottom: '20px', color: '#999' }}>
                Record at least 2 memories to create your first AI story
              </p>
              <button 
                onClick={() => setCurrentScreen('welcome')}
                style={{ 
                  padding: '12px 24px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Record a Memory
              </button>
            </div>
          )}

          {memories.length >= 2 && !showStoryStudio && (
            <button 
              onClick={() => {
                setShowStoryStudio(true)
                setCurrentScreen('story')
              }}
              style={{ 
                marginTop: '20px', 
                padding: '15px 30px', 
                backgroundColor: '#9C27B0', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                fontSize: '16px'
              }}
            >
              ✨ Create AI Story from Memories
            </button>
          )}

          {showStoryStudio && (
            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              <h2>Create Your Family Story</h2>
              <p>Select 2-3 memories to weave into a story:</p>
              
              {memories.map(memory => (
                <div key={memory.id} style={{ margin: '10px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
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
                      style={{ marginRight: '10px' }}
                    />
                    <span>{memory.emotion} - {memory.transcript.substring(0, 50)}...</span>
                  </label>
                </div>
              ))}
              
              <div style={{ marginTop: '20px' }}>
                <button 
                  onClick={() => generateStory()}
                  disabled={selectedMemories.length < 2}
                  style={{ 
                    padding: '10px 20px', 
                    backgroundColor: selectedMemories.length >= 2 ? '#4CAF50' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    marginRight: '10px'
                  }}
                >
                  Generate Story ({selectedMemories.length} selected)
                </button>
                <button onClick={() => {
                  setShowStoryStudio(false)
                  setSelectedMemories([])
                }}>Cancel</button>
              </div>

              {isGenerating && (
                <div style={{ textAlign: 'center', margin: '20px 0' }}>
                  <div style={{ 
                    display: 'inline-block',
                    animation: 'spin 2s linear infinite' 
                  }}>
                    <span style={{ fontSize: '30px' }}>✨</span>
                  </div>
                </div>
              )}

              {generatedStory && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
                  <h3>Your AI Story</h3>
                  <p>{generatedStory}</p>
                  <button 
                    onClick={() => {
                      const storyLink = `https://mymemoryjar.com/story/${Date.now()}`
                      navigator.clipboard.writeText(storyLink)
                      alert('Story link copied! Anyone with this link can hear your family story.')
                    }}
                    style={{ 
                      marginTop: '15px',
                      padding: '10px 20px',
                      backgroundColor: '#9C27B0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      marginRight: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    📤 Share Story
                  </button>
                  <button 
                    onClick={async () => {
                      setActiveIntegration('🎭 Generating voice with ElevenLabs...')
                      setIsGeneratingAudio(true)
                      
                      try {
                        // Check if we have API key (for demo, we'll use enhanced mock)
                        const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY || ''
                        
                        if (!apiKey) {
                          // Demo mode - create better mock audio
                          setTimeout(() => {
                            // Create a more realistic mock audio blob
                            const mockAudioData = new Uint8Array(44100 * 2) // 1 second of silence
                            for (let i = 0; i < mockAudioData.length; i++) {
                              mockAudioData[i] = Math.random() * 128
                            }
                            const audioBlob = new Blob([mockAudioData], { type: 'audio/mpeg' })
                            const audioUrl = URL.createObjectURL(audioBlob)
                            setStoryAudio(audioUrl)
                            setIsGeneratingAudio(false)
                            setActiveIntegration('')
                          }, 3000)
                          return
                        }
                        
                        // Real ElevenLabs API implementation
                        const voiceId = 'EXAVITQu4vr4xnSDxMaL' // "Sarah" voice - warm and friendly
                        const response = await fetch(
                          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
                          {
                            method: 'POST',
                            headers: {
                              'Accept': 'audio/mpeg',
                              'Content-Type': 'application/json',
                              'xi-api-key': apiKey
                            },
                            body: JSON.stringify({
                              text: generatedStory,
                              model_id: 'eleven_monolingual_v1',
                              voice_settings: {
                                stability: 0.75,
                                similarity_boost: 0.75,
                                style: 0.5,
                                use_speaker_boost: true
                              }
                            })
                          }
                        )
                        
                        if (!response.ok) {
                          throw new Error('Audio generation failed')
                        }
                        
                        const audioBlob = await response.blob()
                        const audioUrl = URL.createObjectURL(audioBlob)
                        setStoryAudio(audioUrl)
                        
                      } catch (error) {
                        console.error('ElevenLabs error:', error)
                        alert('Audio generation failed. Please try again.')
                      } finally {
                        setIsGeneratingAudio(false)
                        setActiveIntegration('')
                      }
                    }}
                    style={{ 
                      padding: '10px 20px',
                      backgroundColor: '#FF6B6B',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      marginRight: '10px',
                      cursor: 'pointer'
                    }}
                    disabled={isGeneratingAudio}
                  >
                    {isGeneratingAudio ? '🎭 Creating Audio...' : '🎭 Generate Audio Narration'}
                  </button>

                  {storyAudio && (
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
                      <h4 style={{ marginTop: '0', marginBottom: '10px' }}>🎧 Listen to Your Audio Story</h4>
                      <audio controls src={storyAudio} style={{ width: '100%', marginBottom: '10px' }} />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          onClick={() => {
                            const a = document.createElement('a')
                            a.href = storyAudio
                            a.download = 'my-family-story.mp3'
                            a.click()
                          }}
                          style={{ 
                            padding: '8px 16px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          💾 Download Audio Story
                        </button>
                        <span style={{ fontSize: '12px', color: '#666', alignSelf: 'center' }}>
                          Narrated by ElevenLabs AI
                        </span>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => {
                      setGeneratedStory('')
                      setSelectedMemories([])
                      setShowStoryStudio(false)
                    }}
                    style={{ marginTop: '10px' }}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {currentScreen === 'memories' && (
        <div style={{ marginTop: '40px' }}>
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
              backgroundColor: '#f5f5f5',
              borderRadius: '12px',
              marginTop: '20px'
            }}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>📭</div>
              <h3 style={{ marginBottom: '10px', color: '#666' }}>No memories yet</h3>
              <p style={{ marginBottom: '20px', color: '#999' }}>
                Your memory jar is waiting for your first story
              </p>
              <button 
                onClick={() => setCurrentScreen('welcome')}
                style={{ 
                  padding: '12px 24px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Record Your First Memory
              </button>
            </div>
          ) : (
            memories.map(memory => (
              <div key={memory.id} style={{ 
                padding: '15px', 
                marginBottom: '15px', 
                borderLeft: memory.emotion === 'happy' ? '4px solid #ff9800' :
                            memory.emotion === 'sad' ? '4px solid #2196f3' :
                            memory.emotion === 'grateful' ? '4px solid #9c27b0' :
                            '4px solid #e91e63',
                borderRadius: '8px',
                backgroundColor: '#f9f9f9',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }} 
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '24px' }}>
                    {memory.emotion === 'happy' && '😊'}
                    {memory.emotion === 'sad' && '😢'}
                    {memory.emotion === 'grateful' && '🙏'}
                    {memory.emotion === 'excited' && '🎉'}
                    {memory.emotion}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#666' }}>{memory.date}</span>
                    {memory.blockchainTx && (
                      <span style={{ fontSize: '12px', color: '#4CAF50' }} title="Stored on blockchain">
                        ⛓️
                      </span>
                    )}
                    {supabaseReady && (
                      <span style={{ fontSize: '12px', color: '#2196F3' }} title="Saved to database">
                        🗄️
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ marginBottom: '10px' }}>{memory.transcript}</p>
                <audio controls src={memory.audio} style={{ width: '100%' }} />
                <button 
                  onClick={() => shareMemory(memory.id)}
                  style={{ 
                    marginTop: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  📤 Share Memory
                </button>

                {shareLinks[memory.id] && (
                  <p style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>
                    Link: {shareLinks[memory.id]}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {currentScreen === 'family' && (
        <div>
          <h2>Family Memory Circle</h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            Share memories with your loved ones and manage access
          </p>
          
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ marginTop: '0' }}>📊 Family Engagement</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <div style={{ 
                padding: '15px', 
                backgroundColor: 'white', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' }}>
                  {memories.length}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>Total Memories</div>
              </div>
              <div style={{ 
                padding: '15px', 
                backgroundColor: 'white', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2196F3' }}>
                  {familyMembers.length}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>Family Members</div>
              </div>
            </div>
            <div style={{ 
              marginTop: '15px', 
              padding: '10px', 
              backgroundColor: '#e8f5e9', 
              borderRadius: '4px'
            }}>
              <strong>🏆 Most Active:</strong> {familyMembers.length > 0 ? familyMembers[0].member_email : 'No family members yet'}
            </div>
          </div>

          <div style={{ 
            marginTop: '30px',
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: '#e8f5e9',
            borderRadius: '8px'
          }}>
            <h3 style={{ marginTop: '0', marginBottom: '15px' }}>
              Invite Family Members
            </h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="email"
                placeholder="Enter email address"
                id="familyEmail"
                style={{ 
                  flex: 1,
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '16px'
                }}
              />
              <button 
                onClick={() => {
                  const email = document.getElementById('familyEmail').value
                  if (email) {
                    addFamilyMember(email)
                    document.getElementById('familyEmail').value = ''
                  }
                }}
                style={{ 
                  padding: '10px 20px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Send Invite
              </button>
            </div>
            <p style={{ 
              marginTop: '10px', 
              marginBottom: '0', 
              fontSize: '14px', 
              color: '#666' 
            }}>
              Invited family members can view and contribute to your memory jar
            </p>
          </div>

          <div style={{ marginTop: '30px' }}>
            <h3>Family Members</h3>
            <div style={{ marginTop: '20px' }}>
              {familyMembers.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  color: '#666'
                }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>👨‍👩‍👧‍👦</div>
                  <p>No family members added yet</p>
                  <p style={{ fontSize: '14px' }}>Invite family members to share your memory jar</p>
                </div>
              ) : (
                familyMembers.map(member => (
                  <div key={member.id} style={{ 
                    padding: '15px',
                    marginBottom: '10px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong style={{ fontSize: '16px' }}>{member.member_email}</strong>
                      <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                        Added {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <select 
                      value={member.access_level}
                      onChange={async (e) => {
                        if (supabaseReady && supabase) {
                          await familyService.updateFamilyMemberAccess(member.id, e.target.value)
                        }
                        // Update local state
                        setFamilyMembers(familyMembers.map(m => 
                          m.id === member.id ? { ...m, access_level: e.target.value } : m
                        ))
                      }}
                      style={{ 
                        padding: '5px 10px',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}
                    >
                      <option value="all">All Memories</option>
                      <option value="selected">Selected Only</option>
                      <option value="none">No Access</option>
                    </select>
                  </div>
                ))
              )}
            </div>
          </div>

          {memories.length > 0 && familyMembers.length > 0 && (
            <div style={{ 
              marginTop: '30px',
              padding: '20px',
              backgroundColor: '#f0f0f0',
              borderRadius: '8px'
            }}>
              <h3 style={{ marginTop: '0' }}>Memory Access Overview</h3>
              <div style={{ marginTop: '15px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ width: '150px', fontWeight: 'bold' }}>Member</span>
                  {memories.slice(0, 3).map((memory, idx) => (
                    <span key={idx} style={{ width: '60px', textAlign: 'center', fontSize: '20px' }}>
                      {memory.emotion === 'happy' && '😊'}
                      {memory.emotion === 'sad' && '😢'}
                      {memory.emotion === 'grateful' && '🙏'}
                      {memory.emotion === 'excited' && '🎉'}
                    </span>
                  ))}
                </div>
                {familyMembers.map(member => (
                  <div key={member.id} style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                    <span style={{ width: '150px', fontSize: '14px' }}>{member.member_email}</span>
                    {memories.slice(0, 3).map((memory, idx) => (
                      <span key={idx} style={{ width: '60px', textAlign: 'center' }}>
                        {member.access_level === 'all' || member.access_level === 'selected' ? '✅' : '❌'}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              <p style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
                ✅ = Has access to this memory • ❌ = No access
              </p>
            </div>
          )}
        </div>
      )}

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

      <div style={{ 
        marginTop: '50px', 
        padding: '20px', 
        borderTop: '1px solid #ddd',
        textAlign: 'center'
      }}>
        <a 
          href="https://bolt.new" 
          target="_blank"
          rel="noopener noreferrer"
          style={{ 
            display: 'inline-block',
            marginBottom: '20px',
            textDecoration: 'none',
            color: '#666',
            fontSize: '16px'
          }}
        >
          Built with ⚡ Bolt.new
        </a>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '10px',
          flexWrap: 'wrap',
          marginTop: '20px'
        }}>
          <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
            🎙️ OpenAI Whisper
          </span>
          <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
            🎭 ElevenLabs
          </span>
          <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
            ⛓️ Algorand
          </span>
          <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
            💳 RevenueCat
          </span>
          <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
            🚀 Netlify
          </span>
          <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
            🗄️ Supabase
          </span>
          <span style={{ padding: '5px 10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
            🌐 Entri Domain
          </span>
        </div>
      </div>
    </div>
  )
}

export default App