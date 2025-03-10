"use client";

import {
  LogOut,
  PlusCircle,
  MessageSquare,
  Trash2,
  User,
  X,
  Settings,
  Home,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useLayout } from "./LayoutProvider";

interface SavedChat {
  id: string;
  created_at: string;
  messages: {
    user_input: string;
    bot_response: string;
  }[];
}

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (value: boolean) => void;
}

export default function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
}: SidebarProps) {
  const { userProfile } = useLayout();
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isHomePage, setIsHomePage] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const [isDeletingChat, setIsDeletingChat] = useState<string | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  // Use a ref to immediately track the active chat ID
  const activeChatIdRef = useRef<string | null>(null);

  // Update the active chat ID immediately from URL
  useEffect(() => {
    const pathParts = pathname.split("/");
    const isChatRoute = pathParts[1] === "chat";
    const chatIdFromPath = isChatRoute ? pathParts[2] : null;

    activeChatIdRef.current = chatIdFromPath;
    setChatId(chatIdFromPath);
    setIsHomePage(!chatIdFromPath);
  }, [pathname]);

  // Listen for URL changes with a direct event listener for maximum responsiveness
  useEffect(() => {
    const handleRouteChange = () => {
      const url = new URL(window.location.href);
      const chatIdFromUrl = url.searchParams.get("chat");
      activeChatIdRef.current = chatIdFromUrl;
      setChatId(chatIdFromUrl);
      setIsHomePage(!chatIdFromUrl);
    };

    // Add event listener for popstate (browser back/forward)
    window.addEventListener("popstate", handleRouteChange);

    // Run once on mount
    handleRouteChange();

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  useEffect(() => {
    fetchSavedChats();

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
      chatsSubscription.unsubscribe();
    };
  }, []);

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

  const createNewChat = async () => {
    try {
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
        toast.error("Failed to create new chat");
        return;
      }

      // Immediately update the active chat ID
      activeChatIdRef.current = data.id;
      setChatId(data.id);
      setIsHomePage(false);

      // Redirect to new chat
      router.push(`/chat/${data.id}`);

      // Close sidebar on mobile after creating new chat
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }

      toast.success("New chat created");
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const loadChat = async (selectedChatId: string) => {
    // Immediately update the active chat ID
    activeChatIdRef.current = selectedChatId;
    setChatId(selectedChatId);
    setIsHomePage(false);

    // Redirect to selected chat with new URL pattern
    router.push(`/chat/${selectedChatId}`);

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

      // Show success toast
      toast.success("Chat deleted successfully");

      // If the deleted chat was the active one, go back to home
      if (chatIdToDelete === activeChatIdRef.current) {
        activeChatIdRef.current = null;
        setChatId(null);
        setIsHomePage(true);
        router.push("/");
      }
    } catch (error) {
      console.error("Error in deleteChat:", error);
      toast.error("Failed to delete chat");
    } finally {
      setIsDeletingChat(null);
      setShowDeleteConfirm(null);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error.message);
        toast.error("Failed to sign out");
        return;
      }
      toast.success("Signed out successfully");
      router.replace("/login");
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const goHome = () => {
    router.push("/");
    setIsHomePage(true);
    setChatId(null);
    activeChatIdRef.current = null;

    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Get the current chat ID directly from the ref for immediate response
  const getCurrentChatId = () => activeChatIdRef.current;
  const isActive = (chatId: string) =>
    !isHomePage && getCurrentChatId() === chatId;

  return (
    <>
      {/* Overlay for mobile when sidebar is open */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Enhanced Sidebar with animations */}
      <motion.div
        className={`fixed md:static w-[280px] h-full bg-gradient-to-b from-blue-50 to-white shadow-lg z-30 md:z-auto flex-shrink-0 flex flex-col`}
        initial={false}
        animate={{
          x: isSidebarOpen ? 0 : -280,
          boxShadow: isSidebarOpen
            ? "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
            : "none",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* User Profile Header */}
        <div className="p-4 border-b border-blue-100 bg-white">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                {userProfile?.user_metadata?.avatar_url ? (
                  <Image
                    src={userProfile.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                    width={40}
                    height={40}
                  />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="truncate flex-1">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {userProfile?.user_metadata?.full_name ||
                    userProfile?.email?.split("@")[0] ||
                    "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userProfile?.email}
                </p>
              </div>
            </div>
            <button
              className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile dropdown */}
          <AnimatePresence>
            {showProfileDropdown && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 overflow-hidden"
              >
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 shadow-inner">
                  <div className="flex justify-between items-center mb-2">
                    <span>Login Provider</span>
                    <span className="font-medium">
                      {userProfile?.app_metadata?.provider || "Email"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span>Member since</span>
                    <span className="font-medium">
                      {new Date(userProfile?.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Last Sign In</span>
                    <span className="font-medium">
                      {new Date(userProfile?.last_sign_in_at).toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions area */}
        <div className="p-4 border-b border-blue-100">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <PlusCircle className="w-5 h-5" />
            <span className="font-medium">New Chat</span>
          </button>

          <button
            onClick={goHome}
            className={`mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              !getCurrentChatId()
                ? "text-blue-700 bg-blue-50 border-blue-200"
                : "text-gray-700 bg-white hover:bg-gray-50 border-gray-200"
            }`}
          >
            <Home
              className={`w-4 h-4 ${
                !getCurrentChatId() ? "text-blue-600" : "text-gray-600"
              }`}
            />
            <span>Home</span>
          </button>
        </div>

        {/* Recent chats */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
              Recent Conversations
            </h3>
          </div>

          <div className="space-y-1 px-3">
            {savedChats.length === 0 && (
              <div className="py-4 text-center text-gray-500 italic text-sm">
                <p>No chats yet. Start a new conversation!</p>
              </div>
            )}

            {savedChats.map((chat) => (
              <motion.div
                key={chat.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`rounded-lg overflow-hidden ${
                  getCurrentChatId() === chat.id
                    ? "bg-blue-100 border-l-4 border-blue-500"
                    : "bg-white hover:bg-gray-50 border-l-4 border-transparent"
                }`}
              >
                <div className="flex items-center justify-between p-3">
                  <button
                    onClick={() => loadChat(chat.id)}
                    className="flex items-center space-x-3 flex-grow text-left"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        getCurrentChatId() === chat.id
                          ? "bg-blue-200"
                          : "bg-gray-100"
                      }`}
                    >
                      <MessageSquare
                        className={`w-4 h-4 ${
                          getCurrentChatId() === chat.id
                            ? "text-blue-600"
                            : "text-gray-500"
                        }`}
                      />
                    </div>
                    <div className="truncate">
                      <p
                        className={`text-sm truncate ${
                          getCurrentChatId() === chat.id
                            ? "font-medium text-blue-800"
                            : "font-normal text-gray-800"
                        }`}
                      >
                        {chat.messages?.[0]?.user_input || "New Chat"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(chat.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </button>

                  {/* Enhanced delete button with confirmation */}
                  {showDeleteConfirm === chat.id ? (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        disabled={isDeletingChat === chat.id}
                        className="p-1.5 bg-red-100 rounded-lg text-red-600 text-xs"
                      >
                        Yes
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(null);
                        }}
                        className="p-1.5 bg-gray-100 rounded-lg text-gray-600 text-xs"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(chat.id);
                      }}
                      disabled={isDeletingChat === chat.id}
                      className="p-2 hover:bg-gray-100 rounded-full group transition-colors duration-200"
                    >
                      {isDeletingChat === chat.id ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer area */}
        <div className="p-3 border-t border-blue-100 bg-white mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-gray-400">
              <p>v1.0.0</p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
