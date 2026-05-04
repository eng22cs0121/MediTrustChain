"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useCbacAuth } from "@/contexts/cbac-auth-context";

export function VoiceCommand() {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { logout } = useCbacAuth();

  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        handleVoiceCommand(transcript);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        toast({
          variant: "destructive",
          title: "Voice Command Error",
          description: "Could not process voice command. Please try again.",
        });
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const handleVoiceCommand = (command: string) => {
    toast({
      title: "Voice Command",
      description: `You said: "${command}"`,
    });

    // Navigation commands
    if (command.includes("dashboard") || command.includes("home")) {
      router.push("/dashboard");
    } else if (command.includes("analytics")) {
      router.push("/dashboard/analytics");
    } else if (command.includes("manufacturer")) {
      router.push("/dashboard/manufacturer");
    } else if (command.includes("distributor")) {
      router.push("/dashboard/distributor");
    } else if (command.includes("pharmacy")) {
      router.push("/dashboard/pharmacy");
    } else if (command.includes("patient")) {
      router.push("/dashboard/patient");
    } else if (command.includes("regulator")) {
      router.push("/dashboard/regulator");
    } else if (command.includes("logistics")) {
      router.push("/dashboard/logistics");
    } else if (command.includes("about")) {
      router.push("/about");
    } else if (command.includes("logout") || command.includes("log out")) {
      logout().catch((error) => {
        console.error("Voice command logout error:", error);
        toast({
          variant: "destructive",
          title: "Logout Failed",
          description: "Please try logging out manually.",
        });
      });
    } else {
      toast({
        title: "Command Not Recognized",
        description: "Try saying 'go to dashboard', 'open analytics', or 'show manufacturer'.",
      });
    }
  };

  const toggleListening = () => {
    if (!recognition) {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Voice commands are not supported in your browser.",
      });
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      toast({
        title: "Listening...",
        description: "Speak your command now.",
      });
    }
  };

  return (
    <Button
      onClick={toggleListening}
      variant={isListening ? "default" : "outline"}
      size="icon"
      className="relative"
    >
      {isListening ? (
        <>
          <Mic className="h-4 w-4 animate-pulse" />
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
        </>
      ) : (
        <MicOff className="h-4 w-4" />
      )}
    </Button>
  );
}
