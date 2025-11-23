
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { siteId, url, referrer, userAgent } = body;

  if (!siteId) {
    return new NextResponse('Site ID is required', { status: 400 });
  }

  // Here you would typically save the tracking data to your database
  // For example, using Firebase Firestore:
  // await db.collection('views').add({
  //   siteId,
  //   url,
  //   referrer,
  //   userAgent,
  //   timestamp: new Date(),
  // });

  console.log('Tracked view:', { siteId, url, referrer, userAgent });

  return new NextResponse('OK', { status: 200 });
}
