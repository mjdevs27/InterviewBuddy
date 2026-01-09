import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/admin';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { interviewId, userId, answers, totalScore } = body;

        if (!interviewId || !userId || !answers || typeof totalScore !== 'number') {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const attempt = {
            interviewId,
            userId,
            answers,
            totalScore,
            completedAt: new Date().toISOString(),
        };

        const docRef = await db.collection('interview_attempts').add(attempt);

        return NextResponse.json({
            success: true,
            attemptId: docRef.id,
        });
    } catch (error: any) {
        console.error('Error saving interview attempt:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to save attempt',
            },
            { status: 500 }
        );
    }
}

// Get attempts for a user
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const interviewId = searchParams.get('interviewId');

    if (!userId) {
        return NextResponse.json(
            { success: false, error: 'userId required' },
            { status: 400 }
        );
    }

    try {
        let query = db.collection('interview_attempts').where('userId', '==', userId);

        if (interviewId) {
            query = query.where('interviewId', '==', interviewId);
        }

        const snapshot = await query.orderBy('completedAt', 'desc').limit(20).get();

        const attempts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({
            success: true,
            attempts,
        });
    } catch (error: any) {
        console.error('Error fetching attempts:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch attempts',
            },
            { status: 500 }
        );
    }
}
