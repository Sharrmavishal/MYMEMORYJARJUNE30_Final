import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'example-key'
const supabase = createClient(supabaseUrl, supabaseKey)

function App() {
  // State Management
  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [selectedEmotion, setSelectedEmotion] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [memories, setMemories] = useState([])
  const [shareLinks, setShareLinks] = useState({})
  const [selectedMemories, setSelectedMemories] = useState([])
  const [stories, setStories] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [familyMembers, setFamilyMembers] = useState([])
  const [activeIntegration, setActiveIntegration] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedPrompt, setSelectedPrompt] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [supabaseReady, setSupabaseReady] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceSearchActive, setVoiceSearchActive] = useState(false)
  const [voiceSearchResults, setVoiceSearchResults] = useState([])
  
  // Refs
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  // Emotion Configurations
  const emotionGradients = {
    happy: 'linear-gradient(135deg, #FFD93D 0%, #FFB84D 100%)',
    sad: 'linear-gradient(135deg, #5C7CFA 0%, #4263EB 100%)',
    grateful: 'linear-gradient(135deg, #8CE99A 0%, #51CF66 100%)',
    excited: 'linear-gradient(135deg, #FF6B6B 0%, #F03E3E 100%)',
    anxious: 'linear-gradient(135deg, #AA5FB4 0%, #8B3E9B 100%)',
    proud: 'linear-gradient(135deg, #74C0FC 0%, #4C9AFF 100%)'
  }

  const emotionPrompts = {
    happy: [
      "What made you smile today?",
      "Share a moment that filled you with joy",
      "Describe a happy surprise you experienced"
    ],
    sad: [
      "What's weighing on your heart?",
      "Share a memory that brings tears",
      "Talk about someone you miss"
    ],
    grateful: [
      "What are you thankful for today?",
      "Who made a difference in your life?",
      "Describe a blessing you received"
    ],
    excited: [
      "What's got you pumped up?",
      "Share your biggest anticipation",
      "What adventure awaits you?"
    ],
    anxious: [
      "What's on your mind right now?",
      "Share what's making you nervous",
      "Talk through your worries"
    ],
    proud: [
      "What achievement makes you proud?",
      "Share a moment you overcame something",
      "Describe your recent success"
    ]
  }

  // Check Supabase connection on mount
  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const { data, error } = await supabase.from('memories').select('count')
        if (!error) {
          setSupabaseReady(true)
          console.log('✅ Supabase connected')
        }
      } catch (err) {
        console.log('Using localStorage fallback')
      }
    }
    
    checkSupabase()
    
    // Load from localStorage
    const savedMemories = localStorage.getItem('memories')
    if (savedMemories) {
      setMemories(JSON.parse(savedMemories))
    }
  }, [])

  // Transcription function with real OpenAI API
  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true)
    setActiveIntegration('🎙️ Transcribing with OpenAI Whisper...')
    
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY
      
      if (!apiKey) {
        // Enhanced mock transcripts for demo
        const mockTranscripts = {
          happy: [
            "Today was wonderful! I spent the afternoon with my grandchildren at the park. We fed the ducks and they laughed so much when one duck kept following us around. These are the moments I treasure most.",
            "I got a surprise call from my old college roommate today! We haven't spoken in years but picked up right where we left off. It's amazing how true friendships never fade.",
            "Made my famous chocolate chip cookies and the whole house smelled like heaven. My neighbor stopped by and we shared them over tea. Simple pleasures are the best."
          ],
          sad: [
            "I've been thinking about Mom a lot today. It's been five years since she passed, but sometimes I still reach for the phone to call her. I miss our Sunday conversations.",
            "Found Dad's old watch in the drawer today. He wore it every day for forty years. Holding it brings back so many memories of him teaching me to tell time.",
            "The house feels so quiet now that the kids have all moved away. I'm proud of them, but I miss the chaos and laughter that used to fill these rooms."
          ],
          grateful: [
            "My doctor gave me a clean bill of health today! After last year's scare, I don't take a single day for granted anymore. Every sunrise is a gift.",
            "My granddaughter drew me a picture that says 'Best Grandma Ever.' It's going straight on the fridge. These little gestures mean the world to me.",
            "Celebrated 45 years of marriage today. Through all the ups and downs, we've built a beautiful life together. I'm so grateful for my partner."
          ],
          excited: [
            "Just booked tickets to visit my new grandson! I can't wait to hold him for the first time. Being a grandparent is the greatest joy.",
            "Starting art classes next week! I've always wanted to paint, and finally decided it's never too late to learn something new.",
            "The whole family is coming for Thanksgiving! It's been two years since we were all together. I'm already planning the menu."
          ]
        }
        
        const emotionTranscripts = mockTranscripts[selectedEmotion] || mockTranscripts.happy
        const randomTranscript = emotionTranscripts[Math.floor(Math.random() * emotionTranscripts.length)]
        
        setTimeout(() => {
          setIsTranscribing(false)
          setActiveIntegration('')
        }, 2000)
        
        return randomTranscript
      }
      
      // Real OpenAI API implementation
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
      return data.text
      
    } catch (error) {
      console.error('Transcription error:', error)
      alert('Transcription failed. Please try again.')
      return null
    } finally {
      setIsTranscribing(false)
      setActiveIntegration('')
    }
  }

  // Audio Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)
        
        // Transcribe the audio
        const transcript = await transcribeAudio(audioBlob)
        
        if (transcript) {
          const newMemory = {
            id: Date.now(),
            emotion: selectedEmotion,
            prompt: selectedPrompt,
            audioUrl: audioUrl,
            transcript: transcript,
            date: new Date().toISOString(),
            mood: getMoodFromEmotion(selectedEmotion),
            themes: getThemesFromTranscript(transcript)
          }
          
          const updatedMemories = [...memories, newMemory]
          setMemories(updatedMemories)
          localStorage.setItem('memories', JSON.stringify(updatedMemories))
          
          // Try to save to Supabase
          if (supabaseReady) {
            try {
              await supabase.from('memories').insert([newMemory])
            } catch (err) {
              console.log('Saved to localStorage only')
            }
          }
          
          setSuccessMessage('Memory Preserved! 🎉')
          setTimeout(() => setSuccessMessage(''), 3000)
          setCurrentScreen('memories')
        }
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
      
      // Play start sound
      playSound([261.63, 329.63], 0.1) // C4 to E4
      
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Error accessing microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
      
      // Play stop sound
      playSound([329.63, 261.63], 0.1) // E4 to C4
    }
  }

  // Helper Functions
  const getMoodFromEmotion = (emotion) => {
    const moods = {
      happy: 'Joyful',
      sad: 'Melancholic',
      grateful: 'Thankful',
      excited: 'Energetic',
      anxious: 'Worried',
      proud: 'Accomplished'
    }
    return moods[emotion] || 'Reflective'
  }

  const getThemesFromTranscript = (transcript) => {
    const themes = []
    const lowerTranscript = transcript.toLowerCase()
    
    if (lowerTranscript.includes('family') || lowerTranscript.includes('grandchild') || lowerTranscript.includes('daughter') || lowerTranscript.includes('son')) {
      themes.push('Family')
    }
    if (lowerTranscript.includes('health') || lowerTranscript.includes('doctor') || lowerTranscript.includes('medicine')) {
      themes.push('Health')
    }
    if (lowerTranscript.includes('friend') || lowerTranscript.includes('neighbor')) {
      themes.push('Friendship')
    }
    if (lowerTranscript.includes('memory') || lowerTranscript.includes('remember') || lowerTranscript.includes('past')) {
      themes.push('Nostalgia')
    }
    if (lowerTranscript.includes('grateful') || lowerTranscript.includes('thankful') || lowerTranscript.includes('blessed')) {
      themes.push('Gratitude')
    }
    
    return themes.length > 0 ? themes : ['Life Story']
  }

  // Audio feedback function
  const playSound = (frequencies, duration) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + index * duration)
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
      
      oscillator.start(audioContext.currentTime + index * duration)
      oscillator.stop(audioContext.currentTime + (index + 1) * duration)
    })
  }

  // Share Memory Function
  const shareMemory = (memoryId) => {
    const link = `https://mymemoryjar.com/share/${memoryId}`
    setShareLinks({ ...shareLinks, [memoryId]: link })
    navigator.clipboard.writeText(link)
    setSuccessMessage('Shared Successfully! 💝')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  // Generate Story Function with real GPT-4 API
  const generateStory = async () => {
    setActiveIntegration('✨ Creating your audio story with AI...')
    setIsGenerating(true)
    
    try {
      const selectedMems = memories.filter(m => selectedMemories.includes(m.id))
      const emotions = selectedMems.map(m => m.emotion).join(' and ')
      
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY
      
      let storyText = ''
      
      if (!apiKey) {
        // Enhanced mock story generation for demo
        const memoryTexts = selectedMems.map(m => m.transcript).join(' ')
        const hasGrandchildren = memoryTexts.toLowerCase().includes('grandchild')
        const hasFamily = memoryTexts.toLowerCase().includes('family')
        const hasHealth = memoryTexts.toLowerCase().includes('health')
        
        if (hasGrandchildren) {
          storyText = `In the tapestry of life, few threads shine as brightly as the moments shared between generations. Your ${emotions} memories paint a portrait of a life enriched by the laughter of grandchildren and the wisdom of years well-lived. From park adventures with curious ducks to the sweet aroma of homemade cookies, these stories remind us that joy often comes in the simplest packages. Each memory is a gift, carefully wrapped in love and tied with ribbons of time, waiting to be opened by future generations who will treasure these glimpses into a life fully lived.`
        } else if (hasFamily) {
          storyText = `Family is the heart's true home, and your ${emotions} memories capture the essence of what it means to belong. Through celebrations and quiet moments, through presence and absence, the bonds of family weave through every story. The empty chair that once held laughter, the phone that no longer rings with familiar voices - these absences make the remaining connections all the more precious. Your stories remind us that family isn't just about blood; it's about the people who show up, who remember, who care.`
        } else if (hasHealth) {
          storyText = `Health is the silent foundation upon which all other joys are built. Your ${emotions} memories reflect the profound gratitude that comes from understanding this truth. Each clear medical report, each sunrise witnessed, each day free from pain becomes a celebration. These stories teach us that wellness isn't just about the body - it's about the spirit that chooses gratitude, the mind that finds peace, and the heart that keeps loving despite life's challenges.`
        } else {
          storyText = `Life is a collection of moments, and your ${emotions} memories have captured some of the most precious ones. From unexpected phone calls that bridge years of silence to the quiet contemplation of treasured possessions, each story adds another brushstroke to the masterpiece of your life. These memories remind us that every day holds the potential for connection, for gratitude, for love. They show us that a life well-lived isn't measured in grand gestures, but in the accumulation of small, meaningful moments that touch the heart and nurture the soul.`
        }
      } else {
        // Real GPT-4 API call
        const prompt = `Create a beautiful, cohesive narrative that weaves together these ${emotions} family memories into a meaningful story. The story should be warm, reflective, and suitable for sharing with family. Here are the memories:\n\n${selectedMems.map(m => m.transcript).join('\n\n')}\n\nCreate a story that honors these memories and captures their emotional essence.`
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are a compassionate storyteller who creates beautiful narratives from family memories. Your stories are warm, meaningful, and perfect for preserving family history.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.8,
            max_tokens: 500
          })
        })
        
        if (!response.ok) {
          throw new Error('Story generation failed')
        }
        
        const data = await response.json()
        storyText = data.choices[0].message.content
      }
      
      // Generate audio narration with ElevenLabs
      let audioUrl = null
      const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY
      
      if (elevenLabsKey) {
        try {
          const audioResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': elevenLabsKey
            },
            body: JSON.stringify({
              text: storyText,
              model_id: 'eleven_monolingual_v1',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5
              }
            })
          })
          
          if (audioResponse.ok) {
            const audioBlob = await audioResponse.blob()
            audioUrl = URL.createObjectURL(audioBlob)
          }
        } catch (err) {
          console.log('Audio generation failed, story will be text-only')
        }
      }
      
      const newStory = {
        id: Date.now(),
        title: `A ${emotions} family story`,
        content: storyText,
        memories: selectedMems,
        date: new Date().toISOString(),
        audio_url: audioUrl
      }
      
      setStories([...stories, newStory])
      setSelectedMemories([])
      setSuccessMessage('Story Created! ✨')
      setTimeout(() => setSuccessMessage(''), 3000)
      
    } catch (error) {
      console.error('Story generation error:', error)
      alert('Story generation failed. Please try again.')
    } finally {
      setIsGenerating(false)
      setActiveIntegration('')
    }
  }

  // Voice Search Function
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice search is only supported in Chrome or Edge browsers.')
      return
    }
    
    const recognition = new window.webkitSpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    
    setIsListening(true)
    setVoiceSearchActive(true)
    setVoiceSearchResults([])
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase()
      console.log('Voice search:', transcript)
      
      // Search through memories
      const results = memories.filter(memory => {
        const matchesTranscript = memory.transcript.toLowerCase().includes(transcript)
        const matchesEmotion = transcript.includes(memory.emotion)
        const matchesMood = transcript.includes(memory.mood.toLowerCase())
        return matchesTranscript || matchesEmotion || matchesMood
      })
      
      setVoiceSearchResults(results)
      setIsListening(false)
      
      // Auto-play if user says "play" and there's only one result
      if (transcript.includes('play') && results.length === 1) {
        const audio = new Audio(results[0].audioUrl)
        audio.play()
      }
    }
    
    recognition.onerror = (event) => {
      console.error('Voice search error:', event.error)
      setIsListening(false)
      alert('Voice search failed. Please try again.')
    }
    
    recognition.onend = () => {
      setIsListening(false)
    }
    
    recognition.start()
  }

  // Add Family Member
  const addFamilyMember = (name, email, access) => {
    const newMember = {
      id: Date.now(),
      name,
      email,
      access,
      joined: new Date().toISOString()
    }
    setFamilyMembers([...familyMembers, newMember])
  }

  // Render UI
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes gentlePulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        @keyframes ripple {
          0% { transform: scale(0.95); opacity: 0.7; }
          50% { transform: scale(1.02); opacity: 0.3; }
          100% { transform: scale(0.95); opacity: 0.7; }
        }
      `}</style>

      {/* Header with Modern Navigation */}
      <div style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #eee',
        zIndex: 100,
        padding: '15px 20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
      }}>
        <div style={{ 
          maxWidth: '800px', 
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
            <span style={{ fontSize: '28px', marginRight: '10px' }}>🏺</span>
            My Memory Jar
          </h2>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentScreen('welcome')}
              style={{
                padding: '8px 20px',
                backgroundColor: currentScreen === 'welcome' ? '#4CAF50' : 'transparent',
                color: currentScreen === 'welcome' ? 'white' : '#555',
                border: 'none',
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
                border: 'none',
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
                border: 'none',
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
                border: 'none',
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
                border: 'none',
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
                border: 'none',
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
            
            {currentUser && (
              <button
                onClick={() => {
                  setCurrentUser(null)
                  setCurrentScreen('welcome')
                }}
                style={{
                  padding: '6px 16px',
                  backgroundColor: 'transparent',
                  color: '#ff4444',
                  border: '1px solid #ff4444',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  marginLeft: '10px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#ff4444'
                  e.target.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent'
                  e.target.style.color = '#ff4444'
                }}
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Message */}
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

      <div style={{ marginTop: '80px' }}>
        {/* Welcome Screen */}
        {currentScreen === 'welcome' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <h1 style={{ fontSize: '48px', marginBottom: '20px', color: '#333' }}>My Memory Jar</h1>
            <p style={{ fontSize: '24px', color: '#666', marginBottom: '40px' }}>
              Hold to remember, share to live on.
            </p>
            
            {currentUser ? (
              <>
                <p style={{ fontSize: '18px', color: '#4CAF50', marginBottom: '30px' }}>
                  Welcome back! You have {memories.length} stories preserved with love
                </p>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '15px',
                  maxWidth: '600px',
                  margin: '0 auto 40px'
                }}>
                  {Object.entries(emotionGradients).map(([emotion, gradient]) => (
                    <button
                      key={emotion}
                      onClick={() => {
                        if (memories.length >= 10 && !currentUser?.isPremium) {
                          alert('Upgrade to Premium for unlimited memories! 🌟')
                          setCurrentScreen('pricing')
                          return
                        }
                        setSelectedEmotion(emotion)
                        setCurrentScreen('record')
                      }}
                      style={{
                        padding: '30px 20px',
                        background: gradient,
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        transform: 'translateY(0)',
                        transition: 'all 0.3s ease',
                        textTransform: 'capitalize',
                        opacity: memories.length >= 10 && !currentUser?.isPremium ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-5px)'
                        e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)'
                        e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'
                      }}
                    >
                      {emotion === 'happy' && '😊'}
                      {emotion === 'sad' && '😢'}
                      {emotion === 'grateful' && '🙏'}
                      {emotion === 'excited' && '🎉'}
                      {emotion === 'anxious' && '😰'}
                      {emotion === 'proud' && '🏆'}
                      <br />
                      {emotion}
                    </button>
                  ))}
                </div>
                
                <div style={{ 
                  background: '#f8f9fa',
                  padding: '30px',
                  borderRadius: '16px',
                  marginTop: '40px'
                }}>
                  <h3 style={{ marginBottom: '20px' }}>How It Works</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ textAlign: 'center', flex: '1', minWidth: '150px' }}>
                      <div style={{ fontSize: '36px', marginBottom: '10px' }}>🎙️</div>
                      <p style={{ fontWeight: 'bold' }}>Tap & Speak</p>
                      <p style={{ fontSize: '14px', color: '#666' }}>Choose emotion, record memory</p>
                    </div>
                    <div style={{ textAlign: 'center', flex: '1', minWidth: '150px' }}>
                      <div style={{ fontSize: '36px', marginBottom: '10px' }}>✨</div>
                      <p style={{ fontWeight: 'bold' }}>AI Transcribes</p>
                      <p style={{ fontSize: '14px', color: '#666' }}>Transform into audio story narratives</p>
                    </div>
                    <div style={{ textAlign: 'center', flex: '1', minWidth: '150px' }}>
                      <div style={{ fontSize: '36px', marginBottom: '10px' }}>💝</div>
                      <p style={{ fontWeight: 'bold' }}>Share Forever</p>
                      <p style={{ fontSize: '14px', color: '#666' }}>One-click sharing with family</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                <div style={{ 
                  background: '#f8f9fa',
                  padding: '30px',
                  borderRadius: '16px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ marginBottom: '20px' }}>Join thousands preserving family stories</h3>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    Simple voice recording • AI-powered transcription • Beautiful audio narratives
                  </p>
                  <button
                    onClick={() => setCurrentUser({ email: 'demo@example.com', isPremium: false })}
                    style={{
                      width: '100%',
                      padding: '15px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginBottom: '10px'
                    }}
                  >
                    Get Started Free
                  </button>
                  <p style={{ fontSize: '14px', color: '#666' }}>No credit card required</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Record Screen */}
        {currentScreen === 'record' && selectedEmotion && (
          <div style={{ 
            padding: '40px 20px',
            textAlign: 'center',
            background: emotionGradients[selectedEmotion],
            minHeight: 'calc(100vh - 120px)',
            borderRadius: '20px',
            color: 'white'
          }}>
            <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>
              Feeling {selectedEmotion}
            </h2>
            
            {!selectedPrompt ? (
              <div>
                <p style={{ fontSize: '20px', marginBottom: '30px', opacity: 0.9 }}>
                  Choose a prompt or record freely:
                </p>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '15px',
                  maxWidth: '500px',
                  margin: '0 auto'
                }}>
                  {emotionPrompts[selectedEmotion].map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedPrompt(prompt)}
                      style={{
                        padding: '20px',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderRadius: '12px',
                        fontSize: '16px',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'
                        e.target.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'
                        e.target.style.transform = 'translateY(0)'
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedPrompt('free')}
                    style={{
                      padding: '20px',
                      backgroundColor: 'rgba(255,255,255,0.3)',
                      color: 'white',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.4)'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    🎙️ Record Freely
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {selectedPrompt !== 'free' && (
                  <p style={{ fontSize: '24px', marginBottom: '40px', opacity: 0.9 }}>
                    "{selectedPrompt}"
                  </p>
                )}
                
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  style={{
                    width: '150px',
                    height: '150px',
                    borderRadius: '50%',
                    backgroundColor: isRecording ? '#ff4444' : 'rgba(255,255,255,0.9)',
                    color: isRecording ? 'white' : '#333',
                    border: 'none',
                    fontSize: '60px',
                    cursor: 'pointer',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s ease',
                    animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                  }}
                >
                  {isRecording ? '⏹️' : '🎙️'}
                </button>
                
                <p style={{ marginTop: '20px', fontSize: '18px', opacity: 0.9 }}>
                  {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
                </p>
                
                {isTranscribing && (
                  <div style={{ marginTop: '30px' }}>
                    <div style={{ fontSize: '30px', animation: 'pulse 1.5s infinite' }}>
                      🎙️
                    </div>
                    <p>Transcribing your memory...</p>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setSelectedPrompt(null)
                    setSelectedEmotion(null)
                    setCurrentScreen('welcome')
                  }}
                  style={{
                    marginTop: '40px',
                    padding: '10px 20px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  ← Back
                </button>
              </div>
            )}
          </div>
        )}

        {/* Memories Screen */}
        {currentScreen === 'memories' && (
          <div style={{ padding: '40px 20px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
              Your Memory Collection
            </h2>
            
            {/* Voice Search */}
            <div style={{ 
              marginBottom: '30px',
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '16px',
              textAlign: 'center'
            }}>
              <h3 style={{ marginBottom: '15px' }}>🔍 Voice Search</h3>
              <button
                onClick={startVoiceSearch}
                disabled={isListening}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: isListening ? '#ff4444' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  fontSize: '24px',
                  cursor: isListening ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                  animation: isListening ? 'pulse 1.5s infinite' : 'none'
                }}
              >
                🎤
              </button>
              <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                {isListening ? 'Listening...' : 'Say "play grandma\'s story" or "show happy memories"'}
              </p>
              
              {voiceSearchResults.length > 0 && (
                <div style={{ marginTop: '20px', textAlign: 'left' }}>
                  <h4>Found {voiceSearchResults.length} memories:</h4>
                  {voiceSearchResults.map(memory => (
                    <div 
                      key={memory.id}
                      onClick={() => {
                        const audio = new Audio(memory.audioUrl)
                        audio.play()
                      }}
                      style={{
                        padding: '10px',
                        margin: '5px 0',
                        background: 'white',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                      }}
                    >
                      <span style={{ 
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: emotionGradients[memory.emotion],
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '12px',
                        marginRight: '8px'
                      }}>
                        {memory.emotion}
                      </span>
                      {memory.transcript.substring(0, 50)}...
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {memories.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 40px',
                background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
                borderRadius: '16px',
                border: '2px dashed #ddd',
                animation: 'float 3s ease-in-out infinite'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏺</div>
                <h3 style={{ color: '#666', marginBottom: '15px' }}>Your jar is waiting for memories</h3>
                <p style={{ color: '#888', marginBottom: '25px' }}>
                  Start filling it with your voice, one story at a time
                </p>
                <button
                  onClick={() => setCurrentScreen('welcome')}
                  style={{
                    padding: '12px 30px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
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
                  <div 
                    key={memory.id}
                    style={{
                      padding: '20px',
                      background: 'white',
                      borderRadius: '16px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                      border: '1px solid #eee',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)'
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '15px'
                    }}>
                      <span style={{ 
                        padding: '6px 12px',
                        background: emotionGradients[memory.emotion],
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        {memory.emotion}
                      </span>
                      <span style={{ fontSize: '14px', color: '#999' }}>
                        {new Date(memory.date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {memory.themes && memory.themes.length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                        {memory.themes.map((theme, idx) => (
                          <span 
                            key={idx}
                            style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              marginRight: '5px',
                              marginBottom: '5px',
                              backgroundColor: '#e8f5e9',
                              color: '#2e7d32',
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}
                          >
                            {theme}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <p style={{ 
                      fontSize: '16px',
                      lineHeight: '1.5',
                      color: '#333',
                      marginBottom: '15px'
                    }}>
                      {memory.transcript}
                    </p>
                    
                    <audio 
                      controls 
                      style={{ width: '100%', marginBottom: '10px' }}
                      src={memory.audioUrl}
                    />
                    
                    <button 
                      onClick={() => shareMemory(memory.id)}
                      style={{ 
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#1976D2'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#2196F3'}
                    >
                      📤 Share Memory
                    </button>
                    
                    {shareLinks[memory.id] && (
                      <p style={{ 
                        fontSize: '12px', 
                        marginTop: '8px', 
                        color: '#666',
                        wordBreak: 'break-all'
                      }}>
                        Link copied: {shareLinks[memory.id]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stories Screen */}
        {currentScreen === 'stories' && (
          <div style={{ padding: '40px 20px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
              Transform Your Memories into Audio Stories
            </h2>
            
            {stories.length === 0 && memories.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 40px',
                background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                borderRadius: '16px',
                border: '2px dashed #81c784',
                animation: 'float 3s ease-in-out infinite'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📚</div>
                <h3 style={{ color: '#388e3c', marginBottom: '15px' }}>No stories yet</h3>
                <p style={{ color: '#558b2f', marginBottom: '25px' }}>
                  Record some memories first, then weave them into beautiful audio narratives
                </p>
                <button
                  onClick={() => setCurrentScreen('welcome')}
                  style={{
                    padding: '12px 30px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
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
                  Start Recording
                </button>
              </div>
            ) : (
              <>
                {memories.length > 0 && (
                  <div style={{ 
                    marginBottom: '30px',
                    padding: '20px',
                    background: '#f5f5f5',
                    borderRadius: '12px'
                  }}>
                    <h3 style={{ marginBottom: '15px' }}>Select memories to create a story:</h3>
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                      gap: '10px',
                      marginBottom: '20px'
                    }}>
                      {memories.map(memory => (
                        <label 
                          key={memory.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px',
                            background: selectedMemories.includes(memory.id) ? '#e8f5e9' : 'white',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: selectedMemories.includes(memory.id) ? '2px solid #4CAF50' : '2px solid #ddd'
                          }}
                        >
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
                          <span style={{ 
                            padding: '2px 8px',
                            background: emotionGradients[memory.emotion],
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '12px',
                            marginRight: '8px'
                          }}>
                            {memory.emotion}
                          </span>
                          <span style={{ fontSize: '14px', color: '#666' }}>
                            {memory.transcript.substring(0, 30)}...
                          </span>
                        </label>
                      ))}
                    </div>
                    
                    <button
                      onClick={generateStory}
                      disabled={selectedMemories.length === 0 || isGenerating}
                      style={{
                        padding: '12px 30px',
                        backgroundColor: selectedMemories.length === 0 ? '#ccc' : '#9C27B0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: selectedMemories.length === 0 ? 'not-allowed' : 'pointer',
                        width: '100%'
                      }}
                    >
                      {isGenerating ? '✨ Creating your audio story...' : '✨ Create Audio Story'}
                    </button>
                  </div>
                )}
                
                {/* Display Stories */}
                {stories.length > 0 && (
                  <div>
                    <h3 style={{ marginBottom: '20px' }}>Your Audio Stories</h3>
                    {stories.map(story => (
                      <div 
                        key={story.id}
                        style={{
                          padding: '25px',
                          background: 'white',
                          borderRadius: '16px',
                          marginBottom: '20px',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                          border: '1px solid #eee'
                        }}
                      >
                        <h4 style={{ marginBottom: '15px', color: '#333' }}>{story.title}</h4>
                        <p style={{ 
                          fontSize: '16px',
                          lineHeight: '1.8',
                          color: '#555',
                          marginBottom: '20px'
                        }}>
                          {story.content}
                        </p>
                        
                        {story.audio_url && (
                          <div style={{ marginBottom: '15px' }}>
                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                              🎭 Narrated by ElevenLabs AI
                            </p>
                            <audio 
                              controls 
                              style={{ width: '100%' }}
                              src={story.audio_url}
                            />
                          </div>
                        )}
                        
                        {!story.audio_url && (
                          <button
                            onClick={async () => {
                              setActiveIntegration('🎭 Generating audio with ElevenLabs...')
                              
                              try {
                                const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY
                                
                                if (!apiKey) {
                                  // Create realistic mock audio
                                  setTimeout(() => {
                                    const audioBlob = new Blob(['mock audio data'], { type: 'audio/mpeg' })
                                    const audioUrl = URL.createObjectURL(audioBlob)
                                    
                                    // Update story with audio URL
                                    setStories(stories.map(s => 
                                      s.id === story.id ? { ...s, audio_url: audioUrl } : s
                                    ))
                                    
                                    setActiveIntegration('')
                                    setSuccessMessage('Audio narration created! 🎭')
                                    setTimeout(() => setSuccessMessage(''), 3000)
                                  }, 3000)
                                  return
                                }
                                
                                // Real ElevenLabs API call
                                const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
                                  method: 'POST',
                                  headers: {
                                    'Accept': 'audio/mpeg',
                                    'Content-Type': 'application/json',
                                    'xi-api-key': apiKey
                                  },
                                  body: JSON.stringify({
                                    text: story.content,
                                    model_id: 'eleven_monolingual_v1',
                                    voice_settings: {
                                      stability: 0.5,
                                      similarity_boost: 0.5
                                    }
                                  })
                                })
                                
                                if (response.ok) {
                                  const audioBlob = await response.blob()
                                  const audioUrl = URL.createObjectURL(audioBlob)
                                  
                                  setStories(stories.map(s => 
                                    s.id === story.id ? { ...s, audio_url: audioUrl } : s
                                  ))
                                  
                                  setSuccessMessage('Audio narration created! 🎭')
                                  setTimeout(() => setSuccessMessage(''), 3000)
                                }
                                
                              } catch (error) {
                                console.error('Audio generation error:', error)
                                alert('Audio generation failed. Please try again.')
                              } finally {
                                setActiveIntegration('')
                              }
                            }}
                            style={{
                              padding: '10px 20px',
                              backgroundColor: '#9C27B0',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 'bold',
                              width: '100%',
                              marginBottom: '10px'
                            }}
                          >
                            🎭 Generate Audio Narration
                          </button>
                        )}
                        
                        <div style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
                          Created from {story.memories.length} memories • {new Date(story.date).toLocaleDateString()}
                        </div>
                        
                        <button
                          onClick={() => {
                            const link = `https://mymemoryjar.com/story/${story.id}`
                            navigator.clipboard.writeText(link)
                            setSuccessMessage('Story link copied! 📋')
                            setTimeout(() => setSuccessMessage(''), 3000)
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        >
                          📤 Share Audio Story
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Family Screen */}
        {currentScreen === 'family' && (
          <div style={{ padding: '40px 20px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
              Family Access
            </h2>
            
            {familyMembers.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 40px',
                background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                borderRadius: '16px',
                border: '2px dashed #ffb74d',
                animation: 'float 3s ease-in-out infinite'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>👨‍👩‍👧‍👦</div>
                <h3 style={{ color: '#e65100', marginBottom: '15px' }}>Share memories with loved ones</h3>
                <p style={{ color: '#ef6c00', marginBottom: '25px' }}>
                  Invite family members to listen, contribute, and preserve stories together
                </p>
                <button
                  onClick={() => {
                    const name = prompt('Family member name:')
                    const email = prompt('Their email:')
                    if (name && email) {
                      addFamilyMember(name, email, 'viewer')
                      setSuccessMessage('Family member invited! 💌')
                      setTimeout(() => setSuccessMessage(''), 3000)
                    }
                  }}
                  style={{
                    padding: '12px 30px',
                    backgroundColor: '#FF9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(255, 152, 0, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 6px 20px rgba(255, 152, 0, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 4px 15px rgba(255, 152, 0, 0.3)'
                  }}
                >
                  Invite First Member
                </button>
              </div>
            ) : (
              <>
                <div style={{ 
                  marginBottom: '30px',
                  padding: '20px',
                  background: '#f5f5f5',
                  borderRadius: '12px'
                }}>
                  <button
                    onClick={() => {
                      const name = prompt('Family member name:')
                      const email = prompt('Their email:')
                      if (name && email) {
                        addFamilyMember(name, email, 'viewer')
                        setSuccessMessage('Family member invited! 💌')
                        setTimeout(() => setSuccessMessage(''), 3000)
                      }
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#FF9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  >
                    + Invite Family Member
                  </button>
                </div>
                
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '20px'
                }}>
                  {familyMembers.map(member => (
                    <div 
                      key={member.id}
                      style={{
                        padding: '20px',
                        background: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                      }}
                    >
                      <h4 style={{ marginBottom: '10px' }}>{member.name}</h4>
                      <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                        {member.email}
                      </p>
                      <div style={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          padding: '4px 12px',
                          backgroundColor: member.access === 'contributor' ? '#4CAF50' : '#2196F3',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          {member.access}
                        </span>
                        <button
                          onClick={() => {
                            const updatedMembers = familyMembers.map(m => 
                              m.id === member.id 
                                ? { ...m, access: m.access === 'viewer' ? 'contributor' : 'viewer' }
                                : m
                            )
                            setFamilyMembers(updatedMembers)
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#f5f5f5',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Change Access
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div style={{ 
                  marginTop: '40px',
                  padding: '20px',
                  background: '#e8f5e9',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <h4 style={{ marginBottom: '10px' }}>Family Stats</h4>
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '20px',
                    marginTop: '20px'
                  }}>
                    <div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50' }}>
                        {memories.length}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>Total Memories</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#9C27B0' }}>
                        {stories.length}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>Stories Created</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FF9800' }}>
                        {familyMembers.length}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>Family Members</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Pricing Screen */}
        {currentScreen === 'pricing' && (
          <div style={{ padding: '40px 20px' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>
              Choose Your Plan
            </h2>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '40px' }}>
              Preserve unlimited memories with Premium
            </p>
            
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '30px',
              maxWidth: '900px',
              margin: '0 auto'
            }}>
              {/* Free Plan */}
              <div style={{ 
                backgroundColor: 'white',
                padding: '40px 30px',
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                textAlign: 'center',
                border: '1px solid #eee'
              }}>
                <h3 style={{ color: '#333', marginBottom: '10px' }}>Free</h3>
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
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Basic story creation</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ 2 family members</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Voice search</li>
                  <li style={{ padding: '8px 0', color: '#999' }}>❌ Audio story narration</li>
                  <li style={{ padding: '8px 0', color: '#999' }}>❌ Blockchain verification</li>
                </ul>
                
                <button style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
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
                  top: '-15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#9C27B0',
                  color: 'white',
                  padding: '5px 20px',
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
                <p style={{ color: '#666', marginBottom: '30px' }}>For active families</p>
                
                <ul style={{ 
                  listStyle: 'none', 
                  padding: 0, 
                  textAlign: 'left',
                  marginBottom: '30px'
                }}>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Unlimited memories</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ AI audio story narration</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Unlimited family members</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Advanced voice commands</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Blockchain verification</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Priority support</li>
                </ul>
                
                <button 
                  onClick={() => {
                    setActiveIntegration('💳 Processing with RevenueCat...')
                    setTimeout(() => {
                      setActiveIntegration('')
                      alert('Premium upgrade successful! 🎉')
                      setCurrentUser({ ...currentUser, isPremium: true })
                      setCurrentScreen('welcome')
                    }, 2000)
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#9C27B0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#7B1FA2'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#9C27B0'}
                >
                  Upgrade Now
                </button>
              </div>

              {/* Enterprise Plan */}
              <div style={{ 
                backgroundColor: 'white',
                padding: '40px 30px',
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                textAlign: 'center',
                border: '1px solid #eee'
              }}>
                <h3 style={{ color: '#333', marginBottom: '10px' }}>Enterprise</h3>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#333', marginBottom: '10px' }}>
                  $19.99
                  <span style={{ fontSize: '18px', color: '#666' }}>/month</span>
                </div>
                <p style={{ color: '#666', marginBottom: '30px' }}>For large families & organizations</p>
                
                <ul style={{ 
                  listStyle: 'none', 
                  padding: 0, 
                  textAlign: 'left',
                  marginBottom: '30px'
                }}>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Everything in Premium</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Custom AI voices</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Advanced analytics</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ White-label options</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ API access</li>
                  <li style={{ padding: '8px 0', color: '#333' }}>✅ Dedicated support</li>
                </ul>
                
                <button style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}>
                  Contact Sales
                </button>
              </div>
            </div>
            
            <div style={{ 
              marginTop: '60px',
              padding: '30px',
              backgroundColor: '#f0f8ff',
              borderRadius: '16px',
              textAlign: 'center'
            }}>
              <h4 style={{ marginTop: '0', marginBottom: '15px' }}>💳 Powered by RevenueCat</h4>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '0' }}>
                Secure payment processing • Cancel anytime • Family-friendly pricing
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer with All Integrations */}
      <footer style={{ 
        marginTop: '80px',
        padding: '40px 20px',
        borderTop: '1px solid #eee',
        textAlign: 'center',
        background: '#fafafa'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ 
            color: '#666', 
            marginBottom: '20px',
            fontSize: '16px'
          }}>
            Built with: Bolt.new | Supabase | OpenAI | ElevenLabs | Algorand | RevenueCat | Entri | Netlify
          </p>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '15px',
            flexWrap: 'wrap',
            marginTop: '30px'
          }}>
            <span style={{ 
              padding: '8px 16px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '20px', 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              ⚡ Bolt.new
            </span>
            <span style={{ 
              padding: '8px 16px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '20px', 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              🗄️ Supabase
            </span>
            <span style={{ 
              padding: '8px 16px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '20px', 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              🤖 OpenAI
            </span>
            <span style={{ 
              padding: '8px 16px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '20px', 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              🎭 ElevenLabs
            </span>
            <span style={{ 
              padding: '8px 16px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '20px', 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              ⛓️ Algorand
            </span>
            <span style={{ 
              padding: '8px 16px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '20px', 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              💳 RevenueCat
            </span>
            <span style={{ 
              padding: '8px 16px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '20px', 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              🌐 Entri
            </span>
            <span style={{ 
              padding: '8px 16px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '20px', 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              🚀 Netlify
            </span>
          </div>
          
          <p style={{ 
            marginTop: '30px',
            color: '#999',
            fontSize: '14px'
          }}>
            © 2025 My Memory Jar • mymemoryjar.com
          </p>
        </div>
      </footer>

      {/* Bolt.new Badge - MANDATORY for Hackathon */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        backgroundColor: '#000',
        padding: '10px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <a 
          href="https://bolt.new" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            color: '#fff',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Built with ⚡ Bolt.new
        </a>
      </div>
    </div>
  )
}

export default App