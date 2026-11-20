export interface JuryMember {
  id: string;
  name: string;
  title: string;
  avatar: string;
  role: "chairman" | "critic" | "industry";
  institution: string;
  persona: string;
  focus: string;
  defaultSatisfaction: number;
  colorHex: string;
}

export interface DefenseRound {
  roundNumber: number;
  phaseTitle: string;
  jurySpeakerId: string;
  question: string;
  contextCodeSnippet?: {
    lang: string;
    code: string;
    caption: string;
  };
  suggestedKeywords: string[];
  placeholderExample: string;
  sampleArguments: {
    id: string;
    label: string;
    text: string;
    type: "optimal" | "acceptable" | "flawed";
  }[];
  drillDownChallenge: {
    criticJuryId: string;
    criticName: string;
    challengeTitle: string;
    criticQuestion: string;
    rebuttalOptions: {
      id: string;
      answer: string;
      score: number;
      feedback: string;
      architectureImpact: string;
    }[];
  };
  mentorHint: string;
}

export const DEFAULT_JURY: JuryMember[] = [
  {
    id: "jury-1",
    name: "TS. Trần Anh Tuấn",
    title: "Chủ tịch Hội đồng Khảo thí",
    avatar: "AT",
    role: "chairman",
    institution: "Viện Công nghệ Phần mềm & AI",
    persona: "Đánh giá kiến trúc tổng thể, thiết kế phân tầng, nguyên lý SOLID & tính mở rộng.",
    focus: "Kiến trúc Hệ thống & Design Patterns",
    defaultSatisfaction: 0,
    colorHex: "#f59e0b",
  },
  {
    id: "jury-2",
    name: "ThS. Lê Hoàng Yến",
    title: "Ủy viên Phản biện Thuật toán",
    avatar: "HY",
    role: "critic",
    institution: "Bộ môn Khoa học Máy tính",
    persona: "Phân tích sâu độ phức tạp Big-O, đồng bộ luồng, cấp phát bộ nhớ & biên lỗi.",
    focus: "Thuật toán, Cấu trúc Dữ liệu & Hiệu năng",
    defaultSatisfaction: 0,
    colorHex: "#8b5cf6",
  },
  {
    id: "jury-3",
    name: "KS. Nguyễn Bảo Long",
    title: "Chuyên gia Kiến trúc Doanh nghiệp",
    avatar: "BL",
    role: "industry",
    institution: "Kiến trúc sư Hệ thống Cấp cao",
    persona: "Kiểm định sẵn sàng vận hành thực tế, bảo mật, liêm chính Git & quy trình CI/CD.",
    focus: "Vận hành Thực tế, Bảo mật & Liêm chính Mã nguồn",
    defaultSatisfaction: 0,
    colorHex: "#10b981",
  },
];

