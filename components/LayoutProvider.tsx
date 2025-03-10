"use client";

import { useState, useEffect, createContext, useContext } from "react";
import dynamic from "next/dynamic";
import { Toaster } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

// Dynamically import the sidebar component
const Sidebar = dynamic(() => import("@/components/Sidebar"), { ssr: false });

// Create a context to share state between components
type LayoutContextType = {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (value: boolean) => void;
  userProfile: any;
};

const LayoutContext = createContext<LayoutContextType>({
  isSidebarOpen: false,
  setIsSidebarOpen: () => {},
  userProfile: null,
});

// Export a hook to use the layout context
export const useLayout = () => useContext(LayoutContext);

interface LayoutProviderProps {
  children: React.ReactNode;
}

export default function LayoutProvider({ children }: LayoutProviderProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    // Fetch user profile on mount
    const fetchUserProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserProfile(user);
      }
    };

    fetchUserProfile();

    // Set sidebar open by default on larger screens
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 768);
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <LayoutContext.Provider
      value={{ isSidebarOpen, setIsSidebarOpen, userProfile }}
    >
      <div className="relative flex min-h-screen">
        {/* Sidebar component */}
        <div className="md:w-[280px] flex-shrink-0">
          <Sidebar
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 relative">{children}</main>

        <Toaster position="top-center" />
      </div>
    </LayoutContext.Provider>
  );
}
