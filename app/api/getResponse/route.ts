import { NextResponse } from "next/server";
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyBwuYNmc1DMhJhGdR6HKB9Eetgfwphyz1I");

export async function GET() {
  //   const data = await request.json();

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(["I want to die"]);
  console.log(result.response.text());

  return NextResponse.json({
    text: result.response.text(),
  });
}
