import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useChat = (userId: string) => {
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["chat-messages", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async (message: string) => {
      // Save user message first
      const { error: messageError } = await supabase
        .from("chat_messages")
        .insert({
          content: message,
          user_id: userId,
          is_bot: false,
        });

      if (messageError) throw messageError;

      // Get AI response
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const { response: aiResponse } = await response.json();

      // Save AI response
      const { error: aiMessageError } = await supabase
        .from("chat_messages")
        .insert({
          content: aiResponse,
          user_id: userId,
          is_bot: true,
        });

      if (aiMessageError) throw aiMessageError;

      return aiResponse;
    },
    onSuccess: () => {
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", userId] });
    },
    onError: (error) => {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
  };

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading: isLoadingMessages || isSending,
  };
};