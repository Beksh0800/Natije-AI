
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import type { Review } from '../types';

/**
 * Map HTTP/API errors to user-friendly Kazakh messages
 */
function getAIErrorMessage(status: number, errText: string): string {
  if (status === 401 || status === 403) {
    return 'API кілті жарамсыз немесе мерзімі өтті. Баптауларды тексеріңіз.';
  }
  if (status === 429) {
    return 'Тым көп сұраулар жіберілді. Біраз күтіп, қайта көріңіз.';
  }
  if (status === 402) {
    return 'API балансы жеткіліксіз. Әкімшіге хабарласыңыз.';
  }
  if (status >= 500) {
    return 'AI серверінде уақытша қате. Кейінірек қайта көріңіз.';
  }
  if (errText.toLowerCase().includes('timeout') || errText.toLowerCase().includes('aborted')) {
    return 'AI жауап бергенше уақыт өтіп кетті. Қайта көріңіз.';
  }
  return `AI талдауы кезінде қате пайда болды (${status}).`;
}

/**
 * Validate that AI response has the expected structure.
 * Fills in defaults for missing fields.
 */
function validateAndNormalize(raw: any): Omit<Review, 'id' | 'submissionId' | 'createdAt'> {
  return {
    score: typeof raw.score === 'number' ? Math.min(100, Math.max(0, raw.score)) : 0,
    maxScore: typeof raw.maxScore === 'number' ? raw.maxScore : 100,
    percentage: typeof raw.percentage === 'number' ? raw.percentage : (typeof raw.score === 'number' ? raw.score : 0),
    mistakes: Array.isArray(raw.mistakes) ? raw.mistakes : [],
    feedback: typeof raw.feedback === 'string' ? raw.feedback : 'AI кері байланысты бере алмады.',
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : [],
    strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
    criteria: Array.isArray(raw.criteria) ? raw.criteria : [],
  };
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export const analyzeWork = async (imageUrl: string, subject: string, title: string, solutionUrls: string[] = []): Promise<Omit<Review, 'id' | 'submissionId' | 'createdAt'>> => {
  if (!functions) {
    throw new Error("Firebase Functions бапталмаған.");
  }

  const prompt = solutionUrls.length > 0 ? `
Ты - опытный школьный учитель. Проанализируй решение ученика по предмету "${subject}" (Тема: "${title}").
В первом изображении представлено задание (условие задачи), которое дал учитель.
В последующих изображениях представлено решение ученика (возможно на нескольких страницах).

СНАЧАЛА реши задачу самостоятельно шаг за шагом (запиши свой процесс в поле "stepByStepCalculation"). 
ЗАТЕМ внимательно проверь каждый шаг решения ученика, сравнивая со своим правильным решением. 
Учитывай, что ученик может использовать нестандартный, необычный, но математически верный способ решения. Не снижай баллы и не считай ошибкой, если метод не классический, но приводит к правильному результату и логически обоснован.
Найди фактические, логические и вычислительные ошибки, если они действительно есть.
Оцени работу по 100-балльной шкале.
Дай конструктивную обратную связь на казахском языке (feedback).
Предложи рекомендации по улучшению на казахском языке.

ОЧЕНЬ ВАЖНО ДЛЯ ОШИБОК И РЕКОМЕНДАЦИЙ:
- Будь МАКСИМАЛЬНО точным. Не используй общие фразы вроде "допущена ошибка в вычислениях".
- Указывай конкретные числа и формулы. (Например: "Оқушы 6.6 * 1.6 көбейтіндісін 10 емес, 10.56 деп алуы керек еді").
- Пиши точно, в каком месте и на каком шаге допущена ошибка.

ТВОЙ ОТВЕТ ДОЛЖЕН БЫТЬ СТРОГО В ФОРМАТЕ JSON, без Markdown форматирования (без \`\`\`json) и без лишнего текста.
` : `
Ты - опытный школьный учитель. Проанализируй работу ученика по предмету "${subject}" (Тема: "${title}").
Работа представлена на изображении.

СНАЧАЛА реши задачу самостоятельно шаг за шагом (запиши свой процесс в поле "stepByStepCalculation"). 
ЗАТЕМ внимательно изучи текст/решения на картинке.
Учитывай, что ученик может использовать нестандартный, необычный, но математически верный способ решения. Не снижай баллы и не считай ошибкой, если метод не классический, но приводит к правильному результату и логически обоснован.
Найди фактические, логические и вычислительные ошибки, если они действительно есть.
Оцени работу по 100-балльной шкале.
Дай конструктивную обратную связь на казахском языке (feedback).
Предложи рекомендации по улучшению на казахском языке.

ОЧЕНЬ ВАЖНО ДЛЯ ОШИБОК И РЕКОМЕНДАЦИЙ:
- Будь МАКСИМАЛЬНО точным. Не используй общие фразы вроде "допущена ошибка в вычислениях".
- Указывай конкретные числа и формулы. (Например: "Оқушы 6.6 * 1.6 көбейтіндісін 10 емес, 10.56 деп алуы керек еді").
- Пиши точно, в каком месте и на каком шаге допущена ошибка.

ВАЖНОЕ УСЛОВИЕ: Если на картинке только текст задания (задачи, примеры), но НЕТ решения ученика, верни следующий JSON и больше ничего не анализируй:
{ "stepByStepCalculation": "", "score": 0, "maxScore": 0, "percentage": 0, "mistakes": [{ "type": "Шешім жоқ", "description": "Бұл тек тапсырма. Оқушының шешімін жүктеңіз." }], "feedback": "Бұл тек тапсырма немесе шарт. Тексеру үшін оқушының шығарған шешімін жүктеңіз.", "recommendations": [], "strengths": [], "criteria": [] }

Иначе, ТВОЙ ОТВЕТ ДОЛЖЕН БЫТЬ СТРОГО В ФОРМАТЕ JSON, без Markdown форматирования (без \`\`\`json) и без лишнего текста.
`;

  const promptSuffix = `
Структура JSON:
{
  "stepByStepCalculation": "Мұғалімнің ішкі тексеру процесі және дұрыс шешімі (қадам-қадам)",
  "score": число (от 0 до 100),
  "maxScore": 100,
  "percentage": число (равно score),
  "mistakes": [
    { "type": "Қате түрі", "description": "НАҚТЫ сипаттама. Мысалы: 5 * 5 = 25 болуы керек, бірақ оқушы 20 деп жазған." }
  ],
  "feedback": "Оқушыға арналған нақты және түсінікті кері байланыс",
  "recommendations": [
    "Нақты ұсыныс 1 (қандай ережені қайталау керек екенін дәл көрсетіңіз)",
    "Нақты ұсыныс 2"
  ],
  "strengths": [
    "Сильная сторона 1",
    "Сильная сторона 2"
  ],
  "criteria": [
    { "name": "Критерий 1", "score": 20, "maxScore": 20 }
  ]
}
`;

  const finalPrompt = prompt + promptSuffix;

  const makeRequest = async (): Promise<Omit<Review, 'id' | 'submissionId' | 'createdAt'>> => {
    const generateAIResponse = httpsCallable(functions, 'generateAIResponse');
    
    try {
      const contentParams: any[] = [
        { type: "text", text: finalPrompt },
        { type: "image_url", image_url: { url: imageUrl } }
      ];
      if (solutionUrls && solutionUrls.length > 0) {
        for (const url of solutionUrls) {
          contentParams.push({ type: "image_url", image_url: { url } });
        }
      }

      const response = await generateAIResponse({
        body: {
          models: ["openai/gpt-4o", "anthropic/claude-3.5-sonnet"],
          route: "fallback",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: contentParams
            }
          ]
        }
      });

      const data = response.data as any;

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('AI бос жауап қайтарды. Қайта көріңіз.');
      }

      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);
      return validateAndNormalize(parsed);
    } catch (err: any) { console.error("AI Analysis Error:", err);
      throw new Error('AI талдауы кезінде қате пайда болды немесе уақыт өтіп кетті. Қайта көріңіз.', { cause: err });
    }
  };

  // Try once, retry on JSON parse failure
  try {
    return await makeRequest();
  } catch (firstError: any) {
    // If it's a JSON parse error, retry once
    if (firstError instanceof SyntaxError) {
      console.warn('AI returned invalid JSON, retrying...', firstError);
      try {
        return await makeRequest();
      } catch (retryError: any) {
        if (retryError instanceof SyntaxError) {
          throw new Error('AI дұрыс форматта жауап бере алмады. Қайта көріңіз.', { cause: retryError });
        }
        throw retryError;
      }
    }
    throw firstError;
  }
};

