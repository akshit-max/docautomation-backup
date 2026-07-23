import { useState, useRef } from "react";

export function useVoiceRecognition(
  id: string,
  onFill: (text: string) => Promise<void>
) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [generating, setGenerating] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");

  const startVoice = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice not supported in this browser. Use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      setTranscript("");
      transcriptRef.current = "";
    };

    recognition.onresult = (e: any) => {
      const text = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setTranscript(text);
      transcriptRef.current = text;
    };

    recognition.onend = async () => {
      setListening(false);
      const finalText = transcriptRef.current;
      if (finalText.trim()) {
        setGenerating(true);
        try {
          await onFill(finalText);
          setTranscript("");
          transcriptRef.current = "";
        } catch {
          alert("Voice generation failed.");
        } finally {
          setGenerating(false);
        }
      }
    };

    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const handleManualFill = async () => {
    const text = transcriptRef.current || transcript;
    if (!text.trim()) return;
    setGenerating(true);
    try {
      await onFill(text);
      setTranscript("");
      transcriptRef.current = "";
    } catch {
      alert("Fill failed. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  return {
    listening,
    transcript,
    generating,
    setGenerating,
    startVoice,
    stopVoice,
    handleManualFill,
  };
}
