import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini API client if API key is provided
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI search features will not work.");
    }
    ai = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

// In-memory cache for contacts
export interface Contact {
  id: number;
  name: string;
  phone: string;
  department: string;
  position: string;
}

let cachedContacts: Contact[] = [];
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

// Function to fetch and parse Google Sheet CSV
export async function fetchContacts(): Promise<Contact[]> {
  const now = Date.now();
  if (cachedContacts.length > 0 && (now - lastFetchTime) < CACHE_TTL_MS) {
    return cachedContacts;
  }

  try {
    const sheetUrl = "https://docs.google.com/spreadsheets/d/1z_9YbNi2fzcmlKjdN4XeSSbCBS9kknWTVII5V8WEL8k/export?format=csv&gid=0";
    const response = await fetch(sheetUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }
    const csvText = await response.text();
    
    const lines = csvText.split(/\r?\n/);
    if (lines.length <= 1) return [];

    const parseLine = (line: string) => {
      const row = [];
      let insideQuote = false;
      let entry = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          row.push(entry.trim());
          entry = '';
        } else {
          entry += char;
        }
      }
      row.push(entry.trim());
      return row;
    };

    const contacts: Contact[] = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const row = parseLine(line);
      if (row.length < 3) continue;

      const rawId = parseInt(row[0]) || i;
      let rawName = row[1] || "";
      let rawPhone = row[2] || "";
      const rawDept = row[3] || "ไม่ระบุฝ่าย";
      const rawPos = row[4] || "ไม่ระบุตำแหน่ง";

      // Clean up phone number: if it starts with 8 or 9 and has 9 digits, prepending 0 makes it 10 digits
      if (/^[1-9]\d{8}$/.test(rawPhone)) {
        rawPhone = "0" + rawPhone;
      }

      contacts.push({
        id: rawId,
        name: rawName,
        phone: rawPhone,
        department: rawDept,
        position: rawPos
      });
    }

    cachedContacts = contacts;
    lastFetchTime = now;
    return contacts;
  } catch (error) {
    console.error("Error fetching or parsing contacts:", error);
    // Return stale cache if we have it, otherwise empty list
    return cachedContacts.length > 0 ? cachedContacts : [];
  }
}

const app = express();

app.use(express.json());

// API endpoint: Get contacts
app.get("/api/contacts", async (req, res) => {
  try {
    const contacts = await fetchContacts();
    res.json({ success: true, contacts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint: AI Chat Search
app.post("/api/chat", async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ success: false, error: "Query is required" });
  }

  try {
    const contacts = await fetchContacts();
    const client = getGeminiClient();

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `ค้นหาผู้ติดต่อสำหรับคำถาม: "${query}"`,
      config: {
        systemInstruction: `You are an intelligent telephone directory search assistant. 
Here is the list of all contacts in the directory:
${JSON.stringify(contacts)}

Your job is to search this list based on the user's query (which is in Thai).
Return a JSON object with:
1. "text": A friendly, polite, and helpful explanation in Thai summarizing who or what you found. If the user asks general questions or asks to list certain people, list them clearly with their details.
2. "matchingIds": An array of numbers matching the "id" of the contacts that are relevant to the search or question. If the user asks a general question and no specific contacts are the primary matches, return an empty array.

Be accurate and use the provided contact list. Only match contacts that are genuinely relevant.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: "Friendly response in Thai explaining the search results or answering the question."
            },
            matchingIds: {
              type: Type.ARRAY,
              items: {
                type: Type.INTEGER
              },
              description: "List of contact IDs (id) that are relevant to this query."
            }
          },
          required: ["text", "matchingIds"]
        }
      }
    });

    const responseText = response.text || "{}";
    const result = JSON.parse(responseText.trim());
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("AI chat error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;
