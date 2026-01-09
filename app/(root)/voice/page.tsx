'use client';

import VoiceInterview from '@/components/VoiceInterview';

export default function VoiceInterviewPage() {
    // In production, get userId and userName from auth session
    const userId = 'demo-user-123';
    const userName = 'Moksh Jhaveri';

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <VoiceInterview
                userId={userId}
                userName={userName}
                onComplete={() => {
                    console.log('Interview completed!');
                    // Optionally redirect to another page
                }}
            />
        </div>
    );
}
