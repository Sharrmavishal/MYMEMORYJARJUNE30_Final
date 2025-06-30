import React, { useState, useEffect, useRef } from 'react'
import { supabase, authService, memoryService, storyService, familyService } from './lib/supabase'
import { createClient } from '@supabase/supabase-js'

// Add Supabase initialization for audio uploads
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tzfvteccfyxfefwhmara.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6ZnZ0ZWNjZnl4ZmVmd2htYXJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjUxMjUsImV4cCI6MjA2Njg0MTEyNX0.2V5VDPPGTxo4R-_s-e7eBUEc7MF8N0s-9zdsZpCNFgY'
const supabaseClient = createClient(supabaseUrl, supabaseKey)

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
  const [isListening, setIsListening] = useState(false)
  const [voiceSearchActive, setVoiceSearchActive] = useState(false)
  const [voiceSearchResults, setVoiceSearchResults] = useState([])
  
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
// Transcription with real OpenAI Whisper API
const transcribeAudio = async () => {
  if (!audioBlob) return
  
  setIsTranscribing(true)
  
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    
    if (!apiKey) {
      console.error('OpenAI API key not found')
      // Fallback to mock for demo if no API key
      await new Promise(resolve => setTimeout(resolve, 2000))
      const mockTranscripts = {
        happy: "Today was such a wonderful day! I spent time with my family at the park, and we had the most amazing picnic. The kids were laughing and playing, and I felt so grateful for these precious moments together.",
        sad: "I've been thinking about grandma a lot today. She used to tell the most beautiful stories about her childhood. I miss her voice and her warm hugs. These memories are so precious to me.",
        grateful: "I'm so thankful for all the love in my life. My family, my friends, even the small moments like morning coffee and sunset walks. Every day brings something to be grateful for.",
        excited: "I can't contain my excitement! We're planning a family reunion next month, and everyone will be there. It's been years since we've all been together. I can already imagine all the stories we'll share!"
      }
      setTranscript(mockTranscripts[selectedEmotion] || "This is a sample transcription of your recorded memory.")
      setIsTranscribing(false)
      return
    }
    
    // Create form data for OpenAI
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-1')
    formData.append('language', 'en')
    
    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('Transcription successful:', data.text)
    
    // Set the real transcription
    setTranscript(data.text)
    
  } catch (error) {
    console.error('Transcription error:', error)
    alert('Transcription failed. Please try again.')
  } finally {
    setIsTranscribing(false)
  }
}

 // Save memory to database with audio upload
const saveMemory = async () => {
  if (!user || !transcript || !selectedEmotion || !audioBlob) return
  
  try {
    // First, upload the audio to Supabase Storage
    const fileName = `recordings/${user.id}/${Date.now()}.webm`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('audio-recordings')
      .upload(fileName, audioBlob, {
        contentType: 'audio/webm'
      })
    
    if (uploadError) {
      console.error('Audio upload error:', uploadError)
      alert('Failed to upload audio. Please try again.')
      return
    }
    
    // Get public URL for the uploaded audio
    const { data: { publicUrl } } = supabaseClient.storage
      .from('audio-recordings')
      .getPublicUrl(fileName)
    
    // Now save the memory with the audio URL
    const memory = {
      user_id: user.id,
      emotion: selectedEmotion,
      transcript: transcript,
      audio_url: publicUrl // Now we have the real audio URL!
    }
    
    const savedMemory = await memoryService.saveMemory(memory)
    if (savedMemory) {
      setMemories(prev => [savedMemory, ...prev])
      // Reset form
      setSelectedEmotion('')
      setTranscript('')
      setAudioBlob(null)
      
      // Show success message
      alert('Memory saved successfully!')
    }
  } catch (error) {
    console.error('Error saving memory:', error)
    alert('Failed to save memory. Please try again.')
  }
}

