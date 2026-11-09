Add-Type -AssemblyName System.Drawing

$width = 2040
$height = 1000
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)

$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Background
$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#F8FAFC"))
$g.FillRectangle($bgBrush, 0, 0, $width, $height)
$bgBrush.Dispose()

# Grid subtle dots or border
$borderPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#E2E8F0"), 2)
$g.DrawRectangle($borderPen, 10, 10, $width - 20, $height - 20)
$borderPen.Dispose()

# Fonts
$fontTitle = New-Object System.Drawing.Font "Segoe UI", 18, [System.Drawing.FontStyle]::Bold
$fontSub = New-Object System.Drawing.Font "Segoe UI", 11, [System.Drawing.FontStyle]::Regular
$fontHeader = New-Object System.Drawing.Font "Segoe UI", 11, [System.Drawing.FontStyle]::Bold
$fontBody = New-Object System.Drawing.Font "Consolas", 8.5, [System.Drawing.FontStyle]::Regular
$fontBodyBold = New-Object System.Drawing.Font "Consolas", 8.5, [System.Drawing.FontStyle]::Bold
$fontRel = New-Object System.Drawing.Font "Segoe UI", 8.5, [System.Drawing.FontStyle]::Bold

# Title Banner
$titleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#0F172A"))
$subBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#475569"))
$g.DrawString("SƠ ĐỒ QUAN HỆ THỰC THỂ (ERD) - 8 BẢNG CHUẨN HÓA 3NF", $fontTitle, $titleBrush, 30, 22)
$g.DrawString("Triệt tiêu 100% phụ thuộc bắc cầu (Transitive Dependencies) | Bắt buộc 100% Timestamps chuẩn UTC", $fontSub, $subBrush, 30, 56)
$titleBrush.Dispose()
$subBrush.Dispose()

# Helper function to draw table
function Draw-Table {
    param(
        $x, $y, $w, $h,
        $tableName, $headerColorHex,
        $columns
    )
    
    # Shadow
    $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(25, 0, 0, 0))
    $g.FillRectangle($shadowBrush, $x + 4, $y + 4, $w, $h)
    $shadowBrush.Dispose()

    # Body background
    $bodyBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $g.FillRectangle($bodyBrush, $x, $y, $w, $h)
    $bodyBrush.Dispose()

    # Header
    $headBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($headerColorHex))
    $g.FillRectangle($headBrush, $x, $y, $w, 28)
    $headBrush.Dispose()

    # Header text
    $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $g.DrawString($tableName, $fontHeader, $whiteBrush, $x + 10, $y + 5)
    $whiteBrush.Dispose()

    # Border
    $tblPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#CBD5E1"), 1.5)
    $g.DrawRectangle($tblPen, $x, $y, $w, $h)
    $tblPen.Dispose()

    # Column lines & text
    $currY = $y + 34
    $textDark = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#1E293B"))
    $textPK = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#B45309")) # Amber
    $textFK = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#2563EB")) # Blue
    $textTime = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#059669")) # Emerald
    
    foreach ($col in $columns) {
        $prefix = $col[0]
        $colName = $col[1]
        $colType = $col[2]
        
        $brush = $textDark
        $font = $fontBody
        
        if ($prefix -eq "PK") {
            $brush = $textPK
            $font = $fontBodyBold
            $lbl = "[PK] " + $colName
        } elseif ($prefix -eq "FK") {
            $brush = $textFK
            $font = $fontBodyBold
            $lbl = "[FK] " + $colName
        } elseif ($prefix -eq "TIME") {
            $brush = $textTime
            $font = $fontBody
            $lbl = " *   " + $colName
        } else {
            $lbl = "     " + $colName
        }
        
        $g.DrawString($lbl, $font, $brush, $x + 8, $currY)
        
        # Right aligned type
        $typeSize = $g.MeasureString($colType, $fontBody)
        $g.DrawString($colType, $fontBody, $brush, $x + $w - $typeSize.Width - 8, $currY)
        
        $currY += 19
    }
    
    $textDark.Dispose()
    $textPK.Dispose()
    $textFK.Dispose()
    $textTime.Dispose()
}

# Draw 8 Tables
# 1. ROLES
Draw-Table 50 100 360 170 "ROLES" "#1E40AF" @(
    @("PK", "id", "UUID"),
    @("-", "code", "VARCHAR(50) UK"),
    @("-", "name", "VARCHAR(100)"),
    @("-", "description", "TEXT"),
    @("TIME", "created_at (UTC)", "TIMESTAMPTZ"),
    @("TIME", "updated_at (UTC)", "TIMESTAMPTZ")
)

