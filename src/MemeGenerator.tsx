import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Card,
  Input,
  Button,
  Row,
  Col,
  Typography,
  Space,
  Divider,
  Modal,
  Spin,
  Alert,
  Tooltip,
} from "antd";
import {
  SmileOutlined,
  EditOutlined,
  CloudDownloadOutlined,
  PictureOutlined,
  CoffeeOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface MemeTemplate {
  id: string;
  name: string;
  url: string;
}

const MemeGenerator: React.FC = () => {
  const [topText, setTopText] = useState<string>("ME TRYING TO FIX CODE");
  const [bottomText, setBottomText] = useState<string>(
    "BY DELETING SEMICOLONS",
  );
  const [imageSrc, setImageSrc] = useState<string>(
    "https://i.imgflip.com/1otk96.jpg",
  );
  const [memes, setMemes] = useState<MemeTemplate[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [loadingMemes, setLoadingMemes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchMemes = async () => {
    setLoadingMemes(true);
    setError(null);
    try {
      const response = await axios.get("https://api.imgflip.com/get_memes");
      if (response.data.success) {
        setMemes(response.data.data.memes);
      }
    } catch (err) {
      setError("The interwebs are grumpy. Try again?");
    } finally {
      setLoadingMemes(false);
    }
  };

  useEffect(() => {
    fetchMemes();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageSrc;

    image.onload = async () => {
      // Ensure the font is loaded before drawing
      await document.fonts.load("bold 10px Anton");

      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);

      const fontSize = Math.floor(canvas.height / 12);

      // Use Anton for Vietnamese support
      ctx.font = `bold ${fontSize}px Anton`;
      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      ctx.lineWidth = fontSize / 15;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      // Draw Top Text
      ctx.strokeText(topText.toUpperCase(), canvas.width / 2, 20);
      ctx.fillText(topText.toUpperCase(), canvas.width / 2, 20);

      // Draw Bottom Text
      ctx.textBaseline = "bottom";
      ctx.strokeText(
        bottomText.toUpperCase(),
        canvas.width / 2,
        canvas.height - 20,
      );
      ctx.fillText(
        bottomText.toUpperCase(),
        canvas.width / 2,
        canvas.height - 20,
      );
    };
  }, [topText, bottomText, imageSrc]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "masterpiece.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div style={{ textAlign: "center" }}>
      <Title level={1} style={{ marginBottom: "2.5rem", color: "#434343" }}>
        Create a Masterpiece <CoffeeOutlined />
      </Title>

      <Row gutter={[32, 32]} align="middle">
        <Col xs={24} lg={10}>
          <Card className="cozy-card" title="🎨 Crafting Station">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <div>
                <Text strong>Step 1: Choose your vibe</Text>
                <Button
                  block
                  type="dashed"
                  size="large"
                  icon={<PictureOutlined />}
                  onClick={() => setIsLibraryOpen(true)}
                  style={{ marginTop: 8 }}
                >
                  Browse Meme Library
                </Button>
              </div>

              <Divider plain style={{ margin: "8px 0" }}>
                or paste a link
              </Divider>
              <Input
                placeholder="Image URL goes here..."
                value={imageSrc}
                onChange={(e) => setImageSrc(e.target.value)}
              />

              <div>
                <Text strong>Step 2: Add the funny stuff</Text>
                <Input
                  style={{ marginTop: 8 }}
                  prefix={<EditOutlined style={{ color: "#bfbfbf" }} />}
                  placeholder="Top text (something witty...)"
                  value={topText}
                  onChange={(e) => setTopText(e.target.value)}
                />
                <Input
                  style={{ marginTop: 12 }}
                  prefix={<EditOutlined style={{ color: "#bfbfbf" }} />}
                  placeholder="Bottom text (the punchline...)"
                  value={bottomText}
                  onChange={(e) => setBottomText(e.target.value)}
                />
              </div>

              <Button
                type="primary"
                icon={<CloudDownloadOutlined />}
                size="large"
                block
                onClick={handleDownload}
                style={{ height: 55, fontSize: 18 }}
              >
                Download & Share!
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <div style={{ padding: "10px" }}>
            <Text
              type="secondary"
              style={{ display: "block", marginBottom: 10 }}
            >
              <SmileOutlined /> Witness your creation below:
            </Text>
            <div
              style={{
                background: "#fff",
                padding: "15px",
                borderRadius: "24px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: 12,
                  display: "block",
                  margin: "0 auto",
                }}
              />
            </div>
          </div>
        </Col>
      </Row>

      <Modal
        title="Find your favorite template"
        open={isLibraryOpen}
        onCancel={() => setIsLibraryOpen(false)}
        footer={null}
        width={850}
        centered
      >
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 20 }}
          />
        )}

        {loadingMemes ? (
          <div style={{ padding: "100px 0", textAlign: "center" }}>
            <Spin size="large" tip="Waking up the memes..." />
          </div>
        ) : (
          <div style={{ height: "60vh", overflowY: "auto", paddingRight: 10 }}>
            <Row gutter={[16, 16]}>
              {memes.map((meme) => (
                <Col xs={12} sm={8} md={6} key={meme.id}>
                  <Tooltip title={meme.name}>
                    <Card
                      hoverable
                      className="cozy-card"
                      cover={
                        <img
                          alt={meme.name}
                          src={meme.url}
                          style={{ height: 140, objectFit: "cover" }}
                        />
                      }
                      onClick={() => {
                        setImageSrc(meme.url);
                        setIsLibraryOpen(false);
                      }}
                      bodyStyle={{ padding: 10, textAlign: "center" }}
                    >
                      <Card.Meta
                        description={
                          <span style={{ fontSize: "12px" }}>{meme.name}</span>
                        }
                      />
                    </Card>
                  </Tooltip>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MemeGenerator;
