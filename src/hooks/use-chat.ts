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

      try {
        // Get AI response using Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('chat', {
          body: { message, userId }
        });

        if (error) {
          // Check if it's a quota exceeded error (status 429)
          if (error.status === 429) {
            throw new Error("AI service is temporarily unavailable due to high demand. Please try again later.");
          }
          throw error;
        }

        // Save AI response
        const { error: aiMessageError } = await supabase
          .from("chat_messages")
          .insert({
            content: data.response,
            user_id: userId,
            is_bot: true,
          });

        if (aiMessageError) throw aiMessageError;

        return data.response;
      } catch (error) {
        // If there was an error with the AI response, we should delete the user's message
        await supabase
          .from("chat_messages")
          .delete()
          .eq("user_id", userId)
          .eq("content", message)
          .eq("is_bot", false);
          
        throw error;
      }
    },
    onSuccess: () => {
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", userId] });
    },
    onError: (error) => {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
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