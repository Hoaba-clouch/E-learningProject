# Generate PowerShell script with UTF-8 BOM to render high-res ERD diagram
ps_code = r'''Add-Type -AssemblyName System.Drawing

$width = 2000
$height = 1050
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)

$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# Background
$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#F8FAFC"))
$g.FillRectangle($bgBrush, 0, 0, $width, $height)
$bgBrush.Dispose()

# Outer Border
$borderPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#CBD5E1"), 2)
$g.DrawRectangle($borderPen, 15, 15, $width - 30, $height - 30)
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
$g.DrawString("SO DO QUAN HE THUC THE (ERD) - 8 BANG CHUAN HOA 3NF", $fontTitle, $titleBrush, 35, 25)
$g.DrawString("Loai bo 100% phu thuoc bac cau (Transitive Dependencies) | Bat buoc 100% Timestamps chuan UTC", $fontSub, $subBrush, 35, 60)
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
    $g.FillRectangle($headBrush, $x, $y, $w, 30)
    $headBrush.Dispose()

    # Header text
    $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $g.DrawString($tableName, $fontHeader, $whiteBrush, $x + 10, $y + 6)
    $whiteBrush.Dispose()

    # Border
    $tblPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#94A3B8"), 1.5)
    $g.DrawRectangle($tblPen, $x, $y, $w, $h)
    $tblPen.Dispose()

    # Column lines & text
    $currY = $y + 36
    $textDark = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#1E293B"))
    $textPK = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#B45309"))
    $textFK = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#2563EB"))
    $textTime = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#059669"))
    
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
        
        $currY += 21
    }
    
    $textDark.Dispose()
    $textPK.Dispose()
    $textFK.Dispose()
    $textTime.Dispose()
}

# 1. ROLES
Draw-Table 50 110 360 180 "ROLES" "#1E40AF" @(
    @("PK", "id", "UUID"),
    @("-", "code", "VARCHAR(50) UK"),
    @("-", "name", "VARCHAR(100)"),
    @("-", "description", "TEXT"),
    @("TIME", "created_at (UTC)", "TIMESTAMPTZ"),
    @("TIME", "updated_at (UTC)", "TIMESTAMPTZ")
)

# 2. USERS
Draw-Table 470 110 400 220 "USERS" "#3730A3" @(
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
Draw-Table 930 110 410 220 "COURSES" "#0F766E" @(
    @("PK", "id", "UUID"),
    @("FK", "instructor_id", "UUID -> users"),
    @("-", "title", "VARCHAR(255)"),
    @("-", "slug", "VARCHAR(255) UK"),
    @("-", "description", "TEXT"),
    @("-", "is_published", "BOOLEAN"),
    @("TIME", "created_at (UTC)", "TIMESTAMPTZ"),
    @("TIME", "updated_at (UTC)", "TIMESTAMPTZ")
)

# 4. ENROLLMENTS
Draw-Table 1400 110 440 200 "ENROLLMENTS (Khu N-N)" "#334155" @(
    @("PK", "id", "UUID"),
    @("FK", "student_id", "UUID -> users"),
    @("FK", "course_id", "UUID -> courses"),
    @("-", "status", "VARCHAR(30)"),
    @("TIME", "enrolled_at (UTC)", "TIMESTAMPTZ"),
    @("TIME", "created_at (UTC)", "TIMESTAMPTZ"),
    @("TIME", "updated_at (UTC)", "TIMESTAMPTZ")
)

# 5. EXERCISES
Draw-Table 930 450 410 220 "EXERCISES" "#6B21A8" @(
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
Draw-Table 1400 450 440 200 "TEST_CASES (Khu 1NF Lap)" "#0E7490" @(
    @("PK", "id", "UUID"),
    @("FK", "exercise_id", "UUID -> exercises"),
    @("-", "input_data", "TEXT (stdin)"),
    @("-", "expected_output", "TEXT (stdout)"),
    @("-", "is_sample", "BOOLEAN"),
    @("-", "weight", "NUMERIC(5,2)"),
    @("TIME", "created_at (UTC)", "TIMESTAMPTZ"),
    @("TIME", "updated_at (UTC)", "TIMESTAMPTZ")
)

# 7. SUBMISSIONS
Draw-Table 470 450 400 280 "SUBMISSIONS (3NF: Bo course_id)" "#C2410C" @(
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

# 8. SOCRATIC_HINTS
Draw-Table 50 450 360 220 "SOCRATIC_HINTS (3NF: Chi FK Sub)" "#86198F" @(
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
    
    $g.FillEllipse($brush, $x1 - 3, $y1 - 3, 6, 6)
    $g.FillEllipse($brush, $x2 - 3, $y2 - 3, 6, 6)
    
    if ($mult1) {
        $g.DrawString($mult1, $fontRel, $brush, $x1 + 6, $y1 - 16)
    }
    if ($mult2) {
        $g.DrawString($mult2, $fontRel, $brush, $x2 - 24, $y2 - 16)
    }
    
    if ($label) {
        $midX = ($x1 + $x2) / 2
        $midY = ($y1 + $y2) / 2
        $lblBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#475569"))
        $g.DrawString($label, $fontRel, $lblBrush, $midX - 25, $midY - 14)
        $lblBrush.Dispose()
    }
    
    $pen.Dispose()
    $brush.Dispose()
}

# Connectors
Draw-Connector 410 170 470 170 "#2563EB" "has" "1" "0..*"
Draw-Connector 870 170 930 170 "#0F766E" "instructs" "1" "0..*"
Draw-Connector 1340 170 1400 170 "#334155" "enrolls" "1" "0..*"

$penC = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#0F766E"), 2)
$brushC = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#0F766E"))
$g.DrawLine($penC, 1130, 330, 1130, 450)
$g.DrawString("1", $fontRel, $brushC, 1135, 335)
$g.DrawString("0..*", $fontRel, $brushC, 1135, 430)
$penC.Dispose()
$brushC.Dispose()

Draw-Connector 1340 520 1400 520 "#0E7490" "tests" "1" "0..*"

$penU = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#3730A3"), 2)
$brushU = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#3730A3"))
$g.DrawLine($penU, 670, 330, 670, 450)
$g.DrawString("1", $fontRel, $brushU, 675, 335)
$g.DrawString("0..*", $fontRel, $brushU, 675, 430)
$penU.Dispose()
$brushU.Dispose()

Draw-Connector 930 520 870 520 "#C2410C" "solves" "0..*" "1"
Draw-Connector 470 520 410 520 "#86198F" "hints" "0..*" "1"

# Legend box at bottom
$legBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$legPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#CBD5E1"), 1)
$g.FillRectangle($legBrush, 50, 780, 1790, 80)
$g.DrawRectangle($legPen, 50, 780, 1790, 80)
$legBrush.Dispose()
$legPen.Dispose()

$fontLegTitle = New-Object System.Drawing.Font "Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold
$fontLeg = New-Object System.Drawing.Font "Segoe UI", 8.5, [System.Drawing.FontStyle]::Regular
$darkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#0F172A"))
$g.DrawString("CHU THICH CHUAN HOA 3NF VA RANG BUOC TOAN VEN:", $fontLegTitle, $darkBrush, 65, 790)
$g.DrawString("[PK] Khoa chinh UUIDv4 | [FK] Khoa ngoai | * (UTC): TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'UTC') tren 100% cac bang.", $fontLeg, $darkBrush, 65, 812)
$g.DrawString("Khu phu thuoc bac cau: 'submissions' khong chua course_id (qua exercise); 'socratic_hints' chi tham chieu submission_id; tach 'test_cases'.", $fontLeg, $darkBrush, 65, 832)
$darkBrush.Dispose()

# Save
$outPath = "c:\Users\phand\OneDrive\Tài liệu\project\erd_3nf_diagram.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
Write-Output "SUCCESS: ERD image generated at $outPath"
'''

with open("scratch/draw_erd.ps1", "w", encoding="utf-8-sig") as f:
    f.write(ps_code)
print("Created scratch/draw_erd.ps1")
