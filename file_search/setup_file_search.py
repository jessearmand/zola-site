#!/usr/bin/env python3

import json
import time
from pathlib import Path
from typing import Dict, List, Set

from openai import OpenAI


def setup_file_search():
    """Main function to set up file search pipeline"""

    # Initialize OpenAI client
    client = OpenAI()

    # Step 0: List existing files and vector stores
    print("Step 0: Checking existing resources...")
    existing_files = list_existing_files(client)
    existing_vector_stores = list_existing_vector_stores(client)

    # Step 1: Find and upload files
    print("Step 1: Uploading files to OpenAI File API...")
    file_ids = upload_files(client, existing_files)

    # Step 2: Create or reuse vector store
    print("Step 2: Creating or reusing vector store...")
    vector_store = create_or_get_vector_store(
        client, "zola_posts", existing_vector_stores
    )

    # Step 3: Add files to vector store and check status
    print("Step 3: Adding files to vector store...")
    add_files_to_vector_store(client, vector_store.id, file_ids)

    # Step 4: Save vector store IDs to module
    print("Step 4: Saving vector store IDs...")
    save_vector_store_config(vector_store.id)

    # Step 5: Create test file
    print("Step 5: Creating test file...")
    create_test_file(vector_store.id)

    print(f"✅ Setup complete! Vector store ID: {vector_store.id}")
    return vector_store.id


def list_existing_files(client: OpenAI) -> Dict[str, str]:
    """List existing files to avoid duplicates"""
    print("  📋 Listing existing files...")

    files_response = client.files.list()
    existing_files = {}

    for file in files_response.data:
        existing_files[file.filename] = file.id
        print(f"    📄 Found: {file.filename} (ID: {file.id})")

    print(f"  ✅ Found {len(existing_files)} existing files")
    return existing_files


def list_existing_vector_stores(client: OpenAI) -> Dict[str, str]:
    """List existing vector stores"""
    print("  📋 Listing existing vector stores...")

    vector_stores = client.vector_stores.list()
    existing_stores = {}

    for store in vector_stores.data:
        existing_stores[store.name] = store.id
        print(f"    🗂️  Found: {store.name} (ID: {store.id})")

    print(f"  ✅ Found {len(existing_stores)} existing vector stores")
    return existing_stores


def get_files_to_upload() -> List[str]:
    """Get list of markdown files to upload, excluding chat.md"""
    content_dir = Path("../content")
    files = []

    # Get all markdown files in content directory and subdirectories
    for md_file in content_dir.glob("**/*.md"):
        # Skip chat.md and _index.md files
        if md_file.name not in ["chat.md", "_index.md"]:
            files.append(str(md_file))

    return files


def upload_files(client: OpenAI, existing_files: Dict[str, str]) -> List[str]:
    """Upload files to OpenAI File API, skipping existing ones"""
    files_to_upload = get_files_to_upload()
    file_ids = []

    for file_path in files_to_upload:
        file_name = Path(file_path).name

        # Check if file already exists
        if file_name in existing_files:
            print(f"  ⏭️  Skipping existing file: {file_path}")
            file_ids.append(existing_files[file_name])
            continue

        print(f"  📤 Uploading: {file_path}")

        with open(file_path, "rb") as file_content:
            result = client.files.create(file=file_content, purpose="assistants")
            file_ids.append(result.id)
            print(f"    ✅ File ID: {result.id}")

    return file_ids


def create_or_get_vector_store(
    client: OpenAI, name: str, existing_stores: Dict[str, str]
):
    """Create a vector store or reuse existing one"""

    if name in existing_stores:
        print(
            f"  ♻️  Reusing existing vector store: {name} (ID: {existing_stores[name]})"
        )
        return type("VectorStore", (), {"id": existing_stores[name], "name": name})()

    print(f"  🆕 Creating new vector store: {name}")
    vector_store = client.vector_stores.create(name=name)
    print(f"  ✅ Vector store created: {vector_store.id}")
    return vector_store


