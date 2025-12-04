import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import ErrorBoundary from "./components/ErrorBoundary";
import AppRouter from "./AppRouter";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <SubscriptionProvider>
            <AppRouter />
          </SubscriptionProvider>
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
