import axios from "axios";

/**
 * Authenticate a user against the API using their username or email and password.
 * Returns the API response data { message, userId, username } on success.
 * Throws an error (with response message) on failure.
 */
export async function loginUser(usernameOrEmail, password, API_URL) {
  const isEmail = usernameOrEmail.includes("@");
  const payload = isEmail
    ? { email: usernameOrEmail, password }
    : { username: usernameOrEmail, password };

  const response = await axios.post(`${API_URL}/users/login`, payload);
  return response.data;
}
