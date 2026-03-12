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
  Modal,
  Spin,
  Alert,
  message,
} from "antd";
import {
  SmileOutlined,
  CloudDownloadOutlined,
  PictureOutlined,
  CoffeeOutlined,
  DragOutlined,
  CopyOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface MemeTemplate {
  id: string;
  name: string;
  url: string;
  box_count: number;
}

// 1. Define the structure for a draggable text box
interface TextBox {
  text: string;
  x: number;
  y: number;
  width: number; // For collision detection
  height: number;
}

const MemeGenerator: React.FC = () => {
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [imageSrc, setImageSrc] = useState<string>(
    "https://i.imgflip.com/1otk96.jpg",
  );
  // Track the required number of boxes for the current template
  const [currentBoxCount, setCurrentBoxCount] = useState<number>(2);
  const [memes, setMemes] = useState<MemeTemplate[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [loadingMemes, setLoadingMemes] = useState<boolean>(false);
  const [, setError] = useState<string | null>(null);

  // Dragging State
  const [dragIndex, setDragIndex] = useState<number | null>(null);
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
      console.error("Error fetching memes:", err);
    } finally {
      setLoadingMemes(false);
    }
  };

  useEffect(() => {
    fetchMemes();
  }, []);

  // 2. Initialize text boxes with default positions when image changes
  const initializeTextBoxes = (
    count: number,
    imgWidth: number,
    imgHeight: number,
  ) => {
    const fontSize = Math.floor(imgHeight / 12);
    const newBoxes: TextBox[] = [];
    for (let i = 0; i < count; i++) {
      let y = imgHeight / 2; // Default middle
      if (i === 0) y = 50; // Top
      if (i === count - 1 && count > 1) y = imgHeight - 50; // Bottom

      newBoxes.push({
        text:
          i === 0
            ? "TOP TEXT"
            : i === count - 1
              ? "BOTTOM TEXT"
              : `TEXT ${i + 1}`,
        x: imgWidth / 2,
        y: y,
        width: 0,
        height: fontSize,
      });
    }
    setTextBoxes(newBoxes);
  };

  const handleTextChange = (index: number, value: string) => {
    const newBoxes = [...textBoxes];
    newBoxes[index].text = value;
    setTextBoxes(newBoxes);
  };

  // 3. Canvas Rendering Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageSrc;

    image.onload = () => {
      // Ensure the custom font is fully loaded before drawing to the canvas
      document.fonts.load("bold 10px Anton").then(() => {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);

        // Initialize dynamically based on the current template's box_count
        if (textBoxes.length === 0) {
          initializeTextBoxes(currentBoxCount, image.width, image.height);
          return;
        }

        const fontSize = Math.floor(canvas.height / 12);
        ctx.font = `bold ${fontSize}px Anton, sans-serif`;
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = fontSize / 15;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        textBoxes.forEach((box) => {
          const upperText = box.text.toUpperCase();
          const lines = upperText.split("\n");
          const lineHeight = fontSize * 1.1;

          lines.forEach((line, lIdx) => {
            const yPos = box.y + (lIdx - (lines.length - 1) / 2) * lineHeight;
            ctx.strokeText(line, box.x, yPos);
            ctx.fillText(line, box.x, yPos);
          });

          // Update box width and height for hit detection
          const metrics = ctx.measureText(upperText);
          box.width = metrics.width;
          box.height = fontSize * lines.length;
        });
      });
    };
  }, [textBoxes, imageSrc, currentBoxCount]);

  // 4. Drag & Drop Event Handlers
  const getMousePos = (e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);
    // Check if we clicked on any text box (reverse to hit top-most first)
    const hitIndex = [...textBoxes].reverse().findIndex((box) => {
      return (
        x >= box.x - box.width / 2 &&
        x <= box.x + box.width / 2 &&
        y >= box.y - box.height / 2 &&
        y <= box.y + box.height / 2
      );
    });

    if (hitIndex !== -1) {
      setDragIndex(textBoxes.length - 1 - hitIndex);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragIndex === null) return;
    const { x, y } = getMousePos(e);
    const newBoxes = [...textBoxes];
    newBoxes[dragIndex].x = x;
    newBoxes[dragIndex].y = y;
    setTextBoxes(newBoxes);
  };

  const handleMouseUp = () => setDragIndex(null);

  // 5. Export Handlers
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `meme_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleCopyImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          message.error("Could not generate image blob.");
          return;
        }
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        message.success("Meme copied to clipboard! 📋");
      }, "image/png");
    } catch (err) {
      console.error("Failed to copy image: ", err);
      message.error("Failed to copy image. Check browser permissions.");
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <Title level={1} style={{ marginBottom: "2.5rem", color: "#434343" }}>
        Meme Studio <CoffeeOutlined />
      </Title>

      <Row gutter={[32, 32]} align="top">
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

              <div>
                <Text strong>Step 2: Add & Move Text</Text>
                <div style={{ marginTop: 8, textAlign: "left" }}>
                  <Alert
                    message="Pro Tip: You can drag the text directly on the image!"
                    type="info"
                    showIcon
                    icon={<DragOutlined />}
                    style={{ marginBottom: 12 }}
                  />
                  {textBoxes.map((box, index) => (
                    <TextArea
                      key={index}
                      style={{ marginBottom: 12 }}
                      placeholder={`Text box ${index + 1}...`}
                      value={box.text}
                      autoSize={{ minRows: 1, maxRows: 3 }}
                      onChange={(e) => handleTextChange(index, e.target.value)}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                <Button
                  type="primary"
                  icon={<CloudDownloadOutlined />}
                  size="large"
                  onClick={handleDownload}
                  style={{ flex: 1, height: 50, fontSize: 16 }}
                >
                  Download
                </Button>
                <Button
                  icon={<CopyOutlined />}
                  size="large"
                  onClick={handleCopyImage}
                  style={{ flex: 1, height: 50, fontSize: 16 }}
                >
                  Copy Image
                </Button>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <div style={{ padding: "0 10px" }}>
            <Text
              type="secondary"
              style={{ display: "block", marginBottom: 10 }}
            >
              <SmileOutlined /> Drag text boxes to position them:
            </Text>
            <div
              style={{
                background: "#f0f2f5",
                padding: "15px",
                borderRadius: "24px",
                cursor: dragIndex !== null ? "grabbing" : "crosshair",
              }}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: 12,
                  display: "block",
                  margin: "0 auto",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                }}
              />
            </div>
          </div>
        </Col>
      </Row>

      <Modal
        title="Template Library"
        open={isLibraryOpen}
        onCancel={() => setIsLibraryOpen(false)}
        footer={null}
        width={850}
        centered
      >
        {loadingMemes ? (
          <Spin size="large" />
        ) : (
          <div style={{ height: "60vh", overflowY: "auto" }}>
            <Row gutter={[16, 16]}>
              {memes.map((meme) => (
                <Col xs={12} sm={8} key={meme.id}>
                  <Card
                    hoverable
                    cover={
                      <img
                        alt={meme.name}
                        src={meme.url}
                        style={{ height: 120, objectFit: "cover" }}
                      />
                    }
                    onClick={() => {
                      setImageSrc(meme.url);
                      // Update state with the template's required box count
                      setCurrentBoxCount(meme.box_count);
                      // Clear existing boxes to trigger re-initialization
                      setTextBoxes([]);
                      setIsLibraryOpen(false);
                    }}
                  >
                    <Card.Meta
                      title={<span style={{ fontSize: 12 }}>{meme.name}</span>}
                    />
                  </Card>
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
