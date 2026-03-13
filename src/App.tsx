import React, { useState } from "react";
import { Layout, Typography, ConfigProvider, Radio } from "antd";
import MemeGenerator from "./MemeGenerator";
import "./App.css";

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  // Khởi tạo state từ localStorage, mặc định là "en" nếu chưa có dữ liệu
  const [lang, setLang] = useState<"en" | "vi">((): "en" | "vi" => {
    const savedLang = localStorage.getItem("meme_lang");
    return savedLang === "vi" || savedLang === "en" ? savedLang : "en";
  });

  // Cập nhật localStorage mỗi khi ngôn ngữ thay đổi
  const handleLangChange = (newLang: "en" | "vi") => {
    setLang(newLang);
    localStorage.setItem("meme_lang", newLang);
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#ff7a45",
          borderRadius: 16,
          colorBgContainer: "#ffffff",
          fontFamily: "'Gluten', 'Comic Sans MS', cursive",
        },
      }}
    >
      <Layout className="app-layout">
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
              ✨ {lang === "en" ? "Meme Hub" : "Tạo Meme"} ✨
            </Title>
            <Radio.Group
              value={lang}
              onChange={(e) => handleLangChange(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="en">EN</Radio.Button>
              <Radio.Button value="vi">VI</Radio.Button>
            </Radio.Group>
          </div>
        </Header>

        <Content className="app-content">
          <div className="container">
            {/* Truyền lang xuống MemeGenerator để xử lý prompt AI và UI */}
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
