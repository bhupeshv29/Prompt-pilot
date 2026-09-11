export const JWT_SECRET = process.env.JWT_SECRET 
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN 

export const PORT = Number(process.env.PORT ?? 3000);

export const DATABASE_URL = process.env.DATABASE_URL;

export const E2B_API_KEY = process.env.E2B_API_KEY;

export const GROQ_API_KEY = process.env.GROQ_API_KEY;
export const GROQ_BASE_URL = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";
export const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN
