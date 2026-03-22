const Groq = require('groq-sdk');
const pool = require('../config/database');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Store conversation per user
const conversations = {};

// Detect language
function detectLanguage(text) {
  if (/[\u0980-\u09FF]/.test(text)) return 'bengali';
  if (/[\u0900-\u097F]/.test(text)) return 'hindi';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kannada';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'tamil';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'telugu';
  return 'english';
}

// System prompt per language
function getSystemPrompt(language) {
  const prompts = {
    bengali: `আপনি AgriMind AI, বাংলাদেশ ও ভারতের কৃষকদের জন্য একজন বিশেষজ্ঞ কৃষি সহকারী।
WhatsApp এ সাহায্য করুন: ফসলের দাম, রোগ, সার, সেচ, সরকারি প্রকল্প, আবহাওয়া।
উত্তর সর্বদা বাংলায় দিন। ছোট ও সহজ ভাষা ব্যবহার করুন (৩-৪ লাইন)।
ইমোজি ব্যবহার করুন। কৃষক-বান্ধব ভাষায় কথা বলুন।`,

    hindi: `आप AgriMind AI हैं, भारतीय किसानों के लिए एक विशेषज्ञ कृषि सहायक।
WhatsApp पर मदद करें: फसल की कीमत, बीमारी, खाद, सिंचाई, सरकारी योजनाएं।
हमेशा हिंदी में जवाब दें। सरल और छोटा जवाब दें (3-4 लाइन)।
इमोजी का उपयोग करें। किसान-हितैषी भाषा में बात करें।`,

    tamil: `நீங்கள் AgriMind AI, இந்திய விவசாயிகளுக்கான நிபுணர் விவசாய உதவியாளர்.
WhatsApp இல் உதவுங்கள்: பயிர் விலைகள், நோய்கள், உரங்கள், நீர்ப்பாசனம், அரசு திட்டங்கள்.
எப்போதும் தமிழில் பதில் அளியுங்கள். எளிய மொழியில் சுருக்கமாக (3-4 வரிகள்).`,

    telugu: `మీరు AgriMind AI, భారతీయ రైతులకు నిపుణ వ్యవసాయ సహాయకుడు.
WhatsApp లో సహాయం చేయండి: పంట ధరలు, వ్యాధులు, ఎరువులు, నీటిపారుదల, ప్రభుత్వ పథకాలు.
ఎల్లప్పుడూ తెలుగులో సమాధానం ఇవ్వండి. సులభమైన భాషలో క్లుప్తంగా (3-4 వరుసలు).`,

    kannada: `ನೀವು AgriMind AI, ಭಾರತೀಯ ರೈತರಿಗೆ ತಜ್ಞ ಕೃಷಿ ಸಹಾಯಕ.
WhatsApp ನಲ್ಲಿ ಸಹಾಯ ಮಾಡಿ: ಬೆಳೆ ಬೆಲೆಗಳು, ರೋಗಗಳು, ಗೊಬ್ಬರ, ನೀರಾವರಿ, ಸರಕಾರಿ ಯೋಜನೆಗಳು.
ಯಾವಾಗಲೂ ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರ ನೀಡಿ. ಸರಳ ಭಾಷೆಯಲ್ಲಿ ಸಂಕ್ಷಿಪ್ತವಾಗಿ (3-4 ಸಾಲುಗಳು).`,

    english: `You are AgriMind AI, an expert farming assistant for Indian farmers on WhatsApp.
Help with: crop prices, diseases, fertilizers, irrigation, government schemes, weather tips.
Always respond in simple English. Keep answers SHORT (3-4 lines).
Use emojis. Be farmer-friendly and practical.`
  };
  return prompts[language] || prompts.english;
}

