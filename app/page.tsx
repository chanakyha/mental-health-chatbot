"use client";

import { Input } from "@/components/ui/input";
import { BotIcon } from "lucide-react";
import { useState } from "react";
import Markdown from "react-markdown";

interface ChatHistory {
  userInput: string;
  botResponse: string;
}

export default function Home() {
  const [input, setInput] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    fetch("http://localhost:3000/api/getResponse", {
      method: "POST",
      body: JSON.stringify({
        input,
      }),
      headers: {
        "Content-type": "application/json",
      },
    }).then(async (response) => {
      const botResponse = await response.json();
      setChatHistory((chatHistory) => [
        ...chatHistory,
        {
          botResponse: botResponse.result,
          userInput: botResponse.userInput,
        },
      ]);
      setInput("");
    });
  };

  return (
    <main className=" ">
      <div className="flex flex-col h-screen shadow-lg p-4 md:p-16">
        <header className="bg-gradient-to-r rounded-md from-blue-600 to-blue-900 text-white py-3 px-4 flex items-center">
          <div className="flex items-center gap-2">
            <BotIcon className="w-6 h-6" />
            <h2 className="text-lg font-bold">Mental Health Chatbot</h2>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          {chatHistory.map((chat, index) => {
            return (
              <ChatComponent
                key={index}
                botResponse={chat.botResponse}
                userInput={chat.userInput}
              />
            );
          })}
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-gradient-to-r rounded-lg from-blue-600 to-blue-900 border-t px-4 py-3 flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            type="text"
            placeholder="Type your message..."
            className="flex-1 bg-white/20 px-4 py-2 text-sm text-white placeholder:text-white/50"
          />
          <button type="submit" className="btn">
            Chat
          </button>
        </form>
      </div>
    </main>
  );
}

interface ChatComponentProps extends ChatHistory {}

export const ChatComponent = ({
  userInput,
  botResponse,
}: ChatComponentProps) => {
  return (
    <>
      <div className="flex items-start gap-3">
        <div className="rounded-lg w-10 h-10 bg-gradient-to-r from-[#55efc4] to-[#00b894] text-3xl flex items-center justify-center">
          😁
        </div>
        <div className="grid gap-1 items-start text-sm">
          <div className="font-bold text-[#7b2cbf]">Mental Health Chatbot</div>
          <div>
            <Markdown>{botResponse.toString()}</Markdown>
          </div>
        </div>
      </div>
      <div className="flex items-start gap-3 justify-end">
        <div className="grid gap-1 items-end text-sm">
          <div className="font-bold text-[#9d4edd]">You</div>
          <div>
            <p>{userInput}</p>
          </div>
        </div>
        <div className="rounded-lg w-10 h-10 bg-gradient-to-r from-[#ffeaa7] to-[#fdcb6e] text-3xl flex items-center justify-center">
          😎
        </div>
      </div>
    </>
  );
};
