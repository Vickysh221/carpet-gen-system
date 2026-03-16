# Backend

当前后端是 `FastAPI` 骨架，先把模型配置、槽位状态和 Prompt 生成协议固定下来。

## 目录

- `app/main.py`: FastAPI 入口
- `app/api/routes.py`: HTTP 路由
- `app/schemas.py`: Pydantic 请求/响应模型
- `app/core/model_config.py`: 推荐模型配置
- `app/services/mock_data.py`: 当前页面使用的 mock 会话数据

## 接口

- `GET /api/v1/health`
- `GET /api/v1/model-config`
- `POST /api/v1/preference/bootstrap`
- `POST /api/v1/preference/feedback`
- `POST /api/v1/prompt/compose`

## 启动

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
