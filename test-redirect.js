// Test script to check what redirect URI is generated
import * as AuthSession from 'expo-auth-session';

const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'healthtracker',
  useProxy: true
});

console.log('Redirect URI:', redirectUri);

// Also try without useProxy
const redirectUriNoProxy = AuthSession.makeRedirectUri({
  scheme: 'healthtracker',
  useProxy: false
});

console.log('Redirect URI (no proxy):', redirectUriNoProxy);

// Try with explicit path
const redirectUriExplicit = AuthSession.makeRedirectUri({
  scheme: 'healthtracker',
  path: 'redirect',
  useProxy: true
});

console.log('Redirect URI (explicit):', redirectUriExplicit);