export const getChatResponse = async (userMessage: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<string> => {
  if (!functions) {
    return getMockResponse(userMessage);
  }

  const systemPrompt = {
    role: "system",
    content: "Сен — NÄTIJE AI білім беру жүйесінің көмекшісісің. Сен мұғалімдер мен оқушыларға оқу процесіне, жұмыстарды бағалауға және платформаны қолдануға байланысты сұрақтарға қазақ тілінде қысқа, нақты және сыпайы жауап беруің керек."
  };

  const formattedHistory = history.map(h => ({
    role: h.role === 'assistant' ? 'assistant' : 'user',
    content: h.content
  }));

  try {
    const generateAIResponse = httpsCallable(functions, 'generateAIResponse');
    const response = await generateAIResponse({
      body: {
        model: "openai/gpt-4o",
        messages: [
          systemPrompt,
          ...formattedHistory,
          { role: "user", content: userMessage }
        ]
      }
    });

    const data = response.data as any;
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return getMockResponse(userMessage);
    }
    return data.choices[0].message.content;
  } catch (err: any) { console.error("Failed to get chat response from Functions", err);
    return getMockResponse(userMessage);
  }
};

function getMockResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("критерий") || q.includes("бағалау")) {
    return "NÄTIJE AI жүйесінде жұмыстар 100 балдық шкала бойынша бағаланады:\n\n1. Жұмыстың дұрыстығы мен логикасы;\n2. Орфография мен грамматика сәйкестігі;\n3. AI талдау қателерді анықтап, мұғалімнің қарап бекітуіне жібереді.";
  }
  if (q.includes("сынып") || q.includes("құру")) {
    return "Сынып құру үшін:\n1. 'Сыныптар' бөліміне өтіңіз;\n2. 'Жаңа сынып қосу' формасына сынып атауын жазып, 'Қосу' батырмасын басыңыз;\n3. Сынып коды автоматты түрде жасалады. Осы кодты оқушыларға жіберіңіз.";
  }
  if (q.includes("талдау") || q.includes("қалай")) {
    return "AI талдау мұғалім жүктеген жазба жұмысының (тетрадь бетінің) фотосын өңдеп, оны GPT-4o Vision көмегімен оқиды. Ол қателерді тауып, балл қояды және кері байланыс дайындайды.";
  }
  return "Сауалыңызға рақмет! Мен NÄTIJE AI жүйесінің көмекшісімін. Сізге сыныпты басқару немесе тапсырмаларды тексеру бойынша ақпарат қажет пе?";
}
