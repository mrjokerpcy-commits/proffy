import { google } from "googleapis";
import cron from "node-cron";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;
const PROCESSOR_URL = process.env.PROCESSOR_URL || "http://localhost:8001";

// Files we've already processed (in production: store in DB)
const processedFileIds = new Set<string>();

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return auth.getClient();
}

async function listFilesInFolder(folderId: string, drive: any): Promise<any[]> {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, modifiedTime, parents)",
    pageSize: 1000,
  });

  const files = res.data.files || [];
  const allFiles: any[] = [];

  for (const file of files) {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      // Recurse into subfolders
      const nested = await listFilesInFolder(file.id, drive);
      allFiles.push(...nested);
    } else {
      allFiles.push(file);
    }
  }

  return allFiles;
}

async function processFile(file: any, drive: any) {
  if (processedFileIds.has(file.id)) return;

  console.log(`[drive-watcher] Processing: ${file.name}`);

  try {
    // Get download URL
    const res = await drive.files.get(
      { fileId: file.id, alt: "media" },
      { responseType: "arraybuffer" }
    );

    const buffer = Buffer.from(res.data);

    // Send to processor
    const formData = new FormData();
    formData.append("file", new Blob([buffer]), file.name);
    formData.append("source", "drive");

    const response = await fetch(`${PROCESSOR_URL}/process/file`, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      processedFileIds.add(file.id);
      console.log(`[drive-watcher] Processed: ${file.name}`);
    } else {
      console.error(`[drive-watcher] Failed to process ${file.name}: ${response.statusText}`);
    }
  } catch (err) {
    console.error(`[drive-watcher] Error processing ${file.name}:`, err);
  }
}

async function sync() {
  console.log("[drive-watcher] Syncing Google Drive...");
  try {
    const auth = await getAuthClient();
    const drive = google.drive({ version: "v3", auth: auth as any });
    const files = await listFilesInFolder(FOLDER_ID, drive);
    console.log(`[drive-watcher] Found ${files.length} files`);

    for (const file of files) {
      await processFile(file, drive);
    }
  } catch (err) {
    console.error("[drive-watcher] Sync error:", err);
  }
}

// Run on startup + every 24 hours
sync();
cron.schedule("0 2 * * *", () => {
  console.log("[drive-watcher] Running scheduled Drive sync");
  sync();
});

console.log("[drive-watcher] Watching Google Drive folder:", FOLDER_ID);
