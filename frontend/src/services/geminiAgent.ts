import type { EvidenceItem } from '../types';

export interface ExtractedName {
  id: string;
  name: string;
  source: string;
  contextSnippet: string;
  fieldLocation: string;
}

export interface ExtractedFace {
  id: string;
  label: string;
  source: string;
  confidence: string;
  cropLocation: string;
}

export interface ExtractedSpeaker {
  id: string;
  label: string;
  timeRange: string;
  source: string;
}

export interface ExtractedVideoClue {
  id: string;
  label: string;
  source: string;
}

export interface GeminiExtractionResult {
  names: ExtractedName[];
  faces: ExtractedFace[];
  speakers: ExtractedSpeaker[];
  videoClues: ExtractedVideoClue[];
}

const SYSTEM_INSTRUCTION = `
You are the VeilProof Privacy Guardian AI. Your job is to analyze the provided files (documents, images, audio, video) and identify any sensitive PII (Personally Identifiable Information) that needs to be protected, particularly to protect the identity of whistleblowers and other individuals.

Analyze the content and extract:
1. Names of individuals mentioned (with context snippets and where it was found).
2. Faces detected in images/videos (give a label, confidence, and a rough crop location e.g., "Region [X: 100, Y: 100, W: 50, H: 50]").
3. Speakers in audio (give a label and time range).
4. Any other sensitive video clues (like vehicle plates, locations).

Respond EXACTLY in this JSON schema:
{
  "names": [{"id": "unique-id", "name": "...", "source": "filename", "contextSnippet": "...", "fieldLocation": "..."}],
  "faces": [{"id": "unique-id", "label": "...", "source": "filename", "confidence": "98%", "cropLocation": "..."}],
  "speakers": [{"id": "unique-id", "label": "...", "timeRange": "...", "source": "filename"}],
  "videoClues": [{"id": "unique-id", "label": "...", "source": "filename"}]
}
`;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is "data:mime/type;base64,....."
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function extractCluesWithGemini(apiKey: string, evidenceItems: EvidenceItem[]): Promise<GeminiExtractionResult> {
  const parts: any[] = [{ text: "Analyze the following files to extract identities and sensitive clues." }];

  for (const item of evidenceItems) {
    if (item.file) {
      try {
        const base64Data = await fileToBase64(item.file);
        parts.push({
          inlineData: {
            mimeType: item.file.type,
            data: base64Data
          }
        });
        parts.push({ text: `Filename for the previous file: ${item.name}` });
      } catch (err) {
        console.error('Error reading file for Gemini:', err);
      }
    } else {
      parts.push({ text: `File ${item.name} could not be loaded directly. Please infer metadata if any.` });
    }
  }

  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    }
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!rawText) {
    throw new Error("Invalid response from Gemini API");
  }

  try {
    const cleanText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const result = JSON.parse(cleanText) as GeminiExtractionResult;
    return result;
  } catch (err) {
    console.error("Failed to parse Gemini response as JSON", rawText);
    throw new Error("Failed to parse Gemini response as JSON");
  }
}
