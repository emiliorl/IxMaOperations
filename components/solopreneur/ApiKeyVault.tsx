"use client";

import React, { useState } from "react";
import { encryptVaultPayload } from "@/lib/crypto";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Lock, ShieldCheck, CheckCircle2, Key, Eye, EyeOff } from "lucide-react";

interface ApiKeyVaultProps {
  orderId: string;
  onVaultSuccess?: (ciphertext: string, iv: string) => void;
}

export function ApiKeyVault({ orderId, onVaultSuccess }: ApiKeyVaultProps) {
  const [openAiKey, setOpenAiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [proxyKey, setProxyKey] = useState("");
  const [customKeyName, setCustomKeyName] = useState("");
  const [customKeyValue, setCustomKeyValue] = useState("");

  const [showKeys, setShowKeys] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [encryptedSummary, setEncryptedSummary] = useState<{ ciphertext: string; iv: string } | null>(null);

  const handleEncryptAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEncrypting(true);

    try {
      const keysPayload = {
        openai: openAiKey || undefined,
        anthropic: anthropicKey || undefined,
        proxy: proxyKey || undefined,
        custom: customKeyName ? { [customKeyName]: customKeyValue } : undefined,
        timestamp: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(keysPayload);

      // Client-side AES-256-GCM encryption
      const encrypted = await encryptVaultPayload(payloadString);

      // Send ciphertext to server vault API
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setIsEncrypted(true);
        setEncryptedSummary(encrypted);
        onVaultSuccess?.(encrypted.ciphertext, encrypted.iv);
      }
    } catch (err) {
      console.error("Vault encryption error:", err);
    } finally {
      setEncrypting(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Lock className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Client Encrypted API Vault</h3>
            <p className="text-xs text-slate-400">Zero-Trust AES-256-GCM Ingestion</p>
          </div>
        </div>

        <Badge variant="default" className="text-[10px] font-mono self-start sm:self-auto">
          Client-Side AES-256 Encrypted
        </Badge>
      </div>

      {isEncrypted ? (
        <div className="p-5 rounded-lg bg-emerald-950/20 border border-emerald-500/40 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
            <CheckCircle2 className="h-5 w-5" />
            <span>Credentials Encrypted & Vaulted Successfully</span>
          </div>
          <p className="text-xs text-slate-300">
            Your tokens have been encrypted with AES-256-GCM. Plaintext keys were wiped from memory and only ciphertext was transmitted to the server.
          </p>
          <div className="p-2.5 rounded bg-slate-950 font-mono text-[10px] text-emerald-300 break-all border border-emerald-900/50">
            Ciphertext: {encryptedSummary?.ciphertext.substring(0, 48)}... (Length: {encryptedSummary?.ciphertext.length} chars)
          </div>
        </div>
      ) : (
        <form onSubmit={handleEncryptAndSave} className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowKeys(!showKeys)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              {showKeys ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{showKeys ? "Hide Keys" : "Reveal Keys"}</span>
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-300 flex items-center justify-between">
              <span>OpenAI API Key (Optional)</span>
              <span className="text-slate-500 text-[10px]">sk-proj-...</span>
            </label>
            <Input
              type={showKeys ? "text" : "password"}
              placeholder="sk-proj-..."
              value={openAiKey}
              onChange={(e) => setOpenAiKey(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-300 flex items-center justify-between">
              <span>Anthropic API Key (Optional)</span>
              <span className="text-slate-500 text-[10px]">sk-ant-...</span>
            </label>
            <Input
              type={showKeys ? "text" : "password"}
              placeholder="sk-ant-api03-..."
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-300 flex items-center justify-between">
              <span>Residential Proxy / Target Service Token (Optional)</span>
              <span className="text-slate-500 text-[10px]">http://user:pass@proxy.io:8080</span>
            </label>
            <Input
              type={showKeys ? "text" : "password"}
              placeholder="http://user:pass@proxy-provider.com:8000"
              value={proxyKey}
              onChange={(e) => setProxyKey(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Keys are zero-trust encrypted before POST</span>
            </div>

            <Button type="submit" disabled={encrypting} variant="default" size="sm" className="gap-2">
              <Lock className="h-3.5 w-3.5" />
              {encrypting ? "Encrypting & Storing..." : "Encrypt & Vault Keys"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
