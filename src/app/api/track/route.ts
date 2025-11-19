
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase Admin SDK
// This ensures that we can write to Firestore from the server-side.
if (!getApps().length) {
  initializeApp({
    // We use the client-side config here as we don't have service account credentials
    // in this secure serverless environment. Firestore rules will protect our database.
    projectId: firebaseConfig.projectId
  });
}

const db = getFirestore();

const analyticsSchema = z.object({
  siteId: z.string().min(1),
  path: z.string(),
  userAgent: z.string(),
});

/**
 * API route to handle tracking page views.
 * @param {NextRequest} req - The incoming request object.
 */
export async function POST(req: NextRequest) {
  try {
    // Add CORS headers to allow requests from any origin
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Respond to preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers });
    }

    const body = await req.json();
    const validation = analyticsSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(JSON.stringify({ error: 'Invalid data' }), {
        status: 400,
        headers,
      });
    }

    const { siteId, path, userAgent } = validation.data;

    const eventRef = db.collection('analytics').doc();
    await eventRef.set({
      siteId,
      path,
      userAgent,
      timestamp: new Date(),
    });

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error tracking analytics:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// Handler for GET requests to show a simple message or documentation
export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'Analytics tracking endpoint. Use POST to submit data.' });
}
