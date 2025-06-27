// Factory for AI services to avoid build-time initialization
let aiServices: {
  geminiAnalysis?: any;
  aiFeedbackGenerator?: any;
  geminiService?: any;
  aiRecommendations?: any;
} = {};

export async function getGeminiAnalysis() {
  if (!aiServices.geminiAnalysis) {
    try {
      const module = await import('./gemini-analysis');
      aiServices.geminiAnalysis = module;
    } catch (error) {
      console.warn('Gemini analysis not available:', error);
      return null;
    }
  }
  return aiServices.geminiAnalysis;
}

export async function getAIFeedbackGenerator() {
  if (!aiServices.aiFeedbackGenerator) {
    try {
      const module = await import('./ai-feedback-generator');
      aiServices.aiFeedbackGenerator = module;
    } catch (error) {
      console.warn('AI feedback generator not available:', error);
      return null;
    }
  }
  return aiServices.aiFeedbackGenerator;
}

export async function getGeminiService() {
  if (!aiServices.geminiService) {
    try {
      const module = await import('./gemini-service');
      aiServices.geminiService = module;
    } catch (error) {
      console.warn('Gemini service not available:', error);
      return null;
    }
  }
  return aiServices.geminiService;
}

export async function getAIRecommendations() {
  if (!aiServices.aiRecommendations) {
    try {
      const module = await import('./ai-recommendations');
      aiServices.aiRecommendations = module;
    } catch (error) {
      console.warn('AI recommendations not available:', error);
      return null;
    }
  }
  return aiServices.aiRecommendations;
}