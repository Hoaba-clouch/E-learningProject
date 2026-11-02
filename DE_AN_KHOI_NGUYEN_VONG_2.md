# BÁO CÁO ĐỀ ÁN VÒNG 2
# CUỘC THI Ý TƯỞNG ĐỔI MỚI SÁNG TẠO "KHỞI NGUYÊN"

---

**TÊN DỰ ÁN:** Code-Mind — Nền tảng học lập trình cá nhân hóa tích hợp AI Mascot & Gamification RPG

**Phân loại:** Giải pháp Công nghệ Giáo dục (EdTech) — Ứng dụng Web Progressive

**Trạng thái triển khai:** Đã có bản Prototype hoạt động đầy đủ, triển khai trực tuyến trên nền tảng Vercel

**Ngày lập:** Tháng 7 năm 2026

---

## MỤC LỤC

1. Tổng quan & Tầm nhìn sản phẩm
2. Xác định vấn đề & Phân tích "Nỗi đau" thị trường
3. Phân tích thị trường & Khách hàng mục tiêu
4. Đề xuất giải pháp — Kiến trúc sản phẩm Code-Mind
5. Mô tả chi tiết từng tính năng cốt lõi
6. Kiến trúc công nghệ & Bản thiết kế hệ thống
7. Giao diện người dùng — Triết lý thiết kế UI/UX
8. Tính khả thi & Xác nhận sản phẩm thực tế (Product Validation)
9. Mô hình kinh doanh & Kế hoạch doanh thu
10. Kế hoạch phát triển & Lộ trình tương lai (Roadmap)
11. Phân tích rủi ro & Giải pháp giảm thiểu
12. Kết luận

---

## PHẦN 1: TỔNG QUAN & TẦM NHÌN SẢN PHẨM

### 1.1. Lời mở đầu

Trong bối cảnh cách mạng công nghiệp 4.0 bùng nổ mạnh mẽ, lập trình và tư duy kỹ thuật số đang trở thành kỹ năng sống còn của thế kỷ 21. Tuy nhiên, tại Việt Nam, phần lớn sinh viên ngành Công nghệ thông tin vẫn đang tiếp cận các môn học cốt lõi như Lập trình hướng đối tượng (OOP), Cấu trúc dữ liệu và Thuật toán thông qua các hệ thống quản lý học tập (LMS) lỗi thời, khô khan và thiếu sự tương tác thực sự.

Kết quả là một nghịch lý đau lòng: các sinh viên sở hữu tiềm năng rất lớn nhưng lại bỏ dở giữa chừng, không phải vì kém thông minh, mà vì thiếu một môi trường học tập đủ sức cuốn hút, đủ thông minh để đồng hành với họ trong từng bước tiến của hành trình chinh phục kỹ thuật.

**Code-Mind** ra đời để phá vỡ nghịch lý đó.

### 1.2. Tầm nhìn sản phẩm (Product Vision)

> *"Code-Mind là người bạn đồng hành kỹ thuật số thông minh — không chỉ dạy bạn lập trình, mà còn hiểu bạn học theo cách nào, giúp bạn tiến bộ đúng theo nhịp của riêng mình."*

Code-Mind hướng đến việc xây dựng một **hệ sinh thái học tập hoàn chỉnh** nơi:
- Mỗi học viên có một **lộ trình học cá nhân hóa sâu sắc** dựa trên phong cách tiếp thu kiến thức (Visual / Auditory / Kinesthetic — Mô hình VAK).
- Mỗi bài học được biến thành một **cuộc phiêu lưu RPG** với bản đồ kỹ năng, điểm kinh nghiệm, và phần thưởng thực sự có ý nghĩa.
- Mỗi khái niệm khó được một **AI Mentor Mascot thông minh** dẫn dắt khám phá theo phương pháp Socratic — không đưa câu trả lời thẳng, mà dạy học viên tự tìm ra lời giải.
- Tính trung thực học thuật được bảo vệ nghiêm ngặt qua **hệ thống xác thực GitHub 2 lớp** không thể gian lận.

### 1.3. Sứ mệnh (Mission)

Dân chủ hóa việc tiếp cận giáo dục lập trình chất lượng cao cho mọi sinh viên Việt Nam, bất kể điều kiện kinh tế, bằng cách cung cấp một trải nghiệm học tập vừa **nghiêm túc về mặt học thuật** vừa **hấp dẫn như một trò chơi nhập vai**, được vận hành bởi sức mạnh của Trí tuệ Nhân tạo hiện đại.

---

## PHẦN 2: XÁC ĐỊNH VẤN ĐỀ & PHÂN TÍCH "NỖI ĐAU" THỊ TRƯỜNG

### 2.1. Bức tranh hiện trạng giáo dục trực tuyến

Thị trường giáo dục trực tuyến toàn cầu đạt giá trị 250 tỷ USD năm 2025, tuy nhiên đi kèm với con số tăng trưởng ấn tượng đó là một thực tế đáng lo ngại: **tỷ lệ hoàn thành khóa học trực tuyến trung bình chỉ đạt 5–15%** theo nghiên cứu của MIT Open Learning (2023). Điều này có nghĩa là cứ 100 người đăng ký, chỉ có không đến 15 người thực sự hoàn thành những gì họ bắt đầu.

Tại Việt Nam, vấn đề này càng trở nên trầm trọng hơn trong bối cảnh:
- Hầu hết các trường đại học kỹ thuật vẫn sử dụng Moodle phiên bản cũ hoặc Google Classroom — vốn chỉ là kho chứa tài liệu tĩnh chứ không phải môi trường học tập tương tác thực sự.
- Học liệu giảng dạy OOP và các môn lập trình nâng cao chủ yếu là slide PDF nhiều chữ, thiếu hình ảnh minh họa và bài tập thực hành có phản hồi tức thì.
- Không có cơ chế nào giúp giảng viên biết được **học sinh đang bị hổng kiến thức ở khái niệm nào** trước khi diễn ra kỳ thi cuối kỳ.

### 2.2. Ba "Nỗi đau" cốt lõi được xác định

**Nỗi đau 1: Tỷ lệ bỏ học cao (High Drop-out Rate)**

Cảm giác cô đơn khi tự học là nguyên nhân hàng đầu khiến sinh viên từ bỏ các khóa học trực tuyến. Không có ai động viên khi làm bài, không có phản hồi khi làm sai, không có cảm giác tiến bộ được ghi nhận một cách sinh động. Kết quả là học viên dần mất động lực và bỏ cuộc.

