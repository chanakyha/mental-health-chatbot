"use client";

import { PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLayout } from "@/components/LayoutProvider";
import { toast } from "react-hot-toast";

export default function HomePage() {
  const { isSidebarOpen, setIsSidebarOpen, userProfile } = useLayout();
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const createNewChat = async () => {
    if (!userProfile) return;

    setIsLoading(true);
    try {
      // Create a new chat in the database
      const { data: newChat, error } = await supabase
        .from("chats")
        .insert({
          user_id: userProfile.id,
          messages: [],
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to the new chat
      router.push(`/chat/${newChat.id}`);
    } catch (error) {
      console.error("Error creating chat:", error);
      toast.error("Failed to create new chat");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 bg-blue-50/30 dark:bg-blue-950/10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-xl mx-auto text-center"
      >
        <h1 className="text-4xl font-bold mb-6 text-blue-700 dark:text-blue-400">
          Your Mental Health Companion
        </h1>

        <div className="bg-white dark:bg-blue-900/20 p-8 rounded-2xl shadow-lg mb-8 border border-blue-100 dark:border-blue-800">
          <h2 className="text-2xl font-semibold mb-4 text-blue-600 dark:text-blue-300">
            How can I help you today?
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            I&apos;m an AI assistant designed to provide mental health support,
            guidance, and a safe space for your thoughts. Whether you&apos;re
            feeling anxious, need someone to talk to, or looking for coping
            strategies, I&apos;m here to listen and help.
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            Your conversations are private and secure. Start a new chat anytime
            to begin a fresh conversation.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={createNewChat}
          disabled={isLoading || !userProfile}
          className="flex w-full items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-medium disabled:opacity-70 shadow-md transition-colors"
        >
          {isLoading ? (
            <span>Creating chat...</span>
          ) : (
            <>
              <PlusCircle size={20} />
              <span>Start New Conversation</span>
            </>
          )}
        </motion.button>

        {!userProfile && (
          <p className="mt-4 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
            Please log in to start a conversation
          </p>
        )}
      </motion.div>
    </div>
  );
}
