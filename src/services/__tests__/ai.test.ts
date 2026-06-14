import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeWork, getChatResponse } from '../ai';
import { httpsCallable } from 'firebase/functions';

// Mock firebase functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

// Mock our local firebase lib
vi.mock('../../lib/firebase', () => ({
  functions: {},
}));

describe('AI Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeWork', () => {
    it('successfully analyzes work and returns valid JSON', async () => {
      const mockResult = {
        score: 85,
        maxScore: 100,
        percentage: 85,
        mistakes: [],
        feedback: "Жақсы жұмыс",
        recommendations: [],
        strengths: [],
        criteria: []
      };

      const mockCallable = vi.fn().mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify(mockResult)
              }
            }
          ]
        }
      });
      (httpsCallable as any).mockReturnValue(mockCallable);

      const result = await analyzeWork('http://example.com/image.jpg', 'Math', 'Algebra');
      
      expect(result.score).toBe(85);
      expect(result.feedback).toBe("Жақсы жұмыс");
      expect(mockCallable).toHaveBeenCalled();
    });

    it('handles AI empty response error', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: {} // missing choices
      });
      (httpsCallable as any).mockReturnValue(mockCallable);

      await expect(analyzeWork('http://example.com/image.jpg', 'Math', 'Algebra'))
        .rejects
        .toThrow('AI талдауы кезінде қате пайда болды немесе уақыт өтіп кетті. Қайта көріңіз.');
    });
  });

  describe('getChatResponse', () => {
    it('returns successful response from AI', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: "Сәлеметсіз бе! Мен AI көмекшімін."
              }
            }
          ]
        }
      });
      (httpsCallable as any).mockReturnValue(mockCallable);

      const result = await getChatResponse('Сәлем', []);
      expect(result).toBe("Сәлеметсіз бе! Мен AI көмекшімін.");
    });

    it('falls back to mock response when API fails', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Network error'));
      (httpsCallable as any).mockReturnValue(mockCallable);

      const result = await getChatResponse('критерий қалай?', []);
      expect(result).toContain('NÄTIJE AI жүйесінде жұмыстар 100 балдық шкала бойынша бағаланады');
    });
  });
});