# 2. USERS
Draw-Table 470 100 400 210 "USERS" "#3730A3" @(
    @("PK", "id", "UUID"),
    @("FK", "role_id", "UUID -> roles"),
    @("-", "email", "VARCHAR(255) UK"),
    @("-", "password_hash", "VARCHAR(255)"),
    @("-", "full_name", "VARCHAR(150)"),
    @("-", "is_active", "BOOLEAN"),
    @("TIME", "created_at (UTC)", "TIMESTAMPTZ"),
    @("TIME", "updated_at (UTC)", "TIMESTAMPTZ")
)

# 3. COURSES
Draw-Table 930 100 410 210 "COURSES" "#0F766E" @(
    @("PK", "id", "UUID"),
    @("FK", "instructor_id", "UUID -> users"),
    @("-", "title", "VARCHAR(255)"),
    @("-", "slug", "VARCHAR(255) UK"),
    @("-", "description", "TEXT"),
    @("-", "is_published", "BOOLEAN"),
    @("TIME", "created_at (UTC)", "TIMESTAMPTZ"),
    @("TIME", "updated_at (UTC)", "TIMESTAMPTZ")
)

# 4. ENROLLMENTS (Khử N-N)
Draw-Table 1400 100 430 190 "ENROLLMENTS (Khử N-N)" "#334155" @(
    @("PK", "id", "UUID"),
    @("FK", "student_id", "UUID -> users"),
    @("FK", "course_id", "UUID -> courses"),
    @("-", "status", "VARCHAR(30)"),
    @("TIME", "enrolled_at (UTC)", "TIMESTAMPTZ"),
    @("TIME", "created_at (UTC)", "TIMESTAMPTZ"),
    @("TIME", "updated_at (UTC)", "TIMESTAMPTZ")
)

# 5. EXERCISES
Draw-Table 930 430 410 210 "EXERCISES" "#6B21A8" @(
    @("PK", "id", "UUID"),
    @("FK", "course_id", "UUID -> courses"),
    @("-", "title", "VARCHAR(255)"),
    @("-", "slug", "VARCHAR(255) UK"),
    @("-", "problem_statement", "TEXT"),
    @("-", "time_limit_ms", "INT"),
    @("-", "memory_limit_mb", "INT"),
    @("TIME", "created_at (UTC)", "TIMESTAMPTZ"),
    @("TIME", "updated_at (UTC)", "TIMESTAMPTZ")
)

# 6. TEST_CASES
Draw-Table 1400 430 430 190 "TEST_CASES (Khử 1NF)" "#0E7490" @(
    @("PK", "id", "UUID"),
    @("FK", "exercise_id", "UUID -> exercises"),
    @("-", "input_data", "TEXT (stdin)"),
    @("-", "expected_output", "TEXT (stdout)"),
    @("-", "is_sample", "BOOLEAN"),
    @("-", "weight", "NUMERIC(5,2)"),
    @("TIME", "created_at (UTC)", "TIMESTAMPTZ"),
    @("TIME", "updated_at (UTC)", "TIMESTAMPTZ")
)

# 7. SUBMISSIONS (3NF - KHÔNG CHỨA course_id)
Draw-Table 470 430 400 270 "SUBMISSIONS (Khử Bắc Cầu 3NF)" "#C2410C" @(
    @("PK", "id", "UUID"),
    @("FK", "student_id", "UUID -> users"),
    @("FK", "exercise_id", "UUID -> exercises"),
    @("-", "source_code", "TEXT"),
    @("-", "programming_lang", "VARCHAR(50)"),
    @("-", "status", "VARCHAR(30)"),
    @("-", "score", "NUMERIC(5,2)"),
    @("-", "duration_ms", "INT"),
    @("-", "execution_output", "TEXT"),
    @("-", "error_trace", "TEXT"),
    @("TIME", "created_at (UTC)", "TIMESTAMPTZ"),
    @("TIME", "updated_at (UTC)", "TIMESTAMPTZ")
)

# 8. SOCRATIC_HINTS (3NF - CHỈ THAM CHIẾU submission_id)
Draw-Table 50 430 360 210 "SOCRATIC_HINTS (3NF)" "#86198F" @(
    @("PK", "id", "UUID"),
    @("FK", "submission_id", "UUID -> submissions"),
    @("-", "hint_level", "SMALLINT (1,2,3)"),
    @("-", "prompt_context", "TEXT"),
    @("-", "socratic_question", "TEXT"),
    @("-", "feedback", "VARCHAR(30)"),
    @("TIME", "created_at (UTC)", "TIMESTAMPTZ"),
    @("TIME", "updated_at (UTC)", "TIMESTAMPTZ")
)

