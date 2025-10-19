import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code required' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/linkedin/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // Get user profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/people/~:(id,firstName,lastName,emailAddress)', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const profile = await profileResponse.json();

    // Store user in database
    const { data: user, error } = await supabase
      .from('users')
      .upsert({
        linkedin_id: profile.id,
        email: profile.emailAddress,
        name: `${profile.firstName.localized.en_US} ${profile.lastName.localized.en_US}`,
        linkedin_access_token: tokenData.access_token,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Set session cookie and redirect
    res.setHeader('Set-Cookie', `user_session=${JSON.stringify(user)}; Path=/; HttpOnly; SameSite=Strict`);
    res.redirect('/');

  } catch (error) {
    console.error('LinkedIn auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}