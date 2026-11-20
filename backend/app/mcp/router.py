"""FastAPI Router cho CodeMind MCP Server.

Expose endpoint JSON-RPC 2.0 qua HTTP:
- POST /v1/mcp/rpc: Thực thi các lệnh JSON-RPC 2.0 (initialize, tools/list, tools/call, resources/read...)
- GET /v1/mcp/info: Lấy danh sách capabilities và tools hiện có
"""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import get_optional_current_user
from app.mcp.protocol import McpDispatcher
from app.mcp.server import create_dispatcher

router = APIRouter(prefix="/mcp", tags=["Model Context Protocol (MCP)"])

# Singleton dispatcher cho HTTP endpoint
_http_dispatcher: McpDispatcher | None = None


def get_dispatcher() -> McpDispatcher:
    global _http_dispatcher
    if _http_dispatcher is None:
        _http_dispatcher = create_dispatcher()
    return _http_dispatcher


class JsonRpcRequest(BaseModel):
    jsonrpc: str = Field(default="2.0")
    id: Any = None
    method: str
    params: dict[str, Any] = Field(default_factory=dict)


@router.get("/info")
def get_mcp_info(
    dispatcher: McpDispatcher = Depends(get_dispatcher),
) -> dict[str, Any]:
    """Lấy thông tin tổng quan, capabilities và danh sách các tools hỗ trợ bởi CodeMind MCP."""
    return {
        "server": {
            "name": "codemind-mcp-server",
            "version": "1.0.0",
            "transport": ["stdio", "http-rpc"],
            "protocol_version": "2024-11-05",
        },
        "tools_count": len(dispatcher.tools),
        "tools": list(dispatcher.tools.values()),
        "resources_count": len(dispatcher.resources),
        "resources": list(dispatcher.resources.values()),
        "prompts_count": len(dispatcher.prompts),
        "prompts": list(dispatcher.prompts.values()),
    }


@router.post("/rpc")
def handle_json_rpc(
    payload: JsonRpcRequest,
    dispatcher: McpDispatcher = Depends(get_dispatcher),
    user: dict[str, Any] | None = Depends(get_optional_current_user),
) -> dict[str, Any]:
    """Thực thi một payload JSON-RPC 2.0 của giao thức Model Context Protocol."""
    msg = payload.model_dump()
    resp = dispatcher.handle_request(msg)
    if resp is None:
        return {"jsonrpc": "2.0", "result": None}
    return resp
