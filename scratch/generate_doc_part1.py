import os
import zipfile
import html

def esc(txt):
    return html.escape(str(txt))

class DocxBuilder:
    def __init__(self):
        self.body_elements = []

    def add_heading(self, text, level=1):
        styles = {
            1: ("Heading1", "003366", 32, 280, 140),
            2: ("Heading2", "1F4E79", 26, 200, 100),
            3: ("Heading3", "2E75B6", 24, 160, 80),
        }
        style_name, color, sz, before, after = styles.get(level, ("Heading1", "003366", 28, 200, 100))
        pPr = f"""<w:pPr>
            <w:pStyle w:val="{style_name}"/>
            <w:spacing w:before="{before}" w:after="{after}"/>
        </w:pPr>"""
        rPr = f"""<w:rPr>
            <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/>
            <w:b/>
            <w:color w:val="{color}"/>
            <w:sz w:val="{sz}"/>
        </w:rPr>"""
        xml = f"<w:p>{pPr}<w:r>{rPr}<w:t>{esc(text)}</w:t></w:r></w:p>"
        self.body_elements.append(xml)

    def add_paragraph_runs(self, runs_data, align="left", space_before=80, space_after=80, bullet=False):
        pPr = ["<w:pPr>"]
        if align:
            pPr.append(f'<w:jc w:val="{align}"/>')
        if bullet:
            pPr.append('<w:pStyle w:val="ListBullet"/>')
            pPr.append('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>')
        pPr.append(f'<w:spacing w:before="{space_before}" w:after="{space_after}" w:line="260" w:lineRule="auto"/>')
        pPr.append("</w:pPr>")

        r_xmls = []
        for item in runs_data:
            text = item[0]
            bold = item[1] if len(item) > 1 else False
            italic = item[2] if len(item) > 2 else False
            color = item[3] if len(item) > 3 and item[3] else "333333"
            sz = item[4] if len(item) > 4 and item[4] else 22
            is_code = item[5] if len(item) > 5 else False

            rPr = ["<w:rPr>"]
            if is_code:
                rPr.append('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>')
                rPr.append('<w:shd w:val="clear" w:color="auto" w:fill="F0F4F8"/>')
                rPr.append('<w:color w:val="B22222"/>')
            else:
                rPr.append('<w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/>')
                if color:
                    rPr.append(f'<w:color w:val="{color}"/>')
            if bold:
                rPr.append("<w:b/>")
            if italic:
                rPr.append("<w:i/>")
            if sz:
                rPr.append(f'<w:sz w:val="{sz}"/>')
            rPr.append("</w:rPr>")
            r_xmls.append(f"<w:r>{''.join(rPr)}<w:t xml:space=\"preserve\">{esc(text)}</w:t></w:r>")

        xml = f"<w:p>{''.join(pPr)}{''.join(r_xmls)}</w:p>"
        self.body_elements.append(xml)

    def add_callout(self, title, content_lines, border_color="1976D2", bg_color="F0F7FF"):
        tbl = []
        tbl.append('<w:tbl>')
        tbl.append(f'''<w:tblPr>
            <w:tblW w:w="9400" w:type="dxa"/>
            <w:tblBorders>
                <w:top w:val="none"/>
                <w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/>
                <w:bottom w:val="none"/>
                <w:right w:val="none"/>
            </w:tblBorders>
            <w:tblCellMar>
                <w:top w:w="120" w:type="dxa"/>
                <w:left w:w="180" w:type="dxa"/>
                <w:bottom w:w="120" w:type="dxa"/>
                <w:right w:w="180" w:type="dxa"/>
            </w:tblCellMar>
        </w:tblPr>''')
        tbl.append('<w:tblGrid><w:gridCol w:w="9400"/></w:tblGrid>')
        tbl.append('<w:tr>')
        tbl.append(f'<w:tc><w:tcPr><w:tcW w:w="9400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="{bg_color}"/></w:tcPr>')
        
        tbl.append(f'''<w:p>
            <w:pPr><w:spacing w:before="60" w:after="40"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/><w:b/><w:color w:val="{border_color}"/><w:sz w:val="22"/></w:rPr>
            <w:t>{esc(title)}</w:t></w:r>
        </w:p>''')
        
        for line in content_lines:
            tbl.append(f'''<w:p>
                <w:pPr><w:spacing w:before="20" w:after="30"/></w:pPr>
                <w:r><w:rPr><w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/><w:color w:val="333333"/><w:sz w:val="21"/></w:rPr>
                <w:t>{esc(line)}</w:t></w:r>
            </w:p>''')
            
        tbl.append('</w:tc></w:tr></w:tbl>')
        tbl.append('<w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr></w:p>')
        self.body_elements.append(''.join(tbl))

    def add_table(self, headers, rows, col_widths=None, header_bg="1F4E79", alt_bg="F9FAFB"):
        if not col_widths:
            total_w = 9400
            col_widths = [total_w // len(headers)] * len(headers)
        
        tbl = []
        tbl.append('<w:tbl>')
        tbl.append('''<w:tblPr>
            <w:tblW w:w="9400" w:type="dxa"/>
            <w:tblBorders>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="D3D3D3"/>
                <w:left w:val="none"/>
                <w:bottom w:val="single" w:sz="12" w:space="0" w:color="1F4E79"/>
                <w:right w:val="none"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
                <w:insideV w:val="none"/>
            </w:tblBorders>
            <w:tblCellMar>
                <w:top w:w="120" w:type="dxa"/>
                <w:left w:w="140" w:type="dxa"/>
                <w:bottom w:w="120" w:type="dxa"/>
                <w:right w:w="140" w:type="dxa"/>
            </w:tblCellMar>
        </w:tblPr>''')
        
        tbl.append('<w:tblGrid>')
        for w in col_widths:
            tbl.append(f'<w:gridCol w:w="{w}"/>')
        tbl.append('</w:tblGrid>')
        
        tbl.append('<w:tr>')
        tbl.append('<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>')
        for idx, h in enumerate(headers):
            w = col_widths[idx]
            tbl.append(f'''<w:tc>
                <w:tcPr>
                    <w:tcW w:w="{w}" w:type="dxa"/>
                    <w:shd w:val="clear" w:color="auto" w:fill="{header_bg}"/>
                </w:tcPr>
                <w:p>
                    <w:pPr><w:spacing w:before="40" w:after="40"/><w:jc w:val="left"/></w:pPr>
                    <w:r>
                        <w:rPr><w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="21"/></w:rPr>
                        <w:t>{esc(h)}</w:t>
                    </w:r>
                </w:p>
            </w:tc>''')
        tbl.append('</w:tr>')
        
        for r_idx, row in enumerate(rows):
            bg = alt_bg if r_idx % 2 == 1 else "FFFFFF"
            tbl.append('<w:tr><w:trPr><w:cantSplit/></w:trPr>')
            for c_idx, cell in enumerate(row):
                w = col_widths[c_idx]
                is_first_col = (c_idx == 0)
                tbl.append(f'''<w:tc>
                    <w:tcPr>
                        <w:tcW w:w="{w}" w:type="dxa"/>
                        <w:shd w:val="clear" w:color="auto" w:fill="{bg}"/>
                    </w:tcPr>
                    <w:p>
                        <w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr>
                        <w:r>
                            <w:rPr>
                                <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/>
                                {"<w:b/>" if is_first_col else ""}
                                <w:color w:val="222222"/>
                                <w:sz w:val="20"/>
                            </w:rPr>
                            <w:t>{esc(cell)}</w:t>
                        </w:r>
                    </w:p>
                </w:tc>''')
            tbl.append('</w:tr>')
            
        tbl.append('</w:tbl>')
        tbl.append('<w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr></w:p>')
        self.body_elements.append(''.join(tbl))

    def save(self, filepath):
        body_xml = "".join(self.body_elements)
        sectPr = '''<w:sectPr>
            <w:pgSz w:w="11906" w:h="16838"/>
            <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
            <w:cols w:space="720"/>
            <w:docGrid w:linePitch="360"/>
        </w:sectPr>'''
        
        doc_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <w:body>
        {body_xml}
        {sectPr}
    </w:body>
</w:document>'''

        content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>'''

        root_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''

        word_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''

        core_props = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:dcterms="http://purl.org/dc/terms/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Báo Cáo Thiết Kế Kiến Trúc &amp; Class Diagram</dc:title>
  <dc:subject>Quy hoạch phân tầng Presentation - BLL - DAL và thiết kế thực thể</dc:subject>
  <dc:creator>Google Antigravity AI</dc:creator>
  <cp:lastModifiedBy>Google Antigravity AI</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-11-09T08:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-11-09T08:00:00Z</dcterms:modified>
</cp:coreProperties>'''

        app_props = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
            xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
  <DocSecurity>0</DocSecurity>
  <Company>EdTech System Platform</Company>
</Properties>'''

        styles_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:eastAsia="Segoe UI" w:cs="Segoe UI"/>
      <w:sz w:val="22"/>
      <w:szCs w:val="22"/>
      <w:lang w:val="vi-VN"/>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="240" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>

  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/>
      <w:b/>
      <w:color w:val="003366"/>
      <w:sz w:val="32"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/>
      <w:b/>
      <w:color w:val="1F4E79"/>
      <w:sz w:val="26"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/>
      <w:b/>
      <w:color w:val="2E75B6"/>
      <w:sz w:val="24"/>
    </w:rPr>
  </w:style>
</w:styles>'''

        with zipfile.ZipFile(filepath, 'w', compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr('[Content_Types].xml', content_types)
            z.writestr('_rels/.rels', root_rels)
            z.writestr('word/_rels/document.xml.rels', word_rels)
            z.writestr('word/document.xml', doc_xml)
            z.writestr('word/styles.xml', styles_xml)
            z.writestr('docProps/core.xml', core_props)
            z.writestr('docProps/app.xml', app_props)
        print(f"Successfully generated: {filepath}")

def build_part1():
    b = DocxBuilder()
    
    # COVER / HEADER
    b.add_paragraph_runs([("HỆ THỐNG ĐÀO TẠO & HỖ TRỢ LẬP TRÌNH SOCRATIC AI", True, False, "003366", 36)], align="center", space_before=200, space_after=100)
    b.add_paragraph_runs([("TÀI LIỆU ĐẶC TẢ KIẾN TRÚC PHÂN TẦNG VÀ CLASS DIAGRAM CÁC THỰC THỂ", True, False, "1F4E79", 26)], align="center", space_before=50, space_after=200)
    
    b.add_callout("THÔNG TIN DỰ ÁN", [
        "• Phạm vi tài liệu: Quy hoạch phân tầng Presentation Layer (React 19 + FastAPI Router) -> Business Logic Layer -> Data Access Layer.",
        "• Thiết kế Class Diagram 5 thực thể chính: User, Role, Course, Submission, SocraticHint.",
        "• Định dạng sơ đồ đi kèm: architecture_and_class_diagram.drawio (Tab 1 & Tab 2)."
    ], border_color="003366", bg_color="F2F7FA")

    # PHẦN 1
    b.add_heading("PHẦN 1: QUY HOẠCH KIẾN TRÚC PHÂN TẦNG (3-TIER ARCHITECTURE)", level=1)
    
    b.add_heading("1.1 Triết lý và Nguyên tắc phân tầng", level=2)
    b.add_paragraph_runs([
        ("Hệ thống được tổ chức theo kiến trúc ", False),
        ("Clean 3-Tier Layered Architecture", True, False, "003366"),
        (". Nguyên tắc cốt lõi là phân tách độc lập trách nhiệm (Separation of Concerns), đảm bảo tầng trên phụ thuộc tầng dưới thông qua abstraction/interface mà không phụ thuộc ngược lại (Dependency Inversion).", False)
    ])
    
    layer_headers = ["Tầng kiến trúc", "Công nghệ chính", "Trách nhiệm chính", "Giao thức / Cơ chế"]
    layer_rows = [
        ["Presentation Layer (Client)", "React 19, Tailwind CSS, Shadcn/UI, Monaco Editor", "Hiển thị giao diện, tiếp nhận tương tác người dùng, xử lý Client/Server Actions, stream câu hỏi Socratic.", "HTTPS, REST JSON, Server-Sent Events (SSE)"],
        ["Presentation Layer (Server)", "FastAPI 0.115+, Pydantic v2, SlowAPI", "Routing, tiếp nhận HTTP Request, Validate DTOs, Serialization, lọc dữ liệu nhạy cảm, Middleware phân quyền.", "FastAPI Depends, JWT Bearer Token"],
        ["Business Logic Layer (BLL)", "Python Domain Services, LLM Client (Gemini API)", "Thực thi toàn bộ nghiệp vụ cốt lõi: xác thực RBAC, chấm điểm code qua Sandbox, thuật toán điều phối gợi ý Socratic 3 cấp độ.", "Pure Python Services, Async Tasks"],
        ["Data Access Layer (DAL)", "SQLAlchemy 2.0 Async, asyncpg, Alembic", "Trừu tượng hóa truy xuất dữ liệu thông qua Generic Repository Pattern và Unit of Work Pattern (Transaction ACID).", "Async DB Connection Pool"],
        ["Infrastructure / Persistence", "PostgreSQL 16, Redis 7, Docker Sandbox", "Lưu trữ dữ liệu quan hệ, Cache phiên đăng nhập, Rate Limit token bucket, môi trường cách ly chạy mã nguồn an toàn.", "TCP, Unix Socket, REST Sandbox"]
    ]
    b.add_table(layer_headers, layer_rows, [2200, 2400, 2800, 2000], header_bg="003366")

    b.add_heading("1.2 Chi tiết tầng Presentation (React 19 & FastAPI Router)", level=2)
    b.add_paragraph_runs([("a. Điểm nổi bật của React 19 trên Frontend:", True)])
    b.add_paragraph_runs([("• ", False), ("useActionState & Actions: ", True), ("Quản lý vòng đời gửi bài nộp (submit code) và yêu cầu gợi ý Socratic một cách trực quan, tự động xử lý trạng thái pending/loading.", False)], bullet=True)
    b.add_paragraph_runs([("• ", False), ("useOptimistic: ", True), ("Cập nhật ngay lập tức giao diện người dùng (như thêm tin nhắn phản hồi vào khung chat) trước khi máy chủ phản hồi xong.", False)], bullet=True)
    b.add_paragraph_runs([("• ", False), ("Server-Sent Events (SSE) Streaming: ", True), ("Tiếp nhận luồng token câu hỏi gợi mở từ Socratic AI từng từ một, mang lại trải nghiệm mượt mà không bị gián đoạn.", False)], bullet=True)

    b.add_paragraph_runs([("b. Trách nhiệm của FastAPI Router trên Backend:", True)])
    b.add_paragraph_runs([("• ", False), ("Pydantic v2 Schemas: ", True), ("Đóng vai trò Data Transfer Object (DTO) xác thực chặt chẽ mọi dữ liệu đầu vào và chuyển đổi model trước khi trả về client.", False)], bullet=True)
    b.add_paragraph_runs([("• ", False), ("FastAPI Dependency Injection: ", True), ("Kiểm tra JWT Token hợp lệ, trích xuất quyền người dùng thông qua Depends(get_current_user), cấp phát scoped DB session an toàn.", False)], bullet=True)

    b.add_heading("1.3 Chi tiết tầng Business Logic (BLL - Domain Services)", level=2)
    b.add_paragraph_runs([
        ("Tầng BLL hoàn toàn tách biệt khỏi các thư viện HTTP hay ORM cụ thể, bao gồm 4 Service trọng tâm:", False)
    ])
    b.add_paragraph_runs([("1. ", False), ("AuthService: ", True), ("Mã hóa mật khẩu bằng thuật toán Argon2/Bcrypt, tạo và xác thực Access/Refresh JWT, thẩm định quyền hạn truy cập của Role.", False)])
    b.add_paragraph_runs([("2. ", False), ("CourseService: ", True), ("Quản lý quy trình xuất bản khóa học, điều kiện tiên quyết và tính toán tiến độ học tập.", False)])
    b.add_paragraph_runs([("3. ", False), ("SubmissionService: ", True), ("Tiếp nhận mã nguồn, gửi tới Engine Docker Sandbox để chạy test suite, tính điểm và thu thập lỗi biên dịch/runtime.", False)])
    b.add_paragraph_runs([("4. ", False), ("SocraticHintService (Core AI): ", True), ("Điều phối sinh gợi ý sư phạm theo phương pháp Socratic. Không cung cấp code hoàn chỉnh hay lời giải trực tiếp, mà hướng dẫn học viên tự tư duy qua mô hình Scaffolding 3 cấp độ.", False)])

    b.add_callout("CƠ CHẾ SCAFFOLDING 3 CẤP ĐỘ CỦA SOCRATIC HINT SERVICE", [
        "• Level 1 (Khái niệm - Conceptual Hint): Chỉ ra vùng kiến thức lý thuyết học viên cần ôn lại (ví dụ: Cấu trúc vòng lặp while, Điều kiện dừng đệ quy).",
        "• Level 2 (Vị trí & Manh mối - Location & Clue): Định hướng học viên chú ý vào dòng code, biến số hoặc biểu thức logic đang gây ra sai lệch kết quả.",
        "• Level 3 (Câu hỏi phản biện - Deep Guiding Question): Đặt câu hỏi kích thích tư duy (ví dụ: 'Nếu giá trị mảng đầu vào rỗng [], biến con trỏ của bạn sẽ trỏ vào đâu?')."
    ], border_color="7B1FA2", bg_color="FBF5FD")

    b.add_heading("1.4 Chi tiết tầng Data Access (DAL - Repository & Unit of Work)", level=2)
    b.add_paragraph_runs([
        ("DAL chịu trách nhiệm giao tiếp trực tiếp với cơ sở dữ liệu. Để tránh tình trạng code nghiệp vụ bị phụ thuộc chặt vào SQL, hệ thống áp dụng hai mẫu thiết kế tiêu chuẩn:", False)
    ])
    b.add_paragraph_runs([("• ", False), ("Repository Pattern: ", True), ("GenericRepository cung cấp các thao tác CRUD cơ bản. Các repository cụ thể mở rộng thêm các hàm truy vấn nghiệp vụ phức tạp.", False)], bullet=True)
    b.add_paragraph_runs([("• ", False), ("Unit of Work (UoW) Pattern: ", True), ("Đóng gói phiên làm việc của database (Async Session), đảm bảo tính toàn vẹn giao dịch (ACID).", False)], bullet=True)

    # PHẦN 2
    b.add_heading("PHẦN 2: THIẾT KẾ CLASS DIAGRAM CÁC THỰC THỂ (ENTITIES)", level=1)
    b.add_paragraph_runs([
        ("Hệ thống bao gồm 5 thực thể chính: ", False),
        ("Role, User, Course, Submission, SocraticHint", True, False, "003366"),
        (" cùng với 2 kiểu dữ liệu liệt kê (Enumerations). Dưới đây là bảng đặc tả chi tiết từng thực thể:", False)
    ])

    # 2.1 Role
    b.add_heading("2.1 Thực thể Role (Vai trò & Quyền hạn)", level=2)
    role_headers = ["Tên thuộc tính", "Kiểu dữ liệu", "Ràng buộc", "Mô tả nghiệp vụ"]
    role_rows = [
        ["id", "UUID", "Primary Key, Default UUIDv4", "Mã định danh duy nhất của vai trò"],
        ["name", "String(50)", "Unique, Not Null", "Tên vai trò (ADMIN, INSTRUCTOR, STUDENT)"],
        ["description", "String(255)", "Nullable", "Mô tả chi tiết về thẩm quyền của vai trò"],
        ["permissions", "List<String> (JSONB)", "Not Null, Default []", "Danh sách quyền chi tiết (vd: course:write, hint:view)"],
        ["created_at", "DateTime", "Not Null, Default UTC now", "Thời điểm khởi tạo bản ghi"]
    ]
    b.add_table(role_headers, role_rows, [1800, 2200, 2200, 3200], header_bg="1976D2")
    b.add_paragraph_runs([("Phương thức chính của Role: ", True), ("has_permission(permission: str) -> bool: Kiểm tra xem vai trò hiện tại có chứa quyền hạn chỉ định hay không.", False)])

    # 2.2 User
    b.add_heading("2.2 Thực thể User (Người dùng hệ thống)", level=2)
    user_headers = ["Tên thuộc tính", "Kiểu dữ liệu", "Ràng buộc", "Mô tả nghiệp vụ"]
    user_rows = [
        ["id", "UUID", "Primary Key, Default UUIDv4", "Mã định danh duy nhất của người dùng"],
        ["email", "String(255)", "Unique, Not Null, Index", "Email đăng nhập hệ thống"],
        ["password_hash", "String(255)", "Not Null", "Chuỗi mật khẩu băm bảo mật (Argon2id/Bcrypt)"],
        ["full_name", "String(150)", "Not Null", "Họ và tên hiển thị của người dùng"],
        ["avatar_url", "String(500)", "Nullable", "Đường dẫn ảnh đại diện"],
        ["is_active", "Boolean", "Not Null, Default True", "Trạng thái kích hoạt tài khoản"],
        ["role_id", "UUID", "Foreign Key -> Role.id", "Vai trò của người dùng trong hệ thống"],
        ["created_at", "DateTime", "Not Null, Default UTC now", "Thời điểm đăng ký tài khoản"],
        ["updated_at", "DateTime", "Not Null, Default UTC now", "Thời điểm cập nhật thông tin gần nhất"]
    ]
    b.add_table(user_headers, user_rows, [1800, 2200, 2200, 3200], header_bg="3F51B5")
    b.add_paragraph_runs([("Phương thức chính của User:", True)])
    b.add_paragraph_runs([("• verify_password(plain_password: str) -> bool: Đối soát mật khẩu thô với hash.", False)], bullet=True)
    b.add_paragraph_runs([("• is_admin() -> bool / is_instructor() -> bool: Kiểm tra nhanh vai trò quản trị/giảng viên.", False)], bullet=True)

    # 2.3 Course
    b.add_heading("2.3 Thực thể Course (Khóa học)", level=2)
    course_headers = ["Tên thuộc tính", "Kiểu dữ liệu", "Ràng buộc", "Mô tả nghiệp vụ"]
    course_rows = [
        ["id", "UUID", "Primary Key, Default UUIDv4", "Mã định danh duy nhất của khóa học"],
        ["title", "String(200)", "Not Null", "Tiêu đề khóa học"],
        ["slug", "String(250)", "Unique, Not Null, Index", "Đường dẫn URL thân thiện SEO của khóa học"],
        ["description", "Text", "Nullable", "Mô tả tổng quát và mục tiêu khóa học"],
        ["syllabus", "Text / JSONB", "Nullable", "Đề cương bài giảng và bài tập chi tiết"],
        ["instructor_id", "UUID", "Foreign Key -> User.id", "Mã giảng viên phụ trách khóa học"],
        ["is_published", "Boolean", "Not Null, Default False", "Trạng thái công khai (Draft / Published)"],
        ["created_at", "DateTime", "Not Null, Default UTC now", "Ngày tạo khóa học"],
        ["updated_at", "DateTime", "Not Null, Default UTC now", "Ngày chỉnh sửa gần nhất"]
    ]
    b.add_table(course_headers, course_rows, [1800, 2200, 2200, 3200], header_bg="00796B")
    b.add_paragraph_runs([("Phương thức chính của Course:", True)])
    b.add_paragraph_runs([("• publish() -> void: Chuyển cờ is_published sang True khi đủ điều kiện kiểm duyệt.", False)], bullet=True)
    b.add_paragraph_runs([("• is_enrolled(student_id: UUID) -> bool: Kiểm tra học viên đã đăng ký khóa học chưa.", False)], bullet=True)

    # 2.4 Submission
    b.add_heading("2.4 Thực thể Submission (Bài nộp lập trình)", level=2)
    sub_headers = ["Tên thuộc tính", "Kiểu dữ liệu", "Ràng buộc", "Mô tả nghiệp vụ"]
    sub_rows = [
        ["id", "UUID", "Primary Key, Default UUIDv4", "Mã định danh duy nhất của bài nộp"],
        ["student_id", "UUID", "Foreign Key -> User.id, Index", "Mã học viên nộp bài"],
        ["course_id", "UUID", "Foreign Key -> Course.id, Index", "Mã khóa học chứa bài tập"],
        ["source_code", "Text", "Not Null", "Toàn bộ mã nguồn do học viên nộp"],
        ["programming_language", "String(50)", "Not Null", "Ngôn ngữ lập trình (Python, JS, C++,...)"],
        ["status", "SubmissionStatus (Enum)", "Not Null, Default PENDING", "Trạng thái chấm bài (EVALUATING, ACCEPTED,...)"],
        ["score", "Float", "Not Null, Default 0.0", "Điểm số đạt được trên thang điểm 100.0"],
        ["execution_output", "Text", "Nullable", "Kết quả in ra màn hình hoặc log test runner"],
        ["error_trace", "Text", "Nullable", "Dấu vết thông báo lỗi biên dịch/runtime chi tiết"],
        ["submitted_at", "DateTime", "Not Null, Default UTC now", "Thời điểm học viên nộp bài"]
    ]
    b.add_table(sub_headers, sub_rows, [1800, 2200, 2200, 3200], header_bg="F57C00")
    b.add_paragraph_runs([("Phương thức chính của Submission:", True)])
    b.add_paragraph_runs([("• mark_evaluated(status, score, output) -> void: Cập nhật kết quả sau khi sandbox hoàn thành.", False)], bullet=True)
    b.add_paragraph_runs([("• can_request_hint() -> bool: Xác thực xem bài nộp có đủ điều kiện yêu cầu gợi ý Socratic hay không.", False)], bullet=True)

    # 2.5 SocraticHint
    b.add_heading("2.5 Thực thể SocraticHint (Gợi ý Socratic)", level=2)
    hint_headers = ["Tên thuộc tính", "Kiểu dữ liệu", "Ràng buộc", "Mô tả nghiệp vụ"]
    hint_rows = [
        ["id", "UUID", "Primary Key, Default UUIDv4", "Mã định danh duy nhất của lượt gợi ý"],
        ["submission_id", "UUID", "Foreign Key -> Submission.id", "Mã bài nộp gặp lỗi cần hỗ trợ"],
        ["student_id", "UUID", "Foreign Key -> User.id", "Mã học viên nhận hỗ trợ"],
        ["hint_level", "SmallInt", "Not Null, Giá trị 1..3", "Cấp độ gợi mở sư phạm (1, 2 hoặc 3)"],
        ["student_query", "Text", "Nullable", "Câu hỏi hoặc phản hồi thêm từ học viên"],
        ["prompt_context", "Text", "Not Null", "Tóm tắt ngữ cảnh lỗi & bài tập gửi cho LLM"],
        ["socratic_question", "Text", "Not Null", "Nội dung câu hỏi định hướng do AI sinh ra"],
        ["feedback", "HintFeedback (Enum)", "Nullable", "Đánh giá chất lượng của học viên"],
        ["created_at", "DateTime", "Not Null, Default UTC now", "Thời điểm sinh câu hỏi gợi mở"]
    ]
    b.add_table(hint_headers, hint_rows, [1800, 2200, 2200, 3200], header_bg="7B1FA2")
    b.add_paragraph_runs([("Phương thức chính của SocraticHint:", True)])
    b.add_paragraph_runs([("• mark_feedback(rating: HintFeedback) -> void: Ghi nhận đánh giá phản hồi từ học viên.", False)], bullet=True)
    b.add_paragraph_runs([("• is_max_level() -> bool: Kiểm tra đã chạm trần gợi ý cấp độ 3 chưa để tránh lạm dụng AI.", False)], bullet=True)

    # 2.6 Enums
    b.add_heading("2.6 Kiểu dữ liệu liệt kê (Enumerations)", level=2)
    b.add_paragraph_runs([("1. SubmissionStatus: ", True), ("PENDING, EVALUATING, ACCEPTED, WRONG_ANSWER, COMPILATION_ERROR, RUNTIME_ERROR, TIME_LIMIT_EXCEEDED.", False)])
    b.add_paragraph_runs([("2. HintFeedback: ", True), ("HELPFUL (Có ích), CONFUSING (Khó hiểu), IRRELEVANT (Lạc đề), RESOLVED_PROBLEM (Đã tự tìm ra lời giải).", False)])

    # PHẦN 3
    b.add_heading("PHẦN 3: BẢN ĐẶC TẢ MỐI QUAN HỆ GIỮA CÁC THỰC THỂ", level=1)
    rel_headers = ["Thực thể nguồn", "Quan hệ", "Thực thể đích", "Ý nghĩa nghiệp vụ & Ràng buộc toàn vẹn"]
    rel_rows = [
        ["Role (1)", "assigned to (0..*)", "User", "Một vai trò áp dụng cho nhiều người dùng; mỗi người dùng bắt buộc thuộc về 1 vai trò duy nhất."],
        ["User (1)", "instructs (0..*)", "Course", "Một giảng viên có thể phụ trách giảng dạy nhiều khóa học; một khóa học do 1 giảng viên chủ trì."],
        ["User (1)", "submits (0..*)", "Submission", "Một học viên thực hiện nhiều lượt nộp bài qua các bài tập của các khóa học khác nhau."],
        ["Course (1)", "evaluates for (0..*)", "Submission", "Một khóa học sở hữu tập hợp các bài nộp thuộc về các bài tập trong đề cương của khóa đó."],
        ["Submission (1)", "triggers (0..*)", "SocraticHint", "Một bài nộp không đạt có thể kích hoạt chuỗi gợi ý đối thoại Socratic theo thứ tự cấp độ 1 -> 2 -> 3."],
        ["User (1)", "receives (0..*)", "SocraticHint", "Một học viên tiếp nhận và tương tác với các lượt gợi ý tương ứng với bài làm của mình."]
    ]
    b.add_table(rel_headers, rel_rows, [1800, 2000, 1800, 3800], header_bg="203A43")

    out_file = r"c:\Users\phand\OneDrive\Tài liệu\project\Bao_Cao_Thiet_Ke_Kien_Truc_Va_Class_Diagram.docx"
    b.save(out_file)

if __name__ == "__main__":
    build_part1()
