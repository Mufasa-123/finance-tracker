import React, { useState, useRef, useEffect } from "react";
import api from "../api/axios";

// Helper to format bot markdown response to clean HTML JSX
function renderFormattedMessage(text) {
  if (!text) return null;

  // Split lines
  const lines = text.split("\n");

  return lines.map((line, idx) => {
    // Process bold text **something**
    const parts = line.split(/(\*\*.*?\*\*)/g);

    const formattedParts = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("👉")) {
      return (
        <div key={idx} style={{ marginLeft: 8, marginBottom: 4 }}>
          {formattedParts}
        </div>
      );
    }

    if (line.trim() === "") {
      return <div key={idx} style={{ height: 6 }} />;
    }

    return (
      <div key={idx} style={{ marginBottom: 4 }}>
        {formattedParts}
      </div>
    );
  });
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "🤖 Hi there! I'm **FinAI**, your financial assistant.\n\nAsk me anything about your money, like:\n• *\"What's my expense today?\"*\n• *\"How much did I spend this month?\"*\n• *\"Show my recent transactions\"*",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || loading) return;

    const userMsg = {
      sender: "user",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setLoading(true);

    try {
      const res = await api.post("/chat", { message: query });
      const botMsg = {
        sender: "bot",
        text: res.data.reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Chatbot error:", err);
      const errorMsg = {
        sender: "bot",
        text: "❌ Sorry, I encountered an error checking your financial data. Please try again.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    "What's my expense today?",
    "How much did I spend this month?",
    "Show my recent transactions",
    "What are my budgets?",
    "Give me financial tips",
  ];

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, fontFamily: "sans-serif" }}>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
            color: "#fff",
            border: "none",
            borderRadius: "50px",
            padding: "12px 20px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(16, 185, 129, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "transform 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <span style={{ fontSize: "20px" }}>🤖</span>
          <span>FinAI Assistant</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            width: "360px",
            height: "520px",
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 12px 36px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid #e5e7eb",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "#111827",
              color: "#ffffff",
              padding: "14px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ fontWeight: "700", fontSize: "15px", color: "#34d399" }}>FinAI Assistant</div>
                <div style={{ fontSize: "11px", color: "#9ca3af" }}>● Always active • Live Data</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#9ca3af",
                fontSize: "20px",
                cursor: "pointer",
                padding: "4px",
              }}
              title="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div
            style={{
              padding: "8px 12px",
              background: "#f9fafb",
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p)}
                disabled={loading}
                style={{
                  background: "#edf2f7",
                  border: "1px solid #cbd5e1",
                  borderRadius: "12px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  color: "#334155",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              padding: "14px",
              overflowY: "auto",
              background: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                }}
              >
                <div
                  style={{
                    background: m.sender === "user" ? "#10b981" : "#ffffff",
                    color: m.sender === "user" ? "#ffffff" : "#1e293b",
                    padding: "10px 14px",
                    borderRadius:
                      m.sender === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                    fontSize: "13px",
                    lineHeight: "1.45",
                    boxShadow: m.sender === "user" ? "none" : "0 1px 3px rgba(0,0,0,0.08)",
                    border: m.sender === "user" ? "none" : "1px solid #e2e8f0",
                  }}
                >
                  {renderFormattedMessage(m.text)}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#94a3b8",
                    marginTop: "3px",
                    textAlign: m.sender === "user" ? "right" : "left",
                    paddingLeft: m.sender === "user" ? 0 : 2,
                    paddingRight: m.sender === "user" ? 2 : 0,
                  }}
                >
                  {m.time}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: "flex-start", maxWidth: "80%" }}>
                <div
                  style={{
                    background: "#ffffff",
                    color: "#64748b",
                    padding: "10px 14px",
                    borderRadius: "14px 14px 14px 2px",
                    fontSize: "13px",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>🤖 FinAI is typing...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: "10px 12px",
              background: "#ffffff",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              placeholder="Ask e.g. What's my expense today?..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "20px",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !inputMessage.trim()}
              style={{
                background: loading || !inputMessage.trim() ? "#9ca3af" : "#10b981",
                color: "#ffffff",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: loading || !inputMessage.trim() ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
              title="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
