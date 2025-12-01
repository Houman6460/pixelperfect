import React, { useState, useEffect } from "react";

interface ApiStatus {
  apiConfigured: boolean;
  apiKeySet: boolean;
  modelName: string | null;
  status: string;
}

interface ApiConnectionSettingsProps {
  value: string;
  onChange: (next: string) => void;
  envDefault: string;
}

export function ApiConnectionSettings({ value, onChange, envDefault }: ApiConnectionSettingsProps) {
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const handleUseBrowserOrigin = () => {
    if (typeof window !== "undefined") {
      onChange(window.location.origin);
    }
  };

  // Fetch API status on mount and when value changes
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const baseUrl = value.trim() || "";
        const url = baseUrl ? `${baseUrl}/api/status` : "/api/status";
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setApiStatus(data);
          setStatusError(null);
        } else {
          setStatusError("Backend not responding");
          setApiStatus(null);
        }
      } catch (err) {
        setStatusError("Cannot connect to backend");
        setApiStatus(null);
      }
    };
    
    fetchStatus();
  }, [value]);

  const envLabel = envDefault && envDefault.trim().length > 0 ? envDefault.trim() : "(none)";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100">API connection</h2>
        {apiStatus ? (
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${
            apiStatus.apiConfigured 
              ? "bg-emerald-500/20 text-emerald-400" 
              : "bg-amber-500/20 text-amber-400"
          }`}>
            {apiStatus.apiConfigured ? `✓ AI Ready (${apiStatus.modelName})` : "⚠ API not configured"}
          </span>
        ) : statusError ? (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">
            ✕ {statusError}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">Checking...</span>
        )}
      </div>
      <div className="space-y-1 text-xs text-slate-300">
        <label className="space-y-1 block">
          <span>Backend API base URL</span>
          <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="Leave empty for same origin / dev proxy, or set e.g. https://api.example.com"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </label>
        <p className="text-[11px] text-slate-400">
          Default from build-time env (VITE_API_BASE_URL): <span className="font-mono">{envLabel}</span>
        </p>
        <button
          type="button"
          onClick={handleUseBrowserOrigin}
          className="mt-1 inline-flex items-center justify-center rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          Use current browser origin
        </button>
      </div>
      <p className="text-[11px] text-slate-400">
        Configure your model API key and endpoint on the backend in <span className="font-mono">backend/.env</span>.
        This UI only controls which backend base URL is used for /api/enhance.
      </p>
    </div>
  );
}
