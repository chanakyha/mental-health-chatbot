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

  // Render welcome screen with option to create new chat
  // ...rest of the welcome page rendering code
}
