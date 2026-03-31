from pathlib import Path
import os


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_ROOT = PROJECT_ROOT / "data"
FULI_ROOT = DATA_ROOT / "fuli_products"
FULI_IMAGE_DIR = FULI_ROOT / "images"
FULI_METADATA_FILE = FULI_ROOT / "metadata.json"
FULI_EMBEDDINGS_FILE = FULI_ROOT / "embeddings.npy"
FULI_FEATURES_FILE = FULI_ROOT / "features.json"
FULI_INDEX_FILE = FULI_ROOT / "faiss.index"
PREFERENCE_DB_FILE = DATA_ROOT / "preferences.sqlite3"
PROTOTYPE_TEXT_RETRIEVAL_ROOT = DATA_ROOT / "prototype_retrieval"
PROTOTYPE_TEXT_ENTRIES_FILE = PROTOTYPE_TEXT_RETRIEVAL_ROOT / "entries.json"
PROTOTYPE_TEXT_EMBEDDINGS_FILE = PROTOTYPE_TEXT_RETRIEVAL_ROOT / "embeddings.npy"
PROTOTYPE_TEXT_INDEX_FILE = PROTOTYPE_TEXT_RETRIEVAL_ROOT / "faiss.index"
PROTOTYPE_TEXT_INDEX_MANIFEST_FILE = PROTOTYPE_TEXT_RETRIEVAL_ROOT / "manifest.json"

EMBEDDING_MODEL_NAME = "openai/clip-vit-base-patch32"
PROTOTYPE_TEXT_MODEL_NAME = "intfloat/multilingual-e5-small"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
OLLAMA_TIMEOUT_SECONDS = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "20"))
