# Backend

当前后端是 `FastAPI` 骨架，先把模型配置、槽位状态和 Prompt 生成协议固定下来。

## 目录

- `app/main.py`: FastAPI 入口
- `app/api/routes.py`: HTTP 路由
- `app/schemas.py`: Pydantic 请求/响应模型
- `app/core/model_config.py`: 推荐模型配置
- `app/services/mock_data.py`: 当前页面使用的 mock 会话数据
- `app/services/reference_library.py`: 读取 FULI 抓取图库元数据

## 接口

- `GET /api/v1/health`
- `GET /api/v1/model-config`
- `GET /api/v1/reference-library/fuli-products`
- `POST /api/v1/reference-library/fuli-products/index`
- `POST /api/v1/reference-library/fuli-products/search`
- `POST /api/v1/preference/bootstrap`
- `POST /api/v1/preference/feedback`
- `POST /api/v1/prompt/compose`

## FULI 图片目录

把抓取到的产品图放在项目根目录下：

```text
data/
  fuli_products/
    images/
    metadata.json
```

`metadata.json` 结构示例：

```json
[
  {
    "id": "fuli-0001",
    "title": "产品名",
    "filename": "fuli-0001.jpg",
    "source_url": "https://fuli-plus.com/product/...",
    "category": "hand-tufted",
    "tags": ["geometric", "warm"]
  }
]
```

图片会通过 `/data/fuli_products/images/<filename>` 暴露，接口会返回可直接展示的 `image_url`。

首次建索引：

```bash
cd backend
python scripts/build_fuli_index.py
```

## 启动

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
