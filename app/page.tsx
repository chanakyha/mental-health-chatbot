"use client";

import { Input } from "@/components/ui/input";
import {
  BotIcon,
  Send,
  WifiOff,
  LogOut,
  PlusCircle,
  MessageSquare,
  Trash2,
  User,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface ChatHistory {
  userInput: string;
  botResponse: string;
}

interface SavedChat {
  id: string;
  created_at: string;
  messages: {
    user_input: string;
    bot_response: string;
  }[];
}

interface UserProfileProps {
  userProfile: any;
  savedChats: SavedChat[];
}

const UserProfile = ({ userProfile, savedChats }: UserProfileProps) => {
  const supabase = createClient();
  const router = useRouter();
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;
      router.replace("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="hidden lg:block p-4">
      <div className="bg-white rounded-lg shadow-md p-4 xl:p-6 sticky top-4">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 xl:w-20 xl:h-20 bg-blue-100 rounded-full flex items-center justify-center">
            {userProfile?.user_metadata?.avatar_url ? (
              <Image
                src={userProfile.user_metadata.avatar_url}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
                width={80}
                height={80}
              />
            ) : (
              <User className="w-8 h-8 xl:w-10 xl:h-10 text-blue-600" />
            )}
          </div>
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-base xl:text-lg text-gray-800 mb-1">
            {userProfile?.user_metadata?.full_name || userProfile?.email}
          </h3>
          <p className="text-sm text-gray-600 mb-2">{userProfile?.email}</p>
          {userProfile?.phone && (
            <p className="text-sm text-gray-600 mb-2">{userProfile.phone}</p>
          )}
          <p className="text-xs text-gray-500 mb-2">
            Login Provider: {userProfile?.app_metadata?.provider || "Email"}
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Member since{" "}
            {new Date(userProfile?.created_at).toLocaleDateString()}
          </p>
          <div className="border-t pt-4">
            <p className="text-xs xl:text-sm text-gray-600">
              Total Chats: {savedChats.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Last Sign In:{" "}
              {new Date(userProfile?.last_sign_in_at).toLocaleString()}
            </p>
          </div>
          <div className="mt-4 space-y-2">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [input, setInput] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [sendingText, setSendingText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [showSavedChats, setShowSavedChats] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Add event listeners for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Set sidebar open by default on larger screens
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 768);
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);

    // Fetch saved chats and user profile when component mounts
    fetchSavedChats();
    fetchUserProfile();

    // Subscribe to realtime changes
    const chatsSubscription = supabase
      .channel("chats_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats" },
        (payload) => {
          fetchSavedChats(); // Refresh chats when changes occur
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("resize", handleResize);
      chatsSubscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserProfile(user);
    }
  };

  const fetchSavedChats = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: chats, error } = await supabase
      .from("chats")
      .select(
        `
        id,
        created_at,
        messages (user_input, bot_response)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching chats:", error);
      return;
    }

    setSavedChats(chats || []);
  };

  const loadChat = async (chatId: string) => {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("user_input, bot_response")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading chat:", error);
      return;
    }

    setChatId(chatId);
    setChatHistory(
      messages.map((m) => ({
        userInput: m.user_input,
        botResponse: m.bot_response,
      }))
    );
    setChatStarted(true);
    // Close sidebar on mobile after selecting chat
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const deleteChat = async (chatIdToDelete: string) => {
    try {
      setIsDeletingChat(chatIdToDelete);

      // First delete all messages associated with this chat
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .eq("chat_id", chatIdToDelete);

      if (messagesError) {
        throw new Error(`Failed to delete messages: ${messagesError.message}`);
      }

      // Then delete the chat itself
      const { error: chatError } = await supabase
        .from("chats")
        .delete()
        .eq("id", chatIdToDelete)
        .select();

      if (chatError) {
        throw new Error(`Failed to delete chat: ${chatError.message}`);
      }

      // Reset state if the deleted chat was the active one
      if (chatIdToDelete === chatId) {
        setChatId(null);
        setChatHistory([]);
        setChatStarted(false);
      }
    } catch (error) {
      console.error("Error in deleteChat:", error);
      throw error;
    } finally {
      setIsDeletingChat(null);
    }
  };

  const createNewChat = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("chats")
      .insert([{ user_id: user.id }])
      .select()
      .single();

    if (error) {
      console.error("Error creating new chat:", error);
      return;
    }

    setChatId(data.id);
    setChatHistory([]);
    setChatStarted(true);
    // Close sidebar on mobile after creating new chat
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
    }
    router.replace("/login");
  };

  const saveMessageToDatabase = async (
    userInput: string,
    botResponse: string
  ) => {
    if (!chatId) return;

    const { error } = await supabase.from("messages").insert([
      {
        chat_id: chatId,
        user_input: userInput,
        bot_response: botResponse,
      },
    ]);

    if (error) {
      console.error("Error saving message:", error);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!input.trim() || !isOnline) return;

    setSendingText(input);
    setIsSending(true);
    setIsLoading(true);

    // Wait for animation to complete
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSending(false);

    try {
      const response = await fetch("/api/getResponse", {
        method: "POST",
        body: JSON.stringify({ input }),
        headers: {
          "Content-type": "application/json",
        },
      });
      const botResponse = await response.json();

      // Create new chat if this is the first message
      if (!chatId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("chats")
          .insert([{ user_id: user.id }])
          .select()
          .single();

        if (error) {
          console.error("Error creating new chat:", error);
          return;
        }

        setChatId(data.id);
      }

      // Save message to database
      await saveMessageToDatabase(botResponse.userInput, botResponse.result);

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
    <div className="flex min-h-screen w-full bg-gray-100">
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } fixed md:static w-[280px] h-full bg-white shadow-lg transition-transform duration-300 z-30 md:z-auto flex-shrink-0`}
      >
        <div className="p-4 border-b">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <PlusCircle className="w-5 h-5" />
            <span>New Chat</span>
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-5rem)]">
          {savedChats.map((chat) => (
            <div
              key={chat.id}
              className={`w-full p-3 flex items-center justify-between hover:bg-gray-100 transition-colors ${
                chatId === chat.id ? "bg-blue-50" : ""
              }`}
            >
              <button
                onClick={() => loadChat(chat.id)}
                className="flex items-center space-x-3 flex-grow text-left"
              >
                <MessageSquare className="w-5 h-5 text-gray-500" />
                <div className="truncate">
                  <p className="text-sm text-gray-800">
                    {chat.messages?.[0]?.user_input || "New Chat"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(chat.created_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                disabled={isDeletingChat === chat.id}
                className="p-2 hover:bg-red-100 rounded-lg group relative"
              >
                {isDeletingChat === chat.id ? (
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full md:pl-0">
        <div className="flex-1 flex flex-col bg-white shadow-xl rounded-xl max-w-4xl mx-auto h-[calc(100vh-2rem)] my-4 mx-4">
          <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b bg-white rounded-t-xl">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg md:hidden"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <BotIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 ml-2 md:ml-0" />
              <h1 className="ml-2 sm:ml-3 text-lg sm:text-xl font-semibold text-gray-800 truncate">
                Mental Health Assistant
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 relative">
            {!chatStarted ? (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <div className="text-center max-w-2xl">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
                    Welcome to Your Mental Health Assistant
                  </h2>
                  <p className="text-gray-600 mb-4 text-sm sm:text-base px-4">
                    I&apos;m here to provide support, guidance, and a listening
                    ear for your mental health concerns. Feel free to discuss
                    anything that&apos;s on your mind - I&apos;m trained to help
                    with stress, anxiety, depression, and other mental health
                    topics.
                  </p>
                  <p className="text-gray-600 mb-6 text-sm sm:text-base px-4">
                    While I&apos;m not a replacement for professional help, I
                    can offer coping strategies and resources to support your
                    mental wellbeing.
                  </p>
                  <button
                    onClick={createNewChat}
                    className="flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>Start a New Chat</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {chatHistory.map((chat, index) => (
                  <ChatComponent
                    key={index}
                    botResponse={chat.botResponse}
                    userInput={chat.userInput}
                  />
                ))}

                <AnimatePresence>
                  {isSending && (
                    <motion.div
                      initial={{ y: 100, x: "50%", opacity: 0 }}
                      animate={{ y: -100, x: "-50%", opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute bottom-0 left-1/2 bg-blue-50 rounded-lg p-4 shadow-lg max-w-[90%] sm:max-w-[70%]"
                    >
                      {sendingText}
                    </motion.div>
                  )}
                </AnimatePresence>

                {isLoading && !isSending && <ChatSkeleton />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {chatStarted && (
            <form
              onSubmit={handleSubmit}
              className="border-t p-3 sm:p-4 bg-white rounded-b-xl"
            >
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 text-sm sm:text-base"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      {/* User Profile Section */}
      <UserProfile userProfile={userProfile} savedChats={savedChats} />
    </div>
  );
}

interface ChatComponentProps extends ChatHistory {}

const ChatSkeleton = () => (
  <div className="space-y-4 mb-6 animate-pulse">
    <div className="flex items-start space-x-3 justify-end">
      <div className="flex-1 bg-gray-200 rounded-lg p-4 max-w-[80%] h-24" />
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-300" />
    </div>
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-300" />
      <div className="flex-1 bg-gray-200 rounded-lg p-4 max-w-[80%] h-32" />
    </div>
  </div>
);

const ChatComponent = ({ userInput, botResponse }: ChatComponentProps) => {
  const [displayedResponse, setDisplayedResponse] = useState("");
  const [hasAnimated, setHasAnimated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserProfile(user);
      }
    };
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (!hasAnimated) {
      let currentIndex = 0;
      const timer = setInterval(() => {
        if (currentIndex < botResponse.length) {
          setDisplayedResponse((prev) => prev + botResponse[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(timer);
          setHasAnimated(true);
        }
      }, 10);
      return () => clearInterval(timer);
    } else {
      setDisplayedResponse(botResponse);
    }
  }, [botResponse, hasAnimated]);

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-start space-x-3 justify-end">
        <div className="flex-1 bg-blue-50 rounded-lg p-3 sm:p-4 max-w-[80%]">
          <div className="text-xs sm:text-sm text-gray-500 mb-1">You</div>
          <p className="text-sm sm:text-base text-gray-800">{userInput}</p>
        </div>
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
          {userProfile?.user_metadata?.avatar_url ? (
            <Image
              src={userProfile.user_metadata.avatar_url}
              alt="Profile"
              className="w-full h-full object-cover"
              width={40}
              height={40}
            />
          ) : (
            <span className="text-gray-600 text-xs sm:text-sm font-medium">
              You
            </span>
          )}
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 flex items-center justify-center">
          <BotIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1 bg-gray-100 rounded-lg p-3 sm:p-4 max-w-[80%]">
          <div className="text-xs sm:text-sm text-gray-500 mb-1">Assistant</div>
          <div className="prose prose-sm sm:prose">
            <Markdown>{displayedResponse}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
};
