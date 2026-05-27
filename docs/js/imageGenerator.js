/**
 * MathAI — Image Generator Service
 * Phase 4: MiniMax 圖像生成數學圖卡
 */

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_IMAGE_ENDPOINT = 'https://api.minimax.chat/v1';

const IMAGE_PROMPT_TEMPLATES = {
  'triangle': {
    prompt: 'A cute educational illustration for children showing a colorful triangle with the number 3 and three sides highlighted in different colors (red, blue, green). Simple flat design, white background, Hong Kong primary school math style. Text "3條邊" in Chinese.',
    label: '三角形有3條邊'
  },
  'square': {
    prompt: 'A cute educational illustration for children showing a colorful square with the number 4 and four equal sides highlighted in different colors. Simple flat design, white background, Hong Kong primary school math style. Text "4個角" in Chinese.',
    label: '正方形有4個角'
  },
  'circle': {
    prompt: 'A cute educational illustration for children showing a colorful circle with a friendly face, no corners indicated. Simple flat design, white background, Hong Kong primary school math style. Text "圓形冇角" in Chinese.',
    label: '圓形冇角'
  },
  'addition': {
    prompt: 'A cute educational illustration for children showing simple addition with colorful fruits. Two groups of fruits being combined with a plus sign and equals sign. Simple flat design, white background. Text "加法" in Chinese.',
    label: '加法'
  },
  'subtraction': {
    prompt: 'A cute educational illustration for children showing simple subtraction with colorful objects. Objects being taken away with a minus sign. Simple flat design, white background. Text "減法" in Chinese.',
    label: '減法'
  },
  'multiplication': {
    prompt: 'A cute educational illustration for children showing simple multiplication as groups of objects. Arrays of objects with a multiply sign. Simple flat design, white background. Text "乘法" in Chinese.',
    label: '乘法'
  },
  'division': {
    prompt: 'A cute educational illustration for children showing simple division as sharing equally. Objects being divided into equal groups with a division sign. Simple flat design, white background. Text "除法" in Chinese.',
    label: '除法'
  },
  'clock': {
    prompt: "A cute educational illustration of an analog clock showing 3 o'clock with the hour hand and minute hand clearly visible. Simple flat design, white background, Hong Kong primary school math style. Chinese text: 3點鐘",
    label: '認識時間'
  },
  'money': {
    prompt: 'A cute educational illustration showing Hong Kong coins and notes with their values. Colorful flat design, white background. Text "認識金錢" in Chinese.',
    label: '認識金錢'
  }
};

class ImageGenerator {
  constructor() {
    this.cache = new Map(); // URL -> base64/localpath
  }

  // ========================================
  // 獲取預設模板
  // ========================================
  getTemplate(type) {
    return IMAGE_PROMPT_TEMPLATES[type] || IMAGE_PROMPT_TEMPLATES['triangle'];
  }

  // ========================================
  // 生成數學圖卡
  // ========================================
  async generateCard(type, customPrompt = null) {
    const template = this.getTemplate(type);
    const prompt = customPrompt || template.prompt;

    // 檢查緩存
    const cacheKey = `${type}:${customPrompt || 'default'}`;
    if (this.cache.has(cacheKey)) {
      return { url: this.cache.get(cacheKey), cached: true };
    }

    // 調用 MiniMax API
    const imageUrl = await this.generate(prompt);

    if (imageUrl) {
      this.cache.set(cacheKey, imageUrl);
    }

    return { url: imageUrl, cached: false };
  }

  // ========================================
  // MiniMax 圖像生成 API
  // ========================================
  async generate(prompt) {
    if (!MINIMAX_API_KEY) {
      console.warn('[ImageGen] No MiniMax API key');
      return null;
    }

    try {
      const response = await fetch(`${MINIMAX_IMAGE_ENDPOINT}/text2image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MINIMAX_API_KEY}`
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
      
      // MiniMax 返回格式多樣，嘗試多個字段
      let imageUrl = null;
      
      if (data.data?.[0]?.url) {
        imageUrl = data.data[0].url;
      } else if (data.data?.[0]?.base64) {
        // 如果返回 base64，保存到本地
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
  // 保存 base64 圖像到本地
  // ========================================
  async saveBase64Image(base64Data) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // 移除 data URI 前綴
      const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      
      // 生成唯一文件名
      const filename = `math_card_${Date.now()}.png`;
      const filepath = path.join(__dirname, '../../public/images', filename);
      
      // 確保目錄存在
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filepath, buffer);
      
      // 返回相對路徑
      return `/images/${filename}`;
    } catch (err) {
      console.error('[ImageGen] Save error:', err.message);
      return null;
    }
  }

  // ========================================
  // 根據用家問題自動判斷類型並生成圖卡
  // ========================================
  async autoGenerate(userMessage) {
    const lower = userMessage.toLowerCase();

    // 判斷類型
    if (lower.includes('三角形') || lower.includes('三條邊')) {
      return this.generateCard('triangle');
    }
    if (lower.includes('正方形') || lower.includes('四個角') || lower.includes('四邊')) {
      return this.generateCard('square');
    }
    if (lower.includes('圓形') || lower.includes('圈')) {
      return this.generateCard('circle');
    }
    if (lower.includes('加') && !lower.includes('加埋') === false) {
      return this.generateCard('addition');
    }
    if (lower.includes('減')) {
      return this.generateCard('subtraction');
    }
    if (lower.includes('乘')) {
      return this.generateCard('multiplication');
    }
    if (lower.includes('除')) {
      return this.generateCard('division');
    }
    if (lower.includes('時間') || lower.includes('點鐘') || lower.includes('時鐘')) {
      return this.generateCard('clock');
    }
    if (lower.includes('錢') || lower.includes('蚊') || lower.includes('元')) {
      return this.generateCard('money');
    }

    // 預設三角形
    return this.generateCard('triangle');
  }

  // ========================================
  // 生成自定義提示詞的圖卡
  // ========================================
  async generateCustom(text, style = 'simple') {
    const prompts = {
      'simple': `Cute educational illustration with text "${text}". Simple flat design, white background, children math learning style.`,
      'colorful': `Colorful educational illustration with text "${text}". Vibrant flat design, white background, Hong Kong primary school style.`,
      'emoji': `Educational illustration with emoji style for text "${text}". Fun flat design, white background, for young children.`
    };

    const prompt = prompts[style] || prompts['simple'];
    return this.generate(prompt);
  }

  // ========================================
  // 清除緩存
  // ========================================
  clearCache() {
    this.cache.clear();
  }
}

// ========================================
// Export
// ========================================
module.exports = { ImageGenerator };
module.exports.imageGenerator = new ImageGenerator();