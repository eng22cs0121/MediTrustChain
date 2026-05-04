
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getAboutPageAssistance } from "@/ai/flows/about-page-ai-assistance";
import { Loader2, Sparkles, Play, Pause, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCbacAuth } from "@/contexts/cbac-auth-context";

export function AboutAssistant() {
  const { organizationType, isAuthenticated } = useCbacAuth();
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleQuery = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setAnswer("");
    setAudioUri(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);

    try {
      const result = await getAboutPageAssistance({ 
        query,
        organizationType: isAuthenticated && organizationType ? organizationType : undefined
      });
      setAnswer(result.answer);
      if (result.audioDataUri) {
          setAudioUri(result.audioDataUri);
      }
    } catch (error) {
      console.error("AI assistance failed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not get a response from the assistant. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }
  };
  
  const formattedAnswer = answer.split('**').map((part, index) => 
    index % 2 === 1 ? <strong key={index}>{part}</strong> : part
  ).flatMap(part => 
      typeof part === 'string' ? part.split('* ').map((subPart, subIndex) => 
          subIndex > 0 ? <li key={`${part}-${subIndex}`} className="ml-4 list-disc">{subPart}</li> : subPart
      ) : part
  );


  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI-Powered Help
        </CardTitle>
        <CardDescription className="text-sm md:text-base">
          Have questions about MediTrustChain? Ask our AI assistant.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="e.g., How can a pharmacy verify a drug?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-[100px] resize-none text-sm md:text-base"
          rows={4}
        />
        <Button 
          onClick={handleQuery} 
          disabled={isLoading || !query.trim()} 
          className="w-full bg-primary hover:bg-primary/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              <span>Ask Assistant</span>
            </>
          )}
        </Button>
        {answer && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-3 border border-border/50">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-primary" />
                  Answer:
                </h4>
                {audioUri && (
                    <>
                        <Button 
                          onClick={togglePlayPause} 
                          size="icon" 
                          variant="ghost"
                          className="hover:bg-primary/10 dark:hover:bg-primary/20"
                        >
                            {isPlaying ? (
                              <Pause className="h-4 w-4 text-primary" />
                            ) : (
                              <Play className="h-4 w-4 text-primary" />
                            )}
                            <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
                        </Button>
                        <audio ref={audioRef} src={audioUri} onEnded={() => setIsPlaying(false)} />
                    </>
                )}
            </div>
            <div className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-2">
              {answer.split('\n').map((line, i) => (
                line.trim() && <p key={i} className="whitespace-pre-wrap">{line}</p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