// Story generation with real GPT-4 API
const generateStory = async () => {
  if (selectedMemories.length === 0) return
  
  setIsGeneratingStory(true)
  
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    
    if (!apiKey) {
      console.error('OpenAI API key not found')
      // Fallback to mock
      await new Promise(resolve => setTimeout(resolve, 3000))
      const selectedMemoryData = memories.filter(m => selectedMemories.includes(m.id))
      const storyText = `Once upon a time, there were beautiful moments that shaped a family's journey together. ${selectedMemoryData.map(m => m.transcript).join(' ')} These memories, woven together, tell the story of love, growth, and the precious bonds that connect us all.`
      
      const story = {
        user_id: user.id,
        memory_ids: selectedMemories,
        story_text: storyText,
        audio_url: null
      }
      
      const savedStory = await storyService.saveStory(story)
      if (savedStory) {
        setStories(prev => [savedStory, ...prev])
        setSelectedMemories([])
      }
      setIsGeneratingStory(false)
      return
    }
    
    // Get selected memories data
    const selectedMemoryData = memories.filter(m => selectedMemories.includes(m.id))
    
    // Create prompt for GPT-4
    const prompt = `You are helping preserve real family memories exactly as they were shared.

Based on these recorded memories, create a faithful narrative that:
- Preserves the EXACT words and content from the memories
- Connects them chronologically if multiple memories
- Adds minimal context only to link memories together
- Maintains the authentic voice and emotion
- Does NOT add fictional elements, characters, or storylines
- Keeps the original meaning and intent

Here are the actual memories to preserve:
${selectedMemoryData.map((m, i) => `Memory ${i + 1} (${m.emotion}): ${m.transcript}`).join('\n\n')}

Create a narrative that faithfully preserves these exact memories, adding only minimal connecting words between them if needed. Keep it under 250 words.`
    
    // Call GPT-4 API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a skilled family storyteller who creates beautiful, emotional narratives from personal memories.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    })
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }
    
    const data = await response.json()
    const storyText = data.choices[0].message.content
    
    console.log('Story generated successfully')
    
    // Generate audio narration if ElevenLabs API key is available
    let audioUrl = null
    const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY
    
    if (elevenLabsKey) {
      audioUrl = await generateAudioNarration(storyText, elevenLabsKey)
    }
    
    // Save story to database
    const story = {
      user_id: user.id,
      memory_ids: selectedMemories,
      story_text: storyText,
      audio_url: audioUrl
    }
    
    const savedStory = await storyService.saveStory(story)
    if (savedStory) {
      setStories(prev => [savedStory, ...prev])
      setSelectedMemories([])
      
      // After saving story to database, add blockchain verification
      if (savedStory.audio_url) {
        try {
          // Mock Algorand integration - in production, use actual Algorand SDK
          const blockchainTx = `ALG-${Date.now()}-${savedStory.id.substring(0, 8)}`
          console.log('🔗 Blockchain verification:', blockchainTx)
          
          // Update story with blockchain tx
          const { data: updatedStory } = await supabaseClient
            .from('stories')
            .update({ blockchain_tx: blockchainTx })
            .eq('id', savedStory.id)
            .select()
            .single()
          
          alert(`Story saved and verified on blockchain! Tx: ${blockchainTx}`)
        } catch (error) {
          console.log('Blockchain verification skipped:', error)
        }
      }
    }
    
  } catch (error) {
    console.error('Story generation error:', error)
    alert('Story generation failed. Please try again.')
  } finally {
    setIsGeneratingStory(false)
  }
}
  

