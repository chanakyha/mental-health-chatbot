"use client";

import { Input } from "@/components/ui/input";
import { BotIcon, Send, WifiOff } from "lucide-react";
import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { motion } from "framer-motion";

interface ChatHistory {
  userInput: string;
  botResponse: string;
}

export default function Home() {
  const [input, setInput] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Add event listeners for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!input.trim() || !isOnline) return;

    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/getResponse", {
        method: "POST",
        body: JSON.stringify({ input }),
        headers: {
          "Content-type": "application/json",
        },
      });
      const botResponse = await response.json();
      setChatHistory((prev) => [
        ...prev,
        {
          botResponse: botResponse.result,
          userInput: botResponse.userInput,
        },
      ]);
    } catch (error) {
      console.error("Failed to get response:", error);
    } finally {
      setIsLoading(false);
      setInput("");
    }
  };

  if (!isOnline) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-xl">
          <WifiOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            No Internet Connection
          </h1>
          <p className="text-gray-600">
            Please check your internet connection and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-gray-100">
      <div className="flex-1 flex flex-col bg-white shadow-xl">
        <header className="flex items-center px-6 py-4 border-b bg-white">
          <BotIcon className="w-8 h-8 text-blue-600" />
          <h1 className="ml-3 text-xl font-semibold text-gray-800">
            Mental Health Assistant
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {chatHistory.length === 0 && !isLoading && (
            <div className="flex items-start space-x-4 mb-8">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <BotIcon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 max-w-[80%] shadow-md">
                <div className="text-sm font-medium text-blue-600 mb-2">
                  Assistant
                </div>
                <div className="prose prose-sm">
                  <p className="text-gray-800 leading-relaxed">
                    👋 Hello! I&apos;m your Mental Health Assistant, a
                    compassionate AI companion here to support your emotional
                    well-being.
                  </p>
                  <p className="font-medium text-gray-800 mt-4">I can:</p>
                  <ul className="space-y-2 mt-2">
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      <span>
                        Provide a safe space for you to express your feelings
                      </span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      <span>Offer coping strategies and emotional support</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      <span>Share general mental health guidance</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      <span>Help you explore self-care techniques</span>
                    </li>
                  </ul>
                  <p className="text-gray-700 mt-4 border-t border-gray-200 pt-4">
                    While I&apos;m here to support you, please remember I&apos;m
                    not a replacement for professional help. Feel free to share
                    what&apos;s on your mind, and let&apos;s talk!
                  </p>
                </div>
              </div>
            </div>
          )}
          {chatHistory.map((chat, index) => (
            <ChatComponent
              key={index}
              botResponse={chat.botResponse}
              userInput={chat.userInput}
            />
          ))}
          {isLoading && (
            <div className="flex flex-col space-y-4">
              <div className="flex items-start space-x-3 justify-end">
                <div className="flex-1 bg-blue-50 rounded-lg p-4 max-w-[80%]">
                  <div className="text-sm text-gray-500 mb-1">You</div>
                  <p className="text-gray-800">{input}</p>
                </div>
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-medium">You</span>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <BotIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center space-x-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-3 h-3 bg-blue-600 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                    className="w-3 h-3 bg-blue-600 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                    className="w-3 h-3 bg-blue-600 rounded-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t p-4 bg-white">
          <div className="flex items-center space-x-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ChatComponentProps extends ChatHistory {}

export const ChatComponent = ({
  userInput,
  botResponse,
}: ChatComponentProps) => {
  const [displayedResponse, setDisplayedResponse] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < botResponse.length) {
      const timer = setTimeout(() => {
        setDisplayedResponse((prev) => prev + botResponse[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, 10); // Adjust typing speed here (milliseconds)
      return () => clearTimeout(timer);
    }
  }, [currentIndex, botResponse]);

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-start space-x-3 justify-end">
        <div className="flex-1 bg-blue-50 rounded-lg p-4 max-w-[80%]">
          <div className="text-sm text-gray-500 mb-1">You</div>
          <p className="text-gray-800">{userInput}</p>
        </div>
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-600 text-sm font-medium">You</span>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
          <BotIcon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 bg-gray-100 rounded-lg p-4 max-w-[80%]">
          <div className="text-sm text-gray-500 mb-1">Assistant</div>
          <div className="prose prose-sm">
            <Markdown>{displayedResponse}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
};
