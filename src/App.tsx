import React, { useState, useEffect } from "react";
import {
  Layout,
  Typography,
  ConfigProvider,
  Radio,
  Button,
  theme as antTheme,
  Space,
} from "antd";
import { SunOutlined, MoonOutlined } from "@ant-design/icons";
import MemeGenerator from "./MemeGenerator";
import "./App.css";

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  // Language State
  const [lang, setLang] = useState<"en" | "vi">((): "en" | "vi" => {
    const savedLang = localStorage.getItem("meme_lang");
    return savedLang === "vi" || savedLang === "en" ? savedLang : "en";
  });

  // Theme State
  const [themeMode, setThemeMode] = useState<"light" | "dark">(
    (): "light" | "dark" => {
      const savedTheme = localStorage.getItem("meme_theme");
      return savedTheme === "dark" ? "dark" : "light";
    },
  );

  const handleLangChange = (newLang: "en" | "vi") => {
    setLang(newLang);
    localStorage.setItem("meme_lang", newLang);
  };

  const toggleTheme = () => {
    const newTheme = themeMode === "light" ? "dark" : "light";
    setThemeMode(newTheme);
    localStorage.setItem("meme_theme", newTheme);
  };

  // Sync a class to the body for broader CSS scoping if needed
  useEffect(() => {
    document.body.className = themeMode;
  }, [themeMode]);

  return (
    <ConfigProvider
      theme={{
        algorithm:
          themeMode === "dark"
            ? antTheme.darkAlgorithm
            : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#ff7a45",
          borderRadius: 16,
          fontFamily: "'Gluten', 'Comic Sans MS', cursive",
        },
      }}
    >
      {/* Pass the themeMode to the layout for custom CSS targeting */}
      <Layout className={`app-layout ${themeMode}`}>
        <Header className="app-header">
          <div
            className="header-content"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Title
              level={2}
              style={{ color: "#ff7a45", margin: 0, fontWeight: 900 }}
            >
              {lang === "en" ? "Meme Hub" : "Tạo Meme"}
            </Title>

            <Space size="middle">
              {/* 2. Update the icon prop to use SunOutlined for light and MoonOutlined for dark */}
              <Button
                type="text"
                icon={
                  themeMode === "light" ? <MoonOutlined /> : <SunOutlined />
                }
                onClick={toggleTheme}
                style={{
                  fontSize: "20px",
                  color: themeMode === "dark" ? "#ffd8bf" : "#ff7a45",
                }}
              />
              <Radio.Group
                value={lang}
                onChange={(e) => handleLangChange(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="en">EN</Radio.Button>
                <Radio.Button value="vi">VI</Radio.Button>
              </Radio.Group>
            </Space>
          </div>
        </Header>

        <Content className="app-content">
          <div className="container">
            <MemeGenerator lang={lang} />
          </div>
        </Content>

        <Footer className="app-footer">
          {lang === "en"
            ? "Made with ❤️ and too much caffeine"
            : "Được làm với ❤️ và quá nhiều caffeine"}{" "}
          • {new Date().getFullYear()}
        </Footer>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
