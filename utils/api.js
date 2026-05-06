import { API_BASE_URL } from "../constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

async function getAuthHeaders() {
  const token = await AsyncStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiPost(endpoint, body) {
  const headers = await getAuthHeaders();

  // Check if the developer forgot to set the IP
  if (API_BASE_URL.includes("YOUR_LOCAL_IP")) {
    throw new Error(
      "Server URL not configured.\nOpen constants/config.js and replace YOUR_LOCAL_IP with your machine's IP address."
    );
  }

  let response;
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 10000); // 10 s timeout

    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body),
      signal:  controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(
        "Connection timed out.\nMake sure Flask is running and your phone is on the same Wi-Fi as your laptop."
      );
    }
    throw new Error(
      "Cannot reach the server.\nCheck: (1) Flask is running  (2) IP in constants/config.js is correct  (3) Phone and laptop are on the same Wi-Fi."
    );
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Server error ${response.status}`);
  return data;
}

export async function apiGet(endpoint) {
  const headers = await getAuthHeaders();

  if (API_BASE_URL.includes("YOUR_LOCAL_IP")) {
    throw new Error("Server URL not configured. Open constants/config.js.");
  }

  let response;
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 10000);

    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Connection timed out. Is Flask running?");
    }
    throw new Error("Cannot reach the server. Check your IP in constants/config.js.");
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Server error ${response.status}`);
  return data;
}
