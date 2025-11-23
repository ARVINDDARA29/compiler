import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getAdminApp } from '@/firebase/admin';

export async function POST(request: Request) {
  try {
    const adminApp = getAdminApp();
    if (!adminApp) {
      return new NextResponse('Firebase not configured', { status: 503 });
    }

    const db = adminApp.firestore();
    const body = await request.json();
    const { siteId, url, referrer, userAgent } = body;

    if (!siteId) {
      return new NextResponse('Site ID is required', { status: 400 });
    }

    // Save the tracking data to Firestore
    await db.collection('views').add({
      siteId,
      url,
      referrer,
      userAgent,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return new NextResponse('OK', { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow requests from any origin
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('Error tracking view:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
