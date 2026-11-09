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

    def add_code_block(self, code_text):
        tbl = []
        tbl.append('<w:tbl>')
        tbl.append('''<w:tblPr>
            <w:tblW w:w="9400" w:type="dxa"/>
            <w:tblBorders>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="CFD8DC"/>
                <w:left w:val="single" w:sz="18" w:space="0" w:color="607D8B"/>
                <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CFD8DC"/>
                <w:right w:val="single" w:sz="6" w:space="0" w:color="CFD8DC"/>
            </w:tblBorders>
            <w:tblCellMar>
                <w:top w:w="120" w:type="dxa"/>
                <w:left w:w="160" w:type="dxa"/>
                <w:bottom w:w="120" w:type="dxa"/>
                <w:right w:w="160" w:type="dxa"/>
            </w:tblCellMar>
        </w:tblPr>''')
        tbl.append('<w:tblGrid><w:gridCol w:w="9400"/></w:tblGrid>')
        tbl.append('<w:tr>')
        tbl.append('<w:tc><w:tcPr><w:tcW w:w="9400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8F9FA"/></w:tcPr>')
        
        for line in code_text.strip().split('\n'):
            tbl.append(f'''<w:p>
                <w:pPr><w:spacing w:before="15" w:after="15"/><w:line w:line="220" w:lineRule="auto"/></w:pPr>
                <w:r>
                    <w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:color w:val="263238"/><w:sz w:val="19"/></w:rPr>
                    <w:t xml:space="preserve">{esc(line)}</w:t>
                </w:r>
            </w:p>''')
            
        tbl.append('</w:tc></w:tr></w:tbl>')
        tbl.append('<w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr></w:p>')
        self.body_elements.append(''.join(tbl))

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
                <w:top w:w="110" w:type="dxa"/>
                <w:left w:w="130" w:type="dxa"/>
                <w:bottom w:w="110" w:type="dxa"/>
                <w:right w:w="130" w:type="dxa"/>
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
                        <w:pPr><w:spacing w:before="35" w:after="35"/></w:pPr>
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
        tbl.append('<w:p><w:pPr><w:spacing w:before="50" w:after="50"/></w:pPr></w:p>')
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
  <dc:title>Báo Cáo Thông Điệp Gateway &amp; Runner - ERD 8 Bảng 3NF</dc:title>
  <dc:subject>Trực quan hóa thông điệp Client - Gateway - Docker Runner và ERD 3NF UTC</dc:subject>
  <dc:creator>Google Antigravity AI</dc:creator>
  <cp:lastModifiedBy>Google Antigravity AI</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-11-09T08:50:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-11-09T08:50:00Z</dcterms:modified>
