// ============================================
// AgriMind AI — Voice Assistant Module
// ============================================

let recognition = null;
let isListening = false;
let voiceLang = 'en-IN';
let speechSynth = window.speechSynthesis;

function toggleVoiceAssistant() {
  const panel = document.getElementById('voice-panel');
  const isHidden = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !isHidden);
  if (isHidden) panel.classList.add('active');
  else { panel.classList.remove('active'); stopListening(); }
}

function setVoiceLang(lang) {
  voiceLang = lang;
  document.querySelectorAll('.lang-btn').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && lang === 'en-IN') || (i === 1 && lang === 'hi-IN'));
  });
  if (recognition) recognition.lang = lang;
}

function initSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    document.getElementById('mic-btn').innerHTML = `
      <span class="mic-icon">🚫</span>
      <span class="mic-label">Voice not supported in this browser</span>
    `;
    return false;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = voiceLang;

  recognition.onstart = () => {
    isListening = true;
    document.getElementById('mic-btn').classList.add('listening');
    document.getElementById('mic-btn').querySelector('.mic-label').textContent = 'Listening...';
    document.getElementById('voice-transcript').innerHTML = '<p class="voice-listening">🔴 Listening... speak now</p>';
  };

  recognition.onresult = (e) => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    document.getElementById('voice-transcript').innerHTML = `<p class="voice-text">🎙️ "${transcript}"</p>`;

    if (e.results[e.results.length - 1].isFinal) {
      sendVoiceQuery(transcript);
    }
  };

  recognition.onerror = (e) => {
    stopListening();
    if (e.error === 'not-allowed') {
      document.getElementById('voice-transcript').innerHTML = '<p style="color:var(--red)">❌ Microphone permission denied. Please allow microphone access.</p>';
    } else {
      document.getElementById('voice-transcript').innerHTML = `<p style="color:var(--red)">Error: ${e.error}</p>`;
    }
  };

  recognition.onend = () => { stopListening(); };
  return true;
}

function toggleListening() {
  if (isListening) {
    stopListening();
  } else {
    if (!recognition && !initSpeechRecognition()) return;
    recognition.lang = voiceLang;
    try { recognition.start(); }
    catch(e) { console.error('Recognition start error:', e); }
  }
}

function stopListening() {
  isListening = false;
  const btn = document.getElementById('mic-btn');
  if (btn) {
    btn.classList.remove('listening');
    const label = btn.querySelector('.mic-label');
    if (label) label.textContent = 'Tap to Speak';
  }
  if (recognition) { try { recognition.stop(); } catch(e) {} }
}

async function sendVoiceQuery(query) {
  if (!query.trim()) return;

  const responseDiv = document.getElementById('voice-response');
  responseDiv.classList.remove('hidden');
  responseDiv.innerHTML = '⏳ Processing...';

  const { data } = await VoiceAPI.query({ query, language: voiceLang === 'hi-IN' ? 'hi' : 'en' });

  if (data.success) {
    responseDiv.innerHTML = `
      <strong>🤖 AgriMind:</strong><br/>
      ${data.response}
    `;

    // Text-to-speech
    if (speechSynth && data.response) {
      const utterance = new SpeechSynthesisUtterance(data.response);
      utterance.lang = voiceLang;
      utterance.rate = 0.9;
      speechSynth.cancel();
      speechSynth.speak(utterance);
    }

    // Navigate if action
    if (data.action) {
      const navMap = {
        navigate_market: 'market',
        navigate_schemes: 'schemes',
        navigate_crop: 'crop',
        navigate_disease: 'disease',
        navigate_marketplace: 'marketplace',
        show_prices: 'market'
      };
      if (navMap[data.action]) {
        setTimeout(() => {
          showPage(navMap[data.action]);
          toggleVoiceAssistant();
        }, 2000);
      }
    }
  } else {
    responseDiv.innerHTML = '❌ Sorry, I could not understand. Please try again.';
  }
}

function sendVoiceText(text) {
  document.getElementById('voice-transcript').innerHTML = `<p class="voice-text">🎙️ "${text}"</p>`;
  sendVoiceQuery(text);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initSpeechRecognition();
});