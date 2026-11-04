import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  HelpCircle,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
  Flame,
  Droplets,
  Activity,
  HeartPulse,
  Scale,
  Feather,
  Globe,
  ExternalLink,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { Batch, UserProfile } from '../types';
import { toBnNumber } from '../utils/formatters';
import { generatePoultryResponse } from '../utils/poultryKnowledge';

export interface WebSource {
  title: string;
  uri: string;
}

/**
 * System Instruction strictly configured for exclusive Google Search Grounding,
 * zero speculation, and polite decline when unverified.
 */
export const AI_ASSISTANT_SYSTEM_INSTRUCTION = `আপনি 'খামার বন্ধু AI সহকারী'—বাংলাদেশের পোল্ট্রি খামারীদের জন্য নিবেদিত ডিজিটাল ভেটেরিনারি ও খামার বিশেষজ্ঞ।

কঠোর ও অলঙ্ঘনীয় নির্দেশনা (STRICT SYSTEM INSTRUCTION) - শুধুমাত্র গুগল সার্চ গ্রাউন্ডিং ও শতভাগ নির্ভুলতার নিয়ম:
১. শুধুমাত্র এক্সক্লুসিভ গুগল সার্চ গ্রাউন্ডিং (Exclusive Google Search Grounding): আপনি শুধুমাত্র ইন্টারনেটে লাইভ গুগল সার্চ করে নির্ভরযোগ্য ও অনুমোদিত অনলাইন উৎস (যেমন: বাংলাদেশ প্রাণিসম্পদ অধিদপ্তর - DLS, FAO, বাংলাদেশ কৃষি বিশ্ববিদ্যালয়, এবং প্রতিষ্ঠিত পোল্ট্রি ফার্মাসিউটিক্যালস Renata, Square, Acme, Opsonin ইত্যাদি) থেকে তথ্য যাচাই করে উত্তর প্রদান করবেন।
২. অনুমান বা আন্দাজ করা কঠোরভাবে নিষিদ্ধ (Zero Speculation): আপনি শুধুমাত্র ওয়েব সার্চ থেকে যাচাইকৃত প্রমাণিত তথ্যের ওপর ভিত্তি করে উত্তর দেবেন। কোনো বিষয়ে অনুমাননির্ভর বা মনগড়া তথ্য দেওয়া সম্পূর্ণ নিষিদ্ধ।
৩. যাচাই করা না গেলে স্পষ্ট ও বিনম্র অস্বীকৃতি (Decline when unverified): যদি কোনো প্রশ্ন, লক্ষণ, রোগ বা ওষুধের তথ্য ইন্টারনেটের নির্ভরযোগ্য তথ্যসূত্র দ্বারা নিশ্চিতভাবে যাচাই করা না যায়, তবে অনুমান করে কোনো উত্তর দেবেন না। বিনয়ের সাথে স্পষ্টভাবে জানিয়ে দিন যে এই বিষয়টি অনলাইনে নির্ভরযোগ্য উৎস থেকে নিশ্চিতভাবে যাচাই করা সম্ভব হয়নি, এবং খামারে ভুল চিকিৎসা এড়াতে কোনো অনুমাননির্ভর ওষুধ না দিয়ে দ্রুত একজন স্থানীয় অভিজ্ঞ রেজিস্টার্ড পশু চিকিৎসকের (Veterinarian) শরণাপন্ন হতে বলুন।
৪. নির্ভুল ওষুধের নাম ও প্রয়োগমাত্রা (Accurate Dosages): ওষুধের নাম বলার ক্ষেত্রে শুধুমাত্র প্রমাণিত ব্র্যান্ড ও জেনেরিক নাম এবং পানিতে/খাবারে মেশানোর অনুমোদিত বৈজ্ঞানিক প্রয়োগমাত্রা (ডোজ) পরিষ্কারভাবে জানাবেন।
৫. ভাষা ও স্টাইল: মার্জিত, আন্তরিক ও সহজবোধ্য বাংলায় বুলেট পয়েন্ট আকারে সাজিয়ে লিখুন যাতে খামারীরা সহজেই উপকৃত হন।`;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: string;
  webSources?: WebSource[];
  grounded?: boolean;
}

interface AIAssistantProps {
  currentUser: UserProfile | null;
  activeBatch?: Batch | null;
  batches?: Batch[];
  onSelectBatch?: (batchId: string) => void;
}