// Get welcome message per language
function getWelcomeMessage(language, name) {
  const messages = {
    bengali: `🌾 নমস্কার ${name}! আমি AgriMind AI।

আমি সাহায্য করতে পারি:
1️⃣ ফসলের দাম জানতে (যেমন: আলু দাম)
2️⃣ ফসলের রোগ সম্পর্কে
3️⃣ সরকারি প্রকল্প (PM-KISAN ইত্যাদি)
4️⃣ কোন ফসল চাষ করবেন
5️⃣ সার ও সেচ পরামর্শ

যেকোনো প্রশ্ন করুন বাংলায়! 🙏`,

    hindi: `🌾 नमस्ते ${name}! मैं AgriMind AI हूं।

मैं मदद कर सकता हूं:
1️⃣ फसल की कीमत (जैसे: आलू भाव)
2️⃣ फसल की बीमारी
3️⃣ सरकारी योजनाएं (PM-KISAN आदि)
4️⃣ कौन सी फसल उगाएं
5️⃣ खाद और सिंचाई सलाह

हिंदी में कोई भी सवाल पूछें! 🙏`,

    english: `🌾 Hello ${name}! I'm AgriMind AI.

I can help with:
1️⃣ Crop prices (e.g., potato price)
2️⃣ Crop diseases
3️⃣ Government schemes (PM-KISAN etc.)
4️⃣ Which crop to grow
5️⃣ Fertilizer & irrigation advice

Ask anything in English! 🙏`
  };
  return messages[language] || messages.english;
}

