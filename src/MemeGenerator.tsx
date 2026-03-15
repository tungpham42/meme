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
  InputNumber,
  theme,
} from "antd";
import {
  SmileOutlined,
  CloudDownloadOutlined,
  PictureOutlined,
  CoffeeOutlined,
  DragOutlined,
  CopyOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { TextArea } = Input;

// --- Types ---
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
  fontSize: number;
  rotation: number;
}

interface MemeGeneratorProps {
  lang: "en" | "vi";
}

// --- Translations ---
const i18n = {
  en: {
    tagline: "Cozy Studio",
    station: "🎨 Crafting Station",
    step1: "Step 1: Choose your vibe",
    browse: "Browse Meme Library",
    step2: "Step 2: Add & Move Text",
    aiMagic: "AI Magic: Generate Captions",
    proTip: "Pro Tip: You can drag or rotate the text directly on the image!",
    download: "Download",
    copy: "Copy",
    dragHint: "Drag text boxes or use the top handle to rotate:",
    topText: "TOP TEXT",
    bottomText: "BOTTOM TEXT",
    textLabel: "Text box",
    libraryTitle: "Template Library",
    searchMemes: "Search templates...",
    fontSize: "Size",
    rotation: "Rotate",
    errorAI: "The AI is shy right now. Keeping current text.",
    copySuccess: "Meme copied to clipboard! 📋",
    copyError: "Failed to copy image.",
    reset: "Reset",
  },
  vi: {
    tagline: "Xưởng Sáng Tạo",
    station: "🎨 Trạm Sáng Tạo",
    step1: "Bước 1: Chọn phong cách",
    browse: "Khám phá Thư viện Meme",
    step2: "Bước 2: Chỉnh sửa văn bản",
    aiMagic: "Phép thuật AI: Tạo phụ đề",
    proTip: "Mẹo: Bạn có thể kéo hoặc xoay chữ trực tiếp trên hình ảnh!",
    download: "Tải về",
    copy: "Sao chép",
    dragHint: "Kéo các ô chữ hoặc dùng điểm neo phía trên để xoay:",
    topText: "CHỮ PHÍA TRÊN",
    bottomText: "CHỮ PHÍA DƯỚI",
    textLabel: "Ô chữ số",
    libraryTitle: "Thư viện Meme",
    searchMemes: "Tìm kiếm mẫu...",
    fontSize: "Cỡ chữ",
    rotation: "Xoay",
    errorAI: "AI đang bận một chút. Vui lòng giữ văn bản hiện tại.",
    copySuccess: "Đã sao chép Meme vào bộ nhớ tạm! 📋",
    copyError: "Không thể sao chép hình ảnh.",
    reset: "Đặt lại",
  },
};

