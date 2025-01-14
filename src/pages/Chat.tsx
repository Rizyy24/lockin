import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

const Chat = () => {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat-messages'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map(msg => ({
        role: msg.is_bot ? 'assistant' as const : 'user' as const,
        content: msg.content,
        created_at: msg.created_at,
      }));
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save user message
      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          content,
          user_id: user.id,
          is_bot: false,
        });

      if (insertError) throw insertError;

      // Get AI response
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          messages: [...messages, { role: 'user' as const, content }].map(({ role, content }) => ({
            role,
            content,
          })),
        },
      });

      if (error) throw error;

      const assistantMessage = data.choices[0].message.content;

      // Save AI response
      const { error: botInsertError } = await supabase
        .from('chat_messages')
        .insert({
          content: assistantMessage,
          user_id: user.id,
          is_bot: true,
        });

      if (botInsertError) throw botInsertError;

      return { userMessage: content, assistantMessage };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      setInput("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessageMutation.mutate(input);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-foreground flex items-center justify-center">
        <div className="text-center">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-foreground">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="glass-card min-h-[80vh] flex flex-col">
          <ChatMessages messages={messages} />
          <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Chat;