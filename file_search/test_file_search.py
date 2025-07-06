#!/usr/bin/env python3

from openai import OpenAI


def test_file_search():
    """Test file search functionality with uploaded blog posts"""

    client = OpenAI()

    query = "Summarize the overall theme of these blog posts, and who is the author"
    print(f"Testing file search with query: {query}")

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=query,
        tools=[{
            "type": "file_search",
            "vector_store_ids": ["vs_68696322fc9c8191bf28694559da27d9"]
        }]
    )

    print("\n=== Response ===")
    print(response)

    # Extract and print the message content
    for output in response.output:
        if output.type == "message":
            for content in output.content:
                if content.type == "output_text":
                    print("\n=== Message Content ===")
                    print(content.text)

                    # Print annotations if available
                    if hasattr(content, 'annotations') and content.annotations:
                        print("\n=== File Citations ===")
                        for annotation in content.annotations:
                            if annotation.type == "file_citation":
                                print(f"- File: {annotation.filename} (ID: {annotation.file_id})")

if __name__ == "__main__":
    test_file_search()
