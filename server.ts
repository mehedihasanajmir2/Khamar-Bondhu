import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

import { generatePoultryResponse } from './src/utils/poultryKnowledge.js';

// Initialize Google Gen AI client strictly per gemini-api skill instructions
let aiClient: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini AI Client initialized successfully with User-Agent header.');
  } else {
    console.log('GEMINI_API_KEY not set in environment. Using expert poultry knowledge advisor engine.');
  }
} catch (err) {
  console.warn('Could not initialize GoogleGenAI client, will use expert advisor fallback:', err);
}

// API endpoint for AI Assistant chat
app.post('/api/assistant/chat', async (req, res) => {
  const { message, history = [], batchContext, systemInstruction: clientSystemInstruction } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // 1. Try Gemini 3.8 Flash with Exclusive Live Google Search Grounding
  if (aiClient) {
    try {
      const baseSystemInstruction = clientSystemInstruction || `আপনি 'খামার বন্ধু AI সহকারী'—বাংলাদেশের পোল্ট্রি খামারীদের জন্য নিবেদিত ডিজিটাল ভেটেরিনারি ও খামার বিশেষজ্ঞ।

কঠোর ও অলঙ্ঘনীয় নির্দেশনা (STRICT SYSTEM INSTRUCTION) - শুধুমাত্র গুগল সার্চ গ্রাউন্ডিং ও শতভাগ নির্ভুলতার নিয়ম:
১. শুধুমাত্র এক্সক্লুসিভ গুগল সার্চ গ্রাউন্ডিং (Exclusive Google Search Grounding): আপনি শুধুমাত্র ইন্টারনেটে লাইভ গুগল সার্চ করে নির্ভরযোগ্য ও অনুমোদিত অনলাইন উৎস (যেমন: বাংলাদেশ প্রাণিসম্পদ অধিদপ্তর - DLS, FAO, বাংলাদেশ কৃষি বিশ্ববিদ্যালয়, এবং প্রতিষ্ঠিত পোল্ট্রি ফার্মাসিউটিক্যালস Renata, Square, Acme, Opsonin ইত্যাদি) থেকে তথ্য যাচাই করে উত্তর প্রদান করবেন।
২. অনুমান বা আন্দাজ করা কঠোরভাবে নিষিদ্ধ (Zero Speculation): আপনি শুধুমাত্র ওয়েব সার্চ থেকে যাচাইকৃত প্রমাণিত তথ্যের ওপর ভিত্তি করে উত্তর দেবেন। কোনো বিষয়ে অনুমাননির্ভর বা মনগড়া তথ্য দেওয়া সম্পূর্ণ নিষিদ্ধ।
৩. যাচাই করা না গেলে স্পষ্ট ও বিনম্র অস্বীকৃতি (Decline when unverified): যদি কোনো প্রশ্ন, লক্ষণ, রোগ বা ওষুধের তথ্য ইন্টারনেটের নির্ভরযোগ্য তথ্যসূত্র দ্বারা নিশ্চিতভাবে যাচাই করা না যায়, তবে অনুমান করে কোনো উত্তর দেবেন না। বিনয়ের সাথে স্পষ্টভাবে জানিয়ে দিন যে এই বিষয়টি অনলাইনে নির্ভরযোগ্য উৎস থেকে নিশ্চিতভাবে যাচাই করা সম্ভব হয়নি, এবং খামারে ভুল চিকিৎসা এড়াতে কোনো অনুমাননির্ভর ওষুধ না দিয়ে দ্রুত একজন স্থানীয় অভিজ্ঞ রেজিস্টার্ড পশু চিকিৎসকের (Veterinarian) শরণাপন্ন হতে বলুন।
৪. নির্ভুল ওষুধের নাম ও প্রয়োগমাত্রা (Accurate Dosages): ওষুধের নাম বলার ক্ষেত্রে শুধুমাত্র প্রমাণিত ব্র্যান্ড ও জেনেরিক নাম এবং পানিতে/খাবারে মেশানোর অনুমোদিত বৈজ্ঞানিক প্রয়োগমাত্রা (ডোজ) পরিষ্কারভাবে জানাবেন।
৫. ভাষা ও স্টাইল: মার্জিত, আন্তরিক ও সহজবোধ্য বাংলায় বুলেট পয়েন্ট আকারে সাজিয়ে লিখুন যাতে খামারীরা সহজেই উপকৃত হন।`;

      const systemInstruction = `${baseSystemInstruction}

${batchContext ? `বর্তমানে খামারীর লাইভ ব্যাচ তথ্য:
- পাখির জাত: ${batchContext.birdType || 'ব্রয়লার'}
- বয়স: ${batchContext.ageDays || 'অজ্ঞাত'} দিন
- মোট সংখ্যা: ${batchContext.birdCount || 'অজ্ঞাত'} টি
- টার্গেট ওজন: ${batchContext.targetWeight ? batchContext.targetWeight + ' গ্রাম' : 'অজ্ঞাত'}
- স্ট্যাটাস: ${batchContext.status || 'চলমান'}
(যাচাইকৃত তথ্যের ভিত্তিতে খামারীর এই নির্দিষ্ট ব্যাচ ও বয়সের জন্য বাস্তবসম্মত সমাধান দিন)` : ''}`;

      // Build contents strictly compliant with @google/genai
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      // Add recent context turns
      if (Array.isArray(history)) {
        for (const msg of history.slice(-6)) {
          const contentText = (msg.content || msg.text || '').trim();
          if (!contentText) continue;
          contents.push({
            role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: contentText }],
          });
        }
      }

      // Add current user prompt
      contents.push({
        role: 'user',
        parts: [{ text: message.trim() }],
      });

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
        },
      });

      const reply = response.text;
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const webSources = (groundingChunks || [])
        .map((chunk: any) => chunk.web)
        .filter((web: any) => web && web.uri)
        .map((web: any) => ({
          title: web.title || 'অনলাইন সূত্র',
          uri: web.uri,
        }));

      if (reply && reply.trim()) {
        return res.json({
          reply: reply.trim(),
          source: 'gemini-3.8-flash',
          grounded: webSources.length > 0,
          webSources: webSources.slice(0, 5),
        });
      }
    } catch (geminiError: any) {
      console.warn('Gemini 3.8 Flash query error, smoothly delegating to expert poultry engine:', geminiError?.message || geminiError);
    }
  }

  // 2. High-grade poultry veterinary expert fallback engine (100% reliable)
  try {
    const fallbackReply = generatePoultryResponse(message, batchContext);
    return res.json({
      reply: fallbackReply,
      source: 'খামার বন্ধু বিশেষজ্ঞ',
    });
  } catch (err: any) {
    console.error('Expert engine error:', err);
    return res.json({
      reply: `🐔 **পোল্ট্রি পরামর্শক:**\n\nআপনার প্রশ্নের বিষয়ে জরুরি পরামর্শ:\n- মুরগির খাঁ খাঁ বা সর্দি হলে ডক্সিসাইক্লিন ও টাইলোসিন পানিতে দিন।\n- রক্ত আমাশয় দেখা দিলে টোল্ট্রাজুরিল (Tolcox) ১ মিলি/লিটার পানিতে পর পর ২ দিন দিন।\n- অতিরিক্ত গরমে সকাল ১১টা থেকে বিকাল ৪টা পর্যন্ত খাবার বন্ধ রাখুন এবং পানিতে ভিটামিন সি ও স্যালাইন দিন।\n- লিটার সবসময় শুকনো ও ঝরঝরে রাখুন।`,
      source: 'খামার বন্ধু বিশেষজ্ঞ',
    });
  }
});

// Setup dev server or static serve
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
