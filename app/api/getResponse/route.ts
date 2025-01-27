import { NextResponse } from "next/server";
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request: Request) {
  const data = await request.json();

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are a compassionate and professional mental health chatbot. Your role is to:
- Provide empathetic and supportive responses
- Listen actively and validate feelings
- Offer general mental health guidance and coping strategies
- Encourage seeking professional help when appropriate
- Maintain a warm and understanding tone
- Never provide medical diagnoses or treatment

User message: ${data.input}

Please respond in a helpful and supportive way while maintaining appropriate boundaries.`;

  const result = await model.generateContent(prompt);

  return NextResponse.json({
    status: "success",
    result: result.response.text(),
    userInput: data.input,
  });
}
