
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
          console.error("Edge function error:", error);
          // Check if it's a service unavailable error (status 503)
          if (error.status === 503) {
            throw new Error("The AI service is temporarily unavailable. Please try again later or contact support.");
          }
          throw new Error(error.message || "Failed to get AI response");
        }

        // Check for error in the response data
        if (data?.error) {
          throw new Error(data.error);
        }

        if (!data?.response) {
          console.error("Invalid response from OpenAI:", data);
          throw new Error("Invalid response from AI. Please try again.");
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
      } catch (error: any) {
        // If there was an error with the AI response, we should delete the user's message
        await supabase
          .from("chat_messages")
          .delete()
          .eq("user_id", userId)
          .eq("content", message)
          .eq("is_bot", false);
          
        throw new Error(error.message || "Failed to get AI response. Please try again.");
      }
    },
    onSuccess: () => {
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", userId] });
    },
    onError: (error: Error) => {
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
