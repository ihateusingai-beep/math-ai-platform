/**
 * MathAI — Image Generator Service
 * Phase 6: Multi-subject image cards + on/off toggle via MINIMAX_IMAGE_API_KEY
 * 
 * Wish list feature:
 * - Set MINIMAX_IMAGE_API_KEY in .env to enable
 * - Leave empty to disable (no image generation)
 */

// Separate image API key from LLM key
const IMAGE_API_KEY = process.env.MINIMAX_IMAGE_API_KEY || '';
const MINIMAX_IMAGE_ENDPOINT = 'https://api.minimax.chat/v1';

// Toggle: enabled only if IMAGE_API_KEY is set
const isEnabled = () => {
  if (!IMAGE_API_KEY) {
    console.log('[ImageGen] Disabled — set MINIMAX_IMAGE_API_KEY in .env to enable');
    return false;
  }
  return true;
};

// ========================================
// Image Prompt Templates by Subject
// ========================================
const IMAGE_PROMPT_TEMPLATES = {
  // ===== Math =====
  math: {
    triangle: {
      prompt: 'A cute educational illustration for children showing a colorful triangle with the number 3 and three sides highlighted in different colors (red, blue, green). Simple flat design, white background, Hong Kong primary school math style.',
      label: '三角形有3條邊'
    },
    square: {
      prompt: 'A cute educational illustration for children showing a colorful square with the number 4 and four equal sides highlighted in different colors. Simple flat design, white background, Hong Kong primary school math style.',
      label: '正方形有4個角'
    },
    circle: {
      prompt: 'A cute educational illustration for children showing a colorful circle with a friendly face, no corners indicated. Simple flat design, white background.',
      label: '圓形冇角'
    },
    addition: {
      prompt: 'A cute educational illustration for children showing simple addition with colorful fruits. Two groups of fruits being combined with a plus sign and equals sign. Simple flat design, white background.',
      label: '加法'
    },
    subtraction: {
      prompt: 'A cute educational illustration for children showing simple subtraction with colorful objects. Objects being taken away with a minus sign. Simple flat design, white background.',
      label: '減法'
    },
    multiplication: {
      prompt: 'A cute educational illustration for children showing simple multiplication as groups of objects. Arrays of objects with a multiply sign. Simple flat design, white background.',
      label: '乘法'
    },
    division: {
      prompt: 'A cute educational illustration for children showing simple division as sharing equally. Objects being divided into equal groups with a division sign. Simple flat design, white background.',
      label: '除法'
    },
    clock: {
      prompt: "A cute educational illustration of an analog clock showing 3 o'clock with the hour hand and minute hand clearly visible. Simple flat design, white background, Hong Kong primary school math style.",
      label: '認識時間'
    },
    money: {
      prompt: 'A cute educational illustration showing Hong Kong coins and notes with their values. Colorful flat design, white background.',
      label: '認識金錢'
    }
  },

  // ===== Chinese =====
  chinese: {
    character_learning: {
      prompt: 'A cute educational illustration showing a Chinese character with its radical highlighted in red, stroke order numbers, and a simple picture representing the meaning. Simple flat design, white background, for Hong Kong special school children.',
      label: '認字學習'
    },
    vocabulary: {
      prompt: 'A cute educational illustration showing a Chinese word with emoji-style picture dictionary format. Word prominently displayed with colorful illustration. Simple flat design, white background.',
      label: '詞彙學習'
    },
    reading: {
      prompt: 'A cute educational illustration showing a short Chinese sentence with picture story. Simple flat design, white background, for young readers.',
      label: '閱讀理解'
    },
    stroke_order: {
      prompt: 'A cute educational illustration showing Chinese character stroke order with numbered arrows on a grid. Colorful, simple, child-friendly design.',
      label: '筆順學習'
    }
  },

  // ===== English =====
  english: {
    alphabet: {
      prompt: 'A cute educational illustration showing uppercase and lowercase letter A with colorful apple illustration. Simple flat design, white background, for young ESL learners.',
      label: 'ABC 字母'
    },
    vocabulary: {
      prompt: 'A cute educational illustration showing an English word with picture card format. Large word with colorful illustration. Simple flat design, white background.',
      label: '英文單字'
    },
    conversation: {
      prompt: 'A cute educational illustration showing a simple English dialogue in speech bubbles with friendly character illustrations. Simple flat design, white background.',
      label: '英語會話'
    },
    phonics: {
      prompt: 'A cute educational illustration showing phonics pattern with example words and picture clues. Colorful, child-friendly design, simple flat style.',
      label: '發音學習'
    }
  },

  // ===== Science =====
  science: {
    nature: {
      prompt: 'A cute educational illustration showing a nature scene with plants, animals, and sun. Simple flat design, white background, for Hong Kong special school children.',
      label: '自然世界'
    },
    body: {
      prompt: 'A cute educational illustration showing human body parts with labels. Colorful, simple, child-friendly design with clear illustrations.',
      label: '人體認識'
    },
    experiment: {
      prompt: 'A cute educational illustration showing a simple science experiment with step-by-step visuals. Safe, colorful, child-friendly design.',
      label: '簡單實驗'
    },
    environment: {
      prompt: 'A cute educational illustration showing environmental concepts like recycling, trees, and clean earth. Colorful flat design, white background.',
      label: '環保概念'
    }
  }
};

class ImageGenerator {
  constructor() {
    this.cache = new Map();
  }

  // ========================================
  // Check if image generation is enabled
  // ========================================
  isEnabled() {
    return isEnabled();
  }

  // ========================================
  // Get template by subject + type
  // ========================================
  getTemplate(subject, type) {
    const subjectTemplates = IMAGE_PROMPT_TEMPLATES[subject] || IMAGE_PROMPT_TEMPLATES.math;
    return subjectTemplates[type] || Object.values(subjectTemplates)[0];
  }

