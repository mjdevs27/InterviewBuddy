'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type Answer = {
    question: string;
    answer: string;
    score: number;
    feedback: string;
};

interface VoicePracticeProps {
    interviewId: string;
    questions: string[];
    role: string;
    level: string;
    userId: string;
    userName: string;
}

export default function VoicePractice({
    interviewId,
    questions,
    role,
    level,
    userId,
    userName,
}: VoicePracticeProps) {
    const router = useRouter();
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [totalScore, setTotalScore] = useState(0);

    const recognitionRef = useRef<any>(null);
    const handleUserResponseRef = useRef<((text: string) => void) | undefined>(undefined);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                const userText = event.results[0][0].transcript;
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
    };

    const startListening = () => {
        if (!recognitionRef.current || isListening) return;

        try {
            setIsListening(true);
            recognitionRef.current.start();
        } catch (error: any) {
            console.error('Error starting recognition:', error);
            setIsListening(false);
        }
    };

    const handleUserResponse = async (answer: string) => {
        if (isEvaluating) return;

        console.log('User answer:', answer);
        setIsEvaluating(true);
        const question = questions[currentQuestion];

        try {
            const response = await fetch('/api/interviews/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, answer, role, level }),
            });

            const { success, score, feedback } = await response.json();

            if (success) {
                const newAnswer: Answer = { question, answer, score, feedback };
                const updatedAnswers = [...answers, newAnswer];
                setAnswers(updatedAnswers);

                const nextQuestion = currentQuestion + 1;

                if (nextQuestion < questions.length) {
                    setCurrentQuestion(nextQuestion);
                    setIsEvaluating(false);

                    // Speak next question WITHOUT auto-starting listening
                    setTimeout(() => {
                        speak(`Question ${nextQuestion + 1}: ${questions[nextQuestion]}`);
                    }, 1000);
                } else {
                    finishInterview(updatedAnswers);
                }
            }
        } catch (error) {
            console.error('Error evaluating answer:', error);
            setIsEvaluating(false);
        }
    };

    useEffect(() => {
        handleUserResponseRef.current = handleUserResponse;
    }, [currentQuestion, answers, isEvaluating]);

    const finishInterview = async (finalAnswers: Answer[]) => {
        setIsComplete(true);
        const total = finalAnswers.reduce((sum, a) => sum + a.score, 0);
        const percentage = Math.round((total / (finalAnswers.length * 10)) * 100);
        setTotalScore(percentage);

        const feedbackText = getFeedbackText(percentage);

        speak(`Interview complete! You scored ${percentage} out of 100. ${feedbackText}`, async () => {
            try {
                await fetch('/api/interviews/attempt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        interviewId,
                        userId,
                        answers: finalAnswers,
                        totalScore: percentage,
                    }),
                });

                setTimeout(() => {
                    router.push(`/interview/${interviewId}/feedback?score=${percentage}`);
                }, 2000);
            } catch (error) {
                console.error('Error saving attempt:', error);
            }
        });
    };

    const getFeedbackText = (score: number) => {
        if (score >= 90) return 'Excellent performance! You really know your stuff.';
        if (score >= 75) return 'Great work! Keep it up.';
        if (score >= 60) return 'Good effort. There is room for improvement.';
        return 'Keep practicing. You will get better!';
    };

    const startInterview = () => {
        setHasStarted(true);
        speak(`Welcome ${userName}! Let's begin your ${role} interview. I'll ask you ${questions.length} questions. Click the microphone button when ready to answer.`, () => {
            setTimeout(() => {
                speak(`Question 1: ${questions[0]}`);
            }, 1000);
        });
    };

    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
        <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Interview Practice</h2>
                <div className="text-right">
                    <p className="text-sm text-slate-400">Question {currentQuestion + 1} of {questions.length}</p>
                    <p className="text-xs text-slate-500">{role} • {level}</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Avatar Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-12 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-600/5 to-transparent pointer-events-none"></div>
                    <div className={cn(
                        "relative w-32 h-32 rounded-full bg-slate-300 flex items-center justify-center mb-6 overflow-hidden transition-all duration-300",
                        isListening && "ring-4 ring-red-500 ring-offset-4 ring-offset-slate-900"
                    )}>
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

            {/* Current Question Display */}
            {hasStarted && !isComplete && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                    <p className="text-lg text-slate-200">{questions[currentQuestion]}</p>
                </div>
            )}

            {/* Status */}
            <div className="flex flex-col items-center gap-4">
                {isEvaluating && (
                    <div className="flex items-center gap-2 text-yellow-400">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Evaluating your answer...</span>
                    </div>
                )}

                {isComplete && (
                    <div className="text-center">
                        <div className="text-6xl font-bold text-blue-500 mb-2">{totalScore}%</div>
                        <p className="text-xl text-slate-300">{getFeedbackText(totalScore)}</p>
                    </div>
                )}

                {hasStarted && !isSpeaking && !isListening && !isEvaluating && !isComplete && (
                    <button
                        onClick={startListening}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold"
                    >
                        🎤 Click to Answer
                    </button>
                )}
            </div>

            {/* Start Button */}
            {!hasStarted && (
                <div className="flex justify-center">
                    <button
                        onClick={startInterview}
                        className="px-12 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-xl font-bold shadow-xl"
                    >
                        🎙️ Start Practice Interview
                    </button>
                </div>
            )}
        </div>
    );
}
