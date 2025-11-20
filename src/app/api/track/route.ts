
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';


// Initialize Firebase Admin SDK
if (!getApps().length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
        initializeApp({
            credential: cert(serviceAccount)
        });
    } catch (e) {
        console.error("Failed to initialize Firebase Admin SDK:", e);
        // Fallback for environments where service account isn't set,
        // though writes will likely fail due to permissions.
        initializeApp();
    }
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
  // Add CORS headers to allow requests from any origin
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Respond to preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers });
  }

  try {
    const body = await req.json();
    const validation = analyticsSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(JSON.stringify({ error: 'Invalid data' }), {
        status: 400,
        headers,
      });
    }

    const { siteId, path, userAgent } = validation.data;
    
    // Get the site owner's userId
    const siteDoc = await db.collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
        return new NextResponse(JSON.stringify({ error: 'Site not found' }), {
            status: 404,
            headers,
        });
    }
    const userId = siteDoc.data()?.userId;

    // Use a randomly generated ID for the new document
    const eventRef = db.collection('analytics').doc();
    await eventRef.set({
      siteId,
      path,
      userAgent,
      timestamp: new Date(), // Use server timestamp for accuracy
      userId: userId || null, // Add the userId to the event
    });

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error tracking analytics:', error);
    // Ensure CORS headers are also sent on error responses
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers,
    });
  }
}

/**
 * Serves the tracking script.
 */
export async function GET(req: NextRequest) {
    const scriptContent = `
(function() {
    if (document.currentScript) {
        const siteId = document.currentScript.getAttribute('data-site-id');
        const apiHost = document.currentScript.getAttribute('data-api-host');
        if (siteId && apiHost) {
            const data = {
                siteId: siteId,
                path: window.location.pathname,
                userAgent: navigator.userAgent,
            };
            fetch(apiHost + '/api/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                mode: 'cors',
            }).catch(error => console.error('Analytics track error:', error));
        }
    }
})();
    `;
    return new NextResponse(scriptContent, {
        headers: {
            'Content-Type': 'application/javascript',
            'Access-Control-Allow-Origin': '*',
        }
    });
}
    