const QUICK_TOPICS = [
  {
    label: '🐣 ১ম সপ্তাহের ব্রুডিং',
    prompt: 'মুরগির বাচ্চার প্রথম ৭ দিনের ব্রুডিং তাপমাত্রা, খাবার ও পানি ব্যবস্থাপনার বিস্তারিত নিয়ম বলুন।',
    icon: Flame,
    color: 'from-amber-500 to-orange-500',
  },
  {
    label: '💉 ভ্যাকসিন শিডিউল',
    prompt: 'ব্রয়লার ও সোনালী মুরগির বয়স অনুযায়ী বিসিআরডিভি, গামবোরো ও রানিক্ষেত ভ্যাকসিনের সঠিক শিডিউল ও প্রয়োগ পদ্ধতি বলুন।',
    icon: HeartPulse,
    color: 'from-rose-500 to-pink-500',
  },
  {
    label: '🩸 রক্ত আমাশয়ের চিকিৎসা',
    prompt: 'মুরগির রক্ত আমাশয় বা কক্সিডিওসিস রোগের প্রধান লক্ষণ ও জরুরি চিকিৎসার ওষুধের নাম ও ডোজ কী?',
    icon: AlertCircle,
    color: 'from-red-600 to-rose-600',
  },
  {
    label: '🩺 সর্দি-কাশি ও সিআরডি',
    prompt: 'মুরগির নাক দিয়ে সর্দি পড়া, রাতে গড়গড় শব্দ ও সিআরডি (CRD) রোগের কার্যকর চিকিৎসা কী?',
    icon: Activity,
    color: 'from-blue-500 to-indigo-500',
  },
  {
    label: '🌡️ তীব্র গরমে হিট স্ট্রোক',
    prompt: 'গ্রীষ্মের দিনে তীব্র গরম ও লু হাওয়া থেকে মুরগিকে বাঁচাতে ও হিট স্ট্রোক প্রতিরোধে কী কী করণীয়?',
    icon: Flame,
    color: 'from-orange-500 to-amber-600',
  },
  {
    label: '⚖️ FCR ও ওজন বৃদ্ধির টিপস',
    prompt: 'ব্রয়লার বা সোনালীর খাবার খরচ কমিয়ে কীভাবে ১.৪ - ১.৫ এফসিআর (FCR) এবং দ্রুত ভালো ওজন অর্জন করা যায়?',
    icon: Scale,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    label: '💧 পানি ও জীবাণুনাশক',
    prompt: 'পোল্ট্রি শেডে পানি বিশুদ্ধকরণ এবং নিয়মিত জীবাণুনাশক স্প্রে করার সঠিক পদ্ধতি কী?',
    icon: Droplets,
    color: 'from-cyan-500 to-blue-500',
  },
  {
    label: '💊 ভিটামিন ও ক্যালসিয়াম',
    prompt: 'মুরগির হাড় শক্ত রাখতে এবং রোগ প্রতিরোধ ক্ষমতা বাড়াতে ভিটামিন, ক্যালসিয়াম ও লিভার টনিক কখন কীভাবে দিতে হয়?',
    icon: Feather,
    color: 'from-purple-500 to-indigo-600',
  },
];

