import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { Brain, Mic, X, Trash2, Send, ChevronDown } from "lucide-react-native";
import * as Speech from "expo-speech";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import * as Location from "expo-location";
import { api } from "../../../lib/api";
import { router } from "expo-router";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.55;

export default function VyomAgentFAB() {
  // ── Panel state ──
  const [isOpen, setIsOpen] = useState(false);

  // ── Chat state (persists across open/close) ──
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [pendingIntent, setPendingIntent] = useState(null);
  const [collectedData, setCollectedData] = useState(null);

  // ── Input state ──
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [typedText, setTypedText] = useState("");

  // ── Refs ──
  const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT + 50)).current;
  const silenceTimer = useRef(null);
  const transcriptRef = useRef("");
  const isProcessingRef = useRef(false);
  const isOpenRef = useRef(false);
  const scrollRef = useRef(null);
  const userLocationRef = useRef(null);

  // ── Fetch Location when panel opens ──
  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            userLocationRef.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          }
        } catch (e) {
          console.log("Location fetch error:", e);
        }
      })();
    }
  }, [isOpen]);

  // ── Open / Close panel (no state reset) ──
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: PANEL_HEIGHT + 50,
        duration: 250,
        useNativeDriver: true,
      }).start();
      Speech.stop();
      try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      setIsListening(false);
      setIsProcessing(false);
      isProcessingRef.current = false;
      setRecognizedText("");
      transcriptRef.current = "";
    }
  }, [isOpen]);

  // ── Clear entire conversation ──
  const clearChat = () => {
    Speech.stop();
    try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
    setMessages([]);
    setSessionId(null);
    setPendingIntent(null);
    setCollectedData(null);
    setRecognizedText("");
    setTypedText("");
    setIsListening(false);
    setIsProcessing(false);
    isProcessingRef.current = false;
    transcriptRef.current = "";
  };

  // ── Speech recognition events ──
  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (transcriptRef.current.trim() && !isProcessingRef.current) {
      handleSend(transcriptRef.current);
    }
  });
  useSpeechRecognitionEvent("result", (event) => {
    if (event.results?.length > 0) {
      const transcript = event.results.map((r) => r.transcript).join(" ");
      setRecognizedText(transcript);
      transcriptRef.current = transcript;
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => ExpoSpeechRecognitionModule.stop(), 1500);
    }
  });
  useSpeechRecognitionEvent("error", (event) => {
    console.log("Speech error:", event.error);
    setIsListening(false);
  });

  // ── Start mic ──
  const startListening = async () => {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return;
    Speech.stop();
    setRecognizedText("");
    transcriptRef.current = "";
    try {
      await ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
      });
    } catch (e) {
      console.error("Mic start failed:", e);
    }
  };

  // ── Send message ──
  const handleSend = async (text) => {
    const msg = (text || typedText).trim();
    if (!msg || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsProcessing(true);
    setRecognizedText("");
    setTypedText("");
    transcriptRef.current = "";

    const userMsg = { role: "user", text: msg };
    setMessages((prev) => [...prev, userMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const resp = await api.post("/api/urbanconnect/agent/chat", {
        text: msg,
        sessionId,
        messages,
        pendingIntent,
        collectedData,
        location: userLocationRef.current,
      });

      const reply = resp.data?.reply || "I'm having trouble connecting right now.";
      const action = resp.data?.action;
      const newSessionId = resp.data?.sessionId;

      if (newSessionId) setSessionId(newSessionId);
      setPendingIntent(resp.data?.pendingIntent || null);
      setCollectedData(resp.data?.collectedData || null);

      const assistantMsg = { role: "assistant", text: reply };
      setMessages((prev) => [...prev, assistantMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

      // Speak response
      Speech.speak(reply, {
        language: "en-US",
        pitch: 1.0,
        rate: 1.0,
        onDone: () => {
          setTimeout(() => {
            if (isOpenRef.current && !action) startListening();
          }, 500);
        },
        onStopped: () => {
          setTimeout(() => {
            if (isOpenRef.current && !action) startListening();
          }, 500);
        },
      });

      // Handle navigation actions
      if (action?.path) {
        setTimeout(() => {
          setIsOpen(false); // minimize, don't clear
          router.push(action.path);
        }, 800);
      }
    } catch (e) {
      console.error("Vyom AI Error:", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  // ── Auto-scroll on new messages ──
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, [messages.length]);

  return (
    <>
      {/* ── FAB Button ── */}
      {!isOpen && (
        <TouchableOpacity
          onPress={() => setIsOpen(true)}
          activeOpacity={0.8}
          style={{
            position: "absolute",
            bottom: 90,
            right: 20,
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: "#818cf8",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#818cf8",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 10,
            zIndex: 999,
          }}
        >
          <Brain size={28} color="#fff" />
          {messages.length > 0 && (
            <View
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: "#22c55e",
                borderWidth: 2,
                borderColor: "#18181b",
              }}
            />
          )}
        </TouchableOpacity>
      )}

      {/* ── Chat Panel ── */}
      <Animated.View
        pointerEvents={isOpen ? "auto" : "none"}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: PANEL_HEIGHT,
          backgroundColor: "#111114",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderWidth: 1,
          borderColor: "rgba(129, 140, 248, 0.2)",
          borderBottomWidth: 0,
          transform: [{ translateY: slideAnim }],
          zIndex: 1000,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 20,
        }}
      >
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.06)",
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "rgba(129, 140, 248, 0.15)",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 10,
            }}
          >
            <Brain size={18} color="#818cf8" />
          </View>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", flex: 1 }}>Vyom AI</Text>

          {messages.length > 0 && (
            <TouchableOpacity onPress={clearChat} style={{ padding: 6, marginRight: 4 }}>
              <Trash2 size={18} color="#71717a" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setIsOpen(false)} style={{ padding: 6 }}>
            <ChevronDown size={20} color="#71717a" />
          </TouchableOpacity>
        </View>

        {/* ── Chat Messages ── */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 12, paddingBottom: 4 }}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && !isListening && !isProcessing && (
            <View style={{ alignItems: "center", paddingTop: 30, paddingBottom: 10 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "rgba(129, 140, 248, 0.12)",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Brain size={24} color="#818cf8" />
              </View>
              <Text style={{ color: "#a1a1aa", fontSize: 14, textAlign: "center" }}>
                Hi! I'm Vyom, your smart city assistant.{"\n"}Tap the mic or type to get started.
              </Text>
            </View>
          )}

          {messages.map((msg, i) => (
            <View
              key={i}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "82%",
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: msg.role === "user" ? "#4f46e5" : "#27272a",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 16,
                  borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                  borderBottomLeftRadius: msg.role === "user" ? 16 : 4,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 14, lineHeight: 20 }}>{msg.text}</Text>
              </View>
            </View>
          ))}

          {/* Listening indicator */}
          {isListening && (
            <View style={{ alignSelf: "flex-end", maxWidth: "82%", marginBottom: 8 }}>
              <View
                style={{
                  backgroundColor: "rgba(79, 70, 229, 0.3)",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 16,
                  borderBottomRightRadius: 4,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Mic size={14} color="#818cf8" />
                <Text style={{ color: "#c7d2fe", fontSize: 14, fontStyle: "italic" }}>
                  {recognizedText || "Listening..."}
                </Text>
              </View>
            </View>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <View style={{ alignSelf: "flex-start", maxWidth: "82%", marginBottom: 8 }}>
              <View
                style={{
                  backgroundColor: "#27272a",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 16,
                  borderBottomLeftRadius: 4,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <ActivityIndicator size="small" color="#818cf8" />
                <Text style={{ color: "#a1a1aa", fontSize: 14 }}>Thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Input Bar ── */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.06)",
              gap: 8,
            }}
          >
            {/* Mic button */}
            <TouchableOpacity
              onPress={isListening ? () => ExpoSpeechRecognitionModule.stop() : startListening}
              activeOpacity={0.7}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isListening ? "rgba(239, 68, 68, 0.15)" : "rgba(129, 140, 248, 0.12)",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1.5,
                borderColor: isListening ? "#ef4444" : "rgba(129, 140, 248, 0.3)",
              }}
            >
              <Mic size={20} color={isListening ? "#ef4444" : "#818cf8"} />
            </TouchableOpacity>

            {/* Text input */}
            <TextInput
              value={typedText}
              onChangeText={setTypedText}
              placeholder="Type a message..."
              placeholderTextColor="#52525b"
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              style={{
                flex: 1,
                height: 40,
                backgroundColor: "#1e1e22",
                borderRadius: 20,
                paddingHorizontal: 16,
                color: "#fff",
                fontSize: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.06)",
              }}
            />

            {/* Send button */}
            <TouchableOpacity
              onPress={() => handleSend()}
              disabled={!typedText.trim() && !isProcessing}
              activeOpacity={0.7}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: typedText.trim() ? "#4f46e5" : "rgba(129, 140, 248, 0.08)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Send size={18} color={typedText.trim() ? "#fff" : "#52525b"} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
}
