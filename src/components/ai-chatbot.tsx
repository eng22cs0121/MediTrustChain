"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, Send, Loader2, GripVertical, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getChatbotResponse } from "@/ai/flows/chatbot-flow";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 });
  const chatbotRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setMessages([{
      role: "assistant",
      content: "Hi! I'm your MediTrustChain AI assistant powered by LLaMA 3.3 70B. I can help you with drug information, batch tracking, supply chain queries, and compliance questions. How can I help you today?",
      timestamp: new Date(),
    }]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = Math.abs(e.clientX - mouseDownPos.x);
        const deltaY = Math.abs(e.clientY - mouseDownPos.y);
        
        // If moved more than 5 pixels, consider it a drag
        if (deltaX > 5 || deltaY > 5) {
          setHasDragged(true);
        }
        
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, mouseDownPos]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (!chatbotRef.current) return;
    const rect = chatbotRef.current.getBoundingClientRect();
    setMouseDownPos({ x: e.clientX, y: e.clientY });
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setHasDragged(false);
    setIsDragging(true);
    e.preventDefault(); // Prevent text selection during drag
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userQuery = input;
    setInput("");
    setIsLoading(true);

    try {
      // Get conversation history for context (last 5 messages)
      const history = messages.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call AI chatbot flow
      const response = await getChatbotResponse(userQuery, history);
      
      const assistantMessage: Message = {
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        role: "assistant",
        content: "I apologize, but I'm having trouble processing your request. Please try again or rephrase your question.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div 
        ref={chatbotRef}
        className="fixed z-50 cursor-grab active:cursor-grabbing"
        style={{
          left: position.x ? `${position.x}px` : 'auto',
          top: position.y ? `${position.y}px` : 'auto',
          right: position.x ? 'auto' : '1.5rem',
          bottom: position.y ? 'auto' : '1.5rem',
        }}
        onMouseDown={handleDragStart}
      >
        <Button
          onClick={(e) => {
            e.stopPropagation();
            if (!hasDragged) {
              setIsOpen(true);
            }
          }}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      ref={chatbotRef}
      className="fixed z-50 w-96 max-w-[calc(100vw-3rem)]"
      style={{
        left: position.x ? `${position.x}px` : 'auto',
        top: position.y ? `${position.y}px` : 'auto',
        right: position.x ? 'auto' : '1.5rem',
        bottom: position.y ? 'auto' : '1.5rem',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <Card className="shadow-2xl">
        <CardHeader 
          className="flex flex-row items-center justify-between space-y-0 pb-4 bg-primary text-primary-foreground rounded-t-lg cursor-grab active:cursor-grabbing"
          onMouseDown={handleDragStart}
        >
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <GripVertical className="h-4 w-4 opacity-70" />
            <MessageCircle className="h-5 w-5" />
            AI Assistant
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea ref={scrollRef} className="h-96 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
