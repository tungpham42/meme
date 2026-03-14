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
} from "antd";
import {
  SmileOutlined,
  CloudDownloadOutlined,
  PictureOutlined,
  CoffeeOutlined,
  DragOutlined,
  CopyOutlined,
  SearchOutlined,
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
  fontSize: number; // Added to support custom sizing
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
    proTip: "Pro Tip: You can drag the text directly on the image!",
    download: "Download",
    copy: "Copy Image",
    dragHint: "Drag text boxes to position them:",
    topText: "TOP TEXT",
    bottomText: "BOTTOM TEXT",
    textLabel: "Text box",
    libraryTitle: "Template Library",
    searchMemes: "Search templates...",
    fontSize: "Size",
    errorAI: "The AI is shy right now. Keeping current text.",
    copySuccess: "Meme copied to clipboard! 📋",
    copyError: "Failed to copy image.",
  },
  vi: {
    tagline: "Xưởng Sáng Tạo",
    station: "🎨 Trạm Sáng Tạo",
    step1: "Bước 1: Chọn phong cách",
    browse: "Khám phá Thư viện Meme",
    step2: "Bước 2: Chỉnh sửa văn bản",
    aiMagic: "Phép thuật AI: Tạo phụ đề",
    proTip: "Mẹo: Bạn có thể kéo chữ trực tiếp trên hình ảnh!",
    download: "Tải về",
    copy: "Sao chép hình",
    dragHint: "Kéo các ô chữ để thay đổi vị trí:",
    topText: "CHỮ PHÍA TRÊN",
    bottomText: "CHỮ PHÍA DƯỚI",
    textLabel: "Ô chữ số",
    libraryTitle: "Thư viện Meme",
    searchMemes: "Tìm kiếm mẫu...",
    fontSize: "Cỡ chữ",
    errorAI: "AI đang bận một chút. Vui lòng giữ văn bản hiện tại.",
    copySuccess: "Đã sao chép Meme vào bộ nhớ tạm! 📋",
    copyError: "Không thể sao chép hình ảnh.",
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(""); // Search state

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

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

  // --- Logic for selecting a new template ---
  const handleMemeSelect = (meme: MemeTemplate) => {
    setSelectedMeme(meme);
    setTextBoxes([]); // Reset to trigger re-initialization
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
            fontSize: defaultFontSize, // Save initial font size
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

      // Reset canvas and draw background
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);

      const maxWidth = canvas.width * 0.9;

      textBoxes.forEach((box) => {
        // Read the font size directly from the current text box
        const fontSize = box.fontSize;

        // Setup Text Styles
        ctx.font = `${fontSize}px Anton, sans-serif`;
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = fontSize / 15;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.setLineDash([]);

        const upperText = box.text.toUpperCase();
        const manualLines = upperText.split("\n");
        const finalLines: string[] = [];

        // Calculate word wrapping
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

        // Draw text and calculate max width
        finalLines.forEach((line, lIdx) => {
          const yOffset = (lIdx - (finalLines.length - 1) / 2) * lineHeight;
          const yPos = box.y + yOffset;
          ctx.strokeText(line, box.x, yPos);
          ctx.fillText(line, box.x, yPos);

          const lineWidth = ctx.measureText(line).width;
          if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
        });

        // Update box dimensions for hit detection
        box.width = maxLineWidth;
        box.height = fontSize * finalLines.length;

        // --- Draw Dotted Bounding Box ONLY if we aren't exporting ---
        if (!isExporting) {
          const padding = 12;
          const rectX = box.x - box.width / 2 - padding;
          const rectY = box.y - box.height / 2 - padding;
          const rectWidth = box.width + padding * 2;
          const rectHeight = box.height + padding * 2;

          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 2;
          ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
          ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);

          ctx.lineDashOffset = 6;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
          ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
          ctx.restore();
        }
      });
    },
    [textBoxes],
  );

  // --- Image Loading (Runs only when selected template changes) ---
  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = selectedMeme.url;

    image.onload = () => {
      document.fonts.load("10px Anton").then(() => {
        imageRef.current = image; // Save the image instance

        if (textBoxes.length === 0) {
          initializeTextBoxes(selectedMeme, image.width, image.height);
        } else {
          drawMeme(false);
        }
      });
    };
  }, [selectedMeme, initializeTextBoxes, drawMeme, textBoxes.length]);

  // --- Redraw on Text/Position Changes ---
  useEffect(() => {
    if (textBoxes.length > 0) {
      // 1. Combine all text currently in the boxes
      const allText = textBoxes.map((box) => box.text).join(" ");

      // 2. Force the browser to load the needed glyphs for this specific text
      document.fonts.load("10px Anton", allText).then(() => {
        // 3. Draw only after the font subset is fully ready
        drawMeme(false);
      });
    }
  }, [textBoxes, drawMeme]);

  // --- Drag & Drop (Mouse & Touch) ---
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

  const moveBox = (x: number, y: number) => {
    if (dragIndex === null) return;
    const newBoxes = [...textBoxes];
    newBoxes[dragIndex].x = x;
    newBoxes[dragIndex].y = y;
    setTextBoxes(newBoxes);
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getPointerPos(e.clientX, e.clientY);
    checkHit(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getPointerPos(e.clientX, e.clientY);
    moveBox(x, y);
  };

  const handleMouseUp = () => setDragIndex(null);

  // Touch Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const { x, y } = getPointerPos(touch.clientX, touch.clientY);
    checkHit(x, y);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragIndex !== null) {
      const touch = e.touches[0];
      const { x, y } = getPointerPos(touch.clientX, touch.clientY);
      moveBox(x, y);
    }
  };

  const handleTouchEnd = () => setDragIndex(null);

  // --- Export ---
  const handleDownload = () => {
    drawMeme(true); // Sync redraw without borders

    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `meme_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();

    drawMeme(false); // Instantly restore borders
  };

  const handleCopyImage = useCallback(() => {
    drawMeme(true); // Sync redraw without borders
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const blobPromise = new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          drawMeme(false); // Restore borders immediately once data is captured
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
      drawMeme(false); // Fallback restore
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

  // Derived state for filtered memes
  const filteredMemes = memes.filter((meme) =>
    meme.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <Title level={1} style={{ marginBottom: "2.5rem", color: "#434343" }}>
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
                <Text strong>{t.step2}</Text>
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
                  {textBoxes.map((box, index) => (
                    <div key={index} style={{ marginBottom: 12, display: "flex", gap: "8px" }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '70px' }}>
                        <Text style={{ fontSize: '12px' }}>{t.fontSize}</Text>
                        <InputNumber
                          size="small"
                          value={box.fontSize}
                          onChange={(val) => {
                            if (val !== null) {
                              const newBoxes = [...textBoxes];
                              newBoxes[index].fontSize = val;
                              setTextBoxes(newBoxes);
                            }
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
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
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: 12,
                  display: "block",
                  margin: "0 auto",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                  touchAction: "none", // Critical for mobile to prevent scroll when dragging
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
