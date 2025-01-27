import { NextResponse } from "next/server";
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request: Request) {
  const data = await request.json();

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Store chat history in memory (note: this will reset when server restarts)
  let chatHistory: any[] = [];

  const prompt = `You are a compassionate and professional mental health chatbot. Your role is to:
- Provide empathetic and supportive responses
- Listen actively and validate feelings
- Offer general mental health guidance and coping strategies
- Encourage seeking professional help when appropriate
- Maintain a warm and understanding tone
- Never provide medical diagnoses or treatment

Previous conversation:
${chatHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join("\n")}

User message: ${data.input}

Please respond in a helpful and supportive way while maintaining appropriate boundaries. Reference previous parts of the conversation when relevant to provide continuity and show you're following the discussion.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  // Update chat history
  chatHistory.push(
    { role: "user", content: data.input },
    { role: "assistant", content: response }
  );

  return NextResponse.json({
    status: "success",
    result: response,
    userInput: data.input,
  });
}
