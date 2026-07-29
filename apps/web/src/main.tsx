import React from "react";
import ReactDOM from "react-dom/client";
import { App as AntApp, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { BrowserRouter } from "react-router-dom";
import { webThemeToken } from "@tegang/design-tokens";
import { PrototypeApp } from "./routes/PrototypeApp";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: webThemeToken,
        components: {
          Layout: {
            siderBg: "#0E3555",
            headerBg: "#FFFFFF"
          },
          Menu: {
            darkItemBg: "#0E3555",
            darkItemSelectedBg: "#1D5F8C",
            darkItemHoverBg: "#164E7A"
          }
        }
      }}
    >
      <AntApp>
        <BrowserRouter>
          <PrototypeApp />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