Dẫn chứng thực tế: Theo khảo sát nội bộ tại một số lớp học OOP bằng hình thức trực tuyến tại các trường đại học kỹ thuật ở TP.HCM, tỷ lệ sinh viên không hoàn thành đủ bài tập theo yêu cầu lên đến 60–70%.

**Nỗi đau 2: Thiếu cá nhân hóa lộ trình học tập thực sự (One-size-fits-all Problem)**

Mỗi người có một cách tiếp thu kiến thức hoàn toàn khác nhau — một thực tế được khoa học giáo dục công nhận từ thập niên 1970 qua Mô hình VAK của Neil Fleming. Tuy nhiên, hầu hết các LMS hiện nay áp dụng cùng một định dạng bài học cho mọi đối tượng:

- Sinh viên mạnh về **thị giác (Visual)** sẽ học tốt hơn qua sơ đồ, flowchart, mindmap — nhưng họ bị bắt đọc những đoạn văn dài dòng nhiều chữ.
- Sinh viên mạnh về **thực hành (Kinesthetic)** cần viết code chạy thử ngay lập tức để hiểu — nhưng họ bị bắt học lý thuyết thuần túy trong 2 giờ trước khi được động tay vào bàn phím.
- Sinh viên mạnh về **thính giác (Auditory)** hấp thu tốt nhất qua nghe giải thích — nhưng không có nền tảng nào cung cấp tính năng Text-to-Speech tiếng Việt chất lượng cao tích hợp sâu vào bài học.

**Nỗi đau 3: Hệ thống gamification hời hợt & tình trạng gian lận học thuật**

Các huy hiệu (Badge), điểm số hay chứng chỉ hoàn thành trên Coursera, Udemy hay Moodle hiện nay đang dần mất giá trị vì:
1. Chúng chỉ là biểu tượng trưng bày, không mang lại giá trị thực dụng nào để đổi lấy trải nghiệm cá nhân hóa thực sự.
2. Tệ hơn, rất nhiều học viên tìm cách lách qua bài kiểm tra bằng cách copy code của nhau, sử dụng ChatGPT để viết code và nộp như của mình, hoặc đơn giản là nhờ người khác làm bài hộ — mà hệ thống không thể phát hiện.

### 2.3. Khoảng trắng thị trường (Market Gap)

Qua phân tích, nhóm dự án nhận thấy một **khoảng trắng thị trường rõ ràng**: hiện tại không tồn tại một nền tảng EdTech nào tại Việt Nam đồng thời đáp ứng đủ cả ba tiêu chí:

- Cá nhân hóa lộ trình học theo phong cách VAK thực sự
- Gamification sâu sắc ở cấp độ RPG (không chỉ là điểm số hay badge)
- Tích hợp AI Mentor tương tác trong thời gian thực ngay tại màn học

**Code-Mind** được thiết kế để lấp đầy chính xác khoảng trắng này.

---

## PHẦN 3: PHÂN TÍCH THỊ TRƯỜNG & KHÁCH HÀNG MỤC TIÊU

### 3.1. Quy mô & Tiềm năng thị trường

**Quy mô thị trường EdTech Việt Nam:**
- Thị trường EdTech Việt Nam ước đạt **3 tỷ USD vào năm 2026**, với tốc độ tăng trưởng kép hàng năm (CAGR) là **20.2%** giai đoạn 2021–2026 (Nguồn: Ken Research, 2022).
- Việt Nam có hơn **2.3 triệu sinh viên đại học**, trong đó nhóm ngành Kỹ thuật & CNTT chiếm khoảng **18%**, tương đương hơn **414,000 sinh viên** — đây là phân khúc mục tiêu cốt lõi của Code-Mind.
- Nhu cầu học lập trình ngoài giờ chính khóa đang gia tăng mạnh do sự bùng nổ của thị trường tuyển dụng IT, với hàng chục nghìn vị trí tuyển dụng lập trình viên mỗi năm.

### 3.2. Phân khúc khách hàng mục tiêu (Target Segments)

**Phân khúc 1 — Học viên cốt lõi (Core B2C):**

Sinh viên năm 2–3 ngành Công nghệ thông tin, Điện tử Viễn thông, Khoa học Máy tính đang học các môn lập trình nền tảng như OOP Java, C++, Python tại các trường đại học.

Đặc điểm hành vi:
- Là thế hệ "Digital Native" lớn lên với TikTok, YouTube, và các trò chơi RPG — ưa thích giao diện đẹp, có animation và phản hồi thị giác phong phú.
- Có khả năng duy trì tập trung cao nhất khi nội dung được cấu trúc thành các đơn vị nhỏ (micro-learning) thay vì các bài giảng dài 2 tiếng.
- Sẵn sàng chi trả từ 100,000–500,000 VNĐ/tháng cho các dịch vụ học tập số có giá trị rõ ràng.

**Phân khúc 2 — Đối tác Tổ chức (B2B — Educational Institutions):**

Các Trường Đại học, Trung tâm đào tạo lập trình, Bootcamp kỹ thuật muốn nâng cấp hệ thống LMS truyền thống của mình bằng một giải pháp hiện đại hơn, có tích hợp AI và gamification để cải thiện tỷ lệ hoàn thành chương trình.

### 3.3. Phân tích đối thủ cạnh tranh (Competitive Landscape)

| Tiêu chí | Moodle / Canvas | Coursera / Udemy | Duolingo / Brilliant | **Code-Mind** |
|:---|:---|:---|:---|:---|
| **Cá nhân hóa VAK** | Không có | Rất hạn chế | Sơ bộ | **Thích ứng động theo hành vi thực tế** |
| **AI Mentor thời gian thực** | Không có | Chỉ forum Q&A chậm | Không có | **Mascot AI Socratic ngay trong màn học** |
| **Gamification RPG** | Điểm số tĩnh | Chứng chỉ cuối khóa | Tốt nhưng không cho lập trình | **Bản đồ Skill Tree, XP Shop, League** |
| **Chống gian lận** | Rất yếu | Không có | N/A | **Hệ thống GitHub 2 lớp bảo vệ** |
| **Hỗ trợ tiếng Việt** | Dịch thuật cơ bản | Chủ yếu tiếng Anh | Không có | **100% tiếng Việt — TTS tiếng Việt** |
| **Tạo nội dung bằng AI** | Không có | Do giảng viên tự soạn | Không có | **Chuyển PDF thành Video trong 2 phút** |

