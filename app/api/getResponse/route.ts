import { NextResponse } from "next/server";
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request: Request) {
  const data = await request.json();

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent([
    `${data.input}, Act as an Mental health Chatbot and reply`,
  ]);

  return NextResponse.json({
    status: "success",
    result: result.response.text(),
    userInput: data.input,
  });
}