  // ========================================
  // Get all available subjects
  // ========================================
  getSubjects() {
    return Object.keys(IMAGE_PROMPT_TEMPLATES);
  }

  // ========================================
  // Get available types for a subject
  // ========================================
  getTypesForSubject(subject) {
    const templates = IMAGE_PROMPT_TEMPLATES[subject] || IMAGE_PROMPT_TEMPLATES.math;
    return Object.keys(templates);
  }

  // ========================================
  // Generate image card (subject-aware)
  // ========================================
  async generateCard(subject, type, customPrompt = null) {
    if (!this.isEnabled()) {
      return { url: null, enabled: false };
    }

    const template = this.getTemplate(subject, type);
    const prompt = customPrompt || template.prompt;

    // Check cache
    const cacheKey = `${subject}:${type}:${customPrompt || 'default'}`;
    if (this.cache.has(cacheKey)) {
      return { url: this.cache.get(cacheKey), cached: true, enabled: true };
    }

    // Call MiniMax API
    const imageUrl = await this.generate(prompt);

    if (imageUrl) {
      this.cache.set(cacheKey, imageUrl);
    }

    return { url: imageUrl, cached: false, enabled: true };
  }

  // ========================================
  // MiniMax Image Generation API
  // ========================================
  async generate(prompt) {
    if (!IMAGE_API_KEY) {
      return null;
    }

    try {
      const response = await fetch(`${MINIMAX_IMAGE_ENDPOINT}/text2image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${IMAGE_API_KEY}`
        },
        body: JSON.stringify({
          model: 'image-01',
          prompt: prompt,
          aspect_ratio: '1:1',
          response_format: 'url'
        })
      });

      if (!response.ok) {
        throw new Error(`MiniMax image error: ${response.status}`);
      }

      const data = await response.json();
      
      let imageUrl = null;
      
      if (data.data?.[0]?.url) {
        imageUrl = data.data[0].url;
      } else if (data.data?.[0]?.base64) {
        imageUrl = await this.saveBase64Image(data.data[0].base64);
      } else if (data.image_url) {
        imageUrl = data.image_url;
      } else if (typeof data === 'string' || data.url) {
        imageUrl = data.url || data;
      }

      console.log('[ImageGen] Generated:', imageUrl ? 'success' : 'no URL');
      return imageUrl;

    } catch (err) {
      console.error('[ImageGen] Error:', err.message);
      return null;
    }
  }

  // ========================================
  // Save base64 image to local
  // ========================================
  async saveBase64Image(base64Data) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      
      const filename = `card_${Date.now()}.png`;
      const filepath = path.join(__dirname, '../../public/images', filename);
      
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filepath, buffer);
      return `/images/${filename}`;
    } catch (err) {
      console.error('[ImageGen] Save error:', err.message);
      return null;
    }
  }

  // ========================================
  // Auto-detect subject and type from message
  // ========================================
  async autoGenerate(userMessage, subject = 'math') {
    if (!this.isEnabled()) {
      return { url: null, enabled: false };
    }

    const lower = userMessage.toLowerCase();

    // Subject-specific auto-detection
    if (subject === 'chinese') {
      if (lower.includes('字') || lower.includes('筆順')) return this.generateCard('chinese', 'character_learning');
      if (lower.includes('詞') || lower.includes('詞彙')) return this.generateCard('chinese', 'vocabulary');
      if (lower.includes('閱') || lower.includes('讀')) return this.generateCard('chinese', 'reading');
      return this.generateCard('chinese', 'character_learning');
    }

    if (subject === 'english') {
      if (lower.includes('abc') || lower.includes('字母') || lower.includes('a ') || /^[a-z]\s/i.test(lower)) return this.generateCard('english', 'alphabet');
      if (lower.includes('單') || lower.includes('字') || lower.includes('vocab')) return this.generateCard('english', 'vocabulary');
      if (lower.includes('會話') || lower.includes('說') || lower.includes('talk')) return this.generateCard('english', 'conversation');
      return this.generateCard('english', 'alphabet');
    }

    if (subject === 'science') {
      if (lower.includes('自然') || lower.includes('植物') || lower.includes('動物')) return this.generateCard('science', 'nature');
      if (lower.includes('身體') || lower.includes('人體') || lower.includes('五官')) return this.generateCard('science', 'body');
      if (lower.includes('實') || lower.includes('實驗')) return this.generateCard('science', 'experiment');
      return this.generateCard('science', 'nature');
    }

    // Math (default)
    if (lower.includes('三角形') || lower.includes('三條邊')) return this.generateCard('math', 'triangle');
    if (lower.includes('正方形') || lower.includes('四個角') || lower.includes('四邊')) return this.generateCard('math', 'square');
    if (lower.includes('圓形') || lower.includes('圈')) return this.generateCard('math', 'circle');
    if (lower.includes('加')) return this.generateCard('math', 'addition');
    if (lower.includes('減')) return this.generateCard('math', 'subtraction');
    if (lower.includes('乘')) return this.generateCard('math', 'multiplication');
    if (lower.includes('除')) return this.generateCard('math', 'division');
    if (lower.includes('時間') || lower.includes('點鐘') || lower.includes('時鐘')) return this.generateCard('math', 'clock');
    if (lower.includes('錢') || lower.includes('蚊') || lower.includes('元')) return this.generateCard('math', 'money');

    return this.generateCard('math', 'triangle');
  }

  // ========================================
  // Clear cache
  // ========================================
  clearCache() {
    this.cache.clear();
  }
}

// ========================================
// Export
// ========================================
module.exports = { ImageGenerator, IMAGE_PROMPT_TEMPLATES };
module.exports.imageGenerator = new ImageGenerator();