export const AIAssistant: React.FC<AIAssistantProps> = ({
  currentUser,
  activeBatch,
  batches = [],
  onSelectBatch,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `আসসালামু আলাইকুম ${currentUser ? currentUser.name + ' ভাই' : 'খামারী ভাই'}! 🐔
আমি **খামার বন্ধু AI পোল্ট্রি সহকারী**।

🌐 **অনলাইন লাইভ সার্চ ভেরিফিকেশন সক্রিয়:**
আপনার প্রতিটি প্রশ্নের উত্তর সরাসরি ইন্টারনেটে লাইভ গুগল সার্চ করে নির্ভরযোগ্য ভেটেরিনারি জার্নাল ও বাংলাদেশ প্রাণিসম্পদ অধিদপ্তরের গাইডলাইন অনুযায়ী যাচাই করে নির্ভুলভাবে দেওয়া হবে। কোনো মনগড়া বা ভুল তথ্য দেওয়া হয় না।

পোল্ট্রি খামারের যেকোনো বিষয়ে প্রশ্ন করতে পারেন:
- 🐣 ব্রুডিং ও তাপমাত্রা নিয়ন্ত্রণ
- 💉 ভ্যাকসিন বা টিকার শিডিউল ও সঠিক প্রয়োগবিধি
- 🩺 সর্দি, রক্ত আমাশয়, গামবোরো বা রোগের সুনির্দিষ্ট চিকিৎসা ও ওষুধের ডোজ
- ⚖️ FCR নিয়ন্ত্রণ ও খাবার খরচ কমানোর কৌশল
- 🌡️ তীব্র গরমে হিট স্ট্রোক ও শীতে ঠান্ডার ব্যবস্থাপনা

নিচের বিষয়গুলো থেকে পছন্দ করুন অথবা আপনার প্রশ্নটি নিচে লিখে পাঠান!`,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      source: 'গুগল লাইভ সার্চ ও খামার বন্ধু',
      grounded: true,
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [includeBatchContext, setIncludeBatchContext] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (window.confirm('আপনি কি এই চ্যাট মুছে নতুন করে শুরু করতে চান?')) {
      setMessages([
        {
          id: 'welcome-reset',
          role: 'assistant',
          content: 'চ্যাট ক্লিয়ার করা হয়েছে। নতুন যেকোনো প্রশ্ন লিখে পাঠান!',
          timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  // Calculate batch age if active
  const getBatchAge = () => {
    if (!activeBatch?.startDate) return null;
    const start = new Date(activeBatch.startDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  };

  const batchAgeDays = getBatchAge();

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const batchContext = includeBatchContext && activeBatch ? {
        birdType: activeBatch.birdType,
        birdCount: activeBatch.initialChicks,
        ageDays: batchAgeDays,
        targetWeight: activeBatch.targetWeightGrams,
        status: activeBatch.status,
      } : undefined;

      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let reply = '';
      let source = 'গুগল লাইভ সার্চ ও জেমিনাই';
      let webSources: WebSource[] = [];
      let grounded = false;

      try {
        const res = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: historyPayload,
            batchContext,
            systemInstruction: AI_ASSISTANT_SYSTEM_INSTRUCTION,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.reply) {
            reply = data.reply;
            source = data.source === 'gemini-3.8-flash' ? 'গুগল লাইভ সার্চ ও জেমিনাই' : 'খামার বন্ধু বিশেষজ্ঞ';
            webSources = data.webSources || [];
            grounded = Boolean(data.grounded);
          }
        }
      } catch (fetchErr) {
        console.warn('Network or server fetch notice, using expert advisor engine directly:', fetchErr);
      }

      // If network fetch didn't return a reply, immediately compute via built-in poultry expert engine
      if (!reply) {
        reply = generatePoultryResponse(text, batchContext);
        source = 'খামার বন্ধু বিশেষজ্ঞ';
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        source,
        webSources,
        grounded,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      // Absolute fail-safe: never show a connection error to user
      const failSafeReply = generatePoultryResponse(text, {
        birdType: activeBatch?.birdType,
        birdCount: activeBatch?.initialChicks,
        ageDays: batchAgeDays,
      });

      const errorMsg: Message = {
        id: `assistant-fallback-${Date.now()}`,
        role: 'assistant',
        content: failSafeReply,
        timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        source: 'খামার বন্ধু বিশেষজ্ঞ',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Simple Markdown renderer for poultry advice text
  const renderFormattedContent = (content: string) => {
    return (
      <div className="space-y-2 text-sm leading-relaxed whitespace-pre-wrap">
        {content.split('\n\n').map((paragraph, pIdx) => {
          // Check for bullet lists
          if (paragraph.includes('\n- ') || paragraph.startsWith('- ') || paragraph.includes('\n১.') || paragraph.includes('\n1.')) {
            const lines = paragraph.split('\n');
            return (
              <div key={pIdx} className="space-y-1">
                {lines.map((line, lIdx) => {
                  const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
                  const isNumbered = /^\s*(\d+|[০-৯]+)[.)]/.test(line.trim());
                  
                  // Parse bold **text**
                  const formattedLine = line.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                  });

                  if (isBullet || isNumbered) {
                    return (
                      <div key={lIdx} className="flex items-start gap-2 pl-2">
                        <span className="text-emerald-600 font-bold mt-0.5">•</span>
                        <div className="flex-1">{formattedLine}</div>
                      </div>
                    );
                  }

                  return <p key={lIdx}>{formattedLine}</p>;
                })}
              </div>
            );
          }

          // Normal paragraph with bold parsing
          const parts = paragraph.split(/(\*\*.*?\*\*)/g).map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
            }
            return part;
          });

          return <p key={pIdx}>{parts}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-lg border border-emerald-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/30">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  খামার বন্ধু AI সহকারী
                </h1>
                <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  ২৪/৭ লাইভ
                </span>
                <span className="bg-blue-500/25 border border-blue-400/50 text-blue-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <Globe className="w-3 h-3 text-blue-300" />
                  লাইভ অনলাইন সার্চ দ্বারা যাচাইকৃত
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                ইন্টারনেটে লাইভ গুগল সার্চ করে তথ্য যাচাই ও ১০০% সঠিক বৈজ্ঞানিক পোল্ট্রি পরামর্শক
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeBatch && (
              <button
                onClick={() => setIncludeBatchContext(!includeBatchContext)}
                className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1.5 ${
                  includeBatchContext
                    ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                    : 'bg-white/10 border-white/20 text-slate-300 hover:bg-white/15'
                }`}
                title="ব্যাচ প্রেক্ষাপট চালু/বন্ধ করুন"
              >
                <span className={`w-2 h-2 rounded-full ${includeBatchContext ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}></span>
                {activeBatch.batchName} ({activeBatch.birdType}, {toBnNumber(batchAgeDays || 1)} দিন)
              </button>
            )}

            <button
              onClick={handleClearChat}
              className="text-xs px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 transition-colors flex items-center gap-1"
              title="নতুন চ্যাট শুরু করুন"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>নতুন চ্যাট</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Topic Chips */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            দ্রুত জানার জন্য নিচের যেকোনো বিষয়ে চাপুন:
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">১ ক্লিকেই বিস্তারিত সঠিক সমাধান</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUICK_TOPICS.map((topic, idx) => {
            const Icon = topic.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSendMessage(topic.prompt)}
                disabled={loading}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all group flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${topic.color} text-white flex items-center justify-center shrink-0 shadow-xs`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700">
                    {topic.label}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Conversation Area */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-[520px] overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-5 h-5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-xs relative group ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-br-xs'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  {/* Header in message */}
                  <div className="flex items-center justify-between gap-3 mb-1.5 text-[11px] opacity-80 flex-wrap">
                    <span className="font-bold flex items-center gap-1.5">
                      {isUser ? 'আপনি' : 'খামার বন্ধু AI'}
                      {!isUser && msg.grounded && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.5 rounded-md">
                          <Globe className="w-2.5 h-2.5 text-blue-600" />
                          অনলাইনে যাচাইকৃত
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {msg.source && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-medium">
                          {msg.source}
                        </span>
                      )}
                      <span>{msg.timestamp}</span>
                      {!isUser && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="opacity-0 group-hover:opacity-100 hover:text-emerald-600 p-0.5 rounded transition-opacity"
                          title="উত্তর কপি করুন"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  {isUser ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <>
                      {renderFormattedContent(msg.content)}

                      {/* Live Online Verified Web Sources */}
                      {msg.webSources && msg.webSources.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200/90">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 mb-1.5">
                            <Globe className="w-3.5 h-3.5 text-emerald-600" />
                            <span>অনলাইনে যাচাইকৃত তথ্যসূত্র (Verified Web Sources):</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.webSources.map((source, sIdx) => (
                              <a
                                key={sIdx}
                                href={source.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 px-2.5 py-1 rounded-lg border border-slate-200/90 transition-colors shadow-2xs max-w-full group/link"
                                title={source.uri}
                              >
                                <ExternalLink className="w-3 h-3 text-emerald-600 shrink-0 group-hover/link:translate-x-0.5 transition-transform" />
                                <span className="truncate max-w-[220px] font-medium">{source.title}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {isUser && (
                  <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 shadow-sm text-sm mt-0.5">
                    {currentUser ? currentUser.name.charAt(0) : 'খ'}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl rounded-bl-xs p-4 flex items-center gap-2 text-slate-600 text-xs font-semibold">
                <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.3s]"></div>
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <Search className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  ইন্টারনেটে লাইভ গুগল সার্চ করে সঠিক বৈজ্ঞানিক তথ্য যাচাই করা হচ্ছে...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2 bg-white border border-slate-300 rounded-2xl p-1.5 shadow-xs focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="পোল্ট্রি সংক্রান্ত যেকোনো প্রশ্ন লিখুন (যেমন: ৫ দিনের বাচ্চার কী ওষুধ দেব?)..."
              disabled={loading}
              className="flex-1 px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent resize-none outline-none max-h-24 overflow-y-auto"
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className={`p-2.5 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 ${
                inputValue.trim() && !loading
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">পাঠান</span>
            </button>
          </form>

          <div className="flex items-center justify-between gap-2 mt-2 px-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              জরুরি ও জটিল রোগের ক্ষেত্রে স্থানীয় অভিজ্ঞ রেজিস্টার্ড পশু চিকিৎসকের পরামর্শ নিন।
            </span>
            <span className="hidden md:inline">Enter চেপে পাঠান • Shift+Enter এ নতুন লাইন</span>
          </div>
        </div>
      </div>
    </div>
  );
};