# Helper function to draw connector line
function Draw-Connector {
    param(
        $x1, $y1, $x2, $y2, $colorHex, $label, $mult1, $mult2
    )
    $pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($colorHex), 2)
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($colorHex))
    
    $g.DrawLine($pen, $x1, $y1, $x2, $y2)
    
    # Draw endpoints dots
    $g.FillEllipse($brush, $x1 - 3, $y1 - 3, 6, 6)
    $g.FillEllipse($brush, $x2 - 3, $y2 - 3, 6, 6)
    
    # Draw multiplicities
    if ($mult1) {
        $g.DrawString($mult1, $fontRel, $brush, $x1 + 6, $y1 - 16)
    }
    if ($mult2) {
        $g.DrawString($mult2, $fontRel, $brush, $x2 - 24, $y2 - 16)
    }
    
    # Center label
    if ($label) {
        $midX = ($x1 + $x2) / 2
        $midY = ($y1 + $y2) / 2
        $lblBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#475569"))
        $g.DrawString($label, $fontRel, $lblBrush, $midX - 30, $midY - 14)
        $lblBrush.Dispose()
    }
    
    $pen.Dispose()
    $brush.Dispose()
}

# Connectors
# 1. ROLES 1 - 0..* USERS
Draw-Connector 410 160 470 160 "#2563EB" "has" "1" "0..*"

# 2. USERS 1 - 0..* COURSES
Draw-Connector 870 160 930 160 "#0F766E" "instructs" "1" "0..*"

# 3. COURSES 1 - 0..* ENROLLMENTS
Draw-Connector 1340 160 1400 160 "#334155" "enrolls" "1" "0..*"

# 4. COURSES 1 - 0..* EXERCISES
$penC = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#0F766E"), 2)
$brushC = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#0F766E"))
$g.DrawLine($penC, 1130, 310, 1130, 430)
$g.DrawString("1", $fontRel, $brushC, 1135, 315)
$g.DrawString("0..*", $fontRel, $brushC, 1135, 410)
$penC.Dispose()
$brushC.Dispose()

# 5. EXERCISES 1 - 0..* TEST_CASES
Draw-Connector 1340 500 1400 500 "#0E7490" "tests" "1" "0..*"

# 6. USERS 1 - 0..* SUBMISSIONS
$penU = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#3730A3"), 2)
$brushU = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#3730A3"))
$g.DrawLine($penU, 670, 310, 670, 430)
$g.DrawString("1", $fontRel, $brushU, 675, 315)
$g.DrawString("0..*", $fontRel, $brushU, 675, 410)
$penU.Dispose()
$brushU.Dispose()

# 7. EXERCISES 1 - 0..* SUBMISSIONS
Draw-Connector 930 500 870 500 "#C2410C" "solves" "0..*" "1"

# 8. SUBMISSIONS 1 - 0..* SOCRATIC_HINTS
Draw-Connector 470 500 410 500 "#86198F" "hints" "0..*" "1"

# Legend box at bottom
$legBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$legPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#CBD5E1"), 1)
$g.FillRectangle($legBrush, 50, 750, 1780, 80)
$g.DrawRectangle($legPen, 50, 750, 1780, 80)
$legBrush.Dispose()
$legPen.Dispose()

$fontLegTitle = New-Object System.Drawing.Font "Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold
$fontLeg = New-Object System.Drawing.Font "Segoe UI", 8.5, [System.Drawing.FontStyle]::Regular
$darkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#0F172A"))
$g.DrawString("CHÚ THÍCH CHUẨN HÓA 3NF & RÀNG BUỘC TOÀN VẸN:", $fontLegTitle, $darkBrush, 65, 760)

$g.DrawString("• [PK] Khóa chính UUIDv4 | [FK] Khóa ngoại | * (UTC): TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'UTC') trên 100% các bảng.", $fontLeg, $darkBrush, 65, 782)
$g.DrawString("• Khử phụ thuộc bắc cầu: 'submissions' không chứa course_id (qua exercise); 'socratic_hints' chỉ tham chiếu submission_id; tách 'test_cases' khử 1NF lặp.", $fontLeg, $darkBrush, 65, 802)
$darkBrush.Dispose()

# Save
$outPath = "c:\Users\phand\OneDrive\Tài liệu\project\erd_3nf_diagram.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
Write-Output "Successfully saved ERD image to $outPath"
