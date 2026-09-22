import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  ImageRun,
} from "docx";

function createImageParagraph(imageUrl?: string | null): Paragraph | null {
  if (!imageUrl || !imageUrl.trim()) return null;
  const trimmed = imageUrl.trim();

  // 嘗試從本機讀取 public/uploads 圖片嵌入 DOCX
  const uploadMatch = trimmed.match(/^\/?(uploads\/.+)$/);
  if (uploadMatch) {
    try {
      const localPath = path.join(process.cwd(), "public", uploadMatch[1]);
      if (fs.existsSync(localPath)) {
        const ext = path.extname(localPath).toLowerCase().replace(".", "");
        if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "gif") {
          const imageType = ext === "jpeg" ? "jpg" : (ext as "png" | "jpg" | "gif");
          const fileBuffer = fs.readFileSync(localPath);
          return new Paragraph({
            spacing: { before: 80, after: 120 },
            indent: { left: 360 },
            children: [
              new ImageRun({
                type: imageType,
                data: fileBuffer,
                transformation: {
                  width: 320,
                  height: 200,
                },
              }),
            ],
          });
        }
      }
    } catch (err) {
      console.warn("Docx image embedding error, fallback to text paragraph:", err);
    }
  }

  // 若為 Base64 Data URL，嘗試解碼為 Buffer 嵌入
  if (trimmed.startsWith("data:image/")) {
    try {
      const match = trimmed.match(/^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/);
      if (match) {
        const rawType = match[1];
        const imageType = rawType === "jpeg" ? "jpg" : (rawType as "png" | "jpg" | "gif");
        const fileBuffer = Buffer.from(match[2], "base64");
        return new Paragraph({
          spacing: { before: 80, after: 120 },
          indent: { left: 360 },
          children: [
            new ImageRun({
              type: imageType,
              data: fileBuffer,
              transformation: {
                width: 320,
                height: 200,
              },
            }),
          ],
        });
      }
    } catch (err) {
      console.warn("Docx base64 image embedding error:", err);
    }
  }

  // 平穩相容降級：轉為標準段落
  return new Paragraph({
    spacing: { before: 60, after: 100 },
    indent: { left: 360 },
    children: [
      new TextRun({
        text: "【題目附圖】：",
        bold: true,
        size: 20,
        color: "4F46E5",
        font: "Microsoft JhengHei",
      }),
      new TextRun({
        text: trimmed,
        size: 20,
        color: "2563EB",
        underline: {},
        font: "Microsoft JhengHei",
      }),
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      reportType = "EXAM", // "EXAM" | "EXAM_WRONG_REPORT"
      title: customTitle,
      subtitle: customSubtitle,
      includeExplanation = false, // 是否包含解析
      includeAnswers = true,      // 是否包含標準答案
      questionIds = [],          // 若指定則匯出特定題
      category = "ALL",
      type = "ALL",
      random50 = false,          // 是否隨機抽取 50 題
      stats,                     // 結算統計數據 { totalScore, isPassed, correctCount, wrongCount, unanswered, elapsedSeconds, completedAt }
      items = [],                // 錯題詳細項目 Array<{ originalIndex, stem, type, optionA, optionB, optionC, optionD, userAnswer, correctAnswers, explanation }>
    } = body;

    const docChildren: any[] = [];

    // =========================================================================
    // 分支 1：50 題模擬考結算專屬「錯題報告 (Google 文件)」
    // =========================================================================
    if (reportType === "EXAM_WRONG_REPORT") {
      const title = customTitle || "60分鐘模擬考試 · 錯題檢討與深度覆盤報告";
      const subtitle = customSubtitle || "QuizMaster 個人題庫檢定系統 · Google 文件詳細分析報告";

      // 1. 大標題
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 120 },
          children: [
            new TextRun({
              text: title,
              bold: true,
              size: 36, // 18pt
              color: "0F172A",
              font: "Microsoft JhengHei",
            }),
          ],
        })
      );

      // 2. 副標題
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: subtitle,
              size: 20, // 10pt
              color: "64748B",
              font: "Microsoft JhengHei",
            }),
          ],
        })
      );

      // 3. 測驗成績與詳細數據統計表格 (Google 文件專用工整表格)
      const tableBorder = {
        style: BorderStyle.SINGLE,
        size: 4,
        color: "CBD5E1",
      };

      const cellBorders = {
        top: tableBorder,
        bottom: tableBorder,
        left: tableBorder,
        right: tableBorder,
      };

      const formatSecs = (sec?: number) => {
        if (sec === undefined || sec === null) return "未知";
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m} 分 ${s} 秒`;
      };

      const scoreValue = stats?.totalScore ?? 0;
      const isPassedValue = stats?.isPassed ?? scoreValue >= 70;
      const correctCountValue = stats?.correctCount ?? 0;
      const wrongCountValue = stats?.wrongCount ?? 0;
      const unansweredValue = stats?.unanswered ?? 0;
      const elapsedText = formatSecs(stats?.elapsedSeconds);
      const completedTimeText =
        stats?.completedAt || new Date().toLocaleString("zh-TW", { hour12: false });

      const statsTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          // Row 1: 得分與判定
          new TableRow({
            children: [
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
                borders: cellBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "測驗得分",
                        bold: true,
                        size: 20,
                        font: "Microsoft JhengHei",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                borders: cellBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${scoreValue} / 100 分`,
                        bold: true,
                        size: 22,
                        color: isPassedValue ? "047857" : "DC2626",
                        font: "Microsoft JhengHei",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
                borders: cellBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "合格判定 (70分及格)",
                        bold: true,
                        size: 20,
                        font: "Microsoft JhengHei",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                borders: cellBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: isPassedValue ? "合格通過 (PASS)" : "未達標準 (FAIL)",
                        bold: true,
                        size: 20,
                        color: isPassedValue ? "047857" : "DC2626",
                        font: "Microsoft JhengHei",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          // Row 2: 答對與答錯題數
          new TableRow({
            children: [
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
                borders: cellBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "答對題數",
                        bold: true,
                        size: 20,
                        font: "Microsoft JhengHei",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                borders: cellBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${correctCountValue} 題 (${correctCountValue * 2} 分)`,
                        size: 20,
                        color: "047857",
                        font: "Microsoft JhengHei",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
                borders: cellBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "答錯 / 未答",
                        bold: true,
                        size: 20,
                        font: "Microsoft JhengHei",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                borders: cellBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `答錯 ${wrongCountValue} 題 · 未答 ${unansweredValue} 題`,
                        size: 20,
                        color: "DC2626",
                        font: "Microsoft JhengHei",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          // Row 3: 耗時與完成時間
          new TableRow({
            children: [
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
                borders: cellBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "作答耗時",
                        bold: true,
                        size: 20,
                        font: "Microsoft JhengHei",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                borders: cellBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${elapsedText} (限時 60:00)`,
                        size: 20,
                        font: "Microsoft JhengHei",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
                borders: cellBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "完成時間",
                        bold: true,
                        size: 20,
                        font: "Microsoft JhengHei",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                borders: cellBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: completedTimeText,
                        size: 18,
                        font: "Microsoft JhengHei",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      docChildren.push(statsTable);

      // 分隔線
      docChildren.push(
        new Paragraph({
          spacing: { before: 200, after: 200 },
          border: {
            bottom: {
              color: "CBD5E1",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        })
      );

      // 4. 錯題清單章節
      if (items.length === 0) {
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({
                text: "🎉 恭喜！本次模擬考試獲得滿分 100 分，全部 50 題全數答對，無任何錯題！",
                bold: true,
                size: 24,
                color: "047857",
                font: "Microsoft JhengHei",
              }),
            ],
          })
        );
      } else {
        const hasCorrectItems = items.some((item: any) => {
          if (item.isCorrect !== undefined) return Boolean(item.isCorrect);
          if (!item.userAnswer || item.userAnswer === "未填答") return false;
          const u = String(item.userAnswer).split(",").sort().join(",");
          const c = String(item.correctAnswers || "").split(",").sort().join(",");
          return u === c;
        });

        const sectionHeading = hasCorrectItems
          ? `【完整試卷作答檢核與觀念解析】（共 ${items.length} 題）`
          : `【錯題深度檢討清單與觀念考點】（共 ${items.length} 道需強化題目）`;

        docChildren.push(
          new Paragraph({
            spacing: { before: 160, after: 140 },
            children: [
              new TextRun({
                text: sectionHeading,
                bold: true,
                size: 24,
                color: "1E293B",
                font: "Microsoft JhengHei",
              }),
            ],
          })
        );

        items.forEach((item: any, idx: number) => {
          const qNum = item.originalIndex || idx + 1;
          const typeLabel = item.type === "SINGLE" ? "單選題" : "複選題";

          const isItemCorrect =
            item.isCorrect !== undefined
              ? Boolean(item.isCorrect)
              : Boolean(
                  item.userAnswer &&
                  item.userAnswer !== "未填答" &&
                  item.correctAnswers &&
                  String(item.userAnswer).split(",").sort().join(",") ===
                    String(item.correctAnswers).split(",").sort().join(",")
                );
          const isUnanswered = !item.userAnswer || item.userAnswer === "未填答";
          const userAnsDisplay = isUnanswered ? "未填答" : item.userAnswer;
          const userStatusText = isItemCorrect
            ? "(正確 ✓)"
            : isUnanswered
            ? "(未填答 ✗)"
            : "(答錯 ✗)";
          const userStatusColor = isItemCorrect ? "047857" : "DC2626";

          // 題幹
          const stemLines = (item.stem || "").split(/\r\n|\r|\n/);
          const stemRuns: TextRun[] = [
            new TextRun({
              text: `第 ${qNum} 題. `,
              bold: true,
              size: 22,
              color: isItemCorrect ? "047857" : "DC2626",
              font: "Microsoft JhengHei",
            }),
            new TextRun({
              text: `【${typeLabel}】 `,
              bold: true,
              size: 20,
              color: item.type === "SINGLE" ? "2563EB" : "7C3AED",
              font: "Microsoft JhengHei",
            }),
          ];

          stemLines.forEach((line: string, lIdx: number) => {
            stemRuns.push(
              new TextRun({
                text: line,
                bold: true,
                size: 22,
                color: "0F172A",
                font: "Microsoft JhengHei",
                break: lIdx > 0 ? 1 : undefined,
              })
            );
          });

          docChildren.push(
            new Paragraph({
              keepNext: true,
              spacing: { before: 200, after: 80 },
              children: stemRuns,
            })
          );

          const imgPara = createImageParagraph(item.imageUrl);
          if (imgPara) {
            docChildren.push(imgPara);
          }

          // 四個選項 (A, B, C, D)
          const options = [
            { key: "A", text: item.optionA },
            { key: "B", text: item.optionB },
            { key: "C", text: item.optionC },
            { key: "D", text: item.optionD },
          ];

          options.forEach((opt) => {
            if (!opt.text) return;
            const optLines = opt.text.split(/\r\n|\r|\n/);
            const optRuns: TextRun[] = [
              new TextRun({
                text: `(${opt.key}) `,
                bold: true,
                size: 20,
                color: "334155",
                font: "Microsoft JhengHei",
              }),
            ];

            optLines.forEach((line: string, lIdx: number) => {
              optRuns.push(
                new TextRun({
                  text: line,
                  size: 20,
                  color: "1E293B",
                  font: "Microsoft JhengHei",
                  break: lIdx > 0 ? 1 : undefined,
                })
              );
            });

            docChildren.push(
              new Paragraph({
                keepLines: true,
                indent: { left: 450 },
                spacing: { after: 40 },
                children: optRuns,
              })
            );
          });

          // 對錯填答對照
          docChildren.push(
            new Paragraph({
              indent: { left: 450 },
              spacing: { before: 60, after: 40 },
              children: [
                new TextRun({
                  text: "【考生作答】：",
                  bold: true,
                  size: 20,
                  color: userStatusColor,
                  font: "Microsoft JhengHei",
                }),
                new TextRun({
                  text: `${userAnsDisplay} ${userStatusText}   `,
                  bold: true,
                  size: 20,
                  color: userStatusColor,
                  font: "Microsoft JhengHei",
                }),
                new TextRun({
                  text: "【標準答案】：",
                  bold: true,
                  size: 20,
                  color: "047857",
                  font: "Microsoft JhengHei",
                }),
                new TextRun({
                  text: `${item.correctAnswers} (標準正解)`,
                  bold: true,
                  size: 20,
                  color: "059669",
                  font: "Microsoft JhengHei",
                }),
              ],
            })
          );

          // 題目解析與觀念考點
          if (includeExplanation) {
            const expText =
              item.explanation && item.explanation.trim()
                ? item.explanation
                : "（出題者未填寫解析）";
            const expLines = expText.split(/\r\n|\r|\n/);
            const expRuns: TextRun[] = [
              new TextRun({
                text: "【題目解析與觀念】：",
                bold: true,
                size: 20,
                color: "475569",
                font: "Microsoft JhengHei",
              }),
            ];

            expLines.forEach((line: string, lIdx: number) => {
              expRuns.push(
                new TextRun({
                  text: line,
                  size: 20,
                  color: item.explanation && item.explanation.trim() ? "334155" : "94A3B8",
                  italics: !item.explanation || !item.explanation.trim(),
                  font: "Microsoft JhengHei",
                  break: lIdx > 0 ? 1 : undefined,
                })
              );
            });

            docChildren.push(
              new Paragraph({
                indent: { left: 450 },
                spacing: { after: 140 },
                children: expRuns,
              })
            );
          }

          // 間隔線
          docChildren.push(
            new Paragraph({
              spacing: { after: 120 },
            })
          );
        });
      }

      // 頁尾叮嚀
      docChildren.push(
        new Paragraph({
          spacing: { before: 240, after: 100 },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "QuizMaster 專案管理題庫系統 · 建議針對以上弱點題目精準複習，祝您下次取得滿分！",
              italics: true,
              size: 18,
              color: "64748B",
              font: "Microsoft JhengHei",
            }),
          ],
        })
      );
    } else {
      // =======================================================================
      // 分支 2：標準試卷匯出（包含隨機抓 50 題出成全真試卷功能）
      // =======================================================================
      let questions: any[] = [];

      if (random50) {
        // 隨機抽取 50 題（單選、複選混合抽樣）
        const allQuestions = await prisma.question.findMany();
        if (allQuestions.length === 0) {
          return NextResponse.json({ error: "題庫為空，無法隨機出題" }, { status: 400 });
        }

        const singles = allQuestions.filter((q) => q.type === "SINGLE");
        const multiples = allQuestions.filter((q) => q.type === "MULTIPLE");

        if (singles.length > 0 && multiples.length > 0) {
          const shuffledSingle = [...singles].sort(() => Math.random() - 0.5);
          const shuffledMulti = [...multiples].sort(() => Math.random() - 0.5);

          const minSingle = Math.min(shuffledSingle.length, 25);
          const minMulti = Math.min(shuffledMulti.length, 50 - minSingle);

          const partSingle = shuffledSingle.slice(0, minSingle);
          const partMulti = shuffledMulti.slice(0, minMulti);

          const remainingPool = [
            ...shuffledSingle.slice(minSingle),
            ...shuffledMulti.slice(minMulti),
          ].sort(() => Math.random() - 0.5);

          const needed = Math.min(50, allQuestions.length) - (partSingle.length + partMulti.length);
          questions = [...partSingle, ...partMulti, ...remainingPool.slice(0, needed)];
        } else {
          questions = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, 50);
        }

        // 再次打散順序
        questions.sort(() => Math.random() - 0.5);
      } else if (questionIds && questionIds.length > 0) {
        // 指定題號抽取（保留給定之順序）
        const dbQuestions = await prisma.question.findMany({
          where: { id: { in: questionIds } },
        });
        const idMap = new Map(dbQuestions.map((q) => [q.id, q]));
        questions = questionIds.map((id: string) => idMap.get(id)).filter(Boolean) as any[];
      } else {
        // 依類別與題型過濾抽取
        const where: any = {};
        if (category !== "ALL") where.category = category;
        if (type !== "ALL") where.type = type;

        questions = await prisma.question.findMany({
          where,
          orderBy: { createdAt: "desc" },
        });
      }

      if (questions.length === 0) {
        return NextResponse.json(
          { error: "查無符合條件的題目可供匯出" },
          { status: 400 }
        );
      }

      const title = customTitle || (random50 ? "60分鐘模擬考試檢定試卷" : "題庫測驗卷");
      const subtitle =
        customSubtitle ||
        (random50
          ? "QuizMaster 隨機 50 題全真模擬考試 · 滿分 100 分 · 限時 60 分鐘"
          : "Google 文件匯出試卷");

      // 1. 文件大標題
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 120 },
          children: [
            new TextRun({
              text: title,
              bold: true,
              size: 36, // 18pt
              color: "0F172A",
              font: "Microsoft JhengHei",
            }),
          ],
        })
      );

      // 2. 副標題與資訊列
      const infoText = `${subtitle} · 總題數：${questions.length} 題 · 匯出模式：${
        includeExplanation
          ? "含答案與詳細解析 (教師/複習卷)"
          : includeAnswers
          ? "含標準答案，隱藏解析"
          : "不含答案與解析 (純測驗題目)"
      }`;

      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: infoText,
              size: 20, // 10pt
              color: "64748B",
              font: "Microsoft JhengHei",
            }),
          ],
        })
      );

      // 3. 考生資訊填寫欄位
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "班級／群組：__________   姓名：____________   座號：______   得分：______",
              size: 20,
              color: "334155",
              font: "Microsoft JhengHei",
            }),
          ],
        })
      );

      // 4. 分隔橫線
      docChildren.push(
        new Paragraph({
          spacing: { after: 300 },
          border: {
            bottom: {
              color: "CBD5E1",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        })
      );

      // 5. 逐題輸出
      questions.forEach((q, idx) => {
        const typeLabel = q.type === "SINGLE" ? "單選題" : "複選題";

        const stemLines = q.stem.split(/\r\n|\r|\n/);
        const stemRuns: TextRun[] = [
          new TextRun({
            text: `${idx + 1}. `,
            bold: true,
            size: 22,
            color: "0F172A",
            font: "Microsoft JhengHei",
          }),
          new TextRun({
            text: `【${typeLabel}】 `,
            bold: true,
            size: 20,
            color: q.type === "SINGLE" ? "2563EB" : "7C3AED",
            font: "Microsoft JhengHei",
          }),
        ];

        stemLines.forEach((line: string, lIdx: number) => {
          stemRuns.push(
            new TextRun({
              text: line,
              bold: true,
              size: 22,
              color: "0F172A",
              font: "Microsoft JhengHei",
              break: lIdx > 0 ? 1 : undefined,
            })
          );
        });

        docChildren.push(
          new Paragraph({
            keepNext: true,
            spacing: { before: 200, after: 100 },
            children: stemRuns,
          })
        );

        const imgPara = createImageParagraph(q.imageUrl);
        if (imgPara) {
          docChildren.push(imgPara);
        }

        // 選項 A, B, C, D
        const options = [
          { key: "A", text: q.optionA },
          { key: "B", text: q.optionB },
          { key: "C", text: q.optionC },
          { key: "D", text: q.optionD },
        ];

        options.forEach((opt) => {
          const optLines = opt.text.split(/\r\n|\r|\n/);
          const optRuns: TextRun[] = [
            new TextRun({
              text: `(${opt.key}) `,
              bold: true,
              size: 20,
              color: "334155",
              font: "Microsoft JhengHei",
            }),
          ];

          optLines.forEach((line: string, lIdx: number) => {
            optRuns.push(
              new TextRun({
                text: line,
                size: 20,
                color: "1E293B",
                font: "Microsoft JhengHei",
                break: lIdx > 0 ? 1 : undefined,
              })
            );
          });

          docChildren.push(
            new Paragraph({
              keepLines: true,
              indent: { left: 450 },
              spacing: { after: 60 },
              children: optRuns,
            })
          );
        });

        // 6. 是否包含解答或解析
        if (includeExplanation || includeAnswers) {
          docChildren.push(
            new Paragraph({
              indent: { left: 450 },
              spacing: { before: 80, after: 40 },
              children: [
                new TextRun({
                  text: "【標準答案】：",
                  bold: true,
                  size: 20,
                  color: "047857",
                  font: "Microsoft JhengHei",
                }),
                new TextRun({
                  text: q.correctAnswers,
                  bold: true,
                  size: 20,
                  color: "059669",
                  font: "Microsoft JhengHei",
                }),
              ],
            })
          );
        }

        if (includeExplanation) {
          if (!q.explanation || !q.explanation.trim()) {
            docChildren.push(
              new Paragraph({
                indent: { left: 450 },
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: "【題目解析】：",
                    bold: true,
                    size: 20,
                    color: "475569",
                    font: "Microsoft JhengHei",
                  }),
                  new TextRun({
                    text: "（出題者未填寫解析）",
                    italics: true,
                    size: 20,
                    color: "94A3B8",
                    font: "Microsoft JhengHei",
                  }),
                ],
              })
            );
          } else {
            const lines = q.explanation.split(/\r\n|\r|\n/);
            const explanationRuns: TextRun[] = [
              new TextRun({
                text: "【題目解析】：",
                bold: true,
                size: 20,
                color: "475569",
                font: "Microsoft JhengHei",
              }),
            ];

            lines.forEach((line: string, lIdx: number) => {
              explanationRuns.push(
                new TextRun({
                  text: line,
                  size: 20,
                  color: "334155",
                  font: "Microsoft JhengHei",
                  break: lIdx > 0 ? 1 : undefined,
                })
              );
            });

            docChildren.push(
              new Paragraph({
                indent: { left: 450 },
                spacing: { after: 120 },
                children: explanationRuns,
              })
            );
          }
        }

        // 每題間隔微線
        docChildren.push(
          new Paragraph({
            spacing: { after: 160 },
          })
        );
      });
    }

    // 建立 docx 文件物件
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                bottom: 1440,
                left: 1440,
                right: 1440,
              },
            },
          },
          children: docChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const downloadTitle = customTitle || (reportType === "EXAM_WRONG_REPORT" ? "模擬考試錯題檢討報告" : "QuizMaster試卷");
    const safeFilename = encodeURIComponent(downloadTitle.replace(/\s+/g, "_") + ".docx");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`,
      },
    });
  } catch (error: any) {
    console.error("Export docx error:", error);
    return NextResponse.json(
      { error: "匯出 Google 文件失敗: " + error.message },
      { status: 500 }
    );
  }
}