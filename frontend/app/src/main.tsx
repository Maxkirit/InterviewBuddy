import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import "./styles/App.css";
import AuthProvider from "./AuthProvider";
import Router from "./Router";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AuthProvider>
            <Router />
        </AuthProvider>
    </StrictMode>
);
