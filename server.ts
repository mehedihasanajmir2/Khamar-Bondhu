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

// Initialize Google Gen AI client if key exists
let aiClient: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    aiClient = new GoogleGenAI({ apiKey });
  } else {
    console.warn('GEMINI_API_KEY is not set. Falling back to built-in poultry expert engine.');
  }
} catch (err) {
  console.warn('Could not initialize GoogleGenAI client, will use fallback:', err);
}

// Built-in Poultry Advisory Knowledge Base for instant/offline replies
function getFallbackPoultryAdvice(prompt: string, batchContext?: any): string {
  const p = prompt.toLowerCase();

  if (p.includes('ব্রুডিং') || p.includes('brooding') || p.includes('বাচ্চা') || p.includes('প্রথম দিন') || p.includes('প্রথম সপ্তাহ')) {
    return `🐣 **সঠিক ব্রুডিং ব্যবস্থাপনা (১ম - ৭ম দিন):**

১. **তাপমাত্রা নিয়ন্ত্রণ:**
   - ১ম দিন: ৯৫°F (৩৫°C)
   - প্রতিদিন বা প্রতি সপ্তাহে ৫°F করে তাপমাত্রা কমান, ২১ দিনে ৭৫-৮০°F এ আনুন।
   - বাচ্চার আচরণ দেখে বুঝুন: বাচ্চারা হোভারের নিচে গাদাগাদি করলে তাপমাত্রা কম, হোভার থেকে দূরে ছড়ালে বেশি, সমানভাবে ছড়িয়ে চরে বেড়ালে তাপমাত্রা সঠিক।

২. **প্রথম দিনের খাবার ও পানি:**
   - খামারে বাচ্চা নামানোর পর প্রথম ২-৩ ঘণ্টা পরিষ্কার পানিতে গ্লুকোজ (প্রতি লিটারে ২০ গ্রাম) অথবা স্যালাইন দিন।
   - ৩ ঘণ্টা পর পেপারে প্রি-স্টার্টার বা স্টার্টার খাবার সামান্য ছিটিয়ে দিন।

৩. **লিটার ও আলো ব্যবস্থাপনা:**
   - শুকনো কাঠের গুঁড়া বা ধানের তুষ ২ ইঞ্চি পুরু করে বিছান।
   - ব্রুডিংয়ের প্রথম ৩ দিন ২৪ ঘণ্টা আলো দিন, যাতে খাবার ও পানির পাত্র সহজে দেখতে পায়।`;
  }

  if (p.includes('ভ্যাকসিন') || p.includes('টিকা') || p.includes('vaccine') || p.includes('শিডিউল')) {
    return `💉 **ব্রয়লার ও সোনালী মুরগির আদর্শ ভ্যাকসিন শিডিউল:**

১. **৪র্থ বা ৫ম দিন:**
   - **বিসিআরডিভি (BCRDV / রানিক্ষেত):** চোখে এক ফোঁটা ড্রপ।
২. **১০ম বা ১১তম দিন:**
   - **গামবোরো (IBD - Intermediate Plus):** চোখে এক ফোঁটা অথবা ড্রপারে।
৩. **১৭তম দিন:**
   - **গামবোরো বুস্টার ডোজ:** পানিতে মিশিয়ে বা চোখে এক ফোঁটা।
৪. **২১তম বা ২৪তম দিন:**
   - **রানিক্ষেত (লাসোটা / ক্লোন):** খাবার পানিতে মিশিয়ে।

⚠️ **ভ্যাকসিন দেওয়ার বিশেষ সতর্কতা:**
- ভ্যাকসিন সবসময় খুব ভোরে অথবা সন্ধ্যায় ঠান্ডা আবহাওয়ায় দিন।
- ভ্যাকসিন দেওয়ার পানিতে ক্লোরিন থাকা যাবে না (বাজারের স্কিমড মিল্ক পাউডার ২ গ্রাম/লিটার পানিতে মিশিয়ে দিলে ভ্যাকসিনের কার্যক্ষমতা অটুট থাকে)।`;
  }

  if (p.includes('আমাশয়') || p.includes('রক্ত') || p.includes('কক্সি') || p.includes('coccidiosis')) {
    return `🩸 **রক্ত আমাশয় (Coccidiosis) এর চিকিৎসা ও লক্ষণ:**

১. **লক্ষণ:**
   - লালচে রক্তমিশ্রিত পায়খানা, মুরগি ডানা ঝুলিয়ে চোখ বন্ধ করে ঝিমাতে থাকে, খাদ্য গ্রহণ কমে যায়।
২. **জরুরি চিকিৎসা (চিকিৎসকের পরামর্শ সাপেক্ষে):**
   - **টোল্ট্রাজুরিল (Toltrazuril 2.5%):** যেমন Tolcox / Coxur – ১ মিলি প্রতি লিটার খাবার পানিতে পর পর ২ দিন।
   - অথবা **অ্যামপ্রোলিয়াম (Amprolium):** ১-২ গ্রাম প্রতি লিটার পানিতে ৫-৭ দিন।
   - রক্তক্ষরণ বন্ধে সাথে ভিটামিন K দিতে পারেন।
৩. **প্রতিরোধ:**
   - লিটার কোনোভাবেই ভিজা বা স্যাঁতসেঁতে হতে দেওয়া যাবে না। নিয়মিত লিটার উল্টে দিন এবং চুন ছিটিয়ে দিন।`;
  }

  if (p.includes('সর্দি') || p.includes('কাশি') || p.includes('ঠান্ডা') || p.includes('গড়গড়') || p.includes('crd')) {
    return `🩺 **সিআরডি (CRD) ও সর্দি-কাশির চিকিৎসা:**

১. **লক্ষণ:**
   - রাতে খামারে ঢুকলে গড়গড় বা খাঁ খাঁ শব্দ শোনা যায়, চোখ দিয়ে পানি পড়ে, নাক দিয়ে সর্দি ঝরে।
২. **প্রাথমিক চিকিৎসা:**
   - **টাইলোসিন / ডক্সিসাইক্লিন কম্বিনেশন:** (যেমন Doxi-Tyl বা Tilox) – ১ গ্রাম প্রতি ২ লিটার পানিতে ৪-৫ দিন।
   - অথবা **এনরোফ্লক্সাসিন / সিপ্রোফ্লক্সাসিন:** ১ মিলি প্রতি ২ লিটার পানিতে ৩-৫ দিন।
   - সাথে ব্রংকোডাইলেটর (যেমন Menthol / Eucalyptus সিরাপ) স্প্রে বা পানিতে দিতে পারেন শ্বাসকষ্ট কমাতে।
৩. **ব্যবস্থাপনা:**
   - শেডের অ্যামোনিয়া গ্যাস কমাতে পর্দা নিচ থেকে ১ ফুট ফাঁকা রাখুন এবং লিটার শুকনো রাখুন।`;
  }

  if (p.includes('হিট স্ট্রোক') || p.includes('গরম') || p.includes('heat') || p.includes('গ্রীষ্ম')) {
    return `🌡️ **গ্রীষ্মের দিনে তীব্র গরম ও হিট স্ট্রোক নিয়ন্ত্রণ:**

১. **খাদ্য বিরতি:**
   - সকাল ১১টা থেকে বিকাল ৪টা পর্যন্ত তীব্র গরমে মুরগিকে খাবার দেওয়া বন্ধ রাখুন। শুধু ঠান্ডা ও বিশুদ্ধ পানি দিন।
২. **পানিতে যা দিবেন:**
   - সকালের পানিতে **ভিটামিন-সি** (১ গ্রাম প্রতি ৪-৫ লিটার) এবং স্যালাইন মিশিয়ে দিন।
   - প্রতি ৫০০ মুরগির জন্য ২-৩টি বরফের টুকরো পানির ট্যাঙ্কে দিতে পারেন।
৩. **শেড ঠান্ডা রাখা:**
   - শেডের চালে চটের বস্তা বিছিয়ে পানি স্প্রে করুন।
   - ফ্যান বা এগজস্ট চালু রাখুন এবং শেডের ভেতর জীবাণুনাশক কুয়াশার মতো ফগিং করুন।`;
  }

  if (p.includes('fcr') || p.includes('এফসিআর') || p.includes('ওজন') || p.includes('লাভ')) {
    return `⚖️ **FCR (খাদ্য রূপান্তর হার) ও দ্রুত ওজন বৃদ্ধির কৌশল:**

১. **এফসিআর কি?**
   - FCR = মোট খাওয়া খাদ্যের ওজন (কেজি) ÷ মুরগির মোট লাইভ ওজন (কেজি)।
   - ব্রয়লারে আদর্শ FCR ১.৪ থেকে ১.৫। FCR যত কম হবে, লাভ তত বেশি!
২. **এফসিআর ভালো রাখার উপায়:**
   - খাবারের অপচয় শূন্যে নামিয়ে আনুন (ফিডারের অর্ধেক পর্যন্ত খাবার দিন, উপচে পড়তে দেবেন না)।
   - পেটের স্বাস্থ্য ভালো রাখতে সপ্তাহে ২ দিন প্রোবায়োটিক বা এসিডিফায়ার দিন।
   - লাইটিং প্রোগ্রামে রাতে অন্তত ১-২ ঘণ্টা অন্ধকার রাখুন যাতে হজম ক্ষমতা বাড়ে।`;
  }

  const batchInfo = batchContext?.birdType 
    ? `(আপনার বর্তমান ব্যাচ: ${batchContext.birdType}, বয়স: ${batchContext.ageDays || 'N/A'} দিন, সংখ্যা: ${batchContext.birdCount || 'N/A'} টি)`
    : '';

  return `🐔 **পোল্ট্রি পরামর্শক সহকারী:** ${batchInfo}

আপনার প্রশ্নের বিষয় বিস্তারিত জানতে নিচের বিষয়গুলোর যেকোনো একটি লিখতে পারেন:
- 🐣 **ব্রুডিং:** তাপমাত্রা, খাবার ও লিটার ব্যবস্থাপনা
- 💉 **ভ্যাকসিন শিডিউল:** বয়স অনুযায়ী বিসিআরডিভি, গামবোরো ও রানিক্ষেতের নিয়ম
- 🩸 **রোগব্যাধি:** রক্ত আমাশয়, সিআরডি (সর্দি-কাশি), গামবোরো, রানীক্ষেত ও অ্যাসাইটিস
- 🌡️ **মৌসুমি যত্ন:** তীব্র গরমে হিট স্ট্রোক রোধ ও শীতের বাতাস নিয়ন্ত্রণ
- ⚖️ **FCR ও ওজন:** খাদ্য রূপান্তর হার উন্নত করার গোপন টিপস
- 💊 **ওষুধ প্রয়োগের মাত্রা:** ভিটামিন, ক্যালসিয়াম, লিভার টনিক ও অ্যান্টিবায়োটিকের সঠিক ব্যবহার

আপনার নির্দিষ্ট কোনো সমস্যা বা লক্ষণ থাকলে লিখে জানান, আমি এখনই পূর্ণাঙ্গ সমাধান দিচ্ছি!`;
}

