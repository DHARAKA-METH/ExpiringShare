import { getIdToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function readResponse(response, fallbackMessage) {
  let body = {};

  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    throw new Error(body.message || fallbackMessage);
  }

  return body;
}

export async function createUpload(file, options) {
  const token = await getIdToken();

  const response = await fetch(`${API_URL}/uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      fileSize: file.size,
      expiryHours: options.expiryHours,
      maxDownloads: options.maxDownloads,
    }),
  });
  return readResponse(response, "Could not prepare the upload.");
}

export async function listMyShares() {
  const token = await getIdToken();
  const response = await fetch(`${API_URL}/shares/mine`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  return readResponse(response, "Could not load your shares.");
}

export async function uploadToS3(uploadUrl, file) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("The file could not be uploaded to S3.");
  }
}

export async function completeUpload(shareId) {
  const token = await getIdToken();

  const response = await fetch(`${API_URL}/uploads/${shareId}/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  return readResponse(response, "Could not activate the share.");
}

export async function requestDownload(shareId) {
  const response = await fetch(`${API_URL}/shares/${shareId}/download`, {
    method: "POST",
  });

  return readResponse(response, "This share is unavailable.");
}
