import { useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'local_stt_transcript_v1'

const getSpeechRecognition = () => window.SpeechRecognition || window.webkitSpeechRecognition

function AudioControl() {
	const [isRecording, setIsRecording] = useState(false)
	const [status, setStatus] = useState('Ready')
	const [error, setError] = useState('')
	const [interimText, setInterimText] = useState('')
	const [transcript, setTranscript] = useState(() => localStorage.getItem(STORAGE_KEY) || '')

	const mediaStreamRef = useRef(null)
	const mediaRecorderRef = useRef(null)
	const recognitionRef = useRef(null)
	const audioChunksRef = useRef([])
	const ignoreNextEndRef = useRef(false)
	const isRecordingRef = useRef(false)

	const speechSupported = useMemo(() => Boolean(getSpeechRecognition()), [])

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, transcript)
	}, [transcript])

	useEffect(() => {
		isRecordingRef.current = isRecording
	}, [isRecording])

	useEffect(() => {
		return () => {
			if (recognitionRef.current) {
				ignoreNextEndRef.current = true
				recognitionRef.current.stop()
			}
			if (mediaRecorderRef.current?.state === 'recording') {
				mediaRecorderRef.current.stop()
			}
			if (mediaStreamRef.current) {
				mediaStreamRef.current.getTracks().forEach((track) => track.stop())
			}
		}
	}, [])

	const downloadAudio = () => {
		if (!audioChunksRef.current.length) {
			return
		}
		const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
		const url = URL.createObjectURL(blob)
		const anchor = document.createElement('a')
		anchor.href = url
		anchor.download = `recording-${Date.now()}.webm`
		document.body.appendChild(anchor)
		anchor.click()
		anchor.remove()
		URL.revokeObjectURL(url)
	}

	const stopEverything = () => {
		if (recognitionRef.current) {
			ignoreNextEndRef.current = true
			recognitionRef.current.stop()
		}
		if (mediaRecorderRef.current?.state === 'recording') {
			mediaRecorderRef.current.stop()
		}
		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach((track) => track.stop())
			mediaStreamRef.current = null
		}
		setInterimText('')
		setIsRecording(false)
		setStatus('Stopped')
	}

	const startRecording = async () => {
		setError('')
		if (!speechSupported) {
			setError('Speech recognition not supported in this browser. Use Chrome/Edge.')
			return
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			mediaStreamRef.current = stream
			audioChunksRef.current = []

			const recorder = new MediaRecorder(stream)
			mediaRecorderRef.current = recorder

			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data)
				}
			}

			recorder.onstop = () => {
				downloadAudio()
			}

			recorder.start()

			const SpeechRecognition = getSpeechRecognition()
			const recognition = new SpeechRecognition()
			recognitionRef.current = recognition
			recognition.continuous = true
			recognition.interimResults = true
			recognition.lang = 'en-US'

			recognition.onresult = (event) => {
				let finalChunk = ''
				let interimChunk = ''

				for (let index = event.resultIndex; index < event.results.length; index += 1) {
					const result = event.results[index]
					const text = result[0]?.transcript || ''
					if (result.isFinal) {
						finalChunk += `${text.trim()} `
					} else {
						interimChunk += text
					}
				}

				if (finalChunk.trim()) {
					setTranscript((prev) => `${prev}${prev ? '\n' : ''}${finalChunk.trim()}`)
				}
				setInterimText(interimChunk.trim())
			}

			recognition.onerror = (event) => {
				setError(`Speech recognition error: ${event.error}`)
				stopEverything()
			}

			recognition.onend = () => {
				if (!ignoreNextEndRef.current && isRecordingRef.current) {
					try {
						recognition.start()
					} catch {
						setStatus('Stopped')
						setIsRecording(false)
					}
				}
				ignoreNextEndRef.current = false
			}

			recognition.start()

			setIsRecording(true)
			setStatus('Recording...')
		} catch (err) {
			setError(err?.message || 'Failed to start recording')
			setStatus('Failed to start')
		}
	}

	const toggleRecording = async () => {
		if (isRecording) {
			stopEverything()
			return
		}
		await startRecording()
	}

	const clearTranscript = () => {
		setTranscript('')
		setInterimText('')
		localStorage.removeItem(STORAGE_KEY)
	}

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100 p-6">
			<div className="max-w-3xl mx-auto">
				<h1 className="text-2xl font-bold mb-4">Local Recorder + STT</h1>
				<p className="text-slate-400 mb-6">No login, no meeting IDs, local-only storage.</p>

				<div className="bg-slate-900 rounded-lg border border-slate-800 p-4 mb-4">
					<p className="text-sm text-slate-400">Status</p>
					<p className="font-medium">{status}</p>
					{error ? <p className="mt-2 text-red-400 text-sm">{error}</p> : null}
				</div>

				<div className="flex gap-3 mb-6">
					<button
						onClick={toggleRecording}
						className={`px-5 py-3 rounded font-semibold transition-colors ${
							isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
						}`}
					>
						{isRecording ? 'Stop Recording' : 'Start Recording'}
					</button>
					<button
						onClick={clearTranscript}
						className="px-5 py-3 rounded font-semibold bg-slate-700 hover:bg-slate-600"
					>
						Clear Local Transcript
					</button>
				</div>

				<div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
					<p className="text-sm text-slate-400 mb-2">Transcript (saved in localStorage)</p>
					<div className="whitespace-pre-wrap text-sm leading-6">
						{transcript || 'Transcript will appear here...'}
						{interimText ? <span className="text-slate-500 italic">\n{interimText}</span> : null}
					</div>
				</div>
			</div>
		</div>
	)
}

export default AudioControl
