"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { MessageCircle, Send, ChevronLeft, Search, Loader2 } from "lucide-react";
import { useAuthStore } from "../../../lib/store-auth";
import {
  listerConversations, listerMessages, envoyerMessage, marquerLu, ConversationItem, MessageItem,
} from "../../../lib/api-chat";
import { extraireMessageErreur } from "../../../lib/api-client";
import { toastErreur } from "../../../components/Toast";

export default function PageMessagesAdmin() {
  const { utilisateur } = useAuthStore();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState("");
  const [mobileList, setMobileList] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    chargerConversations();
    intervalRef.current = setInterval(chargerConversations, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function chargerConversations() {
    try {
      const data = await listerConversations();
      setConversations(data.items);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function ouvrirConversation(id: string) {
    setActiveConv(id);
    setMobileList(false);
    try {
      setLoadingMessages(true);
      const data = await listerMessages(id);
      setMessages(data.items);
      await marquerLu(id);
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    } finally {
      setLoadingMessages(false);
    }
  }

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !activeConv) return;
    try {
      const msg = await envoyerMessage(activeConv, text.trim());
      setMessages((prev) => [...prev, msg]);
      setText("");
      chargerConversations();
    } catch (e) {
      toastErreur(extraireMessageErreur(e));
    }
  }

  function nomAutre(c: ConversationItem): string {
    const autre = c.participants.find((p) => p.utilisateur.id !== utilisateur?.id);
    if (!autre) return "Inconnu";
    return autre.utilisateur.nom;
  }

  function telephoneAutre(c: ConversationItem): string {
    const autre = c.participants.find((p) => p.utilisateur.id !== utilisateur?.id);
    return autre?.utilisateur.telephone ?? "";
  }

  function formatDate(d: string) {
    const date = new Date(d);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primaire" /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden rounded-card border border-gray-200 bg-white">
      <div className={`w-full border-r border-gray-200 md:w-80 ${mobileList ? "block" : "hidden md:block"}`}>
        <div className="border-b border-gray-200 p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <MessageCircle className="h-5 w-5 text-primaire" />
            Messages
          </h2>
        </div>
        <div className="overflow-y-auto" style={{ height: "calc(100% - 65px)" }}>
          {conversations.length === 0 && (
            <p className="p-4 text-center text-sm text-gray-500">Aucune conversation</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => ouvrirConversation(c.id)}
              className={`w-full border-b border-gray-100 p-4 text-left transition-colors hover:bg-gray-50 ${
                activeConv === c.id ? "bg-primaire-50" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">{nomAutre(c)}</span>
                <span className="text-xs text-gray-400">{c.misAJourLe ? formatDate(c.misAJourLe) : ""}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="truncate text-sm text-gray-500">
                  {telephoneAutre(c)}
                </span>
                {c.nonLus > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primaire text-[11px] font-bold text-white">
                    {c.nonLus}
                  </span>
                )}
              </div>
              {c.messages[0] && (
                <p className="mt-1 truncate text-xs text-gray-400">
                  {c.messages[0].envoyeur.id === utilisateur?.id ? "Vous : " : ""}
                  {c.messages[0].contenu}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className={`flex flex-1 flex-col ${mobileList ? "hidden md:flex" : "flex"}`}>
        {!activeConv ? (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageCircle className="mx-auto mb-3 h-12 w-12" />
              <p>Sélectionnez une conversation</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-gray-200 p-3">
              <button className="md:hidden" onClick={() => setMobileList(true)}>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="font-semibold">{nomAutre(conversations.find((c) => c.id === activeConv)!)}</p>
                <p className="text-xs text-gray-400">{telephoneAutre(conversations.find((c) => c.id === activeConv)!)}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: "calc(100% - 130px)" }}>
              {loadingMessages && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primaire" />
                </div>
              )}
              {messages.map((m) => {
                const estMoi = m.envoyeur.id === utilisateur?.id;
                return (
                  <div key={m.id} className={`flex ${estMoi ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-xl px-4 py-2 text-sm ${
                        estMoi
                          ? "rounded-br-md bg-primaire text-white"
                          : "rounded-bl-md bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p>{m.contenu}</p>
                      <p className={`mt-1 text-[10px] ${estMoi ? "text-white/70" : "text-gray-400"}`}>
                        {formatDate(m.creeLe)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={envoyer} className="flex items-center gap-2 border-t border-gray-200 p-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Écrivez un message..."
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primaire"
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primaire text-white disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
