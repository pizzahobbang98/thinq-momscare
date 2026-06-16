import React from "react";
import ReactDOM from "react-dom/client";
import { MobileApp } from "./MobileApp";
import { AppStoreProvider } from "./store";
import "./mobile.css";

ReactDOM.createRoot(document.getElementById("app-root")!).render(
  <React.StrictMode>
    <AppStoreProvider>
      <MobileApp />
    </AppStoreProvider>
  </React.StrictMode>
);