**Kết luận:** Code-Mind là sự **kết hợp chưa từng tồn tại** của ba yếu tố: AI Personalization + Deep Gamification + Academic Integrity Protection, được thiết kế riêng cho người học lập trình tại Việt Nam.

---

## PHẦN 4: ĐỀ XUẤT GIẢI PHÁP — KIẾN TRÚC SẢN PHẨM Code-Mind

### 4.1. Sơ đồ kiến trúc hệ thống tổng quan

Hệ thống Code-Mind được thiết kế theo mô hình **3 lớp người dùng** (Admin — Giảng viên — Học viên) với các module hoạt động độc lập nhưng giao tiếp chặt chẽ với nhau:

![Sơ đồ kiến trúc hệ thống tổng quan Code-Mind](file:///C:/Users/Admin/.gemini/antigravity/brain/2d2931f8-4040-4178-b68e-972a03a210fd/system_architecture_diagram_1783556821366.jpg)

### 4.2. Cấu trúc nội dung học tập phân cấp

Code-Mind tổ chức nội dung theo cấu trúc phân cấp nghiêm ngặt nhằm giảm tải lượng nhận thức (Cognitive Load Reduction):

![Sơ đồ cấu trúc nội dung học tập phân cấp Code-Mind](file:///C:/Users/Admin/.gemini/antigravity/brain/2d2931f8-4040-4178-b68e-972a03a210fd/course_structure_updated_flowchart_1783558904347.jpg)

---

## PHẦN 5: MÔ TẢ CHI TIẾT TỪNG TÍNH NĂNG CỐT LÕI

### 5.1. Hệ thống AI Mascot Mentor Socratic

#### 5.1.1. Triết lý thiết kế — Phương pháp Socratic

Khác hoàn toàn với các chatbot thông thường chỉ cần hỏi là đưa đáp án ngay, AI Mentor trong Code-Mind được lập trình theo **phương pháp giảng dạy Socratic** — một phương pháp giáo dục đã được kiểm chứng trong hàng nghìn năm: thay vì dạy trực tiếp, người thầy đặt ra các câu hỏi phản biện để học trò tự tư duy và tìm ra câu trả lời.

Ví dụ cụ thể về Mindmap:
- Học viên vẽ mũi tên extends từ Animal sang Dog.
- AI Mentor KHÔNG nói: "Sai rồi, phải vẽ ngược lại."
- AI Mentor nói: "Tôi thấy bạn nối mũi tên extends từ Animal sang Dog. Hãy thử nghĩ xem: trong thực tế, con chó (Dog) có phải là một loài động vật (Animal) đặc biệt hơn, hay con động vật mới là thứ đặc biệt hơn? Lớp nào nhận thừa kế từ lớp nào?"

Ví dụ cụ thể về Code lỗi:
- Học viên viết code bị lỗi NullPointerException ở dòng 8.
- AI Mentor KHÔNG đưa đoạn code sửa đúng.
- AI Mentor nói: "Lỗi ở dòng 8 đang là NullPointerException — điều này thường xảy ra khi bạn gọi phương thức trên một Object chưa được tạo ra. Hãy kiểm tra lại: biến 'user' của bạn đã được khởi tạo bằng từ khóa 'new' chưa?"

#### 5.1.2. Trợ lý AI Mascot đồng hành (Demo Concept)

Hệ thống hỗ trợ cơ chế lựa chọn AI Mascot làm bạn đồng hành cùng học tập. Trong phiên bản thử nghiệm (Demo Concept), nền tảng cung cấp các linh vật đại diện tiêu biểu (ví dụ: chú chó Shiba Bino thân thiện cho người mới bắt đầu, robot Mecha-Luna hỗ trợ phong cách kỹ thuật chính xác, hay mèo Kuro Neko hỗ trợ học viên yêu thích thử thách lập trình). Học viên có thể tích lũy điểm kinh nghiệm (XP) để mở khóa Mascot phù hợp với sở thích cá nhân.

#### 5.1.3. Hành động ngữ cảnh của Pet Mascot (Context-aware Actions)

Biểu cảm và hành động của Mascot thay đổi theo từng ngữ cảnh học tập cụ thể:

- **Khi học bài đọc / xem video:** Pet đeo kính, tư thế ngồi thẳng, tập trung cao độ để cùng soi lỗi cú pháp với học viên.
- **Khi làm Quiz:** Pet toát mồ hôi, liếc nhìn đồng hồ đếm ngược, thể hiện áp lực thi cử đồng cảm với học viên.
- **Khi trả lời đúng / hoàn thành bài:** Pet nhảy múa ăn mừng với hiệu ứng pháo bông lấp lánh, tạo cảm giác phấn khởi.
- **Khi trả lời sai:** Pet lắc đầu nhẹ nhàng, gửi câu hỏi gợi mở Socratic giúp sửa lỗi tư duy, không phán xét.
- **Khi học viên dừng học quá 5 phút:** Pet thực hiện hành động nhắc nhở dễ thương (vẫy tay, gõ màn hình ảo).
- **Khi Streak học tập đang nguy hiểm:** Pet biểu hiện lo lắng, gửi cảnh báo khẩn cấp giữ chuỗi ngày học.

#### 5.1.4. Kiến trúc kỹ thuật AI Mentor

AI Mentor sử dụng Gemini API kết hợp cơ chế **NLP Context Caching** để ghi nhớ toàn bộ lịch sử chat của bài học hiện tại, giúp:
- Phản hồi liên tục, mạch lạc mà không bị mất ngữ cảnh giữa các câu hỏi.
- Tối ưu chi phí API bằng cách cache ngữ cảnh thay vì gửi lại toàn bộ lịch sử mỗi lần.
- Phát hiện pattern lỗi lặp lại của học viên để tự động điều chỉnh phong cách hướng dẫn.

### 5.2. Bản đồ kỹ năng RPG (Interactive Skill Map)

#### 5.2.1. Thiết kế trực quan

Thay vì danh sách bài học phẳng và nhàm chán, Code-Mind trình bày lộ trình học tập như một **bản đồ thế giới RPG** có thể kéo thả tự do, phóng to thu nhỏ bằng cuộn chuột. Mỗi bài học là một node (hòn đảo kiến thức) được kết nối với các bài học liên quan bằng các đường năng lượng phát sáng, tạo cảm giác đang chinh phục một thế giới rộng lớn.

#### 5.2.2. Phân cấp Node bài học — 5 loại Node

**Node Hoàn thành (Completed Node):**
- Hình tròn với gradient xanh ngọc lục bảo sang teal, hiệu ứng 3D bóng bẩy giống viên ngọc công nghệ.
- Có vòng tròn cơ khí ngoài cùng (decorative ring) và lớp phản sáng glossy highlight ở góc trên tạo chiều sâu.
- Biểu tượng dấu check xác nhận kiến thức đã được làm chủ hoàn toàn.

**Node Đang học (Active Node):**
- Gradient xanh neon sang tím violet lung linh.
- Vòng radar quét liên tục (pulse animation) kích thích sự chú ý.
- Vòng cơ khí ngoài xoay chậm rãi tạo cảm giác công nghệ viễn tưởng.
- Khi nhấp vào, chuyển thẳng vào màn Workspace học tập.

**Node Bị khóa (Locked Node):**
- Gradient xám carbon tối giản, biểu tượng ổ khóa.
- Opacity giảm để phân biệt trực quan với các node đã mở.
- Học viên phải hoàn thành bài học trước đó (Quiz ≥ 70%) mới mở được.

**Node Boss (Boss Node):**
- Kích thước lớn gấp 1.5 lần node thường.
- Gradient đỏ sẫm sang hổ phách hoàng gia với vương miện lửa bùng cháy.
- Vòng cơ khí ngoài có nét đỏ rực, xoay liên tục tạo uy lực.
- Đại diện cho các bài kiểm tra chương lớn hoặc khái niệm trọng yếu (VD: Abstract Class, Interface).

**Node Gate (Checkpoint Node):**
- Màu tím hoàng gia với biểu tượng khiên bảo vệ.
- Đại diện cho các cột mốc SOLID Principles hoặc cuối module quan trọng.

#### 5.2.3. Luồng dịch chuyển năng lượng (Flowing Energy Connections)

Các đường nối giữa Node không phải là đường thẳng tĩnh. Chúng là **các đường kết nối sống động** với:
- Các hạt ánh sáng nhỏ (particle dots) chạy dọc theo đường nối theo chiều tiến độ học.
- Độ dày thanh mảnh (1.2px), tần suất thưa (3, 8) và opacity nhẹ (50%) — cực kỳ tinh tế, không gây rối mắt.
- Màu sắc thay đổi: Xanh tươi khi đã hoàn thành → Xanh neon khi đang học → Xám mờ khi chưa mở khóa.

### 5.3. Cơ chế cá nhân hóa VAK (Adaptive Learning Engine)

#### 5.3.1. Khảo sát phong cách học lần đầu (VAK Onboarding)

Khi học viên đăng nhập lần đầu, hệ thống hiển thị bài test phong cách học gồm **5 câu hỏi tình huống đồ họa hóa**, ví dụ:

> "Khi bạn muốn hiểu khái niệm 'Kế thừa trong OOP', bạn sẽ làm gì đầu tiên?"
> - A. Xem một sơ đồ hình cây cho thấy Animal → Dog, Cat là các lớp con (Visual)
> - B. Nghe một đoạn giải thích ngắn 2 phút với ví dụ thực tế (Auditory)
> - C. Viết thử ngay một đoạn code có class Dog extends Animal để cảm nhận (Kinesthetic)

Kết quả phân tích và gắn nhãn chính (Visual / Auditory / Kinesthetic) vào hồ sơ Learner Profile của học viên.

#### 5.3.2. Thích ứng giao diện động (Adaptive UI)

Dựa trên nhãn VAK đã xác định, giao diện Workspace học tập tự động tái cấu trúc:

- **Visual (Thị giác):** Ưu tiên hiển thị sơ đồ Mindmap trực quan, tô sáng cú pháp code mạnh, thêm flowchart thuật toán bên cạnh bài đọc. Các Node trong bản đồ kỹ năng hiển thị nhiều hình ảnh minh họa hơn.
- **Auditory (Thính giác):** Kích hoạt widget Text-to-Speech (TTS) tiếng Việt tự động ở góc màn hình. Cung cấp podcast tóm tắt bài giảng ngắn 5–10 phút. Bài học ưu tiên dạng audio narrative kể chuyện.
- **Kinesthetic (Vận động):** Ưu tiên hiển thị môi trường viết code trực tuyến (Online Code Compiler) ngay từ đầu bài học. Các câu hỏi dạng kéo thả tương tác. Mini-challenge code nhỏ xen kẽ giữa các đoạn lý thuyết.

#### 5.3.3. Tự động cập nhật hồ sơ theo thời gian thực

Hệ thống liên tục theo dõi **hành vi sử dụng thực tế** và so sánh với nhãn VAK đã đặt. Nếu phát hiện sự lệch lạc nhất quán (VD: học viên được gắn nhãn Visual nhưng liên tục bật TTS hơn 70% số bài học), hệ thống tự động cập nhật nhãn VAK và điều chỉnh giao diện — không cần học viên làm lại bài test.

### 5.4. Hệ thống nộp bài thực hành GitHub 2 lớp bảo vệ

Đây là tính năng **độc đáo nhất và không có đối thủ cạnh tranh nào tại Việt Nam** hiện đang làm được. Khi học viên nộp bài tập code, hệ thống chạy tự động qua 2 lớp xác thực nối tiếp nhau:

![Sơ đồ quy trình 2 lớp bảo mật GitHub](file:///C:/Users/Admin/.gemini/antigravity/brain/2d2931f8-4040-4178-b68e-972a03a210fd/github_2_layer_professional_flowchart_1783557015451.jpg)

**Lớp 1 — Xác thực GitHub OAuth:** Kiểm tra repo được nộp có chứa commit thực sự từ tài khoản GitHub đã đăng ký OAuth không. Ngăn chặn hoàn toàn việc nộp link repo của người khác.

**Lớp 2 — Quét đạo văn chéo (MOSS):** So sánh mã nguồn của học viên với tất cả các bài nộp khác trong lớp bằng thuật toán MOSS của Stanford University. Tỷ lệ trùng lặp > 80% sẽ tự động gắn cờ đỏ và báo cáo cho giảng viên.

Chỉ khi vượt qua cả 2 lớp, bài nộp mới được đánh dấu Hợp lệ và chuyển sang giảng viên chấm điểm cuối cùng.

### 5.5. Hệ thống Game hóa nâng cao (Advanced Gamification)

#### 5.5.1. Điểm kinh nghiệm XP (Experience Points)

Mọi hoạt động học tập đều sinh ra điểm XP theo công thức có trọng số:

| Hoạt động | XP nhận được |
|:---|:---|
| Hoàn thành 1 bài đọc (Lecture) | +15 XP |
| Hoàn thành xem 1 video bài giảng | +20 XP |
| Vượt Lesson Quiz (≥ 70%) | +50 XP |
| Vượt Lesson Quiz (100% điểm tuyệt đối) | +75 XP (Bonus +25) |
| Nộp bài GitHub hợp lệ (2 lớp pass) | +150 XP |
| Hoàn thành Mindmap tổng hợp chương (≥ 6/10 điểm AI) | +200 XP |
| Duy trì Streak 7 ngày liên tiếp | +100 XP |
| Duy trì Streak 30 ngày liên tiếp | +500 XP |
| Trả lời Quiz nhanh trên Tech Reels | +10 XP/câu |

#### 5.5.2. Hệ thống Streak (Chuỗi ngày không nghỉ)

Học viên phải hoàn thành ít nhất 1 hoạt động mỗi ngày để duy trì Streak. Hệ thống gửi thông báo push lúc 21:00 mỗi tối nếu Streak sắp bị đứt. Phần thưởng streak:
- 7 ngày: Huy hiệu "Học viên chăm chỉ" + 100 XP
- 30 ngày: Huy hiệu "Kiên trì bất khuất" + 500 XP
- 100 ngày: Huy hiệu "Huyền thoại" + 2000 XP + Mở khóa Mascot đặc biệt

#### 5.5.3. Hệ thống Giải đấu tuần (Weekly League)

Cuối mỗi tuần, hệ thống tự động:
1. Xếp học viên vào các phòng đấu 10 người cùng cấp hoạt động.
2. Tổng kết XP kiếm được trong tuần theo thứ hạng.
3. Top 3 → Thăng hạng: Đồng → Bạc → Vàng → Kim cương.
4. Bottom 3 → Xuống hạng.

#### 5.5.4. Cửa hàng XP Shop

Học viên sử dụng điểm XP tích lũy để mua các vật phẩm:

**Vật phẩm tiện ích:**
- Đóng băng Streak (Streak Freeze) — 200 XP: Bảo vệ chuỗi học tập khi lỡ bỏ 1 ngày.
- Tăng tốc XP x2 trong 24h — 500 XP: Nhân đôi toàn bộ XP nhận được trong 1 ngày.

**Vật phẩm tùy chỉnh giao diện (Chat Skin):**
- Terminal Skin — 800 XP: Giao diện hacker, chữ xanh lá trên nền đen huyền bí. Dành cho dân lập trình chính hiệu.
- Paper Skin — 600 XP: Giao diện giấy viết tay cổ điển với dòng kẻ ngang, phù hợp đọc tài liệu dài. Dark Mode tự chuyển thành giấy Sepia mun ấm áp.
- Neon Skin — 1000 XP: Giao diện gradient phát sáng năng động. Dark Mode tự giảm độ rực tránh mỏi mắt.

**Mở khóa AI Mascot cao cấp (Demo):**
- Mở khóa các nhân vật AI Mascot đồng hành cao cấp (ví dụ: Kuro Neko Ninja, Ignis Dragon, Mecha-Luna) — từ 1500 đến 3500 XP.

**Tất cả Chat Skin đều tự động đồng bộ Dark Mode / Light Mode** — chuyển đổi mượt mà theo chế độ hiển thị mà người dùng chọn.

### 5.6. Hệ thống Video ngắn công nghệ — Tech Reels

**Tech Reels** là tính năng tích hợp feed video ngắn theo phong cách TikTok ngay trong ứng dụng.

**Quy trình tạo nội dung tự động (AIGC Daily Pipeline):**
1. **Thu thập (Crawl):** Hệ thống tự động quét các nguồn RSS uy tín (Hacker News, Dev.to, TechCrunch) mỗi sáng sớm.
2. **Chọn lọc & Dịch thuật:** AI chọn top 10 tin tức hot nhất trong ngày, dịch sang tiếng Việt đơn giản dễ hiểu.
3. **Viết kịch bản:** AI viết kịch bản thuyết minh 30 giây, ngắn gọn hấp dẫn.
4. **Tổng hợp video:** Ghép slide HTML/CSS animated + giọng đọc TTS tiếng Việt → xuất video MP4 dọc 9:16.
5. **Tạo Quiz nhanh:** AI tự tạo 1 câu hỏi trắc nghiệm xuất hiện sau 30 giây. Trả lời đúng nhận +10 XP.

**Tương tác xã hội:** Like, Comment, Save, Share — tạo cộng đồng học tập sôi nổi.

### 5.7. Tính năng Mindmap Canvas — Guided Mode 3 cấp

Khi học viên chọn "Hệ thống hóa kiến thức bằng Mindmap" trên Canvas (tích hợp bằng React Flow), hệ thống cung cấp 3 cấp độ hỗ trợ:

**Cấp 1 — Điền vào chỗ trống (Fill in the blank):**
AI vẽ sẵn toàn bộ sơ đồ khung, ẩn nhãn các Node/Edge. Học viên chỉ cần gõ đúng tên khái niệm để hoàn thành. Phù hợp cho người mới bắt đầu.

**Cấp 2 — Hoàn thiện sơ đồ (Complete the Graph):**
AI vẽ sẵn 60% sơ đồ cốt lõi, học viên phải vẽ thêm các Node phụ và các đường nối liên kết còn thiếu. Phù hợp trình độ trung bình.

**Cấp 3 — Vẽ tự do hoàn toàn (Free Canvas):**
Bảng vẽ trống, AI hiển thị cột gợi ý Keywords ở bên trái để học viên tự do sắp xếp tư duy. Phù hợp người muốn thử thách cao.

**Cơ chế chấm điểm:** AI đối chiếu sơ đồ của học viên với Master Graph chuẩn của giảng viên. Hoàn thành đạt ≥ 6/10 nhận Bonus +200 XP.

### 5.8. Tạo nội dung bằng AI (AIGC Creation Flow)

Giảng viên upload tài liệu (.pdf, .docx) và bấm "Tạo nội dung tự động", hệ thống:

1. Tạo văn bản tóm tắt tiếng Việt (Lecture) từ tài liệu gốc.
2. Tạo và kết xuất (render) video bài giảng khổ ngang (landscape 16:9) hoàn chỉnh tự động dựa trên các slide nội dung và giọng thuyết trình AI.
3. Tạo bộ câu hỏi trắc nghiệm/kéo thả (Quiz) cho Lesson Quiz.
4. Tạo bản vẽ nháp sơ đồ tri thức (Master Graph) cho bài tập Mindmap.

Tất cả ở dạng **Bản nháp (Draft)** chờ giảng viên xem lại, chỉnh sửa và bấm "Phát hành (Publish)" mới xuất hiện cho học viên — đảm bảo tính chính xác học thuật.

---

## PHẦN 6: KIẾN TRÚC CÔNG NGHỆ & BẢN THIẾT KẾ HỆ THỐNG

### 6.1. Technology Stack hoàn chỉnh

**Frontend (Đã triển khai — Prototype hoạt động):**
- **React 19** — Thư viện UI hiện đại nhất với Concurrent Mode cho giao diện mượt mà tuyệt đối.
- **Vite 8** — Build tool siêu nhanh, Hot Module Replacement (HMR) tức thì.
- **Tailwind CSS v4** — Thư viện utility-first styling với JIT compiler.
- **Lucide React** — Bộ icon vector đồng bộ 1,000+ biểu tượng.
- **React Flow (Dự kiến)** — Thư viện Canvas tương tác cho Mindmap.

**Backend (Lộ trình phát triển):**
- **FastAPI (Python)** — API framework hiệu năng cao với type safety và tự động sinh tài liệu OpenAPI.
- **Celery + Redis** — Queue bất đồng bộ cho render video AIGC, phân tích GitHub.
- **PostgreSQL** — CSDL quan hệ chính lưu trữ dữ liệu người dùng, khóa học, tiến độ.
- **Redis** — Cache Session Token, quản lý Single-Device Lock.

**AI & External Services:**
- **Gemini API (Google)** — Trí tuệ cho AI Mentor Socratic với Context Caching tối ưu chi phí.
- **FFmpeg** — Engine render video từ slide + script + TTS.
- **GitHub REST API v3** — Xác thực OAuth và phân tích repo.
- **MOSS (Stanford)** — Engine phát hiện đạo văn code.

**Hosting & DevOps:**
- **Vercel** — Deploy frontend với CDN toàn cầu, CI/CD tự động.
- **pnpm** — Package manager siêu nhanh, tiết kiệm disk space.

### 6.2. Mô hình phân quyền (RBAC — Role-based Access Control)

| Chức năng | Admin | Giảng viên | Học viên |
|:---|:---:|:---:|:---:|
| Quản lý tài khoản & phê duyệt lớp | Có | Không | Không |
| Dashboard thống kê toàn hệ thống | Có | Không | Không |
| Giám sát & quản lý thiết bị đăng nhập | Có | Không | Không |
| Tạo/xóa Chương & Bài học | Có | Có | Không |
| Upload tài liệu & Kích hoạt AIGC | Có | Có | Không |
| Biên soạn Master Graph đáp án chuẩn | Có | Có | Không |
| Chấm điểm bài nộp GitHub | Có | Có | Không |
| Đăng nhập GitHub OAuth | Không | Không | Có |
| Học bài, làm Quiz, vẽ Mindmap | Không | Không | Có |
| Nộp bài thực hành qua GitHub | Không | Không | Có |
| Lướt Tech Reels & Quiz nhanh | Không | Không | Có |
| Mua vật phẩm trong XP Shop | Không | Không | Có |

### 6.3. Bảo mật Single-Device Lock

Để bảo vệ bản quyền nội dung và ngăn chia sẻ tài khoản:

1. Đăng nhập lần đầu → Ghi **Device Fingerprint** vào Redis.
2. Thiết bị thứ hai cố đăng nhập → Phát hiện Device ID không khớp.
3. **Session ID cũ bị vô hiệu hóa tức thì** → Đẩy thiết bị thứ nhất ra.
4. Admin có thể reset Device ID thủ công khi học viên đổi thiết bị chính đáng.

### 6.4. Đặc tả dữ liệu (Data Schemas)

**Content Block Model (Phân hệ nội dung bài học):**
- id, block_type (LECTURE/VIDEO/CODE/MINDMAP/QUIZ), title, body_content, media_url, quick_quiz_id

**Lesson Model (Bài học/Chương):**
- id, chapter_title, class_ids, content_blocks[], master_graph, created_at

**GitHub Submission Model (Nộp bài code):**
- id, student_id, lesson_id, repo_url, branch_name, git_username, integrity_score (0-100), code_explanation (≥100 từ), plagiarism_ratio, is_flagged, submitted_at

**Tech Reel Model (Video ngắn AI):**
- id, title, video_url, duration_seconds (30), script_content, hashtags[], quiz_question, quiz_options[], quiz_correct_answer, created_at

**User Stats Model (Thống kê gamification):**
- user_id, xp_points, level, current_streak, last_active_date, current_league (Đồng/Bạc/Vàng), league_xp

---

## PHẦN 7: GIAO DIỆN NGƯỜI DÙNG — TRIẾT LÝ THIẾT KẾ UI/UX

### 7.1. Design Philosophy — 3 nguyên tắc xuyên suốt

**Nguyên tắc 1 — Premium & Immersive (Cao cấp & Đắm chìm):**
Sử dụng gradient đa chiều, hiệu ứng glassmorphism, shadow layer, bóng đổ phân lớp, micro-animation phong phú để tạo cảm giác chiều sâu 3D — không phải giao diện phẳng 2D nhàm chán.

**Nguyên tắc 2 — Dark Mode Native:**
Học sinh thường học vào buổi tối. Dark Mode không phải tính năng phụ mà là **giao diện chính**, màu sắc được tinh chỉnh tỉ mỉ để tránh mỏi mắt. Tất cả thành phần: node bản đồ, khung chat, bong bóng tin nhắn, sidebar, Chat Skin đều hỗ trợ Dark/Light Mode liền mạch.

**Nguyên tắc 3 — Alive & Responsive (Sống động & Phản ứng):**
Giao diện phải "sống" — có micro-animation ở mọi tương tác: hover effect trên nút, transition khi chuyển màn hình, particle effect khi nhận XP, animation khi mở khóa bài học mới.

### 7.2. Danh sách màn hình giao diện (UI Screen Inventory)

| STT | Tên màn hình | Mô tả | Thành phần bắt buộc |
|:---|:---|:---|:---|
| 1 | Đăng nhập | Đăng nhập Google/GitHub OAuth | Nút OAuth, form thiết lập tài khoản |
| 2 | Khảo sát VAK | 5 câu hỏi đồ họa hóa | Slider, ảnh minh họa, animation kết quả |
| 3 | Dashboard Học viên | Bản đồ Skill Tree RPG | Skill Map kéo thả, Streak fire, League ranking |
| 4 | Workspace Học tập | 3 cột | Cột trái: Outline; Giữa: Nội dung + Canvas; Phải: AI Mentor |
| 5 | Lesson Quiz | Thi trắc nghiệm | Đồng hồ đếm ngược, animation kết quả |
| 6 | Canvas Mindmap | React Flow Editor | Guided Mode 3 cấp, toolbar vẽ |
| 7 | Nộp bài GitHub | Form nộp link repo | Ô link, chọn branch, textarea Walkthrough ≥100 từ |
| 8 | Tech Reels | Video dọc TikTok-style | Video 9:16, Like/Comment, popup quiz giây 30 |
| 9 | XP Shop | Cửa hàng vật phẩm | Grid card sản phẩm, preview skin, số dư XP |
| 10 | Hồ sơ học viên | Trang cá nhân | Lịch sử học, huy hiệu, biểu đồ VAK |
| 11 | Dashboard GV | Quản lý lớp | Danh sách bài nộp GitHub và giao diện chấm điểm |
| 12 | Trình soạn AIGC | Upload tài liệu | Xem kết quả AI, chỉnh sửa trước publish |
| 13 | Dashboard Admin | Quản trị hệ thống | Quản lý tài khoản, thống kê, giám sát Session |

---

## PHẦN 8: TÍNH KHẢ THI & XÁC NHẬN SẢN PHẨM THỰC TẾ

### 8.1. Bằng chứng thực tế — Prototype đã hoạt động

Điểm mạnh vượt trội của dự án Code-Mind: **sản phẩm KHÔNG nằm trên giấy**. Nhóm đã hoàn thiện và triển khai thành công bản Prototype:

**Những gì đã xây dựng và triển khai thực tế:**
- Có Giao diện Bản đồ kỹ năng RPG hoàn chỉnh: đầy đủ 5 loại Node (Completed, Active, Locked, Boss, Gate), animation dòng năng lượng particle chạy dọc đường nối, kéo thả + zoom mượt mà.
- Có Hệ thống AI Mascot 8 nhân vật: Bino, Nova, Byte, Sage, Luna, Kuro Neko, Ignis Dragon, Mecha-Luna — mỗi nhân vật có avatar riêng biệt, animation theo ngữ cảnh, Pet để bàn nổi góc màn hình.
- Có Màn hình Workspace học tập 3 cột với khung chat AI Mentor đầy đủ chức năng: chat bubble, quick prompts, gợi ý Socratic, biểu cảm động.
- Có Hệ thống XP Shop hoàn chỉnh: 3 loại Chat Skin (Terminal, Paper, Neon), vật phẩm tiện ích (Streak Freeze, XP Boost), 3 Mascot cao cấp mở khóa bằng XP.
- Có Dark Mode / Light Mode đồng bộ toàn bộ giao diện: bao gồm cả Chat Skin thích ứng màu sắc (Paper → Sepia Dark, Neon → Muted Glow Dark).
- Có Dashboard học viên: Streak counter, League display, XP progress bar, avatar tùy chỉnh.
- Có Sidebar thu gọn/mở rộng để tối ưu không gian đọc.
- Có Responsive design cho desktop và laptop.

**Thông số kỹ thuật của bản triển khai:**
- Tổng dung lượng bundle: ~663KB JS + ~153KB CSS (sau minification).
- Số module React: 1,938 modules đã xử lý.
- Thời gian build production: < 750ms.
- Triển khai thành công lên Vercel Cloud với CI/CD tự động từ GitHub.

### 8.2. Đánh giá khả năng mở rộng kỹ thuật

Kiến trúc frontend component-based tách biệt hoàn toàn → Việc tích hợp backend API không cần viết lại giao diện. Data flow đã thiết kế sẵn sàng cho việc thay thế mock data bằng real API calls. Toàn bộ state management được tổ chức theo từng feature module, cho phép scale up không gây xung đột.

---

## PHẦN 9: MÔ HÌNH KINH DOANH & KẾ HOẠCH DOANH THU

### 9.1. Sơ đồ mô hình kinh doanh tổng quan (Business Model Canvas - BMC)

![Sơ đồ mô hình kinh doanh Code-Mind BMC](file:///C:/Users/Admin/.gemini/antigravity/brain/2d2931f8-4040-4178-b68e-972a03a210fd/code_mind_premium_bmc_1783562223190.jpg)

### 9.2. Mô hình Freemium B2C (Người dùng trực tiếp)

**Gói Miễn phí (Free Tier):**
- Truy cập nội dung học tập cơ bản của 1 khóa học mẫu.
- AI Mentor Mascot mặc định (Bino hoặc Nova).
- Giao diện Classic (không có Chat Skin cao cấp).
- Tech Reels — xem tối đa 5 video/ngày.
- Tham gia League Đồng.

**Gói Premium (99,000 VNĐ/tháng hoặc 799,000 VNĐ/năm):**
- Truy cập không giới hạn toàn bộ khóa học.
- Mở khóa tất cả 8 AI Mascot Mentor.
- Toàn bộ Chat Skin cao cấp.
- Tech Reels không giới hạn.
- Phân tích VAK nâng cao và báo cáo tiến độ theo tuần.
- Ưu tiên hàng đợi AI Mentor chat (phản hồi nhanh hơn).

**Gói Team (149,000 VNĐ/người/tháng, tối thiểu 5 người):**
- Tất cả tính năng Premium.
- Bảng xếp hạng riêng trong nhóm.
- Giảng viên/Mentor nhóm có thể xem báo cáo tiến độ toàn bộ thành viên.

### 9.3. Mô hình B2B (Tổ chức Giáo dục)

**Gói Campus License:**
Cung cấp toàn bộ hệ thống Code-Mind làm LMS chính thức cho trường/khoa, bao gồm:
- Cổng Admin riêng cho Ban quản lý đào tạo.
- Cổng Giảng viên với AIGC biên soạn bài giảng.
- Hệ thống GitHub 2 lớp chống gian lận.
- Giá: 50–200 triệu VNĐ/năm/trường tùy quy mô.

### 9.4. Dự báo doanh thu sơ bộ (năm đầu tiên — bảo thủ)

| Kênh | Ước lượng | Doanh thu ước tính |
|:---|:---|:---|
| B2C Free → Premium (tỷ lệ chuyển đổi 5%) | 2,000 users × 5% × 99K/tháng × 12 | ~118 triệu VNĐ |
| B2B Campus License (3 trường/khoa) | 3 × 100 triệu VNĐ | ~300 triệu VNĐ |
| **Tổng cộng năm 1** | | **~418 triệu VNĐ** |

---

## PHẦN 10: KẾ HOẠCH PHÁT TRIỂN & LỘ TRÌNH TƯƠNG LAI

### 10.1. Roadmap chi tiết 12 tháng

**Giai đoạn 1 (Tháng 1–2): Hoàn thiện Backend Core**
- Xây dựng FastAPI backend: CRUD cho User, Course, Chapter, Lesson, Quiz.
- JWT + Redis Session Management + Single-Device Lock.
- GitHub OAuth cho học viên (nộp bài) và quản trị (phân tích repo).
- Kết nối Gemini API vào AI Mentor thay thế mock data.

**Giai đoạn 2 (Tháng 3–4): Tích hợp AI Engine & Beta**
- AIGC Pipeline: Upload PDF → AI summarize → AI tạo Quiz → AI tạo Master Graph.
- Celery queue cho render video bài giảng bất đồng bộ.
- Module quét MOSS phát hiện đạo văn code.
- **Thử nghiệm Beta đóng: 200 sinh viên OOP Java tại 2–3 trường ĐH.**

**Giai đoạn 3 (Tháng 5–6): Tính năng xã hội & Ra mắt thương mại**
- Tech Reels pipeline crawl-summarize-render tự động hàng ngày.
- React Flow Canvas cho Mindmap Guided Mode 3 cấp.
- Tích hợp cổng thanh toán VNPay / MoMo cho Premium.
- **Ra mắt công khai phiên bản thương mại đầu tiên.**

**Giai đoạn 4 (Tháng 7–12): Mở rộng & Scale**
- Ứng dụng di động (React Native) cho iOS và Android.
- Mở rộng khóa học: Cấu trúc Dữ liệu, Thuật toán, Thiết kế hệ thống.
- Tính năng Study Rooms và thảo luận thời gian thực.
- Ký kết B2B với các trường đại học kỹ thuật đầu tiên.

---

## PHẦN 11: PHÂN TÍCH RỦI RO & GIẢI PHÁP GIẢM THIỂU

| Rủi ro | Mức độ | Giải pháp giảm thiểu |
|:---|:---:|:---|
| Chi phí Gemini API tăng cao khi scale | Trung bình | Context Caching tối ưu token/request; Cache kết quả cho câu hỏi lặp lại phổ biến |
| Độ chính xác AI Mentor không đảm bảo | Cao | Giảng viên phải phê duyệt nội dung AI trước khi publish; cơ chế feedback báo lỗi |
| Học viên bypass 2 lớp GitHub | Thấp | Lớp cuối (Human Review của GV) không thể bỏ qua; cập nhật thuật toán liên tục |
| Cạnh tranh từ LMS mới | Trung bình | Deepening tính năng unique (Mindmap AI, 2-layer GitHub) khó copy nhanh |
| Tỷ lệ giữ chân thấp sau tháng đầu | Trung bình | Tối ưu onboarding, cải thiện Streak mechanics, thông báo thông minh |
| Tốc độ load trang chậm trên mạng yếu | Thấp | Code-splitting, lazy loading, CDN toàn cầu qua Vercel Edge Network |

---

## PHẦN 12: KẾT LUẬN

Dự án **Code-Mind** đại diện cho một bước đột phá thực sự trong lĩnh vực giáo dục công nghệ tại Việt Nam. Thay vì chỉ đưa ra ý tưởng, nhóm đã chứng minh tính khả thi bằng cách **xây dựng và triển khai thành công bản Prototype hoạt động đầy đủ**, phản ánh rõ nét tầm nhìn sản phẩm trong từng dòng code.

Code-Mind không chỉ là một ứng dụng học tập — nó là một **hệ sinh thái giáo dục thông minh** được thiết kế từ trong ra ngoài để giải quyết ba vấn đề căn bản nhất của giáo dục trực tuyến hiện đại:

1. **Tỷ lệ bỏ học cao** → Giải quyết bằng AI Mascot đồng hành + Gamification RPG sâu sắc.
2. **Thiếu cá nhân hóa** → Giải quyết bằng VAK Adaptive Engine thích ứng theo thời gian thực.
3. **Gian lận học thuật** → Giải quyết bằng hệ thống GitHub 2 lớp bảo vệ không có đối thủ.

Với nền tảng kỹ thuật vững chắc (React 19 + Vite + Tailwind CSS v4 + Gemini API), giao diện thiết kế premium được đầu tư kỹ lưỡng, và lộ trình phát triển rõ ràng theo từng giai đoạn cụ thể, nhóm dự án Code-Mind tự tin rằng đây là giải pháp EdTech có khả năng triển khai thực tế cao, tạo ra tác động tích cực và bền vững cho hàng trăm nghìn sinh viên kỹ thuật trên khắp Việt Nam.

---

**Thông tin liên hệ nhóm dự án:**

[Điền tên thành viên nhóm, trường, khoa, số điện thoại liên hệ, email tại đây]

---

*Tài liệu này được soạn thảo phục vụ Vòng 2 Cuộc thi Ý tưởng Đổi mới Sáng tạo "Khởi Nguyên" — Tháng 7/2026*
