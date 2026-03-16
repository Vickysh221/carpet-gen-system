from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_ROOT = PROJECT_ROOT / "data"
FULI_ROOT = DATA_ROOT / "fuli_products"
FULI_IMAGE_DIR = FULI_ROOT / "images"
FULI_METADATA_FILE = FULI_ROOT / "metadata.json"
FULI_EMBEDDINGS_FILE = FULI_ROOT / "embeddings.npy"
FULI_FEATURES_FILE = FULI_ROOT / "features.json"
FULI_INDEX_FILE = FULI_ROOT / "faiss.index"

EMBEDDING_MODEL_NAME = "openai/clip-vit-base-patch32"