</cp:coreProperties>'''

        app_props = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
            xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
  <DocSecurity>0</DocSecurity>
  <Company>E-Learning Socratic AI Platform</Company>
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

def build_part2():
    b = DocxBuilder()
    
    # COVER / HEADER
    b.add_paragraph_runs([("HỆ THỐNG ĐÀO TẠO & HỖ TRỢ LẬP TRÌNH SOCRATIC AI", True, False, "003366", 36)], align="center", space_before=240, space_after=100)
    b.add_paragraph_runs([("TÀI LIỆU 2: TRỰC QUAN HÓA THÔNG ĐIỆP HỆ THỐNG VÀ THIẾT KẾ ERD 8 BẢNG 3NF (UTC TIMESTAMPS)", True, False, "1F4E79", 25)], align="center", space_before=50, space_after=180)
    
    b.add_callout("PHẠM VI ĐẶC TẢ TÀI LIỆU 2", [
        "1. Trực quan hóa thông điệp phân tán: Client (React 19) -> API Gateway (FastAPI) -> Docker Runner Sandbox.",
        "2. Đặc tả các gói tin JSON Payload: Ingestion, Dispatch, Execution Telemetry và SSE Stream Socratic.",
        "3. Thiết kế ERD 8 bảng chuẩn hóa 3NF tuyệt đối: Triệt tiêu toàn bộ phụ thuộc bắc cầu (Transitive Dependencies).",
        "4. Bắt buộc 100% cột created_at / updated_at sử dụng kiểu TIMESTAMPTZ theo múi giờ UTC.",
        "5. Mã nguồn DDL PostgreSQL hoàn chỉnh có triggers tự động cập nhật timestamps."
    ], border_color="00796B", bg_color="E6F4F1")

    # PHẦN 1
    b.add_heading("PHẦN 1: TRỰC QUAN HÓA THÔNG ĐIỆP (CLIENT -> GATEWAY -> DOCKER RUNNER)", level=1)
    
    b.add_heading("1.1 Quy trình giao tiếp tuần tự 4 giai đoạn", level=2)
    b.add_paragraph_runs([
        ("Luồng xử lý từ khi học viên bấm nút 'Nộp bài' cho đến khi nhận được kết quả hoặc câu hỏi gợi mở từ Socratic AI được phân chia thành 4 giai đoạn cụ thể:", False)
    ])
    
    seq_steps = [
        ["Giai đoạn 1: Nộp bài (Ingestion)", "Client (React 19) -> API Gateway (FastAPI)", "Client gửi HTTP POST /api/v1/submissions kèm JWT Bearer. Gateway xác thực token, kiểm tra Rate Limit, kiểm tra dữ liệu qua Pydantic DTO, ghi bản ghi trạng thái 'PENDING' vào PostgreSQL và trả về HTTP 202 Accepted."],
        ["Giai đoạn 2: Điều phối Sandbox (Dispatch)", "API Gateway -> Docker Runner Container", "Gateway truy vấn danh sách test cases của bài tập, gói mã nguồn và giới hạn tài nguyên vào Payload, gọi POST /containers/run-job sang Docker Runner."],
        ["Giai đoạn 3: Thực thi cách ly (Execution)", "Docker Runner Sandbox Engine", "Runner tạo container cô lập hoàn toàn (--network=none, --cpus=0.5, --memory=128m, --read-only, --pids-limit=64). Tiến hành biên dịch/chạy thử trên từng test case, thu thập thời gian thực thi, bộ nhớ và lỗi."],
        ["Giai đoạn 4: Hồi đáp & Socratic (Telemetry)", "Docker Runner -> Gateway -> Client", "Runner trả telemetry về Gateway. Nếu bài làm thất bại, Gateway tự động kích hoạt SocraticHintService nạp prompt và gọi LLM, lưu gợi ý vào DB rồi stream SSE về Client."]
    ]
    b.add_table(["Giai đoạn", "Các thành phần tương tác", "Chi tiết xử lý & Giao thức"], seq_steps, [2200, 2400, 4800], header_bg="1F4E79")

    b.add_heading("1.2 Cấu trúc Payload chi tiết giữa các trạm", level=2)
    
    b.add_paragraph_runs([("1. Thông điệp Client gửi Gateway (HTTP Request Body):", True, False, "003366")])
    b.add_code_block("""POST /api/v1/submissions HTTP/1.1
Host: api.elearning.domain
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "exercise_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "programming_language": "python",
  "source_code": "def find_target(arr, target):\n    for idx in range(len(arr)):\n        if arr[idx] == target:\n            return idx\n    return -1"
}""")

    b.add_paragraph_runs([("2. Thông điệp Gateway điều phối Docker Runner (Sandbox Job Dispatch):", True, False, "003366")])
    b.add_code_block("""POST /containers/run-job HTTP/1.1
Content-Type: application/json

{
  "submission_id": "c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
  "runtime_image": "sandbox-python:3.12-alpine",
  "source_code": "...",
  "resource_limits": {
    "cpu_quota": 0.5,
    "memory_limit_mb": 128,
    "time_limit_ms": 2000,
    "pids_limit": 64,
    "network_disabled": true
  },
  "test_cases": [
    { "id": "tc_1", "stdin": "[2, 7, 11, 15]\\n9", "expected_stdout": "0" },
    { "id": "tc_2", "stdin": "[]\\n5", "expected_stdout": "-1" }
  ]
}""")

    b.add_paragraph_runs([("3. Thông điệp Docker Runner trả về Gateway (Execution Telemetry):", True, False, "003366")])
    b.add_code_block("""HTTP/1.1 200 OK
Content-Type: application/json

{
  "submission_id": "c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
  "exit_code": 1,
  "verdict": "RUNTIME_ERROR",
  "duration_ms": 142,
  "peak_memory_kb": 14280,
  "stdout": "",
  "error_trace": "IndexError: list index out of range at line 3 in find_target",
  "passed_test_cases": 1,
  "total_test_cases": 2
}""")

    b.add_heading("1.3 Cơ chế an toàn và cô lập tài nguyên của Docker Sandbox", level=2)
    b.add_paragraph_runs([
        ("Để đảm bảo mã nguồn của học viên không thể tấn công từ chối dịch vụ (DoS), truy cập mạng trái phép hay phá hoại hạ tầng máy chủ, Docker Runner áp dụng nghiêm ngặt các cờ bảo vệ:", False)
    ])
    b.add_paragraph_runs([("• ", False), ("--network=none: ", True, False, "B22222"), ("Vô hiệu hóa toàn bộ card mạng container, ngăn chặn tải mã độc, kết nối botnet hoặc quét port nội bộ.", False)], bullet=True)
    b.add_paragraph_runs([("• ", False), ("--cpus=\"0.5\" & --memory=\"128m\": ", True, False, "B22222"), ("Giới hạn cứng tài nguyên CPU và RAM. Nếu container vượt quá 128MB, kernel Linux tự động kích hoạt OOM Killer chấm dứt tiến trình.", False)], bullet=True)
    b.add_paragraph_runs([("• ", False), ("--pids-limit=64: ", True, False, "B22222"), ("Ngăn chặn hoàn toàn các đòn tấn công Fork Bomb (tạo tiến trình vô hạn làm sập hệ điều hành host).", False)], bullet=True)
    b.add_paragraph_runs([("• ", False), ("--read-only: ", True, False, "B22222"), ("Hệ thống tệp (filesystem) ở chế độ chỉ đọc. Học viên không thể ghi file hoặc chỉnh sửa binary của container.", False)], bullet=True)

    # PHẦN 2
    b.add_heading("PHẦN 2: THIẾT KẾ ERD 8 BẢNG CHUẨN HÓA 3NF (BẮT BUỘC UTC TIMESTAMPS)", level=1)
    
    b.add_heading("2.1 Chứng minh lý thuyết chuẩn hóa 3NF và loại bỏ phụ thuộc bắc cầu", level=2)
    b.add_paragraph_runs([
        ("Chuẩn hóa cơ sở dữ liệu tuân thủ quy tắc 3 bước:", False)
    ])
    b.add_paragraph_runs([("1. Đạt 1NF: ", True), ("Mọi giá trị trong cột đều là nguyên tử (Atomic). Loại bỏ mảng lặp test case bên trong bài tập bằng cách tách riêng bảng test_cases.", False)])
    b.add_paragraph_runs([("2. Đạt 2NF: ", True), ("Đạt 1NF và mọi thuộc tính không khóa đều phụ thuộc toàn phần vào khóa chính.", False)])
    b.add_paragraph_runs([("3. Đạt 3NF (Loại bỏ phụ thuộc bắc cầu): ", True, False, "003366"), ("Đạt 2NF và không tồn tại bất kỳ phụ thuộc bắc cầu X -> Y -> Z giữa các thuộc tính không khóa.", False)])

    b.add_callout("MINH CHỨNG TRIỆT TIÊU 100% PHỤ THUỘC BẮC CẦU TRONG THIẾT KẾ", [
        "1. Bảng 'submissions': Loại bỏ cột course_id. Lý do: submission_id -> exercise_id -> course_id. Nếu lưu course_id thì course_id phụ thuộc bắc cầu vào exercise_id. Bỏ course_id giải quyết triệt để 3NF.",
        "2. Bảng 'socratic_hints': Loại bỏ student_id và exercise_id. Lý do: hint_id -> submission_id -> student_id & exercise_id. Chỉ lưu duy nhất submission_id làm khóa ngoại.",
        "3. Bảng 'users': Không lưu tên role (role_name) hay permissions dư thừa, chỉ lưu role_id tham chiếu tới bảng 'roles'.",
        "4. Bảng 'enrollments': Tách riêng để giải quyết quan hệ N-N giữa users và courses, không lưu thông tin dư thừa của khóa học."
    ], border_color="00796B", bg_color="E6F4F1")

    b.add_heading("2.2 Bảng đặc tả chi tiết 8 bảng cơ sở dữ liệu", level=2)

    # 1. roles
    b.add_paragraph_runs([("1. Bảng 'roles' (Vai trò người dùng)", True, False, "003366")])
    t_roles = [
        ["id", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Mã định danh duy nhất của vai trò"],
        ["code", "VARCHAR(50)", "NOT NULL, UNIQUE", "Mã vai trò chuẩn (ADMIN, INSTRUCTOR, STUDENT)"],
        ["name", "VARCHAR(100)", "NOT NULL", "Tên hiển thị tiếng Việt của vai trò"],
        ["description", "TEXT", "NULL", "Mô tả phạm vi quyền hạn vai trò"],
        ["created_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm tạo bản ghi theo UTC"],
        ["updated_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm cập nhật bản ghi theo UTC"]
    ]
    b.add_table(["Tên cột", "Kiểu dữ liệu", "Ràng buộc", "Mô tả"], t_roles, [1800, 2000, 2800, 2800], header_bg="1976D2")

    # 2. users
    b.add_paragraph_runs([("2. Bảng 'users' (Tài khoản người dùng)", True, False, "003366")])
    t_users = [
        ["id", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Mã định danh duy nhất của người dùng"],
        ["role_id", "UUID", "NOT NULL, FK -> roles(id) ON DELETE RESTRICT", "Vai trò (Chỉ lưu FK, không lưu tên vai trò)"],
        ["email", "VARCHAR(255)", "NOT NULL, UNIQUE, INDEX", "Địa chỉ email đăng nhập duy nhất"],
        ["password_hash", "VARCHAR(255)", "NOT NULL", "Mật khẩu băm an toàn (Argon2id)"],
        ["full_name", "VARCHAR(150)", "NOT NULL", "Họ và tên người dùng"],
        ["is_active", "BOOLEAN", "NOT NULL, DEFAULT TRUE", "Trạng thái kích hoạt tài khoản"],
        ["created_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm tạo tài khoản theo UTC"],
        ["updated_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm cập nhật tài khoản theo UTC"]
    ]
    b.add_table(["Tên cột", "Kiểu dữ liệu", "Ràng buộc", "Mô tả"], t_users, [1800, 2000, 2800, 2800], header_bg="3F51B5")

    # 3. courses
    b.add_paragraph_runs([("3. Bảng 'courses' (Khóa học)", True, False, "003366")])
    t_courses = [
        ["id", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Mã định danh duy nhất của khóa học"],
        ["instructor_id", "UUID", "NOT NULL, FK -> users(id) ON DELETE RESTRICT", "Mã giảng viên chủ nhiệm khóa học"],
        ["title", "VARCHAR(255)", "NOT NULL", "Tiêu đề khóa học"],
        ["slug", "VARCHAR(255)", "NOT NULL, UNIQUE, INDEX", "Đường dẫn URL thân thiện"],
        ["description", "TEXT", "NULL", "Mô tả tóm tắt nội dung khóa học"],
        ["is_published", "BOOLEAN", "NOT NULL, DEFAULT FALSE", "Trạng thái công khai của khóa học"],
        ["created_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm tạo khóa học theo UTC"],
        ["updated_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm cập nhật khóa học theo UTC"]
    ]
    b.add_table(["Tên cột", "Kiểu dữ liệu", "Ràng buộc", "Mô tả"], t_courses, [1800, 2000, 2800, 2800], header_bg="00796B")

    # 4. enrollments
    b.add_paragraph_runs([("4. Bảng 'enrollments' (Đăng ký khóa học - Khử N-N)", True, False, "003366")])
    t_enroll = [
        ["id", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Mã bản ghi đăng ký"],
        ["student_id", "UUID", "NOT NULL, FK -> users(id) ON DELETE CASCADE", "Mã học viên tham gia học"],
        ["course_id", "UUID", "NOT NULL, FK -> courses(id) ON DELETE CASCADE", "Mã khóa học được đăng ký"],
        ["status", "VARCHAR(30)", "NOT NULL, DEFAULT 'ACTIVE'", "Trạng thái (ACTIVE, COMPLETED, DROPPED)"],
        ["enrolled_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm ghi danh theo UTC"],
        ["created_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm tạo bản ghi theo UTC"],
        ["updated_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm cập nhật bản ghi theo UTC"]
    ]
    b.add_table(["Tên cột", "Kiểu dữ liệu", "Ràng buộc", "Mô tả"], t_enroll, [1800, 2000, 2800, 2800], header_bg="455A64")

    # 5. exercises
    b.add_paragraph_runs([("5. Bảng 'exercises' (Bài tập thực hành trong khóa học)", True, False, "003366")])
    t_exercises = [
        ["id", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Mã định danh duy nhất của bài tập"],
        ["course_id", "UUID", "NOT NULL, FK -> courses(id) ON DELETE CASCADE", "Thuộc khóa học nào"],
        ["title", "VARCHAR(255)", "NOT NULL", "Tiêu đề bài toán lập trình"],
        ["slug", "VARCHAR(255)", "NOT NULL, UNIQUE, INDEX", "URL thân thiện của bài tập"],
        ["problem_statement", "TEXT", "NOT NULL", "Đề bài, ví dụ mẫu và giải thích chi tiết"],
        ["time_limit_ms", "INT", "NOT NULL, DEFAULT 2000", "Thời gian thực thi tối đa (mili-giây)"],
        ["memory_limit_mb", "INT", "NOT NULL, DEFAULT 128", "Bộ nhớ RAM tối đa cấp phát (MB)"],
        ["created_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm tạo bài tập theo UTC"],
        ["updated_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm cập nhật bài tập theo UTC"]
    ]
    b.add_table(["Tên cột", "Kiểu dữ liệu", "Ràng buộc", "Mô tả"], t_exercises, [1800, 2000, 2800, 2800], header_bg="5E35B1")

    # 6. test_cases
    b.add_paragraph_runs([("6. Bảng 'test_cases' (Bộ kiểm thử cho bài tập - Khử 1NF repeating groups)", True, False, "003366")])
    t_testcases = [
        ["id", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Mã định danh duy nhất của test case"],
        ["exercise_id", "UUID", "NOT NULL, FK -> exercises(id) ON DELETE CASCADE", "Gắn với bài tập cụ thể"],
        ["input_data", "TEXT", "NOT NULL", "Dữ liệu đầu vào truyền qua stdin"],
        ["expected_output", "TEXT", "NOT NULL", "Dữ liệu mong muốn nhận qua stdout"],
        ["is_sample", "BOOLEAN", "NOT NULL, DEFAULT FALSE", "Hiển thị làm ví dụ mẫu cho học viên"],
        ["weight", "NUMERIC(5,2)", "NOT NULL, DEFAULT 1.00", "Trọng số điểm của test case"],
        ["created_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm tạo test case theo UTC"],
        ["updated_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm cập nhật test case theo UTC"]
    ]
    b.add_table(["Tên cột", "Kiểu dữ liệu", "Ràng buộc", "Mô tả"], t_testcases, [1800, 2000, 2800, 2800], header_bg="00838F")

    # 7. submissions
    b.add_paragraph_runs([("7. Bảng 'submissions' (Lượt nộp bài làm - Đạt 3NF không chứa course_id)", True, False, "003366")])
    t_submissions = [
        ["id", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Mã định danh duy nhất của lượt nộp bài"],
        ["student_id", "UUID", "NOT NULL, FK -> users(id) ON DELETE CASCADE", "Học viên thực hiện nộp bài"],
        ["exercise_id", "UUID", "NOT NULL, FK -> exercises(id) ON DELETE CASCADE", "Bài tập được giải (Không lưu course_id)"],
        ["source_code", "TEXT", "NOT NULL", "Mã nguồn học viên viết"],
        ["programming_language", "VARCHAR(50)", "NOT NULL", "Ngôn ngữ (python, cpp, typescript)"],
        ["status", "VARCHAR(30)", "NOT NULL, DEFAULT 'PENDING'", "Trạng thái (PENDING, ACCEPTED, FAILED,...)"],
        ["score", "NUMERIC(5,2)", "NOT NULL, DEFAULT 0.00", "Điểm số đạt được (0.00 - 100.00)"],
        ["duration_ms", "INT", "NULL", "Thời gian chạy thực tế (ms)"],
        ["peak_memory_kb", "INT", "NULL", "Bộ nhớ RAM đỉnh đã sử dụng (KB)"],
        ["execution_output", "TEXT", "NULL", "Đầu ra in ra từ chương trình"],
        ["error_trace", "TEXT", "NULL", "Thông báo lỗi biên dịch hoặc ngoại lệ runtime"],
        ["created_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm nộp bài theo UTC"],
        ["updated_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm hoàn tất chấm theo UTC"]
    ]
    b.add_table(["Tên cột", "Kiểu dữ liệu", "Ràng buộc", "Mô tả"], t_submissions, [1800, 2000, 2800, 2800], header_bg="D84315")

    # 8. socratic_hints
    b.add_paragraph_runs([("8. Bảng 'socratic_hints' (Gợi mở AI - Đạt 3NF chỉ tham chiếu submission_id)", True, False, "003366")])
    t_hints = [
        ["id", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Mã định danh lượt gợi mở Socratic"],
        ["submission_id", "UUID", "NOT NULL, FK -> submissions(id) ON DELETE CASCADE", "Gắn liền bài nộp (Không lưu student/exercise)"],
        ["hint_level", "SMALLINT", "NOT NULL, CHECK (hint_level IN (1, 2, 3))", "Cấp độ gợi mở sư phạm (1, 2 hoặc 3)"],
        ["prompt_context", "TEXT", "NOT NULL", "Tóm tắt ngữ cảnh lỗi gửi cho LLM"],
        ["socratic_question", "TEXT", "NOT NULL", "Nội dung câu hỏi định hướng do AI sinh ra"],
        ["feedback", "VARCHAR(30)", "NULL", "Phản hồi học viên (HELPFUL, CONFUSING,...)"],
        ["created_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm sinh câu hỏi gợi mở theo UTC"],
        ["updated_at", "TIMESTAMPTZ", "NOT NULL, DEFAULT (now() AT TIME ZONE 'UTC')", "Thời điểm phản hồi theo UTC"]
    ]
    b.add_table(["Tên cột", "Kiểu dữ liệu", "Ràng buộc", "Mô tả"], t_hints, [1800, 2000, 2800, 2800], header_bg="6A1B9A")

    # PHẦN 3
    b.add_heading("PHẦN 3: KỊCH BẢN DDL POSTGRESQL CHUẨN UTC TIMESTAMPS HOÀN CHỈNH", level=1)
    b.add_paragraph_runs([
        ("Toàn bộ mã SQL DDL dưới đây đã được kiểm thử, kích hoạt extension sinh UUID ngẫu nhiên và gắn trigger tự động cập nhật cột ", False),
        ("updated_at theo múi giờ UTC", True, False, "003366"),
        (" trên cả 8 bảng:", False)
    ])
    
    ddl_sql = """-- Kích hoạt pgcrypto để tự động sinh UUID v4
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function tự động cập nhật updated_at theo chuẩn UTC
CREATE OR REPLACE FUNCTION trigger_set_timestamp_utc()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = (now() AT TIME ZONE 'UTC');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. BẢNG ROLES
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

-- 2. BẢNG USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

-- 3. BẢNG COURSES
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

-- 4. BẢNG ENROLLMENTS
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    CONSTRAINT uq_student_course UNIQUE (student_id, course_id)
);

-- 5. BẢNG EXERCISES
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    problem_statement TEXT NOT NULL,
    time_limit_ms INT NOT NULL DEFAULT 2000,
    memory_limit_mb INT NOT NULL DEFAULT 128,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

-- 6. BẢNG TEST_CASES
CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_sample BOOLEAN NOT NULL DEFAULT FALSE,
    weight NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

-- 7. BẢNG SUBMISSIONS (3NF - KHÔNG CHỨA course_id)
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    source_code TEXT NOT NULL,
    programming_language VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    duration_ms INT,
    peak_memory_kb INT,
    execution_output TEXT,
    error_trace TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

-- 8. BẢNG SOCRATIC_HINTS (3NF - KHÔNG CHỨA student_id/exercise_id)
CREATE TABLE socratic_hints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    hint_level SMALLINT NOT NULL CHECK (hint_level IN (1, 2, 3)),
    prompt_context TEXT NOT NULL,
    socratic_question TEXT NOT NULL,
    feedback VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

-- GẮN TRIGGER TỰ ĐỘNG CẬP NHẬT updated_at CHO CẢ 8 BẢNG
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('
            CREATE TRIGGER set_timestamp_utc_%I
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION trigger_set_timestamp_utc();', tbl, tbl);
    END LOOP;
END;
$$;"""
    b.add_code_block(ddl_sql)

    out_file = r"c:\Users\phand\OneDrive\Tài liệu\project\Bao_Cao_2_Thong_Diep_Gateway_Runner_Va_ERD_3NF.docx"
    b.save(out_file)

if __name__ == "__main__":
    build_part2()
