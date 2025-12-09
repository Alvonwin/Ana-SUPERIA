@echo off
echo Starting ChromaDB Server...
echo Data path: E:\ANA\server\memory\chroma_data
"C:\Users\niwno\AppData\Local\Programs\Python\Python310\Scripts\chroma.exe" run --path "E:\ANA\server\memory\chroma_data" --host localhost --port 8000
