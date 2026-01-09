import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/admin';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!userId) {
        return NextResponse.json(
            { success: false, error: 'userId is required' },
            { status: 400 }
        );
    }

    try {
        const snapshot = await db
            .collection('interviews')
            .where('userId', '==', userId)
            .where('finalized', '==', true)
            .limit(limit)
            .get();

        const interviews = snapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
            .sort((a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

        return NextResponse.json({
            success: true,
            interviews,
        });
    } catch (error: any) {
        console.error('Error fetching user interviews:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch interviews',
            },
            { status: 500 }
        );
    }
}
