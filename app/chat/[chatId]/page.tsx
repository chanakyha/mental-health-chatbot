"use client";

import { Input } from "@/components/ui/input";
import {
  BotIcon,
  Send,
  WifiOff,
  Menu,
  AlertCircle,
  PlusCircle,
  ShieldAlert,
  User,
  MessageSquare,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useLayout } from "@/components/LayoutProvider";

interface ChatHistory {
  userInput: string;
  botResponse: string;
}

// Interface for flying text animation
interface FlyingText {
  text: string;
  isAnimating: boolean;
  startPosition: { x: number; y: number };
}

export default function ChatPage() {
  const { isSidebarOpen, setIsSidebarOpen, userProfile } = useLayout();
  const [input, setInput] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [sendingText, setSendingText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [chatDate, setChatDate] = useState<string | null>(null);

  // Flying text animation state
  const [flyingText, setFlyingText] = useState<FlyingText | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const chatId = params?.chatId as string;

  // Check for chat ID and verify ownership
  useEffect(() => {
    if (chatId) {
      verifyChatOwnership(chatId);
    }
  }, [chatId, userProfile]);

  // Verify if the current user owns this chat
  const verifyChatOwnership = async (chatIdToVerify: string) => {
    if (!userProfile) return; // Wait for user profile to load

    setIsCheckingAccess(true);

    try {
      // Query the chat to check if the user_id matches the current user's ID
      const { data: chat, error } = await supabase
        .from("chats")
        .select("user_id")
        .eq("id", chatIdToVerify)
        .single();

      if (error) {
        console.error("Error verifying chat ownership:", error);
        setAccessDenied(true);
        return;
      }

      // If the chat doesn't exist or doesn't belong to the current user
      if (!chat || chat.user_id !== userProfile.id) {
        setAccessDenied(true);
        return;
      }

      // User has access, load the chat
      loadChat(chatIdToVerify);
      setAccessDenied(false);
    } catch (error) {
      console.error("Error in verifyChatOwnership:", error);
      setAccessDenied(true);
    } finally {
      setIsCheckingAccess(false);
    }
  };

  // Function to load chat messages
  const loadChat = async (chatIdToLoad: string) => {
    try {
      // First get the chat info to get creation date
      const { data: chatInfo, error: chatError } = await supabase
        .from("chats")
        .select("created_at")
        .eq("id", chatIdToLoad)
        .single();

      if (chatInfo && chatInfo.created_at) {
        // Format the date
        const createdDate = new Date(chatInfo.created_at);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Format as "Today", "Yesterday" or the date
        if (createdDate.toDateString() === today.toDateString()) {
          setChatDate("Today");
        } else if (createdDate.toDateString() === yesterday.toDateString()) {
          setChatDate("Yesterday");
        } else {
          setChatDate(
            createdDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year:
                createdDate.getFullYear() !== today.getFullYear()
                  ? "numeric"
                  : undefined,
            })
          );
        }
      }

      // Query messages for this chat from the messages table
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatIdToLoad)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading chat messages:", error);
        toast.error("Failed to load chat");
        return;
      }

      if (messages && messages.length > 0) {
        // Convert the messages to the ChatHistory format
        const history = messages.map((msg) => ({
          userInput: msg.user_input,
          botResponse: msg.bot_response,
        }));

        setChatHistory(history);
        setChatStarted(true);
      } else {
        // No messages yet for this chat
        setChatHistory([]);
        setChatStarted(true);
      }
    } catch (error) {
      console.error("Error in loadChat:", error);
      toast.error("Failed to load chat");
    }
  };

  // Update navigation to go to home
  const goToHome = () => {
    // Reset all relevant states
    setChatStarted(false);
    setAccessDenied(false);
    setChatHistory([]);
    // Navigate to home without any chat ID
    router.push("/");
  };

  // Check for internet connection
  useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);

    // Set initial state
    handleOnlineStatus();

    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, []);

  // Scroll to bottom when chat history updates
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Function to handle sending a new message
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !userProfile || !chatId) return;

    setIsLoading(true);
    const userInput = input.trim();
    setInput("");

    // Get position for flying text animation
    if (inputRef.current && chatAreaRef.current) {
      const inputRect = inputRef.current.getBoundingClientRect();

      // Start the flying animation
      setFlyingText({
        text: userInput,
        isAnimating: true,
        startPosition: {
          x: inputRect.left,
          y: inputRect.top,
        },
      });

      // Delay adding to chat history to allow animation to complete
      setTimeout(() => {
        // Add user message to chat after animation starts
        setChatHistory((prev) => [...prev, { userInput, botResponse: "" }]);
        // Reset flying text after it "arrives"
        setFlyingText(null);

        // Call API and continue with the rest of the function
        handleApiCall(userInput);
      }, 500); // 500ms for animation duration
    } else {
      // Fallback if refs aren't available
      setChatHistory((prev) => [...prev, { userInput, botResponse: "" }]);
      handleApiCall(userInput);
    }
  };

  // Extract API call to a separate function
  const handleApiCall = async (userInput: string) => {
    try {
      // Call API to get response
      const response = await fetch("/api/getResponse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: userInput }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const botResponse = await response.json();

      // Update chat history with bot response
      setChatHistory((prev) => {
        const updated = [...prev];
        // Update the last message with the bot's response
        if (updated.length > 0) {
          updated[updated.length - 1].botResponse = botResponse.result;
        }
        return updated;
      });

      // Save message to database
      await supabase.from("messages").insert({
        chat_id: chatId,
        user_input: userInput,
        bot_response: botResponse.result,
      });
    } catch (error) {
      console.error("Failed to get response:", error);
      toast.error("Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press for sending message
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Create a new chat and redirect
  const createNewChat = async () => {
    if (!userProfile) return;

    try {
      // Create a new chat in the database
      const { data: newChat, error } = await supabase
        .from("chats")
        .insert({
          user_id: userProfile.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to the new chat
      router.push(`/chat/${newChat.id}`);
    } catch (error) {
      console.error("Error creating chat:", error);
      toast.error("Failed to create new chat");
    }
  };

  // Access Denied Screen
  if (accessDenied) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-100 p-4">
        <div className="text-center p-6 sm:p-8 bg-white rounded-lg shadow-xl max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            You do not have permission to view this chat. This conversation
            belongs to another user.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={goToHome}
              className="w-full sm:w-auto px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Go to Home
            </button>
            <button
              onClick={createNewChat}
              className="w-full sm:w-auto px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start New Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading Screen for Access Check
  if (isCheckingAccess) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-100 p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Offline Screen
  if (!isOnline) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-100 p-4">
        <div className="text-center p-6 sm:p-8 bg-white rounded-lg shadow-xl max-w-sm mx-auto">
          <WifiOff className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
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
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Professional Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-full hover:bg-gray-100 lg:hidden transition-colors"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-5 h-5 text-gray-700" />
              </button>
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <BotIcon className="h-4 w-4 text-white" />
                </div>
                <h1 className="ml-2 text-lg font-semibold text-gray-900">
                  MindfulChat
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={createNewChat}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <PlusCircle className="w-4 h-4 mr-1" />
                New Conversation
              </button>
              <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-gray-200">
                {userProfile?.user_metadata.avatar_url ? (
                  <Image
                    src={userProfile.user_metadata.avatar_url}
                    alt="Your profile"
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-indigo-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-indigo-600" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex items-center justify-center py-0 sm:py-6 lg:py-8">
        <div className="w-full h-full sm:h-auto max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 flex flex-col">
          <div className="flex-1 flex flex-col h-[100vh] sm:h-[calc(100vh-64px)] sm:max-h-[80vh] bg-white shadow-md rounded-none sm:rounded-xl border-0 sm:border border-gray-200">
            {/* Chat Header with ID */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                  <MessageSquare className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-sm font-medium text-gray-900">
                    Conversation
                  </h2>
                  <p className="text-xs text-gray-500">
                    ID: {chatId?.substring(0, 8)}
                  </p>
                </div>
              </div>
              {chatDate && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {chatDate}
                </div>
              )}
            </div>

            {/* Chat Messages Area */}
            <div
              className="flex-1 overflow-y-auto h-full  p-4 sm:p-6"
              ref={chatAreaRef}
            >
              {!chatStarted ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-md"
                  >
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto">
                      <BotIcon className="w-12 h-12 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                      Welcome{" "}
                      {userProfile?.full_name
                        ? `${userProfile.full_name}`
                        : "to MindfulChat"}
                    </h2>
                    <p className="text-gray-600 mb-8 text-lg">
                      I&apos;m here to listen and provide mental health support
                      in a safe, confidential space.
                    </p>
                    <p className="text-gray-500 text-sm mb-6">
                      How are you feeling today? Feel free to share your
                      thoughts.
                    </p>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-6 py-3">
                  {/* Flying Text Animation */}
                  <AnimatePresence>
                    {flyingText && flyingText.isAnimating && (
                      <motion.div
                        initial={{
                          position: "fixed",
                          left: flyingText.startPosition.x,
                          top: flyingText.startPosition.y,
                          opacity: 0.8,
                          scale: 1,
                          zIndex: 50,
                        }}
                        animate={{
                          left: "calc(100% - 100px)", // Target position (right side)
                          top: "calc(100% - 200px)", // Target position (toward bottom)
                          opacity: 0,
                          scale: 0.5,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm pointer-events-none"
                      >
                        {flyingText.text}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Show suggested prompts when chat is empty */}
                  {chatHistory.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="flex flex-col items-center justify-center space-y-4 py-6"
                    >
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Not sure what to ask?
                        </h3>
                        <p className="text-sm text-gray-600">
                          Try one of these conversation starters:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                        {[
                          "I've been feeling stressed lately. What can I do?",
                          "How can I improve my sleep habits?",
                          "I'm feeling anxious about an upcoming event.",
                          "What are some mindfulness techniques I can practice?",
                          "I'm having trouble focusing on my work.",
                          "How can I cope with negative thoughts?",
                        ].map((suggestion, idx) => (
                          <motion.div
                            key={idx}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-white border border-gray-200 hover:border-indigo-300 rounded-lg p-3 cursor-pointer hover:bg-indigo-50 transition-colors"
                            onClick={() => {
                              setInput(suggestion);
                            }}
                          >
                            <p className="text-sm text-gray-700">
                              {suggestion}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {chatHistory.map((chat, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        {/* User message */}
                        <div className="flex items-end justify-end">
                          <div className="flex flex-col space-y-2 text-base max-w-2xl mx-2 order-1 items-end">
                            <motion.div
                              initial={{ scale: 0.95 }}
                              animate={{ scale: 1 }}
                              className="px-4 py-3 rounded-lg inline-block rounded-br-none bg-indigo-600 text-white"
                            >
                              <p className="text-sm">{chat.userInput}</p>
                            </motion.div>
                          </div>
                          <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 order-2 flex items-center justify-center bg-gray-200">
                            {userProfile?.user_metadata.avatar_url ? (
                              <Image
                                src={userProfile.user_metadata.avatar_url}
                                alt="Profile"
                                width={32}
                                height={32}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                        </div>

                        {/* Bot response */}
                        <div className="flex items-end">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex-shrink-0">
                            <BotIcon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex flex-col space-y-2 text-base max-w-2xl mx-2 order-2 items-start">
                            <div className="px-4 py-3 rounded-lg inline-block rounded-bl-none bg-gray-100 text-gray-800">
                              {chat.botResponse ? (
                                <Markdown className="prose prose-sm max-w-none prose-p:my-1 prose-headings:mb-2 prose-headings:mt-4 prose-a:text-indigo-600 prose-strong:text-gray-800">
                                  {chat.botResponse}
                                </Markdown>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <div
                                    className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"
                                    style={{ animationDelay: "0s" }}
                                  />
                                  <div
                                    className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"
                                    style={{ animationDelay: "0.2s" }}
                                  />
                                  <div
                                    className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"
                                    style={{ animationDelay: "0.4s" }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-none sm:rounded-b-lg">
              <div className="relative flex-1 overflow-hidden rounded-lg shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-indigo-600 bg-white">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message..."
                  className="block w-full resize-none border-0 bg-transparent py-4 px-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                  disabled={isLoading}
                />
                <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    className={`inline-flex items-center rounded-full px-3 py-2 transition-colors ${
                      !input.trim() || isLoading
                        ? "text-gray-400 bg-gray-50"
                        : "text-white bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {/* Character limit warning if needed */}
              <p className="mt-2 text-xs text-gray-500">
                Your conversation is private and secure. Feel free to express
                yourself openly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