export const DEFENSE_SCENARIOS: Record<string, DefenseRound[]> = {
  "prj-codemind": [
    {
      roundNumber: 1,
      phaseTitle: "Vòng 1: Kiến trúc Tổng thể & Socratic RAG Pipeline",
      jurySpeakerId: "jury-1",
      question:
        "Khi hàng nghìn học viên cùng đặt câu hỏi debug đồng thời, làm sao pipeline Socratic AI của bạn đảm bảo độ trễ phản hồi < 450ms mà không làm quá tải LLM Gateway?",
      contextCodeSnippet: {
        lang: "cpp",
        code: `class SocraticRAGDispatcher {
public:
    Response dispatchQuery(const StudentQuery& q) {
        auto cacheKey = hashASTContext(q.codeAST, q.errorSignal);
        if (auto hit = mL2Cache.lookup(cacheKey)) {
            return hit->synthesizeIncrementalHint(q.studentLevel);
        }
        return mVectorCluster.querySemanticNearest(q);
    }
};`,
        caption: "SocraticRAGDispatcher::dispatchQuery (Lõi điều phối RAG)",
      },
      suggestedKeywords: [
        "Multi-tier LRU Cache",
        "AST Hash",
        "Semantic Vector Qdrant",
        "Threshold > 85%",
        "Async LLM Queue",
      ],
      placeholderExample:
        "VD: Kính thưa Hội đồng, em tách Multi-tier LRU Cache ở tầng L1 kết hợp băm AST Hash qua Qdrant L2 (>85% similarity) và đẩy yêu cầu mới qua Async LLM Queue...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Cache Ngữ nghĩa Đa tầng (Tiered Semantic Cache)",
          text: "Em thiết kế Cache đa tầng: Tầng L1 LRU in-memory tại mỗi Pod xử lý lỗi cú pháp lặp lại; Tầng L2 Semantic Vector Cache băm AST Hash qua Qdrant. Chỉ khi similarity < 85% mới đưa vào Async LLM Queue.",
          type: "optimal",
        },
        {
          id: "arg-2",
          label: "Luận điểm Dùng hàng đợi RabbitMQ + HPA Scale",
          text: "Em đặt RabbitMQ đệm phía trước các worker rồi cấu hình Kubernetes HPA tự mở rộng thêm Pod khi CPU vượt 70%.",
          type: "acceptable",
        },
        {
          id: "arg-3",
          label: "Luận điểm Giới hạn 3 câu hỏi / 10 phút",
          text: "Em đặt Rate-limit cứng mỗi IP chỉ gửi tối đa 3 câu trong 10 phút để tránh quá tải máy chủ.",
          type: "flawed",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-2",
        criticName: "ThS. Lê Hoàng Yến",
        challengeTitle: "Chất vấn Thuật toán: Chuẩn hóa Cây AST",
        criticQuestion:
          "Nếu học viên cố tình đổi tên biến, chèn comment hoặc viết macro #define để né bộ băm AST Hash, em chuẩn hóa cây cú pháp thế nào để tỉ lệ Cache Hit không sụt giảm?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Tiền xử lý qua Clang AST Consumer: loại bỏ comment, alpha-conversion tên biến cục bộ (x1, x2) và khai triển macro trước khi băm MurmurHash3.",
            score: 98,
            feedback:
              "Phản biện xuất sắc! Cơ chế alpha-conversion và tiền xử lý Clang AST xử lý triệt để mã nguồn bị biến đổi bề mặt.",
            architectureImpact: "Duy trì Cache hit rate ~78% kể cả khi đổi tên biến.",
          },
          {
            id: "reb-2",
            answer: "Dùng biểu thức chính quy xóa khoảng trắng và dòng // trước khi băm SHA-256.",
            score: 60,
            feedback:
              "Chưa đủ chặt chẽ vì regex dễ cắt nhầm chuỗi literal và không chống được thay đổi thứ tự khai báo tương đương.",
            architectureImpact: "Tỉ lệ cache miss cao hơn khi sinh viên đổi tên biến.",
          },
        ],
      },
      mentorHint:
        "Nêu rõ Cache đa tầng (L1 LRU + L2 Qdrant) và kỹ thuật chuẩn hóa AST alpha-conversion.",
    },
    {
      roundNumber: 2,
      phaseTitle: "Vòng 2: Cô lập Docker Sandbox & Kiểm định vtable C++20",
      jurySpeakerId: "jury-2",
      question:
        "Trong bộ chấm tự động C++20, bạn cấu hình sandbox và phát hiện can thiệp vptr/vtable nhằm vượt test ẩn như thế nào?",
      suggestedKeywords: [
        "Linux cgroup Isolation",
        "AddressSanitizer (-fsanitize=address)",
        "ELF Symbol Layout",
        "Two-phase Execution",
      ],
      placeholderExample:
        "VD: Em chạy binary trong Linux cgroup Sandbox không mạng, biên dịch kèm -fsanitize=address,undefined và kiểm tra ABI vtable/ELF Symbol...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Cô lập cgroup + Kiểm tra ASan & ELF",
          text: "Hệ thống chạy binary trong Linux cgroup Sandbox cắt mạng, dùng cờ -fsanitize=address,undefined ở nhánh kiểm tra sâu và đối chiếu layout vptr trên bảng symbol ELF.",
          type: "optimal",
        },
        {
          id: "arg-2",
          label: "Luận điểm Quét từ khóa tĩnh reinterpret_cast",
          text: "Hệ thống chỉ quét file mã nguồn bằng regex để cấm từ khóa reinterpret_cast và từ chối biên dịch.",
          type: "flawed",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-3",
        criticName: "KS. Nguyễn Bảo Long",
        challengeTitle: "Chất vấn Vận hành: Tránh OOM khi bật AddressSanitizer",
        criticQuestion:
          "AddressSanitizer tăng RAM 2-3 lần và giảm 40% tốc độ chạy. Khi có 500 bài nộp đồng thời, làm sao tránh tràn RAM worker?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Chạy 2 pha (Two-phase Execution): Fast-path với -O2 để chấm nhanh 80% bài chuẩn; chỉ bật Deep ASan Sandbox khi phát hiện lỗi bộ nhớ hoặc bất thường ABI.",
            score: 97,
            feedback:
              "Giải pháp thực tế cao! Chiến lược Fast-path / Slow-path tiết kiệm ~70% tài nguyên RAM worker.",
            architectureImpact: "Ngăn ngừa OOM trên cụm worker khi cao điểm nộp bài.",
          },
          {
            id: "reb-2",
            answer: "Giới hạn cứng 64MB RAM cho mọi container ASan để bảo vệ host.",
            score: 55,
            feedback: "Shadow memory của ASan cần nhiều RAM hơn 64MB, dễ gây chết oan bài hợp lệ.",
            architectureImpact: "Tăng tỉ lệ False Positive (~35%).",
          },
        ],
      },
      mentorHint:
        "Tách luồng chạy nhanh (-O2) và luồng chẩn đoán sâu (ASan) để cân bằng tải RAM.",
    },
    {
      roundNumber: 3,
      phaseTitle: "Vòng 3: Liêm chính Học thuật & Quy trình Anti-Freerider",
      jurySpeakerId: "jury-3",
      question:
        "Hội đồng căn cứ vào bằng chứng nào để xác thực thành viên tự phát triển mã nguồn, thay vì sao chép từ AI hoặc dựa dẫm đồng đội?",
      suggestedKeywords: [
        "Git Commit Cadence",
        "Git Proof Gate",
        "H2 Dependency Guard",
        "Dual Grading Rubric",
      ],
      placeholderExample:
        "VD: Hệ thống đối chiếu Git Commit Cadence từng PR, chặn chuyển Done bằng Git Proof Gate, kiểm tra H2 Dependency Guard và hỏi xoáy trực tiếp...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Bằng chứng Kép (Git Telemetry + Phản biện Trực tiếp)",
          text: "Kết hợp lịch sử Git Commit Cadence theo từng PR gắn task Kanban qua Git Proof Gate, ràng buộc H2 Dependency Guard và điểm tổng hợp Dual Grading Rubric từ phiên vấn đáp trực tiếp.",
          type: "optimal",
        },
        {
          id: "arg-2",
          label: "Luận điểm Dựa trên bản cam kết và báo cáo Word",
          text: "Sinh viên nộp báo cáo Word mô tả chức năng và ký cam kết tự làm đồ án.",
          type: "flawed",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-1",
        criticName: "TS. Trần Anh Tuấn",
        challengeTitle: "Chất vấn Bảo mật: Chia nhỏ code AI rồi commit dần",
        criticQuestion:
          "Nếu sinh viên tạo mã bằng chatbot rồi chia nhỏ commit đều đặn qua nhiều ngày, hệ thống phát hiện lỗ hổng lệch năng lực bằng cách nào?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Cơ chế Chấm Kép (auto_flag_discrepancy_threshold) tự động gắn cờ khi độ lệch giữa điểm CI/CD và điểm giải thích trực tiếp tại Hội đồng vượt ngưỡng 25%.",
            score: 99,
            feedback:
              "Chính xác! Khi không tự hiểu thiết kế lõi, thí sinh sẽ lộ khoảng trống ở vòng chất vấn vặn lại.",
            architectureImpact: "Đảm bảo chuẩn đầu ra thực chất với cơ chế gắn cờ Chấm Kép.",
          },
          {
            id: "reb-2",
            answer: "Dùng công cụ kiểm tra phần trăm đạo văn text trực tuyến trên toàn bộ repo.",
            score: 52,
            feedback:
              "Công cụ kiểm tra đạo văn text có tỉ lệ sai số rất lớn với mã nguồn kỹ thuật.",
            architectureImpact: "Thiếu bằng chứng thuyết phục khi phản biện hội đồng.",
          },
        ],
      },
      mentorHint:
        "Nhấn mạnh cơ chế đối chiếu điểm CI/CD với điểm trả lời biến thể trực tiếp tại Hội đồng.",
    },
  ],

  "prj-medai": [
    {
      roundNumber: 1,
      phaseTitle: "Vòng 1: Kiến trúc Phân loại X-Quang & Hybrid Medical RAG",
      jurySpeakerId: "jury-1",
      question:
        "Với đồ án MedAI kết hợp mô hình thị giác phân loại ảnh X-Quang phổi và RAG truy xuất phác đồ y khoa, bạn ngăn ảo giác (hallucination) của LLM khi sinh chẩn đoán hỗ trợ bác sĩ ra sao?",
      contextCodeSnippet: {
        lang: "python",
        code: `def ground_medical_response(xray_logits, query_vec, threshold=0.78):
    findings = decode_chexnet_probs(xray_logits)
    docs = pgvector_hybrid_search(query_vec, min_cosine=threshold)
    if not docs:
        return SafeFallback("Không đủ y văn đạt ngưỡng tin cậy 0.78.")
    return synthesize_with_strict_citations(findings, docs)`,
        caption: "ground_medical_response (Pipeline ràng buộc trích dẫn y văn)",
      },
      suggestedKeywords: [
        "pgvector Hybrid Search",
        "Threshold Similarity >= 0.78",
        "Strict Citation Grounding",
        "Grad-CAM Explainability",
      ],
      placeholderExample:
        "VD: Em áp dụng pgvector Hybrid Search kèm lọc ngưỡng similarity >= 0.78, bắt buộc trích dẫn từng đoạn y văn và hiển thị bản đồ nhiệt Grad-CAM...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Strict Grounding + Grad-CAM",
          text: "Kết hợp pgvector Hybrid Search (BM25 + dense vector) với ngưỡng cosine >= 0.78, bắt buộc mọi khẳng định y khoa phải có trích dẫn chunk gốc và kèm heatmap Grad-CAM trên vùng tổn thương X-Quang.",
          type: "optimal",
        },
        {
          id: "arg-2",
          label: "Luận điểm Nhắc nhở trong System Prompt",
          text: "Em thêm dòng nhắc LLM không được bịa thông tin y khoa vào đầu prompt hệ thống.",
          type: "flawed",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-2",
        criticName: "ThS. Lê Hoàng Yến",
        challengeTitle: "Chất vấn Dữ liệu Y khoa: Xử lý mất cân bằng nhãn hiếm",
        criticQuestion:
          "Trong tập X-Quang phổi, các bệnh hiếm chiếm < 3% mẫu khiến mô hình dễ đạt Accuracy cao giả tạo nhưng Recall cực thấp. Bạn tối ưu hàm mất mát và đánh giá thế nào?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Sử dụng Focal Loss kết hợp Class-Balanced Weights và tối ưu ngưỡng quyết định theo AUROC / F2-Score để ưu tiên độ nhạy (Recall) tránh bỏ sót ca bệnh.",
            score: 96,
            feedback: "Xử lý chuẩn y sinh! Tối ưu AUROC/Recall là bắt buộc trong bài toán sàng lọc lâm sàng.",
            architectureImpact: "Giảm tỷ lệ âm tính giả (False Negative) trên nhóm bệnh hiếm.",
          },
          {
            id: "reb-2",
            answer: "Nhân bản ảnh bệnh hiếm y hệt nhau lên 20 lần rồi train Cross-Entropy thông thường.",
            score: 58,
            feedback: "Oversampling trùng lặp dễ gây overfit nặng ở mô hình CNN/ViT.",
            architectureImpact: "Mô hình học vẹt ảnh cũ, tổng quát hóa kém trên bệnh viện mới.",
          },
        ],
      },
      mentorHint: "Kết hợp ngưỡng cosine RAG, Grad-CAM giải thích vùng phổi và Focal Loss / Recall.",
    },
    {
      roundNumber: 2,
      phaseTitle: "Vòng 2: Bảo mật Bệnh án DICOM & Độ trễ Suy luận",
      jurySpeakerId: "jury-3",
      question:
        "Ảnh DICOM chứa thông tin định danh bệnh nhân (PII) và kích thước lớn. Hệ thống xử lý ẩn danh dữ liệu và suy luận dưới 800ms ra sao?",
      suggestedKeywords: [
        "DICOM Metadata Stripping",
        "ONNX / TensorRT FP16",
        "PII Guardrail",
        "Async Queue Inference",
      ],
      placeholderExample:
        "VD: Tiền xử lý gỡ bỏ thẻ PII DICOM ngay tại gateway, nén FP16 chạy ONNX/TensorRT và lưu tách biệt khóa bệnh nhân...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Ẩn danh DICOM + Tối ưu ONNX FP16",
          text: "Strip toàn bộ DICOM patient metadata (PII Guardrail) trước khi đưa ảnh vào lưu trữ, đồng thời export mô hình sang ONNX/TensorRT FP16 giúp giảm 3x độ trễ suy luận.",
          type: "optimal",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-3",
        criticName: "KS. Nguyễn Bảo Long",
        challengeTitle: "Chất vấn Production: Trách nhiệm pháp lý AI hỗ trợ",
        criticQuestion:
          "Nếu mô hình MedAI tự tin 92% bệnh nhân bình thường nhưng thực tế có nốt mờ nhỏ, thiết kế UI và cảnh báo cần gì để không gây sai sót lâm sàng?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Luôn hiển thị nhãn hỗ trợ tham khảo (Decision Support), kèm phân bố xác suất đa nhãn, vùng chú ý Grad-CAM và bắt buộc bác sĩ xác nhận trước khi xuất phiếu.",
            score: 97,
            feedback: "Tư duy Human-in-the-loop cực kỳ chuẩn xác cho hệ thống y tế.",
            architectureImpact: "Đạt chuẩn an toàn vận hành lâm sàng Human-in-the-loop.",
          },
        ],
      },
      mentorHint: "Tập trung vào DICOM PII stripping, FP16 inference và xác nhận của bác sĩ.",
    },
  ],

  "prj-ecommerce": [
    {
      roundNumber: 1,
      phaseTitle: "Vòng 1: Saga Orchestrator & Tính nhất quán Phân tán",
      jurySpeakerId: "jury-1",
      question:
        "Trong hệ thống Microservices Thương mại điện tử, nếu Payment Service đã trừ tiền thành công nhưng Inventory Service bị lỗi, Saga Orchestrator xử lý giao dịch bù trừ ra sao để không mất tiền của khách?",
      contextCodeSnippet: {
        lang: "typescript",
        code: `async function handleOrderSaga(orderId: string) {
  await outboxPublish("payment.debit", { orderId, idempotencyKey: orderId });
  const inv = await rpcReserveInventory(orderId);
  if (!inv.ok) {
    await outboxPublish("payment.compensate", { orderId, idempotencyKey: \`refund-\${orderId}\` });
  }
}`,
        caption: "handleOrderSaga (Luồng Saga bù trừ với Idempotency Key)",
      },
      suggestedKeywords: [
        "Orchestrated Saga",
        "Transactional Outbox",
        "Compensating Transaction",
        "Idempotency Key",
      ],
      placeholderExample:
        "VD: Em dùng Orchestrated Saga kết hợp Transactional Outbox và Idempotency Key khi phát lệnh Compensating Transaction qua Kafka...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Orchestrated Saga + Transactional Outbox",
          text: "Áp dụng Orchestrated Saga kèm Transactional Outbox và Idempotency Key để phát lệnh Compensating Transaction qua Kafka topic hoàn tiền an toàn, không hoàn tiền trùng.",
          type: "optimal",
        },
        {
          id: "arg-2",
          label: "Luận điểm Two-Phase Commit (2PC) qua HTTP",
          text: "Em dùng Two-Phase Commit khóa bảng thanh toán và tồn kho đồng bộ qua REST giữa các microservice.",
          type: "flawed",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-3",
        criticName: "KS. Nguyễn Bảo Long",
        challengeTitle: "Chất vấn Phân tán: Mất gói tin khi Network Partition",
        criticQuestion:
          "Nếu ngay lúc gửi lệnh hoàn tiền thì mạng nội bộ gián đoạn khiến Kafka không nhận ACK, giải pháp nào bảo đảm lệnh hoàn tiền không rơi mất?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Ghi trạng thái Outbox chung một Local ACID Transaction với đơn hàng, dùng Polling/Debezium retry theo Exponential Backoff và đưa sự kiện lỗi dai dẳng sang Dead Letter Queue (DLQ).",
            score: 98,
            feedback: "Chuẩn mực Enterprise cho bài toán Distributed Transaction.",
            architectureImpact: "Bảo đảm giao dịch At-Least-Once + Idempotent không thất thoát.",
          },
          {
            id: "reb-2",
            answer: "Try/catch lỗi mạng rồi ghi log ra console để vận hành tự kiểm tra cuối ngày.",
            score: 54,
            feedback: "Ghi log thủ công sẽ làm treo tiền khách hàng và dễ thất thoát khi restart pod.",
            architectureImpact: "Gây sai lệch đối soát thanh toán.",
          },
        ],
      },
      mentorHint: "Kết hợp Transactional Outbox + Idempotency Key + Dead Letter Queue.",
    },
    {
      roundNumber: 2,
      phaseTitle: "Vòng 2: Chống Bán Âm Kho Hàng khi Flash Sale bằng Redis",
      jurySpeakerId: "jury-2",
      question:
        "Khi 10.000 người mua cùng một sản phẩm Flash Sale chỉ còn 50 suất, Redis và CSDL xử lý tranh chấp đồng thời thế nào để tồn kho không âm?",
      suggestedKeywords: [
        "Redis Lua Script",
        "Atomic DECR",
        "Optimistic Locking",
        "Rate Limiter Token Bucket",
      ],
      placeholderExample:
        "VD: Em thực thi kiểm tra và trừ tồn kho nguyên tử bằng Redis Lua Script kèm Optimistic Locking ở MySQL...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Redis Lua Atomic + Optimistic Locking",
          text: "Thực thi kiểm tra > 0 và DECR nguyên tử bằng Redis Lua Script ở tầng edge, đồng thời xác thực lại bằng Optimistic Locking (version/stock >= qty) khi chốt ghi xuống MySQL.",
          type: "optimal",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-2",
        criticName: "ThS. Lê Hoàng Yến",
        challengeTitle: "Chất vấn CSDL: Redis khởi động lại mất key tồn kho",
        criticQuestion:
          "Nếu Redis node bị sập giữa phiên Flash Sale và bật lại chậm, bạn đồng bộ lại tồn kho chuẩn từ MySQL mà không khóa toàn hệ thống ra sao?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Kích hoạt AOF everysec kèm single-flight cache warm-up trực tiếp từ MySQL (trừ các đơn đang xử lý trên queue) và fallback về MySQL row lock tạm thời.",
            score: 95,
            feedback: "Xử lý failover rất chắc chắn với single-flight chống Thundering Herd.",
            architectureImpact: "Không xảy ra hiệu ứng sập dây chuyền khi Redis failover.",
          },
        ],
      },
      mentorHint: "Dùng Lua Script đảm bảo thao tác atomic trên Redis và single-flight warm-up.",
    },
  ],

  "prj-compiler": [
    {
      roundNumber: 1,
      phaseTitle: "Vòng 1: Quản trị Bảng Ký hiệu Đa Tầm & Phục hồi Lỗi AST",
      jurySpeakerId: "jury-1",
      question:
        "Trong trình biên dịch Mini C++ tự viết, bạn thiết kế cây AST và bảng ký hiệu (Symbol Table) ra sao để xử lý biến trùng tên ở các block lồng nhau (nested scope) và không rò rỉ bộ nhớ khi gặp lỗi cú pháp?",
      contextCodeSnippet: {
        lang: "cpp",
        code: `struct ScopeGuard {
    SymbolTable& sym;
    explicit ScopeGuard(SymbolTable& s) : sym(s) { sym.pushScope(); }
    ~ScopeGuard() { sym.popScope(); }
};`,
        caption: "ScopeGuard (RAII tự động thu hồi scope lồng nhau)",
      },
      suggestedKeywords: [
        "Symbol Table Stack",
        "Arena Allocator",
        "RAII ScopeGuard",
        "Recursive Descent Panic-Mode",
      ],
      placeholderExample:
        "VD: Em thiết kế Symbol Table dạng stack các hash scope, cấp phát nút AST trên Arena Allocator và phục hồi lỗi cú pháp Panic-Mode...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Arena Allocator + ScopeGuard RAII",
          text: "Em dùng Arena Allocator quản lý toàn bộ nút AST để giải phóng O(1) khi xong hoặc hủy bỏ, kết hợp Symbol Table stack kèm RAII ScopeGuard và phục hồi lỗi Panic-Mode báo nhiều lỗi cùng lúc.",
          type: "optimal",
        },
        {
          id: "arg-2",
          label: "Luận điểm Dùng new/delete và dừng ngay ở lỗi đầu tiên",
          text: "Mỗi node AST cấp phát bằng new/delete thủ công và ném exception dừng parser ngay khi gặp lỗi cú pháp đầu tiên.",
          type: "flawed",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-2",
        criticName: "ThS. Lê Hoàng Yến",
        challengeTitle: "Chất vấn Biên dịch: Giải quyết Dangling-Else & Operator Precedence",
        criticQuestion:
          "Làm sao bộ phân tích cú pháp xử lý nhập nhằng if-else lồng nhau và độ ưu tiên toán tử đa tầng mà không làm cây AST sai ngữ nghĩa?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Gắn else với if gần nhất trong nhánh recursive descent và dùng Pratt Parsing (Top-Down Operator Precedence) giúp bảng độ ưu tiên mở rộng tuyến tính O(n).",
            score: 97,
            feedback: "Pratt Parsing kết hợp gắn else gần nhất là thiết kế sạch và dễ mở rộng nhất.",
            architectureImpact: "Loại bỏ hoàn toàn xung đột Shift/Reduce khi thêm toán tử mới.",
          },
          {
            id: "reb-2",
            answer: "Bắt buộc người dùng luôn viết ngoặc nhọn cho mọi câu lệnh if/else và ngoặc tròn cho biểu thức.",
            score: 58,
            feedback: "Thay đổi chuẩn ngôn ngữ để né bài toán parser khiến trải nghiệm C++ không chuẩn xác.",
            architectureImpact: "Không biên dịch được nhiều chương trình Mini C++ hợp lệ.",
          },
        ],
      },
      mentorHint: "Nêu bật Arena Allocator, RAII ScopeGuard và Pratt Parsing.",
    },
    {
      roundNumber: 2,
      phaseTitle: "Vòng 2: Trực quan hóa AST & Sinh mã Trung gian TAC",
      jurySpeakerId: "jury-3",
      question:
        "Làm sao giao diện AST Visualizer đồng bộ chính xác từng node cây cú pháp với dòng mã nguồn khi sinh mã trung gian 3 địa chỉ (TAC)?",
      suggestedKeywords: [
        "SourceSpan Line:Col",
        "Three-Address Code (TAC)",
        "SSA Optimization",
        "JSON AST Export",
      ],
      placeholderExample:
        "VD: Mỗi nút AST đều gắn SourceSpan (startLine, startCol, endCol) ánh xạ 1-1 tới lệnh TAC và xuất JSON sang UI đồ họa...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm SourceSpan Tracking + TAC Exporter",
          text: "Mỗi node AST lưu metadata SourceSpan chính xác tới từng token và truyền ID xuống sinh mã TAC/IR, cho phép UI highlight đồng thời cả dòng code C++ lẫn nhánh đồ thị AST.",
          type: "optimal",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-3",
        criticName: "KS. Nguyễn Bảo Long",
        challengeTitle: "Chất vấn An toàn: Chống đứng trình duyệt với AST quá sâu",
        criticQuestion:
          "Nếu sinh viên nộp đoạn mã đệ quy ngoặc lồng 10.000 cấp gây tràn stack parser C++, bạn bảo vệ tiến trình backend như thế nào?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Áp dụng bộ đếm MaxRecursionDepth (vd 256 tầng) ngay trong Parser kết hợp timeout sandbox để báo lỗi sớm có kiểm soát thay vì Stack Overflow.",
            score: 96,
            feedback: "Chính xác! Chặn độ sâu phân tích cú pháp bảo vệ dịch vụ biên dịch khỏi DoS.",
            architectureImpact: "An toàn tuyệt đối trước input độc hại.",
          },
        ],
      },
      mentorHint: "Nhấn mạnh SourceSpan và giới hạn MaxRecursionDepth chống DoS.",
    },
  ],

  "prj-pintos": [
    {
      roundNumber: 1,
      phaseTitle: "Vòng 1: Priority Donation & Tránh Deadlock Khóa Đồng Bộ",
      jurySpeakerId: "jury-2",
      question:
        "Trong kernel PintOS, khi xảy ra Priority Inversion qua nhiều tầng khóa lồng nhau (nested locks), thuật toán Priority Donation lan truyền mức ưu tiên và thu hồi khi nhả khóa ra sao?",
      contextCodeSnippet: {
        lang: "c",
        code: `void donate_priority_chain(struct thread *holder, int max_depth) {
  for (int d = 0; d < max_depth && holder && holder->waiting_lock; d++) {
    struct thread *next = holder->waiting_lock->holder;
    if (!next || next->priority >= holder->priority) break;
    next->priority = holder->priority;
    holder = next;
  }
}`,
        caption: "donate_priority_chain (Lan truyền priority tối đa 8 tầng)",
      },
      suggestedKeywords: [
        "Priority Inversion",
        "Nested Priority Donation",
        "Lock List Removal",
        "Disable Interrupts / Spinlock",
      ],
      placeholderExample:
        "VD: Em lưu danh sách donations theo lock đang giữ, lan truyền ưu tiên tối đa 8 tầng qua waiting_lock và tính lại max priority khi lock_release...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Chain Donation + Tái tính Priority từ danh sách Donations",
          text: "Mỗi thread giữ danh sách các donor đang chờ trên lock; khi acquire lock bị giữ sẽ lan truyền priority tối đa 8 cấp qua waiting_lock và khi lock_release chỉ xóa donor thuộc lock đó rồi cập nhật priority lớn nhất còn lại.",
          type: "optimal",
        },
        {
          id: "arg-2",
          label: "Luận điểm Lưu biến old_priority duy nhất",
          text: "Chỉ lưu 1 biến old_priority trên thread và trả về giá trị cũ ngay khi nhả khóa.",
          type: "flawed",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-2",
        criticName: "ThS. Lê Hoàng Yến",
        challengeTitle: "Chất vấn Kernel: Tắt ngắt vs Race Condition ở Ready List",
        criticQuestion:
          "Tại sao trong một số thao tác trên ready_list của PintOS cần intr_disable thay vì lock thông thường, và nếu quên khôi phục mức interrupt thì hệ thống gặp sự cố gì?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Ngắt (interrupt handler) không được phép ngủ (sleep) trên semaphore/lock nên đồng bộ giữa timer interrupt và thread phải dùng intr_disable ngắn hạn và khôi phục intr_level cũ.",
            score: 98,
            feedback: "Hiểu cực sâu bản chất kernel OS! Interrupt context không bao giờ được block.",
            architectureImpact: "Loại trừ Panic Kernel trong ngữ cảnh ngắt timer.",
          },
          {
            id: "reb-2",
            answer: "Dùng intr_disable toàn cục cho mọi hàm hệ thống cho đến khi tiến trình kết thúc.",
            score: 52,
            feedback: "Tắt ngắt quá lâu khiến timer tick mất tác dụng và treo toàn bộ hệ điều hành.",
            architectureImpact: "Gây đóng băng hệ thống scheduler.",
          },
        ],
      },
      mentorHint: "Phân biệt multiple donations trên nhiều lock khác nhau và giới hạn ngữ cảnh ngắt.",
    },
    {
      roundNumber: 2,
      phaseTitle: "Vòng 2: Bộ nhớ Ảo (Virtual Memory), Page Fault & Swap",
      jurySpeakerId: "jury-1",
      question:
        "Làm sao Supplemental Page Table và Frame Table xử lý an toàn khi 2 tiến trình chạm Page Fault đồng thời trong lúc chọn frame nạn nhân để đẩy ra Swap?",
      suggestedKeywords: [
        "Supplemental Page Table",
        "Clock Page Replacement",
        "Frame Pinning during Syscall",
        "Lazy Loading",
      ],
      placeholderExample:
        "VD: Em cài đặt Lazy Loading kết hợp Pinning Frame trong lúc đang chạy Syscall I/O để frame không bị đẩy nhầm ra Swap...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Clock Eviction + Frame Pinning trong Syscall",
          text: "Kết hợp Supplemental Page Table cho Lazy Loading và Clock Replacement trên Frame Table; mọi buffer người dùng đang đọc/ghi I/O đều được đánh dấu pin=true để tránh bị evict giữa chừng gây Page Fault trong file system.",
          type: "optimal",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-3",
        criticName: "KS. Nguyễn Bảo Long",
        challengeTitle: "Chất vấn Bảo mật Kernel: Validate Con trỏ từ User Space",
        criticQuestion:
          "Nếu chương trình user truyền con trỏ NULL hoặc địa chỉ nằm trong PHYS_BASE vào syscall write(), bạn chặn lỗi trước khi làm crash kernel bằng cách nào?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Kiểm tra is_user_vaddr(uaddr) và từng byte/page của buffer trước khi copy hoặc đặt xử lý exception trong kernel để thoát tiến trình user sạch với mã -1.",
            score: 97,
            feedback: "An toàn hệ điều hành chuẩn mực! User không thể đánh sập kernel.",
            architectureImpact: "Vượt qua toàn bộ test bảo mật bad-ptr & multi-oom.",
          },
        ],
      },
      mentorHint: "Nhấn mạnh Frame Pinning khi I/O và kiểm tra is_user_vaddr ở Syscall.",
    },
  ],

  "prj-security": [
    {
      roundNumber: 1,
      phaseTitle: "Vòng 1: Bộ Quét Lỗ Hổng OWASP Top 10 & Kiểm soát An toàn DAST",
      jurySpeakerId: "jury-3",
      question:
        "Khi công cụ DAST gửi hàng loạt payload kiểm thử SQLi, XSS và SSRF tới ứng dụng mục tiêu, làm sao tránh làm sập dữ liệu production hoặc sinh ra hàng trăm cảnh báo giả (False Positive)?",
      contextCodeSnippet: {
        lang: "python",
        code: `def verify_sqli_boolean_differential(probe_fn, base_url):
    r_true = probe_fn(base_url, "' OR 1=1-- ")
    r_false = probe_fn(base_url, "' AND 1=2-- ")
    return abs(len(r_true.body) - len(r_false.body)) > 40 and r_true.status == 200`,
        caption: "verify_sqli_boolean_differential (Kiểm chứng đối xứng giảm False Positive)",
      },
      suggestedKeywords: [
        "Non-destructive Payloads",
        "Boolean / Time Differential",
        "SSRF Target Allowlist",
        "JWT Signature & RBAC Check",
      ],
      placeholderExample:
        "VD: Em dùng payload không phá hủy (time/boolean differential), đối chiếu chéo response để lọc False Positive và giới hạn phạm vi qua Allowlist...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Payload Không phá hủy + Differential Verification",
          text: "Chỉ dùng payload không phá hủy (tránh DROP/DELETE), xác minh lỗ hổng bằng Boolean/Time Differential 2 cặp và khóa chặt domain quét qua Scope Allowlist kèm rate-limit.",
          type: "optimal",
        },
        {
          id: "arg-2",
          label: "Luận điểm Chạy full danh sách payload mặc định",
          text: "Gửi toàn bộ payload từ từ điển công khai vào tất cả form và báo lỗi mỗi khi thấy status 500.",
          type: "flawed",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-2",
        criticName: "ThS. Lê Hoàng Yến",
        challengeTitle: "Chất vấn An toàn: Chống lỗ hổng SSRF ngược trên chính Server Quét",
        criticQuestion:
          "Vì công cụ DAST cho phép người dùng nhập URL đích để quét, kẻ tấn công có thể nhập http://169.254.169.254 để đọc metadata cloud nội bộ. Bạn ngăn chặn thế nào?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Phân giải DNS trước khi kết nối, chặn dải IP Private/Loopback/Link-Local (127.0.0.0/8, 10.0.0.0/8, 169.254.0.0/16) và tắt HTTP Redirect tự động tránh DNS Rebinding.",
            score: 99,
            feedback: "Phòng thủ SSRF chuẩn công nghiệp, chặn được cả kỹ thuật redirect bypass.",
            architectureImpact: "An toàn tuyệt đối trước tấn công SSRF vào hạ tầng nội bộ.",
          },
          {
            id: "reb-2",
            answer: "Kiểm tra chuỗi URL nếu không chứa chữ localhost thì cho phép quét.",
            score: 50,
            feedback: "Có thể bị qua mặt dễ dàng bằng 127.0.0.1, [::1] hoặc domain trỏ IP nội bộ.",
            architectureImpact: "Vẫn còn lỗ hổng SSRF nghiêm trọng.",
          },
        ],
      },
      mentorHint: "Nêu bật xác minh chéo Boolean Differential và chặn IP nội bộ sau khi phân giải DNS.",
    },
    {
      roundNumber: 2,
      phaseTitle: "Vòng 2: Tích hợp CI/CD Security Gate & Quét Bí mật (Secrets)",
      jurySpeakerId: "jury-1",
      question:
        "Trong pipeline CI/CD DevSecOps, tiêu chí nào quyết định Security Gate tự động chặn Merge PR ngay trên Git Project Hub?",
      suggestedKeywords: [
        "CVSS Severity Threshold",
        "Secrets Entropy Scanning",
        "SARIF Report Artifact",
        "Zero-downtime Patch",
      ],
      placeholderExample:
        "VD: Security Gate xuất báo cáo SARIF và chặn Merge PR khi phát hiện lỗ hổng mức High/Critical (>= CVSS 7.0) hoặc API Key rò rỉ...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Security Gate theo CVSS + SARIF Report",
          text: "Pipeline tự xuất báo cáo SARIF, chặn Merge ngay khi xuất hiện lỗi Critical/High hoặc phát hiện secret API key bằng entropy/regex, đồng thời gợi ý bản vá trực tiếp trên PR.",
          type: "optimal",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-3",
        criticName: "KS. Nguyễn Bảo Long",
        challengeTitle: "Chất vấn Quy trình: Xử lý lỗ hổng tồn đọng nhưng cần vá gấp",
        criticQuestion:
          "Nếu một thư viện bên thứ 3 dính cảnh báo High nhưng chưa có bản vá mới, quy trình xử lý ngoại lệ tạm thời có kiểm soát như thế nào?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Bổ sung cơ chế Risk Acceptance có thời hạn (expiry date), ghi nhận Audit Log kèm biện pháp giảm thiểu ở lớp WAF/Config để theo dõi chặt chẽ.",
            score: 96,
            feedback: "Thực tế và đúng chuẩn quản trị rủi ro DevSecOps.",
            architectureImpact: "Không làm tắc nghẽn hotfix khẩn cấp nhưng vẫn giữ vết kiểm toán.",
          },
        ],
      },
      mentorHint: "Nêu rõ ngưỡng CVSS, chuẩn SARIF và ngoại lệ có thời hạn (expiry + audit log).",
    },
  ],

  "prj-faceattend": [
    {
      roundNumber: 1,
      phaseTitle: "Vòng 1: Lượng tử hóa MobileFaceNet INT8 trên Raspberry Pi 4",
      jurySpeakerId: "jury-2",
      question:
        "Làm sao mô hình nhận diện khuôn mặt MobileFaceNet chạy mượt > 15 FPS trên Raspberry Pi 4 không GPU rời mà vẫn giữ độ chính xác nhận diện trong lớp học?",
      contextCodeSnippet: {
        lang: "python",
        code: `# Pipeline tối ưu Edge trên Raspberry Pi 4
aligned_face = mtcnn_or_scrfd_align(frame_roi)
emb = ort_int8_session.run(None, {"input": aligned_face})[0]
score = cosine_similarity(emb, enrolled_embeddings_matrix)`,
        caption: "Edge Inference Loop (Tách detection theo chu kỳ + ONNX INT8)",
      },
      suggestedKeywords: [
        "Post-Training Quantization INT8",
        "ONNX Runtime / NCNN",
        "ROI Tracking Skip-Frame",
        "Cosine Vector Embedding",
      ],
      placeholderExample:
        "VD: Em lượng tử hóa mô hình sang ONNX INT8 bằng NCNN/ONNX Runtime và áp dụng Skip-Frame kết hợp theo dõi ROI để tăng FPS...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm INT8 Quantization + Tracking Skip-Frame",
          text: "Dùng Post-Training Quantization ép về INT8 chạy trên NCNN/ONNX Runtime đa nhân ARM, kết hợp phát hiện khuôn mặt mỗi 4 frame kèm tracking nhẹ để duy trì > 18 FPS.",
          type: "optimal",
        },
        {
          id: "arg-2",
          label: "Luận điểm Chạy PyTorch FP32 nguyên bản trên toàn khung hình",
          text: "Em giữ nguyên mô hình PyTorch FP32 và chạy full detection trên mọi frame hình ảnh.",
          type: "flawed",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-3",
        criticName: "KS. Nguyễn Bảo Long",
        challengeTitle: "Chất vấn An ninh: Chống Gian lận Điểm danh bằng Ảnh / Video Điện thoại",
        criticQuestion:
          "Nếu sinh viên đưa ảnh chân dung hoặc video quay sẵn trên màn hình điện thoại trước camera Pi 4, hệ thống Anti-Spoofing ngăn giả mạo bằng cách nào?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Tích hợp Liveness Detection nhẹ: kiểm tra biến thiên chớp mắt/chuyển động đầu ngẫu nhiên (active challenge) kèm phân loại texture Moiré màn hình (FAS-Net mini).",
            score: 98,
            feedback: "Tuyệt vời! Kết hợp Liveness chủ động và nhận diện Moiré rất hiệu quả trên Pi 4.",
            architectureImpact: "Chặn triệt để gian lận điểm danh bằng ảnh/video màn hình.",
          },
          {
            id: "reb-2",
            answer: "Tăng ngưỡng cosine similarity từ 0.5 lên 0.9.",
            score: 54,
            feedback: "Ảnh chụp sắc nét vẫn cho vector cosine rất cao, không ngăn được giả mạo.",
            architectureImpact: "Dễ bỏ sót người thật ngoài trời nhưng vẫn lọt ảnh in sắc nét.",
          },
        ],
      },
      mentorHint: "Kết hợp lượng tử hóa INT8, Skip-Frame tracking và Liveness Anti-Spoofing.",
    },
    {
      roundNumber: 2,
      phaseTitle: "Vòng 2: Đồng bộ Offline-First & Quyền riêng tư Khuôn mặt",
      jurySpeakerId: "jury-1",
      question:
        "Khi mạng Wi-Fi phòng học chập chờn và yêu cầu bảo vệ dữ liệu sinh trắc học cá nhân, Pi 4 lưu trữ vector embedding và đồng bộ về Server ra sao?",
      suggestedKeywords: [
        "Edge Vector SQLite Queue",
        "No Raw Face Image Storage",
        "HTTPS + Mutual Auth",
        "Idempotent Sync",
      ],
      placeholderExample:
        "VD: Thiết bị Edge chỉ lưu vector đặc trưng mã hóa trong hàng đợi SQLite cục bộ, xóa ảnh thô ngay sau nhận diện và đồng bộ theo batch có idempotency...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Chỉ lưu Vector + Hàng đợi Đồng bộ Offline",
          text: "Thiết bị chỉ giữ Vector Embedding đã mã hóa (không lưu ảnh thô), ghi log điểm danh vào bộ đệm SQLite cục bộ khi rớt mạng và đồng bộ batch an toàn qua HTTPS kèm idempotency token khi có mạng.",
          type: "optimal",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-1",
        criticName: "TS. Trần Anh Tuấn",
        challengeTitle: "Chất vấn Kiến trúc: Bổ sung sinh viên mới giữa học kỳ",
        criticQuestion:
          "Làm sao cập nhật thêm vector của sinh viên mới đăng ký học phần xuống 15 máy Pi 4 ở các phòng mà không phải nạp lại mô hình?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Chỉ đồng bộ danh sách Vector Embedding thay đổi theo delta version API khi mở ca điểm danh, hoàn tất trong vài trăm mili-giây.",
            score: 96,
            feedback: "Tối ưu băng thông và tách biệt hoàn toàn dữ liệu vector khỏi trọng số mô hình.",
            architectureImpact: "Triển khai thêm sinh viên tức thời không gián đoạn lớp học.",
          },
        ],
      },
      mentorHint: "Không lưu ảnh khuôn mặt thô và cập nhật vector embedding theo delta version.",
    },
  ],

  "prj-devnet": [
    {
      roundNumber: 1,
      phaseTitle: "Vòng 1: Thiết kế Cấu trúc Cây Fork Snippet & WebSocket Real-time",
      jurySpeakerId: "jury-1",
      question:
        "Trong DevNet cho phép hàng nghìn developer fork nối tiếp nhau các Code Snippet và cộng tác trực tiếp, bạn thiết kế mô hình dữ liệu cây Fork nhiều tầng và WebSocket broadcast ra sao?",
      contextCodeSnippet: {
        lang: "typescript",
        code: `interface SnippetNode {
  id: string;
  rootSnippetId: string;
  parentId: string | null;
  diffPatch: string; // Lưu delta thay vì nhân bản toàn bộ file
}`,
        caption: "SnippetNode (Adjacency + RootIndex tránh query đệ quy chậm)",
      },
      suggestedKeywords: [
        "Closure Table / Materialized Path",
        "Diff Patch Delta",
        "Redis Pub/Sub WebSocket",
        "CSP Sandbox Iframe",
      ],
      placeholderExample:
        "VD: Em dùng Materialized Path / RootId + lưu diffPatch nhỏ gọn thay vì copy toàn file, kết hợp Redis Pub/Sub đồng bộ WebSocket đa instance...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Materialized Path + Redis Pub/Sub",
          text: "Dùng rootSnippetId kết hợp Materialized Path để truy xuất cả cây Fork trong 1 query, lưu diffPatch tối ưu dung lượng và dùng Redis Pub/Sub phân phối sự kiện WebSocket giữa nhiều server Node/FastAPI.",
          type: "optimal",
        },
        {
          id: "arg-2",
          label: "Luận điểm Lưu toàn bộ code và duyệt đệ quy SQL ở client",
          text: "Mỗi lần fork thì nhân bản toàn bộ code và cho frontend gọi API lấy từng nút con liên tiếp.",
          type: "flawed",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-3",
        criticName: "KS. Nguyễn Bảo Long",
        challengeTitle: "Chất vấn Bảo mật Web: Chống Stored XSS khi chạy thử Preview Code",
        criticQuestion:
          "Vì mạng xã hội cho phép xem trước HTML/JS Snippet do người dùng khác viết, làm sao ngăn kẻ xấu đánh cắp JWT token hoặc cookie phiên người xem?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Render Preview trong Iframe cô lập hoàn toàn trên sandbox domain riêng (`sandbox` không kèm `allow-same-origin`) kết hợp Content-Security-Policy nghiêm ngặt và cookie HttpOnly.",
            score: 99,
            feedback: "Chuẩn phòng thủ Stored XSS của các nền tảng CodePen / CodeSandbox!",
            architectureImpact: "Cách ly hoàn toàn mã nguồn untrusted khỏi token ứng dụng chính.",
          },
          {
            id: "reb-2",
            answer: "Dùng replace bỏ thẻ <script> trước khi chèn trực tiếp vào DOM bằng dangerouslySetInnerHTML.",
            score: 52,
            feedback: "Rất dễ bị vượt qua bằng `<img onerror=...>` hoặc `<svg onload=...>`.",
            architectureImpact: "Nguy cơ lộ phiên người dùng hàng loạt.",
          },
        ],
      },
      mentorHint: "Nêu bật truy vấn cây Fork O(1) query và Iframe sandbox không `allow-same-origin`.",
    },
    {
      roundNumber: 2,
      phaseTitle: "Vòng 2: Tối ưu Bundle React 19 & Kiểm soát Rò rỉ Render",
      jurySpeakerId: "jury-2",
      question:
        "Khi trang hiển thị đồ thị Fork hàng trăm node và trình soạn code cùng lúc, bạn tối ưu hiệu năng React 19 và ảo hóa danh sách thế nào?",
      suggestedKeywords: [
        "Lazy Chunk Code-Splitting",
        "List Virtualization",
        "Debounced Syntax Highlight",
        "Memoized Graph Selector",
      ],
      placeholderExample:
        "VD: Tách chunk Monaco/Highlight bằng dynamic import, ảo hóa danh sách dài và memoize trạng thái node đồ thị...",
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Dynamic Import + Virtualization + Memoization",
          text: "Sử dụng dynamic import tách code editor nặng, ảo hóa feed danh sách dài và dùng selector/memoization cho từng node cây Fork để không re-render toàn cây khi có thông báo mới.",
          type: "optimal",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-2",
        criticName: "ThS. Lê Hoàng Yến",
        challengeTitle: "Chất vấn Hiệu năng: Bão WebSocket khi có bài hot",
        criticQuestion:
          "Khi hàng trăm người thả tim hoặc fork cùng 1 snippet trong 1 giây, làm sao UI không bị giật lag vì setState liên tục?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Gom batch cập nhật theo cửa sổ 250ms (throttled buffer) và chỉ cập nhật bộ đếm cục bộ trước khi đồng bộ state mới.",
            score: 95,
            feedback: "Giải pháp mượt mà, bảo vệ main thread UI trước bão sự kiện.",
            architectureImpact: "Giữ FPS ổn định 60fps ngay cả khi lưu lượng tương tác đột biến.",
          },
        ],
      },
      mentorHint: "Tách chunk nhẹ ban đầu và gom batch sự kiện WebSocket trước khi re-render.",
    },
  ],
};

