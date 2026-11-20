"""Model Context Protocol (MCP) JSON-RPC 2.0 Engine & Dispatcher.

Tuân thủ chuẩn Model Context Protocol (phiên bản 2024-11-05).
Xử lý các thông điệp:
- initialize
- notifications/initialized
- ping
- tools/list
- tools/call
- resources/list
- resources/read
- prompts/list
- prompts/get
"""

from __future__ import annotations

import json
import logging
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger("codemind.mcp")

# Các mã lỗi chuẩn JSON-RPC 2.0
PARSE_ERROR = -32700
INVALID_REQUEST = -32600
METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602
INTERNAL_ERROR = -32603

SERVER_INFO = {
    "name": "codemind-mcp-server",
    "version": "1.0.0",
}

SERVER_CAPABILITIES = {
    "tools": {"listChanged": False},
    "resources": {"subscribe": False, "listChanged": False},
    "prompts": {"listChanged": False},
}


class JsonRpcError(Exception):
    def __init__(self, code: int, message: str, data: Any = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.data = data

    def to_dict(self) -> dict[str, Any]:
        err: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.data is not None:
            err["data"] = self.data
        return err


class McpDispatcher:
    """Bộ điều phối xử lý message MCP JSON-RPC 2.0."""

    def __init__(self) -> None:
        self.tools: Dict[str, dict[str, Any]] = {}
        self.tool_handlers: Dict[str, Callable[[dict[str, Any]], Any]] = {}
        self.resources: Dict[str, dict[str, Any]] = {}
        self.resource_handlers: Dict[str, Callable[[str], dict[str, Any]]] = {}
        self.prompts: Dict[str, dict[str, Any]] = {}
        self.prompt_handlers: Dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {}

    def register_tool(
        self,
        name: str,
        description: str,
        input_schema: dict[str, Any],
        handler: Callable[[dict[str, Any]], Any],
    ) -> None:
        """Đăng ký một MCP tool với schema JSON chuẩn."""
        self.tools[name] = {
            "name": name,
            "description": description,
            "inputSchema": input_schema,
        }
        self.tool_handlers[name] = handler

    def register_resource(
        self,
        uri: str,
        name: str,
        description: str,
        mime_type: str,
        handler: Callable[[str], dict[str, Any]],
    ) -> None:
        """Đăng ký một MCP resource tĩnh hoặc pattern."""
        self.resources[uri] = {
            "uri": uri,
            "name": name,
            "description": description,
            "mimeType": mime_type,
        }
        self.resource_handlers[uri] = handler

    def register_prompt(
        self,
        name: str,
        description: str,
        arguments: list[dict[str, Any]],
        handler: Callable[[dict[str, Any]], dict[str, Any]],
    ) -> None:
        """Đăng ký một MCP Prompt template."""
        self.prompts[name] = {
            "name": name,
            "description": description,
            "arguments": arguments,
        }
        self.prompt_handlers[name] = handler

    def handle_request(self, message: dict[str, Any]) -> Optional[dict[str, Any]]:
        """Xử lý một payload JSON-RPC 2.0 và trả về response tương ứng."""
        if not isinstance(message, dict):
            return {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": INVALID_REQUEST, "message": "Yêu cầu phải là JSON Object."},
            }

        msg_id = message.get("id")
        method = message.get("method")
        params = message.get("params") or {}

        # Nếu không có method -> Invalid Request
        if not method or not isinstance(method, str):
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {"code": INVALID_REQUEST, "message": "Thiếu trường 'method' hợp lệ."},
            }

        # Notification (không có id): xử lý âm thầm, không cần trả kết quả
        is_notification = msg_id is None

        try:
            result = self._dispatch(method, params)
            if is_notification:
                return None
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": result,
            }
        except JsonRpcError as exc:
            if is_notification:
                return None
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": exc.to_dict(),
            }
        except Exception as exc:
            logger.exception("Lỗi nội bộ khi xử lý MCP method %s: %s", method, exc)
            if is_notification:
                return None
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {
                    "code": INTERNAL_ERROR,
                    "message": f"Lỗi nội bộ server: {str(exc)}",
                },
            }

    def _dispatch(self, method: str, params: dict[str, Any]) -> Any:
        # 1. Lifecycle
        if method == "initialize":
            return {
                "protocolVersion": "2024-11-05",
                "capabilities": SERVER_CAPABILITIES,
                "serverInfo": SERVER_INFO,
            }

        if method == "notifications/initialized":
            return {}

        if method == "ping":
            return {}

        # 2. Tools
        if method == "tools/list":
            return {"tools": list(self.tools.values())}

        if method == "tools/call":
            tool_name = params.get("name")
            if not tool_name or tool_name not in self.tool_handlers:
                raise JsonRpcError(
                    METHOD_NOT_FOUND,
                    f"Không tìm thấy tool: '{tool_name}'. Gọi tools/list để xem danh sách.",
                )
            args = params.get("arguments") or {}
            handler = self.tool_handlers[tool_name]
            try:
                res = handler(args)
                text_content = json.dumps(res, ensure_ascii=False, indent=2) if not isinstance(res, str) else res
                return {
                    "content": [
                        {
                            "type": "text",
                            "text": text_content,
                        }
                    ],
                    "isError": False,
                }
            except Exception as e:
                return {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Lỗi khi thực thi tool '{tool_name}': {str(e)}",
                        }
                    ],
                    "isError": True,
                }

        # 3. Resources
        if method == "resources/list":
            return {"resources": list(self.resources.values())}

        if method == "resources/read":
            uri = params.get("uri")
            if not uri:
                raise JsonRpcError(INVALID_PARAMS, "Thiếu tham số 'uri'.")
            # Tìm handler khớp URI tĩnh hoặc prefix
            handler = self.resource_handlers.get(uri)
            if not handler:
                for reg_uri, h in self.resource_handlers.items():
                    if "{" in reg_uri:
                        # simple pattern match
                        prefix = reg_uri.split("{")[0]
                        if uri.startswith(prefix):
                            handler = h
                            break
            if not handler:
                raise JsonRpcError(
                    INVALID_PARAMS,
                    f"Không tìm thấy resource với URI: '{uri}'.",
                )
            res = handler(uri)
            return {
                "contents": [
                    {
                        "uri": uri,
                        "mimeType": res.get("mimeType", "application/json"),
                        "text": res.get("text", json.dumps(res, ensure_ascii=False, indent=2)),
                    }
                ]
            }

        # 4. Prompts
        if method == "prompts/list":
            return {"prompts": list(self.prompts.values())}

        if method == "prompts/get":
            prompt_name = params.get("name")
            if not prompt_name or prompt_name not in self.prompt_handlers:
                raise JsonRpcError(
                    METHOD_NOT_FOUND,
                    f"Không tìm thấy prompt: '{prompt_name}'.",
                )
            args = params.get("arguments") or {}
            handler = self.prompt_handlers[prompt_name]
            return handler(args)

        raise JsonRpcError(METHOD_NOT_FOUND, f"Method không hỗ trợ: '{method}'.")
