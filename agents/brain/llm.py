"""Shared Vertex AI clients (service-account auth) for all agents."""

import json
import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.oauth2 import service_account
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

AGENTS_DIR = Path(__file__).resolve().parent.parent
load_dotenv(AGENTS_DIR / ".env")

DEFAULT_CHAT_MODEL = "gemini-2.5-flash"
DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001"
_SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]


def _key_path() -> Path:
    raw = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not raw:
        raise RuntimeError("GOOGLE_APPLICATION_CREDENTIALS is not set (path to the GCP service account key).")
    path = Path(raw).expanduser()
    if not path.is_absolute():
        path = (AGENTS_DIR / path).resolve()
    if not path.is_file():
        raise RuntimeError(f"Service account key file not found: {path}")
    # Keep ADC-based libraries consistent regardless of the process cwd.
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(path)
    return path


@lru_cache(maxsize=1)
def get_credentials() -> service_account.Credentials:
    return service_account.Credentials.from_service_account_file(str(_key_path()), scopes=_SCOPES)


@lru_cache(maxsize=1)
def get_project() -> str:
    project = os.getenv("GOOGLE_CLOUD_PROJECT")
    if project:
        return project
    with open(_key_path()) as f:
        return json.load(f)["project_id"]


def get_location() -> str:
    return os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")


def _vertex_kwargs() -> dict:
    return {
        "vertexai": True,
        "project": get_project(),
        "location": get_location(),
        "credentials": get_credentials(),
    }


def get_chat_model(model: str = DEFAULT_CHAT_MODEL, temperature: float = 0, **kwargs) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(model=model, temperature=temperature, **_vertex_kwargs(), **kwargs)


def get_embeddings(
    model: str = DEFAULT_EMBEDDING_MODEL, output_dimensionality: int = 768, **kwargs
) -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(
        model=model, output_dimensionality=output_dimensionality, **_vertex_kwargs(), **kwargs
    )


@lru_cache(maxsize=1)
def get_genai_client() -> genai.Client:
    return genai.Client(**_vertex_kwargs())
