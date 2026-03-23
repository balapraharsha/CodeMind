"""
Hindsight Cloud client.
Correct endpoints per docs: /v1/default/banks/{bank_id}/memories/retain|recall
API key goes in Authorization: Bearer header.
"""
import httpx, os

class HindsightClient:
    def __init__(self, api_key: str, base_url: str = "https://api.hindsight.vectorize.io"):
        self.api_key  = api_key
        self.base_url = base_url.rstrip("/")
        self.bank_id  = os.getenv("HINDSIGHT_BANK_ID", "codemind")
        self.headers  = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type":  "application/json",
        }

    def _url(self, path):
        return f"{self.base_url}/v1/default/banks/{self.bank_id}{path}"

    def retain(self, user_id: str, content: str, metadata: dict = None):
        """Store a memory in Hindsight — POST /v1/default/banks/{bank_id}/memories/retain"""
        body = {
            "content":   content,
            "tags":      [f"user:{user_id}"],          # tag by user for filtering at recall
            "metadata":  metadata or {},
        }
        with httpx.Client(timeout=15) as client:
            resp = client.post(self._url("/memories/retain"), headers=self.headers, json=body)
            resp.raise_for_status()
            return resp.json()

    def recall(self, user_id: str, query: str, limit: int = 5):
        """Recall relevant memories — POST /v1/default/banks/{bank_id}/memories/recall"""
        body = {
            "query":       query,
            "tags":        [f"user:{user_id}"],        # only this user's memories
            "tags_match":  "any",
            "max_tokens":  1024,
            "budget":      "mid",
        }
        with httpx.Client(timeout=15) as client:
            resp = client.post(self._url("/memories/recall"), headers=self.headers, json=body)
            resp.raise_for_status()
            data = resp.json()
            # Normalize response — docs show {results:[{text:...}]}
            results = data.get("results", [])
            memories = [{"content": r.get("text", r.get("content", "")), "metadata": r.get("metadata", {})} for r in results]
            return {"memories": memories}

    def list_memories(self, user_id: str, limit: int = 20):
        """List memories for a user — GET /v1/default/banks/{bank_id}/memories"""
        with httpx.Client(timeout=15) as client:
            resp = client.get(
                self._url("/memories"),
                headers=self.headers,
                params={"limit": limit, "tags": f"user:{user_id}"}
            )
            resp.raise_for_status()
            data = resp.json()
            items = data.get("items", data.get("memories", data.get("results", [])))
            memories = [{"content": m.get("text", m.get("content", "")), "metadata": m.get("metadata", {})} for m in items]
            return {"memories": memories}