// API endpoint for AI Assistant chat
app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { message, history = [], batchContext } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Try Gemini API if available
    if (aiClient) {
      try {
        const systemInstruction = `আপনি 'খামার বন্ধু AI সহকারী'—বাংলাদেশের পোল্ট্রি খামারীদের বিশ্বস্ত ডিজিটাল ভেটেরিনারি ও খামার বিশেষজ্ঞ।
আপনার উদ্দেশ্য: ব্রয়লার, সোনালী, লেয়ার, কক ও দেশি মুরগি পালনের A to Z সঠিক বৈজ্ঞানিক পরামর্শ সহজ ও সাবলীল বাংলায় দেওয়া।
আপনি সবসময় পরিষ্কার পয়েন্ট আকারে, সহানুভূতির সাথে ও ব্যবহারিক সমাধান প্রদান করবেন।

পরামর্শ দেওয়ার ক্ষেত্রসমূহ:
1. ব্রুডিং ব্যবস্থাপনা (১ম-৭ম দিন তাপমাত্রা, লাইটিং, গ্লুকোজ/স্যালাইন, পেপার ফিডিং)।
2. ভ্যাকসিন শিডিউল (বিসিআরডিভি, গামবোরো, রানিক্ষেত, ফাউল পক্স ইত্যাদি বয়স ও নিয়ম)।
3. রোগ নির্ণয় ও চিকিৎসা (রক্ত আমাশয়/কক্সিডিওসিস, সিআরডি/সর্দি-কাশি, গামবোরো, অ্যাসাইটিস, হিট স্ট্রোক)।
4. পুষ্টি ও FCR (ফিড কনভার্সন রেশিও উন্নত করা, গ্রোথ প্রোমোটার, প্রোবায়োটিক)।
5. শেড ও বায়োসিকিউরিটি (লিটার শুকনা রাখা, জীবাণুনাশক স্প্রে, গ্রীষ্ম ও শীতের যত্ন)।

${batchContext ? `বর্তমানে খামারীর লাইভ ব্যাচ তথ্য:
- পাখির জাত: ${batchContext.birdType || 'ব্রয়লার'}
- বয়স: ${batchContext.ageDays || 'অজ্ঞাত'} দিন
- মোট সংখ্যা: ${batchContext.birdCount || 'অজ্ঞাত'} টি
- গড় ওজন: ${batchContext.currentWeight ? batchContext.currentWeight + ' গ্রাম' : 'অজ্ঞাত'}
- বর্তমান মৃত্যুহার: ${batchContext.mortalityRate ? batchContext.mortalityRate + '%' : '০%'}
(প্রাসঙ্গিক হলে উত্তরের মধ্যে এই ব্যাচের বয়স ও জাতের উপযোগী সরাসরি টিপস যোগ করুন)` : ''}

জরুরি রোগ বা জটিল এন্টিবায়োটিক ব্যবহারের ক্ষেত্রে স্থানীয় রেজিস্টার্ড পশু চিকিৎসকের শরণাপন্ন হওয়ার পরামর্শ দেবেন।`;

        // Format history for Google Gen AI
        const contents: any[] = [];
        
        // Add previous turns
        for (const msg of history.slice(-6)) {
          contents.push({
            role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.content || msg.text || '' }]
          });
        }

        // Add current turn
        contents.push({
          role: 'user',
          parts: [{ text: message }]
        });

        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        });

        const reply = response.text || '';
        if (reply.trim()) {
          return res.json({
            reply,
            source: 'gemini-3.8-flash',
          });
        }
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, using high-grade fallback:', geminiError?.message || geminiError);
      }
    }

    // High quality offline fallback
    const fallbackReply = getFallbackPoultryAdvice(message, batchContext);
    return res.json({
      reply: fallbackReply,
      source: 'offline-expert-engine',
    });
  } catch (err: any) {
    console.error('Assistant error:', err);
    return res.status(500).json({
      error: 'সহকারীর সাথে সংযোগে সাময়িক সমস্যা হয়েছে।',
      fallback: getFallbackPoultryAdvice(req.body?.message || '', req.body?.batchContext)
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
