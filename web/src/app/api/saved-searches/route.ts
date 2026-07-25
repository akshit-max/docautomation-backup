import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Static user ID since auth is not implemented yet
const USER_ID = 'default_user';

export async function GET() {
  try {
    const snap = await adminDb
      .collection('saved_searches')
      .where('userId', '==', USER_ID)
      .get();

    const searches = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() as any }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(searches);
  } catch (error: any) {
    console.error('Error fetching saved searches:', error);
    return NextResponse.json({ error: 'Failed to fetch saved searches' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, filters } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Valid name is required' }, { status: 400 });
    }

    if (!filters || typeof filters !== 'object') {
      return NextResponse.json({ error: 'Valid filters object is required' }, { status: 400 });
    }

    const newSearch = {
      userId: USER_ID,
      name: name.trim(),
      filters,
      createdAt: new Date().toISOString()
    };

    const docRef = await adminDb.collection('saved_searches').add(newSearch);
    
    return NextResponse.json({ id: docRef.id, ...newSearch });
  } catch (error: any) {
    console.error('Error creating saved search:', error);
    return NextResponse.json({ error: 'Failed to save search' }, { status: 500 });
  }
}