const MemeGenerator: React.FC<MemeGeneratorProps> = ({ lang }) => {
  const t = i18n[lang];

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
  const [generatingText, setGeneratingText] = useState<boolean>(false);

  // Track dragging state and interaction mode (moving vs rotating)
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragMode, setDragMode] = useState<"move" | "rotate" | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const { token } = theme.useToken();

  useEffect(() => {
    setTextBoxes((prev) =>
      prev.map((box, i) => {
        const prevLang = lang === "en" ? "vi" : "en";
        const prevT = i18n[prevLang];

        const oldDefault =
          i === 0
            ? prevT.topText
            : i === prev.length - 1 && prev.length > 1
              ? prevT.bottomText
              : `${prevLang === "en" ? "TEXT" : "CHỮ"} ${i + 1}`;

        if (box.text === oldDefault) {
          const newDefault =
            i === 0
              ? t.topText
              : i === prev.length - 1 && prev.length > 1
                ? t.bottomText
                : `${lang === "en" ? "TEXT" : "CHỮ"} ${i + 1}`;

          return { ...box, text: newDefault };
        }

        return box;
      }),
    );
  }, [lang, t.topText, t.bottomText]);

  // --- AI Logic (Bilingual Prompt) ---
  const handleGenerateAI = async () => {
    setGeneratingText(true);
    try {
      const prompt =
        lang === "en"
          ? `Write a short, funny, creative caption for the meme template "${selectedMeme.name}" in English. It requires exactly ${selectedMeme.box_count} text boxes. Output ONLY the text for each box, separated by a single pipe '|' character.`
          : `Viết một câu phụ đề ngắn gọn, hài hước, sáng tạo cho mẫu meme "${selectedMeme.name}" bằng tiếng Việt. Yêu cầu đúng ${selectedMeme.box_count} ô văn bản. CHỈ xuất ra văn bản cho mỗi ô, cách nhau bởi dấu gạch đứng '|'.`;
      const response = await axios.post(
        "https://groqprompt.netlify.app/api/result",
        { prompt },
      );
      const rawResult = response.data?.result ?? response.data;

      if (typeof rawResult === "string" && rawResult.trim().length > 0) {
        const parts = rawResult
          .split("|")
          .map((s: string) => s.trim().replace(/^["']|["']$/g, ""));
        setTextBoxes((prev) =>
          prev.map((box, i) => ({
            ...box,
            text: parts[i] || box.text,
          })),
        );
      }
    } catch (err) {
      console.error("AI text generation failed:", err);
      message.error(t.errorAI);
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
  }, []);

  const handleMemeSelect = (meme: MemeTemplate) => {
    setSelectedMeme(meme);
    setTextBoxes([]);
    setIsLibraryOpen(false);
  };

  const initializeTextBoxes = useCallback(
    (meme: MemeTemplate, imgWidth: number, imgHeight: number) => {
      const defaultFontSize = Math.floor(imgHeight / 12);
      const verticalSpacing = imgHeight / (meme.box_count + 1);

      const newBoxes: TextBox[] = Array.from(
        { length: meme.box_count },
        (_, i) => {
          const y = verticalSpacing * (i + 1);

          const defaultText =
            i === 0
              ? t.topText
              : i === meme.box_count - 1
                ? t.bottomText
                : `${lang === "en" ? "TEXT" : "CHỮ"} ${i + 1}`;

          return {
            text: defaultText,
            x: imgWidth / 2,
            y: y,
            width: 0,
            height: defaultFontSize,
            fontSize: defaultFontSize,
            rotation: 0,
          };
        },
      );
      setTextBoxes(newBoxes);
    },
    [t.topText, t.bottomText, lang],
  );

  // --- Core Drawing Logic ---
  const drawMeme = useCallback(
    (isExporting = false) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const image = imageRef.current;

      if (!canvas || !ctx || !image) return;

      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);

      const maxWidth = canvas.width * 0.9;

      textBoxes.forEach((box) => {
        const fontSize = box.fontSize;
        const lineHeight = fontSize * 1.1;

        ctx.font = `${fontSize}px Anton, sans-serif`;
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = fontSize / 15;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.setLineDash([]);

        const upperText = box.text.trim().toUpperCase();
        const manualLines = upperText.split("\n");
        const finalLines: string[] = [];

        // 1. Calculate word wrapping and total dimensions
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

        const totalHeight = lineHeight * finalLines.length;
        let maxLineWidth = 0;
        finalLines.forEach((line) => {
          const width = ctx.measureText(line).width;
          if (width > maxLineWidth) maxLineWidth = width;
        });

        // 2. Sync box dimensions for hit detection
        box.width = maxLineWidth;
        box.height = totalHeight;

        // 3. Transform context for rotation
        ctx.save();
        ctx.translate(box.x, box.y);
        ctx.rotate((box.rotation * Math.PI) / 180);

        // 4. Draw the text lines centered around the new rotated origin (0, 0)
        finalLines.forEach((line, lIdx) => {
          const yOffset = (lIdx - (finalLines.length - 1) / 2) * lineHeight;

          ctx.strokeText(line, 0, yOffset);
          ctx.fillText(line, 0, yOffset);
        });

        // 5. Draw the bounding rectangle and rotation handle
        if (!isExporting) {
          const padding = 12;
          const rectX = -box.width / 2 - padding;
          const rectY = -box.height / 2 - padding;
          const rectWidth = box.width + padding * 2;
          const rectHeight = box.height + padding * 2;

          // Draw dashed bounding box
          ctx.beginPath();
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 2;
          ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
          ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);

          ctx.lineDashOffset = 6;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
          ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);

          // Draw the rotation handle
          const handleY = rectY - 30; // 30 pixels above the bounding box

          // Connective line
          ctx.beginPath();
          ctx.setLineDash([]);
          ctx.moveTo(0, rectY);
          ctx.lineTo(0, handleY);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
          ctx.stroke();

          // Circular node
          ctx.beginPath();
          ctx.arc(0, handleY, 6, 0, Math.PI * 2);
          ctx.fillStyle = "#1677ff"; // Ant Design primary blue
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "white";
          ctx.stroke();
        }

        ctx.restore(); // Reset transformation for the next box
      });
    },
    [textBoxes],
  );

  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = selectedMeme.url;

    image.onload = () => {
      document.fonts.load("10px Anton").then(() => {
        imageRef.current = image;

        if (textBoxes.length === 0) {
          initializeTextBoxes(selectedMeme, image.width, image.height);
        } else {
          drawMeme(false);
        }
      });
    };
  }, [selectedMeme, initializeTextBoxes, drawMeme, textBoxes.length]);

  useEffect(() => {
    if (textBoxes.length > 0) {
      const allText = textBoxes.map((box) => box.text).join(" ");
      document.fonts.load("10px Anton", allText).then(() => {
        drawMeme(false);
      });
    }
  }, [textBoxes, drawMeme]);

  // --- Drag & Drop & Rotation Handlers ---
  const getPointerPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const checkHit = (x: number, y: number) => {
    // Check backwards to respect stacking order (top items first)
    for (let i = textBoxes.length - 1; i >= 0; i--) {
      const box = textBoxes[i];

      // Un-rotate the pointer coordinates relative to the box center
      const dx = x - box.x;
      const dy = y - box.y;
      const rad = (-box.rotation * Math.PI) / 180;

      const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

      // 1. Check if the rotate handle was hit
      const padding = 12;
      const rectY = -box.height / 2 - padding;
      const handleY = rectY - 30; // Matches drawing logic

      const distToHandle = Math.sqrt(
        localX * localX + (localY - handleY) * (localY - handleY),
      );

      // 15 is a generous hit radius to make clicking on mobile easy
      if (distToHandle <= 15) {
        setDragIndex(i);
        setDragMode("rotate");
        return;
      }

      // 2. Check if the bounding box was hit
      if (
        localX >= -box.width / 2 &&
        localX <= box.width / 2 &&
        localY >= -box.height / 2 &&
        localY <= box.height / 2
      ) {
        setDragIndex(i);
        setDragMode("move");
        return;
      }
    }

    // Nothing hit
    setDragIndex(null);
    setDragMode(null);
  };

  const handleDrag = (x: number, y: number) => {
    if (dragIndex === null || dragMode === null) return;

    const newBoxes = [...textBoxes];
    const box = newBoxes[dragIndex];

    if (dragMode === "move") {
      box.x = x;
      box.y = y;
    } else if (dragMode === "rotate") {
      // Calculate angle from center of box to mouse pointer.
      // We add 90 degrees because the handle is at the top (which is technically -90 degrees in atan2)
      const angleInRads = Math.atan2(y - box.y, x - box.x);
      const angleInDegrees = angleInRads * (180 / Math.PI) + 90;

      // Round to nearest integer for clean UI
      box.rotation = Math.round(angleInDegrees);
    }

    setTextBoxes(newBoxes);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getPointerPos(e.clientX, e.clientY);
    checkHit(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getPointerPos(e.clientX, e.clientY);
    handleDrag(x, y);
  };

  const clearDrag = () => {
    setDragIndex(null);
    setDragMode(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const { x, y } = getPointerPos(touch.clientX, touch.clientY);
    checkHit(x, y);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragIndex !== null) {
      const touch = e.touches[0];
      const { x, y } = getPointerPos(touch.clientX, touch.clientY);
      handleDrag(x, y);
    }
  };

  // --- Export ---
  const handleDownload = () => {
    drawMeme(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `meme_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();

    drawMeme(false);
  };

  const handleCopyImage = useCallback(() => {
    drawMeme(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const blobPromise = new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          drawMeme(false);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create image blob"));
          }
        }, "image/png");
      });

      const item = new ClipboardItem({ "image/png": blobPromise });
      navigator.clipboard
        .write([item])
        .then(() => message.success(t.copySuccess))
        .catch((err) => {
          console.error("Clipboard write error:", err);
          message.error(t.copyError);
        });
    } catch (err) {
      console.error("ClipboardItem creation error:", err);
      message.error(t.copyError);
      drawMeme(false);
    }
  }, [t.copySuccess, t.copyError, drawMeme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCopyShortcut =
        (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c";

      if (isCopyShortcut) {
        const activeElement = document.activeElement;
        const isTyping =
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA";

        if (!isTyping) {
          e.preventDefault();
          handleCopyImage();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleCopyImage]);

  const filteredMemes = memes.filter((meme) =>
    meme.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleReset = () => {
    const image = imageRef.current;
    if (image) {
      initializeTextBoxes(selectedMeme, image.width, image.height);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <Title
        level={1}
        style={{ marginBottom: "2.5rem", color: token.colorTextHeading }}
      >
        {t.tagline} <CoffeeOutlined />
      </Title>

      <Row gutter={[32, 32]} align="top">
        <Col xs={24} lg={10}>
          <Card className="cozy-card" title={t.station}>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <div>
                <Text strong>{t.step1}</Text>
                <Button
                  block
                  type="dashed"
                  size="large"
                  icon={<PictureOutlined />}
                  onClick={() => setIsLibraryOpen(true)}
                  style={{ marginTop: 8 }}
                >
                  {t.browse}
                </Button>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text strong>{t.step2}</Text>
                  <Button
                    type="link"
                    size="small"
                    icon={<ReloadOutlined style={{ fontSize: "12px" }} />}
                    onClick={handleReset}
                    style={{ color: "#ff8c69", padding: 0 }}
                  ></Button>
                </div>

                <div style={{ marginTop: 8, marginBottom: 12 }}>
                  <Button
                    type="primary"
                    ghost
                    icon={<SmileOutlined />}
                    onClick={handleGenerateAI}
                    loading={generatingText}
                    block
                  >
                    {t.aiMagic}
                  </Button>
                </div>

                <div style={{ textAlign: "left" }}>
                  <Alert
                    message={t.proTip}
                    type="info"
                    showIcon
                    icon={<DragOutlined />}
                    style={{ marginBottom: 12 }}
                  />
                  {textBoxes.map((box, index) => {
                    const boxLabel =
                      index === 0
                        ? t.topText
                        : index === textBoxes.length - 1 && textBoxes.length > 1
                          ? t.bottomText
                          : `${t.textLabel} ${index + 1}`;

                    return (
                      <div key={index} style={{ marginBottom: 16 }}>
                        {/* Labels Row */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 6,
                          }}
                        >
                          <Text strong>{boxLabel}</Text>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <Text
                              strong
                              style={{
                                fontSize: "12px",
                                width: "70px",
                                textAlign: "left",
                              }}
                            >
                              {t.fontSize}
                            </Text>
                            <Text
                              strong
                              style={{
                                fontSize: "12px",
                                width: "70px",
                                textAlign: "left",
                              }}
                            >
                              {t.rotation}
                            </Text>
                          </div>
                        </div>

                        {/* Inputs Row */}
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "flex-start",
                          }}
                        >
                          <TextArea
                            style={{ flex: 1 }}
                            placeholder={`${t.textLabel} ${index + 1}...`}
                            value={box.text}
                            autoSize={{ minRows: 1, maxRows: 3 }}
                            onChange={(e) => {
                              const newBoxes = [...textBoxes];
                              newBoxes[index].text = e.target.value;
                              setTextBoxes(newBoxes);
                            }}
                          />
                          <InputNumber
                            value={box.fontSize}
                            onChange={(val) => {
                              if (val !== null) {
                                const newBoxes = [...textBoxes];
                                newBoxes[index].fontSize = val;
                                setTextBoxes(newBoxes);
                              }
                            }}
                            style={{ width: "70px" }}
                          />
                          <InputNumber
                            value={box.rotation}
                            min={-180}
                            max={180}
                            onChange={(val) => {
                              if (val !== null) {
                                const newBoxes = [...textBoxes];
                                newBoxes[index].rotation = val;
                                setTextBoxes(newBoxes);
                              }
                            }}
                            style={{ width: "70px" }}
                          />
                        </div>
                      </div>
                    );
                  })}
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
                  {t.download}
                </Button>
                <Button
                  icon={<CopyOutlined />}
                  size="large"
                  onClick={handleCopyImage}
                  style={{ flex: 1, height: 50 }}
                >
                  {t.copy}
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
              <SmileOutlined /> {t.dragHint}
            </Text>
            <div
              style={{
                background: token.colorBgLayout, // Changed from "#f0f2f5"
                padding: "15px",
                borderRadius: "24px",
                cursor:
                  dragMode === "rotate"
                    ? "grabbing"
                    : dragMode === "move"
                      ? "move"
                      : "crosshair",
              }}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={clearDrag}
                onMouseLeave={clearDrag}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={clearDrag}
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: 12,
                  display: "block",
                  margin: "0 auto",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                  touchAction: "none",
                }}
              />
            </div>
          </div>
        </Col>
      </Row>

      <Modal
        title={t.libraryTitle}
        open={isLibraryOpen}
        onCancel={() => setIsLibraryOpen(false)}
        footer={null}
        width={850}
        centered
      >
        <Input
          autoFocus
          placeholder={t.searchMemes}
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          style={{ marginBottom: 16 }}
        />
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
              {filteredMemes.map((meme) => (
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
              {filteredMemes.length === 0 && (
                <Col span={24} style={{ textAlign: "center", marginTop: 20 }}>
                  <Text type="secondary">No templates found.</Text>
                </Col>
              )}
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MemeGenerator;
