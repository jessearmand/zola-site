# File Search / Vector Store

```bash
python test_file_search.py     # query the existing vector store
python setup_file_search.py    # uploads blog content to OpenAI, writes the store ID to ../vector_store/config.json
```

`setup_file_search.py` is not a dry run — it uploads `content/` to OpenAI and replaces the
stored vector store ID. Run it only when the store needs rebuilding.