// Get market prices from database
async function getMarketPrices(cropName) {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (city) city, price_per_kg, state 
       FROM market_prices 
       WHERE LOWER(crop_name) = LOWER($1) 
       ORDER BY city, price_per_kg DESC`,
      [cropName]
    );
    return result.rows.sort((a, b) => b.price_per_kg - a.price_per_kg).slice(0, 6);
  } catch (err) {
    return [];
  }
}

// Map local language crop names to English
const cropTranslations = {
  // Bengali
  'আলু': 'potato', 'পেঁয়াজ': 'onion', 'ধান': 'rice', 'চাল': 'rice',
  'টমেটো': 'tomato', 'সরিষা': 'mustard', 'পাট': 'jute',
  'ফুলকপি': 'cauliflower', 'বেগুন': 'brinjal', 'ভুট্টা': 'maize',
  // Hindi
  'आलू': 'potato', 'प्याज': 'onion', 'चावल': 'rice', 'धान': 'rice',
  'टमाटर': 'tomato', 'सरसों': 'mustard', 'गेहूं': 'wheat',
  'फूलगोभी': 'cauliflower', 'बैंगन': 'brinjal', 'मक्का': 'maize',
  // English
  'potato': 'potato', 'onion': 'onion', 'rice': 'rice',
  'tomato': 'tomato', 'mustard': 'mustard', 'wheat': 'wheat',
  'jute': 'jute', 'cauliflower': 'cauliflower', 'brinjal': 'brinjal',
  'maize': 'maize'
};

// Find crop name in message
function findCropInMessage(msg) {
  const msgLower = msg.toLowerCase();
  for (const [localName, englishName] of Object.entries(cropTranslations)) {
    if (msg.includes(localName) || msgLower.includes(localName.toLowerCase())) {
      return { local: localName, english: englishName };
    }
  }
  return null;
}

// Check if message is asking for price
function isPriceQuery(msg, language) {
  const priceWords = {
    bengali: ['দাম', 'মূল্য', 'কত', 'রেট', 'মণ্ডি'],
    hindi: ['भाव', 'दाम', 'कीमत', 'रेट', 'मंडी', 'कितना'],
    english: ['price', 'rate', 'cost', 'mandi', 'market', 'how much']
  };
  const words = priceWords[language] || priceWords.english;
  const msgLower = msg.toLowerCase();
  return words.some(w => msg.includes(w) || msgLower.includes(w));
}

// Format price response per language
function formatPriceResponse(crop, prices, language) {
  if (!prices.length) {
    const noData = {
      bengali: `❌ ${crop} এর দাম পাওয়া যায়নি। অন্য ফসলের নাম দিন।`,
      hindi: `❌ ${crop} का भाव नहीं मिला। कोई और फसल का नाम बताएं।`,
      english: `❌ No price found for ${crop}. Try another crop name.`
    };
    return noData[language] || noData.english;
  }

  const best = prices[0];
  const priceList = prices.map(p => `• ${p.city}: ₹${p.price_per_kg}/kg`).join('\n');

  const responses = {
    bengali: `📊 ${crop} এর বর্তমান বাজার দর:\n\n${priceList}\n\n🏆 সেরা দাম: ${best.city} তে ₹${best.price_per_kg}/kg\n\n💡 বেশি লাভের জন্য ${best.city} তে বিক্রি করুন!`,
    hindi: `📊 ${crop} का वर्तमान बाजार भाव:\n\n${priceList}\n\n🏆 सबसे अच्छा भाव: ${best.city} में ₹${best.price_per_kg}/kg\n\n💡 अधिक लाभ के लिए ${best.city} में बेचें!`,
    english: `📊 Current ${crop} market prices:\n\n${priceList}\n\n🏆 Best price: ${best.city} at ₹${best.price_per_kg}/kg\n\n💡 Sell in ${best.city} for maximum profit!`
  };

  return responses[language] || responses.english;
}

// Main WhatsApp handler
const handleWhatsApp = async (req, res) => {
  try {
    const incomingMsg = (req.body.Body || '').trim();
    const from = req.body.From || '';
    const profileName = req.body.ProfileName || 'Farmer';

    console.log(`📱 WhatsApp from ${from} (${profileName}): ${incomingMsg}`);

    const language = detectLanguage(incomingMsg);
    const msgLower = incomingMsg.toLowerCase();

    // Initialize conversation
    if (!conversations[from]) {
      conversations[from] = { history: [], language };
    }
    conversations[from].language = language;

    let reply = '';

    // ── GREETING / START ──
    const greetWords = ['hi', 'hello', 'start', 'help', 'নমস্কার', 'হ্যালো', 'শুরু',
      'namaste', 'नमस्ते', 'हेलो', 'शुरू', 'வணக்கம்', 'ಹಲೋ'];
    if (greetWords.some(w => msgLower === w || msgLower === w + '!' || msgLower === w + '.')) {
      conversations[from].history = [];
      reply = getWelcomeMessage(language, profileName.split(' ')[0]);

    // ── PRICE QUERY ──
    } else if (isPriceQuery(incomingMsg, language)) {
      const crop = findCropInMessage(incomingMsg);
      if (crop) {
        const prices = await getMarketPrices(crop.english);
        reply = formatPriceResponse(crop.local, prices, language);
      } else {
        const askCrop = {
          bengali: '🌾 কোন ফসলের দাম জানতে চান?\nযেমন লিখুন: *আলু দাম* বা *পেঁয়াজ দাম*',
          hindi: '🌾 किस फसल का भाव जानना चाहते हैं?\nजैसे लिखें: *आलू भाव* या *प्याज दाम*',
          english: '🌾 Which crop price do you want?\nE.g. type: *potato price* or *onion rate*'
        };
        reply = askCrop[language] || askCrop.english;
      }

    // ── PM-KISAN ──
    } else if (msg => ['pm-kisan', 'pm kisan', 'पीएम किसान', 'পিএম কিসান', 'किसान सम्मान']
      .some(w => msgLower.includes(w))) {
      const pmkisan = {
        bengali: `🏛️ PM-KISAN প্রকল্প:\n\n✅ প্রতি বছর ₹6,000 পাবেন\n✅ 3টি কিস্তিতে ₹2,000 করে\n✅ সরাসরি ব্যাংকে আসবে\n\n📝 আবেদন: pmkisan.gov.in\n📞 হেল্পলাইন: 155261`,
        hindi: `🏛️ PM-KISAN योजना:\n\n✅ हर साल ₹6,000 मिलेंगे\n✅ 3 किस्तों में ₹2,000 प्रत्येक\n✅ सीधे बैंक में आएगा\n\n📝 आवेदन: pmkisan.gov.in\n📞 हेल्पलाइन: 155261`,
        english: `🏛️ PM-KISAN Scheme:\n\n✅ Get ₹6,000 per year\n✅ 3 installments of ₹2,000 each\n✅ Directly to your bank\n\n📝 Apply: pmkisan.gov.in\n📞 Helpline: 155261`
      };
      reply = pmkisan[language] || pmkisan.english;

    // ── WEATHER / SEASON ──
    } else if (['weather', 'season', 'मौसम', 'আবহাওয়া', 'ঋতু', 'फसल'].some(w => msgLower.includes(w))) {
      const month = new Date().getMonth() + 1;
      let season, crops;
      if (month >= 6 && month <= 9) {
        season = 'Kharif';
        crops = { bengali: 'ধান, পাট, ভুট্টা, বেগুন, টমেটো', hindi: 'धान, जूट, मक्का, बैंगन, टमाटर', english: 'Rice, Jute, Maize, Brinjal, Tomato' };
      } else if (month >= 10 || month <= 2) {
        season = 'Rabi';
        crops = { bengali: 'গম, আলু, সরিষা, ফুলকপি, মটরশুটি', hindi: 'गेहूं, आलू, सरसों, फूलगोभी, मटर', english: 'Wheat, Potato, Mustard, Cauliflower, Pea' };
      } else {
        season = 'Zaid';
        crops = { bengali: 'তরমুজ, শসা, করলা', hindi: 'तरबूज, खीरा, करेला', english: 'Watermelon, Cucumber, Bitter Gourd' };
      }

      const seasonReply = {
        bengali: `🌦️ এখন *${season}* মৌসুম চলছে।\n\n🌱 এখন চাষ করুন:\n${crops.bengali}\n\n💡 ভালো ফলনের জন্য এখনই বীজ তৈরি শুরু করুন।`,
        hindi: `🌦️ अभी *${season}* का मौसम है।\n\n🌱 अभी बोएं:\n${crops.hindi}\n\n💡 अच्छी फसल के लिए अभी से बीज तैयार करें।`,
        english: `🌦️ Current season: *${season}*\n\n🌱 Best crops to grow now:\n${crops.english}\n\n💡 Start preparing seeds now for good yield.`
      };
      reply = seasonReply[language] || seasonReply.english;

    // ── USE GROQ AI FOR ALL OTHER QUERIES ──
    } else {
      conversations[from].history.push({ role: 'user', content: incomingMsg });
      if (conversations[from].history.length > 8) {
        conversations[from].history = conversations[from].history.slice(-8);
      }

      try {
        const response = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: getSystemPrompt(language) },
            ...conversations[from].history
          ],
          model: 'llama-3.3-70b-versatile',
          max_tokens: 300,
          temperature: 0.5
        });

        reply = response.choices[0].message.content;
        conversations[from].history.push({ role: 'assistant', content: reply });

      } catch (aiErr) {
        console.error('Groq error:', aiErr.message);
        const errMsg = {
          bengali: '❌ দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। একটু পরে আবার চেষ্টা করুন।',
          hindi: '❌ क्षमा करें, अभी जवाब नहीं दे सकता। थोड़ी देर बाद कोशिश करें।',
          english: '❌ Sorry, cannot answer right now. Please try again later.'
        };
        reply = errMsg[language] || errMsg.english;
      }
    }

    console.log(`✅ Reply to ${from}: ${reply.substring(0, 100)}...`);

    // Send reply via Twilio TwiML
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${reply.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message>
</Response>`);

  } catch (err) {
    console.error('WhatsApp handler error:', err.message);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, something went wrong. Please try again. 🙏</Message>
</Response>`);
  }
};

module.exports = { handleWhatsApp };