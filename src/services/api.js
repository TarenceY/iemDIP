const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

async function handleResponse(res) {
  let data;
  try {
    data = await res.json();
  } catch {
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
    return null;
  }
  if (!res.ok) throw new Error(data.message || `Request failed with status ${res.status}`);
  return data;
}

export async function loginUser(email, password) {
  const res = await fetch(`${API_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function registerUser({ username, email, password, age, gender, restrictions, dislikes, goals }) {
  const res = await fetch(`${API_URL}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, age, gender, restrictions, dislikes, goals }),
  });
  return handleResponse(res);
}

export async function getUserInfo(userId) {
  const res = await fetch(`${API_URL}/users/${userId}`);
  return handleResponse(res);
}

export async function updateProfile(userId, { age, gender, restrictions, dislikes, goals }) {
  const res = await fetch(`${API_URL}/users/profile/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ age, gender, restrictions, dislikes, goals }),
  });
  return handleResponse(res);
}
