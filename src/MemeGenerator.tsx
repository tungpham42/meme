import React, { useState, useEffect, useRef, useCallback } from "react";
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

interface TextBox {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const MemeGenerator: React.FC = () => {
  // --- State Management ---
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [selectedMeme, setSelectedMeme] = useState<MemeTemplate>({
    id: "102156234",
    name: "Mocking Spongebob",
    url: "https://i.imgflip.com/1otk96.jpg",
    box_count: 2,
  });

  const [memes, setMemes] = useState<MemeTemplate[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [loadingMemes, setLoadingMemes] = useState<boolean>(false);

  // AI & Generation State
  const [generatingText, setGeneratingText] = useState<boolean>(false);

  // Dragging State
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- AI Logic ---
  const handleGenerateAI = async () => {
    setGeneratingText(true);
    try {
      const prompt = `Write a funny, creative caption for the meme template "${selectedMeme.name}". It requires exactly ${selectedMeme.box_count} text boxes. Output ONLY the text for each box, separated by a single pipe '|' character.`;

      const response = await axios.post(
        "https://groqprompt.netlify.app/api/result",
        { prompt },
      );

      const rawResult = response.data?.result ?? response.data;

      if (typeof rawResult === "string" && rawResult.trim().length > 0) {
        const parts = rawResult
          .split("|")
          .map((s: string) => s.trim().replace(/^["']|["']$/g, ""));

        // Update the existing text boxes with AI text
        setTextBoxes((prev) =>
          prev.map((box, i) => ({
            ...box,
            text: parts[i] || box.text,
          })),
        );
      }
    } catch (err) {
      console.error("AI text generation failed:", err);
      message.error("The AI is shy right now. Keeping current text.");
    } finally {
      setGeneratingText(false);
    }
  };

  // --- Initial Load ---
  useEffect(() => {
    const fetchMemes = async () => {
      setLoadingMemes(true);
      try {
        const response = await axios.get("https://api.imgflip.com/get_memes");
        if (response.data.success) {
          setMemes(response.data.data.memes);
        }
      } catch (err) {
        console.error("Error fetching memes:", err);
      } finally {
        setLoadingMemes(false);
      }
    };

    fetchMemes();
    // Removed fetchAICaptions from here
  }, []);

  // --- Logic for selecting a new template ---
  const handleMemeSelect = async (meme: MemeTemplate) => {
    setSelectedMeme(meme);
    setTextBoxes([]); // Triggers initializeTextBoxes in the Canvas Effect
    setIsLibraryOpen(false);
    // Removed fetchAICaptions from here - now it only resets to defaults
  };

  const initializeTextBoxes = (
    meme: MemeTemplate,
    imgWidth: number,
    imgHeight: number,
    aiTexts: string[] | null,
  ) => {
    const fontSize = Math.floor(imgHeight / 12);
    const newBoxes: TextBox[] = Array.from(
      { length: meme.box_count },
      (_, i) => {
        let y = imgHeight / 2;
        if (i === 0) y = 50;
        if (i === meme.box_count - 1 && meme.box_count > 1) y = imgHeight - 50;

        const defaultText =
          i === 0
            ? "TOP TEXT"
            : i === meme.box_count - 1
              ? "BOTTOM TEXT"
              : `TEXT ${i + 1}`;

        const textToUse = aiTexts?.[i] || defaultText;

        return {
          text: textToUse,
          x: imgWidth / 2,
          y: y,
          width: 0,
          height: fontSize,
        };
      },
    );

    setTextBoxes(newBoxes);
  };

  // --- Rendering & Canvas Logic ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = selectedMeme.url;

    image.onload = () => {
      document.fonts.load("bold 10px Anton").then(() => {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);

        // This handles both the first load and template switches
        if (textBoxes.length === 0) {
          initializeTextBoxes(
            selectedMeme,
            image.width,
            image.height,
            null, // Always default to null/placeholder on template change
          );
          return;
        }

        const fontSize = Math.floor(canvas.height / 12);
        ctx.font = `bold ${fontSize}px Anton, sans-serif`;
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = fontSize / 15;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const maxWidth = canvas.width * 0.9;

        textBoxes.forEach((box) => {
          const upperText = box.text.toUpperCase();
          const manualLines = upperText.split("\n");
          const finalLines: string[] = [];

          manualLines.forEach((mLine) => {
            const words = mLine.split(" ");
            let currentLine = "";

            words.forEach((word) => {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const testWidth = ctx.measureText(testLine).width;

              if (testWidth > maxWidth && currentLine !== "") {
                finalLines.push(currentLine);
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            });
            finalLines.push(currentLine);
          });

          const lineHeight = fontSize * 1.1;
          let maxLineWidth = 0;

          finalLines.forEach((line, lIdx) => {
            const yOffset = (lIdx - (finalLines.length - 1) / 2) * lineHeight;
            const yPos = box.y + yOffset;

            ctx.strokeText(line, box.x, yPos);
            ctx.fillText(line, box.x, yPos);

            const lineWidth = ctx.measureText(line).width;
            if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
          });

          box.width = maxLineWidth;
          box.height = fontSize * finalLines.length;
        });
      });
    };
  }, [textBoxes, selectedMeme]);

  // --- Drag & Drop ---
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
    const hitIndex = [...textBoxes].reverse().findIndex((box) => {
      return (
        x >= box.x - box.width / 2 &&
        x <= box.x + box.width / 2 &&
        y >= box.y - box.height / 2 &&
        y <= box.y + box.height / 2
      );
    });
    if (hitIndex !== -1) setDragIndex(textBoxes.length - 1 - hitIndex);
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

  // --- Export ---
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `meme_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleCopyImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        message.success("Meme copied to clipboard! 📋");
      } catch (err) {
        message.error("Failed to copy image.");
      }
    }, "image/png");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect Ctrl+C or Cmd+C
      const isCopyShortcut =
        (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c";

      if (isCopyShortcut) {
        // Check if the user is currently focused on an input or textarea
        const activeElement = document.activeElement;
        const isTyping =
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA";

        // Only trigger the image copy if they aren't typing text
        if (!isTyping) {
          e.preventDefault(); // Prevent default browser copy behavior
          handleCopyImage();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Clean up the event listener on unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleCopyImage]);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <Title level={1} style={{ marginBottom: "2.5rem", color: "#434343" }}>
        Cozy Studio <CoffeeOutlined />
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
                <div style={{ marginTop: 8, marginBottom: 12 }}>
                  <Button
                    type="primary"
                    ghost
                    icon={<SmileOutlined />}
                    onClick={handleGenerateAI} // Triggers only on click
                    loading={generatingText}
                    block
                  >
                    AI Magic: Generate Captions
                  </Button>
                </div>

                <div style={{ textAlign: "left" }}>
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
                      onChange={(e) => {
                        const newBoxes = [...textBoxes];
                        newBoxes[index].text = e.target.value;
                        setTextBoxes(newBoxes);
                      }}
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
                  style={{ flex: 1, height: 50 }}
                >
                  Download
                </Button>
                <Button
                  icon={<CopyOutlined />}
                  size="large"
                  onClick={handleCopyImage}
                  style={{ flex: 1, height: 50 }}
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
          <div
            style={{
              height: "60vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Spin size="large" />
          </div>
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
                    onClick={() => handleMemeSelect(meme)}
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
