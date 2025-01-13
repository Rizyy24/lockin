import { useState, useEffect, useRef } from "react";
import { Navigation } from "@/components/Navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

const Chat = () => {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: chatHistory, isLoading } = useQuery({
    queryKey: ['chat-history'],
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

  useEffect(() => {
    if (chatHistory) {
      setMessages(chatHistory);
    }
  }, [chatHistory]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save user message to database
      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          content,
          user_id: user.id,
          is_bot: false,
        });

      if (insertError) throw insertError;

      // Get AI response using Supabase Edge Function
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

      // Save AI response to database
      const { error: botInsertError } = await supabase
        .from('chat_messages')
        .insert({
          content: assistantMessage,
          user_id: user.id,
          is_bot: true,
        });

      if (botInsertError) throw botInsertError;

      setMessages(prev => [
        ...prev,
        { role: 'user', content },
        { role: 'assistant', content: assistantMessage },
      ]);
    } catch (error) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    sendMessage(input);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-black text-foreground">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="glass-card min-h-[80vh] flex flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  message.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block p-4 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-12'
                      : 'bg-muted text-foreground mr-12'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </ScrollArea>
          
          <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Chat;