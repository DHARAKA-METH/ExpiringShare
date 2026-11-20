import "./amplify";

import {
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
} from "aws-amplify/auth";

export async function registerUser(email, password) {
  return signUp({
    username: email,
    password,
    options: {
      userAttributes: { email },
    },
  });
}

export async function confirmUser(email, code) {
  return confirmSignUp({
    username: email,
    confirmationCode: code,
  });
}

export async function loginUser(email, password) {
  return signIn({ username: email, password });
}

export async function logoutUser() {
  return signOut();
}

export async function getIdToken() {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();

  if (!token) {
    throw new Error("Please sign in before uploading a file.");
  }

  return token;
}

export async function getSignedInUser() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}