def list_vector_store_files(client: OpenAI, vector_store_id: str) -> Set[str]:
    """Get existing files in vector store"""
    print(f"  📋 Listing files in vector store {vector_store_id}...")

    try:
        vector_store_files = client.vector_stores.files.list(
            vector_store_id=vector_store_id
        )
        existing_file_ids = {f.id for f in vector_store_files.data}
        print(f"    📄 Found {len(existing_file_ids)} files in vector store")
        return existing_file_ids
    except Exception as e:
        print(f"    ⚠️  Error listing vector store files: {e}")
        return set()


def add_files_to_vector_store(
    client: OpenAI, vector_store_id: str, file_ids: List[str]
):
    """Add files to vector store and check status"""

    # Get existing files in vector store
    existing_file_ids = list_vector_store_files(client, vector_store_id)

    files_to_add = []
    for file_id in file_ids:
        if file_id in existing_file_ids:
            print(f"  ⏭️  File {file_id} already in vector store")
        else:
            files_to_add.append(file_id)

    if not files_to_add:
        print("  ✅ All files already in vector store!")
        return

    # Add new files
    for file_id in files_to_add:
        print(f"  📤 Adding file {file_id} to vector store...")

        client.vector_stores.files.create(
            vector_store_id=vector_store_id, file_id=file_id
        )

    # Check status until all files are ready
    print("  ⏳ Checking file processing status...")
    while True:
        result = client.vector_stores.files.list(vector_store_id=vector_store_id)

        completed_files = [f for f in result.data if f.status == "completed"]
        failed_files = [f for f in result.data if f.status == "failed"]
        in_progress_files = [f for f in result.data if f.status == "in_progress"]

        print(
            f"    📊 Completed: {len(completed_files)}, In Progress: {len(in_progress_files)}, Failed: {len(failed_files)}, Total: {len(result.data)}"
        )

        if failed_files:
            print(f"    ❌ Some files failed: {[f.id for f in failed_files]}")

        if len(completed_files) + len(failed_files) == len(result.data):
            print("    ✅ All files processed!")
            break

        time.sleep(2)


def save_vector_store_config(vector_store_id: str):
    """Save vector store configuration to a module file"""
    config = {"vector_store_id": vector_store_id, "name": "zola_posts"}

    # Create vector_store directory if it doesn't exist
    vector_store_dir = Path("../vector_store")
    vector_store_dir.mkdir(exist_ok=True)

    config_path = vector_store_dir / "config.json"
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)

    print(f"  ✅ Configuration saved to {config_path}")


def create_test_file(vector_store_id: str):
    """Create a test file for file search functionality"""

    query = "Summarize the overall theme of these blog posts, and who is the author"
    test_content = f'''#!/usr/bin/env python3

from openai import OpenAI


def test_file_search():
    """Test file search functionality with uploaded blog posts"""

    client = OpenAI()

    query = "{query}"
    print(f"Testing file search with query: {{query}}")

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=query,
        tools=[{{
            "type": "file_search",
            "vector_store_ids": ["{vector_store_id}"]
        }}]
    )

    print("\\n=== Response ===")
    print(response)

    # Extract and print the message content
    for output in response.output:
        if output.type == "message":
            for content in output.content:
                if content.type == "output_text":
                    print("\\n=== Message Content ===")
                    print(content.text)

                    # Print annotations if available
                    if hasattr(content, 'annotations') and content.annotations:
                        print("\\n=== File Citations ===")
                        for annotation in content.annotations:
                            if annotation.type == "file_citation":
                                print(f"- File: {{annotation.filename}} (ID: {{annotation.file_id}})")

if __name__ == "__main__":
    test_file_search()
'''

    test_file_path = Path("test_file_search.py")
    with open(test_file_path, "w") as f:
        f.write(test_content)

    print(f"  ✅ Test file created: {test_file_path}")


if __name__ == "__main__":
    setup_file_search()
