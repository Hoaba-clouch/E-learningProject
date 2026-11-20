"""CodeMind MCP (Model Context Protocol) Server.

Chạy qua giao thức chuẩn JSON-RPC 2.0 trên luồng Standard Input / Standard Output (stdio).
Tương thích hoàn toàn với Claude Desktop, Cursor, Antigravity và bất kỳ MCP Client nào.

Cách chạy:
    cd backend
    python -m app.mcp.server
"""

from __future__ import annotations

import io
import json
import logging
import sys
from typing import Any

from app.mcp.protocol import McpDispatcher
from app.mcp.prompts import register_all_prompts
from app.mcp.resources import register_all_resources
from app.mcp.tools import register_all_tools

# Cấu hình logging ra stderr để stdout hoàn toàn dành riêng cho JSON-RPC 2.0
logging.basicConfig(
    stream=sys.stderr,
    level=logging.INFO,
    format="[%(asctime)s] [CodeMind-MCP] %(levelname)s: %(message)s",
)
logger = logging.getLogger("codemind.mcp.server")


def create_dispatcher() -> McpDispatcher:
    """Khởi tạo và đăng ký đầy đủ tools, resources, prompts vào dispatcher."""
    dispatcher = McpDispatcher()
    register_all_tools(dispatcher)
    register_all_resources(dispatcher)
    register_all_prompts(dispatcher)
    return dispatcher


def run_stdio_server() -> None:
    """Vòng lặp lắng nghe JSON-RPC 2.0 từ stdin và phản hồi ra stdout."""
    # Đảm bảo mã hóa UTF-8 cho stdin / stdout
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8")
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)

    dispatcher = create_dispatcher()
    logger.info("CodeMind MCP Server đã khởi động thành công (stdio transport).")
    logger.info("Sẵn sàng nhận kết nối từ Antigravity, Claude Desktop, Cursor...")

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                # Đóng kết nối khi stdin kết thúc
                logger.info("Stdin kết thúc (EOF). Dừng MCP Server.")
                break

            line = line.strip()
            if not line:
                continue

            try:
                message = json.loads(line)
            except json.JSONDecodeError as exc:
                err_resp = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {"code": -32700, "message": f"Parse error: {str(exc)}"},
                }
                sys.stdout.write(json.dumps(err_resp, ensure_ascii=False) + "\n")
                sys.stdout.flush()
                continue

            response = dispatcher.handle_request(message)
            if response is not None:
                sys.stdout.write(json.dumps(response, ensure_ascii=False) + "\n")
                sys.stdout.flush()

        except KeyboardInterrupt:
            logger.info("Nhận tín hiệu dừng từ người dùng. Đóng MCP Server.")
            break
        except Exception as exc:
            logger.exception("Lỗi không mong muốn trong stdio loop: %s", exc)


if __name__ == "__main__":
    run_stdio_server()
