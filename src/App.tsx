import React from "react";
import { Layout, Typography, ConfigProvider } from "antd";
import MemeGenerator from "./MemeGenerator";
import "./App.css";

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#ff7a45",
          borderRadius: 16,
          colorBgContainer: "#ffffff",
          fontFamily: "'Gluten', 'Comic Neue', cursive",
        },
      }}
    >
      <Layout className="app-layout">
        <Header className="app-header">
          <div className="header-content">
            <Title
              level={2}
              style={{ color: "#ff7a45", margin: 0, fontWeight: 900 }}
            >
              ✨ Meme Hub ✨
            </Title>
          </div>
        </Header>

        <Content className="app-content">
          <div className="container">
            <MemeGenerator />
          </div>
        </Content>

        <Footer className="app-footer">
          Made with ❤️ and too much caffeine • {new Date().getFullYear()}
        </Footer>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
