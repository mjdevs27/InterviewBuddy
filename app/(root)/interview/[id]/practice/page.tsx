import { notFound } from 'next/navigation';
import { db } from '@/firebase/admin';
import VoicePractice from '@/components/VoicePractice';

async function getInterview(id: string) {
    try {
        const doc = await db.collection('interviews').doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error('Error fetching interview:', error);
        return null;
    }
}

export default async function PracticePage({
    params,
}: {
    params: { id: string };
}) {
    const interview = await getInterview(params.id);

    if (!interview) {
        notFound();
    }

    const { questions, role, level } = interview as any;
    const userId = 'demo-user-123'; // Replace with actual auth
    const userName = 'Moksh Jhaveri';

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <VoicePractice
                interviewId={params.id}
                questions={questions}
                role={role}
                level={level}
                userId={userId}
                userName={userName}
            />
        </div>
    );
}
