import re
from typing import List, Dict, Any

class CodeChunker:
    @staticmethod
    def detect_language(filename: str) -> str:
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        ext_map = {
            "py": "python",
            "js": "javascript",
            "jsx": "javascript",
            "ts": "typescript",
            "tsx": "typescript",
            "go": "go",
            "java": "java",
            "cpp": "cpp",
            "c": "c",
            "h": "c",
            "cs": "csharp",
            "rs": "rust",
            "html": "html",
            "css": "css",
            "sh": "shell",
            "md": "markdown",
            "json": "json",
            "yaml": "yaml",
            "yml": "yaml",
            "xml": "xml"
        }
        return ext_map.get(ext, "text")

    def chunk_file_fallback(self, filename: str, content: str, language: str, max_chunk_lines: int = 40, overlap_lines: int = 10) -> List[Dict[str, Any]]:
        """Fallback chunker that splits file content into overlapping line-based chunks."""
        chunks = []
        lines = content.splitlines()
        total_lines = len(lines)
        
        if total_lines == 0:
            return []

        # If file is short, keep it as a single chunk
        if total_lines <= max_chunk_lines:
            header = f"# File: {filename} | Language: {language}\n"
            chunk_content = header + content
            return [{
                "content": chunk_content,
                "metadata": {
                    "filename": filename,
                    "language": language,
                    "start_line": 1,
                    "end_line": total_lines,
                    "type": "file"
                }
            }]

        start = 0
        while start < total_lines:
            end = min(start + max_chunk_lines, total_lines)
            chunk_lines = lines[start:end]
            
            # Formulate the chunk content
            header = f"# File: {filename} | Lines: {start+1}-{end} | Language: {language}\n"
            chunk_body = "\n".join(chunk_lines)
            full_chunk_text = header + chunk_body
            
            chunks.append({
                "content": full_chunk_text,
                "metadata": {
                    "filename": filename,
                    "language": language,
                    "start_line": start + 1,
                    "end_line": end,
                    "type": "chunk"
                }
            })
            
            start += (max_chunk_lines - overlap_lines)
            
        return chunks

    def chunk_python_ast(self, filename: str, content: str, ast_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Intelligently chunks python files using extracted AST data."""
        chunks = []
        lines = content.splitlines()
        
        # 1. Add module-level/global chunk (imports + module docstring)
        module_lines = []
        if ast_info.get("docstring"):
            module_lines.append(f'"""{ast_info["docstring"]}"""\n')
        if ast_info.get("imports"):
            module_lines.append("# Module Imports")
            for imp in ast_info["imports"]:
                module_lines.append(imp)
        
        # Check if there's any module text, index it
        if module_lines:
            header = f"# File: {filename} | Module Header | Language: python\n"
            chunks.append({
                "content": header + "\n".join(module_lines),
                "metadata": {
                    "filename": filename,
                    "language": "python",
                    "start_line": 1,
                    "end_line": 20, # rough estimate
                    "type": "module_header"
                }
            })

        # 2. Add Class chunks (just headers, docstrings)
        for cls in ast_info.get("classes", []):
            cls_name = cls.get("name")
            cls_start = cls.get("start_line", 1)
            cls_end = cls.get("end_line", cls_start)
            
            # Extract header and docstring or first few lines of class
            cls_body = cls.get("content", "")
            cls_header_lines = []
            for line in cls_body.splitlines():
                cls_header_lines.append(line)
                if len(cls_header_lines) > 8: # keep it short to represent class structure
                    break
            
            header = f"# File: {filename} | Class: {cls_name} | Lines: {cls_start}-{cls_end}\n"
            chunks.append({
                "content": header + "\n".join(cls_header_lines),
                "metadata": {
                    "filename": filename,
                    "language": "python",
                    "class_name": cls_name,
                    "start_line": cls_start,
                    "end_line": cls_end,
                    "type": "class_definition"
                }
            })

        # 3. Add Function & Method chunks (entire code body)
        for fn in ast_info.get("functions", []):
            fn_name = fn.get("name")
            cls_name = fn.get("class_name", "")
            fn_start = fn.get("start_line", 1)
            fn_end = fn.get("end_line", fn_start)
            fn_body = fn.get("content", "")
            
            scope_prefix = f"Method in class {cls_name}" if cls_name else "Global Function"
            header = f"# File: {filename} | {scope_prefix}: {fn_name} | Lines: {fn_start}-{fn_end}\n"
            
            chunks.append({
                "content": header + fn_body,
                "metadata": {
                    "filename": filename,
                    "language": "python",
                    "class_name": cls_name or "global",
                    "function_name": fn_name,
                    "start_line": fn_start,
                    "end_line": fn_end,
                    "type": "function_definition"
                }
            })

        # If AST parsing was empty, fallback
        if not chunks:
            return self.chunk_file_fallback(filename, content, "python")

        return chunks

    def chunk_general_code(self, filename: str, content: str, parsed_structures: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Chunks JS/TS/Go files based on parsed components (functions/classes) or falls back."""
        chunks = []
        
        # If we have parsed structures, create specific chunks
        classes = parsed_structures.get("classes", [])
        functions = parsed_structures.get("functions", [])
        language = self.detect_language(filename)
        
        for cls in classes:
            header = f"# File: {filename} | Class: {cls['name']} | Language: {language}\n"
            chunks.append({
                "content": header + cls["content"],
                "metadata": {
                    "filename": filename,
                    "language": language,
                    "class_name": cls["name"],
                    "start_line": cls.get("start_line", 1),
                    "end_line": cls.get("end_line", 1),
                    "type": "class_definition"
                }
            })
            
        for fn in functions:
            scope = f"Class {fn['class_name']} Method" if fn.get("class_name") else "Function"
            header = f"# File: {filename} | {scope}: {fn['name']} | Language: {language}\n"
            chunks.append({
                "content": header + fn["content"],
                "metadata": {
                    "filename": filename,
                    "language": language,
                    "class_name": fn.get("class_name", "global"),
                    "function_name": fn["name"],
                    "start_line": fn.get("start_line", 1),
                    "end_line": fn.get("end_line", 1),
                    "type": "function_definition"
                }
            })
            
        if not chunks:
            return self.chunk_file_fallback(filename, content, language)
            
        return chunks

chunker = CodeChunker()