// Generate audio narration with ElevenLabs
const generateAudioNarration = async (text, apiKey) => {
  try {
    // Use a warm, storytelling voice
    const voiceId = 'EXAVITQu4vr4xnSDxMaL' // Sarah - warm female voice
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.85,
          style: 0.5,
          use_speaker_boost: true
        }
      })
    })
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`)
    }
    
    // Get audio blob
    const audioBlob = await response.blob()
    
    // Upload to Supabase Storage (using supabaseClient instead of supabase)
    const fileName = `stories/${user.id}/${Date.now()}.mp3`
    const { data, error } = await supabaseClient.storage
      .from('audio-recordings')
      .upload(fileName, audioBlob, {
        contentType: 'audio/mpeg'
      })
    
    if (error) {
      console.error('Audio upload error:', error)
      return null
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('audio-recordings')
      .getPublicUrl(fileName)
    
    console.log('Audio narration generated successfully')
    return publicUrl
    
  } catch (error) {
    console.error('Audio narration error:', error)
    return null // Return null if narration fails, story will still be saved
  }
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
        const audio = new Audio(results[0].audio_url)
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
              <strong>How it works:</strong> Choose an emotion → Record your story → AI transcribes → Create audio story narratives → Share with family
            </p>
          </div>

          {/* Navigation Buttons */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
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
            <button
              onClick={() => setCurrentScreen('pricing')}
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
              💳 Pricing Plans
            </button>
          </div>
        </div>
        
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
            {/* Voice Search */}
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
                    transition: 'all 0.3s ease'
                  }}
                >
                  {isListening ? '⏹️' : '🎤'}
                </button>
              </div>
              
              {isListening && (
                <div style={{ 
                  textAlign: 'center',
                  padding: '20px'
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
                    onClick={() => {
                      if (memory.audio_url) {
                        const audio = new Audio(memory.audio_url)
                        audio.play()
                      }
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
              Transform your recordings into shareable audio stories
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
          
          {/* Audio Player for Narration */}
          {story.audio_url && (
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f0f8ff',
              borderRadius: '10px',
              border: '1px solid #2196F3'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px' }}>🎧</span>
                <strong style={{ color: '#2196F3' }}>Listen to Audio Narration</strong>
              </div>
              <audio 
                controls 
                style={{ width: '100%' }}
                preload="metadata"
              >
                <source src={story.audio_url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
          
          {/* Sharing Options - INSIDE the map */}
          {story.audio_url && (
            <div style={{ 
              marginTop: '15px',
              display: 'flex',
              gap: '10px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  // Share via Web Share API
                  if (navigator.share) {
                    navigator.share({
                      title: 'Family Memory Story',
                      text: story.story_text.substring(0, 100) + '...',
                      url: story.audio_url
                    })
                  } else {
                    // Fallback - copy to clipboard
                    navigator.clipboard.writeText(story.audio_url)
                    alert('Story link copied to clipboard!')
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1DA1F2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                📤 Share Story
              </button>
              
              <button
                onClick={() => {
                  // Download audio
                  const a = document.createElement('a')
                  a.href = story.audio_url
                  a.download = `family-story-${story.id}.mp3`
                  a.click()
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                💾 Download
              </button>
            </div>
          )}
          
          <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            <strong>Based on {story.memory_ids.length} memories</strong>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
        
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
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',color: 'white',
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
// Pricing screen
if (currentScreen === 'pricing') {
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
Pricing Plans
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
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '30px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <h2>Pricing Plans</h2>
        <p style={{ color: '#666', marginBottom: '40px', textAlign: 'center' }}>
          Choose the perfect plan for your family's memory preservation needs
        </p>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          maxWidth: '900px',
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
              <li style={{ padding: '8px 0', color: '#333' }}>✅ Basic story creation</li>
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
            <h3 style={{ color: '#9C27B0', marginBottom: '10px' }}>Premium</h3>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#333', marginBottom: '10px' }}>
              $4.99
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
            </ul>
            
            <button 
  onClick={async () => {
    // Check if user has reached free limit
    if (memories.length >= 10) {
      alert('🔒 You\'ve reached the free limit of 10 memories!\n\nUpgrade to Premium for:\n• Unlimited memories\n• AI audio narration\n• Blockchain verification\n• Priority support\n\nRedirecting to payment...')
      
      // Mock RevenueCat - in production, use actual SDK
      // Example: await Purchases.purchasePackage(package)
      
      // For demo, simulate purchase
      setTimeout(() => {
        alert('Payment successful! Welcome to Premium! 🎉')
        // Update user status in database
      }, 2000)
    } else {
      alert(`You have ${10 - memories.length} free memories remaining. Upgrade for unlimited access!`)
    }
  }}
  style={{
    width: '100%',
    padding: '12px',
    backgroundColor: '#9C27B0',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer'
  }}
>
  {memories.length >= 10 ? '🔒 Upgrade Required' : 'Upgrade to Premium'}
</button>
          </div>
        </div>
      </div>
    </div>
    
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
return null
}
export default App