export function getDefenseRoundsForProject(
  projectId: string,
  projectName?: string
): DefenseRound[] {
  if (DEFENSE_SCENARIOS[projectId]) {
    return DEFENSE_SCENARIOS[projectId];
  }
  const shortName = (projectName || projectId).split(" - ")[0];
  return [
    {
      roundNumber: 1,
      phaseTitle: `Vòng 1: Kiến trúc Tổng thể · ${shortName}`,
      jurySpeakerId: "jury-1",
      question: `Trong đồ án "${shortName}", bạn hãy phân tích cách tổ chức các tầng kiến trúc (API, Domain Service, Database) và giải pháp xử lý nút cổ chai hiệu năng khi lưu lượng truy cập tăng đột biến.`,
      suggestedKeywords: [
        "Clean Architecture",
        "Database Indexing",
        "Cache Strategy",
        "Async Processing",
      ],
      placeholderExample: `VD: Với đồ án ${shortName}, em phân tách 3 tầng rõ ràng, đánh index truy vấn trọng tâm và dùng Cache giảm tải CSDL...`,
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Phân tầng rõ ràng + Tối ưu Cache/Index",
          text: `Em tách rạch ròi tầng API Controller, tầng xử lý nghiệp vụ và tầng dữ liệu; kết hợp đánh Index truy vấn nóng, Cache phân tầng và xử lý bất đồng bộ cho tác vụ nặng trong ${shortName}.`,
          type: "optimal",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-2",
        criticName: "ThS. Lê Hoàng Yến",
        challengeTitle: "Chất vấn Kỹ thuật: Xử lý lỗi đồng bộ & Edge Case",
        criticQuestion:
          "Khi một thành phần phụ thuộc (CSDL hoặc dịch vụ ngoài) phản hồi chậm hoặc lỗi giữa chừng, hệ thống tránh treo toàn bộ luồng request ra sao?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Áp dụng Timeout nghiêm ngặt, Circuit Breaker kèm Retry có Exponential Backoff và trả fallback rõ ràng về client.",
            score: 96,
            feedback: "Phản biện chính xác! Tư duy thiết kế hệ thống chịu lỗi tốt.",
            architectureImpact: "Ngăn ngừa lỗi dây chuyền làm sập toàn ứng dụng.",
          },
        ],
      },
      mentorHint: "Nêu cấu trúc 3 tầng, tối ưu truy vấn/cache và Timeout + Circuit Breaker.",
    },
    {
      roundNumber: 2,
      phaseTitle: `Vòng 2: Bảo mật, Kiểm thử & Quy trình Git · ${shortName}`,
      jurySpeakerId: "jury-3",
      question: `Bạn kiểm chứng độ tin cậy của "${shortName}" qua kiểm thử tự động, kiểm soát quyền RBAC và minh chứng commit Git trên Git Project Hub như thế nào?`,
      suggestedKeywords: [
        "RBAC Backend Guard",
        "Git Proof Gate",
        "E2E Validation",
        "Audit Logging",
      ],
      placeholderExample: `VD: Em siết chặt phân quyền RBAC trên API backend, gắn mọi PR với mã thẻ Kanban và chạy kịch bản kiểm thử E2E...`,
      sampleArguments: [
        {
          id: "arg-1",
          label: "Luận điểm Phòng thủ từ Backend + Minh chứng Git",
          text: "Mọi API đều kiểm tra token và vai trò ở server (RBAC), gắn PR với mã thẻ Kanban qua Git Proof Gate và chạy kịch bản E2E tự động trước khi nghiệm thu.",
          type: "optimal",
        },
      ],
      drillDownChallenge: {
        criticJuryId: "jury-1",
        criticName: "TS. Trần Anh Tuấn",
        challengeTitle: "Chất vấn Nghiệm thu: Cân bằng tiến độ Sprint & Chất lượng Code",
        criticQuestion:
          "Nếu phát hiện lỗi kiến trúc sát hạn nộp Sprint, bạn ưu tiên khắc phục và bảo đảm không phá vỡ tính năng đã chạy bằng cách nào?",
        rebuttalOptions: [
          {
            id: "reb-1",
            answer:
              "Bổ sung test bao phủ luồng cũ trước (regression tests), cô lập bản vá trên nhánh PR nhỏ để AI Reviewer & đồng đội rà soát rồi mới merge vào nhánh chính.",
            score: 97,
            feedback: "Quy trình kỹ nghệ phần mềm rất chuyên nghiệp!",
            architectureImpact: "Giữ nhánh chính luôn sạch và ổn định.",
          },
        ],
      },
      mentorHint: "Nhấn mạnh kiểm tra quyền server-side, regression test và review PR nhỏ.",
    },
  ];
}
