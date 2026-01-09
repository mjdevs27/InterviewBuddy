'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type Message = { role: 'ai' | 'user'; text: string };

type CollectedData = {
    type?: string;
    role?: string;
    level?: string;
    techstack?: string;
};

interface VoiceInterviewProps {
    userId: string;
    userName: string;
    onComplete?: () => void;
}

export default function VoiceInterview({
    userId,
    userName,
    onComplete,
}: VoiceInterviewProps) {
    const [transcript, setTranscript] = useState<Message[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [step, setStep] = useState<number>(-1); // -1 = not started
    const [collectedData, setCollectedData] = useState<CollectedData>({});
    const [questions, setQuestions] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const recognitionRef = useRef<any>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const handleUserResponseRef = useRef<((text: string) => void) | undefined>(undefined);

    const questionsToAsk = [
        'What type of interview are you preparing for? You can say Technical, Behavioral, or Mixed.',
        'Great! What role are you preparing for? For example, Backend Developer, Frontend Developer, or Full Stack Developer.',
        'Perfect! What level position is this? Junior, Mid-level, or Senior?',
        'Excellent! What tech stack or technologies should we focus on? For example, Node.js, React, Python, or AWS.',
    ];

    // Auto-scroll to bottom of transcript
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    // Initialize speech recognition
    useEffect(() => {
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                const userText = event.results[0][0].transcript;
                // Call the latest version of handleUserResponse
                if (handleUserResponseRef.current) {
                    handleUserResponseRef.current(userText);
                }
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        } else {
            console.warn('Speech recognition not supported in this browser');
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const speak = (text: string, callback?: () => void) => {
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onend = () => {
            setIsSpeaking(false);
            if (callback) callback();
        };

        utterance.onerror = () => {
            setIsSpeaking(false);
            if (callback) callback();
        };

        window.speechSynthesis.speak(utterance);

        // Add to transcript
        setTranscript((prev) => [...prev, { role: 'ai', text }]);
    };

    const startListening = () => {
        if (!recognitionRef.current) {
            console.error('Speech recognition not initialized');
            return;
        }

        if (isListening) {
            console.log('Already listening, skipping...');
            return;
        }

        try {
            console.log('Starting speech recognition...');
            setIsListening(true);
            recognitionRef.current.start();
        } catch (error: any) {
            console.error('Error starting recognition:', error);
            setIsListening(false);

            // If already started error, try to restart
            if (error.message && error.message.includes('already started')) {
                try {
                    recognitionRef.current.stop();
                    setTimeout(() => {
                        setIsListening(true);
                        recognitionRef.current.start();
                    }, 100);
                } catch (e) {
                    console.error('Failed to restart recognition:', e);
                    setIsListening(false);
                }
            }
        }
    };

    const handleUserResponse = (text: string) => {
        // Add user response to transcript
        setTranscript((prev) => [...prev, { role: 'user', text }]);

        // Extract and save data based on current step
        const newData = { ...collectedData };

        if (step === 0) {
            // Extract interview type
            const lowerText = text.toLowerCase();
            if (lowerText.includes('technical')) newData.type = 'technical';
            else if (lowerText.includes('behavioral')) newData.type = 'behavioral';
            else if (lowerText.includes('mixed')) newData.type = 'mixed';
            else newData.type = text.toLowerCase();
        } else if (step === 1) {
            newData.role = text;
        } else if (step === 2) {
            // Extract level
            const lowerText = text.toLowerCase();
            if (lowerText.includes('junior')) newData.level = 'junior';
            else if (lowerText.includes('mid')) newData.level = 'mid-level';
            else if (lowerText.includes('senior')) newData.level = 'senior';
            else newData.level = text.toLowerCase();
        } else if (step === 3) {
            newData.techstack = text;
        }

        setCollectedData(newData);

        // Move to next step
        const nextStep = step + 1;
        setStep(nextStep);

        if (nextStep < 4) {
            // Ask next question after a brief pause
            setTimeout(() => {
                speak(questionsToAsk[nextStep], () => {
                    // Auto-start listening after AI finishes speaking
                    setTimeout(startListening, 500);
                });
            }, 1000);
        } else {
            // All data collected, generate questions
            setTimeout(() => generateInterviewQuestions(newData), 1000);
        }
    };

    // Keep the ref updated with the latest handleUserResponse
    useEffect(() => {
        handleUserResponseRef.current = handleUserResponse;
    }, [step, collectedData]);

    const generateInterviewQuestions = async (data: CollectedData) => {
        setIsGenerating(true);
        speak('Great! I have all the information. Let me generate 10 custom interview questions for you. This will just take a moment.');

        try {
            const response = await fetch('/api/vapi/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: data.type,
                    role: data.role,
                    level: data.level,
                    techstack: data.techstack,
                    amount: 10,
                    userId: userId,
                }),
            });

            const { success, questions: generatedQuestions } = await response.json();

            if (success && generatedQuestions && generatedQuestions.length > 0) {
                setQuestions(generatedQuestions);
                setIsGenerating(false);

                // Speak confirmation
                setTimeout(() => {
                    speak(
                        `Perfect! I've generated ${generatedQuestions.length} questions for your ${data.level} ${data.role} position. Let me read them to you.`,
                        () => {
                            // Read questions one by one with delays
                            readQuestionsSequentially(generatedQuestions);
                        }
                    );
                }, 2000);
            } else {
                setIsGenerating(false);
                speak('Sorry, there was an error generating questions. Please try again.');
            }
        } catch (error) {
            setIsGenerating(false);
            console.error('Error generating questions:', error);
            speak('Sorry, there was an error generating questions. Please try again.');
        }
    };

    const readQuestionsSequentially = (questionsArray: string[], index = 0) => {
        if (index < questionsArray.length) {
            speak(`Question ${index + 1}: ${questionsArray[index]}`, () => {
                // Wait 2 seconds before next question
                setTimeout(() => readQuestionsSequentially(questionsArray, index + 1), 2000);
            });
        } else {
            // All questions read
            setTimeout(() => {
                speak(
                    'Those are all your interview questions. They have been saved to your account. Good luck with your interview preparation!',
                    () => {
                        if (onComplete) onComplete();
                    }
                );
            }, 1000);
        }
    };

    const startInterview = () => {
        setStep(0);
        speak(
            `Hello ${userName}! I'll help you prepare for your interview. Let me ask you a few questions to generate personalized interview questions for you.`,
            () => {
                setTimeout(() => {
                    speak(questionsToAsk[0], () => {
                        // Auto-start listening after first question
                        setTimeout(startListening, 500);
                    });
                }, 1500);
            }
        );
    };

    const stopInterview = () => {
        // Abort speech recognition
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Reset all state
        setIsListening(false);
        setIsSpeaking(false);
        setIsGenerating(false);
        setStep(-1);
        setTranscript([]);
        setCollectedData({});
        setQuestions([]);

        // Call onComplete callback if provided
        if (onComplete) {
            onComplete();
        }
    };

    return (
        <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Interview Generation</h2>
                {step >= 0 && (
                    <button
                        onClick={stopInterview}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                        Stop
                    </button>
                )}
            </div>

            {/* Avatar Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AI Interviewer Card */}
                <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-800/30 rounded-2xl p-12 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none"></div>
                    <div className={cn(
                        "relative w-32 h-32 rounded-full bg-indigo-200 flex items-center justify-center mb-6 transition-all duration-300",
                        isSpeaking && "ring-4 ring-indigo-500 ring-offset-4 ring-offset-slate-900"
                    )}>
                        <svg className="w-16 h-16 text-indigo-900" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                            <circle cx="12" cy="10" r="1.5" />
                            <circle cx="8" cy="10" r="1.5" />
                            <circle cx="16" cy="10" r="1.5" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-semibold text-white">AI Interviewer</h3>
                    {isSpeaking && (
                        <div className="mt-4 flex gap-1">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    )}
                </div>

                {/* User Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-12 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-600/5 to-transparent pointer-events-none"></div>
                    <div className={cn(
                        "relative w-32 h-32 rounded-full bg-slate-300 flex items-center justify-center mb-6 overflow-hidden transition-all duration-300",
                        isListening && "ring-4 ring-red-500 ring-offset-4 ring-offset-slate-900"
                    )}>
                        {/* User avatar - showing default user icon if no avatar */}
                        <svg className="w-20 h-20 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-semibold text-white">{userName}</h3>
                    {isListening && (
                        <div className="mt-4 flex items-center gap-2 text-red-400">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium">Listening...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Transcript Display */}
            {transcript.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-h-[300px] overflow-y-auto">
                    <div className="flex flex-col gap-3">
                        {transcript.slice(-3).map((msg, i) => (
                            <div
                                key={transcript.length - 3 + i}
                                className="text-center"
                            >
                                <p className={cn(
                                    "text-base",
                                    msg.role === 'ai' ? 'text-zinc-300' : 'text-blue-300 font-medium'
                                )}>
                                    {msg.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Status and Controls */}
            <div className="flex flex-col items-center gap-4">
                {isGenerating && (
                    <div className="flex items-center gap-2 text-yellow-400 animate-pulse">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="font-medium">Generating interview questions...</span>
                    </div>
                )}

                {/* Manual listening button */}
                {step >= 0 && step < 4 && !isSpeaking && !isListening && !isGenerating && (
                    <button
                        onClick={startListening}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-colors shadow-lg shadow-blue-500/20"
                    >
                        🎤 Click to Answer (Step {step + 1}/4)
                    </button>
                )}

                {/* Step indicator */}
                {step >= 0 && step < 4 && (
                    <div className="flex gap-2">
                        {[0, 1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={cn(
                                    "w-3 h-3 rounded-full transition-colors",
                                    s <= step ? "bg-blue-500" : "bg-slate-700"
                                )}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Generated Questions Display */}
            {questions.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-2xl font-bold mb-6">
                        Your Interview Questions ({questions.length})
                    </h3>
                    <div className="grid gap-4">
                        {questions.map((q, i) => (
                            <div
                                key={i}
                                className="flex gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors"
                            >
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
                                    {i + 1}
                                </span>
                                <span className="text-slate-200 leading-relaxed">{q}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Start Button */}
            {step === -1 && (
                <div className="flex justify-center">
                    <button
                        onClick={startInterview}
                        className="px-12 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-xl font-bold transition-all shadow-xl shadow-blue-500/30"
                    >
                        🎙️ Start Interview Generation
                    </button>
                </div>
            )}

            {/* Browser Compatibility Warning */}
            {typeof window !== 'undefined' && !('webkitSpeechRecognition' in window) && (
                <div className="bg-yellow-900/20 border border-yellow-600 rounded-xl p-4 text-yellow-200">
                    <p className="font-semibold">⚠️ Browser Not Supported</p>
                    <p className="text-sm mt-1">
                        Speech recognition requires Chrome, Edge, or Safari. Please use a supported browser.
                    </p>
                </div>
            )}
        </div>
    );
}
